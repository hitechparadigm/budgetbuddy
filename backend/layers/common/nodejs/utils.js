/**
 * Common utilities for BudgetBuddy Lambda functions
 *
 * This file contains shared utility functions used across all Lambda handlers
 * to ensure consistency and reduce code duplication. Includes response formatting,
 * error handling, validation, and AWS service helpers.
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

/**
 * Initialize DynamoDB Document Client with optimized configuration
 * Uses singleton pattern to reuse connections across Lambda invocations
 */
let dynamoClient;
const getDynamoClient = () => {
  if (!dynamoClient) {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || "us-east-1",
      // Optimize for Lambda environment
      maxAttempts: 3,
      requestTimeout: 5000,
    });

    dynamoClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        convertEmptyValues: false,
        removeUndefinedValues: true,
        convertClassInstanceToMap: false,
      },
      unmarshallOptions: {
        wrapNumbers: false,
      },
    });
  }
  return dynamoClient;
};

/**
 * Standard API response formatter
 * Ensures consistent response structure across all Lambda functions
 *
 * @param {number} statusCode - HTTP status code
 * @param {any} data - Response data (optional)
 * @param {string} message - Success/error message (optional)
 * @param {Object} error - Error details (optional)
 * @returns {Object} Formatted API Gateway response
 */
const createResponse = (
  statusCode,
  data = null,
  message = null,
  error = null,
) => {
  const response = {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // Configure properly for production
      "Access-Control-Allow-Headers":
        "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    },
    body: JSON.stringify({
      success: statusCode >= 200 && statusCode < 300,
      data,
      message,
      error,
      timestamp: new Date().toISOString(),
    }),
  };

  return response;
};

/**
 * Success response helper
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @returns {Object} Success response
 */
const successResponse = (data, message = "Success") => {
  return createResponse(200, data, message);
};

/**
 * Error response helpers for common HTTP status codes
 */
const errorResponse = {
  badRequest: (message = "Bad Request", details = null) =>
    createResponse(400, null, message, {
      code: "BAD_REQUEST",
      details,
    }),

  unauthorized: (message = "Unauthorized") =>
    createResponse(401, null, message, {
      code: "UNAUTHORIZED",
    }),

  forbidden: (message = "Forbidden") =>
    createResponse(403, null, message, {
      code: "FORBIDDEN",
    }),

  notFound: (message = "Not Found") =>
    createResponse(404, null, message, {
      code: "NOT_FOUND",
    }),

  conflict: (message = "Conflict") =>
    createResponse(409, null, message, {
      code: "CONFLICT",
    }),

  internalError: (message = "Internal Server Error", details = null) =>
    createResponse(500, null, message, {
      code: "INTERNAL_ERROR",
      details,
    }),
};

/**
 * Parse and validate JSON request body
 * @param {string} body - Raw request body
 * @returns {Object} Parsed JSON object
 * @throws {Error} If JSON is invalid
 */
const parseRequestBody = (body) => {
  if (!body) {
    throw new Error("Request body is required");
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error("Invalid JSON in request body");
  }
};

/**
 * Extract user information from Cognito JWT token.
 * Budget access and role are resolved from DynamoDB via BudgetAccessResolver —
 * the JWT carries only userId.
 * @param {Object} event - API Gateway event
 * @returns {Object} User information from token
 */
const getUserFromEvent = (event) => {
  const claims =
    event.requestContext &&
    event.requestContext.authorizer &&
    event.requestContext.authorizer.claims;

  if (!claims) {
    throw new Error("No user claims found in request");
  }

  // CRITICAL: Use custom:userId if available, fallback to sub
  // familyId and role are intentionally omitted — resolved from DynamoDB via BudgetAccessResolver
  return {
    userId: claims["custom:userId"] || claims.sub,
    email: claims.email,
    firstName: claims.given_name || claims["cognito:username"],
    lastName: claims.family_name || "User",
    subscriptionTier: claims["custom:subscriptionTier"] || "free",
  };
};

/**
 * Generate unique identifiers with prefixes for different entity types
 */
const generateId = {
  user:        () => `user_${uuidv4()}`,
  budget:      () => `budget_${uuidv4()}`,
  transaction: () => `txn_${uuidv4()}`,
  category:    () => `cat_${uuidv4()}`,
  invitation:  () => `inv_${uuidv4()}`,
  account:     () => `acc_${uuidv4()}`,
  /**
   * Generate ID with custom prefix
   * @param {string} prefix - Custom prefix for the ID
   * @returns {string} Generated ID with custom prefix
   */
  custom: (prefix) => `${prefix}_${uuidv4()}`,
};

