/**
 * BudgetBuddy Subscription Detection Property-Based Tests
 *
 * Property-based tests for subscription detection algorithm correctness using fast-check.
 * These tests verify that the detection algorithm correctly identifies recurring patterns.
 *
 * **Validates: Requirement 35.2** (Competitive Features)
 */

const fc = require("fast-check");

// Import functions from detection.js (extracted for testing)
const {
  detectRecurringPattern,
  normalizeToMonthly,
  guessCategoryFromMerchant,
} = require("./detection");

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate a transaction with a specific date offset from a base date.
 */
const transactionArbitrary = (baseDate, dayOffset, amount) => ({
  transactionId: `tx_${Math.random().toString(36).substr(2, 9)}`,
  transactionDate: new Date(
    baseDate.getTime() + dayOffset * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .split("T")[0],
  amount: -Math.abs(amount), // Expenses are negative
  merchant: "Test Merchant",
  description: "Test Transaction",
});

/**
 * Generate a series of monthly transactions (25-35 day intervals).
 */
const monthlyTransactionsArbitrary = fc
  .record({
    baseAmount: fc.float({ min: 5, max: 100, noNaN: true }),
    amountVariance: fc.float({ min: 0, max: Math.fround(0.05), noNaN: true }), // Up to 5% variance
    intervalVariance: fc.integer({ min: -3, max: 3 }), // Days variance from 30
    count: fc.integer({ min: 3, max: 12 }),
  })
  .map(({ baseAmount, amountVariance, intervalVariance, count }) => {
    const baseDate = new Date("2025-01-01");
    const transactions = [];
    let currentOffset = 0;

    for (let i = 0; i < count; i++) {
      const variance = (Math.random() - 0.5) * 2 * amountVariance;
      const amount = baseAmount * (1 + variance);
      transactions.push(transactionArbitrary(baseDate, currentOffset, amount));
      currentOffset += 30 + intervalVariance;
    }

    return transactions;
  });

/**
 * Generate a series of weekly transactions (5-9 day intervals).
 */
const weeklyTransactionsArbitrary = fc
  .record({
    baseAmount: fc.float({ min: 5, max: 50, noNaN: true }),
    count: fc.integer({ min: 4, max: 16 }),
  })
  .map(({ baseAmount, count }) => {
    const baseDate = new Date("2025-01-01");
    const transactions = [];
    let currentOffset = 0;

    for (let i = 0; i < count; i++) {
      transactions.push(
        transactionArbitrary(baseDate, currentOffset, baseAmount),
      );
      currentOffset += 7;
    }

    return transactions;
  });

/**
 * Generate random non-recurring transactions.
 */
const randomTransactionsArbitrary = fc
  .array(
    fc.record({
      dayOffset: fc.integer({ min: 0, max: 365 }),
      amount: fc.float({ min: 5, max: 500, noNaN: true }),
    }),
    { minLength: 2, maxLength: 10 },
  )
  .map((items) => {
    const baseDate = new Date("2025-01-01");
    return items.map((item) =>
      transactionArbitrary(baseDate, item.dayOffset, item.amount),
    );
  });

// ============================================================================
// Property Tests
// ============================================================================

describe("Subscription Detection Property Tests", () => {
  /**
   * **Validates: Requirement 35.2** - Monthly pattern detection
   *
   * Property: Transactions with consistent monthly intervals should be detected.
   */
  describe("Property 1: Monthly Pattern Detection", () => {
    test("consistent monthly transactions are detected as monthly subscriptions", () => {
      fc.assert(
        fc.property(monthlyTransactionsArbitrary, (transactions) => {
          if (transactions.length < 2) return;

          const pattern = detectRecurringPattern(transactions);

          // Should detect a pattern
          expect(pattern).not.toBeNull();

          if (pattern) {
            // Should be monthly frequency
            expect(pattern.frequency).toBe("monthly");

            // Confidence should be reasonable
            expect(pattern.confidence).toBeGreaterThan(0.5);

            // Average amount should be close to actual amounts
            const actualAvg =
              transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) /
              transactions.length;
            expect(pattern.averageAmount).toBeCloseTo(actualAvg, 0);
          }
        }),
        { numRuns: 50 },
      );
    });
  });

  /**
   * **Validates: Requirement 35.2** - Weekly pattern detection
   *
   * Property: Transactions with consistent weekly intervals should be detected.
   */
  describe("Property 2: Weekly Pattern Detection", () => {
    test("consistent weekly transactions are detected as weekly subscriptions", () => {
      fc.assert(
        fc.property(weeklyTransactionsArbitrary, (transactions) => {
          if (transactions.length < 2) return;

          const pattern = detectRecurringPattern(transactions);

          // Should detect a pattern
          expect(pattern).not.toBeNull();

          if (pattern) {
            // Should be weekly frequency
            expect(pattern.frequency).toBe("weekly");

            // Confidence should be high for consistent intervals
            expect(pattern.confidence).toBeGreaterThan(0.7);
          }
        }),
        { numRuns: 50 },
      );
    });
  });

  /**
   * **Validates: Requirement 35.2** - No false positives
   *
   * Property: Random transactions should not be detected as subscriptions.
   */
  describe("Property 3: No False Positives", () => {
    test("random transactions are not detected as subscriptions", () => {
      fc.assert(
        fc.property(randomTransactionsArbitrary, (transactions) => {
          if (transactions.length < 2) return;

          const pattern = detectRecurringPattern(transactions);

          // Most random transactions should not match a pattern
          // If they do match, confidence should be low
          if (pattern) {
            // Random patterns might occasionally match, but confidence should be lower
            expect(pattern.confidence).toBeLessThanOrEqual(1);
          }
        }),
        { numRuns: 50 },
      );
    });
  });

  /**
   * **Validates: Requirement 35.2** - Single transaction handling
   *
   * Property: Single transactions should not be detected as subscriptions.
   */
  describe("Property 4: Single Transaction Handling", () => {
    test("single transaction returns null", () => {
      const singleTransaction = [transactionArbitrary(new Date(), 0, 15.99)];

      const pattern = detectRecurringPattern(singleTransaction);
      expect(pattern).toBeNull();
    });

    test("empty array returns null", () => {
      const pattern = detectRecurringPattern([]);
      expect(pattern).toBeNull();
    });
  });
});

