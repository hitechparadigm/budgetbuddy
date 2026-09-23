# Implementation Plan: Critical Bug Fixes

## Overview

This implementation plan addresses six critical bugs in the BudgetBuddy web application. The fixes are organized to minimize risk and allow incremental testing. Each task is self-contained and can be verified independently.

## Tasks

- [x] 1. Fix Dark Theme Persistence Issue
  - [x] 1.1 Update ThemeContext to apply theme synchronously during initialization
    - Modify the useState initializer to apply the dark class immediately
    - Ensure theme is resolved and applied before first render
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Add inline script to index.html for pre-React theme application
    - Add script tag before React bundle loads
    - Script reads localStorage and applies dark class if needed
    - Prevents flash of light theme on page load
    - _Requirements: 1.4_

  - [x] 1.3 Write property tests for theme persistence
    - **Property 1: Theme Persistence Round Trip**
    - **Property 2: Theme Application Consistency**
    - **Property 3: Invalid Theme Fallback**
    - **Validates: Requirements 1.1, 1.2, 1.4, 1.5**

- [x] 2. Fix Account Permissions for Primary Role
  - [x] 2.1 Add account permissions to PERMISSION_MATRIX in permissions.js
    - Add account:view, account:create, account:edit, account:delete for primary role
    - Add account:view, account:create, account:edit, account:delete for spouse role
    - Add account:view for viewer role (create/edit/delete = false)
    - _Requirements: 2.1-2.12_

  - [x] 2.2 Write property test for permission matrix completeness
    - **Property 4: Permission Matrix Completeness for Account Actions**
    - **Validates: Requirements 2.1-2.12**

  - [x] 2.3 Write unit tests for account permission checks
    - Test checkPermission with primary role and account:view
    - Test checkPermission with primary role and account:create
    - Test checkPermission with viewer role and account:create (should deny)
    - _Requirements: 2.13, 2.14_

- [x] 3. Checkpoint - Verify permission and theme fixes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Fix Receipt Scanning Error Handling
  - [x] 4.1 Add network error detection to ReceiptUpload component
    - Detect TypeError with 'Failed to fetch' message
    - Display specific network error message
    - Suggest checking internet connectivity
    - _Requirements: 3.4, 3.5, 3.6_

  - [x] 4.2 Write property test for error handling
    - **Property 5: Error Response Contains User-Friendly Message**
    - **Validates: Requirements 3.4, 3.5**

- [x] 5. Fix Connected Bank Accounts Error Handling
  - [x] 5.1 Add network error detection to ConnectedAccounts component
    - Detect TypeError with 'Failed to fetch' message
    - Display specific network error message
    - Add retry button for failed requests
    - _Requirements: 4.2, 4.3_

- [x] 6. Fix AI Insights Error Handling
  - [x] 6.1 Improve error handling in InsightsPage askAboutSpending
    - Detect network errors specifically
    - Display appropriate error message based on error type
    - Ensure suggestions are always provided with errors
    - _Requirements: 5.3, 5.4, 5.6_

  - [x] 6.2 Write property test for AI insights error handling
    - **Property 6: Error Response Includes Suggestions**
    - **Validates: Requirements 5.6**

- [x] 7. Final Checkpoint - Verify all fixes
  - Ensure all tests pass, ask the user if questions arise.
  - Verify theme persistence works across page refreshes
  - Verify accounts page loads without permission errors
  - Verify error messages are user-friendly

## Notes

- All tasks are required for comprehensive bug fixes
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
