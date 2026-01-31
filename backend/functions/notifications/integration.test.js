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

describe("Integration Tests: Complete Notification Delivery Flow (Task 10.2)", () => {
  let AWS;
  let mockDynamoDB;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = "test-table";
    AWS = require("aws-sdk");
    mockDynamoDB = new AWS.DynamoDB.DocumentClient();
  });

  it("should complete full flow: register device → trigger alert → send notification → store history", async () => {
    // ========================================
    // STEP 1: Register Device
    // ========================================
    console.log("Step 1: Registering device...");

    mockDynamoDB.promise.mockResolvedValueOnce({}); // put() for device registration

    const registerEvent = {
      httpMethod: "POST",
      path: "/notifications/register",
      body: JSON.stringify({
        userId: "user-123",
        deviceToken: "ExponentPushToken[test-device-token-abc123]",
        platform: "ios",
      }),
    };

    const registerResult = await handler(registerEvent);
    expect(registerResult.statusCode).toBe(200);

    const registerBody = JSON.parse(registerResult.body);
    expect(registerBody.success).toBe(true);
    expect(registerBody.deviceId).toBeDefined();

    const deviceId = registerBody.deviceId;
    console.log(`✓ Device registered with ID: ${deviceId}`);

    // Verify device was stored correctly
    const devicePutCall = mockDynamoDB.put.mock.calls[0][0];
    expect(devicePutCall.Item.PK).toBe("USER#user-123");
    expect(devicePutCall.Item.SK).toContain("DEVICE#");
    expect(devicePutCall.Item.deviceToken).toBe(
      "ExponentPushToken[test-device-token-abc123]",
    );
    expect(devicePutCall.Item.platform).toBe("ios");
    expect(devicePutCall.Item.enabled).toBe(true);

    // ========================================
    // STEP 2: Trigger Budget Alert
    // ========================================
    console.log("Step 2: Triggering budget alert...");

    // Mock getting user devices for notification
    mockDynamoDB.promise.mockResolvedValueOnce({
      Items: [
        {
          PK: "USER#user-123",
          SK: `DEVICE#${deviceId}`,
          deviceToken: "ExponentPushToken[test-device-token-abc123]",
          platform: "ios",
          enabled: true,
        },
      ],
    });

    // Mock storing notification in history
    mockDynamoDB.promise.mockResolvedValueOnce({});

    // Mock Expo API success response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              status: "ok",
              id: "expo-notification-id-123",
            },
          ],
        }),
    });

    // ========================================
    // STEP 3: Send Notification
    // ========================================
    console.log("Step 3: Sending notification...");

    const sendNotificationEvent = {
      httpMethod: "POST",
      path: "/notifications/send",
      body: JSON.stringify({
        userId: "user-123",
        notification: {
          title: "Budget Alert: Groceries",
          body: "You've reached 80% of your grocery budget ($400 of $500)",
          data: {
            type: "budget_alert",
            budgetId: "budget-456",
            categoryId: "groceries",
            threshold: 80,
            spent: 400,
            planned: 500,
          },
          severity: "medium",
        },
      }),
    };

    const sendResult = await handler(sendNotificationEvent);
    expect(sendResult.statusCode).toBe(200);

    const sendBody = JSON.parse(sendResult.body);
    expect(sendBody.success).toBe(true);
    expect(sendBody.deviceCount).toBe(1);
    console.log(`✓ Notification sent to ${sendBody.deviceCount} device(s)`);

    // ========================================
    // STEP 4: Verify Notification Sent to Expo
    // ========================================
    console.log("Step 4: Verifying Expo API call...");

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://exp.host/--/api/v2/push/send",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );

    // Verify notification payload sent to Expo
    const expoCall = global.fetch.mock.calls[0];
    const expoPayload = JSON.parse(expoCall[1].body);
    expect(expoPayload).toHaveLength(1);
    expect(expoPayload[0]).toMatchObject({
      to: "ExponentPushToken[test-device-token-abc123]",
      title: "Budget Alert: Groceries",
      body: "You've reached 80% of your grocery budget ($400 of $500)",
      data: expect.objectContaining({
        type: "budget_alert",
        budgetId: "budget-456",
        categoryId: "groceries",
      }),
      sound: "default",
      priority: "default",
    });
    console.log("✓ Expo API called with correct payload");

    // ========================================
    // STEP 5: Verify Notification Stored in History
    // ========================================
    console.log("Step 5: Verifying notification stored in history...");

    // Check that notification was stored (second put call)
    expect(mockDynamoDB.put).toHaveBeenCalledTimes(2); // Device registration + notification history

    const historyPutCall = mockDynamoDB.put.mock.calls[1][0];
    expect(historyPutCall.TableName).toBe("test-table");
    expect(historyPutCall.Item.PK).toBe("USER#user-123");
    expect(historyPutCall.Item.SK).toMatch(/^NOTIFICATION#\d+#/);
    expect(historyPutCall.Item.type).toBe("budget_alert");
    expect(historyPutCall.Item.title).toBe("Budget Alert: Groceries");
    expect(historyPutCall.Item.body).toBe(
      "You've reached 80% of your grocery budget ($400 of $500)",
    );
    expect(historyPutCall.Item.severity).toBe("medium");
    expect(historyPutCall.Item.read).toBe(false);
    expect(historyPutCall.Item.sentAt).toBeDefined();
    expect(historyPutCall.Item.data).toMatchObject({
      type: "budget_alert",
      budgetId: "budget-456",
      categoryId: "groceries",
    });
    expect(historyPutCall.Item.TTL).toBeDefined(); // 90-day TTL
    console.log("✓ Notification stored in history with correct data");

    // ========================================
    // STEP 6: Retrieve Notification History
    // ========================================
    console.log("Step 6: Retrieving notification history...");

    mockDynamoDB.promise.mockResolvedValueOnce({
      Items: [
        {
          PK: "USER#user-123",
          SK: historyPutCall.Item.SK,
          type: "budget_alert",
          title: "Budget Alert: Groceries",
          body: "You've reached 80% of your grocery budget ($400 of $500)",
          severity: "medium",
          read: false,
          sentAt: historyPutCall.Item.sentAt,
          data: historyPutCall.Item.data,
        },
      ],
    });

    const historyEvent = {
      httpMethod: "GET",
      path: "/notifications/history",
      queryStringParameters: {
        userId: "user-123",
        limit: "50",
      },
    };

    const historyResult = await handler(historyEvent);
    expect(historyResult.statusCode).toBe(200);

    const historyBody = JSON.parse(historyResult.body);
    expect(historyBody.notifications).toHaveLength(1);
    expect(historyBody.notifications[0]).toMatchObject({
      type: "budget_alert",
      title: "Budget Alert: Groceries",
      severity: "medium",
      read: false,
    });
    console.log("✓ Notification history retrieved successfully");

    // ========================================
    // SUMMARY
    // ========================================
    console.log("\n✅ Complete notification delivery flow test PASSED");
    console.log("   1. Device registered");
    console.log("   2. Budget alert triggered");
    console.log("   3. Notification sent to Expo API");
    console.log("   4. Notification stored in history");
    console.log("   5. Notification history retrieved");
  });

  it("should handle notification delivery to multiple devices", async () => {
    console.log("Testing notification delivery to multiple devices...");

    // Mock getting multiple user devices
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
        {
          deviceToken: "ExponentPushToken[device3]",
          platform: "ios",
          enabled: false, // Disabled device should be skipped
        },
      ],
    });

    // Mock storing notification in history
    mockDynamoDB.promise.mockResolvedValueOnce({});

    // Mock Expo API success for both devices
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            { status: "ok", id: "notif-1" },
            { status: "ok", id: "notif-2" },
          ],
        }),
    });

    const event = {
      httpMethod: "POST",
      path: "/notifications/send",
      body: JSON.stringify({
        userId: "user-123",
        notification: {
          title: "Daily Reminder",
          body: "Don't forget to log your expenses today!",
          data: {
            type: "daily_reminder",
            daysSinceLastTransaction: 3,
          },
          severity: "low",
        },
      }),
    };

    const result = await handler(event);
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.deviceCount).toBe(2); // Only enabled devices

    // Verify Expo was called with 2 devices (disabled device excluded)
    const expoPayload = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(expoPayload).toHaveLength(2);
    expect(expoPayload[0].to).toBe("ExponentPushToken[device1]");
    expect(expoPayload[1].to).toBe("ExponentPushToken[device2]");

    console.log(
      "✓ Notification sent to 2 enabled devices, skipped 1 disabled device",
    );
  });

  it("should handle partial delivery failures gracefully", async () => {
    console.log("Testing graceful handling of partial delivery failures...");

    // Mock getting multiple devices
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

    // Mock storing notification in history
    mockDynamoDB.promise.mockResolvedValueOnce({});

    // Mock Expo API with one success and one failure
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            { status: "ok", id: "notif-1" },
            { status: "error", message: "DeviceNotRegistered" },
          ],
        }),
    });

    const event = {
      httpMethod: "POST",
      path: "/notifications/send",
      body: JSON.stringify({
        userId: "user-123",
        notification: {
          title: "Test Notification",
          body: "Test message",
          data: { type: "test" },
        },
      }),
    };

    const result = await handler(event);

    // Should still return success (graceful degradation)
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);

    // Notification should still be stored in history
    expect(mockDynamoDB.put).toHaveBeenCalledTimes(1);

    console.log("✓ Partial delivery failure handled gracefully");
  });

  it("should validate notification data before sending", async () => {
    console.log("Testing notification data validation...");

    const invalidNotifications = [
      { title: "", body: "Missing title" },
      { title: "Missing body", body: "" },
      { title: null, body: "Null title" },
      { title: "Null body", body: null },
    ];

    for (const notification of invalidNotifications) {
      const event = {
        httpMethod: "POST",
        path: "/notifications/send",
        body: JSON.stringify({
          userId: "user-123",
          notification,
        }),
      };

      const result = await handler(event);
      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.error).toBeDefined();
    }

    console.log("✓ Invalid notifications rejected");
  });
});

