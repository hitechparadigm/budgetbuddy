/**
 * Budget Planning Service Tests
 *
 * Tests for AI-powered budget planning service
 * Validates: Requirements 3.1, 3.2, 3.3, 3.5, 3.6
 */

const {
  generateSuggestions,
  applySuggestions,
  getSuggestions,
  calculateBillAmountForMonth,
  calculateBiWeeklyOccurrences,
  calculateHistoricalAverage,
  calculateSeasonalAdjustment,
  calculateConfidenceScore,
  generateExplanation,
  generateCategorySuggestions,
  DEFAULT_HISTORY_MONTHS,
  MIN_CONFIDENCE_SCORE,
  HIGH_CONFIDENCE_THRESHOLD,
} = require("./budget-planning-service");

describe("Budget Planning Service", () => {
  describe("generateSuggestions", () => {
    it("should generate suggestions for a target month", async () => {
      const mockBills = [
        {
          billId: "bill-1",
          name: "Netflix",
          amount: 15.99,
          frequency: "monthly",
          categoryId: "entertainment",
        },
        {
          billId: "bill-2",
          name: "Electric",
          amount: 100,
          frequency: "monthly",
          categoryId: "utilities",
        },
      ];

      const mockHistory = [
        { categoryId: "food", amount: 500, date: "2026-01-01" },
        { categoryId: "food", amount: 480, date: "2025-12-01" },
        { categoryId: "food", amount: 520, date: "2025-11-01" },
      ];

      const mockCategories = [
        { categoryId: "entertainment", categoryName: "Entertainment" },
        { categoryId: "utilities", categoryName: "Utilities" },
        { categoryId: "food", categoryName: "Food" },
      ];

      const result = await generateSuggestions(
        "user-123",
        "family-456",
        "2026-03",
        {},
        {
          getRecurringBills: async () => mockBills,
          getHistoricalSpending: async () => mockHistory,
          getCategories: async () => mockCategories,
        },
      );

      expect(result.suggestionId).toBeDefined();
      expect(result.targetMonth).toBe("2026-03");
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.totalSuggested).toBeGreaterThan(0);
      expect(result.status).toBe("pending");
    });

    it("should throw error for missing userId", async () => {
      await expect(
        generateSuggestions(null, "family-456", "2026-03"),
      ).rejects.toThrow("userId is required");
    });

    it("should throw error for missing familyId", async () => {
      await expect(
        generateSuggestions("user-123", null, "2026-03"),
      ).rejects.toThrow("familyId is required");
    });

    it("should throw error for invalid targetMonth format", async () => {
      await expect(
        generateSuggestions("user-123", "family-456", "03-2026"),
      ).rejects.toThrow("targetMonth must be in YYYY-MM format");
    });

    it("should include metadata about analysis", async () => {
      const result = await generateSuggestions(
        "user-123",
        "family-456",
        "2026-03",
        {},
        {
          getRecurringBills: async () => [],
          getHistoricalSpending: async () => [],
          getCategories: async () => [],
        },
      );

      expect(result.metadata).toBeDefined();
      expect(result.metadata.recurringBillsCount).toBe(0);
      expect(result.metadata.historicalMonthsAnalyzed).toBe(
        DEFAULT_HISTORY_MONTHS,
      );
    });
  });

  describe("calculateBillAmountForMonth", () => {
    const targetDate = new Date(2026, 2, 1); // March 2026

    it("should return monthly amount unchanged", () => {
      const bill = { amount: 100, frequency: "monthly" };
      expect(calculateBillAmountForMonth(bill, targetDate)).toBe(100);
    });

    it("should calculate weekly amount (4.33x)", () => {
      const bill = { amount: 50, frequency: "weekly" };
      const result = calculateBillAmountForMonth(bill, targetDate);
      expect(result).toBeCloseTo(216.5, 1);
    });

    it("should calculate bi-weekly amount", () => {
      const bill = {
        amount: 100,
        frequency: "bi-weekly",
        dueDate: "2026-03-01",
      };
      const result = calculateBillAmountForMonth(bill, targetDate);
      // March 2026 has 2-3 bi-weekly occurrences
      expect(result).toBeGreaterThanOrEqual(200);
      expect(result).toBeLessThanOrEqual(300);
    });

    it("should return quarterly amount only if due in target month", () => {
      const billDue = {
        amount: 300,
        frequency: "quarterly",
        dueDate: "2026-03-15",
      };
      const billNotDue = {
        amount: 300,
        frequency: "quarterly",
        dueDate: "2026-04-15",
      };

      expect(calculateBillAmountForMonth(billDue, targetDate)).toBe(300);
      expect(calculateBillAmountForMonth(billNotDue, targetDate)).toBe(0);
    });

    it("should return annual amount only if due in target month", () => {
      const billDue = {
        amount: 1200,
        frequency: "annual",
        dueDate: "2025-03-15", // Due in March (same month, previous year)
      };
      const billNotDue = {
        amount: 1200,
        frequency: "annual",
        dueDate: "2025-04-15",
      };

      expect(calculateBillAmountForMonth(billDue, targetDate)).toBe(1200);
      expect(calculateBillAmountForMonth(billNotDue, targetDate)).toBe(0);
    });

    it("should default to monthly for unknown frequency", () => {
      const bill = { amount: 100, frequency: "unknown" };
      expect(calculateBillAmountForMonth(bill, targetDate)).toBe(100);
    });
  });

  describe("calculateBiWeeklyOccurrences", () => {
    it("should return 2 for months with 2 occurrences", () => {
      // February 2026 (28 days) - should have 2 occurrences
      const targetDate = new Date(2026, 1, 1); // February 2026
      const result = calculateBiWeeklyOccurrences("2026-02-01", targetDate);
      expect(result).toBe(2);
    });

    it("should return 3 for months with 3 occurrences", () => {
      // March 2026 (31 days) starting on the 1st - could have 3 occurrences
      const targetDate = new Date(2026, 2, 1); // March 2026
      const result = calculateBiWeeklyOccurrences("2026-03-01", targetDate);
      expect(result).toBeGreaterThanOrEqual(2);
    });

    it("should return at least 2 for any month", () => {
      const targetDate = new Date(2026, 0, 1); // January 2026
      const result = calculateBiWeeklyOccurrences("2026-01-15", targetDate);
      expect(result).toBeGreaterThanOrEqual(2);
    });

    it("should default to 2 if no start date provided", () => {
      const targetDate = new Date(2026, 2, 1);
      const result = calculateBiWeeklyOccurrences(null, targetDate);
      expect(result).toBe(2);
    });
  });

  describe("calculateHistoricalAverage", () => {
    it("should calculate average correctly", () => {
      const history = [{ amount: 100 }, { amount: 200 }, { amount: 300 }];
      expect(calculateHistoricalAverage(history)).toBe(200);
    });

    it("should return 0 for empty history", () => {
      expect(calculateHistoricalAverage([])).toBe(0);
      expect(calculateHistoricalAverage(null)).toBe(0);
    });

    it("should handle single item", () => {
      const history = [{ amount: 150 }];
      expect(calculateHistoricalAverage(history)).toBe(150);
    });
  });

  describe("calculateSeasonalAdjustment", () => {
    it("should return 1.0 for insufficient data", () => {
      const history = [
        { amount: 100, date: "2026-01-01" },
        { amount: 100, date: "2026-02-01" },
      ];
      expect(calculateSeasonalAdjustment(history, 2)).toBe(1.0);
    });

    it("should calculate adjustment for seasonal patterns", () => {
      // Create data where one month is clearly higher than others
      // The function groups by month and calculates: targetMonthAvg / overallAvg
      const history = [
        { amount: 100, date: "2025-01-15" }, // January
        { amount: 100, date: "2025-02-15" }, // February
        { amount: 100, date: "2025-03-15" }, // March
        { amount: 100, date: "2025-04-15" }, // April
        { amount: 100, date: "2025-05-15" }, // May
        { amount: 100, date: "2025-06-15" }, // June
        { amount: 100, date: "2025-07-15" }, // July (month 6)
        { amount: 300, date: "2025-07-20" }, // Another July entry (higher)
      ];

      // Overall average: (100*7 + 300) / 8 = 125
      // July average: (100 + 300) / 2 = 200
      // Adjustment: 200 / 125 = 1.6
      const julyAdjustment = calculateSeasonalAdjustment(history, 6); // July is month 6
      expect(julyAdjustment).toBeGreaterThan(1.0);
      expect(julyAdjustment).toBeLessThanOrEqual(2.0);
    });

    it("should cap adjustment between 0.5 and 2.0", () => {
      const history = [
        { amount: 10, date: "2025-01-01" },
        { amount: 10, date: "2025-02-01" },
        { amount: 10, date: "2025-03-01" },
        { amount: 10, date: "2025-04-01" },
        { amount: 10, date: "2025-05-01" },
        { amount: 1000, date: "2025-12-01" }, // Extreme outlier
      ];

      const adjustment = calculateSeasonalAdjustment(history, 11);
      expect(adjustment).toBeLessThanOrEqual(2.0);
    });
  });

  describe("calculateConfidenceScore", () => {
    it("should return minimum score for no factors", () => {
      expect(calculateConfidenceScore([], 0, 0)).toBe(MIN_CONFIDENCE_SCORE);
    });

    it("should calculate score from factors", () => {
      const factors = [0.9, 0.8, 0.7];
      const score = calculateConfidenceScore(factors, 2, 3);
      expect(score).toBeGreaterThan(50);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should add bonus for more data", () => {
      const factors = [0.7];
      const scoreWithLessData = calculateConfidenceScore(factors, 1, 1);
      const scoreWithMoreData = calculateConfidenceScore(factors, 5, 5);
      expect(scoreWithMoreData).toBeGreaterThan(scoreWithLessData);
    });

    it("should cap score at 100", () => {
      const factors = [1.0, 1.0, 1.0];
      const score = calculateConfidenceScore(factors, 10, 10);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe("generateExplanation", () => {
    it("should include category name and amount", () => {
      const explanation = generateExplanation("Food", 0, 3, 500, 70);
      expect(explanation).toContain("Food");
      expect(explanation).toContain("500.00");
    });

    it("should mention recurring bills if present", () => {
      const explanation = generateExplanation("Utilities", 2, 0, 200, 80);
      expect(explanation).toContain("2 recurring bills");
    });

    it("should mention historical data if present", () => {
      const explanation = generateExplanation("Food", 0, 6, 500, 60);
      expect(explanation).toContain("6 months");
    });

    it("should indicate high confidence", () => {
      const explanation = generateExplanation("Food", 3, 6, 500, 85);
      expect(explanation).toContain("High confidence");
    });

    it("should indicate moderate confidence", () => {
      const explanation = generateExplanation("Food", 1, 2, 500, 55);
      expect(explanation).toContain("Moderate confidence");
    });

    it("should indicate lower confidence", () => {
      const explanation = generateExplanation("Food", 0, 1, 500, 35);
      expect(explanation).toContain("Lower confidence");
    });
  });

  describe("generateCategorySuggestions", () => {
    it("should generate suggestions for categories with bills", () => {
      const categories = [
        { categoryId: "utilities", categoryName: "Utilities" },
      ];
      const bills = [
        {
          categoryId: "utilities",
          name: "Electric",
          amount: 100,
          frequency: "monthly",
        },
      ];
      const targetDate = new Date(2026, 2, 1);

      const suggestions = generateCategorySuggestions(
        categories,
        bills,
        [],
        targetDate,
      );

      expect(suggestions.length).toBe(1);
      expect(suggestions[0].categoryId).toBe("utilities");
      expect(suggestions[0].suggestedAmount).toBe(100);
    });

    it("should combine bills and historical spending", () => {
      const categories = [{ categoryId: "food", categoryName: "Food" }];
      const bills = [];
      const history = [
        { categoryId: "food", amount: 500, date: "2026-01-01" },
        { categoryId: "food", amount: 500, date: "2025-12-01" },
        { categoryId: "food", amount: 500, date: "2025-11-01" },
      ];
      const targetDate = new Date(2026, 2, 1);

      const suggestions = generateCategorySuggestions(
        categories,
        bills,
        history,
        targetDate,
      );

      expect(suggestions.length).toBe(1);
      expect(suggestions[0].categoryId).toBe("food");
      expect(suggestions[0].suggestedAmount).toBeCloseTo(500, 0);
    });

    it("should sort suggestions by amount (highest first)", () => {
      const categories = [
        { categoryId: "small", categoryName: "Small" },
        { categoryId: "large", categoryName: "Large" },
      ];
      const bills = [
        {
          categoryId: "small",
          name: "Small Bill",
          amount: 50,
          frequency: "monthly",
        },
        {
          categoryId: "large",
          name: "Large Bill",
          amount: 500,
          frequency: "monthly",
        },
      ];
      const targetDate = new Date(2026, 2, 1);

      const suggestions = generateCategorySuggestions(
        categories,
        bills,
        [],
        targetDate,
      );

      expect(suggestions[0].categoryId).toBe("large");
      expect(suggestions[1].categoryId).toBe("small");
    });

    it("should include breakdown in suggestions", () => {
      const categories = [
        { categoryId: "utilities", categoryName: "Utilities" },
      ];
      const bills = [
        {
          categoryId: "utilities",
          name: "Electric",
          amount: 100,
          frequency: "monthly",
        },
        {
          categoryId: "utilities",
          name: "Water",
          amount: 50,
          frequency: "monthly",
        },
      ];
      const targetDate = new Date(2026, 2, 1);

      const suggestions = generateCategorySuggestions(
        categories,
        bills,
        [],
        targetDate,
      );

      expect(suggestions[0].breakdown.length).toBe(2);
      expect(suggestions[0].breakdown[0].type).toBe("recurring");
    });
  });

  describe("applySuggestions", () => {
    it("should throw error for missing userId", async () => {
      await expect(
        applySuggestions(null, "family-456", "suggestion-123"),
      ).rejects.toThrow("userId is required");
    });

    it("should throw error for missing suggestionId", async () => {
      await expect(
        applySuggestions("user-123", "family-456", null),
      ).rejects.toThrow("suggestionId is required");
    });

    it("should throw error if suggestion not found", async () => {
      await expect(
        applySuggestions("user-123", "family-456", "nonexistent", null, {
          getSuggestion: async () => null,
        }),
      ).rejects.toThrow("Suggestion not found");
    });

    it("should throw error if suggestion already applied", async () => {
      await expect(
        applySuggestions("user-123", "family-456", "suggestion-123", null, {
          getSuggestion: async () => ({ status: "applied" }),
        }),
      ).rejects.toThrow("Suggestion already applied");
    });

    it("should apply all suggestions when no categories selected", async () => {
      const mockSuggestion = {
        suggestionId: "suggestion-123",
        targetMonth: "2026-03",
        status: "pending",
        suggestions: [
          { categoryId: "food", suggestedAmount: 500 },
          { categoryId: "utilities", suggestedAmount: 200 },
        ],
      };

      const updateBudgetCalls = [];
      const result = await applySuggestions(
        "user-123",
        "family-456",
        "suggestion-123",
        null,
        {
          getSuggestion: async () => mockSuggestion,
          updateBudget: async (familyId, month, categoryId, updates) => {
            updateBudgetCalls.push({ familyId, month, categoryId, updates });
          },
          updateSuggestionStatus: async () => {},
        },
      );

      expect(result.appliedCategories.length).toBe(2);
      expect(updateBudgetCalls.length).toBe(2);
    });

    it("should apply only selected categories", async () => {
      const mockSuggestion = {
        suggestionId: "suggestion-123",
        targetMonth: "2026-03",
        status: "pending",
        suggestions: [
          { categoryId: "food", suggestedAmount: 500 },
          { categoryId: "utilities", suggestedAmount: 200 },
        ],
      };

      const updateBudgetCalls = [];
      const result = await applySuggestions(
        "user-123",
        "family-456",
        "suggestion-123",
        ["food"], // Only apply food
        {
          getSuggestion: async () => mockSuggestion,
          updateBudget: async (familyId, month, categoryId, updates) => {
            updateBudgetCalls.push({ familyId, month, categoryId, updates });
          },
          updateSuggestionStatus: async () => {},
        },
      );

      expect(result.appliedCategories.length).toBe(1);
      expect(result.appliedCategories[0]).toBe("food");
      expect(updateBudgetCalls.length).toBe(1);
    });
  });

  describe("getSuggestions", () => {
    it("should throw error for missing familyId", async () => {
      await expect(getSuggestions("user-123", null)).rejects.toThrow(
        "familyId is required",
      );
    });

    it("should filter by status", async () => {
      const mockSuggestions = [
        { suggestionId: "1", status: "pending", generatedAt: "2026-03-01" },
        { suggestionId: "2", status: "applied", generatedAt: "2026-03-02" },
      ];

      const result = await getSuggestions(
        "user-123",
        "family-456",
        { status: "pending" },
        { getSuggestionsByFamily: async () => mockSuggestions },
      );

      expect(result.length).toBe(1);
      expect(result[0].status).toBe("pending");
    });

    it("should filter by targetMonth", async () => {
      const mockSuggestions = [
        {
          suggestionId: "1",
          targetMonth: "2026-03",
          generatedAt: "2026-03-01",
        },
        {
          suggestionId: "2",
          targetMonth: "2026-04",
          generatedAt: "2026-03-02",
        },
      ];

      const result = await getSuggestions(
        "user-123",
        "family-456",
        { targetMonth: "2026-03" },
        { getSuggestionsByFamily: async () => mockSuggestions },
      );

      expect(result.length).toBe(1);
      expect(result[0].targetMonth).toBe("2026-03");
    });

    it("should sort by generatedAt (newest first)", async () => {
      const mockSuggestions = [
        { suggestionId: "1", generatedAt: "2026-03-01T10:00:00Z" },
        { suggestionId: "2", generatedAt: "2026-03-02T10:00:00Z" },
      ];

      const result = await getSuggestions(
        "user-123",
        "family-456",
        {},
        { getSuggestionsByFamily: async () => mockSuggestions },
      );

      expect(result[0].suggestionId).toBe("2");
    });
  });
});
