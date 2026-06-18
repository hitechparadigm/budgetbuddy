/**
 * BudgetBuddy Plaid Integration Lambda Function
 *
 * Handles bank account linking via Plaid, transaction sync, and account management.
 * Supports sandbox mode for development and production mode for live bank connections.
 *
 * Version: 2.0.0
 */

const {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} = require("plaid");
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

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


// Environment configuration
const PLAID_ENV = process.env.PLAID_ENV || "sandbox";
const PLAID_SECRET_NAME =
  process.env.PLAID_SECRET_NAME || "budgetbuddy/plaid/sandbox";
const SYNCS_PER_DAY_PER_ACCOUNT = 4; // Increased for sandbox testing

// Plaid client singleton
let plaidClient = null;
let plaidConfig = null;

/**
 * Initialize Plaid client with credentials from Secrets Manager
 */
async function getPlaidClient() {
  if (plaidClient) return plaidClient;

  const secretsClient = new SecretsManagerClient({
    region: process.env.AWS_REGION || "us-east-1",
  });

  try {
    const response = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: PLAID_SECRET_NAME }),
    );
    plaidConfig = JSON.parse(response.SecretString);

    const configuration = new Configuration({
      basePath: PlaidEnvironments[plaidConfig.environment || "sandbox"],
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": plaidConfig.client_id,
          "PLAID-SECRET": plaidConfig.secret,
        },
      },
    });

    plaidClient = new PlaidApi(configuration);
    logger.info("Plaid client initialized", {
      environment: plaidConfig.environment,
    });
    return plaidClient;
  } catch (error) {
    logger.error("Failed to initialize Plaid client", error);
    throw new Error("Failed to initialize Plaid integration");
  }
}

/**
 * Main Lambda handler for Plaid operations
 */
