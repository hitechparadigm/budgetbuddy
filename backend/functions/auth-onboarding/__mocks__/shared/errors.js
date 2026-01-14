class ValidationError extends Error {
  constructor(errors) {
    super("Validation failed");
    this.errors = errors;
    this.statusCode = 400;
  }
}

class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 401;
  }
}

module.exports = {
  formatErrorResponse: jest.fn((error, origin) => ({
    statusCode: error.statusCode || 400,
    headers: { "Access-Control-Allow-Origin": origin },
    body: JSON.stringify({ error: error.message }),
  })),
  ValidationError,
  AuthenticationError,
};