/**
 * DynamoDB helper functions for common operations
 */
const dynamoHelpers = {
  /**
   * Get item by primary key
   * @param {string} pk - Partition key
   * @param {string} sk - Sort key
   * @returns {Promise<Object|null>} Item or null if not found
   */
  async getItem(pk, sk) {
    const client = getDynamoClient();
    const command = new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        PK: pk,
        SK: sk,
      },
    });

    const result = await client.send(command);
    return result.Item || null;
  },

  /**
   * Put item into DynamoDB
   * @param {Object} item - Item to store
   * @returns {Promise<void>}
   */
  async putItem(item) {
    const client = getDynamoClient();
    const command = new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        ...item,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    await client.send(command);
  },

  /**
   * Query items by partition key
   * @param {string} pk - Partition key
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of items
   */
  async queryByPK(pk, options = {}) {
    const client = getDynamoClient();

    // Extract ExpressionAttributeValues from options to prevent overwriting
    const { ExpressionAttributeValues: optionValues, ...otherOptions } =
      options;

    const command = new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": pk,
        ...(optionValues || {}),
      },
      ...otherOptions,
    });

    const result = await client.send(command);
    return result.Items || [];
  },

  /**
   * Update item with optimistic locking
   * @param {string} pk - Partition key
   * @param {string} sk - Sort key
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated item
   */
  async updateItem(pk, sk, updates) {
    const client = getDynamoClient();

    // Build update expression dynamically
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.entries(updates).forEach(([key, value], index) => {
      const nameKey = `#attr${index}`;
      const valueKey = `:val${index}`;

      updateExpressions.push(`${nameKey} = ${valueKey}`);
      expressionAttributeNames[nameKey] = key;
      expressionAttributeValues[valueKey] = value;
    });

    // Only add updatedAt timestamp if it's not already in the updates
    if (!updates.hasOwnProperty("updatedAt")) {
      const updatedAtIndex = Object.keys(updates).length;
      updateExpressions.push(
        `#updatedAt${updatedAtIndex} = :updatedAt${updatedAtIndex}`,
      );
      expressionAttributeNames[`#updatedAt${updatedAtIndex}`] = "updatedAt";
      expressionAttributeValues[`:updatedAt${updatedAtIndex}`] =
        new Date().toISOString();
    }

    const command = new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        PK: pk,
        SK: sk,
      },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    });

    const result = await client.send(command);
    return result.Attributes;
  },
};

/**
 * Logging helper with structured logging for CloudWatch
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
const logger = {
  info: (message, meta = {}) => {
    console.log(
      JSON.stringify({
        level: "info",
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      }),
    );
  },

  warn: (message, meta = {}) => {
    console.warn(
      JSON.stringify({
        level: "warn",
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      }),
    );
  },

  error: (message, error = null, meta = {}) => {
    console.error(
      JSON.stringify({
        level: "error",
        message,
        error: error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : null,
        timestamp: new Date().toISOString(),
        ...meta,
      }),
    );
  },
};

/**
 * Budget Access Resolver
 *
 * Replaces FamilyIdResolver. Resolves budget access from DynamoDB on every request.
 * The JWT carries only userId — budget membership and role are always read from DynamoDB,
 * which structurally eliminates the stale-JWT bug (REQ-11).
 *
 * Usage:
 *   const { budgetId, role, budgetType, budgetStatus, subscriptionTier } =
 *     await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers);
 *   BudgetAccessResolver.assertPermission(role, action, budgetStatus);
 */
