/**
 * Transaction Editing Tests (Requirement 12)
 *
 * Tests for transaction editing functionality including:
 * - Edit updates (amount, category, description, merchant, date)
 * - Category changes with budget recalculation
 * - Amount changes with budget updates
 * - Validation and error handling
 */

// Mocks are loaded via jest.config.js moduleNameMapper
const { dynamoHelpers, getUserFromEvent } = require("/opt/nodejs/utils");
const { checkPermission } = require("/opt/nodejs/shared");

// Import handler after mocks are set up
const { handler } = require("./index");

describe("Transaction Editing (Req 12)", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default user with edit permission
    getUserFromEvent.mockReturnValue({
      userId: "user_123456789",
      familyId: "family123",
      familyRole: "primary",
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
    });

    // Default: no permission error
    checkPermission.mockReturnValue(null);

    // Mock existing transaction
    dynamoHelpers.getItem.mockResolvedValue({
      PK: "FAMILY#family123",
      SK: "TRANSACTION#trans123",
      entityType: "TRANSACTION",
      transactionId: "trans123",
      familyId: "family123",
      amount: 100,
      type: "expense",
      categoryId: "cat_groceries",
      description: "Walmart",
      merchantName: "Walmart",
      date: "2025-11-15",
      budgetMonth: "2025-11",
      createdBy: "user_123456789",
      createdByName: "Test User",
      createdAt: "2025-11-15T10:00:00Z",
      updatedAt: "2025-11-15T10:00:00Z",
    });

    // Mock update to return updated transaction
    dynamoHelpers.updateItem.mockImplementation(async (pk, sk, updates) => {
      return {
        PK: pk,
        SK: sk,
        entityType: "TRANSACTION",
        transactionId: "trans123",
        familyId: "family123",
        amount: updates.amount || 100,
        type: updates.type || "expense",
        categoryId: updates.categoryId || "cat_groceries",
        description: updates.description || "Walmart",
        merchantName: updates.merchantName || "Walmart",
        date: updates.date || "2025-11-15",
        budgetMonth: updates.budgetMonth || "2025-11",
        createdBy: "user_123456789",
        createdByName: "Test User",
        createdAt: "2025-11-15T10:00:00Z",
        updatedAt: updates.updatedAt,
      };
    });

    // Mock budget query for recalculation
    dynamoHelpers.queryByPK.mockResolvedValue([]);
  });

  test("should update transaction amount", async () => {
    const event = {
      httpMethod: "PUT",
      path: "/transactions/trans123",
      pathParameters: { transactionId: "trans123" },
      headers: {
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({
        amount: 150,
      }),
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": "user_123456789",
            "custom:familyId": "family123",
            "custom:familyRole": "primary",
          },
        },
      },
    };

    const response = await handler(event, { awsRequestId: "test-123" });

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
    expect(body.data.amount).toBe(150);
  });

  test("should update transaction category", async () => {
    const event = {
      httpMethod: "PUT",
      path: "/transactions/trans123",
      pathParameters: { transactionId: "trans123" },
      headers: {
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({
        categoryId: "cat_dining",
      }),
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": "user_123456789",
            "custom:familyId": "family123",
            "custom:familyRole": "primary",
          },
        },
      },
    };

    const response = await handler(event, { awsRequestId: "test-123" });

    expect(response.statusCode).toBe(200);

    // Verify transaction was updated
    expect(dynamoHelpers.updateItem).toHaveBeenCalledWith(
      "FAMILY#family123",
      "TRANSACTION#trans123",
      expect.objectContaining({
        categoryId: "cat_dining",
      }),
    );
  });

  test("should update transaction description and merchant", async () => {
    const event = {
      httpMethod: "PUT",
      path: "/transactions/trans123",
      pathParameters: { transactionId: "trans123" },
      headers: {
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({
        description: "Target Shopping",
        merchantName: "Target",
      }),
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": "user_123456789",
            "custom:familyId": "family123",
            "custom:familyRole": "primary",
          },
        },
      },
    };

    const response = await handler(event, { awsRequestId: "test-123" });

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
    expect(body.data.description).toBe("Target Shopping");
    expect(body.data.merchantName).toBe("Target");
  });

  test("should update transaction date and budget month", async () => {
    const event = {
      httpMethod: "PUT",
      path: "/transactions/trans123",
      pathParameters: { transactionId: "trans123" },
      headers: {
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({
        date: "2025-12-01",
      }),
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": "user_123456789",
            "custom:familyId": "family123",
            "custom:familyRole": "primary",
          },
        },
      },
    };

    const response = await handler(event, { awsRequestId: "test-123" });

    expect(response.statusCode).toBe(200);

    // Verify transaction was updated with new date and budget month
    expect(dynamoHelpers.updateItem).toHaveBeenCalledWith(
      "FAMILY#family123",
      "TRANSACTION#trans123",
      expect.objectContaining({
        date: "2025-12-01",
        budgetMonth: "2025-12",
      }),
    );
  });

  test("should return 404 if transaction not found", async () => {
    dynamoHelpers.getItem.mockResolvedValue(null);

    const event = {
      httpMethod: "PUT",
      path: "/transactions/nonexistent",
      pathParameters: { transactionId: "nonexistent" },
      headers: {
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({
        amount: 150,
      }),
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": "user_123456789",
            "custom:familyId": "family123",
            "custom:familyRole": "primary",
          },
        },
      },
    };

    const response = await handler(event, { awsRequestId: "test-123" });

    expect(response.statusCode).toBe(404);
  });

  test("should validate amount is positive", async () => {
    const event = {
      httpMethod: "PUT",
      path: "/transactions/trans123",
      pathParameters: { transactionId: "trans123" },
      headers: {
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({
        amount: -50,
      }),
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": "user_123456789",
            "custom:familyId": "family123",
            "custom:familyRole": "primary",
          },
        },
      },
    };

    const response = await handler(event, { awsRequestId: "test-123" });

    expect(response.statusCode).toBe(400);
  });

  test("should validate transaction type", async () => {
    const event = {
      httpMethod: "PUT",
      path: "/transactions/trans123",
      pathParameters: { transactionId: "trans123" },
      headers: {
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({
        type: "invalid",
      }),
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": "user_123456789",
            "custom:familyId": "family123",
            "custom:familyRole": "primary",
          },
        },
      },
    };

    const response = await handler(event, { awsRequestId: "test-123" });

    expect(response.statusCode).toBe(400);
  });

  test("should validate date format", async () => {
    const event = {
      httpMethod: "PUT",
      path: "/transactions/trans123",
      pathParameters: { transactionId: "trans123" },
      headers: {
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({
        date: "11/15/2025",
      }),
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": "user_123456789",
            "custom:familyId": "family123",
            "custom:familyRole": "primary",
          },
        },
      },
    };

    const response = await handler(event, { awsRequestId: "test-123" });

    expect(response.statusCode).toBe(400);
  });

  test("should check edit permission before updating", async () => {
    // Mock permission denied
    checkPermission.mockReturnValue({
      statusCode: 403,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Permission denied" }),
    });

    const event = {
      httpMethod: "PUT",
      path: "/transactions/trans123",
      pathParameters: { transactionId: "trans123" },
      headers: {
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({
        amount: 150,
      }),
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": "user_456",
            "custom:familyId": "family123",
            "custom:familyRole": "viewer",
          },
        },
      },
    };

    const response = await handler(event, { awsRequestId: "test-123" });

    expect(response.statusCode).toBe(403);
  });

  test("should update accountId field", async () => {
    const event = {
      httpMethod: "PUT",
      path: "/transactions/trans123",
      pathParameters: { transactionId: "trans123" },
      headers: {
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({
        accountId: "acc_checking123",
      }),
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": "user_123456789",
            "custom:familyId": "family123",
            "custom:familyRole": "primary",
          },
        },
      },
    };

    const response = await handler(event, { awsRequestId: "test-123" });

    expect(response.statusCode).toBe(200);

    // Verify accountId was updated
    expect(dynamoHelpers.updateItem).toHaveBeenCalledWith(
      "FAMILY#family123",
      "TRANSACTION#trans123",
      expect.objectContaining({
        accountId: "acc_checking123",
      }),
    );
  });
});
