/**
 * BudgetBuddy Budget Management Lambda Function Tests
 *
 * Comprehensive test suite for budget CRUD operations including
 * budget creation, retrieval, and familyId consistency.
 *
 * Tests specifically cover the familyId mismatch fix where budget service
 * properly queries budgets created by auth service using dynamoHelpers.
 */

const { handler } = require("./index");

// Mock the utils layer
jest.mock("/opt/nodejs/utils", () => ({
  successResponse: jest.fn((data, message) => ({
    statusCode: 200,
    body: JSON.stringify({ success: true, data, message }),
  })),
  errorResponse: {
    badRequest: jest.fn((message) => ({
      statusCode: 400,
      body: JSON.stringify({ success: false, error: message }),
    })),
    notFound: jest.fn((message) => ({
      statusCode: 404,
      body: JSON.stringify({ success: false, error: message }),
    })),
    internalError: jest.fn((message) => ({
      statusCode: 500,
      body: JSON.stringify({ success: false, error: message }),
    })),
    unauthorized: jest.fn((message) => ({
      statusCode: 401,
      body: JSON.stringify({ success: false, error: message }),
    })),
    conflict: jest.fn((message) => ({
      statusCode: 409,
      body: JSON.stringify({ success: false, error: message }),
    })),
  },
  parseRequestBody: jest.fn((body) => JSON.parse(body)),
  getUserFromEvent: jest.fn(() => ({
    userId: "user_123456789",
    familyId: null, // Simulates missing custom:familyId in JWT token
    firstName: "John",
    lastName: "Doe",
    email: "test@example.com",
  })),
  generateId: {
    budget: jest.fn(() => "budget_" + Date.now()),
  },
  dynamoHelpers: {
    putItem: jest.fn(),
    queryByPK: jest.fn(),
    getItem: jest.fn(),
    updateItem: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("Budget Lambda Handler", () => {
  const mockContext = {
    awsRequestId: "test-request-id",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = "test-table";
  });

  describe("Health Check", () => {
    test("should return healthy status", async () => {
      const event = {
        httpMethod: "GET",
        path: "/budget/health",
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.status).toBe("healthy");
      expect(body.data.service).toBe("budget");
    });
  });

  describe("CORS Handling", () => {
    test("should handle OPTIONS request", async () => {
      const event = {
        httpMethod: "OPTIONS",
        path: "/budget",
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.headers["Access-Control-Allow-Origin"]).toBe("*");
      expect(result.headers["Access-Control-Allow-Methods"]).toContain("POST");
    });
  });

  describe("Get Budgets - FamilyId Fix", () => {
    const mockGetBudgetsEvent = {
      httpMethod: "GET",
      path: "/budget",
      requestContext: {
        authorizer: {
          claims: {
            sub: "user_123456789",
            email: "test@example.com",
            given_name: "John",
            family_name: "Doe",
            // Note: custom:familyId is missing, simulating the original issue
          },
        },
      },
    };

    test("should use fallback familyId when custom:familyId is missing from JWT", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");

      // Mock budget data that would be created by auth service
      const mockBudgets = [
        {
          budgetId: "budget_123",
          familyId: "family_user_123456789", // Matches fallback format
          month: "2026-01",
          totalIncome: 0,
          totalSavings: 0,
          totalExpenses: 800,
          remainingBalance: -800,
          groups: {
            income: [],
            savings: [],
            expenses: [
              {
                id: "cat_groceries_001",
                name: "Groceries",
                icon: "🛒",
                planned: 500,
                actual: 0,
                isRecurring: false,
              },
            ],
          },
          isAIGenerated: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ];

      dynamoHelpers.queryByPK.mockResolvedValue(mockBudgets);

      const result = await handler(mockGetBudgetsEvent, mockContext);

      expect(result.statusCode).toBe(200);

      // Verify the query used the correct familyId format
      expect(dynamoHelpers.queryByPK).toHaveBeenCalledWith(
        "FAMILY#family_user_123456789", // Should use fallback format
        expect.objectContaining({
          FilterExpression: "entityType = :entityType",
          ExpressionAttributeValues: {
            ":entityType": "BUDGET",
          },
        })
      );

      const body = JSON.parse(result.body);
      expect(body.data.budgets).toHaveLength(1);
      expect(body.data.budgets[0].familyId).toBe("family_user_123456789");
    });

    test("should return empty array when no budgets found", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");
      dynamoHelpers.queryByPK.mockResolvedValue([]);

      const result = await handler(mockGetBudgetsEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.budgets).toHaveLength(0);
      expect(body.data.count).toBe(0);
    });

    test("should sort budgets by month (most recent first)", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");

      const mockBudgets = [
        {
          budgetId: "budget_1",
          familyId: "family_user_123456789",
          month: "2025-11",
          totalIncome: 0,
          totalSavings: 0,
          totalExpenses: 500,
          remainingBalance: -500,
          groups: { income: [], savings: [], expenses: [] },
          isAIGenerated: false,
          createdAt: "2025-11-01T00:00:00.000Z",
          updatedAt: "2025-11-01T00:00:00.000Z",
        },
        {
          budgetId: "budget_2",
          familyId: "family_user_123456789",
          month: "2026-01",
          totalIncome: 0,
          totalSavings: 0,
          totalExpenses: 800,
          remainingBalance: -800,
          groups: { income: [], savings: [], expenses: [] },
          isAIGenerated: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ];

      dynamoHelpers.queryByPK.mockResolvedValue(mockBudgets);

      const result = await handler(mockGetBudgetsEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.budgets).toHaveLength(2);

      // Should be sorted by month (most recent first)
      expect(body.data.budgets[0].month).toBe("2026-01");
      expect(body.data.budgets[1].month).toBe("2025-11");
    });

    test("should handle DynamoDB query errors", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");
      dynamoHelpers.queryByPK.mockRejectedValue(new Error("DynamoDB error"));

      const result = await handler(mockGetBudgetsEvent, mockContext);

      expect(result.statusCode).toBe(500);
    });
  });

  describe("Create Budget", () => {
    const mockCreateBudgetEvent = {
      httpMethod: "POST",
      path: "/budget",
      body: JSON.stringify({
        month: "2026-01",
        groups: {
          income: [],
          savings: [],
          expenses: [
            {
              id: "cat_groceries_001",
              name: "Groceries",
              icon: "🛒",
              plannedAmount: 500,
            },
          ],
        },
        isAIGenerated: true,
      }),
      requestContext: {
        authorizer: {
          claims: {
            sub: "user_123456789",
            email: "test@example.com",
            given_name: "John",
            family_name: "Doe",
          },
        },
      },
    };

    test("should create budget with consistent familyId format", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");
      dynamoHelpers.getItem.mockResolvedValue(null); // No existing budget
      dynamoHelpers.putItem.mockResolvedValue({});

      const result = await handler(mockCreateBudgetEvent, mockContext);

      expect(result.statusCode).toBe(200);

      // Verify budget was created with correct familyId format
      expect(dynamoHelpers.putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          PK: "FAMILY#family_user_123456789",
          SK: "BUDGET#2026-01",
          familyId: "family_user_123456789",
          month: "2026-01",
          totalExpenses: 500,
          groups: expect.objectContaining({
            expenses: expect.arrayContaining([
              expect.objectContaining({
                name: "Groceries",
                plannedAmount: 500,
              }),
            ]),
          }),
        })
      );
    });

    test("should update existing budget instead of creating duplicate", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");

      // Mock existing budget
      const existingBudget = {
        budgetId: "budget_existing",
        familyId: "family_user_123456789",
        month: "2026-01",
        totalExpenses: 300,
      };

      dynamoHelpers.getItem.mockResolvedValue(existingBudget);
      dynamoHelpers.updateItem.mockResolvedValue({
        ...existingBudget,
        totalExpenses: 500,
        updatedAt: new Date().toISOString(),
      });

      const result = await handler(mockCreateBudgetEvent, mockContext);

      expect(result.statusCode).toBe(200);

      // Should update existing budget, not create new one
      expect(dynamoHelpers.updateItem).toHaveBeenCalledWith(
        "FAMILY#family_user_123456789",
        "BUDGET#2026-01",
        expect.objectContaining({
          groups: expect.any(Object),
          totalExpenses: 500,
        })
      );

      expect(dynamoHelpers.putItem).not.toHaveBeenCalled();
    });

    test("should validate month format", async () => {
      const invalidEvent = {
        ...mockCreateBudgetEvent,
        body: JSON.stringify({
          month: "invalid-month",
          groups: { income: [], savings: [], expenses: [] },
        }),
      };

      const result = await handler(invalidEvent, mockContext);

      expect(result.statusCode).toBe(400);
    });

    test("should require month parameter", async () => {
      const invalidEvent = {
        ...mockCreateBudgetEvent,
        body: JSON.stringify({
          groups: { income: [], savings: [], expenses: [] },
        }),
      };

      const result = await handler(invalidEvent, mockContext);

      expect(result.statusCode).toBe(400);
    });
  });

  describe("Get Current Budget", () => {
    const mockGetCurrentBudgetEvent = {
      httpMethod: "GET",
      path: "/budget/current",
      queryStringParameters: {
        month: "2026-01",
      },
      requestContext: {
        authorizer: {
          claims: {
            sub: "user_123456789",
            email: "test@example.com",
          },
        },
      },
    };

    test("should retrieve current budget by month", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");

      const mockBudget = {
        budgetId: "budget_123",
        familyId: "family_user_123456789",
        month: "2026-01",
        totalIncome: 0,
        totalSavings: 0,
        totalExpenses: 800,
        remainingBalance: -800,
        groups: {
          income: [],
          savings: [],
          expenses: [
            {
              id: "cat_groceries_001",
              name: "Groceries",
              plannedAmount: 500,
            },
          ],
        },
        isAIGenerated: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };

      dynamoHelpers.getItem.mockResolvedValue(mockBudget);

      const result = await handler(mockGetCurrentBudgetEvent, mockContext);

      expect(result.statusCode).toBe(200);

      // Verify correct query parameters
      expect(dynamoHelpers.getItem).toHaveBeenCalledWith(
        "FAMILY#family_user_123456789",
        "BUDGET#2026-01"
      );

      const body = JSON.parse(result.body);
      expect(body.data.budgetId).toBe("budget_123");
      expect(body.data.month).toBe("2026-01");
      expect(body.data.familyId).toBe("family_user_123456789");
    });

    test("should require month parameter", async () => {
      const invalidEvent = {
        ...mockGetCurrentBudgetEvent,
        queryStringParameters: null,
      };

      const result = await handler(invalidEvent, mockContext);

      expect(result.statusCode).toBe(400);
    });

    test("should create budget with recurring items if none exists", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");

      // No current budget exists
      dynamoHelpers.getItem.mockResolvedValueOnce(null);

      // Mock previous month budget for recurring items
      const previousBudget = {
        budgetId: "budget_prev",
        familyId: "family_user_123456789",
        month: "2025-12",
        groups: {
          income: [],
          savings: [],
          expenses: [
            {
              id: "cat_groceries_001",
              name: "Groceries",
              plannedAmount: 500,
            },
          ],
        },
      };

      dynamoHelpers.getItem.mockResolvedValueOnce(previousBudget);
      dynamoHelpers.putItem.mockResolvedValue({});

      const result = await handler(mockGetCurrentBudgetEvent, mockContext);

      expect(result.statusCode).toBe(200);

      // Should create new budget with recurring items
      expect(dynamoHelpers.putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          PK: "FAMILY#family_user_123456789",
          SK: "BUDGET#2026-01",
          familyId: "family_user_123456789",
          month: "2026-01",
        })
      );
    });
  });

  describe("Budget Totals Calculation", () => {
    test("should calculate totals correctly", async () => {
      const { dynamoHelpers } = require("/opt/nodejs/utils");

      const mockCreateEvent = {
        httpMethod: "POST",
        path: "/budget",
        body: JSON.stringify({
          month: "2026-01",
          groups: {
            income: [{ plannedAmount: 3000 }, { plannedAmount: 1000 }],
            savings: [{ plannedAmount: 500 }],
            expenses: [{ plannedAmount: 800 }, { plannedAmount: 1200 }],
          },
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: "user_123456789",
              email: "test@example.com",
            },
          },
        },
      };

      dynamoHelpers.getItem.mockResolvedValue(null);
      dynamoHelpers.putItem.mockResolvedValue({});

      const result = await handler(mockCreateEvent, mockContext);

      expect(result.statusCode).toBe(200);

      // Verify totals calculation
      expect(dynamoHelpers.putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          totalIncome: 4000, // 3000 + 1000
          totalSavings: 500, // 500
          totalExpenses: 2000, // 800 + 1200
          remainingBalance: 1500, // 4000 - 500 - 2000
        })
      );
    });
  });

  describe("Authentication", () => {
    test("should require authentication for protected endpoints", async () => {
      const unauthenticatedEvent = {
        httpMethod: "GET",
        path: "/budget",
        requestContext: {}, // Missing authorizer claims
      };

      const result = await handler(unauthenticatedEvent, mockContext);

      expect(result.statusCode).toBe(401);
    });
  });
});
