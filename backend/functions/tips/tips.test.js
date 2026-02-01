/**
 * BudgetBuddy Financial Tips Lambda Tests
 */

const { handler } = require("./index");
const { getUserFromEvent, dynamoHelpers } = require("/opt/nodejs/utils");
const { checkPermission } = require("/opt/nodejs/shared");

describe("Tips Lambda", () => {
  const mockContext = { awsRequestId: "test-request-id" };

  beforeEach(() => {
    jest.clearAllMocks();
    checkPermission.mockResolvedValue(true);
    getUserFromEvent.mockReturnValue({
      userId: "user-123",
      email: "test@example.com",
    });
  });

  describe("Health Check", () => {
    it("should return healthy status", async () => {
      const event = {
        httpMethod: "GET",
        path: "/tips/health",
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.status).toBe("healthy");
      expect(body.data.service).toBe("tips");
    });
  });

  describe("CORS Preflight", () => {
    it("should handle OPTIONS request", async () => {
      const event = {
        httpMethod: "OPTIONS",
        path: "/tips/feed",
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);
      expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    });
  });

  describe("GET /tips/feed", () => {
    it("should return personalized tips feed", async () => {
      // Mock tip history
      dynamoHelpers.getItem.mockResolvedValueOnce({
        viewed: [],
        dismissed: [],
        recentDaily: [],
      });

      // Mock user profile
      dynamoHelpers.getItem.mockResolvedValueOnce({
        userId: "user-123",
        familyId: "family-123",
      });

      // Mock transactions
      dynamoHelpers.query.mockResolvedValueOnce([
        { type: "expense", category: "groceries", amount: -200 },
        { type: "income", category: "salary", amount: 3000 },
      ]);

      // Mock putItem for updating viewed tips
      dynamoHelpers.putItem.mockResolvedValue({});

      const event = {
        httpMethod: "GET",
        path: "/tips/feed",
        headers: { Authorization: "Bearer token" },
        queryStringParameters: { limit: "5" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.tips).toBeDefined();
      expect(body.data.tips.length).toBeLessThanOrEqual(5);
      expect(body.data.total).toBeDefined();
    });

    it("should filter tips by category", async () => {
      dynamoHelpers.getItem.mockResolvedValueOnce({
        viewed: [],
        dismissed: [],
        recentDaily: [],
      });
      dynamoHelpers.getItem.mockResolvedValueOnce({
        userId: "user-123",
        familyId: "family-123",
      });
      dynamoHelpers.query.mockResolvedValueOnce([]);
      dynamoHelpers.putItem.mockResolvedValue({});

      const event = {
        httpMethod: "GET",
        path: "/tips/feed",
        headers: { Authorization: "Bearer token" },
        queryStringParameters: { category: "saving" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      body.data.tips.forEach((tip) => {
        expect(tip.category).toBe("saving");
      });
    });

    it("should exclude dismissed tips", async () => {
      dynamoHelpers.getItem.mockResolvedValueOnce({
        viewed: [],
        dismissed: ["budget-001", "save-001"],
        recentDaily: [],
      });
      dynamoHelpers.getItem.mockResolvedValueOnce({
        userId: "user-123",
        familyId: "family-123",
      });
      dynamoHelpers.query.mockResolvedValueOnce([]);
      dynamoHelpers.putItem.mockResolvedValue({});

      const event = {
        httpMethod: "GET",
        path: "/tips/feed",
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      const tipIds = body.data.tips.map((t) => t.id);
      expect(tipIds).not.toContain("budget-001");
      expect(tipIds).not.toContain("save-001");
    });
  });

  describe("GET /tips/daily", () => {
    it("should return daily tip", async () => {
      // No existing daily tip
      dynamoHelpers.getItem.mockResolvedValueOnce(null);
      // Tip history
      dynamoHelpers.getItem.mockResolvedValueOnce({
        viewed: [],
        dismissed: [],
        recentDaily: [],
      });
      dynamoHelpers.putItem.mockResolvedValue({});

      const event = {
        httpMethod: "GET",
        path: "/tips/daily",
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.tip).toBeDefined();
      expect(body.data.date).toBeDefined();
      expect(body.data.alreadyViewed).toBe(false);
    });

    it("should return existing daily tip if already viewed today", async () => {
      const today = new Date().toISOString().split("T")[0];
      const existingTip = {
        id: "budget-001",
        title: "The 50/30/20 Rule",
        content: "Test content",
        category: "budgeting",
      };

      dynamoHelpers.getItem.mockResolvedValueOnce({
        tip: existingTip,
        date: today,
      });

      const event = {
        httpMethod: "GET",
        path: "/tips/daily",
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.tip.id).toBe("budget-001");
      expect(body.data.alreadyViewed).toBe(true);
    });
  });

  describe("GET /tips/saved", () => {
    it("should return saved tips", async () => {
      dynamoHelpers.query.mockResolvedValueOnce([
        {
          tip: { id: "budget-001", title: "Test Tip 1", category: "budgeting" },
          savedAt: "2026-01-15T00:00:00.000Z",
        },
        {
          tip: { id: "save-001", title: "Test Tip 2", category: "saving" },
          savedAt: "2026-01-16T00:00:00.000Z",
        },
      ]);

      const event = {
        httpMethod: "GET",
        path: "/tips/saved",
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.tips.length).toBe(2);
      expect(body.data.total).toBe(2);
    });

    it("should return empty array when no saved tips", async () => {
      dynamoHelpers.query.mockResolvedValueOnce([]);

      const event = {
        httpMethod: "GET",
        path: "/tips/saved",
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.tips.length).toBe(0);
    });
  });

  describe("POST /tips/:tipId/save", () => {
    it("should save a tip", async () => {
      dynamoHelpers.getItem.mockResolvedValueOnce(null); // Not already saved
      dynamoHelpers.putItem.mockResolvedValue({});

      const event = {
        httpMethod: "POST",
        path: "/tips/budget-001/save",
        pathParameters: { tipId: "budget-001" },
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.tip.id).toBe("budget-001");
      expect(body.data.alreadySaved).toBe(false);
      expect(dynamoHelpers.putItem).toHaveBeenCalled();
    });

    it("should indicate if tip already saved", async () => {
      dynamoHelpers.getItem.mockResolvedValueOnce({
        tipId: "budget-001",
        savedAt: "2026-01-15T00:00:00.000Z",
      });

      const event = {
        httpMethod: "POST",
        path: "/tips/budget-001/save",
        pathParameters: { tipId: "budget-001" },
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.alreadySaved).toBe(true);
    });

    it("should return 404 for non-existent tip", async () => {
      const event = {
        httpMethod: "POST",
        path: "/tips/invalid-tip/save",
        pathParameters: { tipId: "invalid-tip" },
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /tips/:tipId/dismiss", () => {
    it("should dismiss a tip", async () => {
      dynamoHelpers.getItem.mockResolvedValueOnce({
        viewed: [],
        dismissed: [],
        recentDaily: [],
      });
      dynamoHelpers.putItem.mockResolvedValue({});

      const event = {
        httpMethod: "POST",
        path: "/tips/budget-001/dismiss",
        pathParameters: { tipId: "budget-001" },
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.tipId).toBe("budget-001");
      expect(body.data.dismissed).toBe(true);
    });
  });

  describe("Authentication", () => {
    it("should require authentication", async () => {
      getUserFromEvent.mockImplementation(() => {
        throw new Error("No user claims found");
      });

      const event = {
        httpMethod: "GET",
        path: "/tips/feed",
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(401);
    });

    it("should check permissions", async () => {
      checkPermission.mockResolvedValue(false);

      const event = {
        httpMethod: "GET",
        path: "/tips/feed",
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(403);
    });
  });

  describe("Route Not Found", () => {
    it("should return 404 for unknown routes", async () => {
      const event = {
        httpMethod: "GET",
        path: "/tips/unknown",
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(404);
    });
  });
});
