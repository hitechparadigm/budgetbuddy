---
inclusion: always
---

# Project Structure

## Layout

- `.github/workflows/` — CI/CD (deploy-dev.yml, deploy-prod.yml, pr-check.yml)
- `backend/functions/<name>/` — Lambda functions (index.js, service.js, repository.js, *.test.js, package.json, README.md)
- `backend/layers/common/` — DynamoDB helpers, `BudgetAccessResolver`, `entitlements.js`, `generateId`
- `backend/layers/shared/` — CORS, token parsing, validation, error handling
- `infrastructure/lib/` — CDK stacks (one per service group)
- `packages/web-app/` — React web (components/, pages/, services/, contexts/, hooks/, utils/)
- `packages/mobile/` — React Native + Expo (screens/, services/, components/, hooks/, stores/, navigation/)
- `packages/shared/` — Shared types, constants, validation (used by web and mobile)
- `tests/` — Integration + E2E tests (Playwright)
- `docs/` — Documentation (architecture diagrams, mobile-ux-design.md, api-endpoints.md)
- `scripts/` — safe-commit-push.js, check-cicd-status.js, security-check.sh

## CDK Stacks (deploy order)

```
database → auth → auth-onboarding → api → api-features
→ api-features-extended → api-budgets → hosting → notification → monitoring
```

## CDK Critical Rule

**NEVER export Lambda Layers across stacks.** Cross-stack layer refs cause CloudFormation deployment failures. Each stack creates its own layer from the same source directory.

Safe to share across stacks: DynamoDB table refs, Cognito User Pool refs, S3 bucket refs.

## Lambda Access Pattern (Every Lambda Touching Budget Data)

```javascript
// 1. Extract userId from JWT (only field in token)
const { userId } = getUserFromEvent(event);

// 2. Resolve budget access from DynamoDB
const { budgetId, role, budgetType, budgetStatus, subscriptionTier } =
  await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers);

// 3. Enforce RBAC
BudgetAccessResolver.assertPermission(role, action, budgetStatus);

// 4. Feature gate (never check subscriptionTier directly)
if (!canUseFeature(subscriptionTier, 'feature_key')) return errorResponse(403, 'Upgrade required');

// 5. Read/write BUDGET#<budgetId>/... records
```

`FamilyIdResolver` is removed. Do not use it.

## Adding a Feature

1. **Spec**: `.kiro/specs/<feature>/` — requirements.md, design.md, tasks.md
2. **Backend**: `backend/functions/<name>/` with handler/service/repository + tests + README
3. **Infrastructure**: update relevant CDK stack (Lambda, IAM, alarms, API routes)
4. **Frontend**: component/page + service + types + tests
5. **Docs**: CHANGELOG.md, DEVELOPMENT_LOG.md, product-requirements.md

## Spec Lifecycle

All specs are direct children of `.kiro/specs/` - there is no `archive/` subdirectory. A spec's
lifecycle state lives in its `.config.kiro` `status` field (`active | complete | superseded`),
never in its location. When a spec finishes, update its `status` field in place and update
`.kiro/specs/README.md` in the same commit - do not move the spec directory.

## Documentation Placement

Before creating a new document under `/docs`, check `docs/README.md` for an existing document
covering the same subject area and extend that document instead of creating a new one when
substantial overlap exists.

## No Stray Root Artifacts

No debug screenshot, log file, or ad-hoc generated artifact may be committed to the repository
root. Such files belong in a git-ignored directory (e.g. `.playwright-mcp/`) or must be deleted
after use.

## Key Frontend Routes

| Route | Component |
|-------|-----------|
| `/` | LandingPage |
| `/auth` | AuthPage |
| `/overview` | OverviewPage (default authenticated) |
| `/budget` | BudgetPage (+ AiCoachChip) |
| `/budget/members` | BudgetMembersPage |
| `/goals` | GoalsPage (Goals/Borrowed/Lent tabs) |
| `/goals/borrow-lend/new` | BorrowLendFormPage (?type=borrowed\|lent) |
| `/planned-transactions` | PlannedTransactionsPage |
| `/accounts` | AccountsPage |
| `/insights` | InsightsPage (AI coach chat) |
| `/settings` | SettingsPage (tabbed) |
| `/pricing` | PricingPage |
| `/onboarding` | OnboardingPage |
| `/budgets/accept` | AcceptInvitationPage |

## Definition of Done

Code + tests (>80%) + lint pass + type-check pass + docs updated (CHANGELOG + DEVELOPMENT_LOG) + CI/CD green
