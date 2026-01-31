/**
 * BudgetBuddy Budget Management Lambda Function
 *
 * Handles budget CRUD operations, category management, and zero-based budgeting calculations.
 * Implements the core budget management system with real-time balance calculations.
 *
 * Version: 1.1.0 - Updated with encoding fixes and manual deployment trigger
 */

const {
  successResponse,
  errorResponse,
  parseRequestBody,
  getUserFromEvent,
  generateId,
  dynamoHelpers,
  logger,
  FamilyIdResolver,
} = require("/opt/nodejs/utils");

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

    if (httpMethod === "GET" && pathParameters && pathParameters.budgetId) {
      return await getBudget(event, user, pathParameters.budgetId);
    }

    if (httpMethod === "PUT" && pathParameters && pathParameters.budgetId) {
      return await updateBudget(event, user, pathParameters.budgetId);
    }

    if (httpMethod === "DELETE" && pathParameters && pathParameters.budgetId) {
      return await deleteBudget(event, user, pathParameters.budgetId);
    }

    // Default response for unhandled routes
    return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);
  } catch (error) {
    logger.error("Budget function error", error, {
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
    familyId: user.familyId,
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

  // Use centralized FamilyIdResolver to get familyId consistently
  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  // Log the resolution for debugging
  FamilyIdResolver.logFamilyIdResolution(
    "budget-service",
    "create-budget",
    user.userId,
    familyId,
    user.familyId ? "jwt" : "dynamodb-or-fallback",
  );

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

  const budgetId = generateId.budget();
  const currentTime = new Date().toISOString();

  // Check if budget already exists for this month
  const existingBudget = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
    `BUDGET#${requestBody.month}`,
  );

  if (existingBudget) {
    // Budget exists - update it instead of returning conflict
    logger.info("Budget already exists, updating existing budget", {
      familyId,
      month: requestBody.month,
    });

    // Prepare updates
    const updates = {
      updatedAt: currentTime,
    };

    if (requestBody.groups) {
      updates.groups = requestBody.groups;
      const totals = calculateBudgetTotals(requestBody.groups);
      updates.totalIncome = totals.totalIncome;
      updates.totalSavings = totals.totalSavings;
      updates.totalExpenses = totals.totalExpenses;
      updates.remainingBalance = totals.remainingBalance;
    }

    // Update the existing budget
    const updatedBudget = await dynamoHelpers.updateItem(
      `FAMILY#${familyId}`,
      `BUDGET#${requestBody.month}`,
      updates,
    );

    logger.info("Budget updated successfully", {
      budgetId: updatedBudget.budgetId,
      familyId,
      month: requestBody.month,
    });

    return successResponse(
      {
        budgetId: updatedBudget.budgetId,
        familyId: updatedBudget.familyId,
        month: updatedBudget.month,
        currency: updatedBudget.currency,
        totalIncome: updatedBudget.totalIncome,
        totalSavings: updatedBudget.totalSavings,
        totalExpenses: updatedBudget.totalExpenses,
        remainingBalance: updatedBudget.remainingBalance,
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
    PK: `FAMILY#${familyId}`,
    SK: `BUDGET#${requestBody.month}`,
    GSI2PK: `BUDGET#${requestBody.month}`,
    GSI2SK: `FAMILY#${familyId}`,
    entityType: "BUDGET",
    budgetId,
    familyId,
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
    budget.groups = requestBody.groups;
    const totals = calculateBudgetTotals(budget.groups);
    budget.totalIncome = totals.totalIncome;
    budget.totalSavings = totals.totalSavings;
    budget.totalExpenses = totals.totalExpenses;
    budget.remainingBalance = totals.remainingBalance;
  }

  await dynamoHelpers.putItem(budget);

  logger.info("Budget created successfully", {
    budgetId,
    familyId,
    month: requestBody.month,
  });

  return successResponse(
    {
      budgetId,
      familyId,
      month: requestBody.month,
      currency: budget.currency,
      totalIncome: budget.totalIncome,
      totalSavings: budget.totalSavings,
      totalExpenses: budget.totalExpenses,
      remainingBalance: budget.remainingBalance,
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
  logger.info("Getting budgets for family", {
    userId: user.userId,
    familyId: user.familyId,
  });

  // Use centralized FamilyIdResolver to get familyId consistently
  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  // Log the resolution for debugging
  FamilyIdResolver.logFamilyIdResolution(
    "budget-service",
    "get-budgets",
    user.userId,
    familyId,
    user.familyId ? "jwt" : "dynamodb-or-fallback",
  );

  console.log("getBudgets: CRITICAL DEBUG - Family ID resolution:");
  console.log("  - user.familyId from JWT:", user.familyId);
  console.log("  - user.userId from JWT:", user.userId);
  console.log("  - Final familyId used for query:", familyId);
  console.log("  - Query PK will be:", `FAMILY#${familyId}`);

  // Query all budgets for the family
  const budgets = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
    FilterExpression: "entityType = :entityType",
    ExpressionAttributeValues: {
      ":entityType": "BUDGET",
    },
  });

  console.log("getBudgets: Raw query result:", budgets.length, "items found");
  console.log("getBudgets: First budget item (if any):", budgets[0] || "none");

  // CRITICAL DEBUG: Log all budget months to identify the mismatch
  if (budgets.length > 0) {
    console.log(
      "getBudgets: All budget months found:",
      budgets.map((b) => b.month),
    );
    console.log(
      "getBudgets: All budget PKs found:",
      budgets.map((b) => b.PK),
    );
    console.log(
      "getBudgets: All budget familyIds found:",
      budgets.map((b) => b.familyId),
    );
  } else {
    console.log(
      "getBudgets: No budgets found - checking if any budgets exist at all",
    );

    // Query without filter to see if there are ANY budgets for this family
    const allItems = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`);
    console.log("getBudgets: All items for family:", allItems.length);
    if (allItems.length > 0) {
      console.log("getBudgets: Sample items found:", allItems.slice(0, 3));
    }
  }

  // Transform DynamoDB items to API response format
  const formattedBudgets = budgets.map((budget) => ({
    budgetId: budget.budgetId,
    familyId: budget.familyId,
    month: budget.month,
    totalIncome: budget.totalIncome,
    totalSavings: budget.totalSavings,
    totalExpenses: budget.totalExpenses,
    remainingBalance: budget.remainingBalance,
    groups: budget.groups,
    isAIGenerated: budget.isAIGenerated,
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
  }));

  // Sort by month (most recent first)
  formattedBudgets.sort((a, b) => b.month.localeCompare(a.month));

  logger.info("Budgets retrieved successfully", {
    familyId,
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
    familyId: user.familyId,
  });

  // Use centralized FamilyIdResolver to get familyId consistently
  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  // Log the resolution for debugging
  FamilyIdResolver.logFamilyIdResolution(
    "budget-service",
    "get-current-budget",
    user.userId,
    familyId,
    user.familyId ? "jwt" : "dynamodb-or-fallback",
  );

  // Extract month from query parameter
  const queryParams = event.queryStringParameters || {};
  const month = queryParams.month;

  if (!month) {
    return errorResponse.badRequest(
      "Month parameter is required (format: YYYY-MM)",
    );
  }

  let budget = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
    `BUDGET#${month}`,
  );

  // If no budget exists for this month, create one with recurring items from previous month
  if (!budget) {
    logger.info("No budget found for month, creating with recurring items", {
      familyId,
      month,
    });

    budget = await createBudgetWithRecurringItems(familyId, month);
  }

  logger.info("Budget retrieved successfully", {
    familyId,
    month,
  });

  return successResponse(
    {
      budgetId: budget.budgetId,
      familyId: budget.familyId,
      month: budget.month,
      totalIncome: budget.totalIncome,
      totalSavings: budget.totalSavings,
      totalExpenses: budget.totalExpenses,
      remainingBalance: budget.remainingBalance,
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
    familyId: user.familyId,
    budgetId,
  });

  // Use centralized FamilyIdResolver to get familyId consistently
  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  // Log the resolution for debugging
  FamilyIdResolver.logFamilyIdResolution(
    "budget-service",
    "get-budget",
    user.userId,
    familyId,
    user.familyId ? "jwt" : "dynamodb-or-fallback",
  );

  // Extract month from budgetId or query parameter
  const queryParams = event.queryStringParameters || {};
  const month = queryParams.month;

  if (!month) {
    return errorResponse.badRequest(
      "Month parameter is required (format: YYYY-MM)",
    );
  }

  const budget = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
    `BUDGET#${month}`,
  );

  if (!budget) {
    return errorResponse.notFound(`Budget not found for ${month}`);
  }

  logger.info("Budget retrieved successfully", {
    budgetId,
    familyId,
    month,
  });

  return successResponse(
    {
      budgetId: budget.budgetId,
      familyId: budget.familyId,
      month: budget.month,
      totalIncome: budget.totalIncome,
      totalSavings: budget.totalSavings,
      totalExpenses: budget.totalExpenses,
      remainingBalance: budget.remainingBalance,
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
    familyId: user.familyId,
    budgetId,
  });

  const requestBody = parseRequestBody(event.body);

  // Use centralized FamilyIdResolver to get familyId consistently
  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  // Log the resolution for debugging
  FamilyIdResolver.logFamilyIdResolution(
    "budget-service",
    "update-budget",
    user.userId,
    familyId,
    user.familyId ? "jwt" : "dynamodb-or-fallback",
  );

  // Extract month from request body or query parameter
  let month =
    requestBody.month ||
    (event.queryStringParameters && event.queryStringParameters.month);

  // If no month provided, try to find the budget by budgetId
  if (!month) {
    // Query all budgets to find the one with this budgetId
    const budgets = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
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
    `FAMILY#${familyId}`,
    `BUDGET#${month}`,
  );

  if (!existingBudget) {
    return errorResponse.notFound(`Budget not found for ${month}`);
  }

  // Prepare updates
  const updates = {};

  if (requestBody.groups) {
    updates.groups = requestBody.groups;
    const totals = calculateBudgetTotals(requestBody.groups);
    updates.totalIncome = totals.totalIncome;
    updates.totalSavings = totals.totalSavings;
    updates.totalExpenses = totals.totalExpenses;
    updates.remainingBalance = totals.remainingBalance;
  }

  // Update the budget
  const updatedBudget = await dynamoHelpers.updateItem(
    `FAMILY#${familyId}`,
    `BUDGET#${month}`,
    updates,
  );

  logger.info("Budget updated successfully", {
    budgetId,
    familyId,
    month,
  });

  return successResponse(
    {
      budgetId: updatedBudget.budgetId,
      familyId: updatedBudget.familyId,
      month: updatedBudget.month,
      totalIncome: updatedBudget.totalIncome,
      totalSavings: updatedBudget.totalSavings,
      totalExpenses: updatedBudget.totalExpenses,
      remainingBalance: updatedBudget.remainingBalance,
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
    familyId: user.familyId,
    budgetId,
  });

  // Use centralized FamilyIdResolver to get familyId consistently
  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  // Log the resolution for debugging
  FamilyIdResolver.logFamilyIdResolution(
    "budget-service",
    "delete-budget",
    user.userId,
    familyId,
    user.familyId ? "jwt" : "dynamodb-or-fallback",
  );

  const month =
    event.queryStringParameters && event.queryStringParameters.month;

  if (!month) {
    return errorResponse.badRequest(
      "Month parameter is required (format: YYYY-MM)",
    );
  }

  // Check if budget exists
  const existingBudget = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
    `BUDGET#${month}`,
  );

  if (!existingBudget) {
    return errorResponse.notFound(`Budget not found for ${month}`);
  }

  // Delete the budget (implement delete operation)
  // Note: DynamoDB delete operation would be implemented here
  // For now, we'll mark it as deleted by updating a status field
  await dynamoHelpers.updateItem(`FAMILY#${familyId}`, `BUDGET#${month}`, {
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    deletedBy: user.userId,
  });

  logger.info("Budget deleted successfully", {
    budgetId,
    familyId,
    month,
  });

  return successResponse(null, "Budget deleted successfully");
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
 * Create a new budget with recurring items from the previous month
 */
async function createBudgetWithRecurringItems(familyId, month) {
  try {
    // Get the previous month's budget to copy recurring items
    const previousMonth = getPreviousMonth(month);
    const previousBudget = await dynamoHelpers.getItem(
      `FAMILY#${familyId}`,
      `BUDGET#${previousMonth}`,
    );

    // Create base budget structure
    const newBudget = {
      PK: `FAMILY#${familyId}`,
      SK: `BUDGET#${month}`,
      GSI1PK: `FAMILY#${familyId}`,
      GSI1SK: `BUDGET#${month}`,

      entityType: "BUDGET",
      budgetId: month,
      familyId,
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

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // If previous budget exists, copy all items (they become recurring by default)
    if (previousBudget && previousBudget.groups) {
      logger.info("Copying items from previous month as recurring", {
        familyId,
        previousMonth,
        currentMonth: month,
      });

      // Copy items from each group
      ["income", "savings", "expenses"].forEach((groupType) => {
        if (previousBudget.groups[groupType]) {
          newBudget.groups[groupType] = previousBudget.groups[groupType].map(
            (group) => ({
              ...group,
              // Reset spent amounts for new month
              totalSpent: 0,
              categories: group.categories
                ? group.categories.map((category) => ({
                    ...category,
                    // Keep planned amount but reset spent amount
                    spentAmount: 0,
                    remainingAmount: category.plannedAmount || 0,
                  }))
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

      logger.info("Recurring items copied successfully", {
        familyId,
        month,
        totalIncome: newBudget.totalIncome,
        totalExpenses: newBudget.totalExpenses,
      });
    } else {
      logger.info("No previous budget found, creating empty budget", {
        familyId,
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
      familyId,
      month,
    });
    throw error;
  }
}

/**
 * Get the previous month in YYYY-MM format
 */
function getPreviousMonth(month) {
  const date = new Date(month + "-01");
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().substring(0, 7);
}
