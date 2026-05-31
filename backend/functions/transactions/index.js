/**
 * BudgetBuddy Transactions Lambda Function
 *
 * Handles transaction CRUD operations and automatic budget calculations.
 * Implements income and expense tracking with real-time budget updates.
 *
 * Version: 1.0.0 - Complete CRUD implementation
 */

const {
  successResponse,
  errorResponse,
  parseRequestBody,
  getUserFromEvent,
  generateId,
  dynamoHelpers,
  logger,
  BudgetAccessResolver,
} = require("/opt/nodejs/utils");

const {
  ValidationError,
  AuthorizationError,
  NotFoundError,
  BusinessLogicError,
} = require("./errors");
const { updateBudgetCalculations } = require("./budget-service");

// Import accounts service for balance updates
let accountsService = null;
try {
  // Try to load accounts service - may not exist in all environments
  accountsService = require("../accounts/service");
} catch (_error) {
  // Accounts service not available - balance updates will be skipped
}

/**
 * Update linked goals when a savings transaction is created
 * @param {string} budgetId - Budget ID
 * @param {string} categoryId - Category ID of the transaction
 * @param {number} amount - Transaction amount
 * @param {string} operation - 'add' or 'subtract'
 */
async function updateLinkedGoals(budgetId, categoryId, amount, operation) {
  try {
    // Find goals linked to this category
    const goals = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
      FilterExpression:
        "entityType = :entityType AND linkedCategoryId = :categoryId AND #status = :active AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":entityType": "GOAL",
        ":categoryId": categoryId,
        ":active": "active",
        ":false": false,
      },
    });

    if (goals.length === 0) {
      return; // No linked goals
    }

    const currentTime = new Date().toISOString();

    for (const goal of goals) {
      const currentAmount = goal.currentAmount || 0;
      const newAmount =
        operation === "add"
          ? currentAmount + amount
          : Math.max(0, currentAmount - amount);

      // Calculate new progress
      const progressPercent = Math.min(
        100,
        Math.round((newAmount / goal.targetAmount) * 100),
      );

      // Check for milestone achievements
      const milestoneThresholds = [25, 50, 75, 100];
      const updatedMilestones = { ...(goal.milestones || {}) };
      const newMilestones = [];

      for (const threshold of milestoneThresholds) {
        const key = String(threshold);
        if (!updatedMilestones[key]) {
          updatedMilestones[key] = { reached: false, date: null };
        }

        if (progressPercent >= threshold && !updatedMilestones[key].reached) {
          updatedMilestones[key] = { reached: true, date: currentTime };
          newMilestones.push(threshold);
        }
      }

      // Check if goal is complete
      let status = goal.status;
      let completedAt = goal.completedAt;
      if (progressPercent >= 100 && status === "active") {
        status = "completed";
        completedAt = currentTime;
      }

      // Calculate monthly required
      let monthlyRequired = null;
      if (goal.targetDate && newAmount < goal.targetAmount) {
        const today = new Date();
        const targetDate = new Date(goal.targetDate);
        const monthsRemaining = Math.max(
          1,
          (targetDate.getFullYear() - today.getFullYear()) * 12 +
            (targetDate.getMonth() - today.getMonth()),
        );
        const amountRemaining = goal.targetAmount - newAmount;
        monthlyRequired = Math.ceil(amountRemaining / monthsRemaining);
      }

      // Create contribution record for auto-updates
      const contributions = [...(goal.contributions || [])];
      if (operation === "add") {
        contributions.push({
          date: currentTime.split("T")[0],
          amount,
          source: "category-link",
          note: `Auto-added from linked category transaction`,
        });
      }

      // Update the goal
      await dynamoHelpers.updateItem(
        `BUDGET#${budgetId}`,
        `GOAL#${goal.goalId}`,
        {
          currentAmount: newAmount,
          progressPercent,
          monthlyRequired,
          milestones: updatedMilestones,
          contributions,
          status,
          completedAt,
          updatedAt: currentTime,
        },
      );

      logger.info("Linked goal updated from transaction", {
        goalId: goal.goalId,
        budgetId,
        categoryId,
        operation,
        amount,
        newAmount,
        progressPercent,
        newMilestones,
      });
    }
  } catch (error) {
    // Log but don't fail the transaction if goal update fails
    logger.error("Failed to update linked goals", {
      budgetId,
      categoryId,
      amount,
      operation,
      error: error.message,
    });
  }
}

