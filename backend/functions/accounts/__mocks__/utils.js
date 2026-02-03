/**
 * Mock for Lambda layer utils
 */

const successResponse = jest.fn((data, message) => ({
  statusCode: 200,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify({ success: true, data, message }),
}));

const errorResponse = {
  badRequest: jest.fn((message) => ({
    statusCode: 400,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ success: false, error: message }),
  })),
  notFound: jest.fn((message) => ({
    statusCode: 404,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ success: false, error: message }),
  })),
  unauthorized: jest.fn((message) => ({
    statusCode: 401,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ success: false, error: message }),
  })),
  internalError: jest.fn((message) => ({
    statusCode: 500,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ success: false, error: message }),
  })),
  custom: jest.fn((statusCode, message) => ({
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ success: false, error: message }),
  })),
};

const parseRequestBody = jest.fn((body) => {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
});

const getUserFromEvent = jest.fn(() => ({
  userId: "test-user-id",
  familyId: "test-family-id",
  familyRole: "primary",
}));

const generateId = {
  custom: jest.fn(
    (prefix) =>
      `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  ),
  budget: jest.fn(() => `budget-${Date.now()}`),
  transaction: jest.fn(() => `txn-${Date.now()}`),
};

const dynamoHelpers = {
  putItem: jest.fn(),
  getItem: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn(),
  queryByPK: jest.fn(),
  queryByGSI: jest.fn(),
};

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const FamilyIdResolver = {
  resolveFamilyId: jest.fn(
    (userId, familyId) => familyId || `family_${userId}`,
  ),
  logFamilyIdResolution: jest.fn(),
};

module.exports = {
  successResponse,
  errorResponse,
  parseRequestBody,
  getUserFromEvent,
  generateId,
  dynamoHelpers,
  logger,
  FamilyIdResolver,
};
