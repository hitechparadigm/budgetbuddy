/**
 * Goal Calculations Property-Based Tests
 *
 * Property-based tests for savings and debt payoff goal calculations.
 * These tests verify mathematical invariants for goal progress tracking.
 *
 * **Property 11: Savings Goal Calculation**
 * **Property 12: Debt Payoff Calculation**
 * **Property 13: Goal Math Accuracy**
 * **Validates: Requirements 9.1, 9.2, 9.6**
 */

const fc = require("fast-check");

// ============================================================================
// Goal Calculation Functions (extracted for testing)
// ============================================================================

/**
 * Calculate progress percentage for a savings goal.
 */
function calculateSavingsProgress(currentAmount, targetAmount) {
  if (targetAmount <= 0) return 0;
  const progress = (currentAmount / targetAmount) * 100;
  return Math.min(100, Math.max(0, progress));
}

/**
 * Calculate monthly contribution needed to reach goal by target date.
 */
function calculateMonthlyRequired(
  currentAmount,
  targetAmount,
  monthsRemaining,
) {
  if (monthsRemaining <= 0) return targetAmount - currentAmount;
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) return 0;
  return remaining / monthsRemaining;
}

/**
 * Calculate months between two dates.
 */
function calculateMonthsBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  return Math.max(0, months);
}

/**
 * Calculate debt payoff using snowball method (smallest balance first).
 */
function calculateSnowballPayoff(debts, extraPayment) {
  if (!debts || debts.length === 0) return { months: 0, totalInterest: 0 };

  // Sort by balance (smallest first)
  const sorted = [...debts].sort((a, b) => a.balance - b.balance);

  let totalInterest = 0;
  let months = 0;
  let remainingDebts = sorted.map((d) => ({ ...d }));

  while (remainingDebts.some((d) => d.balance > 0) && months < 360) {
    months++;
    let availableExtra = extraPayment;

    for (let i = 0; i < remainingDebts.length; i++) {
      const debt = remainingDebts[i];
      if (debt.balance <= 0) continue;

      // Calculate monthly interest
      const monthlyRate = debt.interestRate / 100 / 12;
      const interest = debt.balance * monthlyRate;
      totalInterest += interest;

      // Apply payment
      let payment = debt.minimumPayment;
      if (i === remainingDebts.findIndex((d) => d.balance > 0)) {
        payment += availableExtra;
        availableExtra = 0;
      }

      debt.balance = debt.balance + interest - payment;
      if (debt.balance < 0) {
        availableExtra += Math.abs(debt.balance);
        debt.balance = 0;
      }
    }
  }

  return { months, totalInterest: Math.round(totalInterest * 100) / 100 };
}

/**
 * Calculate debt payoff using avalanche method (highest interest first).
 */
function calculateAvalanchePayoff(debts, extraPayment) {
  if (!debts || debts.length === 0) return { months: 0, totalInterest: 0 };

  // Sort by interest rate (highest first)
  const sorted = [...debts].sort((a, b) => b.interestRate - a.interestRate);

  let totalInterest = 0;
  let months = 0;
  let remainingDebts = sorted.map((d) => ({ ...d }));

  while (remainingDebts.some((d) => d.balance > 0) && months < 360) {
    months++;
    let availableExtra = extraPayment;

    for (let i = 0; i < remainingDebts.length; i++) {
      const debt = remainingDebts[i];
      if (debt.balance <= 0) continue;

      const monthlyRate = debt.interestRate / 100 / 12;
      const interest = debt.balance * monthlyRate;
      totalInterest += interest;

      let payment = debt.minimumPayment;
      if (i === remainingDebts.findIndex((d) => d.balance > 0)) {
        payment += availableExtra;
        availableExtra = 0;
      }

      debt.balance = debt.balance + interest - payment;
      if (debt.balance < 0) {
        availableExtra += Math.abs(debt.balance);
        debt.balance = 0;
      }
    }
  }

  return { months, totalInterest: Math.round(totalInterest * 100) / 100 };
}

