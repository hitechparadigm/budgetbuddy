/**
 * BudgetBuddy Authentication Shared Utilities
 *
 * This module exports all shared utilities for authentication Lambda functions.
 */

const { getCorsHeaders, handleCorsPreflightRequest } = require("./cors");
const {
  parseAuthToken,
  parseIdToken,
  parseGoogleToken,
} = require("./token-parser");
const {
  validateEmail,
  validatePassword,
  validateOnboardingInput,
  validateRegistrationInput,
  validateLoginInput,
} = require("./validators");
const {
  formatErrorResponse,
  handleError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
} = require("./errors");
const {
  PERMISSION_MATRIX,
  hasPermission,
  checkPermission,
  getRolePermissions,
  getAllowedActions,
} = require("./permissions");
const {
  sanitizeLogData,
  sanitizeObject,
  sanitizeValue,
  sanitizeError,
  createSanitizedLogger,
  SENSITIVE_FIELDS,
  FIELDS_TO_REMOVE,
} = require("./log-sanitizer");

module.exports = {
  // CORS utilities
  getCorsHeaders,
  handleCorsPreflightRequest,

  // Token parsing utilities
  parseAuthToken,
  parseIdToken,
  parseGoogleToken,

  // Validation utilities
  validateEmail,
  validatePassword,
  validateOnboardingInput,
  validateRegistrationInput,
  validateLoginInput,

  // Error handling utilities
  formatErrorResponse,
  handleError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,

  // Permission utilities
  PERMISSION_MATRIX,
  hasPermission,
  checkPermission,
  getRolePermissions,
  getAllowedActions,

  // Log sanitization utilities
  sanitizeLogData,
  sanitizeObject,
  sanitizeValue,
  sanitizeError,
  createSanitizedLogger,
  SENSITIVE_FIELDS,
  FIELDS_TO_REMOVE,
};
