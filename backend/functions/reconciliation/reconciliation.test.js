/**
 * Reconciliation Lambda Function Tests
 * Tests for receipt-to-bank transaction matching
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
const { dynamoHelpers } = require("/opt/nodejs/utils");

describe("Reconciliation Lambda Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Health Check", () => {
    it("should return healthy status", async () => {
      const event = { httpMethod: "GET", path: "/reconcile/health" };
      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.status).toBe("healthy");
      expect(body.data.service).toBe("reconciliation");
    });
  });

  describe("GET /reconcile/status", () => {
    it("should return reconciliation status", async () => {
      dynamoHelpers.queryByPK
        .mockResolvedValueOnce([{ receiptId: "rcpt-1" }]) // receipts
        .mockResolvedValueOnce([{ transactionId: "txn-1" }]) // transactions
        .mockResolvedValueOnce([]); // matches

      const event = {
        httpMethod: "GET",
        path: "/reconcile/status",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.summary.totalReceipts).toBe(1);
      expect(body.data.summary.totalBankTransactions).toBe(1);
      expect(body.data.summary.matchedCount).toBe(0);
    });
  });

  describe("GET /reconcile/unmatched", () => {
    it("should return unmatched items", async () => {
      dynamoHelpers.queryByPK
        .mockResolvedValueOnce([]) // matches
        .mockResolvedValueOnce([
          {
            receiptId: "rcpt-1",
            extractedData: { merchant: "Store", total: 50 },
          },
        ]) // receipts
        .mockResolvedValueOnce([
          { transactionId: "txn-1", merchant: "Store", amount: -50 },
        ]); // transactions

      const event = {
        httpMethod: "GET",
        path: "/reconcile/unmatched",
        headers: { Authorization: "Bearer test-token" },
        queryStringParameters: { type: "all" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.unmatchedReceipts.length).toBe(1);
      expect(body.data.unmatchedTransactions.length).toBe(1);
    });
  });

  describe("GET /reconcile/suggestions", () => {
    it("should return match suggestions for a receipt", async () => {
      dynamoHelpers.queryByPK.mockResolvedValueOnce([]); // matches
      dynamoHelpers.getItem.mockResolvedValueOnce({
        receiptId: "rcpt-1",
        extractedData: { merchant: "Amazon", total: 50, date: "2026-02-01" },
      });
      dynamoHelpers.queryByPK.mockResolvedValueOnce([
        {
          transactionId: "txn-1",
          merchant: "Amazon",
          amount: -50,
          date: "2026-02-01",
        },
        {
          transactionId: "txn-2",
          merchant: "Target",
          amount: -100,
          date: "2026-02-01",
        },
      ]);

      const event = {
        httpMethod: "GET",
        path: "/reconcile/suggestions",
        headers: { Authorization: "Bearer test-token" },
        queryStringParameters: { receiptId: "rcpt-1" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.suggestions.length).toBeGreaterThan(0);
      // Amazon should have higher confidence than Target
      expect(body.data.suggestions[0].confidence.score).toBeGreaterThan(0.5);
    });

    it("should reject without receiptId or transactionId", async () => {
      const event = {
        httpMethod: "GET",
        path: "/reconcile/suggestions",
        headers: { Authorization: "Bearer test-token" },
        queryStringParameters: {},
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      expect(result.statusCode).toBe(400);
    });
  });

  describe("POST /reconcile/match", () => {
    it("should create a match", async () => {
      dynamoHelpers.getItem
        .mockResolvedValueOnce({
          receiptId: "rcpt-1",
          extractedData: { merchant: "Store", total: 50, date: "2026-02-01" },
        })
        .mockResolvedValueOnce({
          transactionId: "txn-1",
          merchant: "Store",
          amount: -50,
          date: "2026-02-01",
        });
      dynamoHelpers.queryByPK.mockResolvedValueOnce([]); // no existing matches

      const event = {
        httpMethod: "POST",
        path: "/reconcile/match",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({
          receiptId: "rcpt-1",
          transactionId: "txn-1",
        }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.matchId).toBeDefined();
      expect(body.data.receiptId).toBe("rcpt-1");
      expect(body.data.transactionId).toBe("txn-1");
      expect(dynamoHelpers.putItem).toHaveBeenCalled();
    });

    it("should reject if already matched", async () => {
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ receiptId: "rcpt-1" })
        .mockResolvedValueOnce({ transactionId: "txn-1" });
      dynamoHelpers.queryByPK.mockResolvedValueOnce([
        { receiptId: "rcpt-1", transactionId: "txn-2" },
      ]);

      const event = {
        httpMethod: "POST",
        path: "/reconcile/match",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({
          receiptId: "rcpt-1",
          transactionId: "txn-1",
        }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      expect(result.statusCode).toBe(400);
    });
  });

  describe("POST /reconcile/unmatch", () => {
    it("should remove a match", async () => {
      dynamoHelpers.getItem.mockResolvedValueOnce({
        matchId: "match-1",
        receiptId: "rcpt-1",
        transactionId: "txn-1",
      });

      const event = {
        httpMethod: "POST",
        path: "/reconcile/unmatch",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({ matchId: "match-1" }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });

      expect(result.statusCode).toBe(200);
      expect(dynamoHelpers.updateItem).toHaveBeenCalledTimes(3); // receipt, transaction, match
    });
  });

  describe("POST /reconcile/auto", () => {
    it("should auto-reconcile high confidence matches", async () => {
      dynamoHelpers.queryByPK
        .mockResolvedValueOnce([]) // existing matches
        .mockResolvedValueOnce([
          {
            receiptId: "rcpt-1",
            extractedData: {
              merchant: "Amazon",
              total: 50,
              date: "2026-02-01",
            },
          },
        ]) // receipts
        .mockResolvedValueOnce([
          {
            transactionId: "txn-1",
            merchant: "Amazon",
            amount: -50,
            date: "2026-02-01",
            source: "plaid",
          },
        ]); // transactions

      const event = {
        httpMethod: "POST",
        path: "/reconcile/auto",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({ minConfidence: 0.85 }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.matchesCreated).toBe(1);
    });
  });

  describe("Confidence Calculation", () => {
    it("should give high confidence for exact matches", async () => {
      dynamoHelpers.queryByPK.mockResolvedValueOnce([]); // matches
      dynamoHelpers.getItem.mockResolvedValueOnce({
        receiptId: "rcpt-1",
        extractedData: { merchant: "Amazon", total: 50.0, date: "2026-02-01" },
      });
      dynamoHelpers.queryByPK.mockResolvedValueOnce([
        {
          transactionId: "txn-1",
          merchant: "Amazon",
          amount: -50.0,
          date: "2026-02-01",
        },
      ]);

      const event = {
        httpMethod: "GET",
        path: "/reconcile/suggestions",
        headers: { Authorization: "Bearer test-token" },
        queryStringParameters: { receiptId: "rcpt-1" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(body.data.suggestions[0].confidence.score).toBeGreaterThanOrEqual(
        0.85,
      );
      expect(body.data.suggestions[0].confidence.level).toBe("high");
    });

    it("should give lower confidence for mismatched amounts", async () => {
      dynamoHelpers.queryByPK.mockResolvedValueOnce([]); // matches
      dynamoHelpers.getItem.mockResolvedValueOnce({
        receiptId: "rcpt-1",
        extractedData: { merchant: "Amazon", total: 50.0, date: "2026-02-01" },
      });
      dynamoHelpers.queryByPK.mockResolvedValueOnce([
        {
          transactionId: "txn-1",
          merchant: "Amazon",
          amount: -75.0,
          date: "2026-02-01",
        },
      ]);

      const event = {
        httpMethod: "GET",
        path: "/reconcile/suggestions",
        headers: { Authorization: "Bearer test-token" },
        queryStringParameters: { receiptId: "rcpt-1" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      // Should still match but with lower confidence
      expect(body.data.suggestions[0].confidence.score).toBeLessThan(0.85);
    });
  });
});
