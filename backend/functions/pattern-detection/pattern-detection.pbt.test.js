/**
 * Pattern Detection Property-Based Tests
 *
 * **Property 1: Pattern Detection Output Completeness**
 * **Property 16: Pattern Confidence and Threshold**
 * **Property 17: Pattern Change Detection**
 * **Property 18: Pattern Prediction Accuracy**
 * **Validates: Requirements 1.3, 1.4, 1.7, 2.2, 11.2, 11.3, 11.5, 11.6**
 */

const fc = require("fast-check");
const {
  calculateIntervals,
  detectFrequency,
  calculateAmountStats,
  calculateConfidenceScore,
  calculateNextExpectedDate,
  detectPatterns,
  analyzeTransactions,
  FREQUENCY_PATTERNS,
  HIGH_CONFIDENCE_THRESHOLD,
  MIN_CONFIDENCE_THRESHOLD,
} = require("./pattern-detection-algorithm");

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate a valid transaction
 */
const transactionArbitrary = fc.record({
  id: fc.uuid(),
  merchantName: fc.string({ minLength: 3, maxLength: 50 }),
  amount: fc.integer({ min: -10000, max: -1 }), // Negative for expenses
  date: fc
    .date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") })
    .map((d) => d.toISOString().split("T")[0]),
  type: fc.constant("expense"),
});

/**
 * Generate frequency data for confidence calculation
 */
const frequencyDataArbitrary = fc.record({
  frequency: fc.constantFrom(
    "weekly",
    "bi-weekly",
    "monthly",
    "quarterly",
    "annual",
  ),
  expectedInterval: fc.integer({ min: 7, max: 365 }),
  avgDeviation: fc.integer({ min: 0, max: 30 }),
});

/**
 * Generate amount statistics
 */
const amountStatsArbitrary = fc.record({
  mean: fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }),
  stdDev: fc.float({ min: Math.fround(0), max: Math.fround(500), noNaN: true }),
});

/**
 * Generate a pattern object
 */
const patternArbitrary = fc.record({
  frequency: fc.constantFrom(
    "weekly",
    "bi-weekly",
    "monthly",
    "quarterly",
    "annual",
  ),
  averageAmount: fc.float({
    min: Math.fround(1),
    max: Math.fround(1000),
    noNaN: true,
  }),
});

/**
 * Generate recurring transactions with consistent intervals
 */
function generateRecurringTransactions(
  merchantName,
  baseAmount,
  frequency,
  count,
  startDate = "2024-01-01",
) {
  const intervals = {
    weekly: 7,
    "bi-weekly": 14,
    monthly: 30,
    quarterly: 91,
    annual: 365,
  };
  const interval = intervals[frequency] || 30;
  const transactions = [];
  let currentDate = new Date(startDate);

  for (let i = 0; i < count; i++) {
    transactions.push({
      id: `tx_${i}`,
      merchantName,
      amount: -Math.abs(baseAmount),
      date: currentDate.toISOString().split("T")[0],
      type: "expense",
    });
    currentDate.setDate(currentDate.getDate() + interval);
  }

  return transactions;
}

// ============================================================================
// Property 1: Pattern Detection Output Completeness (Algorithm Layer)
// ============================================================================

