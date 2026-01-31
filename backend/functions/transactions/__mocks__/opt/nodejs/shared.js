/**
 * Mock for /opt/nodejs/shared Lambda layer
 * Used in transaction Lambda tests
 */

module.exports = {
  checkPermission: jest.fn(() => null), // Default: allow all permissions
};
