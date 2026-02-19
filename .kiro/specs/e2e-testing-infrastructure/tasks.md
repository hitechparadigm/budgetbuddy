# Implementation Plan: E2E Testing Infrastructure

## Overview

This implementation plan breaks down the E2E testing infrastructure into discrete coding tasks. The approach follows a layered strategy: first establish the foundation (Playwright setup, configuration), then build utilities (authentication, data management), then implement the test infrastructure (fixtures, page objects), and finally create the four critical user journey tests. Each task builds incrementally on previous work.

## Tasks

- [ ] 1. Install and configure Playwright
  - Install Playwright and dependencies
  - Create `playwright.config.js` with browser targets, timeouts, retries, and reporters
  - Configure screenshot and video capture on failure
  - Set up test directory structure in `tests/e2e/`
  - Create `.gitignore` entries for test artifacts
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

- [ ]\* 1.1 Write unit tests for Playwright configuration
  - Test configuration values are correct
  - Test browser targets include Chromium, Firefox, WebKit
  - Test retry strategy is correct for CI vs local
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

- [ ] 2. Implement authentication utilities
  - [ ] 2.1 Create `tests/e2e/utils/auth.js` with Cognito user management
    - Implement `createCognitoUser(email, password, attributes)` function
    - Implement `authenticateUser(email, password)` function
    - Implement `deleteCognitoUser(userId)` function
    - Implement `verifyEmail(email)` function for test users
    - Use AWS SDK v3 for Cognito operations
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7_

  - [ ]\* 2.2 Write property test for Cognito credential validity
    - **Property 5: Cognito Credential Validity**
    - **Validates: Requirements 2.2**

  - [ ]\* 2.3 Write property test for authentication token storage
    - **Property 4: Authentication Token Storage**
    - **Validates: Requirements 2.3**

  - [ ]\* 2.4 Write property test for authentication error clarity
    - **Property 6: Authentication Error Clarity**
    - **Validates: Requirements 2.7**

  - [ ]\* 2.5 Write unit tests for authentication utilities
    - Test user creation with different roles
    - Test authentication with valid credentials
    - Test authentication with invalid credentials
    - Test user deletion
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7_

- [ ] 3. Implement data manager
  - [ ] 3.1 Create `tests/e2e/utils/data-manager.js` with DynamoDB operations
    - Implement `DataManager` class with tracking of created items
    - Implement `createUser(userId, email, familyId)` method
    - Implement `createFamily(familyId, primaryUserId)` method
    - Implement `createBudget(familyId, month, categories)` method
    - Implement `createTransaction(familyId, budgetId, categoryId, amount)` method
    - Implement `createBankAccount(familyId, plaidAccessToken, accountData)` method
    - Implement `createGoal(familyId, type, name, targetAmount)` method
    - Implement `cleanup()` method to delete all tracked items
    - Implement `generateUniqueId(prefix)` method
    - Use AWS SDK v3 for DynamoDB operations
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

  - [ ]\* 3.2 Write property test for test entity uniqueness
    - **Property 3: Test Entity Uniqueness**
    - **Validates: Requirements 3.4**

  - [ ]\* 3.3 Write property test for test data creation success
    - **Property 7: Test Data Creation Success**
    - **Validates: Requirements 3.1**

  - [ ]\* 3.4 Write property test for test data tracking completeness
    - **Property 9: Test Data Tracking Completeness**
    - **Validates: Requirements 3.10**

  - [ ]\* 3.5 Write property test for test data creation failure handling
    - **Property 8: Test Data Creation Failure Handling**
    - **Validates: Requirements 3.9**

  - [ ]\* 3.6 Write unit tests for data manager
    - Test creating each entity type
    - Test unique ID generation
    - Test cleanup deletes all items
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6, 3.7, 3.8, 3.10_

- [ ] 4. Checkpoint - Ensure utilities tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement base test fixture
  - [ ] 5.1 Create `tests/e2e/fixtures/base-fixture.js` with test setup/teardown
    - Implement `BaseFixture` class
    - Implement `createAuthenticatedUser(role)` method using auth utilities
    - Implement `authenticate(email, password)` method
    - Implement `createBudget(familyId, month, categories)` method using data manager
    - Implement `createTransaction(familyId, budgetId, categoryId, amount, description)` method
    - Implement `createBankAccount(familyId, plaidAccessToken)` method
    - Implement `createGoal(familyId, type, name, targetAmount, currentAmount)` method
    - Implement `cleanup()` method that calls auth and data manager cleanup
    - Track all created resources for cleanup
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 3.8_

  - [ ]\* 5.2 Write property test for test user cleanup completeness
    - **Property 1: Test User Cleanup Completeness**
    - **Validates: Requirements 2.4**

  - [ ]\* 5.3 Write property test for test data cleanup completeness
    - **Property 2: Test Data Cleanup Completeness**
    - **Validates: Requirements 3.2, 3.3**

  - [ ]\* 5.4 Write unit tests for base fixture
    - Test authenticated user creation
    - Test budget creation
    - Test transaction creation
    - Test cleanup executes even on failure
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_