/**
 * Check if goal has reached a milestone.
 */
function checkMilestone(previousProgress, currentProgress) {
  const milestones = [25, 50, 75, 100];
  for (const milestone of milestones) {
    if (previousProgress < milestone && currentProgress >= milestone) {
      return milestone;
    }
  }
  return null;
}

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const savingsGoalArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  targetAmount: fc.integer({ min: 100, max: 100000 }),
  currentAmount: fc.integer({ min: 0, max: 100000 }),
  monthsRemaining: fc.integer({ min: 1, max: 120 }),
});

const debtArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  balance: fc.integer({ min: 100, max: 50000 }),
  interestRate: fc.integer({ min: 0, max: 30 }),
  minimumPayment: fc.integer({ min: 25, max: 500 }),
});

// ============================================================================
// Property Tests
// ============================================================================

describe("Property 11: Savings Goal Calculation", () => {
  describe("11.1: Progress Percentage Bounds", () => {
    test("progress is always between 0 and 100", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 200000 }),
          fc.integer({ min: 1, max: 100000 }),
          (current, target) => {
            const progress = calculateSavingsProgress(current, target);
            expect(progress).toBeGreaterThanOrEqual(0);
            expect(progress).toBeLessThanOrEqual(100);
          },
        ),
        { numRuns: 100 },
      );
    });

    test("progress is 0 when current is 0", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 100000 }), (target) => {
          const progress = calculateSavingsProgress(0, target);
          expect(progress).toBe(0);
        }),
        { numRuns: 100 },
      );
    });

    test("progress is 100 when current equals or exceeds target", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100000 }),
          fc.integer({ min: 0, max: 50000 }),
          (target, extra) => {
            const progress = calculateSavingsProgress(target + extra, target);
            expect(progress).toBe(100);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("11.2: Monthly Required Calculation", () => {
    test("monthly required is non-negative when target exceeds current", () => {
      fc.assert(
        fc.property(savingsGoalArbitrary, (goal) => {
          fc.pre(goal.targetAmount > goal.currentAmount);
          const monthly = calculateMonthlyRequired(
            goal.currentAmount,
            goal.targetAmount,
            goal.monthsRemaining,
          );
          expect(monthly).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 },
      );
    });

    test("monthly required is 0 when goal is already met", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 100000 }),
          fc.integer({ min: 1, max: 120 }),
          (amount, months) => {
            const monthly = calculateMonthlyRequired(amount, amount, months);
            expect(monthly).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    test("monthly * months >= remaining amount", () => {
      fc.assert(
        fc.property(savingsGoalArbitrary, (goal) => {
          fc.pre(goal.targetAmount > goal.currentAmount);
          fc.pre(goal.monthsRemaining > 0);
          const monthly = calculateMonthlyRequired(
            goal.currentAmount,
            goal.targetAmount,
            goal.monthsRemaining,
          );
          const remaining = goal.targetAmount - goal.currentAmount;
          expect(monthly * goal.monthsRemaining).toBeCloseTo(remaining, 5);
        }),
        { numRuns: 100 },
      );
    });
  });
});

