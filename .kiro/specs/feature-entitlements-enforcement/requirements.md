# Requirements Document

## Introduction

`canUseFeature(subscriptionTier, featureKey)` and `FEATURE_CATALOG` are fully implemented in
`backend/layers/common/nodejs/entitlements.js`, but no Lambda handler calls `canUseFeature` to make
an actual allow/deny decision. `backend/functions/budgets/index.js` imports it behind an
eslint-disable comment marked "Phase 2," and that is the only Lambda that references the module at
all. Two catalog entries are currently tier `premium`: `reports.advanced` and `budget.export`.
Everything else in the catalog is tier `free`.

Investigation confirmed that every current user is genuinely on a single $0/month subscription
tier — this is not a placeholder awaiting a billing integration, it is the actual current state of
the product. `subscriptionTier` is read by `BudgetAccessResolver.resolveAccess` from the
`USER#<userId>/PROFILE` DynamoDB record (`profile.subscriptionTier || 'free'`), and every code path
that writes that record today (`backend/functions/auth/index.js`,
`backend/functions/auth-register/index.js`) hard-codes the value `'free'`. No code path anywhere in
the backend ever writes `'premium'`, and there is no billing integration.

Given that reality, this spec takes the following approach instead of enforcing a tier distinction
that does not yet exist for any real user:

- `FEATURE_CATALOG` entries for `budget.export` and `reports.advanced` are reclassified from
  `tier: 'premium'` to `tier: 'free'`, matching the actual current product state. Per
  `canUseFeature`'s existing logic, a `free`-tier catalog entry returns `true` regardless of the
  caller's `subscriptionTier`, so this reclassification does not change behavior for any user today.
- `canUseFeature` is still wired into `backend/functions/export/index.js` (`budget.export`) and all
  five handlers in `backend/functions/insights/index.js` (`reports.advanced`), per the standing
  steering rule that Lambdas must never check `subscriptionTier` directly and must always call
  `canUseFeature`. This makes the call-site structurally ready: when Phase 2 billing introduces a
  real premium tier, gating activates by flipping these two catalog entries back to
  `tier: 'premium'` in `entitlements.js` — no Lambda code changes are needed at that time. This is
  the design intent already documented in `entitlements.js`'s own JSDoc ("Phase 2 will move selected
  features... to tier: 'premium'... only this file needs to change").
- It also resolves the dead import in `backend/functions/budgets/index.js`.
- It corrects a documentation inaccuracy in `docs/product-requirements.md`, which currently states
  `subscriptionTier` comes from a Cognito JWT claim; it actually comes from the DynamoDB
  `USER#<userId>/PROFILE` record via `BudgetAccessResolver.resolveAccess`.

Also confirmed during investigation, correcting assumptions in the original ask:
- `backend/functions/budgets/index.js` has no action anywhere in its body that corresponds to any
  `FEATURE_CATALOG` key. Every action it gates is RBAC-only (`member.invite`, `member.remove`,
  `budget.archive`, `budget.delete`, `budget.read`). The import is dead code with no other gated
  action to attach it to in that file.
- Neither `backend/functions/export/` nor `backend/functions/insights/` has an existing test file.
  `backend/functions/export/package.json`'s `test` script is a placeholder
  (`echo "Error: no test specified" && exit 1`) and neither function's `package.json` lists
  `fast-check` as a dev dependency yet.
- `backend/functions/budgets/__mocks__/entitlements.js` (a Jest manual mock of `canUseFeature`
  returning `true` always) exists but is not currently imported or exercised by any test — `budgets`
  has no test that calls a `canUseFeature`-gated action, because no such action exists in that file.

## Glossary

- **Entitlement_Module**: `backend/layers/common/nodejs/entitlements.js`, exporting `FEATURE_CATALOG`
  and `canUseFeature(subscriptionTier, featureKey)`.
- **Export_Handler**: The Lambda handler function in `backend/functions/export/index.js` bound to
  `exports.handler`, which dispatches to CSV, JSON, and PDF export logic based on a `type` query
  parameter.
- **Insights_Handler**: Collectively, the five route-dispatched functions in
  `backend/functions/insights/index.js`: `getWeeklyInsights`, `getMonthlyInsights`,
  `getSpendingTrends`, `getSpendingPatterns`, `askAboutSpending`.
