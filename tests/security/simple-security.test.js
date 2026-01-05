/**
 * Simplified Security Tests
 *
 * Essential security validation without over-engineering
 */

const {
  isDevelopment,
  isProduction,
  canUseMockAuth,
} = require("../../packages/shared/src/utils/security");

describe("Essential Security Functions", () => {
  describe("Environment Detection", () => {
    test("should correctly identify development environment", () => {
      // Mock development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    test("should correctly identify production environment", () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      expect(isProduction()).toBe(true);
      expect(isDevelopment()).toBe(false);

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("Mock Auth Safety", () => {
    test("should block mock auth in production", () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      expect(canUseMockAuth()).toBe(false);

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    test("should allow mock auth in development", () => {
      // Mock development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      expect(canUseMockAuth()).toBe(true);

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });
});
