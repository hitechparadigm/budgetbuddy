/**
 * BudgetBuddy Rollover Budget Property-Based Tests
 *
 * Property-based tests for rollover calculation correctness using fast-check.
 * These tests verify mathematical invariants that must hold for all inputs.
 *
 * **Validates: Requirements 40.5, 40.8, 40.10** (Competitive Features)
 */

const fc = require("fast-check");

// ============================================================================
// Rollover Calculation Functions (extracted for testing)
// ============================================================================

/**
 * Calculate rollover for a category during month transition.
 * Formula: newRollover = previousRollover + (planned - spent)
 * If cap is set, rollover is capped at that value.
 *
 * @param {Object} previousCategory - Previous month's category data
 * @returns {number} - New rollover amount
 */
function calculateRollover(previousCategory) {
  if (!previousCategory.rolloverEnabled) {
    return 0;
  }

  const previousRollover = previousCategory.rolloverAmount || 0;
  const planned = previousCategory.plannedAmount || 0;
  const spent = previousCategory.spentAmount || 0;

  // Calculate new rollover: previous + (planned - spent)
  let newRollover = previousRollover + (planned - spent);

  // Apply cap if set (cap only applies to positive rollover)
  if (
    previousCategory.rolloverCap !== undefined &&
    previousCategory.rolloverCap !== null &&
    newRollover > 0
  ) {
    newRollover = Math.min(newRollover, previousCategory.rolloverCap);
  }

  return newRollover;
}

/**
 * Calculate total rollover across all categories in a budget.
 *
 * @param {Object} budget - Budget with groups containing categories
 * @returns {number} - Total rollover amount
 */
function calculateTotalRollover(budget) {
  let total = 0;

  const processCategories = (categories) => {
    for (const category of categories || []) {
      if (category.rolloverEnabled && category.rolloverAmount) {
        total += category.rolloverAmount;
      }
    }
  };

  for (const group of budget.groups?.income || []) {
    processCategories(group.categories);
  }
  for (const group of budget.groups?.savings || []) {
    processCategories(group.categories);
  }
  for (const group of budget.groups?.expenses || []) {
    processCategories(group.categories);
  }

  return total;
}

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate a valid category with rollover fields.
 */
const categoryArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  plannedAmount: fc.float({ min: 0, max: 10000, noNaN: true }),
  spentAmount: fc.float({ min: 0, max: 15000, noNaN: true }), // Can exceed planned
  rolloverEnabled: fc.boolean(),
  rolloverAmount: fc.float({ min: -5000, max: 5000, noNaN: true }),
  rolloverCap: fc.option(fc.float({ min: 0, max: 10000, noNaN: true }), {
    nil: undefined,
  }),
});

/**
 * Generate a category that is underspent (spent < planned).
 */
const underspentCategoryArbitrary = fc
  .record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    plannedAmount: fc.float({ min: 100, max: 10000, noNaN: true }),
    rolloverEnabled: fc.constant(true),
    rolloverAmount: fc.float({ min: 0, max: 1000, noNaN: true }),
    rolloverCap: fc.option(fc.float({ min: 100, max: 5000, noNaN: true }), {
      nil: undefined,
    }),
  })
  .chain((cat) =>
    fc
      .float({ min: 0, max: cat.plannedAmount - 1, noNaN: true })
      .map((spent) => ({
        ...cat,
        spentAmount: spent,
      })),
  );

/**
 * Generate a category that is overspent (spent > planned).
 */
const overspentCategoryArbitrary = fc
  .record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    plannedAmount: fc.float({ min: 100, max: 3000, noNaN: true }),
    rolloverEnabled: fc.constant(true),
    rolloverAmount: fc.float({ min: 0, max: 500, noNaN: true }),
    rolloverCap: fc.option(fc.float({ min: 100, max: 5000, noNaN: true }), {
      nil: undefined,
    }),
  })
  .chain((cat) =>
    fc
      .float({
        min: Math.fround(cat.plannedAmount + 1),
        max: Math.fround(cat.plannedAmount + 1000),
        noNaN: true,
      })
      .map((spent) => ({
        ...cat,
        spentAmount: spent,
      })),
  );

/**
 * Generate a category with a cap that would be exceeded.
 */
const cappedCategoryArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  plannedAmount: fc.float({ min: 500, max: 5000, noNaN: true }),
  spentAmount: fc.float({ min: 0, max: 100, noNaN: true }), // Low spending
  rolloverEnabled: fc.constant(true),
  rolloverAmount: fc.float({ min: 100, max: 500, noNaN: true }),
  rolloverCap: fc.float({ min: 50, max: 300, noNaN: true }), // Cap lower than potential rollover
});

