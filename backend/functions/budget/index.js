/**
 * BudgetBuddy Budget Management Lambda Function
 *
 * Handles budget CRUD operations, category management, and zero-based budgeting calculations.
 * Implements the core budget management system with real-time balance calculations.
 *
 * Version: 1.3.0 - Added rollover calculation during month transition
 *   - calculateRollover() function for computing new month's rollover
 *   - Formula: newRollover = previousRollover + (planned - spent)
 *   - Supports rollover caps and negative rollover for overspent categories
 *   - Validates: Requirements 40.4, 40.5
 */

const {
  createResponse,
  successResponse,
  errorResponse,
  parseRequestBody,
  getUserFromEvent,
  generateId,
  dynamoHelpers,
  logger,
  BudgetAccessResolver,
} = require("/opt/nodejs/utils");

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://d1ueeugn9zcx7n.cloudfront.net",
  "https://d2ubhx2a13s7gc.cloudfront.net",
  "https://app.budgetbuddy.com",
];

function getCorsOrigin(origin) {
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[2];
}

/**
 * Main Lambda handler for budget operations
 * Routes requests to appropriate handlers based on HTTP method and path
 */
exports.handler = async (event, context) => {
  logger.info("Budget request received", {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context.awsRequestId,
  });

  try {
    const { httpMethod, path, pathParameters } = event;

    // Handle health check endpoint
    if (httpMethod === "GET" && path === "/budget/health") {
      return successResponse(
        {
          status: "healthy",
          service: "budget",
          version: "1.0.0",
        },
        "Budget service is healthy",
      );
    }

    // Handle CORS preflight requests
    if (httpMethod === "OPTIONS") {
      const origin = event.headers?.Origin || event.headers?.origin || "";
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": getCorsOrigin(origin),
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Headers":
            "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        body: "",
      };
    }

    // Extract user information from JWT token
    const { userId } = getUserFromEvent(event);
    const user = { userId };
    logger.info("User authenticated", {
      userId: user.userId,
    });

    // Route to appropriate handler based on HTTP method and path
    if (httpMethod === "POST" && path === "/budget") {
      return await createBudget(event, user);
    }

    if (httpMethod === "GET" && path === "/budget") {
      return await getBudgets(event, user);
    }

    if (httpMethod === "GET" && path === "/budget/current") {
      return await getCurrentBudget(event, user);
    }

    if (httpMethod === "GET" && path === "/budget/health-score") {
      return await getBudgetHealthScore(event, user);
    }

    if (httpMethod === "GET" && pathParameters && pathParameters.budgetId) {
      return await getBudget(event, user, pathParameters.budgetId);
    }

    if (httpMethod === "PUT" && pathParameters && pathParameters.budgetId) {
      return await updateBudget(event, user, pathParameters.budgetId);
    }

    if (httpMethod === "DELETE" && pathParameters && pathParameters.budgetId) {
      return await deleteBudget(event, user, pathParameters.budgetId);
    }

    // Rollover API endpoints (Requirement 40.7)
    // PUT /budget/categories/{categoryId}/rollover - Enable/disable rollover
    if (
      httpMethod === "PUT" &&
      path.match(/^\/budget\/categories\/[^/]+\/rollover$/)
    ) {
      const categoryId = path.split("/")[3];
      return await updateCategoryRollover(event, user, categoryId);
    }

    // PUT /budget/categories/{categoryId}/rollover/reset - Reset rollover to 0
    if (
      httpMethod === "PUT" &&
      path.match(/^\/budget\/categories\/[^/]+\/rollover\/reset$/)
    ) {
      const categoryId = path.split("/")[3];
      return await resetCategoryRollover(event, user, categoryId);
    }

    // Default response for unhandled routes
    return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);
  } catch (error) {
    logger.error("Budget function error", error, {
      httpMethod: event.httpMethod,
      path: event.path,
      requestId: context.awsRequestId,
    });

    // Handle structured errors thrown by BudgetAccessResolver
    if (error.statusCode && error.message) {
      return createResponse(error.statusCode, null, error.message, {
        code: error.statusCode === 403 ? "FORBIDDEN" : "NOT_FOUND",
      });
    }

    if (error.message && error.message.includes("No user claims")) {
      return errorResponse.unauthorized("Authentication required");
    }

    if (error.message && error.message.includes("Invalid JSON")) {
      return errorResponse.badRequest("Invalid JSON in request body");
    }

    return errorResponse.internalError(
      "An error occurred processing your request",
    );
  }
};

/**
 * Create a new budget for a family
 * POST /budget
 */
