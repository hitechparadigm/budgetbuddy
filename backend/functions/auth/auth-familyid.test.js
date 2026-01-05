/**
 * BudgetBuddy Authentication Lambda Function Tests - FamilyId Fix
 *
 * Focused test suite for the familyId mismatch fix where auth service
 * creates budgets using dynamoHelpers instead of raw DynamoDB format.
 */

// Mock the utils layer first
const mockDynamoHelpers = {
  putItem: jest.fn(),
  getItem: jest.fn(),
  updateItem: jest.fn(),
  queryByPK: jest.fn(),
};

// Mock AWS SDK clients
const mockCognitoClient = {
  send: jest.fn(),
};

const mockDynamoClient = {
  send: jest.fn(),
};

// Mock modules before requiring the handler
jest.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  CognitoIdentityProviderClient: jest.fn(() => mockCognitoClient),
  AdminCreateUserCommand: jest.fn(),
  AdminSetUserPasswordCommand: jest.fn(),
  InitiateAuthCommand: jest.fn(),
  AdminGetUserCommand: jest.fn(),
}));

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn(() => mockDynamoClient),
  TransactWriteItemsCommand: jest.fn(),
  GetItemCommand: jest.fn(),
  UpdateItemCommand: jest.fn(),
  PutItemCommand: jest.fn(),
}));

// Mock the require call for utils in the handler
jest.mock("/opt/nodejs/utils", () => ({
  dynamoHelpers: mockDynamoHelpers,
}));

describe("Auth Service - FamilyId Fix", () => {
  let handler;

  beforeAll(() => {
    // Set environment variables
    process.env.USER_POOL_ID = "us-east-1_TEST123";
    process.env.CLIENT_ID = "test-client-id";
    process.env.TABLE_NAME = "test-table";

    // Now require the handler after mocks are set up
    handler = require("./index").handler;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Onboarding Completion - Budget Creation Format", () => {
    const mockOnboardingEvent = {
      httpMethod: "POST",
      path: "/auth/onboarding",
      headers: {
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJNT0NLX1VTRVJfSUQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJnaXZlbl9uYW1lIjoiVGVzdCIsImZhbWlseV9uYW1lIjoiVXNlciJ9.MOCK_SIGNATURE_FOR_TESTING",
      },
      body: JSON.stringify({
        city: "Toronto",
        country: "Canada",
        familySize: 2,
        selectedCategories: [
          {
            name: "Groceries",
            icon: "🛒",
            adjustedAmount: 500,
          },
          {
            name: "Transportation",
            icon: "🚗",
            adjustedAmount: 300,
          },
        ],
      }),
    };

    const mockContext = {
      awsRequestId: "test-request-id",
    };

    beforeEach(() => {
      const mockUserId = "user_123456789";
      const mockFamilyId = `family_${mockUserId}`;

      // Mock user profile retrieval
      mockDynamoHelpers.getItem.mockResolvedValue({
        familyId: { S: mockFamilyId },
        userId: { S: mockUserId },
        email: { S: "test@example.com" },
        firstName: { S: "John" },
        lastName: { S: "Doe" },
      });

      // Mock user profile update
      mockDynamoHelpers.updateItem.mockResolvedValue({});

      // Mock budget creation
      mockDynamoHelpers.putItem.mockResolvedValue({});
    });

    test("should create budget using dynamoHelpers with plain JavaScript object format", async () => {
      const result = await handler(mockOnboardingEvent, mockContext);

      expect(result.statusCode).toBe(200);

      // Verify budget was created using dynamoHelpers.putItem
      expect(mockDynamoHelpers.putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          // Should use plain JavaScript object format, not DynamoDB attribute format
          PK: expect.stringMatching(/^FAMILY#family_user_/),
          SK: expect.stringMatching(/^BUDGET#\d{4}-\d{2}$/),
          entityType: "BUDGET",
          familyId: expect.stringMatching(/^family_user_/),
          month: expect.stringMatching(/^\d{4}-\d{2}$/),
          totalIncome: 0,
          totalSavings: 0,
          totalExpenses: 800, // 500 + 300
          remainingBalance: -800,
          groups: expect.objectContaining({
            income: [],
            savings: [],
            expenses: expect.arrayContaining([
              expect.objectContaining({
                name: "Groceries",
                icon: "🛒",
                planned: 500,
              }),
              expect.objectContaining({
                name: "Transportation",
                icon: "🚗",
                planned: 300,
              }),
            ]),
          }),
          isAIGenerated: true,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        })
      );
    });

    test("should NOT use raw DynamoDB attribute format", async () => {
      await handler(mockOnboardingEvent, mockContext);

      const budgetObject = mockDynamoHelpers.putItem.mock.calls[0][0];

      // Verify the budget object uses plain JavaScript types (not DynamoDB attribute types)
      expect(typeof budgetObject.familyId).toBe("string");
      expect(typeof budgetObject.month).toBe("string");
      expect(typeof budgetObject.totalExpenses).toBe("number");
      expect(typeof budgetObject.remainingBalance).toBe("number");
      expect(typeof budgetObject.isAIGenerated).toBe("boolean");
      expect(typeof budgetObject.groups).toBe("object");

      // Ensure it's NOT using DynamoDB attribute format
      expect(budgetObject.familyId).not.toHaveProperty("S");
      expect(budgetObject.month).not.toHaveProperty("S");
      expect(budgetObject.totalExpenses).not.toHaveProperty("N");
      expect(budgetObject.isAIGenerated).not.toHaveProperty("BOOL");
    });

    test("should use consistent familyId format compatible with budget service", async () => {
      await handler(mockOnboardingEvent, mockContext);

      const budgetObject = mockDynamoHelpers.putItem.mock.calls[0][0];

      // Extract familyId from the budget object
      const familyId = budgetObject.familyId;
      const pkFamilyId = budgetObject.PK.replace("FAMILY#", "");

      // Verify familyId consistency
      expect(familyId).toBe(pkFamilyId);
      expect(familyId).toMatch(/^family_user_/);

      // Verify it matches the format that budget service expects
      expect(familyId).toMatch(/^family_user_\d+$/);
    });

    test("should return success response with budget creation confirmation", async () => {
      const result = await handler(mockOnboardingEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);

      expect(body.message).toBe("Onboarding completed successfully");
      expect(body.budgetCreated).toBe(true);
      expect(body.budgetId).toMatch(/^budget_/);
      expect(body.month).toMatch(/^\d{4}-\d{2}$/);
      expect(body.totalExpenses).toBe(800);
      expect(body.categoriesCreated).toBe(2);
    });

    test("should handle budget creation errors gracefully", async () => {
      mockDynamoHelpers.putItem.mockRejectedValue(new Error("DynamoDB error"));

      const result = await handler(mockOnboardingEvent, mockContext);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error).toBe("Internal Server Error");
      expect(body.message).toBe("Failed to complete onboarding");
    });
  });

  describe("Health Check", () => {
    test("should return healthy status", async () => {
      const event = {
        httpMethod: "GET",
        path: "/auth/health",
        headers: {},
      };

      const mockContext = {
        awsRequestId: "test-request-id",
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.status).toBe("healthy");
      expect(body.service).toBe("auth");
    });
  });
});
