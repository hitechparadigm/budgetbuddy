/**
 * Account Repository
 *
 * Data access layer for account operations.
 * Handles DynamoDB interactions for accounts.
 */

const { dynamoHelpers, generateId } = require("/opt/nodejs/utils");

/**
 * Create a new account
 * @param {string} budgetId - Budget ID
 * @param {object} accountData - Account data
 * @returns {Promise<object>} Created account
 */
async function createAccount(budgetId, accountData) {
  const accountId = generateId.custom("acc");
  const currentTime = new Date().toISOString();

  // No GSI1PK/GSI1SK: nothing reads a GSI entry for accounts (getAccounts
  // queries the base table by PK), and the old `FAMILY#<id>#ACCOUNTS` value
  // violated the documented GSI1 contract of BUDGET#<budgetId> / USER#<userId>,
  // so writing it polluted a shared index.
  const account = {
    PK: `BUDGET#${budgetId}`,
    SK: `ACCOUNT#${accountId}`,
    entityType: "ACCOUNT",
    accountId,
    budgetId,
    accountType: accountData.accountType,
    accountSubtype: accountData.accountSubtype,
    nickname: accountData.nickname,
    institutionName: accountData.institutionName || null,
    mask: accountData.mask || null,
    currentBalance: accountData.currentBalance,
    currency: accountData.currency || "USD",
    isManual: accountData.isManual !== false, // Default to true for manual accounts
    isTracked: accountData.isTracked !== false, // Default to true
    plaidAccountId: accountData.plaidAccountId || null,
    plaidItemId: accountData.plaidItemId || null,
    lastSynced: accountData.lastSynced || null,
    lastReconciled: null,
    createdAt: currentTime,
    updatedAt: currentTime,
  };

  await dynamoHelpers.putItem(account);

  return formatAccountResponse(account);
}

/**
 * Get all accounts for a budget
 * @param {string} budgetId - Budget ID
 * @param {object} filters - Optional filters
 * @returns {Promise<object[]>} List of accounts
 */
async function getAccounts(budgetId, filters = {}) {
  const accounts = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
    FilterExpression: "entityType = :entityType",
    ExpressionAttributeValues: {
      ":entityType": "ACCOUNT",
    },
  });

  let filteredAccounts = accounts;

  // Apply filters
  if (filters.accountType) {
    filteredAccounts = filteredAccounts.filter(
      (a) => a.accountType === filters.accountType,
    );
  }
  if (filters.isManual !== undefined) {
    filteredAccounts = filteredAccounts.filter(
      (a) => a.isManual === filters.isManual,
    );
  }
  if (filters.isTracked !== undefined) {
    filteredAccounts = filteredAccounts.filter(
      (a) => a.isTracked === filters.isTracked,
    );
  }

  return filteredAccounts.map(formatAccountResponse);
}

/**
 * Get a single account by ID
 * @param {string} budgetId - Budget ID
 * @param {string} accountId - Account ID
 * @returns {Promise<object|null>} Account or null if not found
 */
async function getAccount(budgetId, accountId) {
  const account = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `ACCOUNT#${accountId}`,
  );

  if (!account || account.entityType !== "ACCOUNT") {
    return null;
  }

  return formatAccountResponse(account);
}

/**
 * Update an account
 * @param {string} budgetId - Budget ID
 * @param {string} accountId - Account ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object|null>} Updated account or null if not found
 */
async function updateAccount(budgetId, accountId, updates) {
  // First check if account exists
  const existing = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `ACCOUNT#${accountId}`,
  );

  if (!existing || existing.entityType !== "ACCOUNT") {
    return null;
  }

  const updateData = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const updated = await dynamoHelpers.updateItem(
    `BUDGET#${budgetId}`,
    `ACCOUNT#${accountId}`,
    updateData,
  );

  return formatAccountResponse(updated);
}

/**
 * Delete an account (soft delete - marks as deleted)
 * @param {string} budgetId - Budget ID
 * @param {string} accountId - Account ID
 * @param {string} deletedBy - User ID who deleted
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
async function deleteAccount(budgetId, accountId, deletedBy) {
  const existing = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `ACCOUNT#${accountId}`,
  );

  if (!existing || existing.entityType !== "ACCOUNT") {
    return false;
  }

  // Check if account is manual - only manual accounts can be deleted
  if (!existing.isManual) {
    throw new Error(
      "Connected accounts cannot be deleted. Use unlink instead.",
    );
  }

  // Soft delete by marking as deleted
  await dynamoHelpers.updateItem(`BUDGET#${budgetId}`, `ACCOUNT#${accountId}`, {
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    deletedBy,
    updatedAt: new Date().toISOString(),
  });

  return true;
}

/**
 * Reconcile account balance
 * @param {string} budgetId - Budget ID
 * @param {string} accountId - Account ID
 * @param {number} newBalance - New balance
 * @param {string} notes - Optional notes
 * @returns {Promise<object>} Object with updated account and adjustment amount
 */