async function createBudget(event, user) {
  logger.info("Creating new budget", {
    userId: user.userId,
  });

  const requestBody = parseRequestBody(event.body);

  // Validate required fields
  if (!requestBody.month) {
    return errorResponse.badRequest("Month is required (format: YYYY-MM)");
  }

  // Validate month format
  if (!/^\d{4}-\d{2}$/.test(requestBody.month)) {
    return errorResponse.badRequest("Month must be in YYYY-MM format");
  }

  // Resolve budget access from DynamoDB
  const { budgetId, role, budgetStatus, budgetType } = await BudgetAccessResolver.resolveAccess(
    user.userId,
    dynamoHelpers,
  );

  // Enforce write permission
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  // Enforce family budget transparency: family budgets cannot have hidden/private categories
  if (budgetType === 'family' && requestBody.groups) {
    const allCategories = [
      ...(Array.isArray(requestBody.groups.income) ? requestBody.groups.income : []),
      ...(Array.isArray(requestBody.groups.savings) ? requestBody.groups.savings : []),
      ...(Array.isArray(requestBody.groups.expenses) ? requestBody.groups.expenses : []),
    ];
    const hasHiddenCategory = allCategories.some(
      (cat) => cat.hidden === true || cat.isPrivate === true || cat.visibility === 'private',
    );
    if (hasHiddenCategory) {
      return errorResponse.badRequest(
        'Family budgets cannot have hidden or private categories. All members must have full visibility.',
      );
    }
  }

  // Get user's currency from profile (default to USD if not found)
  let userCurrency = "USD";
  try {
    const userProfile = await dynamoHelpers.getItem(
      `USER#${user.userId}`,
      "PROFILE",
    );
    if (userProfile && userProfile.currency) {
      userCurrency = userProfile.currency;
    }
  } catch (error) {
    logger.warn("Could not fetch user currency, defaulting to USD", {
      userId: user.userId,
      error: error.message,
    });
  }

  const newBudgetItemId = generateId.budget();
  const currentTime = new Date().toISOString();

  // Check if budget already exists for this month
  const existingBudget = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `PERIOD#${requestBody.month}`,
  );

  if (existingBudget) {
    // Budget exists - update it instead of returning conflict
    logger.info("Budget already exists, updating existing budget", {
      budgetId,
      month: requestBody.month,
    });

    // Prepare updates
    const updates = {
      updatedAt: currentTime,
    };

    if (requestBody.groups) {
      // Normalize groups to ensure rollover fields are present
      updates.groups = normalizeGroupsWithRollover(requestBody.groups);
      const totals = calculateBudgetTotals(updates.groups);
      updates.totalIncome = totals.totalIncome;
      updates.totalSavings = totals.totalSavings;
      updates.totalExpenses = totals.totalExpenses;
      updates.remainingBalance = totals.remainingBalance;
      updates.totalRollover = calculateTotalRollover(updates.groups);
    }

    // Update the existing budget
    const updatedBudget = await dynamoHelpers.updateItem(
      `BUDGET#${budgetId}`,
      `PERIOD#${requestBody.month}`,
      updates,
    );

    logger.info("Budget updated successfully", {
      budgetId: updatedBudget.budgetId,
      month: requestBody.month,
    });

    return successResponse(
      {
        budgetId: updatedBudget.budgetId,
        month: updatedBudget.month,
        currency: updatedBudget.currency,
        totalIncome: updatedBudget.totalIncome,
        totalSavings: updatedBudget.totalSavings,
        totalExpenses: updatedBudget.totalExpenses,
        remainingBalance: updatedBudget.remainingBalance,
        totalRollover: updatedBudget.totalRollover || 0,
        groups: updatedBudget.groups,
        isAIGenerated: updatedBudget.isAIGenerated,
        createdAt: updatedBudget.createdAt,
        updatedAt: updatedBudget.updatedAt,
      },
      "Budget updated successfully",
    );
  }

  // Initialize default budget structure
  const budget = {
    PK: `BUDGET#${budgetId}`,
    SK: `PERIOD#${requestBody.month}`,
    GSI2PK: `PERIOD#${requestBody.month}`,
    GSI2SK: `BUDGET#${budgetId}`,
    entityType: "BUDGET",
    budgetId: newBudgetItemId,
    month: requestBody.month,
    currency: requestBody.currency || userCurrency, // Use provided currency or user's default
    totalIncome: 0,
    totalSavings: 0,
    totalExpenses: 0,
    remainingBalance: 0,
    groups: {
      income: [],
      savings: [],
      expenses: [],
    },
    isAIGenerated: requestBody.isAIGenerated || false,
    createdAt: currentTime,
    updatedAt: currentTime,
  };

  // If budget data is provided, use it
  if (requestBody.groups) {
    // Normalize groups to ensure rollover fields are present
    budget.groups = normalizeGroupsWithRollover(requestBody.groups);
    const totals = calculateBudgetTotals(budget.groups);
    budget.totalIncome = totals.totalIncome;
    budget.totalSavings = totals.totalSavings;
    budget.totalExpenses = totals.totalExpenses;
    budget.remainingBalance = totals.remainingBalance;
    budget.totalRollover = calculateTotalRollover(budget.groups);
  }

  await dynamoHelpers.putItem(budget);

  logger.info("Budget created successfully", {
    budgetId,
    month: requestBody.month,
  });

  return successResponse(
    {
      budgetId: budget.budgetId,
      month: requestBody.month,
      currency: budget.currency,
      totalIncome: budget.totalIncome,
      totalSavings: budget.totalSavings,
      totalExpenses: budget.totalExpenses,
      remainingBalance: budget.remainingBalance,
      totalRollover: budget.totalRollover || 0,
      groups: budget.groups,
      isAIGenerated: budget.isAIGenerated,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    },
    "Budget created successfully",
  );
}

