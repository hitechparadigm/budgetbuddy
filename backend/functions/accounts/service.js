/**
 * Account Service
 *
 * Business logic layer for account operations.
 * Handles validation, business rules, and orchestrates repository calls.
 */

const repository = require("./repository");
const validators = require("./validators");

/**
 * Create a new manual account
 * @param {string} familyId - Family ID
 * @param {object} input - Account creation input
 * @returns {Promise<object>} Created account
 */
async function createAccount(familyId, input) {
  // Validate input
  const validation = validators.validateCreateAccountInput(input);
  if (!validation.isValid) {
    const error = new Error(validation.errors.join(", "));
    error.statusCode = 400;
    throw error;
  }

  // Create the account
  const account = await repository.createAccount(familyId, {
    ...input,
    isManual: true,
  });

  return account;
}

/**
 * Get all accounts for a family
 * @param {string} familyId - Family ID
 * @param {object} filters - Optional filters
 * @returns {Promise<object[]>} List of accounts
 */
async function getAccounts(familyId, filters = {}) {
  return repository.getAccounts(familyId, filters);
}

/**
 * Get a single account by ID
 * @param {string} familyId - Family ID
 * @param {string} accountId - Account ID
 * @returns {Promise<object>} Account
 */
async function getAccount(familyId, accountId) {
  const account = await repository.getAccount(familyId, accountId);

  if (!account) {
    const error = new Error("Account not found");
    error.statusCode = 404;
    throw error;
  }

  return account;
}

/**
 * Update an account
 * @param {string} familyId - Family ID
 * @param {string} accountId - Account ID
 * @param {object} input - Update input
 * @returns {Promise<object>} Updated account
 */
async function updateAccount(familyId, accountId, input) {
  // Validate input
  const validation = validators.validateUpdateAccountInput(input);
  if (!validation.isValid) {
    const error = new Error(validation.errors.join(", "));
    error.statusCode = 400;
    throw error;
  }

  // Check if account exists
  const existing = await repository.getAccount(familyId, accountId);
  if (!existing) {
    const error = new Error("Account not found");
    error.statusCode = 404;
    throw error;
  }

  // Only allow updating certain fields for connected accounts
  if (!existing.isManual) {
    const allowedFields = ["nickname", "isTracked"];
    const inputFields = Object.keys(input);
    const disallowedFields = inputFields.filter(
      (f) => !allowedFields.includes(f),
    );

    if (disallowedFields.length > 0) {
      const error = new Error(
        `Cannot update ${disallowedFields.join(", ")} for connected accounts`,
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const updated = await repository.updateAccount(familyId, accountId, input);
  return updated;
}

/**
 * Delete a manual account
 * @param {string} familyId - Family ID
 * @param {string} accountId - Account ID
 * @param {string} deletedBy - User ID who deleted
 * @returns {Promise<void>}
 */
async function deleteAccount(familyId, accountId, deletedBy) {
  // Check if account exists
  const existing = await repository.getAccount(familyId, accountId);
  if (!existing) {
    const error = new Error("Account not found");
    error.statusCode = 404;
    throw error;
  }

  // Only manual accounts can be deleted
  if (!existing.isManual) {
    const error = new Error(
      "Connected accounts cannot be deleted. Use unlink instead.",
    );
    error.statusCode = 400;
    throw error;
  }

  const deleted = await repository.deleteAccount(
    familyId,
    accountId,
    deletedBy,
  );
  if (!deleted) {
    const error = new Error("Failed to delete account");
    error.statusCode = 500;
    throw error;
  }
}

/**
 * Reconcile account balance
 * @param {string} familyId - Family ID
 * @param {string} accountId - Account ID
 * @param {object} input - Reconcile input
 * @returns {Promise<object>} Reconciliation result
 */
async function reconcileAccount(familyId, accountId, input) {
  // Validate input
  const validation = validators.validateReconcileInput(input);
  if (!validation.isValid) {
    const error = new Error(validation.errors.join(", "));
    error.statusCode = 400;
    throw error;
  }

  // Check if account exists
  const existing = await repository.getAccount(familyId, accountId);
  if (!existing) {
    const error = new Error("Account not found");
    error.statusCode = 404;
    throw error;
  }

  const result = await repository.reconcileAccount(
    familyId,
    accountId,
    input.newBalance,
    input.notes,
  );

  return result;
}

/**
 * Set account tracking status
 * @param {string} familyId - Family ID
 * @param {string} accountId - Account ID
 * @param {object} input - Tracking input
 * @returns {Promise<object>} Updated account
 */
async function setAccountTracking(familyId, accountId, input) {
  // Validate input
  const validation = validators.validateSetTrackingInput(input);
  if (!validation.isValid) {
    const error = new Error(validation.errors.join(", "));
    error.statusCode = 400;
    throw error;
  }

  // Check if account exists
  const existing = await repository.getAccount(familyId, accountId);
  if (!existing) {
    const error = new Error("Account not found");
    error.statusCode = 404;
    throw error;
  }

  const updated = await repository.updateAccount(familyId, accountId, {
    isTracked: input.isTracked,
  });

  return updated;
}

/**
 * Get accounts summary
 * @param {string} familyId - Family ID
 * @returns {Promise<object>} Summary
 */
async function getAccountsSummary(familyId) {
  return repository.getAccountsSummary(familyId);
}

/**
 * Update account balance (called from transaction service)
 * @param {string} familyId - Family ID
 * @param {string} accountId - Account ID
 * @param {number} balanceChange - Amount to change
 * @returns {Promise<object|null>} Updated account or null
 */
async function updateAccountBalance(familyId, accountId, balanceChange) {
  return repository.updateAccountBalance(familyId, accountId, balanceChange);
}

/**
 * Check if account exists
 * @param {string} familyId - Family ID
 * @param {string} accountId - Account ID
 * @returns {Promise<boolean>}
 */
async function accountExists(familyId, accountId) {
  return repository.accountExists(familyId, accountId);
}

/**
 * Calculate balance change for a transaction
 *
 * Asset accounts (banking, cash, investment):
 *   - Income: +amount (increases balance)
 *   - Expense: -amount (decreases balance)
 *
 * Liability accounts (credit_card, loan):
 *   - Income: -amount (payment reduces debt)
 *   - Expense: +amount (charge increases debt)
 *
 * @param {string} transactionType - 'income' or 'expense'
 * @param {number} amount - Transaction amount
 * @param {string} accountType - Account type
 * @returns {number} Balance change
 */
function calculateBalanceChange(transactionType, amount, accountType) {
  const isAsset = validators.isAssetAccount(accountType);
  const isIncome = transactionType === "income";

  if (isAsset) {
    return isIncome ? amount : -amount;
  } else {
    // Liability account
    return isIncome ? -amount : amount;
  }
}

module.exports = {
  createAccount,
  getAccounts,
  getAccount,
  updateAccount,
  deleteAccount,
  reconcileAccount,
  setAccountTracking,
  getAccountsSummary,
  updateAccountBalance,
  accountExists,
  calculateBalanceChange,
};
