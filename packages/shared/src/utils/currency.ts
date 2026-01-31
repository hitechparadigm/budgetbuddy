/**
 * Currency Utility Module
 *
 * Provides centralized currency formatting, validation, and configuration
 * for all supported currencies in BudgetBuddy.
 *
 * Supported Currencies:
 * - USD (US Dollar)
 * - EUR (Euro)
 * - GBP (British Pound)
 * - CAD (Canadian Dollar)
 * - AUD (Australian Dollar)
 * - JPY (Japanese Yen)
 */

/**
 * Currency configuration interface
 */
export interface CurrencyConfig {
  code: string;                    // ISO 4217 code (USD, EUR, etc.)
  name: string;                    // Full name (US Dollar, Euro, etc.)
  symbol: string;                  // Currency symbol ($, €, £, etc.)
  symbolPosition: 'before' | 'after';  // Symbol position relative to amount
  decimalPlaces: number;           // Number of decimal places
  thousandsSeparator: string;      // Thousands separator (,)
  decimalSeparator: string;        // Decimal separator (.)
  locale: string;                  // Locale for Intl.NumberFormat
}

/**
 * Currency configurations for all supported currencies
 */
const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    locale: 'en-US',
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    symbolPosition: 'after',
    decimalPlaces: 2,
    thousandsSeparator: '.',
    decimalSeparator: ',',
    locale: 'de-DE',
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    locale: 'en-GB',
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    locale: 'en-CA',
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    locale: 'en-AU',
  },
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    symbolPosition: 'before',
    decimalPlaces: 0,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    locale: 'ja-JP',
  },
};

/**
 * Get currency configuration for a given currency code
 *
 * @param code - ISO 4217 currency code (e.g., 'USD', 'EUR')
 * @returns Currency configuration object
 * @throws Error if currency code is not supported
 */
export function getCurrencyConfig(code: string): CurrencyConfig {
  const upperCode = code.toUpperCase();
  const config = CURRENCY_CONFIGS[upperCode];

  if (!config) {
    throw new Error(`Unsupported currency code: ${code}`);
  }

  return config;
}

/**
 * Format amount with currency symbol and locale-specific formatting
 *
 * @param amount - Numeric amount to format
 * @param currencyCode - ISO 4217 currency code
 * @param options - Formatting options
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56, 'USD') // "$1,234.56"
 * formatCurrency(1234.56, 'EUR') // "1.234,56 €"
 * formatCurrency(1234.56, 'JPY') // "¥1,235"
 */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  options: {
    showSymbol?: boolean;
    showCode?: boolean;
    compact?: boolean;
  } = {}
): string {
  const {
    showSymbol = true,
    showCode = false,
    compact = false,
  } = options;

  const config = getCurrencyConfig(currencyCode);

  // Use Intl.NumberFormat for locale-aware formatting
  const formatter = new Intl.NumberFormat(config.locale, {
    style: showSymbol ? 'currency' : 'decimal',
    currency: config.code,
    minimumFractionDigits: config.decimalPlaces,
    maximumFractionDigits: config.decimalPlaces,
    notation: compact ? 'compact' : 'standard',
  });

  let formatted = formatter.format(amount);

  // Add currency code if requested
  if (showCode && !compact) {
    formatted += ` ${config.code}`;
  }

  return formatted;
}

/**
 * Parse currency string to number
 *
 * Removes currency symbols, thousands separators, and converts
 * decimal separator to standard format.
 *
 * @param value - Currency string to parse
 * @param currencyCode - ISO 4217 currency code
 * @returns Parsed numeric value
 *
 * @example
 * parseCurrency('$1,234.56', 'USD') // 1234.56
 * parseCurrency('1.234,56 €', 'EUR') // 1234.56
 * parseCurrency('¥1,235', 'JPY') // 1235
 */
export function parseCurrency(value: string, currencyCode: string): number {
  const config = getCurrencyConfig(currencyCode);

  // Remove all non-numeric characters except decimal separator, minus sign, and digits
  // This handles various currency symbols (including Unicode variants)
  let cleaned = value
    .replace(config.code, '')
    .trim();

  // Remove currency symbols (handle both standard and Unicode variants)
  // Remove all characters that are not digits, decimal separators, thousands separators, or minus
  cleaned = cleaned.replace(/[^\d.,\-]/g, '');

  // Remove thousands separators
  cleaned = cleaned.replace(new RegExp(`\\${config.thousandsSeparator}`, 'g'), '');

  // Convert decimal separator to standard format
  if (config.decimalSeparator !== '.') {
    cleaned = cleaned.replace(config.decimalSeparator, '.');
  }

  const parsed = parseFloat(cleaned);

  if (isNaN(parsed)) {
    throw new Error(`Invalid currency value: ${value}`);
  }

  return parsed;
}

/**
 * Validate currency code
 *
 * @param code - Currency code to validate
 * @returns True if currency code is supported
 */
export function isValidCurrency(code: string): boolean {
  const upperCode = code.toUpperCase();
  return upperCode in CURRENCY_CONFIGS;
}

/**
 * Get all supported currencies
 *
 * @returns Array of all currency configurations
 */
export function getSupportedCurrencies(): CurrencyConfig[] {
  return Object.values(CURRENCY_CONFIGS);
}

/**
 * Get currency symbol for a given currency code
 *
 * @param code - ISO 4217 currency code
 * @returns Currency symbol
 *
 * @example
 * getCurrencySymbol('USD') // "$"
 * getCurrencySymbol('EUR') // "€"
 * getCurrencySymbol('JPY') // "¥"
 */
export function getCurrencySymbol(code: string): string {
  const config = getCurrencyConfig(code);
  return config.symbol;
}

/**
 * Get currency name for a given currency code
 *
 * @param code - ISO 4217 currency code
 * @returns Currency name
 *
 * @example
 * getCurrencyName('USD') // "US Dollar"
 * getCurrencyName('EUR') // "Euro"
 */
export function getCurrencyName(code: string): string {
  const config = getCurrencyConfig(code);
  return config.name;
}

/**
 * Format currency for display in compact form (e.g., $1.2K, $1.2M)
 *
 * @param amount - Numeric amount to format
 * @param currencyCode - ISO 4217 currency code
 * @returns Formatted compact currency string
 *
 * @example
 * formatCurrencyCompact(1234, 'USD') // "$1.2K"
 * formatCurrencyCompact(1234567, 'USD') // "$1.2M"
 */
export function formatCurrencyCompact(amount: number, currencyCode: string): string {
  return formatCurrency(amount, currencyCode, { compact: true });
}

/**
 * Format currency without symbol (just the number)
 *
 * @param amount - Numeric amount to format
 * @param currencyCode - ISO 4217 currency code
 * @returns Formatted number string without currency symbol
 *
 * @example
 * formatCurrencyNumber(1234.56, 'USD') // "1,234.56"
 * formatCurrencyNumber(1234.56, 'EUR') // "1.234,56"
 */
export function formatCurrencyNumber(amount: number, currencyCode: string): string {
  return formatCurrency(amount, currencyCode, { showSymbol: false });
}

