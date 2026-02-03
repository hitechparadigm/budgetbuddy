# Implementation Plan: Test Coverage Improvement

## Overview

This implementation plan covers Weeks 2-4 of the test creation roadmap to improve test coverage from 56% to 80%. Week 1 P0 critical bugs are already fixed with regression tests.

## Tasks

- [x] 1. Week 2: High-Value Feature Tests
  - [x] 1.1 Create transaction editing test suite
    - Create `backend/functions/transactions/edit-transaction.test.js`
    - Test amount editing with budget recalculation
    - Test category change with both category totals update
    - Test date validation within budget month
    - Test invalid data rejection
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 Write property tests for transaction editing
    - **Property 1: Transaction Edit Round-Trip**
    - **Property 2: Transaction Date Validation**
    - **Property 3: Transaction Invalid Data Rejection**
    - **Validates: Requirements 1.3, 1.4, 1.6**

  - [x] 1.3 Create Google OAuth test suite
    - Create `backend/functions/auth/google-oauth.test.js`
    - Test OAuth initiation with correct redirect parameters
    - Test authorization code exchange
    - Test user creation/update in Cognito (mocked)
    - Test error handling for invalid codes
    - Test account linking for existing emails
    - Test JWT token issuance
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 1.4 Create admin dashboard test suite
    - Create `backend/functions/admin/admin-api.test.js`
    - Test user list pagination
    - Test user search by email/name
    - Test user details completeness
    - Test account disable functionality
    - Test system metrics display
    - Test authorization enforcement (403 for non-admins)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 1.5 Write property tests for admin APIs
    - **Property 4: Admin Search and Pagination**
    - **Property 5: Admin Data Completeness**
    - **Property 6: Admin Authorization**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.6**

  - [x] 1.6 Create receipt OCR accuracy test suite
    - Create `backend/functions/receipt/ocr-accuracy.test.js`
    - Create test receipt image dataset (10+ images with known values)
    - Test total amount extraction accuracy
    - Test merchant name extraction accuracy
    - Test date extraction accuracy
    - Test low quality image detection
    - Test multi-item receipt validation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 1.7 Write property test for receipt OCR
    - **Property 7: Receipt OCR Accuracy**
    - **Validates: Requirements 4.6**

  - [x] 1.8 Create two-factor authentication test suite
    - Create `tests/security/two-factor-auth.test.js`
    - Test TOTP secret generation and QR code display
    - Test TOTP verification flow
    - Test login with 2FA enabled
    - Test invalid TOTP rejection (max 3 attempts)
    - Test 2FA disable flow
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 1.9 Write property test for TOTP timing
    - **Property 8: TOTP Timing Validation**
    - **Validates: Requirements 5.6**

- [x] 2. Week 2 Checkpoint
  - Ensure all Week 2 tests pass
  - Verify test coverage increased by ~10%
  - Ask the user if questions arise

- [-] 3. Week 3: E2E User Journey Tests
  - [ ] 3.1 Create onboarding journey E2E test
    - Create `tests/e2e/onboarding-journey.test.js`
    - Test registration → email verification → onboarding redirect
    - Test location/family size → AI budget generation
    - Test category customization persistence
    - Test first budget creation → dashboard redirect
    - Test error recovery without losing progress
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

  - [ ] 3.2 Create daily budget management E2E test
    - Create `tests/e2e/daily-budget-management.test.js`
    - Test app open → current month budget display
    - Test transaction add → immediate total update
    - Test category view → transactions and remaining budget
    - Test budget edit → recalculation
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 3.3 Write property test for budget totals
    - **Property 9: Budget Totals Invariant**
    - **Validates: Requirements 7.6**

  - [ ] 3.4 Create bank connection journey E2E test
    - Create `tests/e2e/bank-connection-journey.test.js`
    - Test Plaid Link launch with correct config
    - Test access token storage and initial transaction fetch
    - Test AI categorization of imported transactions
    - Test refresh → new transactions since last sync
    - Test error handling and reconnection
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 3.5 Write property test for bank import
    - **Property 10: Bank Import Data Integrity**
    - **Validates: Requirements 8.6**

  - [ ] 3.6 Create goals journey E2E test
    - Create `tests/e2e/goals-journey.test.js`
    - Test savings goal creation → monthly contribution calculation
    - Test debt payoff goal → timeline calculation
    - Test contribution logging → progress update
    - Test goal completion → celebration notification
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 3.7 Write property tests for goal calculations
    - **Property 11: Savings Goal Calculation**
    - **Property 12: Debt Payoff Calculation**
    - **Property 13: Goal Math Accuracy**
    - **Validates: Requirements 9.1, 9.2, 9.6**

