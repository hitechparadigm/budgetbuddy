# Design Document

## Overview

This design is an executable inventory and migration plan, not an abstract architecture description. It enumerates every file affected by the consolidation, the exact action to take on it, and the exact target content where files are merged. All content decisions below are based on reading the actual current file contents (specs, docs, hooks, steering) in this repository as of the design date — not assumptions carried over from the requirements phase.

Two items flagged as open questions in requirements.md have been resolved during design research:

1. **`plan-model-redesign` classification**: Read in full. Its `tasks.md` shows all 19 top-level tasks checked `[x]` complete. Its subject matter is a backend/data-model migration (`FAMILY#` → `BUDGET#`, `FamilyIdResolver` → `BudgetAccessResolver`) with no new user-facing capability — it is infrastructure/architecture work, matching `ARCHITECTURE_DECISIONS.md` ADR-001. This is **`process`**, not `feature`, contradicting the tentative classification in requirements.md Requirement 3.2. This design supersedes that line item.
2. **`cicd-automation-guide.md`**: Its "CI/CD Deployment Monitoring" half describes `.kiro/hooks/monitor-cicd-pipeline.kiro.hook`, which does not exist under the current `.kiro/hooks/` (only `auto-log-cleanup.json`, `continue-until-done.json`, `doc-management-guide.json`, `update-user-journeys.json` exist, all in the v2 JSON hook schema, none matching the legacy `.kiro.hook` format or name described). **Decision: delete.** The still-valid parts (CI/CD status-check workflow via `scripts/check-cicd-status.js`) are already covered by the retained `.kiro/steering/cicd-deployment.md`, so nothing needs to be migrated.
3. **`localstack-guide.md`**: `docker-compose.localstack.yml`, `scripts/localstack-setup.js`, and `scripts/test-lambda-local.js` all still exist and `test-lambda-local.js` was touched as recently as the `family` invite/email work referenced in `DEVELOPMENT_LOG.md`. LocalStack is still part of the workflow. **Decision: retain, but correct** — the guide currently tells the reader to test the `family` Lambda (`node scripts/test-lambda-local.js family invite`), which is deprecated (returns 410). It must be updated to reference the `budgets` Lambda instead.
4. **`budgetbuddy-serverless-architecture.drawio`**: Read directly (it is XML text, not a binary image). It depicts a single "Family API" API Gateway and a "Family / Invitations" Lambda box, with no `api-budgets`, `api-features-extended`, or separate `notification` stack. This is the pre-ADR-001 architecture. **Decision: delete**, not conditional — confirmed stale by content, not by inference.

## Architecture

This is a documentation/organization feature — there is no runtime architecture to design. The "architecture" here is the target file-system layout after consolidation:

