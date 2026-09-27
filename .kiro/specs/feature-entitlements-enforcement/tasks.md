# Implementation Plan: Feature Entitlements Enforcement

## Overview

Wire the already-implemented `canUseFeature(subscriptionTier, featureKey)` gate into
`export/index.js` and `insights/index.js`, remove the dead `canUseFeature` import from
`budgets/index.js`, and reclassify `budget.export`/`reports.advanced` to `tier: 'free'` in
`entitlements.js` so the catalog matches the actual product state (no billing integration exists
yet). Catalog reclassification is foundational and must land first since it changes what the
property tests and integration tests assert against. Test scaffolding for `export/` and `insights/`
is built from scratch, modeled on the existing `budgets/` pattern. Documentation corrections close
out the spec.

## Tasks

- [x] 1. Reclassify `budget.export` and `reports.advanced` to `tier: 'free'` in the catalog
  - In `backend/layers/common/nodejs/entitlements.js`, changed the `FEATURE_CATALOG` entry for
    `'budget.export'` from `tier: 'premium'` to `tier: 'free'`
  - Changed the `FEATURE_CATALOG` entry for `'reports.advanced'` from `tier: 'premium'` to
    `tier: 'free'`
  - Updated the module JSDoc to state both features are `tier: 'free'` because every current user is
    on the same $0/month plan, and retained/added a statement that Phase 2 billing re-gates them by
    flipping only the `tier` field back to `'premium'` — no Lambda handler changes required at that
    time
  - Verified `backend/node_modules/budgetbuddy-common-layer` is a filesystem junction pointing at
    `backend/layers/common/nodejs` (confirmed via `Get-Item`), so there is no second copy of
    `entitlements.js` needing the same edit
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 2. Property-based tests for `canUseFeature`
  - [x] 2.1 Create `backend/layers/common/nodejs/entitlements.pbt.test.js`
    - Set up `fc.assert(fc.property(...))` scaffolding following the existing `*.pbt.test.js`
      convention in this repo, importing `canUseFeature` and `FEATURE_CATALOG` from `./entitlements`
    - _Requirements: 7.1, 7.2, 7.3_
  - [x]* 2.2 Write Property 1: unknown feature keys always deny
    - **Property 1: Unknown feature keys always deny** — for any `featureKey` not present in
      `FEATURE_CATALOG` and any `subscriptionTier`, `canUseFeature` returns `false`
    - `numRuns: 100`
    - PBT status: **passed** (see `update_pbt_status` call this session)
    - **Validates: Requirements 7.1**
  - [x]* 2.3 Write Property 2: free-tier features are always allowed
    - **Property 2: Free-tier features are always allowed** — for any `featureKey` whose catalog
      entry has `tier: 'free'` and any `subscriptionTier`, `canUseFeature` returns `true`
    - `numRuns: 100`
    - PBT status: **passed**
    - **Validates: Requirements 7.2**
  - [x]* 2.4 Write Property 3: premium-tier features allowed iff caller tier is premium
    - **Property 3: Premium-tier features are allowed if and only if the caller's tier is premium**
      — for any `featureKey` whose catalog entry has `tier: 'premium'` and any `subscriptionTier`,
      `canUseFeature` returns `true` iff `subscriptionTier === 'premium'`
    - Because task 1 leaves zero `tier: 'premium'` entries in the live catalog, this test constructs
      a local fixture. **Deviation from design.md's suggested mechanism**: the `jest.isolateModules`
      + `jest.doMock('./entitlements', ...)` approach shown in design.md was implemented first and
      run — it failed (`Property failed after 5 tests`, counterexample `["premium"]`), because
      `canUseFeature`'s closure reads `entitlements.js`'s own internal `FEATURE_CATALOG` binding, not
      whatever object a `jest.doMock` factory returns under that module specifier — the injected
      `'test.premium.feature'` key was invisible to the real function. Switched to directly mutating
      the live `FEATURE_CATALOG` object (`FEATURE_CATALOG[testKey] = {...}` before `fc.assert`,
      `delete FEATURE_CATALOG[testKey]` in a `finally` block) — since `canUseFeature` and
      `FEATURE_CATALOG` are destructured from the same module instance at the top of the test file,
      object-reference mutation reaches the exact object the closure reads. Re-ran after the switch:
      passed.
    - `numRuns: 100`
    - PBT status: **passed**, after the mechanism correction above (documented per bugfix-style
      triage: this was a test-mechanism bug, not a `canUseFeature` bug — the property statement
      itself was never in question)
    - **Validates: Requirements 7.3**

