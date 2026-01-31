/**
 * Property-Based Tests: Alert Deduplication
 *
 * Tests that no duplicate alerts are sent within 24 hours
 * Validates: Requirement 2.5
 */

const fc = require("fast-check");

/**
 * Check if an alert should be sent (not a duplicate)
 * Returns true if alert should be sent, false if it's a duplicate
 */
function shouldSendAlert(currentTimestamp, lastAlertTimestamp) {
  if (!lastAlertTimestamp) {
    return true; // No previous alert, send it
  }

  const timeDiff = currentTimestamp - lastAlertTimestamp;
  const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  return timeDiff >= twentyFourHours;
}

/**
 * Get alert key for deduplication
 */
function getAlertKey(familyId, budgetId, categoryId, threshold) {
  return `${familyId}:${budgetId}:${categoryId}:${threshold}`;
}

describe("Property-Based Tests: Alert Deduplication", () => {
  describe("shouldSendAlert", () => {
    it("should always return true when no previous alert exists", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: Date.now() }), // currentTimestamp
          (currentTimestamp) => {
            const result = shouldSendAlert(currentTimestamp, null);
            return result === true;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should return false when less than 24 hours have passed", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000, max: Date.now() }), // baseTimestamp
          fc.integer({ min: 1, max: 24 * 60 * 60 * 1000 - 1 }), // timeDiff (< 24 hours)
          (baseTimestamp, timeDiff) => {
            const lastAlertTimestamp = baseTimestamp;
            const currentTimestamp = baseTimestamp + timeDiff;
            const result = shouldSendAlert(
              currentTimestamp,
              lastAlertTimestamp,
            );
            return result === false;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should return true when exactly 24 hours have passed", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000, max: Date.now() - 24 * 60 * 60 * 1000 }), // baseTimestamp
          (baseTimestamp) => {
            const lastAlertTimestamp = baseTimestamp;
            const currentTimestamp = baseTimestamp + 24 * 60 * 60 * 1000; // Exactly 24 hours
            const result = shouldSendAlert(
              currentTimestamp,
              lastAlertTimestamp,
            );
            return result === true;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should return true when more than 24 hours have passed", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000, max: Date.now() - 25 * 60 * 60 * 1000 }), // baseTimestamp
          fc.integer({
            min: 24 * 60 * 60 * 1000 + 1,
            max: 48 * 60 * 60 * 1000,
          }), // timeDiff (> 24 hours)
          (baseTimestamp, timeDiff) => {
            const lastAlertTimestamp = baseTimestamp;
            const currentTimestamp = baseTimestamp + timeDiff;
            const result = shouldSendAlert(
              currentTimestamp,
              lastAlertTimestamp,
            );
            return result === true;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should handle edge case: 1 millisecond before 24 hours", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000, max: Date.now() }), // baseTimestamp
          (baseTimestamp) => {
            const lastAlertTimestamp = baseTimestamp;
            const currentTimestamp = baseTimestamp + (24 * 60 * 60 * 1000 - 1); // 1ms before 24h
            const result = shouldSendAlert(
              currentTimestamp,
              lastAlertTimestamp,
            );
            return result === false;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should handle edge case: 1 millisecond after 24 hours", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000, max: Date.now() - 24 * 60 * 60 * 1000 }), // baseTimestamp
          (baseTimestamp) => {
            const lastAlertTimestamp = baseTimestamp;
            const currentTimestamp = baseTimestamp + (24 * 60 * 60 * 1000 + 1); // 1ms after 24h
            const result = shouldSendAlert(
              currentTimestamp,
              lastAlertTimestamp,
            );
            return result === true;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should be consistent for the same inputs", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000, max: Date.now() }), // currentTimestamp
          fc.option(fc.integer({ min: 0, max: Date.now() }), { nil: null }), // lastAlertTimestamp
          (currentTimestamp, lastAlertTimestamp) => {
            const result1 = shouldSendAlert(
              currentTimestamp,
              lastAlertTimestamp,
            );
            const result2 = shouldSendAlert(
              currentTimestamp,
              lastAlertTimestamp,
            );
            return result1 === result2;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should handle very old alerts (weeks/months ago)", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 365 }), // days ago
          (daysAgo) => {
            const currentTimestamp = Date.now();
            const lastAlertTimestamp =
              currentTimestamp - daysAgo * 24 * 60 * 60 * 1000;
            const result = shouldSendAlert(
              currentTimestamp,
              lastAlertTimestamp,
            );
            return result === true;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should handle timestamps in different orders", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000, max: Date.now() }), // timestamp1
          fc.integer({ min: 1000000, max: Date.now() }), // timestamp2
          (timestamp1, timestamp2) => {
            const timeDiff = Math.abs(timestamp1 - timestamp2);
            const expected = timeDiff >= 24 * 60 * 60 * 1000;

            const result1 = shouldSendAlert(timestamp1, timestamp2);
            const result2 = shouldSendAlert(timestamp2, timestamp1);

            // Both should give the same result (symmetric)
            return result1 === result2 && result1 === expected;
          },
        ),
        { numRuns: 1000 },
      );
    });
  });

  describe("getAlertKey", () => {
    it("should generate unique keys for different combinations", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // familyId1
          fc.string({ minLength: 1, maxLength: 50 }), // budgetId1
          fc.string({ minLength: 1, maxLength: 50 }), // categoryId1
          fc.integer({ min: 80, max: 100 }), // threshold1
          fc.string({ minLength: 1, maxLength: 50 }), // familyId2
          fc.string({ minLength: 1, maxLength: 50 }), // budgetId2
          fc.string({ minLength: 1, maxLength: 50 }), // categoryId2
          fc.integer({ min: 80, max: 100 }), // threshold2
          (
            familyId1,
            budgetId1,
            categoryId1,
            threshold1,
            familyId2,
            budgetId2,
            categoryId2,
            threshold2,
          ) => {
            const key1 = getAlertKey(
              familyId1,
              budgetId1,
              categoryId1,
              threshold1,
            );
            const key2 = getAlertKey(
              familyId2,
              budgetId2,
              categoryId2,
              threshold2,
            );

            // If all parameters are the same, keys should be equal
            if (
              familyId1 === familyId2 &&
              budgetId1 === budgetId2 &&
              categoryId1 === categoryId2 &&
              threshold1 === threshold2
            ) {
              return key1 === key2;
            }

            // Otherwise, keys should be different
            return key1 !== key2;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should be consistent for the same inputs", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // familyId
          fc.string({ minLength: 1, maxLength: 50 }), // budgetId
          fc.string({ minLength: 1, maxLength: 50 }), // categoryId
          fc.integer({ min: 80, max: 100 }), // threshold
          (familyId, budgetId, categoryId, threshold) => {
            const key1 = getAlertKey(familyId, budgetId, categoryId, threshold);
            const key2 = getAlertKey(familyId, budgetId, categoryId, threshold);
            return key1 === key2;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should generate different keys for different thresholds", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // familyId
          fc.string({ minLength: 1, maxLength: 50 }), // budgetId
          fc.string({ minLength: 1, maxLength: 50 }), // categoryId
          (familyId, budgetId, categoryId) => {
            const key80 = getAlertKey(familyId, budgetId, categoryId, 80);
            const key90 = getAlertKey(familyId, budgetId, categoryId, 90);
            const key100 = getAlertKey(familyId, budgetId, categoryId, 100);

            return key80 !== key90 && key90 !== key100 && key80 !== key100;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should always return a non-empty string", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // familyId
          fc.string({ minLength: 1, maxLength: 50 }), // budgetId
          fc.string({ minLength: 1, maxLength: 50 }), // categoryId
          fc.integer({ min: 80, max: 100 }), // threshold
          (familyId, budgetId, categoryId, threshold) => {
            const key = getAlertKey(familyId, budgetId, categoryId, threshold);
            return typeof key === "string" && key.length > 0;
          },
        ),
        { numRuns: 1000 },
      );
    });
  });

  describe("Deduplication Integration", () => {
    it("should prevent duplicate alerts within 24 hours for same alert key", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // familyId
          fc.string({ minLength: 1, maxLength: 50 }), // budgetId
          fc.string({ minLength: 1, maxLength: 50 }), // categoryId
          fc.integer({ min: 80, max: 100 }), // threshold
          fc.integer({ min: 1000000, max: Date.now() }), // baseTimestamp
          fc.integer({ min: 1, max: 24 * 60 * 60 * 1000 - 1 }), // timeDiff (< 24 hours)
          (
            familyId,
            budgetId,
            categoryId,
            threshold,
            baseTimestamp,
            timeDiff,
          ) => {
            const alertKey = getAlertKey(
              familyId,
              budgetId,
              categoryId,
              threshold,
            );
            const firstAlertTime = baseTimestamp;
            const secondAlertTime = baseTimestamp + timeDiff;

            // First alert should be sent
            const shouldSendFirst = shouldSendAlert(firstAlertTime, null);

            // Second alert within 24 hours should NOT be sent
            const shouldSendSecond = shouldSendAlert(
              secondAlertTime,
              firstAlertTime,
            );

            return shouldSendFirst === true && shouldSendSecond === false;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should allow alerts after 24 hours for same alert key", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // familyId
          fc.string({ minLength: 1, maxLength: 50 }), // budgetId
          fc.string({ minLength: 1, maxLength: 50 }), // categoryId
          fc.integer({ min: 80, max: 100 }), // threshold
          fc.integer({ min: 1000000, max: Date.now() - 25 * 60 * 60 * 1000 }), // baseTimestamp
          fc.integer({ min: 24 * 60 * 60 * 1000, max: 48 * 60 * 60 * 1000 }), // timeDiff (>= 24 hours)
          (
            familyId,
            budgetId,
            categoryId,
            threshold,
            baseTimestamp,
            timeDiff,
          ) => {
            const alertKey = getAlertKey(
              familyId,
              budgetId,
              categoryId,
              threshold,
            );
            const firstAlertTime = baseTimestamp;
            const secondAlertTime = baseTimestamp + timeDiff;

            // Both alerts should be sent (24+ hours apart)
            const shouldSendFirst = shouldSendAlert(firstAlertTime, null);
            const shouldSendSecond = shouldSendAlert(
              secondAlertTime,
              firstAlertTime,
            );

            return shouldSendFirst === true && shouldSendSecond === true;
          },
        ),
        { numRuns: 1000 },
      );
    });
  });
});

module.exports = {
  shouldSendAlert,
  getAlertKey,
};
