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
const { dynamoHelpers, getUserFromEvent, BudgetAccessResolver } = require('/opt/nodejs/utils');

// Import handler after mocks are set up
const { handler } = require('./index');

describe('Transaction Editing (Req 12)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default user
    getUserFromEvent.mockReturnValue({
      userId: 'user_123456789',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
    });

    // Default: resolveAccess succeeds with owner role, assertPermission is a no-op
    BudgetAccessResolver.resolveAccess.mockResolvedValue({
      budgetId: 'budget_test123',
      role: 'owner',
      budgetType: 'family',
      budgetStatus: 'active',
      subscriptionTier: 'free',
    });
    BudgetAccessResolver.assertPermission.mockImplementation(() => {});

    // Mock existing transaction using BUDGET# key
    dynamoHelpers.getItem.mockResolvedValue({
      PK: 'BUDGET#budget_test123',
      SK: 'TRANSACTION#trans123',
      entityType: 'TRANSACTION',
      transactionId: 'trans123',
      budgetId: 'budget_test123',
      amount: 100,
      type: 'expense',
      categoryId: 'cat_groceries',
      description: 'Walmart',
      merchantName: 'Walmart',
      date: '2025-11-15',
      budgetMonth: '2025-11',
      createdBy: 'user_123456789',
      createdByName: 'Test User',
      createdAt: '2025-11-15T10:00:00Z',
      updatedAt: '2025-11-15T10:00:00Z',
    });

    // Mock update to return updated transaction
    dynamoHelpers.updateItem.mockImplementation(async (pk, sk, updates) => {
      return {
        PK: pk,
        SK: sk,
        entityType: 'TRANSACTION',
        transactionId: 'trans123',
        budgetId: 'budget_test123',
        amount: updates.amount !== undefined ? updates.amount : 100,
        type: updates.type || 'expense',
        categoryId: updates.categoryId || 'cat_groceries',
        description: updates.description || 'Walmart',
        merchantName: updates.merchantName || 'Walmart',
        date: updates.date || '2025-11-15',
        budgetMonth: updates.budgetMonth || '2025-11',
        createdBy: 'user_123456789',
        createdByName: 'Test User',
        createdAt: '2025-11-15T10:00:00Z',
        updatedAt: updates.updatedAt,
      };
    });

    // Mock budget query for recalculation
    dynamoHelpers.queryByPK.mockResolvedValue([]);
  });

  test('should update transaction amount', async () => {
    const event = {
      httpMethod: 'PUT',
      path: '/transactions/trans123',
      pathParameters: { transactionId: 'trans123' },
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ amount: 150 }),
      requestContext: {
        authorizer: {
          claims: { 'custom:userId': 'user_123456789' },
        },
      },
    };

    const response = await handler(event, { awsRequestId: 'test-123' });

    expect(response.statusCode).toBe(200);

    // Verify transaction was updated with BUDGET# key
    expect(dynamoHelpers.updateItem).toHaveBeenCalledWith(
      'BUDGET#budget_test123',
      'TRANSACTION#trans123',
      expect.objectContaining({ amount: 150 }),
    );

    const body = JSON.parse(response.body);
    expect(body.data.amount).toBe(150);
  });

  test('should update transaction category', async () => {
    const event = {
      httpMethod: 'PUT',
      path: '/transactions/trans123',
      pathParameters: { transactionId: 'trans123' },
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ categoryId: 'cat_dining' }),
      requestContext: {
        authorizer: {
          claims: { 'custom:userId': 'user_123456789' },
        },
      },
    };

    const response = await handler(event, { awsRequestId: 'test-123' });

    expect(response.statusCode).toBe(200);

    expect(dynamoHelpers.updateItem).toHaveBeenCalledWith(
      'BUDGET#budget_test123',
      'TRANSACTION#trans123',
      expect.objectContaining({ categoryId: 'cat_dining' }),
    );
  });

  test('should update transaction description and merchant', async () => {
    const event = {
      httpMethod: 'PUT',
      path: '/transactions/trans123',
      pathParameters: { transactionId: 'trans123' },
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({
        description: 'Target Shopping',
        merchantName: 'Target',
      }),
      requestContext: {
        authorizer: {
          claims: { 'custom:userId': 'user_123456789' },
        },
      },
    };

    const response = await handler(event, { awsRequestId: 'test-123' });

    expect(response.statusCode).toBe(200);

    expect(dynamoHelpers.updateItem).toHaveBeenCalledWith(
      'BUDGET#budget_test123',
      'TRANSACTION#trans123',
      expect.objectContaining({
        description: 'Target Shopping',
        merchantName: 'Target',
      }),
    );

    const body = JSON.parse(response.body);
    expect(body.data.description).toBe('Target Shopping');
    expect(body.data.merchantName).toBe('Target');
  });

  test('should update transaction date and budget month', async () => {
    const event = {
      httpMethod: 'PUT',
      path: '/transactions/trans123',
      pathParameters: { transactionId: 'trans123' },
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ date: '2025-12-01' }),
      requestContext: {
        authorizer: {
          claims: { 'custom:userId': 'user_123456789' },
        },
      },
    };

    const response = await handler(event, { awsRequestId: 'test-123' });

    expect(response.statusCode).toBe(200);

    expect(dynamoHelpers.updateItem).toHaveBeenCalledWith(
      'BUDGET#budget_test123',
      'TRANSACTION#trans123',
      expect.objectContaining({
        date: '2025-12-01',
        budgetMonth: '2025-12',
      }),
    );
  });

  test('should return 404 if transaction not found', async () => {
    dynamoHelpers.getItem.mockResolvedValue(null);

    const event = {
      httpMethod: 'PUT',
      path: '/transactions/nonexistent',
      pathParameters: { transactionId: 'nonexistent' },
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ amount: 150 }),
      requestContext: {
        authorizer: {
          claims: { 'custom:userId': 'user_123456789' },
        },
      },
    };

    const response = await handler(event, { awsRequestId: 'test-123' });

    expect(response.statusCode).toBe(404);
  });

  test('should validate amount is positive', async () => {
    const event = {
      httpMethod: 'PUT',
      path: '/transactions/trans123',
      pathParameters: { transactionId: 'trans123' },
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ amount: -50 }),
      requestContext: {
        authorizer: {
          claims: { 'custom:userId': 'user_123456789' },
        },
      },
    };

    const response = await handler(event, { awsRequestId: 'test-123' });

    expect(response.statusCode).toBe(400);
  });

  test('should validate transaction type', async () => {
    const event = {
      httpMethod: 'PUT',
      path: '/transactions/trans123',
      pathParameters: { transactionId: 'trans123' },
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ type: 'invalid' }),
      requestContext: {
        authorizer: {
          claims: { 'custom:userId': 'user_123456789' },
        },
      },
    };

    const response = await handler(event, { awsRequestId: 'test-123' });

    expect(response.statusCode).toBe(400);
  });

  test('should validate date format', async () => {
    const event = {
      httpMethod: 'PUT',
      path: '/transactions/trans123',
      pathParameters: { transactionId: 'trans123' },
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ date: '11/15/2025' }),
      requestContext: {
        authorizer: {
          claims: { 'custom:userId': 'user_123456789' },
        },
      },
    };

    const response = await handler(event, { awsRequestId: 'test-123' });

    expect(response.statusCode).toBe(400);
  });

  test('should return 403 when viewer tries to edit transaction', async () => {
    // Mock assertPermission to throw 403 for viewer role
    BudgetAccessResolver.resolveAccess.mockResolvedValue({
      budgetId: 'budget_test123',
      role: 'viewer',
      budgetType: 'family',
      budgetStatus: 'active',
      subscriptionTier: 'free',
    });
    BudgetAccessResolver.assertPermission.mockImplementationOnce(() => {
      throw { statusCode: 403, message: 'You do not have permission to perform this action.' };
    });

    const event = {
      httpMethod: 'PUT',
      path: '/transactions/trans123',
      pathParameters: { transactionId: 'trans123' },
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ amount: 150 }),
      requestContext: {
        authorizer: {
          claims: { 'custom:userId': 'user_456' },
        },
      },
    };

    const response = await handler(event, { awsRequestId: 'test-123' });

    expect(response.statusCode).toBe(403);
  });

  test('should update accountId field', async () => {
    const event = {
      httpMethod: 'PUT',
      path: '/transactions/trans123',
      pathParameters: { transactionId: 'trans123' },
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ accountId: 'acc_checking123' }),
      requestContext: {
        authorizer: {
          claims: { 'custom:userId': 'user_123456789' },
        },
      },
    };

    const response = await handler(event, { awsRequestId: 'test-123' });

    expect(response.statusCode).toBe(200);

    expect(dynamoHelpers.updateItem).toHaveBeenCalledWith(
      'BUDGET#budget_test123',
      'TRANSACTION#trans123',
      expect.objectContaining({ accountId: 'acc_checking123' }),
    );
  });
});
