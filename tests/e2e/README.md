# BudgetBuddy E2E Testing

End-to-end tests that validate complete user journeys against a live dev environment using Playwright and AWS SDK.

## Quick Start

```bash
# Install dependencies (includes Playwright)
npm install

# Install Playwright browsers
npx playwright install

# Run E2E tests (requires environment variables - see below)
npx playwright test

# Run a specific journey
npx playwright test tests/e2e/onboarding-journey.test.js

# Run with UI (headed mode, useful for debugging)
npx playwright test --headed

# Run on a specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Required Environment Variables

```bash
# The deployed app URL to test against
BASE_URL=https://dev.budgetbuddy.example.com

# AWS credentials for test user/data management
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<e2e-test-user-key>
AWS_SECRET_ACCESS_KEY=<e2e-test-user-secret>

# Cognito configuration
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

Set these in a `.env.e2e` file (not committed) or export them before running tests.

## Test Structure

```
tests/e2e/
├── README.md                          # This file
├── playwright.config.test.js          # Config validation tests
│
├── onboarding-journey.test.js         # New user registration → first budget
├── daily-budget-management.test.js    # Add/edit/delete transactions
├── bank-connection-journey.test.js    # Plaid bank connection flow
├── goals-journey.test.js              # Debt and savings goals
├── pattern-detection-flow.test.js     # AI bill pattern detection
├── budget-planning-flow.test.js       # AI budget suggestions
├── pattern-notifications-flow.test.js # Notification flows
│
├── fixtures/
│   ├── base-fixture.js                # Test setup/teardown with auth + data
│   └── base-fixture.test.js
│
├── pages/                             # Page Object Models
│   ├── LoginPage.js
│   ├── RegistrationPage.js
│   ├── OnboardingPage.js
│   ├── BudgetPage.js
│   ├── AccountsPage.js
│   └── GoalsPage.js
│
└── utils/
    ├── auth.js                        # Cognito user management
    ├── auth.test.js
    ├── data-manager.js                # DynamoDB test data CRUD
    ├── data-manager.test.js
    ├── performance.js                 # Page load / API timing
    ├── performance.test.js
    ├── cost-tracker.js                # AWS cost estimation
    └── cost-tracker.test.js
```

## Writing a New Test

### Basic test using page objects

```javascript
const { test, expect } = require('@playwright/test');
const { BudgetPage } = require('./pages/BudgetPage');

test('add a transaction', async ({ page }) => {
  const budgetPage = new BudgetPage(page);
  await budgetPage.navigate();
  await budgetPage.addTransaction({ description: 'Coffee', amount: 4.50 });
  await expect(budgetPage.transactionList).toContainText('Coffee');
});
```

### Test with managed test data (auto-cleanup)

```javascript
const { BaseFixture } = require('./fixtures/base-fixture');

test('budget displays correctly', async ({ page }) => {
  const fixture = new BaseFixture();
  const { familyId } = await fixture.createAuthenticatedUser('primary');

  await fixture.createBudget(familyId, '2026-05', [
    { name: 'Food', planned: 500 },
  ]);

  // ... test assertions ...

  await fixture.cleanup(); // deletes Cognito user + DynamoDB data
});
```

### Authentication utilities

```javascript
const { createCognitoUser, authenticateUser, deleteCognitoUser } = require('./utils/auth');

// Create a test user
const user = await createCognitoUser('test@example.com', 'TestPass123!', {
  familyId: 'test-family-id',
  familyRole: 'primary',
});

// Get auth tokens
const tokens = await authenticateUser('test@example.com', 'TestPass123!');

// Cleanup
await deleteCognitoUser(user.userId);
```

## Debugging Failed Tests

### View test artifacts

After a failed test, Playwright saves:
- `test-results/` — screenshots and videos
- `test-results/html/` — full HTML report

```bash
npx playwright show-report test-results/html
```

### Run with full tracing

```bash
npx playwright test --trace on
# Then view the trace:
npx playwright show-trace test-results/<test-name>/trace.zip
```

### Run in headed mode with slow motion

```bash
npx playwright test --headed --slow-mo=500
```

## Performance Benchmarks

The performance utility enforces these thresholds:

| Metric | Threshold |
|--------|-----------|
| Page load time | < 2 seconds |
| API response (p95) | < 500ms |
| Time to interactive | < 3 seconds |
| Onboarding journey | < 5 minutes |
| Transaction entry | < 30 seconds |
| Bank connection | < 2 minutes |

## Cost Controls

Each test run estimates AWS costs via `utils/cost-tracker.js`:

| Scope | Limit |
|-------|-------|
| Per test | < $0.10 |
| Per day | < $5.00 |
| Per month | < $100.00 |

Tests automatically clean up all created AWS resources (Cognito users, DynamoDB records) after each run to minimize costs.

## CI/CD Integration

E2E tests run automatically after every successful deployment to the dev environment. See `.github/workflows/e2e-tests.yml`.

To run manually on a specific URL:
1. Go to **GitHub Actions → E2E Tests → Run workflow**
2. Set `base_url` to the target environment
3. Set `browsers` to `chromium`, `firefox`, `webkit`, or `all`

## Troubleshooting

**Tests fail with "COGNITO_USER_POOL_ID environment variable is required"**
→ Set all required environment variables (see above).

**Tests fail with AWS credential errors**
→ Ensure the AWS credentials have the required IAM permissions (see `.github/BRANCH_PROTECTION.md`).

**Tests time out**
→ Check that `BASE_URL` is reachable. The default timeout is 60s per test, 30 min for the suite.

**Playwright browsers not installed**
→ Run `npx playwright install` before running tests.
