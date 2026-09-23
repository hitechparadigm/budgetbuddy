---
inclusion: auto
---

# Known Issues & Gotchas

## Lambda — Common Mistakes

### generateId is an OBJECT, not a function
```javascript
// WRONG — throws "TypeError: generateId is not a function"
generateId("debt")

// CORRECT
generateId.user()
generateId.budget()
generateId.custom("debt")
```

### dynamoHelpers.query() does NOT exist
```javascript
// WRONG
await dynamoHelpers.query(...)

// CORRECT
await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, 'PERIOD#')
```

### parseRequestBody requires the body string
```javascript
// WRONG — returns undefined silently
parseRequestBody(event)

// CORRECT
const body = parseRequestBody(event.body) || {}
```

### DynamoDB reserved words
`status` is reserved — use `ExpressionAttributeNames`:
```javascript
FilterExpression: '#s = :s',
ExpressionAttributeNames: { '#s': 'status' }
```

### google-auth-library must be lazily loaded
- Top-level `require('google-auth-library')` causes `Runtime.ImportModuleError` on cold start
- Move require inside the function that handles `/auth/google`

### aws-sdk v2 not available on Node 20
- Use AWS SDK v3 (`@aws-sdk/...`) or `dynamoHelpers` from common layer

## CDK / Infrastructure

### Never export Lambda Layers across stacks
- Every stack creates its own layer from the same source directory
- Safe to share: DynamoDB table, Cognito User Pool, S3 bucket refs

### cdk-out-temp contains generated JSON — exclude from secret scans
- `cdk-out-temp/tree.json` has CDK descriptors that match `password.*=` patterns
- `security-check.sh` section 8 uses `--include="*.ts"` to avoid scanning it

### dataTraceEnabled must stay false on API Gateways
- Enabling logs full request/response including JWT tokens — security issue

## Frontend

### Four API base URLs — use the right one
```typescript
config.apiBaseUrl              // main: auth, budget, transactions, accounts, goals, ai
config.budgetsApiUrl           // budgets collaboration
config.featuresApiUrl          // notifications, tips, learn, debt, comparison, export
config.extendedFeaturesApiUrl  // insights, receipt, patterns, budget-planning, transaction-planning
```

### localStorage throws in private/incognito mode
- Wrap all `localStorage` access in try/catch with fallback

### Token key is `budgetbuddy_id_token`, not `"token"`

## Auth / Access Control

### JWT carries only userId
- `custom:familyId` / `custom:familyRole` claims are gone — never read them
- Budget ID and role come from `BudgetAccessResolver.resolveAccess(userId, dynamoHelpers)`

### Onboarding 403 — resolved
- First-time path creates budget first, never calls `resolveAccess`
- 409 response = budget already exists → navigate to /budget (success, not error)

## CI/CD Security Check (scripts/security-check.sh)

### Root causes of Runs 576–581 failures
1. `.playwright-mcp/*.log` matched `*.log` scanner → fix: `--exclude-dir=.playwright-mcp` everywhere
2. `cdk-out-temp/tree.json` matched `password.*=` pattern → fix: scan infra with `--include="*.ts"` only
3. `security-check.sh` itself contained pattern strings → fix: scan scripts with `--include="*.js"` only

### Only one deployment at a time
- Check: `node scripts/check-cicd-status.js`
- Push via: `node scripts/safe-commit-push.js "type: description"`

### api-family-stack still deployed (returns 410)
- Do NOT destroy without confirming zero traffic