exports.handler = async (event, context) => {
  logger.info("Plaid request received", {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context.awsRequestId,
    environment: PLAID_ENV,
  });

  try {
    const { httpMethod, path, pathParameters } = event;

    // Health check endpoint
    if (httpMethod === "GET" && path === "/plaid/health") {
      return successResponse(
        {
          status: "healthy",
          service: "plaid",
          version: "2.0.0",
          environment: PLAID_ENV,
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

    if (httpMethod === "POST" && path === "/plaid/pending/reject") {
      return await rejectPendingTransactions(event, user);
    }

    if (httpMethod === "GET" && path === "/plaid/sync-status") {
      return await getSyncStatus(event, user);
    }

    // Sandbox-only: Create test item without Link
    if (httpMethod === "POST" && path === "/plaid/sandbox/create-item") {
      return await createSandboxItem(event, user);
    }

    return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);
  } catch (error) {
    logger.error("Plaid function error", error, {
      requestId: context.awsRequestId,
    });

    if (error && typeof error === 'object' && error.statusCode) {
      return {
        statusCode: error.statusCode,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Forbidden', message: error.message || 'Permission denied' }),
      };
    }
    if (error.message && error.message.includes("No user claims")) {
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
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  logger.info("Creating link token", { budgetId, environment: PLAID_ENV });

  try {
    const client = await getPlaidClient();

    const request = {
      user: {
        client_user_id: budgetId,
      },
      client_name: "BudgetBuddy",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us, CountryCode.Ca],
      language: "en",
      // For sandbox, we don't need a webhook URL
      // webhook: process.env.PLAID_WEBHOOK_URL,
    };

    const response = await client.linkTokenCreate(request);

    logger.info("Link token created successfully", {
      budgetId,
      expiration: response.data.expiration,
    });

    return successResponse(
      {
        linkToken: response.data.link_token,
        expiration: response.data.expiration,
        environment: PLAID_ENV,
      },
      "Link token created successfully",
    );
  } catch (error) {
    logger.error("Failed to create link token", error);
    return errorResponse.internalError(
      "Failed to create link token: " + error.message,
    );
  }
}

/**
 * Exchange public token for access token
 * POST /plaid/exchange-token
 */
async function exchangePublicToken(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);
  const body = parseRequestBody(event.body);

  if (!body.publicToken) {
    return errorResponse.badRequest("publicToken is required");
  }

  logger.info("Exchanging public token", { budgetId });

  try {
    const client = await getPlaidClient();

    // Exchange public token for access token
    const exchangeResponse = await client.itemPublicTokenExchange({
      public_token: body.publicToken,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Get account details
    const accountsResponse = await client.accountsGet({
      access_token: accessToken,
    });
    const accounts = accountsResponse.data.accounts;
    const institution = accountsResponse.data.item.institution_id;

    // Get institution details
    let institutionName = "Unknown Bank";
    try {
      const instResponse = await client.institutionsGetById({
        institution_id: institution,
        country_codes: [CountryCode.Us, CountryCode.Ca],
      });
      institutionName = instResponse.data.institution.name;
    } catch (_e) {
      logger.warn("Could not fetch institution name", { institution });
    }

    const currentTime = new Date().toISOString();
    const linkedAccounts = [];

    // Store each account
    for (const account of accounts) {
      const accountId = generateId.custom("acct");

      const accountRecord = {
        PK: `BUDGET#${budgetId}`,
        SK: `PLAID_ACCOUNT#${accountId}`,
        entityType: "PLAID_ACCOUNT",
        accountId,
        budgetId,
        plaidItemId: itemId,
        plaidAccountId: account.account_id,
        accessToken, // In production, store in Secrets Manager
        institutionId: institution,
        institutionName,
        accountName: account.name,
        officialName: account.official_name,
        accountType: account.type,
        accountSubtype: account.subtype,
        accountMask: account.mask,
        currentBalance: account.balances.current,
        availableBalance: account.balances.available,
        isoCurrencyCode: account.balances.iso_currency_code || "USD",
        lastSyncAt: null,
        syncCursor: null,
        status: "active",
        createdBy: user.userId,
        createdAt: currentTime,
        updatedAt: currentTime,
      };

      await dynamoHelpers.putItem(accountRecord);
      linkedAccounts.push({
        accountId,
        institutionName,
        accountName: account.name,
        accountType: account.type,
        accountMask: account.mask,
        currentBalance: account.balances.current,
      });
    }

    logger.info("Accounts linked successfully", {
      budgetId,
      accountCount: linkedAccounts.length,
      itemId,
    });

    return successResponse(
      {
        itemId,
        accounts: linkedAccounts,
        institutionName,
        environment: PLAID_ENV,
      },
      "Bank accounts linked successfully",
    );
  } catch (error) {
    logger.error("Failed to exchange token", error);
    return errorResponse.internalError(
      "Failed to link bank account: " + error.message,
    );
  }
}

/**
 * Create sandbox item without Link (for testing)
 * POST /plaid/sandbox/create-item
 */
async function createSandboxItem(event, user) {
  if (PLAID_ENV !== "sandbox") {
    return errorResponse.badRequest(
      "This endpoint is only available in sandbox mode",
    );
  }

  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);
  const body = parseRequestBody(event.body);

  // Default to Chase bank in sandbox
  const institutionId = body.institutionId || "ins_3";

  logger.info("Creating sandbox item", { budgetId, institutionId });

  try {
    const client = await getPlaidClient();

    // Create sandbox public token
    const sandboxResponse = await client.sandboxPublicTokenCreate({
      institution_id: institutionId,
      initial_products: [Products.Transactions],
    });

    const publicToken = sandboxResponse.data.public_token;

    // Exchange for access token
    const exchangeResponse = await client.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Get account details
    const accountsResponse = await client.accountsGet({
      access_token: accessToken,
    });
    const accounts = accountsResponse.data.accounts;

    // Get institution name
    let institutionName = "Sandbox Bank";
    try {
      const instResponse = await client.institutionsGetById({
        institution_id: institutionId,
        country_codes: [CountryCode.Us, CountryCode.Ca],
      });
      institutionName = instResponse.data.institution.name;
    } catch (_e) {
      logger.warn("Could not fetch institution name", { institutionId });
    }

    const currentTime = new Date().toISOString();
    const linkedAccounts = [];

    for (const account of accounts) {
      const accountId = generateId.custom("acct");

      const accountRecord = {
        PK: `BUDGET#${budgetId}`,
        SK: `PLAID_ACCOUNT#${accountId}`,
        entityType: "PLAID_ACCOUNT",
        accountId,
        budgetId,
        plaidItemId: itemId,
        plaidAccountId: account.account_id,
        accessToken,
        institutionId,
        institutionName,
        accountName: account.name,
        officialName: account.official_name,
        accountType: account.type,
        accountSubtype: account.subtype,
        accountMask: account.mask,
        currentBalance: account.balances.current,
        availableBalance: account.balances.available,
        isoCurrencyCode: account.balances.iso_currency_code || "USD",
        lastSyncAt: null,
        syncCursor: null,
        status: "active",
        createdBy: user.userId,
        createdAt: currentTime,
        updatedAt: currentTime,
      };

      await dynamoHelpers.putItem(accountRecord);
      linkedAccounts.push({
        accountId,
        institutionName,
        accountName: account.name,
        accountType: account.type,
        accountMask: account.mask,
        currentBalance: account.balances.current,
      });
    }

    logger.info("Sandbox item created", {
      budgetId,
      accountCount: linkedAccounts.length,
    });

    return successResponse(
      {
        itemId,
        accounts: linkedAccounts,
        institutionName,
        environment: "sandbox",
        message: "Sandbox bank account created for testing",
      },
      "Sandbox bank account linked successfully",
    );
  } catch (error) {
    logger.error("Failed to create sandbox item", error);
    return errorResponse.internalError(
      "Failed to create sandbox item: " + error.message,
    );
  }
}

/**
 * Get all linked accounts
 * GET /plaid/accounts
 */
async function getLinkedAccounts(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);

  const accounts = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
    FilterExpression: "entityType = :entityType AND #status = :active",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":entityType": "PLAID_ACCOUNT",
      ":active": "active",
    },
  });

  // Optionally refresh balances from Plaid
  const refreshedAccounts = [];
  for (const account of accounts) {
    try {
      if (account.accessToken) {
        const client = await getPlaidClient();
        const balanceResponse = await client.accountsBalanceGet({
          access_token: account.accessToken,
          options: { account_ids: [account.plaidAccountId] },
        });

        const plaidAccount = balanceResponse.data.accounts[0];
        if (plaidAccount) {
          account.currentBalance = plaidAccount.balances.current;
          account.availableBalance = plaidAccount.balances.available;

          // Update in DynamoDB
          await dynamoHelpers.updateItem(
            `BUDGET#${budgetId}`,
            `PLAID_ACCOUNT#${account.accountId}`,
            {
              currentBalance: account.currentBalance,
              availableBalance: account.availableBalance,
              updatedAt: new Date().toISOString(),
            },
          );
        }
      }
    } catch (error) {
      logger.warn("Could not refresh balance", {
        accountId: account.accountId,
        error: error.message,
      });
    }
    refreshedAccounts.push(formatAccountResponse(account));
  }

  return successResponse(
    {
      accounts: refreshedAccounts,
      count: refreshedAccounts.length,
      environment: PLAID_ENV,
    },
    "Linked accounts retrieved successfully",
  );
}

