# Tasks: Planned Transactions

## Status: ✅ Complete (Session 162)

## Tasks

- [x] 1. Backend — transaction-planning Lambda
  - [x] 1.1 Migrate index.js to use BudgetAccessResolver + BUDGET# keys
  - [x] 1.2 Implement GET, POST, PUT, DELETE, mark-paid handlers
  - [x] 1.3 Enforce RBAC: owner/partner write, viewer read-only
  - [x] 1.4 Structured JSON logging with request ID correlation

- [x] 2. Infrastructure — CDK
  - [x] 2.1 Add TransactionPlanningHandler Lambda to api-features-extended-stack.ts
  - [x] 2.2 Add Bedrock IAM policy (scoped to model ARN)
  - [x] 2.3 Wire all 6 API routes (GET, POST, PUT, DELETE, mark-paid, health)
  - [x] 2.4 Grant DynamoDB read/write to Lambda role

- [x] 3. Frontend — API service
  - [x] 3.1 Create `plannedTransactionsApi.ts` with 5 methods
  - [x] 3.2 Use `extendedFeaturesApiUrl` as base URL

- [x] 4. Frontend — UI
  - [x] 4.1 Create `PlannedTransactionsPage.tsx` with full CRUD
  - [x] 4.2 Empty state + create form modal + edit modal + delete confirm
  - [x] 4.3 Mark-as-paid button with visual indicator

- [x] 5. Navigation
  - [x] 5.1 Add CalendarClock + "Planned" to Sidebar Manage group
  - [x] 5.2 Add `/planned-transactions` route to App.tsx

## 6. Testing

Coverage target: >80% statements and branches on `backend/functions/transaction-planning/`.

- [ ] 6.1 Unit tests - `repository.test.js`
  - [ ] Query uses `queryByPK('BUDGET#<id>', 'PLANNED_TXN#')` (not the nonexistent `query()`)
  - [ ] Create writes correct PK/SK and defaults `isPaid: false`
  - [ ] Update preserves fields that were not supplied
  - [ ] Delete targets the correct composite key
  - [ ] mark-paid sets `isPaid: true` and a `paidAt` ISO timestamp
  - [ ] DynamoDB rejection propagates as 500
  - _Requirements: 2.1, 3.1, 4.1_

- [ ] 6.2 Unit tests - `service.test.js`
  - [ ] Rejects amount <= 0 and non-numeric amount
  - [ ] Rejects missing name, dueDate, or categoryId
  - [ ] Uses `generateId.custom('ptxn')` (object, not callable)
  - [ ] Guards null body via `parseRequestBody(event.body) || {}`
  - _Requirements: 2.2_

- [ ] 6.3 Unit tests - `index.test.js` handler and RBAC
  - [ ] owner and partner may POST / PUT / DELETE
  - [ ] viewer gets 403 on every write and 200 on GET
  - [ ] No active budget returns 403
  - [ ] Missing or malformed JWT returns 401
  - _Requirements: 3.3, 5.1, 5.2, 5.3_

- [ ] 6.4 Coverage gate - `npx jest --coverage` reports >80% for the function directory

- [ ] 6.5 Integration tests (dev only, AWS profile `hitechparadigm`)
  - [ ] POST then GET round-trip returns the created record
  - [ ] mark-paid then GET reflects `isPaid: true`
  - [ ] DELETE then GET returns 404
  - [ ] `afterAll` removes every record created by the run
  - _Constraints: max 10 API calls, under ## Open Items

- [ ] Unit tests for repository.js (coverage target >80%)
- [ ] Integration test for end-to-end planned transaction flow (dev only)
.10 per run, never against prod_

- [ ] 6.6 E2E test - `tests/e2e/planned-transactions.spec.js` (Playwright)
  - [ ] Sidebar > Planned renders the empty state for a fresh budget
  - [ ] Create via modal, row appears in the list
  - [ ] Edit amount, list reflects the new value
  - [ ] Mark as paid, paid indicator appears
  - [ ] Delete, row disappears
  - [ ] Viewer role sees no create/edit/delete controls
  - _Requirements: 1.1, 1.2, 2.1, 4.1, 5.3_
