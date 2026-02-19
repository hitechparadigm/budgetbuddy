/**
 * Unit tests for E2E data manager utilities
 */

// Mock AWS SDK BEFORE any imports
jest.mock("@aws-sdk/client-dynamodb");
jest.mock("@aws-sdk/util-dynamodb");

const { DataManager } = require("./data-manager");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");

describe("E2E Data Manager", () => {
  let dataManager;
  let mockSend;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock the send method
    mockSend = jest.fn();
    DynamoDBClient.mockImplementation(() => ({
      send: mockSend,
    }));

    // Mock marshall to return the input (simplified)
    marshall.mockImplementation((obj) => obj);

    // Set required environment variables
    process.env.DYNAMODB_TABLE_NAME = "test-table";
    process.env.AWS_REGION = "us-east-1";

    // Create new data manager instance
    dataManager = new DataManager();
  });

  afterEach(() => {
    delete process.env.DYNAMODB_TABLE_NAME;
    delete process.env.AWS_REGION;
  });

  describe("generateUniqueId", () => {
    it("should generate unique ID with prefix", () => {
      const id1 = dataManager.generateUniqueId("test");
      const id2 = dataManager.generateUniqueId("test");

      expect(id1).toMatch(/^test-\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^test-\d+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it("should use different prefixes", () => {
      const userId = dataManager.generateUniqueId("user");
      const familyId = dataManager.generateUniqueId("family");

      expect(userId).toMatch(/^user-/);
      expect(familyId).toMatch(/^family-/);
    });
  });

  describe("createUser", () => {
    it("should create a user", async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await dataManager.createUser(
        "user-123",
        "test@example.com",
        "family-456",
      );

      expect(result.userId).toBe("user-123");
      expect(result.email).toBe("test@example.com");
      expect(result.familyId).toBe("family-456");
      expect(result.PK).toBe("USER#user-123");
      expect(result.SK).toBe("PROFILE");
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("should track created user for cleanup", async () => {
      mockSend.mockResolvedValueOnce({});

      await dataManager.createUser(
        "user-123",
        "test@example.com",
        "family-456",
      );

      expect(dataManager.createdItems).toHaveLength(1);
      expect(dataManager.createdItems[0]).toEqual({
        PK: "USER#user-123",
        SK: "PROFILE",
      });
    });

    it("should throw error if TABLE_NAME is missing", async () => {
      delete process.env.DYNAMODB_TABLE_NAME;

      await expect(
        dataManager.createUser("user-123", "test@example.com", "family-456"),
      ).rejects.toThrow("DYNAMODB_TABLE_NAME environment variable is required");
    });

    it("should throw error if creation fails", async () => {
      mockSend.mockRejectedValueOnce(new Error("DynamoDB error"));

      await expect(
        dataManager.createUser("user-123", "test@example.com", "family-456"),
      ).rejects.toThrow("Failed to create user: DynamoDB error");
    });
  });

  describe("createFamily", () => {
    it("should create a family", async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await dataManager.createFamily("family-123", "user-456");

      expect(result.familyId).toBe("family-123");
      expect(result.primaryUserId).toBe("user-456");
      expect(result.PK).toBe("FAMILY#family-123");
      expect(result.SK).toBe("METADATA");
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("should track created family for cleanup", async () => {
      mockSend.mockResolvedValueOnce({});

      await dataManager.createFamily("family-123", "user-456");

      expect(dataManager.createdItems).toHaveLength(1);
      expect(dataManager.createdItems[0]).toEqual({
        PK: "FAMILY#family-123",
        SK: "METADATA",
      });
    });
  });

  describe("createBudget", () => {
    it("should create a budget", async () => {
      mockSend.mockResolvedValueOnce({});

      const categories = [
        { id: "cat-1", name: "Food", amount: 500 },
        { id: "cat-2", name: "Transport", amount: 200 },
      ];

      const result = await dataManager.createBudget(
        "family-123",
        "2024-02",
        categories,
      );

      expect(result.familyId).toBe("family-123");
      expect(result.month).toBe("2024-02");
      expect(result.categories).toEqual(categories);
      expect(result.PK).toBe("FAMILY#family-123");
      expect(result.SK).toBe("BUDGET#2024-02");
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("should track created budget for cleanup", async () => {
      mockSend.mockResolvedValueOnce({});

      await dataManager.createBudget("family-123", "2024-02", []);

      expect(dataManager.createdItems).toHaveLength(1);
      expect(dataManager.createdItems[0]).toEqual({
        PK: "FAMILY#family-123",
        SK: "BUDGET#2024-02",
      });
    });
  });

  describe("createTransaction", () => {
    it("should create a transaction", async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await dataManager.createTransaction(
        "family-123",
        "budget-456",
        "category-789",
        50.25,
      );

      expect(result.familyId).toBe("family-123");
      expect(result.budgetId).toBe("budget-456");
      expect(result.categoryId).toBe("category-789");
      expect(result.amount).toBe(50.25);
      expect(result.PK).toBe("FAMILY#family-123");
      expect(result.SK).toMatch(/^TRANSACTION#transaction-/);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("should track created transaction for cleanup", async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await dataManager.createTransaction(
        "family-123",
        "budget-456",
        "category-789",
        50.25,
      );

      expect(dataManager.createdItems).toHaveLength(1);
      expect(dataManager.createdItems[0].PK).toBe("FAMILY#family-123");
      expect(dataManager.createdItems[0].SK).toBe(result.SK);
    });
  });

  describe("createBankAccount", () => {
    it("should create a bank account", async () => {
      mockSend.mockResolvedValueOnce({});

      const accountData = {
        accountName: "Checking",
        accountType: "depository",
        balance: 1000,
      };

      const result = await dataManager.createBankAccount(
        "family-123",
        "plaid-token-456",
        accountData,
      );

      expect(result.familyId).toBe("family-123");
      expect(result.plaidAccessToken).toBe("plaid-token-456");
      expect(result.accountName).toBe("Checking");
      expect(result.accountType).toBe("depository");
      expect(result.balance).toBe(1000);
      expect(result.PK).toBe("FAMILY#family-123");
      expect(result.SK).toMatch(/^ACCOUNT#account-/);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("should track created account for cleanup", async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await dataManager.createBankAccount(
        "family-123",
        "plaid-token-456",
        {},
      );

      expect(dataManager.createdItems).toHaveLength(1);
      expect(dataManager.createdItems[0].PK).toBe("FAMILY#family-123");
      expect(dataManager.createdItems[0].SK).toBe(result.SK);
    });
  });

  describe("createGoal", () => {
    it("should create a goal", async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await dataManager.createGoal(
        "family-123",
        "savings",
        "Emergency Fund",
        5000,
      );

      expect(result.familyId).toBe("family-123");
      expect(result.type).toBe("savings");
      expect(result.name).toBe("Emergency Fund");
      expect(result.targetAmount).toBe(5000);
      expect(result.currentAmount).toBe(0);
      expect(result.PK).toBe("FAMILY#family-123");
      expect(result.SK).toMatch(/^GOAL#goal-/);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("should track created goal for cleanup", async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await dataManager.createGoal(
        "family-123",
        "debt",
        "Credit Card",
        2000,
      );

      expect(dataManager.createdItems).toHaveLength(1);
      expect(dataManager.createdItems[0].PK).toBe("FAMILY#family-123");
      expect(dataManager.createdItems[0].SK).toBe(result.SK);
    });
  });

  describe("cleanup", () => {
    it("should delete all tracked items", async () => {
      // Create multiple items
      mockSend
        .mockResolvedValueOnce({}) // createUser
        .mockResolvedValueOnce({}) // createFamily
        .mockResolvedValueOnce({}) // createBudget
        .mockResolvedValueOnce({}) // delete user
        .mockResolvedValueOnce({}) // delete family
        .mockResolvedValueOnce({}); // delete budget

      await dataManager.createUser(
        "user-123",
        "test@example.com",
        "family-456",
      );
      await dataManager.createFamily("family-456", "user-123");
      await dataManager.createBudget("family-456", "2024-02", []);

      expect(dataManager.createdItems).toHaveLength(3);

      await dataManager.cleanup();

      expect(mockSend).toHaveBeenCalledTimes(6); // 3 creates + 3 deletes
      expect(dataManager.createdItems).toHaveLength(0);
    });

    it("should continue cleanup even if some deletes fail", async () => {
      mockSend
        .mockResolvedValueOnce({}) // createUser
        .mockResolvedValueOnce({}) // createFamily
        .mockRejectedValueOnce(new Error("Delete failed")) // delete user fails
        .mockResolvedValueOnce({}); // delete family succeeds

      await dataManager.createUser(
        "user-123",
        "test@example.com",
        "family-456",
      );
      await dataManager.createFamily("family-456", "user-123");

      await expect(dataManager.cleanup()).rejects.toThrow(
        "Cleanup errors: Failed to delete USER#user-123#PROFILE: Delete failed",
      );

      expect(dataManager.createdItems).toHaveLength(0);
    });

    it("should throw error if TABLE_NAME is missing", async () => {
      delete process.env.DYNAMODB_TABLE_NAME;

      await expect(dataManager.cleanup()).rejects.toThrow(
        "DYNAMODB_TABLE_NAME environment variable is required",
      );
    });
  });
});
