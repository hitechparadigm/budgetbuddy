---
inclusion: auto
---

# Architecture Decisions

## Data Model — Budget-Centric (ADR-001)
- All shared data lives under `BUDGET#<budgetId>` partition keys in DynamoDB single table (`budgetbuddy-main`)
- `USER#<userId>/PROFILE` stores `defaultBudgetId` — the link from user to budget
- JWT carries **only** `userId`. Budget ID and role are resolved from DynamoDB on every request via `BudgetAccessResolver.resolveAccess(userId, dynamoHelpers)`
- RBAC roles: `owner | partner | household_member | viewer`
- Budget types: `personal | family | shared`
- Feature gating: `canUseFeature(subscriptionTier, featureKey)` — **never** check tier directly
- `FamilyIdResolver` is **removed**. Do not use it. `FAMILY#` prefix is **deprecated**.

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
  GOAL#<id>        → { name, targetAmount, currentAmount, targetDate }
  INVITATION#<id>  → { invitedEmail, role, token, expiresAt, status }
```

## DynamoDB GSIs
- GSI1: `BUDGET#<budgetId>` / `USER#<userId>` — budget membership queries
- GSI2: `BUDGET#<month>` / `DATE#<date>` — date-based queries
- GSI3: `BUDGET#<month>` / `CATEGORY#<id>` — category analytics
- GSI4: `INVITATION#<email>` / `CREATED#<timestamp>` — invitation lookups

## Serverless Architecture (ADR-002)
- Lambda (Node.js 20.x) + API Gateway (REST) with Cognito authorizer
- CDK v2 for all infrastructure (TypeScript)
- Stack deployment order: `database → auth → auth-onboarding → api → api-features → api-features-extended → api-budgets → hosting → notification → monitoring`
- `api-family` stack is DEPRECATED — returns 410; will be destroyed after migration period

## Lambda Layer Strategy (ADR-004)
- Two layers per stack: **common** (DynamoDB helpers, `BudgetAccessResolver`, `entitlements.js`) and **shared** (CORS, token parsing, validation, error handling)
- **NEVER export Lambda Layers across stacks** — cross-stack layer refs cause CloudFormation failures
- Each stack creates its own layer from the same source

## Auth Architecture (ADR-005)
- Cognito User Pools + Google OAuth 2.0 (PKCE)
- Google ID tokens verified with `google-auth-library` `verifyIdToken()`
- JWT carries only `userId` — no budgetId, no role, no familyId
- Two Lambda functions: `auth` (login/register/profile) + `auth-onboarding` (standalone)

## API Gateways
- Main API: `q0zoob6728.execute-api.us-east-1.amazonaws.com` (auth, budget, transactions, etc.)
- Budgets API: `jcl39tq8x0.execute-api.us-east-1.amazonaws.com` (budget collaboration)
- Features API: `0poeu07vth.execute-api.us-east-1.amazonaws.com` (notifications, tips, etc.)

## Infrastructure Security
- `dataTraceEnabled` disabled on all 4 API Gateways (prevents logging JWT tokens)
- DynamoDB `removalPolicy` gated on environment — RETAIN in prod, DESTROY in dev
- Cognito IAM scoped to specific User Pool ARN
- SES IAM scoped to account identity ARN
- Stripe secret in Secrets Manager (not env var)

## SES Status
- Still in sandbox mode — can only send to verified addresses
- Verified: `dmytro.malyk@gmail.com`, `dima.pmp@gmail.com`, `info@hitechparadigm.com`, `t1@hitechparadigm.com`, `t1@taxprocanada.ca`, `dmalyk@taxprocanada.ca`, `noreply@budgetbuddy.com`
- FROM_EMAIL in `api-budgets-stack.ts` = `info@hitechparadigm.com`

## What Was Removed / Deprecated
- `FamilyIdResolver` — deleted
- `FAMILY#` partition keys — replaced by `BUDGET#`
- `custom:familyId` JWT claim — ignored
- `/family/*` API — returns 410 Gone; use `/budgets/*`
- `FamilySettings.tsx` — replaced by `BudgetMembersPage` at `/budget/members`
- `api-family-stack` — still deployed but deprecated
