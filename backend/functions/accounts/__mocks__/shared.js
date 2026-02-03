/**
 * Mock for Lambda layer shared utilities
 */

const checkPermission = jest.fn(() => null); // No permission errors by default

module.exports = {
  checkPermission,
};
