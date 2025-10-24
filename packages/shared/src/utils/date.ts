/**
 * Date formatting and manipulation utilities for BudgetBuddy
 * Handles budget month formatting, date ranges, and localized date display
 */

/**
 * Format a date object or string into various display formats
 * Used throughout the app for consistent date presentation
 * @param date - Date object or ISO date string to format
 * @param format - Output format: 'short' (Jan 15, 2024), 'long' (Monday, January 15, 2024), 'iso' (2024-01-15)
 * @returns Formatted date string according to specified format
 */
export const formatDate = (date: Date | string, format: 'short' | 'long' | 'iso' = 'short'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'short':
      // Format: "Jan 15, 2024" - used in transaction lists and summaries
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    case 'long':
      // Format: "Monday, January 15, 2024" - used in detailed views
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      });
    case 'iso':
      // Format: "2024-01-15" - used for API requests and database storage
      return dateObj.toISOString().split('T')[0];
    default:
      return dateObj.toLocaleDateString();
  }
};

/**
 * Get the current month in YYYY-MM format
 * Used as default for budget views and new budget creation
 * @returns Current month string (e.g., "2024-01")
 */
export const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Convert YYYY-MM format to human-readable month name
 * Used in budget headers and navigation
 * @param monthString - Month in YYYY-MM format (e.g., "2024-01")
 * @returns Human-readable month and year (e.g., "January 2024")
 */
export const getMonthName = (monthString: string): string => {
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

/**
 * Add or subtract months from a YYYY-MM format string
 * Used for budget navigation (previous/next month)
 * @param monthString - Starting month in YYYY-MM format
 * @param months - Number of months to add (positive) or subtract (negative)
 * @returns New month string in YYYY-MM format
 */
export const addMonths = (monthString: string, months: number): string => {
  const [year, month] = monthString.split('-').map(Number);
  const date = new Date(year, month - 1); // month - 1 because Date months are 0-indexed
  date.setMonth(date.getMonth() + months);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Validate if a string represents a valid date
 * Used in form validation for transaction dates
 * @param dateString - Date string to validate
 * @returns true if the string represents a valid date
 */
export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * Generate an array of date strings between start and end dates (inclusive)
 * Used for date range pickers and reporting periods
 * @param startDate - Start date in ISO format (YYYY-MM-DD)
 * @param endDate - End date in ISO format (YYYY-MM-DD)
 * @returns Array of date strings in ISO format for each day in the range
 */
export const getDateRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Iterate through each day from start to end
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    dates.push(formatDate(date, 'iso'));
  }
  
  return dates;
};