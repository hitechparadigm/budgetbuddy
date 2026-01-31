/**
 * Currency Utility Tests
 *
 * Comprehensive test suite for currency formatting, parsing, and validation
 */

import {
  getCurrencyConfig,
  formatCurrency,
  parseCurrency,
  isValidCurrency,
  getSupportedCurrencies,
  getCurrencySymbol,
  getCurrencyName,
  formatCurrencyCompact,
  formatCurrencyNumber,
  type CurrencyConfig,
} from './currency';

describe('Currency Utility', () => {
  describe('getCurrencyConfig', () => {
    it('should return config for USD', () => {
      const config = getCurrencyConfig('USD');
      expect(config.code).toBe('USD');
      expect(config.name).toBe('US Dollar');
      expect(config.symbol).toBe('$');
      expect(config.decimalPlaces).toBe(2);
    });

    it('should return config for EUR', () => {
      const config = getCurrencyConfig('EUR');
      expect(config.code).toBe('EUR');
      expect(config.name).toBe('Euro');
      expect(config.symbol).toBe('€');
      expect(config.decimalPlaces).toBe(2);
    });

    it('should return config for GBP', () => {
      const config = getCurrencyConfig('GBP');
      expect(config.code).toBe('GBP');
      expect(config.name).toBe('British Pound');
      expect(config.symbol).toBe('£');
      expect(config.decimalPlaces).toBe(2);
    });

    it('should return config for CAD', () => {
      const config = getCurrencyConfig('CAD');
      expect(config.code).toBe('CAD');
      expect(config.name).toBe('Canadian Dollar');
      expect(config.symbol).toBe('C$');
      expect(config.decimalPlaces).toBe(2);
    });

    it('should return config for AUD', () => {
      const config = getCurrencyConfig('AUD');
      expect(config.code).toBe('AUD');
      expect(config.name).toBe('Australian Dollar');
      expect(config.symbol).toBe('A$');
      expect(config.decimalPlaces).toBe(2);
    });

    it('should return config for JPY', () => {
      const config = getCurrencyConfig('JPY');
      expect(config.code).toBe('JPY');
      expect(config.name).toBe('Japanese Yen');
      expect(config.symbol).toBe('¥');
      expect(config.decimalPlaces).toBe(0);
    });

    it('should handle lowercase currency codes', () => {
      const config = getCurrencyConfig('usd');
      expect(config.code).toBe('USD');
    });

    it('should throw error for unsupported currency', () => {
      expect(() => getCurrencyConfig('XYZ')).toThrow('Unsupported currency code: XYZ');
    });
  });

  describe('formatCurrency', () => {
    describe('USD formatting', () => {
      it('should format USD with symbol', () => {
        const formatted = formatCurrency(1234.56, 'USD');
        expect(formatted).toContain('$');
        expect(formatted).toContain('1,234.56');
      });

      it('should format USD with 2 decimal places', () => {
        const formatted = formatCurrency(1234, 'USD');
        expect(formatted).toContain('.00');
      });

      it('should format USD with thousands separator', () => {
        const formatted = formatCurrency(1234567.89, 'USD');
        expect(formatted).toContain(',');
      });

      it('should format zero correctly', () => {
        const formatted = formatCurrency(0, 'USD');
        expect(formatted).toContain('$');
        expect(formatted).toContain('0.00');
      });

      it('should format negative amounts', () => {
        const formatted = formatCurrency(-1234.56, 'USD');
        expect(formatted).toContain('-');
        expect(formatted).toContain('1,234.56');
      });
    });

    describe('EUR formatting', () => {
      it('should format EUR with symbol', () => {
        const formatted = formatCurrency(1234.56, 'EUR');
        expect(formatted).toContain('€');
      });

      it('should format EUR with 2 decimal places', () => {
        const formatted = formatCurrency(1234, 'EUR');
        // EUR uses comma as decimal separator
        expect(formatted).toMatch(/\d{1,3}[.,]\d{2}/);
      });
    });

    describe('GBP formatting', () => {
      it('should format GBP with symbol', () => {
        const formatted = formatCurrency(1234.56, 'GBP');
        expect(formatted).toContain('£');
        expect(formatted).toContain('1,234.56');
      });
    });

    describe('CAD formatting', () => {
      it('should format CAD with symbol', () => {
        const formatted = formatCurrency(1234.56, 'CAD');
        expect(formatted).toContain('$');
        expect(formatted).toContain('1,234.56');
      });
    });

    describe('AUD formatting', () => {
      it('should format AUD with symbol', () => {
        const formatted = formatCurrency(1234.56, 'AUD');
        expect(formatted).toContain('$');
        expect(formatted).toContain('1,234.56');
      });
    });

    describe('JPY formatting', () => {
      it('should format JPY with symbol', () => {
        const formatted = formatCurrency(1234.56, 'JPY');
        // Intl.NumberFormat may use Unicode variant of yen symbol
        expect(formatted).toMatch(/[¥￥]/);
      });

      it('should format JPY with 0 decimal places', () => {
        const formatted = formatCurrency(1234.56, 'JPY');
        // JPY should round to nearest whole number
        expect(formatted).not.toContain('.');
        expect(formatted).toContain('1,235');
      });
    });

    describe('formatting options', () => {
      it('should format without symbol when showSymbol is false', () => {
        const formatted = formatCurrency(1234.56, 'USD', { showSymbol: false });
        expect(formatted).not.toContain('$');
        expect(formatted).toContain('1,234.56');
      });

      it('should format with currency code when showCode is true', () => {
        const formatted = formatCurrency(1234.56, 'USD', { showCode: true });
        expect(formatted).toContain('USD');
      });

      it('should format in compact notation', () => {
        const formatted = formatCurrency(1234567, 'USD', { compact: true });
        // Compact notation varies by locale, but should be shorter
        expect(formatted.length).toBeLessThan(15);
      });
    });
  });

  describe('parseCurrency', () => {
    describe('USD parsing', () => {
      it('should parse USD formatted string', () => {
        const parsed = parseCurrency('$1,234.56', 'USD');
        expect(parsed).toBe(1234.56);
      });

      it('should parse USD without symbol', () => {
        const parsed = parseCurrency('1,234.56', 'USD');
        expect(parsed).toBe(1234.56);
      });

      it('should parse USD with currency code', () => {
        const parsed = parseCurrency('$1,234.56 USD', 'USD');
        expect(parsed).toBe(1234.56);
      });

      it('should parse zero', () => {
        const parsed = parseCurrency('$0.00', 'USD');
        expect(parsed).toBe(0);
      });

      it('should parse negative amounts', () => {
        const parsed = parseCurrency('-$1,234.56', 'USD');
        expect(parsed).toBe(-1234.56);
      });
    });

    describe('EUR parsing', () => {
      it('should parse EUR formatted string', () => {
        const parsed = parseCurrency('1.234,56 €', 'EUR');
        expect(parsed).toBe(1234.56);
      });

      it('should parse EUR without symbol', () => {
        const parsed = parseCurrency('1.234,56', 'EUR');
        expect(parsed).toBe(1234.56);
      });
    });

    describe('JPY parsing', () => {
      it('should parse JPY formatted string', () => {
        const parsed = parseCurrency('¥1,235', 'JPY');
        expect(parsed).toBe(1235);
      });

      it('should parse JPY without decimals', () => {
        const parsed = parseCurrency('1235', 'JPY');
        expect(parsed).toBe(1235);
      });
    });

    describe('error handling', () => {
      it('should throw error for invalid currency string', () => {
        expect(() => parseCurrency('invalid', 'USD')).toThrow('Invalid currency value');
      });

      it('should throw error for empty string', () => {
        expect(() => parseCurrency('', 'USD')).toThrow('Invalid currency value');
      });
    });
  });

  describe('formatting and parsing are inverse operations', () => {
    const testCases = [
      { amount: 1234.56, currency: 'USD' },
      { amount: 1234.56, currency: 'EUR' },
      { amount: 1234.56, currency: 'GBP' },
      { amount: 1234.56, currency: 'CAD' },
      { amount: 1234.56, currency: 'AUD' },
      { amount: 1235, currency: 'JPY' },
      { amount: 0, currency: 'USD' },
      { amount: 1000000, currency: 'USD' },
    ];

    testCases.forEach(({ amount, currency }) => {
      it(`should format and parse ${amount} ${currency} correctly`, () => {
        const formatted = formatCurrency(amount, currency);
        const parsed = parseCurrency(formatted, currency);

        // For JPY, we expect rounding
        if (currency === 'JPY') {
          expect(parsed).toBeCloseTo(amount, 0);
        } else {
          expect(parsed).toBeCloseTo(amount, 2);
        }
      });
    });
  });

  describe('isValidCurrency', () => {
    it('should return true for supported currencies', () => {
      expect(isValidCurrency('USD')).toBe(true);
      expect(isValidCurrency('EUR')).toBe(true);
      expect(isValidCurrency('GBP')).toBe(true);
      expect(isValidCurrency('CAD')).toBe(true);
      expect(isValidCurrency('AUD')).toBe(true);
      expect(isValidCurrency('JPY')).toBe(true);
    });

    it('should handle lowercase currency codes', () => {
      expect(isValidCurrency('usd')).toBe(true);
      expect(isValidCurrency('eur')).toBe(true);
    });

    it('should return false for unsupported currencies', () => {
      expect(isValidCurrency('XYZ')).toBe(false);
      expect(isValidCurrency('BTC')).toBe(false);
      expect(isValidCurrency('')).toBe(false);
    });
  });

  describe('getSupportedCurrencies', () => {
    it('should return all 6 supported currencies', () => {
      const currencies = getSupportedCurrencies();
      expect(currencies).toHaveLength(6);
    });

    it('should return currency configs with all required fields', () => {
      const currencies = getSupportedCurrencies();
      currencies.forEach((config) => {
        expect(config).toHaveProperty('code');
        expect(config).toHaveProperty('name');
        expect(config).toHaveProperty('symbol');
        expect(config).toHaveProperty('symbolPosition');
        expect(config).toHaveProperty('decimalPlaces');
        expect(config).toHaveProperty('thousandsSeparator');
        expect(config).toHaveProperty('decimalSeparator');
        expect(config).toHaveProperty('locale');
      });
    });

    it('should include USD, EUR, GBP, CAD, AUD, JPY', () => {
      const currencies = getSupportedCurrencies();
      const codes = currencies.map((c) => c.code);
      expect(codes).toContain('USD');
      expect(codes).toContain('EUR');
      expect(codes).toContain('GBP');
      expect(codes).toContain('CAD');
      expect(codes).toContain('AUD');
      expect(codes).toContain('JPY');
    });
  });

  describe('getCurrencySymbol', () => {
    it('should return correct symbols', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(getCurrencySymbol('GBP')).toBe('£');
      expect(getCurrencySymbol('CAD')).toBe('C$');
      expect(getCurrencySymbol('AUD')).toBe('A$');
      expect(getCurrencySymbol('JPY')).toBe('¥');
    });

    it('should handle lowercase currency codes', () => {
      expect(getCurrencySymbol('usd')).toBe('$');
    });

    it('should throw error for unsupported currency', () => {
      expect(() => getCurrencySymbol('XYZ')).toThrow();
    });
  });

  describe('getCurrencyName', () => {
    it('should return correct names', () => {
      expect(getCurrencyName('USD')).toBe('US Dollar');
      expect(getCurrencyName('EUR')).toBe('Euro');
      expect(getCurrencyName('GBP')).toBe('British Pound');
      expect(getCurrencyName('CAD')).toBe('Canadian Dollar');
      expect(getCurrencyName('AUD')).toBe('Australian Dollar');
      expect(getCurrencyName('JPY')).toBe('Japanese Yen');
    });

    it('should handle lowercase currency codes', () => {
      expect(getCurrencyName('usd')).toBe('US Dollar');
    });

    it('should throw error for unsupported currency', () => {
      expect(() => getCurrencyName('XYZ')).toThrow();
    });
  });

  describe('formatCurrencyCompact', () => {
    it('should format large amounts in compact form', () => {
      const formatted = formatCurrencyCompact(1234567, 'USD');
      expect(formatted.length).toBeLessThan(15);
      // Should contain some form of abbreviation (K, M, etc.)
      expect(formatted).toMatch(/[KMB]/i);
    });

    it('should format small amounts normally', () => {
      const formatted = formatCurrencyCompact(123, 'USD');
      expect(formatted).toContain('$');
    });
  });

  describe('formatCurrencyNumber', () => {
    it('should format without currency symbol', () => {
      const formatted = formatCurrencyNumber(1234.56, 'USD');
      expect(formatted).not.toContain('$');
      expect(formatted).toContain('1,234.56');
    });

    it('should respect decimal places', () => {
      const formatted = formatCurrencyNumber(1234.56, 'JPY');
      expect(formatted).not.toContain('.');
    });
  });

  describe('edge cases', () => {
    it('should handle very large amounts', () => {
      const formatted = formatCurrency(999999999.99, 'USD');
      expect(formatted).toContain('999,999,999.99');
    });

    it('should handle very small amounts', () => {
      const formatted = formatCurrency(0.01, 'USD');
      expect(formatted).toContain('0.01');
    });

    it('should handle fractional cents (rounds)', () => {
      const formatted = formatCurrency(1.234, 'USD');
      expect(formatted).toContain('1.23');
    });

    it('should handle negative zero', () => {
      const formatted = formatCurrency(-0, 'USD');
      expect(formatted).toContain('0.00');
    });
  });

  describe('decimal places', () => {
    it('should use 2 decimal places for USD', () => {
      const config = getCurrencyConfig('USD');
      expect(config.decimalPlaces).toBe(2);
    });

    it('should use 2 decimal places for EUR', () => {
      const config = getCurrencyConfig('EUR');
      expect(config.decimalPlaces).toBe(2);
    });

    it('should use 2 decimal places for GBP', () => {
      const config = getCurrencyConfig('GBP');
      expect(config.decimalPlaces).toBe(2);
    });

    it('should use 2 decimal places for CAD', () => {
      const config = getCurrencyConfig('CAD');
      expect(config.decimalPlaces).toBe(2);
    });

    it('should use 2 decimal places for AUD', () => {
      const config = getCurrencyConfig('AUD');
      expect(config.decimalPlaces).toBe(2);
    });

    it('should use 0 decimal places for JPY', () => {
      const config = getCurrencyConfig('JPY');
      expect(config.decimalPlaces).toBe(0);
    });
  });

  describe('symbol positioning', () => {
    it('should position USD symbol before amount', () => {
      const config = getCurrencyConfig('USD');
      expect(config.symbolPosition).toBe('before');
    });

    it('should position EUR symbol after amount', () => {
      const config = getCurrencyConfig('EUR');
      expect(config.symbolPosition).toBe('after');
    });

    it('should position GBP symbol before amount', () => {
      const config = getCurrencyConfig('GBP');
      expect(config.symbolPosition).toBe('before');
    });
  });
});

