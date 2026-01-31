/**
 * Mock for /opt/nodejs/utils Lambda layer
 * Used in transaction Lambda tests
 */

module.exports = {
  successResponse: jest.fn((data, message) => ({
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      success: true,
      message: message || "Success",
      data,
    }),
  })),

  errorResponse: {
    badRequest: jest.fn((message) => ({
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Bad Request",
        message,
      }),
    })),

    unauthorized: jest.fn((message) => ({
      statusCode: 401,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Unauthorized",
        message,
      }),
    })),

    notFound: jest.fn((message) => ({
      statusCode: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Not Found",
        message,
      }),
    })),

    internalError: jest.fn((message) => ({
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Internal Server Error",
        message,
      }),
    })),
  },

  parseRequestBody: jest.fn((body) => {
    if (!body) return {};
    if (typeof body === "string") {
      return JSON.parse(body);
    }
    return body;
  }),

  getUserFromEvent: jest.fn((event) => {
    const claims = event.requestContext?.authorizer?.claims || {};
    return {
      userId: claims["custom:userId"] || "user_123456789",
      familyId: claims["custom:familyId"] || null,
      familyRole: claims["custom:familyRole"] || "primary",
      firstName: claims.given_name || "Test",
      lastName: claims.family_name || "User",
      email: claims.email || "test@example.com",
    };
  }),

  generateId: {
    transaction: jest.fn(() => `txn_${Date.now()}`),
    budget: jest.fn(() => `budget_${Date.now()}`),
    user: jest.fn(() => `user_${Date.now()}`),
  },

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

  FamilyIdResolver: {
    resolveFamilyId: jest.fn().mockResolvedValue("FAMILY#user_123456789"),
  },
};
