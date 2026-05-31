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
  unauthorized: jest.fn((message) => ({
    statusCode: 401,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ success: false, error: message }),
  })),
  forbidden: jest.fn((message) => ({
    statusCode: 403,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ success: false, error: message }),
  })),
  notFound: jest.fn((message) => ({
    statusCode: 404,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ success: false, error: message }),
  })),
  conflict: jest.fn((message) => ({
    statusCode: 409,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ success: false, error: message }),
  })),
  internalError: jest.fn((message) => ({
    statusCode: 500,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ success: false, error: message }),
  })),
};

const parseRequestBody = jest.fn((body) => {
  if (!body) return {};
  try { return JSON.parse(body); } catch { return {}; }
});

const getUserFromEvent = jest.fn(() => ({
  userId: 'test-user-id',
}));

const generateId = {
  budget: jest.fn(() => `budget-${Date.now()}`),
  invitation: jest.fn(() => `inv-${Date.now()}`),
  custom: jest.fn((prefix) => `${prefix}-${Date.now()}`),
};

const dynamoHelpers = {
  putItem: jest.fn(),
  getItem: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn(),
  queryByPK: jest.fn(),
  queryByGSI: jest.fn(),
  scan: jest.fn(),
};

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const BudgetAccessResolver = {
  resolveAccess: jest.fn().mockResolvedValue({
    budgetId: 'budget-test-123',
    role: 'owner',
    budgetType: 'family',
    budgetStatus: 'active',
    subscriptionTier: 'free',
  }),
  assertPermission: jest.fn(), // no-op by default (permission granted)
};

module.exports = {
  successResponse,
  errorResponse,
  parseRequestBody,
  getUserFromEvent,
  generateId,
  dynamoHelpers,
  logger,
  BudgetAccessResolver,
};
