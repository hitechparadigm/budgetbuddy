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

## Open Items

- [ ] Unit tests for repository.js (coverage target >80%)
- [ ] Integration test for end-to-end planned transaction flow (dev only)
