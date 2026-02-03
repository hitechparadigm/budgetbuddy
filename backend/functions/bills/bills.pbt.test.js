/**
 * Bill Creation Property-Based Tests
 *
 * **Property 19: Bill Due Date Calculation**
 * **Property 20: Bill Amount Accuracy**
 * **Validates: Requirements 12.2, 12.6**
 */

const fc = require("fast-check");

// ============================================================================
// Bill Creation Helper Functions (Pure functions for testing)
// ============================================================================

/**
 * Calculate next due date based on frequency
 */
function calculateNextDueDate(currentDueDate, frequency) {
  const date = new Date(currentDueDate);

  switch (frequency) {
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "bi-weekly":
      date.setDate(date.getDate() + 14);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "annually":
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }

  return date.toISOString().split("T")[0];
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = d2 - d1;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Validate bill amount is positive and reasonable
 */
function isValidBillAmount(amount) {
  return typeof amount === "number" && amount > 0 && amount <= 1000000;
}

/**
 * Calculate suggested amount from pattern occurrences
 */
function calculateSuggestedAmount(amounts, useMedian = false) {
  if (!amounts || amounts.length === 0) return 0;

  const absAmounts = amounts.map((a) => Math.abs(a));

  if (useMedian) {
    const sorted = [...absAmounts].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  return absAmounts.reduce((sum, a) => sum + a, 0) / absAmounts.length;
}

/**
 * Check if amount change exceeds threshold
 */
function amountExceedsThreshold(oldAmount, newAmount, threshold = 10) {
  const diff = Math.abs(newAmount - oldAmount);
  const percentChange = (diff / oldAmount) * 100;
  return percentChange > threshold;
}

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate valid frequency types
 */
const frequencyArbitrary = fc.constantFrom(
  "weekly",
  "bi-weekly",
  "monthly",
  "quarterly",
  "annually",
);

/**
 * Generate valid date strings
 */
const dateArbitrary = fc
  .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
  .map((d) => d.toISOString().split("T")[0]);

/**
 * Generate valid bill amounts
 */
const amountArbitrary = fc.float({
  min: Math.fround(0.01),
  max: Math.fround(10000),
  noNaN: true,
});

/**
 * Generate array of amounts for pattern
 */
const amountsArrayArbitrary = fc.array(
  fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }),
  { minLength: 3, maxLength: 12 },
);

// ============================================================================
// Property 19: Bill Due Date Calculation
// **Validates: Requirement 12.2**
// ============================================================================

