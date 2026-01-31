/**
 * Integration Tests for Notification Service
 *
 * These tests verify the complete flow of device registration,
 * notification delivery, and history tracking.
 *
 * NOTE: These tests use mocked AWS services to avoid costs.
 * For real AWS integration testing, run manually in dev environment.
 */

const { handler } = require("./index");

// Mock AWS SDK for integration tests
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

describe("Integration Tests: Device Registration Flow", () => {
  let AWS;
  let mockDynamoDB;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = "test-table";
    AWS = require("aws-sdk");
    mockDynamoDB = new AWS.DynamoDB.DocumentClient();
  });

  describe("Complete Device Registration Flow", () => {
    it("should register device, verify storage, and return device ID", async () => {
      // Step 1: Register device
      mockDynamoDB.promise.mockResolvedValueOnce({}); // put() success

      const registerEvent = {
        httpMethod: "POST",
        path: "/notifications/register",
        body: JSON.stringify({
          userId: "user-123",
          deviceToken: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
          platform: "ios",
        }),
      };

      const registerResult = await handler(registerEvent);

      expect(registerResult.statusCode).toBe(200);
      expect(mockDynamoDB.put).toHaveBeenCalledTimes(1);

      const registerBody = JSON.parse(registerResult.body);
      expect(registerBody.success).toBe(true);
      expect(registerBody.deviceId).toBeDefined();

      // Verify the data structure stored in DynamoDB
      const putCall = mockDynamoDB.put.mock.calls[0][0];
      expect(putCall.TableName).toBe("test-table");
      expect(putCall.Item.PK).toBe("USER#user-123");
      expect(putCall.Item.SK).toContain("DEVICE#");
      expect(putCall.Item.deviceToken).toBe(
        "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
      );
      expect(putCall.Item.platform).toBe("ios");
      expect(putCall.Item.enabled).toBe(true);
      expect(putCall.Item.createdAt).toBeDefined();
    });

    it("should handle multiple devices per user", async () => {
      // Register first device
      mockDynamoDB.promise.mockResolvedValueOnce({});

      const device1Event = {
        httpMethod: "POST",
        path: "/notifications/register",
        body: JSON.stringify({
          userId: "user-123",
          deviceToken: "ExponentPushToken[device1]",
          platform: "ios",
        }),
      };

      const result1 = await handler(device1Event);
      expect(result1.statusCode).toBe(200);

      // Register second device
      mockDynamoDB.promise.mockResolvedValueOnce({});

      const device2Event = {
        httpMethod: "POST",
        path: "/notifications/register",
        body: JSON.stringify({
          userId: "user-123",
          deviceToken: "ExponentPushToken[device2]",
          platform: "android",
        }),
      };

      const result2 = await handler(device2Event);
      expect(result2.statusCode).toBe(200);

      // Verify both devices were stored
      expect(mockDynamoDB.put).toHaveBeenCalledTimes(2);

      const device1Body = JSON.parse(result1.body);
      const device2Body = JSON.parse(result2.body);

      expect(device1Body.deviceId).not.toBe(device2Body.deviceId);
    });

    it("should enforce device limit (max 10 per user)", async () => {
      // Mock query to return 10 existing devices
      mockDynamoDB.promise.mockResolvedValueOnce({
        Items: Array.from({ length: 10 }, (_, i) => ({
          PK: "USER#user-123",
          SK: `DEVICE#device-${i}`,
          deviceToken: `ExponentPushToken[device${i}]`,
        })),
      });

      const event = {
        httpMethod: "POST",
        path: "/notifications/register",
        body: JSON.stringify({
          userId: "user-123",
          deviceToken: "ExponentPushToken[device11]",
          platform: "ios",
        }),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain("Maximum");
    });

    it("should validate Expo push token format", async () => {
      const invalidTokens = [
        "invalid-token",
        "ExponentPushToken",
        "ExponentPushToken[]",
        "",
        null,
      ];

      for (const token of invalidTokens) {
        const event = {
          httpMethod: "POST",
          path: "/notifications/register",
          body: JSON.stringify({
            userId: "user-123",
            deviceToken: token,
            platform: "ios",
          }),
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.error).toContain("Invalid");
      }
    });
  });

  describe("Device Removal Flow", () => {
    it("should remove device and verify deletion", async () => {
      // Mock successful deletion
      mockDynamoDB.promise.mockResolvedValueOnce({});

      const event = {
        httpMethod: "DELETE",
        path: "/notifications/device/device-123",
        body: JSON.stringify({
          userId: "user-123",
        }),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockDynamoDB.delete).toHaveBeenCalledTimes(1);

      const deleteCall = mockDynamoDB.delete.mock.calls[0][0];
      expect(deleteCall.TableName).toBe("test-table");
      expect(deleteCall.Key.PK).toBe("USER#user-123");
      expect(deleteCall.Key.SK).toBe("DEVICE#device-123");
    });

    it("should handle removal of non-existent device", async () => {
      // Mock deletion (DynamoDB doesn't error on non-existent items)
      mockDynamoDB.promise.mockResolvedValueOnce({});

      const event = {
        httpMethod: "DELETE",
        path: "/notifications/device/non-existent",
        body: JSON.stringify({
          userId: "user-123",
        }),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
    });
  });
});

