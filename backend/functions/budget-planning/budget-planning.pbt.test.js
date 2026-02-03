/**
 * Budget Planning Property-Based Tests
 *
 * **Property 21: Budget Seasonal Adjustment**
 * **Property 22: Budget Prediction Accuracy**
 * **Validates: Requirements 13.2, 13.6**
 */

const fc = require("fast-check");

// ============================================================================
// Budget Planning Helper Functions (Pure functions for testing)
// ============================================================================

/**
 * Calculate mean of an array
 */
function calculateMean(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values) {
  if (!values || values.length < 2) return 0;
  const mean = calculateMean(values);
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Apply seasonal adjustment to a base amount
 */
function applySeasonalAdjustment(baseAmount, seasonalFactor) {
  if (seasonalFactor <= 0) return baseAmount;
  return baseAmount * seasonalFactor;
}

/**
 * Calculate confidence interval
 */
function calculateConfidenceInterval(mean, stdDev, count, zScore = 1.96) {
  if (count <= 0) return { lower: mean, upper: mean, marginOfError: 0 };
  const marginOfError = zScore * (stdDev / Math.sqrt(count));
  return {
    lower: mean - marginOfError,
    upper: mean + marginOfError,
    marginOfError,
  };
}

/**
 * Generate budget suggestion from historical data
 */
function generateSuggestion(amounts, seasonalFactor = 1, cityDefault = 100) {
  if (!amounts || amounts.length === 0) {
    return {
      amount: cityDefault,
      source: "city-default",
      confidence: "low",
    };
  }

  const mean = calculateMean(amounts);
  const stdDev = calculateStdDev(amounts);
  const adjustedMean = applySeasonalAdjustment(mean, seasonalFactor);
  const ci = calculateConfidenceInterval(mean, stdDev, amounts.length);

  // Determine confidence level
  let confidence = "medium";
  if (amounts.length >= 6 && stdDev / mean < 0.2) {
    confidence = "high";
  } else if (amounts.length < 3 || stdDev / mean > 0.5) {
    confidence = "low";
  }

  return {
    amount: adjustedMean,
    source: "historical",
    confidence,
    confidenceInterval: ci,
    dataPoints: amounts.length,
  };
}

/**
 * Learn from user feedback
 */
function learnFromFeedback(suggestion, userChoice, learningRate = 0.3) {
  const diff = userChoice - suggestion;
  const adjustment = diff * learningRate;
  return suggestion + adjustment;
}

/**
 * Validate prediction accuracy
 */
function calculatePredictionError(predicted, actual) {
  if (actual === 0) return predicted === 0 ? 0 : Infinity;
  return Math.abs(predicted - actual) / actual;
}

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate array of positive amounts
 */
const amountsArbitrary = fc.array(
  fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }),
  { minLength: 3, maxLength: 24 },
);

/**
 * Generate seasonal factor (0.5 to 2.0)
 */
const seasonalFactorArbitrary = fc.float({
  min: Math.fround(0.5),
  max: Math.fround(2.0),
  noNaN: true,
});

/**
 * Generate learning rate (0.1 to 0.5)
 */
const learningRateArbitrary = fc.float({
  min: Math.fround(0.1),
  max: Math.fround(0.5),
  noNaN: true,
});

/**
 * Generate city default amount
 */
const cityDefaultArbitrary = fc.float({
  min: Math.fround(50),
  max: Math.fround(500),
  noNaN: true,
});

// ============================================================================
// Property 21: Budget Seasonal Adjustment
// **Validates: Requirement 13.2**
// ============================================================================

