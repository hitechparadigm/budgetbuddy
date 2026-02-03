/**
 * BudgetBuddy Accounts Management Lambda Function
 *
 * Handles account CRUD operations, balance tracking, and reconciliation.
 * Supports both manual accounts and connected accounts (via Plaid).
 *
 * Version: 1.0.0
 */

const {
  successResponse,
  errorResponse,
  parseRequestBody,
  getUserFromEvent,
  dynamoHelpers,
  logger,
  FamilyIdResolver,
} = require("/opt/nodejs/utils");

const { checkPermission } = require("/opt/nodejs/shared");
const service = require("./service");

/**
 * Main Lambda handler for account operations
 * Routes requests to appropriate handlers based on HTTP method and path
 */
exports.handler = async (event, context) => {
  logger.info("Accounts request received", {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context.awsRequestId,
  });

  try {
    const { httpMethod, path, pathParameters } = event;

    // Handle health check endpoint
    if (httpMethod === "GET" && path === "/accounts/health") {
      return successResponse(
        {
          status: "healthy",
          service: "accounts",
          version: "1.0.0",
        },
        "Accounts service is healthy",
      );
    }

    // Handle CORS preflight requests
    if (httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        body: "",
      };
    }

    // Extract user information from JWT token
    const user = getUserFromEvent(event);
    logger.info("User authenticated", {
      userId: user.userId,
      familyId: user.familyId,
    });

    // Resolve family ID
    const familyId = await FamilyIdResolver.resolveFamilyId(
      user.userId,
      user.familyId,
      dynamoHelpers,
    );

    FamilyIdResolver.logFamilyIdResolution(
      "accounts-service",
      httpMethod,
      user.userId,
      familyId,
      user.familyId ? "jwt" : "dynamodb-or-fallback",
    );

    // Route to appropriate handler
    // GET /accounts - List all accounts
    if (httpMethod === "GET" && path === "/accounts") {
      return await listAccounts(event, user, familyId);
    }

    // GET /accounts/summary - Get accounts summary
    if (httpMethod === "GET" && path === "/accounts/summary") {
      return await getAccountsSummary(event, user, familyId);
    }

    // GET /accounts/:id - Get single account
    if (httpMethod === "GET" && pathParameters && pathParameters.accountId) {
      return await getAccount(event, user, familyId, pathParameters.accountId);
    }

    // POST /accounts - Create account
    if (httpMethod === "POST" && path === "/accounts") {
      return await createAccount(event, user, familyId);
    }

    // PUT /accounts/:id - Update account
    if (httpMethod === "PUT" && pathParameters && pathParameters.accountId) {
      // Check for specific sub-routes
      if (path.endsWith("/reconcile")) {
        return await reconcileAccount(
          event,
          user,
          familyId,
          pathParameters.accountId,
        );
      }
      if (path.endsWith("/tracking")) {
        return await setAccountTracking(
          event,
          user,
          familyId,
          pathParameters.accountId,
        );
      }
      return await updateAccount(
        event,
        user,
        familyId,
        pathParameters.accountId,
      );
    }

    // POST /accounts/:id/reconcile - Reconcile account
    if (
      httpMethod === "POST" &&
      pathParameters &&
      pathParameters.accountId &&
      path.endsWith("/reconcile")
    ) {
      return await reconcileAccount(
        event,
        user,
        familyId,
        pathParameters.accountId,
      );
    }

    // DELETE /accounts/:id - Delete account
    if (httpMethod === "DELETE" && pathParameters && pathParameters.accountId) {
      return await deleteAccount(
        event,
        user,
        familyId,
        pathParameters.accountId,
      );
    }

    // Default response for unhandled routes
    return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);
  } catch (error) {
    logger.error("Accounts function error", error, {
      httpMethod: event.httpMethod,
      path: event.path,
      requestId: context.awsRequestId,
    });

    if (error.message.includes("No user claims")) {
      return errorResponse.unauthorized("Authentication required");
    }

    if (error.message.includes("Invalid JSON")) {
      return errorResponse.badRequest("Invalid JSON in request body");
    }

    if (error.statusCode) {
      return errorResponse.custom(error.statusCode, error.message);
    }

    return errorResponse.internalError(
      "An error occurred processing your request",
    );
  }
};

/**
 * List all accounts for a family
 * GET /accounts
 */
async function listAccounts(event, user, familyId) {
  const permissionError = checkPermission(event, "account:view");
  if (permissionError) {
    logger.warn("Permission denied for listing accounts", {
      userId: user.userId,
      role: user.familyRole,
    });
    return permissionError;
  }

  logger.info("Listing accounts", { userId: user.userId, familyId });

  // Parse query filters
  const queryParams = event.queryStringParameters || {};
  const filters = {};

  if (queryParams.accountType) {
    filters.accountType = queryParams.accountType;
  }
  if (queryParams.isManual !== undefined) {
    filters.isManual = queryParams.isManual === "true";
  }
  if (queryParams.isTracked !== undefined) {
    filters.isTracked = queryParams.isTracked === "true";
  }

  const accounts = await service.getAccounts(familyId, filters);

  logger.info("Accounts retrieved", { familyId, count: accounts.length });

  return successResponse(
    { accounts, count: accounts.length },
    "Accounts retrieved successfully",
  );
}

