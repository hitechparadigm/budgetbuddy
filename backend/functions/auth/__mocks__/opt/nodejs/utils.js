/**
 * Mock for /opt/nodejs/utils Lambda layer
 */

const dynamoHelpers = {
  putItem: jest.fn(),
  getItem: jest.fn(),
  updateItem: jest.fn(),
  queryByPK: jest.fn(),
  deleteItem: jest.fn(),
};

const FamilyIdResolver = {
  resolve: jest.fn().mockImplementation((userId, familyId) => {
    return familyId || `family_${userId}`;
  }),
};

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const successResponse = jest.fn((data, message) => ({
  statusCode: 200,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ ...data, message }),
}));

const errorResponse = {
  badRequest: jest.fn((message) => ({
    statusCode: 400,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ error: "Bad Request", message }),
  })),
  unauthorized: jest.fn((message) => ({
    statusCode: 401,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ error: "Unauthorized", message }),
  })),
  notFound: jest.fn((message) => ({
    statusCode: 404,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ error: "Not Found", message }),
  })),
  internalError: jest.fn((message) => ({
    statusCode: 500,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ error: "Internal Server Error", message }),
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

const getUserFromEvent = jest.fn((event) => {
  const claims = event.requestContext?.authorizer?.claims || {};
  return {
    userId: claims["custom:userId"] || "user_test",
    familyId: claims["custom:familyId"] || "family_test",
    familyRole: claims["custom:familyRole"] || "primary",
    firstName: claims["given_name"] || "Test",
    lastName: claims["family_name"] || "User",
    email: claims["email"] || "test@example.com",
  };
});

const generateId = {
  user: jest.fn(() => `user_${Date.now()}`),
  family: jest.fn(() => `family_${Date.now()}`),
  budget: jest.fn(() => `budget_${Date.now()}`),
  transaction: jest.fn(() => `trans_${Date.now()}`),
};

module.exports = {
  dynamoHelpers,
  FamilyIdResolver,
  logger,
  successResponse,
  errorResponse,
  parseRequestBody,
  getUserFromEvent,
  generateId,
};