- [ ] 4. Week 3 Checkpoint
  - Ensure all Week 3 tests pass
  - Verify test coverage increased by ~10%
  - Ask the user if questions arise

- [ ] 5. Week 4: Mobile + AI Tests
  - [x] 5.1 Create React Native component tests
    - Create `packages/mobile/src/components/__tests__/QuickActionsFAB.test.tsx`
    - Create `packages/mobile/src/components/__tests__/TransactionTemplate.test.tsx`
    - Create `packages/mobile/src/components/__tests__/MobileSearch.test.tsx`
    - Create `packages/mobile/src/components/__tests__/GoalReorder.test.tsx`
    - Create `packages/mobile/src/components/__tests__/TwoFactorSetup.test.tsx`
    - Test rendering, interactions, and state management
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ] 5.2 Write property tests for mobile components
    - **Property 14: Mobile Search Filtering**
    - **Property 15: Mobile Accessibility**
    - **Validates: Requirements 10.3, 10.6**

  - [ ] 5.3 Create AI pattern detection test suite
    - Create `backend/functions/pattern-detection/confidence.test.js`
    - Create test transaction dataset for pattern detection
    - Test recurring transaction identification
    - Test confidence score calculation
    - Test threshold-based bill suggestion
    - Test user feedback exclusion
    - Test pattern change detection
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ] 5.4 Write property tests for pattern detection
    - **Property 16: Pattern Confidence and Threshold**
    - **Property 17: Pattern Change Detection**
    - **Property 18: Pattern Prediction Accuracy**
    - **Validates: Requirements 11.2, 11.3, 11.5, 11.6**

  - [ ] 5.5 Create AI bill creation test suite
    - Create `backend/functions/bills/ai-creation.test.js`
    - Test pattern confirmation → bill creation
    - Test due date calculation from pattern
    - Test bill reminder notification
    - Test auto-update on amount difference
    - Test user edit preservation
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ] 5.6 Write property tests for bill creation
    - **Property 19: Bill Due Date Calculation**
    - **Property 20: Bill Amount Accuracy**
    - **Validates: Requirements 12.2, 12.6**

  - [ ] 5.7 Create AI budget planning test suite
    - Create `backend/functions/budget/ai-planning.test.js`
    - Test historical spending analysis
    - Test seasonal variation accounting
    - Test confidence interval display
    - Test city-based defaults fallback
    - Test learning and adjustment
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ] 5.8 Write property tests for budget planning
    - **Property 21: Budget Seasonal Adjustment**
    - **Property 22: Budget Prediction Accuracy**
    - **Validates: Requirements 13.2, 13.6**

- [ ] 6. Final Checkpoint
  - Ensure all tests pass
  - Verify test coverage reached 80% target (65/81 requirements)
  - Update REQUIREMENTS_TEST_COVERAGE_ANALYSIS.md with final status
  - Ask the user if questions arise

## Notes

- All tasks are required including property-based tests for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at the end of each week
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- E2E tests use Playwright or similar for full user journey validation
- Test datasets should be created before running accuracy tests (OCR, pattern detection)
