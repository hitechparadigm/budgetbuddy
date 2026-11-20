# Design: Planned Transactions

## Architecture

The handler → service → repository split described below is **aspirational and not
implemented**. This Lambda keeps its routing and business logic in `index.js`; there
is no `service.js` or `repository.js`.

### Backend Lambda

`backend/functions/transaction-planning/` (actual file layout):
- `index.js` — routes, BudgetAccessResolver, RBAC enforcement, CRUD and mark-paid logic, DynamoDB access via `dynamoHelpers`
- `keys.js` — the `PLAN#` SK prefix and the `plannedTxnSK()` builder, the single definition of the key
- `recurring-service.js` — next-occurrence calculation for recurring plans
- `errors.js` — error response helpers

**DynamoDB Key**:
```
PK: BUDGET#<budgetId>
SK: PLAN#<id>   (prefix = PLANNED_TXN_SK_PREFIX in backend/functions/transaction-planning/keys.js)
```

**Fields** (as written by `index.js`): `planId`, `budgetId`, `entityType`
(`PLANNED_TRANSACTION`), `transactionType` (`income` | `expense`), `amount`,
`currency`, `categoryId`, `categoryName`, `scheduledDate`, `scheduledTime`,
`notes`, `isRecurring`, `frequency`, `customInterval`, `onLastDayOfMonth`,
`endDate`, `nextOccurrence`, `isExecuted`, `executedTransactionId`,
`executedAt?`, `isDeleted`, `createdBy`, `createdAt`, `updatedAt`.

Execution state is `isExecuted` / `executedTransactionId` / `executedAt`, not
`isPaid` / `paidAt`: marking a plan paid creates a real transaction and records
its id.

**API Routes** (Extended Features API `hkjzroedjf`):
- `GET /transaction-planning` — list all for active budget
- `POST /transaction-planning` — create
- `PUT /transaction-planning/{plannedTransactionId}` — update
- `DELETE /transaction-planning/{plannedTransactionId}` — delete
- `POST /transaction-planning/{plannedTransactionId}/mark-paid` — mark paid
- `GET /transaction-planning/health` — health check

### CDK Infrastructure

Added to `api-features-extended-stack.ts`:
- `TransactionPlanningHandler` Lambda (Node.js 20.x, common + shared layers, DynamoDB read/write)
- Bedrock IAM policy (for future AI suggestions on planned amounts)
- All 6 API routes wired to the Lambda

### Frontend

`packages/web-app/src/pages/PlannedTransactionsPage.tsx`:
- Uses `plannedTransactionsApi.ts` service (calls extendedFeaturesApiUrl)
- Full CRUD: list, create form modal, edit modal, delete confirmation, mark-paid button
- Empty state with call-to-action

`packages/web-app/src/services/plannedTransactionsApi.ts`:
- `getPlannedTransactions()`, `createPlannedTransaction()`, `updatePlannedTransaction()`, `deletePlannedTransaction()`, `markAsPaid()`

`Sidebar.tsx`: CalendarClock icon + "Planned" item in Manage group, routes to `/planned-transactions`.

## Security

- All write operations require `owner` or `partner` role
- `BudgetAccessResolver.assertPermission(role, 'write', budgetStatus)` on POST/PUT/DELETE
- Viewer role: read-only (GET requests only)
- JWT carries only `userId` — budget resolved from DynamoDB per request
- Bedrock IAM scoped to specific model ARN (not wildcard)
