/**
 * Recurring Budget Calculations - Shared Utility
 * Used by both web and mobile apps for consistent recurring budget calculations
 */

export type RecurringFrequency = 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'annually';

/**
 * Parse a date string (YYYY-MM-DD) into a local Date object
 * Ensures consistent timezone handling across platforms
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Calculate how many times a recurring item occurs in a given month
 * @param frequency - The recurring frequency (weekly, bi-weekly, monthly, etc.)
 * @param startDate - The first occurrence date (YYYY-MM-DD format)
 * @param month - The month to calculate for (YYYY-MM format)
 * @returns Number of occurrences in the month
 */
export function calculateOccurrencesInMonth(
  frequency: RecurringFrequency,
  startDate: string,
  month: string
): number {
  const start = parseLocalDate(startDate);
  const [year, monthStr] = month.split('-');
  const monthNum = parseInt(monthStr, 10) - 1; // 0-indexed

  // Get first and last day of the month
  const monthStart = new Date(parseInt(year), monthNum, 1);
  const monthEnd = new Date(parseInt(year), monthNum + 1, 0);

  let occurrences = 0;
  let currentDate = new Date(start);

  // If start date is after the month, no occurrences
  if (currentDate > monthEnd) {
    return 0;
  }

  // Move to first occurrence in or after the month start
  while (currentDate < monthStart) {
    currentDate = getNextOccurrence(currentDate, frequency);
  }

  // Count occurrences in the month
  while (currentDate <= monthEnd) {
    occurrences++;
    currentDate = getNextOccurrence(currentDate, frequency);
  }

  return occurrences;
}

/**
 * Get the next occurrence date based on frequency
 * @param currentDate - The current date
 * @param frequency - The recurring frequency
 * @returns The next occurrence date
 */
export function getNextOccurrence(currentDate: Date, frequency: RecurringFrequency): Date {
  const next = new Date(currentDate);

  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'bi-weekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'annually':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}

/**
 * Get all occurrence dates for a recurring item in a given month
 * @param frequency - The recurring frequency
 * @param startDate - The first occurrence date (YYYY-MM-DD format)
 * @param month - The month to calculate for (YYYY-MM format)
 * @returns Array of occurrence dates in YYYY-MM-DD format
 */
export function getOccurrenceDatesInMonth(
  frequency: RecurringFrequency,
  startDate: string,
  month: string
): string[] {
  const start = parseLocalDate(startDate);
  const [year, monthStr] = month.split('-');
  const monthNum = parseInt(monthStr, 10) - 1; // 0-indexed

  // Get first and last day of the month
  const monthStart = new Date(parseInt(year), monthNum, 1);
  const monthEnd = new Date(parseInt(year), monthNum + 1, 0);

  const dates: string[] = [];
  let currentDate = new Date(start);

  // If start date is after the month, no occurrences
  if (currentDate > monthEnd) {
    return [];
  }

  // Move to first occurrence in or after the month start
  while (currentDate < monthStart) {
    currentDate = getNextOccurrence(currentDate, frequency);
  }

  // Collect all occurrence dates in the month
  while (currentDate <= monthEnd) {
    dates.push(formatDate(currentDate));
    currentDate = getNextOccurrence(currentDate, frequency);
  }

  return dates;
}

/**
 * Format a date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate the planned monthly amount for a recurring item
 * @param baseAmount - The per-occurrence amount
 * @param frequency - The recurring frequency
 * @param startDate - The first occurrence date (YYYY-MM-DD format)
 * @param month - The month to calculate for (YYYY-MM format)
 * @returns The total planned amount for the month
 */
export function calculatePlannedMonthlyAmount(
  baseAmount: number,
  frequency: RecurringFrequency,
  startDate: string,
  month: string
): number {
  const occurrences = calculateOccurrencesInMonth(frequency, startDate, month);
  return baseAmount * occurrences;
}
