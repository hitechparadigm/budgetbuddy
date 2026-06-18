/**
 * Pattern Detection Lambda Handler
 *
 * AI-powered recurring bill pattern detection from transaction history.
 * Uses AWS Bedrock (Claude 3.5 Sonnet) for intelligent pattern recognition.
 *
 * Endpoints:
 * - POST /patterns/detect - Analyze transactions and detect patterns
 * - POST /patterns/manual - Create manual pattern from transaction
 * - GET /patterns - Get all patterns for family
 * - GET /patterns/{patternId} - Get specific pattern
 * - PUT /patterns/{patternId} - Update pattern (approve/reject/edit)
 * - DELETE /patterns/{patternId} - Delete pattern
 * - GET /patterns/health - Health check
 */

const {
  analyzeTransactionsForPatterns,
  getPatterns,
  updatePattern,
  approvePattern,
  rejectPattern,
  ignorePattern,
  createManualPattern,
} = require("./pattern-detection-service");

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

const _dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});
const _docClient = DynamoDBDocumentClient.from(_dynamoClient);
const TABLE_NAME = process.env.TABLE_NAME;

/**
 * Resolve familyId for a user from DynamoDB
 * Falls back to userId if no family profile exists (solo user)
 */
async function resolveFamilyId(userId) {
  try {
    const result = await _docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: "PROFILE" },
    }));
    return result.Item?.familyId || userId;
  } catch (err) {
    console.warn("Could not resolve familyId, falling back to userId:", err.message);
    return userId;
  }
}

/**
 * CORS headers for all responses
 */
const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

/**
 * Create success response
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Lambda response
 */
function successResponse(data, message = "Success", statusCode = 200) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      data,
      message,
    }),
  };
}

/**
 * Create error response
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Lambda response
 */
function errorResponse(message, code = "ERROR", statusCode = 400) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: false,
      message,
      error: { code },
    }),
  };
}

/**
 * Extract user info from event
 * @param {Object} event - Lambda event
 * @returns {Object} User info (userId)
 */
function extractUserInfo(event) {
  const claims = event.requestContext?.authorizer?.claims || {};
  const userId = claims.sub || claims["cognito:username"];

  return { userId };
}

/**
 * Parse request body
 * @param {Object} event - Lambda event
 * @returns {Object} Parsed body
 */
function parseBody(event) {
  if (!event.body) {
    return {};
  }
  try {
    return JSON.parse(event.body);
  } catch (_e) {
    return {};
  }
}

/**
 * Extract path parameter
 * @param {Object} event - Lambda event
 * @param {string} paramName - Parameter name
 * @returns {string|null} Parameter value
 */
function getPathParam(event, paramName) {
  return event.pathParameters?.[paramName] || null;
}

/**
 * Handle POST /patterns/detect - Analyze transactions and detect patterns
 * @param {Object} event - Lambda event
 * @returns {Promise<Object>} Lambda response
 */
async function handleDetectPatterns(event) {
  const { userId } = extractUserInfo(event);

  if (!userId) {
    return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  }

  const familyId = await resolveFamilyId(userId);
  const body = parseBody(event);
  const { analysisMonths, minConfidence, useAI } = body;

  try {
    const result = await analyzeTransactionsForPatterns(userId, familyId, {
      analysisMonths,
      minConfidence,
      useAI,
    });

    return successResponse(result, "Pattern detection completed");
  } catch (error) {
    console.error("Pattern detection error:", error);

    if (error.message.includes("Insufficient")) {
      return errorResponse(error.message, "INSUFFICIENT_DATA", 400);
    }

    return errorResponse("Failed to detect patterns", "DETECTION_FAILED", 500);
  }
}

/**
 * Handle GET /patterns - Get all patterns for family
 * @param {Object} event - Lambda event
 * @returns {Promise<Object>} Lambda response
 */
async function handleGetPatterns(event) {
  const { userId } = extractUserInfo(event);

  if (!userId) {
    return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  }

  const familyId = await resolveFamilyId(userId);
  const queryParams = event.queryStringParameters || {};
  const { status } = queryParams;

  try {
    const patterns = await getPatterns(userId, familyId, { status });

    return successResponse(
      { patterns, count: patterns.length },
      "Patterns retrieved successfully",
    );
  } catch (error) {
    console.error("Get patterns error:", error);
    return errorResponse("Failed to retrieve patterns", "FETCH_FAILED", 500);
  }
}

/**
 * Handle GET /patterns/{patternId} - Get specific pattern
 * @param {Object} event - Lambda event
 * @returns {Promise<Object>} Lambda response
 */
async function handleGetPattern(event) {
  const { userId } = extractUserInfo(event);
  const patternId = getPathParam(event, "patternId");

  if (!userId) {
    return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  }

  if (!patternId) {
    return errorResponse("Pattern ID is required", "MISSING_PARAM", 400);
  }

  const familyId = await resolveFamilyId(userId);

  try {
    const patterns = await getPatterns(userId, familyId);
    const pattern = patterns.find((p) => p.patternId === patternId);

    if (!pattern) {
      return errorResponse("Pattern not found", "NOT_FOUND", 404);
    }

    return successResponse({ pattern }, "Pattern retrieved successfully");
  } catch (error) {
    console.error("Get pattern error:", error);
    return errorResponse("Failed to retrieve pattern", "FETCH_FAILED", 500);
  }
}

/**
 * Handle PUT /patterns/{patternId} - Update pattern
 * @param {Object} event - Lambda event
 * @returns {Promise<Object>} Lambda response
 */
