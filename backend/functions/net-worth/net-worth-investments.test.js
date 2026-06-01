/**
 * Net Worth - Investments Integration Tests
 *
 * Tests the integration between net worth tracking and investment holdings.
 * **Validates: Requirement 45.8** - Include investments in net worth calculation
 */

const { handler } = require("./index");

// Mock dependencies
jest.mock("/opt/nodejs/utils", () => ({
  successResponse: jest.fn((data, message, statusCode = 200) => ({
    statusCode,
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
    unauthorized: jest.fn((message) => ({
      statusCode: 401,
      body: JSON.stringify({ success: false, error: message }),
    })),
    internalError: jest.fn((message) => ({
      statusCode: 500,
      body: JSON.stringify({ success: false, error: message }),
    })),
  },
  parseRequestBody: jest.fn((body) => JSON.parse(body)),
  getUserFromEvent: jest.fn((event) => ({
    userId: event.requestContext?.authorizer?.claims?.sub || "test-user-123",
    familyId: "test-family-123",
  })),
  generateId: jest.fn((prefix) => `${prefix}-${Date.now()}`),
  dynamoHelpers: {
    queryByPK: jest.fn(),
    getItem: jest.fn(),
    putItem: jest.fn(),
    updateItem: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
  BudgetAccessResolver: {
    resolveAccess: jest.fn().mockResolvedValue({
      budgetId: 'budget_test_123',
      role: 'owner',
      budgetType: 'personal',
      budgetStatus: 'active',
      subscriptionTier: 'free',
    }),
    assertPermission: jest.fn(),
  },
}));


const { dynamoHelpers } = require("/opt/nodejs/utils");

describe("Net Worth - Investments Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /net-worth - Include investments", () => {
    it("should include investment value in total assets", async () => {
      // Mock assets
      dynamoHelpers.queryByPK.mockImplementation(async (pk, options) => {
        if (options.ExpressionAttributeValues[":entityType"] === "ASSET") {
          return [
            {
              assetId: "asset-1",
              name: "Savings",
              value: 10000,
              category: "cash",
            },
            {
              assetId: "asset-2",
              name: "House",
              value: 300000,
              category: "real_estate",
            },
          ];
        }
        if (options.ExpressionAttributeValues[":entityType"] === "LIABILITY") {
          return [
            {
              liabilityId: "liab-1",
              name: "Mortgage",
              balance: 200000,
              category: "mortgage",
            },
          ];
        }
        // Investment holdings
        if (options.FilterExpression?.includes("begins_with(SK, :sk)")) {
          return [
            {
              holdingId: "hold-1",
              symbol: "AAPL",
              shares: 10,
              currentPrice: 150,
            },
            {
              holdingId: "hold-2",
              symbol: "GOOGL",
              shares: 5,
              currentPrice: 2800,
            },
          ];
        }
        return [];
      });

      const event = {
        httpMethod: "GET",
        path: "/net-worth",
        requestContext: {
          authorizer: {
            claims: { sub: "test-user-123" },
          },
        },
      };

      const response = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(response.body);

      // Investment value = (10 * 150) + (5 * 2800) = 1500 + 14000 = 15500
      // Total assets = 10000 + 300000 + 15500 = 325500
      // Net worth = 325500 - 200000 = 125500
      expect(body.data.investmentValue).toBe(15500);
      expect(body.data.totalAssets).toBe(325500);
      expect(body.data.netWorth).toBe(125500);
    });

    it("should handle zero investment holdings", async () => {
      dynamoHelpers.queryByPK.mockImplementation(async (pk, options) => {
        if (options.ExpressionAttributeValues[":entityType"] === "ASSET") {
          return [
            {
              assetId: "asset-1",
              name: "Savings",
              value: 10000,
              category: "cash",
            },
          ];
        }
        if (options.ExpressionAttributeValues[":entityType"] === "LIABILITY") {
          return [];
        }
        // No investment holdings
        if (options.FilterExpression?.includes("begins_with(SK, :sk)")) {
          return [];
        }
        return [];
      });

      const event = {
        httpMethod: "GET",
        path: "/net-worth",
        requestContext: {
          authorizer: {
            claims: { sub: "test-user-123" },
          },
        },
      };

      const response = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(response.body);

      expect(body.data.investmentValue).toBe(0);
      expect(body.data.totalAssets).toBe(10000);
      expect(body.data.netWorth).toBe(10000);
    });

    it("should add investment value to investments category", async () => {
      dynamoHelpers.queryByPK.mockImplementation(async (pk, options) => {
        if (options.ExpressionAttributeValues[":entityType"] === "ASSET") {
          return [
            {
              assetId: "asset-1",
              name: "Savings",
              value: 10000,
              category: "cash",
            },
          ];
        }
        if (options.ExpressionAttributeValues[":entityType"] === "LIABILITY") {
          return [];
        }
        // Investment holdings
        if (options.FilterExpression?.includes("begins_with(SK, :sk)")) {
          return [
            {
              holdingId: "hold-1",
              symbol: "AAPL",
              shares: 10,
              currentPrice: 150,
            },
          ];
        }
        return [];
      });

      const event = {
        httpMethod: "GET",
        path: "/net-worth",
        requestContext: {
          authorizer: {
            claims: { sub: "test-user-123" },
          },
        },
      };

      const response = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(response.body);

      // Investment value should be added to investments category
      expect(body.data.assetsByCategory.investments.total).toBe(1500);
      expect(body.data.assetsByCategory.investments.investmentValue).toBe(1500);
    });
  });

  describe("GET /net-worth/summary - Include investments", () => {
    it("should include investment value in summary", async () => {
      dynamoHelpers.queryByPK.mockImplementation(async (pk, options) => {
        if (options.ExpressionAttributeValues[":entityType"] === "ASSET") {
          return [
            {
              assetId: "asset-1",
              name: "Savings",
              value: 50000,
              category: "cash",
            },
          ];
        }
        if (options.ExpressionAttributeValues[":entityType"] === "LIABILITY") {
          return [
            {
              liabilityId: "liab-1",
              name: "Loan",
              balance: 10000,
              category: "personal_loan",
            },
          ];
        }
        // Investment holdings
        if (options.FilterExpression?.includes("begins_with(SK, :sk)")) {
          return [
            {
              holdingId: "hold-1",
              symbol: "TSLA",
              shares: 20,
              currentPrice: 250,
            },
          ];
        }
        return [];
      });

      dynamoHelpers.getItem.mockResolvedValue(null); // No previous snapshot

      const event = {
        httpMethod: "GET",
        path: "/net-worth/summary",
        requestContext: {
          authorizer: {
            claims: { sub: "test-user-123" },
          },
        },
      };

      const response = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(response.body);

      // Investment value = 20 * 250 = 5000
      // Total assets = 50000 + 5000 = 55000
      // Net worth = 55000 - 10000 = 45000
      expect(body.data.investmentValue).toBe(5000);
      expect(body.data.totalAssets).toBe(55000);
      expect(body.data.netWorth).toBe(45000);
    });
  });

  describe("Snapshot updates with investments", () => {
    it("should include investment value in snapshots when creating assets", async () => {
      dynamoHelpers.queryByPK.mockImplementation(async (pk, options) => {
        if (options.ExpressionAttributeValues[":entityType"] === "ASSET") {
          return [
            {
              assetId: "asset-1",
              name: "New Asset",
              value: 5000,
              category: "cash",
            },
          ];
        }
        if (options.ExpressionAttributeValues[":entityType"] === "LIABILITY") {
          return [];
        }
        // Investment holdings
        if (options.FilterExpression?.includes("begins_with(SK, :sk)")) {
          return [
            {
              holdingId: "hold-1",
              symbol: "AAPL",
              shares: 10,
              currentPrice: 150,
            },
          ];
        }
        return [];
      });

      dynamoHelpers.putItem.mockResolvedValue({});

      const event = {
        httpMethod: "POST",
        path: "/net-worth/assets",
        body: JSON.stringify({
          name: "New Asset",
          value: 5000,
          category: "cash",
        }),
        requestContext: {
          authorizer: {
            claims: { sub: "test-user-123" },
          },
        },
      };

      await handler(event, { awsRequestId: "test-123" });

      // Verify snapshot was created with investment value
      const snapshotCalls = dynamoHelpers.putItem.mock.calls.filter(
        (call) => call[0].entityType === "NETWORTH_SNAPSHOT",
      );

      expect(snapshotCalls.length).toBeGreaterThan(0);
      const snapshot = snapshotCalls[0][0];
      expect(snapshot.investmentValue).toBe(1500); // 10 * 150
      expect(snapshot.totalAssets).toBe(6500); // 5000 + 1500
    });
  });

  describe("Error handling", () => {
    it("should return 0 investment value on query error", async () => {
      dynamoHelpers.queryByPK.mockImplementation(async (pk, options) => {
        if (options.ExpressionAttributeValues[":entityType"] === "ASSET") {
          return [
            {
              assetId: "asset-1",
              name: "Savings",
              value: 10000,
              category: "cash",
            },
          ];
        }
        if (options.ExpressionAttributeValues[":entityType"] === "LIABILITY") {
          return [];
        }
        // Simulate error when querying investments
        if (options.FilterExpression?.includes("begins_with(SK, :sk)")) {
          throw new Error("DynamoDB error");
        }
        return [];
      });

      const event = {
        httpMethod: "GET",
        path: "/net-worth",
        requestContext: {
          authorizer: {
            claims: { sub: "test-user-123" },
          },
        },
      };

      const response = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(response.body);

      // Should gracefully handle error and return 0 for investments
      expect(body.data.investmentValue).toBe(0);
      expect(body.data.totalAssets).toBe(10000);
    });
  });
});
