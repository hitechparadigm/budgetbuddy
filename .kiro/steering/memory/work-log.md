---
inclusion: always
---

# Work Log

## Current Status

**Version**: 1.10.x
**Date**: 2026-09-23
**Phase**: Web App Complete -> Mobile Development
**Progress**: 100% Web Core | 100% Web Polish | 100% AI Features | CI/CD Stabilized | Repo Docs/Specs Consolidated
**Current Session**: ~164

## What's Live and Working

### Core Infrastructure
- All 11 CDK stacks deployed: database, auth, auth-onboarding, api, api-features, api-features-extended, api-budgets, hosting, notification, monitoring
- Main API: `q0zoob6728.execute-api.us-east-1.amazonaws.com`
- Budgets API: `jcl39tq8x0.execute-api.us-east-1.amazonaws.com`
- Features API: `0poeu07vth.execute-api.us-east-1.amazonaws.com`
- Extended Features API: `hkjzroedjf.execute-api.us-east-1.amazonaws.com`
- CloudFront: `d1ueeugn9zcx7n.cloudfront.net`

### Features Complete (Sessions 148-163)
- Full web app polish (all 18 criteria met) - see web-app-polish spec
- AI-powered bill reminders + pattern detection - see ai-bill-reminders spec
- Dark mode - BudgetPage, SettingsPage, GoalsPage
- Currency locale fix in CalendarView
- Family budget transparency at category level
- Goal contributions linked to savings category spentAmount
- CategoryIcon component - colored CSS tint badges per category name pattern
- GoalsPage - Goals/Borrowed/Lent tabs; goals with `subType: 'borrowed' | 'lent'`
- BorrowLendFormPage - create borrowed/lent goals at `/goals/borrow-lend/new?type=borrowed|lent`
- PlannedTransactionsPage - full CRUD UI at `/planned-transactions`
- plannedTransactionsApi.ts - service client for extended features API
- Sidebar - CalendarClock icon + "Planned" item in manageItems
- App.tsx - routes for all new pages
- transaction-planning Lambda - migrated to BudgetAccessResolver + BUDGET# keys
- api-features-extended-stack.ts - transaction-planning Lambda + CDK routes added
- AiCoachChip component - contextual floating AI coach button (created, not yet wired in - see Open Items)
- docs/mobile-ux-design.md - Budge + Budgety competitive analysis + design system

### Repo Consolidation (Session 164)
- `.kiro/specs/archive/` eliminated - all 20 specs (12 formerly archived + 7 active + this one) are now
  direct children of `.kiro/specs/`, lifecycle tracked via `status`/`category` in `.config.kiro`, indexed
  in `.kiro/specs/README.md`.
- Corrected two spec statuses that were previously mislabeled complete: `hooks-optimization` and
  `documentation-validation-fix` are `superseded` (task checkboxes showed they were never fully executed).
- Reclassified `plan-model-redesign` as `process` category (data-model migration), not `feature`.
- `/docs` reduced from 21 files + a 20-file `archive/` tree to 12 files, all indexed in a rewritten
  `docs/README.md`. Merged the architecture trio into `aws-stack-architecture.md` and the notification/
  currency guides into `user-guide-budget-collaboration.md`. Deleted 9 obsolete top-level docs and all of
  `docs/archive/`.
- Fixed stale package READMEs discovered to describe code that no longer exists: `budget-alerts/README.md`
  was fully `familyId`/`FAMILY#`-based despite the Lambda's actual code using `budgetId`/`BUDGET#`;
  `packages/api-client/README.md` described `auth.ts`/`budget.ts`/`family.ts` modules that don't exist.
- Deleted two stray root PNGs and a corrupted-name junk directory.
- Added Spec Lifecycle, Documentation Placement, and No Stray Root Artifacts rules to `structure.md`;
  added Doc Index Maintenance to `documentation-standards.md`.

### CI/CD (Runs 576-582, then 35864278599, 35869003858)
- Security-check scanning fixes from session 162 remain stable (`.playwright-mcp` logs, `cdk-out-temp`
  excluded from secret scans).
- Both consolidation commits (`248b373`, `5d73e4f`) deployed successfully.

## Known Open Items

### Immediate
- [ ] Wire AiCoachChip import into BudgetPage.tsx or AppLayout.tsx (component created, still not imported
      anywhere - confirmed via repo-wide search during Session 164)
- [ ] `packages/api-client` package is stale relative to actual usage - only `client.ts`/`transactions.ts`
      are real; auth/budget/family API calls happen directly from `packages/web-app/src/services/` instead.
      Consider either deleting the unused package surface or actually wiring it up - not yet decided.
- [ ] `infrastructure/README.md` lists only `api-stack.ts` in its CDK Stacks section, missing
      `api-features`, `api-features-extended`, `api-budgets`, `notification` - noticed but out of scope
      for the Session 164 consolidation (not in its disposition list); needs its own correction pass.

### Infrastructure
- [ ] `api-family-stack` still deployed (returns 410) - destroy after confirming no traffic
- [ ] SES still in sandbox - production access not yet requested

### Security
- [ ] `canUseFeature()` not yet called in Lambda handlers - Phase 2: gate `reports.advanced`, `budget.export`
- [ ] Security posture ~80%

### Mobile
- [ ] React Native + Expo app - not started; design in docs/mobile-ux-design.md
- [ ] See `.kiro/specs/mobile-app/tasks.md` for Tier 1 priorities

## Deprecated / Removed
- `FamilyIdResolver` - deleted
- `FAMILY#` partition keys - replaced by `BUDGET#`
- `/family/*` API - returns 410, use `/budgets/*`
- `FamilySettings.tsx` -> `BudgetMembersPage` at `/budget/members`
- `familyService.ts` -> `budgetService.ts`
- `api-family-stack.ts` -> `api-budgets-stack.ts`
- `custom:familyId` JWT claim
- `.kiro/specs/archive/` directory - specs now flat under `.kiro/specs/` with status metadata
- `docs/archive/` directory - one-off session/incident summaries deleted, no ongoing reference value