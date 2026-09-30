# Requirements Document

## Introduction

BudgetBuddy's backend, infrastructure, and frontend already follow a modular structure: one
Lambda per endpoint group, CDK stacks split by concern, and page/service/component separation on
both web and mobile. The architecture itself (four API Gateways, the single DynamoDB table, the
Lambda-per-endpoint-group pattern, and the CDK stack boundaries) is **not** being redesigned by
this spec.

What has repeatedly drifted is the set of conventions that keep those modules in sync with each
other: a shared package's documentation fell out of sync with its real exports before it was
deleted; the legacy CDK JS entrypoint drifted from the TypeScript entrypoint; CI/CD workflows
hardcode a stack list that isn't updated when stacks are added or removed; and there is no
tooling (only a steering-file note) to help a contributor decide which of the four API Gateways a
new feature's routes belong on. This spec adds lightweight, additive guardrails - documented
checklists, small consistency-check scripts run in CI, and an end-to-end scaffold for adding a new
feature module - that prevent these four specific failure modes from recurring, without changing
the number of stacks, gateways, or the data model.

Any change that would require altering the API Gateway count, the single-table DynamoDB design, or
the CDK stack boundaries is explicitly out of scope and is not addressed by any requirement below.

## Glossary

- **Feature_Module**: The complete set of artifacts required to add one feature end-to-end: a
  backend Lambda function directory (`index.js`/`service.js`/`repository.js`), its CDK route
  wiring in the owning stack, and its frontend service/page/component files.
- **Shared_Package**: A package under `packages/` (e.g. `packages/shared`) whose code is consumed
  by more than one other package (web app, mobile app, or backend).
- **Deploy_Entrypoint**: A CDK app bootstrap file that instantiates the full set of stacks
  (`infrastructure/bin/app.ts` or its compiled/legacy counterpart `infrastructure/bin/app.js`).
- **Stack_Manifest**: A single, version-controlled list of the currently deployed CDK stack names,
  treated as the source of truth for any script or workflow that needs to enumerate stacks.
- **CI_Pipeline**: The GitHub Actions workflows in `.github/workflows/` (`pr-check.yml`,
  `deploy-dev.yml`, `deploy-prod.yml`).
- **Gateway_Routing_Map**: The documented mapping of feature domains (e.g. "notifications",
  "goals") to one of the four API Gateway config values (`apiBaseUrl`, `budgetsApiUrl`,
  `featuresApiUrl`, `extendedFeaturesApiUrl`).
- **Consistency_Check**: An automated script, runnable locally and in the CI_Pipeline, that
  compares two or more artifacts that are supposed to describe the same set of facts and reports a
  failure when they disagree.
- **Module_Scaffold**: A repeatable, documented procedure or generator script that produces the
  starter files for a new Feature_Module in their correct locations.
- **Contributor**: A developer (human or AI agent) adding or modifying a Feature_Module in this
  repository.

## Requirements

### Requirement 1: Shared Package Documentation Consistency

**User Story:** As a contributor, I want a shared package's README to always reflect its actual
exported modules, so that a future contributor never bases work on a description of code that no
longer exists (as happened with `packages/api-client`).

#### Acceptance Criteria

1. THE Consistency_Check SHALL compare the module names documented in a Shared_Package's README
   against the file names actually exported from that Shared_Package's source directory.
2. IF a Shared_Package's README documents a module name that has no corresponding exported source
   file, THEN THE Consistency_Check SHALL report that module name as a documentation mismatch.
3. IF a Shared_Package's source directory exports a module name that is not documented in its
   README, THEN THE Consistency_Check SHALL report that module name as an undocumented export.
4. WHEN the CI_Pipeline runs on a pull request that modifies any file under a Shared_Package's
   directory, THE CI_Pipeline SHALL execute the Consistency_Check for that Shared_Package.
5. IF the Consistency_Check reports one or more mismatches for a Shared_Package, THEN THE
   CI_Pipeline SHALL fail the pull request check with the list of mismatched module names.
6. THE Consistency_Check SHALL complete in under 30 seconds for any single Shared_Package.

### Requirement 2: Deploy Entrypoint Drift Detection

**User Story:** As a contributor, I want the CDK deploy entrypoint files to be checked against
each other automatically, so that `infrastructure/bin/app.js` never silently falls out of sync
with `infrastructure/bin/app.ts` again.

#### Acceptance Criteria

1. THE Consistency_Check SHALL extract the list of stack instantiations from
   `infrastructure/bin/app.ts`.
2. THE Consistency_Check SHALL extract the list of stack instantiations from
   `infrastructure/bin/app.js`.
3. IF the stack instantiation list extracted from `infrastructure/bin/app.js` differs from the
   list extracted from `infrastructure/bin/app.ts`, THEN THE Consistency_Check SHALL report the
   specific stack names present in one file and absent from the other.
4. WHEN the CI_Pipeline runs on a pull request that modifies `infrastructure/bin/app.ts` or
   `infrastructure/bin/app.js`, THE CI_Pipeline SHALL execute the Consistency_Check described in
   this requirement.
5. IF the Consistency_Check reports a difference between the two Deploy_Entrypoint files, THEN THE
   CI_Pipeline SHALL fail the pull request check with the reported stack name differences.

### Requirement 3: Stack Manifest as Single Source of Truth for CI Workflows

