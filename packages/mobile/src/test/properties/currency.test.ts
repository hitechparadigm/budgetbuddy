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
          // noNaN is required: fast-check's default float generator can
          // occasionally draw NaN even with min/max bounds set (it's one of
          // the special edge values it explores), and NaN is not a valid
          // currency amount for this property.
          fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
          fc.constantFrom(...SUPPORTED_CURRENCIES.map(c => c.code)),
          fc.constantFrom(...SUPPORTED_CURRENCIES.map(c => c.code)),
          async (amount, fromCurrency, toCurrency) => {
            // Skip if same currency
            if (fromCurrency === toCurrency) return;

            // The real service's fetchExchangeRate (invoked internally by
            // getExchangeRate/convertAmount whenever no fresh cached rate
            // exists - true here, since exchangeRates is reset to an empty
            // Map in beforeEach) applies an independent random +/-2%
            // variation on top of the fallback rate for EACH leg of the
            // round trip:
            //   const variation = (Math.random() - 0.5) * 0.04;
            //   const adjustedRate = rate.rate * (1 + variation);
            // Two independently-randomized legs mean a round trip is not
            // guaranteed to return anywhere near the original amount at a
            // 0.1% tolerance - that tolerance only holds if the randomness
            // is removed. Stub Math.random to always return 0.5 so
            // variation is exactly 0 on both legs, which makes the two
            // legs mathematically reciprocal (rate * (1/rate) = 1) and lets
            // this test verify the INTENDED round-trip invariant in
            // isolation from the fetch layer's simulated noise.
            const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);

            try {
              // Convert A -> B
              const conversion1 = await currencyService.convertAmount(amount, fromCurrency, toCurrency);

              // Convert B -> A
              const conversion2 = await currencyService.convertAmount(
                conversion1.convertedAmount,
                toCurrency,
                fromCurrency
              );

              // With randomization pinned to 0, each leg's rate comes from
              // getFallbackExchangeRate's static DEFAULT_EXCHANGE_RATES
              // table. That table stores independently-chosen real-world
              // approximations for each direction (e.g. USD->EUR: 0.85,
              // EUR->USD: 1.18), so it is NOT a perfectly reciprocal matrix
              // (0.85 * 1.18 = 1.003, a ~0.3% deviation from 1) - a round
              // trip through the fallback table alone won't return exactly
              // to the original amount. Cross-currency conversions (routed
              // through USD when there's no direct table entry) compound
              // two such approximations and can drift further. 0.1% is
              // tighter than the table's own precision allows; 1% covers
              // the worst-case reciprocal mismatch across all supported
              // currency pairs with room to spare.
              const tolerance = amount * 0.01; // 1% tolerance
              const difference = Math.abs(conversion2.convertedAmount - amount);

              expect(difference).toBeLessThanOrEqual(tolerance);
              expect(conversion1.originalCurrency).toBe(fromCurrency);
              expect(conversion1.convertedCurrency).toBe(toCurrency);
              expect(conversion2.originalCurrency).toBe(toCurrency);
              expect(conversion2.convertedCurrency).toBe(fromCurrency);
            } finally {
              randomSpy.mockRestore();
            }
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
          // noNaN is required here too - fast-check's default float
          // generator can draw NaN as one of its special edge values even
          // with min/max set, and NaN is not a valid currency amount.
          fc.float({ min: 0, max: Math.fround(1000000), noNaN: true }),
          fc.constantFrom(...SUPPORTED_CURRENCIES),
          (amount, currency) => {
            const formatted = currencyService.formatAmount(amount, currency.code);

            // formatAmount's real implementation delegates to
            // Intl.NumberFormat(currency.locale, { style: 'currency', ... }).
            // Node/ICU's locale-specific currency symbol does not always
            // match the app's own Currency.symbol field (e.g. en-AU renders
            // AUD with a bare "$", not the app's "A$"; en-CA renders CAD
            // with a bare "$" too). Derive the symbol Intl will actually
            // render for this currency/locale instead of assuming it
            // matches SUPPORTED_CURRENCIES' symbol field.
            const intlParts = new Intl.NumberFormat(currency.locale, {
              style: 'currency',
              currency: currency.code,
            }).formatToParts(1);
            const intlSymbol = intlParts.find(p => p.type === 'currency')?.value ?? currency.symbol;

            // Amounts that round to exactly 0 at the currency's decimal
            // precision (including subnormal floats like 1e-45) still
            // render the currency symbol/code (e.g. "$0.00", "￥0") - so the
            // symbol/code check applies for any amount, not just amount > 0.
            const containsSymbol = formatted.includes(intlSymbol) ||
              formatted.includes(currency.symbol) ||
              formatted.includes(currency.code);
            expect(containsSymbol).toBe(true);

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

            // Should contain the currency code in parentheses - this is
            // always guaranteed since formatAmountWithCurrency explicitly
            // appends `(${currency.code})` regardless of locale.
            expect(formatted).toMatch(new RegExp(`\\(${currency.code}\\)`));

            // The symbol portion is produced by formatAmount's call to
            // Intl.NumberFormat, whose locale-specific rendering does not
            // always match the app's own Currency.symbol field (e.g. AUD's
            // app symbol is "A$" but en-AU renders it as bare "$"; JPY's
            // Intl rendering uses U+FFE5 FULLWIDTH YEN SIGN, not the app's
            // U+00A5 YEN SIGN). Check for whatever symbol Intl actually
            // renders instead of assuming it matches currency.symbol.
            const intlParts = new Intl.NumberFormat(currency.locale, {
              style: 'currency',
              currency: currency.code,
            }).formatToParts(1);
            const intlSymbol = intlParts.find(p => p.type === 'currency')?.value ?? currency.symbol;
            expect(
              formatted.includes(intlSymbol) || formatted.includes(currency.symbol)
            ).toBe(true);
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
