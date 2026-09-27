# Implementation Plan: Web App Followups

## Overview

This plan covers two independent tracks:

1. **AiCoachChip wiring** (Requirements 1, 2) — extract `calculateOverBudgetInfo()` into a
   testable utility, extend `BudgetPage.tsx`'s `calculateTotals()` to use it, and mount
   `<AiCoachChip />` in the page's JSX.
2. **`packages/api-client` removal** (Requirements 4, 5) — delete the dead package and every
   live reference to it (`tsconfig.json`, `package-lock.json`, `docs/README.md`).

**Requirement 3 has no task.** Per design.md's "Requirement 3 — no doc changes needed (confirmed
no-op)" section, Requirement 3 is satisfied automatically once Requirement 2 (task 5) ships —
the documentation already describes `AiCoachChip` as integrated on `BudgetPage.tsx`, and mounting
it there makes that description accurate rather than obsolete. No documentation edit is needed
or should be made for Requirement 3.

## Tasks

- [ ] 1. Create `packages/web-app/src/utils/overBudgetInfo.ts`
  - Define `CategoryLike` interface (`name: string`, `plannedAmount: number`, `spentAmount: number`)
  - Define `OverBudgetInfo` interface (`overBudgetCount: number`, `topOverBudgetCategory?: string`)
  - Implement and export `calculateOverBudgetInfo(categories: CategoryLike[]): OverBudgetInfo` using the single-pass loop from design.md: strict `diff > topOverBudgetAmount` comparison (never `>=`) so the first-encountered category wins ties
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ]* 1.1 Write property tests for `calculateOverBudgetInfo` in `packages/web-app/src/utils/overBudgetInfo.pbt.test.ts`
  - Use `fast-check`, one `fc.assert(fc.property(...))` per property, `{ numRuns: 100 }`
  - Generator: array of `CategoryLike` with index-suffixed unique names, `plannedAmount`/`spentAmount` covering negative, zero, and positive values
  - **Property 1: Over-budget count matches positive-difference count** — `overBudgetCount` equals the number of categories where `spentAmount > plannedAmount`
    - Tag: `// Feature: web-app-followups, Property 1: overBudgetCount equals count of categories where spentAmount > plannedAmount`
    - **Validates: Requirements 1.2**
  - **Property 2: Top category presence matches over-budget count** — `topOverBudgetCategory` is `undefined` if and only if `overBudgetCount` is `0`
    - Tag: `// Feature: web-app-followups, Property 2: topOverBudgetCategory is undefined iff overBudgetCount is 0`
    - **Validates: Requirements 1.3, 1.4**
  - **Property 3: Top category is the first-encountered largest overage** — `topOverBudgetCategory` names a category whose difference is `>=` every other category's difference, and is the first such category in input order among ties
    - Tag: `// Feature: web-app-followups, Property 3: topOverBudgetCategory is the first-encountered category with the maximum positive difference`
    - **Validates: Requirements 1.3**

- [ ]* 1.2 Write unit tests for `calculateOverBudgetInfo` in `packages/web-app/src/utils/overBudgetInfo.test.ts`
  - Empty array → `{ overBudgetCount: 0, topOverBudgetCategory: undefined }`
  - All categories at or under budget → `overBudgetCount: 0`, `topOverBudgetCategory: undefined`
  - Exactly one category over budget → that category's name reported
  - Two categories tied for the largest overage → the first one in the input array is reported
  - _Requirements: 1.2, 1.3, 1.4_