**User Story:** As a contributor, I want the list of deployed stacks used by CI/CD health checks
to come from one place, so that destroying or adding a stack cannot break a post-deploy health
check the way it did when `api-family-stack` was removed without updating the hardcoded list in
`deploy-dev.yml`.

#### Acceptance Criteria

1. THE repository SHALL contain one Stack_Manifest file listing the currently deployed CDK stack
   names.
2. THE Consistency_Check SHALL compare the stack names instantiated in
   `infrastructure/bin/app.ts` against the stack names listed in the Stack_Manifest.
3. IF a stack name appears in `infrastructure/bin/app.ts` but not in the Stack_Manifest, or
   appears in the Stack_Manifest but not in `infrastructure/bin/app.ts`, THEN THE Consistency_Check
   SHALL report that stack name as out of sync.
4. WHEN a stack-list-dependent step in `deploy-dev.yml` or `deploy-prod.yml` (such as a post-deploy
   health check) needs the set of deployed stack names, THE workflow SHALL read that set from the
   Stack_Manifest rather than from a list duplicated inline in the workflow file.
5. WHEN the CI_Pipeline runs on a pull request that modifies `infrastructure/bin/app.ts`, THE
   CI_Pipeline SHALL execute the Consistency_Check described in this requirement.
6. IF the Consistency_Check reports the Stack_Manifest as out of sync, THEN THE CI_Pipeline SHALL
   fail the pull request check with the out-of-sync stack names.

### Requirement 4: API Gateway Routing Decision Checklist

**User Story:** As a contributor adding a new feature's API routes, I want a documented checklist
and an automated check for which of the four API Gateways my routes belong on, so that I don't
have to rely solely on remembering or re-reading a steering-file note.

#### Acceptance Criteria

1. THE repository SHALL contain a Gateway_Routing_Map document listing, for each of the four API
   Gateway config values, the feature domains currently routed through it and the criteria for
   assigning a new feature domain to one of them.
2. WHEN a Contributor adds a new route to a CDK API stack, THE Module_Scaffold SHALL prompt for or
   document which of the four Gateway_Routing_Map entries the new route domain belongs to before
   the route is wired into that stack.
3. THE Consistency_Check SHALL compare the feature domains referenced in the Gateway_Routing_Map
   document against the route path prefixes defined in the CDK API stacks
   (`api-stack.ts`, `api-features-stack.ts`, `api-features-extended-stack.ts`,
   `api-budgets-stack.ts`).
4. IF a route path prefix exists in a CDK API stack with no corresponding entry in the
   Gateway_Routing_Map document, THEN THE Consistency_Check SHALL report that route path prefix as
   undocumented.
5. WHEN the CI_Pipeline runs on a pull request that modifies any of the four CDK API stack files,
   THE CI_Pipeline SHALL execute the Consistency_Check described in this requirement.
6. IF the Consistency_Check reports an undocumented route path prefix, THEN THE CI_Pipeline SHALL
   fail the pull request check with the undocumented route path prefix and the four available
   Gateway_Routing_Map entries.

### Requirement 5: End-to-End Feature Module Scaffold

**User Story:** As a contributor implementing a new feature, I want a documented, repeatable
procedure that generates the starter backend function, CDK wiring stub, and frontend service/page
stub for a Feature_Module in their correct locations, so that adding a new module does not require
re-deriving the existing conventions from scratch each time.

#### Acceptance Criteria

1. THE Module_Scaffold SHALL generate a backend function directory under
   `backend/functions/<name>/` containing `index.js`, `service.js`, `repository.js`, a test file
   stub, and a `README.md`, following the existing handler/service/repository pattern.
2. THE Module_Scaffold SHALL generate a frontend service file stub and page component stub in
   their conventional `packages/web-app` locations for the new Feature_Module.
3. WHEN the Module_Scaffold generates a Feature_Module, THE Module_Scaffold SHALL include a
   generated checklist item directing the Contributor to the Gateway_Routing_Map document from
   Requirement 4 to select the target API Gateway.
4. THE Module_Scaffold SHALL include a generated checklist item directing the Contributor to
   update the Stack_Manifest from Requirement 3 if the new Feature_Module requires a new CDK
   stack.
5. THE Module_Scaffold SHALL document its invocation and output locations in a single markdown
   guide referenced from `docs/README.md`.
6. THE Module_Scaffold SHALL NOT create, remove, or rename any CDK stack, API Gateway, or
   DynamoDB table as part of generating a Feature_Module.

### Requirement 6: Guardrail Scope Boundary

**User Story:** As a maintainer, I want it explicit that these guardrails cannot be satisfied by
restructuring the underlying architecture, so that future implementation work stays within the
agreed low-risk scope.

#### Acceptance Criteria

1. THE Consistency_Check scripts introduced by Requirements 1-4 SHALL operate read-only against
   existing files and SHALL NOT modify CDK stack definitions, API Gateway resources, or the
   DynamoDB table schema.
2. THE Module_Scaffold introduced by Requirement 5 SHALL reuse the existing four API Gateways, the
   existing single DynamoDB table, and the existing CDK stack boundaries without introducing new
   ones.
3. IF a future change request would require adding, removing, or merging an API Gateway,
   restructuring the DynamoDB table design, or changing CDK stack boundaries, THEN THAT change
   SHALL be tracked as a separate spec outside modular-architecture's scope.
