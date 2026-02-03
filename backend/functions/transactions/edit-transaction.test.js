/**
 * Transaction Editing Tests (Requirement 12)
 *
 * Tests for transaction editing functionality including:
 * - Edit updates (amount, category, description, merchant, date)
 * - Category changes with budget recalculation
 * - Amount changes with budget updates
 * - Validation and error handling
 */

const { handler } = require("./index");

// Mock AWS SDK
jest.mock("@aws-sdk/client-dynamodb");

// Mock shared utilities
jest.mock("/opt/nodejs/shared/cors", () => ({
  getCorsHeaders: jest.fn(() => ({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  })),
}));

jest.mock("/opt/nodejs/shared/token-parser", () => ({
  parseIdToken: jest.fn(() => ({
    sub: "user123",
    "custom:userId": "user123",
    "custom:familyId": "family123",
    "custom:familyRole": "primary",
  })),
}));

// Mock dynamo helpers
jest.mock("./utils/dynamo-helpers");
const dynamoHelpers = require("./utils/dynamo-helpers");

describe("Transaction Editing (Req 12)", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock existing transaction
    dynamoHelpers.getItem = jest.fn().mockResolvedValue({
      PK: "FAMILY#family123",
      SK: "TRANSACTION#trans123",
      transactionId: "trans123",
      familyId: "family123",
      amount: 100,
      type: "expense",
      categoryId: "cat_groceries",
      description: "Walmart",
      merchantName: "Walmart",
      date: "2025-11-15",
      budgetMonth: "2025-11",
      createdAt: "2025-11-15T10:00:00Z",
    });

    // Mock update
    dynamoHelpers.updateItem = jest
      .fn()
      .mockImplementation((pk, sk, updates) => {
        return Promise.resolve({
          PK: pk,
          SK: sk,
          transactionId: "trans123",
          familyId: "family123",
          amount: updates.amount || 100,
          type: updates.type || "expense",
          categoryId: updates.categoryId || "cat_groceries",
          description: updates.description || "Walmart",
          merchantName: updates.merchantName || "Walmart",
          date: updates.date || "2025-11-15",
          budgetMonth: updates.budgetMonth || "2025-11",
          updatedAt: updates.updatedAt,
        });
      });

    // Mock budget query
    dynamoHelpers.queryItems = jest.fn().mockResolvedValue([
      {
        PK: "FAMILY#family123",
        SK: "BUDGET#2025-11",
        budgetId: "budget123",
        groups: {
          expenses: [
            {
              id: "cat_groceries",
              name: "Groceries",
              plannedAmount: 500,
              spentAmount: 100,
            },
            {
              id: "cat_dining",
              name: "Dining Out",
              plannedAmount: 300,
              spentAmount: 0,
            },
          ],
        },
      },
    ]);

    // Mock budget update
    dynamoHelpers.putItem = jest.fn().mockResolvedValue({});
  });

  test("should update transaction amount", async () => {
    const event = {
      httpMethod: "PUT",
      pathParameters: { transactionId: "trans123" },
      headers: {
        Authorization: "Bearer valid-token",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        amount: 150, // Changed from 100 to 150
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);

    // Verify transaction was updated
    expect(dynamoHelpers.updateItem).toHaveBeenCalledWith(
      "FAMILY#family123",
      "TRANSACTION#trans123",
      expect.objectContaining({
        amount: 150,
      }),
    );

    const body = JSON.parse(response.body);
    expect(body.transaction.amount).toBe(150);
  });

  test("should update transaction category and recalculate budget", async () => {
    const event = {
      httpMethod: "PUT",
      pathParameters: { transactionId: "trans123" },
      headers: {
        Authorization: "Bearer valid-token",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        categoryId: "cat_dining", // Changed from cat_groceries to cat_dining
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);

    // Verify transaction was updated
    expect(dynamoHelpers.updateItem).toHaveBeenCalledWith(
      "FAMILY#family123",
      "TRANSACTION#trans123",
      expect.objectContaining({
        categoryId: "cat_dining",
      }),
    );

    // Verify budget was queried for recalculation
    expect(dynamoHelpers.queryItems).toHaveBeenCalled();

    // Verify budget was updated (subtract from old category, add to new category)
    expect(dynamoHelpers.putItem).toHaveBeenCalled();
  });

  test("should update transaction description and merchant", async () => {
    const event = {
      httpMethod: "PUT",
      pathParameters: { transactionId: "trans123" },
      headers: {
        Authorization: "Bearer valid-token",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        description: "Target Shopping",
        merchantName: "Target",
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);

    // Verify transaction was updated
    expect(dynamoHelpers.updateItem).toHaveBeenCalledWith(
      "FAMILY#family123",
      "TRANSACTION#trans123",
      expect.objectContaining({
        description: "Target Shopping",
        merchantName: "Target",
      }),
    );

    const body = JSON.parse(response.body);
    expect(body.transaction.description).toBe("Target Shopping");
    expect(body.transaction.merchantName).toBe("Target");
  });

  test("should update transaction date and budget month", async () => {
    const event = {
      httpMethod: "PUT",
      pathParameters: { transactionId: "trans123" },
      headers: {
        Authorization: "Bearer valid-token",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        date: "2025-12-01", // Changed from November to December
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);

    // Verify transaction was updated with new date and budget month
    expect(dynamoHelpers.updateItem).toHaveBeenCalledWith(
      "FAMILY#family123",
      "TRANSACTION#trans123",
      expect.objectContaining({
        date: "2025-12-01",
        budgetMonth: "2025-12", // Should extract month from date
      }),
    );
  });

  test("should update multiple fields at once", async () => {
    const event = {
      httpMethod: "PUT",
      pathParameters: { transactionId: "trans123" },
      headers: {
        Authorization: "Bearer valid-token",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        amount: 200,
        categoryId: "cat_dining",
        description: "Dinner at Restaurant",
        merchantName: "Olive Garden",
        date: "2025-11-20",
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);

    // Verify all fields were updated
    expect(dynamoHelpers.updateItem).toHaveBeenCalledWith(
      "FAMILY#family123",
      "TRANSACTION#trans123",
      expect.objectContaining({
        amount: 200,
        categoryId: "cat_dining",
        description: "Dinner at Restaurant",
        merchantName: "Olive Garden",
        date: "2025-11-20",
        budgetMonth: "2025-11",
      }),
    );
  });

  test("should return 404 if transaction not found", async () => {
    dynamoHelpers.getItem = jest.fn().mockResolvedValue(null);

    const event = {
      httpMethod: "PUT",
      pathParameters: { transactionId: "nonexistent" },
      headers: {
        Authorization: "Bearer valid-token",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        amount: 150,
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(404);

    const body = JSON.parse(response.body);
    expect(body.error).toContain("not found");
  });

  test("should validate amount is positive", async () => {
    const event = {
      httpMethod: "PUT",
      pathParameters: { transactionId: "trans123" },
      headers: {
        Authorization: "Bearer valid-token",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        amount: -50, // Invalid: negative amount
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.error).toContain("positive");
  });

  test("should validate transaction type", async () => {
    const event = {
      httpMethod: "PUT",
      pathParameters: { transactionId: "trans123" },
      headers: {
        Authorization: "Bearer valid-token",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        type: "invalid", // Invalid: must be income or expense
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.error).toContain("income");
    expect(body.error).toContain("expense");
  });

  test("should validate date format", async () => {
    const event = {
      httpMethod: "PUT",
      pathParameters: { transactionId: "trans123" },
      headers: {
        Authorization: "Bearer valid-token",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        date: "11/15/2025", // Invalid: must be YYYY-MM-DD
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.error).toContain("YYYY-MM-DD");
  });

  test("should check edit permission before updating", async () => {
    // Mock token with viewer role (no edit permission)
    const { parseIdToken } = require("/opt/nodejs/shared/token-parser");
    parseIdToken.mockReturnValueOnce({
      sub: "user456",
      "custom:userId": "user456",
      "custom:familyId": "family123",
      "custom:familyRole": "viewer", // Viewer cannot edit
    });

    const event = {
      httpMethod: "PUT",
      pathParameters: { transactionId: "trans123" },
      headers: {
        Authorization: "Bearer valid-token",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        amount: 150,
      }),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(403);

    const body = JSON.parse(response.body);
    expect(body.error).toContain("permission");
  });
});
