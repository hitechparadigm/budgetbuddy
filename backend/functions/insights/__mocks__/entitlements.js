/**
 * Mock for /opt/nodejs/entitlements Lambda layer
 */

'use strict';

const canUseFeature = jest.fn(() => true); // allow all features by default

module.exports = { canUseFeature };