- [ ] 6. Implement page object models
  - [ ] 6.1 Create `tests/e2e/pages/LoginPage.js`
    - Implement `LoginPage` class with navigation and login methods
    - Use data-testid selectors for stability
    - _Requirements: 4.1, 4.2, 5.1_

  - [ ] 6.2 Create `tests/e2e/pages/RegistrationPage.js`
    - Implement `RegistrationPage` class with registration flow methods
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 6.3 Create `tests/e2e/pages/OnboardingPage.js`
    - Implement `OnboardingPage` class with onboarding step methods
    - _Requirements: 4.4, 4.5, 4.6, 4.7_

  - [ ] 6.4 Create `tests/e2e/pages/BudgetPage.js`
    - Implement `BudgetPage` class with budget management methods
    - Implement transaction add, edit, delete methods
    - Implement budget amount edit methods
    - Implement category navigation methods
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [ ] 6.5 Create `tests/e2e/pages/AccountsPage.js`
    - Implement `AccountsPage` class with bank account methods
    - Implement Plaid Link interaction methods
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ] 6.6 Create `tests/e2e/pages/GoalsPage.js`
    - Implement `GoalsPage` class with goal management methods
    - Implement goal creation, editing, deletion methods
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ]\* 6.7 Write unit tests for page objects
    - Test page object methods interact with correct selectors
    - Test page object methods return expected values
    - _Requirements: 4.1-4.10, 5.1-5.10, 6.1-6.10, 7.1-7.10_

- [ ] 7. Checkpoint - Ensure page object tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement performance measurement utilities
  - [ ] 8.1 Create `tests/e2e/utils/performance.js` with measurement functions
    - Implement `measurePageLoad(page, url)` function
    - Implement `measureApiResponse(page, apiCall)` function
    - Implement `measureTimeToInteractive(page)` function
    - Implement `checkPerformanceThresholds(metrics)` function
    - Define performance thresholds (page load < 2s, API p95 < 500ms, TTI < 3s)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.8_

  - [ ]\* 8.2 Write property test for page load time measurement
    - **Property 16: Page Load Time Measurement**
    - **Validates: Requirements 11.1**

  - [ ]\* 8.3 Write property test for API response time measurement
    - **Property 17: API Response Time Measurement**
    - **Validates: Requirements 11.2**

  - [ ]\* 8.4 Write property test for time to interactive measurement
    - **Property 18: Time to Interactive Measurement**
    - **Validates: Requirements 11.3**

  - [ ]\* 8.5 Write property test for performance regression detection
    - **Property 19: Performance Regression Detection**
    - **Validates: Requirements 11.4**

  - [ ]\* 8.6 Write property test for performance degradation failure
    - **Property 20: Performance Degradation Failure**
    - **Validates: Requirements 11.8**

  - [ ]\* 8.7 Write unit tests for performance utilities
    - Test measurement functions return valid metrics
    - Test threshold checking flags regressions
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.8_

- [ ] 9. Implement cost tracking utilities
  - [ ] 9.1 Create `tests/e2e/utils/cost-tracker.js` with AWS cost estimation
    - Implement `CostTracker` class
    - Implement `trackDynamoDBOperation(type)` method
    - Implement `trackLambdaInvocation()` method
    - Implement `trackCognitoOperation()` method
    - Implement `calculateEstimatedCost()` method
    - Implement `checkCostThresholds(cost)` method
    - Define cost thresholds (per-test < $0.10, daily < $5, monthly < $100)
    - _Requirements: 12.1, 12.2, 12.3, 12.6, 12.7_

  - [ ]\* 9.2 Write property test for per-test cost limit
    - **Property 22: Per-Test Cost Limit**
    - **Validates: Requirements 12.1**

  - [ ]\* 9.3 Write property test for Lambda invocation efficiency
    - **Property 26: Lambda Invocation Efficiency**
    - **Validates: Requirements 12.6**

  - [ ]\* 9.4 Write property test for API call efficiency
    - **Property 27: API Call Efficiency**
    - **Validates: Requirements 12.7**

  - [ ]\* 9.5 Write unit tests for cost tracker
    - Test cost calculation is accurate
    - Test threshold checking works correctly
    - _Requirements: 12.1, 12.2, 12.3, 12.6, 12.7_

