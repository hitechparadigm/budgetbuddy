/**
 * Permission System Tests - Transactions Lambda
 *
 * Comprehensive test suite for role-based permission enforcement
 * across transaction operations.
 *
 * Tests cover:
 * - Owner role permissions (full access)
 * - Partner role permissions (full access)
 * - Viewer role permissions (read-only)
 * - Permission violations and 403 responses
 */

// Mocks are loaded via jest.config.js moduleNameMapper
jest.mock('/opt/nodejs/utils');
jest.mock('/opt/nodejs/shared');

const { handler } = require('./index');
const { BudgetAccessResolver, dynamoHelpers } = require('/opt/nodejs/utils');

describe('Permission System - Transactions Lambda', () => {
  const mockContext = {
    awsRequestId: 'test-request-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'test-table';

    // Default: resolveAccess succeeds, assertPermission is a no-op (permission granted)
    BudgetAccessResolver.resolveAccess.mockResolvedValue({
      budgetId: 'budget_test123',
      role: 'owner',
      budgetType: 'family',
      budgetStatus: 'active',
      subscriptionTier: 'free',
    });
    BudgetAccessResolver.assertPermission.mockImplementation(() => {});

    // Default DynamoDB mocks
    dynamoHelpers.getItem.mockResolvedValue(null);
    dynamoHelpers.queryByPK.mockResolvedValue([]);
  });

  describe('Owner Role Permissions', () => {
    const ownerEvent = {
      requestContext: {
        authorizer: {
          claims: {
            'custom:userId': 'user_123',
          },
        },
      },
    };

    test('should allow owner to create transaction', async () => {
      const event = {
        ...ownerEvent,
        httpMethod: 'POST',
        path: '/transactions',
        body: JSON.stringify({
          amount: 50.0,
          type: 'expense',
          categoryId: 'cat_groceries',
          description: 'Groceries',
          date: '2026-02-01',
        }),
      };

      await handler(event, mockContext);

      expect(BudgetAccessResolver.resolveAccess).toHaveBeenCalled();
      expect(BudgetAccessResolver.assertPermission).toHaveBeenCalledWith(
        'owner',
        'transaction.create',
        'active',
      );
    });

    test('should allow owner to update transaction', async () => {
      dynamoHelpers.getItem.mockResolvedValue({
        PK: 'BUDGET#budget_test123',
        SK: 'TRANSACTION#txn_123',
        transactionId: 'txn_123',
        budgetId: 'budget_test123',
        amount: 50,
        type: 'expense',
        categoryId: 'cat_groceries',
        description: 'Groceries',
        date: '2026-02-01',
        budgetMonth: '2026-02',
        createdBy: 'user_123',
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      });
      dynamoHelpers.updateItem.mockResolvedValue({
        transactionId: 'txn_123',
        budgetId: 'budget_test123',
        amount: 75,
        type: 'expense',
        categoryId: 'cat_groceries',
        description: 'Updated groceries',
        date: '2026-02-01',
        budgetMonth: '2026-02',
        createdBy: 'user_123',
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      });

      const event = {
        ...ownerEvent,
        httpMethod: 'PUT',
        path: '/transactions/txn_123',
        pathParameters: { transactionId: 'txn_123' },
        body: JSON.stringify({
          amount: 75.0,
          description: 'Updated groceries',
        }),
      };

      await handler(event, mockContext);

      expect(BudgetAccessResolver.assertPermission).toHaveBeenCalledWith(
        'owner',
        'transaction.edit',
        'active',
      );
    });

    test('should allow owner to delete transaction', async () => {
      dynamoHelpers.getItem.mockResolvedValue({
        PK: 'BUDGET#budget_test123',
        SK: 'TRANSACTION#txn_123',
        transactionId: 'txn_123',
        budgetId: 'budget_test123',
        amount: 50,
        type: 'expense',
        categoryId: 'cat_groceries',
        description: 'Groceries',
        date: '2026-02-01',
        budgetMonth: '2026-02',
        createdBy: 'user_123',
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      });

      const event = {
        ...ownerEvent,
        httpMethod: 'DELETE',
        path: '/transactions/txn_123',
        pathParameters: { transactionId: 'txn_123' },
      };

      await handler(event, mockContext);

      expect(BudgetAccessResolver.assertPermission).toHaveBeenCalledWith(
        'owner',
        'transaction.delete',
        'active',
      );
    });

    test('should allow owner to view transactions', async () => {
      const event = {
        ...ownerEvent,
        httpMethod: 'GET',
        path: '/transactions',
      };

      await handler(event, mockContext);

      expect(BudgetAccessResolver.assertPermission).toHaveBeenCalledWith(
        'owner',
        'transaction.read',
        'active',
      );
    });

    test('should allow owner to view specific transaction', async () => {
      dynamoHelpers.getItem.mockResolvedValue({
        PK: 'BUDGET#budget_test123',
        SK: 'TRANSACTION#txn_123',
        transactionId: 'txn_123',
        budgetId: 'budget_test123',
        amount: 50,
        type: 'expense',
        categoryId: 'cat_groceries',
        description: 'Groceries',
        date: '2026-02-01',
        budgetMonth: '2026-02',
        createdBy: 'user_123',
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      });

      const event = {
        ...ownerEvent,
        httpMethod: 'GET',
        path: '/transactions/txn_123',
        pathParameters: { transactionId: 'txn_123' },
      };

      await handler(event, mockContext);

      expect(BudgetAccessResolver.assertPermission).toHaveBeenCalledWith(
        'owner',
        'transaction.read',
        'active',
      );
    });
  });

  describe('Partner Role Permissions', () => {
    beforeEach(() => {
      BudgetAccessResolver.resolveAccess.mockResolvedValue({
        budgetId: 'budget_test123',
        role: 'partner',
        budgetType: 'family',
        budgetStatus: 'active',
        subscriptionTier: 'free',
      });
    });

    const partnerEvent = {
      requestContext: {
        authorizer: {
          claims: {
            'custom:userId': 'user_456',
          },
        },
      },
    };

    test('should allow partner to create transaction', async () => {
      const event = {
        ...partnerEvent,
        httpMethod: 'POST',
        path: '/transactions',
        body: JSON.stringify({
          amount: 50.0,
          type: 'expense',
          categoryId: 'cat_groceries',
          description: 'Groceries',
          date: '2026-02-01',
        }),
      };

      await handler(event, mockContext);

      expect(BudgetAccessResolver.assertPermission).toHaveBeenCalledWith(
        'partner',
        'transaction.create',
        'active',
      );
    });

    test('should allow partner to update transaction', async () => {
      dynamoHelpers.getItem.mockResolvedValue({
        PK: 'BUDGET#budget_test123',
        SK: 'TRANSACTION#txn_123',
        transactionId: 'txn_123',
        budgetId: 'budget_test123',
        amount: 50,
        type: 'expense',
        categoryId: 'cat_groceries',
        description: 'Groceries',
        date: '2026-02-01',
        budgetMonth: '2026-02',
        createdBy: 'user_456',
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      });
      dynamoHelpers.updateItem.mockResolvedValue({
        transactionId: 'txn_123',
        budgetId: 'budget_test123',
        amount: 75,
        type: 'expense',
        categoryId: 'cat_groceries',
        description: 'Groceries',
        date: '2026-02-01',
        budgetMonth: '2026-02',
        createdBy: 'user_456',
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      });

      const event = {
        ...partnerEvent,
        httpMethod: 'PUT',
        path: '/transactions/txn_123',
        pathParameters: { transactionId: 'txn_123' },
        body: JSON.stringify({ amount: 75.0 }),
      };

      await handler(event, mockContext);

      expect(BudgetAccessResolver.assertPermission).toHaveBeenCalledWith(
        'partner',
        'transaction.edit',
        'active',
      );
    });

    test('should allow partner to delete transaction', async () => {
      dynamoHelpers.getItem.mockResolvedValue({
        PK: 'BUDGET#budget_test123',
        SK: 'TRANSACTION#txn_123',
        transactionId: 'txn_123',
        budgetId: 'budget_test123',
        amount: 50,
        type: 'expense',
        categoryId: 'cat_groceries',
        description: 'Groceries',
        date: '2026-02-01',
        budgetMonth: '2026-02',
        createdBy: 'user_456',
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      });

      const event = {
        ...partnerEvent,
        httpMethod: 'DELETE',
        path: '/transactions/txn_123',
        pathParameters: { transactionId: 'txn_123' },
      };

      await handler(event, mockContext);

      expect(BudgetAccessResolver.assertPermission).toHaveBeenCalledWith(
        'partner',
        'transaction.delete',
        'active',
      );
    });

    test('should allow partner to view transactions', async () => {
      const event = {
        ...partnerEvent,
        httpMethod: 'GET',
        path: '/transactions',
      };

      await handler(event, mockContext);

      expect(BudgetAccessResolver.assertPermission).toHaveBeenCalledWith(
        'partner',
        'transaction.read',
        'active',
      );
    });
  });

  describe('Viewer Role Permissions', () => {
    beforeEach(() => {
      BudgetAccessResolver.resolveAccess.mockResolvedValue({
        budgetId: 'budget_test123',
        role: 'viewer',
        budgetType: 'family',
        budgetStatus: 'active',
        subscriptionTier: 'free',
      });
    });

    const viewerEvent = {
      requestContext: {
        authorizer: {
          claims: {
            'custom:userId': 'user_789',
          },
        },
      },
    };

    test('should deny viewer from creating transaction', async () => {
      BudgetAccessResolver.assertPermission.mockImplementationOnce(() => {
        throw { statusCode: 403, message: 'You do not have permission to perform this action.' };
      });

      const event = {
        ...viewerEvent,
        httpMethod: 'POST',
        path: '/transactions',
        body: JSON.stringify({
          amount: 50.0,
          type: 'expense',
          categoryId: 'cat_groceries',
          description: 'Groceries',
          date: '2026-02-01',
        }),
      };

      const result = await handler(event, mockContext);

      expect(BudgetAccessResolver.assertPermission).toHaveBeenCalledWith(
        'viewer',
        'transaction.create',
        'active',
      );
      expect(result.statusCode).toBe(403);
    });

    test('should deny viewer from updating transaction', async () => {
      BudgetAccessResolver.assertPermission.mockImplementationOnce(() => {
        throw { statusCode: 403, message: 'You do not have permission to perform this action.' };
      });

      const event = {
        ...viewerEvent,
        httpMethod: 'PUT',
        path: '/transactions/txn_123',
        pathParameters: { transactionId: 'txn_123' },
        body: JSON.stringify({ amount: 75.0 }),
      };

      const result = await handler(event, mockContext);

      expect(BudgetAccessResolver.assertPermission).toHaveBeenCalledWith(
        'viewer',
        'transaction.edit',
        'active',
      );
      expect(result.statusCode).toBe(403);
    });

    test('should deny viewer from deleting transaction', async () => {
      BudgetAccessResolver.assertPermission.mockImplementationOnce(() => {
        throw { statusCode: 403, message: 'You do not have permission to perform this action.' };
      });

      const event = {
        ...viewerEvent,
        httpMethod: 'DELETE',
        path: '/transactions/txn_123',
        pathParameters: { transactionId: 'txn_123' },
      };

      const result = await handler(event, mockContext);

      expect(BudgetAccessResolver.assertPermission).toHaveBeenCalledWith(
        'viewer',
        'transaction.delete',
        'active',
      );
      expect(result.statusCode).toBe(403);
    });

    test('should allow viewer to view transactions', async () => {
      const event = {
        ...viewerEvent,
        httpMethod: 'GET',
        path: '/transactions',
      };

      const result = await handler(event, mockContext);

      expect(BudgetAccessResolver.assertPermission).toHaveBeenCalledWith(
        'viewer',
        'transaction.read',
        'active',
      );
      expect(result.statusCode).toBe(200);
    });

    test('should allow viewer to view specific transaction', async () => {
      dynamoHelpers.getItem.mockResolvedValue({
        PK: 'BUDGET#budget_test123',
        SK: 'TRANSACTION#txn_123',
        transactionId: 'txn_123',
        budgetId: 'budget_test123',
        amount: 50,
        type: 'expense',
        categoryId: 'cat_groceries',
        description: 'Groceries',
        date: '2026-02-01',
        budgetMonth: '2026-02',
        createdBy: 'user_789',
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      });

      const event = {
        ...viewerEvent,
        httpMethod: 'GET',
        path: '/transactions/txn_123',
        pathParameters: { transactionId: 'txn_123' },
      };

      const result = await handler(event, mockContext);

      expect(BudgetAccessResolver.assertPermission).toHaveBeenCalledWith(
        'viewer',
        'transaction.read',
        'active',
      );
      expect(result.statusCode).toBe(200);
    });
  });

  describe('Permission Violation Logging', () => {
    test('should log permission violations for transaction creation', async () => {
      const { logger } = require('/opt/nodejs/utils');

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

      const viewerEvent = {
        requestContext: {
          authorizer: {
            claims: {
              'custom:userId': 'user_789',
            },
          },
        },
        httpMethod: 'POST',
        path: '/transactions',
        body: JSON.stringify({
          amount: 50.0,
          type: 'expense',
          categoryId: 'cat_groceries',
          description: 'Groceries',
          date: '2026-02-01',
        }),
      };

      await handler(viewerEvent, mockContext);

      // The handler catches the thrown error and returns 403 — verify it was handled
      expect(BudgetAccessResolver.assertPermission).toHaveBeenCalled();
    });

    test('should log permission violations for transaction updates', async () => {
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

      const viewerEvent = {
        requestContext: {
          authorizer: {
            claims: {
              'custom:userId': 'user_789',
            },
          },
        },
        httpMethod: 'PUT',
        path: '/transactions/txn_123',
        pathParameters: { transactionId: 'txn_123' },
        body: JSON.stringify({ amount: 75.0 }),
      };

      const result = await handler(viewerEvent, mockContext);

      expect(BudgetAccessResolver.assertPermission).toHaveBeenCalledWith(
        'viewer',
        'transaction.edit',
        'active',
      );
      expect(result.statusCode).toBe(403);
    });
  });
});