/**
 * Get all budgets for a family
 * GET /budget
 */
async function getBudgets(event, user) {
  logger.info("Getting budgets", {
    userId: user.userId,
  });

  // Resolve budget access from DynamoDB
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(
    user.userId,
    dynamoHelpers,
  );

  // Enforce read permission
  BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);

  // Query all active (non-deleted) budgets for the budget
  const budgets = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
    FilterExpression: "entityType = :entityType AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
    ExpressionAttributeValues: {
      ":entityType": "BUDGET",
      ":false": false,
    },
  });

  // Transform DynamoDB items to API response format
  const formattedBudgets = budgets.map((budget) => ({
    budgetId: budget.budgetId,
    month: budget.month,
    totalIncome: budget.totalIncome,
    totalSavings: budget.totalSavings,
    totalExpenses: budget.totalExpenses,
    remainingBalance: budget.remainingBalance,
    totalRollover:
      budget.totalRollover || calculateTotalRollover(budget.groups || {}),
    groups: budget.groups,
    isAIGenerated: budget.isAIGenerated,
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
  }));

  // Sort by month (most recent first)
  formattedBudgets.sort((a, b) => b.month.localeCompare(a.month));

  logger.info("Budgets retrieved successfully", {
    budgetId,
    budgetCount: formattedBudgets.length,
  });

  return successResponse(
    {
      budgets: formattedBudgets,
      count: formattedBudgets.length,
    },
    "Budgets retrieved successfully",
  );
}

/**
 * Get current budget by month
 * GET /budget/current?month=YYYY-MM
 */
async function getCurrentBudget(event, user) {
  logger.info("Getting current budget", {
    userId: user.userId,
  });

  // Resolve budget access from DynamoDB
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(
    user.userId,
    dynamoHelpers,
  );

  // Enforce read permission
  BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);

  // Extract month from query parameter
  const queryParams = event.queryStringParameters || {};
  const month = queryParams.month;

  if (!month) {
    return errorResponse.badRequest(
      "Month parameter is required (format: YYYY-MM)",
    );
  }

  let budget = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `PERIOD#${month}`,
  );

  // Treat soft-deleted budgets as non-existent
  if (budget?.isDeleted) budget = null;

  // If no budget exists for this month, create one with recurring items from previous month
  if (!budget) {
    logger.info("No budget found for month, creating with recurring items", {
      budgetId,
      month,
    });

    budget = await createBudgetWithRecurringItems(budgetId, month);
  }

  logger.info("Budget retrieved successfully", {
    budgetId,
    month,
  });

  return successResponse(
    {
      budgetId: budget.budgetId,
      month: budget.month,
      totalIncome: budget.totalIncome,
      totalSavings: budget.totalSavings,
      totalExpenses: budget.totalExpenses,
      remainingBalance: budget.remainingBalance,
      totalRollover:
        budget.totalRollover || calculateTotalRollover(budget.groups || {}),
      groups: budget.groups,
      isAIGenerated: budget.isAIGenerated,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    },
    "Budget retrieved successfully",
  );
}

/**
 * Get a specific budget by ID
 * GET /budget/{budgetId}
 */
async function getBudget(event, user, budgetId) {
  logger.info("Getting specific budget", {
    userId: user.userId,
    budgetId,
  });

  // Resolve budget access from DynamoDB
  const { budgetId: resolvedBudgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(
    user.userId,
    dynamoHelpers,
  );

  // Enforce read permission
  BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);

  // Extract month from query parameter
  const queryParams = event.queryStringParameters || {};
  const month = queryParams.month;

  if (!month) {
    return errorResponse.badRequest(
      "Month parameter is required (format: YYYY-MM)",
    );
  }

  const budget = await dynamoHelpers.getItem(
    `BUDGET#${resolvedBudgetId}`,
    `PERIOD#${month}`,
  );

  if (!budget) {
    return errorResponse.notFound(`Budget not found for ${month}`);
  }

  logger.info("Budget retrieved successfully", {
    budgetId: resolvedBudgetId,
    month,
  });

  return successResponse(
    {
      budgetId: budget.budgetId,
      month: budget.month,
      totalIncome: budget.totalIncome,
      totalSavings: budget.totalSavings,
      totalExpenses: budget.totalExpenses,
      remainingBalance: budget.remainingBalance,
      totalRollover:
        budget.totalRollover || calculateTotalRollover(budget.groups || {}),
      groups: budget.groups,
      isAIGenerated: budget.isAIGenerated,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    },
    "Budget retrieved successfully",
  );
}

/**
 * Update an existing budget
 * PUT /budget/{budgetId}
 */
