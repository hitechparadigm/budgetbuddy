/**
 * Date Utilities for Documentation Validation
 *
 * Provides functions to work with dates in documentation files.
 */

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} Today's date
 */
function getTodayString() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

/**
 * Check if a date string represents today
 * @param {string} dateString - Date string to check (YYYY-MM-DD or YYYY/MM/DD)
 * @returns {boolean} True if date is today
 */
function isToday(dateString) {
  if (!dateString) return false;

  const today = getTodayString();
  const normalized = dateString.replace(/\//g, "-");

  return normalized === today;
}

/**
 * Check if a date is within N days from today
 * @param {string} dateString - Date string to check (YYYY-MM-DD or YYYY/MM/DD)
 * @param {number} days - Number of days
 * @returns {boolean} True if date is within N days
 */
function isWithinDays(dateString, days) {
  if (!dateString || typeof days !== "number") return false;

  const date = parseDate(dateString);
  if (!date) return false;

  const now = new Date();
  const diffMs = now - date;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= 0 && diffDays <= days;
}

/**
 * Parse a date string into a Date object
 * @param {string} dateString - Date string to parse
 * @returns {Date|null} Parsed date or null if invalid
 */
function parseDate(dateString) {
  if (!dateString) return null;

  // Normalize date format (replace / with -)
  const normalized = dateString.replace(/\//g, "-");

  // Try to parse
  const date = new Date(normalized);

  // Check if valid
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

module.exports = {
  getTodayString,
  isToday,
  isWithinDays,
  parseDate,
};