- [ ] 10. Checkpoint - Ensure utility tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement New User Onboarding Journey E2E test
  - [ ] 11.1 Create `tests/e2e/onboarding-journey.test.js`
    - Set up test with base fixture
    - Navigate to registration page
    - Fill and submit registration form
    - Verify user created in Cognito
    - Simulate email verification
    - Complete location detection and city selection
    - Enter family size
    - Trigger AI budget generation
    - Verify budget created with categories
    - Customize budget category amounts
    - Add first transaction
    - Verify transaction appears in budget
    - Verify all onboarding steps marked complete
    - Measure and verify test completes in under 5 minutes
    - Clean up test data and user
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

  - [ ]\* 11.2 Write performance assertions for onboarding journey
    - Verify page load times < 2s
    - Verify API response times < 500ms
    - Verify total journey time < 5 minutes
    - _Requirements: 4.9, 11.1, 11.2, 11.9_

- [ ] 12. Implement Daily Budget Management Journey E2E test
  - [ ] 12.1 Create `tests/e2e/daily-budget-management-journey.test.js`
    - Set up test with authenticated user and existing budget
    - Navigate to current month budget
    - Verify budget displays with accurate totals
    - Add transaction to category
    - Verify category total updates immediately
    - Click category to view details
    - Verify all transactions displayed with remaining budget
    - Edit budget amount for category
    - Verify remaining budget recalculates correctly
    - Navigate between months
    - Verify correct budget data displayed for each month
    - Add multiple transactions rapidly
    - Verify all transactions saved correctly
    - Delete a transaction
    - Verify category total updates
    - Verify budget totals match sum of all transactions
    - Measure and verify transaction entry completes in under 30 seconds
    - Clean up test data and user
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [ ]\* 12.2 Write performance assertions for budget management journey
    - Verify page load times < 2s
    - Verify API response times < 500ms
    - Verify transaction entry time < 30s
    - _Requirements: 5.9, 11.1, 11.2, 11.9_

- [ ] 13. Implement Bank Account Connection Journey E2E test
  - [ ] 13.1 Create `tests/e2e/bank-connection-journey.test.js`
    - Set up test with authenticated user
    - Navigate to accounts page
    - Click "Add Account" button
    - Verify Plaid Link interface opens
    - Enter bank credentials in Plaid sandbox
    - Verify account connection succeeds
    - Verify account appears in accounts list
    - Trigger account sync
    - Verify transactions are imported
    - Review imported transactions
    - Verify transactions can be categorized
    - Disconnect account
    - Verify account removed from list
    - Test error handling when Plaid connection fails
    - Measure and verify connection flow completes in under 2 minutes
    - Clean up test data and user
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10_

  - [ ]\* 13.2 Write performance assertions for bank connection journey
    - Verify page load times < 2s
    - Verify API response times < 500ms
    - Verify connection flow time < 2 minutes
    - _Requirements: 6.10, 11.1, 11.2_

- [ ] 14. Implement Debt and Savings Goals Journey E2E test
  - [ ] 14.1 Create `tests/e2e/goals-journey.test.js`
    - Set up test with authenticated user
    - Navigate to goals page
    - Click "Create Goal" button
    - Verify goal creation form appears
    - Create debt goal with details
    - Verify debt goal appears in goals list with correct details
    - Create savings goal with details
    - Verify savings goal appears in goals list with correct details
    - Make payment toward debt goal
    - Verify progress updates correctly
    - Make payment to reach 100% progress
    - Verify goal marked as complete
    - Edit a goal
    - Verify changes saved and displayed
    - Delete a goal
    - Verify goal removed from list
    - Verify goal progress calculations are accurate
    - Verify goal completion triggers appropriate UI feedback
    - Clean up test data and user
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

  - [ ]\* 14.2 Write performance assertions for goals journey
    - Verify page load times < 2s
    - Verify API response times < 500ms
    - _Requirements: 11.1, 11.2_

- [ ] 15. Checkpoint - Ensure all E2E tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Implement test reporter enhancements
  - [ ] 16.1 Create custom Playwright reporter in `tests/e2e/reporters/custom-reporter.js`
    - Extend Playwright's built-in reporter
    - Capture and include performance metrics in reports
    - Capture and include cost estimates in reports
    - Group tests by user journey
    - Add filtering by test status
    - _Requirements: 10.6, 10.7, 10.8, 10.9, 11.6_

  - [ ]\* 16.2 Write property tests for test reporter
    - **Property 10: HTML Report Generation**
    - **Property 11: Failure Screenshot Capture**
    - **Property 12: Failure Video Recording**
    - **Property 13: Failure Console Log Capture**
    - **Property 14: Failure Network Log Capture**
    - **Property 15: Test Execution Time Reporting**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6**

  - [ ]\* 16.3 Write unit tests for custom reporter
    - Test report generation with passing tests
    - Test report generation with failing tests
    - Test performance metrics included
    - Test cost estimates included
    - _Requirements: 10.1, 10.6, 10.7, 10.8, 10.9, 11.6_

