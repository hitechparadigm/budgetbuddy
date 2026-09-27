/**
 * Feature entitlement catalog and access check utility.
 *
 * Current state: every feature in FEATURE_CATALOG, including 'reports.advanced'
 * and 'budget.export', is classified tier: 'free' because every current user is
 * on the same $0/month plan — there is no billing integration and no code path
 * anywhere in the backend ever writes subscriptionTier: 'premium'. This module
 * establishes the check pattern so no Lambda ever hard-codes a tier comparison
 * directly. canUseFeature() is already called from export/index.js
 * ('budget.export') and every handler in insights/index.js ('reports.advanced'),
 * so the call-sites are structurally ready for Phase 2.
 *
 * Phase 2 will re-gate 'reports.advanced' and 'budget.export' by changing only
 * their tier field back to 'premium' in FEATURE_CATALOG below, once real billing
 * introduces a subscriptionTier: 'premium' user. No Lambda handler code changes
 * are needed at that time — only this file needs to change.
 *
 * Usage:
 *   const { canUseFeature } = require('./entitlements');
 *   if (!canUseFeature(subscriptionTier, 'budget.export')) {
 *     throw { statusCode: 403, message: 'This feature requires a premium subscription.' };
 *   }
 */

'use strict';

/**
 * The authoritative list of gated features.
 *
 * Each entry maps a feature key to its required subscription tier and a
 * human-readable description. Lambdas reference these keys by constant string
 * rather than checking subscriptionTier directly.
 *
 * @type {Record<string, { tier: 'free' | 'premium', description: string }>}
 */
const FEATURE_CATALOG = {
  'viewer.invite':      { tier: 'free',    description: 'Invite read-only viewers' },
  'viewer.expiry':      { tier: 'free',    description: 'Set viewer expiration dates' },
  'budget.personal':    { tier: 'free',    description: 'Personal budget' },
  'budget.family':      { tier: 'free',    description: 'Family budget' },
  'budget.shared':      { tier: 'free',    description: 'Shared budget' },
  'member.invite':      { tier: 'free',    description: 'Invite budget members' },
  'budget.ai.generate': { tier: 'free',    description: 'AI budget generation' },
  'reports.advanced':   { tier: 'free',    description: 'Advanced reports' },
  'budget.export':      { tier: 'free',    description: 'Export budget data' },
};

/**
 * Checks whether a user with the given subscription tier may use a feature.
 *
 * Rules:
 * - Unknown feature keys always return false (fail-closed).
 * - Free-tier features are accessible to all users regardless of tier.
 * - Premium features require subscriptionTier === 'premium'.
 *
 * @param {string} subscriptionTier - The user's subscription tier ('free' | 'premium').
 * @param {string} featureKey - A key from FEATURE_CATALOG (e.g. 'budget.export').
 * @returns {boolean} true if the user may use the feature, false otherwise.
 */
function canUseFeature(subscriptionTier, featureKey) {
  // Use hasOwnProperty rather than a plain FEATURE_CATALOG[featureKey] lookup.
  // FEATURE_CATALOG is an object literal, so bracket access falls through to
  // Object.prototype for keys like 'toString', 'constructor', '__proto__',
  // 'valueOf', or 'hasOwnProperty' itself - these resolve to inherited
  // functions (truthy) instead of undefined, which would let an unknown
  // featureKey skip the fail-closed branch below and fall through to the
  // premium-tier comparison. hasOwnProperty guarantees only real catalog
  // entries are ever treated as known.
  if (!Object.prototype.hasOwnProperty.call(FEATURE_CATALOG, featureKey)) {
    return false;
  }
  const feature = FEATURE_CATALOG[featureKey];
  if (feature.tier === 'free') return true;
  return subscriptionTier === 'premium';
}

module.exports = { FEATURE_CATALOG, canUseFeature };