describe("Integration Tests: Notification Delivery Flow", () => {
  let AWS;
  let mockDynamoDB;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = "test-table";
    AWS = require("aws-sdk");
    mockDynamoDB = new AWS.DynamoDB.DocumentClient();
  });

  describe("Complete Notification Delivery Flow", () => {
    it("should send notification to all registered devices and store in history", async () => {
      // Step 1: Mock getUserDeviceTokens
      mockDynamoDB.promise.mockResolvedValueOnce({
        Items: [
          {
            deviceToken: "ExponentPushToken[device1]",
            platform: "ios",
            enabled: true,
          },
          {
            deviceToken: "ExponentPushToken[device2]",
            platform: "android",
            enabled: true,
          },
        ],
      });

      // Step 2: Mock storing notification in history
      mockDynamoDB.promise.mockResolvedValueOnce({});

      // Step 3: Mock Expo API response
      global.fetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            data: [{ status: "ok" }, { status: "ok" }],
          }),
      });

      const event = {
        httpMethod: "POST",
        path: "/notifications/send",
        body: JSON.stringify({
          userId: "user-123",
          notification: {
            title: "Budget Alert",
            body: "You've reached 80% of your grocery budget",
            data: {
              type: "budget_alert",
              budgetId: "budget-123",
              categoryId: "groceries",
            },
          },
        }),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);

      // Verify Expo API was called
      expect(global.fetch).toHaveBeenCalledWith(
        "https://exp.host/--/api/v2/push/send",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );

      // Verify notification was stored in history
      expect(mockDynamoDB.put).toHaveBeenCalledTimes(1);
      const historyCall = mockDynamoDB.put.mock.calls[0][0];
      expect(historyCall.Item.PK).toBe("USER#user-123");
      expect(historyCall.Item.SK).toContain("NOTIFICATION#");
      expect(historyCall.Item.title).toBe("Budget Alert");
      expect(historyCall.Item.read).toBe(false);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.deviceCount).toBe(2);
    });

    it("should handle disabled devices", async () => {
      // Mock devices with one disabled
      mockDynamoDB.promise.mockResolvedValueOnce({
        Items: [
          {
            deviceToken: "ExponentPushToken[device1]",
            platform: "ios",
            enabled: true,
          },
          {
            deviceToken: "ExponentPushToken[device2]",
            platform: "android",
            enabled: false, // Disabled
          },
        ],
      });

      mockDynamoDB.promise.mockResolvedValueOnce({});

      global.fetch.mockResolvedValue({
        json: () => Promise.resolve({ data: [{ status: "ok" }] }),
      });

      const event = {
        httpMethod: "POST",
        path: "/notifications/send",
        body: JSON.stringify({
          userId: "user-123",
          notification: {
            title: "Test",
            body: "Test message",
          },
        }),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);

      // Should only send to 1 device (the enabled one)
      const fetchCall = global.fetch.mock.calls[0][1];
      const requestBody = JSON.parse(fetchCall.body);
      expect(requestBody).toHaveLength(1);
    });

    it("should handle Expo API errors gracefully", async () => {
      mockDynamoDB.promise.mockResolvedValueOnce({
        Items: [
          {
            deviceToken: "ExponentPushToken[device1]",
            platform: "ios",
            enabled: true,
          },
        ],
      });

      mockDynamoDB.promise.mockResolvedValueOnce({});

      // Mock Expo API error
      global.fetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            data: [{ status: "error", message: "DeviceNotRegistered" }],
          }),
      });

      const event = {
        httpMethod: "POST",
        path: "/notifications/send",
        body: JSON.stringify({
          userId: "user-123",
          notification: {
            title: "Test",
            body: "Test message",
          },
        }),
      };

      const result = await handler(event);

      // Should still return 200 (graceful degradation)
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });
  });
});

