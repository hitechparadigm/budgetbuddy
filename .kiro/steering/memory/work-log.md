---
inclusion: always
---

# Work Log

## Current Status

**Version**: 1.10.x
**Date**: 2026-09-23
**Phase**: Web App Complete -> Mobile Development
**Progress**: 100% Web Core | 100% Web Polish | 100% AI Features | CI/CD Stabilized | Repo Docs/Specs Consolidated
**Current Session**: ~167 (destroyed api-family-stack Session 167 - see Infrastructure section)

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
- [x] AiCoachChip wired into `BudgetPage.tsx` (Session 165, `web-app-followups` spec) - mounted as the
      last sibling before the page's outer closing div, fed by an extended `calculateTotals()`.
- [x] `packages/api-client` deleted entirely (Session 165, `web-app-followups` spec) - confirmed zero
      consumers in web-app or mobile; removed the tsconfig path mapping, lockfile workspace entry, and
      docs/README.md link.
- [x] `infrastructure/README.md`'s CDK Stacks section already lists all stacks (`api-features`,
      `api-features-extended`, `api-budgets`, `notification-stack` all present) - re-verified Session 165,
      this item was resolved as part of the mobile-app spec's work and this note was stale.

### Infrastructure
- [x] `api-family-stack` destroyed and removed from CDK app entrypoint (infra-cleanup spec)
- [ ] SES still in sandbox - production access not yet requested
- [ ] `infrastructure/bin/app.js` was already drifted from `app.ts` before this cleanup
      (missing `api-budgets`/`notificationFunction` wiring present in .ts) - noticed during
      infra-cleanup's app.js edit, not fixed here since out of this spec's scope; needs its own
      correction pass.
- [ ] cdk synth/cdk diff cannot run in this dev environment - Docker Desktop is installed
      but its engine is not running, and pi-features-stack.ts's PlaidHandler Lambda uses
      Docker-based asset bundling unconditionally for every synth/diff (pp.ts constructs
      all stacks regardless of target). The infra-cleanup spec's pp.ts/pp.js edits were
      verified via 	sc --noEmit + grep instead; full synth against live AWS is unverified.

### Security
- [ ] Security posture ~80%

### Mobile
- [x] React Native + Expo app is SUBSTANTIALLY BUILT, not "not started" - corrected a stale
      assumption carried in this file and in `.kiro/specs/mobile-app/tasks.md` for many
      sessions (Session 164 audit). Real source exists for auth, budget, transactions, offline
      SQLite sync, notifications, receipts, exports, 2FA, currency, backup/restore, with a
      16-file property-based test suite. See `.kiro/specs/mobile-app/tasks.md` for the
      corrected, evidence-based task list.
- [x] Navigation wiring (task 6.4) done: `RootNavigator.tsx` now has 5 tabs (Budget/
      Transactions/Goals/Summary/More); the 11 previously-orphaned screens (Bills, Insights,
      BankSync, CreditScore, DebtPayoff, Investments, NetWorth, Subscriptions, Tips,
      SyncSettings, OfflineSettings) plus Settings are reachable via a new `MoreScreen.tsx` hub
      under a `MoreStackNavigator`. Onboarding routing fixed too (`AuthContext.tsx`
      `needsOnboarding` flag, `App.tsx` renders `OnboardingScreen` before `RootNavigator`).
- [x] MFA/AuthContext-AuthService mismatch (task 2.6) fixed by scoping to reality, not by
      building real MFA: confirmed zero backend MFA support exists anywhere in the product (no
      `/auth/mfa/*` API routes, no `mfa` config on the Cognito User Pool in
      `infrastructure/lib/auth-stack.ts`, web app's `TwoFactorSetup.tsx` calls the same
      nonexistent endpoints). Added the 6 missing `AuthService` methods as real methods that
      reject with a clear error instead of silently no-op'ing; extended `signInUser`'s return
      type with optional `challengeName`/`session` (always `undefined` today). Real Cognito MFA
      (enabling it on the User Pool, implementing challenge/response) is future work, not done.
- [x] `npm run typecheck` in `packages/mobile` now reports **0 errors**, down from 127. Fixed in
      stages: installed 5 declared-but-missing/never-declared packages
      (`@react-native-picker/picker`, `expo-clipboard` added to `package.json`;
      `@react-native-community/datetimepicker`/`expo-camera`/`expo-image-picker` were declared
      but not installed) via `npm install --legacy-peer-deps` (flag required - unrelated
      pre-existing peer conflict: `react-native-get-random-values@^2.0.0` wants
      `react-native@>=0.81`, project pins `0.72.6`); reconciled duplicate `Budget`/`Transaction`
      types to `src/types/index.ts` as canonical; fixed ~15 files of component/style-prop type
      mismatches; fixed 45 test-file-only errors (fast-check `fc.option()` needs
      `{ nil: undefined }` since these types use `T | undefined` not `T | null`; missing
      `isPaused` field on category generators; unions from `fc.constantFrom()` need an
      `as fc.Arbitrary<...>` cast or TS widens to `string`).
- [x] `npx jest` in `packages/mobile` now passes 241/259 (up from 238/259 baseline). 5 suites
      still fail, but for a different reason than before: `notifications.test.ts` and
      `data-export.test.ts` now compile and run (previously failed before even executing) and
      fail on real test-content bugs - assertions that don't match actual service behavior, not
      typos. Same for `currency.test.ts`/`quietHours.test.ts`. `TwoFactorSetup.test.tsx`/
      `quick-actions.test.ts` are order-dependent flaky (pass standalone, intermittently fail in
      the full suite run).
- [ ] `packages/mobile` not wired into root workspace (`package.json`) or CI (`pr-check.yml`) -
      task 1.6, not yet done.
- [ ] Next highest-leverage item: fix the 5 failing jest suites' actual test-content bugs so
      task 22.1's coverage gate can produce a trustworthy number. See
      `.kiro/specs/mobile-app/tasks.md` for the corrected priority order.
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
