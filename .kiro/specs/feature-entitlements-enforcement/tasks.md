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

- [ ] 1. Reclassify `budget.export` and `reports.advanced` to `tier: 'free'` in the catalog
  - In `backend/layers/common/nodejs/entitlements.js`, change the `FEATURE_CATALOG` entry for
    `'budget.export'` from `tier: 'premium'` to `tier: 'free'`
  - Change the `FEATURE_CATALOG` entry for `'reports.advanced'` from `tier: 'premium'` to
    `tier: 'free'`
  - Update the module JSDoc to state both features are `tier: 'free'` because every current user is
    on the same $0/month plan, and retain/add a statement that Phase 2 billing re-gates them by
    flipping only the `tier` field back to `'premium'` — no Lambda handler changes required at that
    time
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 2. Property-based tests for `canUseFeature`
  - [ ] 2.1 Create `backend/layers/common/nodejs/entitlements.pbt.test.js`
    - Set up `fc.assert(fc.property(...))` scaffolding following the existing `*.pbt.test.js`
      convention in this repo, importing `canUseFeature` and `FEATURE_CATALOG` from `./entitlements`
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ]* 2.2 Write Property 1: unknown feature keys always deny
    - **Property 1: Unknown feature keys always deny** — for any `featureKey` not present in
      `FEATURE_CATALOG` and any `subscriptionTier`, `canUseFeature` returns `false`
    - `numRuns: 100`
    - **Validates: Requirements 7.1**
  - [ ]* 2.3 Write Property 2: free-tier features are always allowed
    - **Property 2: Free-tier features are always allowed** — for any `featureKey` whose catalog
      entry has `tier: 'free'` and any `subscriptionTier`, `canUseFeature` returns `true`
    - `numRuns: 100`
    - **Validates: Requirements 7.2**
  - [ ]* 2.4 Write Property 3: premium-tier features allowed iff caller tier is premium
    - **Property 3: Premium-tier features are allowed if and only if the caller's tier is premium**
      — for any `featureKey` whose catalog entry has `tier: 'premium'` and any `subscriptionTier`,
      `canUseFeature` returns `true` iff `subscriptionTier === 'premium'`
    - Because task 1 leaves zero `tier: 'premium'` entries in the live catalog, construct a local
      fixture catalog inside this test (e.g. via `jest.isolateModules` + `jest.doMock('./entitlements', ...)`
      injecting a `'test.premium.feature': { tier: 'premium', ... }` entry, per design.md's example) —
      do not rely on the live `FEATURE_CATALOG` for this property
    - `numRuns: 100`
    - **Validates: Requirements 7.3**

- [ ] 3. Checkpoint - Ensure entitlements tests pass
  - Run `backend/layers/common/nodejs/entitlements.pbt.test.js` and confirm all three properties
    pass. Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Wire `canUseFeature` into Export_Handler
  - [ ] 4.1 Add the entitlement gate to `backend/functions/export/index.js`
    - Import `canUseFeature` from `/opt/nodejs/entitlements`
    - Destructure `subscriptionTier` from the existing `BudgetAccessResolver.resolveAccess(...)`
      result (no additional DynamoDB read)
    - Insert a single `if (!canUseFeature(subscriptionTier, 'budget.export'))` check immediately
      after the existing `assertPermission` call and before the `exportType` (`csv`/`json`/`pdf`)
      dispatch, so the gate covers every export type with one check
    - On deny, return the Upgrade_Prompt_Response: `{ statusCode: 403, headers: getCorsHeaders(),
      body: JSON.stringify({ error: 'Upgrade required', message: 'Exporting budget data requires a
      premium subscription.' }) }`
    - Leave the existing 400 response for an unsupported `type` query value untouched and evaluated
      independently of the entitlement check
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [ ] 4.2 Fix `backend/functions/export/package.json` test scaffolding
    - Replace the placeholder `test` script (`echo "Error: no test specified" && exit 1`) with
      `"test": "jest"` and add `"test:coverage": "jest --coverage"`
    - Add `fast-check` and `jest` as pinned dev dependencies, matching `budgets/package.json`'s exact
      version pins
    - _Requirements: 4.4_
  - [ ] 4.3 Create `backend/functions/export/jest.config.js`
    - Mirror `backend/functions/budgets/jest.config.js` exactly: `testEnvironment: 'node'`,
      `testMatch` for `*.test.js`/`*.pbt.test.js`, `collectCoverageFrom`, `coverageThreshold` (60%
      branches/functions/lines/statements), and a `moduleNameMapper` mapping
      `^/opt/nodejs/utils$` → `<rootDir>/__mocks__/utils.js` and `^/opt/nodejs/entitlements$` →
      `<rootDir>/__mocks__/entitlements.js`
    - _Requirements: 4.4_
  - [ ] 4.4 Create `backend/functions/export/__mocks__/utils.js`
    - Mock only what `export/index.js` actually imports from `/opt/nodejs/utils`: `getUserFromEvent`,
      `dynamoHelpers.queryByPK`, and `BudgetAccessResolver` (`resolveAccess` defaulting to
      `subscriptionTier: 'free'`, `assertPermission` as a no-op jest.fn)
    - _Requirements: 4.4_
  - [ ] 4.5 Create `backend/functions/export/__mocks__/entitlements.js`
    - Same shape as `backend/functions/budgets/__mocks__/entitlements.js`: `canUseFeature =
      jest.fn(() => true)` by default
    - _Requirements: 4.4_
  - [ ] 4.6 Create `backend/functions/export/export.test.js`
    - Test 1: `type=csv` with default (free-tier) mocks → 200 with CSV body — _Requirements: 4.1, 1.1, 1.4_
    - Test 2: `type=json` with default mocks → 200 with JSON body — _Requirements: 4.1, 1.1, 1.4_
    - Test 3: `type=pdf` with default mocks → 200 (existing "PDF being prepared" response) —
      _Requirements: 4.1, 1.1, 1.4_
    - Test 4: `type=csv` with `canUseFeature` mocked to return `false`
      (`require('/opt/nodejs/entitlements').canUseFeature.mockReturnValueOnce(false)`) → 403
      Upgrade_Prompt_Response, and assert `dynamoHelpers.queryByPK` was NOT called —
      _Requirements: 4.3, 1.2_
    - Test 5: `type=invalidformat` with default mocks → existing 400 response, independent of the
      entitlement check — _Requirements: 1.5_

- [ ] 5. Checkpoint - Ensure Export_Handler tests pass
  - Run `backend/functions/export`'s test suite and confirm all 5 cases pass. Ensure all tests pass,
    ask the user if questions arise.

- [ ] 6. Wire `canUseFeature` into Insights_Handler (all five functions)
  - [ ] 6.1 Add the entitlement gate to `backend/functions/insights/index.js`
    - Import `canUseFeature` from `/opt/nodejs/entitlements` once at the top of the file
    - In each of `getWeeklyInsights`, `getMonthlyInsights`, `getSpendingTrends`,
      `getSpendingPatterns`, and `askAboutSpending`, destructure `subscriptionTier` from that
      function's existing `BudgetAccessResolver.resolveAccess(...)` result and insert an identical
      `if (!canUseFeature(subscriptionTier, 'reports.advanced'))` check immediately after that
      function's existing `assertPermission` call and before any `dynamoHelpers` query, Bedrock
      invocation, or other computation
    - On deny, return the Upgrade_Prompt_Response: `{ statusCode: 403, headers: {
      'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Upgrade required', message: 'Advanced spending reports require
      a premium subscription.' }) }`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ] 6.2 Add `fast-check` to `backend/functions/insights/package.json`
    - Keep the existing `"test": "jest"` script; add `fast-check` as a pinned dev dependency
      alongside the existing `jest` dependency
    - _Requirements: 4.4_
  - [ ] 6.3 Create `backend/functions/insights/jest.config.js`
    - Same structure as `backend/functions/export/jest.config.js` (task 4.3): `testEnvironment`,
      `testMatch`, `collectCoverageFrom`, `coverageThreshold`, and a `moduleNameMapper` mapping both
      `^/opt/nodejs/utils$` and `^/opt/nodejs/entitlements$` to local `__mocks__/` files
    - _Requirements: 4.4_
  - [ ] 6.4 Create `backend/functions/insights/__mocks__/utils.js`
    - Mock all seven members `insights/index.js` imports from `/opt/nodejs/utils`:
      `successResponse`, `errorResponse` (with `badRequest`/`notFound`/`unauthorized`/
      `internalError`), `parseRequestBody`, `getUserFromEvent`, `dynamoHelpers` (`getItem`,
      `putItem`, `queryByPK`), `logger` (`info`/`warn`/`error`), and `BudgetAccessResolver`
      (`resolveAccess` defaulting to `subscriptionTier: 'free'`, `assertPermission` as a no-op)
    - _Requirements: 4.4_
  - [ ] 6.5 Create `backend/functions/insights/__mocks__/entitlements.js`
    - Identical to `backend/functions/budgets/__mocks__/entitlements.js`
    - _Requirements: 4.4_
  - [ ] 6.6 Swap `insights.test.js`'s mock mechanism from inline `jest.mock` to `moduleNameMapper`
    - Remove the existing inline `jest.mock('/opt/nodejs/utils', () => ({...}), { virtual: true })`
      block at the top of `backend/functions/insights/insights.test.js`
    - Replace it with a plain `require('/opt/nodejs/utils')` that now resolves via the
      `moduleNameMapper` entry created in task 6.3, pointing at the mock created in task 6.4
    - Do not alter any existing `describe`/`it` test bodies beyond this mock-source swap — their
      existing `dynamoHelpers.queryByPK.mockResolvedValue(...)`-style assertions must keep working
      unchanged
    - _Requirements: 4.4_
  - [ ] 6.7 Add new allow-path and deny-path test cases to `insights.test.js`
    - Test 1: `GET /insights/weekly` with default (free-tier) mocks → 200 —
      _Requirements: 4.2, 2.2_
    - Test 2: `GET /insights/monthly` with default mocks → 200 — _Requirements: 4.2, 2.2_
    - Test 3: `GET /insights/trends` with default mocks → 200 — _Requirements: 4.2, 2.2_
    - Test 4: `GET /insights/patterns` with default mocks → 200 — _Requirements: 4.2, 2.2_
    - Test 5: `POST /insights/ask` with default mocks → 200 — _Requirements: 4.2, 2.2_
    - Test 6: one representative handler (`GET /insights/weekly`) with `canUseFeature` mocked to
      return `false` → 403 Upgrade_Prompt_Response, and assert `dynamoHelpers.queryByPK` was NOT
      called — _Requirements: 4.3, 2.3_

