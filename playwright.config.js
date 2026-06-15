/**
 * Playwright E2E Test Configuration
 *
 * Tests run against the deployed dev environment by default.
 * Set BASE_URL env var to override.
 */
// eslint-disable-next-line no-undef
const { devices } = require('@playwright/test');

const config = {
  testDir: './tests/e2e',

  // Per-test timeout: 60 seconds
  timeout: 60000,

  // Global timeout: 30 minutes
  globalTimeout: 30 * 60 * 1000,

  // Retries: 2 in CI, 0 locally
  retries: process.env.CI ? 2 : 0,

  // Workers: 2 in CI (avoid rate limits), 1 locally
  workers: process.env.CI ? 2 : 1,

  // Reporters
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/html', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  // Shared settings for all tests
  use: {
    // Base URL for all page.goto() calls
    baseURL: process.env.BASE_URL || 'http://localhost:5173',

    // Capture screenshot only when a test fails
    screenshot: 'only-on-failure',

    // Retain video only when a test fails
    video: 'retain-on-failure',

    // Collect trace on first retry in CI
    trace: 'retain-on-failure',

    // Standard viewport
    viewport: { width: 1280, height: 720 },

    // Don't fail on self-signed certs in dev
    ignoreHTTPSErrors: true,

    // Action timeout (click, fill, etc.)
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Output directory for test artifacts
  outputDir: 'test-results/artifacts',

  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
};

module.exports = config;
