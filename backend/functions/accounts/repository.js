/**
 * Account Repository
 *
 * Data access layer for account operations.
 * Handles DynamoDB interactions for accounts.
 */

const { dynamoHelpers, generateId } = require("/opt/nodejs/utils");

/**
 * Create a new account
 * @param {string} familyId - Family ID
 * @param {object} accountData - Account data
 * @returns {Promise<object>} Created account
 */
async function createAccount(familyId, accountData) {
  const accountId = generateId.custom("acc");
  const currentTime = new Date().toISOString();

  const account = {
    PK: `FAMILY#${familyId}`,
    SK: `ACCOUNT#${accountId}`,
    GSI1PK: `FAMILY#${familyId}#ACCOUNTS`,
    GSI1SK: `${accountData.accountType}#${accountId}`,
    entityType: "ACCOUNT",
    accountId,
    familyId,
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
 * Get all accounts for a family
 * @param {string} familyId - Family ID
 * @param {object} filters - Optional filters
 * @returns {Promise<object[]>} List of accounts
 */
async function getAccounts(familyId, filters = {}) {
  const accounts = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
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
 * @param {string} familyId - Family ID
 * @param {string} accountId - Account ID
 * @returns {Promise<object|null>} Account or null if not found
 */
async function getAccount(familyId, accountId) {
  const account = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
    `ACCOUNT#${accountId}`,
  );

  if (!account || account.entityType !== "ACCOUNT") {
    return null;
  }

  return formatAccountResponse(account);
}

/**
 * Update an account
 * @param {string} familyId - Family ID
 * @param {string} accountId - Account ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object|null>} Updated account or null if not found
 */
async function updateAccount(familyId, accountId, updates) {
  // First check if account exists
  const existing = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
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
    `FAMILY#${familyId}`,
    `ACCOUNT#${accountId}`,
    updateData,
  );

  return formatAccountResponse(updated);
}

/**
 * Delete an account (soft delete - marks as deleted)
 * @param {string} familyId - Family ID
 * @param {string} accountId - Account ID
 * @param {string} deletedBy - User ID who deleted
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
async function deleteAccount(familyId, accountId, deletedBy) {
  const existing = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
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
  await dynamoHelpers.updateItem(`FAMILY#${familyId}`, `ACCOUNT#${accountId}`, {
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    deletedBy,
    updatedAt: new Date().toISOString(),
  });

  return true;
}

/**
 * Reconcile account balance
 * @param {string} familyId - Family ID
 * @param {string} accountId - Account ID
 * @param {number} newBalance - New balance
 * @param {string} notes - Optional notes
 * @returns {Promise<object>} Object with updated account and adjustment amount
 */
async function reconcileAccount(familyId, accountId, newBalance, notes = null) {
  const existing = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
    `ACCOUNT#${accountId}`,
  );

  if (!existing || existing.entityType !== "ACCOUNT") {
    return null;
  }

  const previousBalance = existing.currentBalance;
  const adjustmentAmount = newBalance - previousBalance;
  const currentTime = new Date().toISOString();

  const updated = await dynamoHelpers.updateItem(
    `FAMILY#${familyId}`,
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
 * @param {string} familyId - Family ID
 * @param {string} accountId - Account ID
 * @param {number} balanceChange - Amount to add (positive) or subtract (negative)
 * @returns {Promise<object|null>} Updated account or null if not found
 */
async function updateAccountBalance(familyId, accountId, balanceChange) {
  const existing = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
    `ACCOUNT#${accountId}`,
  );

  if (!existing || existing.entityType !== "ACCOUNT") {
    return null;
  }

  const newBalance = existing.currentBalance + balanceChange;

  const updated = await dynamoHelpers.updateItem(
    `FAMILY#${familyId}`,
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
 * @param {string} familyId - Family ID
 * @returns {Promise<object>} Summary with totals
 */
async function getAccountsSummary(familyId) {
  const accounts = await getAccounts(familyId);

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
 * Check if an account exists and belongs to the family
 * @param {string} familyId - Family ID
 * @param {string} accountId - Account ID
 * @returns {Promise<boolean>} True if exists
 */
async function accountExists(familyId, accountId) {
  const account = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
    `ACCOUNT#${accountId}`,
  );
  return account && account.entityType === "ACCOUNT" && !account.isDeleted;
}

/**
 * Format account for API response (remove DynamoDB keys)
 */
function formatAccountResponse(account) {
  return {
    accountId: account.accountId,
    familyId: account.familyId,
    accountType: account.accountType,
    accountSubtype: account.accountSubtype,
    nickname: account.nickname,
    institutionName: account.institutionName,
    mask: account.mask,
    currentBalance: account.currentBalance,
    currency: account.currency,
    isManual: account.isManual,
    isTracked: account.isTracked,
    plaidAccountId: account.plaidAccountId,
    plaidItemId: account.plaidItemId,
    lastSynced: account.lastSynced,
    lastReconciled: account.lastReconciled,
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
