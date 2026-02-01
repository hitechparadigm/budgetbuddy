/**
 * BudgetBuddy Plaid Integration Lambda Function
 *
 * Handles bank account linking via Plaid, transaction sync, and account management.
 * Supports mock mode for development without Plaid credentials.
 *
 * Version: 1.0.0
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

const { checkPermission } = require("/opt/nodejs/shared");

// Mock mode flag - set via environment variable
const MOCK_MODE = process.env.PLAID_MOCK_MODE === "true";

// Sync limits
const SYNCS_PER_DAY_PER_ACCOUNT = 1;

/**
 * Main Lambda handler for Plaid operations
 */
exports.handler = async (event, context) => {
  logger.info("Plaid request received", {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context.awsRequestId,
    mockMode: MOCK_MODE,
  });

  try {
    const { httpMethod, path, pathParameters } = event;

    // Health check endpoint
    if (httpMethod === "GET" && path === "/plaid/health") {
      return successResponse(
        {
          status: "healthy",
          service: "plaid",
          version: "1.0.0",
          mockMode: MOCK_MODE,
        },
        "Plaid service is healthy",
      );
    }

    // CORS preflight
    if (httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
        },
        body: "",
      };
    }

    const user = getUserFromEvent(event);
    logger.info("User authenticated", { userId: user.userId });

    // Route handling
    if (httpMethod === "POST" && path === "/plaid/link-token") {
      return await createLinkToken(event, user);
    }

    if (httpMethod === "POST" && path === "/plaid/exchange-token") {
      return await exchangePublicToken(event, user);
    }

    if (httpMethod === "GET" && path === "/plaid/accounts") {
      return await getLinkedAccounts(event, user);
    }

    if (httpMethod === "DELETE" && pathParameters?.accountId) {
      return await unlinkAccount(event, user, pathParameters.accountId);
    }

    if (httpMethod === "POST" && path === "/plaid/sync") {
      return await syncTransactions(event, user);
    }

    if (
      httpMethod === "POST" &&
      pathParameters?.accountId &&
      path.endsWith("/sync")
    ) {
      return await syncAccountTransactions(
        event,
        user,
        pathParameters.accountId,
      );
    }

    if (httpMethod === "GET" && path === "/plaid/pending") {
      return await getPendingTransactions(event, user);
    }

    if (httpMethod === "POST" && path === "/plaid/pending/approve") {
      return await approvePendingTransactions(event, user);
    }

    if (httpMethod === "GET" && path === "/plaid/sync-status") {
      return await getSyncStatus(event, user);
    }

    return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);
  } catch (error) {
    logger.error("Plaid function error", error, {
      requestId: context.awsRequestId,
    });

    if (error.message.includes("No user claims")) {
      return errorResponse.unauthorized("Authentication required");
    }
    return errorResponse.internalError(
      "An error occurred processing your request",
    );
  }
};

/**
 * Create Plaid Link token for account linking
 * POST /plaid/link-token
 */
async function createLinkToken(event, user) {
  const permissionError = checkPermission(event, "transaction:create");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  logger.info("Creating link token", { familyId, mockMode: MOCK_MODE });

  if (MOCK_MODE) {
    // Return mock link token for development
    return successResponse(
      {
        linkToken: `mock-link-token-${Date.now()}`,
        expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        mockMode: true,
      },
      "Link token created (mock mode)",
    );
  }

  // In production, this would call Plaid API
  // const plaidClient = getPlaidClient();
  // const response = await plaidClient.linkTokenCreate({...});

  return errorResponse.badRequest(
    "Plaid integration not configured. Enable mock mode for development.",
  );
}

/**
 * Exchange public token for access token
 * POST /plaid/exchange-token
 */
