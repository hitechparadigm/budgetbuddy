/**
 * Feature entitlement catalog and access check utility.
 *
 * Phase 1 intent: All features are available on the free tier. This module
 * establishes the check pattern so no Lambda ever hard-codes a tier comparison
 * directly. When Phase 2 wires entitlements to Stripe billing, only this file
 * needs to change — no Lambda business logic is touched.
 *
 * Phase 2 will move selected features (e.g. 'reports.advanced', 'budget.export')
 * to tier: 'premium' and introduce a SubscriptionGroup entity. Until then,
 * every feature listed here is accessible to all users regardless of their
 * subscriptionTier.
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
  'reports.advanced':   { tier: 'premium', description: 'Advanced reports' },
  'budget.export':      { tier: 'premium', description: 'Export budget data' },
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
  const feature = FEATURE_CATALOG[featureKey];
  if (!feature) return false;
  if (feature.tier === 'free') return true;
  return subscriptionTier === 'premium';
}

module.exports = { FEATURE_CATALOG, canUseFeature };