describe("Property 21: Budget Seasonal Adjustment", () => {
  describe("21.1: Seasonal Factor Bounds", () => {
    test("seasonal adjustment preserves sign of amount", () => {
      fc.assert(
        fc.property(
          fc.float({
            min: Math.fround(1),
            max: Math.fround(1000),
            noNaN: true,
          }),
          seasonalFactorArbitrary,
          (baseAmount, factor) => {
            const adjusted = applySeasonalAdjustment(baseAmount, factor);
            expect(adjusted).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("21.2: Factor of 1 is Identity", () => {
    test("seasonal factor of 1 returns original amount", () => {
      fc.assert(
        fc.property(
          fc.float({
            min: Math.fround(1),
            max: Math.fround(1000),
            noNaN: true,
          }),
          (baseAmount) => {
            const adjusted = applySeasonalAdjustment(baseAmount, 1.0);
            expect(Math.abs(adjusted - baseAmount)).toBeLessThan(0.01);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("21.3: Factor > 1 Increases Amount", () => {
    test("seasonal factor > 1 increases the amount", () => {
      fc.assert(
        fc.property(
          fc.float({
            min: Math.fround(10),
            max: Math.fround(1000),
            noNaN: true,
          }),
          fc.float({
            min: Math.fround(1.1),
            max: Math.fround(2.0),
            noNaN: true,
          }),
          (baseAmount, factor) => {
            const adjusted = applySeasonalAdjustment(baseAmount, factor);
            expect(adjusted).toBeGreaterThan(baseAmount);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("21.4: Factor < 1 Decreases Amount", () => {
    test("seasonal factor < 1 decreases the amount", () => {
      fc.assert(
        fc.property(
          fc.float({
            min: Math.fround(10),
            max: Math.fround(1000),
            noNaN: true,
          }),
          fc.float({
            min: Math.fround(0.5),
            max: Math.fround(0.9),
            noNaN: true,
          }),
          (baseAmount, factor) => {
            const adjusted = applySeasonalAdjustment(baseAmount, factor);
            expect(adjusted).toBeLessThan(baseAmount);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("21.5: Adjustment is Proportional", () => {
    test("double the factor doubles the adjustment ratio", () => {
      fc.assert(
        fc.property(
          fc.float({
            min: Math.fround(10),
            max: Math.fround(100),
            noNaN: true,
          }),
          fc.float({
            min: Math.fround(0.5),
            max: Math.fround(1.0),
            noNaN: true,
          }),
          (baseAmount, factor) => {
            const adjusted1 = applySeasonalAdjustment(baseAmount, factor);
            const adjusted2 = applySeasonalAdjustment(baseAmount, factor * 2);

            // adjusted2 / adjusted1 should be approximately 2
            const ratio = adjusted2 / adjusted1;
            expect(Math.abs(ratio - 2)).toBeLessThan(0.01);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("21.6: Suggestion Includes Seasonal Adjustment", () => {
    test("suggestion with seasonal factor differs from base", () => {
      fc.assert(
        fc.property(
          amountsArbitrary,
          fc.float({
            min: Math.fround(1.2),
            max: Math.fround(1.5),
            noNaN: true,
          }),
          (amounts, factor) => {
            const baseSuggestion = generateSuggestion(amounts, 1.0);
            const adjustedSuggestion = generateSuggestion(amounts, factor);

            expect(adjustedSuggestion.amount).toBeGreaterThan(
              baseSuggestion.amount,
            );
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});

// ============================================================================
// Property 22: Budget Prediction Accuracy
// **Validates: Requirement 13.6**
// ============================================================================

describe("Property 22: Budget Prediction Accuracy", () => {
  describe("22.1: Mean is Within Data Range", () => {
    test("calculated mean is always within min and max of data", () => {
      fc.assert(
        fc.property(amountsArbitrary, (amounts) => {
          const mean = calculateMean(amounts);
          const min = Math.min(...amounts);
          const max = Math.max(...amounts);

          expect(mean).toBeGreaterThanOrEqual(min);
          expect(mean).toBeLessThanOrEqual(max);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("22.2: Confidence Interval Contains Mean", () => {
    test("confidence interval always contains the mean", () => {
      fc.assert(
        fc.property(amountsArbitrary, (amounts) => {
          const mean = calculateMean(amounts);
          const stdDev = calculateStdDev(amounts);
          const ci = calculateConfidenceInterval(mean, stdDev, amounts.length);

          expect(ci.lower).toBeLessThanOrEqual(mean);
          expect(ci.upper).toBeGreaterThanOrEqual(mean);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("22.3: More Data Narrows Confidence Interval", () => {
    test("more data points result in narrower confidence interval", () => {
      fc.assert(
        fc.property(
          fc.float({
            min: Math.fround(50),
            max: Math.fround(200),
            noNaN: true,
          }),
          fc.float({ min: Math.fround(10), max: Math.fround(50), noNaN: true }),
          (mean, stdDev) => {
            const ci5 = calculateConfidenceInterval(mean, stdDev, 5);
            const ci20 = calculateConfidenceInterval(mean, stdDev, 20);

            expect(ci20.marginOfError).toBeLessThan(ci5.marginOfError);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("22.4: Consistent Data Has Low Std Dev", () => {
    test("identical values have zero standard deviation", () => {
      fc.assert(
        fc.property(
          fc.float({
            min: Math.fround(1),
            max: Math.fround(1000),
            noNaN: true,
          }),
          fc.integer({ min: 3, max: 10 }),
          (value, count) => {
            const amounts = Array(count).fill(value);
            const stdDev = calculateStdDev(amounts);

            expect(stdDev).toBeLessThan(0.01);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("22.5: Learning Converges Toward User Choice", () => {
    test("learning moves suggestion toward user choice", () => {
      fc.assert(
        fc.property(
          fc.float({
            min: Math.fround(50),
            max: Math.fround(200),
            noNaN: true,
          }),
          fc.float({
            min: Math.fround(100),
            max: Math.fround(300),
            noNaN: true,
          }),
          learningRateArbitrary,
          (suggestion, userChoice, rate) => {
            const newSuggestion = learnFromFeedback(
              suggestion,
              userChoice,
              rate,
            );

            if (userChoice > suggestion) {
              expect(newSuggestion).toBeGreaterThan(suggestion);
              expect(newSuggestion).toBeLessThanOrEqual(userChoice);
            } else if (userChoice < suggestion) {
              expect(newSuggestion).toBeLessThan(suggestion);
              expect(newSuggestion).toBeGreaterThanOrEqual(userChoice);
            } else {
              expect(Math.abs(newSuggestion - suggestion)).toBeLessThan(0.01);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("22.6: City Default Used When No Data", () => {
    test("empty data returns city default", () => {
      fc.assert(
        fc.property(cityDefaultArbitrary, (cityDefault) => {
          const suggestion = generateSuggestion([], 1.0, cityDefault);

          expect(suggestion.amount).toBe(cityDefault);
          expect(suggestion.source).toBe("city-default");
          expect(suggestion.confidence).toBe("low");
        }),
        { numRuns: 50 },
      );
    });
  });

  describe("22.7: Prediction Error Bounds", () => {
    test("prediction error is non-negative", () => {
      fc.assert(
        fc.property(
          fc.float({
            min: Math.fround(1),
            max: Math.fround(1000),
            noNaN: true,
          }),
          fc.float({
            min: Math.fround(1),
            max: Math.fround(1000),
            noNaN: true,
          }),
          (predicted, actual) => {
            const error = calculatePredictionError(predicted, actual);
            expect(error).toBeGreaterThanOrEqual(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("22.8: Perfect Prediction Has Zero Error", () => {
    test("identical predicted and actual have zero error", () => {
      fc.assert(
        fc.property(
          fc.float({
            min: Math.fround(1),
            max: Math.fround(1000),
            noNaN: true,
          }),
          (value) => {
            const error = calculatePredictionError(value, value);
            expect(error).toBeLessThan(0.01);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