/**
 * Unlink a bank account
 * DELETE /plaid/accounts/{accountId}
 */
async function unlinkAccount(event, user, accountId) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  const account = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `PLAID_ACCOUNT#${accountId}`,
  );

  if (!account || account.status !== "active") {
    return errorResponse.notFound("Account not found");
  }

  // Remove access from Plaid
  if (account.accessToken) {
    try {
      const client = await getPlaidClient();
      await client.itemRemove({ access_token: account.accessToken });
      logger.info("Plaid item removed", { itemId: account.plaidItemId });
    } catch (error) {
      logger.warn("Could not remove Plaid item", { error: error.message });
    }
  }

  // Soft delete
  await dynamoHelpers.updateItem(
    `BUDGET#${budgetId}`,
    `PLAID_ACCOUNT#${accountId}`,
    {
      status: "unlinked",
      accessToken: null, // Clear access token
      unlinkedAt: new Date().toISOString(),
      unlinkedBy: user.userId,
    },
  );

  logger.info("Account unlinked", { accountId, budgetId });

  return successResponse(null, "Account unlinked successfully");
}

/**
 * Sync transactions for all accounts
 * POST /plaid/sync
 */
async function syncTransactions(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  const accounts = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
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
    // Check daily sync limit
    const syncCount = account.syncCountToday || 0;
    const lastSyncDate = account.lastSyncAt
      ? account.lastSyncAt.split("T")[0]
      : null;
    const todaySyncCount = lastSyncDate === today ? syncCount : 0;

    if (todaySyncCount >= SYNCS_PER_DAY_PER_ACCOUNT) {
      results.push({
        accountId: account.accountId,
        status: "skipped",
        reason: `Daily sync limit reached (${SYNCS_PER_DAY_PER_ACCOUNT} syncs/day)`,
      });
      continue;
    }

    const syncResult = await syncSingleAccount(budgetId, account, user.userId);
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
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  const account = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `PLAID_ACCOUNT#${accountId}`,
  );

  if (!account || account.status !== "active") {
    return errorResponse.notFound("Account not found");
  }

  const result = await syncSingleAccount(budgetId, account, user.userId);

  return successResponse(result, "Account sync completed");
}

