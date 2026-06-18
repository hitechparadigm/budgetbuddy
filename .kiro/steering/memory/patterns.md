---
inclusion: auto
---

# Project Patterns

## Lambda Access Pattern (Every Lambda That Touches Budget Data)

```javascript
// Step 1: Extract userId from JWT (only userId in token)
const { userId } = getUserFromEvent(event);

// Step 2: Resolve budget access from DynamoDB
const { budgetId, role, budgetType, budgetStatus, subscriptionTier } =
  await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers);

// Step 3: Enforce permissions
BudgetAccessResolver.assertPermission(role, action, budgetStatus);

// Step 4: Read/write BUDGET#<budgetId>/... records
```

## Feature Gating Pattern
```javascript
// Always use canUseFeature — never check subscriptionTier directly
const { canUseFeature } = require('/opt/nodejs/entitlements');
if (!canUseFeature(subscriptionTier, 'advanced_reporting')) {
  return errorResponse(403, 'Upgrade to Premium for this feature');
}
```

## Handler → Service → Repository Structure
```
backend/functions/<name>/
  index.js       — handler (routes, auth, error handling)
  service.js     — business logic
  repository.js  — DynamoDB access
  *.test.js      — tests
  package.json
  README.md
```

## DynamoDB Key Patterns
- User data: `PK: USER#<userId>, SK: PROFILE`
- Budget metadata: `PK: BUDGET#<budgetId>, SK: METADATA`
- Budget period: `PK: BUDGET#<budgetId>, SK: PERIOD#<YYYY-MM>`
- Budget member: `PK: BUDGET#<budgetId>, SK: MEMBER#<userId>`
- Transaction: `PK: BUDGET#<budgetId>, SK: TXN#<id>`
- Account: `PK: BUDGET#<budgetId>, SK: ACCOUNT#<id>`
- Goal: `PK: BUDGET#<budgetId>, SK: GOAL#<id>`
- Invitation: `PK: BUDGET#<budgetId>, SK: INVITATION#<id>`

## ID Generation
```javascript
// Use generateId from common layer — it's an object, not a function
generateId.user()         // not generateId("user") — that throws
generateId.budget()
generateId.custom("debt") // for custom prefixes
```

## Response Helpers
```javascript
// From common layer
return successResponse({ data });
return errorResponse(statusCode, message);
```

## DynamoDB Query Pattern
```javascript
// Use queryByPK — NOT dynamoHelpers.query() (doesn't exist)
const items = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, 'PERIOD#');
```

## CDK Stack Pattern
- Each stack creates its own Lambda Layer from the same source (never export/import layers across stacks)
- Reference: `new LayerVersion(this, 'CommonLayer', { code: Code.fromAsset('../../backend/layers/common') })`

## Frontend API Client Pattern
- Three separate API base URLs:
  - `config.apiBaseUrl` — main API (auth, budget, transactions, accounts, goals, ai)
  - `config.budgetsApiUrl` — budgets collaboration API (`/budgets/*`)
  - `config.featuresApiUrl` — features API (notifications, tips, learn, debt, comparison, export, credit-score)
- Use `fetch` — not axios (forbidden)

## Frontend Route Structure
- `/budget` — BudgetPage
- `/budget/members` — BudgetMembersPage (was `/family/settings`)
- `/budgets/accept` — AcceptInvitationPage (invitation email links here)
- `/accounts`, `/goals`, `/settings`, `/onboarding`

## Income Frequency Pattern
- Categories have optional `frequency` field: `monthly | biweekly | weekly | semi-monthly`
- Categories have optional `isOneTime: true` — skipped on month rollover
- `frequencyAmount` stores per-paycheck amount for biweekly/weekly
- Backend `calculateMonthlyAmount(category, targetMonth)` computes planned amount from frequency

## Test Patterns
- Unit tests: Jest (`*.test.js` co-located with Lambda functions)
- Coverage target: >80%
- Property-based tests (PBT) with `fast-check` for complex business logic
- AWS integration tests: dev only, clean up after, AWS profile `hitechparadigm`

## Commit Pattern
- Always use `node scripts/safe-commit-push.js "type: description"` — never raw git push
- Always check CI/CD status first: `node scripts/check-cicd-status.js`
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`
