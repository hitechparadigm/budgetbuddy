/**
 * Unit tests for Playwright configuration
 * Validates configuration values are correct for E2E testing
 */

const config = require("../../playwright.config");

describe("Playwright Configuration", () => {
  describe("Test Directory", () => {
    test("should use tests/e2e directory", () => {
      expect(config.testDir).toBe("./tests/e2e");
    });
  });

  describe("Timeouts", () => {
    test("should set test timeout to 60 seconds", () => {
      expect(config.timeout).toBe(60000);
    });

    test("should set global timeout to 30 minutes", () => {
      expect(config.globalTimeout).toBe(1800000);
    });
  });

  describe("Retry Strategy", () => {
    test("should retry 2 times in CI environment", () => {
      const originalEnv = process.env.CI;
      process.env.CI = "true";

      // Re-require to get updated config
      delete require.cache[require.resolve("../../playwright.config")];
      const ciConfig = require("../../playwright.config");

      expect(ciConfig.retries).toBe(2);

      // Restore
      process.env.CI = originalEnv;
      delete require.cache[require.resolve("../../playwright.config")];
    });

    test("should not retry in local environment", () => {
      const originalEnv = process.env.CI;
      delete process.env.CI;

      // Re-require to get updated config
      delete require.cache[require.resolve("../../playwright.config")];
      const localConfig = require("../../playwright.config");

      expect(localConfig.retries).toBe(0);

      // Restore
      process.env.CI = originalEnv;
      delete require.cache[require.resolve("../../playwright.config")];
    });
  });

  describe("Browser Targets", () => {
    test("should include Chromium browser", () => {
      const chromiumProject = config.projects.find(
        (p) => p.name === "chromium",
      );
      expect(chromiumProject).toBeDefined();
    });

    test("should include Firefox browser", () => {
      const firefoxProject = config.projects.find((p) => p.name === "firefox");
      expect(firefoxProject).toBeDefined();
    });

    test("should include WebKit browser", () => {
      const webkitProject = config.projects.find((p) => p.name === "webkit");
      expect(webkitProject).toBeDefined();
    });

    test("should include mobile Chrome viewport", () => {
      const mobileChrome = config.projects.find(
        (p) => p.name === "mobile-chrome",
      );
      expect(mobileChrome).toBeDefined();
    });

    test("should include mobile Safari viewport", () => {
      const mobileSafari = config.projects.find(
        (p) => p.name === "mobile-safari",
      );
      expect(mobileSafari).toBeDefined();
    });
  });

  describe("Reporters", () => {
    test("should include HTML reporter", () => {
      const htmlReporter = config.reporter.find((r) => r[0] === "html");
      expect(htmlReporter).toBeDefined();
      expect(htmlReporter[1].outputFolder).toBe("test-results/html");
    });

    test("should include JSON reporter", () => {
      const jsonReporter = config.reporter.find((r) => r[0] === "json");
      expect(jsonReporter).toBeDefined();
      expect(jsonReporter[1].outputFile).toBe("test-results/results.json");
    });

    test("should include JUnit reporter", () => {
      const junitReporter = config.reporter.find((r) => r[0] === "junit");
      expect(junitReporter).toBeDefined();
      expect(junitReporter[1].outputFile).toBe("test-results/junit.xml");
    });

    test("should include list reporter", () => {
      const listReporter = config.reporter.find((r) => r === "list");
      expect(listReporter).toBeDefined();
    });
  });

  describe("Shared Settings", () => {
    test("should set base URL with default fallback", () => {
      const originalEnv = process.env.BASE_URL;
      delete process.env.BASE_URL;

      delete require.cache[require.resolve("../../playwright.config")];
      const defaultConfig = require("../../playwright.config");

      expect(defaultConfig.use.baseURL).toBe("http://localhost:5173");

      process.env.BASE_URL = originalEnv;
      delete require.cache[require.resolve("../../playwright.config")];
    });

    test("should capture screenshots only on failure", () => {
      expect(config.use.screenshot).toBe("only-on-failure");
    });

    test("should retain videos only on failure", () => {
      expect(config.use.video).toBe("retain-on-failure");
    });

    test("should retain traces only on failure", () => {
      expect(config.use.trace).toBe("retain-on-failure");
    });

    test("should set viewport size", () => {
      expect(config.use.viewport).toEqual({ width: 1280, height: 720 });
    });

    test("should ignore HTTPS errors", () => {
      expect(config.use.ignoreHTTPSErrors).toBe(true);
    });

    test("should set action timeout to 10 seconds", () => {
      expect(config.use.actionTimeout).toBe(10000);
    });

    test("should set navigation timeout to 30 seconds", () => {
      expect(config.use.navigationTimeout).toBe(30000);
    });
  });

  describe("Parallel Execution", () => {
    test("should use 2 workers in CI environment", () => {
      const originalEnv = process.env.CI;
      process.env.CI = "true";

      delete require.cache[require.resolve("../../playwright.config")];
      const ciConfig = require("../../playwright.config");

      expect(ciConfig.workers).toBe(2);

      process.env.CI = originalEnv;
      delete require.cache[require.resolve("../../playwright.config")];
    });

    test("should use 1 worker in local environment", () => {
      const originalEnv = process.env.CI;
      delete process.env.CI;

      delete require.cache[require.resolve("../../playwright.config")];
      const localConfig = require("../../playwright.config");

      expect(localConfig.workers).toBe(1);

      process.env.CI = originalEnv;
      delete require.cache[require.resolve("../../playwright.config")];
    });
  });
});
