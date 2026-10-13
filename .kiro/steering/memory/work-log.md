---
inclusion: always
---

# Work Log

## Current Status

**Version**: 1.11.x
**Date**: 2026-10-13
**Phase**: Web App Complete -> Mobile Development
**Progress**: 100% Web Core | 100% Web Polish | 100% AI Features | CI/CD Stabilized | Repo Docs/Specs Consolidated
**Current Session**: ~168 (mobile jest suite fixed, mobile wired into workspace/CI, app.js drift fixed, npm audit critical CVE fixed via from-scratch lockfile regen, modular-architecture spec COMPLETE (15/15 tasks) - see Mobile/Infrastructure/Security/Modular Architecture sections)

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
- [x] `infrastructure/bin/app.js` drift from `app.ts` - fixed (see Mobile section below
      for the full fix note; this item was a stale duplicate of that one).
- [ ] cdk synth/cdk diff cannot run in this dev environment - Docker Desktop is installed
      but its engine is not running, and api-features-stack.ts's PlaidHandler Lambda uses
      Docker-based asset bundling unconditionally for every synth/diff (app.ts constructs
      all stacks regardless of target). The infra-cleanup spec's app.ts/app.js edits were
      verified via tsc --noEmit + grep instead; full synth against live AWS is unverified.

### Security
- [ ] Security posture ~85% (up from ~80% - critical CVE fixed, security-check.sh now exits 0 clean, see below)
- [x] Resolved the npm audit vs npm ci conflict from earlier in Session 168 (commits
      bc42d55/4efef12 had each failed CI a different way). Root cause: the lockfile
      itself was corrupted (`@unrs/resolver-binding-wasm32-wasi` depended on
      `@emnapi/core@1.10.0`/`@emnapi/runtime@1.10.0` with no corresponding top-level
      entries anywhere in the file) - every prior fix attempt was patching
      (`npm install`/`npm audit fix`) on top of that inconsistency instead of fixing it.
      Deleted `package-lock.json` and ran `npm install` from scratch. The regenerated
      lockfile (502 packages) passes a real `npm ci` from a deleted `node_modules`
      (exit 0) AND `npm audit --audit-level=critical` (exit 0, 0 critical - handlebars
      is already patched to 4.7.10, 22 moderate findings remain, all
      `jest`/`aws-sdk` devDependency-only). Verified against the actual
      `scripts/security-check.sh` (run locally via Git Bash to simulate the CI gate
      directly, not just the `npm audit` command in isolation) - step 7 passes.
- [x] `scripts/security-check.sh` step 6 (HTTP-URL-in-infrastructure check) fixed - it
      had no `node_modules` exclusion, unlike every other check in the script, so it
      falsely flagged Apache license boilerplate text inside
      `infrastructure/node_modules/typescript/lib/*.d.ts`. Added `--exclude-dir=node_modules`,
      `--exclude-dir=cdk.out`, `--exclude-dir=cdk-out-temp` to match the rest of the script.
      Verified with `infrastructure/node_modules` present locally - full script now exits 0.
- [ ] 22 moderate `npm audit` findings remain (`jest`/`aws-sdk` devDependency-only
      transitive deps, no production exposure, below the `--audit-level=critical` CI
      gate). No further action needed unless the gate threshold changes.

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
- [x] `npx jest` in `packages/mobile` now passes 257/259 (2 skipped, 0 failed) - up from the
      241/259 baseline. Fixed the 4 previously-failing suites' real test-content bugs
      (`currency.test.ts`, `notifications.test.ts`, `quietHours.test.ts`,
      `data-export.test.ts`): a nonexistent `data` field on scheduled notifications, a
      stale storage key, a fast-check mock-accumulation bug across property iterations, an
      unrealistic id generator, and `Intl.NumberFormat` locale-symbol assumptions - no file
      under `src/services/` was changed. `TwoFactorSetup.test.tsx`/`quick-actions.test.ts`
      remain order-dependent flaky (pass standalone, intermittently fail in the full suite
      run), unchanged and out of scope.
- [x] `packages/mobile` now wired into root workspace scripts (`lint:check:mobile`,
      `type-check:mobile`, `test:mobile`) and CI (`pr-check.yml`'s new `mobile-tests` job) -
      task 1.6/22.2. Found and fixed two real, previously-silent bugs along the way:
      `packages/mobile/.eslintrc.js` had a malformed `extends` entry (missing the required
      `plugin:` prefix, so ESLint could never load it), and `lint:check:web` had silently
      depended on `cross-env` without it being installed (now added, pinned exact,
      `10.1.0`). `lint:check:mobile` now runs and surfaces 151 real pre-existing lint
      errors - deliberately not chained into `lint:check:all`; tracked as its own
      follow-up, not fixed in this pass.
- [x] `infrastructure/bin/app.js` drift from `app.ts` (missing `api-budgets`/
      `notificationFunction` wiring) fixed by regenerating via `npm run build` in
      `infrastructure/` (confirmed via `cdk.json` that `bin/app.ts` via `ts-node` is CDK's
      actual deploy entrypoint, so `app.js` is dead weight for deployment purposes but is
      still a checked-in file worth keeping accurate). The build also touched several
      unrelated compiled `lib/*.js` files (Stripe/SES/IAM changes reflecting drift the
      `.ts` sources have accumulated since `.js` was last regenerated) - those were
      reverted and left untouched, out of scope for this fix; only `app.js` itself was
      kept. Stripped the build's added inline sourcemap comment to keep the diff minimal.

### Modular Architecture (`modular-architecture` spec, COMPLETE, 15/15 tasks)
- [x] All 15 tasks done (every required task + every optional `*` task). Final waves 3-6:
      `checkStackManifest()` (5.1) and `checkGatewayRouting()`/`extractRoutePrefixes()` (7.1)
      implemented and verified against the real repo; `docs/module-scaffold-guide.md`
      created and indexed (12.1/12.2); a new `consistency-checks` job wired into
      `pr-check.yml` matching the `mobile-tests` additive pattern, including the
      `pr-summary` job's `needs` array, table row, and gating condition (13.1/13.2); all
      three checkpoints passed (9: full `consistency-check.js` run exits 0 with all four
      checkmarks; 14: all three touched workflow YAML files parse via `js-yaml`; 15: final
      re-run still clean); the three remaining optional unit-test tasks (3.2/5.2/7.2) and
      the Property 1 determinism/side-effect-free test (8.1) all added to
      `scripts/consistency-check.test.js`, now 10 passing tests total.
      `validate_spec_format` confirmed zero format issues on the final `tasks.md`. No task
      across the entire spec added, removed, or modified a CDK stack, API Gateway, or
      DynamoDB table - every change was additive tooling, reference docs, or a workflow
      step reading a new reference file instead of a hardcoded array.




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