```
.kiro/specs/
├── README.md                          (NEW — spec index)
├── ai-bill-reminders-budget-planning/
├── competitive-features/              (moved from archive/, .config.kiro added)
├── critical-bug-fixes/                (moved from archive/, .config.kiro added)
├── e2e-testing-infrastructure/
├── enhanced-accounts-transactions/    (moved from archive/, .config.kiro added)
├── goals-borrow-lend/
├── hooks-optimization/                (moved from archive/, .config.kiro added)
├── mobile-app/
├── mobile-ui-polish/                  (moved from archive/, .config.kiro added)
├── multi-currency/                    (moved from archive/, .config.kiro added)
├── onboarding-403-fix/                (moved from archive/, .config.kiro updated)
├── planned-transactions/
├── push-notifications-reminders/
├── repo-docs-specs-consolidation/
├── test-coverage-improvement/         (moved from archive/, .config.kiro added)
├── ui-polish-enhancements/            (moved from archive/, .config.kiro added)
├── web-app-polish/
└── (documentation-cleanup and documentation-validation-fix — see Requirement 3.6 rename note below)
    (archive/ directory deleted)

docs/
├── README.md                          (REWRITTEN — doc index)
├── aws-stack-architecture.md          (MERGE TARGET — absorbs stack-management-guide.md, aws-resource-standards.md)
├── user-guide-budget-collaboration.md (MERGE TARGET — absorbs user-guide-notifications.md, push-notifications-guide.md, multi-currency-guide.md)
├── api-endpoints.md                  (kept)
├── configuration-guide.md            (kept)
├── deployment-guide.md               (kept)
├── development-status.md             (kept)
├── DEVELOPMENT_BEST_PRACTICES.md     (kept)
├── localstack-guide.md               (kept, corrected)
├── mobile-ux-design.md               (kept)
├── product-requirements.md           (kept)
├── ses-email-setup.md                (kept)
└── (archive/ directory deleted entirely; aws-resource-standards.md, stack-management-guide.md,
     cicd-automation-guide.md, MVP-SPRINT-PLAN.md, web-app-polish-plan.md, multi-currency-guide.md,
     user-guide-notifications.md, push-notifications-guide.md, budgetbuddy-serverless-architecture.drawio
     all deleted)

Repository root:
├── overview-error.png                (DELETED)
├── overview-fixed.png                (DELETED)
└── test-I`U&M9X/                     (DELETED — confirmed exact name via directory listing)
```

## Components and Interfaces

Not applicable in the software-component sense. The "interfaces" of this feature are the file contents themselves (the `.config.kiro` schema, the two index files, and the two steering files). Each is specified exactly below.

### 1. Spec Flattening Plan (Requirement 1)

Exact inventory of the 12 directories under `.kiro/specs/archive/`, confirmed by reading each spec's actual files, with target action:

| # | Spec directory | Files present | Actual outcome (read from tasks.md) | Target action |
|---|---|---|---|---|
| 1 | `competitive-features` | design.md, requirements.md, tasks.md | Task 1 (rollover budgets) shown `[x]` complete; header says "Ready for Implementation" — mixed signal, but README.md at `.kiro/README.md` already lists it "✅ Completed features" | Move to `.kiro/specs/competitive-features/` |
| 2 | `critical-bug-fixes` | design.md, requirements.md, tasks.md | Tasks 1–2+ shown `[x]` complete (dark theme fix, account permissions) | Move to `.kiro/specs/critical-bug-fixes/` |
| 3 | `documentation-cleanup` | design.md, requirements.md, tasks.md | Tasks 1–3 `[x]` complete (archive dirs created, files moved) — one optional property test `[ ]*` 12 unchecked, marked optional (`*`) | Move to `.kiro/specs/documentation-cleanup/` |
| 4 | `documentation-validation-fix` | design.md, requirements.md, tasks.md | Parent tasks 2–10 are unchecked `[ ]` at the top level while their `2.1`/`3.1`/etc. subtasks are `[x]`; task 10.2 unchecked. Ambiguous/partial completion — treated as **superseded**, not complete, because the checkbox convention in this repo marks a parent `[ ]` when the task is not fully done | Move to `.kiro/specs/documentation-validation-fix/` — see naming collision note below |
| 5 | `enhanced-accounts-transactions` | design.md, requirements.md, tasks.md | Tasks 1–2.3 shown `[x]` complete | Move to `.kiro/specs/enhanced-accounts-transactions/` |
| 6 | `hooks-optimization` | design.md, requirements.md, tasks.md | **Every task across all 6 phases is `[ ] Not Started`.** The plan describes hooks (`task-continuation.kiro.hook`, `aws-analysis.kiro.hook`, etc.) that do not match the current 4 hooks in `.kiro/hooks/` (`auto-log-cleanup.json`, `continue-until-done.json`, `doc-management-guide.json`, `update-user-journeys.json` — a different, newer v2 JSON hook schema). This spec's plan was never executed; the hook system was later redesigned by different, unspecced work. **Superseded**, not complete | Move to `.kiro/specs/hooks-optimization/` |
| 7 | `mobile-ui-polish` | design.md, requirements.md, tasks.md | Tasks 1.1–1.4 `[x]` complete; one line item `- [ ] Tested on iOS and Android devices` unchecked in a "Definition of Done" checklist at the end | Move to `.kiro/specs/mobile-ui-polish/` |
| 8 | `multi-currency` | design.md, requirements.md, tasks.md | Tasks 1–2 `[x]` complete; final success-criteria checklist has 2 unchecked items (`Deployed to dev environment via CI/CD pipeline`, `End-to-end testing with real AWS`) — these are deployment/verification checklist items, not implementation tasks; feature is shipped per README.md/CHANGELOG.md "MULTI-CURRENCY SUPPORT COMPLETE" | Move to `.kiro/specs/multi-currency/` |
| 9 | `onboarding-403-fix` | `.config.kiro`, bugfix.md, design.md, tasks.md (no requirements.md — uses `bugfix.md`, consistent with `specType: "bugfix"`) | Task 1 (bug condition test) `[x]` complete; already has `.config.kiro` with `specType: "bugfix"` | Move to `.kiro/specs/onboarding-403-fix/`; update `.config.kiro` in place (add `status`, `category`) |
| 10 | `plan-model-redesign` | design.md, requirements.md, tasks.md | All 19 top-level tasks `[x]` complete, including CDK infra, Lambda migrations, frontend rewrite. Fully shipped; documented in `ARCHITECTURE_DECISIONS.md` ADR-001 as "Accepted — fully implemented" | Move to `.kiro/specs/plan-model-redesign/` |
| 11 | `test-coverage-improvement` | design.md, requirements.md, tasks.md | Tasks 1.1–1.4+ `[x]` complete (transaction editing, OAuth, admin dashboard test suites) | Move to `.kiro/specs/test-coverage-improvement/` |
| 12 | `ui-polish-enhancements` | design.md, requirements.md, tasks.md | Tasks 1.1–1.3 `[x]` complete, cross-references `mobile-ui-polish` spec for mobile portion | Move to `.kiro/specs/ui-polish-enhancements/` |

**Name collision check against the 7 active specs** (`ai-bill-reminders-budget-planning`, `e2e-testing-infrastructure`, `goals-borrow-lend`, `mobile-app`, `planned-transactions`, `push-notifications-reminders`, `web-app-polish`): comparing all 12 archived names against all 7 active names — no string matches exist. **Confirmed: zero naming collisions.** Requirement 1.5's conditional rename logic is not triggered by any pair.

**Requirement 3.6 rename check**: All 12 archived directory names already clearly describe their feature/solution area in kebab-case (e.g. `enhanced-accounts-transactions`, `onboarding-403-fix`). None require renaming. The two `documentation-*` specs (`documentation-cleanup`, `documentation-validation-fix`) are similarly named to each other but describe genuinely distinct work (moving files into `docs/archive/` vs. fixing the timestamp-based validation script) and are not colliding or ambiguous — no rename needed.

**Mechanics**: each move is a directory move (`smart_relocate`-equivalent or plain move since specs do not import each other), executed one directory at a time from `.kiro/specs/archive/<name>/` to `.kiro/specs/<name>/`. After all 12 moves, `.kiro/specs/archive/` is empty and is deleted (Requirement 1.2, 1.3).

### 2. `.config.kiro` Schema (Requirement 2)

Exact JSON shape, extending the existing ad-hoc schema already seen in `e2e-testing-infrastructure/.config.kiro` (`{"generationMode": "requirements-first"}`) and `onboarding-403-fix/.config.kiro` (`{"specId": "...", "workflowType": "requirements-first", "specType": "bugfix"}`):

```json
{
  "specId": "<uuid, only if already present — do not fabricate for specs that lack one>",
  "workflowType": "requirements-first",
  "specType": "feature | bugfix",
  "status": "active | complete | superseded",
  "category": "feature | process | fix"
}
```

Existing fields (`specId`, `workflowType`, `generationMode`, `specType`) are preserved unchanged; only `status` and `category` are added or updated. For specs with no existing `.config.kiro`, a new minimal file is created containing at least `status` and `category`.

Per-spec target values (status corrected against actual completion evidence above, category per Requirement 3 with the `plan-model-redesign` correction applied):

| Spec | status | category | Rationale |
|---|---|---|---|
| `ai-bill-reminders-budget-planning` | `active` | `feature` | Work log: "mostly complete" |
| `e2e-testing-infrastructure` | `active` | `process` | Work log: "not started"; owns test pyramid, not a product feature |
| `goals-borrow-lend` | `active` | `feature` | Work log: "COMPLETE (tests pending)" — tests pending keeps it active, not complete |
| `mobile-app` | `active` | `feature` | Work log: "not started" |
| `planned-transactions` | `active` | `feature` | Work log: "COMPLETE (tests pending)" |
| `push-notifications-reminders` | `active` | `feature` | Work log: "mostly complete" |
| `web-app-polish` | `complete` | `feature` | Work log and `.kiro/README.md`/`SYSTEM_GUIDE.md` all say COMPLETE, no pending caveat |
| `competitive-features` | `complete` | `feature` | All read tasks `[x]`; `.kiro/README.md` already marks ✅ Completed |
| `critical-bug-fixes` | `complete` | `fix` | All read tasks `[x]`; per Requirement 3.4 |
| `enhanced-accounts-transactions` | `complete` | `feature` | All read tasks `[x]` |
| `multi-currency` | `complete` | `feature` | Implementation tasks `[x]`; only post-deploy verification checklist items unchecked; shipped per CHANGELOG |
| `mobile-ui-polish` | `complete` | `feature` | Implementation tasks `[x]`; only a device-testing checklist item unchecked |
| `onboarding-403-fix` | `complete` | `fix` | Bug-condition and fix tasks `[x]`; per Requirement 3.4 |
| `plan-model-redesign` | `complete` | **`process`** (corrected from the requirements-phase `feature` tentative list) | All 19 tasks `[x]`; is a data-model/architecture migration (ADR-001), not a new user-facing capability |
| `ui-polish-enhancements` | `complete` | `feature` | Implementation tasks `[x]` |
| `documentation-cleanup` | `complete` | `process` | Core tasks `[x]`; one optional (`*`) property test unchecked, does not block completion |
| `documentation-validation-fix` | `superseded` | `process` | Parent tasks left `[ ]` despite checked subtasks — inconsistent completion signal; superseded because current commit workflow (`safe-commit-push.js` per steering) does not describe running this content-based validator as the enforced mechanism today |
| `hooks-optimization` | `superseded` | `process` | Zero tasks executed (`[ ] Not Started` throughout); the hook system was later replaced by an entirely different v2 JSON schema not described anywhere in this spec |
| `test-coverage-improvement` | `complete` | `process` | Tasks `[x]`; `.kiro/README.md`/`development-status.md` already call it archived/complete |

### 3. `.kiro/specs/README.md` Index (Requirement 2.4, 3.5)

Exact table structure — one row per spec, all 19, sorted alphabetically for lookup convenience:

```markdown
# Specs Index

