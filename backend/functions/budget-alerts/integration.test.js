/**
 * Integration Tests for Budget Alerts Service
 *
 * These tests verify the complete flow of budget alert detection,
 * threshold checking, deduplication, and notification delivery.
 *
 * NOTE: These tests use mocked AWS services to avoid costs.
 * For real AWS integration testing, run manually in dev environment.
 */

const { handler } = require("./index");

// Mock AWS SDK for integration tests
jest.mock("aws-sdk", () => {
  const mockDynamoDB = {
    get: jest.fn().mockReturnThis(),
    put: jest.fn().mockReturnThis(),
    query: jest.fn().mockReturnThis(),
    scan: jest.fn().mockReturnThis(),
    promise: jest.fn(),
  };

  const mockLambda = {
    invoke: jest.fn().mockReturnThis(),
    promise: jest.fn(),
  };

  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => mockDynamoDB),
      Converter: {
        unmarshall: jest.fn((data) => data),
      },
    },
    Lambda: jest.fn(() => mockLambda),
  };
});

describe("Integration Tests: Budget Alert Flow (Task 10.5)", () => {
  let AWS;
  let mockDynamoDB;
  let mockLambda;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = "test-table";
    process.env.NOTIFICATION_FUNCTION_ARN =
      "arn:aws:lambda:us-east-1:123456789012:function:notifications";
    AWS = require("aws-sdk");
    mockDynamoDB = new AWS.DynamoDB.DocumentClient();
    mockLambda = new AWS.Lambda();
  });

  it("should trigger alert when 80% threshold crossed", async () => {
    console.log("\n========================================");
    console.log("TASK 10.5: Budget Alert Flow Test");
    console.log("========================================\n");
    console.log("Step 1: Creating transaction that crosses 80% threshold...");

    // Mock DynamoDB Stream event for transaction INSERT
    const streamEvent = {
      Records: [
        {
          eventID: "1",
          eventName: "INSERT",
          eventSource: "aws:dynamodb",
          dynamodb: {
            NewImage: {
              PK: { S: "FAMILY#family-123" },
              SK: { S: "TRANSACTION#2024-01-31T12:00:00.000Z#txn-456" },
              amount: { N: "400" },
              categoryId: { S: "groceries" },
              budgetId: { S: "budget-123" },
              type: { S: "expense" },
              description: { S: "Grocery shopping" },
              createdAt: { S: "2024-01-31T12:00:00.000Z" },
            },
          },
        },
      ],
    };

    // Step 2: Mock getting budget
    console.log("\nStep 2: Fetching budget to calculate threshold...");
    mockDynamoDB.promise.mockResolvedValueOnce({
      Item: {
        PK: "FAMILY#family-123",
        SK: "BUDGET#budget-123",
        budgetId: "budget-123",
        month: "2024-01",
        categories: [
          {
            id: "groceries",
            name: "Groceries",
            planned: 500,
            spent: 0,
          },
        ],
      },
    });

    // Step 3: Mock getting all transactions for category
    console.log("\nStep 3: Calculating total spending for category...");
    mockDynamoDB.promise.mockResolvedValueOnce({
      Items: [
        {
          amount: 400,
          type: "expense",
          categoryId: "groceries",
        },
      ],
    });

    // Step 4: Mock checking if alert already sent (not sent)
    console.log("\nStep 4: Checking alert deduplication...");
    mockDynamoDB.promise.mockResolvedValueOnce({
      Item: null, // No alert sent in last 24 hours
    });

    // Step 5: Mock getting family members
    console.log("\nStep 5: Getting family members for notification...");
    mockDynamoDB.promise.mockResolvedValueOnce({
      Items: [
        {
          PK: "FAMILY#family-123",
          SK: "USER#user-123",
          userId: "user-123",
          role: "primary",
        },
        {
          PK: "FAMILY#family-123",
          SK: "USER#user-456",
          userId: "user-456",
          role: "spouse",
        },
      ],
    });

    // Step 6: Mock Lambda invoke for notifications (2 family members)
    console.log("\nStep 6: Sending notifications to family members...");
    mockLambda.promise
      .mockResolvedValueOnce({
        StatusCode: 200,
        Payload: JSON.stringify({ success: true }),
      })
      .mockResolvedValueOnce({
        StatusCode: 200,
        Payload: JSON.stringify({ success: true }),
      });

    // Step 7: Mock marking alert as sent
    console.log("\nStep 7: Marking alert as sent...");
    mockDynamoDB.promise.mockResolvedValueOnce({});

    // Execute handler
    const result = await handler(streamEvent);

    // Verify results
    expect(result.statusCode).toBe(200);
    console.log("✓ Handler executed successfully");

    // Verify budget was fetched
    expect(mockDynamoDB.get).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: "test-table",
        Key: {
          PK: "FAMILY#family-123",
          SK: "BUDGET#budget-123",
        },
      }),
    );
    console.log("✓ Budget fetched from DynamoDB");

    // Verify transactions were queried
    expect(mockDynamoDB.query).toHaveBeenCalled();
    console.log("✓ Category spending calculated");

    // Verify alert deduplication check
    const deduplicationCall = mockDynamoDB.get.mock.calls.find(
      (call) => call[0].Key.SK && call[0].Key.SK.startsWith("ALERT#"),
    );
    expect(deduplicationCall).toBeDefined();
    console.log("✓ Alert deduplication checked");

    // Verify family members were fetched
    const familyQuery = mockDynamoDB.query.mock.calls.find(
      (call) =>
        call[0].KeyConditionExpression &&
        call[0].KeyConditionExpression.includes("USER#"),
    );
    expect(familyQuery).toBeDefined();
    console.log("✓ Family members retrieved");

    // Verify notifications sent to both family members
    expect(mockLambda.invoke).toHaveBeenCalledTimes(2);
    console.log("✓ Notifications sent to 2 family members");

    // Verify alert marked as sent
    const alertPutCall = mockDynamoDB.put.mock.calls.find(
      (call) => call[0].Item.SK && call[0].Item.SK.startsWith("ALERT#"),
    );
    expect(alertPutCall).toBeDefined();
    expect(alertPutCall[0].Item.threshold).toBe(80);
    expect(alertPutCall[0].Item.TTL).toBeDefined();
    console.log("✓ Alert marked as sent with 90-day TTL");

    console.log("\n========================================");
    console.log("✅ TASK 10.5 TEST PASSED");
    console.log("========================================");
    console.log("Budget alert flow verified:");
    console.log("  ✓ Transaction crossed 80% threshold");
    console.log("  ✓ Budget and spending calculated");
    console.log("  ✓ Alert deduplication checked");
    console.log("  ✓ Notifications sent to all family members");
    console.log("  ✓ Alert marked as sent");
    console.log("========================================\n");
  });

  it("should prevent duplicate alerts within 24 hours", async () => {
    console.log("\nTesting alert deduplication...");

    const streamEvent = {
      Records: [
        {
          eventID: "1",
          eventName: "INSERT",
          eventSource: "aws:dynamodb",
          dynamodb: {
            NewImage: {
              PK: { S: "FAMILY#family-123" },
              SK: { S: "TRANSACTION#2024-01-31T12:00:00.000Z#txn-456" },
              amount: { N: "400" },
              categoryId: { S: "groceries" },
              budgetId: { S: "budget-123" },
              type: { S: "expense" },
            },
          },
        },
      ],
    };

    // Mock getting budget
    mockDynamoDB.promise.mockResolvedValueOnce({
      Item: {
        PK: "FAMILY#family-123",
        SK: "BUDGET#budget-123",
        categories: [
          {
            id: "groceries",
            name: "Groceries",
            planned: 500,
            spent: 0,
          },
        ],
      },
    });

    // Mock getting transactions
    mockDynamoDB.promise.mockResolvedValueOnce({
      Items: [{ amount: 400, type: "expense", categoryId: "groceries" }],
    });

    // Mock alert already sent (within 24 hours)
    const recentAlertTime = new Date();
    recentAlertTime.setHours(recentAlertTime.getHours() - 12); // 12 hours ago

    mockDynamoDB.promise.mockResolvedValueOnce({
      Item: {
        PK: "FAMILY#family-123",
        SK: "ALERT#budget-123#groceries#80",
        threshold: 80,
        sentAt: recentAlertTime.toISOString(),
      },
    });

    // Execute handler
    const result = await handler(streamEvent);

    // Verify no notification was sent
    expect(mockLambda.invoke).not.toHaveBeenCalled();
    console.log("✓ Duplicate alert prevented (alert sent 12 hours ago)");

    // Verify no new alert was marked as sent
    const alertPutCall = mockDynamoDB.put.mock.calls.find(
      (call) => call[0].Item.SK && call[0].Item.SK.startsWith("ALERT#"),
    );
    expect(alertPutCall).toBeUndefined();
    console.log("✓ No new alert record created");
  });

  it("should send alerts to all family members", async () => {
    console.log("\nTesting multi-member notification...");

    const streamEvent = {
      Records: [
        {
          eventID: "1",
          eventName: "INSERT",
          eventSource: "aws:dynamodb",
          dynamodb: {
            NewImage: {
              PK: { S: "FAMILY#family-123" },
              SK: { S: "TRANSACTION#2024-01-31T12:00:00.000Z#txn-456" },
              amount: { N: "450" },
              categoryId: { S: "groceries" },
              budgetId: { S: "budget-123" },
              type: { S: "expense" },
            },
          },
        },
      ],
    };

    // Mock getting budget
    mockDynamoDB.promise.mockResolvedValueOnce({
      Item: {
        PK: "FAMILY#family-123",
        SK: "BUDGET#budget-123",
        categories: [
          {
            id: "groceries",
            name: "Groceries",
            planned: 500,
            spent: 0,
          },
        ],
      },
    });

    // Mock getting transactions (90% threshold)
    mockDynamoDB.promise.mockResolvedValueOnce({
      Items: [{ amount: 450, type: "expense", categoryId: "groceries" }],
    });

    // Mock no alert sent
    mockDynamoDB.promise.mockResolvedValueOnce({ Item: null });

    // Mock 3 family members
    mockDynamoDB.promise.mockResolvedValueOnce({
      Items: [
        { userId: "user-123", role: "primary" },
        { userId: "user-456", role: "spouse" },
        { userId: "user-789", role: "viewer" },
      ],
    });

    // Mock Lambda invokes
    mockLambda.promise
      .mockResolvedValueOnce({
        StatusCode: 200,
        Payload: JSON.stringify({ success: true }),
      })
      .mockResolvedValueOnce({
        StatusCode: 200,
        Payload: JSON.stringify({ success: true }),
      })
      .mockResolvedValueOnce({
        StatusCode: 200,
        Payload: JSON.stringify({ success: true }),
      });

    // Mock marking alert as sent
    mockDynamoDB.promise.mockResolvedValueOnce({});

    // Execute handler
    await handler(streamEvent);

    // Verify notifications sent to all 3 members
    expect(mockLambda.invoke).toHaveBeenCalledTimes(3);
    console.log("✓ Notifications sent to all 3 family members");

    // Verify notification payload includes correct data
    const invokeCall = mockLambda.invoke.mock.calls[0][0];
    const payload = JSON.parse(invokeCall.Payload);
    expect(payload.notification.data.threshold).toBe(90);
    expect(payload.notification.data.categoryId).toBe("groceries");
    console.log("✓ Notification payload includes threshold and category data");
  });

  it("should detect 90% and 100% thresholds", async () => {
    console.log("\nTesting different threshold levels...");

    // Test 90% threshold
    const event90 = {
      Records: [
        {
          eventID: "1",
          eventName: "INSERT",
          eventSource: "aws:dynamodb",
          dynamodb: {
            NewImage: {
              PK: { S: "FAMILY#family-123" },
              SK: { S: "TRANSACTION#2024-01-31T12:00:00.000Z#txn-456" },
              amount: { N: "450" },
              categoryId: { S: "groceries" },
              budgetId: { S: "budget-123" },
              type: { S: "expense" },
            },
          },
        },
      ],
    };

    mockDynamoDB.promise.mockResolvedValueOnce({
      Item: {
        categories: [{ id: "groceries", name: "Groceries", planned: 500 }],
      },
    });
    mockDynamoDB.promise.mockResolvedValueOnce({
      Items: [{ amount: 450, type: "expense" }],
    });
    mockDynamoDB.promise.mockResolvedValueOnce({ Item: null });
    mockDynamoDB.promise.mockResolvedValueOnce({
      Items: [{ userId: "user-123" }],
    });
    mockLambda.promise.mockResolvedValueOnce({
      StatusCode: 200,
      Payload: JSON.stringify({ success: true }),
    });
    mockDynamoDB.promise.mockResolvedValueOnce({});

    await handler(event90);

    const alert90 = mockDynamoDB.put.mock.calls.find(
      (call) => call[0].Item.threshold === 90,
    );
    expect(alert90).toBeDefined();
    console.log("✓ 90% threshold detected and alert sent");

    // Test 100% threshold
    jest.clearAllMocks();

    const event100 = {
      Records: [
        {
          eventID: "1",
          eventName: "INSERT",
          eventSource: "aws:dynamodb",
          dynamodb: {
            NewImage: {
              PK: { S: "FAMILY#family-123" },
              SK: { S: "TRANSACTION#2024-01-31T12:00:00.000Z#txn-456" },
              amount: { N: "500" },
              categoryId: { S: "groceries" },
              budgetId: { S: "budget-123" },
              type: { S: "expense" },
            },
          },
        },
      ],
    };

    mockDynamoDB.promise.mockResolvedValueOnce({
      Item: {
        categories: [{ id: "groceries", name: "Groceries", planned: 500 }],
      },
    });
    mockDynamoDB.promise.mockResolvedValueOnce({
      Items: [{ amount: 500, type: "expense" }],
    });
    mockDynamoDB.promise.mockResolvedValueOnce({ Item: null });
    mockDynamoDB.promise.mockResolvedValueOnce({
      Items: [{ userId: "user-123" }],
    });
    mockLambda.promise.mockResolvedValueOnce({
      StatusCode: 200,
      Payload: JSON.stringify({ success: true }),
    });
    mockDynamoDB.promise.mockResolvedValueOnce({});

    await handler(event100);

    const alert100 = mockDynamoDB.put.mock.calls.find(
      (call) => call[0].Item.threshold === 100,
    );
    expect(alert100).toBeDefined();
    console.log("✓ 100% threshold detected and alert sent");
  });

  it("should handle scheduled check for missed alerts", async () => {
    console.log("\nTesting scheduled check handler...");

    // Mock EventBridge scheduled event (not DynamoDB Stream)
    const scheduledEvent = {
      source: "aws.events",
      "detail-type": "Scheduled Event",
    };

    // Mock scanning all budgets
    mockDynamoDB.promise.mockResolvedValueOnce({
      Items: [
        {
          PK: "FAMILY#family-123",
          SK: "BUDGET#budget-123",
          budgetId: "budget-123",
          month: "2024-01",
          categories: [
            {
              id: "groceries",
              name: "Groceries",
              planned: 500,
              spent: 0,
            },
          ],
        },
      ],
    });

    // Mock getting transactions for budget
    mockDynamoDB.promise.mockResolvedValueOnce({
      Items: [{ amount: 400, type: "expense", categoryId: "groceries" }],
    });

    // Mock no alert sent
    mockDynamoDB.promise.mockResolvedValueOnce({ Item: null });

    // Mock family members
    mockDynamoDB.promise.mockResolvedValueOnce({
      Items: [{ userId: "user-123" }],
    });

    // Mock Lambda invoke
    mockLambda.promise.mockResolvedValueOnce({
      StatusCode: 200,
      Payload: JSON.stringify({ success: true }),
    });

    // Mock marking alert as sent
    mockDynamoDB.promise.mockResolvedValueOnce({});

    // Execute handler
    const result = await handler(scheduledEvent);

    expect(result.statusCode).toBe(200);
    expect(mockDynamoDB.scan).toHaveBeenCalled();
    expect(mockLambda.invoke).toHaveBeenCalled();
    console.log("✓ Scheduled check scanned budgets and sent missed alert");
  });
});
