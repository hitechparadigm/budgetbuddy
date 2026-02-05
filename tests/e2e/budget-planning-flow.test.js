/**
 * End-to-End Test: Budget Planning Flow
 *
 * Tests the complete budget planning workflow:
 * 1. Create test bills and transaction history
 * 2. Generate budget suggestions
 * 3. Review and apply suggestions
 * 4. Verify budget updated
 *
 * Requirements: 3.1, 3.2
 */

const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

// Configure AWS SDK for local testing
AWS.config.update({
  region: process.env.AWS_REGION || "us-east-1",
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda();

const BILLS_TABLE = process.env.BILLS_TABLE || "budgetbuddy-dev-bills";
const TRANSACTIONS_TABLE =
  process.env.TRANSACTIONS_TABLE || "budgetbuddy-dev-transactions";
const BUDGETS_TABLE = process.env.BUDGETS_TABLE || "budgetbuddy-dev-budgets";

describe("Budget Planning Flow - End-to-End", () => {
  let testFamilyId;
  let testUserId;
  let testBillIds;
  let testBudgetId;
  let testSuggestions;

  beforeAll(() => {
    testFamilyId = `test-family-${uuidv4()}`;
    testUserId = `test-user-${uuidv4()}`;
    testBillIds = [];
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  /**
   * Step 1: Create test bills and transaction history
   */
  describe("Step 1: Create Test Bills and History", () => {
    it("should create recurring bills", async () => {
      const bills = [
        {
          name: "Rent",
          amount: 1500,
          frequency: "monthly",
          category: "Housing",
          dueDate: "2025-01-01",
        },
        {
          name: "Car Insurance",
          amount: 150,
          frequency: "monthly",
          category: "Transportation",
          dueDate: "2025-01-15",
        },
        {
          name: "Internet",
          amount: 80,
          frequency: "monthly",
          category: "Utilities",
          dueDate: "2025-01-10",
        },
        {
          name: "Gym Membership",
          amount: 50,
          frequency: "monthly",
          category: "Health",
          dueDate: "2025-01-05",
        },
      ];

      for (const billData of bills) {
        const bill = {
          PK: `FAMILY#${testFamilyId}`,
          SK: `BILL#${uuidv4()}`,
          billId: uuidv4(),
          familyId: testFamilyId,
          userId: testUserId,
          ...billData,
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await dynamodb
          .put({
            TableName: BILLS_TABLE,
            Item: bill,
          })
          .promise();

        testBillIds.push(bill.billId);
      }

      expect(testBillIds).toHaveLength(4);
    });

    it("should create transaction history for 6 months", async () => {
      const categories = [
        { name: "Groceries", avgAmount: 400, variance: 100 },
        { name: "Dining Out", avgAmount: 200, variance: 80 },
        { name: "Gas", avgAmount: 150, variance: 50 },
        { name: "Entertainment", avgAmount: 100, variance: 50 },
      ];

      const baseDate = new Date("2024-07-01");
      const transactions = [];

      // Create 6 months of transaction history
      for (let month = 0; month < 6; month++) {
        for (const category of categories) {
          // Create 3-5 transactions per category per month
          const numTransactions = 3 + Math.floor(Math.random() * 3);

          for (let i = 0; i < numTransactions; i++) {
            const date = new Date(baseDate);
            date.setMonth(date.getMonth() + month);
            date.setDate(Math.floor(Math.random() * 28) + 1);

            const amount =
              category.avgAmount / numTransactions +
              (Math.random() * category.variance - category.variance / 2);

            const transaction = {
              PK: `FAMILY#${testFamilyId}`,
              SK: `TRANSACTION#${uuidv4()}`,
              transactionId: uuidv4(),
              familyId: testFamilyId,
              userId: testUserId,
              date: date.toISOString().split("T")[0],
              amount: Math.round(amount * 100) / 100,
              merchant: `${category.name} Store`,
              category: category.name,
              description: `${category.name} purchase`,
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
          }
        }
      }

      expect(transactions.length).toBeGreaterThan(50);
    });
  });

  /**
   * Step 2: Generate budget suggestions
   */
  describe("Step 2: Generate Budget Suggestions", () => {
    it("should invoke budget planning Lambda", async () => {
      const payload = {
        httpMethod: "POST",
        path: "/api/budget/suggestions",
        headers: {
          Authorization: `Bearer test-token-${testUserId}`,
        },
        body: JSON.stringify({
          familyId: testFamilyId,
          month: "2025-01",
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
            process.env.BUDGET_PLANNING_FUNCTION ||
            "budgetbuddy-dev-budget-planning",
          Payload: JSON.stringify(payload),
        })
        .promise();

      const result = JSON.parse(response.Payload);
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.suggestions).toBeDefined();
      expect(Array.isArray(body.suggestions)).toBe(true);
      expect(body.suggestions.length).toBeGreaterThan(0);

      // Store suggestions for next steps
      testSuggestions = body.suggestions;

      // Verify suggestion structure
      const suggestion = body.suggestions[0];
      expect(suggestion).toHaveProperty("category");
      expect(suggestion).toHaveProperty("suggestedAmount");
      expect(suggestion).toHaveProperty("confidenceScore");
      expect(suggestion).toHaveProperty("reasoning");
      expect(suggestion).toHaveProperty("historicalAverage");
    }, 30000); // 30 second timeout for AI processing
  });

  /**
   * Step 3: Review and apply suggestions
   */
  describe("Step 3: Review and Apply Suggestions", () => {
    it("should retrieve generated suggestions", async () => {
      expect(testSuggestions).toBeDefined();
      expect(testSuggestions.length).toBeGreaterThan(0);

      // Verify all required fields are present
      for (const suggestion of testSuggestions) {
        expect(suggestion.category).toBeDefined();
        expect(suggestion.suggestedAmount).toBeGreaterThan(0);
        expect(suggestion.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(suggestion.confidenceScore).toBeLessThanOrEqual(1);
        expect(suggestion.reasoning).toBeDefined();
      }
    });

    it("should apply budget suggestions", async () => {
      // Select suggestions to apply (all with confidence > 0.7)
      const suggestionsToApply = testSuggestions
        .filter((s) => s.confidenceScore > 0.7)
        .map((s) => ({
          category: s.category,
          amount: s.suggestedAmount,
        }));

      expect(suggestionsToApply.length).toBeGreaterThan(0);

      const payload = {
        httpMethod: "POST",
        path: "/api/budget/apply-suggestions",
        headers: {
          Authorization: `Bearer test-token-${testUserId}`,
        },
        body: JSON.stringify({
          familyId: testFamilyId,
          month: "2025-01",
          suggestions: suggestionsToApply,
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
            process.env.BUDGET_PLANNING_FUNCTION ||
            "budgetbuddy-dev-budget-planning",
          Payload: JSON.stringify(payload),
        })
        .promise();

      const result = JSON.parse(response.Payload);
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.budget).toBeDefined();
      expect(body.budget.budgetId).toBeDefined();

      testBudgetId = body.budget.budgetId;
    });
  });

  /**
   * Step 4: Verify budget updated
   */
  describe("Step 4: Verify Budget Updated", () => {
    it("should create or update budget with suggested amounts", async () => {
      expect(testBudgetId).toBeDefined();

      // Query budget from database
      const result = await dynamodb
        .get({
          TableName: BUDGETS_TABLE,
          Key: {
            PK: `FAMILY#${testFamilyId}`,
            SK: `BUDGET#${testBudgetId}`,
          },
        })
        .promise();

      expect(result.Item).toBeDefined();

      const budget = result.Item;
      expect(budget.familyId).toBe(testFamilyId);
      expect(budget.month).toBe("2025-01");
      expect(budget.categories).toBeDefined();
      expect(Array.isArray(budget.categories)).toBe(true);

      // Verify categories match applied suggestions
      const appliedSuggestions = testSuggestions.filter(
        (s) => s.confidenceScore > 0.7,
      );

      for (const suggestion of appliedSuggestions) {
        const budgetCategory = budget.categories.find(
          (c) => c.name === suggestion.category,
        );
        expect(budgetCategory).toBeDefined();
        expect(budgetCategory.planned).toBeCloseTo(
          suggestion.suggestedAmount,
          2,
        );
      }
    });

    it("should include AI metadata in budget", async () => {
      const result = await dynamodb
        .get({
          TableName: BUDGETS_TABLE,
          Key: {
            PK: `FAMILY#${testFamilyId}`,
            SK: `BUDGET#${testBudgetId}`,
          },
        })
        .promise();

      const budget = result.Item;

      // Verify AI-generated flag
      expect(budget.aiGenerated).toBe(true);

      // Verify categories have AI metadata
      const aiCategories = budget.categories.filter((c) => c.aiGenerated);
      expect(aiCategories.length).toBeGreaterThan(0);

      for (const category of aiCategories) {
        expect(category.aiConfidenceScore).toBeDefined();
        expect(category.aiConfidenceScore).toBeGreaterThanOrEqual(0);
        expect(category.aiConfidenceScore).toBeLessThanOrEqual(1);
      }
    });

    it("should calculate correct budget totals", async () => {
      const result = await dynamodb
        .get({
          TableName: BUDGETS_TABLE,
          Key: {
            PK: `FAMILY#${testFamilyId}`,
            SK: `BUDGET#${testBudgetId}`,
          },
        })
        .promise();

      const budget = result.Item;

      // Calculate expected total
      const expectedTotal = budget.categories.reduce(
        (sum, cat) => sum + cat.planned,
        0,
      );

      expect(budget.totalPlanned).toBeCloseTo(expectedTotal, 2);
    });

    it("should handle bi-weekly frequency calculations correctly", async () => {
      // Check if any bills have bi-weekly frequency
      const biweeklyBills = await dynamodb
        .query({
          TableName: BILLS_TABLE,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          FilterExpression: "frequency = :freq",
          ExpressionAttributeValues: {
            ":pk": `FAMILY#${testFamilyId}`,
            ":sk": "BILL#",
            ":freq": "bi-weekly",
          },
        })
        .promise();

      if (biweeklyBills.Items.length > 0) {
        const result = await dynamodb
          .get({
            TableName: BUDGETS_TABLE,
            Key: {
              PK: `FAMILY#${testFamilyId}`,
              SK: `BUDGET#${testBudgetId}`,
            },
          })
          .promise();

        const budget = result.Item;

        // Verify bi-weekly bills are calculated correctly
        // (2 or 3 occurrences depending on month)
        for (const bill of biweeklyBills.Items) {
          const category = budget.categories.find(
            (c) => c.name === bill.category,
          );
          if (category) {
            // Should account for 2-3 occurrences
            const minExpected = bill.amount * 2;
            const maxExpected = bill.amount * 3;

            expect(category.planned).toBeGreaterThanOrEqual(minExpected);
            expect(category.planned).toBeLessThanOrEqual(maxExpected);
          }
        }
      }
    });
  });

  /**
   * Helper function to cleanup test data
   */
  async function cleanupTestData() {
    try {
      // Delete test bills
      for (const billId of testBillIds) {
        await dynamodb
          .delete({
            TableName: BILLS_TABLE,
            Key: {
              PK: `FAMILY#${testFamilyId}`,
              SK: `BILL#${billId}`,
            },
          })
          .promise();
      }

      // Delete test transactions
      const transactionsResult = await dynamodb
        .query({
          TableName: TRANSACTIONS_TABLE,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": `FAMILY#${testFamilyId}`,
            ":sk": "TRANSACTION#",
          },
        })
        .promise();

      for (const transaction of transactionsResult.Items) {
        await dynamodb
          .delete({
            TableName: TRANSACTIONS_TABLE,
            Key: {
              PK: transaction.PK,
              SK: transaction.SK,
            },
          })
          .promise();
      }

      // Delete test budget
      if (testBudgetId) {
        await dynamodb
          .delete({
            TableName: BUDGETS_TABLE,
            Key: {
              PK: `FAMILY#${testFamilyId}`,
              SK: `BUDGET#${testBudgetId}`,
            },
          })
          .promise();
      }
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }
});
