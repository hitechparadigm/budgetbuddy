/**
 * Property-Based Tests for calculateOverBudgetInfo
 *
 * Feature: web-app-followups
 */

import * as fc from "fast-check";
import { calculateOverBudgetInfo, type CategoryLike } from "./overBudgetInfo";

// Generates an array of CategoryLike with unique names (index-suffixed) and
// plannedAmount/spentAmount covering negative, zero, and positive values.
const categoriesArbitrary = fc
  .array(
    fc.record({
      plannedAmount: fc.integer({ min: -1000, max: 1000 }),
      spentAmount: fc.integer({ min: -1000, max: 1000 }),
    }),
    { maxLength: 20 }
  )
  .map((entries) =>
    entries.map((entry, index): CategoryLike => ({
      name: `Category ${index}`,
      plannedAmount: entry.plannedAmount,
      spentAmount: entry.spentAmount,
    }))
  );

describe("Feature: web-app-followups - calculateOverBudgetInfo Property Tests", () => {
  /**
   * Property 1: Over-budget count matches positive-difference count
   *
   * overBudgetCount equals the number of categories where spentAmount > plannedAmount
   *
   * **Validates: Requirements 1.2**
   */
  // Feature: web-app-followups, Property 1: overBudgetCount equals count of categories where spentAmount > plannedAmount
  test("Property 1: overBudgetCount equals count of categories where spentAmount > plannedAmount", () => {
    fc.assert(
      fc.property(categoriesArbitrary, (categories) => {
        const { overBudgetCount } = calculateOverBudgetInfo(categories);
        const expectedCount = categories.filter(
          (c) => c.spentAmount > c.plannedAmount
        ).length;
        return overBudgetCount === expectedCount;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Top category presence matches over-budget count
   *
   * topOverBudgetCategory is undefined if and only if overBudgetCount is 0
   *
   * **Validates: Requirements 1.3, 1.4**
   */
  // Feature: web-app-followups, Property 2: topOverBudgetCategory is undefined iff overBudgetCount is 0
  test("Property 2: topOverBudgetCategory is undefined iff overBudgetCount is 0", () => {
    fc.assert(
      fc.property(categoriesArbitrary, (categories) => {
        const { overBudgetCount, topOverBudgetCategory } =
          calculateOverBudgetInfo(categories);
        if (overBudgetCount === 0) {
          return topOverBudgetCategory === undefined;
        }
        return typeof topOverBudgetCategory === "string";
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: Top category is the first-encountered largest overage
   *
   * topOverBudgetCategory names a category whose difference is >= every
   * other category's difference, and is the first such category in input
   * order among ties.
   *
   * **Validates: Requirements 1.3**
   */
  // Feature: web-app-followups, Property 3: topOverBudgetCategory is the first-encountered category with the maximum positive difference
  test("Property 3: topOverBudgetCategory is the first-encountered category with the maximum positive difference", () => {
    fc.assert(
      fc.property(categoriesArbitrary, (categories) => {
        const { topOverBudgetCategory } = calculateOverBudgetInfo(categories);
        const overBudget = categories.filter(
          (c) => c.spentAmount > c.plannedAmount
        );
        if (overBudget.length === 0) {
          return topOverBudgetCategory === undefined;
        }

        const maxDiff = Math.max(
          ...overBudget.map((c) => c.spentAmount - c.plannedAmount)
        );
        const firstWithMaxDiff = overBudget.find(
          (c) => c.spentAmount - c.plannedAmount === maxDiff
        );

        return topOverBudgetCategory === firstWithMaxDiff?.name;
      }),
      { numRuns: 100 }
    );
  });
});