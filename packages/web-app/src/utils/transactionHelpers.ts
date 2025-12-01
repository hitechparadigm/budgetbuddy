/**
 * Helper functions for transaction operations
 */

export interface CategorySpentUpdate {
  categoryId: string;
  amountChange: number;
}

/**
 * Calculates the category spent amount changes when editing a transaction
 * @param oldTransaction - The original transaction before editing
 * @param newTransaction - The updated transaction data
 * @returns Array of category updates with amount changes
 */
export const calculateCategoryUpdates = (
  oldTransaction: { categoryId: string; amount: number },
  newTransaction: { categoryId: string; amount: number }
): CategorySpentUpdate[] => {
  const updates: CategorySpentUpdate[] = [];

  const oldCategoryId = oldTransaction.categoryId;
  const newCategoryId = newTransaction.categoryId;
  const oldAmount = oldTransaction.amount;
  const newAmount = newTransaction.amount;

  if (oldCategoryId === newCategoryId) {
    // Same category, just update the amount difference
    const amountChange = newAmount - oldAmount;
    if (amountChange !== 0) {
      updates.push({
        categoryId: oldCategoryId,
        amountChange: amountChange
      });
    }
  } else {
    // Different category, update both
    // Subtract from old category
    updates.push({
      categoryId: oldCategoryId,
      amountChange: -oldAmount
    });

    // Add to new category
    updates.push({
      categoryId: newCategoryId,
      amountChange: newAmount
    });
  }

  return updates;
};

/**
 * Applies category spent amount updates to a budget
 * @param budget - The budget object to update
 * @param updates - Array of category updates
 * @returns Updated budget object
 */
export const applyCategoryUpdates = (
  budget: any,
  updates: CategorySpentUpdate[]
): any => {
  const updatedBudget = { ...budget };

  updates.forEach(update => {
    // Find the category in the budget and update its spent amount
    updatedBudget.groups = updatedBudget.groups.map((group: any) => ({
      ...group,
      categories: group.categories.map((category: any) => {
        if (category.categoryId === update.categoryId) {
          const newSpentAmount = category.spentAmount + update.amountChange;
          const newRemainingAmount = category.plannedAmount - newSpentAmount;

          return {
            ...category,
            spentAmount: newSpentAmount,
            remainingAmount: newRemainingAmount,
            percentageUsed: category.plannedAmount > 0
              ? (newSpentAmount / category.plannedAmount) * 100
              : 0,
            isOverBudget: newSpentAmount > category.plannedAmount
          };
        }
        return category;
      })
    }));
  });

  return updatedBudget;
};
