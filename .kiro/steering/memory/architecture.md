---
inclusion: auto
---

# Architecture Decisions

## Data Model — Budget-Centric (ADR-001)
- All shared data lives under `BUDGET#<budgetId>` partition keys in DynamoDB single table (`budgetbuddy-main`)
- `USER#<userId>/PROFILE` stores `defaultBudgetId`
- JWT carries **only** `userId`. Budget ID and role resolved via `BudgetAccessResolver.resolveAccess(userId, dynamoHelpers)`
- RBAC roles: `owner | partner | household_member | viewer`
- Budget types: `personal | family | shared`
- Feature gating: `canUseFeature(subscriptionTier, featureKey)` — **never** check tier directly
- `FamilyIdResolver` is **removed**. `FAMILY#` prefix is **deprecated**.

## DynamoDB Key Layout
```
USER#<userId>
  PROFILE          → { defaultBudgetId, onboardingCompleted, currency, location }

BUDGET#<budgetId>
  METADATA         → { budgetType, status, currency, name, ownerUserId, createdAt }
  MEMBER#<userId>  → { role, status, joinedAt }
  PERIOD#<YYYY-MM> → { income/savings/expense groups, totals }
  ACCOUNT#<id>     → { nickname, accountType, balance }
  TXN#<id>         → { amount, category, date, accountId }
  GOAL#<id>        → { name, targetAmount, currentAmount, targetDate, subType? }
  INVITATION#<id>  → { invitedEmail, role, token, expiresAt, status }
  PLANNED_TXN#<id> → { amount, category, dueDate, isPaid, paidAt?, createdAt }
```

## DynamoDB GSIs
- GSI1: `BUDGET#<budgetId>` / `USER#<userId>` — budget membership queries
- GSI2: `BUDGET#<month>` / `DATE#<date>` — date-based queries
- GSI3: `BUDGET#<month>` / `CATEGORY#<id>` — category analytics
- GSI4: `INVITATION#<email>` / `CREATED#<timestamp>` — invitation lookups

## API Gateways (4 total)
- Main API: `q0zoob6728.execute-api.us-east-1.amazonaws.com` — auth, budget, transactions, accounts, goals, ai
- Budgets API: `jcl39tq8x0.execute-api.us-east-1.amazonaws.com` — budget collaboration, invitations
- Features API: `0poeu07vth.execute-api.us-east-1.amazonaws.com` — notifications, tips, learn, debt, comparison, export, credit-score
- Extended Features API: `hkjzroedjf.execute-api.us-east-1.amazonaws.com` — insights, receipt, pattern-detection, budget-planning, transaction-planning, rules, net-worth

## Stack Deploy Order
```
database → auth → auth-onboarding → api → api-features
→ api-features-extended → api-budgets → hosting → notification → monitoring
```
`api-family` stack is DEPRECATED — returns 410.

## Lambda Layer Strategy (ADR-004)
- Two layers per stack: **common** and **shared**
- **NEVER export Lambda Layers across stacks** — cross-stack refs cause CloudFormation failures
- Each stack creates its own layer from the same source directory

## Auth (ADR-005)
- Cognito User Pools + Google OAuth 2.0 (PKCE)
- JWT carries only `userId` — no budgetId, no role
- Two Lambdas: `auth` + `auth-onboarding` (standalone)

## Frontend Routes (Key)
- `/overview` — default authenticated landing
- `/budget` — BudgetPage (with floating AiCoachChip)
- `/budget/members` — BudgetMembersPage
- `/goals` — GoalsPage (Goals/Borrowed/Lent tabs)
- `/goals/borrow-lend/new` — BorrowLendFormPage (`?type=borrowed|lent`)
- `/planned-transactions` — PlannedTransactionsPage
- `/budgets/accept` — AcceptInvitationPage

## Infrastructure Security
- `dataTraceEnabled: false` on all API Gateways (no JWT token logging)
- DynamoDB `removalPolicy`: RETAIN prod, DESTROY dev
- Cognito IAM scoped to specific User Pool ARN
- SES sandbox — verified senders only
- `security-check.sh`: scans only `.ts`/`.js` in infra/scripts/layers; excludes `cdk-out-temp`, `.playwright-mcp`

## SES Status
- Sandbox mode — verified: `dmytro.malyk@gmail.com`, `dima.pmp@gmail.com`, `info@hitechparadigm.com`, `t1@hitechparadigm.com`, `t1@taxprocanada.ca`, `dmalyk@taxprocanada.ca`, `noreply@budgetbuddy.com`
- FROM_EMAIL = `info@hitechparadigm.com`

## Removed / Deprecated
- `FamilyIdResolver`, `FAMILY#` keys, `custom:familyId`, `/family/*` API, `FamilySettings.tsx`, `api-family-stack`
