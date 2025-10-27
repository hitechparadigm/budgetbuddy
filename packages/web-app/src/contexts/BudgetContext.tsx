/**
 * Budget Context for BudgetBuddy Web App
 * Manages budget state and provides budget operations
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient, ApiClientError } from '../utils/apiClient';
import { useAuth } from './AuthContext';

// ============================================================================
// Types
// ============================================================================

interface BudgetGroup {
  groupName: string;
  groupType: 'income' | 'saving' | 'expense';
  categories: Category[];
  totalPlanned: number;
  totalSpent: number;
  totalRemaining: number;
}

interface Category {
  categoryId: string;
  categoryName: string;
  parentGroup: string;
  groupType: 'income' | 'saving' | 'expense';
  categoryOrder: number;
  icon: string;
  colorCode: string;
  plannedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  isCustom: boolean;
  isActive: boolean;
  createdAt: string;
}

interface Budget {
  budgetId: string;
  familyId: string;
  month: string; // YYYY-MM format
  totalIncome: number;
  totalSavings: number;
  totalExpenses: number;
  remainingBalance: number;
  groups: {
    income: BudgetGroup[];
    savings: BudgetGroup[];
    expenses: BudgetGroup[];
  };
  isAIGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BudgetState {
  currentBudget: Budget | null;
  budgets: Budget[];
  selectedMonth: string;
  loading: boolean;
  error: string | null;
}

interface BudgetContextType extends BudgetState {
  loadBudgets: () => Promise<void>;
  loadBudget: (month: string) => Promise<void>;
  createBudget: (month: string, budgetData?: Partial<Budget>) => Promise<void>;
  updateBudget: (month: string, updates: Partial<Budget>) => Promise<void>;
  deleteBudget: (month: string) => Promise<void>;
  setSelectedMonth: (month: string) => void;
  clearError: () => void;
}

interface BudgetProviderProps {
  children: ReactNode;
}

// ============================================================================
// Context Creation
// ============================================================================

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

// ============================================================================
// Budget Provider Component
// ============================================================================

export const BudgetProvider: React.FC<BudgetProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [budgetState, setBudgetState] = useState<BudgetState>({
    currentBudget: null,
    budgets: [],
    selectedMonth: getCurrentMonth(),
    loading: false,
    error: null,
  });

  // ============================================================================
  // Initialize Budget Data
  // ============================================================================

  useEffect(() => {
    if (isAuthenticated) {
      loadBudgets();
    }
  }, [isAuthenticated]);

  // ============================================================================
  // Budget Operations
  // ============================================================================

  const loadBudgets = async (): Promise<void> => {
    setBudgetState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiClient.get('/budget');
      // Handle both {budgets: [...]} and {data: {budgets: [...]}} formats
      const budgets = response.budgets || response.data?.budgets || [];

      setBudgetState(prev => {
        const currentMonthBudget = budgets.find((b: Budget) => b.month === prev.selectedMonth);
        return {
          ...prev,
          budgets,
          currentBudget: currentMonthBudget || prev.currentBudget,
          loading: false,
        };
      });
    } catch (error) {
      const errorMessage = error instanceof ApiClientError
        ? error.message
        : 'Failed to load budgets';

      setBudgetState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  };

  const loadBudget = async (month: string): Promise<void> => {
    setBudgetState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiClient.get(`/budget/current?month=${month}`);

      // Extract budget from response (backend returns {success, data, message})
      const budget = response.data || response;

      setBudgetState(prev => ({
        ...prev,
        currentBudget: budget,
        selectedMonth: month,
        loading: false,
      }));
    } catch (error) {
      if (error instanceof ApiClientError && error.statusCode === 404) {
        // Budget doesn't exist for this month
        setBudgetState(prev => ({
          ...prev,
          currentBudget: null,
          selectedMonth: month,
          loading: false,
        }));
      } else {
        const errorMessage = error instanceof ApiClientError
          ? error.message
          : 'Failed to load budget';

        setBudgetState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      }
    }
  };

  const createBudget = async (month: string, budgetData?: Partial<Budget>): Promise<void> => {
    setBudgetState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const requestData = {
        month,
        groups: budgetData?.groups || {
          income: [{
            groupName: 'Income',
            groupType: 'income',
            categories: [],
            totalPlanned: 0,
            totalSpent: 0,
            totalRemaining: 0,
          }],
          savings: [{
            groupName: 'Savings',
            groupType: 'saving',
            categories: [],
            totalPlanned: 0,
            totalSpent: 0,
            totalRemaining: 0,
          }],
          expenses: [{
            groupName: 'Expenses',
            groupType: 'expense',
            categories: [],
            totalPlanned: 0,
            totalSpent: 0,
            totalRemaining: 0,
          }]
        },
        isAIGenerated: budgetData?.isAIGenerated || false,
      };

      console.log('Creating budget with data:', requestData);
      const response = await apiClient.post('/budget', requestData);
      console.log('Budget created successfully:', response);

      // Extract budget from response (backend returns {success, data, message})
      const budget = response.data || response;

      setBudgetState(prev => ({
        ...prev,
        currentBudget: budget,
        budgets: [...prev.budgets, budget],
        selectedMonth: month,
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof ApiClientError
        ? error.message
        : 'Failed to create budget';

      setBudgetState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  const updateBudget = async (month: string, updates: Partial<Budget>): Promise<void> => {
    setBudgetState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // First, get the budget for this month to find its budgetId
      const budgetsResponse = await apiClient.get('/budget');
      const budgetsData = budgetsResponse.data || budgetsResponse;
      const budget = budgetsData.budgets?.find((b: Budget) => b.month === month);

      if (!budget) {
        throw new Error(`No budget found for ${month}`);
      }

      const response = await apiClient.put(`/budget/${budget.budgetId}`, {
        ...updates,
        month // Include month in the request body
      });

      // Extract budget from response (backend returns {success, data, message})
      const updatedBudget = response.data || response;

      setBudgetState(prev => ({
        ...prev,
        currentBudget: updatedBudget,
        budgets: prev.budgets.map((b: Budget) => b.month === month ? updatedBudget : b),
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof ApiClientError
        ? error.message
        : 'Failed to update budget';

      setBudgetState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  const deleteBudget = async (month: string): Promise<void> => {
    setBudgetState(prev => ({ ...prev, loading: true, error: null }));

    try {
      await apiClient.delete(`/budget/current?month=${month}`);

      setBudgetState(prev => ({
        ...prev,
        currentBudget: prev.selectedMonth === month ? null : prev.currentBudget,
        budgets: prev.budgets.filter((b: Budget) => b.month !== month),
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof ApiClientError
        ? error.message
        : 'Failed to delete budget';

      setBudgetState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  const setSelectedMonth = (month: string): void => {
    setBudgetState(prev => ({ ...prev, selectedMonth: month }));
    loadBudget(month);
  };

  const clearError = (): void => {
    setBudgetState(prev => ({ ...prev, error: null }));
  };

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue: BudgetContextType = {
    ...budgetState,
    loadBudgets,
    loadBudget,
    createBudget,
    updateBudget,
    deleteBudget,
    setSelectedMonth,
    clearError,
  };

  return (
    <BudgetContext.Provider value={contextValue}>
      {children}
    </BudgetContext.Provider>
  );
};

// ============================================================================
// Custom Hook
// ============================================================================

export const useBudget = (): BudgetContextType => {
  const context = useContext(BudgetContext);

  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }

  return context;
};

// ============================================================================
// Utility Functions
// ============================================================================

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

// Export types for use in other components
export type { Budget, BudgetGroup, Category, BudgetState };
