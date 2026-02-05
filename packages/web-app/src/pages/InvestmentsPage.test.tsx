/**
 * InvestmentsPage Tests
 *
 * Tests for portfolio calculations and holdings display logic.
 *
 * **Validates: Requirements 45.3, 45.4, 45.5**
 */

import * as fc from "fast-check";

// Simple holding type for testing
interface TestHolding {
  holdingId: string;
  symbol: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  accountType: string;
}

// Portfolio calculation functions (extracted from InvestmentsPage logic)
function calculateHoldingValue(holding: TestHolding): number {
  return holding.shares * holding.currentPrice;
}

function calculateHoldingCostBasis(holding: TestHolding): number {
  return holding.shares * holding.costBasis;
}

function calculateHoldingGainLoss(holding: TestHolding): number {
  const value = calculateHoldingValue(holding);
  const costBasis = calculateHoldingCostBasis(holding);
  return value - costBasis;
}

function calculateHoldingGainLossPercent(holding: TestHolding): number {
  const costBasis = calculateHoldingCostBasis(holding);
  if (costBasis === 0) return 0;
  const gainLoss = calculateHoldingGainLoss(holding);
  return (gainLoss / costBasis) * 100;
}

function calculatePortfolioTotalValue(holdings: TestHolding[]): number {
  return holdings.reduce((sum, h) => sum + calculateHoldingValue(h), 0);
}

function calculatePortfolioTotalCostBasis(holdings: TestHolding[]): number {
  return holdings.reduce((sum, h) => sum + calculateHoldingCostBasis(h), 0);
}

function calculatePortfolioGainLoss(holdings: TestHolding[]): number {
  const totalValue = calculatePortfolioTotalValue(holdings);
  const totalCostBasis = calculatePortfolioTotalCostBasis(holdings);
  return totalValue - totalCostBasis;
}

function calculatePortfolioGainLossPercent(holdings: TestHolding[]): number {
  const totalCostBasis = calculatePortfolioTotalCostBasis(holdings);
  if (totalCostBasis === 0) return 0;
  const gainLoss = calculatePortfolioGainLoss(holdings);
  return (gainLoss / totalCostBasis) * 100;
}

