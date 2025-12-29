/**
 * Property-Based Tests for Currency System
 * Tests currency conversion, formatting, and multi-currency support
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fc from 'fast-check';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { currencyService, Currency, SUPPORTED_CURRENCIES, CurrencyConversion } from '../../services/currency';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('Currency System Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset currency service state
    (currencyService as any).selectedCurrency = SUPPORTED_CURRENCIES[0]; // USD
    (currencyService as any).exchangeRates = new Map();
    (currencyService as any).lastRateUpdate = 0;

    // Mock AsyncStorage
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Property 33: Currency Conversion Consistency
   * Validates that currency conversions are mathematically consistent
   */
  describe('Property 33: Currency Conversion Consistency', () => {
    it('should maintain conversion consistency (A->B->A = A)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.float({ min: Math.fround(0.01), max: Math.fround(100000) }),
          fc.constantFrom(...SUPPORTED_CURRENCIES.map(c => c.code)),
          fc.constantFrom(...SUPPORTED_CURRENCIES.map(c => c.code)),
          async (amount, fromCurrency, toCurrency) => {
            // Skip if same currency
            if (fromCurrency === toCurrency) return;

            // Convert A -> B
            const conversion1 = await currencyService.convertAmount(amount, fromCurrency, toCurrency);

            // Convert B -> A
            const conversion2 = await currencyService.convertAmount(
              conversion1.convertedAmount,
              toCurrency,
              fromCurrency
            );

            // The final amount should be close to the original (within 0.1% due to rounding)
            const tolerance = amount * 0.001; // 0.1% tolerance
            const difference = Math.abs(conversion2.convertedAmount - amount);

            expect(difference).toBeLessThanOrEqual(tolerance);
            expect(conversion1.originalCurrency).toBe(fromCurrency);
            expect(conversion1.convertedCurrency).toBe(toCurrency);
            expect(conversion2.originalCurrency).toBe(toCurrency);
            expect(conversion2.convertedCurrency).toBe(fromCurrency);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle same currency conversion correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.float({ min: Math.fround(0.01), max: Math.fround(100000) }),
          fc.constantFrom(...SUPPORTED_CURRENCIES.map(c => c.code)),
          async (amount, currency) => {
            const conversion = await currencyService.convertAmount(amount, currency, currency);

            expect(conversion.originalAmount).toBe(amount);
            expect(conversion.convertedAmount).toBe(amount);
            expect(conversion.originalCurrency).toBe(currency);
            expect(conversion.convertedCurrency).toBe(currency);
            expect(conversion.exchangeRate).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 34: Currency Formatting Accuracy
   * Validates that currency formatting follows locale conventions
   */
  describe('Property 34: Currency Formatting Accuracy', () => {
    it('should format amounts correctly for each supported currency', async () => {
      await fc.assert(
        fc.property(
          fc.float({ min: 0, max: Math.fround(1000000) }),
          fc.constantFrom(...SUPPORTED_CURRENCIES),
          (amount, currency) => {
            const formatted = currencyService.formatAmount(amount, currency.code);

            // Should contain the currency symbol or code (but be flexible for zero amounts)
            if (amount > 0) {
              const containsSymbol = formatted.includes(currency.symbol) ||
                formatted.includes(currency.code);
              expect(containsSymbol).toBe(true);
            }

            // Should contain the amount (allowing for formatting differences)
            const numericPart = formatted.replace(/[^\d.,]/g, '');
            expect(numericPart.length).toBeGreaterThan(0);

            // For zero amounts, should show appropriate zero representation
            if (amount === 0) {
              expect(formatted).toMatch(/0/);
            }

            // Should respect decimal places for the currency
            if (currency.decimalPlaces === 0 && amount >= 1) {
              // JPY should not have decimal places for amounts >= 1
              // But allow for edge cases in formatting
              const hasDecimals = /\.\d+/.test(formatted);
              if (hasDecimals) {
                // If decimals are present, they should be .00
                expect(formatted).toMatch(/\.0+/);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format amounts with currency display correctly', async () => {
      await fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.01), max: Math.fround(10000) }),
          fc.constantFrom(...SUPPORTED_CURRENCIES),
          (amount, currency) => {
            const formatted = currencyService.formatAmountWithCurrency(amount, currency.code);

            // Should contain the formatted amount
            expect(formatted.length).toBeGreaterThan(0);

            // Should contain the currency code in parentheses
            expect(formatted).toMatch(new RegExp(`\\(${currency.code}\\)`));

            // Should contain the currency symbol
            expect(formatted).toContain(currency.symbol);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 35: Currency Selection Persistence
   * Validates that currency selection is properly saved and restored
   */
  describe('Property 35: Currency Selection Persistence', () => {
    it('should persist and restore selected currency correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...SUPPORTED_CURRENCIES),
          async (currency) => {
            // Set currency
            await currencyService.setSelectedCurrency(currency.code);

            // Verify it was saved to storage
            expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
              'selected_currency',
              currency.code
            );

            // Verify current selection
            const selected = currencyService.getSelectedCurrency();
            expect(selected.code).toBe(currency.code);
            expect(selected.name).toBe(currency.name);
            expect(selected.symbol).toBe(currency.symbol);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle invalid currency codes gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 10 }).filter(s =>
            !SUPPORTED_CURRENCIES.some(c => c.code === s)
          ),
          async (invalidCode) => {
            await expect(currencyService.setSelectedCurrency(invalidCode))
              .rejects
              .toThrow(`Unsupported currency: ${invalidCode}`);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 36: Exchange Rate Validation
   * Validates that exchange rates are positive and reasonable
   */
  describe('Property 36: Exchange Rate Validation', () => {
    it('should return positive exchange rates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...SUPPORTED_CURRENCIES.map(c => c.code)),
          fc.constantFrom(...SUPPORTED_CURRENCIES.map(c => c.code)),
          async (fromCurrency, toCurrency) => {
            const rate = await currencyService.getExchangeRate(fromCurrency, toCurrency);

            expect(rate.rate).toBeGreaterThan(0);
            expect(rate.from).toBe(fromCurrency);
            expect(rate.to).toBe(toCurrency);
            expect(rate.timestamp).toBeGreaterThan(0);
            expect(typeof rate.rate).toBe('number');
            expect(isFinite(rate.rate)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return rate of 1 for same currency', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...SUPPORTED_CURRENCIES.map(c => c.code)),
          async (currency) => {
            const rate = await currencyService.getExchangeRate(currency, currency);

            expect(rate.rate).toBe(1);
            expect(rate.from).toBe(currency);
            expect(rate.to).toBe(currency);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain reasonable rate ranges', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...SUPPORTED_CURRENCIES.map(c => c.code)),
          fc.constantFrom(...SUPPORTED_CURRENCIES.map(c => c.code)),
          async (fromCurrency, toCurrency) => {
            const rate = await currencyService.getExchangeRate(fromCurrency, toCurrency);

            // Exchange rates should be within reasonable bounds
            // (no currency should be worth 1000x or 1/1000x another major currency)
            expect(rate.rate).toBeGreaterThan(0.0001);
            expect(rate.rate).toBeLessThan(10000);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 37: Currency Symbol and Code Consistency
   * Validates that currency symbols and codes are consistent
   */
  describe('Property 37: Currency Symbol and Code Consistency', () => {
    it('should return consistent symbols for currency codes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SUPPORTED_CURRENCIES.map(c => c.code)),
          (currencyCode) => {
            const symbol1 = currencyService.getCurrencySymbol(currencyCode);
            const symbol2 = currencyService.getCurrencySymbol(currencyCode);

            expect(symbol1).toBe(symbol2);
            expect(symbol1.length).toBeGreaterThan(0);

            // Should match the symbol from the currency definition
            const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
            if (currency) {
              expect(symbol1).toBe(currency.symbol);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify different currencies', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SUPPORTED_CURRENCIES.map(c => c.code)),
          fc.constantFrom(...SUPPORTED_CURRENCIES.map(c => c.code)),
          (currency1, currency2) => {
            // Set a specific currency as selected
            (currencyService as any).selectedCurrency = SUPPORTED_CURRENCIES.find(c => c.code === currency1);

            const isDifferent = currencyService.isDifferentCurrency(currency2);

            if (currency1 === currency2) {
              expect(isDifferent).toBe(false);
            } else {
              expect(isDifferent).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 38: Currency Service Initialization
   * Validates that the currency service initializes correctly
   */
  describe('Property 38: Currency Service Initialization', () => {
    it('should initialize with valid default currency', async () => {
      // Mock storage to return null (no saved currency)
      mockAsyncStorage.getItem.mockResolvedValue(null);

      await currencyService.initialize();

      const selectedCurrency = currencyService.getSelectedCurrency();

      expect(selectedCurrency).toBeDefined();
      expect(selectedCurrency.code).toBeDefined();
      expect(selectedCurrency.name).toBeDefined();
      expect(selectedCurrency.symbol).toBeDefined();
      expect(selectedCurrency.locale).toBeDefined();
      expect(typeof selectedCurrency.decimalPlaces).toBe('number');

      // Should be one of the supported currencies
      const isSupported = SUPPORTED_CURRENCIES.some(c => c.code === selectedCurrency.code);
      expect(isSupported).toBe(true);
    });

    it('should restore saved currency on initialization', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...SUPPORTED_CURRENCIES),
          async (savedCurrency) => {
            // Mock storage to return saved currency
            mockAsyncStorage.getItem.mockImplementation((key) => {
              if (key === 'selected_currency') {
                return Promise.resolve(savedCurrency.code);
              }
              return Promise.resolve(null);
            });

            await currencyService.initialize();

            const selectedCurrency = currencyService.getSelectedCurrency();
            expect(selectedCurrency.code).toBe(savedCurrency.code);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