async function updateBudget(event, user, budgetId) {
  logger.info("Updating budget", {
    userId: user.userId,
    budgetId,
  });

  const requestBody = parseRequestBody(event.body);

  // Resolve budget access from DynamoDB
  const { budgetId: resolvedBudgetId, role, budgetStatus, budgetType } = await BudgetAccessResolver.resolveAccess(
    user.userId,
    dynamoHelpers,
  );

  // Enforce write permission
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  // Enforce family budget transparency: family budgets cannot have hidden/private categories
  if (budgetType === 'family' && requestBody.groups) {
    const allCategories = [
      ...(Array.isArray(requestBody.groups.income) ? requestBody.groups.income : []),
      ...(Array.isArray(requestBody.groups.savings) ? requestBody.groups.savings : []),
      ...(Array.isArray(requestBody.groups.expenses) ? requestBody.groups.expenses : []),
    ];
    const hasHiddenCategory = allCategories.some(
      (cat) => cat.hidden === true || cat.isPrivate === true || cat.visibility === 'private',
    );
    if (hasHiddenCategory) {
      return errorResponse.badRequest(
        'Family budgets cannot have hidden or private categories. All members must have full visibility.',
      );
    }
  }

  // Extract month from request body or query parameter
  let month =
    requestBody.month ||
    (event.queryStringParameters && event.queryStringParameters.month);

  // If no month provided, try to find the budget by budgetId
  if (!month) {
    // Query all budgets to find the one with this budgetId
    const budgets = await dynamoHelpers.queryByPK(`BUDGET#${resolvedBudgetId}`, {
      FilterExpression: "entityType = :entityType AND budgetId = :budgetId",
      ExpressionAttributeValues: {
        ":entityType": "BUDGET",
        ":budgetId": budgetId,
      },
    });

    if (budgets.length === 0) {
      return errorResponse.notFound(`Budget not found with ID ${budgetId}`);
    }

    month = budgets[0].month;
  }

  // Check if budget exists
  const existingBudget = await dynamoHelpers.getItem(
    `BUDGET#${resolvedBudgetId}`,
    `PERIOD#${month}`,
  );

  if (!existingBudget) {
    return errorResponse.notFound(`Budget not found for ${month}`);
  }

  // Prepare updates
  const updates = {};

  if (requestBody.groups) {
    // Normalize groups to ensure rollover fields are present
    updates.groups = normalizeGroupsWithRollover(requestBody.groups);
    const totals = calculateBudgetTotals(updates.groups);
    updates.totalIncome = totals.totalIncome;
    updates.totalSavings = totals.totalSavings;
    updates.totalExpenses = totals.totalExpenses;
    updates.remainingBalance = totals.remainingBalance;
    updates.totalRollover = calculateTotalRollover(updates.groups);
  }

  // Update the budget
  const updatedBudget = await dynamoHelpers.updateItem(
    `BUDGET#${resolvedBudgetId}`,
    `PERIOD#${month}`,
    updates,
  );

  logger.info("Budget updated successfully", {
    budgetId: resolvedBudgetId,
    month,
  });

  return successResponse(
    {
      budgetId: updatedBudget.budgetId,
      month: updatedBudget.month,
      totalIncome: updatedBudget.totalIncome,
      totalSavings: updatedBudget.totalSavings,
      totalExpenses: updatedBudget.totalExpenses,
      remainingBalance: updatedBudget.remainingBalance,
      totalRollover: updatedBudget.totalRollover || 0,
      groups: updatedBudget.groups,
      isAIGenerated: updatedBudget.isAIGenerated,
      createdAt: updatedBudget.createdAt,
      updatedAt: updatedBudget.updatedAt,
    },
    "Budget updated successfully",
  );
}

/**
 * Delete a budget
 * DELETE /budget/{budgetId}
 */