**Last Updated**: <date of consolidation>

Every spec is a direct child of `.kiro/specs/`. There is no `archive/` subdirectory — a spec's
lifecycle state is recorded in its `.config.kiro` `status` field (`active | complete | superseded`),
never by its location. See `.kiro/steering/structure.md` for the rule.

| Spec | Status | Category | Description |
|------|--------|----------|--------------|
| `ai-bill-reminders-budget-planning` | active | feature | AI-powered detection of recurring bills from transaction history and AI budget planning suggestions |
| `competitive-features` | complete | feature | Rollover budgets and other competitor-parity features shipped in Phase 1 |
| `critical-bug-fixes` | complete | fix | Six critical web app bugs fixed (dark theme persistence, account permissions, and others) |
| `documentation-cleanup` | complete | process | One-time move of session/kiro/blocker docs into `docs/archive/` subfolders |
| `documentation-validation-fix` | superseded | process | Content-based documentation validator rewrite; superseded by current commit workflow |
| `e2e-testing-infrastructure` | active | process | Owns the full test pyramid: unit coverage, integration tests, and E2E tests |
| `enhanced-accounts-transactions` | complete | feature | Account management, batch transaction entry, and navigation UX improvements |
| `goals-borrow-lend` | active | feature | Goals page Borrowed/Lent tabs and borrow/lend goal sub-type creation flow |
| `hooks-optimization` | superseded | process | Planned hook consolidation from 13 to 8 hooks; never executed, later replaced by a different hook schema |
| `mobile-app` | active | feature | React Native + Expo iOS/Android app |
| `mobile-ui-polish` | complete | feature | Mobile-specific UI polish bringing feature parity with completed web implementations |
| `multi-currency` | complete | feature | Multi-currency support: 6 currencies, selection, formatting, settings management |
| `onboarding-403-fix` | complete | fix | Fixed the auth-onboarding Lambda 403 error for first-time users |
| `plan-model-redesign` | complete | process | Migrated the data model from `FAMILY#`-scoped to `BUDGET#`-scoped with four roles (ADR-001) |
| `planned-transactions` | active | feature | Scheduled future income and expense entries with full CRUD UI |
| `push-notifications-reminders` | active | feature | Push notification and daily reminder system |
| `repo-docs-specs-consolidation` | active | process | This spec — repository spec and documentation reorganization |
| `test-coverage-improvement` | complete | process | Test coverage improvement from 56% to 80% (Weeks 2-4 of roadmap) |
| `ui-polish-enhancements` | complete | feature | Quick Actions FAB and other web UI polish enhancements |
| `web-app-polish` | complete | feature | Web app design, information architecture, AI features, and polish (18 criteria) |
```

### 4. Full Doc Inventory Table (Requirement 4)

Every file enumerated in requirements.md Requirement 4, with disposition. "Merge-target" is populated only for `consolidate` rows.

**`/docs` top level:**

| File | Disposition | Reason | Merge target |
|---|---|---|---|
| `docs/api-endpoints.md` | keep | Accurate, describes current API; separate subject from architecture/stack docs | — |
| `docs/aws-resource-standards.md` | consolidate | Naming/tagging standards; distinct subject from stack topology but grouped into the merge target per Requirement 5.1's explicit named group | `aws-stack-architecture.md` |
| `docs/aws-stack-architecture.md` | keep (merge target) | Most complete of the three architecture docs (DynamoDB schema, Lambda access pattern, RBAC, stack list) | — (absorbs the other two) |
| `docs/budgetbuddy-serverless-architecture.drawio` | delete | Content read directly: depicts single "Family API"/"Family Lambda" pre-ADR-001 architecture, confirmed stale, not merely conditional | — |
| `docs/cicd-automation-guide.md` | delete | Describes `.kiro/hooks/monitor-cicd-pipeline.kiro.hook`, which does not exist under current `.kiro/hooks/` (4 different v2 JSON hooks exist instead); still-valid CI/CD status-check content already lives in `.kiro/steering/cicd-deployment.md` | — |
| `docs/configuration-guide.md` | keep | Environment variable reference, still accurate | — |
| `docs/deployment-guide.md` | keep | AWS account/CDK prerequisites, still accurate | — |
| `docs/development-status.md` | keep | Actively maintained "Last Updated 2026-09-23" living status doc | — |
| `docs/DEVELOPMENT_BEST_PRACTICES.md` | keep | Consolidated lessons-learned reference, current `BudgetAccessResolver` pattern documented correctly | — |
| `docs/localstack-guide.md` | keep (corrected) | LocalStack scripts/compose file still exist and are still used; guide needs `family` → `budgets` Lambda reference corrected | — |
| `docs/mobile-ux-design.md` | keep | Actively referenced living design doc for the upcoming mobile spec | — |
| `docs/multi-currency-guide.md` | consolidate | User-facing guide; grouped per Requirement 5.3 into the collaboration/notifications merge target (see note on thin actual overlap below) | `user-guide-budget-collaboration.md` |
| `docs/MVP-SPRINT-PLAN.md` | delete | MVP milestone already shipped (per Requirement 6.4 and README.md's current "Production-Ready" status, contradicting this doc's "1 week to ship" framing) | — |
| `docs/product-requirements.md` | keep | Actively maintained "Last Updated 2026-09-23 (Session 162...)" living doc | — |
| `docs/push-notifications-guide.md` | consolidate | Near-duplicate of `user-guide-notifications.md` (same thresholds, quiet hours, device management, troubleshooting sections) | `user-guide-budget-collaboration.md` |
| `docs/README.md` | keep (rewritten) | Becomes the Doc_Index; current content is stale (references nonexistent `api-troubleshooting.md`, `github-secrets-setup.md`; "99.5% complete" framing) | — |
| `docs/ses-email-setup.md` | keep | Describes a still-real, still-open condition (SES sandbox mode) confirmed current in steering (`product.md`: "SES still in sandbox") | — |
| `docs/stack-management-guide.md` | consolidate | Deployment order/dependency tables duplicate `aws-stack-architecture.md` almost exactly | `aws-stack-architecture.md` |
| `docs/user-guide-budget-collaboration.md` | keep (merge target) | Distinct subject (roles, invites, members); becomes merge target for the notification/currency group per Requirement 5.3, despite thin topical overlap with notifications | — (absorbs three files) |
| `docs/user-guide-notifications.md` | consolidate | Near-duplicate of `push-notifications-guide.md` | `user-guide-budget-collaboration.md` |
| `docs/web-app-polish-plan.md` | delete | `web-app-polish` spec status is `complete` (Requirement 6.3) | — |

**`docs/archive/` top level:**

| File | Disposition | Reason |
|---|---|---|
| `docs/archive/FAMILYID_FIX_TEST_SUMMARY.md` | delete | One-off test-coverage summary for a bug in the now-removed `FAMILY#` model |
| `docs/archive/MOBILE_APP_TESTING_COMPLETE.md` | delete | One-off session summary confirming a specific test run; no ongoing reference value |
| `docs/archive/ONBOARDING_BUG_FIXES_COMPLETE.md` | delete | One-off bug-fix summary (location detection 403, etc.), fixes already shipped |
| `docs/archive/ONBOARDING_INTEGRATION_COMPLETE.md` | delete | One-off deployment completion summary, superseded by current onboarding flow docs |
| `docs/archive/RECURRING_BUDGET_FIX.md` | delete | One-off bug description, duplicated by `RECURRING_BUDGET_FIX_COMPLETE.md` |
| `docs/archive/RECURRING_BUDGET_FIX_COMPLETE.md` | delete | One-off fix summary; no unresolved issue or ongoing decision recorded |
| `docs/archive/RECURRING_BUDGET_TESTING_COMPLETE.md` | delete | One-off test-run summary |