async function exchangePublicToken(event, user) {
  const permissionError = checkPermission(event, "transaction:create");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const body = parseRequestBody(event.body);

  if (!body.publicToken && !MOCK_MODE) {
    return errorResponse.badRequest("publicToken is required");
  }

  logger.info("Exchanging public token", { familyId, mockMode: MOCK_MODE });

  const currentTime = new Date().toISOString();
  const accountId = generateId.custom("acct");

  if (MOCK_MODE) {
    // Create mock linked account
    const mockAccount = {
      PK: `FAMILY#${familyId}`,
      SK: `PLAID_ACCOUNT#${accountId}`,
      entityType: "PLAID_ACCOUNT",
      accountId,
      familyId,
      institutionId: "mock-institution",
      institutionName: body.institutionName || "Mock Bank",
      accountName: body.accountName || "Mock Checking",
      accountType: body.accountType || "checking",
      accountMask: "1234",
      currentBalance: 5000.0,
      availableBalance: 4500.0,
      lastSyncAt: null,
      syncCursor: null,
      status: "active",
      createdBy: user.userId,
      createdAt: currentTime,
      updatedAt: currentTime,
    };

    await dynamoHelpers.putItem(mockAccount);

    return successResponse(
      {
        accountId,
        institutionName: mockAccount.institutionName,
        accountName: mockAccount.accountName,
        accountType: mockAccount.accountType,
        mockMode: true,
      },
      "Account linked successfully (mock mode)",
    );
  }

  // In production, this would:
  // 1. Exchange public token for access token via Plaid API
  // 2. Store access token in Secrets Manager
  // 3. Fetch account details
  // 4. Store account record in DynamoDB

  return errorResponse.badRequest(
    "Plaid integration not configured. Enable mock mode for development.",
  );
}

/**
 * Get all linked accounts
 * GET /plaid/accounts
 */
async function getLinkedAccounts(event, user) {
  const permissionError = checkPermission(event, "transaction:view");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const accounts = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
    FilterExpression: "entityType = :entityType AND #status = :active",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":entityType": "PLAID_ACCOUNT",
      ":active": "active",
    },
  });

  return successResponse(
    {
      accounts: accounts.map(formatAccountResponse),
      count: accounts.length,
      mockMode: MOCK_MODE,
    },
    "Linked accounts retrieved successfully",
  );
}

/**
 * Unlink a bank account
 * DELETE /plaid/accounts/{accountId}
 */
async function unlinkAccount(event, user, accountId) {
  const permissionError = checkPermission(event, "transaction:delete");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const account = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
    `PLAID_ACCOUNT#${accountId}`,
  );

  if (!account || account.status !== "active") {
    return errorResponse.notFound("Account not found");
  }

  // Soft delete
  await dynamoHelpers.updateItem(
    `FAMILY#${familyId}`,
    `PLAID_ACCOUNT#${accountId}`,
    {
      status: "unlinked",
      unlinkedAt: new Date().toISOString(),
      unlinkedBy: user.userId,
    },
  );

  // In production, would also revoke Plaid access token

  logger.info("Account unlinked", { accountId, familyId });

  return successResponse(null, "Account unlinked successfully");
}

/**
 * Sync transactions for all accounts
 * POST /plaid/sync
 */
async function syncTransactions(event, user) {
  const permissionError = checkPermission(event, "transaction:create");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  // Get all active accounts
  const accounts = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
    FilterExpression: "entityType = :entityType AND #status = :active",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":entityType": "PLAID_ACCOUNT",
      ":active": "active",
    },
  });

  if (accounts.length === 0) {
    return errorResponse.badRequest("No linked accounts found");
  }

  const results = [];
  const today = new Date().toISOString().split("T")[0];

  for (const account of accounts) {
    // Check if already synced today (1 sync per day per account limit)
    const lastSyncDate = account.lastSyncAt
      ? account.lastSyncAt.split("T")[0]
      : null;

    if (lastSyncDate === today) {
      results.push({
        accountId: account.accountId,
        status: "skipped",
        reason: "Already synced today (limit: 1 sync/day/account)",
      });
      continue;
    }

    // Sync this account
    const syncResult = await syncSingleAccount(familyId, account, user.userId);
    results.push(syncResult);
  }

  return successResponse(
    {
      results,
      syncedCount: results.filter((r) => r.status === "success").length,
      skippedCount: results.filter((r) => r.status === "skipped").length,
    },
    "Sync completed",
  );
}

/**
 * Sync transactions for a specific account
 * POST /plaid/accounts/{accountId}/sync
 */
