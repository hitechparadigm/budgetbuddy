/**
 * Pattern Detection Repository Tests
 *
 * Unit tests for pattern detection repository methods.
 */

// Mock AWS SDK BEFORE importing the repository
const mockSend = jest.fn();
const mockFrom = jest.fn(() => ({ send: mockSend }));

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn(() => ({})),
}));

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: mockFrom,
  },
  QueryCommand: jest.fn((params) => params),
  PutCommand: jest.fn((params) => params),
  UpdateCommand: jest.fn((params) => params),
}));

// NOW import the repository after mocks are set up
const {
  getTransactionHistory,
  savePattern,
  getPatternsByFamily,
  updatePatternStatus,
} = require("./pattern-detection-repository");

describe("Pattern Detection Repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = "test-table";
  });

  describe("getTransactionHistory", () => {
    it("should query transactions by date range", async () => {
      const mockTransactions = [
        { PK: "FAMILY#family123", SK: "TRANSACTION#2024-01-15", amount: 50 },
        { PK: "FAMILY#family123", SK: "TRANSACTION#2024-02-15", amount: 50 },
      ];

      mockSend.mockResolvedValue({ Items: mockTransactions });

      const result = await getTransactionHistory(
        "family123",
        "2024-01-01",
        "2024-03-01",
      );

      expect(mockSend).toHaveBeenCalled();
      expect(result).toEqual(mockTransactions);
    });

    it("should throw error if familyId is missing", async () => {
      await expect(
        getTransactionHistory(null, "2024-01-01", "2024-03-01"),
      ).rejects.toThrow("familyId is required");
    });

    it("should throw error if dates are missing", async () => {
      await expect(
        getTransactionHistory("family123", null, "2024-03-01"),
      ).rejects.toThrow("startDate and endDate are required");
    });

    it("should handle DynamoDB errors", async () => {
      mockSend.mockRejectedValue(new Error("DynamoDB error"));

      await expect(
        getTransactionHistory("family123", "2024-01-01", "2024-03-01"),
      ).rejects.toThrow("Failed to fetch transaction history");
    });

    it("should return empty array if no transactions found", async () => {
      mockSend.mockResolvedValue({ Items: [] });

      const result = await getTransactionHistory(
        "family123",
        "2024-01-01",
        "2024-03-01",
      );

      expect(result).toEqual([]);
    });
  });

  describe("savePattern", () => {
    it("should save pattern with all required fields", async () => {
      const pattern = {
        familyId: "family123",
        userId: "user123",
        merchantName: "Netflix",
        suggestedBillName: "Netflix Subscription",
        averageAmount: 15.99,
        frequency: "monthly",
        confidenceScore: 95,
        categoryId: "cat123",
        nextExpectedDate: "2024-03-15",
        occurrences: [
          { date: "2024-01-15", amount: 15.99, transactionId: "tx1" },
          { date: "2024-02-15", amount: 15.99, transactionId: "tx2" },
        ],
      };

      mockSend.mockResolvedValue({});

      const result = await savePattern(pattern);

      expect(mockSend).toHaveBeenCalled();
      expect(result).toMatchObject({
        PK: "FAMILY#family123",
        familyId: "family123",
        merchantName: "Netflix",
        status: "pending",
      });
      expect(result.patternId).toBeDefined();
      expect(result.createdAt).toBeDefined();
    });

    it("should throw error if familyId is missing", async () => {
      await expect(savePattern({ merchantName: "Netflix" })).rejects.toThrow(
        "familyId is required",
      );
    });

    it("should handle DynamoDB errors", async () => {
      mockSend.mockRejectedValue(new Error("DynamoDB error"));

      await expect(
        savePattern({ familyId: "family123", merchantName: "Netflix" }),
      ).rejects.toThrow("Failed to save pattern");
    });

    it("should use provided patternId if given", async () => {
      const pattern = {
        patternId: "pattern123",
        familyId: "family123",
        merchantName: "Netflix",
        averageAmount: 15.99,
        frequency: "monthly",
        confidenceScore: 95,
      };

      mockSend.mockResolvedValue({});

      const result = await savePattern(pattern);

      expect(result.patternId).toBe("pattern123");
    });
  });

  describe("getPatternsByFamily", () => {
    it("should query all patterns for a family", async () => {
      const mockPatterns = [
        { PK: "FAMILY#family123", SK: "PATTERN#pattern1", status: "pending" },
        { PK: "FAMILY#family123", SK: "PATTERN#pattern2", status: "approved" },
      ];

      mockSend.mockResolvedValue({ Items: mockPatterns });

      const result = await getPatternsByFamily("family123");

      expect(mockSend).toHaveBeenCalled();
      expect(result).toEqual(mockPatterns);
    });

    it("should filter patterns by status", async () => {
      const mockPatterns = [
        { PK: "FAMILY#family123", SK: "PATTERN#pattern1", status: "pending" },
      ];

      mockSend.mockResolvedValue({ Items: mockPatterns });

      const result = await getPatternsByFamily("family123", "pending");

      expect(mockSend).toHaveBeenCalled();
      expect(result).toEqual(mockPatterns);
    });

    it("should throw error if familyId is missing", async () => {
      await expect(getPatternsByFamily(null)).rejects.toThrow(
        "familyId is required",
      );
    });

    it("should handle DynamoDB errors", async () => {
      mockSend.mockRejectedValue(new Error("DynamoDB error"));

      await expect(getPatternsByFamily("family123")).rejects.toThrow(
        "Failed to fetch patterns",
      );
    });

    it("should return empty array if no patterns found", async () => {
      mockSend.mockResolvedValue({ Items: [] });

      const result = await getPatternsByFamily("family123");

      expect(result).toEqual([]);
    });
  });

  describe("updatePatternStatus", () => {
    it("should update pattern status to approved", async () => {
      const mockUpdated = {
        PK: "FAMILY#family123",
        SK: "PATTERN#pattern123",
        status: "approved",
        approvedAt: expect.any(String),
        approvedBy: "user123",
      };

      mockSend.mockResolvedValue({ Attributes: mockUpdated });

      const result = await updatePatternStatus(
        "family123",
        "pattern123",
        "approved",
        "user123",
      );

      expect(mockSend).toHaveBeenCalled();
      expect(result).toEqual(mockUpdated);
    });

    it("should include billId when approving with bill creation", async () => {
      const mockUpdated = {
        PK: "FAMILY#family123",
        SK: "PATTERN#pattern123",
        status: "approved",
        billId: "bill123",
      };

      mockSend.mockResolvedValue({ Attributes: mockUpdated });

      const result = await updatePatternStatus(
        "family123",
        "pattern123",
        "approved",
        "user123",
        "bill123",
      );

      expect(result.billId).toBe("bill123");
    });

    it("should update pattern status to rejected", async () => {
      const mockUpdated = {
        PK: "FAMILY#family123",
        SK: "PATTERN#pattern123",
        status: "rejected",
      };

      mockSend.mockResolvedValue({ Attributes: mockUpdated });

      const result = await updatePatternStatus(
        "family123",
        "pattern123",
        "rejected",
        "user123",
      );

      expect(result.status).toBe("rejected");
    });

    it("should throw error if required parameters are missing", async () => {
      await expect(
        updatePatternStatus(null, "pattern123", "approved", "user123"),
      ).rejects.toThrow("familyId, patternId, and status are required");
    });

    it("should throw error for invalid status", async () => {
      await expect(
        updatePatternStatus("family123", "pattern123", "invalid", "user123"),
      ).rejects.toThrow("Invalid status");
    });

    it("should handle DynamoDB errors", async () => {
      mockSend.mockRejectedValue(new Error("DynamoDB error"));

      await expect(
        updatePatternStatus("family123", "pattern123", "approved", "user123"),
      ).rejects.toThrow("Failed to update pattern status");
    });
  });
});
