# Implementation Plan: Modular Architecture Guardrails

## Overview

This plan builds four read-only consistency checks (in one CLI script), two small data/reference
files those checks validate against, one CI job wiring, and one end-to-end feature-module
scaffold generator with its documentation. Data files (`infrastructure/stack-manifest.json`,
`docs/gateway-routing-map.md`) are created before the check function that validates against each
one, so every check can be smoke-tested against the real repository immediately after it's
written. No task in this plan adds, removes, or modifies a CDK stack, an API Gateway, or a
DynamoDB table (Requirement 6) - every task either writes a plain script/JSON/Markdown file or
edits an existing workflow YAML file's steps in place.

## Tasks

- [ ] 1. Set up the consistency-check.js CLI foundation
  - [ ] 1.1 Create `scripts/consistency-check.js` with the CLI skeleton
    - Add the `#!/usr/bin/env node` shebang, `ROOT` constant, and an empty `checkSharedDocs`,
      `checkAppDrift`, `checkStackManifest`, `checkGatewayRouting` function per design.md's
      Components section (bodies filled in by later tasks)
    - Add the `CHECKS` registry object mapping `shared-docs`/`app-drift`/`stack-manifest`/
      `gateway-routing` to their functions
    - Add `main()`: parses an optional `--check=<name>` arg, runs the selected check(s) (all four
      if no arg), prints `🔍 Running check: <name>` per check, exits 1 if any check returns
      `false` or if an unknown `--check=` name is passed, exits 0 otherwise
    - Add the shared `extractStackSlugs(source)` helper (regex over `` `${stackPrefix}-<slug>` ``)
      used by both `checkAppDrift` and `checkStackManifest`
    - _Requirements: 1.6, 2.1, 2.2, 3.2_

- [ ] 2. Implement and verify `checkSharedDocs` (Requirement 1)
  - [ ] 2.1 Implement `checkSharedDocs()` in `scripts/consistency-check.js`
    - Extract exported top-level directory names from `packages/shared/src/index.ts`'s
      `export * from './X'` statements
    - Extract documented directory names from `packages/shared/README.md`'s `` `src/X/` `` inline
      code references
    - Report set-difference in both directions: "undocumented export" (in `index.ts`, not in
      README) and "documentation mismatch" / stale (in README, not in `index.ts` and the
      directory doesn't exist on disk)
    - Run `node scripts/consistency-check.js --check=shared-docs` against the real repository and
      confirm it prints the `✅` success line (the repo's shared package docs are presently
      consistent per design.md)
    - _Requirements: 1.1, 1.2, 1.3, 1.6_
  - [ ]* 2.2 Write unit tests for `checkSharedDocs`
    - Fixture pair 1: README documents a directory with no corresponding `export * from` in
      `index.ts`, and `index.ts` exports a directory not mentioned in the README - assert both
      mismatch categories are reported
    - Fixture pair 2: README and `index.ts` reference the same directories - assert the function
      returns `true` with no reported mismatches
    - _Requirements: 1.2, 1.3_

- [ ] 3. Implement and verify `checkAppDrift` (Requirement 2)
  - [ ] 3.1 Implement `checkAppDrift()` in `scripts/consistency-check.js`
    - Read `infrastructure/bin/app.ts` and `infrastructure/bin/app.js`, extract each file's stack
      slug set via the shared `extractStackSlugs()` helper
    - Report any slug present in one file's set and absent from the other's, labeled "only in
      app.ts" / "only in app.js"
    - Run `node scripts/consistency-check.js --check=app-drift` against the real repository and
      confirm it prints the `✅` success line
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ]* 3.2 Write unit tests for `checkAppDrift` / `extractStackSlugs`
    - Fixture pair 1: a slug string present only in one of the two fixture sources - assert it is
      reported in the correct "only in X" bucket
    - Fixture pair 2: identical slug sets in both fixture sources - assert the function returns
      `true` with no reported mismatches
    - _Requirements: 2.3_