async function reconcileAccount(budgetId, accountId, newBalance, notes = null) {
  const existing = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `ACCOUNT#${accountId}`,
  );

  if (!existing || existing.entityType !== "ACCOUNT") {
    return null;
  }

  const previousBalance = existing.currentBalance;
  const adjustmentAmount = newBalance - previousBalance;
  const currentTime = new Date().toISOString();

  const updated = await dynamoHelpers.updateItem(
    `BUDGET#${budgetId}`,
    `ACCOUNT#${accountId}`,
    {
      currentBalance: newBalance,
      lastReconciled: currentTime,
      updatedAt: currentTime,
    },
  );

  return {
    account: formatAccountResponse(updated),
    previousBalance,
    adjustmentAmount,
    notes,
  };
}

/**
 * Update account balance (called when transactions are added/modified)
 * @param {string} budgetId - Budget ID
 * @param {string} accountId - Account ID
 * @param {number} balanceChange - Amount to add (positive) or subtract (negative)
 * @returns {Promise<object|null>} Updated account or null if not found
 */
async function updateAccountBalance(budgetId, accountId, balanceChange) {
  const existing = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `ACCOUNT#${accountId}`,
  );

  if (!existing || existing.entityType !== "ACCOUNT") {
    return null;
  }

  const newBalance = existing.currentBalance + balanceChange;

  const updated = await dynamoHelpers.updateItem(
    `BUDGET#${budgetId}`,
    `ACCOUNT#${accountId}`,
    {
      currentBalance: newBalance,
      updatedAt: new Date().toISOString(),
    },
  );

  return formatAccountResponse(updated);
}

/**
 * Get accounts summary (totals by type)
 * @param {string} budgetId - Budget ID
 * @returns {Promise<object>} Summary with totals
 */
async function getAccountsSummary(budgetId) {
  const accounts = await getAccounts(budgetId);

  // Filter out deleted accounts
  const activeAccounts = accounts.filter((a) => !a.isDeleted);

  const assetTypes = ["banking", "cash", "investment"];
  const liabilityTypes = ["credit_card", "loan"];

  let totalAssets = 0;
  let totalLiabilities = 0;
  const accountsByType = {};

  for (const account of activeAccounts) {
    // Group by type
    if (!accountsByType[account.accountType]) {
      accountsByType[account.accountType] = [];
    }
    accountsByType[account.accountType].push(account);

    // Calculate totals
    if (assetTypes.includes(account.accountType)) {
      totalAssets += account.currentBalance;
    } else if (liabilityTypes.includes(account.accountType)) {
      totalLiabilities += Math.abs(account.currentBalance);
    }
  }

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    accountsByType,
    accountCount: activeAccounts.length,
  };
}

/**
 * Check if an account exists and belongs to the budget
 * @param {string} budgetId - Budget ID
 * @param {string} accountId - Account ID
 * @returns {Promise<boolean>} True if exists
 */
async function accountExists(budgetId, accountId) {
  const account = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `ACCOUNT#${accountId}`,
  );
  return account && account.entityType === "ACCOUNT" && !account.isDeleted;
}

/**
 * Format account for API response (remove DynamoDB keys)
 *
 * This Lambda is not the only writer of ACCOUNT# items: auth-onboarding
 * creates a default "Cash" account directly (backend/functions/auth-onboarding/index.js)
 * using `balance` rather than `currentBalance` and without `isTracked`,
 * `institutionName` or `mask`. Those rows became visible to GET /accounts when
 * this repository moved from FAMILY# to BUDGET# keys, so every field an
 * external writer may omit is defaulted here. Without this the Accounts page
 * renders `undefined` balances for every user who onboarded.
 */
function formatAccountResponse(account) {
  return {
    accountId: account.accountId,
    budgetId: account.budgetId,
    accountType: account.accountType,
    accountSubtype: account.accountSubtype ?? null,
    nickname: account.nickname,
    institutionName: account.institutionName ?? null,
    mask: account.mask ?? null,
    currentBalance: account.currentBalance ?? account.balance ?? 0,
    currency: account.currency,
    isManual: account.isManual !== false,
    isTracked: account.isTracked !== false,
    plaidAccountId: account.plaidAccountId ?? null,
    plaidItemId: account.plaidItemId ?? null,
    lastSynced: account.lastSynced ?? null,
    lastReconciled: account.lastReconciled ?? null,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

module.exports = {
  createAccount,
  getAccounts,
  getAccount,
  updateAccount,
  deleteAccount,
  reconcileAccount,
  updateAccountBalance,
  getAccountsSummary,
  accountExists,
};
