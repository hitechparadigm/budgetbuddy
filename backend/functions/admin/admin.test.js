/**
 * Admin Lambda Function Tests
 * Tests for admin dashboard, user management, and audit logging
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
      userId: "admin-user-123",
      email: "admin@budgetbuddy.com",
      groups: ["admin"],
    })),
    generateId: {
      custom: (prefix) => `${prefix}_${Date.now()}_test`,
    },
    dynamoHelpers: {
      putItem: jest.fn().mockResolvedValue({}),
      getItem: jest.fn().mockResolvedValue(null),
      updateItem: jest.fn().mockResolvedValue({}),
      queryByPK: jest.fn().mockResolvedValue([]),
      scan: jest.fn().mockResolvedValue([]),
    },
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
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

const { handler } = require("./index");
const { dynamoHelpers, getUserFromEvent } = require("/opt/nodejs/utils");

describe("Admin Lambda Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: user is admin
    dynamoHelpers.getItem.mockResolvedValue({ role: "admin" });
  });

  describe("Health Check", () => {
    it("should return healthy status", async () => {
      const event = { httpMethod: "GET", path: "/admin/health" };
      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.status).toBe("healthy");
      expect(body.data.service).toBe("admin");
    });
  });

  describe("Admin Authentication", () => {
    it("should reject non-admin users", async () => {
      dynamoHelpers.getItem.mockResolvedValueOnce({ role: "user" }); // Not admin
      getUserFromEvent.mockReturnValueOnce({
        userId: "regular-user",
        groups: [],
      });

      const event = {
        httpMethod: "GET",
        path: "/admin/dashboard",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      expect(result.statusCode).toBe(401);
    });

    it("should allow admin users", async () => {
      dynamoHelpers.getItem.mockResolvedValueOnce({ role: "admin" });
      dynamoHelpers.scan.mockResolvedValue([]);

      const event = {
        httpMethod: "GET",
        path: "/admin/dashboard",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      expect(result.statusCode).toBe(200);
    });
  });

  describe("GET /admin/dashboard", () => {
    it("should return platform metrics", async () => {
      dynamoHelpers.getItem.mockResolvedValueOnce({ role: "admin" });
      dynamoHelpers.scan
        .mockResolvedValueOnce([
          {
            entityType: "USER_PROFILE",
            userId: "user1",
            createdAt: new Date().toISOString(),
          },
          {
            entityType: "USER_PROFILE",
            userId: "user2",
            createdAt: new Date().toISOString(),
            subscriptionStatus: "premium",
          },
        ])
        .mockResolvedValueOnce([{ entityType: "BUDGET" }])
        .mockResolvedValueOnce([
          { entityType: "TRANSACTION" },
          { entityType: "TRANSACTION" },
        ]);

      const event = {
        httpMethod: "GET",
        path: "/admin/dashboard",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.users.total).toBe(2);
      expect(body.data.users.premiumUsers).toBe(1);
      expect(body.data.content.totalBudgets).toBe(1);
      expect(body.data.content.totalTransactions).toBe(2);
    });
  });

  describe("GET /admin/users", () => {
    it("should return paginated user list", async () => {
      dynamoHelpers.getItem.mockResolvedValueOnce({ role: "admin" });
      dynamoHelpers.scan.mockResolvedValueOnce([
        {
          entityType: "USER_PROFILE",
          userId: "user1",
          email: "user1@test.com",
          createdAt: "2026-01-01",
        },
        {
          entityType: "USER_PROFILE",
          userId: "user2",
          email: "user2@test.com",
          createdAt: "2026-01-02",
        },
      ]);

      const event = {
        httpMethod: "GET",
        path: "/admin/users",
        headers: { Authorization: "Bearer test-token" },
        queryStringParameters: { limit: "10", offset: "0" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.users.length).toBe(2);
      expect(body.data.pagination.total).toBe(2);
    });

    it("should filter users by search query", async () => {
      dynamoHelpers.getItem.mockResolvedValueOnce({ role: "admin" });
      dynamoHelpers.scan.mockResolvedValueOnce([
        {
          entityType: "USER_PROFILE",
          userId: "user1",
          email: "john@test.com",
          name: "John Doe",
          createdAt: "2026-01-01",
        },
        {
          entityType: "USER_PROFILE",
          userId: "user2",
          email: "jane@test.com",
          name: "Jane Smith",
          createdAt: "2026-01-02",
        },
      ]);

      const event = {
        httpMethod: "GET",
        path: "/admin/users",
        headers: { Authorization: "Bearer test-token" },
        queryStringParameters: { q: "john" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.users.length).toBe(1);
      expect(body.data.users[0].email).toBe("john@test.com");
    });
  });

  describe("GET /admin/users/:userId", () => {
    it("should return user details", async () => {
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ role: "admin" }) // Admin check
        .mockResolvedValueOnce({
          // User profile
          userId: "target-user",
          email: "target@test.com",
          name: "Target User",
          createdAt: "2026-01-01",
        });
      dynamoHelpers.queryByPK
        .mockResolvedValueOnce([{ entityType: "BUDGET" }])
        .mockResolvedValueOnce([{ entityType: "TRANSACTION" }]);

      const event = {
        httpMethod: "GET",
        path: "/admin/users/target-user",
        headers: { Authorization: "Bearer test-token" },
        pathParameters: { userId: "target-user" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.userId).toBe("target-user");
      expect(body.data.stats.budgetCount).toBe(1);
      expect(body.data.stats.transactionCount).toBe(1);
    });

    it("should return 404 for non-existent user", async () => {
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ role: "admin" })
        .mockResolvedValueOnce(null);

      const event = {
        httpMethod: "GET",
        path: "/admin/users/nonexistent",
        headers: { Authorization: "Bearer test-token" },
        pathParameters: { userId: "nonexistent" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      expect(result.statusCode).toBe(404);
    });
  });

  describe("POST /admin/users/:userId/disable", () => {
    it("should disable a user account", async () => {
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ role: "admin" })
        .mockResolvedValueOnce({
          userId: "target-user",
          email: "target@test.com",
          isDisabled: false,
        });

      const event = {
        httpMethod: "POST",
        path: "/admin/users/target-user/disable",
        headers: { Authorization: "Bearer test-token" },
        pathParameters: { userId: "target-user" },
        body: JSON.stringify({ reason: "Suspicious activity" }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.isDisabled).toBe(true);
      expect(dynamoHelpers.updateItem).toHaveBeenCalled();
    });

    it("should not disable admin accounts", async () => {
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ role: "admin" })
        .mockResolvedValueOnce({ userId: "other-admin", role: "admin" });

      const event = {
        httpMethod: "POST",
        path: "/admin/users/other-admin/disable",
        headers: { Authorization: "Bearer test-token" },
        pathParameters: { userId: "other-admin" },
        body: JSON.stringify({ reason: "Test" }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      expect(result.statusCode).toBe(400);
    });
  });

  describe("POST /admin/users/:userId/enable", () => {
    it("should enable a disabled user account", async () => {
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ role: "admin" })
        .mockResolvedValueOnce({ userId: "target-user", isDisabled: true });

      const event = {
        httpMethod: "POST",
        path: "/admin/users/target-user/enable",
        headers: { Authorization: "Bearer test-token" },
        pathParameters: { userId: "target-user" },
        body: "{}",
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.isDisabled).toBe(false);
    });
  });

  describe("GET /admin/audit", () => {
    it("should return audit log entries", async () => {
      dynamoHelpers.getItem.mockResolvedValueOnce({ role: "admin" });
      dynamoHelpers.queryByPK.mockResolvedValueOnce([
        {
          SK: "ACTION#1",
          adminId: "admin1",
          action: "USER_DISABLED",
          timestamp: "2026-02-01T12:00:00Z",
        },
        {
          SK: "ACTION#2",
          adminId: "admin1",
          action: "USER_ENABLED",
          timestamp: "2026-02-01T13:00:00Z",
        },
      ]);

      const event = {
        httpMethod: "GET",
        path: "/admin/audit",
        headers: { Authorization: "Bearer test-token" },
        queryStringParameters: { limit: "50" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.logs.length).toBe(2);
    });
  });

  describe("GET /admin/system-health", () => {
    it("should return system health status", async () => {
      dynamoHelpers.getItem.mockResolvedValueOnce({ role: "admin" });

      const event = {
        httpMethod: "GET",
        path: "/admin/system-health",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.status).toBe("healthy");
      expect(body.data.services).toBeDefined();
    });
  });
});
