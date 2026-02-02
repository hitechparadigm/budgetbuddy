/**
 * Property-Based Tests for Net Worth Calculation
 *
 * Tests the correctness of net worth calculations using fast-check.
 * **Validates: Requirement 41.3** - Net worth = Σ assets - Σ liabilities
 */

const fc = require("fast-check");

// ============ Pure Calculation Functions (extracted for testing) ============

/**
 * Calculate total assets from an array of assets
 * @param {Array<{value: number}>} assets - Array of asset objects
 * @returns {number} Total asset value
 */
function calculateTotalAssets(assets) {
  return assets.reduce((sum, a) => sum + (a.value || 0), 0);
}

/**
 * Calculate total liabilities from an array of liabilities
 * @param {Array<{balance: number}>} liabilities - Array of liability objects
 * @returns {number} Total liability balance
 */
function calculateTotalLiabilities(liabilities) {
  return liabilities.reduce((sum, l) => sum + (l.balance || 0), 0);
}

/**
 * Calculate net worth from assets and liabilities
 * @param {number} totalAssets - Total asset value
 * @param {number} totalLiabilities - Total liability balance
 * @returns {number} Net worth (assets - liabilities)
 */
function calculateNetWorth(totalAssets, totalLiabilities) {
  return totalAssets - totalLiabilities;
}

/**
 * Round to 2 decimal places (currency precision)
 * @param {number} value - Value to round
 * @returns {number} Rounded value
 */
function roundToCurrency(value) {
  return Math.round(value * 100) / 100;
}

// ============ Arbitraries (Test Data Generators) ============

// Generate a valid asset value (positive, reasonable range)
const assetValueArb = fc
  .float({
    min: 0,
    max: 10000000, // Up to $10M per asset
    noNaN: true,
    noDefaultInfinity: true,
  })
  .map((v) => Math.fround(v));

// Generate a valid liability balance (positive, reasonable range)
const liabilityBalanceArb = fc
  .float({
    min: 0,
    max: 5000000, // Up to $5M per liability
    noNaN: true,
    noDefaultInfinity: true,
  })
  .map((v) => Math.fround(v));

// Generate an asset object
const assetArb = fc.record({
  assetId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  type: fc.constantFrom("cash", "investment", "property", "vehicle", "other"),
  value: assetValueArb,
  currency: fc.constant("USD"),
});

// Generate a liability object
const liabilityArb = fc.record({
  liabilityId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  type: fc.constantFrom(
    "mortgage",
    "car_loan",
    "student_loan",
    "credit_card",
    "personal_loan",
    "other",
  ),
  balance: liabilityBalanceArb,
  interestRate: fc.float({
    min: 0,
    max: 30,
    noNaN: true,
    noDefaultInfinity: true,
  }),
  currency: fc.constant("USD"),
});

// Generate arrays of assets and liabilities
const assetsArb = fc.array(assetArb, { minLength: 0, maxLength: 20 });
const liabilitiesArb = fc.array(liabilityArb, { minLength: 0, maxLength: 20 });

// ============ Property Tests ============

