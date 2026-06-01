# BudgetBuddy AWS Stack Architecture

**Last Updated**: 2026-06-01
**Scope**: Web Application — Current Production Architecture

---

## Stack Overview

BudgetBuddy is deployed using AWS CDK v2 (TypeScript) with a modular stack architecture. Each stack is independently deployable and creates its own Lambda Layers to avoid CloudFormation cross-stack export dependency issues.

### Deployed Stacks

| Stack Name | Status | Purpose |
|------------|--------|---------|
| `budgetbuddy-dev-database` | Active | DynamoDB single-table + GSIs |
| `budgetbuddy-dev-auth` | Active | Cognito User Pool + Google OAuth |
| `budgetbuddy-dev-auth-onboarding` | Active | Standalone onboarding Lambda |
| `budgetbuddy-dev-api` | Active | Core API (auth, budget, transactions, AI, admin) |
| `budgetbuddy-dev-api-features` | Active | Plaid, reconciliation, export, bills, subscriptions, debts |
| `budgetbuddy-dev-api-features-extended` | Active | Insights, receipt, budget planning, net worth |
| `budgetbuddy-dev-api-budgets` | Active | Budget collaboration, members, invitations |
| `budgetbuddy-dev-hosting` | Active | S3 + CloudFront for web app |
| `budgetbuddy-dev-notification` | Active | Push notifications + daily reminders |
| `budgetbuddy-dev-monitoring` | Active | CloudWatch dashboards + alarms |
| `budgetbuddy-dev-api-family` | **Deprecated** | Returns 410 Gone — replaced by api-budgets |

### Stack Dependencies

```
database          (independent)
auth              (independent)
auth-onboarding   → database
api               → database, auth, auth-onboarding
api-features      → database, auth
api-features-extended → database, auth
api-budgets       → database, auth
notification      → database
hosting           (independent)
monitoring        → database, auth, api, api-features, api-features-extended, api-budgets, notification
```

> **CDK Critical Rule**: Lambda Layers are NEVER exported across stacks. Each stack creates its own `CommonLayer` and `SharedLayer` from the same source. Cross-stack layer refs cause CloudFormation deployment failures.

---

## Authentication Stack (`budgetbuddy-dev-auth`)

### Resources
- **Cognito User Pool**: `budgetbuddy-users`
- **User Pool Client**: Web + mobile app client
- **Google OAuth 2.0**: PKCE flow via Cognito identity provider

### Key Design
- JWT carries **only `userId`** (`custom:userId` claim). No `budgetId`, no role.
- Budget context is resolved server-side on every request via `BudgetAccessResolver`.
- `custom:familyId` and `custom:familyRole` are legacy Cognito attributes — present but unused.

### Outputs
- `UserPoolId`, `UserPoolClientId`, `UserPoolArn`

---

## Database Stack (`budgetbuddy-dev-database`)

### Resources
- **DynamoDB Table**: `budgetbuddy-main` (on-demand billing, PITR enabled, AES-256 encryption)
- **4 Global Secondary Indexes**

### Table Schema

| Entity | PK | SK | Notes |
|--------|----|----|-------|
| User profile | `USER#<userId>` | `PROFILE` | Contains `defaultBudgetId`, `onboardingCompleted`, `currency`, `location` |
| Budget metadata | `BUDGET#<budgetId>` | `METADATA` | `budgetType` (`personal`/`family`/`shared`), `status`, `currency` |
| Budget member | `BUDGET#<budgetId>` | `MEMBER#<userId>` | `role` (`owner`/`partner`/`household_member`/`viewer`), optional `expiresAt` |
| Budget period | `BUDGET#<budgetId>` | `PERIOD#<YYYY-MM>` | Monthly budget with income/savings/expense groups |
| Account | `BUDGET#<budgetId>` | `ACCOUNT#<accountId>` | Cash, bank, credit accounts |
| Transaction | `BUDGET#<budgetId>` | `TXN#<date>#<txnId>` | Income/expense records |
| Invitation | `INVITATION#<email>` | `BUDGET#<budgetId>` | Pending invitations |

### Global Secondary Indexes

| GSI | PK | SK | Use Case |
|-----|----|----|----------|
| GSI1 | `GSI1PK` | `GSI1SK` | Budget membership queries — `GSI1PK = USER#<userId>` returns all budgets a user belongs to |
| GSI2 | `GSI2PK` | `GSI2SK` | Date-based queries (transactions by date range, budgets by month) |
| GSI3 | `GSI3PK` | `GSI3SK` | Category analytics (spending by category) |
| GSI4 | `GSI4PK` | `GSI4SK` | Invitation lookups by email — `GSI4PK = INVITATION#<email>` |

### Access Patterns
1. Get user profile → `PK = USER#<userId>`, `SK = PROFILE`
2. Get all budgets for a user → GSI1 query on `GSI1PK = USER#<userId>`
3. Get budget metadata → `PK = BUDGET#<budgetId>`, `SK = METADATA`
4. Get budget members → `PK = BUDGET#<budgetId>`, `SK begins_with MEMBER#`
5. Get budget period → `PK = BUDGET#<budgetId>`, `SK = PERIOD#<month>`
6. Get transactions → `PK = BUDGET#<budgetId>`, `SK begins_with TXN#`
7. Get pending invitations by email → GSI4 query on `GSI4PK = INVITATION#<email>`

