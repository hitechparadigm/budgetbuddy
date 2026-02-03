/**
 * Log Sanitizer
 *
 * Utility for sanitizing sensitive data from log entries.
 * Removes or masks sensitive financial and personal information
 * before logging to prevent data exposure.
 *
 * Sensitive fields include:
 * - Transaction amounts
 * - Merchant names
 * - Account numbers
 * - Personal identifiers
 * - Financial patterns
 */

/**
 * List of sensitive field names to sanitize
 */
const SENSITIVE_FIELDS = [
  // Financial data
  "amount",
  "averageAmount",
  "paidAmount",
  "suggestedAmount",
  "totalAmount",
  "balance",
  "accountBalance",
  "transactionAmount",
  "amountStdDev",
  "amountVariance",
  "amountVariancePercent",
  // Merchant/vendor info
  "merchantName",
  "merchant",
  "vendorName",
  "payee",
  // Account identifiers
  "accountNumber",
  "accountId",
  "bankAccountNumber",
  "routingNumber",
  "cardNumber",
  "lastFour",
  // Personal identifiers
  "ssn",
  "socialSecurityNumber",
  "taxId",
  "ein",
  // Transaction details
  "description",
  "memo",
  "notes",
  // Pattern data
  "occurrences",
  "paymentHistory",
  "breakdown",
];

/**
 * Fields to completely remove (not just mask)
 */
const FIELDS_TO_REMOVE = [
  "ssn",
  "socialSecurityNumber",
  "taxId",
  "ein",
  "accountNumber",
  "bankAccountNumber",
  "routingNumber",
  "cardNumber",
];

/**
 * Sanitize a single value based on field name
 *
 * @param {string} fieldName - Name of the field
 * @param {*} value - Value to sanitize
 * @returns {*} Sanitized value
 */
function sanitizeValue(fieldName, value) {
  const lowerFieldName = fieldName.toLowerCase();

  // Check if field should be completely removed
  if (FIELDS_TO_REMOVE.some((f) => lowerFieldName.includes(f.toLowerCase()))) {
    return "[REDACTED]";
  }

  // Check if field is sensitive
  const isSensitive = SENSITIVE_FIELDS.some((f) =>
    lowerFieldName.includes(f.toLowerCase()),
  );

  if (!isSensitive) {
    return value;
  }

  // Handle different value types
  if (typeof value === "number") {
    return "[AMOUNT_REDACTED]";
  }

  if (typeof value === "string") {
    // Mask string values
    if (value.length <= 4) {
      return "****";
    }
    return value.substring(0, 2) + "****" + value.substring(value.length - 2);
  }

  if (Array.isArray(value)) {
    return `[ARRAY_REDACTED:${value.length}_items]`;
  }

  if (typeof value === "object" && value !== null) {
    return "[OBJECT_REDACTED]";
  }

  return "[REDACTED]";
}

/**
 * Recursively sanitize an object
 *
 * @param {Object} obj - Object to sanitize
 * @param {number} depth - Current recursion depth
 * @param {number} maxDepth - Maximum recursion depth
 * @returns {Object} Sanitized object
 */
function sanitizeObject(obj, depth = 0, maxDepth = 5) {
  if (depth > maxDepth) {
    return "[MAX_DEPTH_REACHED]";
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    // For arrays, sanitize each element
    return obj.map((item) => {
      if (typeof item === "object" && item !== null) {
        return sanitizeObject(item, depth + 1, maxDepth);
      }
      return item;
    });
  }

  // For objects, sanitize each field
  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    // Check if this is a sensitive field
    const isSensitive = SENSITIVE_FIELDS.some((f) =>
      key.toLowerCase().includes(f.toLowerCase()),
    );

    if (isSensitive) {
      sanitized[key] = sanitizeValue(key, value);
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value, depth + 1, maxDepth);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize log data for safe logging
 *
 * @param {Object|string} data - Data to sanitize
 * @returns {Object|string} Sanitized data
 */
function sanitizeLogData(data) {
  if (typeof data === "string") {
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(data);
      return JSON.stringify(sanitizeObject(parsed));
    } catch {
      // Not JSON, return as-is (might contain sensitive data in string form)
      return data;
    }
  }

  if (typeof data === "object" && data !== null) {
    return sanitizeObject(data);
  }

  return data;
}

/**
 * Create a sanitized logger wrapper
 *
 * @param {Object} logger - Original logger object
 * @returns {Object} Sanitized logger
 */
function createSanitizedLogger(logger) {
  const sanitizedLogger = {};

  const logMethods = ["log", "info", "warn", "error", "debug"];

  for (const method of logMethods) {
    if (typeof logger[method] === "function") {
      sanitizedLogger[method] = (message, data, ...args) => {
        const sanitizedData = data ? sanitizeLogData(data) : undefined;
        logger[method](message, sanitizedData, ...args);
      };
    }
  }

  return sanitizedLogger;
}

/**
 * Sanitize error object for logging
 *
 * @param {Error} error - Error object
 * @returns {Object} Sanitized error info
 */
function sanitizeError(error) {
  return {
    name: error.name,
    message: error.message,
    // Don't include stack trace in production logs
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
  };
}

module.exports = {
  sanitizeLogData,
  sanitizeObject,
  sanitizeValue,
  sanitizeError,
  createSanitizedLogger,
  SENSITIVE_FIELDS,
  FIELDS_TO_REMOVE,
};
