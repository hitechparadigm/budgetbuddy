/**
 * Budget Management Types
 *
 * Defines the structure for budgets that integrate with transactions
 * and provide budget vs actual tracking.
 */

import { Category } from './categories';

export interface BudgetCategory {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;

  // Budget amounts
  plannedAmount: number;
  actualAmount: number;
  remainingAmount: number;

  // Progress tracking
  percentageUsed: number;
  isOverBudget: boolean;

  // Metadata
  lastTransactionDate?: string;
  transactionCount: number;
}

export interface BudgetGroup {
  groupId: string;
  groupName: string;
  groupType: 'income' | 'savings' | 'expense';
  groupColor: string;

  // Group totals
  totalPlanned: number;
  totalActual: number;
  totalRemaining: number;

  // Categories in this group
  categories: BudgetCategory[];

  // Group metadata
  order: number;
  isCollapsed: boolean;
}

export interface MonthlyBudget {
  budgetId: string;
  familyId: string;
  month: string; // YYYY-MM format
  year: number;

  // Budget status
  status: 'draft' | 'active' | 'completed';
  isZeroBasedBudget: boolean;

  // Overall totals
  totalIncome: {
    planned: number;
    actual: number;
    remaining: number;
  };

  totalSavings: {
    planned: number;
    actual: number;
    remaining: number;
  };

  totalExpenses: {
    planned: number;
    actual: number;
    remaining: number;
  };

  // Zero-based budget calculation
  netBalance: {
    planned: number; // Should be 0 for zero-based budget
    actual: number;
    variance: number;
  };

  // Budget groups
  groups: BudgetGroup[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;

  // AI and automation
  isAIGenerated: boolean;
  aiConfidence?: number;
  autoUpdateFromTransactions: boolean;
}

export interface BudgetSummary {
  budgetId: string;
  month: string;
  year: number;

  // Quick stats
  totalPlanned: number;
  totalActual: number;
  percentageUsed: number;

  // Status indicators
  isOnTrack: boolean;
  overBudgetCategories: number;
  underBudgetCategories: number;

  // Alerts
  hasOverspending: boolean;
  hasUnallocatedIncome: boolean;
  needsAttention: boolean;
}

export interface BudgetTemplate {
  templateId: string;
  templateName: string;
  description: string;

  // Template categories with default amounts
  categories: {
    categoryId: string;
    defaultAmount: number;
    isPercentageOfIncome: boolean;
    percentage?: number;
  }[];

  // Template metadata
  isDefault: boolean;
  createdBy: string;
  usageCount: number;
}

// Budget creation and update interfaces
export interface CreateBudgetRequest {
  month: string;
  year: number;
  templateId?: string;
  categories: {
    categoryId: string;
    plannedAmount: number;
  }[];
  autoUpdateFromTransactions?: boolean;
}

export interface UpdateBudgetCategoryRequest {
  categoryId: string;
  plannedAmount: number;
}

export interface BudgetProgress {
  categoryId: string;
  categoryName: string;
  planned: number;
  actual: number;
  remaining: number;
  percentageUsed: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  projectedMonthEnd: number;
}

// Helper types for budget calculations
export interface BudgetCalculation {
  totalIncome: number;
  totalSavings: number;
  totalExpenses: number;
  netBalance: number;
  isBalanced: boolean;
  unallocatedIncome: number;
}

export interface BudgetAlert {
  alertId: string;
  budgetId: string;
  categoryId: string;
  alertType: 'overspending' | 'approaching_limit' | 'no_activity' | 'unusual_spending';
  severity: 'low' | 'medium' | 'high';
  message: string;
  threshold: number;
  currentAmount: number;
  createdAt: string;
  isRead: boolean;
}