/**
 * Update account balance when a transaction is created, updated, or deleted
 * @param {string} budgetId - Budget ID
 * @param {string} accountId - Account ID (may be null)
 * @param {string} transactionType - 'income' or 'expense'
 * @param {number} amount - Transaction amount
 * @param {string} operation - 'add' or 'subtract'
 */
async function updateAccountBalance(
  budgetId,
  accountId,
  transactionType,
  amount,
  operation,
) {
  // Skip if no account service or no accountId
  if (!accountsService || !accountId) {
    return;
  }

  try {
    // Get the account to determine its type
    const account = await accountsService.getAccount(budgetId, accountId);
    if (!account) {
      logger.warn("Account not found for balance update", {
        budgetId,
        accountId,
      });
      return;
    }

    // Calculate balance change based on account type and transaction type
    let balanceChange = accountsService.calculateBalanceChange(
      transactionType,
      amount,
      account.accountType,
    );

    // Reverse the change if we're subtracting (deleting/updating transaction)
    if (operation === "subtract") {
      balanceChange = -balanceChange;
    }

    // Update the account balance
    await accountsService.updateAccountBalance(
      budgetId,
      accountId,
      balanceChange,
    );

    logger.info("Account balance updated from transaction", {
      budgetId,
      accountId,
      transactionType,
      amount,
      operation,
      balanceChange,
    });
  } catch (error) {
    // Log but don't fail the transaction if account update fails
    logger.error("Failed to update account balance", {
      budgetId,
      accountId,
      transactionType,
      amount,
      operation,
      error: error.message,
    });
  }
}

/**
 * Main Lambda handler for transaction operations
 * Routes requests to appropriate handlers based on HTTP method and path
 */
