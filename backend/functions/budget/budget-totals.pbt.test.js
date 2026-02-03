/**
 * Budget Totals Invariant Property-Based Tests
 *
 * Property-based tests for budget total calculations using fast-check.
 * These tests verify mathematical invariants that must hold for all inputs.
 *
 * **Property 9: Budget Totals Invariant**
 * **Validates: Requirements 7.6**
 */

const fc = require('fast-check');

// ============================================================================
// Budget Calculation Functions (extracted for testing)
// ============================================================================

function calculateSectionPlanned(groups) {
  let total = 0;
  for (const group of groups || []) {
    for (const category of group.categories || []) {
      total += category.plannedAmount || 0;
    }
  }
  return total;
}

function calculateSectionSpent(groups) {
  let total = 0;
  for (const group of groups || []) {
    for (const category of group.categories || []) {
      total += category.spentAmount || 0;
    }
  }
  return total;
}

function calculateCategoryRemaining(category) {
  const planned = category.plannedAmount || 0;
  const spent = category.spentAmount || 0;
  const rollover = category.rolloverAmount || 0;
  return planned + rollover - spent;
}

function calculateBudgetBalance(budget) {
  const income = calculateSectionPlanned(budget.groups?.income);
  const savings = calculateSectionPlanned(budget.groups?.savings);
  const expenses = calculateSectionPlanned(budget.groups?.expenses);
  return income - savings - expenses;
}

function calculateTotalSpent(budget) {
  return calculateSectionSpent(budget.groups?.expenses);
}

function calculateTotalRemaining(budget) {
  let total = 0;
  for (const group of budget.groups?.expenses || []) {
    for (const category of group.categories || []) {
      total += calculateCategoryRemaining(category);
    }
  }
  return total;
}

function updateCategorySpent(category, transactionAmount) {
  return {
    ...category,
    spentAmount: (category.spentAmount || 0) + transactionAmount,
  };
}

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const categoryArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  plannedAmount: fc.integer({ min: 0, max: 10000 }),
  spentAmount: fc.integer({ min: 0, max: 15000 }),
  rolloverAmount: fc.integer({ min: -1000, max: 1000 }),
});

const groupArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  categories: fc.array(categoryArbitrary, { minLength: 1, maxLength: 5 }),
});

const budgetArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  month: fc.constantFrom('2026-01', '2026-02', '2026-03'),
  groups: fc.record({
    income: fc.array(groupArbitrary, { minLength: 1, maxLength: 2 }),
    savings: fc.array(groupArbitrary, { minLength: 0, maxLength: 2 }),
    expenses: fc.array(groupArbitrary, { minLength: 1, maxLength: 3 }),
  }),
});

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 9: Budget Totals Invariant', () => {
  describe('9.1: Section Totals Equal Sum of Categories', () => {
    test('income total equals sum of all income category planned amounts', () => {
      fc.assert(
        fc.property(budgetArbitrary, (budget) => {
          const sectionTotal = calculateSectionPlanned(budget.groups.income);
          let manualTotal = 0;
          for (const group of budget.groups.income || []) {
            for (const category of group.categories || []) {
              manualTotal += category.plannedAmount || 0;
            }
          }
          expect(sectionTotal).toBe(manualTotal);
        }),
        { numRuns: 100 }
      );
    });

    test('expense total equals sum of all expense category planned amounts', () => {
      fc.assert(
        fc.property(budgetArbitrary, (budget) => {
          const sectionTotal = calculateSectionPlanned(budget.groups.expenses);
          let manualTotal = 0;
          for (const group of budget.groups.expenses || []) {
            for (const category of group.categories || []) {
              manualTotal += category.plannedAmount || 0;
            }
          }
          expect(sectionTotal).toBe(manualTotal);
        }),
        { numRuns: 100 }
      );
    });

    test('savings total equals sum of all savings category planned amounts', () => {
      fc.assert(
        fc.property(budgetArbitrary, (budget) => {
          const sectionTotal = calculateSectionPlanned(budget.groups.savings);
          let manualTotal = 0;
          for (const group of budget.groups.savings || []) {
            for (const category of group.categories || []) {
              manualTotal += category.plannedAmount || 0;
            }
          }
          expect(sectionTotal).toBe(manualTotal);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('9.2: Spent Totals Equal Sum of Category Spent', () => {
    test('total spent equals sum of all expense category spent amounts', () => {
      fc.assert(
        fc.property(budgetArbitrary, (budget) => {
          const totalSpent = calculateTotalSpent(budget);
          let manualTotal = 0;
          for (const group of budget.groups.expenses || []) {
            for (const category of group.categories || []) {
              manualTotal += category.spentAmount || 0;
            }
          }
          expect(totalSpent).toBe(manualTotal);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('9.3: Category Remaining Calculation', () => {
    test('remaining equals planned plus rollover minus spent', () => {
      fc.assert(
        fc.property(categoryArbitrary, (category) => {
          const remaining = calculateCategoryRemaining(category);
          const expected = (category.plannedAmount || 0) + 
                          (category.rolloverAmount || 0) - 
                          (category.spentAmount || 0);
          expect(remaining).toBe(expected);
        }),
        { numRuns: 100 }
      );
    });

    test('total remaining equals sum of all category remaining amounts', () => {
      fc.assert(
        fc.property(budgetArbitrary, (budget) => {
          const totalRemaining = calculateTotalRemaining(budget);
          let manualTotal = 0;
          for (const group of budget.groups.expenses || []) {
            for (const category of group.categories || []) {
              manualTotal += calculateCategoryRemaining(category);
            }
          }
          expect(totalRemaining).toBe(manualTotal);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('9.4: Zero-Based Budget Balance', () => {
    test('budget balance equals income minus savings minus expenses', () => {
      fc.assert(
        fc.property(budgetArbitrary, (budget) => {
          const balance = calculateBudgetBalance(budget);
          const income = calculateSectionPlanned(budget.groups.income);
          const savings = calculateSectionPlanned(budget.groups.savings);
          const expenses = calculateSectionPlanned(budget.groups.expenses);
          expect(balance).toBe(income - savings - expenses);
        }),
        { numRuns: 100 }
      );
    });

    test('balanced budget has zero balance', () => {
      const balancedBudgetArbitrary = fc.record({
        income: fc.integer({ min: 1000, max: 10000 }),
        savingsRatio: fc.integer({ min: 10, max: 30 }),
      }).map(({ income, savingsRatio }) => {
        const savings = Math.floor(income * savingsRatio / 100);
        const expenses = income - savings;
        return {
          groups: {
            income: [{ categories: [{ plannedAmount: income }] }],
            savings: [{ categories: [{ plannedAmount: savings }] }],
            expenses: [{ categories: [{ plannedAmount: expenses }] }],
          },
        };
      });

      fc.assert(
        fc.property(balancedBudgetArbitrary, (budget) => {
          const balance = calculateBudgetBalance(budget);
          expect(balance).toBe(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('9.5: Transaction Update Consistency', () => {
    test('adding transaction increases spent by transaction amount', () => {
      fc.assert(
        fc.property(
          categoryArbitrary,
          fc.integer({ min: 1, max: 1000 }),
          (category, transactionAmount) => {
            const originalSpent = category.spentAmount || 0;
            const updated = updateCategorySpent(category, transactionAmount);
            expect(updated.spentAmount).toBe(originalSpent + transactionAmount);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('adding transaction decreases remaining by transaction amount', () => {
      fc.assert(
        fc.property(
          categoryArbitrary,
          fc.integer({ min: 1, max: 1000 }),
          (category, transactionAmount) => {
            const originalRemaining = calculateCategoryRemaining(category);
            const updated = updateCategorySpent(category, transactionAmount);
            const newRemaining = calculateCategoryRemaining(updated);
            expect(newRemaining).toBe(originalRemaining - transactionAmount);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('multiple transactions accumulate correctly', () => {
      fc.assert(
        fc.property(
          categoryArbitrary,
          fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 10 }),
          (category, transactions) => {
            let current = { ...category };
            for (const amount of transactions) {
              current = updateCategorySpent(current, amount);
            }
            const totalTransactions = transactions.reduce((sum, t) => sum + t, 0);
            const expectedSpent = (category.spentAmount || 0) + totalTransactions;
            expect(current.spentAmount).toBe(expectedSpent);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('9.6: Non-Negative Constraints', () => {
    test('section totals are non-negative when all categories have non-negative planned', () => {
      const nonNegativeCategoryArbitrary = fc.record({
        id: fc.string({ minLength: 1, maxLength: 20 }),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        plannedAmount: fc.integer({ min: 0, max: 10000 }),
        spentAmount: fc.integer({ min: 0, max: 15000 }),
      });

      const nonNegativeGroupArbitrary = fc.record({
        id: fc.string({ minLength: 1 }),
        categories: fc.array(nonNegativeCategoryArbitrary, { minLength: 1, maxLength: 5 }),
      });

      fc.assert(
        fc.property(
          fc.array(nonNegativeGroupArbitrary, { minLength: 1, maxLength: 3 }),
          (groups) => {
            const total = calculateSectionPlanned(groups);
            expect(total).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('spent totals are non-negative when all categories have non-negative spent', () => {
      const nonNegativeCategoryArbitrary = fc.record({
        id: fc.string({ minLength: 1, maxLength: 20 }),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        plannedAmount: fc.integer({ min: 0, max: 10000 }),
        spentAmount: fc.integer({ min: 0, max: 15000 }),
      });

      const nonNegativeGroupArbitrary = fc.record({
        id: fc.string({ minLength: 1 }),
        categories: fc.array(nonNegativeCategoryArbitrary, { minLength: 1, maxLength: 5 }),
      });

      fc.assert(
        fc.property(
          fc.array(nonNegativeGroupArbitrary, { minLength: 1, maxLength: 3 }),
          (groups) => {
            const total = calculateSectionSpent(groups);
            expect(total).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
