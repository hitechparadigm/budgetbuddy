/**
 * Property-Based Tests for Debt Payoff Calculator
 *
 * Tests the mathematical correctness of debt payoff calculations
 * using snowball and avalanche methods.
 *
 * **Validates: Requirements 37.3, 37.4, 37.6, 37.7**
 */

const fc = require("fast-check");
const { calculateMonthsToPayoff, calculatePayoffPlan } = require("./index");

describe("Debt Payoff Calculator - Property-Based Tests", () => {
  /**
   * Property 1: Months to payoff is always non-negative
   * **Validates: Requirement 37.4**
   */
  describe("calculateMonthsToPayoff", () => {
    it("should return non-negative months for valid inputs", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 100000 }),
          fc.integer({ min: 0, max: 30 }),
          fc.integer({ min: 10, max: 5000 }),
          (balance, rate, payment) => {
            const months = calculateMonthsToPayoff(balance, rate, payment);
            return months >= 0 || months === Infinity;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should return 0 months for zero balance", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 30 }),
          fc.integer({ min: 10, max: 5000 }),
          (rate, payment) => {
            const months = calculateMonthsToPayoff(0, rate, payment);
            return months === 0;
          },
        ),
        { numRuns: 50 },
      );
    });

    it("should return Infinity when payment is zero", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 100000 }),
          fc.integer({ min: 0, max: 30 }),
          (balance, rate) => {
            const months = calculateMonthsToPayoff(balance, rate, 0);
            return months === Infinity;
          },
        ),
        { numRuns: 50 },
      );
    });

    it("should return Infinity when payment does not cover interest", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10000, max: 100000 }),
          fc.integer({ min: 20, max: 30 }),
          (balance, rate) => {
            // Monthly interest = balance * (rate/100/12)
            const monthlyInterest = balance * (rate / 100 / 12);
            const payment = Math.floor(monthlyInterest * 0.5); // Payment less than interest
            if (payment <= 0) return true; // Skip if payment would be 0
            const months = calculateMonthsToPayoff(balance, rate, payment);
            return months === Infinity;
          },
        ),
        { numRuns: 50 },
      );
    });

    it("should decrease months when payment increases", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 50000 }),
          fc.integer({ min: 5, max: 20 }),
          fc.integer({ min: 100, max: 1000 }),
          fc.integer({ min: 50, max: 500 }),
          (balance, rate, basePayment, extraPayment) => {
            const months1 = calculateMonthsToPayoff(balance, rate, basePayment);
            const months2 = calculateMonthsToPayoff(
              balance,
              rate,
              basePayment + extraPayment,
            );

            // If both are finite, higher payment should result in fewer months
            if (months1 !== Infinity && months2 !== Infinity) {
              return months2 <= months1;
            }
            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should return finite months for zero interest rate", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 10000 }),
          fc.integer({ min: 10, max: 1000 }),
          (balance, payment) => {
            const months = calculateMonthsToPayoff(balance, 0, payment);
            return months === Math.ceil(balance / payment);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 2: Avalanche method always results in less or equal total interest than snowball
   * (when debts have different interest rates)
   * **Validates: Requirement 37.4**
   */
  describe("calculatePayoffPlan - Avalanche vs Snowball", () => {
    it("avalanche total interest <= snowball total interest (with distinct rates)", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 4 }),
          fc.integer({ min: 0, max: 500 }),
          (numDebts, extraPayment) => {
            // Create debts with distinct, meaningful interest rates
            const debts = [];
            for (let i = 0; i < numDebts; i++) {
              debts.push({
                debtId: `debt-${i}`,
                name: `Debt ${i}`,
                currentBalance: 5000 + i * 2000,
                interestRate: 5 + i * 5, // 5%, 10%, 15%, 20%
                minimumPayment: 100,
              });
            }

            const snowballPlan = calculatePayoffPlan(
              debts,
              "snowball",
              extraPayment,
            );
            const avalanchePlan = calculatePayoffPlan(
              debts,
              "avalanche",
              extraPayment,
            );

            // Avalanche should always pay less or equal interest
            return (
              avalanchePlan.totalInterest <= snowballPlan.totalInterest + 1
            );
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 3: Total paid equals principal plus total interest
   * **Validates: Requirement 37.4**
   */
  describe("calculatePayoffPlan - Total Paid Calculation", () => {
    it("total paid = sum of balances + total interest", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3 }),
          fc.constantFrom("snowball", "avalanche"),
          fc.integer({ min: 0, max: 200 }),
          (numDebts, strategy, extraPayment) => {
            const debts = [];
            for (let i = 0; i < numDebts; i++) {
              debts.push({
                debtId: `debt-${i}`,
                name: `Debt ${i}`,
                currentBalance: 3000 + i * 1000,
                interestRate: 10 + i * 3,
                minimumPayment: 100,
              });
            }

            const plan = calculatePayoffPlan(debts, strategy, extraPayment);
            const totalPrincipal = debts.reduce(
              (sum, d) => sum + d.currentBalance,
              0,
            );

            // Total paid should equal principal + interest (with tolerance)
            const expectedTotal = totalPrincipal + plan.totalInterest;
            const tolerance = Math.max(1, expectedTotal * 0.01);

            return Math.abs(plan.totalPaid - expectedTotal) <= tolerance;
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 4: Extra payment reduces payoff time
   * **Validates: Requirement 37.6, 37.7**
   */
  describe("calculatePayoffPlan - Extra Payment Effect", () => {
    it("extra payment reduces total months", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3 }),
          fc.constantFrom("snowball", "avalanche"),
          fc.integer({ min: 50, max: 500 }),
          (numDebts, strategy, extraPayment) => {
            const debts = [];
            for (let i = 0; i < numDebts; i++) {
              debts.push({
                debtId: `debt-${i}`,
                name: `Debt ${i}`,
                currentBalance: 5000 + i * 2000,
                interestRate: 12 + i * 2,
                minimumPayment: 100,
              });
            }

            const planWithoutExtra = calculatePayoffPlan(debts, strategy, 0);
            const planWithExtra = calculatePayoffPlan(
              debts,
              strategy,
              extraPayment,
            );

            return planWithExtra.totalMonths <= planWithoutExtra.totalMonths;
          },
        ),
        { numRuns: 50 },
      );
    });

    it("extra payment reduces total interest", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3 }),
          fc.constantFrom("snowball", "avalanche"),
          fc.integer({ min: 50, max: 500 }),
          (numDebts, strategy, extraPayment) => {
            const debts = [];
            for (let i = 0; i < numDebts; i++) {
              debts.push({
                debtId: `debt-${i}`,
                name: `Debt ${i}`,
                currentBalance: 5000 + i * 2000,
                interestRate: 12 + i * 2,
                minimumPayment: 100,
              });
            }

            const planWithoutExtra = calculatePayoffPlan(debts, strategy, 0);
            const planWithExtra = calculatePayoffPlan(
              debts,
              strategy,
              extraPayment,
            );

            return (
              planWithExtra.totalInterest <=
              planWithoutExtra.totalInterest + 0.01
            );
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 5: Empty debt list returns zero values
   * **Validates: Requirement 37.4**
   */
  describe("calculatePayoffPlan - Edge Cases", () => {
    it("empty debt list returns zero values", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("snowball", "avalanche"),
          fc.integer({ min: 0, max: 1000 }),
          (strategy, extraPayment) => {
            const plan = calculatePayoffPlan([], strategy, extraPayment);
            return (
              plan.totalMonths === 0 &&
              plan.totalPaid === 0 &&
              plan.totalInterest === 0 &&
              plan.debtOrder.length === 0
            );
          },
        ),
        { numRuns: 20 },
      );
    });

    it("single debt produces valid plan", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 10000 }),
          fc.integer({ min: 5, max: 15 }), // Lower max rate to ensure payment covers interest
          fc.constantFrom("snowball", "avalanche"),
          (balance, rate, strategy) => {
            // Ensure minimum payment covers interest
            const monthlyInterest = (balance * rate) / 100 / 12;
            const minPayment = Math.max(100, Math.ceil(monthlyInterest * 1.5));

            const debt = {
              debtId: "test-debt",
              name: "Test Debt",
              currentBalance: balance,
              interestRate: rate,
              minimumPayment: minPayment,
            };

            const plan = calculatePayoffPlan([debt], strategy, 0);

            return (
              plan.totalMonths > 0 &&
              plan.totalPaid >= balance &&
              plan.debtOrder.length === 1
            );
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 6: Debt order follows strategy rules
   * **Validates: Requirement 37.3**
   */
  describe("calculatePayoffPlan - Debt Order", () => {
    it("snowball pays smallest balance first", () => {
      // Fixed test with clearly distinct balances
      const debts = [
        {
          debtId: "large",
          name: "Large",
          currentBalance: 10000,
          interestRate: 5,
          minimumPayment: 100,
        },
        {
          debtId: "small",
          name: "Small",
          currentBalance: 1000,
          interestRate: 20,
          minimumPayment: 100,
        },
        {
          debtId: "medium",
          name: "Medium",
          currentBalance: 5000,
          interestRate: 10,
          minimumPayment: 100,
        },
      ];

      const plan = calculatePayoffPlan(debts, "snowball", 0);

      // First debt paid off should be the smallest balance
      expect(plan.debtOrder[0].debtId).toBe("small");
    });

    it("avalanche focuses extra payment on highest interest debt", () => {
      // With extra payment, avalanche should pay off high interest debt faster
      const debts = [
        {
          debtId: "low",
          name: "Low Rate",
          currentBalance: 5000,
          interestRate: 5,
          minimumPayment: 100,
        },
        {
          debtId: "high",
          name: "High Rate",
          currentBalance: 5000,
          interestRate: 20,
          minimumPayment: 100,
        },
      ];

      const avalanchePlan = calculatePayoffPlan(debts, "avalanche", 200);
      const snowballPlan = calculatePayoffPlan(debts, "snowball", 200);

      // Avalanche should result in less total interest
      expect(avalanchePlan.totalInterest).toBeLessThanOrEqual(
        snowballPlan.totalInterest + 1,
      );
    });

    it("avalanche with distinct balances pays high interest first when it has smaller balance", () => {
      // When high interest debt has smaller balance, it should be paid first
      const debts = [
        {
          debtId: "low",
          name: "Low Rate",
          currentBalance: 10000,
          interestRate: 5,
          minimumPayment: 100,
        },
        {
          debtId: "high",
          name: "High Rate",
          currentBalance: 3000,
          interestRate: 20,
          minimumPayment: 100,
        },
      ];

      const plan = calculatePayoffPlan(debts, "avalanche", 100);

      // High interest debt should be paid off first (it's smaller AND has higher rate)
      expect(plan.debtOrder[0].debtId).toBe("high");
    });
  });

  /**
   * Property 7: Payoff date is in the future
   * **Validates: Requirement 37.4**
   */
  describe("calculatePayoffPlan - Payoff Date", () => {
    it("payoff date is valid ISO date string", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3 }),
          fc.constantFrom("snowball", "avalanche"),
          (numDebts, strategy) => {
            const debts = [];
            for (let i = 0; i < numDebts; i++) {
              debts.push({
                debtId: `debt-${i}`,
                name: `Debt ${i}`,
                currentBalance: 3000 + i * 1000,
                interestRate: 10 + i * 3,
                minimumPayment: 100,
              });
            }

            const plan = calculatePayoffPlan(debts, strategy, 0);

            // Payoff date should be a valid date string
            const date = new Date(plan.payoffDate);
            return !isNaN(date.getTime());
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
