# Implementation Plan: Enhanced Accounts & Transactions

## Overview

This implementation plan covers the development of comprehensive account management, batch transaction entry, and improved navigation UX for BudgetBuddy. The work is organized into phases: data layer, backend API, frontend components, and integration.

## Tasks

- [x] 1. Set up Account data model and types
  - [x] 1.1 Create shared account types and enums
    - Create `packages/shared/src/types/account.ts` with AccountType, AccountSubtype enums
    - Define Account interface with all required fields
    - Export account icon mappings
    - _Requirements: 11.1, 11.2_

  - [x] 1.2 Create account validation schemas
    - Create Zod schemas for CreateAccountInput, UpdateAccountInput
    - Add validation for account type/subtype combinations
    - _Requirements: 2.4, 2.5_

- [x] 2. Implement Accounts Lambda backend
  - [x] 2.1 Create accounts Lambda function structure
    - Create `backend/functions/accounts/` directory
    - Create index.js with route handler
    - Create service.js for business logic
    - Create repository.js for DynamoDB operations
    - Create validators.js for input validation
    - _Requirements: 11.3, 11.4_

  - [x] 2.2 Implement account CRUD operations
    - Implement createAccount with DynamoDB put
    - Implement getAccounts with family-scoped query
    - Implement getAccount by accountId
    - Implement updateAccount with conditional update
    - Implement deleteAccount (soft delete for accounts with transactions)
    - _Requirements: 2.5, 2.7, 2.8, 2.9_

  - [x] 2.3 Write property test for account CRUD round-trip
    - **Property 5: Account CRUD Round-Trip**
    - Generate random valid account data, create, retrieve, verify equivalence
    - **Validates: Requirements 2.5, 2.7**

  - [x] 2.4 Implement account balance operations
    - Implement reconcileAccount to adjust balance and create adjustment transaction
    - Implement balance recalculation on transaction changes
    - _Requirements: 3.7, 3.8_

  - [x] 2.5 Write property test for balance consistency
    - **Property 9: Balance Consistency**
    - Generate random accounts and transaction sequences, verify final balance
    - **Validates: Requirements 3.2, 3.3, 3.4**

  - [x] 2.6 Implement account tracking operations
    - Implement setAccountTracking to toggle isTracked
    - Implement getAccountsSummary for net worth calculation
    - _Requirements: 5.6, 5.9, 3.5_

  - [x] 2.7 Write property test for net worth calculation
    - **Property 10: Net Worth Calculation**
    - Generate random accounts, verify net worth = assets - liabilities
    - **Validates: Requirements 3.5**

- [x] 3. Checkpoint - Backend accounts API complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Enhance Transaction Lambda for account support
  - [x] 4.1 Extend transaction data model with accountId
    - Update transaction repository to include optional accountId field
    - Update createTransaction to accept accountId
    - Update updateTransaction to handle accountId changes
    - _Requirements: 4.5, 10.6_

  - [x] 4.2 Implement account balance updates on transactions
    - Add balance update logic when transaction is created with accountId
    - Add balance reversal when transaction is deleted
    - Add balance recalculation when transaction amount/account changes
    - _Requirements: 3.2, 3.3, 3.4_

  - [x] 4.3 Add account filtering to transaction queries
    - Add accountId filter parameter to listTransactions
    - Support multi-account filtering
    - _Requirements: 4.7, 9.4_

  - [x] 4.4 Write property test for transaction account filtering
    - **Property 15: Transaction Account Filtering**
    - Generate random transactions, apply filters, verify results
    - **Validates: Requirements 4.7**

  - [x] 4.5 Ensure backward compatibility
    - Verify transactions without accountId continue to work
    - Add "Unassigned" handling for legacy transactions
    - _Requirements: 10.1, 10.5, 10.6_

  - [x] 4.6 Write property test for backward compatibility
    - **Property 27: Backward Compatibility - Optional AccountId**
    - Generate transactions without accountId, verify save and retrieve
    - **Validates: Requirements 10.1, 10.5, 10.6**

- [x] 5. Checkpoint - Transaction enhancements complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Create CDK infrastructure for accounts
  - [ ] 6.1 Add accounts Lambda to API stack
    - Create accounts Lambda function in CDK
    - Add API Gateway routes for /api/accounts/\*
    - Configure IAM permissions for DynamoDB access
    - _Requirements: 11.3, 11.4_

  - [ ] 6.2 Add GSI for account type queries
    - Add GSI1 to DynamoDB table for account type queries
    - Update CDK stack with GSI definition
    - _Requirements: 11.4_

