# Requirements Document

## Introduction

This spec covers two independent, frontend-only backlog items in the BudgetBuddy web app
(`packages/web-app`), grouped together because both are low-to-medium complexity and neither
touches backend or infrastructure code:

1. **Wire `AiCoachChip` into the app.** The component is fully implemented but has zero
   consumers anywhere in the source tree, and is not rendered on any page. Prior documentation
   incorrectly describes it as already integrated on `BudgetPage.tsx`.
2. **Resolve the `packages/api-client` package.** The package has zero consumers in
   `packages/web-app` and zero consumers in `packages/mobile`. Its own root `package-lock.json`
   entry marks it `"extraneous": true` (npm's dependency graph does not consider it referenced by
   the workspace). All real API calls in both web-app and mobile go through separate,
   independently-implemented `services/*.ts` files.

Investigation performed prior to writing these requirements (see below) resolved both the mount
location for Item 1 and the disposition for Item 2, so no requirement below is left as an open
decision.

### Investigation Findings

**Item 1 — mount location.** `BudgetPage.tsx` already computes a `calculateTotals()` function
(rendered at the point `AiCoachChip` would mount) that returns `{ income, planned, spent,
remaining }` — four of the six fields `BudgetSummary` needs — by aggregating the same per-category
`plannedAmount`/`spentAmount` fields already in scope. Only `overBudgetCount` and
`topOverBudgetCategory` are missing, and both are derivable from data already iterated over in
that function. By contrast, `AppLayout.tsx` is a route-level, presentational-only wrapper (sidebar
and viewport logic) with no data fetching today, rendered on every authenticated route — mounting
there would require a new fetch call on every page navigation, not just `/budget`, to build a
`BudgetSummary` the component only needs while the user is looking at their budget. `BudgetPage.tsx`
is the resolved mount location.

**Item 2 — package disposition.** `packages/mobile` (React Native + Expo) has its own 23-file
`src/services/` directory (`auth.ts`, `budget.ts`, `transaction.ts`, etc.) mirroring the same
parallel-implementation pattern already used by `packages/web-app/src/services/`. Mobile's
`package.json` does not depend on `@budget-buddy/api-client`, and no spec or doc references it as
a planned consumer. Combined with zero web-app consumers and the `extraneous: true` flag in the
lockfile, `packages/api-client` is confirmed dead code with no current or planned consumer.
Deletion is the resolved disposition.

## Glossary

- **AiCoachChip**: The existing React component at
  `packages/web-app/src/components/AiCoachChip.tsx` that renders a floating, contextual button
  linking to `/insights`.
- **Budget_Page**: The `BudgetPage` component at `packages/web-app/src/pages/BudgetPage.tsx`.
- **Budget_Summary**: An object of shape `{ income, planned, spent, remaining, overBudgetCount,
  topOverBudgetCategory?, currency? }`, matching the `BudgetSummary` interface already defined in
  `AiCoachChip.tsx`.
- **Api_Client_Package**: The npm workspace package at `packages/api-client`
  (`@budget-buddy/api-client`).
- **Documentation_Set**: `docs/product-requirements.md`,
  `.kiro/specs/web-app-polish/design.md`, `.kiro/steering/structure.md`, and
  `.kiro/steering/architecture.md` — the four files confirmed during investigation to describe
  `AiCoachChip` as already integrated.

## Requirements

### Requirement 1: Derive Budget_Summary on Budget_Page

**User Story:** As a user viewing my budget, I want the app to know when my spending needs
attention, so that AiCoachChip can prompt me with a relevant, specific message instead of a
generic one.

#### Acceptance Criteria

1. THE Budget_Page SHALL compute a Budget_Summary from the categories already loaded for the
   current month.
2. WHEN the Budget_Page computes Budget_Summary, THE Budget_Page SHALL set `overBudgetCount` to
   the count of categories where `spentAmount` exceeds `plannedAmount`.
3. WHEN one or more categories have `spentAmount` exceeding `plannedAmount`, THE Budget_Page
   SHALL set `topOverBudgetCategory` to the name of the category with the largest difference
   between `spentAmount` and `plannedAmount`.
4. IF no category has `spentAmount` exceeding `plannedAmount`, THEN THE Budget_Page SHALL omit
   `topOverBudgetCategory` from Budget_Summary.
5. WHEN the Budget_Page computes Budget_Summary, THE Budget_Page SHALL set `income`, `planned`,
   `spent`, and `remaining` to the equivalent values already produced by the existing totals
   calculation for the current month.

### Requirement 2: Render AiCoachChip on Budget_Page

**User Story:** As a user viewing my budget, I want to see a floating AI coach prompt, so that I
can quickly start a relevant conversation with the AI coach about my current budget state.

#### Acceptance Criteria

1. WHILE a budget exists for the current month, THE Budget_Page SHALL render AiCoachChip with the
   computed Budget_Summary and `hasBudget` set to `true`.
2. IF no budget exists for the current month, THEN THE Budget_Page SHALL render AiCoachChip with
   `hasBudget` set to `false`.
3. WHEN a user activates AiCoachChip on the Budget_Page, THE Budget_Page SHALL navigate the user
   to `/insights`, matching AiCoachChip's existing built-in navigation behavior.
4. THE Budget_Page SHALL render AiCoachChip without introducing an additional network request
   beyond the data the Budget_Page already fetches to render its category totals.

### Requirement 3: Correct Documentation Describing AiCoachChip Integration

**User Story:** As a developer reading project documentation, I want the docs to accurately
reflect whether AiCoachChip is integrated, so that I do not rely on inaccurate claims about
shipped functionality.

#### Acceptance Criteria

1. THE Documentation_Set SHALL describe AiCoachChip's integration status consistently with its
   actual mount location once Requirement 2 is implemented.
2. WHERE a Documentation_Set file previously described AiCoachChip as integrated on
   `BudgetPage.tsx` before this spec's implementation, THE Documentation_Set SHALL retain that
   description unchanged, since Requirement 2 makes the description accurate rather than
   superseding it.

### Requirement 4: Remove the Unused Api_Client_Package

**User Story:** As a developer maintaining the monorepo, I want unused packages removed, so that
the codebase does not carry dead code that could mislead future contributors into thinking it is
in use.

#### Acceptance Criteria

1. THE repository SHALL NOT contain the `packages/api-client` directory after this spec's
   implementation.
2. THE repository's root `tsconfig.json` SHALL NOT contain a path mapping referencing
   `@budget-buddy/api-client` after this spec's implementation.
3. IF any file outside `packages/api-client` references `@budget-buddy/api-client` at the start of
   this spec's implementation, THEN THE implementation SHALL update or remove that reference so
   that no reference to `@budget-buddy/api-client` remains in the repository.
4. WHEN the Api_Client_Package is removed, THE repository's root `package-lock.json` SHALL NOT
   contain a `packages/api-client` workspace entry.

### Requirement 5: Correct Documentation Referencing the Removed Api_Client_Package

**User Story:** As a developer reading project documentation, I want references to the removed
api-client package cleaned up, so that docs do not point to a package that no longer exists.

#### Acceptance Criteria

1. THE `docs/README.md` file SHALL NOT contain a link to `packages/api-client/README.md` after
   this spec's implementation.
2. IF any file under `docs/` references `packages/api-client` at the start of this spec's
   implementation, THEN THE implementation SHALL remove or update that reference so that no
   reference to the removed package remains under `docs/`.
