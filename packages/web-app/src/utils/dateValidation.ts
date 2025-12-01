/**
 * Date validation utilities for transaction forms
 */

export interface DateValidationResult {
  isValid: boolean;
  warning?: string;
  suggestedMonth?: string;
  transactionMonthName?: string;
  currentMonthName?: string;
}

/**
 * Validates if a transaction date falls within the current budget month
 * @param transactionDate - The date of the transaction (YYYY-MM-DD format)
 * @param currentBudgetMonth - The current budget month (YYYY-MM format)
 * @returns Validation result with warning message if date is outside current month
 */
export const validateTransactionDate = (
  transactionDate: string,
  currentBudgetMonth: string
): DateValidationResult => {
  if (!transactionDate || !currentBudgetMonth) {
    return { isValid: true };
  }

  const txDate = new Date(transactionDate);
  const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;

  if (txMonth === currentBudgetMonth) {
    return { isValid: true };
  }

  const txMonthName = txDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const currentMonthName = new Date(currentBudgetMonth + '-01').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return {
    isValid: false,
    warning: `This transaction date (${txMonthName}) is outside the current budget month (${currentMonthName})`,
    suggestedMonth: txMonth,
    transactionMonthName: txMonthName,
    currentMonthName: currentMonthName
  };
};

/**
 * Gets the current month in YYYY-MM format
 * @returns Current month string
 */
export const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Formats a month string (YYYY-MM) to a readable format
 * @param monthString - Month in YYYY-MM format
 * @returns Formatted month name (e.g., "November 2025")
 */
export const formatMonthName = (monthString: string): string => {
  const date = new Date(monthString + '-01');
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
};
