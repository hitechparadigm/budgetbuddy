/**
 * Currency formatting and calculation utilities for BudgetBuddy
 * Handles multi-currency support for Canadian and US users
 */

// Supported currency codes for the application
export const CURRENCY_CODES = {
  CAD: 'CAD', // Canadian Dollar
  USD: 'USD', // US Dollar
} as const;

export type CurrencyCode = keyof typeof CURRENCY_CODES;

/**
 * Determine the appropriate currency based on country code
 * Used during user registration to set default currency
 * @param country - Country code or name (e.g., 'CA', 'Canada', 'US', 'United States')
 * @returns Appropriate currency code for the country
 */
export const getCurrencyByCountry = (country: string): CurrencyCode => {
  switch (country.toUpperCase()) {
    case 'CA':
    case 'CANADA':
      return 'CAD';
    case 'US':
    case 'USA':
    case 'UNITED STATES':
      return 'USD';
    default:
      return 'USD'; // Default to USD for unknown countries
  }
};

/**
 * Format a numeric amount as currency string with proper locale formatting
 * Uses browser's Intl.NumberFormat for consistent, localized formatting
 * @param amount - Numeric amount to format
 * @param currency - Currency code (CAD or USD)
 * @param locale - Optional locale override (defaults based on currency)
 * @returns Formatted currency string (e.g., "$1,234.56", "C$1,234.56")
 */
export const formatCurrency = (
  amount: number,
  currency: CurrencyCode = 'USD',
  locale?: string
): string => {
  // Set appropriate default locale based on currency
  const defaultLocale = currency === 'CAD' ? 'en-CA' : 'en-US';
  
  return new Intl.NumberFormat(locale || defaultLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Parse a currency string back to numeric value
 * Removes currency symbols, commas, and other formatting
 * @param value - Currency string to parse (e.g., "$1,234.56", "C$1,234.56")
 * @returns Numeric value, or 0 if parsing fails
 */
export const parseCurrency = (value: string): number => {
  // Remove all non-numeric characters except decimal point and minus sign
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Calculate percentage of amount relative to total
 * Used for budget progress indicators and spending analysis
 * @param amount - Partial amount (e.g., spent amount)
 * @param total - Total amount (e.g., budgeted amount)
 * @returns Percentage as whole number (0-100), or 0 if total is 0
 */
export const calculatePercentage = (amount: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((amount / total) * 100);
};