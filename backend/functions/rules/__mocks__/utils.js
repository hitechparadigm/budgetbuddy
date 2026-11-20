/**
 * Mock of the common Lambda layer (`/opt/nodejs/utils`) for the rules tests.
 *
 * Exposes exactly the surface the real layer exports — in particular
 * `dynamoHelpers` has only getItem, putItem, queryByPK and updateItem (no
 * `query`, no `deleteItem`), and `errorResponse` has `internalError` but no
 * `internal`. Mocking the real surface is what makes a test able to catch a
 * handler calling something that does not exist.
 */

const createResponse = (statusCode, data, message) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify({ success: statusCode < 400, message, data }),
});

const successResponse = (data, message = 'Success') => createResponse(200, data, message);

const errorResponse = {
  badRequest: (message = 'Bad Request') => createResponse(400, null, message),
  unauthorized: (message = 'Unauthorized') => createResponse(401, null, message),
  forbidden: (message = 'Forbidden') => createResponse(403, null, message),
  notFound: (message = 'Not Found') => createResponse(404, null, message),
  conflict: (message = 'Conflict') => createResponse(409, null, message),
  internalError: (message = 'Internal Server Error') => createResponse(500, null, message),
};

const dynamoHelpers = {
  getItem: jest.fn(),
  putItem: jest.fn(),
  queryByPK: jest.fn(),
  updateItem: jest.fn(),
};

const BudgetAccessResolver = {
  resolveAccess: jest.fn(),
  assertPermission: jest.fn(),
};

module.exports = {
  successResponse,
  errorResponse,
  parseRequestBody: (body) => (body ? JSON.parse(body) : {}),
  getUserFromEvent: jest.fn(() => ({ userId: 'user_test' })),
  generateId: { custom: (prefix) => `${prefix}_generated` },
  dynamoHelpers,
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  BudgetAccessResolver,
};
