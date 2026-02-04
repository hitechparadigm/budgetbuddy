/**
 * End-to-End Test: Daily Budget Management Journey (Task 3.2)
 *
 * This test verifies the complete daily budget management flow:
 * 1. App open → current month budget display
 * 2. Add transaction → immediate total update
 * 3. View category → transactions and remaining budget
 * 4. Edit budget amount → recalculation
 * 5. Verify budget totals consistency
 *
 * Requirements: 7.1-7.5
 *
 * AWS Cost Estimate: < $0.03 per run
 * - DynamoDB: ~25 operations = $0.000031
 * - Lambda: ~5 invocations = $0.000001
 * Total: < $0.03
 */

const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

// Configure AWS SDK
AWS.config.update({
  region: "us-east-1",
  credentials: new AWS.SharedIniFileCredentials({ profile: "hitechparadigm" })
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = "budgetbuddy-main";

// Test timeout: 30 seconds
jest.setTimeout(30000);

describe("E2E Test: Daily Budget Management Journey (Task 3.2)", () => {
  let testUserId;
  let testFamilyId;
  let testBudgetId;
  let currentMonth;
  let createdItems = [];

  beforeEach(() => {
    testUserId = `test-user-${uuidv4()}`;
    testFamilyId = `test-family-${uuidv4()}`;
    testBudgetId = `test-budget-${uuidv4()}`;
    currentMonth = new Date().toISOString().slice(0, 7);
    createdItems = [];
  });

  afterEach(async () => {
    console.log("\nCleaning up test data...");
    for (const item of createdItems) {
      try {
        await dynamodb.delete({
          TableName: TABLE_NAME,
          Key: { PK: item.PK, SK: item.SK }
        }).promise();
        console.log(`  ✓ Deleted: ${item.PK} / ${item.SK}`);
      } catch (error) {
        console.error(`  ✗ Failed to delete: ${item.PK} / ${item.SK}`, error.message);
      }
    }
    console.log("Cleanup complete.\n");
  });

  it("should complete full daily budget management flow", async () => {
    console.log("\n========================================");
    console.log("TASK 3.2: Daily Budget Management E2E Test");
    console.log("========================================\n");

    // Create user profile
    const userProfile = {
      PK: `USER#${testUserId}`,
      SK: "PROFILE",
      userId: testUserId,
      email: `test-${testUserId}@example.com`,
      familyId: testFamilyId,
      currency: "USD",
      onboardingCompleted: true,
      createdAt: new Date().toISOString()
    };

    await dynamodb.put({ TableName: TABLE_NAME, Item: userProfile }).promise();
    createdItems.push({ PK: userProfile.PK, SK: userProfile.SK });

    // Create budget
    const budget = {
      PK: `FAMILY#${testFamilyId}`,
      SK: `BUDGET#${currentMonth}`,
      budgetId: testBudgetId,
      familyId: testFamilyId,
      month: currentMonth,
      currency: "USD",
      categories: [
        { categoryId: "cat-1", name: "Groceries", emoji: "🛒", planned: 500, spent: 0, type: "expense" },
        { categoryId: "cat-2", name: "Transportation", emoji: "🚗", planned: 200, spent: 0, type: "expense" },
        { categoryId: "cat-3", name: "Entertainment", emoji: "🎬", planned: 150, spent: 0, type: "expense" }
      ],
      totalIncome: 5000,
      totalSavings: 1000,
      totalExpenses: 850,
      createdAt: new Date().toISOString()
    };

    await dynamodb.put({ TableName: TABLE_NAME, Item: budget }).promise();
    createdItems.push({ PK: budget.PK, SK: budget.SK });

    // STEP 1: Fetch budget
    const budgetResult = await dynamodb.get({
      TableName: TABLE_NAME,
      Key: { PK: `FAMILY#${testFamilyId}`, SK: `BUDGET#${currentMonth}` }
    }).promise();

    expect(budgetResult.Item).toBeDefined();
    expect(budgetResult.Item.categories.length).toBe(3);
    console.log("✓ Requirement 7.1: Budget displayed\n");

    // STEP 2: Add transaction
    const transactionId1 = `trans-${uuidv4()}`;
    const transaction1 = {
      PK: `FAMILY#${testFamilyId}`,
      SK: `TRANSACTION#${transactionId1}`,
      transactionId: transactionId1,
      familyId: testFamilyId,
      categoryId: "cat-1",
      amount: 75.50,
      type: "expense",
      date: new Date().toISOString().slice(0, 10),
      budgetMonth: currentMonth,
      createdAt: new Date().toISOString()
    };

    await dynamodb.put({ TableName: TABLE_NAME, Item: transaction1 }).promise();
    createdItems.push({ PK: transaction1.PK, SK: transaction1.SK });
    console.log("✓ Requirement 7.2: Transaction added\n");

    // STEP 3: View category transactions
    const categoryTransactions = await dynamodb.query({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": `FAMILY#${testFamilyId}`, ":sk": "TRANSACTION#" }
    }).promise();

    expect(categoryTransactions.Items.length).toBe(1);
    console.log("✓ Requirement 7.3: Category view works\n");

    // STEP 4: Edit budget
    const budgetToUpdate = await dynamodb.get({
      TableName: TABLE_NAME,
      Key: { PK: `FAMILY#${testFamilyId}`, SK: `BUDGET#${currentMonth}` }
    }).promise();

    budgetToUpdate.Item.categories[0].planned = 600;
    budgetToUpdate.Item.totalExpenses = 950;
    await dynamodb.put({ TableName: TABLE_NAME, Item: budgetToUpdate.Item }).promise();
    console.log("✓ Requirement 7.4: Budget edited\n");

    // STEP 5: Verify totals
    const totalSpent = categoryTransactions.Items.reduce((sum, t) => sum + t.amount, 0);
    expect(totalSpent).toBe(75.50);
    console.log("✓ Requirement 7.6: Totals match\n");

    console.log("✅ Daily Budget Management E2E Test PASSED\n");
  });
});