async function syncAccountTransactions(event, user, accountId) {
  const permissionError = checkPermission(event, "transaction:create");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const account = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
    `PLAID_ACCOUNT#${accountId}`,
  );

  if (!account || account.status !== "active") {
    return errorResponse.notFound("Account not found");
  }

  // Check daily sync limit
  const today = new Date().toISOString().split("T")[0];
  const lastSyncDate = account.lastSyncAt
    ? account.lastSyncAt.split("T")[0]
    : null;

  if (lastSyncDate === today) {
    return errorResponse.badRequest(
      `Account already synced today. Limit: ${SYNCS_PER_DAY_PER_ACCOUNT} sync per day per account.`,
    );
  }

  const result = await syncSingleAccount(familyId, account, user.userId);

  return successResponse(result, "Account sync completed");
}

/**
 * Get pending transactions awaiting approval
 * GET /plaid/pending
 */
async function getPendingTransactions(event, user) {
  const permissionError = checkPermission(event, "transaction:view");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const pending = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
    FilterExpression: "entityType = :entityType AND #status = :pending",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":entityType": "PENDING_TRANSACTION",
      ":pending": "pending",
    },
  });

  return successResponse(
    {
      transactions: pending.map(formatPendingTransaction),
      count: pending.length,
    },
    "Pending transactions retrieved successfully",
  );
}

/**
 * Approve pending transactions
 * POST /plaid/pending/approve
 */
async function approvePendingTransactions(event, user) {
  const permissionError = checkPermission(event, "transaction:create");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const body = parseRequestBody(event.body);

  if (!body.transactionIds || !Array.isArray(body.transactionIds)) {
    return errorResponse.badRequest("transactionIds array is required");
  }

  const currentTime = new Date().toISOString();
  const approved = [];
  const failed = [];

  for (const pendingId of body.transactionIds) {
    try {
      const pending = await dynamoHelpers.getItem(
        `FAMILY#${familyId}`,
        `PENDING_TRANSACTION#${pendingId}`,
      );

      if (!pending || pending.status !== "pending") {
        failed.push({
          id: pendingId,
          reason: "Not found or already processed",
        });
        continue;
      }

      // Create actual transaction
      const transactionId = generateId.custom("txn");
      const transaction = {
        PK: `FAMILY#${familyId}`,
        SK: `TRANSACTION#${transactionId}`,
        GSI1PK: `FAMILY#${familyId}`,
        GSI1SK: `TRANSACTION#${pending.date}#${transactionId}`,
        entityType: "TRANSACTION",
        transactionId,
        familyId,
        type: pending.amount < 0 ? "expense" : "income",
        amount: Math.abs(pending.amount),
        categoryId: pending.categoryId || null,
        categoryName: pending.categoryName || "Uncategorized",
        description: pending.description,
        merchant: pending.merchant,
        date: pending.date,
        plaidTransactionId: pending.plaidTransactionId,
        plaidAccountId: pending.plaidAccountId,
        source: "plaid",
        createdBy: user.userId,
        createdAt: currentTime,
        updatedAt: currentTime,
      };

      await dynamoHelpers.putItem(transaction);

      // Mark pending as approved
      await dynamoHelpers.updateItem(
        `FAMILY#${familyId}`,
        `PENDING_TRANSACTION#${pendingId}`,
        {
          status: "approved",
          approvedAt: currentTime,
          approvedBy: user.userId,
          transactionId,
        },
      );

      approved.push({ pendingId, transactionId });
    } catch (error) {
      logger.error("Failed to approve transaction", error, { pendingId });
      failed.push({ id: pendingId, reason: error.message });
    }
  }

  return successResponse(
    {
      approved,
      failed,
      approvedCount: approved.length,
      failedCount: failed.length,
    },
    "Transactions processed",
  );
}

/**
 * Get sync status for all accounts
 * GET /plaid/sync-status
 */