**`docs/archive/blockers/`:**

| File | Disposition | Reason |
|---|---|---|
| `docs/archive/blockers/.gitkeep` | delete | Placeholder for a directory being removed |
| `docs/archive/blockers/FAMILY_LAMBDA_502_BLOCKER.md` | delete | Resolved blocker in the deprecated `family` Lambda; root cause (AWS SDK v2 vs v3) is a generic lesson but not tied to any current unresolved issue |

**`docs/archive/sessions/`:**

| File | Disposition | Reason |
|---|---|---|
| `docs/archive/sessions/.gitkeep` | delete | Placeholder for a directory being removed |
| `docs/archive/sessions/API_GATEWAY_DEPLOYMENT_FIX.md` | delete | One-off deployment fix summary |
| `docs/archive/sessions/ARCHITECTURE_REVIEW.md` | delete | Superseded — current architecture is documented in `ARCHITECTURE_DECISIONS.md` and the merged `aws-stack-architecture.md` |
| `docs/archive/sessions/AUTONOMOUS_DEVELOPMENT_DESIGN.md` | delete | Historical design note for the autonomous-mode hooks; current hook behavior is described directly in `.kiro/steering/00-global.md` |
| `docs/archive/sessions/BACKUP_RESTORE_IMPLEMENTATION.md` | delete | One-off implementation summary for a shipped feature |
| `docs/archive/sessions/COMPREHENSIVE_HOOK_ANALYSIS.md` | delete | Historical hook analysis superseded by the current 4-hook set |
| `docs/archive/sessions/DOCUMENTATION_ENFORCEMENT_ANALYSIS.md` | delete | Historical analysis, superseded by `documentation-standards.md` steering |
| `docs/archive/sessions/FIXES_APPLIED.md` | delete | Generic one-off fix log |
| `docs/archive/sessions/HOOK_ANALYSIS.md` | delete | Historical hook analysis superseded by current hook set |
| `docs/archive/sessions/SESSION_SUMMARY.md` | delete | One-off session summary |

