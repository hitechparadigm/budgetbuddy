/**
 * Insights Lambda Function Tests
 * Tests for spending analytics and AI insights
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
    })),
    dynamoHelpers: {
      getItem: jest.fn().mockResolvedValue(null),
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

const { handler } = require("./index");
const { dynamoHelpers } = require("/opt/nodejs/utils");

describe("Insights Lambda Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Health Check", () => {
    it("should return healthy status", async () => {
      const event = { httpMethod: "GET", path: "/insights/health" };
      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.status).toBe("healthy");
      expect(body.data.service).toBe("insights");
    });
  });

  describe("GET /insights/weekly", () => {
    it("should return weekly insights with empty transactions", async () => {
      dynamoHelpers.queryByPK.mockResolvedValue([]);

      const event = {
        httpMethod: "GET",
        path: "/insights/weekly",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.period.type).toBe("weekly");
      expect(body.data.summary.totalSpent).toBe(0);
    });

    it("should calculate spending change correctly", async () => {
      // Current week transactions
      const currentWeek = [
        {
          type: "expense",
          amount: 100,
          categoryName: "Groceries",
          date: new Date().toISOString().split("T")[0],
        },
        {
          type: "expense",
          amount: 50,
          categoryName: "Dining",
          date: new Date().toISOString().split("T")[0],
        },
        {
          type: "income",
          amount: 500,
          categoryName: "Salary",
          date: new Date().toISOString().split("T")[0],
        },
      ];

      dynamoHelpers.queryByPK
        .mockResolvedValueOnce(currentWeek) // Current week
        .mockResolvedValueOnce([]); // Previous week

      const event = {
        httpMethod: "GET",
        path: "/insights/weekly",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.summary.totalSpent).toBe(150);
      expect(body.data.summary.totalIncome).toBe(500);
      expect(body.data.categoryBreakdown.length).toBeGreaterThan(0);
    });
  });

  describe("GET /insights/monthly", () => {
    it("should return monthly insights", async () => {
      dynamoHelpers.queryByPK.mockResolvedValue([]);
      dynamoHelpers.getItem.mockResolvedValue(null);

      const event = {
        httpMethod: "GET",
        path: "/insights/monthly",
        queryStringParameters: { month: "2026-02" },
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.period.month).toBe("2026-02");
      expect(body.data.period.type).toBe("monthly");
    });

    it("should include budget comparison when budget exists", async () => {
      const transactions = [
        {
          type: "expense",
          amount: 800,
          categoryName: "Groceries",
          date: "2026-02-15",
        },
      ];
      const budget = {
        totalExpenses: 1000,
        totalIncome: 5000,
        groups: { expenses: [] },
      };

      dynamoHelpers.queryByPK
        .mockResolvedValueOnce(transactions) // Current month
        .mockResolvedValueOnce([]); // Previous month
      dynamoHelpers.getItem.mockResolvedValue(budget);

      const event = {
        httpMethod: "GET",
        path: "/insights/monthly",
        queryStringParameters: { month: "2026-02" },
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.budgetComparison).toBeTruthy();
      expect(body.data.budgetComparison.onTrack).toBe(true);
    });
  });

  describe("GET /insights/trends", () => {
    it("should return 6 months of trends by default", async () => {
      dynamoHelpers.queryByPK.mockResolvedValue([]);

      const event = {
        httpMethod: "GET",
        path: "/insights/trends",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.months.length).toBe(6);
      expect(body.data.spending.length).toBe(6);
    });
  });

  describe("GET /insights/patterns", () => {
    it("should return spending patterns", async () => {
      const transactions = [
        { type: "expense", amount: 50, merchant: "Amazon", date: "2026-01-15" },
        { type: "expense", amount: 60, merchant: "Amazon", date: "2026-01-20" },
        {
          type: "expense",
          amount: 40,
          merchant: "Costco",
          date: "2026-01-25",
        },
      ];
      dynamoHelpers.queryByPK.mockResolvedValue(transactions);

      const event = {
        httpMethod: "GET",
        path: "/insights/patterns",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.patterns.dayOfWeek).toBeDefined();
      expect(body.data.patterns.topMerchants).toBeDefined();
      // Amazon has higher total ($110) than Costco ($40)
      expect(body.data.patterns.topMerchants[0].name).toBe("Amazon");
    });
  });

  describe("POST /insights/ask", () => {
    it("should answer spending questions", async () => {
      const transactions = [
        {
          type: "expense",
          amount: 200,
          categoryName: "Groceries",
          date: "2026-02-01",
        },
        {
          type: "expense",
          amount: 100,
          categoryName: "Dining",
          date: "2026-02-02",
        },
      ];
      dynamoHelpers.queryByPK.mockResolvedValue(transactions);

      const event = {
        httpMethod: "POST",
        path: "/insights/ask",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({ question: "How much did I spend?" }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.answer).toBeTruthy();
      expect(body.data.context.totalSpent).toBe(300);
    });

    it("should reject without question", async () => {
      const event = {
        httpMethod: "POST",
        path: "/insights/ask",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({}),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      expect(result.statusCode).toBe(400);
    });
  });
});
