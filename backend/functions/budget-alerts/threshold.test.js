/**
 * Property-Based Tests: Threshold Detection
 *
 * Tests budget threshold detection (80%, 90%, 100%)
 * Validates: Requirements 2.1, 2.2, 2.3
 */

const fc = require("fast-check");

/**
 * Calculate spending percentage
 */
function calculateSpendingPercentage(spent, budget) {
  if (budget === 0) return 0;
  return (spent / budget) * 100;
}

/**
 * Detect which threshold was crossed
 * Returns: null, 80, 90, or 100
 */
function detectThresholdCrossed(spent, budget, previousSpent = 0) {
  if (budget === 0) return null;

  const currentPercentage = calculateSpendingPercentage(spent, budget);
  const previousPercentage = calculateSpendingPercentage(previousSpent, budget);

  // Check 100% threshold
  if (currentPercentage >= 100 && previousPercentage < 100) {
    return 100;
  }

  // Check 90% threshold
  if (currentPercentage >= 90 && previousPercentage < 90) {
    return 90;
  }

  // Check 80% threshold
  if (currentPercentage >= 80 && previousPercentage < 80) {
    return 80;
  }

  return null;
}

describe("Property-Based Tests: Threshold Detection", () => {
  describe("calculateSpendingPercentage", () => {
    it("should return 0 when budget is 0", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 10000 }), // spent
          (spent) => {
            const result = calculateSpendingPercentage(spent, 0);
            return result === 0;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should return 100 when spent equals budget", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 10000 }), // budget
          (budget) => {
            const result = calculateSpendingPercentage(budget, budget);
            return Math.abs(result - 100) < 0.01; // Allow small floating point error
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should return 50 when spent is half of budget", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 10000 }), // budget
          (budget) => {
            const result = calculateSpendingPercentage(budget / 2, budget);
            return Math.abs(result - 50) < 0.01;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should return value between 0 and 100 when spent is less than budget", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 10000 }), // budget
          fc.float({ min: 0, max: 1 }), // ratio (0 to 1)
          (budget, ratio) => {
            const spent = budget * ratio;
            const result = calculateSpendingPercentage(spent, budget);
            return result >= 0 && result <= 100;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should return value greater than 100 when spent exceeds budget", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 10000 }), // budget
          fc.float({ min: 1.01, max: 2 }), // multiplier (> 1)
          (budget, multiplier) => {
            const spent = budget * multiplier;
            const result = calculateSpendingPercentage(spent, budget);
            return result > 100;
          },
        ),
        { numRuns: 1000 },
      );
    });
  });

  describe("detectThresholdCrossed", () => {
    it("should detect 80% threshold when crossing from below", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 10000 }), // budget
          (budget) => {
            const previousSpent = budget * 0.79; // 79%
            const currentSpent = budget * 0.81; // 81%
            const result = detectThresholdCrossed(
              currentSpent,
              budget,
              previousSpent,
            );
            return result === 80;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should detect 90% threshold when crossing from below", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 10000 }), // budget
          (budget) => {
            const previousSpent = budget * 0.89; // 89%
            const currentSpent = budget * 0.91; // 91%
            const result = detectThresholdCrossed(
              currentSpent,
              budget,
              previousSpent,
            );
            return result === 90;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should detect 100% threshold when crossing from below", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 10000 }), // budget
          (budget) => {
            const previousSpent = budget * 0.99; // 99%
            const currentSpent = budget * 1.01; // 101%
            const result = detectThresholdCrossed(
              currentSpent,
              budget,
              previousSpent,
            );
            return result === 100;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should return null when no threshold is crossed", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 10000 }), // budget
          fc.float({ min: 0, max: 0.79 }), // ratio (below 80%)
          (budget, ratio) => {
            const previousSpent = budget * ratio;
            const currentSpent = budget * (ratio + 0.01);
            const result = detectThresholdCrossed(
              currentSpent,
              budget,
              previousSpent,
            );
            return result === null;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should detect exactly at 80% threshold", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 10000 }), // budget
          (budget) => {
            const previousSpent = budget * 0.79;
            const currentSpent = budget * 0.8; // Exactly 80%
            const result = detectThresholdCrossed(
              currentSpent,
              budget,
              previousSpent,
            );
            return result === 80;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should detect exactly at 90% threshold", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 10000 }), // budget
          (budget) => {
            const previousSpent = budget * 0.89;
            const currentSpent = budget * 0.9; // Exactly 90%
            const result = detectThresholdCrossed(
              currentSpent,
              budget,
              previousSpent,
            );
            return result === 90;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should detect exactly at 100% threshold", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 10000 }), // budget
          (budget) => {
            const previousSpent = budget * 0.99;
            const currentSpent = budget; // Exactly 100%
            const result = detectThresholdCrossed(
              currentSpent,
              budget,
              previousSpent,
            );
            return result === 100;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should prioritize highest threshold when jumping multiple thresholds", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 10000 }), // budget
          (budget) => {
            const previousSpent = budget * 0.7; // 70%
            const currentSpent = budget * 1.05; // 105% (crosses all thresholds)
            const result = detectThresholdCrossed(
              currentSpent,
              budget,
              previousSpent,
            );
            // Should detect 100% first (highest threshold)
            return result === 100;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should return null when already above threshold", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 10000 }), // budget
          (budget) => {
            const previousSpent = budget * 0.85; // Already above 80%
            const currentSpent = budget * 0.87; // Still above 80%
            const result = detectThresholdCrossed(
              currentSpent,
              budget,
              previousSpent,
            );
            return result === null;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should handle zero budget gracefully", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000 }), // spent
          fc.float({ min: 0, max: 1000 }), // previousSpent
          (spent, previousSpent) => {
            const result = detectThresholdCrossed(spent, 0, previousSpent);
            return result === null;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should handle negative spending gracefully", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 10000 }), // budget
          fc.float({ min: -1000, max: 0 }), // negative spent
          (budget, spent) => {
            const result = detectThresholdCrossed(spent, budget, 0);
            return result === null;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should be consistent for the same inputs", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 10000 }), // budget
          fc.float({ min: 0, max: 1.5 }), // currentRatio
          fc.float({ min: 0, max: 1.5 }), // previousRatio
          (budget, currentRatio, previousRatio) => {
            const currentSpent = budget * currentRatio;
            const previousSpent = budget * previousRatio;
            const result1 = detectThresholdCrossed(
              currentSpent,
              budget,
              previousSpent,
            );
            const result2 = detectThresholdCrossed(
              currentSpent,
              budget,
              previousSpent,
            );
            return result1 === result2;
          },
        ),
        { numRuns: 1000 },
      );
    });
  });
});

module.exports = {
  calculateSpendingPercentage,
  detectThresholdCrossed,
};
