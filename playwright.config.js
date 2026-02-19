// @ts-check
const { defineConfig, devices } = require("@playwright/test");

/**
 * Playwright configuration for BudgetBuddy E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: "./tests/e2e",

  // Test timeouts
  timeout: 60000, // 60 seconds per test
  globalTimeout: 1800000, // 30 minutes for entire suite

  // Retry strategy
  retries: process.env.CI ? 2 : 0,

  // Parallel execution
  workers: process.env.CI ? 2 : 1,

  // Reporter configuration
  reporter: [
    ["html", { outputFolder: "test-results/html" }],
    ["json", { outputFile: "test-results/results.json" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
    ["list"],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for the application under test
    baseURL: process.env.BASE_URL || "http://localhost:5173",

    // Capture artifacts on failure
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",

    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // Timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Browser projects for cross-browser testing
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    // Mobile viewports for responsive testing
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 12"] },
    },
  ],

  // Web server configuration (for local development)
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
