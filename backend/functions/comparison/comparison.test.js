/**
 * BudgetBuddy Peer Comparison Lambda Tests
 */

const { handler } = require("./index");
const { getUserFromEvent, dynamoHelpers } = require("/opt/nodejs/utils");
const { checkPermission } = require("/opt/nodejs/shared");

describe("Comparison Lambda", () => {
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
        path: "/comparison/health",
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.status).toBe("healthy");
      expect(body.data.service).toBe("comparison");
    });
  });

  describe("CORS Preflight", () => {
    it("should handle OPTIONS request", async () => {
      const event = {
        httpMethod: "OPTIONS",
        path: "/comparison/summary",
      };

      const response = await handler(event, mockContext);

      expect(response.statusCode).toBe(200);
      expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    });
  });

  describe("GET /comparison/preferences", () => {
    it("should return default preferences when none exist", async () => {
      dynamoHelpers.getItem.mockResolvedValue(null);

      const event = {
        httpMethod: "GET",
        path: "/comparison/preferences",
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.optedOut).toBe(false);
      expect(body.data.shareData).toBe(true);
      expect(body.data.showInInsights).toBe(true);
    });

    it("should return saved preferences", async () => {
      dynamoHelpers.getItem.mockResolvedValue({
        optedOut: true,
        shareData: false,
        showInInsights: true,
      });

      const event = {
        httpMethod: "GET",
        path: "/comparison/preferences",
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.optedOut).toBe(true);
      expect(body.data.shareData).toBe(false);
    });
  });

  describe("PUT /comparison/preferences", () => {
    it("should update preferences", async () => {
      dynamoHelpers.putItem.mockResolvedValue({});

      const event = {
        httpMethod: "PUT",
        path: "/comparison/preferences",
        headers: { Authorization: "Bearer token" },
        body: JSON.stringify({
          optedOut: true,
          shareData: false,
          showInInsights: true,
        }),
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.optedOut).toBe(true);
      expect(body.data.shareData).toBe(false);
      expect(dynamoHelpers.putItem).toHaveBeenCalled();
    });

    it("should opt out of comparisons", async () => {
      dynamoHelpers.putItem.mockResolvedValue({});

      const event = {
        httpMethod: "PUT",
        path: "/comparison/preferences",
        headers: { Authorization: "Bearer token" },
        body: JSON.stringify({ optedOut: true }),
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.optedOut).toBe(true);
    });
  });

  describe("GET /comparison/summary", () => {
    it("should return opted-out message when user has opted out", async () => {
      dynamoHelpers.getItem.mockResolvedValue({ optedOut: true });

      const event = {
        httpMethod: "GET",
        path: "/comparison/summary",
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.optedOut).toBe(true);
    });

    it("should return not-available when group size is too small", async () => {
      // First call for preferences, second for user profile
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ optedOut: false })
        .mockResolvedValueOnce({
          userId: "user-123",
          region: "US",
          familySize: 4,
          annualIncome: 75000,
        })
        .mockResolvedValueOnce(null); // No aggregated data

      // Scan returns too few users
      dynamoHelpers.scan.mockResolvedValue([
        { userId: "user-1", region: "US", familySize: 4 },
        { userId: "user-2", region: "US", familySize: 4 },
      ]);

      const event = {
        httpMethod: "GET",
        path: "/comparison/summary",
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.available).toBe(false);
      expect(body.data.minRequired).toBe(50);
    });

    it("should return comparison data when available", async () => {
      // Preferences
      dynamoHelpers.getItem.mockResolvedValueOnce({ optedOut: false });

      // User profile
      dynamoHelpers.getItem.mockResolvedValueOnce({
        userId: "user-123",
        region: "US",
        familySize: 2,
        annualIncome: 80000,
      });

      // Aggregated comparison data
      dynamoHelpers.getItem.mockResolvedValueOnce({
        groupSize: 100,
        categoryStats: {
          Housing: {
            average: 1500,
            median: 1400,
            percentile25: 1200,
            percentile75: 1800,
            count: 100,
          },
          Food: {
            average: 600,
            median: 550,
            percentile25: 400,
            percentile75: 750,
            count: 100,
          },
        },
        lastUpdated: "2026-02-01T00:00:00.000Z",
      });

      // User profile for spending query
      dynamoHelpers.getItem.mockResolvedValueOnce({
        userId: "user-123",
        familyId: "family-123",
      });

      // User transactions
      dynamoHelpers.query.mockResolvedValue([
        { type: "expense", category: "rent", amount: -1600 },
        { type: "expense", category: "groceries", amount: -500 },
      ]);

      const event = {
        httpMethod: "GET",
        path: "/comparison/summary",
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.data.available).toBe(true);
      expect(body.data.groupSize).toBe(100);
      expect(body.data.comparison).toBeDefined();
      expect(body.data.comparison.Housing).toBeDefined();
    });
  });

  describe("Authentication", () => {
    it("should require authentication", async () => {
      getUserFromEvent.mockImplementation(() => {
        throw new Error("No user claims found");
      });

      const event = {
        httpMethod: "GET",
        path: "/comparison/summary",
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(401);
      expect(body.message).toContain("Authentication required");
    });

    it("should check permissions", async () => {
      checkPermission.mockResolvedValue(false);

      const event = {
        httpMethod: "GET",
        path: "/comparison/summary",
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(403);
    });
  });

  describe("Route Not Found", () => {
    it("should return 404 for unknown routes", async () => {
      const event = {
        httpMethod: "GET",
        path: "/comparison/unknown",
        headers: { Authorization: "Bearer token" },
      };

      const response = await handler(event, mockContext);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(404);
    });
  });
});
