# Architecture Decision Records (ADR)

Records significant architectural decisions for BudgetBuddy.

---

## ADR-001: Budget-Centric Data Model (Supersedes family-based model)

**Date**: 2026-02-01 (redesign), 2026-06-01 (completed)
**Status**: Accepted — fully implemented

### Context

The original architecture used a `FAMILY#<familyId>` partition key and a `FamilyIdResolver` utility to link users to their shared budget. This created a chicken-and-egg problem during onboarding (the 403 bug), required `familyId` to be stored in the JWT, and made the data model harder to reason about.

### Decision

Replace the family-based model with a budget-centric model:

- All shared data lives under `BUDGET#<budgetId>` partition keys
- `USER#<userId>/PROFILE` stores `defaultBudgetId` — the link from user to budget
- JWT carries only `userId`. Budget ID and role are resolved from DynamoDB on every request via `BudgetAccessResolver.resolveAccess(userId, dynamoHelpers)`
- RBAC roles: `owner | partner | household_member | viewer`
- Feature gating: `canUseFeature(subscriptionTier, featureKey)` — never check tier directly

### Current Data Layout

```
USER#<userId>
  PROFILE          → { defaultBudgetId, onboardingCompleted, currency, location }

BUDGET#<budgetId>
  METADATA         → { budgetType, status, currency, createdAt }
  MEMBER#<userId>  → { role, status, joinedAt }
  PERIOD#<YYYY-MM> → { income/savings/expense groups, totals }
  ACCOUNT#<id>     → { nickname, accountType, balance }
  TXN#<id>         → { amount, category, date, accountId }
  GOAL#<id>        → { name, targetAmount, currentAmount, targetDate }
  INVITATION#<id>  → { invitedEmail, role, token, expiresAt, status }
```

### Lambda Access Pattern (every Lambda that touches budget data)

```javascript
const { userId } = getUserFromEvent(event);
const { budgetId, role, budgetType, budgetStatus, subscriptionTier } =
  await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers);
BudgetAccessResolver.assertPermission(role, action, budgetStatus);
// Read/write BUDGET#<budgetId>/... records
```

### What Was Removed

- `FamilyIdResolver` — deleted
- `FAMILY#` partition keys — replaced by `BUDGET#`
- `custom:familyId` JWT claim — ignored (only `custom:userId` is used)
- `/family/*` API — returns 410 Gone; use `/budgets/*`
- `FamilySettings.tsx` — replaced by `BudgetMembersPage` at `/budget/members`
- `api-family-stack` — still deployed but deprecated; will be destroyed after migration period

### Consequences

- ✅ Onboarding 403 bug eliminated — budget is created during onboarding, not before
- ✅ JWT is simpler — no familyId, no role in token
- ✅ Multi-budget support is natural — user can be a member of multiple budgets
- ✅ Viewer role with expiry is straightforward
- ⚠️ `api-family-stack` still deployed (returns 410) — will be destroyed once confirmed no traffic

---

## ADR-002: Serverless Architecture (Lambda + API Gateway)

**Date**: 2025-10-24
**Status**: Accepted

### Decision

Lambda (Node.js 20.x) + API Gateway (REST) with Cognito authorizer. CDK v2 for all infrastructure.

### Stack Layout

```
database → auth → auth-onboarding → api → api-features
→ api-features-extended → api-budgets → hosting → notification → monitoring
api-family (DEPRECATED — returns 410)
```

Each stack creates its own Lambda Layers. **Never export Lambda Layers across stacks** — cross-stack layer refs cause CloudFormation deployment failures.

### When to Split a Lambda

Split only when one of these is true:
1. Different external dependencies (e.g., Stripe for payments, Bedrock for AI)
2. Measured cold start > 3 seconds
3. Different teams own different domains
4. 10,000+ active users with divergent scaling needs

Current state: none of these apply to most functions.

---

## ADR-003: Single-Table DynamoDB Design

**Date**: 2025-10-24
**Status**: Accepted

### Decision

Single table `budgetbuddy-main` with on-demand billing and 4 GSIs.

```
PK / SK          — primary access (USER#, BUDGET#)
GSI1PK / GSI1SK  — budget membership queries (BUDGET#<budgetId> / USER#<userId>)
GSI2PK / GSI2SK  — date-based queries (BUDGET#<month> / DATE#<date>)
GSI3PK / GSI3SK  — category analytics (BUDGET#<month> / CATEGORY#<id>)
GSI4PK / GSI4SK  — invitation lookups (INVITATION#<email> / CREATED#<timestamp>)
```

---

## ADR-004: Lambda Layer Strategy

**Date**: 2025-10-24
**Status**: Accepted

Two layers per stack (each stack creates its own — no cross-stack exports):

- **common**: DynamoDB helpers, `BudgetAccessResolver`, `entitlements.js`
- **shared**: CORS, token parsing, validation, error handling

---

## ADR-005: Auth Architecture

**Date**: 2025-10-24 (original), 2026-02-01 (updated)
**Status**: Accepted

- Cognito User Pools + Google OAuth 2.0 (PKCE)
- JWT carries only `userId` (no budgetId, no role, no familyId)
- Budget access resolved from DynamoDB on every request
- Two Lambda functions: `auth` (login/register/profile) + `auth-onboarding` (standalone)
- Auth Lambda refactoring paused — not needed until 10,000+ users or measured cold start issues

---

## ADR-006: Feature Gating

**Date**: 2026-01-14
**Status**: Accepted

Use `canUseFeature(subscriptionTier, featureKey)` from `backend/layers/common/nodejs/entitlements.js`. Never check `subscriptionTier` directly in Lambda code. This allows feature flags to be changed without code deploys.

---

## Summary

| Concern | Decision |
|---------|----------|
| Data model | Single-table DynamoDB, `BUDGET#` partition key |
| Auth | Cognito + Google OAuth, JWT carries only `userId` |
| Budget access | `BudgetAccessResolver` resolves from DynamoDB on every request |
| Roles | `owner \| partner \| household_member \| viewer` |
| Infrastructure | CDK v2, Lambda + API Gateway, no cross-stack layer exports |
| Feature gating | `canUseFeature(subscriptionTier, featureKey)` |
| Deprecated | `/family/*` API, `FamilyIdResolver`, `FAMILY#` keys, `FamilySettings.tsx` |

**Next review**: After MVP launch or 10,000 active users.
