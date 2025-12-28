# Implementation Tasks - AI Budget Persistence Fix

## Overview
Fix critical bug where AI-generated budgets don't persist after month navigation. The budget saves successfully but isn't retrieved when returning to the month.

## Tasks

- [ ] 1. Fix 409 conflict handling in saveBudgetToBackend
  - Update `saveBudgetToBackend()` to treat 409 status as success (budget already exists)
  - Clear AI budget from localStorage after successful save OR 409 conflict
  - When 409 occurs, reload budget from backend to update local state
  - Add proper logging for 409 handling
  - _Requirements: 16.6_

- [ ] 2. Fix backend response parsing in loadBudget
  - Update `loadBudget()` to correctly parse response structure (`data.data.budgets` vs `data.budgets`)
  - Add logging to show actual response structure received from backend
  - Verify budget count is logged correctly
  - Handle both response formats for backward compatibility
  - _Requirements: 16.3, 16.4, 16.10_

- [ ] 3. Extract AI budget creation logic into helper function
  - Create `createBudgetFromAIData()` helper function
  - Move duplicate AI budget creation code into this function
  - Ensure consistent budget structure across all creation paths
  - Add proper TypeScript types
  - _Requirements: 16.1_

- [ ] 4. Improve budget loading flow and logging
  - Update logging to clearly distinguish between "no budgets exist" vs "no budget for this month"
  - Add logging for each decision point in loadBudget
  - Ensure budget state is cleared before loading new month
  - Verify month matching logic is correct
  - _Requirements: 16.7, 16.8_

- [ ] 5. Test the complete flow
  - Test: Complete AI onboarding → budget saves → navigate to October → return to November → budget displays
  - Test: 409 conflict handling when budget already exists
  - Test: localStorage clearing after successful save
  - Test: Page refresh maintains budget state
  - Verify console logs show correct behavior
  - _Requirements: 16.2, 16.9_

## Notes

**Key Files**:
- `packages/web-app/src/pages/BudgetPage.tsx` - Main file to update

**Testing Checklist**:
- [ ] AI budget saves successfully on first load
- [ ] Navigating away and back shows saved budget
- [ ] 409 conflicts don't cause errors
- [ ] localStorage is cleared after save
- [ ] Console logs are accurate
- [ ] No "No budgets exist" when budgets actually exist

**Expected Behavior**:
1. User completes AI onboarding for November
2. Budget displays and saves to backend
3. User switches to October (empty state)
4. User switches back to November
5. Budget loads from backend and displays correctly ✓