- [ ] 17. Implement CI/CD integration
  - [ ] 17.1 Create GitHub Actions workflow `.github/workflows/e2e-tests.yml`
    - Configure workflow to run on pull requests and pushes to develop
    - Install Node.js and dependencies
    - Install Playwright browsers
    - Run E2E tests in headless mode
    - Run tests on all browsers (Chromium, Firefox, WebKit)
    - Set appropriate timeouts (30 minutes)
    - Configure retries (2 retries for failed tests)
    - Upload test artifacts (screenshots, videos) on failure
    - Upload HTML report as artifact
    - Set environment variables (BASE_URL, AWS credentials)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

  - [ ] 17.2 Update branch protection rules
    - Require E2E tests to pass before merging
    - Document in `.github/BRANCH_PROTECTION.md`
    - _Requirements: 8.2, 8.3_

  - [ ]\* 17.3 Write unit tests for CI/CD configuration
    - Test workflow configuration is valid
    - Test workflow runs on correct triggers
    - Test workflow uploads artifacts
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

- [ ] 18. Implement cross-browser testing configuration
  - [ ] 18.1 Update `playwright.config.js` with browser-specific settings
    - Configure viewport sizes for responsive testing
    - Configure mobile viewport emulation
    - Add browser skip configuration for known issues
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.8, 9.9, 9.10_

  - [ ]\* 18.2 Write unit tests for cross-browser configuration
    - Test all browsers are configured
    - Test viewport sizes are correct
    - Test mobile emulation is configured
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.8, 9.9, 9.10_

- [ ] 19. Create E2E testing documentation
  - [ ] 19.1 Create `tests/e2e/README.md`
    - Document how to run tests locally
    - Document how to run tests in CI/CD
    - Provide examples of writing new E2E tests
    - Document test fixture API
    - Document authentication utilities
    - Document test data management
    - Document debugging failed tests
    - Document performance benchmarking
    - Include troubleshooting common issues
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10_

  - [ ] 19.2 Add E2E testing section to main README.md
    - Link to E2E testing documentation
    - Explain purpose and coverage
    - _Requirements: 14.1_

- [ ] 20. Implement cost monitoring and alerting
  - [ ] 20.1 Create cost monitoring script `scripts/monitor-e2e-costs.js`
    - Track daily E2E test costs
    - Track monthly E2E test costs
    - Send alerts when thresholds exceeded
    - Generate cost reports
    - _Requirements: 12.2, 12.3, 12.9, 12.10_

  - [ ]\* 20.2 Write property tests for cost monitoring
    - **Property 23: Daily Cost Limit**
    - **Property 24: Monthly Cost Limit**
    - **Property 25: Immediate Test Data Cleanup for Cost Efficiency**
    - **Property 28: Cost Threshold Alert**
    - **Validates: Requirements 12.2, 12.3, 12.5, 12.10**

  - [ ]\* 20.3 Write unit tests for cost monitoring
    - Test cost tracking is accurate
    - Test alerts are sent when thresholds exceeded
    - _Requirements: 12.2, 12.3, 12.9, 12.10_

- [ ] 21. Implement performance trend tracking
  - [ ] 21.1 Create performance tracking script `scripts/track-e2e-performance.js`
    - Store performance metrics from each test run
    - Calculate performance trends over time
    - Generate performance reports
    - Flag performance regressions
    - _Requirements: 11.7_

  - [ ]\* 21.2 Write property test for performance trend tracking
    - **Property 21: Performance Trend Tracking**
    - **Validates: Requirements 11.7**

  - [ ]\* 21.3 Write unit tests for performance tracking
    - Test metrics are stored correctly
    - Test trends are calculated correctly
    - Test regressions are flagged
    - _Requirements: 11.7_

- [ ] 22. Final checkpoint - Run full E2E test suite
  - Run all E2E tests locally on all browsers
  - Verify all tests pass
  - Verify test artifacts are generated
  - Verify performance metrics are captured
  - Verify cost estimates are within limits
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 23. Update project documentation
  - Update CHANGELOG.md with E2E testing infrastructure
  - Update DEVELOPMENT_LOG.md with implementation details
  - Update docs/development-status.md with E2E testing status
  - Update README.md with E2E testing information

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- E2E tests validate complete user journeys
- All tests must clean up AWS resources to minimize costs
- All tests must run against dev environment only
