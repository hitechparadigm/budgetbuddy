# Implementation Plan: Fix Accounts & Family Features

## Overview

This implementation plan addresses critical integration bugs in Manual Accounts and Family Invitations features. The approach is to fix issues incrementally, starting with backend fixes, then frontend fixes, followed by comprehensive testing.

## Tasks

- [-] 1. Fix Backend Family Lambda - Auto-Create Family Metadata
  - [x] 1.1 Update handleInvite function to auto-create family metadata if missing
    - Add check for existing FAMILY#<familyId> METADATA record
    - If missing, create metadata with primaryUserId, memberCount=1, subscriptionTier='free'
    - Also create MEMBER record for primary user if missing
    - Use ConditionExpression for idempotent creation
    - _Requirements: 3.1, 3.2, 5.1, 5.2, 5.3_

  - [x] 1.2 Write property test for family metadata auto-creation
    - **Property 5: Family Metadata Auto-Creation**
    - **Validates: Requirements 3.1, 3.2, 5.3**

  - [x] 1.3 Update handleGetMembers to ensure primary user has MEMBER record
    - Check if primary user from METADATA has a MEMBER record
    - Create MEMBER record if missing (backwards compatibility)
    - _Requirements: 5.3, 5.4_

  - [ ] 1.4 Standardize Family Lambda response format
    - Update successResponse to use `{ success: true, data, message }` format
    - Update errorResponse to use `{ success: false, message, error: { code } }` format
    - Ensure consistency with Accounts Lambda response format
    - _Requirements: 7.1, 7.4, 7.5_

- [ ] 2. Checkpoint - Verify backend family fixes
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Fix Frontend Accounts API Response Parsing
  - [ ] 3.1 Verify and fix accountsApi.ts response parsing
    - Confirm backend returns `{ success, data: { accounts, count }, message }` for list
    - Confirm backend returns `{ success, data: account, message }` for single account
    - Update parsing if needed to handle both formats
    - Add better error extraction from response
    - _Requirements: 2.3, 2.6, 7.2_

  - [ ] 3.2 Write property test for account creation round-trip
    - **Property 3: Account Creation Round-Trip**
    - **Validates: Requirements 2.2, 2.3, 2.6**

  - [ ] 3.3 Improve error handling in accountsApiCall function
    - Add check for missing token before API call
    - Improve error message extraction from response
    - Handle network errors with user-friendly message
    - _Requirements: 1.3, 2.5, 6.1, 6.2_

  - [ ] 3.4 Write property test for error message safety
    - **Property 12: Error Message Safety**
    - **Validates: Requirements 6.1, 6.2**

- [ ] 4. Checkpoint - Verify accounts API fixes
  - Ensure all tests pass, ask the user if questions arise.

- [-] 5. Fix Frontend Family Settings Component
  - [x] 5.1 Fix token usage in FamilySettings.tsx
    - Change from `budgetbuddy_access_token` to `budgetbuddy_id_token`
    - API Gateway Cognito authorizer requires ID tokens, not access tokens
    - Add error handling for missing token
    - _Requirements: 1.2, 1.3_

  - [ ] 5.2 Improve error handling and user feedback
    - Add loading states during API calls
    - Display clear error messages for common failures
    - Add success confirmations for operations
    - _Requirements: 6.1, 6.3, 6.6_

  - [ ] 5.3 Write unit tests for FamilySettings error handling
    - Test missing token handling
    - Test API error display
    - Test success message display
    - _Requirements: 6.1, 6.6_

- [ ] 6. Checkpoint - Verify family settings fixes
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Add Integration Tests for End-to-End Flows
  - [ ] 7.1 Write integration test for manual account creation flow
    - Test creating account via API
    - Verify account appears in list
    - Verify account details match input
    - _Requirements: 2.2, 2.4_

  - [ ] 7.2 Write property test for account validation
    - **Property 4: Account Validation Rejects Invalid Input**
    - **Validates: Requirements 2.5, 2.7**

  - [ ] 7.3 Write integration test for family invitation flow
    - Test sending invitation
    - Test accepting invitation
    - Verify family membership updated
    - _Requirements: 3.3, 4.1_

  - [ ] 7.4 Write property test for duplicate invitation prevention
    - **Property 7: Duplicate Invitation Prevention**
    - **Validates: Requirements 3.5**

  - [ ] 7.5 Write property test for member count invariant
    - **Property 11: Member Count Invariant**
    - \*\*Validates: Requirements 5.4, 5.5\_

- [ ] 8. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Update Documentation
  - [ ] 9.1 Update API documentation with token requirements
    - Document which token each endpoint expects
    - Document response formats
    - _Requirements: 1.4_

  - [ ] 9.2 Update CHANGELOG.md with bug fixes
    - Document accounts feature fixes
    - Document family invitation fixes
    - _Requirements: N/A (documentation)_

## Notes

- All tasks are required for comprehensive bug fixes
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Backend fixes should be deployed before frontend fixes are tested
