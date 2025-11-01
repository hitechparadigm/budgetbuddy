/**
 * Budget Service
 * Separated budget calculation logic for better maintainability
 */

const { dynamoHelpers, logger } = require('/opt/nodejs/utils');

/**
 * Update budget calculations when transactions are added, updated, or deleted
 */
async function updateBudgetCalculations(familyId, budgetMonth, categoryId, transactionType, amount, operation) {
  try {
    logger.info('Updating budget calculations', {
      familyId,
      budgetMonth,
      categoryId,
      transactionType,
      amount,
      operation
    });

    // Get the current budget for this month
    const budget = await dynamoHelpers.getItem(
      `FAMILY#${familyId}`,
      `BUDGET#${budgetMonth}`
    );

    if (!budget) {
      logger.warn('Budget not found for month, skipping calculation update', {
        familyId,
        budgetMonth
      });
      return;
    }

    // Calculate the amount change based on operation
    const amountChange = operation === 'add' ? amount : -amount;

    // Find and update the specific category in the budget
    let categoryFound = false;
    const updatedGroups = { ...budget.groups };

    // Determine which group to update based on transaction type
    const groupKey = transactionType === 'income' ? 'income' : 'expenses';

    if (updatedGroups[groupKey]) {
      for (let group of updatedGroups[groupKey]) {
        if (group.categories) {
          for (let category of group.categories) {
            if (category.categoryId === categoryId) {
              category.spentAmount = (category.spentAmount || 0) + amountChange;
              category.remainingAmount = category.plannedAmount - category.spentAmount;
              categoryFound = true;
              break;
            }
          }
        }
        if (categoryFound) break;
      }
    }

    if (!categoryFound) {
      logger.warn('Category not found in budget, skipping calculation update', {
        familyId,
        budgetMonth,
        categoryId
      });
      return;
    }

    // Recalculate group and budget totals
    const totals = calculateBudgetTotals(updatedGroups);

    // Update the budget in DynamoDB
    await dynamoHelpers.updateItem(
      `FAMILY#${familyId}`,
      `BUDGET#${budgetMonth}`,
      {
        groups: updatedGroups,
        totalIncome: totals.totalIncome,
        totalSavings: totals.totalSavings,
        totalExpenses: totals.totalExpenses,
        remainingBalance: totals.remainingBalance
      }
    );

    logger.info('Budget calculations updated successfully', {
      familyId,
      budgetMonth,
      categoryId
    });

  } catch (error) {
    logger.error('Error updating budget calculations', error, {
      familyId,
      budgetMonth,
      categoryId
    });
    // Don't throw error - transaction should still succeed even if budget update fails
  }
}

/**
 * Calculate budget totals from groups
 */
function calculateBudgetTotals(groups) {
  let totalIncome = 0;
  let totalSavings = 0;
  let totalExpenses = 0;

  // Calculate income total
  if (groups.income) {
    totalIncome = groups.income.reduce((sum, group) => {
      return sum + (group.totalPlanned || 0);
    }, 0);
  }

  // Calculate savings total
  if (groups.savings) {
    totalSavings = groups.savings.reduce((sum, group) => {
      return sum + (group.totalPlanned || 0);
    }, 0);
  }

  // Calculate expenses total
  if (groups.expenses) {
    totalExpenses = groups.expenses.reduce((sum, group) => {
      return sum + (group.totalPlanned || 0);
    }, 0);
  }

  // Zero-based budgeting: Income - Savings - Expenses = 0 (ideally)
  const remainingBalance = totalIncome - totalSavings - totalExpenses;

  return {
    totalIncome,
    totalSavings,
    totalExpenses,
    remainingBalance
  };
}

module.exports = {
  updateBudgetCalculations,
  calculateBudgetTotals
};
