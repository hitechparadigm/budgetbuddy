/**
 * Budget Storage Utilities
 * Handles local storage for budget data during development
 */

import { MonthlyBudget } from '../../../shared/src/types/budget';

const BUDGET_STORAGE_KEY = 'budgetbuddy-budgets';

export const saveBudgetToStorage = (budget: MonthlyBudget): void => {
  try {
    const existingBudgets = getBudgetsFromStorage();
    const budgetIndex = existingBudgets.findIndex(b =>
      b.month === budget.month && b.year === budget.year
    );

    if (budgetIndex >= 0) {
      existingBudgets[budgetIndex] = budget;
    } else {
      existingBudgets.push(budget);
    }

    localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(existingBudgets));
  } catch (error) {
    console.error('Error saving budget to storage:', error);
  }
};

export const getBudgetsFromStorage = (): MonthlyBudget[] => {
  try {
    const stored = localStorage.getItem(BUDGET_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading budgets from storage:', error);
    return [];
  }
};

export const getBudgetFromStorage = (month: number, year: number): MonthlyBudget | null => {
  try {
    const budgets = getBudgetsFromStorage();
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    return budgets.find(b => b.month === monthStr) || null;
  } catch (error) {
    console.error('Error loading budget from storage:', error);
    return null;
  }
};

export const clearBudgetStorage = (): void => {
  try {
    localStorage.removeItem(BUDGET_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing budget storage:', error);
  }
};