---

## Lambda Access Pattern (All Budget Lambdas)

Every Lambda that touches budget data follows this exact sequence:

```javascript
// 1. Extract userId from JWT (JWT carries ONLY userId)
const { userId } = getUserFromEvent(event);

// 2. Resolve budget context from DynamoDB
const { budgetId, role, budgetType, budgetStatus, subscriptionTier } =
  await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers);

// 3. Enforce permissions
BudgetAccessResolver.assertPermission(role, action, budgetStatus);

// 4. Check feature entitlements
if (!canUseFeature(subscriptionTier, 'featureKey')) throw 403;

// 5. Read/write BUDGET#<budgetId>/... records
```

**`BudgetAccessResolver`** lives in `backend/layers/common/nodejs/utils.js`. It is **never modified** by feature Lambdas.

---

## API Stack (`budgetbuddy-dev-api`)

### Lambda Functions
| Function | Handler | Routes |
|----------|---------|--------|
| `budgetbuddy-auth` | `backend/functions/auth/index.js` | `/auth/*` |
| `budgetbuddy-budget` | `backend/functions/budget/index.js` | `/budget/*` |
| `budgetbuddy-transactions` | `backend/functions/transactions/index.js` | `/transactions/*` |
| `budgetbuddy-ai` | `backend/functions/ai/index.js` | `/ai/*` |
| `budgetbuddy-admin` | `backend/functions/admin/index.js` | `/admin/*` |
| `budgetbuddy-auth-onboarding` | `backend/functions/auth-onboarding/index.js` | `/auth/onboarding` |

### Lambda Layers (created locally per stack)
- **CommonLayer**: DynamoDB helpers, `BudgetAccessResolver`, `entitlements.js`
- **SharedLayer**: CORS, token parsing, validation, error handling

---

## API Features Stack (`budgetbuddy-dev-api-features`)

| Function | Routes |
|----------|--------|
| `budgetbuddy-plaid` | `/plaid/*` |
| `budgetbuddy-reconciliation` | `/reconciliation/*` |
| `budgetbuddy-export` | `/export/*` |
| `budgetbuddy-bills` | `/bills/*` |
| `budgetbuddy-subscriptions` | `/subscriptions/*` |
| `budgetbuddy-debt-payoff` | `/debts/*` |
| `budgetbuddy-goals` | `/goals/*` |
| `budgetbuddy-accounts` | `/accounts/*` |

---

## API Features Extended Stack (`budgetbuddy-dev-api-features-extended`)

| Function | Routes |
|----------|--------|
| `budgetbuddy-insights` | `/insights/*` |
| `budgetbuddy-receipt` | `/receipt/*` |
| `budgetbuddy-transaction-planning` | `/transaction-planning/*` |
| `budgetbuddy-net-worth` | `/net-worth/*` |
| `budgetbuddy-credit-score` | `/credit-score/*` |
| `budgetbuddy-learn` | `/learn/*` |
| `budgetbuddy-tips` | `/tips/*` |

---

## API Budgets Stack (`budgetbuddy-dev-api-budgets`)

The active stack for all budget collaboration features. Replaced `api-family-stack`.

| Function | Routes |
|----------|--------|
| `budgetbuddy-budgets` | `/budgets/*` |
| `budgetbuddy-email` | `/email/*` |

### Key Routes
- `GET /budgets` — list user's budgets
- `POST /budgets` — create budget
- `GET /budgets/members` — list members
- `POST /budgets/invite` — send invitation
- `POST /budgets/accept-invitation` — accept invitation (token-based)
- `POST /budgets/resend-invitation` — resend invitation
- `DELETE /budgets/invitations/{id}` — revoke invitation
- `DELETE /budgets/members/{userId}` — remove member
- `POST /budgets/leave` — leave budget

---

## Hosting Stack (`budgetbuddy-dev-hosting`)

- **S3 Bucket**: `budgetbuddy-dev-web-app` — React SPA
- **CloudFront**: `d1ueeugn9zcx7n.cloudfront.net` — global CDN with SPA routing
- **Origin Access Control**: Secure S3 access

---

## Notification Stack (`budgetbuddy-dev-notification`)

| Function | Purpose |
|----------|---------|
| `budgetbuddy-notifications` | Device registration, preferences, history |
| `budgetbuddy-daily-reminders` | EventBridge-triggered daily reminders |

---

## Monitoring Stack (`budgetbuddy-dev-monitoring`)

- **CloudWatch Dashboard**: `budgetbuddy-dev-application-metrics`
- **SNS Topic**: `budgetbuddy-dev-alerts`
- **Alarms**: API 5XX rate, Lambda errors, DynamoDB throttling, monthly cost > $100

---

## RBAC Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `owner` | Budget creator | Full access: invite, remove members, edit budget, delete budget |
| `partner` | Co-owner (e.g. spouse) | Full read/write on budget and transactions |
| `household_member` | Family member | Can add transactions, limited budget editing |
| `viewer` | Read-only (e.g. financial advisor) | View only, optional expiry date |

---

## Deprecated

### `budgetbuddy-dev-api-family`
- Returns **410 Gone** for all requests
- Kept deployed during client migration period
- Will be destroyed once all clients use `/budgets/*`
- Do not add new features or fix bugs in this stack