describe("Property 19: Bill Due Date Calculation", () => {
  describe("19.1: Next Date is Always in Future", () => {
    test("next due date is always after current due date", () => {
      fc.assert(
        fc.property(
          dateArbitrary,
          frequencyArbitrary,
          (currentDate, frequency) => {
            const nextDate = calculateNextDueDate(currentDate, frequency);
            expect(nextDate > currentDate).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("19.2: Weekly Interval Consistency", () => {
    test("weekly bills are always 6-8 days apart (accounting for DST)", () => {
      fc.assert(
        fc.property(dateArbitrary, (currentDate) => {
          const nextDate = calculateNextDueDate(currentDate, "weekly");
          const days = daysBetween(currentDate, nextDate);
          // Allow ±1 day for DST transitions
          expect(days).toBeGreaterThanOrEqual(6);
          expect(days).toBeLessThanOrEqual(8);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("19.3: Bi-Weekly Interval Consistency", () => {
    test("bi-weekly bills are always 13-15 days apart (accounting for DST)", () => {
      fc.assert(
        fc.property(dateArbitrary, (currentDate) => {
          const nextDate = calculateNextDueDate(currentDate, "bi-weekly");
          const days = daysBetween(currentDate, nextDate);
          // Allow ±1 day for DST transitions
          expect(days).toBeGreaterThanOrEqual(13);
          expect(days).toBeLessThanOrEqual(15);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("19.4: Monthly Interval Consistency", () => {
    test("monthly bills are approximately 27-32 days apart", () => {
      fc.assert(
        fc.property(dateArbitrary, (currentDate) => {
          const nextDate = calculateNextDueDate(currentDate, "monthly");
          const days = daysBetween(currentDate, nextDate);
          // Monthly can vary from 27-32 days (Feb short month + DST)
          expect(days).toBeGreaterThanOrEqual(27);
          expect(days).toBeLessThanOrEqual(32);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("19.5: Quarterly Interval Consistency", () => {
    test("quarterly bills are approximately 87-93 days apart", () => {
      fc.assert(
        fc.property(dateArbitrary, (currentDate) => {
          const nextDate = calculateNextDueDate(currentDate, "quarterly");
          const days = daysBetween(currentDate, nextDate);
          // Quarterly can vary based on months involved + DST
          expect(days).toBeGreaterThanOrEqual(87);
          expect(days).toBeLessThanOrEqual(93);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("19.6: Annual Interval Consistency", () => {
    test("annual bills are 365-366 days apart", () => {
      fc.assert(
        fc.property(dateArbitrary, (currentDate) => {
          const nextDate = calculateNextDueDate(currentDate, "annually");
          const days = daysBetween(currentDate, nextDate);
          // Account for leap years
          expect(days).toBeGreaterThanOrEqual(365);
          expect(days).toBeLessThanOrEqual(366);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("19.7: Date Format Consistency", () => {
    test("next date is always in YYYY-MM-DD format", () => {
      fc.assert(
        fc.property(
          dateArbitrary,
          frequencyArbitrary,
          (currentDate, frequency) => {
            const nextDate = calculateNextDueDate(currentDate, frequency);
            expect(nextDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("19.8: Chained Calculations", () => {
    test("multiple consecutive calculations maintain consistency", () => {
      fc.assert(
        fc.property(
          dateArbitrary,
          frequencyArbitrary,
          fc.integer({ min: 2, max: 5 }),
          (startDate, frequency, iterations) => {
            let currentDate = startDate;
            const dates = [currentDate];

            for (let i = 0; i < iterations; i++) {
              currentDate = calculateNextDueDate(currentDate, frequency);
              dates.push(currentDate);
            }

            // All dates should be strictly increasing
            for (let i = 1; i < dates.length; i++) {
              expect(dates[i] > dates[i - 1]).toBe(true);
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});

// ============================================================================
// Property 20: Bill Amount Accuracy
// **Validates: Requirement 12.6**
// ============================================================================

describe("Property 20: Bill Amount Accuracy", () => {
  describe("20.1: Amount Validation", () => {
    test("valid amounts are always positive and within bounds", () => {
      fc.assert(
        fc.property(amountArbitrary, (amount) => {
          const isValid = isValidBillAmount(amount);
          if (amount > 0 && amount <= 1000000) {
            expect(isValid).toBe(true);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("20.2: Invalid Amounts Rejected", () => {
    test("zero and negative amounts are invalid", () => {
      fc.assert(
        fc.property(
          fc.float({
            min: Math.fround(-1000),
            max: Math.fround(0),
            noNaN: true,
          }),
          (amount) => {
            expect(isValidBillAmount(amount)).toBe(false);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("20.3: Average Amount Calculation", () => {
    test("average is always within min and max of amounts", () => {
      fc.assert(
        fc.property(amountsArrayArbitrary, (amounts) => {
          const avg = calculateSuggestedAmount(amounts, false);
          const min = Math.min(...amounts);
          const max = Math.max(...amounts);

          expect(avg).toBeGreaterThanOrEqual(min);
          expect(avg).toBeLessThanOrEqual(max);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("20.4: Median Amount Calculation", () => {
    test("median is always within min and max of amounts", () => {
      fc.assert(
        fc.property(amountsArrayArbitrary, (amounts) => {
          const median = calculateSuggestedAmount(amounts, true);
          const min = Math.min(...amounts);
          const max = Math.max(...amounts);

          expect(median).toBeGreaterThanOrEqual(min);
          expect(median).toBeLessThanOrEqual(max);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("20.5: Consistent Amounts", () => {
    test("identical amounts yield same average and median", () => {
      fc.assert(
        fc.property(
          fc.float({
            min: Math.fround(1),
            max: Math.fround(1000),
            noNaN: true,
          }),
          fc.integer({ min: 3, max: 10 }),
          (amount, count) => {
            const amounts = Array(count).fill(amount);
            const avg = calculateSuggestedAmount(amounts, false);
            const median = calculateSuggestedAmount(amounts, true);

            expect(Math.abs(avg - amount)).toBeLessThan(0.01);
            expect(Math.abs(median - amount)).toBeLessThan(0.01);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("20.6: Threshold Detection", () => {
    test("changes above threshold are detected", () => {
      fc.assert(
        fc.property(
          fc.float({
            min: Math.fround(50),
            max: Math.fround(100),
            noNaN: true,
          }),
          fc.float({
            min: Math.fround(1.15),
            max: Math.fround(2.0),
            noNaN: true,
          }),
          (baseAmount, multiplier) => {
            const newAmount = baseAmount * multiplier;
            const exceeds = amountExceedsThreshold(baseAmount, newAmount, 10);
            expect(exceeds).toBe(true);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("20.7: Minor Changes Not Flagged", () => {
    test("changes below threshold are not flagged", () => {
      fc.assert(
        fc.property(
          fc.float({
            min: Math.fround(50),
            max: Math.fround(100),
            noNaN: true,
          }),
          fc.float({
            min: Math.fround(0.95),
            max: Math.fround(1.05),
            noNaN: true,
          }),
          (baseAmount, multiplier) => {
            const newAmount = baseAmount * multiplier;
            const exceeds = amountExceedsThreshold(baseAmount, newAmount, 10);
            expect(exceeds).toBe(false);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("20.8: Symmetric Threshold Detection", () => {
    test("threshold detection works for both increases and decreases", () => {
      fc.assert(
        fc.property(
          fc.float({
            min: Math.fround(50),
            max: Math.fround(100),
            noNaN: true,
          }),
          fc.integer({ min: 15, max: 50 }),
          (baseAmount, percentChange) => {
            const increase = baseAmount * (1 + percentChange / 100);
            const decrease = baseAmount * (1 - percentChange / 100);

            expect(amountExceedsThreshold(baseAmount, increase, 10)).toBe(true);
            expect(amountExceedsThreshold(baseAmount, decrease, 10)).toBe(true);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
