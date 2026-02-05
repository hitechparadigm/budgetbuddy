/**
 * End-to-End Test: Pattern Detection Flow
 *
 * Tests the complete pattern detection workflow:
 * 1. Create test transactions
 * 2. Trigger pattern detection
 * 3. Review and approve patterns
 * 4. Verify bill reminders created
 *
 * Requirements: 1.1, 2.3, 2.4
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
const BILLS_TABLE = process.env.BILLS_TABLE || "budgetbuddy-dev-bills";
const PATTERNS_TABLE = process.env.PATTERNS_TABLE || "budgetbuddy-dev-patterns";

describe("Pattern Detection Flow - End-to-End", () => {
  let testFamilyId;
  let testUserId;
  let testTransactionIds;
  let testPatternId;

  beforeAll(() => {
    testFamilyId = `test-family-${uuidv4()}`;
    testUserId = `test-user-${uuidv4()}`;
    testTransactionIds = [];
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  /**
   * Step 1: Create test transactions with recurring pattern
   */
  describe("Step 1: Create Test Transactions", () => {
    it("should create monthly recurring transactions for Netflix", async () => {
      const baseDate = new Date("2025-01-15");
      const transactions = [];

      // Create 6 months of Netflix transactions
      for (let i = 0; i < 6; i++) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + i);

        const transaction = {
          PK: `FAMILY#${testFamilyId}`,
          SK: `TRANSACTION#${uuidv4()}`,
          transactionId: uuidv4(),
          familyId: testFamilyId,
          userId: testUserId,
          date: date.toISOString().split("T")[0],
          amount: 15.99,
          merchant: "Netflix",
          category: "Entertainment",
          description: "Netflix Subscription",
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

      expect(transactions).toHaveLength(6);
      expect(transactions[0].merchant).toBe("Netflix");
    });

    it("should create monthly recurring transactions for Electric Bill", async () => {
      const baseDate = new Date("2025-01-20");
      const transactions = [];

      // Create 6 months of electric bill transactions with slight amount variance
      for (let i = 0; i < 6; i++) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + i);

        const transaction = {
          PK: `FAMILY#${testFamilyId}`,
          SK: `TRANSACTION#${uuidv4()}`,
          transactionId: uuidv4(),
          familyId: testFamilyId,
          userId: testUserId,
          date: date.toISOString().split("T")[0],
          amount: 120 + (Math.random() * 20 - 10), // $110-$130
          merchant: "City Electric Company",
          category: "Utilities",
          description: "Electric Bill",
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

      expect(transactions).toHaveLength(6);
      expect(transactions[0].merchant).toBe("City Electric Company");
    });
  });

  /**
   * Step 2: Trigger pattern detection
   */
  describe("Step 2: Trigger Pattern Detection", () => {
    it("should invoke pattern detection Lambda", async () => {
      const payload = {
        httpMethod: "POST",
        path: "/api/patterns/detect",
        headers: {
          Authorization: `Bearer test-token-${testUserId}`,
        },
        body: JSON.stringify({
          familyId: testFamilyId,
          startDate: "2025-01-01",
          endDate: "2025-07-31",
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
      expect(body.patterns.length).toBeGreaterThanOrEqual(2); // Netflix + Electric

      // Store pattern ID for next steps
      const netflixPattern = body.patterns.find((p) =>
        p.merchant.includes("Netflix"),
      );
      expect(netflixPattern).toBeDefined();
      testPatternId = netflixPattern.patternId;
    }, 30000); // 30 second timeout for AI processing
  });

  /**
   * Step 3: Review and approve patterns
   */
  describe("Step 3: Review and Approve Patterns", () => {
    it("should retrieve detected patterns", async () => {
      const payload = {
        httpMethod: "GET",
        path: "/api/patterns",
        headers: {
          Authorization: `Bearer test-token-${testUserId}`,
        },
        queryStringParameters: {
          familyId: testFamilyId,
          status: "pending",
        },
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

      // Verify pattern structure
      const pattern = body.patterns[0];
      expect(pattern).toHaveProperty("patternId");
      expect(pattern).toHaveProperty("merchant");
      expect(pattern).toHaveProperty("frequency");
      expect(pattern).toHaveProperty("averageAmount");
      expect(pattern).toHaveProperty("confidenceScore");
      expect(pattern).toHaveProperty("status", "pending");
    });

    it("should approve a pattern", async () => {
      const payload = {
        httpMethod: "PUT",
        path: `/api/patterns/${testPatternId}`,
        headers: {
          Authorization: `Bearer test-token-${testUserId}`,
        },
        pathParameters: {
          patternId: testPatternId,
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

      const result = JSON.parse(response.Payload);
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.pattern.status).toBe("approved");
    });
  });

  /**
   * Step 4: Verify bill reminders created
   */
  describe("Step 4: Verify Bill Reminders Created", () => {
    it("should create bill reminder from approved pattern", async () => {
      // Wait a moment for bill creation to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Query bills table for the created bill
      const result = await dynamodb
        .query({
          TableName: BILLS_TABLE,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": `FAMILY#${testFamilyId}`,
            ":sk": "BILL#",
          },
        })
        .promise();

      expect(result.Items.length).toBeGreaterThanOrEqual(1);

      // Find the bill created from our pattern
      const bill = result.Items.find(
        (b) => b.sourcePatternId === testPatternId,
      );
      expect(bill).toBeDefined();

      // Verify bill structure
      expect(bill).toHaveProperty("billId");
      expect(bill).toHaveProperty("name");
      expect(bill).toHaveProperty("amount");
      expect(bill).toHaveProperty("dueDate");
      expect(bill).toHaveProperty("frequency");
      expect(bill).toHaveProperty("aiGenerated", true);
      expect(bill).toHaveProperty("sourcePatternId", testPatternId);
      expect(bill).toHaveProperty("aiConfidenceScore");

      // Verify reminder schedule
      expect(bill).toHaveProperty("reminders");
      expect(Array.isArray(bill.reminders)).toBe(true);
      expect(bill.reminders.length).toBeGreaterThanOrEqual(1);
    });

    it("should not create duplicate bills for the same pattern", async () => {
      // Try to approve the same pattern again
      const payload = {
        httpMethod: "PUT",
        path: `/api/patterns/${testPatternId}`,
        headers: {
          Authorization: `Bearer test-token-${testUserId}`,
        },
        pathParameters: {
          patternId: testPatternId,
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

      const result = JSON.parse(response.Payload);

      // Should either return 400 (already approved) or 200 (idempotent)
      expect([200, 400]).toContain(result.statusCode);

      // Verify only one bill exists for this pattern
      const billsResult = await dynamodb
        .query({
          TableName: BILLS_TABLE,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": `FAMILY#${testFamilyId}`,
            ":sk": "BILL#",
          },
        })
        .promise();

      const billsFromPattern = billsResult.Items.filter(
        (b) => b.sourcePatternId === testPatternId,
      );
      expect(billsFromPattern.length).toBe(1);
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

      // Delete test patterns
      if (testPatternId) {
        await dynamodb
          .delete({
            TableName: PATTERNS_TABLE,
            Key: {
              PK: `FAMILY#${testFamilyId}`,
              SK: `PATTERN#${testPatternId}`,
            },
          })
          .promise();
      }

      // Delete test bills
      const billsResult = await dynamodb
        .query({
          TableName: BILLS_TABLE,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": `FAMILY#${testFamilyId}`,
            ":sk": "BILL#",
          },
        })
        .promise();

      for (const bill of billsResult.Items) {
        if (bill.sourcePatternId === testPatternId) {
          await dynamodb
            .delete({
              TableName: BILLS_TABLE,
              Key: {
                PK: bill.PK,
                SK: bill.SK,
              },
            })
            .promise();
        }
      }
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }
});
