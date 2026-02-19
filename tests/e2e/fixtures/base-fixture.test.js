/**
 * Unit tests for E2E base fixture
 */

// Mock dependencies BEFORE any imports
jest.mock("../utils/auth");
jest.mock("../utils/data-manager");

const { BaseFixture } = require("./base-fixture");
const {
  createCognitoUser,
  authenticateUser,
  deleteCognitoUser,
} = require("../utils/auth");
const { DataManager } = require("../utils/data-manager");

describe("E2E Base Fixture", () => {
  let fixture;
  let mockDataManager;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock DataManager
    mockDataManager = {
      generateUniqueId: jest.fn((prefix) => `${prefix}-mock-id`),
      createUser: jest.fn().mockResolvedValue({}),
      createFamily: jest.fn().mockResolvedValue({}),
      createBudget: jest.fn().mockResolvedValue({}),
      createTransaction: jest.fn().mockResolvedValue({}),
      createBankAccount: jest.fn().mockResolvedValue({}),
      createGoal: jest.fn().mockResolvedValue({}),
      cleanup: jest.fn().mockResolvedValue(undefined),
    };

    DataManager.mockImplementation(() => mockDataManager);

    // Create new fixture instance
    fixture = new BaseFixture();
  });

  describe("createAuthenticatedUser", () => {
    it("should create authenticated user with default role", async () => {
      createCognitoUser.mockResolvedValueOnce({
        userId: "user-123",
        email: "test@example.com",
        attributes: [],
      });

      authenticateUser.mockResolvedValueOnce({
        accessToken: "access-token",
        idToken: "id-token",
        refreshToken: "refresh-token",
        expiresIn: 3600,
      });

      const result = await fixture.createAuthenticatedUser();

      expect(result.userId).toBe("user-123");
      expect(result.role).toBe("primary");
      expect(result.tokens.accessToken).toBe("access-token");
      expect(createCognitoUser).toHaveBeenCalledTimes(1);
      expect(authenticateUser).toHaveBeenCalledTimes(1);
      expect(mockDataManager.createUser).toHaveBeenCalledTimes(1);
      expect(mockDataManager.createFamily).toHaveBeenCalledTimes(1);
    });

    it("should create authenticated user with specific role", async () => {
      createCognitoUser.mockResolvedValueOnce({
        userId: "user-456",
        email: "spouse@example.com",
        attributes: [],
      });

      authenticateUser.mockResolvedValueOnce({
        accessToken: "access-token",
        idToken: "id-token",
        refreshToken: "refresh-token",
        expiresIn: 3600,
      });

      const result = await fixture.createAuthenticatedUser("spouse");

      expect(result.role).toBe("spouse");
      expect(createCognitoUser).toHaveBeenCalledWith(
        expect.any(String),
        "Test123!@#",
        expect.objectContaining({ role: "spouse" }),
      );
    });

    it("should track created user for cleanup", async () => {
      createCognitoUser.mockResolvedValueOnce({
        userId: "user-789",
        email: "test@example.com",
        attributes: [],
      });

      authenticateUser.mockResolvedValueOnce({
        accessToken: "access-token",
        idToken: "id-token",
        refreshToken: "refresh-token",
        expiresIn: 3600,
      });

      await fixture.createAuthenticatedUser();

      expect(fixture.createdUsers).toHaveLength(1);
      expect(fixture.createdUsers[0].userId).toBe("user-789");
    });

    it("should throw error if user creation fails", async () => {
      createCognitoUser.mockRejectedValueOnce(new Error("Cognito error"));

      await expect(fixture.createAuthenticatedUser()).rejects.toThrow(
        "Failed to create authenticated user: Cognito error",
      );
    });
  });

  describe("authenticate", () => {
    it("should authenticate existing user", async () => {
      authenticateUser.mockResolvedValueOnce({
        accessToken: "access-token",
        idToken: "id-token",
        refreshToken: "refresh-token",
        expiresIn: 3600,
      });

      const result = await fixture.authenticate(
        "test@example.com",
        "Test123!@#",
      );

      expect(result.accessToken).toBe("access-token");
      expect(authenticateUser).toHaveBeenCalledWith(
        "test@example.com",
        "Test123!@#",
      );
    });

    it("should throw error if authentication fails", async () => {
      authenticateUser.mockRejectedValueOnce(new Error("Invalid credentials"));

      await expect(
        fixture.authenticate("test@example.com", "WrongPassword"),
      ).rejects.toThrow("Failed to authenticate: Invalid credentials");
    });
  });

  describe("createBudget", () => {
    it("should create budget", async () => {
      const categories = [{ id: "cat-1", name: "Food", amount: 500 }];

      mockDataManager.createBudget.mockResolvedValueOnce({
        budgetId: "budget-123",
        familyId: "family-456",
        month: "2024-02",
        categories,
      });

      const result = await fixture.createBudget(
        "family-456",
        "2024-02",
        categories,
      );

      expect(result.budgetId).toBe("budget-123");
      expect(mockDataManager.createBudget).toHaveBeenCalledWith(
        "family-456",
        "2024-02",
        categories,
      );
    });

    it("should throw error if budget creation fails", async () => {
      mockDataManager.createBudget.mockRejectedValueOnce(
        new Error("DynamoDB error"),
      );

      await expect(
        fixture.createBudget("family-456", "2024-02", []),
      ).rejects.toThrow("Failed to create budget: DynamoDB error");
    });
  });

  describe("createTransaction", () => {
    it("should create transaction without description", async () => {
      mockDataManager.createTransaction.mockResolvedValueOnce({
        transactionId: "txn-123",
        familyId: "family-456",
        budgetId: "budget-789",
        categoryId: "cat-1",
        amount: 50.25,
      });

      const result = await fixture.createTransaction(
        "family-456",
        "budget-789",
        "cat-1",
        50.25,
      );

      expect(result.transactionId).toBe("txn-123");
      expect(mockDataManager.createTransaction).toHaveBeenCalledWith(
        "family-456",
        "budget-789",
        "cat-1",
        50.25,
      );
    });

    it("should create transaction with description", async () => {
      mockDataManager.createTransaction.mockResolvedValueOnce({
        transactionId: "txn-456",
        familyId: "family-456",
        budgetId: "budget-789",
        categoryId: "cat-1",
        amount: 50.25,
      });

      const result = await fixture.createTransaction(
        "family-456",
        "budget-789",
        "cat-1",
        50.25,
        "Grocery shopping",
      );

      expect(result.description).toBe("Grocery shopping");
    });

    it("should throw error if transaction creation fails", async () => {
      mockDataManager.createTransaction.mockRejectedValueOnce(
        new Error("DynamoDB error"),
      );

      await expect(
        fixture.createTransaction("family-456", "budget-789", "cat-1", 50.25),
      ).rejects.toThrow("Failed to create transaction: DynamoDB error");
    });
  });

  describe("createBankAccount", () => {
    it("should create bank account", async () => {
      mockDataManager.createBankAccount.mockResolvedValueOnce({
        accountId: "account-123",
        familyId: "family-456",
        plaidAccessToken: "plaid-token",
        accountName: "Test Checking",
        accountType: "depository",
        balance: 1000,
      });

      const result = await fixture.createBankAccount(
        "family-456",
        "plaid-token",
      );

      expect(result.accountId).toBe("account-123");
      expect(mockDataManager.createBankAccount).toHaveBeenCalledWith(
        "family-456",
        "plaid-token",
        expect.objectContaining({
          accountName: "Test Checking",
          accountType: "depository",
          balance: 1000,
        }),
      );
    });

    it("should throw error if account creation fails", async () => {
      mockDataManager.createBankAccount.mockRejectedValueOnce(
        new Error("DynamoDB error"),
      );

      await expect(
        fixture.createBankAccount("family-456", "plaid-token"),
      ).rejects.toThrow("Failed to create bank account: DynamoDB error");
    });
  });

  describe("createGoal", () => {
    it("should create goal with default current amount", async () => {
      mockDataManager.createGoal.mockResolvedValueOnce({
        goalId: "goal-123",
        familyId: "family-456",
        type: "savings",
        name: "Emergency Fund",
        targetAmount: 5000,
        currentAmount: 0,
      });

      const result = await fixture.createGoal(
        "family-456",
        "savings",
        "Emergency Fund",
        5000,
      );

      expect(result.goalId).toBe("goal-123");
      expect(result.currentAmount).toBe(0);
      expect(mockDataManager.createGoal).toHaveBeenCalledWith(
        "family-456",
        "savings",
        "Emergency Fund",
        5000,
      );
    });

    it("should create goal with custom current amount", async () => {
      mockDataManager.createGoal.mockResolvedValueOnce({
        goalId: "goal-456",
        familyId: "family-456",
        type: "debt",
        name: "Credit Card",
        targetAmount: 2000,
        currentAmount: 0,
      });

      const result = await fixture.createGoal(
        "family-456",
        "debt",
        "Credit Card",
        2000,
        500,
      );

      expect(result.currentAmount).toBe(500);
    });

    it("should throw error if goal creation fails", async () => {
      mockDataManager.createGoal.mockRejectedValueOnce(
        new Error("DynamoDB error"),
      );

      await expect(
        fixture.createGoal("family-456", "savings", "Emergency Fund", 5000),
      ).rejects.toThrow("Failed to create goal: DynamoDB error");
    });
  });

  describe("cleanup", () => {
    it("should delete all Cognito users and DynamoDB data", async () => {
      // Create some users
      createCognitoUser.mockResolvedValue({
        userId: "user-123",
        email: "test@example.com",
        attributes: [],
      });

      authenticateUser.mockResolvedValue({
        accessToken: "access-token",
        idToken: "id-token",
        refreshToken: "refresh-token",
        expiresIn: 3600,
      });

      await fixture.createAuthenticatedUser();
      await fixture.createAuthenticatedUser();

      expect(fixture.createdUsers).toHaveLength(2);

      deleteCognitoUser.mockResolvedValue(undefined);

      await fixture.cleanup();

      expect(deleteCognitoUser).toHaveBeenCalledTimes(2);
      expect(mockDataManager.cleanup).toHaveBeenCalledTimes(1);
      expect(fixture.createdUsers).toHaveLength(0);
    });

    it("should continue cleanup even if Cognito deletion fails", async () => {
      fixture.createdUsers = [
        {
          userId: "user-123",
          email: "test1@example.com",
          familyId: "family-1",
        },
        {
          userId: "user-456",
          email: "test2@example.com",
          familyId: "family-2",
        },
      ];

      deleteCognitoUser
        .mockRejectedValueOnce(new Error("Delete failed"))
        .mockResolvedValueOnce(undefined);

      await expect(fixture.cleanup()).rejects.toThrow(
        "Cleanup errors: Failed to delete Cognito user user-123: Delete failed",
      );

      expect(deleteCognitoUser).toHaveBeenCalledTimes(2);
      expect(mockDataManager.cleanup).toHaveBeenCalledTimes(1);
      expect(fixture.createdUsers).toHaveLength(0);
    });

    it("should continue cleanup even if DynamoDB cleanup fails", async () => {
      fixture.createdUsers = [
        { userId: "user-123", email: "test@example.com", familyId: "family-1" },
      ];

      deleteCognitoUser.mockResolvedValue(undefined);
      mockDataManager.cleanup.mockRejectedValueOnce(
        new Error("Cleanup failed"),
      );

      await expect(fixture.cleanup()).rejects.toThrow(
        "Cleanup errors: Failed to cleanup DynamoDB data: Cleanup failed",
      );

      expect(fixture.createdUsers).toHaveLength(0);
    });
  });
});