exports.handler = async (event, context) => {
  logger.info("Transaction request received", {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context.awsRequestId,
  });

  try {
    const { httpMethod, path, pathParameters } = event;

    // Handle health check endpoint
    if (httpMethod === "GET" && path === "/transactions/health") {
      return successResponse(
        {
          status: "healthy",
          service: "transactions",
          version: "1.0.0",
        },
        "Transaction service is healthy",
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
    const { userId } = getUserFromEvent(event);
    logger.info("User authenticated", { userId });

    // Route to appropriate handler based on HTTP method and path
    if (httpMethod === "POST" && path === "/transactions") {
      return await createTransaction(event, userId);
    }

    if (httpMethod === "GET" && path === "/transactions") {
      return await getTransactions(event, userId);
    }

    if (
      httpMethod === "GET" &&
      pathParameters &&
      pathParameters.transactionId
    ) {
      return await getTransaction(event, userId, pathParameters.transactionId);
    }

    if (
      httpMethod === "PUT" &&
      pathParameters &&
      pathParameters.transactionId
    ) {
      return await updateTransaction(event, userId, pathParameters.transactionId);
    }

    if (
      httpMethod === "DELETE" &&
      pathParameters &&
      pathParameters.transactionId
    ) {
      return await deleteTransaction(event, userId, pathParameters.transactionId);
    }

    // Default response for unhandled routes
    return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);
  } catch (error) {
    logger.error("Transaction function error", error, {
      httpMethod: event.httpMethod,
      path: event.path,
      requestId: context.awsRequestId,
    });

    // Handle plain objects thrown by BudgetAccessResolver.assertPermission
    if (error && typeof error === 'object' && error.statusCode) {
      return {
        statusCode: error.statusCode,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Forbidden', message: error.message || 'Permission denied' }),
      };
    }

    // Handle specific error types
    if (error instanceof ValidationError) {
      return errorResponse.badRequest(error.message);
    }

    if (error instanceof AuthorizationError) {
      return errorResponse.unauthorized(error.message);
    }

    if (error instanceof NotFoundError) {
      return errorResponse.notFound(error.message);
    }

    if (error instanceof BusinessLogicError) {
      return errorResponse.badRequest(error.message);
    }

    // Handle legacy error patterns
    if (error.message.includes("No user claims")) {
      return errorResponse.unauthorized("Authentication required");
    }

    if (error.message.includes("Invalid JSON")) {
      return errorResponse.badRequest("Invalid JSON in request body");
    }

    // Log unexpected errors with more context
    logger.error("Unexpected transaction error", {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      httpMethod: event.httpMethod,
      path: event.path,
      requestId: context.awsRequestId,
    });

    return errorResponse.internalError("Transaction processing failed");
  }
};

/**
 * Create a new transaction
 * POST /transactions
 */
async function createTransaction(event, userId) {
  const { budgetId, role, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'transaction.create', budgetStatus);

  logger.info("Creating new transaction", { userId, budgetId });

  const requestBody = parseRequestBody(event.body);

  // Validate required fields
  const requiredFields = [
    "amount",
    "type",
    "categoryId",
    "description",
    "date",
  ];
  for (const field of requiredFields) {
    if (!requestBody[field]) {
      throw new ValidationError(`${field} is required`, field);
    }
  }

  // Validate transaction type
  if (!["income", "expense"].includes(requestBody.type)) {
    throw new ValidationError(
      'Type must be either "income" or "expense"',
      "type",
    );
  }

  // Validate amount is positive
  if (requestBody.amount <= 0) {
    throw new ValidationError("Amount must be positive", "amount");
  }

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestBody.date)) {
    throw new ValidationError("Date must be in YYYY-MM-DD format", "date");
  }

  const transactionId = generateId.transaction();
  const currentTime = new Date().toISOString();
  const budgetMonth = requestBody.date.substring(0, 7); // Extract YYYY-MM from date

  // Get budget's currency (default to USD if budget doesn't exist yet)
  let transactionCurrency = "USD";
  try {
    const budget = await dynamoHelpers.getItem(
      `BUDGET#${budgetId}`,
      `PERIOD#${budgetMonth}`,
    );
    if (budget && budget.currency) {
      transactionCurrency = budget.currency;
    }
  } catch (error) {
    logger.warn("Could not fetch budget currency, defaulting to USD", {
      budgetId,
      budgetMonth,
      error: error.message,
    });
  }

  // Create transaction object
  const transaction = {
    PK: `BUDGET#${budgetId}`,
    SK: `TRANSACTION#${transactionId}`,
    GSI1PK: `BUDGET#${budgetId}`,
    GSI1SK: `DATE#${requestBody.date}`,
    GSI2PK: `CATEGORY#${requestBody.categoryId}`,
    GSI2SK: `DATE#${requestBody.date}`,
    entityType: "TRANSACTION",
    transactionId,
    budgetId,
    budgetMonth,
    amount: requestBody.amount,
    currency: requestBody.currency || transactionCurrency, // Use provided currency or budget's currency
    type: requestBody.type,
    categoryId: requestBody.categoryId,
    description: requestBody.description,
    date: requestBody.date,
    merchantName: requestBody.merchantName || null,
    accountId: requestBody.accountId || null, // Optional account association
    createdBy: userId,
    createdAt: currentTime,
    updatedAt: currentTime,
  };

  // Save transaction to DynamoDB
  await dynamoHelpers.putItem(transaction);

  // Update budget calculations (only for tracked accounts)
  await updateBudgetCalculations(
    budgetId,
    budgetMonth,
    requestBody.categoryId,
    requestBody.type,
    requestBody.amount,
    "add",
    requestBody.accountId || null,
  );

  // Update linked goals if this is a savings/income transaction
  if (
    requestBody.type === "income" ||
    requestBody.categoryId.toLowerCase().includes("saving")
  ) {
    await updateLinkedGoals(
      budgetId,
      requestBody.categoryId,
      requestBody.amount,
      "add",
    );
  }

  // Update account balance if transaction is linked to an account
  if (requestBody.accountId) {
    await updateAccountBalance(
      budgetId,
      requestBody.accountId,
      requestBody.type,
      requestBody.amount,
      "add",
    );
  }

  logger.info("Transaction created successfully", {
    transactionId,
    budgetId,
    type: requestBody.type,
    amount: requestBody.amount,
  });

  return successResponse(
    {
      transactionId,
      budgetId,
      budgetMonth,
      amount: transaction.amount,
      currency: transaction.currency,
      type: transaction.type,
      categoryId: transaction.categoryId,
      description: transaction.description,
      date: transaction.date,
      merchantName: transaction.merchantName,
      accountId: transaction.accountId,
      createdBy: transaction.createdBy,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    },
    "Transaction created successfully",
  );
}