async function deleteBudget(event, user, budgetId) {
  logger.info("Deleting budget", {
    userId: user.userId,
    budgetId,
  });

  // Resolve budget access from DynamoDB
  const { budgetId: resolvedBudgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(
    user.userId,
    dynamoHelpers,
  );

  // Enforce write permission
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  const month =
    event.queryStringParameters && event.queryStringParameters.month;

  if (!month) {
    return errorResponse.badRequest(
      "Month parameter is required (format: YYYY-MM)",
    );
  }

  // Check if budget exists
  const existingBudget = await dynamoHelpers.getItem(
    `BUDGET#${resolvedBudgetId}`,
    `PERIOD#${month}`,
  );

  if (!existingBudget) {
    return errorResponse.notFound(`Budget not found for ${month}`);
  }

  // Soft-delete the budget by marking it as deleted
  await dynamoHelpers.updateItem(`BUDGET#${resolvedBudgetId}`, `PERIOD#${month}`, {
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    deletedBy: user.userId,
  });

  logger.info("Budget deleted successfully", {
    budgetId: resolvedBudgetId,
    month,
  });

  return successResponse(null, "Budget deleted successfully");
}

/**
 * Update rollover settings for a specific category
 * PUT /budget/categories/{categoryId}/rollover
 *
 * Request body:
 * {
 *   "month": "YYYY-MM",
 *   "groupType": "income" | "savings" | "expenses",
 *   "rolloverEnabled": boolean,
 *   "rolloverCap": number (optional)
 * }
 *
 * **Validates: Requirement 40.7** - Enable/disable rollover per category
 */
async function updateCategoryRollover(event, user, categoryId) {
  logger.info("Updating category rollover settings", {
    userId: user.userId,
    categoryId,
  });

  const requestBody = parseRequestBody(event.body);

  // Validate required fields
  if (!requestBody.month) {
    return errorResponse.badRequest("Month is required (format: YYYY-MM)");
  }

  if (!requestBody.groupType) {
    return errorResponse.badRequest(
      "groupType is required (income, savings, or expenses)",
    );
  }

  if (!["income", "savings", "expenses"].includes(requestBody.groupType)) {
    return errorResponse.badRequest(
      "groupType must be one of: income, savings, expenses",
    );
  }

  if (typeof requestBody.rolloverEnabled !== "boolean") {
    return errorResponse.badRequest("rolloverEnabled must be a boolean");
  }

  // Resolve budget access from DynamoDB
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(
    user.userId,
    dynamoHelpers,
  );

  // Enforce write permission
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  // Get the budget
  const budget = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `PERIOD#${requestBody.month}`,
  );

  if (!budget) {
    return errorResponse.notFound(`Budget not found for ${requestBody.month}`);
  }

  // Find and update the category
  let categoryFound = false;
  const updatedGroups = { ...budget.groups };

  if (updatedGroups[requestBody.groupType]) {
    updatedGroups[requestBody.groupType] = updatedGroups[
      requestBody.groupType
    ].map((group) => ({
      ...group,
      categories: group.categories
        ? group.categories.map((category) => {
            if (category.id === categoryId) {
              categoryFound = true;
              const updatedCategory = {
                ...category,
                rolloverEnabled: requestBody.rolloverEnabled,
                // If disabling rollover, reset rolloverAmount to 0
                rolloverAmount: requestBody.rolloverEnabled
                  ? category.rolloverAmount || 0
                  : 0,
              };

              // Handle rolloverCap
              if (
                requestBody.rolloverCap !== undefined &&
                requestBody.rolloverCap !== null
              ) {
                updatedCategory.rolloverCap = requestBody.rolloverCap;
              } else if (!requestBody.rolloverEnabled) {
                // Remove rolloverCap if disabling rollover
                delete updatedCategory.rolloverCap;
              }

              return updatedCategory;
            }
            return category;
          })
        : [],
    }));
  }

  if (!categoryFound) {
    return errorResponse.notFound(
      `Category ${categoryId} not found in ${requestBody.groupType}`,
    );
  }

  // Update the budget
  const updatedBudget = await dynamoHelpers.updateItem(
    `BUDGET#${budgetId}`,
    `PERIOD#${requestBody.month}`,
    {
      groups: updatedGroups,
      totalRollover: calculateTotalRollover(updatedGroups),
      updatedAt: new Date().toISOString(),
    },
  );

  logger.info("Category rollover settings updated successfully", {
    categoryId,
    budgetId,
    month: requestBody.month,
    rolloverEnabled: requestBody.rolloverEnabled,
  });

  return successResponse(
    {
      categoryId,
      rolloverEnabled: requestBody.rolloverEnabled,
      rolloverCap: requestBody.rolloverCap,
      totalRollover: updatedBudget.totalRollover,
    },
    "Category rollover settings updated successfully",
  );
}

/**
 * Reset rollover amount to 0 for a specific category
 * PUT /budget/categories/{categoryId}/rollover/reset
 *
 * Request body:
 * {
 *   "month": "YYYY-MM",
 *   "groupType": "income" | "savings" | "expenses"
 * }
 *
 * **Validates: Requirement 40.7** - Reset rollover (start fresh)
 */
async function resetCategoryRollover(event, user, categoryId) {
  logger.info("Resetting category rollover", {
    userId: user.userId,
    categoryId,
  });

  const requestBody = parseRequestBody(event.body);

  // Validate required fields
  if (!requestBody.month) {
    return errorResponse.badRequest("Month is required (format: YYYY-MM)");
  }

  if (!requestBody.groupType) {
    return errorResponse.badRequest(
      "groupType is required (income, savings, or expenses)",
    );
  }

  if (!["income", "savings", "expenses"].includes(requestBody.groupType)) {
    return errorResponse.badRequest(
      "groupType must be one of: income, savings, expenses",
    );
  }

  // Resolve budget access from DynamoDB
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(
    user.userId,
    dynamoHelpers,
  );

  // Enforce write permission
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  // Get the budget
  const budget = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `PERIOD#${requestBody.month}`,
  );

  if (!budget) {
    return errorResponse.notFound(`Budget not found for ${requestBody.month}`);
  }

  // Find and reset the category rollover
  let categoryFound = false;
  let previousRollover = 0;
  const updatedGroups = { ...budget.groups };

  if (updatedGroups[requestBody.groupType]) {
    updatedGroups[requestBody.groupType] = updatedGroups[
      requestBody.groupType
    ].map((group) => ({
      ...group,
      categories: group.categories
        ? group.categories.map((category) => {
            if (category.id === categoryId) {
              categoryFound = true;
              previousRollover = category.rolloverAmount || 0;
              return {
                ...category,
                rolloverAmount: 0, // Reset to 0
              };
            }
            return category;
          })
        : [],
    }));
  }

  if (!categoryFound) {
    return errorResponse.notFound(
      `Category ${categoryId} not found in ${requestBody.groupType}`,
    );
  }

  // Update the budget
  const updatedBudget = await dynamoHelpers.updateItem(
    `BUDGET#${budgetId}`,
    `PERIOD#${requestBody.month}`,
    {
      groups: updatedGroups,
      totalRollover: calculateTotalRollover(updatedGroups),
      updatedAt: new Date().toISOString(),
    },
  );

  logger.info("Category rollover reset successfully", {
    categoryId,
    budgetId,
    month: requestBody.month,
    previousRollover,
  });

  return successResponse(
    {
      categoryId,
      previousRollover,
      newRollover: 0,
      totalRollover: updatedBudget.totalRollover,
    },
    "Category rollover reset successfully",
  );
}

