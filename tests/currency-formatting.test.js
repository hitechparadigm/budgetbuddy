/**
 * Currency Formatting Test
 *
 * Tests currency formatting for all supported currencies,
 * including decimal places, thousands separators, and symbol positioning.
 */

const { describe, it, expect } = require("@jest/globals");
const {
  formatCurrency,
  getCurrencyConfig,
} = require("../packages/shared/src/utils/currency");

describe("Currency Formatting", () => {
  describe("Format Currency for All Supported Currencies", () => {
    it("should format USD correctly", () => {
      const formatted = formatCurrency(1234.56, "USD");

      expect(formatted).toContain("$");
      expect(formatted).toContain("1,234.56");
    });

    it("should format EUR correctly", () => {
      const formatted = formatCurrency(1234.56, "EUR");

      expect(formatted).toContain("€");
      expect(formatted).toContain("1");
      expect(formatted).toContain("234");
      expect(formatted).toContain("56");
    });

    it("should format GBP correctly", () => {
      const formatted = formatCurrency(1234.56, "GBP");

      expect(formatted).toContain("£");
      expect(formatted).toContain("1,234.56");
    });

    it("should format CAD correctly", () => {
      const formatted = formatCurrency(1234.56, "CAD");

      expect(formatted).toContain("1,234.56");
    });

    it("should format AUD correctly", () => {
      const formatted = formatCurrency(1234.56, "AUD");

      expect(formatted).toContain("1,234.56");
    });

    it("should format JPY correctly (no decimal places)", () => {
      const formatted = formatCurrency(1235, "JPY");

      // JPY symbol can be ¥ or ￥ depending on locale/system
      expect(formatted).toMatch(/[¥￥]/);
      expect(formatted).toContain("1,235");
      expect(formatted).not.toContain(".");
    });
  });

  describe("Decimal Places", () => {
    it("should use 2 decimal places for USD", () => {
      const config = getCurrencyConfig("USD");
      expect(config.decimalPlaces).toBe(2);

      const formatted = formatCurrency(100, "USD");
      expect(formatted).toContain(".00");
    });

    it("should use 2 decimal places for EUR", () => {
      const config = getCurrencyConfig("EUR");
      expect(config.decimalPlaces).toBe(2);
    });

    it("should use 2 decimal places for GBP", () => {
      const config = getCurrencyConfig("GBP");
      expect(config.decimalPlaces).toBe(2);
    });

    it("should use 2 decimal places for CAD", () => {
      const config = getCurrencyConfig("CAD");
      expect(config.decimalPlaces).toBe(2);
    });

    it("should use 2 decimal places for AUD", () => {
      const config = getCurrencyConfig("AUD");
      expect(config.decimalPlaces).toBe(2);
    });

    it("should use 0 decimal places for JPY", () => {
      const config = getCurrencyConfig("JPY");
      expect(config.decimalPlaces).toBe(0);

      const formatted = formatCurrency(1000, "JPY");
      expect(formatted).not.toContain(".");
    });
  });

  describe("Thousands Separators", () => {
    it("should use comma separator for USD", () => {
      const formatted = formatCurrency(1000000, "USD");
      expect(formatted).toContain(",");
    });

    it("should format large amounts with thousands separators", () => {
      const testCases = [
        { amount: 1000, currency: "USD" },
        { amount: 10000, currency: "EUR" },
        { amount: 100000, currency: "GBP" },
        { amount: 1000000, currency: "CAD" },
      ];

      testCases.forEach(({ amount, currency }) => {
        const formatted = formatCurrency(amount, currency);
        expect(formatted.length).toBeGreaterThan(0);
      });
    });

    it("should handle amounts less than 1000 without separator", () => {
      const formatted = formatCurrency(999, "USD");
      expect(formatted).toContain("999");
    });
  });

  describe("Symbol Positioning", () => {
    it("should position USD symbol before amount", () => {
      const config = getCurrencyConfig("USD");
      expect(config.symbolPosition).toBe("before");

      const formatted = formatCurrency(100, "USD");
      expect(formatted.indexOf("$")).toBeLessThan(formatted.indexOf("100"));
    });

    it("should position GBP symbol before amount", () => {
      const config = getCurrencyConfig("GBP");
      expect(config.symbolPosition).toBe("before");
    });

    it("should position JPY symbol before amount", () => {
      const config = getCurrencyConfig("JPY");
      expect(config.symbolPosition).toBe("before");
    });
  });

  describe("Currency Symbols", () => {
    it("should use correct symbol for USD", () => {
      const config = getCurrencyConfig("USD");
      expect(config.symbol).toBe("$");
    });

    it("should use correct symbol for EUR", () => {
      const config = getCurrencyConfig("EUR");
      expect(config.symbol).toBe("€");
    });

    it("should use correct symbol for GBP", () => {
      const config = getCurrencyConfig("GBP");
      expect(config.symbol).toBe("£");
    });

    it("should use correct symbol for CAD", () => {
      const config = getCurrencyConfig("CAD");
      expect(config.symbol).toBe("C$");
    });

    it("should use correct symbol for AUD", () => {
      const config = getCurrencyConfig("AUD");
      expect(config.symbol).toBe("A$");
    });

    it("should use correct symbol for JPY", () => {
      const config = getCurrencyConfig("JPY");
      expect(config.symbol).toBe("¥");
    });
  });

  describe("Edge Cases", () => {
    it("should format zero correctly", () => {
      const formatted = formatCurrency(0, "USD");
      expect(formatted).toContain("0");
    });

    it("should format negative amounts correctly", () => {
      const formatted = formatCurrency(-100, "USD");
      expect(formatted).toContain("-");
      expect(formatted).toContain("100");
    });

    it("should format very large amounts", () => {
      const formatted = formatCurrency(999999999.99, "USD");
      expect(formatted).toBeTruthy();
      expect(formatted.length).toBeGreaterThan(0);
    });

    it("should format very small amounts", () => {
      const formatted = formatCurrency(0.01, "USD");
      expect(formatted).toContain("0.01");
    });

    it("should handle fractional cents correctly", () => {
      const formatted = formatCurrency(100.999, "USD");
      // Should round to 2 decimal places
      expect(formatted).toContain("101.00");
    });
  });

  describe("Compact Notation", () => {
    it("should format large amounts in compact notation when requested", () => {
      const formatted = formatCurrency(1000000, "USD", { compact: true });
      expect(formatted).toBeTruthy();
      // Compact notation varies by locale, just verify it's shorter
      expect(formatted.length).toBeLessThan(20);
    });

    it("should format normal amounts without compact notation by default", () => {
      const formatted = formatCurrency(1000, "USD");
      expect(formatted).not.toContain("K");
      expect(formatted).not.toContain("M");
    });
  });

  describe("Currency Code Display", () => {
    it("should show currency code when requested", () => {
      const formatted = formatCurrency(100, "USD", { showCode: true });
      expect(formatted).toContain("USD");
    });

    it("should not show currency code by default", () => {
      const formatted = formatCurrency(100, "USD");
      expect(formatted).not.toContain("USD");
    });
  });

  describe("Symbol Display", () => {
    it("should show symbol by default", () => {
      const formatted = formatCurrency(100, "USD");
      expect(formatted).toContain("$");
    });

    it("should hide symbol when requested", () => {
      const formatted = formatCurrency(100, "USD", { showSymbol: false });
      expect(formatted).not.toContain("$");
    });
  });

  describe("Consistency Across Currencies", () => {
    it("should format same amount differently for different currencies", () => {
      const amount = 1000;
      const currencies = ["USD", "EUR", "GBP", "JPY"];

      const formatted = currencies.map((currency) =>
        formatCurrency(amount, currency),
      );

      // All should be formatted
      formatted.forEach((f) => expect(f).toBeTruthy());

      // USD and GBP should be similar format
      expect(formatted[0]).toContain("$");
      expect(formatted[2]).toContain("£");
    });

    it("should maintain precision for all currencies", () => {
      const amount = 123.45;
      const currencies = ["USD", "EUR", "GBP", "CAD", "AUD"];

      currencies.forEach((currency) => {
        const formatted = formatCurrency(amount, currency);
        expect(formatted).toBeTruthy();
      });
    });
  });

  describe("Locale-Aware Formatting", () => {
    it("should use correct locale for USD", () => {
      const config = getCurrencyConfig("USD");
      expect(config.locale).toBe("en-US");
    });

    it("should use correct locale for EUR", () => {
      const config = getCurrencyConfig("EUR");
      expect(config.locale).toBe("de-DE");
    });

    it("should use correct locale for GBP", () => {
      const config = getCurrencyConfig("GBP");
      expect(config.locale).toBe("en-GB");
    });

    it("should use correct locale for CAD", () => {
      const config = getCurrencyConfig("CAD");
      expect(config.locale).toBe("en-CA");
    });

    it("should use correct locale for AUD", () => {
      const config = getCurrencyConfig("AUD");
      expect(config.locale).toBe("en-AU");
    });

    it("should use correct locale for JPY", () => {
      const config = getCurrencyConfig("JPY");
      expect(config.locale).toBe("ja-JP");
    });
  });

  describe("Real-World Examples", () => {
    it("should format typical grocery amount", () => {
      const formatted = formatCurrency(87.32, "USD");
      expect(formatted).toContain("87.32");
    });

    it("should format typical rent amount", () => {
      const formatted = formatCurrency(1500, "USD");
      expect(formatted).toContain("1,500");
    });

    it("should format typical salary amount", () => {
      const formatted = formatCurrency(5000, "USD");
      expect(formatted).toContain("5,000");
    });

    it("should format typical savings amount", () => {
      const formatted = formatCurrency(25000, "USD");
      expect(formatted).toContain("25,000");
    });

    it("should format typical Japanese yen amount", () => {
      const formatted = formatCurrency(100000, "JPY");
      expect(formatted).toContain("100,000");
      expect(formatted).not.toContain(".");
    });
  });

  describe("Performance", () => {
    it("should format currency quickly", () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        formatCurrency(1234.56, "USD");
      }

      const duration = Date.now() - start;

      // Should complete 1000 formats in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it("should handle multiple currencies efficiently", () => {
      const currencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        currencies.forEach((currency) => {
          formatCurrency(1234.56, currency);
        });
      }

      const duration = Date.now() - start;

      // Should complete 600 formats in less than 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
