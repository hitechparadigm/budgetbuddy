# .kiro/ Directory

Development system configuration for BudgetBuddy.

## Structure

```
.kiro/
â”œâ”€â”€ steering/          # Rules and standards (always active)
â”‚   â”œâ”€â”€ 00-global.md   # Workflow, commit rules, autonomous mode
â”‚   â”œâ”€â”€ product.md     # Product vision, users, features
â”‚   â”œâ”€â”€ tech.md        # Technology stack
â”‚   â”œâ”€â”€ structure.md   # Code organization, Lambda access pattern
â”‚   â”œâ”€â”€ cicd-deployment.md          # CI/CD rules (conditional)
â”‚   â”œâ”€â”€ aws-integration-testing.md  # AWS test rules (conditional)
â”‚   â””â”€â”€ documentation-standards.md # Doc update rules (conditional)
â”‚
â”œâ”€â”€ specs/             # Feature specs (requirements + design + tasks)
â”‚   â”œâ”€â”€ README.md      # Spec index - every spec, its status, and category
â”‚   â””â”€â”€ <feature>/
â”‚       â”œâ”€â”€ .config.kiro   # status: active|complete|superseded, category: feature|process|fix
â”‚       â”œâ”€â”€ requirements.md
â”‚       â”œâ”€â”€ design.md
â”‚       â””â”€â”€ tasks.md
â”‚
â”œâ”€â”€ hooks/             # Automation hooks
â”œâ”€â”€ cicd-status/       # Latest CI/CD status (latest.json)
â”œâ”€â”€ SYSTEM_GUIDE.md    # Architecture, workflow, what's deprecated
â””â”€â”€ README.md          # This file
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
- `api-family-stack` - destroyed. Replaced entirely by `api-budgets-stack`.
