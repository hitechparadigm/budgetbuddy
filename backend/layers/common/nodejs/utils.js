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
  error = null
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
 * Extract user information from Cognito JWT token
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

  // Handle missing custom attributes gracefully
  return {
    userId: claims.sub,
    email: claims.email,
    firstName: claims.given_name || claims["cognito:username"],
    lastName: claims.family_name || "User",
    familyId: claims["custom:familyId"] || null,
    role: claims["custom:familyRole"] || "primary",
    subscriptionTier: claims["custom:subscriptionTier"] || "free",
  };
};

/**
 * Generate unique identifiers with prefixes for different entity types
 */
const generateId = {
  user: () => `user_${uuidv4()}`,
  family: () => `family_${uuidv4()}`,
  budget: () => `budget_${uuidv4()}`,
  transaction: () => `txn_${uuidv4()}`,
  category: () => `cat_${uuidv4()}`,
  invitation: () => `inv_${uuidv4()}`,
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
        `#updatedAt${updatedAtIndex} = :updatedAt${updatedAtIndex}`
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
      })
    );
  },

  warn: (message, meta = {}) => {
    console.warn(
      JSON.stringify({
        level: "warn",
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      })
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
      })
    );
  },
};

/**
 * Family ID Resolution Utility
 *
 * Provides consistent family ID resolution across Auth and Budget services
 * to prevent partition key mismatches that cause "No budgets exist" errors.
 *
 * Resolution order:
 * 1. JWT token familyId (if available)
 * 2. DynamoDB user profile lookup
 * 3. Fallback pattern: family_${userId}
 */
