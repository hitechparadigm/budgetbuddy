/**
 * BudgetBuddy Savings Goals Property-Based Tests
 *
 * Property-based tests for goal progress calculation correctness using fast-check.
 * These tests verify mathematical invariants that must hold for all inputs.
 *
 * **Validates: Requirements 38.2, 38.3** (Competitive Features)
 */

const fc = require("fast-check");

// ============================================================================
// Goal Calculation Functions (extracted for testing)
// ============================================================================

/**
 * Calculate progress percentage for a goal.
 * Formula: progressPercent = (currentAmount / targetAmount) * 100
 *
 * @param {number} currentAmount - Current saved amount
 * @param {number} targetAmount - Target goal amount
 * @returns {number} - Progress percentage (0-100+)
 */
function calculateProgressPercent(currentAmount, targetAmount) {
  if (targetAmount <= 0) {
    return currentAmount > 0 ? 100 : 0;
  }
  return Math.round((currentAmount / targetAmount) * 100);
}

/**
 * Calculate required monthly savings to reach goal by target date.
 * Formula: monthlyRequired = (targetAmount - currentAmount) / monthsRemaining
 *
 * @param {number} targetAmount - Target goal amount
 * @param {number} currentAmount - Current saved amount
 * @param {number} monthsRemaining - Months until target date
 * @returns {number|null} - Required monthly amount or null if no target date
 */
function calculateMonthlyRequired(
  targetAmount,
  currentAmount,
  monthsRemaining,
) {
  if (monthsRemaining === null || monthsRemaining === undefined) {
    return null;
  }
  if (monthsRemaining <= 0) {
    return null; // Past due date
  }
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) {
    return 0; // Already reached goal
  }
  return Math.ceil(remaining / monthsRemaining);
}

/**
 * Calculate milestone status for a goal.
 *
 * @param {number} progressPercent - Current progress percentage
 * @returns {Object} - Milestone status for 25%, 50%, 75%, 100%
 */
function calculateMilestones(progressPercent) {
  return {
    25: { reached: progressPercent >= 25 },
    50: { reached: progressPercent >= 50 },
    75: { reached: progressPercent >= 75 },
    100: { reached: progressPercent >= 100 },
  };
}

/**
 * Calculate new progress after a contribution.
 *
 * @param {number} currentAmount - Current saved amount
 * @param {number} contribution - Amount being contributed
 * @param {number} targetAmount - Target goal amount
 * @returns {Object} - New current amount and progress
 */
function applyContribution(currentAmount, contribution, targetAmount) {
  const newAmount = currentAmount + contribution;
  const progressPercent = calculateProgressPercent(newAmount, targetAmount);
  const isComplete = newAmount >= targetAmount;

  return {
    newAmount,
    progressPercent,
    isComplete,
  };
}

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate a valid goal with reasonable amounts.
 */
const goalArbitrary = fc.record({
  goalId: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  targetAmount: fc.float({ min: 100, max: 100000, noNaN: true }),
  currentAmount: fc.float({ min: 0, max: 100000, noNaN: true }),
  monthsRemaining: fc.option(fc.integer({ min: 1, max: 120 }), { nil: null }),
});

/**
 * Generate a goal that is partially complete (0-99%).
 */
const partialGoalArbitrary = fc
  .record({
    goalId: fc.string({ minLength: 1, maxLength: 20 }),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    targetAmount: fc.float({ min: 1000, max: 50000, noNaN: true }),
    monthsRemaining: fc.option(fc.integer({ min: 1, max: 60 }), { nil: null }),
  })
  .chain((goal) =>
    fc
      .float({
        min: 0,
        max: Math.fround(goal.targetAmount * 0.99),
        noNaN: true,
      })
      .map((current) => ({
        ...goal,
        currentAmount: current,
      })),
  );

/**
 * Generate a goal that is complete (100%+).
 */
const completeGoalArbitrary = fc
  .record({
    goalId: fc.string({ minLength: 1, maxLength: 20 }),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    targetAmount: fc.float({ min: 100, max: 10000, noNaN: true }),
    monthsRemaining: fc.option(fc.integer({ min: 1, max: 60 }), { nil: null }),
  })
  .chain((goal) =>
    fc
      .float({
        min: Math.fround(goal.targetAmount * 1.01),
        max: Math.fround(goal.targetAmount * 1.5),
        noNaN: true,
      })
      .map((current) => ({
        ...goal,
        currentAmount: current,
      })),
  );

/**
 * Generate a valid contribution amount.
 */
const contributionArbitrary = fc.float({ min: 1, max: 5000, noNaN: true });

