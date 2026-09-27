/**
 * Mock for /opt/nodejs/utils Lambda layer
 */

'use strict';

const getUserFromEvent = jest.fn(() => ({ userId: 'test-user-id' }));

const dynamoHelpers = {
  queryByPK: jest.fn().mockResolvedValue([]),
};

const BudgetAccessResolver = {
  resolveAccess: jest.fn().mockResolvedValue({
    budgetId: 'budget-test-123',
    role: 'owner',
    budgetType: 'family',
    budgetStatus: 'active',
    subscriptionTier: 'free',
  }),
  assertPermission: jest.fn(),
};

module.exports = { getUserFromEvent, dynamoHelpers, BudgetAccessResolver };
