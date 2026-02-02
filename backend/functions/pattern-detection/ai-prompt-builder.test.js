/**
 * AI Prompt Builder Tests
 *
 * Unit tests for AI prompt construction and validation.
 */

const {
  buildPatternDetectionPrompt,
  buildBudgetPlanningPrompt,
  validatePatternDetectionPrompt,
  validateBudgetPlanningPrompt,
  extractJsonFromResponse,
} = require("./ai-prompt-builder");

describe("AI Prompt Builder", () => {
  describe("buildPatternDetectionPrompt", () => {
    it("should build prompt with transaction data", () => {
      const transactions = [
        {
          date: "2024-01-01",
          merchantName: "Netflix",
          amount: -15.99,
          categoryId: "cat_entertainment",
          transactionId: "txn_001",
        },
        {
          date: "2024-02-01",
          merchantName: "Netflix",
          amount: -15.99,
          categoryId: "cat_entertainment",
          transactionId: "txn_002",
        },
      ];

      const prompt = buildPatternDetectionPrompt(transactions);
      expect(prompt).toContain("Transaction History");
      expect(prompt).toContain("Netflix");
      expect(prompt).toContain("15.99");
      expect(prompt).toContain("2024-01-01");
    });

    it("should include analysis months in prompt", () => {
      const transactions = [];
      const prompt = buildPatternDetectionPrompt(transactions, {
        analysisMonths: 12,
      });
      expect(prompt).toContain("last 12 months");
    });

    it("should include JSON schema in prompt", () => {
      const transactions = [];
      const prompt = buildPatternDetectionPrompt(transactions);
      expect(prompt).toContain("merchantName");
      expect(prompt).toContain("suggestedBillName");
      expect(prompt).toContain("averageAmount");
      expect(prompt).toContain("frequency");
      expect(prompt).toContain("confidenceScore");
      expect(prompt).toContain("occurrences");
      expect(prompt).toContain("explanation");
    });

    it("should include example output", () => {
      const transactions = [];
      const prompt = buildPatternDetectionPrompt(transactions);
      expect(prompt).toContain("Example output");
      expect(prompt).toContain("Netflix Subscription");
    });

    it("should include instructions", () => {
      const transactions = [];
      const prompt = buildPatternDetectionPrompt(transactions);
      expect(prompt).toContain("Instructions");
      expect(prompt).toContain("at least 3 occurrences");
      expect(prompt).toContain("fuzzy matching");
    });

    it("should handle transactions without merchant names", () => {
      const transactions = [
        {
          date: "2024-01-01",
          description: "Payment",
          amount: -10.0,
          transactionId: "txn_001",
        },
      ];

      const prompt = buildPatternDetectionPrompt(transactions);
      expect(prompt).toContain("Payment");
    });

    it("should convert negative amounts to positive", () => {
      const transactions = [
        {
          date: "2024-01-01",
          merchantName: "Netflix",
          amount: -15.99,
          transactionId: "txn_001",
        },
      ];

      const prompt = buildPatternDetectionPrompt(transactions);
      expect(prompt).toContain("15.99");
      expect(prompt).not.toContain("-15.99");
    });
  });

  describe("buildBudgetPlanningPrompt", () => {
    it("should build prompt with bills and spending history", () => {
      const data = {
        bills: [
          {
            billName: "Rent",
            amount: 1200.0,
            frequency: "monthly",
            dueDate: "2024-01-01",
            categoryId: "cat_housing",
            categoryName: "Housing",
          },
        ],
        spendingHistory: [
          {
            month: "2024-01",
            categoryId: "cat_housing",
            categoryName: "Housing",
            totalSpent: 1500.0,
            transactionCount: 5,
          },
        ],
      };

      const prompt = buildBudgetPlanningPrompt(data, "2024-04");
      expect(prompt).toContain("Recurring Bills");
      expect(prompt).toContain("Rent");
      expect(prompt).toContain("1200");
      expect(prompt).toContain("Past 3 Months Spending");
      expect(prompt).toContain("Housing");
    });

    it("should format target month correctly", () => {
      const data = { bills: [], spendingHistory: [] };
      const prompt = buildBudgetPlanningPrompt(data, "2024-04");
      expect(prompt).toContain("April 2024");
    });

    it("should include JSON schema in prompt", () => {
      const data = { bills: [], spendingHistory: [] };
      const prompt = buildBudgetPlanningPrompt(data, "2024-04");
      expect(prompt).toContain("categoryId");
      expect(prompt).toContain("categoryName");
      expect(prompt).toContain("suggestedAmount");
      expect(prompt).toContain("confidenceScore");
      expect(prompt).toContain("breakdown");
      expect(prompt).toContain("explanation");
      expect(prompt).toContain("totalSuggested");
    });

    it("should include example output", () => {
      const data = { bills: [], spendingHistory: [] };
      const prompt = buildBudgetPlanningPrompt(data, "2024-04");
      expect(prompt).toContain("Example output");
      expect(prompt).toContain("Housing");
      expect(prompt).toContain("Entertainment");
    });

    it("should include instructions for frequency handling", () => {
      const data = { bills: [], spendingHistory: [] };
      const prompt = buildBudgetPlanningPrompt(data, "2024-04");
      expect(prompt).toContain("Bi-weekly");
      expect(prompt).toContain("Monthly");
      expect(prompt).toContain("Quarterly");
      expect(prompt).toContain("Annual");
    });

    it("should handle empty bills and spending history", () => {
      const data = { bills: [], spendingHistory: [] };
      const prompt = buildBudgetPlanningPrompt(data, "2024-04");
      expect(prompt).toContain("Recurring Bills: []");
      expect(prompt).toContain("Past 3 Months Spending by Category: []");
    });

    it("should format all months correctly", () => {
      const data = { bills: [], spendingHistory: [] };
      const months = [
        ["2024-01", "January"],
        ["2024-02", "February"],
        ["2024-03", "March"],
        ["2024-04", "April"],
        ["2024-05", "May"],
        ["2024-06", "June"],
        ["2024-07", "July"],
        ["2024-08", "August"],
        ["2024-09", "September"],
        ["2024-10", "October"],
        ["2024-11", "November"],
        ["2024-12", "December"],
      ];

      months.forEach(([input, expected]) => {
        const prompt = buildBudgetPlanningPrompt(data, input);
        expect(prompt).toContain(`${expected} 2024`);
      });
    });
  });

  describe("validatePatternDetectionPrompt", () => {
    it("should validate complete prompt", () => {
      const transactions = [];
      const prompt = buildPatternDetectionPrompt(transactions);
      const validation = validatePatternDetectionPrompt(prompt);
      expect(validation.isValid).toBe(true);
      expect(validation.missingFields).toEqual([]);
    });

    it("should detect missing fields", () => {
      const prompt = "Incomplete prompt";
      const validation = validatePatternDetectionPrompt(prompt);
      expect(validation.isValid).toBe(false);
      expect(validation.missingFields.length).toBeGreaterThan(0);
    });

    it("should check for all required fields", () => {
      const prompt = buildPatternDetectionPrompt([]);
      const validation = validatePatternDetectionPrompt(prompt);
      expect(validation.isValid).toBe(true);
      expect(prompt).toContain("Transaction History");
      expect(prompt).toContain("Instructions");
      expect(prompt).toContain("merchantName");
      expect(prompt).toContain("Example output");
    });
  });

  describe("validateBudgetPlanningPrompt", () => {
    it("should validate complete prompt", () => {
      const data = { bills: [], spendingHistory: [] };
      const prompt = buildBudgetPlanningPrompt(data, "2024-04");
      const validation = validateBudgetPlanningPrompt(prompt);
      expect(validation.isValid).toBe(true);
      expect(validation.missingFields).toEqual([]);
    });

    it("should detect missing fields", () => {
      const prompt = "Incomplete prompt";
      const validation = validateBudgetPlanningPrompt(prompt);
      expect(validation.isValid).toBe(false);
      expect(validation.missingFields.length).toBeGreaterThan(0);
    });

    it("should check for all required fields", () => {
      const data = { bills: [], spendingHistory: [] };
      const prompt = buildBudgetPlanningPrompt(data, "2024-04");
      const validation = validateBudgetPlanningPrompt(prompt);
      expect(validation.isValid).toBe(true);
      expect(prompt).toContain("Historical Data");
      expect(prompt).toContain("Recurring Bills");
      expect(prompt).toContain("Example output");
    });
  });

  describe("extractJsonFromResponse", () => {
    it("should parse valid JSON directly", () => {
      const response = '{"key": "value"}';
      const result = extractJsonFromResponse(response);
      expect(result).toEqual({ key: "value" });
    });

    it("should extract JSON from markdown code blocks", () => {
      const response = '```json\n{"key": "value"}\n```';
      const result = extractJsonFromResponse(response);
      expect(result).toEqual({ key: "value" });
    });

    it("should extract JSON array from text", () => {
      const response = 'Here is the result: [{"key": "value"}]';
      const result = extractJsonFromResponse(response);
      expect(result).toEqual([{ key: "value" }]);
    });

    it("should extract JSON object from text", () => {
      const response = 'The answer is: {"key": "value"}';
      const result = extractJsonFromResponse(response);
      expect(result).toEqual({ key: "value" });
    });

    it("should handle complex JSON arrays", () => {
      const response = `[
        {
          "merchantName": "Netflix",
          "suggestedBillName": "Netflix Subscription",
          "averageAmount": 15.99,
          "frequency": "monthly",
          "confidenceScore": 95
        }
      ]`;
      const result = extractJsonFromResponse(response);
      expect(result).toHaveLength(1);
      expect(result[0].merchantName).toBe("Netflix");
    });

    it("should handle complex JSON objects", () => {
      const response = `{
        "suggestions": [
          {
            "categoryId": "cat_housing",
            "suggestedAmount": 1500.00
          }
        ],
        "totalSuggested": 1500.00
      }`;
      const result = extractJsonFromResponse(response);
      expect(result.suggestions).toHaveLength(1);
      expect(result.totalSuggested).toBe(1500.0);
    });

    it("should throw error for invalid JSON", () => {
      const response = "This is not JSON at all";
      expect(() => extractJsonFromResponse(response)).toThrow();
    });

    it("should handle JSON with extra whitespace", () => {
      const response = `

        {"key": "value"}

      `;
      const result = extractJsonFromResponse(response);
      expect(result).toEqual({ key: "value" });
    });
  });

  describe("Prompt Completeness", () => {
    it("pattern detection prompt should include all required elements", () => {
      const transactions = [
        {
          date: "2024-01-01",
          merchantName: "Netflix",
          amount: -15.99,
          transactionId: "txn_001",
        },
      ];

      const prompt = buildPatternDetectionPrompt(transactions);

      // Check for instructions
      expect(prompt).toContain("Instructions");
      expect(prompt).toContain("at least 3 occurrences");

      // Check for JSON schema
      expect(prompt).toContain("merchantName");
      expect(prompt).toContain("suggestedBillName");
      expect(prompt).toContain("averageAmount");
      expect(prompt).toContain("amountStdDev");
      expect(prompt).toContain("frequency");
      expect(prompt).toContain("confidenceScore");
      expect(prompt).toContain("occurrences");
      expect(prompt).toContain("explanation");

      // Check for example output
      expect(prompt).toContain("Example output");

      // Check for transaction data
      expect(prompt).toContain("Netflix");
      expect(prompt).toContain("15.99");
    });

    it("budget planning prompt should include all required elements", () => {
      const data = {
        bills: [
          {
            billName: "Rent",
            amount: 1200.0,
            frequency: "monthly",
            categoryId: "cat_housing",
            categoryName: "Housing",
          },
        ],
        spendingHistory: [
          {
            month: "2024-01",
            categoryId: "cat_housing",
            categoryName: "Housing",
            totalSpent: 1500.0,
          },
        ],
      };

      const prompt = buildBudgetPlanningPrompt(data, "2024-04");

      // Check for instructions
      expect(prompt).toContain("Instructions");
      expect(prompt).toContain("Bi-weekly");
      expect(prompt).toContain("Monthly");

      // Check for JSON schema
      expect(prompt).toContain("categoryId");
      expect(prompt).toContain("categoryName");
      expect(prompt).toContain("suggestedAmount");
      expect(prompt).toContain("confidenceScore");
      expect(prompt).toContain("breakdown");
      expect(prompt).toContain("explanation");
      expect(prompt).toContain("totalSuggested");

      // Check for example output
      expect(prompt).toContain("Example output");

      // Check for historical data
      expect(prompt).toContain("Recurring Bills");
      expect(prompt).toContain("Past 3 Months Spending");
      expect(prompt).toContain("Rent");
      expect(prompt).toContain("Housing");
    });
  });
});
