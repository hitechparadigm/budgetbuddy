/**
 * BudgetBuddy Accounts Management Lambda Function
 *
 * Handles account CRUD operations, balance tracking, and reconciliation.
 * Supports both manual accounts and connected accounts (via Plaid).
 *
 * Version: 2.0.0 — Budget model (BUDGET# keys, BudgetAccessResolver)
 */

const {
  successResponse,
  errorResponse,
  createResponse,
  parseRequestBody,
  getUserFromEvent,
  dynamoHelpers,
  logger,
  BudgetAccessResolver,
} = require("/opt/nodejs/utils");

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
          version: "2.0.0",
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

    // Extract user information from JWT token (userId only — no familyId)
    const { userId } = getUserFromEvent(event);
    logger.info("User authenticated", { userId });

    // Resolve budget access from DynamoDB (REQ-3)
    const { budgetId, role, budgetStatus } =
      await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers);

    logger.info("Budget access resolved", {
      userId,
      budgetId,
      role,
      budgetStatus,
    });

    // Route to appropriate handler
    // GET /accounts - List all accounts
    if (httpMethod === "GET" && path === "/accounts") {
      return await listAccounts(event, userId, budgetId, role, budgetStatus);
    }

    // GET /accounts/summary - Get accounts summary
    if (httpMethod === "GET" && path === "/accounts/summary") {
      return await getAccountsSummary(event, userId, budgetId, role, budgetStatus);
    }

    // GET /accounts/:id - Get single account
    if (httpMethod === "GET" && pathParameters && pathParameters.accountId) {
      return await getAccount(event, userId, budgetId, role, budgetStatus, pathParameters.accountId);
    }

    // POST /accounts - Create account
    if (httpMethod === "POST" && path === "/accounts") {
      return await createAccount(event, userId, budgetId, role, budgetStatus);
    }

    // PUT /accounts/:id - Update account
    if (httpMethod === "PUT" && pathParameters && pathParameters.accountId) {
      // Check for specific sub-routes
      if (path.endsWith("/reconcile")) {
        return await reconcileAccount(
          event,
          userId,
          budgetId,
          role,
          budgetStatus,
          pathParameters.accountId,
        );
      }
      if (path.endsWith("/tracking")) {
        return await setAccountTracking(
          event,
          userId,
          budgetId,
          role,
          budgetStatus,
          pathParameters.accountId,
        );
      }
      return await updateAccount(
        event,
        userId,
        budgetId,
        role,
        budgetStatus,
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
        userId,
        budgetId,
        role,
        budgetStatus,
        pathParameters.accountId,
      );
    }

    // DELETE /accounts/:id - Delete account
    if (httpMethod === "DELETE" && pathParameters && pathParameters.accountId) {
      return await deleteAccount(
        event,
        userId,
        budgetId,
        role,
        budgetStatus,
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

    if (error.message && error.message.includes("No user claims")) {
      return errorResponse.unauthorized("Authentication required");
    }

    if (error.message && error.message.includes("Invalid JSON")) {
      return errorResponse.badRequest("Invalid JSON in request body");
    }

    if (error.statusCode) {
      return createResponse(error.statusCode, null, error.message, {
        code: "ACCESS_DENIED",
      });
    }

    return errorResponse.internalError(
      "An error occurred processing your request",
    );
  }
};

/**
 * List all accounts for a budget
 * GET /accounts
 */
async function listAccounts(event, userId, budgetId, role, budgetStatus) {
  // Read access — all roles permitted (account.read)
  BudgetAccessResolver.assertPermission(role, "account.read", budgetStatus);

  logger.info("Listing accounts", { userId, budgetId });

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

  const accounts = await service.getAccounts(budgetId, filters);

  logger.info("Accounts retrieved", { budgetId, count: accounts.length });

  return successResponse(
    { accounts, count: accounts.length },
    "Accounts retrieved successfully",
  );
}

/**
 * Get accounts summary
 * GET /accounts/summary
 */
async function getAccountsSummary(event, userId, budgetId, role, budgetStatus) {
  BudgetAccessResolver.assertPermission(role, "account.read", budgetStatus);

  logger.info("Getting accounts summary", { userId, budgetId });

  const summary = await service.getAccountsSummary(budgetId);

  return successResponse(summary, "Accounts summary retrieved successfully");
}

/**
 * Get a single account
 * GET /accounts/:id
 */
async function getAccount(event, userId, budgetId, role, budgetStatus, accountId) {
  BudgetAccessResolver.assertPermission(role, "account.read", budgetStatus);

  logger.info("Getting account", { userId, budgetId, accountId });

  try {
    const account = await service.getAccount(budgetId, accountId);
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
async function createAccount(event, userId, budgetId, role, budgetStatus) {
  // Write operation — requires account.manage permission (owner, partner only)
  BudgetAccessResolver.assertPermission(role, "account.manage", budgetStatus);

  logger.info("Creating account", { userId, budgetId });

  const requestBody = parseRequestBody(event.body);

  try {
    const account = await service.createAccount(budgetId, requestBody);

    logger.info("Account created", {
      accountId: account.accountId,
      budgetId,
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
async function updateAccount(event, userId, budgetId, role, budgetStatus, accountId) {
  // Write operation — requires account.manage permission
  BudgetAccessResolver.assertPermission(role, "account.manage", budgetStatus);

  logger.info("Updating account", { userId, budgetId, accountId });

  const requestBody = parseRequestBody(event.body);

  try {
    const account = await service.updateAccount(
      budgetId,
      accountId,
      requestBody,
    );

    logger.info("Account updated", { accountId, budgetId });

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
async function deleteAccount(event, userId, budgetId, role, budgetStatus, accountId) {
  // Write operation — requires account.manage permission
  BudgetAccessResolver.assertPermission(role, "account.manage", budgetStatus);

  logger.info("Deleting account", { userId, budgetId, accountId });

  try {
    await service.deleteAccount(budgetId, accountId, userId);

    logger.info("Account deleted", { accountId, budgetId });

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
 * POST /accounts/:id/reconcile or PUT /accounts/:id/reconcile
 */
async function reconcileAccount(event, userId, budgetId, role, budgetStatus, accountId) {
  // Write operation — requires account.manage permission
  BudgetAccessResolver.assertPermission(role, "account.manage", budgetStatus);

  logger.info("Reconciling account", {
    userId,
    budgetId,
    accountId,
  });

  const requestBody = parseRequestBody(event.body);

  try {
    const result = await service.reconcileAccount(
      budgetId,
      accountId,
      requestBody,
    );

    logger.info("Account reconciled", {
      accountId,
      budgetId,
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
async function setAccountTracking(event, userId, budgetId, role, budgetStatus, accountId) {
  // Write operation — requires account.manage permission
  BudgetAccessResolver.assertPermission(role, "account.manage", budgetStatus);

  logger.info("Setting account tracking", {
    userId,
    budgetId,
    accountId,
  });

  const requestBody = parseRequestBody(event.body);

  try {
    const account = await service.setAccountTracking(
      budgetId,
      accountId,
      requestBody,
    );

    logger.info("Account tracking updated", {
      accountId,
      budgetId,
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