// ============================================================================
// Property Tests
// ============================================================================

describe("Goal Progress Calculation Property Tests", () => {
  /**
   * **Validates: Requirement 38.2** - Progress percentage calculation
   *
   * Property: Progress percentage = (current / target) * 100
   */
  describe("Property 1: Progress Percentage Formula", () => {
    test("progress percentage follows formula: (current / target) * 100", () => {
      fc.assert(
        fc.property(goalArbitrary, (goal) => {
          const result = calculateProgressPercent(
            goal.currentAmount,
            goal.targetAmount,
          );

          if (goal.targetAmount <= 0) {
            // Edge case: zero or negative target
            expect(result).toBeGreaterThanOrEqual(0);
          } else {
            const expected = Math.round(
              (goal.currentAmount / goal.targetAmount) * 100,
            );
            expect(result).toBe(expected);
          }
        }),
        { numRuns: 200 },
      );
    });

    test("progress is 0 when current amount is 0", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 100000, noNaN: true }),
          (targetAmount) => {
            const result = calculateProgressPercent(0, targetAmount);
            expect(result).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    test("progress is 100 when current equals target", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 100000, noNaN: true }),
          (amount) => {
            const result = calculateProgressPercent(amount, amount);
            expect(result).toBe(100);
          },
        ),
        { numRuns: 100 },
      );
    });

    test("progress can exceed 100 when current exceeds target", () => {
      fc.assert(
        fc.property(completeGoalArbitrary, (goal) => {
          // completeGoalArbitrary generates current >= target * 1.01
          const result = calculateProgressPercent(
            goal.currentAmount,
            goal.targetAmount,
          );
          // With at least 1% over target, progress should be >= 101
          expect(result).toBeGreaterThanOrEqual(101);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * **Validates: Requirement 38.3** - Monthly required calculation
   *
   * Property: monthlyRequired = (target - current) / monthsRemaining
   */
  describe("Property 2: Monthly Required Calculation", () => {
    test("monthly required follows formula: (target - current) / months", () => {
      fc.assert(
        fc.property(partialGoalArbitrary, (goal) => {
          if (goal.monthsRemaining === null || goal.monthsRemaining <= 0) {
            const result = calculateMonthlyRequired(
              goal.targetAmount,
              goal.currentAmount,
              goal.monthsRemaining,
            );
            expect(result).toBeNull();
          } else {
            const result = calculateMonthlyRequired(
              goal.targetAmount,
              goal.currentAmount,
              goal.monthsRemaining,
            );
            const remaining = goal.targetAmount - goal.currentAmount;
            const expected = Math.ceil(remaining / goal.monthsRemaining);
            expect(result).toBe(expected);
          }
        }),
        { numRuns: 200 },
      );
    });

    test("monthly required is 0 when goal is already complete", () => {
      fc.assert(
        fc.property(completeGoalArbitrary, (goal) => {
          if (goal.monthsRemaining !== null && goal.monthsRemaining > 0) {
            const result = calculateMonthlyRequired(
              goal.targetAmount,
              goal.currentAmount,
              goal.monthsRemaining,
            );
            expect(result).toBe(0);
          }
        }),
        { numRuns: 100 },
      );
    });

    test("monthly required is null when no target date", () => {
      fc.assert(
        fc.property(goalArbitrary, (goal) => {
          const result = calculateMonthlyRequired(
            goal.targetAmount,
            goal.currentAmount,
            null,
          );
          expect(result).toBeNull();
        }),
        { numRuns: 100 },
      );
    });

    test("monthly required is always non-negative", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 50000, noNaN: true }),
          fc.float({ min: 0, max: 50000, noNaN: true }),
          fc.integer({ min: 1, max: 120 }),
          (target, current, months) => {
            const result = calculateMonthlyRequired(target, current, months);
            if (result !== null) {
              expect(result).toBeGreaterThanOrEqual(0);
            }
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  /**
   * **Validates: Requirement 38.8** - Milestone tracking
   *
   * Property: Milestones are reached in order (25 -> 50 -> 75 -> 100)
   */
  describe("Property 3: Milestone Ordering", () => {
    test("milestones are reached in sequential order", () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 150 }), (progressPercent) => {
          const milestones = calculateMilestones(progressPercent);

          // If 100% reached, all lower milestones must be reached
          if (milestones[100].reached) {
            expect(milestones[75].reached).toBe(true);
            expect(milestones[50].reached).toBe(true);
            expect(milestones[25].reached).toBe(true);
          }

          // If 75% reached, 50% and 25% must be reached
          if (milestones[75].reached) {
            expect(milestones[50].reached).toBe(true);
            expect(milestones[25].reached).toBe(true);
          }

          // If 50% reached, 25% must be reached
          if (milestones[50].reached) {
            expect(milestones[25].reached).toBe(true);
          }
        }),
        { numRuns: 200 },
      );
    });

    test("milestone thresholds are exact", () => {
      // Test boundary conditions
      expect(calculateMilestones(24)[25].reached).toBe(false);
      expect(calculateMilestones(25)[25].reached).toBe(true);
      expect(calculateMilestones(49)[50].reached).toBe(false);
      expect(calculateMilestones(50)[50].reached).toBe(true);
      expect(calculateMilestones(74)[75].reached).toBe(false);
      expect(calculateMilestones(75)[75].reached).toBe(true);
      expect(calculateMilestones(99)[100].reached).toBe(false);
      expect(calculateMilestones(100)[100].reached).toBe(true);
    });
  });

  /**
   * **Validates: Requirement 38.4** - Contribution tracking
   *
   * Property: Contributions always increase current amount
   */
  describe("Property 4: Contribution Application", () => {
    test("contributions always increase current amount", () => {
      fc.assert(
        fc.property(
          partialGoalArbitrary,
          contributionArbitrary,
          (goal, contribution) => {
            const result = applyContribution(
              goal.currentAmount,
              contribution,
              goal.targetAmount,
            );

            expect(result.newAmount).toBeGreaterThan(goal.currentAmount);
            expect(result.newAmount).toBeCloseTo(
              goal.currentAmount + contribution,
              5,
            );
          },
        ),
        { numRuns: 200 },
      );
    });

    test("contributions increase progress percentage", () => {
      fc.assert(
        fc.property(
          partialGoalArbitrary,
          contributionArbitrary,
          (goal, contribution) => {
            const beforeProgress = calculateProgressPercent(
              goal.currentAmount,
              goal.targetAmount,
            );
            const result = applyContribution(
              goal.currentAmount,
              contribution,
              goal.targetAmount,
            );

            expect(result.progressPercent).toBeGreaterThanOrEqual(
              beforeProgress,
            );
          },
        ),
        { numRuns: 200 },
      );
    });

    test("goal becomes complete when contribution reaches target", () => {
      fc.assert(
        fc.property(partialGoalArbitrary, (goal) => {
          const remaining = goal.targetAmount - goal.currentAmount;
          if (remaining > 0) {
            const result = applyContribution(
              goal.currentAmount,
              remaining,
              goal.targetAmount,
            );

            expect(result.isComplete).toBe(true);
            expect(result.progressPercent).toBeGreaterThanOrEqual(100);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * **Validates: Requirement 38.2** - Progress is bounded correctly
   *
   * Property: Progress percentage is always non-negative
   */
  describe("Property 5: Progress Bounds", () => {
    test("progress percentage is never negative", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100000, noNaN: true }),
          fc.float({ min: 1, max: 100000, noNaN: true }),
          (current, target) => {
            const result = calculateProgressPercent(current, target);
            expect(result).toBeGreaterThanOrEqual(0);
          },
        ),
        { numRuns: 200 },
      );
    });

    test("progress is monotonically increasing with current amount", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1000, max: 50000, noNaN: true }),
          fc.float({ min: 0, max: 25000, noNaN: true }),
          fc.float({ min: 1, max: 5000, noNaN: true }),
          (target, current, increase) => {
            const progress1 = calculateProgressPercent(current, target);
            const progress2 = calculateProgressPercent(
              current + increase,
              target,
            );

            expect(progress2).toBeGreaterThanOrEqual(progress1);
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  /**
   * **Validates: Requirement 38.3** - Monthly savings achievability
   *
   * Property: If you save monthlyRequired each month, you reach the goal
   */
  describe("Property 6: Monthly Savings Achievability", () => {
    test("saving monthlyRequired for all months reaches goal", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1000, max: 50000, noNaN: true }),
          fc.float({ min: 0, max: 10000, noNaN: true }),
          fc.integer({ min: 1, max: 60 }),
          (target, current, months) => {
            if (current >= target) return; // Already complete

            const monthlyRequired = calculateMonthlyRequired(
              target,
              current,
              months,
            );
            if (monthlyRequired === null) return;

            // Simulate saving monthlyRequired for all months
            const totalSaved = current + monthlyRequired * months;

            // Should reach or exceed target (due to ceiling)
            expect(totalSaved).toBeGreaterThanOrEqual(target);
          },
        ),
        { numRuns: 200 },
      );
    });
  });
});
