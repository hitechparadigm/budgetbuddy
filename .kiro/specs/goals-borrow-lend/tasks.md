# Tasks: Goals — Borrowed & Lent

## Status: ✅ Complete (Session 162)

## Tasks

- [x] 1. Frontend — GoalsPage tabs
  - [x] 1.1 Add Goals/Borrowed/Lent tab strip to GoalsPage.tsx
  - [x] 1.2 Filter displayed goals by `subType` per active tab
  - [x] 1.3 Add tab-specific empty states and CTA buttons
  - [x] 1.4 Add count badges on each tab

- [x] 2. Frontend — BorrowLendFormPage
  - [x] 2.1 Create `BorrowLendFormPage.tsx` at `/goals/borrow-lend/new`
  - [x] 2.2 Read `type` query param, render appropriate labels
  - [x] 2.3 Submit goal with `subType` field via existing goals API
  - [x] 2.4 Redirect to `/goals` on success

- [x] 3. Routing
  - [x] 3.1 Add `/goals/borrow-lend/new` route to App.tsx

## 4. Testing

This feature adds no Lambda. It extends the existing goals API with a `subType` field, so
backend coverage is asserted against the existing `backend/functions/goals/` suite.

Coverage target: >80% statements and branches on changed units.

- [ ] 4.1 Unit tests - backend `goals` service (extend existing suite)
  - [ ] Accepts `subType` of `goal`, `borrowed`, `lent`
  - [ ] Rejects any other `subType` value
  - [ ] Goal created without `subType` reads back as a regular goal (backward compatibility)
  - [ ] `subType` survives update without being supplied
  - _Requirements: 2.4, 2.5_

- [ ] 4.2 Component tests - `GoalsPage.test.tsx`
  - [ ] Three tabs render: Goals, Borrowed, Lent
  - [ ] Goals tab shows only `subType` undefined or `goal`
  - [ ] Borrowed tab shows only `subType === 'borrowed'`
  - [ ] Lent tab shows only `subType === 'lent'`
  - [ ] Each tab shows a correct count badge
  - [ ] Each tab renders its own empty state and CTA
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 4.3 Component tests - `BorrowLendFormPage.test.tsx`
  - [ ] `?type=borrowed` renders borrowed-specific labels
  - [ ] `?type=lent` renders lent-specific labels
  - [ ] Missing or invalid `type` param falls back safely
  - [ ] Submit posts `subType` matching the query param
  - [ ] Validation blocks empty description and amount <= 0
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 4.4 Unit tests - progress math
  - [ ] `currentAmount >= targetAmount` marks the record settled
  - [ ] Partial repayment yields correct percentage
  - [ ] Zero `targetAmount` does not divide by zero
  - _Requirements: 3.1, 3.2_

- [ ] 4.5 Coverage gate - `npx jest --coverage` >80% on changed files

- [ ] 4.6 Integration test (dev only, AWS profile `hitechparadigm`)
  - [ ] POST a `borrowed` goal, GET returns it with `subType` intact
  - [ ] Contribution updates `currentAmount`
  - [ ] `afterAll` deletes every created goal
  - _Constraints: max 10 API calls, under ## Open Items

- [ ] Component tests for BorrowLendFormPage
- [ ] Component tests for GoalsPage tab switching
.10 per run_

- [ ] 4.7 E2E test - `tests/e2e/goals-borrow-lend.spec.js` (Playwright)
  - [ ] Switch across all three tabs, correct records in each
  - [ ] Create a borrowed record end to end, appears under Borrowed only
  - [ ] Create a lent record, appears under Lent only
  - [ ] Add a contribution, progress ring advances
  - _Requirements: 1.1, 2.1, 3.1_
