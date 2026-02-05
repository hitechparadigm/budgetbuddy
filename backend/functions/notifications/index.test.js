/**
 * Unit tests for Notifications Lambda Handler
 */

const AWS = require("aws-sdk");

// Mock AWS SDK
jest.mock("aws-sdk", () => {
  const mockDynamoDB = {
    get: jest.fn(),
    put: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    query: jest.fn(),
  };

  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => mockDynamoDB),
    },
  };
});

const { handler } = require("./index");

describe("Notifications Lambda Handler", () => {
  let mockDynamoDB;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    mockDynamoDB = new AWS.DynamoDB.DocumentClient();

    // Set environment variables
    process.env.NOTIFICATIONS_TABLE = "test-notifications";
    process.env.USER_SETTINGS_TABLE = "test-user-settings";
  });

  describe("Health Check", () => {
    it("should return healthy status without authentication", async () => {
      const event = {
        httpMethod: "GET",
        path: "/notifications/health",
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        status: "healthy",
        service: "notifications",
      });
    });
  });

  describe("Authentication", () => {
    it("should return 401 for missing userId", async () => {
      const event = {
        httpMethod: "GET",
        path: "/notifications",
        requestContext: {},
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toEqual({ error: "Unauthorized" });
    });
  });

  describe("GET /notifications", () => {
    it("should return notifications for authenticated user", async () => {
      const mockNotifications = [
        {
          notificationId: "notif_1",
          userId: "user-123",
          type: "budget_alert",
          title: "Budget Alert",
          message: "Test message",
          isRead: false,
          createdAt: "2026-02-05T10:00:00Z",
        },
      ];

      mockDynamoDB.query.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Items: mockNotifications,
          Count: 1,
        }),
      });

      const event = {
        httpMethod: "GET",
        path: "/notifications",
        requestContext: {
          authorizer: {
            claims: { sub: "user-123" },
          },
        },
        queryStringParameters: {},
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.notifications).toEqual(mockNotifications);
      expect(body.count).toBe(1);
      expect(mockDynamoDB.query).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: "test-notifications",
          KeyConditionExpression: "userId = :userId",
        }),
      );
    });

    it("should filter by unread status", async () => {
      mockDynamoDB.query.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Items: [],
          Count: 0,
        }),
      });

      const event = {
        httpMethod: "GET",
        path: "/notifications",
        requestContext: {
          authorizer: {
            claims: { sub: "user-123" },
          },
        },
        queryStringParameters: {
          unreadOnly: "true",
        },
      };

      await handler(event);

      expect(mockDynamoDB.query).toHaveBeenCalledWith(
        expect.objectContaining({
          FilterExpression: "isRead = :isRead",
          ExpressionAttributeValues: expect.objectContaining({
            ":isRead": false,
          }),
        }),
      );
    });

    it("should filter by notification type", async () => {
      mockDynamoDB.query.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Items: [],
          Count: 0,
        }),
      });

      const event = {
        httpMethod: "GET",
        path: "/notifications",
        requestContext: {
          authorizer: {
            claims: { sub: "user-123" },
          },
        },
        queryStringParameters: {
          type: "budget_alert",
        },
      };

      await handler(event);

      expect(mockDynamoDB.query).toHaveBeenCalledWith(
        expect.objectContaining({
          FilterExpression: "#type = :type",
          ExpressionAttributeNames: { "#type": "type" },
          ExpressionAttributeValues: expect.objectContaining({
            ":type": "budget_alert",
          }),
        }),
      );
    });
  });

  describe("GET /notifications/{notificationId}", () => {
    it("should return a single notification", async () => {
      const mockNotification = {
        notificationId: "notif_1",
        userId: "user-123",
        type: "budget_alert",
        title: "Budget Alert",
        message: "Test message",
        isRead: false,
        createdAt: "2026-02-05T10:00:00Z",
      };

      mockDynamoDB.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Item: mockNotification,
        }),
      });

      const event = {
        httpMethod: "GET",
        path: "/notifications/notif_1",
        pathParameters: { notificationId: "notif_1" },
        requestContext: {
          authorizer: {
            claims: { sub: "user-123" },
          },
        },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual(mockNotification);
    });

    it("should return 404 for non-existent notification", async () => {
      mockDynamoDB.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      });

      const event = {
        httpMethod: "GET",
        path: "/notifications/notif_999",
        pathParameters: { notificationId: "notif_999" },
        requestContext: {
          authorizer: {
            claims: { sub: "user-123" },
          },
        },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({
        error: "Notification not found",
      });
    });

    it("should return 403 for unauthorized access", async () => {
      mockDynamoDB.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Item: {
            notificationId: "notif_1",
            userId: "user-456", // Different user
          },
        }),
      });

      const event = {
        httpMethod: "GET",
        path: "/notifications/notif_1",
        pathParameters: { notificationId: "notif_1" },
        requestContext: {
          authorizer: {
            claims: { sub: "user-123" },
          },
        },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toEqual({ error: "Forbidden" });
    });
  });

  describe("PUT /notifications/{notificationId}/read", () => {
    it("should mark notification as read", async () => {
      const mockNotification = {
        notificationId: "notif_1",
        userId: "user-123",
        isRead: false,
      };

      mockDynamoDB.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Item: mockNotification,
        }),
      });

      mockDynamoDB.update.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Attributes: {
            ...mockNotification,
            isRead: true,
            readAt: expect.any(String),
          },
        }),
      });

      const event = {
        httpMethod: "PUT",
        path: "/notifications/notif_1/read",
        pathParameters: { notificationId: "notif_1" },
        requestContext: {
          authorizer: {
            claims: { sub: "user-123" },
          },
        },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockDynamoDB.update).toHaveBeenCalledWith(
        expect.objectContaining({
          UpdateExpression: "SET isRead = :isRead, readAt = :readAt",
        }),
      );
    });
  });

  describe("PUT /notifications/read-all", () => {
    it("should mark all notifications as read", async () => {
      const mockNotifications = [
        { notificationId: "notif_1", isRead: false },
        { notificationId: "notif_2", isRead: false },
      ];

      mockDynamoDB.query.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Items: mockNotifications,
        }),
      });

      mockDynamoDB.update.mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      });

      const event = {
        httpMethod: "PUT",
        path: "/notifications/read-all",
        requestContext: {
          authorizer: {
            claims: { sub: "user-123" },
          },
        },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({ updated: 2 });
      expect(mockDynamoDB.update).toHaveBeenCalledTimes(2);
    });
  });

  describe("DELETE /notifications/{notificationId}", () => {
    it("should delete notification", async () => {
      mockDynamoDB.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Item: {
            notificationId: "notif_1",
            userId: "user-123",
          },
        }),
      });

      mockDynamoDB.delete.mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      });

      const event = {
        httpMethod: "DELETE",
        path: "/notifications/notif_1",
        pathParameters: { notificationId: "notif_1" },
        requestContext: {
          authorizer: {
            claims: { sub: "user-123" },
          },
        },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(204);
      expect(mockDynamoDB.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: { notificationId: "notif_1" },
        }),
      );
    });
  });

  describe("GET /notifications/settings", () => {
    it("should return user notification settings", async () => {
      const mockSettings = {
        budgetAlerts: true,
        familyActivity: true,
        systemMessages: true,
        emailNotifications: false,
      };

      mockDynamoDB.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Item: {
            userId: "user-123",
            settingType: "notifications",
            settings: mockSettings,
          },
        }),
      });

      const event = {
        httpMethod: "GET",
        path: "/notifications/settings",
        requestContext: {
          authorizer: {
            claims: { sub: "user-123" },
          },
        },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual(mockSettings);
    });

    it("should return default settings if none exist", async () => {
      mockDynamoDB.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      });

      const event = {
        httpMethod: "GET",
        path: "/notifications/settings",
        requestContext: {
          authorizer: {
            claims: { sub: "user-123" },
          },
        },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        budgetAlerts: true,
        familyActivity: true,
        systemMessages: true,
        emailNotifications: false,
      });
    });
  });

  describe("PUT /notifications/settings", () => {
    it("should update notification settings", async () => {
      const newSettings = {
        budgetAlerts: false,
        familyActivity: true,
        systemMessages: false,
        emailNotifications: true,
      };

      mockDynamoDB.update.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Attributes: {
            userId: "user-123",
            settingType: "notifications",
            settings: newSettings,
          },
        }),
      });

      const event = {
        httpMethod: "PUT",
        path: "/notifications/settings",
        body: JSON.stringify(newSettings),
        requestContext: {
          authorizer: {
            claims: { sub: "user-123" },
          },
        },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual(newSettings);
      expect(mockDynamoDB.update).toHaveBeenCalledWith(
        expect.objectContaining({
          UpdateExpression: "SET settings = :settings, updatedAt = :updatedAt",
        }),
      );
    });
  });

  describe("POST /notifications/create (Internal)", () => {
    it("should create a new notification", async () => {
      mockDynamoDB.put.mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      });

      const notificationData = {
        userId: "user-123",
        type: "budget_alert",
        title: "Budget Alert",
        message: "Test message",
        metadata: { categoryId: "cat-123" },
      };

      const event = {
        httpMethod: "POST",
        path: "/notifications/create",
        body: JSON.stringify(notificationData),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body).toMatchObject({
        userId: "user-123",
        type: "budget_alert",
        title: "Budget Alert",
        message: "Test message",
        isRead: false,
      });
      expect(body.notificationId).toMatch(/^notif_/);
      expect(mockDynamoDB.put).toHaveBeenCalled();
    });

    it("should return 400 for missing required fields", async () => {
      const event = {
        httpMethod: "POST",
        path: "/notifications/create",
        body: JSON.stringify({
          userId: "user-123",
          // Missing type, title, message
        }),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "Missing required fields",
      });
    });
  });

  describe("Error Handling", () => {
    it("should return 500 for internal errors", async () => {
      mockDynamoDB.query.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error("Database error")),
      });

      const event = {
        httpMethod: "GET",
        path: "/notifications",
        requestContext: {
          authorizer: {
            claims: { sub: "user-123" },
          },
        },
        queryStringParameters: {},
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        error: "Internal server error",
        message: "Database error",
      });
    });

    it("should return 404 for unknown routes", async () => {
      const event = {
        httpMethod: "GET",
        path: "/notifications/unknown",
        requestContext: {
          authorizer: {
            claims: { sub: "user-123" },
          },
        },
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({ error: "Not found" });
    });
  });
});