/**
 * Sync a single account using Plaid transactions/sync
 */
async function syncSingleAccount(budgetId, account, _userId) {
  const currentTime = new Date().toISOString();

  if (!account.accessToken) {
    return {
      accountId: account.accountId,
      status: "error",
      reason: "No access token available",
    };
  }

  try {
    const client = await getPlaidClient();

    let cursor = account.syncCursor;
    let hasMore = true;
    let addedCount = 0;
    let modifiedCount = 0;
    let removedCount = 0;

    while (hasMore) {
      const request = {
        access_token: account.accessToken,
        cursor,
        count: 100,
      };

      const response = await client.transactionsSync(request);
      const data = response.data;

      // Process added transactions
      for (const txn of data.added) {
        const pendingId = generateId.custom("pend");
        await dynamoHelpers.putItem({
          PK: `BUDGET#${budgetId}`,
          SK: `PENDING_TRANSACTION#${pendingId}`,
          entityType: "PENDING_TRANSACTION",
          pendingId,
          budgetId,
          plaidAccountId: account.accountId,
          plaidTransactionId: txn.transaction_id,
          amount: txn.amount * -1, // Plaid uses positive for debits, we use negative for expenses
          description: txn.name,
          merchant: txn.merchant_name || txn.name,
          date: txn.date,
          categoryName:
            txn.personal_finance_category?.primary || "Uncategorized",
          categoryDetailed: txn.personal_finance_category?.detailed,
          isPending: txn.pending,
          paymentChannel: txn.payment_channel,
          location: txn.location
            ? {
                city: txn.location.city,
                region: txn.location.region,
                country: txn.location.country,
              }
            : null,
          status: "pending",
          createdAt: currentTime,
        });
        addedCount++;
      }

      // Process modified transactions (update existing pending)
      for (const txn of data.modified) {
        // Find and update existing pending transaction
        const existing = await findPendingByPlaidId(
          budgetId,
          txn.transaction_id,
        );
        if (existing) {
          await dynamoHelpers.updateItem(
            `BUDGET#${budgetId}`,
            `PENDING_TRANSACTION#${existing.pendingId}`,
            {
              amount: txn.amount * -1,
              description: txn.name,
              merchant: txn.merchant_name || txn.name,
              date: txn.date,
              isPending: txn.pending,
              updatedAt: currentTime,
            },
          );
          modifiedCount++;
        }
      }

      // Process removed transactions
      for (const txn of data.removed) {
        const existing = await findPendingByPlaidId(
          budgetId,
          txn.transaction_id,
        );
        if (existing && existing.status === "pending") {
          await dynamoHelpers.updateItem(
            `BUDGET#${budgetId}`,
            `PENDING_TRANSACTION#${existing.pendingId}`,
            { status: "removed", removedAt: currentTime },
          );
          removedCount++;
        }
      }

      cursor = data.next_cursor;
      hasMore = data.has_more;
    }

    // Update account with new cursor and sync time
    const today = new Date().toISOString().split("T")[0];
    const lastSyncDate = account.lastSyncAt
      ? account.lastSyncAt.split("T")[0]
      : null;
    const newSyncCount =
      lastSyncDate === today ? (account.syncCountToday || 0) + 1 : 1;

    await dynamoHelpers.updateItem(
      `BUDGET#${budgetId}`,
      `PLAID_ACCOUNT#${account.accountId}`,
      {
        syncCursor: cursor,
        lastSyncAt: currentTime,
        syncCountToday: newSyncCount,
        updatedAt: currentTime,
      },
    );

    logger.info("Account synced", {
      accountId: account.accountId,
      added: addedCount,
      modified: modifiedCount,
      removed: removedCount,
    });

    return {
      accountId: account.accountId,
      status: "success",
      transactionsAdded: addedCount,
      transactionsModified: modifiedCount,
      transactionsRemoved: removedCount,
    };
  } catch (error) {
    logger.error("Sync failed", {
      accountId: account.accountId,
      error: error.message,
    });
    return {
      accountId: account.accountId,
      status: "error",
      reason: error.message,
    };
  }
}