/**
 * Get transactions with filtering
 * GET /transactions?categoryId=...&type=...&startDate=...&endDate=...&limit=...&nextToken=...
 */
async function getTransactions(event, userId) {
  const { budgetId, role, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'transaction.read', budgetStatus);

  logger.info("Getting transactions for budget", { userId, budgetId });

  const queryParams = event.queryStringParameters || {};

  // Build query options based on filters
  const queryOptions = {
    FilterExpression: "entityType = :entityType",
    ExpressionAttributeValues: {
      ":entityType": "TRANSACTION",
    },
  };

  // Add filters
  const filters = [];

  if (queryParams.type) {
    filters.push("#type = :type");
    queryOptions.ExpressionAttributeNames =
      queryOptions.ExpressionAttributeNames || {};
    queryOptions.ExpressionAttributeNames["#type"] = "type";
    queryOptions.ExpressionAttributeValues[":type"] = queryParams.type;
  }

  if (queryParams.categoryId) {
    filters.push("categoryId = :categoryId");
    queryOptions.ExpressionAttributeValues[":categoryId"] =
      queryParams.categoryId;
  }

  if (queryParams.startDate) {
    filters.push("#date >= :startDate");
    queryOptions.ExpressionAttributeNames =
      queryOptions.ExpressionAttributeNames || {};
    queryOptions.ExpressionAttributeNames["#date"] = "date";
    queryOptions.ExpressionAttributeValues[":startDate"] =
      queryParams.startDate;
  }

  if (queryParams.endDate) {
    filters.push("#date <= :endDate");
    queryOptions.ExpressionAttributeNames =
      queryOptions.ExpressionAttributeNames || {};
    queryOptions.ExpressionAttributeNames["#date"] = "date";
    queryOptions.ExpressionAttributeValues[":endDate"] = queryParams.endDate;
  }

  if (queryParams.createdBy) {
    filters.push("createdBy = :createdBy");
    queryOptions.ExpressionAttributeValues[":createdBy"] =
      queryParams.createdBy;
  }

  if (queryParams.accountId) {
    filters.push("accountId = :accountId");
    queryOptions.ExpressionAttributeValues[":accountId"] =
      queryParams.accountId;
  }

  // Combine filters
  if (filters.length > 0) {
    queryOptions.FilterExpression += " AND " + filters.join(" AND ");
  }

  // Add pagination
  if (queryParams.limit) {
    queryOptions.Limit = parseInt(queryParams.limit);
  }

  if (queryParams.nextToken) {
    queryOptions.ExclusiveStartKey = JSON.parse(
      Buffer.from(queryParams.nextToken, "base64").toString(),
    );
  }

  // Query transactions for the budget
  const result = await dynamoHelpers.queryByPK(
    `BUDGET#${budgetId}`,
    queryOptions,
  );

  // Format transactions for response
  const transactions = result.map((transaction) => ({
    transactionId: transaction.transactionId,
    budgetId: transaction.budgetId,
    budgetMonth: transaction.budgetMonth,
    amount: transaction.amount,
    type: transaction.type,
    categoryId: transaction.categoryId,
    description: transaction.description,
    date: transaction.date,
    merchantName: transaction.merchantName,
    accountId: transaction.accountId || null,
    createdBy: transaction.createdBy,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  }));

  // Sort by date (most recent first)
  transactions.sort((a, b) => b.date.localeCompare(a.date));

  logger.info("Transactions retrieved successfully", {
    budgetId,
    transactionCount: transactions.length,
  });

  return successResponse(
    {
      transactions,
      count: transactions.length,
      nextToken: result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
            "base64",
          )
        : null,
    },
    "Transactions retrieved successfully",
  );
}