**`docs/archive/kiro/`:**

| File | Disposition | Reason |
|---|---|---|
| `docs/archive/kiro/.gitkeep` | delete | Placeholder for a directory being removed |
| `docs/archive/kiro/DEPLOYMENT_FAILURE_SUMMARY.md` | delete | One-off CloudFormation export-conflict incident, marked RESOLVED |
| `docs/archive/kiro/SESSION_41_SUMMARY.md` | delete | Duplicate of `DEPLOYMENT_FAILURE_SUMMARY.md` (same incident, same date) |
| `docs/archive/kiro/SESSION_CONTINUITY_UPDATE.md` | delete | One-off steering-change summary; the actual steering content it describes is what matters and is live in `00-global.md` today |
| `docs/archive/kiro/STEERING_OPTIMIZATION_COMPLETE.md` | delete | One-off steering-cleanup summary from January 2026, long superseded by many later steering edits |

**Repository root:**

| File | Disposition | Reason |
|---|---|---|
| `README.md` | keep | Actively maintained, current | — |
| `CHANGELOG.md` | keep | Actively maintained per every commit (documentation-standards steering) | — |
| `DEVELOPMENT_LOG.md` | keep | Actively maintained per every commit | — |
| `ARCHITECTURE_DECISIONS.md` | keep | ADR-001 is the authoritative record of the budget-centric migration; still current and referenced elsewhere | — |
| `SECURITY.md` | keep | Current security practices document, matches actual `security-check.sh`/pre-push hook behavior | — |

**`.kiro/` and `.github/` top-level docs:**

| File | Disposition | Reason |
|---|---|---|
| `.kiro/README.md` | keep (updated) | Update required by Requirement 9.6 to remove `archive/` references | — |
| `.kiro/SYSTEM_GUIDE.md` | keep (updated) | Same — remove `archive/` references, update "Archived specs" section to reflect flat structure with statuses | — |
| `.github/workflows/README.md` | keep | Accurate for current `pr-check.yml`/`deploy-dev.yml`; "Future Environments" section describing staging/prod as hypothetical is stale (prod deploy already exists per `deploy-prod.yml`) but this is a minor correction, not a deletion — out of this spec's explicit scope (not named in Requirement 4.3's disposition list as needing content correction beyond enumeration) | — |
| `.github/BRANCH_PROTECTION.md` | keep | Accurate, describes current required checks and secrets | — |

**Backend/infrastructure/packages READMEs:**

| File | Disposition | Reason |
|---|---|---|
| `backend/README.md` | keep (correct) | Lists `family/` Lambda without deprecation note and frames the auth-Lambda-splitting refactor as "1 of 6 complete, in progress" — this refactor is not mentioned as ongoing anywhere else in the current work log; needs a status correction, not deletion |
| `infrastructure/README.md` | keep (correct) | Same stale "Phase 2 in progress" framing; needs correction, not deletion |
| `packages/shared/README.md` | keep | Accurate | — |
| `packages/api-client/README.md` | keep (correct) | Lists a `Family API` (`src/family.ts`) section without a deprecation note; needs a one-line correction | — |
| `backend/functions/*/README.md` (individual Lambda READMEs, ~15 exist out of 39 function directories) | keep (spot-correct) | Reviewed representative samples (`budgets/README.md` — accurate, already says "Replaces the legacy `family` Lambda"; `budget-alerts/README.md` — uses `familyId`/`getFamilyUsers` naming that is stale relative to the `BUDGET#` model; `auth-onboarding/README.md`, `subscriptions/README.md`, `investments-price-updater/README.md` — accurate). Disposition is per-file keep, with a correction pass needed only on READMEs that still reference `familyId`/`FamilyIdResolver` terminology (`budget-alerts/README.md` confirmed; others to be checked individually during task execution) | — |