/**
 * Calculate budget totals from groups
 * Implements zero-based budgeting calculations
 */
function calculateBudgetTotals(groups) {
  let totalIncome = 0;
  let totalSavings = 0;
  let totalExpenses = 0;

  // Calculate income total
  if (groups.income) {
    totalIncome = groups.income.reduce((sum, category) => {
      return sum + (category.plannedAmount || 0);
    }, 0);
  }

  // Calculate savings total
  if (groups.savings) {
    totalSavings = groups.savings.reduce((sum, category) => {
      return sum + (category.plannedAmount || 0);
    }, 0);
  }

  // Calculate expenses total
  if (groups.expenses) {
    totalExpenses = groups.expenses.reduce((sum, category) => {
      return sum + (category.plannedAmount || 0);
    }, 0);
  }

  // Zero-based budgeting: Income - Savings - Expenses = 0 (ideally)
  const remainingBalance = totalIncome - totalSavings - totalExpenses;

  return {
    totalIncome,
    totalSavings,
    totalExpenses,
    remainingBalance,
  };
}

/**
 * Normalize category data to ensure rollover fields are present
 * Adds default values for rolloverEnabled, rolloverAmount, and rolloverCap
 *
 * @param {Object} category - The category object to normalize
 * @returns {Object} - Category with normalized rollover fields
 */
function normalizeCategoryWithRollover(category) {
  return {
    ...category,
    // Ensure rollover fields have default values
    rolloverEnabled: category.rolloverEnabled === true,
    rolloverAmount:
      typeof category.rolloverAmount === "number" ? category.rolloverAmount : 0,
    // rolloverCap is optional - only include if explicitly set
    ...(category.rolloverCap !== undefined && category.rolloverCap !== null
      ? { rolloverCap: category.rolloverCap }
      : {}),
  };
}

/**
 * Normalize all categories in budget groups with rollover fields
 *
 * @param {Object} groups - Budget groups (income, savings, expenses)
 * @returns {Object} - Groups with normalized categories
 */
function normalizeGroupsWithRollover(groups) {
  const normalizedGroups = {};

  ["income", "savings", "expenses"].forEach((groupType) => {
    if (groups[groupType]) {
      normalizedGroups[groupType] = groups[groupType].map((group) => ({
        ...group,
        categories: group.categories
          ? group.categories.map(normalizeCategoryWithRollover)
          : [],
      }));
    } else {
      normalizedGroups[groupType] = [];
    }
  });

  return normalizedGroups;
}

/**
 * Calculate total rollover amount across all categories
 *
 * @param {Object} groups - Budget groups (income, savings, expenses)
 * @returns {number} - Total rollover amount
 */
function calculateTotalRollover(groups) {
  let totalRollover = 0;

  ["income", "savings", "expenses"].forEach((groupType) => {
    if (groups[groupType]) {
      groups[groupType].forEach((group) => {
        if (group.categories) {
          group.categories.forEach((category) => {
            if (category.rolloverEnabled && category.rolloverAmount) {
              totalRollover += category.rolloverAmount;
            }
          });
        }
      });
    }
  });

  return totalRollover;
}

/**
 * Calculate rollover amount for a category during month transition
 *
 * Formula: newRollover = previousRollover + (previousPlanned - previousSpent)
 * - If rolloverEnabled is false, return 0
 * - If rolloverCap is set, cap the result: Math.min(newRollover, rolloverCap)
 * - Overspent categories can have negative rollover (debt to next month)
 *
 * @param {Object} previousCategory - Category from previous month's budget
 * @returns {number} - Calculated rollover amount for the new month
 *
 * **Validates: Requirement 40.4** - Calculate available budget as: Planned + Rollover - Spent
 * **Validates: Requirement 40.5** - Deduct overspent from next month's rollover
 */
function calculateRollover(previousCategory) {
  // If rollover is not enabled, return 0
  if (!previousCategory.rolloverEnabled) {
    return 0;
  }

  // Get values with defaults
  const previousRollover = previousCategory.rolloverAmount || 0;
  const plannedAmount = previousCategory.plannedAmount || 0;
  const spentAmount = previousCategory.spentAmount || 0;

  // Calculate unused amount (can be negative if overspent)
  const unused = plannedAmount - spentAmount;

  // Calculate new rollover: previous rollover + unused amount
  let newRollover = previousRollover + unused;

  // Apply cap if set (only cap positive rollovers, allow negative for debt)
  if (
    previousCategory.rolloverCap !== undefined &&
    previousCategory.rolloverCap !== null &&
    newRollover > 0
  ) {
    newRollover = Math.min(newRollover, previousCategory.rolloverCap);
  }

  return newRollover;
}