/**
 * Find pending transaction by Plaid transaction ID
 */
async function findPendingByPlaidId(budgetId, plaidTransactionId) {
  const results = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
    FilterExpression:
      "entityType = :entityType AND plaidTransactionId = :plaidTxnId",
    ExpressionAttributeValues: {
      ":entityType": "PENDING_TRANSACTION",
      ":plaidTxnId": plaidTransactionId,
    },
  });
  return results[0] || null;
}

/**
 * Get pending transactions awaiting approval
 * GET /plaid/pending
 */
async function getPendingTransactions(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);

  const pending = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
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
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);
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
        `BUDGET#${budgetId}`,
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
        PK: `BUDGET#${budgetId}`,
        SK: `TRANSACTION#${transactionId}`,
        GSI1PK: `BUDGET#${budgetId}`,
        GSI1SK: `TRANSACTION#${pending.date}#${transactionId}`,
        entityType: "TRANSACTION",
        transactionId,
        budgetId,
        type: pending.amount < 0 ? "expense" : "income",
        amount: Math.abs(pending.amount),
        categoryId: body.categoryMappings?.[pendingId]?.categoryId || null,
        categoryName:
          body.categoryMappings?.[pendingId]?.categoryName ||
          pending.categoryName ||
          "Uncategorized",
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
        `BUDGET#${budgetId}`,
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
 * Reject pending transactions
 * POST /plaid/pending/reject
 */
async function rejectPendingTransactions(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);
  const body = parseRequestBody(event.body);

  if (!body.transactionIds || !Array.isArray(body.transactionIds)) {
    return errorResponse.badRequest("transactionIds array is required");
  }

  const currentTime = new Date().toISOString();
  const rejected = [];
  const failed = [];

  for (const pendingId of body.transactionIds) {
    try {
      const pending = await dynamoHelpers.getItem(
        `BUDGET#${budgetId}`,
        `PENDING_TRANSACTION#${pendingId}`,
      );

      if (!pending || pending.status !== "pending") {
        failed.push({
          id: pendingId,
          reason: "Not found or already processed",
        });
        continue;
      }

      await dynamoHelpers.updateItem(
        `BUDGET#${budgetId}`,
        `PENDING_TRANSACTION#${pendingId}`,
        {
          status: "rejected",
          rejectedAt: currentTime,
          rejectedBy: user.userId,
          rejectionReason: body.reason || "User rejected",
        },
      );

      rejected.push({ pendingId });
    } catch (error) {
      logger.error("Failed to reject transaction", error, { pendingId });
      failed.push({ id: pendingId, reason: error.message });
    }
  }

  return successResponse(
    {
      rejected,
      failed,
      rejectedCount: rejected.length,
      failedCount: failed.length,
    },
    "Transactions rejected",
  );
}

/**
 * Get sync status for all accounts
 * GET /plaid/sync-status
 */
async function getSyncStatus(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);

  const accounts = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
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
    const todaySyncCount =
      lastSyncDate === today ? account.syncCountToday || 0 : 0;
    const canSync = todaySyncCount < SYNCS_PER_DAY_PER_ACCOUNT;

    return {
      accountId: account.accountId,
      institutionName: account.institutionName,
      accountName: account.accountName,
      lastSyncAt: account.lastSyncAt,
      syncsToday: todaySyncCount,
      syncsRemaining: SYNCS_PER_DAY_PER_ACCOUNT - todaySyncCount,
      canSync,
      nextSyncAvailable: canSync ? "Now" : getNextMidnight(),
    };
  });

  return successResponse(
    {
      accounts: status,
      dailyLimit: SYNCS_PER_DAY_PER_ACCOUNT,
      environment: PLAID_ENV,
    },
    "Sync status retrieved successfully",
  );
}

// ============ Helper Functions ============

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
    officialName: account.officialName,
    accountType: account.accountType,
    accountSubtype: account.accountSubtype,
    accountMask: account.accountMask,
    currentBalance: account.currentBalance,
    availableBalance: account.availableBalance,
    isoCurrencyCode: account.isoCurrencyCode,
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
    categoryDetailed: pending.categoryDetailed,
    isPending: pending.isPending,
    paymentChannel: pending.paymentChannel,
    location: pending.location,
    status: pending.status,
    createdAt: pending.createdAt,
  };
}
