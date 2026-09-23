# Design: Planned Transactions

## Architecture

Follows the standard Lambda access pattern: Handler → Service → Repository.

### Backend Lambda

`backend/functions/transaction-planning/`
- `index.js` — routes, BudgetAccessResolver, RBAC enforcement
- `service.js` — business logic (create, update, delete, mark-paid)
- `repository.js` — DynamoDB CRUD on `PLANNED_TXN#<id>` keys

**DynamoDB Key**:
```
PK: BUDGET#<budgetId>
SK: PLANNED_TXN#<id>
Fields: id, name, amount, dueDate, categoryId, categoryName, isPaid, paidAt?, createdAt, updatedAt
```

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
