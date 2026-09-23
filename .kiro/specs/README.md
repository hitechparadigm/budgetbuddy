# Specs Index

**Last Updated**: 2026-09-23

Every spec is a direct child of `.kiro/specs/`. There is no `archive/` subdirectory - a spec's
lifecycle state is recorded in its `.config.kiro` `status` field (`active | complete | superseded`),
never by its location. See `.kiro/steering/structure.md` for the rule.

| Spec | Status | Category | Description |
|------|--------|----------|--------------|
| `ai-bill-reminders-budget-planning` | active | feature | AI-powered detection of recurring bills from transaction history and AI budget planning suggestions |
| `competitive-features` | complete | feature | Rollover budgets and other competitor-parity features shipped in Phase 1 |
| `critical-bug-fixes` | complete | fix | Six critical web app bugs fixed (dark theme persistence, account permissions, and others) |
| `documentation-cleanup` | complete | process | One-time move of session/kiro/blocker docs into `docs/archive/` subfolders |
| `documentation-validation-fix` | superseded | process | Content-based documentation validator rewrite; superseded by current commit workflow |
| `e2e-testing-infrastructure` | active | process | Owns the full test pyramid: unit coverage, integration tests, and E2E tests |
| `enhanced-accounts-transactions` | complete | feature | Account management, batch transaction entry, and navigation UX improvements |
| `goals-borrow-lend` | active | feature | Goals page Borrowed/Lent tabs and borrow/lend goal sub-type creation flow |
| `hooks-optimization` | superseded | process | Planned hook consolidation from 13 to 8 hooks; never executed, later replaced by a different hook schema |
| `mobile-app` | active | feature | React Native + Expo iOS/Android app |
| `mobile-ui-polish` | complete | feature | Mobile-specific UI polish bringing feature parity with completed web implementations |
| `multi-currency` | complete | feature | Multi-currency support: 6 currencies, selection, formatting, settings management |
| `onboarding-403-fix` | complete | fix | Fixed the auth-onboarding Lambda 403 error for first-time users |
| `plan-model-redesign` | complete | process | Migrated the data model from `FAMILY#`-scoped to `BUDGET#`-scoped with four roles (ADR-001) |
| `planned-transactions` | active | feature | Scheduled future income and expense entries with full CRUD UI |
| `push-notifications-reminders` | active | feature | Push notification and daily reminder system |
| `repo-docs-specs-consolidation` | complete | process | Repository spec and documentation reorganization - flattened specs/archive, merged duplicate docs, fixed stale references |
| `test-coverage-improvement` | complete | process | Test coverage improvement from 56% to 80% (Weeks 2-4 of roadmap) |
| `ui-polish-enhancements` | complete | feature | Quick Actions FAB and other web UI polish enhancements |
| `web-app-polish` | complete | feature | Web app design, information architecture, AI features, and polish (18 criteria) |