- **Advanced_Reports_Handler**: All five Insights_Handler functions —
  `getWeeklyInsights`, `getMonthlyInsights`, `getSpendingTrends`, `getSpendingPatterns`,
  `askAboutSpending` — each corresponding to the `reports.advanced` feature key. There is no subset
  of Insights_Handler functions excluded from this mapping.
- **Budgets_Handler**: The Lambda handler in `backend/functions/budgets/index.js`.
- **Subscription_Tier**: The string value `'free'` or `'premium'` returned as `subscriptionTier` by
  `BudgetAccessResolver.resolveAccess`, sourced from `USER#<userId>/PROFILE.subscriptionTier` in
  DynamoDB (default `'free'` when absent).
- **Upgrade_Prompt_Response**: An HTTP 403 response whose body includes a human-readable message
  indicating the endpoint requires a premium subscription, distinguishable from an RBAC-denial 403.

## Requirements

### Requirement 1: Gate budget export on the `budget.export` entitlement

**User Story:** As a product owner, I want the export endpoint to check the caller's subscription
entitlement before generating export output, so that export stays consistent with the documented
Phase 2 gating pattern, and so that re-gating this endpoint when a real premium tier ships requires
no Lambda code changes.

#### Acceptance Criteria

1. WHEN a request to Export_Handler passes RBAC (`BudgetAccessResolver.assertPermission` succeeds)
   and `canUseFeature(subscriptionTier, 'budget.export')` returns `true`, THE Export_Handler SHALL
   proceed to generate the requested export in the format given by the `type` query parameter.
2. IF a request to Export_Handler passes RBAC and `canUseFeature(subscriptionTier, 'budget.export')`
   returns `false`, THEN THE Export_Handler SHALL return an Upgrade_Prompt_Response and SHALL NOT
   execute any export-generation logic (CSV, JSON, or PDF).
3. THE Export_Handler SHALL obtain `subscriptionTier` from the object already returned by its
   existing `BudgetAccessResolver.resolveAccess` call, and SHALL NOT issue a separate DynamoDB read
   to obtain `subscriptionTier`.
4. THE Export_Handler SHALL perform the `canUseFeature('budget.export')` check for every export
   `type` value it supports (`csv`, `json`, `pdf`), rather than gating only a subset of export
   formats.
5. WHERE the `type` query parameter is invalid (not `csv`, `json`, or `pdf`), THE Export_Handler
   SHALL preserve its existing 400 response behavior, evaluated independently of the entitlement
   check.
6. BECAUSE Requirement 5 reclassifies the `budget.export` catalog entry to `tier: 'free'`, THE
   Acceptance Criterion 1 allow path SHALL be the path every current user's request takes; the
   Acceptance Criterion 2 deny path SHALL NOT be reachable through Export_Handler's actual
   `resolveAccess`-sourced `subscriptionTier` for any real user until a Phase 2 billing change
   reintroduces a `'premium'` tier, and until then it functions as a regression guard rather than a
   currently user-reachable state.

### Requirement 2: Gate all Insights_Handler functions on the `reports.advanced` entitlement

**User Story:** As a product owner, I want every spending-insights capability gated by the
`reports.advanced` entitlement, so that all five Insights_Handler functions stay consistent with the
documented Phase 2 gating pattern, and so that re-gating this endpoint when a real premium tier ships
requires no Lambda code changes.

#### Acceptance Criteria

1. THE Advanced_Reports_Handler set SHALL comprise all five Insights_Handler functions:
   `getWeeklyInsights`, `getMonthlyInsights`, `getSpendingTrends`, `getSpendingPatterns`, and
   `askAboutSpending`.
2. WHEN a request to any Advanced_Reports_Handler function passes RBAC and
   `canUseFeature(subscriptionTier, 'reports.advanced')` returns `true`, THE Advanced_Reports_Handler
   function SHALL proceed to return its normal successful response.
3. IF a request to any Advanced_Reports_Handler function passes RBAC and
   `canUseFeature(subscriptionTier, 'reports.advanced')` returns `false`, THEN THE
   Advanced_Reports_Handler function SHALL return an Upgrade_Prompt_Response and SHALL NOT execute
   any DynamoDB query, Bedrock invocation, or computation beyond RBAC resolution.
