/**
 * Month calculation helpers that respect user timezone
 *
 * CRITICAL: These functions fix the bug where December was shown on Nov 30 at 7:22 PM EST
 * because the app was using UTC time instead of local time.
 */

import { getCurrentMonthInTimezone, detectUserTimezone } from './timezoneHelpers';

/**
 * Gets the current month in YYYY-MM format using the user's timezone
 *
 * BEFORE (BUGGY): new Date().toISOString().slice(0, 7)
 * - On Nov 30, 2025 7:22 PM EST, this returns "2025-12" (WRONG!)
 * - Because UTC is 5 hours ahead: Nov 30 19:22 EST = Dec 1 00:22 UTC
 *
 * AFTER (FIXED): Uses user's local timezone
 * - On Nov 30, 2025 7:22 PM EST, this returns "2025-11" (CORRECT!)
 *
 * @param timezone - Optional IANA timezone (defaults to browser-detected timezone)
 * @returns Month string in YYYY-MM format
 */
export const getCurrentMonthString = (timezone?: string): string => {
  const tz = timezone || detectUserTimezone();
  const { month, year } = getCurrentMonthInTimezone(tz);
  return `${year}-${String(month).padStart(2, '0')}`;
};

/**
 * Gets today's date in YYYY-MM-DD format using the user's timezone
 * @param timezone - Optional IANA timezone
 * @returns Date string in YYYY-MM-DD format
 */
export const getTodayString = (timezone?: string): string => {
  const tz = timezone || detectUserTimezone();
  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
};

/**
 * Checks if a month string is in the future relative to user's current month
 * @param monthString - Month in YYYY-MM format
 * @param timezone - Optional IANA timezone
 * @returns true if the month is in the future
 */
export const isFutureMonth = (monthString: string, timezone?: string): boolean => {
  const tz = timezone || detectUserTimezone();
  const { month: currentMonth, year: currentYear } = getCurrentMonthInTimezone(tz);
  const [year, month] = monthString.split('-').map(Number);

  if (year > currentYear) return true;
  if (year === currentYear && month > currentMonth) return true;
  return false;
};

/**
 * Checks if a month string is in the past relative to user's current month
 * @param monthString - Month in YYYY-MM format
 * @param timezone - Optional IANA timezone
 * @returns true if the month is in the past
 */
export const isPastMonth = (monthString: string, timezone?: string): boolean => {
  const tz = timezone || detectUserTimezone();
  const { month: currentMonth, year: currentYear } = getCurrentMonthInTimezone(tz);
  const [year, month] = monthString.split('-').map(Number);

  if (year < currentYear) return true;
  if (year === currentYear && month < currentMonth) return true;
  return false;
};

/**
 * Checks if a month string is the current month
 * @param monthString - Month in YYYY-MM format
 * @param timezone - Optional IANA timezone
 * @returns true if the month is the current month
 */
export const isCurrentMonth = (monthString: string, timezone?: string): boolean => {
  const currentMonthStr = getCurrentMonthString(timezone);
  return monthString === currentMonthStr;
};