async function handleUpdatePattern(event) {
  const { userId } = extractUserInfo(event);
  const patternId = getPathParam(event, "patternId");

  if (!userId) {
    return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  }

  if (!patternId) {
    return errorResponse("Pattern ID is required", "MISSING_PARAM", 400);
  }

  const familyId = await resolveFamilyId(userId);

  const body = parseBody(event);
  const { action, ...updates } = body;

  try {
    let result;

    switch (action) {
      case "approve":
        result = await approvePattern(patternId, userId, familyId, {
          billId: updates.billId,
        });
        return successResponse({ pattern: result }, "Pattern approved");

      case "reject":
        result = await rejectPattern(patternId, userId, familyId);
        return successResponse({ pattern: result }, "Pattern rejected");

      case "ignore":
        result = await ignorePattern(patternId, userId, familyId);
        return successResponse({ pattern: result }, "Pattern ignored");

      default:
        // Regular update (edit pattern details)
        result = await updatePattern(patternId, userId, familyId, updates);
        return successResponse({ pattern: result }, "Pattern updated");
    }
  } catch (error) {
    console.error("Update pattern error:", error);

    if (error.message.includes("not found")) {
      return errorResponse("Pattern not found", "NOT_FOUND", 404);
    }

    return errorResponse("Failed to update pattern", "UPDATE_FAILED", 500);
  }
}

/**
 * Handle DELETE /patterns/{patternId} - Delete pattern
 * @param {Object} event - Lambda event
 * @returns {Promise<Object>} Lambda response
 */
async function handleDeletePattern(event) {
  const { userId } = extractUserInfo(event);
  const patternId = getPathParam(event, "patternId");

  if (!userId) {
    return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  }

  if (!patternId) {
    return errorResponse("Pattern ID is required", "MISSING_PARAM", 400);
  }

  const familyId = await resolveFamilyId(userId);

  try {
    // Use ignore status for soft delete
    await ignorePattern(patternId, userId, familyId);

    return successResponse(
      { deletedPatternId: patternId },
      "Pattern deleted successfully",
    );
  } catch (error) {
    console.error("Delete pattern error:", error);

    if (error.message.includes("not found")) {
      return errorResponse("Pattern not found", "NOT_FOUND", 404);
    }

    return errorResponse("Failed to delete pattern", "DELETE_FAILED", 500);
  }
}

/**
 * Handle POST /patterns/manual - Create manual pattern from transaction
 * @param {Object} event - Lambda event
 * @returns {Promise<Object>} Lambda response
 */
async function handleCreateManualPattern(event) {
  const { userId } = extractUserInfo(event);

  if (!userId) {
    return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  }

  const familyId = await resolveFamilyId(userId);

  const body = parseBody(event);
  const { transaction, frequency } = body;

  // Validate required fields
  if (!transaction) {
    return errorResponse("Transaction data is required", "MISSING_PARAM", 400);
  }

  if (!frequency) {
    return errorResponse("Frequency is required", "MISSING_PARAM", 400);
  }

  const validFrequencies = [
    "weekly",
    "bi-weekly",
    "monthly",
    "quarterly",
    "annual",
  ];
  if (!validFrequencies.includes(frequency)) {
    return errorResponse(
      `Invalid frequency. Must be one of: ${validFrequencies.join(", ")}`,
      "INVALID_FREQUENCY",
      400,
    );
  }

  try {
    const pattern = await createManualPattern(
      userId,
      familyId,
      transaction,
      frequency,
    );

    return successResponse({ pattern }, "Manual pattern created successfully");
  } catch (error) {
    console.error("Create manual pattern error:", error);

    if (error.message.includes("required")) {
      return errorResponse(error.message, "VALIDATION_ERROR", 400);
    }

    if (error.message.includes("Invalid frequency")) {
      return errorResponse(error.message, "INVALID_FREQUENCY", 400);
    }

    return errorResponse(
      "Failed to create manual pattern",
      "CREATE_FAILED",
      500,
    );
  }
}

/**
 * Handle health check
 * @returns {Object} Lambda response
 */
function handleHealthCheck() {
  return successResponse(
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "pattern-detection",
    },
    "Pattern Detection Lambda is healthy",
  );
}

/**
 * Lambda handler
 * @param {Object} event - Lambda event
 * @returns {Promise<Object>} Lambda response
 */
exports.handler = async (event) => {
  console.log("Pattern Detection Event:", JSON.stringify(event, null, 2));

  const { httpMethod, path, resource } = event;

  try {
    // Handle CORS preflight
    if (httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: "",
      };
    }

    // Health check endpoint
    if (path?.includes("/health")) {
      return handleHealthCheck();
    }

    // Route based on method and path
    const isPatternIdPath =
      resource?.includes("{patternId}") ||
      path?.match(/\/patterns\/[a-f0-9-]+$/i);

    switch (httpMethod) {
      case "POST":
        if (path?.includes("/detect")) {
          return await handleDetectPatterns(event);
        }
        if (path?.includes("/manual")) {
          return await handleCreateManualPattern(event);
        }
        return errorResponse("Invalid endpoint", "NOT_FOUND", 404);

      case "GET":
        if (isPatternIdPath) {
          return await handleGetPattern(event);
        }
        return await handleGetPatterns(event);

      case "PUT":
        if (isPatternIdPath) {
          return await handleUpdatePattern(event);
        }
        return errorResponse("Pattern ID required", "MISSING_PARAM", 400);

      case "DELETE":
        if (isPatternIdPath) {
          return await handleDeletePattern(event);
        }
        return errorResponse("Pattern ID required", "MISSING_PARAM", 400);

      default:
        return errorResponse("Method not allowed", "METHOD_NOT_ALLOWED", 405);
    }
  } catch (error) {
    console.error("Pattern Detection Error:", error);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
};