- [ ] 4. Create the Stack_Manifest data file (Requirement 3)
  - [ ] 4.1 Create `infrastructure/stack-manifest.json`
    - List all 10 stacks currently instantiated in `infrastructure/bin/app.ts`, each as
      `{ slug, class, file }`, matching the schema in design.md's Data Models section
    - Include the `description` field explaining it must be updated in the same commit as any
      stack addition/removal in `app.ts`
    - _Requirements: 3.1_

- [ ] 5. Implement and verify `checkStackManifest` (Requirement 3)
  - [ ] 5.1 Implement `checkStackManifest()` in `scripts/consistency-check.js`
    - Reuse `extractStackSlugs()` against `infrastructure/bin/app.ts` to get the live slug set
    - Parse `infrastructure/stack-manifest.json`, collect its `stacks[].slug` values
    - Report any slug present in one set and absent from the other, labeled "in app.ts, missing
      from manifest" / "in manifest, missing from app.ts"
    - Run `node scripts/consistency-check.js --check=stack-manifest` against the real repository
      and confirm it prints the `✅` success line (validates task 4.1's manifest content against
      the real `app.ts`)
    - _Requirements: 3.2, 3.3_
  - [ ]* 5.2 Write unit tests for `checkStackManifest`
    - Fixture pair 1: a manifest fixture missing a slug present in an `app.ts` fixture's
      extracted set - assert it is reported as out of sync
    - Fixture pair 2: manifest and `app.ts` fixture slug sets match exactly - assert the function
      returns `true` with no reported mismatches
    - _Requirements: 3.3_

- [ ] 6. Create the Gateway_Routing_Map document (Requirement 4)
  - [ ] 6.1 Create `docs/gateway-routing-map.md`
    - One table per API Gateway (`apiBaseUrl`, `budgetsApiUrl`, `featuresApiUrl`,
      `extendedFeaturesApiUrl`), each row a route prefix in inline code plus its owning Lambda and
      an optional notes column, per the content in design.md's Components section
    - Add the "Choosing a gateway for a new feature domain" criteria section
    - _Requirements: 4.1_
  - [ ] 6.2 Index `docs/gateway-routing-map.md` in `docs/README.md`
    - Add a bullet for it under the existing "Architecture & Infrastructure" section, per the
      Documentation Placement steering rule
    - _Requirements: 4.1_

- [ ] 7. Implement and verify `checkGatewayRouting` (Requirement 4)
  - [ ] 7.1 Implement `extractRoutePrefixes()` and `checkGatewayRouting()` in
        `scripts/consistency-check.js`
    - For each of `api-stack.ts`, `api-features-stack.ts`, `api-features-extended-stack.ts`,
      `api-budgets-stack.ts` under `infrastructure/lib/`, extract every
      `this.api.root.addResource('<prefix>')` prefix
    - Extract every inline-code (`` `prefix` ``) token from `docs/gateway-routing-map.md`
    - Report any CDK-defined prefix with no matching entry in the routing map as undocumented;
      do **not** report extra routing-map entries with no matching CDK route as an error
    - Run `node scripts/consistency-check.js --check=gateway-routing` against the real repository
      and confirm it prints the `✅` success line (validates task 6.1's map content against the
      real CDK stacks)
    - _Requirements: 4.3, 4.4_
  - [ ]* 7.2 Write unit tests for `checkGatewayRouting`
    - Fixture pair 1: a fixture CDK stack source with a route prefix absent from a fixture routing
      map - assert it is reported as undocumented
    - Fixture pair 2: a fixture routing map with an extra entry not present in the fixture CDK
      source - assert the function still returns `true` (extra doc entries are not an error)
    - _Requirements: 4.4_

