/**
 * End-to-End Test: Pattern Detection Notification Flow
 *
 * Tests the complete notification workflow for pattern detection:
 * 1. Trigger pattern detection
 * 2. Verify notifications sent
 * 3. Test notification actions
 *
 * Requirements: 4.1, 4.2
 */

const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

// Configure AWS SDK for local testing
AWS.config.update({
  region: process.env.AWS_REGION || "us-east-1",
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda();

const TRANSACTIONS_TABLE =
  process.env.TRANSACTIONS_TABLE || "budgetbuddy-dev-transactions";
const NOTIFICATIONS_TABLE =
  process.env.NOTIFICATIONS_TABLE || "budgetbuddy-dev-notifications";
const PATTERNS_TABLE = process.env.PATTERNS_TABLE || "budgetbuddy-dev-patterns";

describe("Pattern Detection Notification Flow - End-to-End", () => {
  let testFamilyId;
  let testUserId;
  let testTransactionIds;
  let testNotificationIds;

  beforeAll(() => {
    testFamilyId = `test-family-${uuidv4()}`;
    testUserId = `test-user-${uuidv4()}`;
    testTransactionIds = [];
    testNotificationIds = [];
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  /**
   * Step 1: Create test transactions and trigger pattern detection
   */
  describe("Step 1: Trigger Pattern Detection", () => {
    it("should create recurring transactions", async () => {
      const baseDate = new Date("2025-01-10");
      const transactions = [];

      // Create 5 months of Spotify transactions
      for (let i = 0; i < 5; i++) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + i);

        const transaction = {
          PK: `FAMILY#${testFamilyId}`,
          SK: `TRANSACTION#${uuidv4()}`,
          transactionId: uuidv4(),
          familyId: testFamilyId,
          userId: testUserId,
          date: date.toISOString().split("T")[0],
          amount: 9.99,
          merchant: "Spotify",
          category: "Entertainment",
          description: "Spotify Premium",
          type: "expense",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await dynamodb
          .put({
            TableName: TRANSACTIONS_TABLE,
            Item: transaction,
          })
          .promise();

        transactions.push(transaction);
        testTransactionIds.push(transaction.transactionId);
      }

      expect(transactions).toHaveLength(5);
    });

    it("should trigger pattern detection and generate notifications", async () => {
      const payload = {
        httpMethod: "POST",
        path: "/api/patterns/detect",
        headers: {
          Authorization: `Bearer test-token-${testUserId}`,
        },
        body: JSON.stringify({
          familyId: testFamilyId,
          startDate: "2025-01-01",
          endDate: "2025-06-30",
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: testUserId,
              "custom:familyId": testFamilyId,
            },
          },
        },
      };

      const response = await lambda
        .invoke({
          FunctionName:
            process.env.PATTERN_DETECTION_FUNCTION ||
            "budgetbuddy-dev-pattern-detection",
          Payload: JSON.stringify(payload),
        })
        .promise();

      const result = JSON.parse(response.Payload);
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.patterns).toBeDefined();
      expect(body.patterns.length).toBeGreaterThanOrEqual(1);
    }, 30000);
  });

  /**
   * Step 2: Verify notifications sent
   */
  describe("Step 2: Verify Notifications Sent", () => {
    it("should create PATTERN_DETECTED notification", async () => {
      // Wait for notification creation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Query notifications table
      const result = await dynamodb
        .query({
          TableName: NOTIFICATIONS_TABLE,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": `USER#${testUserId}`,
            ":sk": "NOTIFICATION#",
          },
        })
        .promise();

      expect(result.Items.length).toBeGreaterThanOrEqual(1);

      // Find pattern detected notification
      const patternNotification = result.Items.find(
        (n) => n.type === "PATTERN_DETECTED",
      );
      expect(patternNotification).toBeDefined();

      testNotificationIds.push(patternNotification.notificationId);

      // Verify notification structure
      expect(patternNotification).toHaveProperty("notificationId");
      expect(patternNotification).toHaveProperty("userId", testUserId);
      expect(patternNotification).toHaveProperty("type", "PATTERN_DETECTED");
      expect(patternNotification).toHaveProperty("title");
      expect(patternNotification).toHaveProperty("message");
      expect(patternNotification).toHaveProperty("data");
      expect(patternNotification).toHaveProperty("read", false);
      expect(patternNotification).toHaveProperty("createdAt");

      // Verify notification data includes pattern info
      expect(patternNotification.data).toHaveProperty("patternId");
      expect(patternNotification.data).toHaveProperty("merchant");
      expect(patternNotification.data).toHaveProperty("frequency");
      expect(patternNotification.data).toHaveProperty("averageAmount");
    });

    it("should include actionable options in notification", async () => {
      const result = await dynamodb
        .query({
          TableName: NOTIFICATIONS_TABLE,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": `USER#${testUserId}`,
            ":sk": "NOTIFICATION#",
          },
        })
        .promise();

      const patternNotification = result.Items.find(
        (n) => n.type === "PATTERN_DETECTED",
      );
      expect(patternNotification).toBeDefined();

      // Verify actionable options
      expect(patternNotification).toHaveProperty("actions");
      expect(Array.isArray(patternNotification.actions)).toBe(true);
      expect(patternNotification.actions.length).toBeGreaterThanOrEqual(2);

      // Should have approve and reject actions
      const approveAction = patternNotification.actions.find(
        (a) => a.type === "approve",
      );
      const rejectAction = patternNotification.actions.find(
        (a) => a.type === "reject",
      );

      expect(approveAction).toBeDefined();
      expect(approveAction).toHaveProperty("label");
      expect(approveAction).toHaveProperty("endpoint");

      expect(rejectAction).toBeDefined();
      expect(rejectAction).toHaveProperty("label");
      expect(rejectAction).toHaveProperty("endpoint");
    });

    it("should not create duplicate notifications for same pattern", async () => {
      // Trigger pattern detection again
      const payload = {
        httpMethod: "POST",
        path: "/api/patterns/detect",
        headers: {
          Authorization: `Bearer test-token-${testUserId}`,
        },
        body: JSON.stringify({
          familyId: testFamilyId,
          startDate: "2025-01-01",
          endDate: "2025-06-30",
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: testUserId,
              "custom:familyId": testFamilyId,
            },
          },
        },
      };

      await lambda
        .invoke({
          FunctionName:
            process.env.PATTERN_DETECTION_FUNCTION ||
            "budgetbuddy-dev-pattern-detection",
          Payload: JSON.stringify(payload),
        })
        .promise();

      // Wait for potential notification creation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Query notifications again
      const result = await dynamodb
        .query({
          TableName: NOTIFICATIONS_TABLE,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": `USER#${testUserId}`,
            ":sk": "NOTIFICATION#",
          },
        })
        .promise();

      // Count pattern detected notifications
      const patternNotifications = result.Items.filter(
        (n) => n.type === "PATTERN_DETECTED",
      );

      // Should only have one notification (no duplicates)
      expect(patternNotifications.length).toBe(1);
    }, 35000);
  });

  /**
   * Step 3: Test notification actions
   */
  describe("Step 3: Test Notification Actions", () => {
    it("should mark notification as read", async () => {
      const result = await dynamodb
        .query({
          TableName: NOTIFICATIONS_TABLE,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": `USER#${testUserId}`,
            ":sk": "NOTIFICATION#",
          },
        })
        .promise();

      const notification = result.Items[0];
      expect(notification).toBeDefined();

      // Mark as read
      const payload = {
        httpMethod: "PUT",
        path: `/api/notifications/${notification.notificationId}`,
        headers: {
          Authorization: `Bearer test-token-${testUserId}`,
        },
        pathParameters: {
          notificationId: notification.notificationId,
        },
        body: JSON.stringify({
          read: true,
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: testUserId,
            },
          },
        },
      };

      const response = await lambda
        .invoke({
          FunctionName:
            process.env.NOTIFICATIONS_FUNCTION ||
            "budgetbuddy-dev-notifications",
          Payload: JSON.stringify(payload),
        })
        .promise();

      const lambdaResult = JSON.parse(response.Payload);
      expect(lambdaResult.statusCode).toBe(200);

      // Verify notification is marked as read
      const updatedResult = await dynamodb
        .get({
          TableName: NOTIFICATIONS_TABLE,
          Key: {
            PK: `USER#${testUserId}`,
            SK: `NOTIFICATION#${notification.notificationId}`,
          },
        })
        .promise();

      expect(updatedResult.Item.read).toBe(true);
    });

    it("should execute approve action from notification", async () => {
      const result = await dynamodb
        .query({
          TableName: NOTIFICATIONS_TABLE,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": `USER#${testUserId}`,
            ":sk": "NOTIFICATION#",
          },
        })
        .promise();

      const patternNotification = result.Items.find(
        (n) => n.type === "PATTERN_DETECTED",
      );
      expect(patternNotification).toBeDefined();

      const approveAction = patternNotification.actions.find(
        (a) => a.type === "approve",
      );
      expect(approveAction).toBeDefined();

      // Execute approve action
      const patternId = patternNotification.data.patternId;
      const payload = {
        httpMethod: "PUT",
        path: `/api/patterns/${patternId}`,
        headers: {
          Authorization: `Bearer test-token-${testUserId}`,
        },
        pathParameters: {
          patternId,
        },
        body: JSON.stringify({
          action: "approve",
          createBill: true,
        }),
        requestContext: {
          authorizer: {
            claims: {
              sub: testUserId,
              "custom:familyId": testFamilyId,
            },
          },
        },
      };

      const response = await lambda
        .invoke({
          FunctionName:
            process.env.PATTERN_DETECTION_FUNCTION ||
            "budgetbuddy-dev-pattern-detection",
          Payload: JSON.stringify(payload),
        })
        .promise();

      const lambdaResult = JSON.parse(response.Payload);
      expect(lambdaResult.statusCode).toBe(200);

      // Verify pattern is approved
      const patternResult = await dynamodb
        .query({
          TableName: PATTERNS_TABLE,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          FilterExpression: "patternId = :patternId",
          ExpressionAttributeValues: {
            ":pk": `FAMILY#${testFamilyId}`,
            ":sk": "PATTERN#",
            ":patternId": patternId,
          },
        })
        .promise();

      expect(patternResult.Items.length).toBe(1);
      expect(patternResult.Items[0].status).toBe("approved");
    });

    it("should delete notification after action", async () => {
      const result = await dynamodb
        .query({
          TableName: NOTIFICATIONS_TABLE,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": `USER#${testUserId}`,
            ":sk": "NOTIFICATION#",
          },
        })
        .promise();

      const notification = result.Items[0];
      expect(notification).toBeDefined();

      // Delete notification
      const payload = {
        httpMethod: "DELETE",
        path: `/api/notifications/${notification.notificationId}`,
        headers: {
          Authorization: `Bearer test-token-${testUserId}`,
        },
        pathParameters: {
          notificationId: notification.notificationId,
        },
        requestContext: {
          authorizer: {
            claims: {
              sub: testUserId,
            },
          },
        },
      };

      const response = await lambda
        .invoke({
          FunctionName:
            process.env.NOTIFICATIONS_FUNCTION ||
            "budgetbuddy-dev-notifications",
          Payload: JSON.stringify(payload),
        })
        .promise();

      const lambdaResult = JSON.parse(response.Payload);
      expect(lambdaResult.statusCode).toBe(200);

      // Verify notification is deleted
      const deletedResult = await dynamodb
        .get({
          TableName: NOTIFICATIONS_TABLE,
          Key: {
            PK: `USER#${testUserId}`,
            SK: `NOTIFICATION#${notification.notificationId}`,
          },
        })
        .promise();

      expect(deletedResult.Item).toBeUndefined();
    });
  });

  /**
   * Helper function to cleanup test data
   */
  async function cleanupTestData() {
    try {
      // Delete test transactions
      for (const transactionId of testTransactionIds) {
        await dynamodb
          .delete({
            TableName: TRANSACTIONS_TABLE,
            Key: {
              PK: `FAMILY#${testFamilyId}`,
              SK: `TRANSACTION#${transactionId}`,
            },
          })
          .promise();
      }

      // Delete test notifications
      for (const notificationId of testNotificationIds) {
        await dynamodb
          .delete({
            TableName: NOTIFICATIONS_TABLE,
            Key: {
              PK: `USER#${testUserId}`,
              SK: `NOTIFICATION#${notificationId}`,
            },
          })
          .promise();
      }

      // Delete test patterns
      const patternsResult = await dynamodb
        .query({
          TableName: PATTERNS_TABLE,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": `FAMILY#${testFamilyId}`,
            ":sk": "PATTERN#",
          },
        })
        .promise();

      for (const pattern of patternsResult.Items) {
        await dynamodb
          .delete({
            TableName: PATTERNS_TABLE,
            Key: {
              PK: pattern.PK,
              SK: pattern.SK,
            },
          })
          .promise();
      }
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }
});