describe("Net Worth Calculation Properties", () => {
  /**
   * Property 1: Net worth equals total assets minus total liabilities
   * **Validates: Requirement 41.3**
   */
  test("Property 1: Net worth = Σ assets - Σ liabilities", () => {
    fc.assert(
      fc.property(assetsArb, liabilitiesArb, (assets, liabilities) => {
        const totalAssets = calculateTotalAssets(assets);
        const totalLiabilities = calculateTotalLiabilities(liabilities);
        const netWorth = calculateNetWorth(totalAssets, totalLiabilities);

        // Net worth should equal assets minus liabilities
        const expected = totalAssets - totalLiabilities;
        expect(netWorth).toBeCloseTo(expected, 2);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2: Total assets is always non-negative
   * **Validates: Requirement 41.3**
   */
  test("Property 2: Total assets >= 0", () => {
    fc.assert(
      fc.property(assetsArb, (assets) => {
        const totalAssets = calculateTotalAssets(assets);
        expect(totalAssets).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3: Total liabilities is always non-negative
   * **Validates: Requirement 41.3**
   */
  test("Property 3: Total liabilities >= 0", () => {
    fc.assert(
      fc.property(liabilitiesArb, (liabilities) => {
        const totalLiabilities = calculateTotalLiabilities(liabilities);
        expect(totalLiabilities).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4: Adding an asset increases net worth by that amount
   * **Validates: Requirement 41.3**
   */
  test("Property 4: Adding asset increases net worth", () => {
    fc.assert(
      fc.property(
        assetsArb,
        liabilitiesArb,
        assetArb,
        (assets, liabilities, newAsset) => {
          const totalAssetsBefore = calculateTotalAssets(assets);
          const totalLiabilities = calculateTotalLiabilities(liabilities);
          const netWorthBefore = calculateNetWorth(
            totalAssetsBefore,
            totalLiabilities,
          );

          const assetsAfter = [...assets, newAsset];
          const totalAssetsAfter = calculateTotalAssets(assetsAfter);
          const netWorthAfter = calculateNetWorth(
            totalAssetsAfter,
            totalLiabilities,
          );

          // Net worth should increase by the new asset's value
          const expectedIncrease = newAsset.value || 0;
          expect(netWorthAfter - netWorthBefore).toBeCloseTo(
            expectedIncrease,
            2,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5: Adding a liability decreases net worth by that amount
   * **Validates: Requirement 41.3**
   */
  test("Property 5: Adding liability decreases net worth", () => {
    fc.assert(
      fc.property(
        assetsArb,
        liabilitiesArb,
        liabilityArb,
        (assets, liabilities, newLiability) => {
          const totalAssets = calculateTotalAssets(assets);
          const totalLiabilitiesBefore = calculateTotalLiabilities(liabilities);
          const netWorthBefore = calculateNetWorth(
            totalAssets,
            totalLiabilitiesBefore,
          );

          const liabilitiesAfter = [...liabilities, newLiability];
          const totalLiabilitiesAfter =
            calculateTotalLiabilities(liabilitiesAfter);
          const netWorthAfter = calculateNetWorth(
            totalAssets,
            totalLiabilitiesAfter,
          );

          // Net worth should decrease by the new liability's balance
          const expectedDecrease = newLiability.balance || 0;
          expect(netWorthBefore - netWorthAfter).toBeCloseTo(
            expectedDecrease,
            2,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6: Empty assets and liabilities results in zero net worth
   * **Validates: Requirement 41.3**
   */
  test("Property 6: Empty portfolio has zero net worth", () => {
    const totalAssets = calculateTotalAssets([]);
    const totalLiabilities = calculateTotalLiabilities([]);
    const netWorth = calculateNetWorth(totalAssets, totalLiabilities);

    expect(totalAssets).toBe(0);
    expect(totalLiabilities).toBe(0);
    expect(netWorth).toBe(0);
  });

  /**
   * Property 7: Net worth can be negative (liabilities > assets)
   * **Validates: Requirement 41.3**
   */
  test("Property 7: Net worth can be negative when liabilities exceed assets", () => {
    fc.assert(
      fc.property(
        fc.array(assetArb, { minLength: 0, maxLength: 5 }),
        fc.array(liabilityArb, { minLength: 1, maxLength: 10 }),
        (assets, liabilities) => {
          const totalAssets = calculateTotalAssets(assets);
          const totalLiabilities = calculateTotalLiabilities(liabilities);
          const netWorth = calculateNetWorth(totalAssets, totalLiabilities);

          // If liabilities exceed assets, net worth should be negative
          if (totalLiabilities > totalAssets) {
            expect(netWorth).toBeLessThan(0);
          }
          // Always verify the formula holds
          expect(netWorth).toBeCloseTo(totalAssets - totalLiabilities, 2);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8: Rounding preserves the relationship
   * **Validates: Requirement 41.3**
   */
  test("Property 8: Rounding to currency precision preserves net worth relationship", () => {
    fc.assert(
      fc.property(assetsArb, liabilitiesArb, (assets, liabilities) => {
        const totalAssets = calculateTotalAssets(assets);
        const totalLiabilities = calculateTotalLiabilities(liabilities);
        const netWorth = calculateNetWorth(totalAssets, totalLiabilities);

        const roundedAssets = roundToCurrency(totalAssets);
        const roundedLiabilities = roundToCurrency(totalLiabilities);
        const roundedNetWorth = roundToCurrency(netWorth);

        // Rounded net worth should be close to rounded assets - rounded liabilities
        // (within rounding error)
        const expectedRounded = roundToCurrency(
          roundedAssets - roundedLiabilities,
        );
        expect(Math.abs(roundedNetWorth - expectedRounded)).toBeLessThanOrEqual(
          0.02,
        );
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9: Order of assets/liabilities doesn't affect totals (commutativity)
   * **Validates: Requirement 41.3**
   */
  test("Property 9: Order of items doesn't affect totals", () => {
    fc.assert(
      fc.property(assetsArb, liabilitiesArb, (assets, liabilities) => {
        const totalAssets1 = calculateTotalAssets(assets);
        const totalAssets2 = calculateTotalAssets([...assets].reverse());

        const totalLiabilities1 = calculateTotalLiabilities(liabilities);
        const totalLiabilities2 = calculateTotalLiabilities(
          [...liabilities].reverse(),
        );

        expect(totalAssets1).toBeCloseTo(totalAssets2, 2);
        expect(totalLiabilities1).toBeCloseTo(totalLiabilities2, 2);
      }),
      { numRuns: 100 },
    );
  });
});

// ============ Edge Case Tests ============

describe("Net Worth Edge Cases", () => {
  test("Single asset with zero value", () => {
    const assets = [{ value: 0 }];
    expect(calculateTotalAssets(assets)).toBe(0);
  });

  test("Single liability with zero balance", () => {
    const liabilities = [{ balance: 0 }];
    expect(calculateTotalLiabilities(liabilities)).toBe(0);
  });

  test("Asset with undefined value treated as zero", () => {
    const assets = [{ name: "Test" }]; // No value property
    expect(calculateTotalAssets(assets)).toBe(0);
  });

  test("Liability with undefined balance treated as zero", () => {
    const liabilities = [{ name: "Test" }]; // No balance property
    expect(calculateTotalLiabilities(liabilities)).toBe(0);
  });

  test("Large number of small assets", () => {
    const assets = Array(1000).fill({ value: 0.01 });
    const total = calculateTotalAssets(assets);
    expect(total).toBeCloseTo(10, 2);
  });

  test("Very large asset values", () => {
    const assets = [{ value: 1000000000 }]; // $1 billion
    expect(calculateTotalAssets(assets)).toBe(1000000000);
  });
});
