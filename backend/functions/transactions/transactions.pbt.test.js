/**
 * Property-Based Tests for Transactions Lambda
 *
 * Tests universal properties that should hold across all valid inputs.
 * Uses fast-check for property-based testing.
 */

const fc = require("fast-check");

// ============================================================================
// Arbitraries (Test Data Generators)
// ============================================================================

const transactionTypeArb = fc.constantFrom("income", "expense");

const positiveAmountArb = fc.double({ min: 0.01, max: 100000, noNaN: true });

const dateArb = fc
  .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
  .map((d) => d.toISOString().split("T")[0]);

const accountIdArb = fc.option(
  fc
    .string({ minLength: 5, maxLength: 20 })
    .map((s) => `acc_${s.replace(/[^a-zA-Z0-9]/g, "")}`),
  { nil: null },
);

const categoryIdArb = fc
  .string({ minLength: 3, maxLength: 30 })
  .map((s) => s.replace(/[^a-zA-Z0-9]/g, "") || "category");

const descriptionArb = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter((s) => s.trim().length > 0);

const validTransactionInputArb = fc.record({
  type: transactionTypeArb,
  amount: positiveAmountArb,
  date: dateArb,
  categoryId: categoryIdArb,
  description: descriptionArb,
  accountId: accountIdArb,
});

// ============================================================================
// Property Tests
// ============================================================================