- [ ] 7. Checkpoint - Ensure Insights_Handler tests pass
  - Run `backend/functions/insights`'s test suite and confirm all 6 new cases pass alongside the
    pre-existing tests. Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Remove the dead `canUseFeature` import from Budgets_Handler
  - [ ] 8.1 Delete the dead import from `backend/functions/budgets/index.js`
    - Remove the 3 lines: the `// canUseFeature is imported for future entitlement checks (Phase 2)`
      comment, the `// eslint-disable-next-line no-unused-vars` comment, and the
      `const { canUseFeature } = require('/opt/nodejs/entitlements');` line
    - Confirm no remaining action in this file corresponds to a `FEATURE_CATALOG` key before deleting
      (every gated action here is RBAC-only per design.md's investigation)
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ] 8.2 Delete `backend/functions/budgets/__mocks__/entitlements.js`
    - _Requirements: 4.5_
  - [ ] 8.3 Remove the dead `moduleNameMapper` entry from `backend/functions/budgets/jest.config.js`
    - Remove only the `'^/opt/nodejs/entitlements$': '<rootDir>/__mocks__/entitlements.js'` line;
      keep the `/opt/nodejs/utils` mapping entry unchanged, since that layer is still used throughout
      `budgets/index.js`
    - _Requirements: 4.5_