// ============================================================================
// Property Tests
// ============================================================================

describe("Rollover Calculation Property Tests", () => {
  /**
   * **Validates: Requirement 40.5** - Rollover calculation formula
   *
   * Property: For any category with rollover enabled,
   * newRollover = previousRollover + (planned - spent), subject to cap.
   */
  describe("Property 1: Rollover Formula Correctness", () => {
    test("rollover follows formula: newRollover = previousRollover + (planned - spent)", () => {
      fc.assert(
        fc.property(categoryArbitrary, (category) => {
          if (!category.rolloverEnabled) {
            // Disabled rollover should always return 0
            expect(calculateRollover(category)).toBe(0);
            return;
          }

          const result = calculateRollover(category);
          const expected =
            category.rolloverAmount +
            (category.plannedAmount - category.spentAmount);

          // If no cap or result is negative, should match formula
          if (category.rolloverCap === undefined || expected <= 0) {
            expect(result).toBeCloseTo(expected, 5);
          } else {
            // With cap, should be min of formula and cap
            expect(result).toBeCloseTo(
              Math.min(expected, category.rolloverCap),
              5,
            );
          }
        }),
        { numRuns: 200 },
      );
    });
  });

  /**
   * **Validates: Requirement 40.5** - Overspent categories have negative rollover
   *
   * Property: When spent > planned, rollover decreases (can go negative).
   */
  describe("Property 2: Overspent Categories", () => {
    test("overspent categories result in decreased rollover", () => {
      fc.assert(
        fc.property(
          fc
            .record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              plannedAmount: fc.float({ min: 100, max: 3000, noNaN: true }),
              rolloverEnabled: fc.constant(true),
              rolloverAmount: fc.float({ min: 0, max: 500, noNaN: true }),
              // No cap for this test to isolate overspent behavior
              rolloverCap: fc.constant(undefined),
            })
            .chain((cat) =>
              fc
                .float({
                  min: Math.fround(cat.plannedAmount + 1),
                  max: Math.fround(cat.plannedAmount + 1000),
                  noNaN: true,
                })
                .map((spent) => ({
                  ...cat,
                  spentAmount: spent,
                })),
            ),
          (category) => {
            const result = calculateRollover(category);
            const previousRollover = category.rolloverAmount;
            const overspentAmount =
              category.spentAmount - category.plannedAmount;

            // Rollover should decrease by the overspent amount
            expect(result).toBeCloseTo(previousRollover - overspentAmount, 5);
          },
        ),
        { numRuns: 100 },
      );
    });

    test("negative rollover is allowed for overspent categories", () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.constant("test"),
            name: fc.constant("Test"),
            plannedAmount: fc.float({ min: 100, max: 500, noNaN: true }),
            spentAmount: fc.float({ min: 600, max: 1000, noNaN: true }),
            rolloverEnabled: fc.constant(true),
            rolloverAmount: fc.float({ min: 0, max: 100, noNaN: true }),
          }),
          (category) => {
            const result = calculateRollover(category);
            // When significantly overspent, rollover can be negative
            expect(result).toBeLessThan(category.rolloverAmount);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * **Validates: Requirement 40.8** - Rollover respects cap when set
   *
   * Property: When rolloverCap is set, positive rollover never exceeds cap.
   */
  describe("Property 3: Rollover Cap Enforcement", () => {
    test("positive rollover never exceeds cap when cap is set", () => {
      fc.assert(
        fc.property(cappedCategoryArbitrary, (category) => {
          const result = calculateRollover(category);

          // If result is positive, it should not exceed cap
          if (result > 0) {
            expect(result).toBeLessThanOrEqual(category.rolloverCap);
          }
        }),
        { numRuns: 100 },
      );
    });

    test("cap does not affect negative rollover", () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.constant("test"),
            name: fc.constant("Test"),
            plannedAmount: fc.float({ min: 100, max: 300, noNaN: true }),
            spentAmount: fc.float({ min: 500, max: 1000, noNaN: true }),
            rolloverEnabled: fc.constant(true),
            rolloverAmount: fc.float({ min: 0, max: 50, noNaN: true }),
            rolloverCap: fc.float({ min: 100, max: 500, noNaN: true }),
          }),
          (category) => {
            const result = calculateRollover(category);
            const uncappedResult =
              category.rolloverAmount +
              (category.plannedAmount - category.spentAmount);

            // Negative rollover should not be affected by cap
            expect(result).toBeCloseTo(uncappedResult, 5);
            expect(result).toBeLessThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    test("no cap means unlimited positive rollover", () => {
      fc.assert(
        fc.property(underspentCategoryArbitrary, (category) => {
          // Remove cap
          const noCap = { ...category, rolloverCap: undefined };
          const result = calculateRollover(noCap);
          const expected =
            noCap.rolloverAmount + (noCap.plannedAmount - noCap.spentAmount);

          // Without cap, should match formula exactly
          expect(result).toBeCloseTo(expected, 5);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * **Validates: Requirement 40.2** - Disabled rollover returns 0
   *
   * Property: When rolloverEnabled is false, rollover is always 0.
   */
  describe("Property 4: Disabled Rollover", () => {
    test("disabled rollover always returns 0 regardless of other values", () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            plannedAmount: fc.float({ min: 0, max: 10000, noNaN: true }),
            spentAmount: fc.float({ min: 0, max: 10000, noNaN: true }),
            rolloverEnabled: fc.constant(false),
            rolloverAmount: fc.float({ min: -5000, max: 5000, noNaN: true }),
            rolloverCap: fc.option(
              fc.float({ min: 0, max: 10000, noNaN: true }),
            ),
          }),
          (category) => {
            const result = calculateRollover(category);
            expect(result).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * **Validates: Requirement 40.10** - Year-end rollover works correctly
   *
   * Property: Rollover calculation is consistent across year boundaries.
   */
  describe("Property 5: Year-End Rollover", () => {
    test("rollover calculation is independent of month/year", () => {
      // The calculation should be the same regardless of when it happens
      fc.assert(
        fc.property(categoryArbitrary, (category) => {
          // Calculate rollover twice with same inputs
          const result1 = calculateRollover(category);
          const result2 = calculateRollover({ ...category });

          // Should be deterministic
          expect(result1).toBeCloseTo(result2, 10);
        }),
        { numRuns: 100 },
      );
    });

    test("consecutive month rollovers accumulate correctly", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              plannedAmount: fc.float({ min: 100, max: 1000, noNaN: true }),
              spentAmount: fc.float({ min: 0, max: 1200, noNaN: true }),
            }),
            { minLength: 2, maxLength: 12 },
          ),
          (months) => {
            let rollover = 0;

            for (const month of months) {
              const category = {
                rolloverEnabled: true,
                rolloverAmount: rollover,
                plannedAmount: month.plannedAmount,
                spentAmount: month.spentAmount,
              };

              rollover = calculateRollover(category);
            }

            // Final rollover should be sum of all (planned - spent)
            const totalUnused = months.reduce(
              (sum, m) => sum + (m.plannedAmount - m.spentAmount),
              0,
            );

            expect(rollover).toBeCloseTo(totalUnused, 5);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * **Validates: Requirement 40.9** - Total rollover calculation
   *
   * Property: Total rollover equals sum of all category rollovers.
   */
  describe("Property 6: Total Rollover Calculation", () => {
    test("total rollover is sum of all enabled category rollovers", () => {
      const budgetArbitrary = fc.record({
        groups: fc.record({
          income: fc.array(
            fc.record({
              id: fc.string({ minLength: 1 }),
              categories: fc.array(categoryArbitrary, { maxLength: 5 }),
            }),
            { maxLength: 2 },
          ),
          savings: fc.array(
            fc.record({
              id: fc.string({ minLength: 1 }),
              categories: fc.array(categoryArbitrary, { maxLength: 5 }),
            }),
            { maxLength: 2 },
          ),
          expenses: fc.array(
            fc.record({
              id: fc.string({ minLength: 1 }),
              categories: fc.array(categoryArbitrary, { maxLength: 5 }),
            }),
            { maxLength: 3 },
          ),
        }),
      });

      fc.assert(
        fc.property(budgetArbitrary, (budget) => {
          const total = calculateTotalRollover(budget);

          // Calculate expected total manually
          let expected = 0;
          const allGroups = [
            ...(budget.groups.income || []),
            ...(budget.groups.savings || []),
            ...(budget.groups.expenses || []),
          ];

          for (const group of allGroups) {
            for (const cat of group.categories || []) {
              if (cat.rolloverEnabled && cat.rolloverAmount) {
                expected += cat.rolloverAmount;
              }
            }
          }

          expect(total).toBeCloseTo(expected, 5);
        }),
        { numRuns: 50 },
      );
    });
  });
});
