# .kiro/ Directory

Development system configuration for BudgetBuddy.

## Structure

```
.kiro/
├── steering/          # Rules and standards (always active)
│   ├── 00-global.md   # Workflow, commit rules, autonomous mode
│   ├── product.md     # Product vision, users, features
│   ├── tech.md        # Technology stack
│   ├── structure.md   # Code organization, Lambda access pattern
│   ├── cicd-deployment.md          # CI/CD rules (conditional)
│   ├── aws-integration-testing.md  # AWS test rules (conditional)
│   └── documentation-standards.md # Doc update rules (conditional)
│
├── specs/             # Feature specs (requirements + design + tasks)
│   ├── README.md      # Spec index - every spec, its status, and category
│   └── <feature>/
│       ├── .config.kiro   # status: active|complete|superseded, category: feature|process|fix
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
│
├── hooks/             # Automation hooks
├── cicd-status/       # Latest CI/CD status (latest.json)
├── SYSTEM_GUIDE.md    # Architecture, workflow, what's deprecated
└── README.md          # This file
```

## Key Rules

- **Before every push**: `node scripts/check-cicd-status.js` - never push during deployment
- **Commit via**: `node scripts/safe-commit-push.js "type: description"`
- **Architecture**: JWT carries only `userId`. Budget access resolved via `BudgetAccessResolver` on every request.
- **Data**: All budget data under `BUDGET#<budgetId>` PK. `USER#<userId>/PROFILE` stores `defaultBudgetId`.
- **Deprecated**: `/family/*` API returns 410. `FamilyIdResolver` removed. Do not use.

## Specs

All specs are direct children of `.kiro/specs/` - there is no `archive/` subdirectory. A spec's
lifecycle state lives in its `.config.kiro` `status` field (`active | complete | superseded`),
never in its location. See `.kiro/specs/README.md` for the full index of all 19 specs with
status, category, and description. When a spec finishes, update its `status` field in place and
update `.kiro/specs/README.md` in the same commit - do not move the spec directory.

**Active specs** (status: active):
- `ai-bill-reminders-budget-planning`, `e2e-testing-infrastructure`, `goals-borrow-lend`,
  `mobile-app`, `planned-transactions`, `push-notifications-reminders`

**Complete or superseded specs** (status: complete or superseded):
- `competitive-features`, `critical-bug-fixes`, `documentation-cleanup`,
  `documentation-validation-fix`, `enhanced-accounts-transactions`, `hooks-optimization`,
  `mobile-ui-polish`, `multi-currency`, `onboarding-403-fix`, `plan-model-redesign`,
  `repo-docs-specs-consolidation`, `test-coverage-improvement`, `ui-polish-enhancements`,
  `web-app-polish`

## What's Deprecated / Removed

- `/family/*` API - returns 410. `FamilyIdResolver` removed. Use `BudgetAccessResolver`.
- `FAMILY#` partition keys - replaced by `BUDGET#`.
- `custom:familyId` JWT claim - ignored. Only `custom:userId` is used.
- `FamilySettings.tsx` - replaced by `BudgetMembersPage` at `/budget/members`.
- `api-family-stack` - still deployed but deprecated. Will be destroyed after migration period.