- [ ] 2. Extend `calculateTotals()` in `BudgetPage.tsx` to compute `overBudgetCount`/`topOverBudgetCategory`
  - Import `calculateOverBudgetInfo` from `../utils/overBudgetInfo`
  - Call `calculateOverBudgetInfo(nonIncomeCategories)` (via `nonIncomeGroups.flatMap((group) => group.categories)`) and spread its result into `calculateTotals()`'s return object, extending the return shape to `{ income, planned, spent, remaining, overBudgetCount, topOverBudgetCategory? }`
  - Update the `!budget` early-return branch to include `overBudgetCount: 0` with `topOverBudgetCategory` omitted
  - Update the `!Array.isArray(budget.groups)` early-return branch to include `overBudgetCount: 0` with `topOverBudgetCategory` omitted
  - Update the external call-site ternary fallback (`budget ? calculateTotals() : { income: 0, planned: 0, spent: 0, remaining: 0 }`) to also include `overBudgetCount: 0, topOverBudgetCategory: undefined`, keeping all three fallback sites in sync with the extended return type
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 3. Mount `AiCoachChip` in `BudgetPage.tsx`
  - Add `import { AiCoachChip } from "../components/AiCoachChip";` grouped with the other component imports
  - Insert `<AiCoachChip summary={{ income: totals.income, planned: totals.planned, spent: totals.spent, remaining: totals.remaining, overBudgetCount: totals.overBudgetCount, topOverBudgetCategory: totals.topOverBudgetCategory, currency }} hasBudget={budget !== null} />` as the last sibling before the outermost returned `<div>`'s closing tag, immediately after the existing `<MarkRecurringModal ... />` element
  - Do not add a conditional wrapper — `AiCoachChip` already returns `null` internally when `hasBudget` is falsy
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 4. Add component-level tests for `AiCoachChip` integration in `packages/web-app/src/pages/BudgetPage.test.tsx`
  - Check whether this test file already exists first; extend it if present, create it if not
  - Test: `BudgetPage` renders `AiCoachChip` (or its visible button, queried by `aria-label="Open AI Coach"`) when a budget is loaded for the current month
  - Test: `BudgetPage` does not render a visible `AiCoachChip` button when no budget exists for the current month (query for the `aria-label` and expect it absent)
  - Test: clicking the rendered chip navigates to `/insights`
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 5. Checkpoint — run `overBudgetInfo` tests and `BudgetPage` tests
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Delete `packages/api-client` entirely
  - Delete the full directory tree: `dist/`, `node_modules/`, `package-lock.json`, `package.json`, `README.md`, `src/client.ts`, `src/index.ts`, `src/transactions.ts`, `tsconfig.json`, and the `packages/api-client` directory itself
  - _Requirements: 4.1_

- [ ] 7. Remove the `@budget-buddy/api-client/*` path mapping from root `tsconfig.json`
  - Delete the `"@budget-buddy/api-client/*": ["./packages/api-client/src/*"]` line from `compilerOptions.paths`, leaving the `@budget-buddy/shared/*` mapping intact
  - _Requirements: 4.2_

- [ ] 8. Regenerate root `package-lock.json` to remove the `packages/api-client` workspace entry
  - Run `npm install` at the repo root so npm regenerates the lockfile's workspace list from what's actually on disk under `packages/*`
  - If the `"packages/api-client"` entry under the top-level `"packages"` map is not fully pruned by `npm install`, remove it manually as a documented fallback
  - _Requirements: 4.4_

- [ ] 9. Remove the `packages/api-client` link from `docs/README.md`
  - Delete the `- **[packages/api-client/README.md](../packages/api-client/README.md)** - HTTP client library overview` line from the "Outside `/docs`" section
  - _Requirements: 5.1, 5.2_

- [ ] 10. Checkpoint — verify no dangling `api-client` references
  - Run `npm run typecheck` (root and/or `web-app`) to confirm no dangling `@budget-buddy/api-client` import or path mapping remains
  - Run a repo-wide search for `api-client` and confirm only the accepted historical-narrative mentions remain: `CHANGELOG.md`, `DEVELOPMENT_LOG.md`, `.kiro/steering/memory/work-log.md`, `.kiro/specs/repo-docs-specs-consolidation/design.md`, `.kiro/specs/repo-docs-specs-consolidation/tasks.md`, and this spec's own `requirements.md`
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 4.3_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP; they are still included and must be implemented per this workflow's testing rules, since this spec's design includes a Correctness Properties section.
- No task exists for Requirement 3 — it is a confirmed no-op per design.md, satisfied automatically once task 3 ships. This is intentional, not an oversight.
- No destructive or external-approval gate is added beyond the standard checkpoints — all tasks are local file edits/deletions with no AWS or production impact.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["1.1", "1.2", "2"] },
    { "id": 2, "tasks": ["3"] },
    { "id": 3, "tasks": ["4"] },
    { "id": 4, "tasks": ["6"] },
    { "id": 5, "tasks": ["7", "9"] },
    { "id": 6, "tasks": ["8"] }
  ]
}
```
