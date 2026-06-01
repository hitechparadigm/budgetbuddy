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
│   ├── <active-feature>/
│   │   ├── requirements.md
│   │   ├── design.md
│   │   └── tasks.md
│   └── archive/       # Completed or superseded specs
│
├── hooks/             # Automation hooks
├── cicd-status/       # Latest CI/CD status (latest.json)
├── SYSTEM_GUIDE.md    # Architecture, workflow, what's deprecated
└── README.md          # This file
```

## Key Rules

- **Before every push**: `node scripts/check-cicd-status.js` — never push during deployment
- **Commit via**: `node scripts/safe-commit-push.js "type: description"`
- **Architecture**: JWT carries only `userId`. Budget access resolved via `BudgetAccessResolver` on every request.
- **Data**: All budget data under `BUDGET#<budgetId>` PK. `USER#<userId>/PROFILE` stores `defaultBudgetId`.
- **Deprecated**: `/family/*` API returns 410. `FamilyIdResolver` removed. Do not use.

## Active Specs

| Spec | Status |
|------|--------|
| `ai-bill-reminders-budget-planning` | ⏳ Planned |
| `e2e-testing-infrastructure` | ⏳ Planned |
| `push-notifications-reminders` | ⏳ Planned |
| `test-coverage-improvement` | ⏳ Planned |

## Archived Specs (`.kiro/specs/archive/`)

Completed or superseded. Read-only reference.

| Spec | Notes |
|------|-------|
| `plan-model-redesign` | ✅ Budget-centric architecture — see ARCHITECTURE_DECISIONS.md ADR-001 |
| `onboarding-403-fix` | ✅ Fixed onboarding 403 bug |
| `competitive-features` | ✅ Completed features |
| `enhanced-accounts-transactions` | ✅ Completed |
| `multi-currency` | ✅ Completed |
| `mobile-ui-polish` | ✅ Completed |
| `ui-polish-enhancements` | ✅ Completed |
| `critical-bug-fixes` | ✅ Completed |
| `documentation-cleanup` | ✅ Completed |
| `hooks-optimization` | ✅ Completed |
| `documentation-validation-fix` | ✅ Completed |