- [ ]* 8. Write the Property 1 determinism/side-effect-free test
  - [ ]* 8.1 Add `scripts/consistency-check.test.js`'s Property 1 test
    - For each of the four check functions, invoke it twice in succession against the same fixed
      fixture-file pair; assert both calls return the identical boolean and the identical ordered
      mismatch list, and assert every file the function reads (its own fixtures and the other
      three checks' unrelated input files) is byte-identical before and after both calls
    - Tag the test: `Feature: modular-architecture, Property 1: Consistency checks are
      deterministic and side-effect-free`
    - Add `"scripts"` to the root `jest.config.js`'s `roots` array so this file is discovered by
      `npm run test:unit`-style invocation, matching how `tests/*.test.js` is already discovered
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.2, 3.3, 4.3, 4.4_

- [ ] 9. Checkpoint - all consistency checks and their tests pass
  - Run `node scripts/consistency-check.js` (no `--check` filter) against the actual current
    repository state and confirm exit code 0 with all four `✅` lines
  - Run `npx jest scripts/consistency-check.test.js` and confirm all unit tests and the Property 1
    test pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Wire the Stack_Manifest into the deploy workflows (Requirement 3.4)
  - [ ] 10.1 Update `.github/workflows/deploy-dev.yml`'s `health-checks` job
    - Replace the hardcoded `stacks=(...)` array in the "Check CloudFormation stacks" step with a
      `jq -r '.stacks[].slug' infrastructure/stack-manifest.json` read, building the same
      `budgetbuddy-${{ env.ENVIRONMENT }}-<slug>` names the loop already checks
    - Leave the status-checking loop body, checkout step, and AWS credentials step unchanged
    - _Requirements: 3.4_
  - [ ] 10.2 Update `.github/workflows/deploy-prod.yml`'s `health-checks` job
    - Apply the identical `jq` read replacement to its "Check CloudFormation stacks" step
    - _Requirements: 3.4_

- [ ] 11. Build the Module_Scaffold generator (Requirement 5)
  - [ ] 11.1 Implement the backend generator in `scripts/scaffold-feature.js`
    - Accept `<name>` as a CLI argument; write
      `backend/functions/<name>/{index.js,service.js,repository.js,<name>.test.js,package.json}`
    - `index.js` includes the real boilerplate common to existing Lambdas: CORS OPTIONS handling,
      a health route, `getUserFromEvent`, `BudgetAccessResolver.resolveAccess`,
      `BudgetAccessResolver.assertPermission`, and the try/catch error-branch shape seen in
      `transaction-planning/index.js`
    - `package.json` matches the shape of `backend/functions/goals/package.json`
      (`name`, `main`, `scripts.test = "jest"`, `devDependencies.jest`)
    - Before writing anything, check every target path with `fs.existsSync`; if any already
      exists, abort with the list of conflicting paths and write nothing
    - _Requirements: 5.1, 5.6_
  - [ ] 11.2 Implement the frontend generator in `scripts/scaffold-feature.js`
    - Write `packages/web-app/src/services/<name>Api.ts` (imports the correct `config.<gatewayKey>`
      per `docs/gateway-routing-map.md`'s criteria, `authHeaders()`, CRUD function stubs) and
      `packages/web-app/src/pages/<Name>Page.tsx` (`<Name>` = PascalCase of `<name>`, minimal page
      stub with a TODO for the UI)
    - Include these two paths in the same pre-write `fs.existsSync` conflict check as task 11.1
    - _Requirements: 5.2, 5.6_
  - [ ] 11.3 Implement the generated `TODO-<name>.md` checklist in `scripts/scaffold-feature.js`
    - Write `backend/functions/<name>/TODO-<name>.md` with the checklist from design.md's
      Components section: choose the target gateway using `docs/gateway-routing-map.md`, wire the
      Lambda into the chosen CDK stack, update `infrastructure/bin/app.ts` AND
      `infrastructure/stack-manifest.json` together if a new stack is needed, fill in
      service/repository/page logic, and run `node scripts/consistency-check.js` before
      committing
    - _Requirements: 4.2, 5.3, 5.4_
  - [ ]* 11.4 Manual smoke test of `scripts/scaffold-feature.js`
    - Run `node scripts/scaffold-feature.js sample-feature` in a scratch location, confirm the
      generated `index.js` passes `node -c`, confirm the generated `.ts`/`.tsx` files pass
      `npx tsc --noEmit` in `packages/web-app`, then delete every generated file
    - _Requirements: 5.1, 5.2_

- [ ] 12. Document the Module_Scaffold (Requirement 5.5)
  - [ ] 12.1 Create `docs/module-scaffold-guide.md`
    - Document `scripts/scaffold-feature.js`'s invocation (`node scripts/scaffold-feature.js
      <name>`), the full list of generated file paths, and links to
      `docs/gateway-routing-map.md` and `infrastructure/stack-manifest.json`
    - _Requirements: 5.5_
  - [ ] 12.2 Index `docs/module-scaffold-guide.md` in `docs/README.md`
    - Add a bullet for it under the existing "Development Process" section
    - _Requirements: 5.5_

- [ ] 13. Wire the consistency checks into `pr-check.yml` CI (Requirements 1/2/3/4's CI clauses)
  - [ ] 13.1 Add the `consistency-checks` job to `.github/workflows/pr-check.yml`
    - New sibling job (matching the `mobile-tests` job's additive pattern): checkout, setup-node,
      then `run: node scripts/consistency-check.js`
    - _Requirements: 1.4, 1.5, 2.4, 2.5, 3.5, 3.6, 4.5, 4.6_
  - [ ] 13.2 Add `consistency-checks` to the `pr-summary` job
    - Add `consistency-checks` to `pr-summary`'s `needs` array
    - Add a `| Consistency Checks | ... |` row to the summary table, matching the existing
      `mobile-tests` row's conditional-emoji pattern
    - _Requirements: 1.5, 2.5, 3.6, 4.6_

- [ ] 14. Checkpoint - CI workflow YAML syntax is valid
  - Run `node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/pr-check.yml','utf-8'))"`
    and confirm it does not throw
  - Run the same check against `.github/workflows/deploy-dev.yml` and
    `.github/workflows/deploy-prod.yml`
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Final checkpoint - full repository consistency confirmed
  - Run `node scripts/consistency-check.js` one more time against the repository state after all
    edits in this plan and confirm exit code 0 with all four `✅` lines
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional (unit tests, the Property 1 test, and the scaffold manual
  smoke test) and can be skipped for a faster pass, per the workflow's optional-task convention.
- Requirement 6 (Guardrail Scope Boundary) is not a standalone task: every task above already
  satisfies it by construction - the four check functions are read-only (Requirement 6.1), the
  scaffold generator only ever writes new backend/frontend files and never touches a CDK stack,
  API Gateway, or DynamoDB table (Requirement 6.2), and no task in this plan changes the number of
  stacks, gateways, or the data model (Requirement 6.3 - any such change is explicitly out of
  scope for this spec).
- Task 8.1's Property 1 test and tasks 2.2/3.2/5.2/7.2's unit tests all live in the same file,
  `scripts/consistency-check.test.js`, and are sequenced as separate tasks/waves specifically so
  each edits the file after the previous one has finished.
- Checkpoints (9, 14, 15) have no sub-tasks and are intentionally excluded from the Task Dependency
  Graph below, consistent with the graph's leaf-sub-task-only rule.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "4.1", "6.1", "11.1"] },
    { "id": 1, "tasks": ["2.1", "6.2", "10.1", "10.2", "11.2"] },
    { "id": 2, "tasks": ["2.2", "3.1", "11.3"] },
    { "id": 3, "tasks": ["3.2", "5.1", "11.4", "12.1"] },
    { "id": 4, "tasks": ["5.2", "7.1", "12.2"] },
    { "id": 5, "tasks": ["7.2", "13.1"] },
    { "id": 6, "tasks": ["8.1", "13.2"] }
  ]
}
```