4. THE Insights_Handler SHALL obtain `subscriptionTier` from the object already returned by its
   existing `BudgetAccessResolver.resolveAccess` call within each handler function, and SHALL NOT
   issue a separate DynamoDB read to obtain `subscriptionTier`.
5. BECAUSE Requirement 5 reclassifies the `reports.advanced` catalog entry to `tier: 'free'`, THE
   Acceptance Criterion 2 allow path SHALL be the path every current user's request takes for all
   five Advanced_Reports_Handler functions; the Acceptance Criterion 3 deny path SHALL NOT be
   reachable through Insights_Handler's actual `resolveAccess`-sourced `subscriptionTier` for any
   real user until a Phase 2 billing change reintroduces a `'premium'` tier, and until then it
   functions as a regression guard rather than a currently user-reachable state.

### Requirement 3: Resolve the dead entitlement import in Budgets_Handler

**User Story:** As a maintainer, I want the `canUseFeature` import in `budgets/index.js` to either
gate a real action or be removed, so that the codebase does not carry an eslint-suppressed unused
import indefinitely.

#### Acceptance Criteria

1. THE Budgets_Handler file SHALL NOT contain an import of `canUseFeature` paired with an
   eslint-disable comment justified by "future Phase 2 use" once this requirement is implemented.
