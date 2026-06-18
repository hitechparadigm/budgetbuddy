---
inclusion: auto
---

# Known Issues & Gotchas

## Lambda — Common Mistakes

### generateId is an OBJECT, not a function
```javascript
// ❌ WRONG — throws "TypeError: generateId is not a function"
generateId("debt")

// ✅ CORRECT
generateId.user()
generateId.budget()
generateId.custom("debt")
```

### dynamoHelpers.query() does NOT exist
```javascript
// ❌ WRONG — throws at runtime
await dynamoHelpers.query(...)

// ✅ CORRECT
await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, 'PERIOD#')
```

### parseRequestBody requires the body string, not the event
```javascript
// ❌ WRONG — returns undefined silently
parseRequestBody(event)

// ✅ CORRECT
parseRequestBody(event.body)
// Also guard against null body:
const body = parseRequestBody(event.body) || {}
```

### DynamoDB reserved words in expressions
- `status` is a reserved word — wrap it in `ExpressionAttributeNames`
```javascript
// ❌ WRONG
FilterExpression: 'status = :s'

// ✅ CORRECT
FilterExpression: '#debtStatus = :s',
ExpressionAttributeNames: { '#debtStatus': 'status' }
```

### google-auth-library must be lazily loaded
- Top-level `require('google-auth-library')` in `auth/index.js` causes `Runtime.ImportModuleError` on every cold start
- CDK deploys the raw function directory — `npm install` is not run during deploy
- Fix: move the require inside a lazy-loader function that's only called on `/auth/google` requests

### aws-sdk v2 not available on Node 20
- `require("aws-sdk")` will fail at runtime on Node.js 20.x
- Use AWS SDK v3 (`@aws-sdk/...`) or go through `dynamoHelpers` from the common layer

## CDK / Infrastructure

### Never export Lambda Layers across stacks
- Cross-stack Lambda Layer references cause CloudFormation deployment failures
- Every stack must create its own layer from the same source directory
- Safe to share: DynamoDB table refs, Cognito User Pool refs, S3 bucket refs

### Stacks deploy in order — dependencies matter
```
database → auth → auth-onboarding → api → api-features
→ api-features-extended → api-budgets → hosting → notification → monitoring
```
- `api-budgets` depends on `notification` (passes `notificationFunction` to it)
- `app.ts` must call `addDependency()` where needed

### dataTraceEnabled must stay false on API Gateways
- Enabling it logs the full request/response including JWT tokens to CloudWatch — security issue
- Currently disabled on all 4 API Gateways

## Frontend

### Three separate API base URLs — use the right one
```typescript
config.apiBaseUrl       // main API: auth, budget, transactions, accounts, goals, ai
config.budgetsApiUrl    // budgets API: /budgets/* collaboration
config.featuresApiUrl   // features API: notifications, tips, learn, debt, comparison, export, credit-score
```
- Using the wrong base URL causes 403s or 404s that look like auth failures
- `budgetsApiUrl` was incorrectly pointing to the main API for a while (now fixed in `environment.ts`)

### localStorage throws in private/incognito mode
- Edge private windows block `localStorage` — `getItem/setItem` throws
- All `localStorage` access must be wrapped in try/catch with a sensible fallback
- The inline theme script in `index.html` also reads localStorage — needs the same guard

### Token key is `budgetbuddy_id_token`, not `"token"`
- `localStorage.getItem("token")` silently returns null — settings backup/restore was broken because of this
- Correct key: `budgetbuddy_id_token`

## Auth / Access Control

### JWT carries only userId — never budgetId or role
- Any code reading `event.requestContext.authorizer.claims['custom:familyId']` or `custom:familyRole` is dead/broken
- Budget ID and role come from DynamoDB via `BudgetAccessResolver.resolveAccess(userId, dynamoHelpers)`

### Onboarding 403 bug — root cause was resolved
- The original 403: `auth-onboarding` called `BudgetAccessResolver` before creating the budget
- Fix: first-time onboarding path creates budget first, never calls `resolveAccess`
- Re-onboarding guard: if `defaultBudgetId` already exists → return 409 Conflict

### 409 from onboarding should navigate to /budget, not show error
- A 409 means the budget was already created (retry after success)
- `OnboardingPage.tsx` now treats 409 as success and navigates to `/budget`

## Email / SES

### SES is still in sandbox mode
- Can only send to verified addresses:
  `dmytro.malyk@gmail.com`, `dima.pmp@gmail.com`, `info@hitechparadigm.com`,
  `t1@hitechparadigm.com`, `t1@taxprocanada.ca`, `dmalyk@taxprocanada.ca`, `noreply@budgetbuddy.com`
- Invitations to non-verified addresses will silently fail to deliver
- FROM_EMAIL must be `info@hitechparadigm.com` (the verified sender)

### Invitation token lookup uses Scan
- Works fine at current scale but will be a bottleneck at production scale
- Needs a GSI on `tokenHash` before launch

## Deployment / CI/CD

### Only one deployment at a time
- CloudFormation does NOT support parallel stack deployments from the same account
- If another session is deploying, **STOP and wait** — concurrent deploys cause failures
- Check status: `node scripts/check-cicd-status.js`
- Push via: `node scripts/safe-commit-push.js "type: description"`

### api-family-stack is still deployed (returns 410)
- Do NOT destroy it without confirming zero traffic first
- It blocks potential migration stragglers from hitting null responses

## Testing

### Unit test mock setup for first-time onboarding
- `resolveAccess` must NOT be called in the first-time onboarding path
- Mock must reflect this — if mock throws on `resolveAccess`, the test setup is wrong
- See `auth-onboarding` tests for the correct mock pattern