**Files referenced by `docs/README.md` today that do not exist** (`api-troubleshooting.md`, `github-secrets-setup.md`): not in scope for disposition since they were never created — the rewritten `docs/README.md` simply must not reference them (Requirement 7.4).

### 5. Consolidation Merge Plan (Requirement 5)

**Architecture trio → `aws-stack-architecture.md`:**

- **Merge target**: `docs/aws-stack-architecture.md` (chosen because it already contains the most complete content: full stack table, dependency graph, DynamoDB schema and access patterns, Lambda access pattern code sample, RBAC table, and per-stack Lambda/route tables — `stack-management-guide.md` and `aws-resource-standards.md` are both subsets or non-overlapping siblings)
- **From `stack-management-guide.md`**: nothing new needs to be added — its "Deployment Order", "Stack Responsibilities Matrix", and "Cross-Stack References" sections duplicate content already in `aws-stack-architecture.md`'s "Stack Overview"/"Stack Dependencies" sections almost verbatim (same stack list, same dependency structure). Its "Deployment Scenarios" and "Rollback Procedures" CLI command sections (`npx cdk deploy ...`, `aws cloudformation describe-stack-events ...`) are the one genuinely new operational content — these get appended to `aws-stack-architecture.md` as a new `## Deployment Commands` section.
- **From `aws-resource-standards.md`**: this file covers a distinct subject (naming/tagging conventions) not present in `aws-stack-architecture.md` at all. Its full content (naming pattern, mandatory tags, CDK tagging code samples, cost center allocation) is appended to `aws-stack-architecture.md` as a new `## Resource Naming and Tagging Standards` section, verbatim minus the now-redundant header/date metadata.
- **Delete after merge**: `stack-management-guide.md`, `aws-resource-standards.md`
- **`.drawio` file**: confirmed stale by direct content read (depicts pre-ADR-001 "Family API"/"Family Lambda" architecture with no `api-budgets`/`api-features-extended`/separate `notification` stack). **Delete** — do not reference it from the merge target.

**User-guide quartet → `user-guide-budget-collaboration.md`:**

