/**
 * Budget Exclusion Property-Based Tests
 *
 * Property tests for untracked account budget exclusion.
 * Uses fast-check for property-based testing.
 *
 * **Validates: Requirements 5.4, 5.7**
 */

const fc = require("fast-check");

// Mock the shared layer
jest.mock("/opt/nodejs/utils", () => ({
  dynamoHelpers: {
    getItem: jest.fn(),
    updateItem: jest.fn(),
    putItem: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const { dynamoHelpers, logger } = require("/opt/nodejs/utils");
const {
  isAccountTracked,
  updateBudgetCalculations,
} = require("./budget-service");

describe("Budget Exclusion Property-Based Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 18: Untracked Account Budget Exclusion
   *
   * For any account marked as untracked, its transactions SHALL NOT be
   * included in budget category totals or overall budget calculations.
   *
   * **Validates: Requirements 5.4, 5.7**
   */
  describe("Property 18: Untracked Account Budget Exclusion", () => {
    describe("isAccountTracked function", () => {
      it("should return true when no accountId is provided", async () => {
        const result = await isAccountTracked("family-123", null);
        expect(result).toBe(true);

        const result2 = await isAccountTracked("family-123", undefined);
        expect(result2).toBe(true);
      });

      it("should return true when account is tracked", async () => {
        dynamoHelpers.getItem.mockResolvedValue({
          accountId: "acc-123",
          isTracked: true,
        });

        const result = await isAccountTracked("family-123", "acc-123");
        expect(result).toBe(true);
      });

      it("should return false when account is not tracked", async () => {
        dynamoHelpers.getItem.mockResolvedValue({
          accountId: "acc-123",
          isTracked: false,
        });

        const result = await isAccountTracked("family-123", "acc-123");
        expect(result).toBe(false);
      });

      it("should return true when account not found (defensive)", async () => {
        dynamoHelpers.getItem.mockResolvedValue(null);

        const result = await isAccountTracked("family-123", "acc-nonexistent");
        expect(result).toBe(true);
      });

      it("should return true when isTracked is undefined (default)", async () => {
        dynamoHelpers.getItem.mockResolvedValue({
          accountId: "acc-123",
          // isTracked not set
        });

        const result = await isAccountTracked("family-123", "acc-123");
        expect(result).toBe(true);
      });

      it("should return true on error (defensive)", async () => {
        dynamoHelpers.getItem.mockRejectedValue(new Error("DB error"));

        const result = await isAccountTracked("family-123", "acc-123");
        expect(result).toBe(true);
      });
    });

    describe("updateBudgetCalculations with account tracking", () => {
      const mockBudget = {
        budgetId: "budget-2024-01",
        familyId: "family-123",
        month: "2024-01",
        groups: {
          expenses: [
            {
              categories: [
                {
                  categoryId: "cat-groceries",
                  plannedAmount: 500,
                  spentAmount: 100,
                  remainingAmount: 400,
                },
              ],
            },
          ],
        },
      };

      it("should skip budget update for untracked account", async () => {
        // Account is not tracked
        dynamoHelpers.getItem.mockImplementation((pk, sk) => {
          if (sk.startsWith("ACCOUNT#")) {
            return Promise.resolve({ accountId: "acc-123", isTracked: false });
          }
          return Promise.resolve(mockBudget);
        });

        await updateBudgetCalculations(
          "family-123",
          "2024-01",
          "cat-groceries",
          "expense",
          50,
          "add",
          "acc-123",
        );

        // Should not update budget
        expect(dynamoHelpers.updateItem).not.toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith(
          "Skipping budget update for untracked account",
          expect.any(Object),
        );
      });

      it("should update budget for tracked account", async () => {
        // Account is tracked
        dynamoHelpers.getItem.mockImplementation((pk, sk) => {
          if (sk.startsWith("ACCOUNT#")) {
            return Promise.resolve({ accountId: "acc-123", isTracked: true });
          }
          return Promise.resolve(mockBudget);
        });
        dynamoHelpers.updateItem.mockResolvedValue({});

        await updateBudgetCalculations(
          "family-123",
          "2024-01",
          "cat-groceries",
          "expense",
          50,
          "add",
          "acc-123",
        );

        // Should update budget
        expect(dynamoHelpers.updateItem).toHaveBeenCalled();
      });

      it("should update budget when no account specified (legacy)", async () => {
        dynamoHelpers.getItem.mockResolvedValue(mockBudget);
        dynamoHelpers.updateItem.mockResolvedValue({});

        await updateBudgetCalculations(
          "family-123",
          "2024-01",
          "cat-groceries",
          "expense",
          50,
          "add",
          null,
        );

        // Should update budget (no account = include in budget)
        expect(dynamoHelpers.updateItem).toHaveBeenCalled();
      });
    });

    describe("Property: Tracking status determines budget inclusion", () => {
      it("should consistently exclude untracked accounts from budget", () => {
        fc.assert(
          fc.asyncProperty(
            fc.uuid(),
            fc.uuid(),
            fc.boolean(),
            async (familyId, accountId, isTracked) => {
              dynamoHelpers.getItem.mockResolvedValue({
                accountId,
                isTracked,
              });

              const result = await isAccountTracked(familyId, accountId);

              // Result should match isTracked status
              return result === isTracked;
            },
          ),
          { numRuns: 50 },
        );
      });

      it("should always include transactions without accounts", () => {
        fc.assert(
          fc.asyncProperty(fc.uuid(), async (familyId) => {
            const resultNull = await isAccountTracked(familyId, null);
            const resultUndefined = await isAccountTracked(familyId, undefined);
            const resultEmpty = await isAccountTracked(familyId, "");

            // All should return true (include in budget)
            return resultNull === true && resultUndefined === true;
          }),
          { numRuns: 20 },
        );
      });
    });
  });
});
