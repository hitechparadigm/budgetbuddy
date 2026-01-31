/**
 * Property-Based Tests: Batch Processing
 *
 * Tests that all users are processed exactly once in batches
 * Validates: Requirement 3.6
 */

const fc = require("fast-check");

/**
 * Process users in batches
 * Returns array of processed user IDs
 */
async function processBatch(users, batchSize = 10) {
  const processedUsers = [];

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);

    // Process batch in parallel
    const results = await Promise.all(
      batch.map(async (user) => {
        // Simulate processing
        return user.userId;
      }),
    );

    processedUsers.push(...results);
  }

  return processedUsers;
}

/**
 * Check if all users were processed exactly once
 */
function validateProcessing(originalUsers, processedUserIds) {
  // Check count
  if (originalUsers.length !== processedUserIds.length) {
    return false;
  }

  // Check each user was processed exactly once
  const originalIds = originalUsers.map((u) => u.userId).sort();
  const processedIds = [...processedUserIds].sort();

  return JSON.stringify(originalIds) === JSON.stringify(processedIds);
}

/**
 * Generate test users
 */
function generateUsers(count) {
  return Array.from({ length: count }, (_, i) => ({
    userId: `user-${i}`,
    email: `user${i}@example.com`,
  }));
}

describe("Property-Based Tests: Batch Processing", () => {
  describe("processBatch", () => {
    it("should process all users exactly once with batch size 10", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }), // userCount
          async (userCount) => {
            const users = generateUsers(userCount);
            const processedIds = await processBatch(users, 10);
            return validateProcessing(users, processedIds);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should process all users exactly once with varying batch sizes", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }), // userCount
          fc.integer({ min: 1, max: 50 }), // batchSize
          async (userCount, batchSize) => {
            const users = generateUsers(userCount);
            const processedIds = await processBatch(users, batchSize);
            return validateProcessing(users, processedIds);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should handle empty user list", async () => {
      const users = [];
      const processedIds = await processBatch(users, 10);
      expect(processedIds).toEqual([]);
    });

    it("should handle single user", async () => {
      const users = generateUsers(1);
      const processedIds = await processBatch(users, 10);
      expect(validateProcessing(users, processedIds)).toBe(true);
    });

    it("should handle exactly one batch", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // userCount (1-10)
          async (userCount) => {
            const users = generateUsers(userCount);
            const processedIds = await processBatch(users, 10);
            return validateProcessing(users, processedIds);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should handle exactly multiple full batches", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // batchCount
          fc.integer({ min: 1, max: 20 }), // batchSize
          async (batchCount, batchSize) => {
            const userCount = batchCount * batchSize;
            const users = generateUsers(userCount);
            const processedIds = await processBatch(users, batchSize);
            return validateProcessing(users, processedIds);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should handle partial last batch", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // fullBatches
          fc.integer({ min: 1, max: 9 }), // remainingUsers
          fc.integer({ min: 1, max: 20 }), // batchSize
          async (fullBatches, remainingUsers, batchSize) => {
            const userCount = fullBatches * batchSize + remainingUsers;
            const users = generateUsers(userCount);
            const processedIds = await processBatch(users, batchSize);
            return validateProcessing(users, processedIds);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should maintain order of processing", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }), // userCount
          fc.integer({ min: 1, max: 20 }), // batchSize
          async (userCount, batchSize) => {
            const users = generateUsers(userCount);
            const processedIds = await processBatch(users, batchSize);

            // Check that order is maintained
            const expectedIds = users.map((u) => u.userId);
            return JSON.stringify(processedIds) === JSON.stringify(expectedIds);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should handle batch size larger than user count", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }), // userCount
          fc.integer({ min: 21, max: 100 }), // batchSize (larger than userCount)
          async (userCount, batchSize) => {
            const users = generateUsers(userCount);
            const processedIds = await processBatch(users, batchSize);
            return validateProcessing(users, processedIds);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should handle batch size of 1", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }), // userCount
          async (userCount) => {
            const users = generateUsers(userCount);
            const processedIds = await processBatch(users, 1);
            return validateProcessing(users, processedIds);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should not duplicate any users", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }), // userCount
          fc.integer({ min: 1, max: 20 }), // batchSize
          async (userCount, batchSize) => {
            const users = generateUsers(userCount);
            const processedIds = await processBatch(users, batchSize);

            // Check for duplicates
            const uniqueIds = new Set(processedIds);
            return uniqueIds.size === processedIds.length;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should not skip any users", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }), // userCount
          fc.integer({ min: 1, max: 20 }), // batchSize
          async (userCount, batchSize) => {
            const users = generateUsers(userCount);
            const processedIds = await processBatch(users, batchSize);

            // Check that all original user IDs are in processed IDs
            const originalIds = new Set(users.map((u) => u.userId));
            const processedSet = new Set(processedIds);

            for (const id of originalIds) {
              if (!processedSet.has(id)) {
                return false;
              }
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should handle edge case: 1000 users", async () => {
      const users = generateUsers(1000);
      const processedIds = await processBatch(users, 10);
      expect(validateProcessing(users, processedIds)).toBe(true);
      expect(processedIds.length).toBe(1000);
    });

    it("should be consistent for the same input", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }), // userCount
          fc.integer({ min: 1, max: 20 }), // batchSize
          async (userCount, batchSize) => {
            const users = generateUsers(userCount);

            const processedIds1 = await processBatch(users, batchSize);
            const processedIds2 = await processBatch(users, batchSize);

            return (
              JSON.stringify(processedIds1) === JSON.stringify(processedIds2)
            );
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("validateProcessing", () => {
    it("should return true when all users processed exactly once", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }), // userCount
          (userCount) => {
            const users = generateUsers(userCount);
            const processedIds = users.map((u) => u.userId);
            return validateProcessing(users, processedIds) === true;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should return false when user count mismatch", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 100 }), // userCount
          (userCount) => {
            const users = generateUsers(userCount);
            const processedIds = users
              .slice(0, userCount - 1)
              .map((u) => u.userId);
            return validateProcessing(users, processedIds) === false;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should return false when there are duplicates", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 100 }), // userCount
          (userCount) => {
            const users = generateUsers(userCount);
            const processedIds = users.map((u) => u.userId);
            processedIds[0] = processedIds[1]; // Create duplicate
            return validateProcessing(users, processedIds) === false;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should return true for empty lists", () => {
      const result = validateProcessing([], []);
      expect(result).toBe(true);
    });

    it("should handle order independence", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 50 }), // userCount
          (userCount) => {
            const users = generateUsers(userCount);
            const processedIds = users.map((u) => u.userId).reverse();
            // Should still be valid even if order is different
            return validateProcessing(users, processedIds) === true;
          },
        ),
        { numRuns: 1000 },
      );
    });
  });
});

module.exports = {
  processBatch,
  validateProcessing,
  generateUsers,
};
