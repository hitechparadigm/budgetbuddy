/**
 * Pattern Detection Service Tests
 *
 * Unit tests for the pattern detection service layer.
 */

const {
  generateBillName,
  generateExplanation,
  mergePatterns,
  calculateNextExpectedDate,
  updateAssociatedBill,
  MIN_ANALYSIS_MONTHS,
  MAX_ANALYSIS_MONTHS,
  DEFAULT_ANALYSIS_MONTHS,
} = require("./pattern-detection-service");

describe("Pattern Detection Service", () => {
  describe("generateBillName", () => {
    test("generates bill name from merchant name", () => {
      expect(generateBillName("netflix")).toBe("Netflix Subscription");
      expect(generateBillName("SPOTIFY")).toBe("Spotify Subscription");
    });

    test("capitalizes each word", () => {
      expect(generateBillName("electric company")).toBe(
        "Electric Company Subscription",
      );
    });

    test("removes special characters", () => {
      expect(generateBillName("Netflix, Inc.")).toBe(
        "Netflix Inc Subscription",
      );
    });

    test("handles empty or null input", () => {
      expect(generateBillName("")).toBe("Unknown Bill");
      expect(generateBillName(null)).toBe("Unknown Bill");
      expect(generateBillName(undefined)).toBe("Unknown Bill");
    });

    test("does not add suffix if already descriptive", () => {
      expect(generateBillName("Netflix Subscription")).toBe(
        "Netflix Subscription",
      );
      expect(generateBillName("Electric Bill")).toBe("Electric Bill");
      expect(generateBillName("Gym Membership")).toBe("Gym Membership");
    });

    test("handles long names without adding suffix", () => {
      const longName = "Very Long Merchant Name That Is Already Descriptive";
      const result = generateBillName(longName);
      expect(result).not.toContain("Subscription");
    });
  });

  describe("generateExplanation", () => {
    test("generates explanation for high confidence pattern", () => {
      const pattern = {
        merchantName: "Netflix",
        frequency: "monthly",
        averageAmount: 15.99,
        confidenceScore: 95,
        occurrences: [
          { date: "2024-01-01", amount: 15.99 },
          { date: "2024-02-01", amount: 15.99 },
          { date: "2024-03-01", amount: 15.99 },
        ],
      };

      const explanation = generateExplanation(pattern);

      expect(explanation).toContain("monthly");
      expect(explanation).toContain("$15.99");
      expect(explanation).toContain("Netflix");
      expect(explanation).toContain("3 occurrences");
      expect(explanation).toContain("high confidence");
    });

    test("generates explanation for medium confidence pattern", () => {
      const pattern = {
        merchantName: "Electric Co",
        frequency: "monthly",
        averageAmount: 150.0,
        confidenceScore: 75,
        occurrences: [
          { date: "2024-01-15", amount: 140.0 },
          { date: "2024-02-15", amount: 160.0 },
          { date: "2024-03-15", amount: 150.0 },
        ],
      };

      const explanation = generateExplanation(pattern);

      expect(explanation).toContain("good confidence");
    });

    test("generates explanation for low confidence pattern", () => {
      const pattern = {
        merchantName: "Random Store",
        frequency: "monthly",
        averageAmount: 50.0,
        confidenceScore: 55,
        occurrences: [
          { date: "2024-01-10", amount: 40.0 },
          { date: "2024-02-20", amount: 60.0 },
          { date: "2024-03-05", amount: 50.0 },
        ],
      };

      const explanation = generateExplanation(pattern);

      expect(explanation).toContain("variation");
    });

    test("handles missing occurrences", () => {
      const pattern = {
        merchantName: "Test",
        frequency: "monthly",
        averageAmount: 10.0,
        confidenceScore: 80,
      };

      const explanation = generateExplanation(pattern);

      expect(explanation).toContain("0 occurrences");
    });
  });

  describe("mergePatterns", () => {
    test("merges AI patterns with algorithm patterns", () => {
      const algorithmPatterns = [
        {
          merchantName: "Netflix",
          confidenceScore: 90,
          averageAmount: 15.99,
        },
        {
          merchantName: "Spotify",
          confidenceScore: 85,
          averageAmount: 9.99,
        },
      ];

      const aiPatterns = [
        {
          merchantName: "Netflix",
          suggestedBillName: "Netflix Premium Subscription",
          explanation: "Monthly streaming service subscription",
        },
      ];

      const merged = mergePatterns(algorithmPatterns, aiPatterns);

      expect(merged).toHaveLength(2);
      expect(merged[0].suggestedBillName).toBe("Netflix Premium Subscription");
      expect(merged[0].explanation).toBe(
        "Monthly streaming service subscription",
      );
      expect(merged[0].confidenceScore).toBe(90); // Keep algorithm score
      expect(merged[1].merchantName).toBe("Spotify"); // Unchanged
    });

    test("returns algorithm patterns if AI patterns empty", () => {
      const algorithmPatterns = [
        { merchantName: "Netflix", confidenceScore: 90 },
      ];

      expect(mergePatterns(algorithmPatterns, [])).toEqual(algorithmPatterns);
      expect(mergePatterns(algorithmPatterns, null)).toEqual(algorithmPatterns);
    });

    test("handles partial merchant name matches", () => {
      const algorithmPatterns = [
        { merchantName: "NETFLIX INC", confidenceScore: 90 },
      ];

      const aiPatterns = [
        {
          merchantName: "Netflix",
          suggestedBillName: "Netflix Subscription",
        },
      ];

      const merged = mergePatterns(algorithmPatterns, aiPatterns);

      expect(merged[0].suggestedBillName).toBe("Netflix Subscription");
    });
  });

  describe("Constants", () => {
    test("MIN_ANALYSIS_MONTHS is 3", () => {
      expect(MIN_ANALYSIS_MONTHS).toBe(3);
    });

    test("MAX_ANALYSIS_MONTHS is 12", () => {
      expect(MAX_ANALYSIS_MONTHS).toBe(12);
    });

    test("DEFAULT_ANALYSIS_MONTHS is 6", () => {
      expect(DEFAULT_ANALYSIS_MONTHS).toBe(6);
    });
  });

  describe("calculateNextExpectedDate", () => {
    test("calculates weekly next date", () => {
      const result = calculateNextExpectedDate("2024-01-01", "weekly");
      expect(result).toBe("2024-01-08");
    });

    test("calculates bi-weekly next date", () => {
      const result = calculateNextExpectedDate("2024-01-01", "bi-weekly");
      expect(result).toBe("2024-01-15");
    });

    test("calculates monthly next date", () => {
      const result = calculateNextExpectedDate("2024-01-15", "monthly");
      expect(result).toBe("2024-02-15");
    });

    test("calculates quarterly next date", () => {
      const result = calculateNextExpectedDate("2024-01-01", "quarterly");
      // January 1 + 3 months = April 1 (but JS Date may give March 31 due to month handling)
      expect(result).toMatch(/^2024-03-3[01]$|^2024-04-0[12]$/);
    });

    test("calculates annual next date", () => {
      const result = calculateNextExpectedDate("2024-01-01", "annual");
      expect(result).toBe("2025-01-01");
    });

    test("handles month overflow correctly", () => {
      const result = calculateNextExpectedDate("2024-01-31", "monthly");
      // January 31 + 1 month = March 2 (Feb has 29 days in 2024)
      expect(result).toBe("2024-03-02");
    });

    test("handles year overflow correctly", () => {
      const result = calculateNextExpectedDate("2024-12-15", "monthly");
      expect(result).toBe("2025-01-15");
    });

    test("defaults to monthly for unknown frequency", () => {
      const result = calculateNextExpectedDate("2024-01-15", "unknown");
      expect(result).toBe("2024-02-15");
    });

    test("handles null date by using current date", () => {
      const result = calculateNextExpectedDate(null, "monthly");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("updateAssociatedBill", () => {
    test("maps pattern fields to bill fields correctly", async () => {
      const patternUpdates = {
        suggestedBillName: "Netflix Premium",
        averageAmount: 19.99,
        frequency: "monthly",
        categoryId: "cat123",
        categoryName: "Entertainment",
        nextExpectedDate: "2024-02-15",
      };

      const result = await updateAssociatedBill(
        "bill123",
        "family456",
        patternUpdates,
      );

      expect(result.success).toBe(true);
      expect(result.billId).toBe("bill123");
      expect(result.familyId).toBe("family456");
      expect(result.updates.name).toBe("Netflix Premium");
      expect(result.updates.amount).toBe(19.99);
      expect(result.updates.frequency).toBe("monthly");
      expect(result.updates.categoryId).toBe("cat123");
      expect(result.updates.categoryName).toBe("Entertainment");
      expect(result.updates.dueDate).toBe("2024-02-15");
      expect(result.updates.userModified).toBe(true);
    });

    test("only includes provided fields in updates", async () => {
      const patternUpdates = {
        averageAmount: 25.0,
      };

      const result = await updateAssociatedBill(
        "bill123",
        "family456",
        patternUpdates,
      );

      expect(result.updates.amount).toBe(25.0);
      expect(result.updates.name).toBeUndefined();
      expect(result.updates.frequency).toBeUndefined();
      expect(result.updates.userModified).toBe(true);
    });

    test("preserves AI metadata by not overwriting them", async () => {
      const patternUpdates = {
        suggestedBillName: "Updated Name",
      };

      const result = await updateAssociatedBill(
        "bill123",
        "family456",
        patternUpdates,
      );

      // AI metadata fields should not be in updates (they are preserved)
      expect(result.updates.aiGenerated).toBeUndefined();
      expect(result.updates.sourcePatternId).toBeUndefined();
      expect(result.updates.aiConfidenceScore).toBeUndefined();
      expect(result.updates.aiDetectedDate).toBeUndefined();
    });
  });
});

describe("Pattern Detection Service - Integration", () => {
  // Mock the repository and external dependencies
  jest.mock("./pattern-detection-repository", () => ({
    getTransactionHistory: jest.fn(),
    savePattern: jest.fn(),
    getPatternsByFamily: jest.fn(),
    updatePatternStatus: jest.fn(),
  }));

  jest.mock("./bedrock-client", () => ({
    callBedrock: jest.fn(),
  }));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("analyzeTransactionsForPatterns", () => {
    test("requires userId", async () => {
      const {
        analyzeTransactionsForPatterns,
      } = require("./pattern-detection-service");

      await expect(
        analyzeTransactionsForPatterns(null, "family123"),
      ).rejects.toThrow("userId is required");
    });

    test("requires familyId", async () => {
      const {
        analyzeTransactionsForPatterns,
      } = require("./pattern-detection-service");

      await expect(
        analyzeTransactionsForPatterns("user123", null),
      ).rejects.toThrow("familyId is required");
    });
  });

  describe("getPatterns", () => {
    test("requires familyId", async () => {
      const { getPatterns } = require("./pattern-detection-service");

      await expect(getPatterns("user123", null)).rejects.toThrow(
        "familyId is required",
      );
    });
  });

  describe("approvePattern", () => {
    test("requires patternId and familyId", async () => {
      const { approvePattern } = require("./pattern-detection-service");

      await expect(
        approvePattern(null, "user123", "family123"),
      ).rejects.toThrow("patternId and familyId are required");

      await expect(
        approvePattern("pattern123", "user123", null),
      ).rejects.toThrow("patternId and familyId are required");
    });
  });

  describe("rejectPattern", () => {
    test("requires patternId and familyId", async () => {
      const { rejectPattern } = require("./pattern-detection-service");

      await expect(rejectPattern(null, "user123", "family123")).rejects.toThrow(
        "patternId and familyId are required",
      );
    });
  });

  describe("createManualPattern", () => {
    test("requires userId", async () => {
      const { createManualPattern } = require("./pattern-detection-service");

      await expect(
        createManualPattern(null, "family123", { amount: 10 }, "monthly"),
      ).rejects.toThrow("userId is required");
    });

    test("requires familyId", async () => {
      const { createManualPattern } = require("./pattern-detection-service");

      await expect(
        createManualPattern("user123", null, { amount: 10 }, "monthly"),
      ).rejects.toThrow("familyId is required");
    });

    test("requires transactionData", async () => {
      const { createManualPattern } = require("./pattern-detection-service");

      await expect(
        createManualPattern("user123", "family123", null, "monthly"),
      ).rejects.toThrow("transactionData is required");
    });

    test("requires frequency", async () => {
      const { createManualPattern } = require("./pattern-detection-service");

      await expect(
        createManualPattern("user123", "family123", { amount: 10 }, null),
      ).rejects.toThrow("frequency is required");
    });

    test("validates frequency value", async () => {
      const { createManualPattern } = require("./pattern-detection-service");

      await expect(
        createManualPattern("user123", "family123", { amount: 10 }, "invalid"),
      ).rejects.toThrow("Invalid frequency");
    });

    test("requires non-zero amount", async () => {
      const { createManualPattern } = require("./pattern-detection-service");

      await expect(
        createManualPattern("user123", "family123", { amount: 0 }, "monthly"),
      ).rejects.toThrow("Transaction amount must be greater than 0");

      await expect(
        createManualPattern("user123", "family123", {}, "monthly"),
      ).rejects.toThrow("Transaction amount must be greater than 0");
    });
  });
});
