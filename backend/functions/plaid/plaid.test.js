/**
 * Plaid Lambda Function Tests
 * Tests for bank account linking and transaction sync
 */

// Mock the Lambda layers
jest.mock(
  "/opt/nodejs/utils",
  () => ({
    successResponse: (data, message) => ({
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ success: true, message, data }),
    }),
    errorResponse: {
      badRequest: (message) => ({
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ success: false, message }),
      }),
      notFound: (message) => ({
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ success: false, message }),
      }),
      unauthorized: (message) => ({
        statusCode: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ success: false, message }),
      }),
      internalError: (message) => ({
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ success: false, message }),
      }),
    },
    parseRequestBody: (body) => (body ? JSON.parse(body) : {}),
    getUserFromEvent: jest.fn(() => ({
      userId: "test-user-123",
      familyId: "test-family-123",
      email: "test@example.com",
    })),
    generateId: {
      custom: (prefix) => `${prefix}_${Date.now()}_test`,
    },
    dynamoHelpers: {
      putItem: jest.fn().mockResolvedValue({}),
      getItem: jest.fn().mockResolvedValue(null),
      updateItem: jest.fn().mockResolvedValue({}),
      queryByPK: jest.fn().mockResolvedValue([]),
    },
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    FamilyIdResolver: {
      resolveFamilyId: jest.fn().mockResolvedValue("test-family-123"),
    },
  }),
  { virtual: true },
);

jest.mock(
  "/opt/nodejs/shared",
  () => ({
    checkPermission: jest.fn(() => null),
  }),
  { virtual: true },
);

// Set mock mode for tests
process.env.PLAID_MOCK_MODE = "true";

const { handler } = require("./index");
const { dynamoHelpers } = require("/opt/nodejs/utils");

