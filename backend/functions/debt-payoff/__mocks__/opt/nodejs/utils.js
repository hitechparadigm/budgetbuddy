/**
 * Mock for /opt/nodejs/utils Lambda layer
 */

module.exports = {
  successResponse: (data, message, statusCode = 200) => ({
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ success: true, message, data }),
  }),

  errorResponse: {
    badRequest: (message) => ({
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ success: false, message }),
    }),
    unauthorized: (message) => ({
      statusCode: 401,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ success: false, message }),
    }),
    notFound: (message) => ({
      statusCode: 404,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ success: false, message }),
    }),
    internalError: (message) => ({
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ success: false, message }),
    }),
  },

  parseRequestBody: (event) => {
    if (!event.body) return {};
    try {
      return typeof event.body === "string"
        ? JSON.parse(event.body)
        : event.body;
    } catch {
      return {};
    }
  },

  getUserFromEvent: (event) => {
    const claims = event.requestContext?.authorizer?.claims || {};
    return {
      userId: claims.sub || "test-user-id",
      email: claims.email || "test@example.com",
      familyId: claims["custom:familyId"] || null,
    };
  },

  generateId: (prefix) =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

  dynamoHelpers: {
    putItem: jest.fn().mockResolvedValue({}),
    getItem: jest.fn().mockResolvedValue(null),
    updateItem: jest.fn().mockResolvedValue({}),
    deleteItem: jest.fn().mockResolvedValue({}),
    queryByPK: jest.fn().mockResolvedValue([]),
    queryByGSI: jest.fn().mockResolvedValue([]),
  },

  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },

  BudgetAccessResolver: {
    resolveAccess: jest.fn().mockResolvedValue({
      budgetId: 'budget_test_123',
      role: 'owner',
      budgetType: 'personal',
      budgetStatus: 'active',
      subscriptionTier: 'free',
    }),
    assertPermission: jest.fn(),
  },
};