describe("Integration Tests: Preferences Update Flow", () => {
  let AWS;
  let mockDynamoDB;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = "test-table";
    AWS = require("aws-sdk");
    mockDynamoDB = new AWS.DynamoDB.DocumentClient();
  });

  it("should update preferences and verify storage", async () => {
    mockDynamoDB.promise.mockResolvedValueOnce({});

    const event = {
      httpMethod: "PUT",
      path: "/notifications/preferences",
      body: JSON.stringify({
        userId: "user-123",
        preferences: {
          budgetAlerts: false,
          dailyReminders: true,
          reminderTime: "20:00",
          quietHoursStart: "22:00",
          quietHoursEnd: "08:00",
        },
      }),
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockDynamoDB.put).toHaveBeenCalledTimes(1);

    const putCall = mockDynamoDB.put.mock.calls[0][0];
    expect(putCall.Item.PK).toBe("USER#user-123");
    expect(putCall.Item.SK).toBe("PREFERENCES");
    expect(putCall.Item.budgetAlerts).toBe(false);
    expect(putCall.Item.dailyReminders).toBe(true);
    expect(putCall.Item.reminderTime).toBe("20:00");
  });

  it("should validate time formats", async () => {
    const invalidTimes = ["25:00", "12:60", "abc", "12", "12:00:00"];

    for (const time of invalidTimes) {
      const event = {
        httpMethod: "PUT",
        path: "/notifications/preferences",
        body: JSON.stringify({
          userId: "user-123",
          preferences: {
            reminderTime: time,
          },
        }),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain("Invalid");
    }
  });
});

describe("Integration Tests: Notification History Flow", () => {
  let AWS;
  let mockDynamoDB;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = "test-table";
    AWS = require("aws-sdk");
    mockDynamoDB = new AWS.DynamoDB.DocumentClient();
  });

  it("should retrieve notification history with pagination", async () => {
    const mockNotifications = Array.from({ length: 50 }, (_, i) => ({
      PK: "USER#user-123",
      SK: `NOTIFICATION#${Date.now() - i * 1000}`,
      title: `Notification ${i}`,
      body: `Message ${i}`,
      read: i % 2 === 0,
      sentAt: Date.now() - i * 1000,
    }));

    mockDynamoDB.promise.mockResolvedValueOnce({
      Items: mockNotifications,
      LastEvaluatedKey: {
        PK: "USER#user-123",
        SK: `NOTIFICATION#${Date.now() - 49 * 1000}`,
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
    expect(mockDynamoDB.query).toHaveBeenCalledTimes(1);

    const body = JSON.parse(result.body);
    expect(body.notifications).toHaveLength(50);
    expect(body.lastEvaluatedKey).toBeDefined();
  });

  it("should mark notification as read and verify update", async () => {
    mockDynamoDB.promise.mockResolvedValueOnce({});

    const event = {
      httpMethod: "PUT",
      path: "/notifications/1234567890/read",
      body: JSON.stringify({
        userId: "user-123",
      }),
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockDynamoDB.update).toHaveBeenCalledTimes(1);

    const updateCall = mockDynamoDB.update.mock.calls[0][0];
    expect(updateCall.Key.PK).toBe("USER#user-123");
    expect(updateCall.Key.SK).toBe("NOTIFICATION#1234567890");
    expect(updateCall.UpdateExpression).toContain("read");
  });
});