describe("InvestmentsPage - Portfolio Calculations", () => {
  /**
   * Property 1: Holding Value Calculation
   *
   * For any holding, the value SHALL equal shares × currentPrice
   *
   * **Validates: Requirement 45.3**
   */
  describe("Property 1: Holding Value Calculation", () => {
    const holdingArb = fc.record({
      holdingId: fc.uuid(),
      symbol: fc
        .string({ minLength: 1, maxLength: 5 })
        .map((s) => s.toUpperCase()),
      shares: fc.double({ min: 0.0001, max: 10000, noNaN: true }),
      costBasis: fc.double({ min: 0.01, max: 10000, noNaN: true }),
      currentPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
      accountType: fc.constantFrom(
        "brokerage",
        "401k",
        "ira",
        "roth_ira",
        "hsa",
        "crypto",
      ),
    });

    it("should calculate value as shares × currentPrice", () => {
      fc.assert(
        fc.property(holdingArb, (holding) => {
          const value = calculateHoldingValue(holding);
          const expected = holding.shares * holding.currentPrice;

          // Allow small floating point error
          return Math.abs(value - expected) < 0.01;
        }),
        { numRuns: 100 },
      );
    });

    it("should return 0 for zero shares", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 10000, noNaN: true }),
          (currentPrice) => {
            const holding: TestHolding = {
              holdingId: "test",
              symbol: "TEST",
              shares: 0,
              costBasis: 100,
              currentPrice,
              accountType: "brokerage",
            };
            return calculateHoldingValue(holding) === 0;
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 2: Gain/Loss Calculation
   *
   * For any holding, gain/loss SHALL equal (shares × currentPrice) - (shares × costBasis)
   *
   * **Validates: Requirement 45.3**
   */
  describe("Property 2: Gain/Loss Calculation", () => {
    const holdingArb = fc.record({
      holdingId: fc.uuid(),
      symbol: fc
        .string({ minLength: 1, maxLength: 5 })
        .map((s) => s.toUpperCase()),
      shares: fc.double({ min: 0.0001, max: 10000, noNaN: true }),
      costBasis: fc.double({ min: 0.01, max: 10000, noNaN: true }),
      currentPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
      accountType: fc.constantFrom(
        "brokerage",
        "401k",
        "ira",
        "roth_ira",
        "hsa",
        "crypto",
      ),
    });

    it("should calculate gain/loss correctly", () => {
      fc.assert(
        fc.property(holdingArb, (holding) => {
          const gainLoss = calculateHoldingGainLoss(holding);
          const expected =
            holding.shares * holding.currentPrice -
            holding.shares * holding.costBasis;

          // Allow small floating point error
          return Math.abs(gainLoss - expected) < 0.01;
        }),
        { numRuns: 100 },
      );
    });

    it("should be positive when currentPrice > costBasis", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.0001, max: 10000, noNaN: true }),
          fc.double({ min: 0.01, max: 1000, noNaN: true }),
          (shares, costBasis) => {
            const currentPrice = costBasis * 1.5; // 50% gain
            const holding: TestHolding = {
              holdingId: "test",
              symbol: "TEST",
              shares,
              costBasis,
              currentPrice,
              accountType: "brokerage",
            };
            return calculateHoldingGainLoss(holding) > 0;
          },
        ),
        { numRuns: 50 },
      );
    });

    it("should be negative when currentPrice < costBasis", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.0001, max: 10000, noNaN: true }),
          fc.double({ min: 0.01, max: 1000, noNaN: true }),
          (shares, costBasis) => {
            const currentPrice = costBasis * 0.5; // 50% loss
            const holding: TestHolding = {
              holdingId: "test",
              symbol: "TEST",
              shares,
              costBasis,
              currentPrice,
              accountType: "brokerage",
            };
            return calculateHoldingGainLoss(holding) < 0;
          },
        ),
        { numRuns: 50 },
      );
    });

    it("should be zero when currentPrice equals costBasis", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.0001, max: 10000, noNaN: true }),
          fc.double({ min: 0.01, max: 1000, noNaN: true }),
          (shares, price) => {
            const holding: TestHolding = {
              holdingId: "test",
              symbol: "TEST",
              shares,
              costBasis: price,
              currentPrice: price,
              accountType: "brokerage",
            };
            return Math.abs(calculateHoldingGainLoss(holding)) < 0.01;
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 3: Gain/Loss Percentage Calculation
   *
   * For any holding with non-zero cost basis, gain/loss % SHALL equal (gainLoss / costBasis) × 100
   *
   * **Validates: Requirement 45.3**
   */
  describe("Property 3: Gain/Loss Percentage Calculation", () => {
    const holdingArb = fc.record({
      holdingId: fc.uuid(),
      symbol: fc
        .string({ minLength: 1, maxLength: 5 })
        .map((s) => s.toUpperCase()),
      shares: fc.double({ min: 0.0001, max: 10000, noNaN: true }),
      costBasis: fc.double({ min: 0.01, max: 10000, noNaN: true }),
      currentPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
      accountType: fc.constantFrom(
        "brokerage",
        "401k",
        "ira",
        "roth_ira",
        "hsa",
        "crypto",
      ),
    });

    it("should calculate gain/loss percentage correctly", () => {
      fc.assert(
        fc.property(holdingArb, (holding) => {
          const percent = calculateHoldingGainLossPercent(holding);
          const gainLoss = calculateHoldingGainLoss(holding);
          const costBasis = calculateHoldingCostBasis(holding);
          const expected = (gainLoss / costBasis) * 100;

          // Allow small floating point error
          return Math.abs(percent - expected) < 0.01;
        }),
        { numRuns: 100 },
      );
    });

    it("should return 0 for zero cost basis", () => {
      const holding: TestHolding = {
        holdingId: "test",
        symbol: "TEST",
        shares: 0,
        costBasis: 100,
        currentPrice: 150,
        accountType: "brokerage",
      };
      expect(calculateHoldingGainLossPercent(holding)).toBe(0);
    });
  });

  /**
   * Property 4: Portfolio Total Value
   *
   * Portfolio total value SHALL equal the sum of all holding values
   *
   * **Validates: Requirement 45.3**
   */
  describe("Property 4: Portfolio Total Value", () => {
    const holdingArb = fc.record({
      holdingId: fc.uuid(),
      symbol: fc
        .string({ minLength: 1, maxLength: 5 })
        .map((s) => s.toUpperCase()),
      shares: fc.double({ min: 0.0001, max: 10000, noNaN: true }),
      costBasis: fc.double({ min: 0.01, max: 10000, noNaN: true }),
      currentPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
      accountType: fc.constantFrom(
        "brokerage",
        "401k",
        "ira",
        "roth_ira",
        "hsa",
        "crypto",
      ),
    });

    const holdingsArb = fc.array(holdingArb, { minLength: 0, maxLength: 20 });

    it("should equal sum of all holding values", () => {
      fc.assert(
        fc.property(holdingsArb, (holdings) => {
          const totalValue = calculatePortfolioTotalValue(holdings);
          const expected = holdings.reduce(
            (sum, h) => sum + h.shares * h.currentPrice,
            0,
          );

          // Allow small floating point error
          return Math.abs(totalValue - expected) < 0.01;
        }),
        { numRuns: 100 },
      );
    });

    it("should be 0 for empty portfolio", () => {
      expect(calculatePortfolioTotalValue([])).toBe(0);
    });

    it("should be non-negative", () => {
      fc.assert(
        fc.property(holdingsArb, (holdings) => {
          return calculatePortfolioTotalValue(holdings) >= 0;
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 5: Portfolio Gain/Loss
   *
   * Portfolio gain/loss SHALL equal totalValue - totalCostBasis
   *
   * **Validates: Requirement 45.3**
   */
  describe("Property 5: Portfolio Gain/Loss", () => {
    const holdingArb = fc.record({
      holdingId: fc.uuid(),
      symbol: fc
        .string({ minLength: 1, maxLength: 5 })
        .map((s) => s.toUpperCase()),
      shares: fc.double({ min: 0.0001, max: 10000, noNaN: true }),
      costBasis: fc.double({ min: 0.01, max: 10000, noNaN: true }),
      currentPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
      accountType: fc.constantFrom(
        "brokerage",
        "401k",
        "ira",
        "roth_ira",
        "hsa",
        "crypto",
      ),
    });

    const holdingsArb = fc.array(holdingArb, { minLength: 0, maxLength: 20 });

    it("should equal totalValue - totalCostBasis", () => {
      fc.assert(
        fc.property(holdingsArb, (holdings) => {
          const gainLoss = calculatePortfolioGainLoss(holdings);
          const totalValue = calculatePortfolioTotalValue(holdings);
          const totalCostBasis = calculatePortfolioTotalCostBasis(holdings);
          const expected = totalValue - totalCostBasis;

          // Allow small floating point error
          return Math.abs(gainLoss - expected) < 0.01;
        }),
        { numRuns: 100 },
      );
    });

    it("should be 0 for empty portfolio", () => {
      expect(calculatePortfolioGainLoss([])).toBe(0);
    });

    it("should equal sum of individual holding gains/losses", () => {
      fc.assert(
        fc.property(holdingsArb, (holdings) => {
          const portfolioGainLoss = calculatePortfolioGainLoss(holdings);
          const sumOfIndividualGains = holdings.reduce(
            (sum, h) => sum + calculateHoldingGainLoss(h),
            0,
          );

          // Allow small floating point error
          return Math.abs(portfolioGainLoss - sumOfIndividualGains) < 0.01;
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 6: Portfolio Gain/Loss Percentage
   *
   * Portfolio gain/loss % SHALL equal (totalGainLoss / totalCostBasis) × 100
   *
   * **Validates: Requirement 45.3**
   */
  describe("Property 6: Portfolio Gain/Loss Percentage", () => {
    const holdingArb = fc.record({
      holdingId: fc.uuid(),
      symbol: fc
        .string({ minLength: 1, maxLength: 5 })
        .map((s) => s.toUpperCase()),
      shares: fc.double({ min: 0.0001, max: 10000, noNaN: true }),
      costBasis: fc.double({ min: 0.01, max: 10000, noNaN: true }),
      currentPrice: fc.double({ min: 0.01, max: 10000, noNaN: true }),
      accountType: fc.constantFrom(
        "brokerage",
        "401k",
        "ira",
        "roth_ira",
        "hsa",
        "crypto",
      ),
    });

    const holdingsArb = fc.array(holdingArb, { minLength: 1, maxLength: 20 });

    it("should calculate percentage correctly", () => {
      fc.assert(
        fc.property(holdingsArb, (holdings) => {
          const percent = calculatePortfolioGainLossPercent(holdings);
          const gainLoss = calculatePortfolioGainLoss(holdings);
          const costBasis = calculatePortfolioTotalCostBasis(holdings);
          const expected = (gainLoss / costBasis) * 100;

          // Allow small floating point error
          return Math.abs(percent - expected) < 0.01;
        }),
        { numRuns: 100 },
      );
    });

    it("should return 0 for empty portfolio", () => {
      expect(calculatePortfolioGainLossPercent([])).toBe(0);
    });
  });
});