- [ ] 7. Create frontend account service
  - [ ] 7.1 Create accountsApi service
    - Create `packages/web-app/src/services/accountsApi.ts`
    - Implement getAccounts, createAccount, updateAccount, deleteAccount
    - Implement reconcileAccount, setAccountTracking
    - Implement getAccountsSummary
    - _Requirements: 2.5, 2.7, 2.8, 3.7, 5.6_

  - [ ] 7.2 Create account React Query hooks
    - Create useAccounts hook for listing accounts
    - Create useAccount hook for single account
    - Create useAccountMutations for CRUD operations
    - Create useAccountsSummary for net worth data
    - _Requirements: 2.6, 3.5_

- [ ] 8. Implement Sidebar Navigation component
  - [ ] 8.1 Create Sidebar component
    - Create `packages/web-app/src/components/layout/Sidebar.tsx`
    - Implement navigation items with icons and labels
    - Implement active state highlighting based on current route
    - Implement collapse/expand functionality
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 8.2 Write property test for sidebar active state
    - **Property 21: Sidebar Active State**
    - Generate random routes, verify exactly one item highlighted
    - **Validates: Requirements 6.3**

  - [ ] 8.3 Implement sidebar collapse persistence
    - Store collapse state in localStorage
    - Restore state on page load
    - _Requirements: 6.9_

  - [ ] 8.4 Write property test for sidebar collapse persistence
    - **Property 22: Sidebar Collapse Persistence**
    - Toggle collapse, refresh, verify state restored
    - **Validates: Requirements 6.9**

  - [ ] 8.5 Implement mobile responsive sidebar
    - Hide sidebar on mobile, show hamburger menu
    - Display sidebar as overlay when hamburger tapped
    - _Requirements: 6.7, 6.8_

  - [ ] 8.6 Add user profile section to sidebar
    - Display user name/avatar at top
    - Add dropdown for profile/logout
    - _Requirements: 6.10_

- [ ] 9. Checkpoint - Sidebar navigation complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Simplify QuickActionsFAB
  - [ ] 10.1 Remove navigation items from FAB
    - Remove View Budget, View Goals, View Insights from FAB menu
    - Keep only Add Income, Add Expense, Scan Receipt
    - _Requirements: 7.1, 7.2_

  - [ ] 10.2 Update FAB keyboard shortcuts
    - Ensure Ctrl+N opens FAB
    - Ensure I triggers Add Income, E triggers Add Expense
    - Ensure Escape closes FAB
    - _Requirements: 7.6, 7.7_

- [ ] 11. Implement Account Management UI
  - [ ] 11.1 Create AccountCard component
    - Create `packages/web-app/src/components/accounts/AccountCard.tsx`
    - Display icon, nickname, institution, mask, balance
    - Display connection status and tracking status badge
    - Add menu with Edit, Reconcile, View Transactions, Toggle Tracking, Delete
    - _Requirements: 8.2, 8.5_

  - [ ] 11.2 Write property test for account card content
    - **Property 23: Account Card Content Completeness**
    - Generate random accounts, verify all fields displayed
    - **Validates: Requirements 8.2**

  - [ ] 11.3 Create AddAccountModal component
    - Create `packages/web-app/src/components/accounts/AddAccountModal.tsx`
    - Implement account type selection step
    - Implement form with nickname, institution, balance, currency
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 11.4 Create ReconcileModal component
    - Create modal for entering new balance
    - Show current balance and difference
    - Create adjustment transaction on save
    - _Requirements: 3.7, 3.8_

  - [ ] 11.5 Enhance AccountsPage
    - Group accounts by type in sections
    - Add "Add Manual Account" button
    - Add "Connect Bank" button (existing Plaid integration)
    - Add summary section with Total Assets, Total Liabilities, Net Worth
    - _Requirements: 8.1, 8.3, 8.4, 8.6_

  - [ ] 11.6 Write property test for account grouping
    - **Property 6: Account Grouping Consistency**
    - Generate random accounts, verify each in exactly one group
    - **Validates: Requirements 2.6**

