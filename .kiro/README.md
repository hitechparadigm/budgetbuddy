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
│   └── <feature>/
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
│
├── hooks/             # Automation hooks
├── cicd-status/       # Latest CI/CD status (latest.json)
├── SYSTEM_GUIDE.md    # This project's development guide
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
| `plan-model-redesign` | ✅ Complete (budget-centric architecture) |
| `onboarding-403-fix` | ✅ Complete |
| `competitive-features` | 🔧 In progress |
| `push-notifications-reminders` | 🔧 In progress |
| `enhanced-accounts-transactions` | 🔧 In progress |
| `multi-currency` | ⏳ Planned |
| `mobile-ui-polish` | ⏳ Planned |
| `ai-bill-reminders-budget-planning` | ⏳ Planned |
| `e2e-testing-infrastructure` | ⏳ Planned |
| `test-coverage-improvement` | ⏳ Planned |
| `ui-polish-enhancements` | ⏳ Planned |
| `engagement-features` | ⏳ Planned |