const BudgetAccessResolver = {
  /**
   * Resolve budget access for a user.
   *
   * Resolution order:
   * 1. Read USER#<userId>/PROFILE → get defaultBudgetId and subscriptionTier
   * 2. Use requestedBudgetId if provided, otherwise use defaultBudgetId
   * 3. Read BUDGET#<budgetId>/MEMBER#<userId> → get role, status, expiresAt
   * 4. Read BUDGET#<budgetId>/METADATA → get budgetType, status
   *
   * @param {string} userId - User ID from JWT
   * @param {Object} dynamoHelpers - DynamoDB helper functions
   * @param {string|null} requestedBudgetId - Optional explicit budget ID (e.g. from path param)
   * @returns {Promise<{ budgetId, role, budgetType, budgetStatus, expiresAt, subscriptionTier }>}
   * @throws {{ statusCode: number, message: string }} On any access denial
   */
  async resolveAccess(userId, dynamoHelpers, requestedBudgetId = null) {
    // Step 1: Load user profile
    const profile = await dynamoHelpers.getItem(`USER#${userId}`, "PROFILE");
    if (!profile) {
      throw { statusCode: 403, message: "User profile not found" };
    }

    // Step 2: Determine which budget to resolve
    const budgetId = requestedBudgetId || profile.defaultBudgetId;
    if (!budgetId) {
      throw {
        statusCode: 403,
        message: "No active budget found. Please complete onboarding.",
      };
    }

    // Step 3: Verify membership
    const membership = await dynamoHelpers.getItem(
      `BUDGET#${budgetId}`,
      `MEMBER#${userId}`,
    );
    if (
      !membership ||
      membership.status === "revoked" ||
      membership.status === "left"
    ) {
      throw {
        statusCode: 403,
        message: "You do not have access to this budget.",
      };
    }

    // Step 4: Check viewer expiry
    if (membership.expiresAt && new Date(membership.expiresAt) < new Date()) {
      throw {
        statusCode: 403,
        message:
          "Your viewer access has expired. Contact the budget owner to renew.",
      };
    }

    // Step 5: Load budget metadata
    const budget = await dynamoHelpers.getItem(`BUDGET#${budgetId}`, "METADATA");
    if (!budget) {
      throw { statusCode: 404, message: "Budget not found." };
    }
    if (budget.status === "deleted") {
      throw { statusCode: 403, message: "This budget has been deleted." };
    }

    return {
      budgetId,
      role: membership.role,
      budgetType: budget.budgetType,
      budgetStatus: budget.status,
      expiresAt: membership.expiresAt || null,
      subscriptionTier: profile.subscriptionTier || "free",
    };
  },

  /**
   * Assert that a role is permitted to perform an action on a budget.
   *
   * Permission matrix (16 actions):
   * - Read actions (budget.read, transaction.read, category.read, account.read, report.read):
   *     owner, partner, household_member, viewer
   * - Write actions (transaction.create, transaction.edit):
   *     owner, partner, household_member
   * - Elevated write (transaction.delete, budget.edit, category.edit, account.manage,
   *     member.invite, budget.export):
   *     owner, partner
   * - Owner-only (member.remove, budget.archive, budget.delete):
   *     owner
   *
   * Archived budgets are read-only for all roles.
   *
   * @param {string} role - Member role (owner | partner | household_member | viewer)
   * @param {string} action - Action key (e.g. 'transaction.create')
   * @param {string} [budgetStatus='active'] - Budget status (active | archived | deleted)
   * @throws {{ statusCode: number, message: string }} If permission is denied or action unknown
   */
  assertPermission(role, action, budgetStatus = "active") {
    // Archived budgets are read-only for everyone
    if (budgetStatus === "archived") {
      const READ_ACTIONS = [
        "budget.read",
        "transaction.read",
        "category.read",
        "account.read",
        "report.read",
      ];
      if (!READ_ACTIONS.includes(action)) {
        throw {
          statusCode: 403,
          message: "This budget is archived and is read-only.",
        };
      }
    }

    const PERMISSIONS = {
      // Read — all roles
      "budget.read":        ["owner", "partner", "household_member", "viewer"],
      "transaction.read":   ["owner", "partner", "household_member", "viewer"],
      "category.read":      ["owner", "partner", "household_member", "viewer"],
      "account.read":       ["owner", "partner", "household_member", "viewer"],
      "report.read":        ["owner", "partner", "household_member", "viewer"],
      // Write — owner, partner, household_member
      "transaction.create": ["owner", "partner", "household_member"],
      "transaction.edit":   ["owner", "partner", "household_member"],
      // Elevated write — owner, partner
      "transaction.delete": ["owner", "partner"],
      "budget.edit":        ["owner", "partner"],
      "category.edit":      ["owner", "partner"],
      "account.manage":     ["owner", "partner"],
      "member.invite":      ["owner", "partner"],
      "budget.export":      ["owner", "partner"],
      // Owner only
      "member.remove":      ["owner"],
      "budget.archive":     ["owner"],
      "budget.delete":      ["owner"],
    };

    const allowed = PERMISSIONS[action];
    if (!allowed) {
      throw { statusCode: 400, message: `Unknown action: ${action}` };
    }
    if (!allowed.includes(role)) {
      throw {
        statusCode: 403,
        message: "You do not have permission to perform this action.",
      };
    }
  },
};

module.exports = {
  getDynamoClient,
  createResponse,
  successResponse,
  errorResponse,
  parseRequestBody,
  getUserFromEvent,
  generateId,
  dynamoHelpers,
  logger,
  BudgetAccessResolver,
};

// Force rebuild timestamp: 2026-06-03T01:00:00Z