- [x] 3. Checkpoint - Ensure entitlements tests pass
  - Ran `npx jest entitlements.pbt.test.js` in `backend/layers/common/nodejs`. Result:
    `Test Suites: 1 passed, 1 total`, `Tests: 3 passed, 3 total`. All three properties pass.

- [x] 4. Wire `canUseFeature` into Export_Handler
  - [x] 4.1 Add the entitlement gate to `backend/functions/export/index.js`
    - Imported `canUseFeature` from `/opt/nodejs/entitlements`
    - Destructured `subscriptionTier` from the existing `BudgetAccessResolver.resolveAccess(...)`
      result (no additional DynamoDB read)
    - Inserted a single `if (!canUseFeature(subscriptionTier, 'budget.export'))` check immediately
      after the existing `assertPermission` call and before the `exportType` (`csv`/`json`/`pdf`)
      dispatch, so the gate covers every export type with one check
    - On deny, returns the Upgrade_Prompt_Response: `{ statusCode: 403, headers: getCorsHeaders(),
      body: JSON.stringify({ error: 'Upgrade required', message: 'Exporting budget data requires a
      premium subscription.' }) }`
    - Left the existing 400 response for an unsupported `type` query value untouched and evaluated
      independently of the entitlement check
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 4.2 Fix `backend/functions/export/package.json` test scaffolding
    - Replaced the placeholder `test` script (`echo "Error: no test specified" && exit 1`) with
      `"test": "jest"` and added `"test:coverage": "jest --coverage"`
    - Added `fast-check` and `jest` as pinned dev dependencies, matching `budgets/package.json`'s
      exact version pins (`fast-check: ^3.15.0`, `jest: ^29.7.0`)
    - _Requirements: 4.4_
  - [x] 4.3 Create `backend/functions/export/jest.config.js`
    - Mirrors `backend/functions/budgets/jest.config.js` exactly: `testEnvironment: 'node'`,
      `testMatch` for `*.test.js`/`*.pbt.test.js`, `collectCoverageFrom`, `coverageThreshold` (60%
      branches/functions/lines/statements), and a `moduleNameMapper` mapping
      `^/opt/nodejs/utils$` → `<rootDir>/__mocks__/utils.js` and `^/opt/nodejs/entitlements$` →
      `<rootDir>/__mocks__/entitlements.js`
    - _Requirements: 4.4_
  - [x] 4.4 Create `backend/functions/export/__mocks__/utils.js`
    - Mocks only what `export/index.js` actually imports from `/opt/nodejs/utils`:
      `getUserFromEvent`, `dynamoHelpers.queryByPK`, and `BudgetAccessResolver` (`resolveAccess`
      defaulting to `subscriptionTier: 'free'`, `assertPermission` as a no-op jest.fn)
    - _Requirements: 4.4_
  - [x] 4.5 Create `backend/functions/export/__mocks__/entitlements.js`
    - Same shape as `backend/functions/budgets/__mocks__/entitlements.js`: `canUseFeature =
      jest.fn(() => true)` by default
    - _Requirements: 4.4_
  - [x] 4.6 Create `backend/functions/export/export.test.js`
    - Test 1: `type=csv` with default (free-tier) mocks → 200 with CSV body — _Requirements: 4.1, 1.1, 1.4_
    - Test 2: `type=json` with default mocks → 200 with JSON body — _Requirements: 4.1, 1.1, 1.4_
    - Test 3: `type=pdf` with default mocks → 200 (existing "PDF being prepared" response) —
      _Requirements: 4.1, 1.1, 1.4_
    - Test 4: `type=csv` with `canUseFeature` mocked to return `false`
      (`canUseFeature.mockReturnValueOnce(false)`) → 403 Upgrade_Prompt_Response, and asserted
      `dynamoHelpers.queryByPK` was NOT called — _Requirements: 4.3, 1.2_
    - Test 5: `type=invalidformat` with default mocks → existing 400 response, independent of the
      entitlement check — _Requirements: 1.5_
    - Ran `npm install` in `backend/functions/export` first (needed to hoist `jest`/`fast-check`
      into the `backend/` npm workspace `node_modules`, since the package had no dev dependencies
      installed before this task)

