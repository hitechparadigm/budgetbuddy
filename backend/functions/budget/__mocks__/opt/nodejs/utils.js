// Mock for /opt/nodejs/utils layer
module.exports = {
  successResponse: jest.fn((data, message) => ({
    statusCode: 200,
    body: JSON.stringify({ success: true, data, message }),
  })),
  errorResponse: {
    badRequest: jest.fn((message) => ({
      statusCode: 400,
      body: JSON.stringify({ success: false, error: message }),
    })),
    notFound: jest.fn((message) => ({
      statusCode: 404,
      body: JSON.stringify({ success: false, error: message }),
    })),
    internalError: jest.fn((message) => ({
      statusCode: 500,
      body: JSON.stringify({ success: false, error: message }),
    })),
    unauthorized: jest.fn((message) => ({
      statusCode: 401,
      body: JSON.stringify({ success: false, error: message }),
    })),
    conflict: jest.fn((message) => ({
      statusCode: 409,
      body: JSON.stringify({ success: false, error: message }),
    })),
  },
  parseRequestBody: jest.fn((body) => JSON.parse(body)),
  getUserFromEvent: jest.fn(() => ({
    userId: "user_123456789",
    familyId: null, // Simulates missing custom:familyId in JWT token
    firstName: "John",
    lastName: "Doe",
    email: "test@example.com",
  })),
  generateId: {
    budget: jest.fn(() => "budget_" + Date.now()),
  },
  dynamoHelpers: {
    putItem: jest.fn(),
    queryByPK: jest.fn(),
    getItem: jest.fn(),
    updateItem: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  FamilyIdResolver: {
    resolveFamilyId: jest.fn(
      async (userId, familyId) => familyId || `FAMILY#${userId}`,
    ),
    logFamilyIdResolution: jest.fn(),
  },
};
