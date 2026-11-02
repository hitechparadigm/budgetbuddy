---
inclusion: always
---

# Architecture Decisions

Agent summary. The full, code-verified reference (diagram, function placement, key-layout evidence,
known inconsistencies) is `docs/architecture.md`.

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
  TRANSACTION#<id> → { amount, category, date, accountId }   (GSI1 BUDGET#<id> / DATE#<date>)
  GOAL#<id>        → { name, targetAmount, currentAmount, targetDate, subType? }
  PLAN#<planId>    → planned transaction, entityType PLANNED_TRANSACTION
  BILL#<id>        → bill (GSI1PK BILLS#<YYYY-MM>)

INVITATION#<invitationId>
  METADATA         → { invitedEmail, role, token, expiresAt, status }   (GSI4 INVITATION#<email>)
```
Known inconsistencies (see `docs/architecture.md`): executing a planned transaction writes `TXN#`
and export/comparison/tips read `TXN#`; a few handlers still use `FAMILY#`.

## DynamoDB GSIs
Generic `GSI{1-4}PK`/`GSI{1-4}SK`, all project `ALL`.
- GSI1: overloaded — memberships by user (`USER#<userId>`), transactions/periods by budget, bills by month
- GSI2: written by budget and transactions, never queried
- GSI3: never written
- GSI4: `INVITATION#<email>` / `CREATED#<timestamp>` — invitation lookups

## API Gateways (4 total)
Prefix-to-gateway map: `docs/gateway-routing-map.md`.
- Main API: `q0zoob6728.execute-api.us-east-1.amazonaws.com` — auth, users, budget, transactions, accounts, goals, bills, export, restore, payments, ai, notifications
- Budgets API: `jcl39tq8x0.execute-api.us-east-1.amazonaws.com` — budget collaboration, invitations
- Features API: `0poeu07vth.execute-api.us-east-1.amazonaws.com` — plaid, reconcile, admin, comparison, tips, learn, subscriptions, debts, credit-score, investments
- Extended Features API: `hkjzroedjf.execute-api.us-east-1.amazonaws.com` — insights, receipt, patterns, budget-planning, transaction-planning, rules, net-worth

## Stack Deploy Order
```
database → auth → auth-onboarding → notification → api → api-features
→ api-features-extended → api-budgets → hosting → monitoring
```
`notification` precedes `api` because the Main API takes `notificationFunction`
(`infrastructure/bin/app.ts`, `infrastructure/stack-manifest.json`).

## Lambda Layer Strategy (ADR-004)
- Two layers per stack: **common** and **shared**
- **NEVER export Lambda Layers across stacks** — cross-stack refs cause CloudFormation failures
- Each stack creates its own layer from the same source directory

## Auth (ADR-005)
- Cognito User Pools, email + password via the auth Lambda (`POST /auth/register`, `POST /auth/login`)
- Google sign-in does not work today: no Google IdP on the pool and the custom `/auth/google` branch
  cannot issue tokens. Planned replacement: Cognito federated Google IdP + managed login with PKCE
- No MFA configured on the pool
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
- Data protection is ON by default in every environment, dev included (dev holds the real
  users and data): `isDataProtected()` in `infrastructure/lib/config/data-protection.ts` gives
  `budgetbuddy-main` and the Cognito User Pool deletion protection + `removalPolicy: RETAIN`, and
  the table a daily 35-day AWS Backup plan (vault `budgetbuddy-<env>-vault`). PITR is always on.
  Opt out only for a throwaway stack: `--context dataProtection=false`
- Deletion protection makes any change that would REPLACE the table or the user pool fail the
  stack update; `cdk destroy` of database/auth now leaves both behind (manual cleanup)
- Alarm topics: notification-stack has its own `budgetbuddy-<env>-notification-alerts` topic
  (monitoring depends on notification, so it cannot use monitoring's topic without a cycle);
  both topics subscribe the configured `ALERT_EMAIL` (a GitHub Actions secret) and each needs a
  one-time confirmation click
- Cognito IAM scoped to specific User Pool ARN
- SES sandbox — verified senders only
- `security-check.sh`: scans only `.ts`/`.js` in infra/scripts/layers; excludes `cdk-out-temp`, `.playwright-mcp`

## SES Status
- Sandbox mode — verified sender identities are managed in the SES console; see `docs/ses-email-setup.md`
- FROM_EMAIL: configured via the `fromEmail` CDK context

## Removed / Deprecated
- `FamilyIdResolver`, `FAMILY#` keys, `custom:familyId`, `/family/*` API, `FamilySettings.tsx`, `api-family-stack`