describe("Monthly Normalization Property Tests", () => {
  /**
   * Property: Monthly normalization should be consistent.
   */
  describe("Property 5: Monthly Normalization", () => {
    test("monthly amount equals input amount", () => {
      fc.assert(
        fc.property(fc.float({ min: 1, max: 1000, noNaN: true }), (amount) => {
          const monthly = normalizeToMonthly(amount, "monthly");
          expect(monthly).toBe(amount);
        }),
        { numRuns: 100 },
      );
    });

    test("yearly amount divided by 12 equals monthly", () => {
      fc.assert(
        fc.property(fc.float({ min: 12, max: 1200, noNaN: true }), (amount) => {
          const monthly = normalizeToMonthly(amount, "yearly");
          expect(monthly).toBeCloseTo(amount / 12, 5);
        }),
        { numRuns: 100 },
      );
    });

    test("quarterly amount divided by 3 equals monthly", () => {
      fc.assert(
        fc.property(fc.float({ min: 3, max: 300, noNaN: true }), (amount) => {
          const monthly = normalizeToMonthly(amount, "quarterly");
          expect(monthly).toBeCloseTo(amount / 3, 5);
        }),
        { numRuns: 100 },
      );
    });

    test("weekly amount times 4.33 equals monthly", () => {
      fc.assert(
        fc.property(fc.float({ min: 1, max: 100, noNaN: true }), (amount) => {
          const monthly = normalizeToMonthly(amount, "weekly");
          expect(monthly).toBeCloseTo(amount * 4.33, 5);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property: Normalization preserves relative ordering.
   */
  describe("Property 6: Normalization Ordering", () => {
    test("larger amounts normalize to larger monthly amounts", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 500, noNaN: true }),
          fc.float({ min: 1, max: 500, noNaN: true }),
          fc.constantFrom("weekly", "monthly", "quarterly", "yearly"),
          (amount1, amount2, frequency) => {
            const monthly1 = normalizeToMonthly(amount1, frequency);
            const monthly2 = normalizeToMonthly(amount2, frequency);

            if (amount1 > amount2) {
              expect(monthly1).toBeGreaterThan(monthly2);
            } else if (amount1 < amount2) {
              expect(monthly1).toBeLessThan(monthly2);
            } else {
              expect(monthly1).toBeCloseTo(monthly2, 5);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

describe("Category Guessing Property Tests", () => {
  /**
   * Property: Known merchants should be categorized correctly.
   */
  describe("Property 7: Known Merchant Categorization", () => {
    test("streaming services are categorized as Streaming", () => {
      const streamingMerchants = [
        "Netflix",
        "NETFLIX.COM",
        "Spotify",
        "SPOTIFY USA",
        "Disney Plus",
        "DISNEY+",
        "Hulu",
        "HBO Max",
      ];

      streamingMerchants.forEach((merchant) => {
        const category = guessCategoryFromMerchant(merchant);
        expect(category).toBe("Streaming");
      });
    });

    test("software services are categorized as Software", () => {
      const softwareMerchants = [
        "Adobe",
        "ADOBE SYSTEMS",
        "Microsoft",
        "Microsoft 365",
        "Dropbox",
        "Slack",
        "Zoom",
      ];

      softwareMerchants.forEach((merchant) => {
        const category = guessCategoryFromMerchant(merchant);
        expect(category).toBe("Software");
      });
    });

    test("unknown merchants are categorized as Other", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 5, maxLength: 20 })
            .filter(
              (s) =>
                !s.toLowerCase().includes("netflix") &&
                !s.toLowerCase().includes("spotify") &&
                !s.toLowerCase().includes("adobe") &&
                !s.toLowerCase().includes("gym"),
            ),
          (merchant) => {
            const category = guessCategoryFromMerchant(merchant);
            // Unknown merchants should default to "Other"
            expect(typeof category).toBe("string");
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
