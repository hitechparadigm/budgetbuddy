/**
 * Pattern Detection Algorithm Tests
 *
 * Unit tests for pattern detection algorithm.
 */

const {
  groupTransactionsByMerchant,
  calculateIntervals,
  detectFrequency,
  calculateAmountStats,
  calculateConfidenceScore,
  calculateNextExpectedDate,
  detectPatterns,
  analyzeTransactions,
  FREQUENCY_PATTERNS,
  MIN_OCCURRENCES,
  AMOUNT_VARIANCE_THRESHOLD,
} = require("./pattern-detection-algorithm");

describe("Pattern Detection Algorithm", () => {
  describe("groupTransactionsByMerchant", () => {
    it("should group identical merchant names", () => {
      const transactions = [
        { merchantName: "Netflix", amount: -15.99, date: "2024-01-01" },
        { merchantName: "Netflix", amount: -15.99, date: "2024-02-01" },
        { merchantName: "Netflix", amount: -15.99, date: "2024-03-01" },
      ];

      const groups = groupTransactionsByMerchant(transactions);
      expect(Object.keys(groups)).toHaveLength(1);
      expect(groups.Netflix).toHaveLength(3);
    });

    it("should group similar merchant names using fuzzy matching", () => {
      const transactions = [
        { merchantName: "Netflix", amount: -15.99, date: "2024-01-01" },
        { merchantName: "NETFLIX", amount: -15.99, date: "2024-02-01" },
        { merchantName: "Netflix Inc", amount: -15.99, date: "2024-03-01" },
      ];

      const groups = groupTransactionsByMerchant(transactions, 60); // Lower threshold
      expect(Object.keys(groups)).toHaveLength(1);
    });

    it("should keep different merchants separate", () => {
      const transactions = [
        { merchantName: "Netflix", amount: -15.99, date: "2024-01-01" },
        { merchantName: "Spotify", amount: -9.99, date: "2024-01-01" },
        { merchantName: "Amazon", amount: -50.0, date: "2024-01-01" },
      ];

      const groups = groupTransactionsByMerchant(transactions);
      expect(Object.keys(groups)).toHaveLength(3);
    });

    it("should handle transactions without merchant names", () => {
      const transactions = [
        { merchantName: "Netflix", amount: -15.99, date: "2024-01-01" },
        { amount: -10.0, date: "2024-01-02" },
      ];

      const groups = groupTransactionsByMerchant(transactions);
      expect(Object.keys(groups)).toHaveLength(1);
    });
  });

  describe("calculateIntervals", () => {
    it("should calculate intervals between transactions", () => {
      const transactions = [
        { date: "2024-01-01" },
        { date: "2024-01-31" },
        { date: "2024-03-01" },
      ];

      const intervals = calculateIntervals(transactions);
      expect(intervals).toHaveLength(2);
      expect(intervals[0]).toBe(30);
      expect(intervals[1]).toBe(30);
    });

    it("should return empty array for single transaction", () => {
      const transactions = [{ date: "2024-01-01" }];
      const intervals = calculateIntervals(transactions);
      expect(intervals).toEqual([]);
    });

    it("should handle weekly intervals", () => {
      const transactions = [
        { date: "2024-01-01" },
        { date: "2024-01-08" },
        { date: "2024-01-15" },
      ];

      const intervals = calculateIntervals(transactions);
      expect(intervals).toEqual([7, 7]);
    });
  });

  describe("detectFrequency", () => {
    it("should detect weekly frequency", () => {
      const intervals = [7, 7, 7, 8, 6];
      const frequency = detectFrequency(intervals);
      expect(frequency).not.toBeNull();
      expect(frequency.frequency).toBe("weekly");
      expect(frequency.expectedInterval).toBe(7);
    });

    it("should detect bi-weekly frequency", () => {
      const intervals = [14, 14, 15, 13];
      const frequency = detectFrequency(intervals);
      expect(frequency).not.toBeNull();
      expect(frequency.frequency).toBe("bi-weekly");
    });

    it("should detect monthly frequency", () => {
      const intervals = [30, 31, 28, 30];
      const frequency = detectFrequency(intervals);
      expect(frequency).not.toBeNull();
      expect(frequency.frequency).toBe("monthly");
    });

    it("should detect quarterly frequency", () => {
      const intervals = [91, 92, 90];
      const frequency = detectFrequency(intervals);
      expect(frequency).not.toBeNull();
      expect(frequency.frequency).toBe("quarterly");
    });

    it("should detect annual frequency", () => {
      const intervals = [365, 366];
      const frequency = detectFrequency(intervals);
      expect(frequency).not.toBeNull();
      expect(frequency.frequency).toBe("annual");
    });

    it("should return null for irregular intervals", () => {
      const intervals = [5, 45, 120, 10];
      const frequency = detectFrequency(intervals);
      expect(frequency).toBeNull();
    });

    it("should handle frequency with tolerance", () => {
      // Monthly with ±3 day variance
      const intervals = [27, 33, 29, 31];
      const frequency = detectFrequency(intervals);
      expect(frequency).not.toBeNull();
      expect(frequency.frequency).toBe("monthly");
    });
  });

  describe("calculateAmountStats", () => {
    it("should calculate mean and standard deviation", () => {
      const transactions = [
        { amount: -10.0 },
        { amount: -10.0 },
        { amount: -10.0 },
      ];

      const stats = calculateAmountStats(transactions);
      expect(stats.mean).toBe(10.0);
      expect(stats.stdDev).toBe(0);
      expect(stats.isVariable).toBe(false);
    });

    it("should flag variable amounts", () => {
      const transactions = [
        { amount: -10.0 },
        { amount: -50.0 },
        { amount: -100.0 },
      ];

      const stats = calculateAmountStats(transactions);
      expect(stats.isVariable).toBe(true);
    });

    it("should use median for variable amounts", () => {
      const transactions = [
        { amount: -10.0 },
        { amount: -50.0 },
        { amount: -100.0 },
      ];

      const stats = calculateAmountStats(transactions);
      expect(stats.suggestedAmount).toBe(stats.median);
    });

    it("should use mean for consistent amounts", () => {
      const transactions = [
        { amount: -10.0 },
        { amount: -11.0 },
        { amount: -10.5 },
      ];

      const stats = calculateAmountStats(transactions);
      expect(stats.isVariable).toBe(false);
      expect(stats.suggestedAmount).toBe(stats.mean);
    });

    it("should calculate median correctly for even number of values", () => {
      const transactions = [
        { amount: -10.0 },
        { amount: -20.0 },
        { amount: -30.0 },
        { amount: -40.0 },
      ];

      const stats = calculateAmountStats(transactions);
      expect(stats.median).toBe(25.0); // (20 + 30) / 2
    });

    it("should calculate median correctly for odd number of values", () => {
      const transactions = [
        { amount: -10.0 },
        { amount: -20.0 },
        { amount: -30.0 },
      ];

      const stats = calculateAmountStats(transactions);
      expect(stats.median).toBe(20.0);
    });
  });

  describe("calculateConfidenceScore", () => {
    it("should return high score for perfect patterns", () => {
      const frequencyData = {
        frequency: "monthly",
        expectedInterval: 30,
        avgDeviation: 0,
      };
      const amountStats = { mean: 10.0, stdDev: 0 };
      const occurrenceCount = 6;
      const merchantName = "Netflix";

      const score = calculateConfidenceScore(
        frequencyData,
        amountStats,
        occurrenceCount,
        merchantName,
      );
      expect(score).toBeGreaterThan(90);
    });

    it("should return lower score for irregular patterns", () => {
      const frequencyData = {
        frequency: "monthly",
        expectedInterval: 30,
        avgDeviation: 10,
      };
      const amountStats = { mean: 50.0, stdDev: 20.0 };
      const occurrenceCount = 3;
      const merchantName = "Utility";

      const score = calculateConfidenceScore(
        frequencyData,
        amountStats,
        occurrenceCount,
        merchantName,
      );
      expect(score).toBeLessThan(70);
    });

    it("should weight timing consistency at 40%", () => {
      const perfectTiming = {
        frequency: "monthly",
        expectedInterval: 30,
        avgDeviation: 0,
      };
      const poorTiming = {
        frequency: "monthly",
        expectedInterval: 30,
        avgDeviation: 15,
      };
      const amountStats = { mean: 10.0, stdDev: 0 };
      const occurrenceCount = 6;
      const merchantName = "Test";

      const score1 = calculateConfidenceScore(
        perfectTiming,
        amountStats,
        occurrenceCount,
        merchantName,
      );
      const score2 = calculateConfidenceScore(
        poorTiming,
        amountStats,
        occurrenceCount,
        merchantName,
      );

      // Difference should be approximately 20 points (40% weight * 50% timing difference)
      // avgDeviation 15 / expectedInterval 30 = 0.5, so timing consistency drops by 50%
      // 50% * 40% weight = 20 points
      expect(score1 - score2).toBeGreaterThan(15);
      expect(score1 - score2).toBeLessThan(25);
    });
  });

  describe("calculateNextExpectedDate", () => {
    it("should calculate next weekly date", () => {
      const lastDate = "2024-01-01";
      const nextDate = calculateNextExpectedDate(lastDate, "weekly");
      expect(nextDate).toBe("2024-01-08");
    });

    it("should calculate next monthly date", () => {
      const lastDate = "2024-01-15";
      const nextDate = calculateNextExpectedDate(lastDate, "monthly");
      expect(nextDate).toBe("2024-02-14");
    });

    it("should calculate next annual date", () => {
      const lastDate = "2024-01-01";
      const nextDate = calculateNextExpectedDate(lastDate, "annual");
      // 2024 is a leap year, so adding 365 days gives us 2024-12-31
      expect(nextDate).toBe("2024-12-31");
    });

    it("should return null for invalid frequency", () => {
      const lastDate = "2024-01-01";
      const nextDate = calculateNextExpectedDate(lastDate, "invalid");
      expect(nextDate).toBeNull();
    });
  });

  describe("detectPatterns", () => {
    it("should detect monthly subscription pattern", () => {
      const groupedTransactions = {
        Netflix: [
          {
            date: "2024-01-01",
            amount: -15.99,
            transactionId: "1",
          },
          {
            date: "2024-02-01",
            amount: -15.99,
            transactionId: "2",
          },
          {
            date: "2024-03-01",
            amount: -15.99,
            transactionId: "3",
          },
        ],
      };

      const patterns = detectPatterns(groupedTransactions);
      expect(patterns).toHaveLength(1);
      expect(patterns[0].merchantName).toBe("Netflix");
      expect(patterns[0].frequency).toBe("monthly");
      expect(patterns[0].confidenceScore).toBeGreaterThan(70);
    });

    it("should filter out patterns with less than minimum occurrences", () => {
      const groupedTransactions = {
        Netflix: [
          { date: "2024-01-01", amount: -15.99, transactionId: "1" },
          { date: "2024-02-01", amount: -15.99, transactionId: "2" },
        ],
      };

      const patterns = detectPatterns(groupedTransactions);
      expect(patterns).toHaveLength(0);
    });

    it("should filter out patterns below minimum confidence", () => {
      const groupedTransactions = {
        Utility: [
          { date: "2024-01-01", amount: -50.0, transactionId: "1" },
          { date: "2024-02-15", amount: -150.0, transactionId: "2" },
          { date: "2024-04-01", amount: -75.0, transactionId: "3" },
        ],
      };

      const patterns = detectPatterns(groupedTransactions, {
        minConfidence: 70,
      });
      expect(patterns).toHaveLength(0);
    });

    it("should sort patterns by confidence score", () => {
      const groupedTransactions = {
        Netflix: [
          { date: "2024-01-01", amount: -15.99, transactionId: "1" },
          { date: "2024-02-01", amount: -15.99, transactionId: "2" },
          { date: "2024-03-01", amount: -15.99, transactionId: "3" },
        ],
        Spotify: [
          { date: "2024-01-05", amount: -9.99, transactionId: "4" },
          { date: "2024-02-10", amount: -10.99, transactionId: "5" },
          { date: "2024-03-08", amount: -9.99, transactionId: "6" },
        ],
      };

      const patterns = detectPatterns(groupedTransactions);
      expect(patterns).toHaveLength(2);
      // First pattern should have higher confidence
      expect(patterns[0].confidenceScore).toBeGreaterThanOrEqual(
        patterns[1].confidenceScore,
      );
    });

    it("should include timing and amount consistency metrics", () => {
      const groupedTransactions = {
        Netflix: [
          { date: "2024-01-01", amount: -15.99, transactionId: "1" },
          { date: "2024-02-01", amount: -15.99, transactionId: "2" },
          { date: "2024-03-01", amount: -15.99, transactionId: "3" },
        ],
      };

      const patterns = detectPatterns(groupedTransactions);
      expect(patterns[0]).toHaveProperty("timingConsistency");
      expect(patterns[0]).toHaveProperty("amountConsistency");
      expect(patterns[0].timingConsistency).toBeGreaterThan(90);
      expect(patterns[0].amountConsistency).toBeGreaterThan(90);
    });
  });

  describe("analyzeTransactions", () => {
    it("should analyze transactions and return patterns", () => {
      const transactions = [
        {
          merchantName: "Netflix",
          amount: -15.99,
          date: "2024-01-01",
          type: "expense",
        },
        {
          merchantName: "Netflix",
          amount: -15.99,
          date: "2024-02-01",
          type: "expense",
        },
        {
          merchantName: "Netflix",
          amount: -15.99,
          date: "2024-03-01",
          type: "expense",
        },
      ];

      const result = analyzeTransactions(transactions);
      expect(result.patterns).toHaveLength(1);
      expect(result.transactionsAnalyzed).toBe(3);
      expect(result.merchantGroups).toBe(1);
      expect(result.patternsDetected).toBe(1);
    });

    it("should filter out income transactions", () => {
      const transactions = [
        {
          merchantName: "Salary",
          amount: 5000.0,
          date: "2024-01-01",
          type: "income",
        },
        {
          merchantName: "Netflix",
          amount: -15.99,
          date: "2024-01-01",
          type: "expense",
        },
      ];

      const result = analyzeTransactions(transactions);
      expect(result.transactionsAnalyzed).toBe(1);
    });

    it("should filter out transfer transactions", () => {
      const transactions = [
        {
          merchantName: "Transfer",
          amount: -100.0,
          date: "2024-01-01",
          type: "transfer",
        },
        {
          merchantName: "Netflix",
          amount: -15.99,
          date: "2024-01-01",
          type: "expense",
        },
      ];

      const result = analyzeTransactions(transactions);
      expect(result.transactionsAnalyzed).toBe(1);
    });

    it("should count high confidence patterns", () => {
      const transactions = [
        {
          merchantName: "Netflix",
          amount: -15.99,
          date: "2024-01-01",
          type: "expense",
        },
        {
          merchantName: "Netflix",
          amount: -15.99,
          date: "2024-02-01",
          type: "expense",
        },
        {
          merchantName: "Netflix",
          amount: -15.99,
          date: "2024-03-01",
          type: "expense",
        },
      ];

      const result = analyzeTransactions(transactions);
      expect(result.highConfidencePatterns).toBeGreaterThan(0);
    });

    it("should handle empty transaction list", () => {
      const result = analyzeTransactions([]);
      expect(result.patterns).toEqual([]);
      expect(result.transactionsAnalyzed).toBe(0);
    });

    it("should respect custom options", () => {
      const transactions = [
        {
          merchantName: "Netflix",
          amount: -15.99,
          date: "2024-01-01",
          type: "expense",
        },
        {
          merchantName: "Netflix",
          amount: -15.99,
          date: "2024-02-01",
          type: "expense",
        },
        {
          merchantName: "Netflix",
          amount: -15.99,
          date: "2024-03-01",
          type: "expense",
        },
      ];

      const result = analyzeTransactions(transactions, {
        minOccurrences: 5,
      });
      expect(result.patterns).toHaveLength(0); // Not enough occurrences
    });
  });

  describe("Edge Cases", () => {
    it("should handle variable utility bills", () => {
      const groupedTransactions = {
        "Electric Company": [
          { date: "2024-01-15", amount: -50.0, transactionId: "1" },
          { date: "2024-02-15", amount: -75.0, transactionId: "2" },
          { date: "2024-03-15", amount: -60.0, transactionId: "3" },
        ],
      };

      const patterns = detectPatterns(groupedTransactions);
      expect(patterns).toHaveLength(1);
      expect(patterns[0].isVariableAmount).toBe(false); // Within 30% threshold
    });

    it("should handle bi-weekly paycheck pattern", () => {
      const groupedTransactions = {
        Employer: [
          { date: "2024-01-01", amount: -1000.0, transactionId: "1" },
          { date: "2024-01-15", amount: -1000.0, transactionId: "2" },
          { date: "2024-01-29", amount: -1000.0, transactionId: "3" },
        ],
      };

      const patterns = detectPatterns(groupedTransactions);
      expect(patterns).toHaveLength(1);
      expect(patterns[0].frequency).toBe("bi-weekly");
    });

    it("should handle annual insurance payment", () => {
      const groupedTransactions = {
        "Insurance Company": [
          { date: "2022-01-01", amount: -1200.0, transactionId: "1" },
          { date: "2023-01-01", amount: -1200.0, transactionId: "2" },
          { date: "2024-01-01", amount: -1200.0, transactionId: "3" },
        ],
      };

      const patterns = detectPatterns(groupedTransactions);
      expect(patterns).toHaveLength(1);
      expect(patterns[0].frequency).toBe("annual");
    });

    it("should handle patterns with exactly 3 occurrences", () => {
      const groupedTransactions = {
        Netflix: [
          { date: "2024-01-01", amount: -15.99, transactionId: "1" },
          { date: "2024-02-01", amount: -15.99, transactionId: "2" },
          { date: "2024-03-01", amount: -15.99, transactionId: "3" },
        ],
      };

      const patterns = detectPatterns(groupedTransactions);
      expect(patterns).toHaveLength(1);
    });
  });
});
