# BudgetBuddy Development System Guide

**Last Updated**: 2026-06-01

---

## Architecture (Current)

```
Auth:    Cognito User Pools + Google OAuth (PKCE)
         JWT carries only userId — no familyId, no role

Access:  BudgetAccessResolver.resolveAccess(userId, dynamoHelpers)
         → { budgetId, role, budgetType, budgetStatus, subscriptionTier }
         Called at the top of every Lambda that touches budget data

Roles:   owner | partner | household_member | viewer
         Feature gating: canUseFeature(subscriptionTier, featureKey)

Data:    Single-table DynamoDB (budgetbuddy-main)
         BUDGET#<budgetId>  — all budget data (METADATA, MEMBER#, PERIOD#, ACCOUNT#, TXN#)
         USER#<userId>/PROFILE — stores defaultBudgetId, onboardingCompleted, currency, location

Stacks:  database → auth → auth-onboarding → api → api-features
         → api-features-extended → api-budgets → hosting → notification → monitoring
         api-family: DEPRECATED (returns 410 Gone)
```

## Lambda Access Pattern

Every Lambda that touches budget data:

```javascript
const { userId } = getUserFromEvent(event);                          // 1. Extract userId from JWT
const { budgetId, role, ... } = await BudgetAccessResolver           // 2. Resolve from DynamoDB
  .resolveAccess(userId, dynamoHelpers);
BudgetAccessResolver.assertPermission(role, action, budgetStatus);   // 3. Enforce RBAC
// 4. Read/write BUDGET#<budgetId>/... records
```

## Workflow

```bash
# Before every push — never push during deployment
node scripts/check-cicd-status.js

# Commit and push
node scripts/safe-commit-push.js "type: description"

# Monitor deployment (every 2 min until done)
node scripts/check-cicd-status.js
```

## Steering Files

| File | Loads | Contains |
|------|-------|----------|
| `00-global.md` | Always | Workflow, commit rules, autonomous mode, security |
| `product.md` | Always | Vision, users, features, success metrics |
| `tech.md` | Always | Stack (React, Lambda, DynamoDB, Cognito, CDK) |
| `structure.md` | Always | Repo layout, Lambda access pattern, definition of done |
| `cicd-deployment.md` | CI/CD files | Deployment rules, failure handling |
| `aws-integration-testing.md` | Test files | AWS test cost limits, rules |
| `documentation-standards.md` | Doc files | Mandatory doc update rules |

## Specs

Feature specs live in `.kiro/specs/<feature>/` with `requirements.md`, `design.md`, `tasks.md`.

Create a spec when: feature is complex (>1 week), has 10+ tasks, or can be developed independently.

## What's Deprecated / Removed

- `/family/*` API — returns 410 Gone. Use `/budgets/*` instead.
- `FamilyIdResolver` — removed. Use `BudgetAccessResolver`.
- `FAMILY#` partition keys — replaced by `BUDGET#`.
- `custom:familyId` JWT claim — ignored. Only `custom:userId` is used.
- `FamilySettings.tsx` — replaced by `BudgetMembersPage` at `/budget/members`.
- `api-family-stack` — still deployed but deprecated. Will be destroyed after migration period.