/**
 * Get a specific transaction by ID
 * GET /transactions/{transactionId}
 */
async function getTransaction(event, userId, transactionId) {
  const { budgetId, role, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'transaction.read', budgetStatus);

  logger.info("Getting specific transaction", { userId, budgetId, transactionId });

  const transaction = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `TRANSACTION#${transactionId}`,
  );

  if (!transaction) {
    return errorResponse.notFound(
      `Transaction not found with ID ${transactionId}`,
    );
  }

  logger.info("Transaction retrieved successfully", { transactionId, budgetId });

  return successResponse(
    {
      transactionId: transaction.transactionId,
      budgetId: transaction.budgetId,
      budgetMonth: transaction.budgetMonth,
      amount: transaction.amount,
      type: transaction.type,
      categoryId: transaction.categoryId,
      description: transaction.description,
      date: transaction.date,
      merchantName: transaction.merchantName,
      accountId: transaction.accountId || null,
      createdBy: transaction.createdBy,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    },
    "Transaction retrieved successfully",
  );
}

/**
 * Update an existing transaction
 * PUT /transactions/{transactionId}
 */
async function updateTransaction(event, userId, transactionId) {
  const { budgetId, role, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'transaction.edit', budgetStatus);

  logger.info("Updating transaction", { userId, budgetId, transactionId });

  const requestBody = parseRequestBody(event.body);

  // Check if transaction exists
  const existingTransaction = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `TRANSACTION#${transactionId}`,
  );

  if (!existingTransaction) {
    return errorResponse.notFound(
      `Transaction not found with ID ${transactionId}`,
    );
  }

  // Prepare updates
  const updates = {
    updatedAt: new Date().toISOString(),
  };

  let budgetUpdateNeeded = false;
  let accountUpdateNeeded = false;
  const oldAmount = existingTransaction.amount;
  const oldType = existingTransaction.type;
  const oldCategoryId = existingTransaction.categoryId;
  const oldAccountId = existingTransaction.accountId;

  if (requestBody.amount !== undefined) {
    if (requestBody.amount <= 0) {
      return errorResponse.badRequest("Amount must be positive");
    }
    updates.amount = requestBody.amount;
    budgetUpdateNeeded = true;
  }

  if (requestBody.type !== undefined) {
    if (!["income", "expense"].includes(requestBody.type)) {
      return errorResponse.badRequest(
        'Type must be either "income" or "expense"',
      );
    }
    updates.type = requestBody.type;
    budgetUpdateNeeded = true;
  }

  if (requestBody.categoryId !== undefined) {
    updates.categoryId = requestBody.categoryId;
    budgetUpdateNeeded = true;
  }

  if (requestBody.description !== undefined) {
    updates.description = requestBody.description;
  }

  if (requestBody.date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestBody.date)) {
      return errorResponse.badRequest("Date must be in YYYY-MM-DD format");
    }
    updates.date = requestBody.date;
    updates.budgetMonth = requestBody.date.substring(0, 7);
  }

  if (requestBody.merchantName !== undefined) {
    updates.merchantName = requestBody.merchantName;
  }

  if (requestBody.accountId !== undefined) {
    updates.accountId = requestBody.accountId;
    accountUpdateNeeded = true;
  }

  // Also need to update account if amount or type changed
  if (budgetUpdateNeeded && oldAccountId) {
    accountUpdateNeeded = true;
  }

  // Update the transaction
  const updatedTransaction = await dynamoHelpers.updateItem(
    `BUDGET#${budgetId}`,
    `TRANSACTION#${transactionId}`,
    updates,
  );

  // Update budget calculations if amount, type, or category changed
  if (budgetUpdateNeeded) {
    // Remove old transaction impact (use old accountId for tracking check)
    await updateBudgetCalculations(
      budgetId,
      existingTransaction.budgetMonth,
      oldCategoryId,
      oldType,
      oldAmount,
      "subtract",
      oldAccountId || null,
    );

    // Update linked goals for old category (subtract)
    if (
      oldType === "income" ||
      oldCategoryId.toLowerCase().includes("saving")
    ) {
      await updateLinkedGoals(budgetId, oldCategoryId, oldAmount, "subtract");
    }

    // Add new transaction impact
    const newAmount = updatedTransaction.amount;
    const newType = updatedTransaction.type;
    const newCategoryId = updatedTransaction.categoryId;
    const newBudgetMonth = updatedTransaction.budgetMonth;
    const newAccountId = updatedTransaction.accountId;

    await updateBudgetCalculations(
      budgetId,
      newBudgetMonth,
      newCategoryId,
      newType,
      newAmount,
      "add",
      newAccountId || null,
    );

    // Update linked goals for new category (add)
    if (
      newType === "income" ||
      newCategoryId.toLowerCase().includes("saving")
    ) {
      await updateLinkedGoals(budgetId, newCategoryId, newAmount, "add");
    }
  }

  // Update account balances if account, amount, or type changed
  if (accountUpdateNeeded) {
    const newAccountId = updatedTransaction.accountId;
    const newAmount = updatedTransaction.amount;
    const newType = updatedTransaction.type;

    // Reverse old account balance if there was an old account
    if (oldAccountId) {
      await updateAccountBalance(
        budgetId,
        oldAccountId,
        oldType,
        oldAmount,
        "subtract",
      );
    }

    // Apply new account balance if there is a new account
    if (newAccountId) {
      await updateAccountBalance(
        budgetId,
        newAccountId,
        newType,
        newAmount,
        "add",
      );
    }
  }

  logger.info("Transaction updated successfully", { transactionId, budgetId });

  return successResponse(
    {
      transactionId: updatedTransaction.transactionId,
      budgetId: updatedTransaction.budgetId,
      budgetMonth: updatedTransaction.budgetMonth,
      amount: updatedTransaction.amount,
      type: updatedTransaction.type,
      categoryId: updatedTransaction.categoryId,
      description: updatedTransaction.description,
      date: updatedTransaction.date,
      merchantName: updatedTransaction.merchantName,
      accountId: updatedTransaction.accountId || null,
      createdBy: updatedTransaction.createdBy,
      createdAt: updatedTransaction.createdAt,
      updatedAt: updatedTransaction.updatedAt,
    },
    "Transaction updated successfully",
  );
}