- [ ] 9. Checkpoint - Ensure Budgets_Handler tests pass
  - Run `backend/functions/budgets`'s test suite and confirm nothing broke from the deletions.
    Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Documentation updates
  - [ ] 10.1 Correct `docs/product-requirements.md`'s Feature Gating / Subscription Tiers section
    - Read the live file first to confirm exact current line numbers and text (design.md flags this
      needs re-confirmation at execution time)
    - Change the `budget.export` and `reports.advanced` table rows from tier `premium` to `free`
    - Replace the "Phase 1: All features are free. The `canUseFeature()` pattern is wired but not
      enforced yet" note with text describing the shipped state: `canUseFeature()` is called from
      Export_Handler and every Advanced_Reports_Handler function, and both features are classified
      `tier: 'free'` because every user is on the same $0/month plan today, with Phase 2 re-gating by
      flipping only the `tier` field back to `'premium'`
    - Correct the statement that `subscriptionTier` comes from the Cognito JWT claim
      `custom:subscriptionTier` to state it is read from the `USER#<userId>/PROFILE` DynamoDB record
      via `BudgetAccessResolver.resolveAccess`
    - Update or remove the Known Issues list item "`canUseFeature()` not called in Lambda handlers,"
      following the file's existing strikethrough-and-checkmark convention for resolved items (e.g.
      the precedent one item above it: `~~**...**~~ ✅ **Fixed (Session ...)**`)
    - _Requirements: 5.5, 6.1, 6.2_
  - [ ] 10.2 Remove the resolved item from the work-log's Known Open Items
    - Remove `- [ ] \`canUseFeature()\` not yet called in Lambda handlers - Phase 2: gate
      \`reports.advanced\`, \`budget.export\`` from the Known Open Items > Security section (deletion,
      not checking off, per this document's existing convention)
    - _Requirements: 6.3_
  - [ ] 10.3 Update `CHANGELOG.md` and `DEVELOPMENT_LOG.md`
    - Add a categorized `CHANGELOG.md` entry for this change (catalog reclassification + entitlement
      enforcement wiring in export/insights + dead import removal in budgets)
    - Add a `DEVELOPMENT_LOG.md` session entry summarizing the work per the project's Documentation
      Standards
    - _Requirements: 6.4_

- [ ] 11. Final verification
  - [ ] 11.1 Run all modified/new backend test suites
    - Run `backend/layers/common/nodejs/entitlements.pbt.test.js`,
      `backend/functions/export`'s suite, `backend/functions/insights`'s suite, and
      `backend/functions/budgets`'s suite; confirm all pass
    - _Requirements: 4.1, 4.2, 4.3, 7.1, 7.2, 7.3_
  - [ ] 11.2 Run root lint and type-check
    - Confirm no lint errors were introduced by the deletions in `budgets/index.js` or the additions
      in `export/index.js` / `insights/index.js`
    - _Requirements: 3.1_
  - [ ] 11.3 Confirm no remaining dead `canUseFeature` reference in `budgets/index.js`
    - Search `backend/functions/budgets/index.js` for any remaining `canUseFeature` reference or
      `eslint-disable` comment related to it, confirming task 8.1's removal was complete
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
