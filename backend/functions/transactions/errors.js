/**
 * Transaction-specific error classes
 * Provides better error handling and user feedback
 */

class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

class AuthorizationError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends Error {
  constructor(resource = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

class BusinessLogicError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BusinessLogicError';
  }
}

module.exports = {
  ValidationError,
  AuthorizationError,
  NotFoundError,
  BusinessLogicError
};