describe("Property 12: Debt Payoff Calculation", () => {
  describe("12.1: Avalanche Saves Interest When Rates Differ Significantly", () => {
    test("avalanche saves interest when all debts have positive interest rates", () => {
      // Generate debts with positive interest rates only
      const positiveRateDebtArbitrary = fc.record({
        id: fc.string({ minLength: 1, maxLength: 20 }),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        balance: fc.integer({ min: 1000, max: 20000 }),
        interestRate: fc.integer({ min: 5, max: 25 }), // Positive rates only
        minimumPayment: fc.integer({ min: 50, max: 300 }),
      });

      fc.assert(
        fc.property(
          fc.array(positiveRateDebtArbitrary, { minLength: 2, maxLength: 4 }),
          fc.integer({ min: 100, max: 500 }),
          (debts, extraPayment) => {
            // Ensure debts have different interest rates
            const uniqueRates = new Set(debts.map((d) => d.interestRate));
            fc.pre(uniqueRates.size > 1);

            const snowball = calculateSnowballPayoff(debts, extraPayment);
            const avalanche = calculateAvalanchePayoff(debts, extraPayment);

            // Avalanche should save interest or be equal
            expect(avalanche.totalInterest).toBeLessThanOrEqual(
              snowball.totalInterest + 1,
            );
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("12.2: Payoff Months Are Reasonable", () => {
    test("payoff months is positive for non-zero debt", () => {
      fc.assert(
        fc.property(
          fc.array(debtArbitrary, { minLength: 1, maxLength: 3 }),
          fc.integer({ min: 0, max: 200 }),
          (debts, extraPayment) => {
            const result = calculateSnowballPayoff(debts, extraPayment);
            expect(result.months).toBeGreaterThan(0);
          },
        ),
        { numRuns: 50 },
      );
    });

    test("more extra payment means fewer months", () => {
      fc.assert(
        fc.property(
          fc.array(debtArbitrary, { minLength: 1, maxLength: 3 }),
          fc.integer({ min: 50, max: 200 }),
          (debts, extraBase) => {
            const result1 = calculateSnowballPayoff(debts, extraBase);
            const result2 = calculateSnowballPayoff(debts, extraBase + 100);

            expect(result2.months).toBeLessThanOrEqual(result1.months);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("12.3: Empty Debt Handling", () => {
    test("empty debt array returns 0 months and 0 interest", () => {
      const result = calculateSnowballPayoff([], 100);
      expect(result.months).toBe(0);
      expect(result.totalInterest).toBe(0);
    });
  });
});

describe("Property 13: Goal Math Accuracy", () => {
  describe("13.1: Progress Calculation Accuracy", () => {
    test("progress percentage is mathematically correct", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 50000 }),
          fc.integer({ min: 1, max: 100000 }),
          (current, target) => {
            const progress = calculateSavingsProgress(current, target);
            const expected = Math.min(
              100,
              Math.max(0, (current / target) * 100),
            );
            expect(progress).toBeCloseTo(expected, 5);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("13.2: Milestone Detection", () => {
    test("milestone is detected when crossing threshold", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 24 }),
          fc.integer({ min: 26, max: 49 }),
          (prev, curr) => {
            const milestone = checkMilestone(prev, curr);
            expect(milestone).toBe(25);
          },
        ),
        { numRuns: 50 },
      );
    });

    test("no milestone when not crossing threshold", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 26, max: 49 }),
          fc.integer({ min: 26, max: 49 }),
          (prev, curr) => {
            fc.pre(prev <= curr);
            const milestone = checkMilestone(prev, curr);
            expect(milestone).toBeNull();
          },
        ),
        { numRuns: 50 },
      );
    });

    test("100% milestone detected on completion", () => {
      fc.assert(
        fc.property(fc.integer({ min: 76, max: 99 }), (prev) => {
          const milestone = checkMilestone(prev, 100);
          expect(milestone).toBe(100);
        }),
        { numRuns: 50 },
      );
    });
  });

  describe("13.3: Months Between Dates", () => {
    test("months between same date is 0", () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") }),
          (date) => {
            const dateStr = date.toISOString().split("T")[0];
            const months = calculateMonthsBetween(dateStr, dateStr);
            expect(months).toBe(0);
          },
        ),
        { numRuns: 50 },
      );
    });

    test("months is non-negative", () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") }),
          fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") }),
          (date1, date2) => {
            const str1 = date1.toISOString().split("T")[0];
            const str2 = date2.toISOString().split("T")[0];
            const months = calculateMonthsBetween(str1, str2);
            expect(months).toBeGreaterThanOrEqual(0);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
