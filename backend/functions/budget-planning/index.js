/**
 * Budget Planning Lambda Handler
 *
 * AI-powered future budget planning based on historical data and detected patterns.
 * Uses AWS Bedrock (Claude 3.5 Sonnet) for intelligent budget suggestions.
 *
 * Endpoints:
 * - POST /budget-planning/suggestions - Generate budget suggestions
 * - POST /budget-planning/apply - Apply suggestions to budget
 * - GET /budget-planning/suggestions - Get existing suggestions
 * - GET /budget-planning/health - Health check
 */

const {
  generateSuggestions,
  applySuggestions,
  getSuggestions,
} = require("./budget-planning-service");

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
 */
function extractUserInfo(event) {
  const claims = event.requestContext?.authorizer?.claims || {};
  const userId = claims.sub || claims["cognito:username"];
  const familyId = claims["custom:familyId"] || claims.familyId;
  return { userId, familyId };
}

/**
 * Parse request body
 */
function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch (error) {
    return {};
  }
}

/**
 * Handle POST /budget-planning/suggestions - Generate suggestions
 */
async function handleGenerateSuggestions(event) {
  const { userId, familyId } = extractUserInfo(event);

  if (!userId || !familyId) {
    return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  }

  const body = parseBody(event);
  const { targetMonth, includeRecurringBills, includeHistoricalAverage } = body;

  if (!targetMonth) {
    return errorResponse(
      "targetMonth is required (YYYY-MM format)",
      "MISSING_PARAM",
      400,
    );
  }

  try {
    const result = await generateSuggestions(userId, familyId, targetMonth, {
      includeRecurringBills,
      includeHistoricalAverage,
    });

    return successResponse(result, "Budget suggestions generated successfully");
  } catch (error) {
    console.error("Generate suggestions error:", error);

    if (error.message.includes("format")) {
      return errorResponse(error.message, "INVALID_FORMAT", 400);
    }

    return errorResponse(
      "Failed to generate suggestions",
      "GENERATION_FAILED",
      500,
    );
  }
}

/**
 * Handle POST /budget-planning/apply - Apply suggestions
 */
async function handleApplySuggestions(event) {
  const { userId, familyId } = extractUserInfo(event);

  if (!userId || !familyId) {
    return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  }

  const body = parseBody(event);
  const { suggestionId, selectedCategories } = body;

  if (!suggestionId) {
    return errorResponse("suggestionId is required", "MISSING_PARAM", 400);
  }

  try {
    const result = await applySuggestions(
      userId,
      familyId,
      suggestionId,
      selectedCategories,
    );

    return successResponse(result, "Suggestions applied successfully");
  } catch (error) {
    console.error("Apply suggestions error:", error);

    if (error.message.includes("not found")) {
      return errorResponse("Suggestion not found", "NOT_FOUND", 404);
    }
    if (error.message.includes("already applied")) {
      return errorResponse(
        "Suggestion already applied",
        "ALREADY_APPLIED",
        409,
      );
    }

    return errorResponse("Failed to apply suggestions", "APPLY_FAILED", 500);
  }
}

/**
 * Handle GET /budget-planning/suggestions - Get suggestions
 */
async function handleGetSuggestions(event) {
  const { userId, familyId } = extractUserInfo(event);

  if (!userId || !familyId) {
    return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
  }

  const queryParams = event.queryStringParameters || {};
  const { status, targetMonth } = queryParams;

  try {
    const suggestions = await getSuggestions(userId, familyId, {
      status,
      targetMonth,
    });

    return successResponse(
      { suggestions, count: suggestions.length },
      "Suggestions retrieved successfully",
    );
  } catch (error) {
    console.error("Get suggestions error:", error);
    return errorResponse("Failed to retrieve suggestions", "FETCH_FAILED", 500);
  }
}

/**
 * Handle health check
 */
function handleHealthCheck() {
  return successResponse(
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "budget-planning",
    },
    "Budget Planning Lambda is healthy",
  );
}

/**
 * Lambda handler
 */
exports.handler = async (event) => {
  console.log("Budget Planning Event:", JSON.stringify(event, null, 2));

  const { httpMethod, path } = event;

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
    switch (httpMethod) {
      case "POST":
        if (path?.includes("/apply")) {
          return await handleApplySuggestions(event);
        }
        if (path?.includes("/suggestions")) {
          return await handleGenerateSuggestions(event);
        }
        return errorResponse("Invalid endpoint", "NOT_FOUND", 404);

      case "GET":
        if (path?.includes("/suggestions")) {
          return await handleGetSuggestions(event);
        }
        return errorResponse("Invalid endpoint", "NOT_FOUND", 404);

      default:
        return errorResponse("Method not allowed", "METHOD_NOT_ALLOWED", 405);
    }
  } catch (error) {
    console.error("Budget Planning Error:", error);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
};