- **Merge target**: `docs/user-guide-budget-collaboration.md` (chosen because Requirement 5.3 explicitly frames the merge target as covering "user-facing collaboration and notification features" together, and this file is the more structurally complete of the two genuinely-overlapping notification guides' siblings)
- **Note on actual content overlap**: reading all four files shows `user-guide-notifications.md` and `push-notifications-guide.md` are near-total duplicates of each other (same 80/90/100% thresholds, same quiet-hours mechanics, same device-management and troubleshooting sections, same FAQ shape) — a clean merge-and-delete pair. `multi-currency-guide.md` is topically unrelated to notifications or collaboration (currency selection/formatting/FAQ) but Requirement 5.3 explicitly names it as part of this merge group; this design follows that explicit instruction rather than overriding it, while flagging that the resulting document covers three distinct concerns (collaboration, notifications, currency) under one file.
- **From `user-guide-notifications.md`**: this is the fuller of the two notification guides (includes a "Privacy & Security" section and richer troubleshooting). Its content becomes a new `## Notifications` top-level section in the merge target, keeping its Overview, Getting Started (mobile/web), Notification Settings, Managing Devices, Notification History, Troubleshooting, Privacy & Security, and FAQ subsections.
- **From `push-notifications-guide.md`**: after comparing against `user-guide-notifications.md`, all of its content is already covered by the migrated section above (same thresholds, same quiet-hours defaults 10PM-8AM vs "10:00 PM to 8:00 AM" — identical; same 10-device limit; same 90-day retention). Nothing new is carried over. Delete outright.
- **From `multi-currency-guide.md`**: its full content becomes a new `## Multi-Currency Support` top-level section in the merge target, condensed to remove the duplicate "Changelog" section (superseded by the repository's real `CHANGELOG.md`).
- **New top-level structure of the merged file**: `# Budget Collaboration & Notifications User Guide` → `## Budget Collaboration` (existing content, unchanged) → `## Notifications` (from `user-guide-notifications.md`) → `## Multi-Currency Support` (from `multi-currency-guide.md`)
- **Delete after merge**: `user-guide-notifications.md`, `push-notifications-guide.md`, `multi-currency-guide.md`

**Result**: Doc_Index has exactly one entry for the architecture/stack subject area (`aws-stack-architecture.md`) and exactly one entry for the collaboration/notifications/currency subject area (`user-guide-budget-collaboration.md`), satisfying Requirement 5.4.

**Requirement 5.5 — additional overlapping pairs found beyond the two named groups**: reading the full doc set surfaced exactly one more duplicate pair not named in Requirement 5: `docs/archive/kiro/DEPLOYMENT_FAILURE_SUMMARY.md` and `docs/archive/kiro/SESSION_41_SUMMARY.md` describe the identical CloudFormation export-conflict incident on the identical date. Since both are being deleted under Requirement 6.5 (one-off historical incident with no ongoing reference value), no merge target is needed — this is a delete-both case rather than a keep-one-delete-rest case, and is recorded here rather than in the Doc_Index since neither survives.

### 6. New `docs/README.md` Structure (Requirement 7)

```markdown
# BudgetBuddy Documentation

**Last Updated**: <date of consolidation>

## Architecture & Infrastructure
- **[AWS Stack Architecture](./aws-stack-architecture.md)** — Stack list, dependencies, DynamoDB schema, Lambda access pattern, resource naming/tagging standards, deployment commands

## Configuration & Setup
- **[Configuration Guide](./configuration-guide.md)** — Environment variables and frontend configuration
- **[Deployment Guide](./deployment-guide.md)** — AWS prerequisites and CDK deployment steps
- **[LocalStack Guide](./localstack-guide.md)** — Local AWS service emulation for faster Lambda iteration
- **[SES Email Setup](./ses-email-setup.md)** — Verifying sender identities while SES is in sandbox mode

## API Reference
- **[API Endpoints](./api-endpoints.md)** — Complete REST API documentation with auth token usage

## User Guides
- **[Budget Collaboration & Notifications](./user-guide-budget-collaboration.md)** — Roles, invitations, member management, push notifications, and multi-currency support

## Product & Design
- **[Product Requirements](./product-requirements.md)** — Living document of what is built, in progress, and planned
- **[Mobile UX Design](./mobile-ux-design.md)** — Competitive analysis and design system for the mobile app

## Development Process
- **[Development Status](./development-status.md)** — Current session progress and next priorities
- **[Development Best Practices](./DEVELOPMENT_BEST_PRACTICES.md)** — Architecture patterns and lessons learned

## Outside `/docs`
- **[Repository README](../README.md)** — Project overview, quick start, recent achievements
- **[Architecture Decision Records](../ARCHITECTURE_DECISIONS.md)** — ADR-001 and future ADRs
- **[Security Guidelines](../SECURITY.md)** — Secret management, incident response
- **[.kiro/README.md](../.kiro/README.md)** — Development system configuration overview
- **[.kiro/SYSTEM_GUIDE.md](../.kiro/SYSTEM_GUIDE.md)** — Architecture summary, workflow, deprecated items
- **[.kiro/specs/README.md](../.kiro/specs/README.md)** — Spec index (status, category, description)
- **[.github/workflows/README.md](../.github/workflows/README.md)** — CI/CD workflow reference
- **[.github/BRANCH_PROTECTION.md](../.github/BRANCH_PROTECTION.md)** — Required status checks and secrets
- **[backend/README.md](../backend/README.md)** — Lambda functions package overview
- **[infrastructure/README.md](../infrastructure/README.md)** — CDK stacks package overview
- **[packages/shared/README.md](../packages/shared/README.md)** — Shared types/utilities package overview
- **[packages/api-client/README.md](../packages/api-client/README.md)** — HTTP client library overview
```

Each entry follows the format `**[Display Name](relative-path)** — one-line purpose, ≤160 characters`, matching Requirement 7.2's format. Files that are individually enumerated but too numerous to list one-by-one (the ~39 `backend/functions/*/README.md` files) are intentionally not listed as separate Doc_Index entries — they are code-adjacent documentation covered by the `structure.md` steering rule ("README per Lambda function") rather than `/docs` subject-matter documentation, consistent with Requirement 7.6's framing of "package-level READMEs" as a single category rather than an exhaustive per-function list. This is a scoping decision made explicit here rather than left ambiguous.

### 7. Steering Rule Additions (Requirement 9)

**Addition to `.kiro/steering/structure.md`** (append after the existing "## Adding a Feature" section, before "## Key Frontend Routes"):

```markdown
## Spec Lifecycle

All specs are direct children of `.kiro/specs/` — there is no `archive/` subdirectory. A spec's
lifecycle state lives in its `.config.kiro` `status` field (`active | complete | superseded`),
never in its location. When a spec finishes, update its `status` field in place and update
`.kiro/specs/README.md` in the same commit — do not move the spec directory.

## Documentation Placement

Before creating a new document under `/docs`, check `docs/README.md` for an existing document
covering the same subject area and extend that document instead of creating a new one when
substantial overlap exists.

## No Stray Root Artifacts

No debug screenshot, log file, or ad-hoc generated artifact may be committed to the repository
root. Such files belong in a git-ignored directory (e.g. `.playwright-mcp/`) or must be deleted
after use.
```

**Addition to `.kiro/steering/documentation-standards.md`** (append after the existing "## Code Docs" section):

```markdown
## Doc Index Maintenance

`docs/README.md` must be updated in the same commit whenever a document under `/docs` is added,
deleted, or renamed.
```

These additions directly satisfy Requirement 9.1 (spec lifecycle rule), 9.2 (check-before-creating rule), 9.3 (no stray artifacts rule), and 9.4 (doc-index-same-commit rule). Requirement 9.5 (update `.kiro/specs/README.md` on spec completion) is folded into the same "Spec Lifecycle" section above rather than a separate rule, since both instructions govern the same event (marking a spec complete).

### 8. Stray Artifact Removal (Requirement 8)

Confirmed via repository-wide search before finalizing:

- `overview-error.png` and `overview-fixed.png`: grep across the repository for both filenames found **zero** references anywhere except inside this spec's own `requirements.md` (which describes deleting them). No document, no source file, no configuration references either image. **Confirmed safe to delete.**
- Untracked junk directory: confirmed present at the repository root via directory listing with the exact literal name `` test-I`U&M9X `` (contains a backtick and other non-standard characters, matching Requirement 8.2's description of a `test-I`-prefixed directory with non-printable/control characters). **Confirmed exists, confirmed safe to delete** — directory listing shows no files of interest are nested inside worth preserving (it is a tool-generated junk directory, not source code).

## Data Models

Not applicable in the traditional sense (no database schema changes). The only "data model" affected is the `.config.kiro` JSON schema, specified in full in Components and Interfaces section 2 above.

## Correctness Properties

### Property 1: No orphaned references

For all documents deleted or renamed during consolidation, no retained document under `/docs`, `.kiro/README.md`, or `.kiro/SYSTEM_GUIDE.md` references that document's old path.

**Validates: Requirements 6.7, 7.4**

This feature is an organizational/documentation consolidation: every acceptance criterion refers to a specific named file, directory, or one-time content change, not a pure function operating over a large or infinite input space. There is no meaningful "for all X, property P(X) holds" statement to write over a generated input space — each criterion, including the property above, is checked with a single, fixed existence/content assertion, which is a documented exclusion case for property-based testing (matching the IaC/configuration-validation/CRUD exclusion category). Traditional generative property-based testing is skipped for this feature; the property above is instead verified through the fixed, example-based and structural (grep-based) checks described in the Testing Strategy below, rather than through randomized input generation.

## Error Handling

Since this is a one-time file/content migration rather than a running service, "error handling" here means the failure modes the consolidation work itself must guard against, and how each is prevented or caught:

| Failure mode | Prevention / detection |
|---|---|
| A spec directory is moved but its `.config.kiro` is forgotten | Requirement 2.2's completion check: after all moves, verify every one of the 19 directories under `.kiro/specs/` contains a `.config.kiro` with both `status` and `category` set, before considering the flattening step done |
| A doc is deleted but still referenced from `docs/README.md`, `.kiro/README.md`, or `.kiro/SYSTEM_GUIDE.md` | Grep all three index/guide files for every deleted filename after the deletion pass; any hit is a broken reference that must be fixed before the consolidation is considered complete (Requirement 6.7, 7.4) |
| A merge drops content that had no duplicate elsewhere (e.g. `stack-management-guide.md`'s rollback commands) | The merge plan in this design explicitly names the "genuinely new" content per source file and where it lands in the target — the merge step must be checked against this design's per-file breakdown, not done freehand |
| The `test-I`-prefixed directory or `.png` files are deleted while still referenced by something not yet discovered | Requirement 8.3's post-check: after deletion, re-run a repository-wide search for `.png`/`.jpg`/`.jpeg` at the repository root and confirm zero results; re-run a search for the literal junk directory name and confirm zero results |
| A spec status is set to `active` for a directory that was under `archive/` | Requirement 2.3 is a hard constraint — the status table in this design assigns only `complete` or `superseded` to all 12 formerly-archived specs, never `active`; this must be checked against that table, not re-derived from scratch during implementation |
| Steering rule additions accidentally duplicate or contradict existing content in `structure.md` / `documentation-standards.md` | Both addition blocks in this design are written as new subsections appended after specific existing sections (named exactly), not as edits to existing text — reducing risk of accidental duplication; a diff review before commit confirms no existing line is altered |

## Testing Strategy

Property-based testing does not apply to this feature (see Correctness Properties). Verification is structural and content-based, directly mirroring Requirement 10's completion checklist:

**Structural checks (smoke-test style, run once after implementation):**
1. `list_directory` on `.kiro/specs/` contains no subdirectory named `archive` (Requirement 10.1)
2. `list_directory` on `.kiro/specs/` contains exactly the 19 named spec directories, no more, no fewer
3. Every one of the 19 spec directories contains a `.config.kiro` with non-empty `status` and `category` fields matching the tables in this design
4. `.kiro/specs/README.md` exists and its table contains exactly 19 rows, one per spec directory present (Requirement 10.3)
5. `list_directory` on `/docs` (non-recursive) contains no file not accounted for in this design's inventory table, and no file with disposition `delete` from that table (Requirement 10.2)
6. `list_directory` on `/docs/archive` fails (directory no longer exists) after the archive files are migrated/deleted per the inventory table
7. `overview-error.png`, `overview-fixed.png`, and the `test-I`-prefixed directory no longer exist at the repository root (Requirement 10.4); a root-level `.png`/`.jpg`/`.jpeg` search returns zero results (Requirement 8.3)
8. `structure.md` contains the three new subsections ("Spec Lifecycle", "Documentation Placement", "No Stray Root Artifacts") and `documentation-standards.md` contains the "Doc Index Maintenance" subsection (Requirement 10.5)

**Content checks (example-based, one assertion per named file):**
9. `docs/aws-stack-architecture.md` contains a `## Resource Naming and Tagging Standards` section and a `## Deployment Commands` section (evidence the merge actually happened, not just that the source files were deleted)
10. `docs/user-guide-budget-collaboration.md` contains `## Notifications` and `## Multi-Currency Support` sections
11. `docs/README.md` contains no relative link to any file with disposition `delete` in this design's inventory table (Requirement 7.4), and contains an entry for every file with disposition `keep` or that is a merge target (Requirement 4.6)
12. `docs/localstack-guide.md` no longer contains the string `family invite` / `family members` (the stale Lambda-name references); contains `budgets` in their place
13. `backend/README.md`, `infrastructure/README.md`, and `packages/api-client/README.md` no longer describe the auth-Lambda-splitting refactor as "in progress" without a status correction, and note that `family`/Family API is deprecated where mentioned

**Regression check:**
14. No file outside the explicit deletion list in this design is removed — cross-check the final `git status`/diff against this design's inventory tables before committing, since an over-broad deletion (e.g. accidentally deleting a kept root Markdown file) is not easily reversible once pushed