- [ ] 12. Checkpoint - Account management UI complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Enhance Transaction Modal
  - [ ] 13.1 Add account selection dropdown
    - Add Account dropdown to transaction form
    - List all accounts grouped by type
    - Display account name, mask, and balance in dropdown
    - Make account selection optional
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 13.2 Write property test for account dropdown content
    - **Property 13: Account Dropdown Content**
    - Generate random accounts, verify all listed with correct format
    - **Validates: Requirements 4.2, 4.3**

  - [ ] 13.3 Implement batch entry mode
    - Add "Create another transaction" checkbox
    - Keep modal open and clear form on save when checked
    - Preserve transaction type and account selection
    - Display transaction count in session
    - Add "Done" button for closing
    - _Requirements: 1.1, 1.2, 1.6, 1.7_

  - [ ] 13.4 Write property test for batch mode context preservation
    - **Property 2: Batch Mode Context Preservation**
    - Generate random transactions in batch, verify type and account preserved
    - **Validates: Requirements 1.3, 1.4**

  - [ ] 13.5 Implement batch mode error handling
    - Keep form data on save failure
    - Display error message
    - Allow retry
    - _Requirements: 1.9_

  - [ ] 13.6 Implement last account preference
    - Store last used account in localStorage
    - Pre-select on next transaction modal open
    - _Requirements: 4.8_

- [ ] 14. Checkpoint - Transaction modal enhancements complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Enhance Transaction List display
  - [ ] 15.1 Add account column to transaction list
    - Display account icon and name for transactions with account
    - Display "Unassigned" for transactions without account
    - _Requirements: 9.1, 9.2_

  - [ ] 15.2 Write property test for transaction account display
    - **Property 24: Transaction Account Display**
    - Generate transactions with/without accounts, verify display
    - **Validates: Requirements 9.1, 9.2**

  - [ ] 15.3 Add account filter to transaction filters
    - Add Account dropdown to filter bar
    - Support multi-select filtering
    - _Requirements: 9.3, 9.4_

  - [ ] 15.4 Add account to transaction export
    - Include account name in CSV/PDF export
    - Use "Unassigned" for transactions without account
    - _Requirements: 9.6_

- [ ] 16. Implement Connected Account Mapping
  - [ ] 16.1 Create AccountMappingModal component
    - Display after Plaid connection success
    - Show each discovered account with mapping options
    - Allow enable/disable tracking, custom nickname, type override
    - _Requirements: 5.1, 5.2_

  - [ ] 16.2 Implement default tracking for connected accounts
    - Set isTracked = true for new connected accounts
    - _Requirements: 5.3_

  - [ ] 16.3 Write property test for default tracking
    - **Property 17: Connected Account Default Tracking**
    - Create connected accounts, verify isTracked = true
    - **Validates: Requirements 5.3**

  - [ ] 16.4 Implement budget exclusion for untracked accounts
    - Filter out untracked account transactions from budget calculations
    - Recalculate on tracking status change
    - _Requirements: 5.4, 5.7_

  - [ ] 16.5 Write property test for untracked budget exclusion
    - **Property 18: Untracked Account Budget Exclusion**
    - Generate accounts and transactions, toggle tracking, verify budget
    - **Validates: Requirements 5.4, 5.7**

- [ ] 17. Checkpoint - Connected account mapping complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Integrate Sidebar into App Layout
  - [ ] 18.1 Update App layout with sidebar
    - Wrap main content with sidebar layout
    - Pass current route for active state
    - Handle collapse state
    - _Requirements: 6.1_

  - [ ] 18.2 Update routing for sidebar navigation
    - Ensure all sidebar routes are defined
    - Handle 404 redirect to /budget
    - _Requirements: 6.2_

  - [ ] 18.3 Test responsive behavior
    - Verify sidebar hidden on mobile
    - Verify hamburger menu works
    - Verify overlay closes on navigation
    - _Requirements: 6.7, 6.8_

- [ ] 19. Final integration and polish
  - [ ] 19.1 Wire account balance updates
    - Connect transaction save to account balance update
    - Connect transaction edit to balance recalculation
    - Connect transaction delete to balance reversal
    - _Requirements: 3.2, 3.3, 3.4_

  - [ ] 19.2 Add bulk account assignment UI
    - Create modal for bulk-assigning accounts to transactions
    - Add filters for date range, category, description
    - _Requirements: 10.3, 10.4_

  - [ ] 19.3 Update documentation
    - Update API documentation with new endpoints
    - Update README with new features
    - _Requirements: All_

- [ ] 20. Final checkpoint - All features complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including property-based tests are required for comprehensive testing
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Backend tasks should be completed before frontend tasks that depend on them
