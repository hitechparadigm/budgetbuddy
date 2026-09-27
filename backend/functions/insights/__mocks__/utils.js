/**
 * Mock for /opt/nodejs/utils Lambda layer
 */

'use strict';

const successResponse = jest.fn((data, message) => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify({ success: true, data, message }),
}));

const errorResponse = {
  badRequest: jest.fn((message) => ({
    statusCode: 400,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ success: false, error: message }),
  })),
  notFound: jest.fn((message) => ({
    statusCode: 404,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ success: false, error: message }),
  })),
  unauthorized: jest.fn((message) => ({
    statusCode: 401,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ success: false, error: message }),
  })),
  internalError: jest.fn((message) => ({
    statusCode: 500,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ success: false, error: message }),
  })),
};

const parseRequestBody = jest.fn((body) => (body ? JSON.parse(body) : {}));

const getUserFromEvent = jest.fn(() => ({ userId: 'test-user-123' }));

const dynamoHelpers = {
  getItem: jest.fn().mockResolvedValue(null),
  putItem: jest.fn(),
  queryByPK: jest.fn().mockResolvedValue([]),
};

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const BudgetAccessResolver = {
  resolveAccess: jest.fn().mockResolvedValue({
    budgetId: 'budget_test_123',
    role: 'owner',
    budgetType: 'personal',
    budgetStatus: 'active',
    subscriptionTier: 'free',
  }),
  assertPermission: jest.fn(),
};

module.exports = {
  successResponse,
  errorResponse,
  parseRequestBody,
  getUserFromEvent,
  dynamoHelpers,
  logger,
  BudgetAccessResolver,
};
