/**
 * Entitlements Property-Based Tests
 *
 * Feature: feature-entitlements-enforcement
 * Validates: Requirements 7.1, 7.2, 7.3
 */
const fc = require('fast-check');
const { canUseFeature, FEATURE_CATALOG } = require('./entitlements');

describe('canUseFeature property tests', () => {
  // Feature: feature-entitlements-enforcement, Property 1: Unknown feature keys always deny
  it('Property 1: unknown featureKey always returns false regardless of subscriptionTier', () => {
    const knownKeys = Object.keys(FEATURE_CATALOG);
    fc.assert(
      fc.property(
        fc.string().filter((k) => !knownKeys.includes(k)),
        fc.oneof(fc.constantFrom('free', 'premium'), fc.string()),
        (featureKey, subscriptionTier) => canUseFeature(subscriptionTier, featureKey) === false,
      ),
      { numRuns: 100 },
    );
  });

  // Feature: feature-entitlements-enforcement, Property 2: Free-tier features always allowed
  it('Property 2: free-tier featureKey always returns true regardless of subscriptionTier', () => {
    const freeKeys = Object.entries(FEATURE_CATALOG)
      .filter(([, v]) => v.tier === 'free')
      .map(([k]) => k);
    fc.assert(
      fc.property(
        fc.constantFrom(...freeKeys),
        fc.oneof(fc.constantFrom('free', 'premium'), fc.string()),
        (featureKey, subscriptionTier) => canUseFeature(subscriptionTier, featureKey) === true,
      ),
      { numRuns: 100 },
    );
  });

  // Feature: feature-entitlements-enforcement, Property 3: Premium-tier iff subscriptionTier === 'premium'
  it('Property 3: premium-tier featureKey allowed iff subscriptionTier is premium', () => {
    // The live catalog has zero tier: 'premium' entries after Requirement 5's reclassification,
    // so this proves canUseFeature's premium-comparison branch stays correct independent of
    // whether any catalog entry currently exercises it in production. FEATURE_CATALOG and
    // canUseFeature are destructured from the same module instance above, so mutating the
    // FEATURE_CATALOG object here mutates the exact object canUseFeature's closure reads from
    // (object references are shared, not copied) — a jest.doMock/jest.isolateModules-based fixture
    // does not work here because canUseFeature closes over entitlements.js's own internal
    // FEATURE_CATALOG binding, not whatever object a mock factory returns under that name.
    const testKey = 'test.premium.feature';
    FEATURE_CATALOG[testKey] = { tier: 'premium', description: 'fixture' };
    try {
      fc.assert(
        fc.property(
          fc.oneof(fc.constantFrom('free', 'premium'), fc.string()),
          (subscriptionTier) =>
            canUseFeature(subscriptionTier, testKey) === (subscriptionTier === 'premium'),
        ),
        { numRuns: 100 },
      );
    } finally {
      delete FEATURE_CATALOG[testKey];
    }
  });
});
