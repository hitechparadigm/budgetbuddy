/**
 * BudgetBuddy Authentication Lambda Function Tests
 *
 * Comprehensive test suite for authentication operations including
 * user registration, onboarding completion, and budget creation.
 *
 * Tests specifically cover the familyId mismatch fix where auth service
 * creates budgets using dynamoHelpers instead of raw DynamoDB format.
 */

const { handler } = require("./index");

// Mock AWS SDK clients
const mockCognitoClient = {
  send: jest.fn(),
};

const mockDynamoClient = {
  send: jest.fn(),
};

// Mock the utils layer
jest.mock("../../layers/common/nodejs/utils", () => ({
  dynamoHelpers: {
    putItem: jest.fn(),
    getItem: jest.fn(),
    updateItem: jest.fn(),
    queryByPK: jest.fn(),
  },
}));

// Mock AWS SDK
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

describe("Authentication Lambda Handler", () => {
  const mockContext = {
    awsRequestId: "test-request-id",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.USER_POOL_ID = "us-east-1_TEST123";
    process.env.CLIENT_ID = "test-client-id";
    process.env.TABLE_NAME = "test-table";
  });

  describe("Health Check", () => {
    test("should return healthy status", async () => {
      const event = {
        httpMethod: "GET",
        path: "/auth/health",
        headers: {},
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.status).toBe("healthy");
      expect(body.service).toBe("auth");
    });
  });

  describe("CORS Handling", () => {
    test("should handle OPTIONS request", async () => {
      const event = {
        httpMethod: "OPTIONS",
        path: "/auth/register",
        headers: {},
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.headers["Access-Control-Allow-Methods"]).toContain("POST");
    });
  });

  describe("Onboarding Completion - FamilyId Fix", () => {
    const mockOnboardingEvent = {
      httpMethod: "POST",
      path: "/auth/onboarding",
      headers: {
        Authorization: "Bearer mock-jwt-token",
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

    beforeEach(() => {
      // Mock JWT token parsing
      const mockUserId = "user_123456789";
      const mockFamilyId = `family_${mockUserId}`;

      // Mock user profile retrieval
      const { dynamoHelpers } = require("/opt/nodejs/utils");
      dynamoHelpers.getItem.mockResolvedValue({
        userId: mockUserId,
        familyId: mockFamilyId,
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
      });

      // Mock user profile update
      dynamoHelpers.updateItem.mockResolvedValue({});

      // Mock budget creation
      dynamoHelpers.putItem.mockResolvedValue({});
    });

    test("should create budget using dynamoHelpers with correct format", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");

      const result = await handler(mockOnboardingEvent, mockContext);

      expect(result.statusCode).toBe(200);

      // Verify budget was created using dynamoHelpers.putItem
      expect(dynamoHelpers.putItem).toHaveBeenCalledWith(
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

    test("should use consistent familyId format", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");

      await handler(mockOnboardingEvent, mockContext);

      const putItemCall = dynamoHelpers.putItem.mock.calls[0][0];

      // Extract familyId from the budget object
      const familyId = putItemCall.familyId;
      const pkFamilyId = putItemCall.PK.replace("FAMILY#", "");

      // Verify familyId consistency
      expect(familyId).toBe(pkFamilyId);
      expect(familyId).toMatch(/^family_user_/);
    });

    test("should create budget with correct structure for budget service compatibility", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");

      await handler(mockOnboardingEvent, mockContext);

      const budgetObject = dynamoHelpers.putItem.mock.calls[0][0];

      // Verify the budget object uses plain JavaScript types (not DynamoDB attribute types)
      expect(typeof budgetObject.familyId).toBe("string");
      expect(typeof budgetObject.month).toBe("string");
      expect(typeof budgetObject.totalExpenses).toBe("number");
      expect(typeof budgetObject.remainingBalance).toBe("number");
      expect(typeof budgetObject.isAIGenerated).toBe("boolean");
      expect(typeof budgetObject.groups).toBe("object");

      // Verify groups structure
      expect(Array.isArray(budgetObject.groups.income)).toBe(true);
      expect(Array.isArray(budgetObject.groups.savings)).toBe(true);
      expect(Array.isArray(budgetObject.groups.expenses)).toBe(true);

      // Verify expense categories structure
      expect(budgetObject.groups.expenses).toHaveLength(2);
      budgetObject.groups.expenses.forEach((category) => {
        expect(typeof category.id).toBe("string");
        expect(typeof category.name).toBe("string");
        expect(typeof category.icon).toBe("string");
        expect(typeof category.planned).toBe("number");
        expect(typeof category.actual).toBe("number");
        expect(typeof category.isRecurring).toBe("boolean");
      });
    });

    test("should handle missing user profile gracefully", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");
      dynamoHelpers.getItem.mockResolvedValue(null);

      const result = await handler(mockOnboardingEvent, mockContext);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error).toBe("Not Found");
      expect(body.message).toBe("User profile not found");
    });

    test("should validate required onboarding fields", async () => {
      const invalidEvent = {
        ...mockOnboardingEvent,
        body: JSON.stringify({
          city: "Toronto",
          // Missing required fields
        }),
      };

      const result = await handler(invalidEvent, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe("Validation Error");
      expect(body.message).toContain("required");
    });

    test("should return success response with budget details", async () => {
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

    test("should handle DynamoDB errors gracefully", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");
      dynamoHelpers.putItem.mockRejectedValue(new Error("DynamoDB error"));

      const result = await handler(mockOnboardingEvent, mockContext);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error).toBe("Internal Server Error");
      expect(body.message).toBe("Failed to complete onboarding");
    });
  });

  describe("User Registration", () => {
    const mockRegisterEvent = {
      httpMethod: "POST",
      path: "/auth/register",
      headers: {},
      body: JSON.stringify({
        email: "test@example.com",
        password: "TestPassword123!",
        firstName: "John",
        lastName: "Doe",
      }),
    };

    test("should validate email format", async () => {
      const invalidEvent = {
        ...mockRegisterEvent,
        body: JSON.stringify({
          ...JSON.parse(mockRegisterEvent.body),
          email: "invalid-email",
        }),
      };

      const result = await handler(invalidEvent, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.errors).toContain("Email must be a valid email address");
    });

    test("should validate password length", async () => {
      const invalidEvent = {
        ...mockRegisterEvent,
        body: JSON.stringify({
          ...JSON.parse(mockRegisterEvent.body),
          password: "123",
        }),
      };

      const result = await handler(invalidEvent, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.errors).toContain(
        "Password must be at least 8 characters long"
      );
    });

    test("should validate required fields", async () => {
      const invalidEvent = {
        ...mockRegisterEvent,
        body: JSON.stringify({
          email: "test@example.com",
          // Missing required fields
        }),
      };

      const result = await handler(invalidEvent, mockContext);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.errors).toContain(
        "Password is required and must be a string"
      );
      expect(body.errors).toContain(
        "First name is required and must be a string"
      );
      expect(body.errors).toContain(
        "Last name is required and must be a string"
      );
    });
  });

  describe("Profile Endpoint", () => {
    const mockProfileEvent = {
      httpMethod: "GET",
      path: "/auth/profile",
      headers: {
        Authorization: "Bearer mock-jwt-token",
      },
    };

    test("should require authorization header", async () => {
      const unauthorizedEvent = {
        ...mockProfileEvent,
        headers: {},
      };

      const result = await handler(unauthorizedEvent, mockContext);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toBe("Unauthorized");
      expect(body.message).toBe("Authorization header is required");
    });

    test("should return user profile when found", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");
      const mockProfile = {
        userId: "user_123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        familyId: "family_user_123",
        familyRole: "primary",
        accountType: "single",
        subscriptionTier: "free",
        onboardingCompleted: false,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };

      dynamoHelpers.getItem.mockResolvedValue(mockProfile);

      const result = await handler(mockProfileEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.userId).toBe("user_123");
      expect(body.email).toBe("test@example.com");
      expect(body.familyId).toBe("family_user_123");
    });

    test("should return 404 when profile not found", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");
      dynamoHelpers.getItem.mockResolvedValue(null);

      const result = await handler(mockProfileEvent, mockContext);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error).toBe("Not Found");
      expect(body.message).toBe("User profile not found");
    });
  });
});