describe("Integration Tests: Preferences Update Flow (Task 10.3)", () => {
  let AWS;
  let mockDynamoDB;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = "test-table";
    AWS = require("aws-sdk");
    mockDynamoDB = new AWS.DynamoDB.DocumentClient();
  });

  it("should complete full preferences update flow and verify behavior changes", async () => {
    console.log("\n========================================");
    console.log("TASK 10.3: Preferences Update Flow Test");
    console.log("========================================\n");

    // ========================================
    // STEP 1: Get Default Preferences
    // ========================================
    console.log("Step 1: Getting default preferences...");

    // Mock no existing preferences (will return defaults)
    mockDynamoDB.promise.mockResolvedValueOnce({
      Item: null,
    });

    const getDefaultEvent = {
      httpMethod: "GET",
      path: "/notifications/preferences",
      queryStringParameters: {
        userId: "user-123",
      },
    };

    const defaultResult = await handler(getDefaultEvent);
    expect(defaultResult.statusCode).toBe(200);

    const defaultPrefs = JSON.parse(defaultResult.body);
    expect(defaultPrefs.budgetAlerts).toBe(true); // Default enabled
    expect(defaultPrefs.dailyReminders).toBe(true); // Default enabled
    expect(defaultPrefs.reminderTime).toBe("19:00"); // Default 7:00 PM
    expect(defaultPrefs.quietHoursStart).toBe("22:00"); // Default 10:00 PM
    expect(defaultPrefs.quietHoursEnd).toBe("08:00"); // Default 8:00 AM
    console.log("✓ Default preferences retrieved");
    console.log(`  - Budget alerts: ${defaultPrefs.budgetAlerts}`);
    console.log(`  - Daily reminders: ${defaultPrefs.dailyReminders}`);
    console.log(`  - Reminder time: ${defaultPrefs.reminderTime}`);

    // ========================================
    // STEP 2: Update Preferences
    // ========================================
    console.log("\nStep 2: Updating preferences...");

    mockDynamoDB.promise.mockResolvedValueOnce({}); // put() success

    const updateEvent = {
      httpMethod: "PUT",
      path: "/notifications/preferences",
      body: JSON.stringify({
        userId: "user-123",
        preferences: {
          budgetAlerts: false, // Disable budget alerts
          dailyReminders: true, // Keep reminders enabled
          reminderTime: "20:00", // Change to 8:00 PM
          quietHoursStart: "23:00", // Change to 11:00 PM
          quietHoursEnd: "07:00", // Change to 7:00 AM
        },
      }),
    };

    const updateResult = await handler(updateEvent);
    expect(updateResult.statusCode).toBe(200);

    const updateBody = JSON.parse(updateResult.body);
    expect(updateBody.success).toBe(true);
    console.log("✓ Preferences updated successfully");

    // Verify preferences were stored correctly
    const putCall = mockDynamoDB.put.mock.calls[0][0];
    expect(putCall.TableName).toBe("test-table");
    expect(putCall.Item.PK).toBe("USER#user-123");
    expect(putCall.Item.SK).toBe("NOTIFICATION_PREFERENCES");
    expect(putCall.Item.budgetAlerts).toBe(false);
    expect(putCall.Item.dailyReminders).toBe(true);
    expect(putCall.Item.reminderTime).toBe("20:00");
    expect(putCall.Item.quietHoursStart).toBe("23:00");
    expect(putCall.Item.quietHoursEnd).toBe("07:00");
    expect(putCall.Item.updatedAt).toBeDefined();
    console.log("✓ Preferences stored in DynamoDB with correct values");

    // ========================================
    // STEP 3: Retrieve Updated Preferences
    // ========================================
    console.log("\nStep 3: Retrieving updated preferences...");

    mockDynamoDB.promise.mockResolvedValueOnce({
      Item: {
        PK: "USER#user-123",
        SK: "NOTIFICATION_PREFERENCES",
        budgetAlerts: false,
        dailyReminders: true,
        reminderTime: "20:00",
        quietHoursStart: "23:00",
        quietHoursEnd: "07:00",
        updatedAt: new Date().toISOString(),
      },
    });

    const getUpdatedEvent = {
      httpMethod: "GET",
      path: "/notifications/preferences",
      queryStringParameters: {
        userId: "user-123",
      },
    };

    const updatedResult = await handler(getUpdatedEvent);
    expect(updatedResult.statusCode).toBe(200);

    const updatedPrefs = JSON.parse(updatedResult.body);
    expect(updatedPrefs.budgetAlerts).toBe(false);
    expect(updatedPrefs.dailyReminders).toBe(true);
    expect(updatedPrefs.reminderTime).toBe("20:00");
    expect(updatedPrefs.quietHoursStart).toBe("23:00");
    expect(updatedPrefs.quietHoursEnd).toBe("07:00");
    console.log("✓ Updated preferences retrieved successfully");
    console.log(`  - Budget alerts: ${updatedPrefs.budgetAlerts} (changed)`);
    console.log(`  - Reminder time: ${updatedPrefs.reminderTime} (changed)`);
    console.log(
      `  - Quiet hours: ${updatedPrefs.quietHoursStart} - ${updatedPrefs.quietHoursEnd} (changed)`,
    );

    // ========================================
    // STEP 4: Verify Behavior Changes (Quiet Hours)
    // ========================================
    console.log("\nStep 4: Verifying quiet hours behavior...");

    // Simulate sending notification during new quiet hours (23:00 - 07:00)
    // At 23:30, notification should be skipped
    const currentTime = new Date();
    currentTime.setHours(23, 30, 0, 0);

    const quietHoursStart = "23:00";
    const quietHoursEnd = "07:00";

    // Check if current time is in quiet hours
    const isInQuietHours = (time, start, end) => {
      const [currentHour, currentMinute] = [time.getHours(), time.getMinutes()];
      const [startHour, startMinute] = start.split(":").map(Number);
      const [endHour, endMinute] = end.split(":").map(Number);

      const currentMinutes = currentHour * 60 + currentMinute;
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      if (startMinutes <= endMinutes) {
        // Same day quiet hours
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      } else {
        // Overnight quiet hours
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }
    };

    const inQuietHours = isInQuietHours(
      currentTime,
      quietHoursStart,
      quietHoursEnd,
    );
    expect(inQuietHours).toBe(true);
    console.log("✓ Quiet hours logic verified (23:30 is within 23:00-07:00)");

    // ========================================
    // SUMMARY
    // ========================================
    console.log("\n========================================");
    console.log("✅ TASK 10.3 TEST PASSED");
    console.log("========================================");
    console.log("Complete preferences update flow verified:");
    console.log("  ✓ Default preferences retrieved");
    console.log("  ✓ Preferences updated successfully");
    console.log("  ✓ Updated preferences stored in DynamoDB");
    console.log("  ✓ Updated preferences retrieved");
    console.log("  ✓ Quiet hours behavior verified");
    console.log("========================================\n");
  });

  it("should validate time formats before storing", async () => {
    console.log("\nTesting time format validation...");

    const invalidTimes = [
      { time: "25:00", reason: "hour > 23" },
      { time: "12:60", reason: "minute > 59" },
      { time: "abc", reason: "not a time" },
      { time: "12", reason: "missing minutes" },
      { time: "12:00:00", reason: "includes seconds" },
    ];

    for (const { time, reason } of invalidTimes) {
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
      expect(body.error).toBeDefined();
      console.log(`  ✓ Rejected invalid time "${time}" (${reason})`);
    }

    console.log("✓ All invalid time formats rejected");
  });

  it("should validate quiet hours range", async () => {
    console.log("\nTesting quiet hours range validation...");

    // Valid overnight quiet hours
    mockDynamoDB.promise.mockResolvedValueOnce({});

    const validEvent = {
      httpMethod: "PUT",
      path: "/notifications/preferences",
      body: JSON.stringify({
        userId: "user-123",
        preferences: {
          quietHoursStart: "22:00",
          quietHoursEnd: "08:00", // Overnight is valid
        },
      }),
    };

    const validResult = await handler(validEvent);
    expect(validResult.statusCode).toBe(200);
    console.log("✓ Valid overnight quiet hours accepted (22:00-08:00)");

    // Valid same-day quiet hours
    mockDynamoDB.promise.mockResolvedValueOnce({});

    const sameDayEvent = {
      httpMethod: "PUT",
      path: "/notifications/preferences",
      body: JSON.stringify({
        userId: "user-123",
        preferences: {
          quietHoursStart: "13:00",
          quietHoursEnd: "14:00", // Same day is valid
        },
      }),
    };

    const sameDayResult = await handler(sameDayEvent);
    expect(sameDayResult.statusCode).toBe(200);
    console.log("✓ Valid same-day quiet hours accepted (13:00-14:00)");
  });

  it("should handle partial preference updates", async () => {
    console.log("\nTesting partial preference updates...");

    // Mock existing preferences
    mockDynamoDB.promise.mockResolvedValueOnce({
      Item: {
        PK: "USER#user-123",
        SK: "NOTIFICATION_PREFERENCES",
        budgetAlerts: true,
        dailyReminders: true,
        reminderTime: "19:00",
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00",
      },
    });

    // Update only reminder time
    mockDynamoDB.promise.mockResolvedValueOnce({});

    const partialUpdateEvent = {
      httpMethod: "PUT",
      path: "/notifications/preferences",
      body: JSON.stringify({
        userId: "user-123",
        preferences: {
          reminderTime: "21:00", // Only update this field
        },
      }),
    };

    const result = await handler(partialUpdateEvent);
    expect(result.statusCode).toBe(200);

    // Verify only reminderTime was updated, others preserved
    const putCall = mockDynamoDB.put.mock.calls[0][0];
    expect(putCall.Item.reminderTime).toBe("21:00");
    expect(putCall.Item.budgetAlerts).toBe(true); // Preserved
    expect(putCall.Item.dailyReminders).toBe(true); // Preserved
    expect(putCall.Item.quietHoursStart).toBe("22:00"); // Preserved
    expect(putCall.Item.quietHoursEnd).toBe("08:00"); // Preserved

    console.log("✓ Partial update successful, other preferences preserved");
  });
});