2. IF investigation confirms no action within Budgets_Handler corresponds to any key in
   `FEATURE_CATALOG` (matching this document's Introduction finding), THEN THE Budgets_Handler file
   SHALL have the `canUseFeature` import and its associated eslint-disable comment removed.
3. WHERE a future feature key is later added to `FEATURE_CATALOG` that corresponds to a
   Budgets_Handler action, THE addition of that gating check SHALL be treated as a new, separate
   change and is out of scope for this requirement.

### Requirement 4: Test coverage for both gated endpoints

**User Story:** As a maintainer, I want automated tests proving both the allow and deny paths of
each newly gated endpoint, so that a future change to `entitlements.js` or to these handlers cannot
silently break enforcement, even though the deny path is not reachable by any real user today.

#### Acceptance Criteria

1. THE test suite for Export_Handler SHALL include at least one test per supported export `type`
   (`csv`, `json`, `pdf`) asserting that a `free`-tier `subscriptionTier` (the only tier any real
   user carries today) produces a successful export response, confirming the reclassified
   `budget.export` catalog entry allows every current user through.
2. THE test suite for each of the five Advanced_Reports_Handler functions SHALL include at least
   one test asserting that a `free`-tier `subscriptionTier` produces a successful response,
   confirming the reclassified `reports.advanced` catalog entry allows every current user through.
3. BECAUSE no real user's `subscriptionTier` can currently resolve to `'premium'` through
   `BudgetAccessResolver.resolveAccess`, THE deny branch of both Export_Handler and
   Advanced_Reports_Handler functions SHALL be exercised by tests using a synthetic
   `subscriptionTier: 'premium'`-requiring scenario constructed either by mocking
   `BudgetAccessResolver.resolveAccess` to return a `subscriptionTier` other than `'free'`, or by
   mocking `canUseFeature`/`FEATURE_CATALOG` directly to simulate a `tier: 'premium'` catalog entry;
   THE concrete mechanism SHALL be selected during the design phase and is not decided by this
   document.
4. WHERE `backend/functions/export/package.json` or `backend/functions/insights/package.json` does
   not yet declare `jest` and `fast-check` as dev dependencies with a working `test` script, THE
   package.json for that function SHALL be updated to declare them before test files are added.
5. THE `backend/functions/budgets/__mocks__/entitlements.js` manual mock SHALL either be removed (if
   Requirement 3 resolves to deleting the dead import, leaving nothing in that file to mock) or
   exercised by at least one test (if Requirement 3 resolves to wiring a real gated action).

### Requirement 5: Reclassify `budget.export` and `reports.advanced` to free tier in the catalog

**User Story:** As a product owner, I want `FEATURE_CATALOG` to reflect that every current user is
on the same $0/month tier, so that the catalog is truthful about today's product state while keeping
the gating call-sites ready for when a real premium tier exists.

#### Acceptance Criteria

1. THE Entitlement_Module's `FEATURE_CATALOG` entry for `'budget.export'` SHALL have its `tier`
   field changed from `'premium'` to `'free'`.
2. THE Entitlement_Module's `FEATURE_CATALOG` entry for `'reports.advanced'` SHALL have its `tier`
   field changed from `'premium'` to `'free'`.
3. THE Entitlement_Module's JSDoc SHALL be updated to state that `'budget.export'` and
   `'reports.advanced'` are classified `tier: 'free'` because every current user is on the same
   $0/month plan, rather than describing them as premium-gated today.
4. THE Entitlement_Module's JSDoc SHALL retain or add a statement that Phase 2 billing re-gates
   these two features by changing only their `tier` field back to `'premium'` in `FEATURE_CATALOG`,
   with no Lambda handler code changes required, consistent with the call-sites wired by
   Requirements 1 and 2.
5. `docs/product-requirements.md`'s Feature Gating or Subscription Tiers section SHALL document both
   the current reclassification (Acceptance Criteria 1–2) and the future re-gating path (Acceptance
   Criterion 4), so that this state is captured in product documentation rather than only in code
   comments.

### Requirement 6: Correct documentation describing `subscriptionTier`'s source

**User Story:** As a maintainer, I want documentation about where `subscriptionTier` comes from to
match the actual code path, so that future engineers do not implement a JWT-claim-based check that
`BudgetAccessResolver.resolveAccess` does not actually use.

#### Acceptance Criteria

1. `docs/product-requirements.md`'s statement that `subscriptionTier` comes from the Cognito JWT
   claim `custom:subscriptionTier` SHALL be corrected to state that `subscriptionTier` is read from
   the DynamoDB `USER#<userId>/PROFILE` record via `BudgetAccessResolver.resolveAccess`.
2. WHEN this spec's implementation ships, THE `docs/product-requirements.md` "Phase 1" note stating
   "All features are free. The `canUseFeature()` pattern is wired but not enforced yet" SHALL be
   updated to describe the shipped state: `canUseFeature()` is called from Export_Handler and every
   Advanced_Reports_Handler function, and `budget.export`/`reports.advanced` are classified
   `tier: 'free'` per Requirement 5.
3. WHEN this spec's implementation ships, THE work-log's "Known Open Items > Security" entry reading
   "`canUseFeature()` not yet called in Lambda handlers - Phase 2: gate `reports.advanced`,
   `budget.export`" SHALL be removed or marked complete, consistent with the Work Log documentation
   convention already in place for this repository.
4. THE `CHANGELOG.md` and `DEVELOPMENT_LOG.md` SHALL be updated per the project's existing
   Documentation Standards for the commit(s) that implement this spec.

### Requirement 7: Property-based test target for `canUseFeature`

**User Story:** As a maintainer, I want `canUseFeature`'s fail-closed and tier-comparison behavior
verified across the full space of inputs, not just a handful of hand-picked examples, so that a
future edit to `entitlements.js` cannot silently weaken the security guarantee every gated endpoint
depends on.

#### Acceptance Criteria

1. THE design produced from this document SHALL specify property-based tests, using `fast-check`
   (already a dependency of `backend/layers/common/nodejs/package.json`), covering: for all
   `featureKey` values not present in `FEATURE_CATALOG`, `canUseFeature` returns `false` regardless
   of `subscriptionTier`.
2. THE design produced from this document SHALL specify a property-based test covering: for all
   `featureKey` values whose catalog entry has `tier: 'free'`, `canUseFeature` returns `true`
   regardless of the `subscriptionTier` argument value.
3. THE design produced from this document SHALL specify a property-based test covering: for all
   `featureKey` values whose catalog entry has `tier: 'premium'`, `canUseFeature` returns `true` if
   and only if `subscriptionTier === 'premium'`.
4. THIS requirement covers `canUseFeature` itself, a pure function with no AWS or DynamoDB
   dependency; it does not extend to the Export_Handler or Insights_Handler integration tests
   described in Requirement 4, which remain example-based per Requirement 4.
</content>
