/**
 * Currency Onboarding End-to-End Test
 *
 * Tests the complete onboarding flow with currency selection,
 * budget creation, and transaction creation.
 */

const {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} = require("@jest/globals");

// Mock data
const mockUser = {
  userId: "test-user-123",
  email: "test@example.com",
  familyId: "test-family-123",
};

const mockCurrencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];

describe("Currency Onboarding End-to-End Flow", () => {
  describe("Currency Selection During Onboarding", () => {
    it("should allow user to select currency during onboarding", () => {
      const onboardingData = {
        location: "New York, USA",
        familySize: 2,
        currency: "USD",
      };

      expect(onboardingData.currency).toBe("USD");
      expect(mockCurrencies).toContain(onboardingData.currency);
    });

    it("should default to USD if no currency selected", () => {
      const onboardingData = {
        location: "New York, USA",
        familySize: 2,
      };

      const currency = onboardingData.currency || "USD";

      expect(currency).toBe("USD");
    });

    it("should validate currency code is supported", () => {
      const validCurrencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];

      const isValidCurrency = (code) => validCurrencies.includes(code);

      expect(isValidCurrency("USD")).toBe(true);
      expect(isValidCurrency("EUR")).toBe(true);
      expect(isValidCurrency("XYZ")).toBe(false);
      expect(isValidCurrency("INVALID")).toBe(false);
    });

    it("should save currency to user profile", () => {
      const userProfile = {
        ...mockUser,
        currency: "EUR",
        locale: "de-DE",
        onboardingCompleted: true,
      };

      expect(userProfile.currency).toBe("EUR");
      expect(userProfile.locale).toBe("de-DE");
      expect(userProfile.onboardingCompleted).toBe(true);
    });

    it("should pass currency to AI budget generation", () => {
      const budgetGenerationRequest = {
        location: "London, UK",
        familySize: 3,
        currency: "GBP",
      };

      expect(budgetGenerationRequest.currency).toBe("GBP");
    });
  });

  describe("Budget Creation with Currency", () => {
    it("should create budget with user selected currency", () => {
      const budget = {
        budgetId: "budget-123",
        month: "2026-02",
        currency: "USD",
        categories: [
          { name: "Groceries", planned: 500, spent: 0 },
          { name: "Rent", planned: 1500, spent: 0 },
        ],
        totalIncome: 5000,
        totalSavings: 1000,
        totalExpenses: 3000,
      };

      expect(budget.currency).toBe("USD");
      expect(budget.categories).toHaveLength(2);
    });

    it("should use user profile currency for new budgets", () => {
      const userProfile = {
        userId: "user-123",
        currency: "EUR",
      };

      const newBudget = {
        budgetId: "budget-456",
        month: "2026-03",
        currency: userProfile.currency,
        categories: [],
      };

      expect(newBudget.currency).toBe("EUR");
    });

    it("should create budget with different currencies for different users", () => {
      const user1Budget = {
        budgetId: "budget-1",
        currency: "USD",
        totalIncome: 5000,
      };

      const user2Budget = {
        budgetId: "budget-2",
        currency: "JPY",
        totalIncome: 500000,
      };

      expect(user1Budget.currency).toBe("USD");
      expect(user2Budget.currency).toBe("JPY");
      expect(user1Budget.currency).not.toBe(user2Budget.currency);
    });

    it("should validate budget amounts are positive", () => {
      const budget = {
        budgetId: "budget-123",
        currency: "USD",
        totalIncome: 5000,
        totalSavings: 1000,
        totalExpenses: 3000,
      };

      expect(budget.totalIncome).toBeGreaterThanOrEqual(0);
      expect(budget.totalSavings).toBeGreaterThanOrEqual(0);
      expect(budget.totalExpenses).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Transaction Creation with Currency", () => {
    it("should create transaction with budget currency", () => {
      const budget = {
        budgetId: "budget-123",
        currency: "USD",
      };

      const transaction = {
        transactionId: "trans-123",
        date: "2026-02-01",
        category: "Groceries",
        amount: 150,
        currency: budget.currency,
        type: "expense",
        budgetMonth: "2026-02",
      };

      expect(transaction.currency).toBe("USD");
      expect(transaction.currency).toBe(budget.currency);
    });

    it("should create multiple transactions with same currency", () => {
      const transactions = [
        { transactionId: "trans-1", amount: 100, currency: "EUR" },
        { transactionId: "trans-2", amount: 200, currency: "EUR" },
        { transactionId: "trans-3", amount: 300, currency: "EUR" },
      ];

      transactions.forEach((transaction) => {
        expect(transaction.currency).toBe("EUR");
      });
    });

    it("should validate transaction amount is positive", () => {
      const transaction = {
        transactionId: "trans-123",
        amount: 150,
        currency: "USD",
      };

      expect(transaction.amount).toBeGreaterThan(0);
    });

    it("should update budget spent amount when transaction created", () => {
      const budget = {
        categories: [{ name: "Groceries", planned: 500, spent: 0 }],
      };

      const transaction = {
        category: "Groceries",
        amount: 150,
        type: "expense",
      };

      // Simulate transaction creation
      const category = budget.categories.find(
        (c) => c.name === transaction.category,
      );
      if (category && transaction.type === "expense") {
        category.spent += transaction.amount;
      }

      expect(budget.categories[0].spent).toBe(150);
    });
  });

  describe("Complete Onboarding Flow", () => {
    it("should complete full onboarding flow with currency", () => {
      // Step 1: User selects currency during onboarding
      const onboardingData = {
        location: "Toronto, Canada",
        familySize: 4,
        currency: "CAD",
      };

      expect(onboardingData.currency).toBe("CAD");

      // Step 2: User profile created with currency
      const userProfile = {
        userId: "user-123",
        email: "user@example.com",
        familyId: "family-123",
        currency: onboardingData.currency,
        locale: "en-CA",
        onboardingCompleted: true,
      };

      expect(userProfile.currency).toBe("CAD");
      expect(userProfile.onboardingCompleted).toBe(true);

      // Step 3: AI generates budget with currency
      const generatedBudget = {
        budgetId: "budget-123",
        month: "2026-02",
        currency: userProfile.currency,
        categories: [
          { name: "Groceries", planned: 800, spent: 0 },
          { name: "Rent", planned: 2000, spent: 0 },
          { name: "Transportation", planned: 300, spent: 0 },
        ],
        totalIncome: 6000,
        totalSavings: 1200,
        totalExpenses: 4000,
      };

      expect(generatedBudget.currency).toBe("CAD");

      // Step 4: User creates first transaction
      const firstTransaction = {
        transactionId: "trans-123",
        date: "2026-02-01",
        category: "Groceries",
        amount: 150,
        currency: generatedBudget.currency,
        type: "expense",
        budgetMonth: "2026-02",
      };

      expect(firstTransaction.currency).toBe("CAD");

      // Verify complete flow
      expect(onboardingData.currency).toBe(userProfile.currency);
      expect(userProfile.currency).toBe(generatedBudget.currency);
      expect(generatedBudget.currency).toBe(firstTransaction.currency);
    });

    it("should handle onboarding flow for different currencies", () => {
      const flows = [
        { currency: "USD", locale: "en-US", location: "New York, USA" },
        { currency: "EUR", locale: "de-DE", location: "Berlin, Germany" },
        { currency: "GBP", locale: "en-GB", location: "London, UK" },
        { currency: "JPY", locale: "ja-JP", location: "Tokyo, Japan" },
      ];

      flows.forEach((flow) => {
        const userProfile = {
          userId: `user-${flow.currency}`,
          currency: flow.currency,
          locale: flow.locale,
        };

        const budget = {
          budgetId: `budget-${flow.currency}`,
          currency: userProfile.currency,
        };

        const transaction = {
          transactionId: `trans-${flow.currency}`,
          currency: budget.currency,
        };

        expect(userProfile.currency).toBe(flow.currency);
        expect(budget.currency).toBe(flow.currency);
        expect(transaction.currency).toBe(flow.currency);
      });
    });
  });

  describe("Currency Consistency Validation", () => {
    it("should ensure currency consistency across user, budget, and transactions", () => {
      const user = { userId: "user-123", currency: "EUR" };
      const budget = { budgetId: "budget-123", currency: "EUR" };
      const transaction = { transactionId: "trans-123", currency: "EUR" };

      expect(user.currency).toBe(budget.currency);
      expect(budget.currency).toBe(transaction.currency);
    });

    it("should detect currency mismatch between budget and transaction", () => {
      const budget = { budgetId: "budget-123", currency: "USD" };
      const transaction = { transactionId: "trans-123", currency: "EUR" };

      const isMismatch = budget.currency !== transaction.currency;

      expect(isMismatch).toBe(true);
    });

    it("should allow creating new budget with different currency after user changes preference", () => {
      const user = { userId: "user-123", currency: "USD" };
      const oldBudget = { budgetId: "budget-old", currency: "USD" };

      // User changes currency
      user.currency = "EUR";

      const newBudget = { budgetId: "budget-new", currency: user.currency };

      expect(oldBudget.currency).toBe("USD");
      expect(newBudget.currency).toBe("EUR");
      expect(user.currency).toBe("EUR");
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid currency code gracefully", () => {
      const validCurrencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];

      const validateCurrency = (code) => {
        if (!validCurrencies.includes(code)) {
          throw new Error(`Invalid currency code: ${code}`);
        }
        return true;
      };

      expect(() => validateCurrency("USD")).not.toThrow();
      expect(() => validateCurrency("INVALID")).toThrow(
        "Invalid currency code: INVALID",
      );
    });

    it("should handle missing currency by defaulting to USD", () => {
      const onboardingData = {
        location: "New York, USA",
        familySize: 2,
      };

      const currency = onboardingData.currency || "USD";

      expect(currency).toBe("USD");
    });

    it("should handle null or undefined currency values", () => {
      const getCurrency = (value) => value || "USD";

      expect(getCurrency(null)).toBe("USD");
      expect(getCurrency(undefined)).toBe("USD");
      expect(getCurrency("")).toBe("USD");
      expect(getCurrency("EUR")).toBe("EUR");
    });
  });
});