async function getSyncStatus(event, user) {
  const permissionError = checkPermission(event, "transaction:view");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const accounts = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
    FilterExpression: "entityType = :entityType AND #status = :active",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":entityType": "PLAID_ACCOUNT",
      ":active": "active",
    },
  });

  const today = new Date().toISOString().split("T")[0];

  const status = accounts.map((account) => {
    const lastSyncDate = account.lastSyncAt
      ? account.lastSyncAt.split("T")[0]
      : null;
    const canSync = lastSyncDate !== today;

    return {
      accountId: account.accountId,
      institutionName: account.institutionName,
      accountName: account.accountName,
      lastSyncAt: account.lastSyncAt,
      canSync,
      nextSyncAvailable: canSync ? "Now" : getNextMidnight(),
    };
  });

  return successResponse(
    {
      accounts: status,
      dailyLimit: SYNCS_PER_DAY_PER_ACCOUNT,
      mockMode: MOCK_MODE,
    },
    "Sync status retrieved successfully",
  );
}

// ============ Helper Functions ============

/**
 * Sync a single account
 */
async function syncSingleAccount(familyId, account, _userId) {
  const currentTime = new Date().toISOString();

  if (MOCK_MODE) {
    // Generate mock transactions
    const mockTransactions = generateMockTransactions(account.accountId);

    // Store as pending transactions
    for (const txn of mockTransactions) {
      const pendingId = generateId.custom("pend");
      await dynamoHelpers.putItem({
        PK: `FAMILY#${familyId}`,
        SK: `PENDING_TRANSACTION#${pendingId}`,
        entityType: "PENDING_TRANSACTION",
        pendingId,
        familyId,
        plaidAccountId: account.accountId,
        plaidTransactionId: txn.plaidTransactionId,
        amount: txn.amount,
        description: txn.description,
        merchant: txn.merchant,
        date: txn.date,
        categoryName: txn.suggestedCategory,
        status: "pending",
        createdAt: currentTime,
      });
    }

    // Update account last sync time
    await dynamoHelpers.updateItem(
      `FAMILY#${familyId}`,
      `PLAID_ACCOUNT#${account.accountId}`,
      {
        lastSyncAt: currentTime,
        updatedAt: currentTime,
      },
    );

    return {
      accountId: account.accountId,
      status: "success",
      transactionsFound: mockTransactions.length,
      mockMode: true,
    };
  }

  // In production, would call Plaid transactions/sync API
  return {
    accountId: account.accountId,
    status: "error",
    reason: "Plaid integration not configured",
  };
}

/**
 * Generate mock transactions for development
 */
function generateMockTransactions(_accountId) {
  const merchants = [
    { name: "Amazon", category: "Shopping" },
    { name: "Whole Foods", category: "Groceries" },
    { name: "Shell Gas Station", category: "Transportation" },
    { name: "Netflix", category: "Entertainment" },
    { name: "Starbucks", category: "Dining" },
    { name: "Target", category: "Shopping" },
    { name: "Uber", category: "Transportation" },
    { name: "Spotify", category: "Entertainment" },
  ];

  const transactions = [];
  const today = new Date();

  // Generate 5-10 random transactions from the past week
  const count = Math.floor(Math.random() * 6) + 5;

  for (let i = 0; i < count; i++) {
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    const daysAgo = Math.floor(Math.random() * 7);
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);

    transactions.push({
      plaidTransactionId: `mock-txn-${Date.now()}-${i}`,
      amount: -(Math.random() * 100 + 5).toFixed(2) * 1, // Negative for expenses
      description: merchant.name,
      merchant: merchant.name,
      date: date.toISOString().split("T")[0],
      suggestedCategory: merchant.category,
    });
  }

  return transactions;
}

/**
 * Get next midnight timestamp
 */
function getNextMidnight() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

/**
 * Format account for API response
 */
function formatAccountResponse(account) {
  return {
    accountId: account.accountId,
    institutionName: account.institutionName,
    accountName: account.accountName,
    accountType: account.accountType,
    accountMask: account.accountMask,
    currentBalance: account.currentBalance,
    availableBalance: account.availableBalance,
    lastSyncAt: account.lastSyncAt,
    status: account.status,
    createdAt: account.createdAt,
  };
}

/**
 * Format pending transaction for API response
 */
function formatPendingTransaction(pending) {
  return {
    pendingId: pending.pendingId,
    plaidAccountId: pending.plaidAccountId,
    amount: pending.amount,
    description: pending.description,
    merchant: pending.merchant,
    date: pending.date,
    suggestedCategory: pending.categoryName,
    status: pending.status,
    createdAt: pending.createdAt,
  };
}