/**
 * Delete a transaction
 * DELETE /transactions/{transactionId}
 */
async function deleteTransaction(event, userId, transactionId) {
  const { budgetId, role, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'transaction.delete', budgetStatus);

  logger.info("Deleting transaction", { userId, budgetId, transactionId });

  // Check if transaction exists
  const existingTransaction = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `TRANSACTION#${transactionId}`,
  );

  if (!existingTransaction) {
    return errorResponse.notFound(
      `Transaction not found with ID ${transactionId}`,
    );
  }

  // Mark transaction as deleted (soft delete for audit trail)
  await dynamoHelpers.updateItem(
    `BUDGET#${budgetId}`,
    `TRANSACTION#${transactionId}`,
    {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: userId,
    },
  );

  // Update budget calculations (subtract the transaction impact, only for tracked accounts)
  await updateBudgetCalculations(
    budgetId,
    existingTransaction.budgetMonth,
    existingTransaction.categoryId,
    existingTransaction.type,
    existingTransaction.amount,
    "subtract",
    existingTransaction.accountId || null,
  );

  // Update linked goals if this was a savings/income transaction
  if (
    existingTransaction.type === "income" ||
    existingTransaction.categoryId.toLowerCase().includes("saving")
  ) {
    await updateLinkedGoals(
      budgetId,
      existingTransaction.categoryId,
      existingTransaction.amount,
      "subtract",
    );
  }

  // Reverse account balance if transaction was linked to an account
  if (existingTransaction.accountId) {
    await updateAccountBalance(
      budgetId,
      existingTransaction.accountId,
      existingTransaction.type,
      existingTransaction.amount,
      "subtract",
    );
  }

  logger.info("Transaction deleted successfully", { transactionId, budgetId });

  return successResponse(null, "Transaction deleted successfully");
}

// Budget calculation functions moved to budget-service.js for better separation of concerns
