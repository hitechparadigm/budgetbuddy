/**
 * Budget Page - EveryDollar Style Layout
 *
 * Three-column layout matching the EveryDollar screenshot:
 * - Left sidebar with navigation
 * - Center column with budget categories
 * - Right sidebar with transactions
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentMonthString, getTodayString, isFutureMonth, isPastMonth } from '../utils/monthHelpers';
import { getMockUser } from '../utils/mockAuth';

const API_BASE_URL = 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1';

// Data models
interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  plannedAmount: number;
  spentAmount: number;
  transactions: Transaction[];
  order: number;
  isRecurring: boolean;
  recurringFrequency?: 'weekly' | 'bi-weekly' | 'monthly' | 'annually';
  nextDueDate?: string;
}

interface BudgetGroup {
  id: string;
  name: string;
  type: 'income' | 'savings' | 'expense';
  icon: string;
  categories: BudgetCategory[];
  isCollapsed: boolean;
  order: number;
}

interface Transaction {
  id: string;
  categoryId: string;
  amount: number;
  description: string;
  date: string;
  createdAt: string;
}

interface Budget {
  id: string;
  userId: string;
  month: string;
  groups: BudgetGroup[];
  isAIGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export const BudgetPage: React.FC = () => {
  const navigate = useNavigate();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense' | null>(null);
  const [showFAB, setShowFAB] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    amount: '',
    description: '',
    date: getTodayString(),
    categoryId: ''
  });

  // Budget item management
  const [showBudgetItemModal, setShowBudgetItemModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  const [selectedGroupType, setSelectedGroupType] = useState<'income' | 'savings' | 'expense' | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [budgetItemForm, setBudgetItemForm] = useState({
    name: '',
    icon: '💰',
    plannedAmount: '',
    isRecurring: false,
    recurringFrequency: 'monthly' as 'weekly' | 'bi-weekly' | 'monthly' | 'annually'
  });

  // Right sidebar tab state
  const [activeTab, setActiveTab] = useState<'summary' | 'transactions'>('transactions');

  // Right sidebar width state
  const [sidebarWidth, setSidebarWidth] = useState(400); // Default 400px (larger than w-80 which is 320px)

  // Current month state - FIXED: Now uses user's local timezone instead of UTC
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = getCurrentMonthString();
    console.log('Initial currentMonth state (timezone-aware):', today);
    return today;
  }); // Format: YYYY-MM
  const [isResizing, setIsResizing] = useState(false);

  // Handle sidebar resize
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      // Min width: 320px, Max width: 600px
      if (newWidth >= 320 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Handle responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      const isTabletOrSmaller = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(isTabletOrSmaller);
      // On tablet/mobile, start with sidebar collapsed
      if (isTabletOrSmaller) {
        setSidebarCollapsed(true);
      } else {
        // On desktop, show sidebar by default
        setSidebarCollapsed(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    console.log('currentMonth changed to:', currentMonth);
    loadBudget();
  }, [currentMonth]); // Reload budget when month changes

  // Helper function to transform backend budget format to frontend format
  const transformBackendBudget = (backendBudget: any): Budget => {
    console.log('[transformBackendBudget] Input groups:', backendBudget.groups);

    if (!backendBudget.groups) {
      console.error('[transformBackendBudget] No groups found');
      return { ...backendBudget, groups: [] };
    }

    // If groups is already an array, use it as-is but ensure data integrity
    if (Array.isArray(backendBudget.groups)) {
      console.log('[transformBackendBudget] Groups already array format');
      const validatedBudget = { ...backendBudget };
      validatedBudget.groups = backendBudget.groups.map((group: any) => ({
        ...group,
        categories: (group.categories || []).map((cat: any) => ({
          ...cat,
          plannedAmount: Number(cat.plannedAmount) || 0,
          spentAmount: Number(cat.spentAmount) || 0,
          transactions: cat.transactions || []
        }))
      }));
      return validatedBudget as Budget;
    }

    // Transform object format to array format
    const groups: BudgetGroup[] = [];

    // Helper function to ensure category data integrity
    const validateCategory = (cat: any) => ({
      ...cat,
      plannedAmount: Number(cat.plannedAmount) || 0,
      spentAmount: Number(cat.spentAmount) || 0,
      transactions: cat.transactions || []
    });

    if (backendBudget.groups.income) {
      groups.push({
        id: 'income-group',
        name: 'Income',
        type: 'income',
        icon: '💰',
        isCollapsed: false,
        order: 1,
        categories: backendBudget.groups.income.map(validateCategory)
      });
    }

    if (backendBudget.groups.savings) {
      groups.push({
        id: 'savings-group',
        name: 'Savings',
        type: 'savings',
        icon: '💾',
        isCollapsed: false,
        order: 2,
        categories: backendBudget.groups.savings.map(validateCategory)
      });
    }

    if (backendBudget.groups.expenses) {
      groups.push({
        id: 'expenses-group',
        name: 'Expenses',
        type: 'expense',
        icon: '💸',
        isCollapsed: false,
        order: 3,
        categories: backendBudget.groups.expenses.map(validateCategory)
      });
    }

    console.log('[transformBackendBudget] Transformed to', groups.length, 'groups');
    return { ...backendBudget, groups };
  };

  // Helper function to create budget from AI-generated data
  const createBudgetFromAIData = (parsedBudget: any, month: string): Budget => {
    const mockUser = getMockUser();
    return {
      id: `budget_${Date.now()}`,
      userId: mockUser?.userId || 'mock_user_id',
      month: month,
      groups: [
        {
          id: 'income-group',
          name: 'Income',
          type: 'income',
          icon: '💰',
          isCollapsed: false,
          order: 1,
          categories: parsedBudget.income?.map((cat: any, index: number) => ({
            ...cat,
            spentAmount: 0,
            transactions: [],
            order: index + 1,
            isRecurring: false
          })) || []
        },
        {
          id: 'savings-group',
          name: 'Savings',
          type: 'savings',
          icon: '💾',
          isCollapsed: false,
          order: 2,
          categories: parsedBudget.savings?.map((cat: any, index: number) => ({
            ...cat,
            spentAmount: 0,
            transactions: [],
            order: index + 1,
            isRecurring: false
          })) || []
        },
        {
          id: 'expenses-group',
          name: 'Expenses',
          type: 'expense',
          icon: '💸',
          isCollapsed: false,
          order: 3,
          categories: parsedBudget.expenses?.map((cat: any, index: number) => ({
            ...cat,
            spentAmount: 0,
            transactions: [],
            order: index + 1,
            isRecurring: false
          })) || []
        }
      ],
      isAIGenerated: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  const loadBudget = async () => {
    try {
      // Clear budget state immediately to prevent showing wrong month's data
      setBudget(null);
      setLoading(true);

      console.log('[loadBudget] Loading budget for month:', currentMonth);

      // Fetch all budgets from backend
      const response = await fetch(`${API_BASE_URL}/budget`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('budgetbuddy_id_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('[loadBudget] Failed to fetch budgets. Status:', response.status);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('[loadBudget] Backend response:', data);

      // CRITICAL FIX: Handle both response formats (data.budgets and data.data.budgets)
      const budgets = data.data?.budgets || data.budgets || [];
      const budgetCount = budgets.length;

      console.log('[loadBudget] Found', budgetCount, 'budget(s) in backend');

      if (budgetCount > 0) {
        // Find budget for the EXACT month being viewed
        const monthBudget = budgets.find((b: any) => b.month === currentMonth);

        if (monthBudget) {
          console.log('[loadBudget] Found budget for', currentMonth);
          // Transform backend format to frontend format
          const transformedBudget = transformBackendBudget(monthBudget);
          console.log('[loadBudget] Transformed budget:', transformedBudget);
          setBudget(transformedBudget);
          setLoading(false);
          return;
        }

        // No budget for this specific month, but other budgets exist
        console.log('[loadBudget] No budget found for', currentMonth, '(other months have budgets)');
        setBudget(null);
        setLoading(false);
        return;
      }

      // No budgets exist at all in backend
      console.log('[loadBudget] No budgets exist in backend');

      // Only check for AI budget if this is the current month
      const isCurrentMonth = currentMonth === getCurrentMonthString();
      console.log('[loadBudget] Is current month?', isCurrentMonth);

      if (isCurrentMonth) {
        const aiGeneratedBudget = localStorage.getItem('ai-generated-budget');

        if (aiGeneratedBudget) {
          console.log('[loadBudget] Using AI-generated budget for current month');
          const parsedBudget = JSON.parse(aiGeneratedBudget);
          const budget = createBudgetFromAIData(parsedBudget, currentMonth);

          setBudget(budget);
          await saveBudgetToBackend(budget);
          setLoading(false);
          return;
        } else {
          // No AI budget - redirect to onboarding
          console.log('[loadBudget] No AI budget found, redirecting to onboarding');
          navigate('/onboarding');
          return;
        }
      }

      // Not current month and no budgets exist - show empty state
      console.log('[loadBudget] Not current month, showing empty state');
      setBudget(null);
      setLoading(false);

    } catch (error) {
      console.error('[loadBudget] Error loading budget:', error);
      setBudget(null);
      setLoading(false);
    }
  };

  const saveBudgetToBackend = async (budgetData: Budget) => {
    try {
      const token = localStorage.getItem('budgetbuddy_id_token');
      if (!token) {
        console.error('[saveBudgetToBackend] No auth token found');
        return;
      }

      console.log('[saveBudgetToBackend] Saving budget for month:', budgetData.month);

      // Transform groups array to object format for backend
      const groupsForBackend = {
        income: budgetData.groups.find(g => g.type === 'income')?.categories || [],
        savings: budgetData.groups.find(g => g.type === 'savings')?.categories || [],
        expenses: budgetData.groups.find(g => g.type === 'expense')?.categories || []
      };

      const response = await fetch(`${API_BASE_URL}/budget`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          month: budgetData.month,
          groups: groupsForBackend,
          isAIGenerated: budgetData.isAIGenerated
        })
      });

      // CRITICAL FIX: Treat 409 conflict as success (budget already exists)
      if (response.ok || response.status === 409) {
        console.log('[saveBudgetToBackend] Budget saved or already exists (status:', response.status, ')');

        // Clear AI budget from localStorage after successful save
        localStorage.removeItem('ai-generated-budget');
        console.log('[saveBudgetToBackend] Cleared AI budget from localStorage');

        if (response.status === 409) {
          // Budget already exists - reload from backend to get the existing one
          console.log('[saveBudgetToBackend] Budget already exists (409), reloading from backend');
          await loadBudget();
        } else {
          // Successfully created - update local state
          const savedBudget = await response.json();
          console.log('[saveBudgetToBackend] Budget saved successfully:', savedBudget);
          if (savedBudget.data) {
            console.log('[saveBudgetToBackend] Updating local state with saved budget');
            const transformedBudget = transformBackendBudget(savedBudget.data);
            setBudget(transformedBudget);
          }
        }
      } else {
        const errorText = await response.text();
        console.error('[saveBudgetToBackend] Failed to save budget (status:', response.status, '):', errorText);
      }
    } catch (error) {
      console.error('[saveBudgetToBackend] Error saving budget:', error);
    }
  };

  const calculateTotals = () => {
    if (!budget) return { income: 0, planned: 0, spent: 0, remaining: 0 };

    // Safety check: ensure groups is an array
    if (!Array.isArray(budget.groups)) {
      console.error('[calculateTotals] budget.groups is not an array:', budget.groups);
      return { income: 0, planned: 0, spent: 0, remaining: 0 };
    }

    const incomeGroup = budget.groups.find(g => g.type === 'income');
    const income = incomeGroup?.categories.reduce((sum, cat) => sum + cat.plannedAmount, 0) || 0;

    const nonIncomeGroups = budget.groups.filter(g => g.type !== 'income');
    const planned = nonIncomeGroups.reduce((sum, group) =>
      sum + group.categories.reduce((catSum, cat) => catSum + cat.plannedAmount, 0), 0
    );

    const spent = nonIncomeGroups.reduce((sum, group) =>
      sum + group.categories.reduce((catSum, cat) => catSum + cat.spentAmount, 0), 0
    );

    // Remaining = money left to budget (income - planned allocations)
    // This shows how much income hasn't been allocated to categories yet
    const remaining = income - planned;

    return {
      income,
      planned,
      spent,
      remaining
    };
  };

  const openTransactionModal = (type: 'income' | 'expense') => {
    setTransactionType(type);
    setTransactionForm({
      amount: '',
      description: '',
      date: getTodayString(),
      categoryId: ''
    });
    setShowTransactionModal(true);
    setShowFAB(false);
  };

  const closeTransactionModal = () => {
    setShowTransactionModal(false);
    setTransactionType(null);
    setTransactionForm({
      amount: '',
      description: '',
      date: getTodayString(),
      categoryId: ''
    });
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budget || !transactionForm.amount || !transactionForm.categoryId) return;

    const amount = parseFloat(transactionForm.amount);
    if (isNaN(amount)) return;

    // Create new transaction
    const newTransaction: Transaction = {
      id: `transaction_${Date.now()}`,
      categoryId: transactionForm.categoryId,
      amount: amount,
      description: transactionForm.description || 'Transaction',
      date: transactionForm.date,
      createdAt: new Date().toISOString()
    };

    // Update budget with new transaction
    const updatedBudget = { ...budget };
    updatedBudget.groups = updatedBudget.groups.map(group => ({
      ...group,
      categories: group.categories.map(cat => {
        if (cat.id === transactionForm.categoryId) {
          return {
            ...cat,
            spentAmount: cat.spentAmount + amount,
            transactions: [...cat.transactions, newTransaction]
          };
        }
        return cat;
      })
    }));

    setBudget(updatedBudget);

    // Save to backend
    await saveBudgetToBackend(updatedBudget);

    closeTransactionModal();
  };

  const getAvailableCategories = () => {
    if (!budget || !transactionType) return [];

    if (transactionType === 'income') {
      return budget.groups.find(g => g.type === 'income')?.categories || [];
    } else {
      return budget.groups
        .filter(g => g.type === 'expense' || g.type === 'savings')
        .flatMap(g => g.categories);
    }
  };

  // Budget item management functions
  const openBudgetItemModal = (groupType: 'income' | 'savings' | 'expense', category?: BudgetCategory) => {
    setSelectedGroupType(groupType);
    if (category) {
      setEditingCategory(category);
      setBudgetItemForm({
        name: category.name,
        icon: category.icon,
        plannedAmount: category.plannedAmount.toString(),
        isRecurring: category.isRecurring,
        recurringFrequency: category.recurringFrequency || 'monthly'
      });
    } else {
      setEditingCategory(null);
      setBudgetItemForm({
        name: '',
        icon: groupType === 'income' ? '💰' : groupType === 'savings' ? '💾' : '💸',
        plannedAmount: '',
        isRecurring: false,
        recurringFrequency: 'monthly'
      });
    }
    setShowBudgetItemModal(true);
  };

  const closeBudgetItemModal = () => {
    setShowBudgetItemModal(false);
    setEditingCategory(null);
    setSelectedGroupType(null);
    setBudgetItemForm({
      name: '',
      icon: '💰',
      plannedAmount: '',
      isRecurring: false,
      recurringFrequency: 'monthly'
    });
  };

  const handleBudgetItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budget || !selectedGroupType || !budgetItemForm.name || !budgetItemForm.plannedAmount) return;

    const amount = parseFloat(budgetItemForm.plannedAmount);
    if (isNaN(amount)) return;

    const updatedBudget = { ...budget };

    if (editingCategory) {
      // Edit existing category
      updatedBudget.groups = updatedBudget.groups.map(group => ({
        ...group,
        categories: group.categories.map(cat => {
          if (cat.id === editingCategory.id) {
            return {
              ...cat,
              name: budgetItemForm.name,
              icon: budgetItemForm.icon,
              plannedAmount: amount,
              isRecurring: budgetItemForm.isRecurring,
              recurringFrequency: budgetItemForm.isRecurring ? budgetItemForm.recurringFrequency : undefined
            };
          }
          return cat;
        })
      }));
    } else {
      // Add new category
      const newCategory: BudgetCategory = {
        id: `category_${Date.now()}`,
        name: budgetItemForm.name,
        icon: budgetItemForm.icon,
        plannedAmount: amount,
        spentAmount: 0,
        transactions: [],
        order: 999,
        isRecurring: budgetItemForm.isRecurring,
        recurringFrequency: budgetItemForm.isRecurring ? budgetItemForm.recurringFrequency : undefined
      };

      updatedBudget.groups = updatedBudget.groups.map(group => {
        if (group.type === selectedGroupType) {
          return {
            ...group,
            categories: [...group.categories, newCategory]
          };
        }
        return group;
      });
    }

    setBudget(updatedBudget);
    await saveBudgetToBackend(updatedBudget);
    closeBudgetItemModal();
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!budget) return;
    if (!confirm('Are you sure you want to delete this budget item?')) return;

    const updatedBudget = { ...budget };
    updatedBudget.groups = updatedBudget.groups.map(group => ({
      ...group,
      categories: group.categories.filter(cat => cat.id !== categoryId)
    }));

    setBudget(updatedBudget);
    await saveBudgetToBackend(updatedBudget);
  };

  const handleLogout = () => {
    // Clear all auth tokens
    localStorage.removeItem('budgetbuddy_access_token');
    localStorage.removeItem('budgetbuddy_refresh_token');
    localStorage.removeItem('budgetbuddy_id_token');
    localStorage.removeItem('budgetbuddy_expires_at');

    // Navigate to login
    navigate('/auth');
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    // CRITICAL FIX: Clear budget immediately when changing months
    setBudget(null);

    const [year, month] = currentMonth.split('-').map(Number);
    const offset = direction === 'prev' ? -1 : 1;
    const date = new Date(year, month - 1 + offset, 1);
    const newMonth = date.toISOString().slice(0, 7);

    console.log('[changeMonth] Switching from', currentMonth, 'to', newMonth);
    setCurrentMonth(newMonth);
  };

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1, 1); // Create in local timezone
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const selectMonth = (offset: number) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    setCurrentMonth(date.toISOString().slice(0, 7));
  };

  // Navigate to current month - FIXED: Now uses user's local timezone
  const goToToday = () => {
    const today = getCurrentMonthString();
    console.log('goToToday called (timezone-aware), setting month to:', today);
    setCurrentMonth(today);
  };

  // Check if viewing a future month - FIXED: Now uses timezone-aware helper
  const isFutureMonthCheck = () => {
    return isFutureMonth(currentMonth);
  };

  // Check if viewing a past month - FIXED: Now uses timezone-aware helper
  const isPastMonthCheck = () => {
    return isPastMonth(currentMonth);
  };

  // Copy previous month's budget for future month
  const copyPreviousMonthBudget = async () => {
    try {
      setLoading(true);
      console.log('[copyPreviousMonthBudget] Starting budget copy for month:', currentMonth);

      // Calculate previous month
      const [year, month] = currentMonth.split('-').map(Number);
      const prevMonthDate = new Date(year, month - 2, 1);
      const prevMonth = prevMonthDate.toISOString().slice(0, 7);
      console.log('[copyPreviousMonthBudget] Looking for previous month budget:', prevMonth);

      // Fetch previous month's budget
      const response = await fetch(`${API_BASE_URL}/budget`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('budgetbuddy_id_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('[copyPreviousMonthBudget] Failed to fetch budgets. Status:', response.status);
        alert('Failed to fetch budgets. Please try again.');
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('[copyPreviousMonthBudget] API response:', data);

      // CRITICAL FIX: Handle both response formats (data.budgets and data.data.budgets)
      const budgets = data.data?.budgets || data.budgets || [];
      console.log('[copyPreviousMonthBudget] Found budgets:', budgets.length);

      const prevBudget = budgets.find((b: any) => b.month === prevMonth);

      if (prevBudget) {
        console.log('[copyPreviousMonthBudget] Found previous month budget, copying...');

        // Transform backend budget to frontend format first
        const transformedPrevBudget = transformBackendBudget(prevBudget);

        // Copy budget structure but reset spent amounts and transactions
        const newBudget: Budget = {
          ...transformedPrevBudget,
          id: `budget_${Date.now()}`,
          month: currentMonth,
          groups: transformedPrevBudget.groups.map((group: BudgetGroup) => ({
            ...group,
            categories: group.categories.map((cat: BudgetCategory) => ({
              ...cat,
              id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              spentAmount: 0,
              transactions: []
            }))
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        console.log('[copyPreviousMonthBudget] Created new budget:', newBudget);
        setBudget(newBudget);
        await saveBudgetToBackend(newBudget);
        console.log('[copyPreviousMonthBudget] Budget copied successfully');
      } else {
        console.warn('[copyPreviousMonthBudget] No previous month budget found to copy');

        // Create empty budget structure for future month
        const mockUser = getMockUser();
        const emptyBudget: Budget = {
          id: `budget_${Date.now()}`,
          userId: mockUser?.userId || 'mock_user_id',
          month: currentMonth,
          groups: [
            {
              id: 'income-group',
              name: 'Income',
              type: 'income',
              icon: '💰',
              isCollapsed: false,
              order: 1,
              categories: []
            },
            {
              id: 'savings-group',
              name: 'Savings',
              type: 'savings',
              icon: '💾',
              isCollapsed: false,
              order: 2,
              categories: []
            },
            {
              id: 'expenses-group',
              name: 'Expenses',
              type: 'expense',
              icon: '💸',
              isCollapsed: false,
              order: 3,
              categories: []
            }
          ],
          isAIGenerated: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        console.log('[copyPreviousMonthBudget] Created empty budget structure');
        setBudget(emptyBudget);
        await saveBudgetToBackend(emptyBudget);

        // Show user feedback
        alert(`No budget found for ${getMonthName(prevMonth)}. Created empty budget structure for ${getMonthName(currentMonth).split(' ')[0]}. You can now add your income and expense categories.`);
      }

      setLoading(false);
    } catch (error) {
      console.error('[copyPreviousMonthBudget] Error copying previous month budget:', error);
      alert('Failed to create budget. Please try again.');
      setLoading(false);
    }
  };

  // Reset budget and navigate to AI setup
  const handleResetBudget = () => {
    if (!budget) return;

    // Clear budget state
    setBudget(null);

    // Clear AI-generated budget from localStorage if it exists
    localStorage.removeItem('ai-generated-budget');

    // Navigate to AI budget generation page
    // The new budget will overwrite the old one when saved
    navigate('/onboarding');
  };

  const handleDeleteTransaction = async (transactionId: string, categoryId: string) => {
    if (!budget) return;
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    const updatedBudget = { ...budget };
    updatedBudget.groups = updatedBudget.groups.map(group => ({
      ...group,
      categories: group.categories.map(cat => {
        if (cat.id === categoryId) {
          const transaction = cat.transactions.find(t => t.id === transactionId);
          if (transaction) {
            return {
              ...cat,
              spentAmount: cat.spentAmount - transaction.amount,
              transactions: cat.transactions.filter(t => t.id !== transactionId)
            };
          }
        }
        return cat;
      })
    }));

    setBudget(updatedBudget);
    await saveBudgetToBackend(updatedBudget);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your budget...</p>
        </div>
      </div>
    );
  }

  // CRITICAL FIX: Only show "No Budget Found" for past/current months
  // Future months will render the full layout with the "Start Planning" empty state inside
  if (!budget && !isFutureMonthCheck()) {
    // Past or current month without budget - show "No Budget Found" state with choice
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Navigation Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900">
              {getMonthName(currentMonth)}
            </h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={goToToday}
                className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => changeMonth('prev')}
                className="p-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Previous month"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => changeMonth('next')}
                className="p-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Next month"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Empty State Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-lg px-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              No budget found for {getMonthName(currentMonth)}
            </h2>
            <p className="text-gray-600 mb-8">
              Choose how you'd like to create your budget:
            </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AI-Generated Budget Option */}
            <button
              onClick={() => navigate('/onboarding')}
              className="p-6 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-left"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4 mx-auto">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">AI-Generated</h3>
              <p className="text-sm text-gray-600 text-center">
                Let AI create a personalized budget based on your income and goals
              </p>
            </button>

            {/* Manual Budget Option */}
            <button
              onClick={() => {
                // Create an empty budget structure for manual entry
                const mockUser = getMockUser();
                const emptyBudget: Budget = {
                  id: `budget_${Date.now()}`,
                  userId: mockUser?.userId || 'mock_user_id',
                  month: currentMonth,
                  groups: [
                    {
                      id: 'income-group',
                      name: 'Income',
                      type: 'income',
                      icon: '💰',
                      isCollapsed: false,
                      order: 1,
                      categories: []
                    },
                    {
                      id: 'savings-group',
                      name: 'Savings',
                      type: 'savings',
                      icon: '💾',
                      isCollapsed: false,
                      order: 2,
                      categories: []
                    },
                    {
                      id: 'expenses-group',
                      name: 'Expenses',
                      type: 'expense',
                      icon: '💸',
                      isCollapsed: false,
                      order: 3,
                      categories: []
                    }
                  ],
                  isAIGenerated: false,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };
                setBudget(emptyBudget);
                saveBudgetToBackend(emptyBudget);
              }}
              className="p-6 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-4 mx-auto">
                <span className="text-2xl">✏️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Start from Scratch</h3>
              <p className="text-sm text-gray-600 text-center">
                Create your budget manually by adding categories yourself
              </p>
            </button>
          </div>
          </div>
        </div>
      </div>
    );
  }

  // For future months without budget, we continue to render the full layout
  // The "Start Planning" empty state is rendered in the center column below
  const totals = budget ? calculateTotals() : { income: 0, planned: 0, spent: 0, remaining: 0 };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar - Responsive Navigation */}
      {!sidebarCollapsed && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      <div className={`
        ${isMobile && sidebarCollapsed ? 'hidden' : ''}
        ${isMobile && !sidebarCollapsed ? 'fixed inset-y-0 left-0 z-50 w-64' : ''}
        ${!isMobile && sidebarCollapsed ? 'w-16' : ''}
        ${!isMobile && !sidebarCollapsed ? 'w-64' : ''}
        bg-white border-r border-gray-200 flex flex-col transition-all duration-300
      `}>
        {/* Logo/Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">$</span>
              </div>
              {!sidebarCollapsed && (
                <span className="font-semibold text-gray-900">BudgetBuddy</span>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-gray-400 hover:text-gray-600 lg:hidden"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sidebarCollapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                )}
              </svg>
            </button>
          </div>

        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            <li>
              <a href="#" className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center px-2' : 'space-x-3 px-3'} text-blue-600 bg-blue-50 py-2 rounded-lg`}>
                <span>📊</span>
                {(!sidebarCollapsed || isMobile) && <span className="font-medium">Budget</span>}
              </a>
            </li>
            <li>
              <a href="#" className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center px-2' : 'space-x-3 px-3'} text-gray-600 hover:text-gray-900 py-2 rounded-lg hover:bg-gray-50`}>
                <span>🏦</span>
                {(!sidebarCollapsed || isMobile) && (
                  <>
                    <span>Accounts</span>
                    <span className="ml-auto bg-blue-500 text-white text-xs px-2 py-1 rounded-full">New</span>
                  </>
                )}
              </a>
            </li>
            <li>
              <a href="#" className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center px-2' : 'space-x-3 px-3'} text-gray-600 hover:text-gray-900 py-2 rounded-lg hover:bg-gray-50`}>
                <span>🗺️</span>
                {(!sidebarCollapsed || isMobile) && <span>Roadmap</span>}
              </a>
            </li>
            <li>
              <a href="#" className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center px-2' : 'space-x-3 px-3'} text-gray-600 hover:text-gray-900 py-2 rounded-lg hover:bg-gray-50`}>
                <span>💳</span>
                {(!sidebarCollapsed || isMobile) && <span>Paycheck Planning</span>}
              </a>
            </li>
            <li>
              <a href="#" className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center px-2' : 'space-x-3 px-3'} text-gray-600 hover:text-gray-900 py-2 rounded-lg hover:bg-gray-50`}>
                <span>🎯</span>
                {(!sidebarCollapsed || isMobile) && <span>Goals</span>}
              </a>
            </li>
            <li>
              <a href="#" className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center px-2' : 'space-x-3 px-3'} text-gray-600 hover:text-gray-900 py-2 rounded-lg hover:bg-gray-50`}>
                <span>📈</span>
                {(!sidebarCollapsed || isMobile) && <span>Insights</span>}
              </a>
            </li>
            <li>
              <a href="#" className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center px-2' : 'space-x-3 px-3'} text-gray-600 hover:text-gray-900 py-2 rounded-lg hover:bg-gray-50`}>
                <span>📰</span>
                {(!sidebarCollapsed || isMobile) && <span>My Feed</span>}
              </a>
            </li>
            <li>
              <a href="#" className={`flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center px-2' : 'space-x-3 px-3'} text-gray-600 hover:text-gray-900 py-2 rounded-lg hover:bg-gray-50`}>
                <span>❓</span>
                {(!sidebarCollapsed || isMobile) && <span>Help Center</span>}
              </a>
            </li>
            <li>
              <button
                onClick={() => navigate('/settings')}
                className={`w-full flex items-center ${sidebarCollapsed && !isMobile ? 'justify-center px-2' : 'space-x-3 px-3'} text-blue-600 hover:text-blue-700 py-2 rounded-lg hover:bg-blue-50 font-medium`}
              >
                <span>⚙️</span>
                {(!sidebarCollapsed || isMobile) && <span>Settings</span>}
              </button>
            </li>
          </ul>
        </nav>

        {/* Bottom Section - User Profile */}
        <div className="mt-auto border-t border-gray-200">
          {!sidebarCollapsed && (
            <div className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  DM
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">dmytro.malyk@g...</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Sign out
              </button>
            </div>
          )}
          {sidebarCollapsed && !isMobile && (
            <div className="p-2 flex justify-center">
              <button
                onClick={handleLogout}
                className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold hover:bg-blue-600"
                title="Sign out"
              >
                DM
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Center Column - Budget Categories */}
        <div className="flex-1 bg-white">
          {/* Mobile Header */}
          {isMobile && (
            <div className="lg:hidden p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="text-center flex-1">
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <button
                      onClick={() => changeMonth('prev')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h1 className="text-lg font-semibold text-gray-900">
                      {getMonthName(currentMonth)}
                    </h1>
                    <button
                      onClick={() => changeMonth('next')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  <p className={`text-sm font-medium ${totals.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ${totals.remaining.toLocaleString()} left to budget
                  </p>
                </div>
                <div className="w-6"></div> {/* Spacer for centering */}
              </div>
            </div>
          )}

          {/* Desktop/Tablet Header */}
          <div className={`p-6 border-b border-gray-200 bg-gray-50 ${isMobile ? 'hidden lg:block' : ''}`}>
            {/* Hamburger menu for tablet */}
            {isMobile && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="text-gray-600 hover:text-gray-900 lg:hidden mb-4"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}

            {/* New Header Design */}
            <div className="flex items-center justify-between">
              {/* Left: Month Title and Budget Remaining */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  {getMonthName(currentMonth)}
                </h1>
                {budget && (
                  <p className="text-lg text-gray-600">
                    <span className={`font-semibold ${totals.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${Math.abs(totals.remaining).toLocaleString()}
                    </span>
                    {' '}left to budget
                  </p>
                )}
              </div>

              {/* Right: Navigation Controls */}
              <div className="flex items-center space-x-2">
                {/* Reset Button - Only show if budget exists */}
                {budget && (
                  <button
                    onClick={() => setShowResetModal(true)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    Reset
                  </button>
                )}

                {/* Today Button */}
                <button
                  onClick={goToToday}
                  className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                >
                  Today
                </button>

                {/* Previous Month Button */}
                <button
                  onClick={() => changeMonth('prev')}
                  className="p-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                  aria-label="Previous month"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Next Month Button */}
                <button
                  onClick={() => changeMonth('next')}
                  className="p-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                  aria-label="Next month"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                    </button>
              </div>
            </div>

            {/* Future Month Warning */}
            {isFutureMonthCheck() && (
              <div className="mt-4 flex items-center justify-end">
                <div className="inline-flex items-center px-3 py-1.5 bg-yellow-100 border border-yellow-300 rounded-full">
                  <svg className="w-4 h-4 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-yellow-800">You are viewing a future month.</span>
                </div>
              </div>
            )}

            {/* Past Month Warning */}
            {isPastMonthCheck() && (
              <div className="mt-4 flex items-center justify-end">
                <div className="inline-flex items-center px-3 py-1.5 bg-orange-100 border border-orange-300 rounded-full">
                  <svg className="w-4 h-4 text-orange-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-orange-800">You are viewing a past month.</span>
                </div>
              </div>
            )}
          </div>

          {/* Empty State for Future Months */}
          {!budget && isFutureMonthCheck() && (
            <div className="flex items-center justify-center min-h-[500px] p-8">
              <div className="text-center max-w-md">
                {/* Icon */}
                <div className="mb-6 flex justify-center">
                  <div className="w-48 h-48 rounded-full border-4 border-gray-200 flex items-center justify-center">
                    <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 3v6h6" />
                    </svg>
                  </div>
                </div>

                {/* Message */}
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Hey there, looks like you need a budget for {getMonthName(currentMonth).split(' ')[0]}.
                </h2>
                <p className="text-gray-600 mb-6">
                  We'll copy {(() => {
                    const [year, month] = currentMonth.split('-').map(Number);
                    const prevDate = new Date(year, month - 2, 1);
                    return getMonthName(prevDate.toISOString().slice(0, 7)).split(' ')[0];
                  })()} budget to get you started.
                </p>

                {/* Action Button */}
                <button
                  onClick={copyPreviousMonthBudget}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
                >
                  Start Planning for {getMonthName(currentMonth).split(' ')[0]}
                </button>
              </div>
            </div>
          )}

          {/* Budget Categories */}
          {budget && (
          <div className="p-4 lg:p-6 space-y-6 lg:space-y-8">
            {budget.groups.map(group => (
              <div key={group.id} className="space-y-4">
                {/* Group Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-500 text-sm">●</span>
                    <h2 className="text-lg font-semibold text-gray-900">{group.name}</h2>
                    <span className="text-sm text-gray-500">for {getMonthName(currentMonth).split(' ')[0]}</span>
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  <div className="hidden md:flex items-center space-x-4 text-sm">
                    <div className="text-right w-24 flex-shrink-0">
                      <div className="text-gray-500">Planned</div>
                    </div>
                    <div className="text-right w-24 flex-shrink-0">
                      <div className="text-gray-500">{group.type === 'income' ? 'Received' : 'Spent'}</div>
                    </div>
                    <div className="w-16 flex-shrink-0"></div>
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-2">
                  {group.categories.map(category => (
                    <div key={category.id} className={`group/item flex flex-col md:flex-row md:items-center justify-between py-3 px-4 rounded-lg space-y-2 md:space-y-0 ${
                      category.spentAmount > category.plannedAmount
                        ? 'bg-red-50 border-l-4 border-red-500 hover:bg-red-100'
                        : 'hover:bg-gray-50'
                    }`}>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span>{category.icon}</span>
                          <div className="font-medium text-gray-900">{category.name}</div>
                        </div>
                        {category.isRecurring && (
                          <div className="text-xs text-green-600 ml-6">
                            {category.recurringFrequency} • Next: {category.nextDueDate && new Date(category.nextDueDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center md:space-x-4">
                        <div className="text-left md:text-right md:w-24 flex-shrink-0">
                          <div className="text-xs md:hidden text-gray-500">Planned</div>
                          <div className="font-medium">${category.plannedAmount.toLocaleString()}</div>
                        </div>
                        <div className="text-right md:w-24 flex-shrink-0">
                          <div className="text-xs md:hidden text-gray-500">
                            {group.type === 'income' ? 'Received' : 'Spent'}
                          </div>
                          <div className={`font-medium ${
                            category.spentAmount > category.plannedAmount
                              ? 'text-red-600'
                              : category.spentAmount > 0
                                ? 'text-green-600'
                                : 'text-gray-400'
                          }`}>
                            ${category.spentAmount.toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 w-16 justify-end opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={() => openBudgetItemModal(group.type, category)}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Item Button */}
                  <button
                    onClick={() => openBudgetItemModal(group.type)}
                    className="w-full text-left py-3 px-4 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    + Add Item
                  </button>
                </div>

                {/* Group Total */}
                <div className="flex flex-col md:flex-row md:items-center justify-between py-3 px-4 bg-gray-50 rounded-lg font-semibold space-y-2 md:space-y-0">
                  <div className="text-gray-900">Total {group.name}</div>
                  <div className="flex items-center md:space-x-4">
                    <div className="text-left md:text-right md:w-24 flex-shrink-0">
                      <div className="text-xs md:hidden text-gray-500 font-normal">Planned</div>
                      <div>${group.categories.reduce((sum, cat) => sum + cat.plannedAmount, 0).toLocaleString()}</div>
                    </div>
                    <div className="text-right md:w-24 flex-shrink-0">
                      <div className="text-xs md:hidden text-gray-500 font-normal">Received</div>
                      <div>${group.categories.reduce((sum, cat) => sum + cat.spentAmount, 0).toLocaleString()}</div>
                    </div>
                    <div className="w-16 flex-shrink-0 hidden md:block"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Right Sidebar - Summary/Transactions */}
        <div
          className="hidden md:block bg-white border-l border-gray-200 relative"
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Resize Handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors group"
            onMouseDown={handleMouseDown}
            style={{ marginLeft: '-2px' }}
          >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-gray-300 rounded-full group-hover:bg-blue-500 transition-colors"></div>
          </div>
          <div className="p-6">
            {/* Main Tabs - Summary / Transactions */}
            <div className="flex items-center justify-center space-x-8 mb-6">
              <button
                onClick={() => setActiveTab('summary')}
                className={`flex flex-col items-center space-y-1 pb-2 ${
                  activeTab === 'summary' ? 'border-b-2 border-blue-600' : ''
                }`}
              >
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className={`text-sm font-medium ${activeTab === 'summary' ? 'text-blue-600' : 'text-gray-500'}`}>
                  Summary
                </span>
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`flex flex-col items-center space-y-1 pb-2 ${
                  activeTab === 'transactions' ? 'border-b-2 border-blue-600' : ''
                }`}
              >
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className={`text-sm font-medium ${activeTab === 'transactions' ? 'text-blue-600' : 'text-gray-500'}`}>
                  Transactions
                </span>
              </button>
            </div>

            {/* Summary View */}
            {activeTab === 'summary' && (
              <div className="space-y-6">
                {/* Circular Progress Chart */}
                <div className="flex flex-col items-center">
                  <div className="relative w-48 h-48">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="80"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="16"
                      />
                      {/* Income segment (blue) */}
                      <circle
                        cx="96"
                        cy="96"
                        r="80"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="16"
                        strokeDasharray={`${(totals.income / totals.planned) * 502} 502`}
                        strokeDashoffset="0"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-xs text-gray-500 uppercase">Income</div>
                      <div className="text-2xl font-bold text-gray-900">${totals.income.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="text-gray-500 uppercase mb-1">Planned</div>
                    <div className="font-semibold text-gray-900">${totals.planned.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 uppercase mb-1">Spent</div>
                    <div className="font-semibold text-gray-900">${totals.spent.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 uppercase mb-1">Remaining</div>
                    <div className="font-semibold text-gray-900">${totals.remaining.toLocaleString()}</div>
                  </div>
                </div>

                {/* Category Breakdown by Group */}
                <div className="space-y-3">
                  {budget && budget.groups.filter(g => g.type !== 'income').map((group, index) => {
                    const groupTotal = group.categories.reduce((sum, cat) => sum + cat.plannedAmount, 0);
                    const percentage = totals.planned > 0 ? Math.round((groupTotal / totals.planned) * 100) : 0;
                    const colors = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
                    const color = colors[index % colors.length];

                    return (
                      <div key={group.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                          <span className="text-sm font-medium" style={{ color }}>{group.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold text-gray-900">${groupTotal.toLocaleString()}</span>
                          <span className="text-xs text-gray-500">({percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Individual Category Details */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Category Details</h3>
                  <div className="space-y-4">
                    {budget && budget.groups.filter(g => g.type !== 'income').map((group) => (
                      <div key={group.id}>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">{group.name}</div>
                        <div className="space-y-2">
                          {group.categories.map((category) => {
                            const spent = category.spentAmount;
                            const planned = category.plannedAmount;
                            const remaining = planned - spent;
                            const percentSpent = planned > 0 ? Math.round((spent / planned) * 100) : 0;
                            const isOverspent = spent > planned;

                            return (
                              <div key={category.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-2 flex-1">
                                  <span className="text-sm">{category.icon}</span>
                                  <span className="text-sm font-medium text-gray-900">{category.name}</span>
                                </div>
                                <div className="flex items-center space-x-4 text-xs">
                                  <div className="text-right">
                                    <div className={`font-semibold ${isOverspent ? 'text-red-600' : 'text-gray-900'}`}>
                                      ${spent.toLocaleString()}
                                    </div>
                                    <div className="text-gray-500">of ${planned.toLocaleString()}</div>
                                  </div>
                                  <div className={`font-medium ${isOverspent ? 'text-red-600' : remaining === 0 ? 'text-gray-400' : 'text-green-600'}`}>
                                    ({percentSpent}%)
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Transactions View */}
            {activeTab === 'transactions' && (
              <>
                {/* Transaction Tabs */}
                <div className="flex space-x-6 mb-6 border-b border-gray-200">
                  <button className="pb-2 text-sm font-medium text-gray-500">New</button>
                  <button className="pb-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600">Tracked</button>
                  <button className="pb-2 text-sm font-medium text-gray-500">Deleted</button>
                </div>

                {/* Search */}
                <div className="mb-6">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className="space-y-4">
                  <div className="text-sm text-gray-500 mb-4">{new Date().toLocaleDateString('en-US', { month: 'long' })}</div>

                  {/* Real transactions from budget data */}
                  <div className="space-y-3">
                {budget && budget.groups.flatMap(group =>
                  group.categories.flatMap(cat =>
                    cat.transactions.map(transaction => {
                      const isIncome = group.type === 'income';
                      return (
                        <div key={transaction.id} className="group/transaction flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                          <div className={`w-8 h-8 ${isIncome ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center`}>
                            <span className={`${isIncome ? 'text-green-600' : 'text-red-600'} text-xs`}>$</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{transaction.description}</div>
                            <div className="text-xs text-gray-500">{cat.name}</div>
                          </div>
                          <div className={`text-sm font-medium ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                            {isIncome ? '+' : '-'}${transaction.amount.toLocaleString()}
                          </div>
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id, cat.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors flex-shrink-0"
                            title="Delete transaction"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      );
                    })
                  )
                )}

                    {budget && budget.groups.every(g => g.categories.every(c => c.transactions.length === 0)) && (
                      <div className="text-center py-8 text-gray-400">
                        <p className="text-sm">No transactions yet</p>
                        <p className="text-xs mt-1">Use the + button to add your first transaction</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connect Bank Button */}
                <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">🏦</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-blue-900">Connect Your Bank</div>
                      <div className="text-xs text-blue-700">Try the premium version of BudgetBuddy</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        {showFAB && (
          <div className="mb-4 space-y-2">
            <button
              onClick={() => openTransactionModal('income')}
              className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-full shadow-lg transition-all"
            >
              <span className="text-lg">+</span>
              <span className="font-medium">Income</span>
            </button>
            <button
              onClick={() => openTransactionModal('expense')}
              className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-full shadow-lg transition-all"
            >
              <span className="text-lg">-</span>
              <span className="font-medium">Expense</span>
            </button>
          </div>
        )}
        <button
          onClick={() => setShowFAB(!showFAB)}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
        >
          <svg className={`w-6 h-6 transition-transform ${showFAB ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Transaction Modal */}
      {showTransactionModal && transactionType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {transactionType === 'income' ? 'Add Income Transaction' : 'Add Expense Transaction'}
              </h3>
              <button
                onClick={closeTransactionModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={transactionForm.categoryId}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a category...</option>
                  {getAvailableCategories().map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionForm.amount}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeTransactionModal}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Item Modal */}
      {showBudgetItemModal && selectedGroupType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingCategory ? 'Edit' : 'Plan'} {selectedGroupType === 'income' ? 'Income' : selectedGroupType === 'savings' ? 'Savings' : 'Expense'} Item
              </h3>
              <button
                onClick={closeBudgetItemModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleBudgetItemSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={budgetItemForm.name}
                  onChange={(e) => setBudgetItemForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Groceries, Rent, Salary..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon
                </label>
                <input
                  type="text"
                  value={budgetItemForm.icon}
                  onChange={(e) => setBudgetItemForm(prev => ({ ...prev, icon: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 💰 🏠 🚗 🍔"
                  maxLength={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Planned Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={budgetItemForm.plannedAmount}
                    onChange={(e) => setBudgetItemForm(prev => ({ ...prev, plannedAmount: e.target.value }))}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={budgetItemForm.isRecurring}
                  onChange={(e) => setBudgetItemForm(prev => ({ ...prev, isRecurring: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
                  Recurring
                </label>
              </div>

              {budgetItemForm.isRecurring && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={budgetItemForm.recurringFrequency}
                    onChange={(e) => setBudgetItemForm(prev => ({ ...prev, recurringFrequency: e.target.value as any }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeBudgetItemModal}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingCategory ? 'Save Changes' : 'Plan Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Budget Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            {/* Warning Icon */}
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              Reset Budget for {getMonthName(currentMonth).split(' ')[0]}?
            </h3>

            {/* Warning Message */}
            <p className="text-gray-600 text-center mb-6">
              This will permanently delete all categories and transactions for {getMonthName(currentMonth)}. This action cannot be undone.
            </p>

            {/* Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  handleResetBudget();
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Reset Budget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetPage;
