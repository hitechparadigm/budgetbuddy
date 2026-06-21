/**
 * Budget Page - EveryDollar Style Layout
 *
 * Three-column layout matching the EveryDollar screenshot:
 * - Left sidebar with navigation
 * - Center column with budget categories
 * - Right sidebar with transactions
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { QuickActionsFAB } from "../components/QuickActionsFAB";
import { ReceiptUpload } from "../components/ReceiptUpload";
import { CalendarView } from "../components/CalendarView";
import {
  TutorialOverlay,
  DEFAULT_TUTORIAL_STEPS,
} from "../components/TutorialOverlay";
import {
  TransactionFilters,
  useTransactionFilters,
} from "../components/TransactionFilters";
import {
  TransactionTemplateModal,
  addRecentCategory,
  type TransactionTemplate,
} from "../components/TransactionTemplateModal";
import MarkRecurringModal from "../components/MarkRecurringModal";
import {
  getCurrentMonthString,
  getTodayString,
  isFutureMonth,
  isPastMonth,
} from "../utils/monthHelpers";
import { getMockUser } from "../utils/mockAuth";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import {
  calculatePlannedMonthlyAmount,
  getOccurrenceDatesInMonth,
} from "@budget-buddy/shared";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";
import { EmptyState } from "../components/ui";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1';

// Data models
interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  plannedAmount: number;
  baseAmount?: number; // Per-occurrence amount for recurring items
  spentAmount: number;
  transactions: Transaction[];
  order: number;
  isRecurring: boolean;
  recurringFrequency?: "weekly" | "bi-weekly" | "monthly" | "annually";
  startDate?: string; // First occurrence date for recurring items
  nextDueDate?: string;
  // Frequency-based income/expense support
  frequency?: "monthly" | "biweekly" | "weekly" | "semi-monthly" | "one-time";
  frequencyAmount?: number; // Per-period amount for biweekly/weekly
  isOneTime?: boolean; // true when frequency === 'one-time'
}

interface BudgetGroup {
  id: string;
  name: string;
  type: "income" | "savings" | "expense";
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
  const currency = "USD"; // Default currency
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  // P6-T2: Slide-over state for the right sidebar at <md breakpoints
  const [showSidebarSlideOver, setShowSidebarSlideOver] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [selectedTransactionForRecurring, setSelectedTransactionForRecurring] =
    useState<{
      id: string;
      description: string;
      amount: number;
      date: string;
      categoryName?: string;
    } | null>(null);
  const [templateModalMode, setTemplateModalMode] = useState<"select" | "save">(
    "select",
  );

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(false);

  const [transactionType, setTransactionType] = useState<
    "income" | "expense" | null
  >(null);
  const [transactionForm, setTransactionForm] = useState({
    amount: "",
    description: "",
    date: getTodayString(),
    categoryId: "",
  });

  // Budget item management
  const [showBudgetItemModal, setShowBudgetItemModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(
    null,
  );
  const [selectedGroupType, setSelectedGroupType] = useState<
    "income" | "savings" | "expense" | null
  >(null);
  const [showResetModal, setShowResetModal] = useState(false);

  // Transaction filters state (replaces basic searchQuery)
  const { filters, setFilters, hasActiveFilters, clearFilters } =
    useTransactionFilters();

  // Sort state for transaction list
  const [sortBy, setSortBy] = useState<"date" | "amount" | "description">(
    "date",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [budgetItemForm, setBudgetItemForm] = useState({
    name: "",
    icon: "💰",
    plannedAmount: "",
    isRecurring: false,
    recurringFrequency: "monthly" as
      | "weekly"
      | "bi-weekly"
      | "monthly"
      | "annually",
    startDate: getTodayString(), // First occurrence date
    // Frequency-based income support
    frequency: "monthly" as "monthly" | "biweekly" | "weekly" | "semi-monthly" | "one-time",
    frequencyAmount: "", // Per-period amount for biweekly/weekly
  });

  // Inline category amount editing state (P3-T4)
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>('');

  const startInlineEdit = (categoryId: string, currentAmount: number) => {
    setInlineEditId(categoryId);
    setInlineEditValue(currentAmount.toString());
  };

  const commitInlineEdit = async (categoryId: string, groupType: 'income' | 'savings' | 'expense') => {
    const newAmount = parseFloat(inlineEditValue);
    if (isNaN(newAmount) || newAmount < 0 || !budget) {
      setInlineEditId(null);
      return;
    }
    const updatedBudget = { ...budget };
    updatedBudget.groups = updatedBudget.groups.map(g =>
      g.type !== groupType ? g : {
        ...g,
        categories: g.categories.map(c =>
          c.id !== categoryId ? c : { ...c, plannedAmount: newAmount }
        ),
      }
    );
    setBudget(updatedBudget);
    setInlineEditId(null);
    await saveBudgetToBackend(updatedBudget);
  };

  // Right sidebar tab state
  const [activeTab, setActiveTab] = useState<
    "summary" | "transactions" | "calendar"
  >("transactions");

  // Keyboard shortcuts help overlay
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Budget keyboard shortcuts
  useKeyboardShortcuts({
    enabled: !showTransactionModal && !showBudgetItemModal && !showResetModal,
    shortcuts: [
      {
        key: 't',
        description: 'Add transaction',
        action: () => {
          setTransactionType('expense');
          setTransactionForm({ amount: '', description: '', date: getTodayString(), categoryId: '' });
          setShowTransactionModal(true);
        },
      },
      {
        key: 'b',
        description: 'Add budget item',
        action: () => openBudgetItemModal('expense', undefined),
      },
      {
        key: 'ArrowLeft',
        description: 'Previous month',
        action: () => changeMonth('prev'),
      },
      {
        key: 'ArrowRight',
        description: 'Next month',
        action: () => changeMonth('next'),
      },
      {
        key: '?',
        description: 'Show keyboard shortcuts',
        action: () => setShowShortcutsHelp(prev => !prev),
      },
      {
        key: 'Escape',
        description: 'Close modal',
        action: () => {
          setShowShortcutsHelp(false);
          setShowTransactionModal(false);
          setShowBudgetItemModal(false);
        },
      },
    ],
  });

  // Right sidebar width state
  const [sidebarWidth, setSidebarWidth] = useState(400); // Default 400px (larger than w-80 which is 320px)

  // Current month state - FIXED: Now uses user's local timezone instead of UTC
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = getCurrentMonthString();
    console.log("Initial currentMonth state (timezone-aware):", today);
    return today;
  }); // Format: YYYY-MM
  const [isResizing, setIsResizing] = useState(false);
  const [, setIsExportingPDF] = useState(false);

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
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Check if user should see tutorial (first-time users)
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem(
      "budgetbuddy_tutorial_completed",
    );
    const isFirstVisit = !localStorage.getItem("budgetbuddy_visited");

    if (!hasSeenTutorial && isFirstVisit) {
      // Mark as visited
      localStorage.setItem("budgetbuddy_visited", "true");
      // Show tutorial after a short delay to let the page load
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Tutorial completion handlers
  const handleTutorialComplete = useCallback(() => {
    localStorage.setItem("budgetbuddy_tutorial_completed", "true");
    setShowTutorial(false);
  }, []);

  const handleTutorialSkip = useCallback(() => {
    localStorage.setItem("budgetbuddy_tutorial_completed", "true");
    setShowTutorial(false);
  }, []);

  useEffect(() => {
    console.log("currentMonth changed to:", currentMonth);
    loadBudget();
  }, [currentMonth]); // Reload budget when month changes

  // Helper function to transform backend budget format to frontend format
  const transformBackendBudget = (backendBudget: any): Budget => {
    console.log("[transformBackendBudget] Input groups:", backendBudget.groups);

    if (!backendBudget.groups) {
      console.error("[transformBackendBudget] No groups found");
      return { ...backendBudget, groups: [] };
    }

    // If groups is already an array, use it as-is but ensure data integrity
    if (Array.isArray(backendBudget.groups)) {
      console.log("[transformBackendBudget] Groups already array format");
      const validatedBudget = { ...backendBudget };
      validatedBudget.groups = backendBudget.groups.map((group: any) => ({
        ...group,
        categories: (group.categories || []).map((cat: any) => ({
          ...cat,
          plannedAmount: Number(cat.plannedAmount) || 0,
          spentAmount: Number(cat.spentAmount) || 0,
          transactions: cat.transactions || [],
        })),
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
      transactions: cat.transactions || [],
    });

    if (backendBudget.groups.income) {
      groups.push({
        id: "income-group",
        name: "Income",
        type: "income",
        icon: "💰",
        isCollapsed: false,
        order: 1,
        categories: backendBudget.groups.income.map(validateCategory),
      });
    }

    if (backendBudget.groups.savings) {
      groups.push({
        id: "savings-group",
        name: "Savings",
        type: "savings",
        icon: "💾",
        isCollapsed: false,
        order: 2,
        categories: backendBudget.groups.savings.map(validateCategory),
      });
    }

    if (backendBudget.groups.expenses) {
      groups.push({
        id: "expenses-group",
        name: "Expenses",
        type: "expense",
        icon: "💸",
        isCollapsed: false,
        order: 3,
        categories: backendBudget.groups.expenses.map(validateCategory),
      });
    }

    console.log(
      "[transformBackendBudget] Transformed to",
      groups.length,
      "groups",
    );
    return { ...backendBudget, groups };
  };

  // Helper function to create budget from AI-generated data
  const createBudgetFromAIData = (parsedBudget: any, month: string): Budget => {
    const mockUser = getMockUser();
    return {
      id: `budget_${Date.now()}`,
      userId: mockUser?.userId || "mock_user_id",
      month: month,
      groups: [
        {
          id: "income-group",
          name: "Income",
          type: "income",
          icon: "💰",
          isCollapsed: false,
          order: 1,
          categories:
            parsedBudget.income?.map((cat: any, index: number) => ({
              ...cat,
              spentAmount: 0,
              transactions: [],
              order: index + 1,
              isRecurring: false,
            })) || [],
        },
        {
          id: "savings-group",
          name: "Savings",
          type: "savings",
          icon: "💾",
          isCollapsed: false,
          order: 2,
          categories:
            parsedBudget.savings?.map((cat: any, index: number) => ({
              ...cat,
              spentAmount: 0,
              transactions: [],
              order: index + 1,
              isRecurring: false,
            })) || [],
        },
        {
          id: "expenses-group",
          name: "Expenses",
          type: "expense",
          icon: "💸",
          isCollapsed: false,
          order: 3,
          categories:
            parsedBudget.expenses?.map((cat: any, index: number) => ({
              ...cat,
              spentAmount: 0,
              transactions: [],
              order: index + 1,
              isRecurring: false,
            })) || [],
        },
      ],
      isAIGenerated: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const loadBudget = async () => {
    try {
      // Clear budget state immediately to prevent showing wrong month's data
      setBudget(null);
      setLoading(true);

      console.log("[loadBudget] Loading budget for month:", currentMonth);

      // FIXED: Use /budget/current endpoint which auto-creates budget from previous month
      // This triggers createBudgetWithRecurringItems on the backend
      const response = await fetch(
        `${API_BASE_URL}/budget/current?month=${currentMonth}&t=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "budgetbuddy_id_token",
            )}`,
            "Content-Type": "application/json",
          },
        },
      );

      console.log("[loadBudget] Response status:", response.status);

      if (response.status === 404) {
        // No budget exists and couldn't be created from previous month
        console.log("[loadBudget] No budget found for", currentMonth);
        setBudget(null);
        setLoading(false);

        // Check for AI-generated budget only for current month
        const isCurrentMonth = currentMonth === getCurrentMonthString();
        if (isCurrentMonth) {
          const aiGeneratedBudget = localStorage.getItem("ai-generated-budget");
          if (aiGeneratedBudget) {
            console.log(
              "[loadBudget] Using AI-generated budget for current month",
            );
            const parsedBudget = JSON.parse(aiGeneratedBudget);
            const budget = createBudgetFromAIData(parsedBudget, currentMonth);
            setBudget(budget);
            await saveBudgetToBackend(budget);
          }
        }
        return;
      }

      if (!response.ok) {
        console.error(
          "[loadBudget] Failed to fetch budget. Status:",
          response.status,
        );
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log("[loadBudget] Backend response:", data);

      // Extract budget from response (backend returns {success, data, message})
      const budgetData = data.data || data;

      if (budgetData) {
        console.log("[loadBudget] Found budget for", currentMonth);
        // Transform backend format to frontend format
        const transformedBudget = transformBackendBudget(budgetData);
        console.log("[loadBudget] Transformed budget:", transformedBudget);
        setBudget(transformedBudget);
        setLoading(false);
        return;
      }

      // No budget returned
      console.log("[loadBudget] No budget data in response for", currentMonth);
      setBudget(null);
      setLoading(false);
    } catch (error) {
      console.error("[loadBudget] Error loading budget:", error);
      setBudget(null);
      setLoading(false);
    }
  };

  const saveBudgetToBackend = async (budgetData: Budget) => {
    try {
      const token = localStorage.getItem("budgetbuddy_id_token");
      if (!token) {
        console.error("[saveBudgetToBackend] No auth token found");
        return;
      }

      console.log(
        "[saveBudgetToBackend] Saving budget for month:",
        budgetData.month,
      );

      // Transform groups array to object format for backend
      const groupsForBackend = {
        income:
          budgetData.groups.find((g) => g.type === "income")?.categories || [],
        savings:
          budgetData.groups.find((g) => g.type === "savings")?.categories || [],
        expenses:
          budgetData.groups.find((g) => g.type === "expense")?.categories || [],
      };

      const response = await fetch(`${API_BASE_URL}/budget`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: budgetData.month,
          groups: groupsForBackend,
          isAIGenerated: budgetData.isAIGenerated,
        }),
      });

      // CRITICAL FIX: Treat 409 conflict as success (budget already exists)
      if (response.ok || response.status === 409) {
        console.log(
          "[saveBudgetToBackend] Budget saved or already exists (status:",
          response.status,
          ")",
        );

        // Clear AI budget from localStorage after successful save
        localStorage.removeItem("ai-generated-budget");
        console.log(
          "[saveBudgetToBackend] Cleared AI budget from localStorage",
        );

        if (response.status === 409) {
          // Budget already exists - reload from backend to get the existing one
          console.log(
            "[saveBudgetToBackend] Budget already exists (409), reloading from backend",
          );
          await loadBudget();
        } else {
          // Successfully created - update local state
          const savedBudget = await response.json();
          console.log(
            "[saveBudgetToBackend] Budget saved successfully:",
            savedBudget,
          );
          if (savedBudget.data) {
            console.log(
              "[saveBudgetToBackend] Updating local state with saved budget",
            );
            const transformedBudget = transformBackendBudget(savedBudget.data);
            setBudget(transformedBudget);
          }
        }
      } else {
        const errorText = await response.text();
        console.error(
          "[saveBudgetToBackend] Failed to save budget (status:",
          response.status,
          "):",
          errorText,
        );
      }
    } catch (error) {
      console.error("[saveBudgetToBackend] Error saving budget:", error);
    }
  };

  const calculateTotals = () => {
    if (!budget) return { income: 0, planned: 0, spent: 0, remaining: 0 };

    // Safety check: ensure groups is an array
    if (!Array.isArray(budget.groups)) {
      console.error(
        "[calculateTotals] budget.groups is not an array:",
        budget.groups,
      );
      return { income: 0, planned: 0, spent: 0, remaining: 0 };
    }

    const incomeGroup = budget.groups.find((g) => g.type === "income");
    const income =
      incomeGroup?.categories.reduce(
        (sum, cat) => sum + cat.plannedAmount,
        0,
      ) || 0;

    const nonIncomeGroups = budget.groups.filter((g) => g.type !== "income");
    const planned = nonIncomeGroups.reduce(
      (sum, group) =>
        sum +
        group.categories.reduce((catSum, cat) => catSum + cat.plannedAmount, 0),
      0,
    );

    const spent = nonIncomeGroups.reduce(
      (sum, group) =>
        sum +
        group.categories.reduce((catSum, cat) => catSum + cat.spentAmount, 0),
      0,
    );

    // Remaining = money left to budget (income - planned allocations)
    // This shows how much income hasn't been allocated to categories yet
    const remaining = income - planned;

    return {
      income,
      planned,
      spent,
      remaining,
    };
  };

  // Get all categories for the filter dropdown
  const allCategories = useMemo(() => {
    if (!budget || !Array.isArray(budget.groups)) return [];

    return budget.groups.flatMap((group) =>
      group.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        type: group.type,
      })),
    );
  }, [budget]);

  // Get all transactions with category and group info for filtering
  const allTransactions = useMemo(() => {
    if (!budget || !Array.isArray(budget.groups)) return [];

    return budget.groups.flatMap((group) =>
      group.categories.flatMap((cat) =>
        cat.transactions.map((txn) => ({
          ...txn,
          categoryId: cat.id,
          categoryName: cat.name,
          categoryIcon: cat.icon,
          groupType: group.type,
          groupName: group.name,
        })),
      ),
    );
  }, [budget]);

  // Apply filters to transactions
  const filteredTransactions = useMemo(() => {
    if (!allTransactions.length) return [];

    return allTransactions.filter((txn) => {
      // Search filter
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchesSearch =
          txn.description.toLowerCase().includes(query) ||
          txn.categoryName.toLowerCase().includes(query) ||
          txn.groupName.toLowerCase().includes(query) ||
          txn.amount.toString().includes(query);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.category && txn.categoryId !== filters.category) {
        return false;
      }

      // Date range filter
      if (filters.dateFrom && txn.date < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && txn.date > filters.dateTo) {
        return false;
      }

      // Amount range filter
      if (filters.amountMin !== null && txn.amount < filters.amountMin) {
        return false;
      }
      if (filters.amountMax !== null && txn.amount > filters.amountMax) {
        return false;
      }

      // Type filter
      if (filters.type) {
        if (filters.type === "income" && txn.groupType !== "income") {
          return false;
        }
        if (
          filters.type === "expense" &&
          txn.groupType !== "expense" &&
          txn.groupType !== "savings"
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allTransactions, filters]);

  // Sort filtered transactions
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "date") {
        cmp = a.date.localeCompare(b.date);
      } else if (sortBy === "amount") {
        cmp = a.amount - b.amount;
      } else if (sortBy === "description") {
        cmp = a.description.localeCompare(b.description);
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [filteredTransactions, sortBy, sortOrder]);

  const openTransactionModal = (type: "income" | "expense") => {
    setTransactionType(type);
    setTransactionForm({
      amount: "",
      description: "",
      date: getTodayString(),
      categoryId: "",
    });
    setShowTransactionModal(true);
  };

  const closeTransactionModal = () => {
    setShowTransactionModal(false);
    setTransactionType(null);
    setTransactionForm({
      amount: "",
      description: "",
      date: getTodayString(),
      categoryId: "",
    });
  };

  // Template handling functions
  const openTemplateModal = (mode: "select" | "save") => {
    setTemplateModalMode(mode);
    setShowTemplateModal(true);
  };

  const handleSelectTemplate = (template: TransactionTemplate) => {
    // Find the category in current budget (used for tracking recent categories)
    budget?.groups
      .flatMap((g) => g.categories)
      .find((c) => c.id === template.categoryId);

    setTransactionForm({
      amount: template.amount?.toString() || "",
      description: template.description,
      date: getTodayString(),
      categoryId: template.categoryId,
    });

    // Track recent category usage
    addRecentCategory(template.categoryId);
  };

  const getCurrentTransactionForTemplate = () => {
    if (!transactionForm.categoryId || !transactionType) return undefined;

    const category = budget?.groups
      .flatMap((g) => g.categories)
      .find((c) => c.id === transactionForm.categoryId);

    if (!category) return undefined;

    return {
      description: transactionForm.description,
      amount: transactionForm.amount,
      categoryId: transactionForm.categoryId,
      categoryName: category.name,
      categoryIcon: category.icon,
      type: transactionType,
    };
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budget || !transactionForm.amount || !transactionForm.categoryId)
      return;

    const amount = parseFloat(transactionForm.amount);
    if (isNaN(amount)) return;

    // Create new transaction
    const newTransaction: Transaction = {
      id: `transaction_${Date.now()}`,
      categoryId: transactionForm.categoryId,
      amount: amount,
      description: transactionForm.description || "Transaction",
      date: transactionForm.date,
      createdAt: new Date().toISOString(),
    };

    // Update budget with new transaction
    const updatedBudget = { ...budget };
    updatedBudget.groups = updatedBudget.groups.map((group) => ({
      ...group,
      categories: group.categories.map((cat) => {
        if (cat.id === transactionForm.categoryId) {
          return {
            ...cat,
            spentAmount: cat.spentAmount + amount,
            transactions: [...cat.transactions, newTransaction],
          };
        }
        return cat;
      }),
    }));

    setBudget(updatedBudget);

    // Save to backend
    await saveBudgetToBackend(updatedBudget);

    closeTransactionModal();
  };

  const getAvailableCategories = () => {
    if (!budget || !transactionType) return [];

    if (transactionType === "income") {
      return budget.groups.find((g) => g.type === "income")?.categories || [];
    } else {
      return budget.groups
        .filter((g) => g.type === "expense" || g.type === "savings")
        .flatMap((g) => g.categories);
    }
  };

  // Budget item management functions
  const openBudgetItemModal = (
    groupType: "income" | "savings" | "expense",
    category?: BudgetCategory,
  ) => {
    setSelectedGroupType(groupType);
    if (category) {
      setEditingCategory(category);
      setBudgetItemForm({
        name: category.name,
        icon: category.icon,
        plannedAmount: (
          category.baseAmount || category.plannedAmount
        ).toString(),
        isRecurring: category.isRecurring,
        recurringFrequency: category.recurringFrequency || "monthly",
        startDate: category.startDate || getTodayString(),
        frequency: category.frequency || "monthly",
        frequencyAmount: category.frequencyAmount?.toString() || "",
      });
    } else {
      setEditingCategory(null);
      setBudgetItemForm({
        name: "",
        icon:
          groupType === "income" ? "💰" : groupType === "savings" ? "💾" : "💸",
        plannedAmount: "",
        isRecurring: false,
        recurringFrequency: "monthly",
        startDate: getTodayString(),
        frequency: "monthly",
        frequencyAmount: "",
      });
    }
    setShowBudgetItemModal(true);
  };

  const closeBudgetItemModal = () => {
    setShowBudgetItemModal(false);
    setEditingCategory(null);
    setSelectedGroupType(null);
    setBudgetItemForm({
      name: "",
      icon: "💰",
      plannedAmount: "",
      isRecurring: false,
      recurringFrequency: "monthly",
      startDate: getTodayString(),
      frequency: "monthly",
      frequencyAmount: "",
    });
  };

  const handleBudgetItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[handleBudgetItemSubmit] Form submitted");
    console.log("[handleBudgetItemSubmit] Budget exists:", !!budget);
    console.log(
      "[handleBudgetItemSubmit] Selected group type:",
      selectedGroupType,
    );
    console.log("[handleBudgetItemSubmit] Form data:", budgetItemForm);

    if (
      !budget ||
      !selectedGroupType ||
      !budgetItemForm.name ||
      // For income with biweekly/weekly frequency, frequencyAmount is required; otherwise plannedAmount
      (!budgetItemForm.plannedAmount &&
        !(selectedGroupType === "income" &&
          (budgetItemForm.frequency === "biweekly" || budgetItemForm.frequency === "weekly") &&
          budgetItemForm.frequencyAmount))
    ) {
      console.log("[handleBudgetItemSubmit] Validation failed:", {
        budget: !!budget,
        selectedGroupType,
        name: budgetItemForm.name,
        plannedAmount: budgetItemForm.plannedAmount,
      });
      return;
    }

    // For income items with biweekly/weekly frequency, use frequencyAmount as the per-period value
    // and derive plannedAmount from it. For all other cases, use the entered plannedAmount.
    const isIncomeFrequencyBased =
      selectedGroupType === "income" &&
      budgetItemForm.frequency !== "monthly" &&
      budgetItemForm.frequency !== "one-time" &&
      budgetItemForm.frequencyAmount !== "";

    const rawEnteredAmount = isIncomeFrequencyBased
      ? parseFloat(budgetItemForm.frequencyAmount)
      : parseFloat(budgetItemForm.plannedAmount);

    const baseAmount = isNaN(rawEnteredAmount) ? 0 : rawEnteredAmount;

    if (baseAmount === 0 && !isIncomeFrequencyBased && isNaN(parseFloat(budgetItemForm.plannedAmount))) {
      console.log(
        "[handleBudgetItemSubmit] Invalid amount:",
        budgetItemForm.plannedAmount,
      );
      return;
    }

    // Calculate planned monthly amount for frequency-based income
    // Uses the shared utility that counts actual occurrence dates based on start date
    const calcMonthlyFromFrequency = (
      amountPerPeriod: number,
      freq: string,
      monthStr: string,
      startDateStr: string,
    ): number => {
      if (!freq || freq === "monthly") return amountPerPeriod;
      if (freq === "semi-monthly") return Math.round(amountPerPeriod * 2);
      // Map BudgetPage frequency strings to RecurringFrequency type
      const freqMap: Record<string, "weekly" | "bi-weekly" | "monthly"> = {
        biweekly: "bi-weekly",
        weekly: "weekly",
        monthly: "monthly",
      };
      const mappedFreq = freqMap[freq];
      if (mappedFreq) {
        // Use the shared utility that counts actual occurrence dates based on start date
        return calculatePlannedMonthlyAmount(amountPerPeriod, mappedFreq, startDateStr, monthStr);
      }
      return amountPerPeriod;
    };

    // Calculate planned amount for recurring items
    let plannedAmount = isIncomeFrequencyBased
      ? calcMonthlyFromFrequency(baseAmount, budgetItemForm.frequency, budget.month, budgetItemForm.startDate || getTodayString())
      : parseFloat(budgetItemForm.plannedAmount) || 0;
    let startDate = budgetItemForm.startDate || getTodayString();
    let occurrenceDates: string[] = [];

    if (budgetItemForm.isRecurring) {
      plannedAmount = calculatePlannedMonthlyAmount(
        baseAmount,
        budgetItemForm.recurringFrequency,
        startDate,
        budget.month,
      );
      occurrenceDates = getOccurrenceDatesInMonth(
        budgetItemForm.recurringFrequency,
        startDate,
        budget.month,
      );
      console.log("[handleBudgetItemSubmit] Recurring item calculated:", {
        baseAmount,
        frequency: budgetItemForm.recurringFrequency,
        startDate,
        plannedAmount,
        occurrenceDates,
      });
    }

    console.log(
      "[handleBudgetItemSubmit] Creating new category with baseAmount:",
      baseAmount,
      "plannedAmount:",
      plannedAmount,
    );
    const updatedBudget = { ...budget };

    // Determine frequency-related values for income items
    const isIncomeGroup = selectedGroupType === "income";
    const selectedFrequency = isIncomeGroup ? budgetItemForm.frequency : undefined;
    const isOneTime = selectedFrequency === "one-time";
    const frequencyAmount = isIncomeGroup && budgetItemForm.frequencyAmount
      ? parseFloat(budgetItemForm.frequencyAmount)
      : undefined;

    if (editingCategory) {
      console.log(
        "[handleBudgetItemSubmit] Editing existing category:",
        editingCategory.id,
      );
      // Edit existing category
      updatedBudget.groups = updatedBudget.groups.map((group) => ({
        ...group,
        categories: group.categories.map((cat) => {
          if (cat.id === editingCategory.id) {
            return {
              ...cat,
              name: budgetItemForm.name,
              icon: budgetItemForm.icon,
              baseAmount: budgetItemForm.isRecurring ? baseAmount : undefined,
              plannedAmount,
              startDate: budgetItemForm.isRecurring ? startDate : undefined,
              isRecurring: budgetItemForm.isRecurring,
              recurringFrequency: budgetItemForm.isRecurring
                ? budgetItemForm.recurringFrequency
                : undefined,
              ...(isIncomeGroup && {
                frequency: selectedFrequency,
                frequencyAmount: frequencyAmount,
                isOneTime,
              }),
            };
          }
          return cat;
        }),
      }));
    } else {
      console.log(
        "[handleBudgetItemSubmit] Adding new category to group type:",
        selectedGroupType,
      );
      // Add new category
      const newCategory: BudgetCategory = {
        id: `category_${Date.now()}`,
        name: budgetItemForm.name,
        icon: budgetItemForm.icon,
        baseAmount: budgetItemForm.isRecurring ? baseAmount : undefined,
        plannedAmount,
        startDate: budgetItemForm.isRecurring ? startDate : undefined,
        spentAmount: 0,
        transactions: [],
        order: 999,
        isRecurring: budgetItemForm.isRecurring,
        recurringFrequency: budgetItemForm.isRecurring
          ? budgetItemForm.recurringFrequency
          : undefined,
        ...(isIncomeGroup && {
          frequency: selectedFrequency,
          frequencyAmount: frequencyAmount,
          isOneTime,
        }),
      };

      console.log(
        "[handleBudgetItemSubmit] New category created:",
        newCategory,
      );

      updatedBudget.groups = updatedBudget.groups.map((group) => {
        if (group.type === selectedGroupType) {
          console.log(
            "[handleBudgetItemSubmit] Found matching group, adding category. Group before:",
            group.categories.length,
          );
          const updatedGroup = {
            ...group,
            categories: [...group.categories, newCategory].sort((a, b) =>
              a.name.localeCompare(b.name)
            ),
          };
          console.log(
            "[handleBudgetItemSubmit] Group after:",
            updatedGroup.categories.length,
          );
          return updatedGroup;
        }
        return group;
      });
    }

    console.log("[handleBudgetItemSubmit] Updated budget:", updatedBudget);
    setBudget(updatedBudget);
    console.log(
      "[handleBudgetItemSubmit] Budget state updated, saving to backend...",
    );
    await saveBudgetToBackend(updatedBudget);
    console.log("[handleBudgetItemSubmit] Saved to backend, closing modal...");
    closeBudgetItemModal();
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!budget) return;
    if (!confirm("Are you sure you want to delete this budget item?")) return;

    const updatedBudget = { ...budget };
    updatedBudget.groups = updatedBudget.groups.map((group) => ({
      ...group,
      categories: group.categories.filter((cat) => cat.id !== categoryId),
    }));

    setBudget(updatedBudget);
    await saveBudgetToBackend(updatedBudget);
  };

  const changeMonth = (direction: "prev" | "next") => {
    // CRITICAL FIX: Clear budget immediately when changing months
    setBudget(null);

    const [year, month] = currentMonth.split("-").map(Number);
    const offset = direction === "prev" ? -1 : 1;
    const date = new Date(year, month - 1 + offset, 1);
    const newMonth = date.toISOString().slice(0, 7);

    console.log("[changeMonth] Switching from", currentMonth, "to", newMonth);
    setCurrentMonth(newMonth);
  };

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split("-").map(Number);
    const date = new Date(year, month - 1, 1); // Create in local timezone
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Navigate to current month - FIXED: Now uses user's local timezone
  const goToToday = () => {
    const today = getCurrentMonthString();
    console.log("goToToday called (timezone-aware), setting month to:", today);
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
      console.log(
        "[copyPreviousMonthBudget] Starting budget copy for month:",
        currentMonth,
      );

      // Calculate previous month
      const [year, month] = currentMonth.split("-").map(Number);
      const prevMonthDate = new Date(year, month - 2, 1);
      const prevMonth = prevMonthDate.toISOString().slice(0, 7);
      console.log(
        "[copyPreviousMonthBudget] Looking for previous month budget:",
        prevMonth,
      );

      // Fetch previous month's budget
      const response = await fetch(`${API_BASE_URL}/budget`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(
            "budgetbuddy_id_token",
          )}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(
          "[copyPreviousMonthBudget] Failed to fetch budgets. Status:",
          response.status,
        );
        alert("Failed to fetch budgets. Please try again.");
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log("[copyPreviousMonthBudget] API response:", data);

      // CRITICAL FIX: Handle both response formats (data.budgets and data.data.budgets)
      const budgets = data.data?.budgets || data.budgets || [];
      console.log("[copyPreviousMonthBudget] Found budgets:", budgets.length);

      const prevBudget = budgets.find((b: any) => b.month === prevMonth);

      if (prevBudget) {
        console.log(
          "[copyPreviousMonthBudget] Found previous month budget, copying...",
        );

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
              id: `cat_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`,
              spentAmount: 0,
              transactions: [],
            })),
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        console.log("[copyPreviousMonthBudget] Created new budget:", newBudget);
        setBudget(newBudget);
        await saveBudgetToBackend(newBudget);
        console.log("[copyPreviousMonthBudget] Budget copied successfully");
      } else {
        console.warn(
          "[copyPreviousMonthBudget] No previous month budget found to copy",
        );

        // Create empty budget structure for future month
        const mockUser = getMockUser();
        const emptyBudget: Budget = {
          id: `budget_${Date.now()}`,
          userId: mockUser?.userId || "mock_user_id",
          month: currentMonth,
          groups: [
            {
              id: "income-group",
              name: "Income",
              type: "income",
              icon: "💰",
              isCollapsed: false,
              order: 1,
              categories: [],
            },
            {
              id: "savings-group",
              name: "Savings",
              type: "savings",
              icon: "💾",
              isCollapsed: false,
              order: 2,
              categories: [],
            },
            {
              id: "expenses-group",
              name: "Expenses",
              type: "expense",
              icon: "💸",
              isCollapsed: false,
              order: 3,
              categories: [],
            },
          ],
          isAIGenerated: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        console.log("[copyPreviousMonthBudget] Created empty budget structure");
        setBudget(emptyBudget);
        await saveBudgetToBackend(emptyBudget);

        // Show user feedback
        alert(
          `No budget found for ${getMonthName(
            prevMonth,
          )}. Created empty budget structure for ${
            getMonthName(currentMonth).split(" ")[0]
          }. You can now add your income and expense categories.`,
        );
      }

      setLoading(false);
    } catch (error) {
      console.error(
        "[copyPreviousMonthBudget] Error copying previous month budget:",
        error,
      );
      alert("Failed to create budget. Please try again.");
      setLoading(false);
    }
  };

  // Reset budget and navigate to AI setup
  const handleResetBudget = () => {
    if (!budget) return;

    // Clear budget state
    setBudget(null);

    // Clear AI-generated budget from localStorage if it exists
    localStorage.removeItem("ai-generated-budget");

    // Navigate to AI budget generation page
    // The new budget will overwrite the old one when saved
    navigate("/onboarding");
  };

  // Export budget data to CSV
  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem("budgetbuddy_id_token");
      if (!token) {
        alert("Please log in to export data");
        return;
      }

      // Show loading state
      document.querySelector(
        '[onclick="handleExportCSV"]',
      )?.textContent;
      const exportButton = document.querySelector(
        '[onclick="handleExportCSV"]',
      ) as HTMLButtonElement;
      if (exportButton) {
        exportButton.textContent = "Exporting...";
        exportButton.disabled = true;
      }

      // Call export API
      const response = await fetch(`${API_BASE_URL}/export?type=csv`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Get the CSV content
      const csvContent = await response.text();

      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `budget-export-${
        new Date().toISOString().split("T")[0]
      }.csv`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log("CSV export completed successfully");
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      // Reset button state
      const exportButton = document.querySelector(
        '[onclick="handleExportCSV"]',
      ) as HTMLButtonElement;
      if (exportButton) {
        exportButton.textContent = "Export CSV";
        exportButton.disabled = false;
      }
    }
  };

  // Export budget data to PDF
  const handleExportPDF = async () => {
    try {
      const token = localStorage.getItem("budgetbuddy_id_token");
      if (!token) {
        alert("Please log in to export data");
        return;
      }

      // Show loading state using React state
      setIsExportingPDF(true);

      // Call export API
      const response = await fetch(`${API_BASE_URL}/export?type=pdf`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Get the PDF content as blob
      const pdfBlob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `budget-report-${
        new Date().toISOString().split("T")[0]
      }.pdf`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log("PDF export completed successfully");
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      // Reset loading state
      setIsExportingPDF(false);
    }
  };

  const handleDeleteTransaction = async (
    transactionId: string,
    categoryId: string,
  ) => {
    if (!budget) return;
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    const updatedBudget = { ...budget };
    updatedBudget.groups = updatedBudget.groups.map((group) => ({
      ...group,
      categories: group.categories.map((cat) => {
        if (cat.id === categoryId) {
          const transaction = cat.transactions.find(
            (t) => t.id === transactionId,
          );
          if (transaction) {
            return {
              ...cat,
              spentAmount: cat.spentAmount - transaction.amount,
              transactions: cat.transactions.filter(
                (t) => t.id !== transactionId,
              ),
            };
          }
        }
        return cat;
      }),
    }));

    setBudget(updatedBudget);
    await saveBudgetToBackend(updatedBudget);
  };

  if (loading) {
    return (
      <div className="h-full bg-background flex">
        <div className="flex-1 flex">
          {/* Skeleton: Center column */}
          <div className="flex-1 bg-surface overflow-auto">
            {/* Skeleton header */}
            <div className="p-6 border-b border-border bg-background">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-8 w-36 rounded animate-pulse bg-muted" />
                  <div className="h-5 w-24 rounded animate-pulse bg-muted" />
                </div>
                <div className="flex gap-2">
                  <div className="h-9 w-24 rounded animate-pulse bg-muted" />
                  <div className="h-9 w-24 rounded animate-pulse bg-muted" />
                </div>
              </div>
            </div>
            {/* Skeleton budget groups */}
            <div className="p-6 space-y-6">
              {[1, 2, 3].map((g) => (
                <div key={g} className="space-y-2">
                  <div className="h-5 w-32 rounded animate-pulse bg-muted" />
                  {[1, 2, 3].map((c) => (
                    <div key={c} className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded animate-pulse bg-muted" />
                        <div className="h-4 w-28 rounded animate-pulse bg-muted" />
                      </div>
                      <div className="flex gap-4">
                        <div className="h-4 w-16 rounded animate-pulse bg-muted" />
                        <div className="h-4 w-16 rounded animate-pulse bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          {/* Skeleton: Right sidebar */}
          <div className="w-96 border-l border-border bg-background p-6 space-y-4">
            <div className="h-5 w-32 rounded animate-pulse bg-muted" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="h-4 w-32 rounded animate-pulse bg-muted" />
                <div className="h-4 w-16 rounded animate-pulse bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // CRITICAL FIX: Only show "No Budget Found" for past/current months
  // Future months will render the full layout with the "Start Planning" empty state inside
  if (!budget && !isFutureMonthCheck()) {
    // Past or current month without budget - show "No Budget Found" state with choice
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Navigation Header */}
        <div className="bg-surface border-b border-border px-6 py-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-foreground">
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
                onClick={() => changeMonth("prev")}
                className="p-2 text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"
                aria-label="Previous month"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                onClick={() => changeMonth("next")}
                className="p-2 text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"
                aria-label="Next month"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Empty State Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-lg px-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              No budget found for {getMonthName(currentMonth)}
            </h2>
            <p className="text-muted-foreground mb-8">
              Choose how you'd like to create your budget:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* AI-Generated Budget Option */}
              <button
                onClick={() => navigate("/onboarding")}
                className="p-6 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-left"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4 mx-auto">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
                  AI-Generated
                </h3>
                <p className="text-sm text-gray-600 text-center">
                  Let AI create a personalized budget based on your income and
                  goals
                </p>
              </button>

              {/* Manual Budget Option */}
              <button
                onClick={() => {
                  // Create an empty budget structure for manual entry
                  const mockUser = getMockUser();
                  const emptyBudget: Budget = {
                    id: `budget_${Date.now()}`,
                    userId: mockUser?.userId || "mock_user_id",
                    month: currentMonth,
                    groups: [
                      {
                        id: "income-group",
                        name: "Income",
                        type: "income",
                        icon: "💰",
                        isCollapsed: false,
                        order: 1,
                        categories: [],
                      },
                      {
                        id: "savings-group",
                        name: "Savings",
                        type: "savings",
                        icon: "💾",
                        isCollapsed: false,
                        order: 2,
                        categories: [],
                      },
                      {
                        id: "expenses-group",
                        name: "Expenses",
                        type: "expense",
                        icon: "💸",
                        isCollapsed: false,
                        order: 3,
                        categories: [],
                      },
                    ],
                    isAIGenerated: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  setBudget(emptyBudget);
                  saveBudgetToBackend(emptyBudget);
                }}
                className="p-6 bg-surface border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors text-left"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-lg mb-4 mx-auto">
                  <span className="text-2xl">✏️</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2 text-center">
                  Start from Scratch
                </h3>
                <p className="text-sm text-muted-foreground text-center">
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
  const totals = budget
    ? calculateTotals()
    : { income: 0, planned: 0, spent: 0, remaining: 0 };

  return (
    <div className="h-full bg-background flex">
      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Center Column - Budget Categories */}
        <div className="flex-1 bg-surface overflow-auto">
          {/* Desktop/Tablet Header */}
          <div className="p-6 border-b border-border bg-background">
            {/* New Header Design */}
            <div className="flex items-center justify-between">
              {/* Left: Month Title and Budget Remaining */}
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-1">
                  {getMonthName(currentMonth)}
                </h1>
                {budget && (
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-sm font-semibold px-2.5 py-1 rounded-full ${
                        totals.remaining === 0
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                          : totals.remaining < 0
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}
                      title="Money left to assign to budget categories"
                    >
                      {totals.remaining === 0
                        ? '✓ Fully budgeted'
                        : totals.remaining < 0
                        ? `${formatCurrency(Math.abs(totals.remaining), currency)} over-assigned`
                        : `${formatCurrency(totals.remaining, currency)} left to assign`}
                    </span>
                  </div>
                )}
              </div>

              {/* Right: Navigation Controls */}
              <div className="flex items-center space-x-2">
                {/* Export Button - Only show if budget exists */}
                {budget && (
                  <>
                    <button
                      onClick={handleExportCSV}
                      className="px-4 py-2 text-sm font-medium text-green-600 border border-green-600 rounded-md hover:bg-green-50 transition-colors flex items-center gap-1.5"
                    >
                      Export CSV
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                        ✨ Pro
                      </span>
                    </button>
                    <button
                      onClick={handleExportPDF}
                      data-export="pdf"
                      className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors flex items-center gap-1.5"
                    >
                      Export PDF
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                        ✨ Pro
                      </span>
                    </button>
                  </>
                )}

                {/* Keyboard shortcuts help button */}
                <button
                  onClick={() => setShowShortcutsHelp(prev => !prev)}
                  className="p-2 text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors"
                  aria-label="Show keyboard shortcuts"
                  title="Keyboard shortcuts (?)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

                {/* Reset Button - Only show if budget exists */}
                {budget && (
                  <button
                    onClick={() => setShowResetModal(true)}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"
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
                  onClick={() => changeMonth("prev")}
                  className="p-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                  aria-label="Previous month"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>

                {/* Next Month Button */}
                <button
                  onClick={() => changeMonth("next")}
                  className="p-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                  aria-label="Next month"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Future Month Warning */}
            {isFutureMonthCheck() && (
              <div className="mt-4 flex items-center justify-end">
                <div className="inline-flex items-center px-3 py-1.5 bg-yellow-100 border border-yellow-300 rounded-full">
                  <svg
                    className="w-4 h-4 text-yellow-600 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium text-yellow-800">
                    You are viewing a future month.
                  </span>
                </div>
              </div>
            )}

            {/* Past Month Warning */}
            {isPastMonthCheck() && (
              <div className="mt-4 flex items-center justify-end">
                <div className="inline-flex items-center px-3 py-1.5 bg-orange-100 border border-orange-300 rounded-full">
                  <svg
                    className="w-4 h-4 text-orange-600 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium text-orange-800">
                    You are viewing a past month.
                  </span>
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
                    <svg
                      className="w-24 h-24 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M13 3v6h6"
                      />
                    </svg>
                  </div>
                </div>

                {/* Message */}
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Hey there, looks like you need a budget for{" "}
                  {getMonthName(currentMonth).split(" ")[0]}.
                </h2>
                <p className="text-gray-600 mb-6">
                  We'll copy{" "}
                  {(() => {
                    const [year, month] = currentMonth.split("-").map(Number);
                    const prevDate = new Date(year, month - 2, 1);
                    return getMonthName(
                      prevDate.toISOString().slice(0, 7),
                    ).split(" ")[0];
                  })()}{" "}
                  budget to get you started.
                </p>

                {/* Action Button */}
                <button
                  onClick={copyPreviousMonthBudget}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
                >
                  Start Planning for {getMonthName(currentMonth).split(" ")[0]}
                </button>
              </div>
            </div>
          )}

          {/* Budget Categories */}
          {budget && (
            <div
              className="p-4 lg:p-6 space-y-6 lg:space-y-8"
              data-tutorial="budget-categories"
            >
              {/* Sort groups: income first, savings second, expense last */}
              {[...budget.groups]
                .sort((a, b) => {
                  const order = { income: 0, savings: 1, expense: 2 };
                  return (order[a.type] ?? 3) - (order[b.type] ?? 3);
                })
                .map((group) => (
                <div key={group.id} className="space-y-4">
                  {/* Group Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-500 text-sm">●</span>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {group.name}
                      </h2>
                      <span className="text-sm text-gray-500">
                        for {getMonthName(currentMonth).split(" ")[0]}
                      </span>
                      <button className="text-gray-400 hover:text-gray-600">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="hidden md:flex items-center space-x-4 text-sm">
                      <div className="text-right w-24 flex-shrink-0">
                        <div className="text-gray-500">Planned</div>
                      </div>
                      <div className="text-right w-24 flex-shrink-0">
                        <div className="text-gray-500">
                          {group.type === "income" ? "Received" : "Spent"}
                        </div>
                      </div>
                      <div className="w-16 flex-shrink-0"></div>
                    </div>
                  </div>

                  {/* Categories — sorted A-Z */}
                  <div className="space-y-2">
                    {[...group.categories]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((category) => (
                      <div
                        key={category.id}
                        className={`group/item flex flex-col md:flex-row md:items-center justify-between py-3 px-4 rounded-lg space-y-2 md:space-y-0 ${
                          category.spentAmount > category.plannedAmount
                            ? "bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 hover:bg-red-100 dark:hover:bg-red-950/30"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span>{category.icon}</span>
                            <div className="font-medium text-foreground">
                              {category.name}
                            </div>
                          </div>
                          {category.isRecurring && (
                            <div className="text-xs text-green-600 ml-6">
                              {category.recurringFrequency} •{" "}
                              {category.baseAmount &&
                                `${formatCurrency(category.baseAmount, currency, { showSymbol: false })} per occurrence`}
                              {category.startDate &&
                                ` • Starts: ${new Date(
                                  category.startDate,
                                ).toLocaleDateString()}`}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center md:space-x-4">
                          <div className="text-left md:text-right md:w-24 flex-shrink-0">
                            <div className="text-xs md:hidden text-gray-500">
                              Planned
                            </div>
                            {inlineEditId === category.id ? (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={inlineEditValue}
                                onChange={e => setInlineEditValue(e.target.value)}
                                onBlur={() => commitInlineEdit(category.id, group.type)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') commitInlineEdit(category.id, group.type);
                                  if (e.key === 'Escape') setInlineEditId(null);
                                }}
                                autoFocus
                                className="w-full text-right font-medium px-1 py-0.5 border border-[var(--color-primary)] rounded text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                                aria-label={`Edit planned amount for ${category.name}`}
                              />
                            ) : (
                              <button
                                onClick={() => startInlineEdit(category.id, category.plannedAmount)}
                                className="font-medium hover:text-[var(--color-primary)] hover:underline cursor-pointer"
                                title="Click to edit planned amount"
                              >
                                {formatCurrency(category.plannedAmount, currency)}
                              </button>
                            )}
                          </div>
                          <div className="text-right md:w-24 flex-shrink-0">
                            <div className="text-xs md:hidden text-gray-500">
                              {group.type === "income" ? "Received" : "Spent"}
                            </div>
                            <div
                              className={`font-medium ${
                                category.spentAmount > category.plannedAmount
                                  ? "text-red-600"
                                  : category.spentAmount > 0
                                    ? "text-green-600"
                                    : "text-gray-400"
                              }`}
                            >
                              {formatCurrency(category.spentAmount, currency)}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 w-16 justify-end opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0">
                            <button
                              onClick={() =>
                                openBudgetItemModal(group.type, category)
                              }
                              className="p-1 text-gray-400 hover:text-blue-600 rounded"
                              title="Edit"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                              title="Delete"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add Item Button */}
                    <button
                      onClick={() => openBudgetItemModal(group.type)}
                      data-tutorial="add-transaction"
                      className="w-full text-left py-2.5 px-4 text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded-lg transition-colors flex items-center gap-1 font-medium"
                    >
                      <span aria-hidden="true" className="text-base leading-none">+</span> Add Item
                    </button>
                  </div>

                  {/* Group Total */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between py-3 px-4 bg-muted rounded-lg font-semibold space-y-2 md:space-y-0">
                    <div className="text-foreground">Total {group.name}</div>
                    <div className="flex items-center md:space-x-4">
                      <div className="text-left md:text-right md:w-24 flex-shrink-0">
                        <div className="text-xs md:hidden text-gray-500 font-normal">
                          Planned
                        </div>
                        <div>
                          {formatCurrency(
                            group.categories.reduce(
                              (sum, cat) => sum + cat.plannedAmount,
                              0,
                            ),
                            currency,
                          )}
                        </div>
                      </div>
                      <div className="text-right md:w-24 flex-shrink-0">
                        <div className="text-xs md:hidden text-gray-500 font-normal">
                          Received
                        </div>
                        <div>
                          {formatCurrency(
                            group.categories.reduce(
                              (sum, cat) => sum + cat.spentAmount,
                              0,
                            ),
                            currency,
                          )}
                        </div>
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
        {/* P6-T2: Slide-over for narrow screens (hidden md:) */}
        {showSidebarSlideOver && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowSidebarSlideOver(false)} aria-hidden="true" />
            <div className="relative ml-auto w-80 max-w-full bg-surface border-l border-border overflow-y-auto shadow-2xl z-50 p-4">
              <button
                onClick={() => setShowSidebarSlideOver(false)}
                className="absolute top-3 right-3 p-1.5 rounded text-muted-foreground hover:text-foreground"
                aria-label="Close transactions panel"
              >
                ✕
              </button>
              <p className="font-semibold text-foreground mb-4 mt-1">Transactions</p>
              {/* Transactions list - same content as the sidebar */}
              <div className="space-y-2">
                {sortedTransactions.slice(0, 20).map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{txn.description}</p>
                      <p className="text-xs text-muted-foreground">{txn.categoryName} · {txn.date}</p>
                    </div>
                    <span className={`text-sm tabular-nums ml-3 shrink-0 ${txn.groupType === 'income' ? 'text-green-600' : 'text-foreground'}`}>
                      {txn.groupType === 'income' ? '+' : '-'}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(txn.amount)}
                    </span>
                  </div>
                ))}
                {sortedTransactions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No transactions this month.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Floating Transactions button — visible at <md */}
        <button
          onClick={() => setShowSidebarSlideOver(true)}
          className="md:hidden fixed bottom-20 right-4 z-30 bg-[var(--color-primary)] text-white rounded-full px-4 py-2.5 shadow-lg flex items-center gap-2 text-sm font-medium"
          aria-label="Show transactions"
        >
          <span aria-hidden="true">📋</span>
          Transactions
          {sortedTransactions.length > 0 && (
            <span className="bg-white/25 text-white text-xs rounded-full px-1.5">{sortedTransactions.length}</span>
          )}
        </button>

        {/* Right Sidebar - Summary/Transactions — desktop only */}
        <div
          className="hidden md:block bg-surface border-l border-border relative"
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Resize Handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors group"
            onMouseDown={handleMouseDown}
            style={{ marginLeft: "-2px" }}
          >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-border rounded-full group-hover:bg-blue-500 transition-colors"></div>
          </div>
          <div className="p-6">
            {/* Main Tabs - Summary / Transactions */}
            <div className="flex items-center justify-center space-x-8 mb-6">
              <button
                onClick={() => setActiveTab("summary")}
                className={`flex flex-col items-center space-y-1 pb-2 ${
                  activeTab === "summary" ? "border-b-2 border-blue-600" : ""
                }`}
              >
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <span
                  className={`text-sm font-medium ${
                    activeTab === "summary" ? "text-blue-600" : "text-muted-foreground"
                  }`}
                >
                  Summary
                </span>
              </button>
              <button
                onClick={() => setActiveTab("transactions")}
                className={`flex flex-col items-center space-y-1 pb-2 ${
                  activeTab === "transactions"
                    ? "border-b-2 border-blue-600"
                    : ""
                }`}
              >
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span
                  className={`text-sm font-medium ${
                    activeTab === "transactions"
                      ? "text-blue-600"
                      : "text-muted-foreground"
                  }`}
                >
                  Transactions
                </span>
              </button>
              <button
                onClick={() => setActiveTab("calendar")}
                className={`flex flex-col items-center space-y-1 pb-2 ${
                  activeTab === "calendar" ? "border-b-2 border-blue-600" : ""
                }`}
              >
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span
                  className={`text-sm font-medium ${
                    activeTab === "calendar" ? "text-blue-600" : "text-muted-foreground"
                  }`}
                >
                  Calendar
                </span>
              </button>
            </div>

            {/* Summary View */}
            {activeTab === "summary" && (
              <div className="space-y-5">
                {/* Donut chart + income label */}
                <div className="flex flex-col items-center">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="80" cy="80" r="64" fill="none" stroke="var(--color-muted)" strokeWidth="14" />
                      <circle
                        cx="80" cy="80" r="64" fill="none"
                        stroke="var(--color-primary)"
                        strokeWidth="14"
                        strokeDasharray={`${Math.min((totals.spent / Math.max(totals.income, 1)) * 402, 402)} 402`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-xs text-[var(--color-muted-foreground)]">Income</div>
                      <div className="text-xl font-bold text-[var(--color-foreground)] tabular-nums">
                        {formatCurrency(totals.income, currency)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Row — cleaner labels, no uppercase noise */}
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="bg-[var(--color-muted)] rounded-lg p-2.5">
                    <div className="text-[10px] text-[var(--color-muted-foreground)] mb-0.5">Planned</div>
                    <div className="text-sm font-semibold text-[var(--color-foreground)] tabular-nums">
                      {formatCurrency(totals.planned, currency)}
                    </div>
                  </div>
                  <div className="bg-[var(--color-muted)] rounded-lg p-2.5">
                    <div className="text-[10px] text-[var(--color-muted-foreground)] mb-0.5">Spent</div>
                    <div className="text-sm font-semibold text-[var(--color-foreground)] tabular-nums">
                      {formatCurrency(totals.spent, currency)}
                    </div>
                  </div>
                  <div className="bg-[var(--color-muted)] rounded-lg p-2.5">
                    <div className="text-[10px] text-[var(--color-muted-foreground)] mb-0.5">Left</div>
                    <div className={`text-sm font-semibold tabular-nums ${totals.remaining < 0 ? 'text-red-600' : 'text-[var(--color-foreground)]'}`}>
                      {formatCurrency(Math.abs(totals.remaining), currency)}
                    </div>
                  </div>
                </div>

                {/* Group breakdown — pill badges, no % clutter */}
                <div className="space-y-2">
                  {budget &&
                    budget.groups
                      .filter((g) => g.type !== "income")
                      .map((group, index) => {
                        const groupTotal = group.categories.reduce((sum, cat) => sum + cat.plannedAmount, 0);
                        const groupSpent = group.categories.reduce((sum, cat) => sum + cat.spentAmount, 0);
                        const colors = ["#059669", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
                        const color = colors[index % colors.length];
                        const pct = groupTotal > 0 ? Math.min((groupSpent / groupTotal) * 100, 100) : 0;
                        return (
                          <div key={group.id}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                <span className="text-sm font-medium text-[var(--color-foreground)]">{group.name}</span>
                              </div>
                              <span className="text-sm tabular-nums text-[var(--color-muted-foreground)]">
                                {formatCurrency(groupSpent, currency)} / {formatCurrency(groupTotal, currency)}
                              </span>
                            </div>
                            <div className="h-1.5 bg-[var(--color-muted)] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                            </div>
                          </div>
                        );
                      })}
                </div>

                {/* Category Details — progress bars, clean layout */}
                <div className="pt-4 border-t border-[var(--color-border)]">
                  <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-3">By Category</h3>
                  <div className="space-y-5">
                    {budget &&
                      budget.groups
                        .filter((g) => g.type !== "income")
                        .map((group) => (
                          <div key={group.id}>
                            {/* Group label — understated, not ALL CAPS */}
                            <div className="text-[10px] font-semibold text-[var(--color-muted-foreground)] tracking-wide uppercase mb-2">
                              {group.name}
                            </div>
                            <div className="space-y-2.5">
                              {group.categories.map((category) => {
                                const spent = category.spentAmount;
                                const planned = category.plannedAmount;
                                const isOverspent = spent > planned;
                                const pct = planned > 0 ? Math.min((spent / planned) * 100, 100) : 0;
                                const overPct = planned > 0 ? Math.round((spent / planned) * 100) : 0;

                                return (
                                  <div key={category.id}>
                                    {/* Name + amounts on one line */}
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-sm shrink-0">{category.icon}</span>
                                        <span className="text-sm text-[var(--color-foreground)] truncate">{category.name}</span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <span className={`text-sm tabular-nums font-medium ${isOverspent ? 'text-red-600 dark:text-red-400' : spent > 0 ? 'text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)]'}`}>
                                          {formatCurrency(spent, currency)}
                                        </span>
                                        {isOverspent ? (
                                          <span className="text-[10px] font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-full">
                                            +{overPct - 100}%
                                          </span>
                                        ) : planned > 0 ? (
                                          <span className="text-[10px] text-[var(--color-muted-foreground)] tabular-nums">
                                            of {formatCurrency(planned, currency)}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                    {/* Progress bar — only show if planned > 0 */}
                                    {planned > 0 && (
                                      <div className="h-1 bg-[var(--color-muted)] rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all ${isOverspent ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-[var(--color-primary)]'}`}
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                    )}
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
            {activeTab === "transactions" && (
              <>
                {/* Transaction Tabs — use design tokens, not hardcoded blue */}
                <div className="flex space-x-6 mb-5 border-b border-[var(--color-border)]">
                  <button className="pb-2 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
                    New
                  </button>
                  <button className="pb-2 text-sm font-medium text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]">
                    Tracked
                  </button>
                  <button className="pb-2 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
                    Deleted
                  </button>
                </div>

                {/* Transaction Filters */}
                <div className="mb-6">
                  <TransactionFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    categories={allCategories}
                    compact={true}
                  />
                </div>

                {/* Filtered Transactions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                    <span>
                      {hasActiveFilters
                        ? `${filteredTransactions.length} result${filteredTransactions.length !== 1 ? "s" : ""}`
                        : new Date().toLocaleDateString("en-US", {
                            month: "long",
                          })}
                    </span>
                    {hasActiveFilters && (
                      <span className="text-xs text-gray-400">
                        of {allTransactions.length} total
                      </span>
                    )}
                  </div>

                  {/* Sort controls */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span>Sort:</span>
                    {(["date", "amount", "description"] as const).map(
                      (field) => (
                        <button
                          key={field}
                          onClick={() => {
                            if (sortBy === field) {
                              setSortOrder((o) =>
                                o === "asc" ? "desc" : "asc",
                              );
                            } else {
                              setSortBy(field);
                              setSortOrder(field === "date" ? "desc" : "asc");
                            }
                          }}
                          className={`px-2 py-0.5 rounded capitalize transition-colors ${
                            sortBy === field
                              ? "bg-emerald-100 text-emerald-700 font-medium"
                              : "hover:bg-gray-100"
                          }`}
                        >
                          {field}{" "}
                          {sortBy === field
                            ? sortOrder === "asc"
                              ? "↑"
                              : "↓"
                            : ""}
                        </button>
                      ),
                    )}
                  </div>

                  {/* Transaction list using sorted+filtered data */}
                  <div className="space-y-3">
                    {sortedTransactions.map((txn) => {
                      const isIncome = txn.groupType === "income";
                      return (
                        <div
                          key={txn.id}
                          className="group/transaction flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                        >
                          <div
                            className={`w-8 h-8 ${
                              isIncome ? "bg-green-100" : "bg-red-100"
                            } rounded-full flex items-center justify-center`}
                          >
                            <span
                              className={`${
                                isIncome ? "text-green-600" : "text-red-600"
                              } text-xs`}
                            >
                              {txn.categoryIcon || "$"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {txn.description}
                            </div>
                            <div className="text-xs text-gray-500">
                              {txn.categoryName}
                              {txn.date && (
                                <span className="ml-2 text-gray-400">
                                  {new Date(txn.date).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                    },
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                          <div
                            className={`text-sm font-medium ${
                              isIncome ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {isIncome ? "+" : "-"}
                            {formatCurrency(txn.amount, currency)}
                          </div>
                          <button
                            onClick={() =>
                              handleDeleteTransaction(txn.id, txn.categoryId)
                            }
                            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors flex-shrink-0"
                            title="Delete transaction"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                          {/* Mark as Recurring button - only for expenses */}
                          {!isIncome && (
                            <button
                              onClick={() => {
                                setSelectedTransactionForRecurring({
                                  id: txn.id,
                                  description: txn.description,
                                  amount: txn.amount,
                                  date: txn.date,
                                  categoryName: txn.categoryName,
                                });
                                setShowRecurringModal(true);
                              }}
                              className="p-1 text-gray-400 hover:text-indigo-600 rounded transition-colors flex-shrink-0 opacity-0 group-hover/transaction:opacity-100"
                              title="Mark as recurring bill"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Empty state */}
                    {sortedTransactions.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        {hasActiveFilters ? (
                          <>
                            <EmptyState
                              title="No transactions match your filters"
                              description={undefined}
                              actionLabel="Clear all filters"
                              onAction={clearFilters}
                            />
                          </>
                        ) : (
                          <EmptyState
                            title="No transactions yet"
                            description="Use the + button to add your first transaction"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Connect Bank Button */}
                <button
                  onClick={() => navigate("/accounts")}
                  className="mt-8 w-full p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">🏦</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-blue-900">
                        Connect Your Bank
                      </div>
                      <div className="text-xs text-blue-700">
                        Link accounts to auto-import transactions
                      </div>
                    </div>
                  </div>
                </button>
              </>
            )}

            {/* Calendar View */}
            {activeTab === "calendar" && (
              <CalendarView
                transactions={allTransactions.map((txn) => ({
                  id: txn.id,
                  description: txn.description,
                  amount: txn.amount,
                  date: txn.date,
                  categoryName: txn.categoryName,
                  type: txn.groupType === "income" ? "income" : "expense",
                }))}
                month={currentMonth}
                currency={currency}
                onDateClick={(date, transactions) => {
                  // Could open a modal or filter to show transactions for that date
                  console.log("Date clicked:", date, transactions);
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions FAB - Enhanced with keyboard shortcuts */}
      <div data-tutorial="quick-actions">
        <QuickActionsFAB
          onAddIncome={() => openTransactionModal("income")}
          onAddExpense={() => openTransactionModal("expense")}
          onScanReceipt={() => setShowReceiptModal(true)}
        />
      </div>

      {/* Keyboard Shortcuts Help Overlay */}
      {showShortcutsHelp && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowShortcutsHelp(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
        >
          <div
            className="bg-surface rounded-xl shadow-xl p-6 max-w-sm w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowShortcutsHelp(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close shortcuts"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { key: 'T', desc: 'Add transaction' },
                { key: 'B', desc: 'Add budget item' },
                { key: '←', desc: 'Previous month' },
                { key: '→', desc: 'Next month' },
                { key: '?', desc: 'Show/hide shortcuts' },
                { key: 'Esc', desc: 'Close modal' },
              ].map(s => (
                <div key={s.key} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{s.desc}</span>
                  <kbd className="px-2 py-0.5 bg-muted text-foreground rounded text-xs font-mono border border-border">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Scan Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-lg w-full">
            <ReceiptUpload
              onScanComplete={(data) => {
                // Pre-fill transaction form with extracted data
                const extracted = data.extractedData;
                setTransactionType("expense");
                setTransactionForm({
                  amount: extracted.total?.toString() || "",
                  description: extracted.merchant || "Receipt scan",
                  date: extracted.date || getTodayString(),
                  categoryId: "", // User will select category
                });
                setShowReceiptModal(false);
                setShowTransactionModal(true);
              }}
              onClose={() => setShowReceiptModal(false)}
            />
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && transactionType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {transactionType === "income"
                  ? "Add Income Transaction"
                  : "Add Expense Transaction"}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => openTemplateModal("select")}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Use template"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </button>
                <button
                  onClick={closeTransactionModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={transactionForm.categoryId}
                  onChange={(e) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      categoryId: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a category...</option>
                  {getAvailableCategories().map((cat) => (
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
                  <span className="absolute left-3 top-2.5 text-gray-500">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionForm.amount}
                    onChange={(e) =>
                      setTransactionForm((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
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
                  onChange={(e) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
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
                  onChange={(e) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
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
                {transactionForm.categoryId && transactionForm.description && (
                  <button
                    type="button"
                    onClick={() => openTemplateModal("save")}
                    className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    title="Save as template"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                      />
                    </svg>
                  </button>
                )}
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

      {/* Transaction Template Modal */}
      <TransactionTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelectTemplate={handleSelectTemplate}
        currentTransaction={getCurrentTransactionForTemplate()}
        mode={templateModalMode}
      />

      {/* Budget Item Modal */}
      {showBudgetItemModal && selectedGroupType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingCategory ? "Edit" : "Plan"}{" "}
                {selectedGroupType === "income"
                  ? "Income"
                  : selectedGroupType === "savings"
                    ? "Savings"
                    : "Expense"}{" "}
                Item
              </h3>
              <button
                onClick={closeBudgetItemModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
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
                  onChange={(e) =>
                    setBudgetItemForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
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
                  onChange={(e) =>
                    setBudgetItemForm((prev) => ({
                      ...prev,
                      icon: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 💰 🏠 🚗 🍔"
                  maxLength={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {budgetItemForm.isRecurring
                    ? "Amount per Occurrence"
                    : selectedGroupType === "income" &&
                      (budgetItemForm.frequency === "biweekly" || budgetItemForm.frequency === "weekly")
                    ? "Monthly Total (auto-calculated)"
                    : "Planned Amount"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={budgetItemForm.plannedAmount}
                    onChange={(e) =>
                      setBudgetItemForm((prev) => ({
                        ...prev,
                        plannedAmount: e.target.value,
                      }))
                    }
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    required={
                      !(selectedGroupType === "income" &&
                        (budgetItemForm.frequency === "biweekly" || budgetItemForm.frequency === "weekly") &&
                        budgetItemForm.frequencyAmount !== "")
                    }
                    readOnly={
                      selectedGroupType === "income" &&
                      (budgetItemForm.frequency === "biweekly" || budgetItemForm.frequency === "weekly") &&
                      budgetItemForm.frequencyAmount !== ""
                    }
                  />
                </div>
                {budgetItemForm.isRecurring && budgetItemForm.plannedAmount && (
                  <p className="text-xs text-gray-500 mt-1">
                    Monthly total will be calculated based on frequency
                  </p>
                )}
              </div>

              {/* Income frequency selector */}
              {selectedGroupType === "income" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pay Frequency
                  </label>
                  <select
                    value={budgetItemForm.frequency}
                    onChange={(e) => {
                      const freq = e.target.value as typeof budgetItemForm.frequency;
                      setBudgetItemForm((prev) => ({
                        ...prev,
                        frequency: freq,
                        // Clear frequencyAmount when switching away from biweekly/weekly
                        frequencyAmount:
                          freq === "biweekly" || freq === "weekly"
                            ? prev.frequencyAmount
                            : "",
                      }));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="semi-monthly">Semi-monthly (twice a month)</option>
                    <option value="biweekly">Biweekly (every 2 weeks)</option>
                    <option value="weekly">Weekly</option>
                    <option value="one-time">One-time (won&apos;t repeat next month)</option>
                  </select>
                  {budgetItemForm.frequency === "one-time" && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ This item won&apos;t be carried over to next month.
                    </p>
                  )}
                </div>
              )}

              {/* Per-period amount input for biweekly/weekly income */}
              {selectedGroupType === "income" &&
                (budgetItemForm.frequency === "biweekly" || budgetItemForm.frequency === "weekly") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount per{" "}
                      {budgetItemForm.frequency === "biweekly" ? "Paycheck (every 2 weeks)" : "Week"}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={budgetItemForm.frequencyAmount}
                        onChange={(e) => {
                          const perPeriod = parseFloat(e.target.value) || 0;
                          const monthStr = budget?.month || currentMonth;
                          const startDateStr = budgetItemForm.startDate || getTodayString();
                          // Map to shared frequency type and use accurate date-based calculation
                          const freqMap: Record<string, "weekly" | "bi-weekly"> = {
                            biweekly: "bi-weekly",
                            weekly: "weekly",
                          };
                          const mappedFreq = freqMap[budgetItemForm.frequency];
                          const monthly = mappedFreq
                            ? calculatePlannedMonthlyAmount(perPeriod, mappedFreq, startDateStr, monthStr)
                            : Math.round(perPeriod * Math.ceil(new Date(parseInt(monthStr.split('-')[0]), parseInt(monthStr.split('-')[1]), 0).getDate() / 7));
                          setBudgetItemForm((prev) => ({
                            ...prev,
                            frequencyAmount: e.target.value,
                            plannedAmount: monthly > 0 ? monthly.toString() : "",
                          }));
                        }}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    {budgetItemForm.frequencyAmount && parseFloat(budgetItemForm.frequencyAmount) > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        Monthly total for{" "}
                        {budget?.month || currentMonth}:{" "}
                        <strong>${budgetItemForm.plannedAmount}</strong>
                      </p>
                    )}
                  </div>
                )}

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={budgetItemForm.isRecurring}
                  onChange={(e) =>
                    setBudgetItemForm((prev) => ({
                      ...prev,
                      isRecurring: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="isRecurring"
                  className="text-sm font-medium text-gray-700"
                >
                  Recurring
                </label>
              </div>

              {budgetItemForm.isRecurring && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frequency
                    </label>
                    <select
                      value={budgetItemForm.recurringFrequency}
                      onChange={(e) =>
                        setBudgetItemForm((prev) => ({
                          ...prev,
                          recurringFrequency: e.target.value as any,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="bi-weekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="annually">Annually</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Occurrence Date
                    </label>
                    <input
                      type="date"
                      value={budgetItemForm.startDate}
                      onChange={(e) =>
                        setBudgetItemForm((prev) => ({
                          ...prev,
                          startDate: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This determines how many times the item occurs in{" "}
                      {getMonthName(budget?.month || currentMonth)}
                    </p>
                  </div>
                </>
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
                  {editingCategory ? "Save Changes" : "Plan Item"}
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
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              Reset Budget for {getMonthName(currentMonth).split(" ")[0]}?
            </h3>

            {/* Warning Message */}
            <p className="text-gray-600 text-center mb-6">
              This will permanently delete all categories and transactions for{" "}
              {getMonthName(currentMonth)}. This action cannot be undone.
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

      {/* Tutorial Overlay for first-time users */}
      <TutorialOverlay
        steps={DEFAULT_TUTORIAL_STEPS}
        isOpen={showTutorial}
        onComplete={handleTutorialComplete}
        onSkip={handleTutorialSkip}
      />

      {/* Mark as Recurring Modal */}
      <MarkRecurringModal
        isOpen={showRecurringModal}
        onClose={() => {
          setShowRecurringModal(false);
          setSelectedTransactionForRecurring(null);
        }}
        transaction={selectedTransactionForRecurring}
        onSuccess={() => {
          // Optionally reload data or show success message
        }}
        currency={currency}
      />
    </div>
  );
};

export default BudgetPage;