- [x] 5. Checkpoint - Ensure Export_Handler tests pass
  - Ran `npx jest --verbose` in `backend/functions/export`. Result: `Test Suites: 1 passed, 1 total`,
    `Tests: 5 passed, 5 total`. All 5 cases pass (csv/json/pdf allow-path 200s, `canUseFeature`-false
    deny-path 403 with `dynamoHelpers.queryByPK` confirmed not called, `invalidformat` 400
    independent of the gate). Re-ran again at task 11 alongside the other 3 suites — still 5/5.

- [x] 6. Wire `canUseFeature` into Insights_Handler (all five functions)
  - [x] 6.1 Add the entitlement gate to `backend/functions/insights/index.js`
    - Imported `canUseFeature` from `/opt/nodejs/entitlements` once at the top of the file
    - In each of `getWeeklyInsights`, `getMonthlyInsights`, `getSpendingTrends`,
      `getSpendingPatterns`, and `askAboutSpending`, destructured `subscriptionTier` from that
      function's existing `BudgetAccessResolver.resolveAccess(...)` result and inserted an identical
      `if (!canUseFeature(subscriptionTier, 'reports.advanced'))` check immediately after that
      function's existing `assertPermission` call and before any `dynamoHelpers` query, Bedrock
      invocation, or other computation
    - On deny, returns the Upgrade_Prompt_Response: `{ statusCode: 403, headers: {
      'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Upgrade required', message: 'Advanced spending reports require
      a premium subscription.' }) }`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 6.2 Add `fast-check` to `backend/functions/insights/package.json`
    - Kept the existing `"test": "jest"` script; added `fast-check: ^3.15.0` as a pinned dev
      dependency alongside the existing `jest` dependency
    - _Requirements: 4.4_
  - [x] 6.3 Create `backend/functions/insights/jest.config.js`
    - Same structure as `backend/functions/export/jest.config.js` (task 4.3): `testEnvironment`,
      `testMatch`, `collectCoverageFrom`, `coverageThreshold`, and a `moduleNameMapper` mapping both
      `^/opt/nodejs/utils$` and `^/opt/nodejs/entitlements$` to local `__mocks__/` files
    - _Requirements: 4.4_
  - [x] 6.4 Create `backend/functions/insights/__mocks__/utils.js`
    - Mocks all seven members `insights/index.js` imports from `/opt/nodejs/utils`:
      `successResponse`, `errorResponse` (with `badRequest`/`notFound`/`unauthorized`/
      `internalError`), `parseRequestBody`, `getUserFromEvent`, `dynamoHelpers` (`getItem`,
      `putItem`, `queryByPK`), `logger` (`info`/`warn`/`error`), and `BudgetAccessResolver`
      (`resolveAccess` defaulting to `subscriptionTier: 'free'`, `assertPermission` as a no-op)
    - _Requirements: 4.4_
  - [x] 6.5 Create `backend/functions/insights/__mocks__/entitlements.js`
    - Identical to `backend/functions/budgets/__mocks__/entitlements.js` (before its deletion in
      task 8.2)
    - _Requirements: 4.4_
  - [x] 6.6 Swap `insights.test.js`'s mock mechanism from inline `jest.mock` to `moduleNameMapper`
    - Removed the existing inline `jest.mock('/opt/nodejs/utils', () => ({...}), { virtual: true })`
      block at the top of `backend/functions/insights/insights.test.js`
    - Replaced it with plain `require('/opt/nodejs/utils')` / `require('/opt/nodejs/entitlements')`
      calls that now resolve via the `moduleNameMapper` entries created in task 6.3, pointing at the
      mocks created in tasks 6.4/6.5
    - Did not alter any existing `describe`/`it` test bodies beyond this mock-source swap — their
      existing `dynamoHelpers.queryByPK.mockResolvedValue(...)`-style assertions kept working
      unchanged, confirmed by all 9 pre-existing tests passing after the swap
    - _Requirements: 4.4_
  - [x] 6.7 Add new allow-path and deny-path test cases to `insights.test.js`
    - Tests 1–5 (`GET /insights/weekly`/`monthly`/`trends`/`patterns`, `POST /insights/ask`, each
      under the default free-tier mock → 200) were **already present** in `insights.test.js` before
      this spec (pre-existing tests written before entitlement gating existed) — confirmed by
      reading the file directly. Since the gate is now live in front of each handler and these tests
      still pass with the default `subscriptionTier: 'free'` mock, they now also serve as this task's
      required allow-path coverage; no duplicate tests were added — _Requirements: 4.2, 2.2_
    - Test 6 (new): added a new `describe('Entitlement gating (reports.advanced)')` block with one
      test — `GET /insights/weekly` with `canUseFeature` mocked to return `false`
      (`canUseFeature.mockReturnValueOnce(false)`) → 403 Upgrade_Prompt_Response, asserting
      `dynamoHelpers.queryByPK` was NOT called — _Requirements: 4.3, 2.3_. Per design.md's rationale,
      only one representative handler needs a dedicated deny-path test since all five call the
      identical `canUseFeature` expression in the identical position relative to `assertPermission`

