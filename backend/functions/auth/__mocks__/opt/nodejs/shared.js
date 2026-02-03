/**
 * Mock for /opt/nodejs/shared Lambda layer
 */

const checkPermission = jest.fn(() => null);

const PERMISSION_MATRIX = {
  primary: {
    "budget:view": true,
    "budget:create": true,
    "budget:edit": true,
    "budget:delete": true,
    "transaction:view": true,
    "transaction:create": true,
    "transaction:edit": true,
    "transaction:delete": true,
    "family:view": true,
    "family:invite": true,
    "family:remove": true,
    "account:view": true,
    "account:create": true,
    "account:edit": true,
    "account:delete": true,
  },
  spouse: {
    "budget:view": true,
    "budget:create": true,
    "budget:edit": true,
    "budget:delete": false,
    "transaction:view": true,
    "transaction:create": true,
    "transaction:edit": true,
    "transaction:delete": true,
    "family:view": true,
    "family:invite": false,
    "family:remove": false,
    "account:view": true,
    "account:create": true,
    "account:edit": true,
    "account:delete": false,
  },
  viewer: {
    "budget:view": true,
    "budget:create": false,
    "budget:edit": false,
    "budget:delete": false,
    "transaction:view": true,
    "transaction:create": false,
    "transaction:edit": false,
    "transaction:delete": false,
    "family:view": true,
    "family:invite": false,
    "family:remove": false,
    "account:view": true,
    "account:create": false,
    "account:edit": false,
    "account:delete": false,
  },
};

module.exports = {
  checkPermission,
  PERMISSION_MATRIX,
};