/**
 * Get accounts summary
 * GET /accounts/summary
 */
async function getAccountsSummary(event, user, familyId) {
  const permissionError = checkPermission(event, "account:view");
  if (permissionError) {
    return permissionError;
  }

  logger.info("Getting accounts summary", { userId: user.userId, familyId });

  const summary = await service.getAccountsSummary(familyId);

  return successResponse(summary, "Accounts summary retrieved successfully");
}

/**
 * Get a single account
 * GET /accounts/:id
 */
async function getAccount(event, user, familyId, accountId) {
  const permissionError = checkPermission(event, "account:view");
  if (permissionError) {
    return permissionError;
  }

  logger.info("Getting account", { userId: user.userId, familyId, accountId });

  try {
    const account = await service.getAccount(familyId, accountId);
    return successResponse(account, "Account retrieved successfully");
  } catch (error) {
    if (error.statusCode === 404) {
      return errorResponse.notFound(error.message);
    }
    throw error;
  }
}

/**
 * Create a new account
 * POST /accounts
 */
async function createAccount(event, user, familyId) {
  const permissionError = checkPermission(event, "account:create");
  if (permissionError) {
    logger.warn("Permission denied for creating account", {
      userId: user.userId,
      role: user.familyRole,
    });
    return permissionError;
  }

  logger.info("Creating account", { userId: user.userId, familyId });

  const requestBody = parseRequestBody(event.body);

  try {
    const account = await service.createAccount(familyId, requestBody);

    logger.info("Account created", {
      accountId: account.accountId,
      familyId,
      accountType: account.accountType,
    });

    return successResponse(account, "Account created successfully");
  } catch (error) {
    if (error.statusCode === 400) {
      return errorResponse.badRequest(error.message);
    }
    throw error;
  }
}

/**
 * Update an account
 * PUT /accounts/:id
 */
async function updateAccount(event, user, familyId, accountId) {
  const permissionError = checkPermission(event, "account:edit");
  if (permissionError) {
    return permissionError;
  }

  logger.info("Updating account", { userId: user.userId, familyId, accountId });

  const requestBody = parseRequestBody(event.body);

  try {
    const account = await service.updateAccount(
      familyId,
      accountId,
      requestBody,
    );

    logger.info("Account updated", { accountId, familyId });

    return successResponse(account, "Account updated successfully");
  } catch (error) {
    if (error.statusCode === 400) {
      return errorResponse.badRequest(error.message);
    }
    if (error.statusCode === 404) {
      return errorResponse.notFound(error.message);
    }
    throw error;
  }
}

/**
 * Delete an account
 * DELETE /accounts/:id
 */
async function deleteAccount(event, user, familyId, accountId) {
  const permissionError = checkPermission(event, "account:delete");
  if (permissionError) {
    return permissionError;
  }

  logger.info("Deleting account", { userId: user.userId, familyId, accountId });

  try {
    await service.deleteAccount(familyId, accountId, user.userId);

    logger.info("Account deleted", { accountId, familyId });

    return successResponse(null, "Account deleted successfully");
  } catch (error) {
    if (error.statusCode === 400) {
      return errorResponse.badRequest(error.message);
    }
    if (error.statusCode === 404) {
      return errorResponse.notFound(error.message);
    }
    throw error;
  }
}

/**
 * Reconcile account balance
 * POST /accounts/:id/reconcile
 */
async function reconcileAccount(event, user, familyId, accountId) {
  const permissionError = checkPermission(event, "account:edit");
  if (permissionError) {
    return permissionError;
  }

  logger.info("Reconciling account", {
    userId: user.userId,
    familyId,
    accountId,
  });

  const requestBody = parseRequestBody(event.body);

  try {
    const result = await service.reconcileAccount(
      familyId,
      accountId,
      requestBody,
    );

    logger.info("Account reconciled", {
      accountId,
      familyId,
      previousBalance: result.previousBalance,
      newBalance: result.account.currentBalance,
      adjustment: result.adjustmentAmount,
    });

    return successResponse(result, "Account reconciled successfully");
  } catch (error) {
    if (error.statusCode === 400) {
      return errorResponse.badRequest(error.message);
    }
    if (error.statusCode === 404) {
      return errorResponse.notFound(error.message);
    }
    throw error;
  }
}

/**
 * Set account tracking status
 * PUT /accounts/:id/tracking
 */
async function setAccountTracking(event, user, familyId, accountId) {
  const permissionError = checkPermission(event, "account:edit");
  if (permissionError) {
    return permissionError;
  }

  logger.info("Setting account tracking", {
    userId: user.userId,
    familyId,
    accountId,
  });

  const requestBody = parseRequestBody(event.body);

  try {
    const account = await service.setAccountTracking(
      familyId,
      accountId,
      requestBody,
    );

    logger.info("Account tracking updated", {
      accountId,
      familyId,
      isTracked: account.isTracked,
    });

    return successResponse(account, "Account tracking updated successfully");
  } catch (error) {
    if (error.statusCode === 400) {
      return errorResponse.badRequest(error.message);
    }
    if (error.statusCode === 404) {
      return errorResponse.notFound(error.message);
    }
    throw error;
  }
}
