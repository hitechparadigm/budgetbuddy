/**
 * Restore Service - Data Restoration from Backup
 * Handles restoration of budget and transaction data from JSON backups
 */

const { getUserFromEvent, dynamoHelpers } = require("/opt/nodejs/utils");

// See the 501 guard in the handler; flip only after the budget-key migration
const RESTORE_DISABLED = true;

/**
 * Get CORS headers for API responses
 */
function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

/**
 * Get user's family ID from their profile
 */
async function getFamilyId(userId) {
  try {
    const profile = await dynamoHelpers.getItem(`USER#${userId}`, "PROFILE");

    if (!profile) {
      throw new Error("User profile not found");
    }

    return profile.familyId;
  } catch (error) {
    console.error("Error getting family ID:", error);
    throw error;
  }
}

/**
 * Validate backup data structure
 */
function validateBackupData(backupData) {
  const errors = [];

  // Check required fields
  if (!backupData.version) {
    errors.push("Missing version field");
  }

  if (!backupData.data) {
    errors.push("Missing data field");
  }

  if (!backupData.data?.budgets || !Array.isArray(backupData.data.budgets)) {
    errors.push("Missing or invalid budgets array");
  }

  if (
    !backupData.data?.transactions ||
    !Array.isArray(backupData.data.transactions)
  ) {
    errors.push("Missing or invalid transactions array");
  }

  // Validate budget structure
  backupData.data?.budgets?.forEach((budget, index) => {
    if (!budget.month) {
      errors.push(`Budget ${index}: Missing month field`);
    }
    if (!budget.categories || !Array.isArray(budget.categories)) {
      errors.push(`Budget ${index}: Missing or invalid categories array`);
    }
  });

  // Validate transaction structure
  backupData.data?.transactions?.forEach((transaction, index) => {
    if (!transaction.date) {
      errors.push(`Transaction ${index}: Missing date field`);
    }
    if (!transaction.category) {
      errors.push(`Transaction ${index}: Missing category field`);
    }
    if (transaction.amount === undefined || transaction.amount === null) {
      errors.push(`Transaction ${index}: Missing amount field`);
    }
    if (!transaction.type) {
      errors.push(`Transaction ${index}: Missing type field`);
    }
  });

  return errors;
}

/**
 * Restore budgets to DynamoDB
 */
async function restoreBudgets(familyId, budgets) {
  const restoredBudgets = [];

  for (const budget of budgets) {
    try {
      const budgetId =
        budget.budgetId ||
        `budget_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const now = new Date().toISOString();

      const item = {
        PK: `FAMILY#${familyId}`,
        SK: `BUDGET#${budgetId}`,
        GSI1PK: `FAMILY#${familyId}`,
        GSI1SK: `BUDGET#${budget.month}`,
        budgetId,
        month: budget.month,
        categories: budget.categories || [],
        totalIncome: budget.totalIncome || 0,
        totalSavings: budget.totalSavings || 0,
        totalExpenses: budget.totalExpenses || 0,
        createdAt: budget.createdAt || now,
        updatedAt: now,
      };

      await dynamoHelpers.putItem(item);

      restoredBudgets.push(budgetId);
    } catch (error) {
      console.error(`Error restoring budget ${budget.month}:`, error);
      throw error;
    }
  }

  return restoredBudgets;
}

/**
 * Restore transactions to DynamoDB
 */
async function restoreTransactions(familyId, transactions) {
  const restoredTransactions = [];

  for (const transaction of transactions) {
    try {
      const transactionId =
        transaction.transactionId ||
        `transaction_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const now = new Date().toISOString();

      const item = {
        PK: `FAMILY#${familyId}`,
        SK: `TRANSACTION#${transactionId}`,
        GSI1PK: `FAMILY#${familyId}`,
        GSI1SK: `TRANSACTION#${transaction.date}`,
        transactionId,
        date: transaction.date,
        category: transaction.category,
        description: transaction.description || "",
        amount: transaction.amount,
        type: transaction.type,
        budgetMonth: transaction.budgetMonth,
        createdAt: transaction.createdAt || now,
      };

      await dynamoHelpers.putItem(item);

      restoredTransactions.push(transactionId);
    } catch (error) {
      console.error(
        `Error restoring transaction ${transaction.transactionId}:`,
        error,
      );
      throw error;
    }
  }

  return restoredTransactions;
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  // Never log the raw event: it carries the bearer token and the backup body
  console.log("Restore request:", { httpMethod: event.httpMethod, path: event.path });

  try {
    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: "",
      };
    }

    // The Cognito authorizer has already verified the token; read its claims
    let userId;
    try {
      ({ userId } = getUserFromEvent(event));
    } catch (_authError) {
      userId = null;
    }

    if (!userId) {
      return {
        statusCode: 401,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          error: "Invalid or missing authentication token",
        }),
      };
    }

    // Get family ID
    const familyId = await getFamilyId(userId);

    // Parse backup data from request body
    let backupData;
    try {
      backupData = JSON.parse(event.body);
    } catch (_e) {
      return {
        statusCode: 400,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          error: "Invalid JSON in request body",
        }),
      };
    }

    // Validate backup data
    const validationErrors = validateBackupData(backupData);
    if (validationErrors.length > 0) {
      return {
        statusCode: 400,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          error: "Invalid backup data",
          details: validationErrors,
        }),
      };
    }

    // Holding action: restoreBudgets/restoreTransactions still write the
    // retired FAMILY#<familyId> / BUDGET#, TRANSACTION# layout and read the
    // removed profile.familyId. Writing that into the live table would create
    // rows nothing reads, so refuse until the budget-key migration lands.
    if (RESTORE_DISABLED) {
      return {
        statusCode: 501,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          error: "Restore is disabled pending the budget-key migration",
        }),
      };
    }

    // Restore budgets and transactions
    const [restoredBudgets, restoredTransactions] = await Promise.all([
      restoreBudgets(familyId, backupData.data.budgets),
      restoreTransactions(familyId, backupData.data.transactions),
    ]);

    // Return success response
    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        success: true,
        message: "Data restored successfully",
        restored: {
          budgets: restoredBudgets.length,
          transactions: restoredTransactions.length,
        },
      }),
    };
  } catch (error) {
    console.error("Error restoring data:", error);
    return {
      statusCode: 500,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        error: "Failed to restore data",
        message: error.message,
      }),
    };
  }
};
