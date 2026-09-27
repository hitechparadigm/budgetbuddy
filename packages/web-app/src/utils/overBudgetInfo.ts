/**
 * calculateOverBudgetInfo
 *
 * Extracted from BudgetPage.tsx's calculateTotals() so it can be property
 * tested independently. Reports how many categories are over budget and
 * which one is the most over budget, breaking ties by input order.
 */

export interface CategoryLike {
  name: string;
  plannedAmount: number;
  spentAmount: number;
}

export interface OverBudgetInfo {
  overBudgetCount: number;
  topOverBudgetCategory?: string;
}

/**
 * Single-pass over the given categories. A category counts as over budget
 * when spentAmount > plannedAmount (strictly greater - spending exactly at
 * the planned amount is not over budget). Among categories tied for the
 * largest overage, the first one encountered in `categories` wins, which is
 * why the running-max comparison below uses a strict `>` rather than `>=`.
 */
export function calculateOverBudgetInfo(categories: CategoryLike[]): OverBudgetInfo {
  let overBudgetCount = 0;
  let topOverBudgetCategory: string | undefined;
  let topOverBudgetAmount = -Infinity;

  for (const category of categories) {
    const diff = category.spentAmount - category.plannedAmount;
    if (diff > 0) {
      overBudgetCount += 1;
      if (diff > topOverBudgetAmount) {
        topOverBudgetAmount = diff;
        topOverBudgetCategory = category.name;
      }
    }
  }

  return { overBudgetCount, topOverBudgetCategory };
}