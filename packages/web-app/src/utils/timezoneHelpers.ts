/**
 * Timezone utility functions for handling user timezones
 *
 * These functions ensure all date calculations respect the user's local timezone
 * instead of using UTC, which was causing the bug where December was shown on Nov 30 at 7:22 PM EST.
 */

/**
 * Detects the user's timezone using the browser's Intl API
 * @returns IANA timezone string (e.g., "America/New_York", "America/Toronto")
 */
export const detectUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Failed to detect timezone:', error);
    return 'America/New_York'; // Fallback to EST
  }
};

/**
 * Gets the current date/time in a specific timezone
 * @param timezone - IANA timezone string
 * @returns Date object representing current time in the specified timezone
 */
export const getCurrentDateInTimezone = (timezone: string): Date => {
  const now = new Date();

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });

    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1; // 0-indexed
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');

    return new Date(year, month, day, hour, minute, second);
  } catch (error) {
    console.error('Failed to get date in timezone:', error);
    return now; // Fallback to local time
  }
};

/**
 * Gets the current month and year in a specific timezone
 * @param timezone - IANA timezone string
 * @returns Object with month (1-12) and year
 *
 * Example: On Nov 30, 2025 7:22 PM EST, returns { month: 11, year: 2025 }
 * (Not December, which would be the case with UTC)
 */
export const getCurrentMonthInTimezone = (timezone: string): { month: number; year: number } => {
  const date = getCurrentDateInTimezone(timezone);
  return {
    month: date.getMonth() + 1, // Convert to 1-12
    year: date.getFullYear()
  };
};

/**
 * Formats a date in a specific timezone
 * @param date - Date to format
 * @param timezone - IANA timezone string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export const formatDateInTimezone = (
  date: Date,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      ...options,
      timeZone: timezone
    }).format(date);
  } catch (error) {
    console.error('Failed to format date in timezone:', error);
    return date.toLocaleDateString();
  }
};

/**
 * Checks if a date is "today" in a specific timezone
 * @param date - Date to check
 * @param timezone - IANA timezone string
 * @returns true if the date is today in the specified timezone
 */
export const isTodayInTimezone = (date: Date, timezone: string): boolean => {
  const today = getCurrentDateInTimezone(timezone);
  const checkDate = new Date(date);

  return (
    checkDate.getFullYear() === today.getFullYear() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getDate() === today.getDate()
  );
};

/**
 * Gets the month name in a specific timezone
 * @param month - Month number (1-12)
 * @param year - Year
 * @param timezone - IANA timezone string
 * @returns Month name (e.g., "November")
 */
export const getMonthNameInTimezone = (
  month: number,
  year: number,
  timezone: string
): string => {
  const date = new Date(year, month - 1, 1);
  return formatDateInTimezone(date, timezone, { month: 'long' });
};

/**
 * Gets the full month and year string in a specific timezone
 * @param month - Month number (1-12)
 * @param year - Year
 * @param timezone - IANA timezone string
 * @returns Formatted string (e.g., "November 2025")
 */
export const getMonthYearStringInTimezone = (
  month: number,
  year: number,
  timezone: string
): string => {
  const date = new Date(year, month - 1, 1);
  return formatDateInTimezone(date, timezone, { month: 'long', year: 'numeric' });
};

/**
 * Converts a date string to the user's timezone
 * @param dateString - Date string (YYYY-MM-DD)
 * @param _timezone - IANA timezone string (reserved for future use)
 * @returns Date object in the specified timezone
 */
export const parseDateInTimezone = (dateString: string, _timezone?: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Gets the start of the month in a specific timezone
 * @param month - Month number (1-12)
 * @param year - Year
 * @param _timezone - IANA timezone string (reserved for future use)
 * @returns Date object representing the start of the month
 */
export const getMonthStartInTimezone = (
  month: number,
  year: number,
  _timezone?: string
): Date => {
  return new Date(year, month - 1, 1);
};

/**
 * Gets the end of the month in a specific timezone
 * @param month - Month number (1-12)
 * @param year - Year
 * @param _timezone - IANA timezone string (reserved for future use)
 * @returns Date object representing the end of the month
 */
export const getMonthEndInTimezone = (
  month: number,
  year: number,
  _timezone?: string
): Date => {
  return new Date(year, month, 0, 23, 59, 59, 999);
};