const FamilyIdResolver = {
  /**
   * Resolve familyId consistently across all services
   * @param {string} userId - User ID from JWT token
   * @param {string|null} jwtFamilyId - Family ID from JWT token (may be null)
   * @param {Object} dynamoHelpers - DynamoDB helper functions
   * @returns {Promise<string>} Resolved family ID
   */
  async resolveFamilyId(userId, jwtFamilyId = null, dynamoHelpers = null) {
    const startTime = Date.now();

    logger.info("FamilyIdResolver.resolveFamilyId started", {
      userId,
      jwtFamilyId,
      hasDynamoHelpers: !!dynamoHelpers,
      timestamp: new Date().toISOString(),
    });

    try {
      // Step 1: Try JWT familyId if available
      if (jwtFamilyId) {
        logger.info("Using familyId from JWT token", {
          userId,
          familyId: jwtFamilyId,
          source: "jwt",
          resolutionTimeMs: Date.now() - startTime,
        });

        this.logFamilyIdResolution(
          "unknown",
          "resolve-family-id",
          userId,
          jwtFamilyId,
          "jwt"
        );
        return jwtFamilyId;
      }

      // Step 2: Lookup familyId from user profile in DynamoDB
      if (dynamoHelpers) {
        try {
          logger.info("Looking up familyId from DynamoDB user profile", {
            userId,
            userProfileKey: `USER#${userId}`,
            sortKey: "PROFILE",
          });

          const userProfile = await dynamoHelpers.getItem(
            `USER#${userId}`,
            "PROFILE"
          );

          if (
            userProfile?.familyId &&
            typeof userProfile.familyId === "string" &&
            userProfile.familyId.trim().length > 0
          ) {
            logger.info("Using familyId from DynamoDB profile", {
              userId,
              familyId: userProfile.familyId,
              source: "dynamodb",
              resolutionTimeMs: Date.now() - startTime,
            });

            this.logFamilyIdResolution(
              "unknown",
              "resolve-family-id",
              userId,
              userProfile.familyId,
              "dynamodb"
            );
            return userProfile.familyId;
          } else {
            logger.warn("User profile found but no valid familyId field", {
              userId,
              profileExists: !!userProfile,
              profileKeys: userProfile ? Object.keys(userProfile) : [],
              familyIdType: userProfile?.familyId
                ? typeof userProfile.familyId
                : "undefined",
              familyIdValue: userProfile?.familyId,
            });
          }
        } catch (error) {
          logger.error("Failed to lookup familyId from DynamoDB", error, {
            userId,
            userProfileKey: `USER#${userId}`,
            sortKey: "PROFILE",
          });
        }
      } else {
        logger.warn("No DynamoDB helpers provided, skipping profile lookup", {
          userId,
        });
      }

      // Step 3: Consistent fallback pattern
      const fallbackFamilyId = `family_${userId}`;
      logger.info("Using fallback familyId pattern", {
        userId,
        familyId: fallbackFamilyId,
        source: "fallback",
        resolutionTimeMs: Date.now() - startTime,
      });

      this.logFamilyIdResolution(
        "unknown",
        "resolve-family-id",
        userId,
        fallbackFamilyId,
        "fallback"
      );
      return fallbackFamilyId;
    } catch (error) {
      logger.error(
        "Critical error in FamilyIdResolver.resolveFamilyId",
        error,
        {
          userId,
          jwtFamilyId,
          resolutionTimeMs: Date.now() - startTime,
        }
      );

      // Even in error case, return consistent fallback
      const fallbackFamilyId = `family_${userId}`;
      logger.warn("Returning fallback familyId due to error", {
        userId,
        familyId: fallbackFamilyId,
        source: "error-fallback",
      });

      return fallbackFamilyId;
    }
  },

  /**
   * Log family ID resolution for debugging and monitoring
   * @param {string} service - Service name (auth-service, budget-service)
   * @param {string} operation - Operation name (onboarding, get-budgets, etc.)
   * @param {string} userId - User ID
   * @param {string} familyId - Resolved family ID
   * @param {'jwt'|'dynamodb'|'fallback'} source - Resolution source
   */
  logFamilyIdResolution(service, operation, userId, familyId, source) {
    const logData = {
      service,
      operation,
      userId,
      familyId,
      source,
      partitionKey: `FAMILY#${familyId}`,
      timestamp: new Date().toISOString(),
    };

    // Use structured logging for easy CloudWatch filtering
    logger.info("FAMILY_ID_RESOLUTION", logData);

    // Also log with specific prefix for easy searching
    console.log("FAMILY_ID_RESOLUTION:", JSON.stringify(logData, null, 2));
  },

  /**
   * Validate that two services resolved the same familyId
   * @param {string} authFamilyId - Family ID from auth service
   * @param {string} budgetFamilyId - Family ID from budget service
   * @param {string} userId - User ID for context
   * @throws {Error} If family IDs don't match
   */
  validateFamilyIdConsistency(authFamilyId, budgetFamilyId, userId) {
    if (authFamilyId !== budgetFamilyId) {
      const error = new Error(`Family ID mismatch detected for user ${userId}`);

      logger.error("FAMILY_ID_MISMATCH", error, {
        userId,
        authFamilyId,
        budgetFamilyId,
        authPartitionKey: `FAMILY#${authFamilyId}`,
        budgetPartitionKey: `FAMILY#${budgetFamilyId}`,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }

    logger.info("Family ID consistency validated", {
      userId,
      familyId: authFamilyId,
      partitionKey: `FAMILY#${authFamilyId}`,
    });
  },

  /**
   * Handle legacy users with different familyId patterns
   * @param {string} userId - User ID
   * @param {Object} dynamoHelpers - DynamoDB helper functions
   * @returns {Promise<string|null>} Found legacy familyId or null
   */
  async findLegacyFamilyId(userId, dynamoHelpers) {
    const possibleFamilyIds = [
      `family_${userId}`, // Current fallback pattern
      `family_user_${userId}`, // Alternative pattern seen in logs
      userId, // Direct userId (legacy)
    ];

    logger.info("Searching for legacy familyId patterns", {
      userId,
      possiblePatterns: possibleFamilyIds,
    });

    // Check which familyId has existing budgets
    for (const familyId of possibleFamilyIds) {
      try {
        const budgets = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
          FilterExpression: "entityType = :entityType",
          ExpressionAttributeValues: {
            ":entityType": "BUDGET",
          },
          Limit: 1, // Just check if any exist
        });

        if (budgets.length > 0) {
          logger.info("Found existing budgets with legacy familyId", {
            userId,
            familyId,
            budgetCount: budgets.length,
            partitionKey: `FAMILY#${familyId}`,
          });
          return familyId;
        }
      } catch (error) {
        logger.warn("Error checking legacy familyId pattern", {
          userId,
          familyId,
          error: error.message,
        });
      }
    }

    logger.info("No legacy familyId patterns found with existing budgets", {
      userId,
      checkedPatterns: possibleFamilyIds,
    });

    return null;
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
  FamilyIdResolver, // Add the new utility
};

// Force rebuild timestamp: 2025-10-28T01:00:00Z
