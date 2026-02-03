/**
 * Property-Based Tests for Accounts Lambda
 *
 * Tests universal properties that should hold across all valid inputs.
 * Uses fast-check for property-based testing.
 */

const fc = require("fast-check");

// Mocks are loaded via jest.config.js moduleNameMapper
const validators = require("./validators");
const service = require("./service");
const repository = require("./repository");

// ============================================================================
// Arbitraries (Test Data Generators)
// ============================================================================

const accountTypeArb = fc.constantFrom(
  "banking",
  "cash",
  "credit_card",
  "investment",
  "loan",
);

const accountSubtypeArb = (accountType) => {
  const subtypes = validators.ACCOUNT_SUBTYPES[accountType] || [];
  return fc.constantFrom(...subtypes);
};

const validAccountInputArb = fc
  .record({
    accountType: accountTypeArb,
  })
  .chain(({ accountType }) =>
    fc.record({
      accountType: fc.constant(accountType),
      accountSubtype: accountSubtypeArb(accountType),
      nickname: fc
        .string({ minLength: 1, maxLength: 100 })
        .filter((s) => s.trim().length > 0),
      institutionName: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
      currentBalance: fc.double({ min: -1000000, max: 1000000, noNaN: true }),
      currency: fc.constantFrom("USD", "CAD", "EUR", "GBP"),
    }),
  );

const transactionTypeArb = fc.constantFrom("income", "expense");

const positiveAmountArb = fc.double({ min: 0.01, max: 100000, noNaN: true });

// ============================================================================
// Property Tests
// ============================================================================

