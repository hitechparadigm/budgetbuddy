/**
 * Error Handling Utilities for BudgetBuddy Authentication
 *
 * Provides standardized error response formatting and custom error classes.
 */

const { getCorsHeaders } = require("./cors");

/**
 * Format error response for API Gateway
 *
 * @param {number} statusCode - HTTP status code
 * @param {string} error - Error type/name
 * @param {string} message - Error message
 * @param {*} details - Optional error details
 * @param {string} origin - Request origin for CORS headers
 * @returns {Object} API Gateway response object
 */
function formatErrorResponse(
  statusCode,
  error,
  message,
  details = null,
  origin = ""
) {
  const response = {
    error,
    message,
  };

  if (details) {
    response.details = details;
  }

  return {
    statusCode,
    headers: getCorsHeaders(origin),
    body: JSON.stringify(response),
  };
}

/**
 * Custom error class for validation errors
 */
class ValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = "ValidationError";
    this.errors = errors;
    this.statusCode = 400;
  }
}

/**
 * Custom error class for authentication errors
 */
class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthenticationError";
    this.statusCode = 401;
  }
}

/**
 * Custom error class for not found errors
 */
class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}

/**
 * Custom error class for conflict errors
 */
class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConflictError";
    this.statusCode = 409;
  }
}

/**
 * Handle error and return formatted response
 *
 * @param {Error} error - Error object
 * @param {string} origin - Request origin for CORS headers
 * @returns {Object} API Gateway response object
 */
function handleError(error, origin = "") {
  console.error("Error:", error);

  // Handle custom errors
  if (error instanceof ValidationError) {
    return formatErrorResponse(
      400,
      "Validation Error",
      error.message,
      error.errors,
      origin
    );
  }

  if (error instanceof AuthenticationError) {
    return formatErrorResponse(
      401,
      "Authentication Error",
      error.message,
      null,
      origin
    );
  }

  if (error instanceof NotFoundError) {
    return formatErrorResponse(404, "Not Found", error.message, null, origin);
  }

  if (error instanceof ConflictError) {
    return formatErrorResponse(409, "Conflict", error.message, null, origin);
  }

  // Handle AWS Cognito errors
  if (error.name === "UsernameExistsException") {
    return formatErrorResponse(
      409,
      "User Already Exists",
      "An account with this email address already exists",
      null,
      origin
    );
  }

  if (
    error.name === "NotAuthorizedException" ||
    error.name === "UserNotFoundException"
  ) {
    return formatErrorResponse(
      401,
      "Authentication Failed",
      "Invalid email or password",
      null,
      origin
    );
  }

  // Generic error
  return formatErrorResponse(
    500,
    "Internal Server Error",
    "An error occurred processing your request",
    error.message,
    origin
  );
}

module.exports = {
  formatErrorResponse,
  handleError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
};