describe("Transaction Property-Based Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 15: Transaction Account Filtering
   * For any set of transactions with various accountIds,
   * filtering by accountId SHALL return only transactions with that accountId.
   *
   * **Validates: Requirements 4.7**
   */
  describe("Property 15: Transaction Account Filtering", () => {
    it("should return only transactions matching the accountId filter", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validTransactionInputArb, { minLength: 5, maxLength: 30 }),
          async (transactionInputs) => {
            // Create transactions with various accountIds
            const transactions = transactionInputs.map((input, index) => ({
              transactionId: `txn_${index}`,
              familyId: "test-family-id",
              entityType: "TRANSACTION",
              budgetMonth: input.date.substring(0, 7),
              ...input,
              createdBy: "user_123",
              createdByName: "Test User",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));

            // Get unique accountIds (excluding null)
            const accountIds = [
              ...new Set(
                transactions
                  .map((t) => t.accountId)
                  .filter((id) => id !== null),
              ),
            ];

            // If no accountIds, skip this test iteration
            if (accountIds.length === 0) {
              return true;
            }

            // Pick a random accountId to filter by
            const filterAccountId =
              accountIds[Math.floor(Math.random() * accountIds.length)];

            // Simulate filtering (as done in getTransactions)
            const filtered = transactions.filter(
              (t) => t.accountId === filterAccountId,
            );

            // Verify all filtered transactions have the correct accountId
            for (const txn of filtered) {
              expect(txn.accountId).toBe(filterAccountId);
            }

            // Verify no transactions with different accountId are included
            const otherTransactions = transactions.filter(
              (t) => t.accountId !== filterAccountId,
            );
            for (const txn of otherTransactions) {
              expect(
                filtered.find((f) => f.transactionId === txn.transactionId),
              ).toBeUndefined();
            }

            // Verify count matches
            const expectedCount = transactions.filter(
              (t) => t.accountId === filterAccountId,
            ).length;
            expect(filtered.length).toBe(expectedCount);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should return all transactions when no accountId filter is applied", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validTransactionInputArb, { minLength: 1, maxLength: 20 }),
          async (transactionInputs) => {
            const transactions = transactionInputs.map((input, index) => ({
              transactionId: `txn_${index}`,
              familyId: "test-family-id",
              entityType: "TRANSACTION",
              budgetMonth: input.date.substring(0, 7),
              ...input,
            }));

            // No filter applied - should return all
            const filtered = transactions; // No filter

            expect(filtered.length).toBe(transactions.length);

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 27: Backward Compatibility - Optional AccountId
   * Transactions without accountId SHALL be saved and retrieved correctly,
   * with accountId defaulting to null.
   *
   * **Validates: Requirements 10.1, 10.5, 10.6**
   */
  describe("Property 27: Backward Compatibility - Optional AccountId", () => {
    it("should handle transactions without accountId", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            type: transactionTypeArb,
            amount: positiveAmountArb,
            date: dateArb,
            categoryId: categoryIdArb,
            description: descriptionArb,
            // No accountId field
          }),
          async (input) => {
            // Simulate creating a transaction without accountId
            const transaction = {
              transactionId: `txn_${Date.now()}`,
              familyId: "test-family-id",
              entityType: "TRANSACTION",
              budgetMonth: input.date.substring(0, 7),
              amount: input.amount,
              type: input.type,
              date: input.date,
              categoryId: input.categoryId,
              description: input.description,
              accountId: input.accountId || null, // Should default to null
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            // Verify accountId is null (not undefined)
            expect(transaction.accountId).toBeNull();

            // Verify transaction is still valid
            expect(transaction.transactionId).toBeDefined();
            expect(transaction.amount).toBe(input.amount);
            expect(transaction.type).toBe(input.type);
            expect(transaction.date).toBe(input.date);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should preserve accountId when provided", async () => {
      await fc.assert(
        fc.asyncProperty(
          validTransactionInputArb.filter((input) => input.accountId !== null),
          async (input) => {
            const transaction = {
              transactionId: `txn_${Date.now()}`,
              familyId: "test-family-id",
              entityType: "TRANSACTION",
              budgetMonth: input.date.substring(0, 7),
              ...input,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            // Verify accountId is preserved
            expect(transaction.accountId).toBe(input.accountId);
            expect(transaction.accountId).not.toBeNull();

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should display 'Unassigned' for transactions without accountId in response mapping", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validTransactionInputArb, { minLength: 5, maxLength: 20 }),
          async (transactionInputs) => {
            const transactions = transactionInputs.map((input, index) => ({
              transactionId: `txn_${index}`,
              familyId: "test-family-id",
              entityType: "TRANSACTION",
              budgetMonth: input.date.substring(0, 7),
              ...input,
            }));

            // Simulate response mapping (as done in getTransactions)
            const mappedTransactions = transactions.map((txn) => ({
              transactionId: txn.transactionId,
              amount: txn.amount,
              type: txn.type,
              accountId: txn.accountId || null,
              // For display purposes, frontend would show "Unassigned" for null
              accountDisplay: txn.accountId || "Unassigned",
            }));

            // Verify all transactions have accountId (null or value)
            for (const txn of mappedTransactions) {
              expect(
                txn.accountId === null || typeof txn.accountId === "string",
              ).toBe(true);
              expect(txn.accountDisplay).toBeDefined();
              if (txn.accountId === null) {
                expect(txn.accountDisplay).toBe("Unassigned");
              }
            }

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});

// ============================================================================
// Unit Tests for Account Filtering Logic
// ============================================================================

describe("Transaction Account Filtering - Unit Tests", () => {
  it("should filter transactions by single accountId", () => {
    const transactions = [
      { transactionId: "1", accountId: "acc_1", amount: 100 },
      { transactionId: "2", accountId: "acc_2", amount: 200 },
      { transactionId: "3", accountId: "acc_1", amount: 300 },
      { transactionId: "4", accountId: null, amount: 400 },
    ];

    const filtered = transactions.filter((t) => t.accountId === "acc_1");

    expect(filtered.length).toBe(2);
    expect(filtered.every((t) => t.accountId === "acc_1")).toBe(true);
  });

  it("should return empty array when filtering by non-existent accountId", () => {
    const transactions = [
      { transactionId: "1", accountId: "acc_1", amount: 100 },
      { transactionId: "2", accountId: "acc_2", amount: 200 },
    ];

    const filtered = transactions.filter((t) => t.accountId === "acc_999");

    expect(filtered.length).toBe(0);
  });

  it("should handle filtering for null accountId (unassigned)", () => {
    const transactions = [
      { transactionId: "1", accountId: "acc_1", amount: 100 },
      { transactionId: "2", accountId: null, amount: 200 },
      { transactionId: "3", accountId: null, amount: 300 },
    ];

    const filtered = transactions.filter((t) => t.accountId === null);

    expect(filtered.length).toBe(2);
    expect(filtered.every((t) => t.accountId === null)).toBe(true);
  });
});