describe("Account Property-Based Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 5: Account CRUD Round-Trip
   * For any valid account data, creating an account then retrieving it
   * SHALL return an equivalent account object with all fields preserved.
   *
   * **Validates: Requirements 2.5, 2.7**
   */
  describe("Property 5: Account CRUD Round-Trip", () => {
    it("should preserve all fields when creating and retrieving an account", async () => {
      await fc.assert(
        fc.asyncProperty(validAccountInputArb, async (input) => {
          const { dynamoHelpers } = require("/opt/nodejs/utils");

          // Setup mock to store and return the account
          let storedAccount = null;
          dynamoHelpers.putItem.mockImplementation(async (item) => {
            storedAccount = item;
            return item;
          });
          dynamoHelpers.getItem.mockImplementation(async () => storedAccount);

          // Create account
          const created = await repository.createAccount(
            "test-family-id",
            input,
          );

          // Verify created account has all input fields
          expect(created.accountType).toBe(input.accountType);
          expect(created.accountSubtype).toBe(input.accountSubtype);
          expect(created.nickname).toBe(input.nickname);
          // institutionName: empty string is normalized to null
          expect(created.institutionName).toBe(input.institutionName || null);
          expect(created.currentBalance).toBe(input.currentBalance);
          expect(created.currency).toBe(input.currency);
          expect(created.isManual).toBe(true);
          expect(created.isTracked).toBe(true);

          // Retrieve account
          const retrieved = await repository.getAccount(
            "test-family-id",
            created.accountId,
          );

          // Verify retrieved matches created
          expect(retrieved.accountId).toBe(created.accountId);
          expect(retrieved.accountType).toBe(created.accountType);
          expect(retrieved.accountSubtype).toBe(created.accountSubtype);
          expect(retrieved.nickname).toBe(created.nickname);
          expect(retrieved.currentBalance).toBe(created.currentBalance);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 6: Account Grouping Consistency
   * For any set of accounts, displaying them SHALL group them correctly
   * by accountType, with each account appearing in exactly one group.
   *
   * **Validates: Requirements 2.6**
   */
  describe("Property 6: Account Grouping Consistency", () => {
    it("should group accounts correctly by type with no duplicates", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validAccountInputArb, { minLength: 1, maxLength: 20 }),
          async (inputs) => {
            const { dynamoHelpers } = require("/opt/nodejs/utils");

            // Create accounts and store them
            const accounts = inputs.map((input, index) => ({
              accountId: `acc-${index}`,
              familyId: "test-family-id",
              entityType: "ACCOUNT",
              ...input,
              isManual: true,
              isTracked: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));

            dynamoHelpers.queryByPK.mockResolvedValue(accounts);

            // Get accounts
            const result = await repository.getAccounts("test-family-id");

            // Get summary which groups by type
            const summary =
              await repository.getAccountsSummary("test-family-id");

            // Verify each account appears in exactly one group
            const allGroupedAccounts = Object.values(
              summary.accountsByType,
            ).flat();
            const groupedIds = allGroupedAccounts.map((a) => a.accountId);
            const uniqueIds = [...new Set(groupedIds)];

            // No duplicates
            expect(groupedIds.length).toBe(uniqueIds.length);

            // All accounts are grouped
            expect(groupedIds.length).toBe(result.length);

            // Each account is in the correct group
            for (const [type, typeAccounts] of Object.entries(
              summary.accountsByType,
            )) {
              for (const account of typeAccounts) {
                expect(account.accountType).toBe(type);
              }
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 9: Balance Consistency
   * For any account with initial balance B and a sequence of transactions,
   * the final balance SHALL equal B + sum(balanceChange(Ti)).
   *
   * **Validates: Requirements 3.2, 3.3, 3.4**
   */
  describe("Property 9: Balance Consistency", () => {
    it("should maintain correct balance after transaction sequence", async () => {
      await fc.assert(
        fc.asyncProperty(
          validAccountInputArb,
          fc.array(
            fc.record({
              type: transactionTypeArb,
              amount: positiveAmountArb,
            }),
            { minLength: 1, maxLength: 20 },
          ),
          async (accountInput, transactions) => {
            const { dynamoHelpers } = require("/opt/nodejs/utils");

            const initialBalance = accountInput.currentBalance;
            let currentBalance = initialBalance;

            // Setup mock
            let storedAccount = {
              accountId: "test-acc-id",
              familyId: "test-family-id",
              entityType: "ACCOUNT",
              ...accountInput,
              currentBalance: initialBalance,
            };

            dynamoHelpers.getItem.mockImplementation(async () => ({
              ...storedAccount,
            }));
            dynamoHelpers.updateItem.mockImplementation(
              async (pk, sk, updates) => {
                storedAccount = { ...storedAccount, ...updates };
                return storedAccount;
              },
            );

            // Apply each transaction
            for (const txn of transactions) {
              const balanceChange = service.calculateBalanceChange(
                txn.type,
                txn.amount,
                accountInput.accountType,
              );

              currentBalance += balanceChange;

              // Update account balance
              await repository.updateAccountBalance(
                "test-family-id",
                "test-acc-id",
                balanceChange,
              );
            }

            // Verify final balance
            const finalAccount = await repository.getAccount(
              "test-family-id",
              "test-acc-id",
            );

            // Allow for floating point precision issues
            expect(finalAccount.currentBalance).toBeCloseTo(currentBalance, 2);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 10: Net Worth Calculation
   * For any set of accounts, net worth SHALL equal
   * sum(asset balances) - sum(liability balances).
   *
   * **Validates: Requirements 3.5**
   */
  describe("Property 10: Net Worth Calculation", () => {
    it("should calculate net worth correctly as assets minus liabilities", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validAccountInputArb, { minLength: 1, maxLength: 20 }),
          async (inputs) => {
            const { dynamoHelpers } = require("/opt/nodejs/utils");

            // Create accounts
            const accounts = inputs.map((input, index) => ({
              accountId: `acc-${index}`,
              familyId: "test-family-id",
              entityType: "ACCOUNT",
              ...input,
              isManual: true,
              isTracked: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));

            dynamoHelpers.queryByPK.mockResolvedValue(accounts);

            // Calculate expected values
            let expectedAssets = 0;
            let expectedLiabilities = 0;

            for (const account of accounts) {
              if (validators.isAssetAccount(account.accountType)) {
                expectedAssets += account.currentBalance;
              } else if (validators.isLiabilityAccount(account.accountType)) {
                expectedLiabilities += Math.abs(account.currentBalance);
              }
            }

            const expectedNetWorth = expectedAssets - expectedLiabilities;

            // Get summary
            const summary =
              await repository.getAccountsSummary("test-family-id");

            // Verify calculations
            expect(summary.totalAssets).toBeCloseTo(expectedAssets, 2);
            expect(summary.totalLiabilities).toBeCloseTo(
              expectedLiabilities,
              2,
            );
            expect(summary.netWorth).toBeCloseTo(expectedNetWorth, 2);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

// ============================================================================
// Unit Tests for Validators
// ============================================================================

describe("Account Validators", () => {
  describe("validateCreateAccountInput", () => {
    it("should accept valid input", () => {
      const input = {
        accountType: "banking",
        accountSubtype: "checking",
        nickname: "My Checking",
        currentBalance: 1000,
      };

      const result = validators.validateCreateAccountInput(input);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid account type", () => {
      const input = {
        accountType: "invalid",
        accountSubtype: "checking",
        nickname: "My Account",
        currentBalance: 1000,
      };

      const result = validators.validateCreateAccountInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("accountType"))).toBe(true);
    });

    it("should reject mismatched subtype", () => {
      const input = {
        accountType: "banking",
        accountSubtype: "credit_card", // Wrong subtype for banking
        nickname: "My Account",
        currentBalance: 1000,
      };

      const result = validators.validateCreateAccountInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("accountSubtype"))).toBe(
        true,
      );
    });

    it("should reject empty nickname", () => {
      const input = {
        accountType: "banking",
        accountSubtype: "checking",
        nickname: "",
        currentBalance: 1000,
      };

      const result = validators.validateCreateAccountInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("nickname"))).toBe(true);
    });

    it("should reject missing balance", () => {
      const input = {
        accountType: "banking",
        accountSubtype: "checking",
        nickname: "My Account",
      };

      const result = validators.validateCreateAccountInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("currentBalance"))).toBe(
        true,
      );
    });
  });

  describe("isAssetAccount / isLiabilityAccount", () => {
    it("should classify banking as asset", () => {
      expect(validators.isAssetAccount("banking")).toBe(true);
      expect(validators.isLiabilityAccount("banking")).toBe(false);
    });

    it("should classify credit_card as liability", () => {
      expect(validators.isAssetAccount("credit_card")).toBe(false);
      expect(validators.isLiabilityAccount("credit_card")).toBe(true);
    });

    it("should classify investment as asset", () => {
      expect(validators.isAssetAccount("investment")).toBe(true);
      expect(validators.isLiabilityAccount("investment")).toBe(false);
    });

    it("should classify loan as liability", () => {
      expect(validators.isAssetAccount("loan")).toBe(false);
      expect(validators.isLiabilityAccount("loan")).toBe(true);
    });
  });
});

// ============================================================================
// Unit Tests for Balance Calculation
// ============================================================================

describe("Balance Calculation", () => {
  describe("calculateBalanceChange", () => {
    it("should increase asset balance for income", () => {
      const change = service.calculateBalanceChange("income", 100, "banking");
      expect(change).toBe(100);
    });

    it("should decrease asset balance for expense", () => {
      const change = service.calculateBalanceChange("expense", 100, "banking");
      expect(change).toBe(-100);
    });

    it("should decrease liability balance for income (payment)", () => {
      const change = service.calculateBalanceChange(
        "income",
        100,
        "credit_card",
      );
      expect(change).toBe(-100);
    });

    it("should increase liability balance for expense (charge)", () => {
      const change = service.calculateBalanceChange(
        "expense",
        100,
        "credit_card",
      );
      expect(change).toBe(100);
    });
  });
});