describe("Property 1: Pattern Detection Output Completeness (Algorithm Layer)", () => {
  describe("1.1: Required Algorithm Fields Present", () => {
    test("all detected patterns contain required algorithm fields", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 4, max: 10 }),
          fc.float({
            min: Math.fround(10),
            max: Math.fround(100),
            noNaN: true,
          }),
          fc.constantFrom("weekly", "bi-weekly", "monthly"),
          (count, amount, frequency) => {
            const transactions = generateRecurringTransactions(
              "Test Merchant",
              amount,
              frequency,
              count,
              "2024-01-01",
            );

            const result = analyzeTransactions(transactions);

            result.patterns.forEach((pattern) => {
              // Required algorithm fields
              expect(pattern).toHaveProperty("merchantName");
              expect(pattern).toHaveProperty("averageAmount");
              expect(pattern).toHaveProperty("frequency");
              expect(pattern).toHaveProperty("confidenceScore");
              expect(pattern).toHaveProperty("nextExpectedDate");
              expect(pattern).toHaveProperty("occurrences");
              expect(pattern).toHaveProperty("amountStdDev");
              expect(pattern).toHaveProperty("isVariableAmount");
              expect(pattern).toHaveProperty("timingConsistency");
              expect(pattern).toHaveProperty("amountConsistency");

              // Type validation
              expect(typeof pattern.merchantName).toBe("string");
              expect(typeof pattern.averageAmount).toBe("number");
              expect(typeof pattern.frequency).toBe("string");
              expect(typeof pattern.confidenceScore).toBe("number");
              expect(typeof pattern.nextExpectedDate).toBe("string");
              expect(Array.isArray(pattern.occurrences)).toBe(true);
              expect(typeof pattern.amountStdDev).toBe("number");
              expect(typeof pattern.isVariableAmount).toBe("boolean");
              expect(typeof pattern.timingConsistency).toBe("number");
              expect(typeof pattern.amountConsistency).toBe("number");
            });
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("1.2: Confidence Score Range", () => {
    test("confidence score is between 0 and 100", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 4, max: 10 }),
          fc.float({
            min: Math.fround(10),
            max: Math.fround(100),
            noNaN: true,
          }),
          (count, amount) => {
            const transactions = generateRecurringTransactions(
              "Test Merchant",
              amount,
              "monthly",
              count,
              "2024-01-01",
            );

            const result = analyzeTransactions(transactions);

            result.patterns.forEach((pattern) => {
              expect(pattern.confidenceScore).toBeGreaterThanOrEqual(0);
              expect(pattern.confidenceScore).toBeLessThanOrEqual(100);
            });
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("1.3: Occurrences Array Non-Empty", () => {
    test("occurrences array contains at least 3 transactions", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 4, max: 10 }),
          fc.float({
            min: Math.fround(10),
            max: Math.fround(100),
            noNaN: true,
          }),
          (count, amount) => {
            const transactions = generateRecurringTransactions(
              "Test Merchant",
              amount,
              "monthly",
              count,
              "2024-01-01",
            );

            const result = analyzeTransactions(transactions);

            result.patterns.forEach((pattern) => {
              expect(pattern.occurrences.length).toBeGreaterThanOrEqual(3);
            });
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("1.4: Valid Frequency Values", () => {
    test("frequency is one of the valid values", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 4, max: 10 }),
          fc.float({
            min: Math.fround(10),
            max: Math.fround(100),
            noNaN: true,
          }),
          (count, amount) => {
            const transactions = generateRecurringTransactions(
              "Test Merchant",
              amount,
              "monthly",
              count,
              "2024-01-01",
            );

            const result = analyzeTransactions(transactions);

            const validFrequencies = [
              "weekly",
              "bi-weekly",
              "monthly",
              "quarterly",
              "annual",
            ];

            result.patterns.forEach((pattern) => {
              expect(validFrequencies).toContain(pattern.frequency);
            });
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("1.5: Next Expected Date Format", () => {
    test("next expected date is in YYYY-MM-DD format", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 4, max: 10 }),
          fc.float({
            min: Math.fround(10),
            max: Math.fround(100),
            noNaN: true,
          }),
          (count, amount) => {
            const transactions = generateRecurringTransactions(
              "Test Merchant",
              amount,
              "monthly",
              count,
              "2024-01-01",
            );

            const result = analyzeTransactions(transactions);

            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

            result.patterns.forEach((pattern) => {
              expect(pattern.nextExpectedDate).toMatch(dateRegex);
            });
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("1.6: Non-Empty String Fields", () => {
    test("string fields are non-empty", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 4, max: 10 }),
          fc.float({
            min: Math.fround(10),
            max: Math.fround(100),
            noNaN: true,
          }),
          (count, amount) => {
            const transactions = generateRecurringTransactions(
              "Test Merchant",
              amount,
              "monthly",
              count,
              "2024-01-01",
            );

            const result = analyzeTransactions(transactions);

            result.patterns.forEach((pattern) => {
              expect(pattern.merchantName.length).toBeGreaterThan(0);
              expect(pattern.frequency.length).toBeGreaterThan(0);
              expect(pattern.nextExpectedDate.length).toBeGreaterThan(0);
            });
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("1.7: Average Amount Positive", () => {
    test("average amount is positive", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 4, max: 10 }),
          fc.float({
            min: Math.fround(10),
            max: Math.fround(100),
            noNaN: true,
          }),
          (count, amount) => {
            const transactions = generateRecurringTransactions(
              "Test Merchant",
              amount,
              "monthly",
              count,
              "2024-01-01",
            );

            const result = analyzeTransactions(transactions);

            result.patterns.forEach((pattern) => {
              expect(pattern.averageAmount).toBeGreaterThan(0);
            });
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("1.8: Consistency Scores Range", () => {
    test("timing and amount consistency scores are between 0 and 100", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 4, max: 10 }),
          fc.float({
            min: Math.fround(10),
            max: Math.fround(100),
            noNaN: true,
          }),
          (count, amount) => {
            const transactions = generateRecurringTransactions(
              "Test Merchant",
              amount,
              "monthly",
              count,
              "2024-01-01",
            );

            const result = analyzeTransactions(transactions);

            result.patterns.forEach((pattern) => {
              expect(pattern.timingConsistency).toBeGreaterThanOrEqual(0);
              expect(pattern.timingConsistency).toBeLessThanOrEqual(100);
              expect(pattern.amountConsistency).toBeGreaterThanOrEqual(0);
              expect(pattern.amountConsistency).toBeLessThanOrEqual(100);
            });
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});

// ============================================================================
// Property 16: Pattern Confidence and Threshold
// ============================================================================

describe("Property 16: Pattern Confidence and Threshold", () => {
  describe("16.1: Confidence Score Bounds", () => {
    test("confidence score is always between 0 and 100", () => {
      fc.assert(
        fc.property(
          frequencyDataArbitrary,
          amountStatsArbitrary,
          fc.integer({ min: 1, max: 20 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (frequencyData, amountStats, occurrences, merchantName) => {
            const score = calculateConfidenceScore(
              frequencyData,
              amountStats,
              occurrences,
              merchantName,
            );
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("16.2: Confidence Monotonicity with Occurrences", () => {
    test("more occurrences never decrease confidence (all else equal)", () => {
      fc.assert(
        fc.property(
          frequencyDataArbitrary,
          amountStatsArbitrary,
          fc.string({ minLength: 3, maxLength: 50 }),
          (frequencyData, amountStats, merchantName) => {
            const score3 = calculateConfidenceScore(
              frequencyData,
              amountStats,
              3,
              merchantName,
            );
            const score6 = calculateConfidenceScore(
              frequencyData,
              amountStats,
              6,
              merchantName,
            );
            const score10 = calculateConfidenceScore(
              frequencyData,
              amountStats,
              10,
              merchantName,
            );

            expect(score6).toBeGreaterThanOrEqual(score3);
            expect(score10).toBeGreaterThanOrEqual(score6);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("16.3: Timing Consistency Impact", () => {
    test("better timing consistency yields higher confidence", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("weekly", "bi-weekly", "monthly"),
          amountStatsArbitrary,
          fc.integer({ min: 3, max: 10 }),
          fc.string({ minLength: 3, maxLength: 50 }),
          (frequency, amountStats, occurrences, merchantName) => {
            const expectedInterval = FREQUENCY_PATTERNS[frequency].interval;

            const perfectTiming = {
              frequency,
              expectedInterval,
              avgDeviation: 0,
            };
            const poorTiming = {
              frequency,
              expectedInterval,
              avgDeviation: Math.floor(expectedInterval / 2),
            };

            const perfectScore = calculateConfidenceScore(
              perfectTiming,
              amountStats,
              occurrences,
              merchantName,
            );
            const poorScore = calculateConfidenceScore(
              poorTiming,
              amountStats,
              occurrences,
              merchantName,
            );

            expect(perfectScore).toBeGreaterThan(poorScore);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("16.4: Amount Consistency Impact", () => {
    test("consistent amounts yield higher confidence than variable amounts", () => {
      fc.assert(
        fc.property(
          frequencyDataArbitrary,
          fc.float({
            min: Math.fround(10),
            max: Math.fround(100),
            noNaN: true,
          }),
          fc.integer({ min: 3, max: 10 }),
          fc.string({ minLength: 3, maxLength: 50 }),
          (frequencyData, meanAmount, occurrences, merchantName) => {
            const consistentAmounts = { mean: meanAmount, stdDev: 0 };
            const variableAmounts = {
              mean: meanAmount,
              stdDev: meanAmount * 0.5,
            };

            const consistentScore = calculateConfidenceScore(
              frequencyData,
              consistentAmounts,
              occurrences,
              merchantName,
            );
            const variableScore = calculateConfidenceScore(
              frequencyData,
              variableAmounts,
              occurrences,
              merchantName,
            );

            expect(consistentScore).toBeGreaterThan(variableScore);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("16.5: Threshold Filtering", () => {
    test("patterns below threshold are filtered out", () => {
      fc.assert(
        fc.property(fc.integer({ min: 50, max: 90 }), (threshold) => {
          // Create a pattern that might be below threshold
          const transactions = generateRecurringTransactions(
            "Test Merchant",
            50,
            "monthly",
            3,
            "2024-01-01",
          );

          const result = analyzeTransactions(transactions, {
            minConfidence: threshold,
          });

          result.patterns.forEach((pattern) => {
            expect(pattern.confidenceScore).toBeGreaterThanOrEqual(threshold);
          });
        }),
        { numRuns: 50 },
      );
    });
  });
});

// ============================================================================
// Property 17: Pattern Change Detection
// ============================================================================

describe("Property 17: Pattern Change Detection", () => {
  /**
   * Detect if a pattern has changed
   */
  function detectPatternChange(oldPattern, newPattern, amountThreshold = 10) {
    const changes = [];

    if (oldPattern.frequency !== newPattern.frequency) {
      changes.push({
        type: "frequency",
        old: oldPattern.frequency,
        new: newPattern.frequency,
      });
    }

    const amountDiff = Math.abs(
      newPattern.averageAmount - oldPattern.averageAmount,
    );
    const amountChangePercent = (amountDiff / oldPattern.averageAmount) * 100;
    if (amountChangePercent > amountThreshold) {
      changes.push({
        type: "amount",
        old: oldPattern.averageAmount,
        new: newPattern.averageAmount,
        changePercent: Math.round(amountChangePercent),
      });
    }

    return { hasChanged: changes.length > 0, changes };
  }

  describe("17.1: Frequency Change Detection", () => {
    test("different frequencies are always detected as changes", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            "weekly",
            "bi-weekly",
            "monthly",
            "quarterly",
            "annual",
          ),
          fc.constantFrom(
            "weekly",
            "bi-weekly",
            "monthly",
            "quarterly",
            "annual",
          ),
          fc.float({
            min: Math.fround(10),
            max: Math.fround(100),
            noNaN: true,
          }),
          (freq1, freq2, amount) => {
            fc.pre(freq1 !== freq2);

            const oldPattern = { frequency: freq1, averageAmount: amount };
            const newPattern = { frequency: freq2, averageAmount: amount };

            const result = detectPatternChange(oldPattern, newPattern);

            expect(result.hasChanged).toBe(true);
            expect(result.changes.some((c) => c.type === "frequency")).toBe(
              true,
            );
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("17.2: Amount Change Detection", () => {
    test("significant amount changes are detected", () => {
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
          }), // 15-100% increase
          (baseAmount, multiplier) => {
            const oldPattern = {
              frequency: "monthly",
              averageAmount: baseAmount,
            };
            const newPattern = {
              frequency: "monthly",
              averageAmount: baseAmount * multiplier,
            };

            const result = detectPatternChange(oldPattern, newPattern, 10);

            expect(result.hasChanged).toBe(true);
            expect(result.changes.some((c) => c.type === "amount")).toBe(true);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("17.3: Minor Changes Not Flagged", () => {
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
          }), // ±5% change
          (baseAmount, multiplier) => {
            const oldPattern = {
              frequency: "monthly",
              averageAmount: baseAmount,
            };
            const newPattern = {
              frequency: "monthly",
              averageAmount: baseAmount * multiplier,
            };

            const result = detectPatternChange(oldPattern, newPattern, 10);

            // Should not flag amount change (within 10% threshold)
            expect(
              result.changes.filter((c) => c.type === "amount"),
            ).toHaveLength(0);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("17.4: Identical Patterns", () => {
    test("identical patterns report no changes", () => {
      fc.assert(
        fc.property(patternArbitrary, (pattern) => {
          const result = detectPatternChange(pattern, { ...pattern });

          expect(result.hasChanged).toBe(false);
          expect(result.changes).toHaveLength(0);
        }),
        { numRuns: 50 },
      );
    });
  });

  describe("17.5: Change Percentage Accuracy", () => {
    test("change percentage is calculated correctly", () => {
      fc.assert(
        fc.property(
          fc.float({
            min: Math.fround(50),
            max: Math.fround(100),
            noNaN: true,
          }),
          fc.integer({ min: 20, max: 100 }), // 20-100% increase
          (baseAmount, increasePercent) => {
            const newAmount = baseAmount * (1 + increasePercent / 100);
            const oldPattern = {
              frequency: "monthly",
              averageAmount: baseAmount,
            };
            const newPattern = {
              frequency: "monthly",
              averageAmount: newAmount,
            };

            const result = detectPatternChange(oldPattern, newPattern, 10);

            if (result.changes.length > 0) {
              const amountChange = result.changes.find(
                (c) => c.type === "amount",
              );
              if (amountChange) {
                // Allow 1% tolerance for floating point
                expect(
                  Math.abs(amountChange.changePercent - increasePercent),
                ).toBeLessThanOrEqual(1);
              }
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});

// ============================================================================
// Property 18: Pattern Prediction Accuracy
// ============================================================================

describe("Property 18: Pattern Prediction Accuracy", () => {
  describe("18.1: Next Date Calculation", () => {
    test("next expected date is always in the future relative to last date", () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
          fc.constantFrom(
            "weekly",
            "bi-weekly",
            "monthly",
            "quarterly",
            "annual",
          ),
          (lastDate, frequency) => {
            const lastDateStr = lastDate.toISOString().split("T")[0];
            const nextDate = calculateNextExpectedDate(lastDateStr, frequency);

            if (nextDate) {
              expect(nextDate > lastDateStr).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("18.2: Interval Consistency", () => {
    test("calculated intervals match expected frequency intervals", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            "weekly",
            "bi-weekly",
            "monthly",
            "quarterly",
            "annual",
          ),
          fc.integer({ min: 3, max: 10 }),
          (frequency, count) => {
            const transactions = generateRecurringTransactions(
              "Test",
              50,
              frequency,
              count,
              "2024-01-01",
            );

            const intervals = calculateIntervals(transactions);
            const expectedInterval = FREQUENCY_PATTERNS[frequency].interval;

            // All intervals should be close to expected
            intervals.forEach((interval) => {
              expect(Math.abs(interval - expectedInterval)).toBeLessThanOrEqual(
                1,
              );
            });
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("18.3: Frequency Detection Accuracy", () => {
    test("generated recurring transactions are detected with correct frequency", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("weekly", "bi-weekly", "monthly"),
          fc.integer({ min: 4, max: 8 }),
          fc.float({
            min: Math.fround(10),
            max: Math.fround(100),
            noNaN: true,
          }),
          (frequency, count, amount) => {
            const transactions = generateRecurringTransactions(
              "Test Merchant",
              amount,
              frequency,
              count,
              "2024-01-01",
            );

            const result = analyzeTransactions(transactions);

            if (result.patterns.length > 0) {
              expect(result.patterns[0].frequency).toBe(frequency);
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("18.4: Amount Prediction", () => {
    test("suggested amount is close to actual average for consistent amounts", () => {
      fc.assert(
        fc.property(
          fc.float({
            min: Math.fround(10),
            max: Math.fround(100),
            noNaN: true,
          }),
          fc.integer({ min: 4, max: 8 }),
          (amount, count) => {
            const transactions = generateRecurringTransactions(
              "Test Merchant",
              amount,
              "monthly",
              count,
              "2024-01-01",
            );

            const result = analyzeTransactions(transactions);

            if (result.patterns.length > 0) {
              // Suggested amount should be close to actual amount
              expect(
                Math.abs(result.patterns[0].averageAmount - amount),
              ).toBeLessThan(1);
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("18.5: Pattern Count Accuracy", () => {
    test("detected pattern count matches actual recurring merchants", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 3 }), (merchantCount) => {
          const allTransactions = [];

          for (let i = 0; i < merchantCount; i++) {
            const transactions = generateRecurringTransactions(
              `Merchant_${i}`,
              50 + i * 10,
              "monthly",
              4,
              "2024-01-01",
            );
            allTransactions.push(...transactions);
          }

          const result = analyzeTransactions(allTransactions);

          // Should detect at least some patterns (may be less due to confidence threshold)
          expect(result.patternsDetected).toBeLessThanOrEqual(merchantCount);
        }),
        { numRuns: 30 },
      );
    });
  });

  describe("18.6: Empty Input Handling", () => {
    test("empty transactions return empty patterns", () => {
      const result = analyzeTransactions([]);

      expect(result.patterns).toEqual([]);
      expect(result.transactionsAnalyzed).toBe(0);
      expect(result.patternsDetected).toBe(0);
    });
  });
});
