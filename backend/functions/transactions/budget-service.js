/**
 * Budget Service
 * Separated budget calculation logic for better maintainability
 *
 * IMPORTANT: This file was updated as part of the Budget Model Redesign.
 * All DynamoDB keys now use BUDGET#<budgetId> / PERIOD#<month> (not FAMILY#).
 * The groups structure is flat: groups.expenses = [{id, name, plannedAmount, spentAmount, ...}]
 */

const { dynamoHelpers, logger } = require("/opt/nodejs/utils");

/**
 * Check if an account is tracked (should be included in budget calculations)
 * @param {string} budgetId - Budget ID
 * @param {string} accountId - Account ID (optional)
 * @returns {Promise<boolean>} True if account is tracked or no account specified
 */
async function isAccountTracked(budgetId, accountId) {
  if (!accountId) return true;

  try {
    const account = await dynamoHelpers.getItem(
      `BUDGET#${budgetId}`,
      `ACCOUNT#${accountId}`,
    );
    if (!account) return true;
    return account.isTracked !== false;
  } catch (error) {
    logger.error("Error checking account tracking status", error, { budgetId, accountId });
    return true;
  }
}

/**
 * Update budget calculations when transactions are added, updated, or deleted.
 *
 * Uses the new BUDGET# / PERIOD# key schema.
 * Groups structure: { income: [...], savings: [...], expenses: [...] }
 * Each element is a category object: { id, categoryId, name, plannedAmount, spentAmount, transactions }
 *
 * @param {string} budgetId     - Budget ID (passed as first arg from transactions/index.js)
 * @param {string} budgetMonth  - Budget month (YYYY-MM)
 * @param {string} categoryId   - Category ID
 * @param {string} transactionType - 'income' | 'expense' | 'savings'
 * @param {number} amount       - Transaction amount
 * @param {string} operation    - 'add' | 'remove'
 * @param {string} accountId    - Optional account ID (for tracking check)
 */
async function updateBudgetCalculations(
  budgetId,
  budgetMonth,
  categoryId,
  transactionType,
  amount,
  operation,
  accountId = null,
) {
  try {
    const tracked = await isAccountTracked(budgetId, accountId);
    if (!tracked) {
      logger.info("Skipping budget update for untracked account", { budgetId, budgetMonth, accountId });
      return;
    }

    logger.info("Updating budget calculations", { budgetId, budgetMonth, categoryId, transactionType, amount, operation });

    // NEW schema: PK = BUDGET#<budgetId>, SK = PERIOD#<YYYY-MM>
    const budget = await dynamoHelpers.getItem(`BUDGET#${budgetId}`, `PERIOD#${budgetMonth}`);

    if (!budget) {
      logger.warn("Budget period not found, skipping calculation update", { budgetId, budgetMonth });
      return;
    }

    const amountChange = operation === "add" ? amount : -amount;
    const groups = budget.groups || {};
    let categoryFound = false;

    // Determine which group key to search based on transaction type
    // The new flat structure stores categories directly in the group arrays
    const groupKeys = transactionType === "income"
      ? ["income"]
      : transactionType === "savings"
        ? ["savings"]
        : ["expenses", "savings"]; // expenses can also appear in savings for some users

    for (const groupKey of groupKeys) {
      const groupArr = groups[groupKey];
      if (!Array.isArray(groupArr)) continue;

      for (const category of groupArr) {
        // Match by id or categoryId (both formats are used)
        const catId = category.id || category.categoryId;
        if (catId === categoryId) {
          category.spentAmount = (category.spentAmount || 0) + amountChange;
          if (category.spentAmount < 0) category.spentAmount = 0;
          categoryFound = true;
          break;
        }

        // Also check nested categories array (legacy format)
        if (Array.isArray(category.categories)) {
          for (const nested of category.categories) {
            const nestedId = nested.id || nested.categoryId;
            if (nestedId === categoryId) {
              nested.spentAmount = (nested.spentAmount || 0) + amountChange;
              if (nested.spentAmount < 0) nested.spentAmount = 0;
              categoryFound = true;
              break;
            }
          }
          if (categoryFound) break;
        }
      }
      if (categoryFound) break;
    }

    if (!categoryFound) {
      logger.warn("Category not found in budget period, skipping spentAmount update", { budgetId, budgetMonth, categoryId });
      return;
    }

    // Recalculate totals
    const totals = calculateBudgetTotals(groups);

    // Update the budget period in DynamoDB — new key schema
    await dynamoHelpers.updateItem(
      `BUDGET#${budgetId}`,
      `PERIOD#${budgetMonth}`,
      {
        groups,
        totalIncome: totals.totalIncome,
        totalSavings: totals.totalSavings,
        totalExpenses: totals.totalExpenses,
        remainingBalance: totals.remainingBalance,
        updatedAt: new Date().toISOString(),
      },
    );

    logger.info("Budget calculations updated successfully", { budgetId, budgetMonth, categoryId, amountChange });
  } catch (error) {
    logger.error("Error updating budget calculations", error, { budgetId, budgetMonth, categoryId });
    // Don't throw — transaction should still succeed even if budget update fails
  }
}

/**
 * Calculate budget totals from groups (supports both flat and nested category formats).
 */
function calculateBudgetTotals(groups) {
  let totalIncome = 0;
  let totalSavings = 0;
  let totalExpenses = 0;

  function sumGroup(arr) {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce((sum, item) => {
      // Flat format: item is a category
      if (typeof item.plannedAmount === "number") {
        return sum + (item.plannedAmount || 0);
      }
      // Nested format: item has categories array
      if (Array.isArray(item.categories)) {
        return sum + item.categories.reduce((s, c) => s + (c.plannedAmount || 0), 0);
      }
      return sum;
    }, 0);
  }

  totalIncome   = sumGroup(groups.income);
  totalSavings  = sumGroup(groups.savings);
  totalExpenses = sumGroup(groups.expenses);

  return {
    totalIncome,
    totalSavings,
    totalExpenses,
    remainingBalance: totalIncome - totalSavings - totalExpenses,
  };
}

module.exports = {
  updateBudgetCalculations,
  calculateBudgetTotals,
  isAccountTracked,
};
