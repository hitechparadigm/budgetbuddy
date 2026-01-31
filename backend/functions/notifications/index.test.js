/**
 * Unit tests for Notification Service Lambda
 */

const { handler } = require("./index");

// Mock AWS SDK
jest.mock("aws-sdk", () => {
  const mockDynamoDB = {
    put: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    query: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    promise: jest.fn(),
  };

  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => mockDynamoDB),
    },
    SNS: jest.fn(() => ({
      subscribe: jest.fn().mockReturnThis(),
      promise: jest.fn(),
    })),
  };
});

// Mock fetch for Expo API
global.fetch = jest.fn();

describe("Notification Service Lambda", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = "test-table";
  });

  describe("CORS Preflight", () => {
    it("should handle OPTIONS request", async () => {
      const event = {
        httpMethod: "OPTIONS",
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toHaveProperty("Access-Control-Allow-Origin");
    });
  });

  describe("Device Registration", () => {
    it("should register device with valid token", async () => {
      const AWS = require("aws-sdk");
      const mockDynamoDB = new AWS.DynamoDB.DocumentClient();
      mockDynamoDB.promise.mockResolvedValue({});

      const event = {
        httpMethod: "POST",
        path: "/notifications/register",
        body: JSON.stringify({
          userId: "user-123",
          deviceToken: "ExponentPushToken[test]",
          platform: "ios",
        }),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockDynamoDB.put).toHaveBeenCalled();
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });

    it("should return 400 for missing fields", async () => {
      const event = {
        httpMethod: "POST",
        path: "/notifications/register",
        body: JSON.stringify({
          userId: "user-123",
          // Missing deviceToken and platform
        }),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe("Missing required fields");
    });
  });

  describe("Device Removal", () => {
    it("should remove device registration", async () => {
      const AWS = require("aws-sdk");
      const mockDynamoDB = new AWS.DynamoDB.DocumentClient();
      mockDynamoDB.promise.mockResolvedValue({});

      const event = {
        httpMethod: "DELETE",
        path: "/notifications/register",
        body: JSON.stringify({
          userId: "user-123",
          deviceToken: "ExponentPushToken[test]",
        }),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockDynamoDB.delete).toHaveBeenCalled();
    });
  });

  describe("Notification Preferences", () => {
    it("should get default preferences for new user", async () => {
      const AWS = require("aws-sdk");
      const mockDynamoDB = new AWS.DynamoDB.DocumentClient();
      mockDynamoDB.promise.mockResolvedValue({}); // No item found

      const event = {
        httpMethod: "GET",
        path: "/notifications/preferences",
        queryStringParameters: {
          userId: "user-123",
        },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.budgetAlerts).toBe(true);
      expect(body.dailyReminders).toBe(true);
      expect(body.reminderTime).toBe("19:00");
    });

    it("should update preferences", async () => {
      const AWS = require("aws-sdk");
      const mockDynamoDB = new AWS.DynamoDB.DocumentClient();
      mockDynamoDB.promise.mockResolvedValue({});

      const event = {
        httpMethod: "PUT",
        path: "/notifications/preferences",
        body: JSON.stringify({
          userId: "user-123",
          preferences: {
            budgetAlerts: false,
            dailyReminders: true,
            reminderTime: "20:00",
          },
        }),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockDynamoDB.put).toHaveBeenCalled();
    });
  });

  describe("Notification History", () => {
    it("should get notification history with pagination", async () => {
      const AWS = require("aws-sdk");
      const mockDynamoDB = new AWS.DynamoDB.DocumentClient();
      mockDynamoDB.promise.mockResolvedValue({
        Items: [
          {
            PK: "USER#user-123",
            SK: "NOTIFICATION#1234567890",
            title: "Test Notification",
            body: "Test body",
            read: false,
          },
        ],
        LastEvaluatedKey: {
          PK: "USER#user-123",
          SK: "NOTIFICATION#1234567890",
        },
      });

      const event = {
        httpMethod: "GET",
        path: "/notifications/history",
        queryStringParameters: {
          userId: "user-123",
          limit: "50",
        },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockDynamoDB.query).toHaveBeenCalled();
      const body = JSON.parse(result.body);
      expect(body.notifications).toHaveLength(1);
      expect(body.lastEvaluatedKey).toBeDefined();
    });

    it("should return 400 for missing userId", async () => {
      const event = {
        httpMethod: "GET",
        path: "/notifications/history",
        queryStringParameters: {},
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });
  });

  describe("Mark as Read", () => {
    it("should mark notification as read", async () => {
      const AWS = require("aws-sdk");
      const mockDynamoDB = new AWS.DynamoDB.DocumentClient();
      mockDynamoDB.promise.mockResolvedValue({});

      const event = {
        httpMethod: "PUT",
        path: "/notifications/1234567890/read",
        body: JSON.stringify({
          userId: "user-123",
        }),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockDynamoDB.update).toHaveBeenCalled();
    });
  });

  describe("Send Notification", () => {
    it("should send notification to all user devices", async () => {
      const AWS = require("aws-sdk");
      const mockDynamoDB = new AWS.DynamoDB.DocumentClient();

      // Mock getUserDeviceTokens
      mockDynamoDB.promise
        .mockResolvedValueOnce({
          Items: [
            {
              deviceToken: "ExponentPushToken[test1]",
              platform: "ios",
              enabled: true,
            },
            {
              deviceToken: "ExponentPushToken[test2]",
              platform: "android",
              enabled: true,
            },
          ],
        })
        // Mock storing notification
        .mockResolvedValueOnce({});

      // Mock Expo API
      global.fetch.mockResolvedValue({
        json: () => Promise.resolve({ data: [{ status: "ok" }] }),
      });

      const event = {
        httpMethod: "POST",
        path: "/notifications/send",
        body: JSON.stringify({
          userId: "user-123",
          notification: {
            title: "Test Alert",
            body: "Test message",
            data: { type: "test" },
          },
        }),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://exp.host/--/api/v2/push/send",
        expect.any(Object),
      );
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.deviceCount).toBe(2);
    });

    it("should handle no devices registered", async () => {
      const AWS = require("aws-sdk");
      const mockDynamoDB = new AWS.DynamoDB.DocumentClient();
      mockDynamoDB.promise.mockResolvedValue({ Items: [] });

      const event = {
        httpMethod: "POST",
        path: "/notifications/send",
        body: JSON.stringify({
          userId: "user-123",
          notification: {
            title: "Test Alert",
            body: "Test message",
          },
        }),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.reason).toBe("No devices registered");
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for unknown endpoint", async () => {
      const event = {
        httpMethod: "GET",
        path: "/notifications/unknown",
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
    });

    it("should return 500 for internal errors", async () => {
      const AWS = require("aws-sdk");
      const mockDynamoDB = new AWS.DynamoDB.DocumentClient();
      mockDynamoDB.promise.mockRejectedValue(new Error("DynamoDB error"));

      const event = {
        httpMethod: "POST",
        path: "/notifications/register",
        body: JSON.stringify({
          userId: "user-123",
          deviceToken: "ExponentPushToken[test]",
          platform: "ios",
        }),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error).toBe("Internal server error");
    });
  });
});
