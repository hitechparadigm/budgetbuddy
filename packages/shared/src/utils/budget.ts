/**
 * Budget calculation utilities
 */

import type { Budget, BudgetGroup, BudgetCategory } from '../types/budget';

export function calculateBudgetTotals(budget: Budget): {
  totalIncome: number;
  totalSavings: number;
  totalExpenses: number;
  remainingBalance: number;
} {
  const totalIncome = budget.groups.income.reduce((sum, group) => sum + group.totalPlanned, 0);
  const totalSavings = budget.groups.savings.reduce((sum, group) => sum + group.totalPlanned, 0);
  const totalExpenses = budget.groups.expenses.reduce((sum, group) => sum + group.totalPlanned, 0);
  
  const remainingBalance = totalIncome - totalSavings - totalExpenses;
  
  return {
    totalIncome,
    totalSavings,
    totalExpenses,
    remainingBalance,
  };
}

export function calculateGroupTotals(group: BudgetGroup): {
  totalPlanned: number;
  totalSpent: number;
  totalRemaining: number;
} {
  const totalPlanned = group.categories.reduce((sum, cat) => sum + cat.plannedAmount, 0);
  const totalSpent = group.categories.reduce((sum, cat) => sum + cat.spentAmount, 0);
  const totalRemaining = totalPlanned - totalSpent;
  
  return {
    totalPlanned,
    totalSpent,
    totalRemaining,
  };
}

export function updateCategorySpent(category: BudgetCategory, transactionAmount: number): BudgetCategory {
  const newSpentAmount = category.spentAmount + transactionAmount;
  const newRemainingAmount = category.plannedAmount - newSpentAmount;
  
  return {
    ...category,
    spentAmount: newSpentAmount,
    remainingAmount: newRemainingAmount,
  };
}

export function isZeroBasedBudget(budget: Budget): boolean {
  const totals = calculateBudgetTotals(budget);
  return Math.abs(totals.remainingBalance) < 0.01; // Allow for floating point precision
}

export function getBudgetProgress(planned: number, spent: number): {
  percentage: number;
  status: 'under' | 'on-track' | 'over';
} {
  if (planned === 0) {
    return { percentage: 0, status: 'on-track' };
  }
  
  const percentage = (spent / planned) * 100;
  
  let status: 'under' | 'on-track' | 'over';
  if (percentage < 80) {
    status = 'under';
  } else if (percentage <= 100) {
    status = 'on-track';
  } else {
    status = 'over';
  }
  
  return { percentage: Math.min(percentage, 100), status };
}

export function generateCategoryId(): string {
  return `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateBudgetId(): string {
  return `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}