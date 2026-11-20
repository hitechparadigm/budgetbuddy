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
            "budget_test",
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
            "budget_test",
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
   * Accounts live in the BUDGET# partition (ADR-001). The FAMILY# prefix is
   * deprecated, and the account item must carry no GSI1 entry.
   */
  describe("BUDGET# partition keys", () => {
    it("writes every account under BUDGET# with no GSI1 entry", async () => {
      await fc.assert(
        fc.asyncProperty(validAccountInputArb, async (input) => {
          const { dynamoHelpers } = require("/opt/nodejs/utils");
          dynamoHelpers.putItem.mockImplementation(async (item) => item);

          await repository.createAccount("budget_test", input);

          const [item] = dynamoHelpers.putItem.mock.calls.at(-1);
          expect(item.PK).toBe("BUDGET#budget_test");
          expect(item.PK.startsWith("FAMILY#")).toBe(false);
          expect(item.SK.startsWith("ACCOUNT#")).toBe(true);
          expect(item.GSI1PK).toBeUndefined();
          expect(item.GSI1SK).toBeUndefined();
          expect(item.budgetId).toBe("budget_test");
          expect(item.familyId).toBeUndefined();
        }),
        { numRuns: 50 },
      );
    });

    it("reads, updates and deletes against BUDGET# keys", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");
      dynamoHelpers.getItem.mockResolvedValue({
        accountId: "acc_1",
        budgetId: "budget_test",
        entityType: "ACCOUNT",
        accountType: "banking",
        accountSubtype: "checking",
        nickname: "Checking",
        currentBalance: 100,
        currency: "USD",
        isManual: true,
        isTracked: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      });
      dynamoHelpers.updateItem.mockImplementation(async (pk, sk, updates) => ({
        accountId: "acc_1",
        budgetId: "budget_test",
        entityType: "ACCOUNT",
        accountType: "banking",
        currentBalance: 100,
        isManual: true,
        ...updates,
      }));

      await repository.getAccount("budget_test", "acc_1");
      await repository.updateAccount("budget_test", "acc_1", { nickname: "x" });
      await repository.deleteAccount("budget_test", "acc_1", "user_1");

      for (const [pk, sk] of dynamoHelpers.getItem.mock.calls) {
        expect(pk).toBe("BUDGET#budget_test");
        expect(sk).toBe("ACCOUNT#acc_1");
      }
      for (const [pk, sk] of dynamoHelpers.updateItem.mock.calls) {
        expect(pk).toBe("BUDGET#budget_test");
        expect(sk).toBe("ACCOUNT#acc_1");
      }
    });

    it("queries the BUDGET# partition when listing", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");
      dynamoHelpers.queryByPK.mockResolvedValue([]);

      await repository.getAccounts("budget_test");

      const [pk] = dynamoHelpers.queryByPK.mock.calls[0];
      expect(pk).toBe("BUDGET#budget_test");
    });
  });

  /**
   * auth-onboarding writes the default "Cash" account directly, using
   * `balance` instead of `currentBalance` and omitting isTracked. Those rows
   * only became visible to GET /accounts once this repository moved to
   * BUDGET# keys, so the response formatter must tolerate them.
   */
  describe("onboarding-written Cash account", () => {
    /** Exactly what backend/functions/auth-onboarding/index.js writes. */
    const onboardingCashAccount = {
      PK: "BUDGET#budget_test",
      SK: "ACCOUNT#acc_cash",
      entityType: "ACCOUNT",
      accountId: "acc_cash",
      budgetId: "budget_test",
      userId: "user_1",
      nickname: "Cash",
      accountType: "cash",
      accountSubtype: "cash",
      balance: 0,
      currency: "USD",
      isDefault: true,
      isManual: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    it("formats with a numeric currentBalance of 0 and isTracked true", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");
      dynamoHelpers.getItem.mockResolvedValue({ ...onboardingCashAccount });

      const account = await repository.getAccount("budget_test", "acc_cash");

      expect(account.currentBalance).toBe(0);
      expect(typeof account.currentBalance).toBe("number");
      expect(account.isTracked).toBe(true);
      expect(account.isManual).toBe(true);
      expect(account.nickname).toBe("Cash");
      expect(account.institutionName).toBeNull();
      expect(account.mask).toBeNull();
    });

    it("appears in the account list with a defined balance", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");
      dynamoHelpers.queryByPK.mockResolvedValue([{ ...onboardingCashAccount }]);

      const accounts = await repository.getAccounts("budget_test");

      expect(accounts).toHaveLength(1);
      expect(accounts[0].currentBalance).toBe(0);
      expect(accounts[0].currentBalance).not.toBeUndefined();
    });

    it("does not mask a real currentBalance when both fields are present", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");
      dynamoHelpers.getItem.mockResolvedValue({
        ...onboardingCashAccount,
        currentBalance: 250,
        balance: 0,
      });

      const account = await repository.getAccount("budget_test", "acc_cash");
      expect(account.currentBalance).toBe(250);
    });

    it("counts toward the summary totals rather than producing NaN", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");
      dynamoHelpers.queryByPK.mockResolvedValue([
        { ...onboardingCashAccount, balance: 40 },
      ]);

      const summary = await repository.getAccountsSummary("budget_test");

      expect(summary.totalAssets).toBe(40);
      expect(Number.isNaN(summary.netWorth)).toBe(false);
      expect(summary.netWorth).toBe(40);
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
              budgetId: "budget_test",
              entityType: "ACCOUNT",
              ...input,
              isManual: true,
              isTracked: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));

            dynamoHelpers.queryByPK.mockResolvedValue(accounts);

            // Get accounts
            const result = await repository.getAccounts("budget_test");

            // Get summary which groups by type
            const summary =
              await repository.getAccountsSummary("budget_test");

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
              budgetId: "budget_test",
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
                "budget_test",
                "test-acc-id",
                balanceChange,
              );
            }

            // Verify final balance
            const finalAccount = await repository.getAccount(
              "budget_test",
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
              budgetId: "budget_test",
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
              await repository.getAccountsSummary("budget_test");

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

  /**
   * Property 4: Account Validation Rejects Invalid Input
   * For any invalid account input (wrong type, mismatched subtype, empty nickname,
   * missing balance), validation SHALL reject with appropriate error messages.
   *
   * **Validates: Requirements 2.5, 2.7**
   */
  describe("Property 4: Account Validation Rejects Invalid Input", () => {
    it("should reject accounts with invalid account types", async () => {
      const invalidTypeArb = fc
        .string({ minLength: 1, maxLength: 20 })
        .filter(
          (s) =>
            !["banking", "cash", "credit_card", "investment", "loan"].includes(
              s,
            ),
        );

      await fc.assert(
        fc.property(
          fc.record({
            accountType: invalidTypeArb,
            accountSubtype: fc.string({ minLength: 1, maxLength: 20 }),
            nickname: fc.string({ minLength: 1, maxLength: 100 }),
            currentBalance: fc.double({
              min: -1000000,
              max: 1000000,
              noNaN: true,
            }),
          }),
          (input) => {
            const result = validators.validateCreateAccountInput(input);
            expect(result.isValid).toBe(false);
            expect(result.errors.some((e) => e.includes("accountType"))).toBe(
              true,
            );
          },
        ),
        { numRuns: 50 },
      );
    });

    it("should reject accounts with mismatched subtypes", async () => {
      // Generate valid type with wrong subtype
      const mismatchedInputArb = fc.oneof(
        // banking with credit_card subtype
        fc.record({
          accountType: fc.constant("banking"),
          accountSubtype: fc.constant("credit_card"),
          nickname: fc.string({ minLength: 1, maxLength: 100 }),
          currentBalance: fc.double({
            min: -1000000,
            max: 1000000,
            noNaN: true,
          }),
        }),
        // credit_card with checking subtype
        fc.record({
          accountType: fc.constant("credit_card"),
          accountSubtype: fc.constant("checking"),
          nickname: fc.string({ minLength: 1, maxLength: 100 }),
          currentBalance: fc.double({
            min: -1000000,
            max: 1000000,
            noNaN: true,
          }),
        }),
        // investment with savings subtype
        fc.record({
          accountType: fc.constant("investment"),
          accountSubtype: fc.constant("savings"),
          nickname: fc.string({ minLength: 1, maxLength: 100 }),
          currentBalance: fc.double({
            min: -1000000,
            max: 1000000,
            noNaN: true,
          }),
        }),
      );

      await fc.assert(
        fc.property(mismatchedInputArb, (input) => {
          const result = validators.validateCreateAccountInput(input);
          expect(result.isValid).toBe(false);
          expect(result.errors.some((e) => e.includes("accountSubtype"))).toBe(
            true,
          );
        }),
        { numRuns: 30 },
      );
    });

    it("should reject accounts with empty or whitespace-only nicknames", async () => {
      const emptyNicknameArb = fc.oneof(
        fc.constant(""),
        fc.constant("   "),
        fc.constant("\t\n"),
      );

      await fc.assert(
        fc.property(
          fc.record({
            accountType: accountTypeArb,
            accountSubtype: fc.constant("checking"),
            nickname: emptyNicknameArb,
            currentBalance: fc.double({
              min: -1000000,
              max: 1000000,
              noNaN: true,
            }),
          }),
          (input) => {
            // Fix subtype to match type
            if (input.accountType === "banking") {
              input.accountSubtype = "checking";
            } else if (input.accountType === "credit_card") {
              input.accountSubtype = "credit_card";
            } else if (input.accountType === "investment") {
              input.accountSubtype = "brokerage";
            } else if (input.accountType === "loan") {
              input.accountSubtype = "personal";
            } else if (input.accountType === "cash") {
              input.accountSubtype = "cash";
            }

            const result = validators.validateCreateAccountInput(input);
            expect(result.isValid).toBe(false);
            expect(result.errors.some((e) => e.includes("nickname"))).toBe(
              true,
            );
          },
        ),
        { numRuns: 20 },
      );
    });

    it("should reject accounts with missing or invalid balance", async () => {
      await fc.assert(
        fc.property(
          fc.record({
            accountType: accountTypeArb,
            accountSubtype: fc.constant("checking"),
            nickname: fc.string({ minLength: 1, maxLength: 100 }),
            // Missing currentBalance or invalid value
          }),
          (input) => {
            // Fix subtype to match type
            if (input.accountType === "banking") {
              input.accountSubtype = "checking";
            } else if (input.accountType === "credit_card") {
              input.accountSubtype = "credit_card";
            } else if (input.accountType === "investment") {
              input.accountSubtype = "brokerage";
            } else if (input.accountType === "loan") {
              input.accountSubtype = "personal";
            } else if (input.accountType === "cash") {
              input.accountSubtype = "cash";
            }

            // Ensure nickname is not empty
            if (!input.nickname || input.nickname.trim() === "") {
              input.nickname = "Test Account";
            }

            const result = validators.validateCreateAccountInput(input);
            expect(result.isValid).toBe(false);
            expect(
              result.errors.some((e) => e.includes("currentBalance")),
            ).toBe(true);
          },
        ),
        { numRuns: 30 },
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
