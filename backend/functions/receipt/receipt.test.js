/**
 * Receipt Lambda Function Tests
 * Tests for receipt scanning and AI extraction
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
      isPremium: false,
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
  }),
  { virtual: true },
);


const { handler } = require("./index");
const { dynamoHelpers, getUserFromEvent } = require("/opt/nodejs/utils");

describe("Receipt Lambda Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Health Check", () => {
    it("should return healthy status", async () => {
      const event = { httpMethod: "GET", path: "/receipt/health" };
      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.status).toBe("healthy");
      expect(body.data.service).toBe("receipt");
    });
  });

  describe("CORS Preflight", () => {
    it("should handle OPTIONS request", async () => {
      const event = { httpMethod: "OPTIONS", path: "/receipt/upload" };
      const result = await handler(event, { awsRequestId: "test-123" });

      expect(result.statusCode).toBe(200);
      expect(result.headers["Access-Control-Allow-Origin"]).toBe("*");
    });
  });

  describe("POST /receipt/upload", () => {
    it("should generate upload URL", async () => {
      dynamoHelpers.getItem.mockResolvedValue(null); // No usage yet

      const event = {
        httpMethod: "POST",
        path: "/receipt/upload",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({
          contentType: "image/jpeg",
          fileName: "receipt.jpg",
        }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.receiptId).toBeDefined();
      expect(body.data.uploadUrl).toBeDefined();
      expect(body.data.remainingScans).toBe(10);
    });

    it("should reject invalid content type", async () => {
      dynamoHelpers.getItem.mockResolvedValue(null);

      const event = {
        httpMethod: "POST",
        path: "/receipt/upload",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({ contentType: "application/pdf" }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      expect(result.statusCode).toBe(400);
    });

    it("should enforce daily limit for free users", async () => {
      dynamoHelpers.getItem.mockResolvedValue({ count: 10 }); // At limit

      const event = {
        httpMethod: "POST",
        path: "/receipt/upload",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({ contentType: "image/jpeg" }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toContain("Daily scan limit");
    });
  });

  describe("POST /receipt/process", () => {
    it("should process receipt and extract data", async () => {
      dynamoHelpers.getItem.mockResolvedValue(null); // No usage yet

      const event = {
        httpMethod: "POST",
        path: "/receipt/process",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({
          receiptId: "rcpt_123",
          imageBase64: "base64encodedimage",
        }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.receiptId).toBeDefined();
      expect(body.data.extractedData).toBeDefined();
      expect(body.data.extractedData.merchant).toBeDefined();
      expect(body.data.extractedData.total).toBeDefined();
      expect(dynamoHelpers.putItem).toHaveBeenCalled();
    });

    it("should reject without receiptId or imageBase64", async () => {
      const event = {
        httpMethod: "POST",
        path: "/receipt/process",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({}),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      expect(result.statusCode).toBe(400);
    });
  });

  describe("GET /receipt/usage", () => {
    it("should return usage statistics", async () => {
      dynamoHelpers.getItem.mockResolvedValue({ count: 3 });

      const event = {
        httpMethod: "GET",
        path: "/receipt/usage",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.dailyUsed).toBe(3);
      expect(body.data.dailyLimit).toBe(10);
      expect(body.data.remaining).toBe(7);
    });

    it("should show higher limit for premium users", async () => {
      getUserFromEvent.mockReturnValue({
        userId: "test-user-123",
        familyId: "test-family-123",
        isPremium: true,
      });
      dynamoHelpers.getItem.mockResolvedValue({ count: 5 });

      const event = {
        httpMethod: "GET",
        path: "/receipt/usage",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.dailyLimit).toBe(50);
      expect(body.data.remaining).toBe(45);
    });
  });

  describe("GET /receipt/{receiptId}", () => {
    it("should return receipt by ID", async () => {
      const mockReceipt = {
        receiptId: "rcpt_123",
        status: "processed",
        extractedData: { merchant: "Store", total: 25.99 },
        confidence: 0.95,
        createdAt: "2026-02-01T00:00:00Z",
      };
      dynamoHelpers.getItem.mockResolvedValue(mockReceipt);

      const event = {
        httpMethod: "GET",
        path: "/receipt/rcpt_123",
        pathParameters: { receiptId: "rcpt_123" },
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.receiptId).toBe("rcpt_123");
      expect(body.data.extractedData.merchant).toBe("Store");
    });

    it("should return 404 for non-existent receipt", async () => {
      dynamoHelpers.getItem.mockResolvedValue(null);

      const event = {
        httpMethod: "GET",
        path: "/receipt/rcpt_999",
        pathParameters: { receiptId: "rcpt_999" },
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      expect(result.statusCode).toBe(404);
    });
  });

  describe("Route Not Found", () => {
    it("should return 404 for unknown routes", async () => {
      const event = {
        httpMethod: "GET",
        path: "/receipt/unknown",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      expect(result.statusCode).toBe(404);
    });
  });
});
