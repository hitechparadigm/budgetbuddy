/**
 * Budget Types and Interfaces
 * Defines the data models for budget management
 */

export interface Budget {
  id: string;
  name: string;
  amount: number;
  category: string;
  frequency: BudgetFrequency;
  startDate: string; // ISO date string
  endDate?: string; // ISO date string, optional for ongoing budgets
  type: BudgetType;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetSummary {
  budgetId: string;
  planned: number;
  actual: number;
  remaining: number;
  percentUsed: number;
  isOverBudget: boolean;
  transactionCount: number;
}

export interface MonthlyBudgetOverview {
  year: number;
  month: number; // 1-12
  totalPlanned: number;
  totalActual: number;
  totalRemaining: number;
  budgets: BudgetWithSummary[];
  categories: CategorySummary[];
}

export interface BudgetWithSummary extends Budget {
  summary: BudgetSummary;
}

export interface CategorySummary {
  category: string;
  planned: number;
  actual: number;
  remaining: number;
  budgetCount: number;
}

export type BudgetType = 'income' | 'expense' | 'savings';

export type BudgetFrequency =
  | 'weekly'
  | 'bi-weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'one-time';

export interface CreateBudgetRequest {
  name: string;
  amount: number;
  category: string;
  frequency: BudgetFrequency;
  startDate: string;
  endDate?: string;
  type: BudgetType;
  description?: string;
}

export interface UpdateBudgetRequest extends Partial<CreateBudgetRequest> {
  id: string;
}

export interface BudgetFilters {
  type?: BudgetType;
  category?: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

// Common budget categories
export const BUDGET_CATEGORIES = {
  income: [
    'Salary',
    'Freelance',
    'Investment',
    'Business',
    'Other Income',
  ],
  expense: [
    'Housing',
    'Transportation',
    'Food & Dining',
    'Utilities',
    'Healthcare',
    'Entertainment',
    'Shopping',
    'Personal Care',
    'Education',
    'Insurance',
    'Debt Payment',
    'Other Expenses',
  ],
  savings: [
    'Emergency Fund',
    'Retirement',
    'Vacation',
    'Home Down Payment',
    'Investment',
    'Other Savings',
  ],
} as const;

// Budget frequency display names
export const FREQUENCY_LABELS: Record<BudgetFrequency, string> = {
  'weekly': 'Weekly',
  'bi-weekly': 'Bi-weekly',
  'monthly': 'Monthly',
  'quarterly': 'Quarterly',
  'yearly': 'Yearly',
  'one-time': 'One-time',
};

// Budget type display names and colors
export const BUDGET_TYPE_CONFIG = {
  income: {
    label: 'Income',
    icon: '💰',
    color: '#10B981', // green
  },
  expense: {
    label: 'Expense',
    icon: '💸',
    color: '#EF4444', // red
  },
  savings: {
    label: 'Savings',
    icon: '💾',
    color: '#3B82F6', // blue
  },
} as const;
