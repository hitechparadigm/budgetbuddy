---
inclusion: always
---

# Work Log

## Current Status

**Version**: 1.11.x
**Date**: 2026-10-13
**Phase**: Web App Complete -> Mobile Development
**Progress**: 100% Web Core | 100% Web Polish | 100% AI Features | CI/CD Stabilized | Repo Docs/Specs Consolidated
**Current Session**: ~169 (mobile app-store-readiness audit found 4 real bugs in services/api.ts - dead auth token path, placeholder base URL, URL path-prefix stripping, wrong reanimated major version - all fixed; added eas.json, placeholder icons, iOS/Android store-required permissions; discovered Expo SDK 49 cannot produce an App-Store-submittable build (Apple requires iOS 26 SDK/Xcode 26+) and every native dependency is multiple majors ahead of SDK 49's expectations - full SDK upgrade in progress, see Mobile section)

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
- Session 170 (`758f09e`, Wave 1 FEAT-001, review finding P-12): both deploy workflows were
  structurally unable to report a failed deployment. Each of the three staged `npx cdk deploy`
  invocations in `deploy-dev.yml` and `deploy-prod.yml` ended in `|| echo "...continuing..."`, and
  the `Check CloudFormation stacks` step accepted `UPDATE_ROLLBACK_COMPLETE` as success while
  logging the stack as "functional" - so a stack that failed and rolled back to the previous code
  produced a GREEN run claiming the commit shipped. Removed all six fallbacks, added
  `set -euo pipefail` to four run blocks (the deploy step and the stack-check step in each file),
  and replaced the rollback-tolerant status test with a `*ROLLBACK*` arm that exits 1. Deploy
  steps 1-3 were deliberately kept - they are redundant with step 4's `cdk deploy --all` but they
  encode the CommonLayer export ordering workaround documented in the comment above them.
  **Consequence to expect:** the next failing deploy now goes RED. Dev stacks were last updated
  between 2026-05 and 2026-10-17 and are not all known-clean, so a red run shortly after this
  change may be a pre-existing failure becoming newly visible rather than a newly caused one -
  read `gh run view --log-failed` before attributing it.
- Session 170 deploy gate: Wave 1 FEAT-001..005 (`758f09e`..`1ec2c3d`, plus the deploy-gate
  docs commit) passed converge review and are committed on `develop` but NOT pushed, pending
  explicit owner approval. Last CI/CD run before the gate: 39060367826 (`95a4466`), SUCCESS.
  Superseded 2026-11-01: Wave 1 is DEPLOYED to DEV (see the outage note below).
- Session 170 deploy outage (2026-11-01): the Wave 1 range was pushed as `d0032a7`..`a981212`.
  Run 41318103714 deployed every stack, then failed its health check. Every Lambda that loads
  the common layer returned 502 with `Runtime.ImportModuleError: Cannot find module
  '@smithy/core/client'`. Cause: FEAT-003 pinned `@aws-sdk/util-dynamodb` at `3.996.9` in the
  layer's `package.json`. `backend/` is an npm workspace root, so the CI step
  `npm install --production` in `backend/layers/common/nodejs` hoists matching packages into
  `backend/node_modules`, which the layer asset does not ship. The pin's peer range forced newer
  `@aws-sdk/client-dynamodb`/`core` into the layer while their `@smithy/*` deps stayed hoisted,
  so they loaded the runtime's older `@smithy/core`. Fix: the pin is removed. The layer again
  ships only `uuid`, and the Lambdas use the Node 20 runtime's bundled SDK v3, as before Wave 1.
  Rule: do not add `@aws-sdk/*` to the layer's `package.json` without also fixing the CI install
  to build the layer outside the workspace.
  Recovered: `4f935a2` deployed in run 41321252759 (SUCCESS). `budgetbuddy-common:47` ships only
  `uuid`; the main API health routes return 200; the auth, budget, transaction, tips and
  investments logs show no import errors. Live Wave 1 checks passed the same day (DEVELOPMENT_LOG
  2026-11-01). Open follow-up: build the layer outside the npm workspace in CI.
- `js-yaml` is NOT installed at the repo root, so the steering/context YAML-parse gate command
  fails there with `MODULE_NOT_FOUND`. It resolves from `infrastructure/`, `packages/mobile/` and
  `packages/web-app/` - run the check with `cwd=infrastructure` and a `../.github/workflows/...`
  path.

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

### Backend Scheduled Functions (Session 170, Wave 1 FEAT-003, review findings P-01/AC-11)
- [x] Six handlers ported off `require('aws-sdk')` (Node 20 does not ship SDK v2; they crashed
      at import): `budget-alerts`, `daily-reminders`, `investments`, `investments-price-updater`,
      `restore`, `scheduled-backup`. Common layer gained paginated `dynamoHelpers.scan` and
      `dynamoHelpers.queryByGSI`. No bundling change. Deployed 2026-11-01. Verified:
      `daily-reminders` scheduled runs at 15:36Z and 15:51Z finished with no import error;
      `budget-alerts` invoked with a no-op stream event returned 200 with no FunctionError.
- [ ] Watch the first post-deploy scheduled runs: `budget-alerts` (rate 6 h, next about 19:47Z on
      2026-11-01; its stream mapping still shows the pre-deploy "PROBLEM: Function call failed")
      and `bill-scheduler` (cron 08:00Z). Not invoked by hand, because both write notifications
      for real users.
- [x] `bills-scheduler` uses three GSI1 `BILLS#<YYYY-MM>` queries instead of the nonexistent
      `dynamoHelpers.scan`, and writes notifications at `USER#<userId>` / `NOTIFICATION#...`
      instead of `FAMILY#undefined`. Old orphaned rows were not migrated.
- [ ] `daily-reminders` runs but sends 0 reminders: reminder paths still read `FAMILY#` keys
      (`getLastTransactionDate`, `getUpcomingBillsForFamily`, `getTransactionsForFamily`) and the
      kickoff email reads `BUDGET#${userId}`. `sendDailyReminder` now skips users with no
      `familyId` (0 of 56 DEV profiles have one); without that skip the empty FAMILY# lookup
      would remind every user on every 15-minute run in the window. Remove the skip as part of
      the `FAMILY#` key migration.
- [x] `budget-alerts` and `daily-reminders` now also get `dynamodb:PutItem` on the table
      (Session 170, FEAT-004, owner ruling on FEAT-003's D5), on top of `grantReadData`. This is
      narrower than `grantReadWriteData`. `budget-alerts`' alert-sent dedup record and
      `daily-reminders`' nudge record now persist, so alerts no longer repeat every 6 hours.
- [ ] `daily-reminders` kickoff email: no `ses:SendEmail` grant, AND it sends from
      `SES_FROM_EMAIL || 'noreply@budgetbuddy.app'`. The stack never sets `SES_FROM_EMAIL`, and
      that address is not a verified SES identity. Fixing it needs an env var (e.g.
      `info@hitechparadigm.com`) plus a grant scoped to that identity ARN, and SES sandbox limits
      recipients anyway. Follow-up; not done in FEAT-004.
- [ ] `restore` returns 501 until the key migration (its writes still target `FAMILY#`).
- [ ] `investments-price-updater`, `scheduled-backup`: ported, still not wired into any stack;
      `scheduled-backup` is `FAMILY#`-keyed throughout.
- [ ] `credit-score`, `export`, `notifications`, `transaction-planning` still DECLARE `aws-sdk`
      in `package.json` (no production `require` remains); dead declarations, cleanup pending.
      `transaction-planning` is owned by the Wave 2 branch.

### AI / Bedrock (Session 170, Wave 1 FEAT-005, review finding L-05)
- [x] One model for every AI Lambda: `us.anthropic.claude-haiku-4-5-20251001-v1:0` (Claude Haiku
      4.5 through the US inference profile). It comes from the common layer `BEDROCK_MODEL_ID` and
      CDK `lib/config/bedrock.ts`; `bedrockModelResourceArns(region, account)` holds the IAM
      ARNs. The old `claude-3-5-sonnet-20241022-v2:0` is end-of-life, so every AI feature had
      been serving its fallback. `api-stack.ts`'s Bedrock `resources: ['*']` is gone. Deployed
      2026-11-01.
- [x] `AiFallbackUsed`/`AiInvokeSucceeded` EMF metrics (namespace `BudgetBuddy/AI`) and alarm
      `budgetbuddy-ai-fallback-in-use` on the monitoring alerts topic.
- [x] Post-deploy proof (2026-11-01): `POST /budget/ai-generate` (the deployed route; there is no
      `/ai/generate-budget` resource on the gateway) for a month with no `PERIOD#` returned 200.
      `budgetbuddy-ai` logs had 0 "using fallback" lines, `BudgetBuddy/AI` lists
      `AiInvokeSucceeded`, and the alarm is OK.
- [ ] Optional: Claude Haiku 5.5 is about 10x cheaper but returns AccessDeniedException for this
      account (it needs an owner request). The `pattern-detection` cost constants still use
      Sonnet prices.

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
      Workaround used in Session 170 (FEAT-004): a throwaway script that instantiates only the
      Docker-free stacks (database, auth, notification), synthesizes them, and diffs the result
      against `aws cloudformation get-template`. Not committed. Asset staging takes ~10 minutes.
- [x] Alarms reach a human (Session 170, Wave 1 FEAT-004, review findings P-17/L-02).
      `deploy-dev.yml` now passes the configured `ALERT_EMAIL` (a GitHub Actions secret, no
      committed default). notification-stack has its OWN topic `budgetbuddy-dev-notification-alerts`
      (monitoring depends on notification, so using monitoring's topic would be circular). All 12
      notification alarms publish to it; error alarms now fire on >= 1 error in one 5-minute
      period (the old > 5 over 2 periods could never fire for a 15-minute job); duration alarms
      sit at 80% of each function's own timeout; 7-day log retention on all four functions.
      Deployed 2026-11-01.
- [x] SNS subscriptions confirmed (checked 2026-11-01): `budgetbuddy-dev-monitoring-alerts` and
      `budgetbuddy-dev-notification-alerts` each have one confirmed email subscription (a real
      ARN, not `PendingConfirmation`). Consolidating the two topics is deferred.
- [x] Data stores protected (Session 170, FEAT-004, review findings AC-07/AC-13/L-01).
      `lib/config/data-protection.ts` `isDataProtected()` is ON unless
      `--context dataProtection=false`. `budgetbuddy-main` and the Cognito pool get deletion
      protection + RETAIN; the table gets a daily 35-day AWS Backup plan (vault
      `budgetbuddy-dev-vault`). PITR stays on (deprecated prop swapped for
      `pointInTimeRecoverySpecification`, identical rendered template). A partial synth diffed
      against the deployed templates shows no replacement of the table or the pool.
      Consequence: a future change that would replace either resource now FAILS the stack update,
      and `cdk destroy` leaves both behind.

### Security
- [ ] Security posture ~85% (up from ~80% - critical CVE fixed, security-check.sh now exits 0 clean, see below)
- [x] Identity-spoofing path through Cognito closed (Session 170, FEAT-002, review finding
      AC-01). `selfSignUpEnabled: true` plus `custom:userId` in the public app client's
      `writeAttributes` let anyone call the Cognito `SignUp` API with the public client ID and
      set `custom:userId` to a victim's user ID - Cognito permits a client with write access to
      populate an immutable attribute once at SignUp, and `getUserFromEvent` returns
      `claims["custom:userId"] || claims.sub`, which `BudgetAccessResolver` then trusts for
      every budget read and write. `writeAttributes` now grants only `country` plus the
      standard attributes; `selfSignUpEnabled: false`. `readAttributes` deliberately unchanged
      (web reads all four from the ID token at `AuthContext.tsx:70-76`). Mobile registration
      re-pointed at `POST /auth/register` in the same change set, since self sign-up off
      otherwise breaks it - and the old mobile call was likely already failing, as it sent only
      `email`/`name` while the pool requires `given_name` + `family_name`. Proven live on
      2026-11-01: `SignUp` with `custom:userId` fails with NotAuthorizedException "A client
      attempted to write unauthorized attribute"; a plain `SignUp` fails with "SignUp is not
      permitted for this user pool"; neither created a user. `POST /auth/register` returns 201
      with a `user_<uuid>` ID, and the new user can sign in (both the app login and
      `USER_PASSWORD_AUTH`).
- [x] Plaintext passwords and bearer tokens out of the auth Lambda's logs (Session 170,
      FEAT-002, review finding AC-02). `auth/index.js` logged the entire API Gateway event as
      JSON (so `event.body`'s plaintext password AND `event.headers.Authorization`) plus all
      headers separately; with 7-day retention, `logs:GetLogEvents` on
      `/aws/lambda/budgetbuddy-auth` read back every password registered that week. Those two
      lines are gone, the registration-body log is now `{ email, hasPassword }`, onboarding logs
      record field presence only, five handlers no longer echo raw `error.message` to the
      client, and registration user IDs come from `generateId.user()` rather than
      `Date.now()` + `Math.random()`.
- [ ] `email_verified` on registration stays `"true"`, with `emailVerificationPending: true`
      on the profile record (Session 170, FEAT-002, plan item 4d fallback branch, taken before
      deploy on converge-review finding B-1). `"false"` breaks password reset: the pool's
      `accountRecovery` is `EMAIL_ONLY` and Cognito `ForgotPassword` rejects users with no
      verified email, so `POST /auth/forgot-password` would return 500 for every new user.
      AC-02's verification half is BLOCKED on SES production access or Cognito managed login;
      until then an unproven address is trusted by the Google link-by-email path
      (pre-account-takeover risk stays open).
- [ ] Wave 2 follow-up: consolidate the `'auth_id_token'` literal. `services/storage-keys.ts`
      now owns it (`STORAGE_KEYS` + `ID_TOKEN_KEY`, import-free); `services/plaid.ts:56` reads
      the wrong key (`'budgetbuddy_id_token'`, the web app's) and is the actual bug, while
      `services/api.ts:98` and `components/FamilySettings.tsx:79,82` re-declare the correct
      value and are cosmetic duplication. All three were left untouched in Session 170 to avoid
      a merge conflict with the concurrently running Wave 2 agent.
- [ ] Owner decision required, NOT executed (Session 170, FEAT-002): the review recommends
      purging the affected `/aws/lambda/budgetbuddy-auth` log streams and considering a forced
      password reset for everyone who registered inside the 7-day retention window. Both are
      destructive and user-visible, so they were surfaced rather than run.
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
- [x] Mobile Planned Transactions screen (`mobile-app` spec task 12) - built
      `PlannedTransactionsScreen.tsx` against the same `transaction-planning` Lambda the
      web app's `PlannedTransactionsPage` uses (extended features API gateway):
      upcoming/all/completed tabs, create one-off/recurring, mark-as-done (executes into a
      real transaction), delete with confirmation. Wired into `MoreStackNavigator` + a new
      "Planned Transactions" item in `MoreScreen.tsx`'s Money section. Added a mock for the
      new screen to `navigation.test.tsx` (which explicitly mocks every
      `MoreStackNavigator` screen import) after it surfaced a real new test failure on the
      first run. Verified unchanged: `tsc --noEmit` 0 errors, `jest` 257/259 (2x runs),
      `lint:check:mobile` exactly 151 pre-existing errors (zero new ones introduced).
- [x] Canadian investment account types (TFSA, RRSP, FHSA, RESP) added alongside the
      existing US types (401k, IRA, Roth IRA, HSA) on both `InvestmentsPage.tsx` (web) and
      `InvestmentsScreen.tsx` (mobile) - triggered by verifying a claim in an external
      strategic review (`docs/startup-assessment-canada-strategy.md`) against the actual
      code. The review's other two findings (family-category privacy gap, premium feature
      gating) were confirmed STALE/already-implemented and flagged as corrections in the
      doc rather than acted on. Relabeled `brokerage` to "Brokerage (non-registered)";
      replaced a 5-deep nested ternary emoji lookup with an `ACCOUNT_TYPE_EMOJI` map on
      both platforms. Verified: `tsc --noEmit` 0 errors both platforms.
- [x] Mobile biometric authentication (`mobile-app` spec task 15) - the spec's claim that
      `BiometricSetupScreen.tsx` "exists" but lacks a navigator route was misleading: the
      file was a literal 0-byte stub and the Settings toggle was wired to inert local
      state. Built a real `services/biometric.ts` wrapper around `expo-local-authentication`
      (`getAvailability`/`authenticate`/`isEnabled`/`setEnabled`, preference persisted via
      `AsyncStorage`) and a real `BiometricSetupScreen.tsx`. Wired into `MoreStackNavigator`
      and changed `SettingsScreen.tsx`'s biometric row from a dead `type: "toggle"` to
      `type: "navigation"` that routes to the new screen. Verified unchanged: `tsc --noEmit`
      0 errors, `jest` 257/259 (2 skipped), `lint:check:mobile` exactly 151 pre-existing
      errors (temporarily regressed to 153 from two unused imports, fixed back to baseline).
- [~] Mobile app-store-readiness audit (`mobile-app` spec task 16, Session 169) - found
      and fixed 4 real bugs in `services/api.ts` masked by offline-fallback catches on
      every call site: `getAuthToken()` read a nonexistent AsyncStorage key (real tokens
      live in SecureStore under `auth_id_token` per `services/auth.ts`) so every request
      through the shared `api` client went out unauthenticated; `API_CONFIG.baseURL`'s
      fallback was a placeholder domain that was never a real backend with no `.env`
      override present, meaning Budget and Transactions (the two primary tabs) have
      never reached the real backend in this dev environment; `buildUrl()`'s
      `new URL(endpoint, baseURL)` silently dropped the API Gateway's `/v1` stage prefix
      per the WHATWG URL spec. All three fixed and verified with standalone `node -e`
      reproductions before and after. Also found `react-native-reanimated@4.2.1`
      installed against this project's Expo SDK 49 / RN 0.72.6 (old architecture)
      despite requiring RN >=0.76 and the New Architecture - downgraded to the exact
      SDK-49-expected `~3.3.0` and added the missing `react-native-reanimated/plugin`
      to `babel.config.js` (was entirely absent). Fixed a deterministic (not flaky)
      property-test failure in `quick-actions.test.ts` (`fc.float` without `noNaN: true`
      can still generate `NaN`). Added `eas.json` (did not exist), generated placeholder
      app icon/splash/adaptive-icon/favicon PNGs (`app.json` referenced 4 files that did
      not exist), and added the iOS `Info.plist` usage-description strings + Android
      permissions + Expo config plugins for camera/biometric/notifications this app
      actually uses but `app.json` never declared. Verified unchanged: `tsc --noEmit` 0
      errors, `jest` 257/259 (1 pre-existing order-dependent flaky failure reproduced
      identically on pristine HEAD, confirmed unrelated), `lint:check:mobile` exactly
      151 pre-existing errors. **Task-defining discovery**: `npx expo install --check`
      shows every native dependency multiple majors ahead of SDK 49's expectations, and
      Apple now requires the iOS 26 SDK (Xcode 26+) for new submissions - SDK 49's
      toolchain predates that by years. A full Expo SDK upgrade (49 -> current LTS) is
      required before any submittable build is possible; user chose to proceed with the
      upgrade now. In progress - see DEVELOPMENT_LOG.md 2026-10-17 entry.

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