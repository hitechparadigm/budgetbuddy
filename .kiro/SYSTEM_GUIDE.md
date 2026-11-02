# BudgetBuddy Development System Guide

**Last Updated**: 2026-10-31

---

## Architecture (Current)

The full, code-verified reference is [docs/architecture.md](../docs/architecture.md). Summary:

```
Auth:    Cognito User Pools, email + password (Google sign-in not working; replacement planned)
Access:  JWT carries only userId; BudgetAccessResolver.resolveAccess resolves budgetId + role per request
Data:    Single-table DynamoDB (budgetbuddy-main): USER#<userId>/PROFILE, BUDGET#<budgetId>/(METADATA,
         MEMBER#, PERIOD#, ACCOUNT#, TRANSACTION#, GOAL#, PLAN#, INVITATION#)
Stacks:  database -> auth -> auth-onboarding -> notification -> api -> api-features
         -> api-features-extended -> api-budgets -> hosting -> monitoring
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
# Before every push - never push during deployment
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
| `structure.md` | Always | Repo layout, Lambda access pattern, spec lifecycle, definition of done |
| `cicd-deployment.md` | CI/CD files | Deployment rules, failure handling |
| `aws-integration-testing.md` | Test files | AWS test cost limits, rules |
| `documentation-standards.md` | Doc files | Mandatory doc update rules, doc index maintenance |

## Specs

Every spec is a direct child of `.kiro/specs/` - there is no `archive/` subdirectory. A spec's
lifecycle state is recorded in its `.config.kiro` `status` field (`active | complete |
superseded`) and `category` field (`feature | process | fix`), never by its location. See
`.kiro/specs/README.md` for the full index of all 24 specs.

**Active specs** (in progress or upcoming):
- `web-app-polish/` - Web app design, IA, AI, polish (status: complete)
- `planned-transactions/` - Scheduled future income and expenses (status: active, tests pending)
- `goals-borrow-lend/` - Borrowed and Lent goal sub-types (status: active, tests pending)
- `ai-bill-reminders-budget-planning/` - AI bill pattern detection and budget suggestions
- `push-notifications-reminders/` - Push notification and reminder system
- `e2e-testing-infrastructure/` - Owns the full test pyramid: unit coverage, integration, E2E
- `mobile-app/` - React Native and Expo iOS/Android app

**Complete or superseded specs** (read-only reference; status recorded in `.config.kiro`, not location):
- `plan-model-redesign/` - Budget-centric data model (complete - see ARCHITECTURE_DECISIONS.md ADR-001)
- `onboarding-403-fix/` - Fixed onboarding 403 bug (complete)
- `competitive-features/`, `enhanced-accounts-transactions/`, `multi-currency/`,
  `mobile-ui-polish/`, `ui-polish-enhancements/`, `critical-bug-fixes/`,
  `documentation-cleanup/`, `repo-docs-specs-consolidation/`, `test-coverage-improvement/` - complete
- `hooks-optimization/`, `documentation-validation-fix/` - superseded (plans never fully executed;
  superseded by later, differently-designed work)

Create a spec when: feature is complex (>1 week), has 10+ tasks, or can be developed independently.

## What's Deprecated / Removed

- `/family/*` API - returns 410 Gone. Use `/budgets/*` instead.
- `FamilyIdResolver` - removed. Use `BudgetAccessResolver`.
- `FAMILY#` partition keys - replaced by `BUDGET#`. A few handlers still use them; see
  "Known inconsistencies" in `docs/architecture.md`.
- `custom:familyId` JWT claim - ignored. `getUserFromEvent` reads `custom:userId`, falling back to `sub`.
- `FamilySettings.tsx` - replaced by `BudgetMembersPage` at `/budget/members`.
- `api-family-stack` - destroyed. Replaced entirely by `api-budgets-stack`.