describe("Plaid Lambda Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Health Check", () => {
    it("should return healthy status with mock mode indicator", async () => {
      const event = { httpMethod: "GET", path: "/plaid/health" };
      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.status).toBe("healthy");
      expect(body.data.service).toBe("plaid");
      expect(body.data.mockMode).toBe(true);
    });
  });

  describe("CORS Preflight", () => {
    it("should handle OPTIONS request", async () => {
      const event = { httpMethod: "OPTIONS", path: "/plaid/link-token" };
      const result = await handler(event, { awsRequestId: "test-123" });

      expect(result.statusCode).toBe(200);
      expect(result.headers["Access-Control-Allow-Origin"]).toBe("*");
    });
  });

  describe("POST /plaid/link-token", () => {
    it("should create link token in mock mode", async () => {
      const event = {
        httpMethod: "POST",
        path: "/plaid/link-token",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({}),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.linkToken).toBeDefined();
      expect(body.data.mockMode).toBe(true);
    });
  });

  describe("POST /plaid/exchange-token", () => {
    it("should exchange token and create account in mock mode", async () => {
      const event = {
        httpMethod: "POST",
        path: "/plaid/exchange-token",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({
          publicToken: "mock-public-token",
          institutionName: "Test Bank",
          accountName: "Test Checking",
        }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.accountId).toBeDefined();
      expect(body.data.institutionName).toBe("Test Bank");
      expect(body.data.mockMode).toBe(true);
      expect(dynamoHelpers.putItem).toHaveBeenCalled();
    });
  });

  describe("GET /plaid/accounts", () => {
    it("should return empty list when no accounts linked", async () => {
      dynamoHelpers.queryByPK.mockResolvedValue([]);

      const event = {
        httpMethod: "GET",
        path: "/plaid/accounts",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.accounts).toEqual([]);
      expect(body.data.count).toBe(0);
    });

    it("should return linked accounts", async () => {
      const mockAccounts = [
        {
          accountId: "acct-123",
          institutionName: "Test Bank",
          accountName: "Checking",
          accountType: "checking",
          accountMask: "1234",
          currentBalance: 5000,
          status: "active",
        },
      ];
      dynamoHelpers.queryByPK.mockResolvedValue(mockAccounts);

      const event = {
        httpMethod: "GET",
        path: "/plaid/accounts",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.accounts.length).toBe(1);
      expect(body.data.accounts[0].institutionName).toBe("Test Bank");
    });
  });

  describe("DELETE /plaid/accounts/{accountId}", () => {
    it("should unlink account", async () => {
      dynamoHelpers.getItem.mockResolvedValue({
        accountId: "acct-123",
        status: "active",
      });

      const event = {
        httpMethod: "DELETE",
        path: "/plaid/accounts/acct-123",
        pathParameters: { accountId: "acct-123" },
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });

      expect(result.statusCode).toBe(200);
      expect(dynamoHelpers.updateItem).toHaveBeenCalled();
    });

    it("should return 404 for non-existent account", async () => {
      dynamoHelpers.getItem.mockResolvedValue(null);

      const event = {
        httpMethod: "DELETE",
        path: "/plaid/accounts/acct-999",
        pathParameters: { accountId: "acct-999" },
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      expect(result.statusCode).toBe(404);
    });
  });

  describe("POST /plaid/sync", () => {
    it("should sync all accounts and create pending transactions", async () => {
      const mockAccounts = [
        {
          accountId: "acct-123",
          institutionName: "Test Bank",
          status: "active",
          lastSyncAt: null,
        },
      ];
      dynamoHelpers.queryByPK.mockResolvedValue(mockAccounts);

      const event = {
        httpMethod: "POST",
        path: "/plaid/sync",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({}),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.results.length).toBe(1);
      expect(body.data.results[0].status).toBe("success");
      expect(body.data.results[0].transactionsFound).toBeGreaterThan(0);
    });

    it("should skip accounts already synced today", async () => {
      const today = new Date().toISOString();
      const mockAccounts = [
        {
          accountId: "acct-123",
          status: "active",
          lastSyncAt: today,
        },
      ];
      dynamoHelpers.queryByPK.mockResolvedValue(mockAccounts);

      const event = {
        httpMethod: "POST",
        path: "/plaid/sync",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({}),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.results[0].status).toBe("skipped");
    });
  });

  describe("GET /plaid/pending", () => {
    it("should return pending transactions", async () => {
      const mockPending = [
        {
          pendingId: "pend-123",
          amount: -50.0,
          merchant: "Amazon",
          date: "2026-02-01",
          status: "pending",
        },
      ];
      dynamoHelpers.queryByPK.mockResolvedValue(mockPending);

      const event = {
        httpMethod: "GET",
        path: "/plaid/pending",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.transactions.length).toBe(1);
    });
  });

  describe("POST /plaid/pending/approve", () => {
    it("should approve pending transactions and create actual transactions", async () => {
      dynamoHelpers.getItem.mockResolvedValue({
        pendingId: "pend-123",
        amount: -50.0,
        merchant: "Amazon",
        date: "2026-02-01",
        status: "pending",
      });

      const event = {
        httpMethod: "POST",
        path: "/plaid/pending/approve",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({ transactionIds: ["pend-123"] }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.approvedCount).toBe(1);
      expect(dynamoHelpers.putItem).toHaveBeenCalled();
    });

    it("should reject without transactionIds", async () => {
      const event = {
        httpMethod: "POST",
        path: "/plaid/pending/approve",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({}),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      expect(result.statusCode).toBe(400);
    });
  });

  describe("GET /plaid/sync-status", () => {
    it("should return sync status for all accounts", async () => {
      const mockAccounts = [
        {
          accountId: "acct-123",
          institutionName: "Test Bank",
          accountName: "Checking",
          lastSyncAt: null,
          status: "active",
        },
      ];
      dynamoHelpers.queryByPK.mockResolvedValue(mockAccounts);

      const event = {
        httpMethod: "GET",
        path: "/plaid/sync-status",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.accounts.length).toBe(1);
      expect(body.data.accounts[0].canSync).toBe(true);
      expect(body.data.dailyLimit).toBe(1);
    });
  });
});