- [x] 7. Checkpoint - Ensure Insights_Handler tests pass
  - Ran `npx jest --verbose` in `backend/functions/insights`. Result: `Test Suites: 1 passed, 1
    total`, `Tests: 10 passed, 10 total` (9 pre-existing + 1 new deny-path test). Re-ran again at
    task 11 alongside the other 3 suites — still 10/10.

- [x] 8. Remove the dead `canUseFeature` import from Budgets_Handler
  - [x] 8.1 Delete the dead import from `backend/functions/budgets/index.js`
    - Removed the 3 lines: the `// canUseFeature is imported for future entitlement checks (Phase 2)`
      comment, the `// eslint-disable-next-line no-unused-vars` comment, and the
      `const { canUseFeature } = require('/opt/nodejs/entitlements');` line
    - Confirmed via `grep_search` for `canUseFeature`/`assertPermission` across the full file that no
      remaining action in this file corresponds to a `FEATURE_CATALOG` key — every gated action
      (`member.invite`, `member.remove`, `budget.archive`, `budget.delete`, `budget.read`) is
      RBAC-only via `assertPermission`, matching design.md's investigation
    - Also fixed a stale reference in `backend/functions/budgets/README.md`'s "Layer Dependencies"
      section that still listed `/opt/nodejs/entitlements` — replaced with a note explaining why this
      Lambda does not import it
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 8.2 Delete `backend/functions/budgets/__mocks__/entitlements.js`
    - _Requirements: 4.5_
  - [x] 8.3 Remove the dead `moduleNameMapper` entry from `backend/functions/budgets/jest.config.js`
    - Removed only the `'^/opt/nodejs/entitlements$': '<rootDir>/__mocks__/entitlements.js'` line;
      kept the `/opt/nodejs/utils` mapping entry unchanged, since that layer is still used throughout
      `budgets/index.js`
    - Also removed a now-stale `/opt/nodejs/entitlements` line from `budgets.test.js`'s top-of-file
      "Mocks:" doc comment (found via the task 11.3 grep sweep)
    - _Requirements: 4.5_

- [x] 9. Checkpoint - Ensure Budgets_Handler tests pass
  - Ran `npx jest --verbose` in `backend/functions/budgets`. Result: `Test Suites: 1 passed, 1
    total`, `Tests: 12 passed, 12 total`. Nothing broke from the deletions. Re-ran again after the
    task 11.3 comment cleanup — still 12/12.

