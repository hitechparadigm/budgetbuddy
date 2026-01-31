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
  const batches = [];

  // Split users into batches
  for (let i = 0; i < users.length; i += batchSize) {
    batches.push(users.slice(i, i + batchSize));
  }

  // Process each batch
  for (const batch of batches) {
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
 * Process users with error handling
 * Returns { processed, failed }
 */
async function processBatchWithErrors(users, batchSize = 10, failureRate = 0) {
  const processed = [];
  const failed = [];
  const batches = [];

  // Split users into batches
  for (let i = 0; i < users.length; i += batchSize) {
    batches.push(users.slice(i, i + batchSize));
  }

  // Process each batch
  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map(async (user) => {
        // Simulate random failures
        if (Math.random() < failureRate) {
          throw new Error(`Failed to process user ${user.userId}`);
        }
        return user.userId;
      }),
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        processed.push(result.value);
      } else {
        failed.push(batch[index].userId);
      }
    });
  }

  return { processed, failed };
}

describe("Property-Based Tests: Batch Processing", () => {
  describe("processBatch", () => {
    it("should process all users exactly once", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
            }),
            { minLength: 0, maxLength: 1000 },
          ),
          fc.integer({ min: 1, max: 100 }),
          async (users, batchSize) => {
            const processedUserIds = await processBatch(users, batchSize);

            // All users should be processed
            expect(processedUserIds.length).toBe(users.length);

            // All original user IDs should be in processed list (in same order)
            const originalUserIds = users.map((u) => u.userId);
            expect(processedUserIds).toEqual(originalUserIds);

            return true;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should handle empty user list", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          async (batchSize) => {
            const processedUserIds = await processBatch([], batchSize);
            return processedUserIds.length === 0;
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should handle single user", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
          }),
          fc.integer({ min: 1, max: 100 }),
          async (user, batchSize) => {
            const processedUserIds = await processBatch([user], batchSize);
            return (
              processedUserIds.length === 1 &&
              processedUserIds[0] === user.userId
            );
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should handle batch size larger than user count", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
            }),
            { minLength: 1, maxLength: 50 },
          ),
          async (users) => {
            const batchSize = users.length + 100; // Much larger than user count
            const processedUserIds = await processBatch(users, batchSize);

            // All users should be processed
            const originalUserIds = users.map((u) => u.userId);
            return (
              processedUserIds.length === users.length &&
              JSON.stringify(processedUserIds) ===
                JSON.stringify(originalUserIds)
            );
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should handle batch size of 1", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
            }),
            { minLength: 0, maxLength: 100 },
          ),
          async (users) => {
            const processedUserIds = await processBatch(users, 1);

            // All users should be processed in order
            const originalUserIds = users.map((u) => u.userId);
            return (
              processedUserIds.length === users.length &&
              JSON.stringify(processedUserIds) ===
                JSON.stringify(originalUserIds)
            );
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should preserve user order within batches", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
            }),
            { minLength: 1, maxLength: 100 },
          ),
          fc.integer({ min: 1, max: 50 }),
          async (users, batchSize) => {
            const processedUserIds = await processBatch(users, batchSize);
            const originalUserIds = users.map((u) => u.userId);

            // Order should be preserved
            return (
              JSON.stringify(processedUserIds) ===
              JSON.stringify(originalUserIds)
            );
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should handle users with duplicate IDs", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.constantFrom("user1", "user2", "user3"),
              email: fc.emailAddress(),
            }),
            { minLength: 1, maxLength: 100 },
          ),
          fc.integer({ min: 1, max: 50 }),
          async (users, batchSize) => {
            const processedUserIds = await processBatch(users, batchSize);

            // All users should be processed (even duplicates)
            return processedUserIds.length === users.length;
          },
        ),
        { numRuns: 1000 },
      );
    });
  });

  describe("processBatchWithErrors", () => {
    it("should process all successful users and track failures", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
            }),
            { minLength: 1, maxLength: 100 },
          ),
          fc.integer({ min: 1, max: 50 }),
          async (users, batchSize) => {
            const { processed, failed } = await processBatchWithErrors(
              users,
              batchSize,
              0, // No failures
            );

            // All users should be processed successfully
            const originalUserIds = users.map((u) => u.userId);
            return (
              processed.length === users.length &&
              failed.length === 0 &&
              JSON.stringify(processed) === JSON.stringify(originalUserIds)
            );
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should handle partial failures without stopping batch", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
            }),
            { minLength: 10, maxLength: 100 },
          ),
          fc.integer({ min: 1, max: 50 }),
          async (users, batchSize) => {
            const { processed, failed } = await processBatchWithErrors(
              users,
              batchSize,
              0.3, // 30% failure rate
            );

            // All users should be accounted for (either processed or failed)
            const totalAccounted = processed.length + failed.length;
            return totalAccounted === users.length;
          },
        ),
        { numRuns: 100 }, // Fewer runs due to randomness
      );
    });

    it("should not have duplicate entries in processed or failed", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
            }),
            { minLength: 1, maxLength: 100 },
          ),
          fc.integer({ min: 1, max: 50 }),
          async (users, batchSize) => {
            const { processed, failed } = await processBatchWithErrors(
              users,
              batchSize,
              0.2, // 20% failure rate
            );

            // No duplicates in processed
            const uniqueProcessed = new Set(processed);
            const noDuplicatesProcessed =
              uniqueProcessed.size === processed.length;

            // No duplicates in failed
            const uniqueFailed = new Set(failed);
            const noDuplicatesFailed = uniqueFailed.size === failed.length;

            // No overlap between processed and failed
            const noOverlap = processed.every((id) => !failed.includes(id));

            return noDuplicatesProcessed && noDuplicatesFailed && noOverlap;
          },
        ),
        { numRuns: 100 }, // Fewer runs due to randomness
      );
    });

    it("should handle all failures gracefully", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
            }),
            { minLength: 1, maxLength: 100 },
          ),
          fc.integer({ min: 1, max: 50 }),
          async (users, batchSize) => {
            const { processed, failed } = await processBatchWithErrors(
              users,
              batchSize,
              1.0, // 100% failure rate
            );

            // All users should fail
            return processed.length === 0 && failed.length === users.length;
          },
        ),
        { numRuns: 1000 },
      );
    });
  });

  describe("Batch Size Edge Cases", () => {
    it("should handle various batch sizes correctly", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1000 }), // userCount
          fc.integer({ min: 1, max: 100 }), // batchSize
          async (userCount, batchSize) => {
            const users = Array.from({ length: userCount }, (_, i) => ({
              userId: `user${i}`,
              email: `user${i}@example.com`,
            }));

            const processedUserIds = await processBatch(users, batchSize);

            // Calculate expected number of batches
            const expectedBatches = Math.ceil(userCount / batchSize);

            // All users should be processed
            return (
              processedUserIds.length === userCount &&
              new Set(processedUserIds).size === userCount
            );
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should handle exact multiples of batch size", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }), // batchSize
          fc.integer({ min: 1, max: 10 }), // multiplier
          async (batchSize, multiplier) => {
            const userCount = batchSize * multiplier;
            const users = Array.from({ length: userCount }, (_, i) => ({
              userId: `user${i}`,
              email: `user${i}@example.com`,
            }));

            const processedUserIds = await processBatch(users, batchSize);

            return (
              processedUserIds.length === userCount &&
              new Set(processedUserIds).size === userCount
            );
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should handle one less than batch size", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 100 }), // batchSize
          async (batchSize) => {
            const userCount = batchSize - 1;
            const users = Array.from({ length: userCount }, (_, i) => ({
              userId: `user${i}`,
              email: `user${i}@example.com`,
            }));

            const processedUserIds = await processBatch(users, batchSize);

            return (
              processedUserIds.length === userCount &&
              new Set(processedUserIds).size === userCount
            );
          },
        ),
        { numRuns: 1000 },
      );
    });

    it("should handle one more than batch size", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }), // batchSize
          async (batchSize) => {
            const userCount = batchSize + 1;
            const users = Array.from({ length: userCount }, (_, i) => ({
              userId: `user${i}`,
              email: `user${i}@example.com`,
            }));

            const processedUserIds = await processBatch(users, batchSize);

            return (
              processedUserIds.length === userCount &&
              new Set(processedUserIds).size === userCount
            );
          },
        ),
        { numRuns: 1000 },
      );
    });
  });
});

module.exports = {
  processBatch,
  processBatchWithErrors,
};
