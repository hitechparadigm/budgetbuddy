// BudgetBuddy Shared Utility Functions
// Common utility functions used across all applications

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Email validation moved to validation.ts for consistency

// Recurring budget calculations
export * from './utils/recurringCalculations';

// Placeholder utilities - will be expanded in future tasks