- [x] 10. Documentation updates
  - [x] 10.1 Correct `docs/product-requirements.md`'s Feature Gating / Subscription Tiers section
    - Read the live file first via `grep_search`/`read_file` and confirmed exact current line
      numbers and text (lines 139–140, 142, 156, 319) before editing
    - Changed the `budget.export` and `reports.advanced` table rows from tier `premium` to `free`
    - Replaced the "Phase 1: All features are free. The `canUseFeature()` pattern is wired but not
      enforced yet" note with text describing the shipped state: `canUseFeature()` is called from
      Export_Handler and every Advanced_Reports_Handler function, and both features are classified
      `tier: 'free'` because every user is on the same $0/month plan today, with Phase 2 re-gating by
      flipping only the `tier` field back to `'premium'`
    - Corrected the statement that `subscriptionTier` comes from the Cognito JWT claim
      `custom:subscriptionTier` to state it is read from the `USER#<userId>/PROFILE` DynamoDB record
      via `BudgetAccessResolver.resolveAccess`
    - Updated the Known Gaps list item "`canUseFeature()` not called in Lambda handlers" using the
      file's existing strikethrough-and-checkmark convention for resolved items (matching the
      precedent item directly above it: `~~**...**~~ ✅ **Fixed (Session 148)**`)
    - _Requirements: 5.5, 6.1, 6.2_
  - [x] 10.2 Remove the resolved item from the work-log's Known Open Items
    - Removed `- [ ] \`canUseFeature()\` not yet called in Lambda handlers - Phase 2: gate
      \`reports.advanced\`, \`budget.export\`` from `.kiro/steering/memory/work-log.md`'s Known Open
      Items > Security section (deletion, not checking off, per this document's existing convention
      — confirmed via grep that no other `canUseFeature` reference remains in that file)
    - _Requirements: 6.3_
  - [x] 10.3 Update `CHANGELOG.md` and `DEVELOPMENT_LOG.md`
    - Added a categorized `## [1.10.4]` `CHANGELOG.md` entry (catalog reclassification + entitlement
      enforcement wiring in export/insights + dead import removal in budgets + test coverage +
      documentation corrections)
    - Added a `## 2026-09-27 - Feature Entitlements Enforcement... (Session 166)` `DEVELOPMENT_LOG.md`
      entry with Problem/Approach/Verification/Changes sections matching the file's existing
      convention
    - _Requirements: 6.4_

- [x] 11. Final verification
  - [x] 11.1 Run all modified/new backend test suites
    - Ran `backend/layers/common/nodejs/entitlements.pbt.test.js` (3/3 passed),
      `backend/functions/export`'s suite (5/5 passed), `backend/functions/insights`'s suite (10/10
      passed), and `backend/functions/budgets`'s suite (12/12 passed) — 30/30 total, all pass
    - _Requirements: 4.1, 4.2, 4.3, 7.1, 7.2, 7.3_
  - [x] 11.2 Run root lint and type-check
    - Ran `npm run lint:check` (`eslint backend/functions/*/index.js`) at the repo root: **0 errors,
      35 warnings**, all pre-existing `max-lines`/`max-lines-per-function` style warnings unrelated
      to this change. Verified via `git stash` / re-run / `git stash pop` that the error count (0) is
      identical before and after this spec's changes to `export/index.js`, `insights/index.js`, and
      `budgets/index.js`. `export/index.js`'s handler crossed the 100-line
      `max-lines-per-function` soft threshold (108 lines, was under 100) as a direct, expected
      consequence of adding the gate — this is a pre-existing warning rule firing on new lines, not
      a new lint error
    - _Requirements: 3.1_
  - [x] 11.3 Confirm no remaining dead `canUseFeature` reference in `budgets/index.js`
    - Searched `backend/functions/budgets/**` for `canUseFeature`/`entitlements` via `grep_search`.
      Found zero references in `index.js` (task 8.1's removal was complete). Found two stale
      documentation references outside `index.js` — `README.md`'s "Layer Dependencies" list and
      `budgets.test.js`'s top-of-file doc comment — both fixed as part of tasks 8.1/8.3 respectively,
      and `budgets.test.js`'s fix was re-verified with a full test re-run (12/12 still passing)
    - _Requirements: 3.1, 3.2_

## Notes

- Tasks marked with `*` are optional (property test sub-tasks) and can be skipped for a faster MVP,
  but Requirement 7 specifically asks for this coverage, so skipping is not recommended.
- Task 1 (catalog reclassification) must run first: Property 3 (task 2.4), the export/insights
  allow-path tests, and the documentation corrections (task 10) all depend on the catalog stating
  `tier: 'free'` for both features.
- Export and Insights test scaffolding (tasks 4.2–4.5 and 6.2–6.5) are independent of each other and
  can be built in parallel, but each must land before its corresponding handler-wiring test file
  (4.6, 6.6–6.7).
- Budgets cleanup (task 8) has no dependency on export/insights wiring and can happen any time after
  task 1.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "4.2", "4.3", "6.2", "6.3", "8.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "4.4", "4.5", "6.4", "6.5", "8.2"] },
    { "id": 3, "tasks": ["4.1", "6.1", "8.3"] },
    { "id": 4, "tasks": ["4.6", "6.6"] },
    { "id": 5, "tasks": ["6.7"] },
    { "id": 6, "tasks": ["10.1", "10.2", "10.3", "11.1", "11.2", "11.3"] }
  ]
}
```
