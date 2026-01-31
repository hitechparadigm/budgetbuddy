// Mock for /opt/nodejs/shared layer
module.exports = {
  checkPermission: jest.fn(() => null), // Default: allow all permissions
};
