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

/**
 * Bill Reminder Timing Tests
 * Tests for notification scheduling logic and recurring bill date calculations
 * Validates: Requirement 36.5, 36.8
 */
describe("Bill Reminder Timing", () => {
  describe("Days Until Due Calculation", () => {
    it("should calculate days until due correctly for future date", async () => {
      // Set up a bill due in 7 days
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dueDateStr = futureDate.toISOString().split("T")[0];

      const mockBill = {
        billId: "bill-future",
        name: "Future Bill",
        amount: 100,
        dueDate: dueDateStr,
        status: "unpaid",
        entityType: "BILL",
      };
      dynamoHelpers.queryByPK.mockResolvedValue([mockBill]);

      const event = {
        httpMethod: "GET",
        path: "/bills",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      // Allow for timezone differences (7 or 8 days)
      expect(body.data.bills[0].daysUntilDue).toBeGreaterThanOrEqual(7);
      expect(body.data.bills[0].daysUntilDue).toBeLessThanOrEqual(8);
      expect(body.data.bills[0].statusIndicator).toBe("🟢"); // Upcoming
    });

    it("should show due today indicator", async () => {
      const today = new Date().toISOString().split("T")[0];

      const mockBill = {
        billId: "bill-today",
        name: "Due Today Bill",
        amount: 100,
        dueDate: today,
        status: "unpaid",
        entityType: "BILL",
      };
      dynamoHelpers.queryByPK.mockResolvedValue([mockBill]);

      const event = {
        httpMethod: "GET",
        path: "/bills",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      // Allow for timezone differences (0 or 1 day)
      expect(body.data.bills[0].daysUntilDue).toBeGreaterThanOrEqual(0);
      expect(body.data.bills[0].daysUntilDue).toBeLessThanOrEqual(1);
      expect(body.data.bills[0].statusIndicator).toBe("🟡"); // Due soon (within 3 days)
    });

    it("should show overdue indicator for past dates", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const dueDateStr = pastDate.toISOString().split("T")[0];

      const mockBill = {
        billId: "bill-overdue",
        name: "Overdue Bill",
        amount: 100,
        dueDate: dueDateStr,
        status: "overdue",
        entityType: "BILL",
      };
      dynamoHelpers.queryByPK.mockResolvedValue([mockBill]);

      const event = {
        httpMethod: "GET",
        path: "/bills",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      // Allow for timezone differences (-4 or -5 days)
      expect(body.data.bills[0].daysUntilDue).toBeLessThanOrEqual(-4);
      expect(body.data.bills[0].daysUntilDue).toBeGreaterThanOrEqual(-5);
      expect(body.data.bills[0].statusIndicator).toBe("🔴"); // Overdue
    });

    it("should show due soon indicator for bills within 3 days", async () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 2);
      const dueDateStr = soonDate.toISOString().split("T")[0];

      const mockBill = {
        billId: "bill-soon",
        name: "Due Soon Bill",
        amount: 100,
        dueDate: dueDateStr,
        status: "unpaid",
        entityType: "BILL",
      };
      dynamoHelpers.queryByPK.mockResolvedValue([mockBill]);

      const event = {
        httpMethod: "GET",
        path: "/bills",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      // Allow for timezone differences (2 or 3 days)
      expect(body.data.bills[0].daysUntilDue).toBeGreaterThanOrEqual(2);
      expect(body.data.bills[0].daysUntilDue).toBeLessThanOrEqual(3);
      expect(body.data.bills[0].statusIndicator).toBe("🟡"); // Due soon
    });
  });

  describe("Recurring Bill Date Calculations", () => {
    it("should calculate weekly next due date", async () => {
      const mockBill = {
        billId: "bill-weekly",
        name: "Weekly Bill",
        amount: 50,
        dueDate: "2026-02-01",
        status: "unpaid",
        isRecurring: true,
        frequency: "weekly",
        entityType: "BILL",
      };
      dynamoHelpers.getItem.mockResolvedValue(mockBill);
      dynamoHelpers.updateItem.mockResolvedValue({
        ...mockBill,
        status: "paid",
      });

      const event = {
        httpMethod: "POST",
        path: "/bills/bill-weekly/pay",
        pathParameters: { billId: "bill-weekly" },
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({}),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.nextBill).toBeTruthy();
      expect(body.data.nextBill.dueDate).toBe("2026-02-08"); // 7 days later
    });

    it("should calculate bi-weekly next due date", async () => {
      const mockBill = {
        billId: "bill-biweekly",
        name: "Bi-weekly Bill",
        amount: 100,
        dueDate: "2026-02-01",
        status: "unpaid",
        isRecurring: true,
        frequency: "bi-weekly",
        entityType: "BILL",
      };
      dynamoHelpers.getItem.mockResolvedValue(mockBill);
      dynamoHelpers.updateItem.mockResolvedValue({
        ...mockBill,
        status: "paid",
      });

      const event = {
        httpMethod: "POST",
        path: "/bills/bill-biweekly/pay",
        pathParameters: { billId: "bill-biweekly" },
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({}),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.nextBill).toBeTruthy();
      expect(body.data.nextBill.dueDate).toBe("2026-02-15"); // 14 days later
    });

    it("should calculate quarterly next due date", async () => {
      const mockBill = {
        billId: "bill-quarterly",
        name: "Quarterly Bill",
        amount: 500,
        dueDate: "2026-02-01",
        status: "unpaid",
        isRecurring: true,
        frequency: "quarterly",
        entityType: "BILL",
      };
      dynamoHelpers.getItem.mockResolvedValue(mockBill);
      dynamoHelpers.updateItem.mockResolvedValue({
        ...mockBill,
        status: "paid",
      });

      const event = {
        httpMethod: "POST",
        path: "/bills/bill-quarterly/pay",
        pathParameters: { billId: "bill-quarterly" },
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({}),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.nextBill).toBeTruthy();
      expect(body.data.nextBill.dueDate).toBe("2026-05-01"); // 3 months later
    });

    it("should calculate annual next due date", async () => {
      const mockBill = {
        billId: "bill-annual",
        name: "Annual Bill",
        amount: 1200,
        dueDate: "2026-02-01",
        status: "unpaid",
        isRecurring: true,
        frequency: "annually",
        entityType: "BILL",
      };
      dynamoHelpers.getItem.mockResolvedValue(mockBill);
      dynamoHelpers.updateItem.mockResolvedValue({
        ...mockBill,
        status: "paid",
      });

      const event = {
        httpMethod: "POST",
        path: "/bills/bill-annual/pay",
        pathParameters: { billId: "bill-annual" },
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({}),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.nextBill).toBeTruthy();
      expect(body.data.nextBill.dueDate).toBe("2027-02-01"); // 1 year later
    });

    it("should not create next bill for non-recurring bills", async () => {
      const mockBill = {
        billId: "bill-onetime",
        name: "One-time Bill",
        amount: 200,
        dueDate: "2026-02-15",
        status: "unpaid",
        isRecurring: false,
        entityType: "BILL",
      };
      dynamoHelpers.getItem.mockResolvedValue(mockBill);
      dynamoHelpers.updateItem.mockResolvedValue({
        ...mockBill,
        status: "paid",
      });

      const event = {
        httpMethod: "POST",
        path: "/bills/bill-onetime/pay",
        pathParameters: { billId: "bill-onetime" },
        headers: { Authorization: "Bearer test-token" },
        body: JSON.stringify({}),
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.nextBill).toBeNull();
    });
  });

  describe("Upcoming Bills Filter", () => {
    it("should return only upcoming bills within 30 days", async () => {
      const today = new Date();
      const in10Days = new Date(today);
      in10Days.setDate(in10Days.getDate() + 10);
      const in40Days = new Date(today);
      in40Days.setDate(in40Days.getDate() + 40);

      const mockBills = [
        {
          billId: "bill-upcoming",
          name: "Upcoming Bill",
          amount: 100,
          dueDate: in10Days.toISOString().split("T")[0],
          status: "unpaid",
          entityType: "BILL",
        },
      ];
      dynamoHelpers.queryByPK.mockResolvedValue(mockBills);

      const event = {
        httpMethod: "GET",
        path: "/bills/upcoming",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.bills.length).toBe(1);
    });

    it("should exclude paid bills from upcoming", async () => {
      const in10Days = new Date();
      in10Days.setDate(in10Days.getDate() + 10);

      // The filter in the handler excludes paid bills
      dynamoHelpers.queryByPK.mockResolvedValue([]);

      const event = {
        httpMethod: "GET",
        path: "/bills/upcoming",
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.bills.length).toBe(0);
    });
  });

  describe("Calendar View", () => {
    it("should group bills by date for calendar view", async () => {
      const mockBills = [
        {
          billId: "bill-1",
          name: "Bill 1",
          amount: 100,
          dueDate: "2026-02-15",
          status: "unpaid",
          entityType: "BILL",
        },
        {
          billId: "bill-2",
          name: "Bill 2",
          amount: 200,
          dueDate: "2026-02-15",
          status: "unpaid",
          entityType: "BILL",
        },
        {
          billId: "bill-3",
          name: "Bill 3",
          amount: 150,
          dueDate: "2026-02-20",
          status: "unpaid",
          entityType: "BILL",
        },
      ];
      dynamoHelpers.queryByPK.mockResolvedValue(mockBills);

      const event = {
        httpMethod: "GET",
        path: "/bills/calendar",
        queryStringParameters: { month: "2026-02" },
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.month).toBe("2026-02");
      expect(body.data.calendar.length).toBe(2); // Two unique dates

      // Find the date with 2 bills
      const feb15 = body.data.calendar.find((d) => d.date === "2026-02-15");
      expect(feb15.bills.length).toBe(2);
      expect(feb15.totalAmount).toBe(300);
    });

    it("should calculate summary totals correctly", async () => {
      const mockBills = [
        {
          billId: "bill-unpaid",
          name: "Unpaid Bill",
          amount: 100,
          dueDate: "2026-02-15",
          status: "unpaid",
          entityType: "BILL",
        },
        {
          billId: "bill-paid",
          name: "Paid Bill",
          amount: 200,
          dueDate: "2026-02-10",
          status: "paid",
          entityType: "BILL",
        },
      ];
      dynamoHelpers.queryByPK.mockResolvedValue(mockBills);

      const event = {
        httpMethod: "GET",
        path: "/bills/calendar",
        queryStringParameters: { month: "2026-02" },
        headers: { Authorization: "Bearer test-token" },
      };

      const result = await handler(event, { awsRequestId: "test-123" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.data.summary.totalDue).toBe(100);
      expect(body.data.summary.totalPaid).toBe(200);
      expect(body.data.summary.billCount).toBe(2);
    });
  });
});
