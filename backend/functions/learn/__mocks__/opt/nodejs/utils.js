module.exports = {
  successResponse: (data, message) => ({
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ success: true, message, data }),
  }),
  errorResponse: {
    badRequest: (msg) => ({
      statusCode: 400,
      body: JSON.stringify({ success: false, message: msg }),
    }),
    unauthorized: (msg) => ({
      statusCode: 401,
      body: JSON.stringify({ success: false, message: msg }),
    }),
    forbidden: (msg) => ({
      statusCode: 403,
      body: JSON.stringify({ success: false, message: msg }),
    }),
    notFound: (msg) => ({
      statusCode: 404,
      body: JSON.stringify({ success: false, message: msg }),
    }),
    internalError: (msg) => ({
      statusCode: 500,
      body: JSON.stringify({ success: false, message: msg }),
    }),
  },
  parseRequestBody: (event) => JSON.parse(event.body || "{}"),
  getUserFromEvent: jest.fn(),
  dynamoHelpers: {
    getItem: jest.fn(),
    putItem: jest.fn(),
    query: jest.fn(),
    scan: jest.fn(),
    updateItem: jest.fn(),
    deleteItem: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
};
