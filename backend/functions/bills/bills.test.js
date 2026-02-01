/**
 * Bills Lambda Function Tests
 * Tests for bill reminders CRUD operations and payment tracking
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

const { handler } = require("./index");
const {
  dynamoHelpers,
  getUserFromEvent,
  FamilyIdResolver,
} = require("/opt/nodejs/utils");

describe("Bills Lambda Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Health Check", () => {
    it("should return healthy status", async () => {
      const event = {
        httpMethod: "GET",
        path: "/bills/health",
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.status).toBe("healthy");
      expect(body.data.service).toBe("bills");
    });
  });

  describe("CORS Preflight", () => {
    it("should handle OPTIONS request", async () => {
      const event = {
        httpMethod: "OPTIONS",
        path: "/bills",
      };

      const result = await handler(event, { awsRequestId: "test-123" });

      expect(result.statusCode).toBe(200);
      expect(result.headers["Access-Control-Allow-Origin"]).toBe("*");
      expect(result.headers["Access-Control-Allow-Methods"]).toContain("GET");
    });
  });

  describe("GET /bills", () => {
    it("should return empty list when no bills exist", async () => {
      dynamoHelpers.queryByPK.mockResolvedValue([]);

      const event = {
        httpMethod: "GET",
        path: "/bills",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.bills).toEqual([]);
      expect(body.data.count).toBe(0);
    });

    it("should return bills sorted by due date", async () => {
      const mockBills = [
        {
          billId: "bill-2",
          name: "Electric",
          amount: 100,
          dueDate: "2026-02-20",
          status: "unpaid",
        },
        {
          billId: "bill-1",
          name: "Rent",
          amount: 1500,
          dueDate: "2026-02-01",
          status: "unpaid",
        },
      ];
      dynamoHelpers.queryByPK.mockResolvedValue(mockBills);

      const event = {
        httpMethod: "GET",
        path: "/bills",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.bills.length).toBe(2);
      // Should be sorted by due date (earliest first)
      expect(body.data.bills[0].name).toBe("Rent");
    });
  });

  describe("POST /bills", () => {
    it("should create a new bill", async () => {
      const event = {
        httpMethod: "POST",
        path: "/bills",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({
          name: "Electric Bill",
          amount: 150,
          dueDate: "2026-02-15",
          categoryId: "cat-utilities",
        }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.name).toBe("Electric Bill");
      expect(body.data.amount).toBe(150);
      expect(dynamoHelpers.putItem).toHaveBeenCalled();
    });

    it("should reject bill without name", async () => {
      const event = {
        httpMethod: "POST",
        path: "/bills",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({
          amount: 150,
          dueDate: "2026-02-15",
        }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });

      expect(result.statusCode).toBe(400);
    });

    it("should reject bill with invalid date format", async () => {
      const event = {
        httpMethod: "POST",
        path: "/bills",
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({
          name: "Electric Bill",
          amount: 150,
          dueDate: "02-15-2026", // Wrong format
        }),
      };

      const result = await handler(event, { awsRequestId: "test-123" });

      expect(result.statusCode).toBe(400);
    });
  });

  describe("POST /bills/{billId}/pay", () => {
    it("should mark bill as paid and create transaction", async () => {
      const mockBill = {
        billId: "bill-123",
        name: "Electric Bill",
        amount: 150,
        dueDate: "2026-02-15",
        categoryId: "cat-utilities",
        categoryName: "Utilities",
        status: "unpaid",
        isRecurring: false,
      };
      dynamoHelpers.getItem.mockResolvedValue(mockBill);
      dynamoHelpers.updateItem.mockResolvedValue({
        ...mockBill,
        status: "paid",
      });

      const event = {
        httpMethod: "POST",
        path: "/bills/bill-123/pay",
        pathParameters: { billId: "bill-123" },
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({}),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.bill.status).toBe("paid");
      expect(body.data.transactionId).toBeTruthy();
    });

    it("should create next occurrence for recurring bill", async () => {
      const mockBill = {
        billId: "bill-123",
        name: "Electric Bill",
        amount: 150,
        dueDate: "2026-02-15",
        categoryId: "cat-utilities",
        status: "unpaid",
        isRecurring: true,
        frequency: "monthly",
      };
      dynamoHelpers.getItem.mockResolvedValue(mockBill);
      dynamoHelpers.updateItem.mockResolvedValue({
        ...mockBill,
        status: "paid",
      });

      const event = {
        httpMethod: "POST",
        path: "/bills/bill-123/pay",
        pathParameters: { billId: "bill-123" },
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({}),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.nextBill).toBeTruthy();
      // Next bill should be approximately one month later (March 2026)
      expect(body.data.nextBill.dueDate).toMatch(/^2026-03-1[45]$/);
    });
  });

  describe("Route Not Found", () => {
    it("should return 404 for unknown routes", async () => {
      const event = {
        httpMethod: "GET",
        path: "/bills/unknown/route",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });

      expect(result.statusCode).toBe(404);
    });
  });
});

describe("calculateNextDueDate", () => {
  // Test the date calculation logic
  it("should calculate monthly next due date correctly", () => {
    // This would test the internal function if exported
    // For now, we test through the pay endpoint
  });
});