/**
 * Create a new budget with recurring items from the previous month
 * Implements rollover calculation during month transition
 *
 * **Validates: Requirement 40.4** - Calculate available budget
 * **Validates: Requirement 40.5** - Handle overspent categories (negative rollover)
 */
async function createBudgetWithRecurringItems(budgetId, month) {
  try {
    // Get the previous month's budget to copy recurring items
    const previousMonth = getPreviousMonth(month);
    const previousBudget = await dynamoHelpers.getItem(
      `BUDGET#${budgetId}`,
      `PERIOD#${previousMonth}`,
    );

    // Create base budget structure
    const newBudget = {
      PK: `BUDGET#${budgetId}`,
      SK: `PERIOD#${month}`,
      GSI1PK: `BUDGET#${budgetId}`,
      GSI1SK: `PERIOD#${month}`,

      entityType: "BUDGET",
      budgetId: month,
      month,

      groups: {
        income: [],
        savings: [],
        expenses: [],
      },

      totalIncome: 0,
      totalSavings: 0,
      totalExpenses: 0,
      remainingBalance: 0,
      totalRollover: 0,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // If previous budget exists, copy all items (they become recurring by default)
    if (previousBudget && previousBudget.groups) {
      logger.info("Copying items from previous month as recurring", {
        budgetId,
        previousMonth,
        currentMonth: month,
      });

      // Copy items from each group with rollover calculation
      // One-time categories (isOneTime === true) are NOT carried over to the new month
      ["income", "savings", "expenses"].forEach((groupType) => {
        if (previousBudget.groups[groupType]) {
          newBudget.groups[groupType] = previousBudget.groups[groupType].map(
            (group) => ({
              ...group,
              // Reset spent amounts for new month
              totalSpent: 0,
              categories: group.categories
                ? group.categories
                    .map((category) => {
                      // Skip one-time categories — they don't carry over
                      if (category.isOneTime) return null;

                      // Calculate new rollover amount based on previous month's spending
                      const newRolloverAmount = calculateRollover(category);

                      // Recalculate planned amount based on frequency (biweekly/weekly may differ by month)
                      const newPlannedAmount = calculateMonthlyAmount(category, month);

                      const newCategory = {
                        ...category,
                        // Recalculate planned amount for frequency-based categories
                        plannedAmount: newPlannedAmount,
                        // Reset spent amount for new month
                        spentAmount: 0,
                        remainingAmount: newPlannedAmount,
                        // Preserve rollover enabled setting
                        rolloverEnabled: category.rolloverEnabled || false,
                        // Set calculated rollover amount (0 if rollover disabled)
                        rolloverAmount: newRolloverAmount,
                      };

                      // Only include rolloverCap if it was set in previous month
                      if (
                        category.rolloverCap !== undefined &&
                        category.rolloverCap !== null
                      ) {
                        newCategory.rolloverCap = category.rolloverCap;
                      }

                      return newCategory;
                    })
                    .filter((c) => c !== null)
                : [],
            }),
          );
        }
      });

      // Recalculate totals based on planned amounts
      const totals = calculateBudgetTotals(newBudget.groups);
      newBudget.totalIncome = totals.totalIncome;
      newBudget.totalSavings = totals.totalSavings;
      newBudget.totalExpenses = totals.totalExpenses;
      newBudget.remainingBalance = totals.remainingBalance;

      // Calculate total rollover across all categories
      newBudget.totalRollover = calculateTotalRollover(newBudget.groups);

      logger.info("Recurring items copied with rollover calculation", {
        budgetId,
        month,
        totalIncome: newBudget.totalIncome,
        totalExpenses: newBudget.totalExpenses,
        totalRollover: newBudget.totalRollover,
      });
    } else {
      logger.info("No previous budget found, creating empty budget", {
        budgetId,
        month,
      });
    }

    // Save the new budget
    await dynamoHelpers.putItem(newBudget);

    return newBudget;
  } catch (error) {
    logger.error("Error creating budget with recurring items", {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      budgetId,
      month,
    });
    throw error;
  }
}

/**
 * Calculate the planned monthly amount for a category based on its frequency.
 * For biweekly/weekly, the count of periods in the target month is used.
 *
 * @param {Object} category - The category object (must have frequency, frequencyAmount or plannedAmount)
 * @param {string} targetMonth - Target month in YYYY-MM format
 * @returns {number} - Planned monthly amount for the target month
 */
function calculateMonthlyAmount(category, targetMonth) {
  if (!category.frequency || category.frequency === 'monthly') {
    return category.plannedAmount || 0;
  }

  const [year, month] = targetMonth.split('-').map(Number);

  if (category.frequency === 'biweekly') {
    // Count biweekly periods in this month.
    // Most months have 2 biweekly periods; months with 29+ days can fit 3.
    const daysInMonth = new Date(year, month, 0).getDate();
    const periods = daysInMonth >= 29 ? 3 : 2;
    const amountPerPeriod = category.frequencyAmount || (category.plannedAmount / 2) || 0;
    return Math.round(amountPerPeriod * periods);
  }

  if (category.frequency === 'weekly') {
    const daysInMonth = new Date(year, month, 0).getDate();
    const weeks = Math.ceil(daysInMonth / 7); // 4 or 5
    const amountPerWeek = category.frequencyAmount || (category.plannedAmount / 4) || 0;
    return Math.round(amountPerWeek * weeks);
  }

  if (category.frequency === 'semi-monthly') {
    const amountPerPeriod = category.frequencyAmount || (category.plannedAmount / 2) || 0;
    return Math.round(amountPerPeriod * 2);
  }

  return category.plannedAmount || 0;
}

/**
 * Get the previous month in YYYY-MM format
 */
function getPreviousMonth(month) {
  const date = new Date(month + "-01");
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().substring(0, 7);
}

/**
 * Budget Health Score — composite wellness metric
 *
 * Formula: (savings_rate × 0.4) + (budget_adherence × 0.4) + (goal_progress × 0.2)
 * All inputs normalised 0–100; output rounded to nearest integer.
 *
 * GET /budget/health-score
 */
async function getBudgetHealthScore(event, user) {
  const { userId } = user;

  const { budgetId } = await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers);

  const month = event.queryStringParameters?.month ||
    new Date().toISOString().substring(0, 7);

  const budget = await dynamoHelpers.getItem(`BUDGET#${budgetId}`, `PERIOD#${month}`);

  if (!budget) {
    return successResponse({ score: null, components: null }, 'No budget for this month');
  }

  const groups = budget.groups || {};
  const totals = calculateBudgetTotals(groups);

  // ── savings rate (0–100) ─────────────────────────────────────────
  // savings_rate = totalSavings / totalIncome (capped at 100%)
  const savingsRateRaw = totals.totalIncome > 0
    ? (totals.totalSavings / totals.totalIncome) * 100
    : 0;
  const savingsRate = Math.min(savingsRateRaw, 100);

  // ── budget adherence (0–100) ──────────────────────────────────────
  // Perfect adherence = all expense categories spent ≤ planned
  let totalPlannedExpenses = 0;
  let totalOverspend = 0;
  if (groups.expenses) {
    groups.expenses.forEach(group => {
      (group.categories || []).forEach(cat => {
        const planned = cat.plannedAmount || 0;
        const spent = cat.spentAmount || 0;
        totalPlannedExpenses += planned;
        if (spent > planned) totalOverspend += (spent - planned);
      });
    });
  }
  const adherenceRaw = totalPlannedExpenses > 0
    ? Math.max(0, (1 - totalOverspend / totalPlannedExpenses) * 100)
    : 100; // no expenses = perfect by default
  const adherence = Math.min(adherenceRaw, 100);

  // ── goal progress (0–100) ────────────────────────────────────────
  // Average progress across active goals
  let goalScore = 50; // default if no goals
  try {
    const goalItems = await dynamoHelpers.queryByPrefix(`BUDGET#${budgetId}`, 'GOAL#');
    const activeGoals = (goalItems || []).filter(g =>
      g.status === 'active' && g.targetAmount > 0
    );
    if (activeGoals.length > 0) {
      const avgProgress = activeGoals.reduce((sum, g) => {
        return sum + Math.min((g.currentAmount / g.targetAmount) * 100, 100);
      }, 0) / activeGoals.length;
      goalScore = avgProgress;
    }
  } catch (_e) {
    // Goals unavailable — use default
  }

  // ── composite score ──────────────────────────────────────────────
  const score = Math.round(
    (savingsRate * 0.4) + (adherence * 0.4) + (goalScore * 0.2)
  );

  // ── previous month for delta ──────────────────────────────────────
  const prevMonth = getPreviousMonth(month);
  let previousScore = null;
  try {
    const prevBudget = await dynamoHelpers.getItem(`BUDGET#${budgetId}`, `PERIOD#${prevMonth}`);
    if (prevBudget) {
      const prevTotals = calculateBudgetTotals(prevBudget.groups || {});
      const prevSavings = prevTotals.totalIncome > 0
        ? Math.min((prevTotals.totalSavings / prevTotals.totalIncome) * 100, 100)
        : 0;
      let prevTotalPlanned = 0, prevTotalOver = 0;
      if (prevBudget.groups?.expenses) {
        prevBudget.groups.expenses.forEach(g => {
          (g.categories || []).forEach(c => {
            prevTotalPlanned += c.plannedAmount || 0;
            if ((c.spentAmount || 0) > (c.plannedAmount || 0)) {
              prevTotalOver += (c.spentAmount - c.plannedAmount);
            }
          });
        });
      }
      const prevAdherence = prevTotalPlanned > 0
        ? Math.max(0, (1 - prevTotalOver / prevTotalPlanned) * 100)
        : 100;
      previousScore = Math.round((prevSavings * 0.4) + (prevAdherence * 0.4) + (50 * 0.2));
    }
  } catch (_e) {
    // Previous month unavailable
  }

  return successResponse({
    score,
    previousScore,
    delta: previousScore !== null ? score - previousScore : null,
    month,
    components: {
      savingsRate: Math.round(savingsRate),
      adherence: Math.round(adherence),
      goalProgress: Math.round(goalScore),
    },
    interpretation: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs work',
  }, 'Budget health score calculated');
}
