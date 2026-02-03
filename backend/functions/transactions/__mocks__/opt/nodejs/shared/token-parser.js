/**
 * Mock for /opt/nodejs/shared/token-parser Lambda layer
 */

module.exports = {
  parseIdToken: jest.fn(() => ({
    sub: "user123",
    "custom:userId": "user123",
    "custom:familyId": "family123",
    "custom:familyRole": "primary",
    given_name: "Test",
    family_name: "User",
    email: "test@example.com",
  })),
};
