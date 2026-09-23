# Implementation Plan: Repository Docs & Specs Consolidation

## Overview

This plan is split into two kinds of task groups:

- **Groundwork groups (A)** — create new files or draft new content only. Nothing existing is
  deleted, moved, or overwritten destructively. Safe to run immediately.
- **Destructive groups (B–F)** — move spec directories, delete files, rewrite/merge documents in
  place, or delete root artifacts. These are grouped to match the design's execution areas
  (spec flattening, doc merges, doc deletions, root cleanup, steering rules) so each group can be
  reviewed and approved as its own reversible-vs-not batch rather than one giant sweep. **Do not
  start a destructive group until the user has approved it.**

Each group ends with the specific structural/content verification checks from design.md's
"Testing Strategy" and "Error Handling" sections that apply to that group's changes.

---

## Tasks

### Group A — Groundwork (non-destructive, safe to run now)

- [x] 1. Draft `.kiro/specs/README.md` spec index content
  - Create `.kiro/specs/README.md` with the exact table structure from design.md section 3: header, "Last Updated" date, the flat-structure/no-archive explanatory note, and all 19 rows (spec name, status, category, one-line description) sorted alphabetically
  - This file only lists specs — it does not move any spec directory yet, so it is accurate to write before Group B runs (the table describes the target end state)
  - _Requirements: 2.4, 3.5, 10.3_

- [x] 2. Draft rewritten `docs/README.md` doc index content
  - Create the new `docs/README.md` content following the exact structure from design.md section 6 (Architecture & Infrastructure, Configuration & Setup, API Reference, User Guides, Product & Design, Development Process, Outside `/docs` sections), using the current date as "Last Updated"
  - Include only entries for documents with disposition `keep` or that are merge targets, per the inventory table in design.md section 4 — do not include entries for `delete`-disposition files (Requirement 4.6, 7.4)
  - Note: this draft references `aws-stack-architecture.md`'s future `## Resource Naming and Tagging Standards` / `## Deployment Commands` sections and `user-guide-budget-collaboration.md`'s future `## Notifications` / `## Multi-Currency Support` sections, which do not exist yet — this is expected; Group D creates them. Do not commit/replace the live `docs/README.md` until Group D and Group E are approved and run
  - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6_

- [x] 3. Draft steering rule additions as new sections
  - Draft the "Spec Lifecycle", "Documentation Placement", and "No Stray Root Artifacts" sections (exact text from design.md section 7) as content ready to append to `.kiro/steering/structure.md`
  - Draft the "Doc Index Maintenance" section (exact text from design.md section 7) as content ready to append to `.kiro/steering/documentation-standards.md`
  - Do not append yet — Group F applies these as an explicit, reviewable diff-only change (no existing steering text altered)
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 4. Draft `.config.kiro` content for each of the 19 specs
  - For each of the 7 currently-active specs and 12 currently-archived specs, draft the exact `.config.kiro` JSON (or updated JSON, preserving existing fields like `specId`/`workflowType`/`specType`) per the status/category table in design.md section 2
  - Store this as a reference checklist (in this task's notes or a scratch file) to apply mechanically in Group B/C — do not overwrite any live `.config.kiro` file yet
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

- [x] 5. Checkpoint — review groundwork drafts with user
  - Present the drafted `.kiro/specs/README.md`, `docs/README.md`, steering additions, and `.config.kiro` values for review
  - Confirm with the user before proceeding to any destructive group (B onward)

---

### Group B — Spec flattening (destructive: 12 directory moves + archive deletion)

**Requires explicit user approval before running.** Each sub-task is one directory move; review as a batch of 12 or approve individually.

- [x] 6. Move `competitive-features` out of archive and set metadata
  - Move `.kiro/specs/archive/competitive-features/` to `.kiro/specs/competitive-features/`
  - Add/update `.config.kiro` with `status: "complete"`, `category: "feature"` (create the file if none exists)
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.2_

- [x] 7. Move `critical-bug-fixes` out of archive and set metadata
  - Move `.kiro/specs/archive/critical-bug-fixes/` to `.kiro/specs/critical-bug-fixes/`
  - Add/update `.config.kiro` with `status: "complete"`, `category: "fix"`
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.4_

- [x] 8. Move `documentation-cleanup` out of archive and set metadata
  - Move `.kiro/specs/archive/documentation-cleanup/` to `.kiro/specs/documentation-cleanup/`
  - Add/update `.config.kiro` with `status: "complete"`, `category: "process"`
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.3_

- [x] 9. Move `documentation-validation-fix` out of archive and set metadata
  - Move `.kiro/specs/archive/documentation-validation-fix/` to `.kiro/specs/documentation-validation-fix/`
  - Add/update `.config.kiro` with `status: "superseded"`, `category: "process"`
  - Confirm no directory name collision with any of the 7 previously-active specs before moving (design.md confirms zero collisions)
  - _Requirements: 1.1, 1.5, 2.1, 2.2, 2.3, 3.3_

- [x] 10. Move `enhanced-accounts-transactions` out of archive and set metadata
  - Move `.kiro/specs/archive/enhanced-accounts-transactions/` to `.kiro/specs/enhanced-accounts-transactions/`
  - Add/update `.config.kiro` with `status: "complete"`, `category: "feature"`
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.2_

- [x] 11. Move `hooks-optimization` out of archive and set metadata
  - Move `.kiro/specs/archive/hooks-optimization/` to `.kiro/specs/hooks-optimization/`
  - Add/update `.config.kiro` with `status: "superseded"`, `category: "process"`
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.3_

- [x] 12. Move `mobile-ui-polish` out of archive and set metadata
  - Move `.kiro/specs/archive/mobile-ui-polish/` to `.kiro/specs/mobile-ui-polish/`
  - Add/update `.config.kiro` with `status: "complete"`, `category: "feature"`
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.2_

- [x] 13. Move `multi-currency` out of archive and set metadata
  - Move `.kiro/specs/archive/multi-currency/` to `.kiro/specs/multi-currency/`
  - Add/update `.config.kiro` with `status: "complete"`, `category: "feature"`
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.2_

- [x] 14. Move `onboarding-403-fix` out of archive and update existing metadata
  - Move `.kiro/specs/archive/onboarding-403-fix/` to `.kiro/specs/onboarding-403-fix/`
  - Update the existing `.config.kiro` (already has `specId`, `workflowType`, `specType: "bugfix"`) in place, adding `status: "complete"` and `category: "fix"` without removing existing fields
  - _Requirements: 1.1, 2.1, 2.3, 3.4_

- [x] 15. Move `plan-model-redesign` out of archive and set metadata
  - Move `.kiro/specs/archive/plan-model-redesign/` to `.kiro/specs/plan-model-redesign/`
  - Add/update `.config.kiro` with `status: "complete"`, `category: "process"` (corrected classification per design.md, overriding the tentative `feature` list in requirements.md 3.2)
  - _Requirements: 1.1, 2.1, 2.2, 2.3_

- [x] 16. Move `test-coverage-improvement` out of archive and set metadata
  - Move `.kiro/specs/archive/test-coverage-improvement/` to `.kiro/specs/test-coverage-improvement/`
  - Add/update `.config.kiro` with `status: "complete"`, `category: "process"`
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.3_

- [x] 17. Move `ui-polish-enhancements` out of archive and set metadata
  - Move `.kiro/specs/archive/ui-polish-enhancements/` to `.kiro/specs/ui-polish-enhancements/`
  - Add/update `.config.kiro` with `status: "complete"`, `category: "feature"`
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.2_

- [x] 18. Set `.config.kiro` metadata on the 7 previously-active specs
  - For `ai-bill-reminders-budget-planning`, `e2e-testing-infrastructure`, `goals-borrow-lend`, `mobile-app`, `planned-transactions`, `push-notifications-reminders`, `web-app-polish`, and `repo-docs-specs-consolidation` itself: add/update `.config.kiro` with the `status`/`category` values from design.md section 2 (all `active` except `web-app-polish` which is `complete`; categories per design.md table, with `repo-docs-specs-consolidation` itself as `status: "active"`, `category: "process"`)
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 19. Delete the now-empty `.kiro/specs/archive/` directory
  - Confirm `.kiro/specs/archive/` contains zero remaining subdirectories after tasks 6–17, then delete it
  - _Requirements: 1.2, 1.3_

- [x] 20. Commit the finalized `.kiro/specs/README.md` index
  - Replace the draft from Group A task 1 with a version confirmed to list exactly the 19 spec directories now present as direct children of `.kiro/specs/`
  - _Requirements: 2.4, 3.5, 10.3_

- [x] 21. Verify Group B completion
  - Confirm `.kiro/specs/` contains no subdirectory named `archive` (Requirement 10.1)
  - Confirm `.kiro/specs/` contains exactly 19 named spec directories, no more, no fewer
  - Confirm every one of the 19 spec directories contains a `.config.kiro` with non-empty `status` and `category` fields matching the design.md tables, and that no formerly-archived spec has `status: "active"` (Requirement 2.3)
  - Confirm `.kiro/specs/README.md` exists and its table contains exactly 19 rows, one per spec directory present (Requirement 10.3)
  - _Requirements: 1.2, 1.3, 1.4, 2.3, 10.1, 10.3_

---

### Group C — Documentation merges (destructive: content rewrite into merge targets)

**Requires explicit user approval before running.** Performed before the source files are deleted in Group D, so the merge targets are complete before anything is removed.

- [x] 22. Merge `stack-management-guide.md`'s unique content into `docs/aws-stack-architecture.md`
  - Append a new `## Deployment Commands` section to `docs/aws-stack-architecture.md` containing the "Deployment Scenarios" and "Rollback Procedures" CLI command content from `docs/stack-management-guide.md` (the only genuinely new content per design.md section 5 — its other sections duplicate existing content and are not migrated)
  - _Requirements: 5.1_

- [x] 23. Merge `aws-resource-standards.md`'s content into `docs/aws-stack-architecture.md`
  - Append a new `## Resource Naming and Tagging Standards` section to `docs/aws-stack-architecture.md` containing the naming pattern, mandatory tags, CDK tagging code samples, and cost center allocation content from `docs/aws-resource-standards.md`, verbatim minus redundant header/date metadata
  - _Requirements: 5.1_

- [x] 24. Merge `user-guide-notifications.md` into `docs/user-guide-budget-collaboration.md`
  - Append a new `## Notifications` top-level section to `docs/user-guide-budget-collaboration.md` containing the Overview, Getting Started, Notification Settings, Managing Devices, Notification History, Troubleshooting, Privacy & Security, and FAQ subsections from `docs/user-guide-notifications.md`
  - _Requirements: 5.3_

- [x] 25. Merge `multi-currency-guide.md` into `docs/user-guide-budget-collaboration.md`
  - Append a new `## Multi-Currency Support` top-level section to `docs/user-guide-budget-collaboration.md` containing the full content of `docs/multi-currency-guide.md`, condensed to remove its duplicate "Changelog" section
  - _Requirements: 5.3_

- [x] 26. Correct `docs/localstack-guide.md`'s stale Lambda reference
  - Replace references to testing the deprecated `family` Lambda (e.g. `node scripts/test-lambda-local.js family invite`) with the equivalent `budgets` Lambda command
  - _Requirements: 6.2_

- [x] 27. Verify Group C completion
  - Confirm `docs/aws-stack-architecture.md` contains both a `## Resource Naming and Tagging Standards` section and a `## Deployment Commands` section
  - Confirm `docs/user-guide-budget-collaboration.md` contains both `## Notifications` and `## Multi-Currency Support` sections
  - Confirm `docs/localstack-guide.md` no longer contains the strings `family invite` or `family members`, and contains `budgets` in their place
  - _Requirements: 5.4_

---

### Group D — Documentation deletions (destructive: file removal)

**Requires explicit user approval before running.** Run only after Group C's merges are verified complete, so no content is lost.

- [x] 28. Delete the three merged architecture source files and the stale diagram
  - Delete `docs/stack-management-guide.md` and `docs/aws-resource-standards.md` (merged into `aws-stack-architecture.md` in Group C)
  - Delete `docs/budgetbuddy-serverless-architecture.drawio` (confirmed stale pre-ADR-001 content per design.md section on this file)
  - _Requirements: 5.1, 5.2_

- [x] 29. Delete the three merged user-guide source files
  - Delete `docs/user-guide-notifications.md`, `docs/push-notifications-guide.md`, and `docs/multi-currency-guide.md` (all merged into or superseded by `user-guide-budget-collaboration.md` in Group C)
  - _Requirements: 5.3_

- [x] 30. Delete obsolete top-level `/docs` files
  - Delete `docs/cicd-automation-guide.md` (documents a hook file that does not exist under current `.kiro/hooks/`)
  - Delete `docs/web-app-polish-plan.md` (the `web-app-polish` spec's status is `complete`)
  - Delete `docs/MVP-SPRINT-PLAN.md` (MVP milestone already shipped)
  - _Requirements: 6.1, 6.3, 6.4_

- [x] 31. Delete `docs/archive/` top-level one-off summary files
  - Delete `docs/archive/FAMILYID_FIX_TEST_SUMMARY.md`, `docs/archive/MOBILE_APP_TESTING_COMPLETE.md`, `docs/archive/ONBOARDING_BUG_FIXES_COMPLETE.md`, `docs/archive/ONBOARDING_INTEGRATION_COMPLETE.md`, `docs/archive/RECURRING_BUDGET_FIX.md`, `docs/archive/RECURRING_BUDGET_FIX_COMPLETE.md`, `docs/archive/RECURRING_BUDGET_TESTING_COMPLETE.md`
  - _Requirements: 6.5_

- [x] 32. Delete `docs/archive/blockers/` contents and the directory
  - Delete `docs/archive/blockers/FAMILY_LAMBDA_502_BLOCKER.md` and `docs/archive/blockers/.gitkeep`, then delete the now-empty `docs/archive/blockers/` directory
  - _Requirements: 6.5_

- [x] 33. Delete `docs/archive/sessions/` contents and the directory
  - Delete `docs/archive/sessions/API_GATEWAY_DEPLOYMENT_FIX.md`, `docs/archive/sessions/ARCHITECTURE_REVIEW.md`, `docs/archive/sessions/AUTONOMOUS_DEVELOPMENT_DESIGN.md`, `docs/archive/sessions/BACKUP_RESTORE_IMPLEMENTATION.md`, `docs/archive/sessions/COMPREHENSIVE_HOOK_ANALYSIS.md`, `docs/archive/sessions/DOCUMENTATION_ENFORCEMENT_ANALYSIS.md`, `docs/archive/sessions/FIXES_APPLIED.md`, `docs/archive/sessions/HOOK_ANALYSIS.md`, `docs/archive/sessions/SESSION_SUMMARY.md`, and `docs/archive/sessions/.gitkeep`, then delete the now-empty `docs/archive/sessions/` directory
  - _Requirements: 6.5_

- [x] 34. Delete `docs/archive/kiro/` contents and the directory
  - Delete `docs/archive/kiro/DEPLOYMENT_FAILURE_SUMMARY.md` and `docs/archive/kiro/SESSION_41_SUMMARY.md` (identical duplicate incident summaries, per design.md Requirement 5.5 finding), `docs/archive/kiro/SESSION_CONTINUITY_UPDATE.md`, `docs/archive/kiro/STEERING_OPTIMIZATION_COMPLETE.md`, and `docs/archive/kiro/.gitkeep`, then delete the now-empty `docs/archive/kiro/` directory
  - _Requirements: 6.5_

- [x] 35. Delete the now-empty `docs/archive/` directory
  - Confirm `docs/archive/` contains zero remaining files or subdirectories after tasks 31–34, then delete it
  - _Requirements: 6.5_

- [x] 36. Replace `docs/README.md` with the finalized doc index
  - Replace the live `docs/README.md` with the finalized version of the Group A task 2 draft, now that Groups C and D have created the merge-target sections and removed the deleted files — confirm no link points to a deleted file (Requirement 7.4) and confirm the "Last Updated" date is current
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 6.7_

- [x] 37. Remove deleted-doc references from `.kiro/README.md` and `.kiro/SYSTEM_GUIDE.md`
  - Update `.kiro/README.md` and `.kiro/SYSTEM_GUIDE.md` to remove any reference to the files deleted in tasks 28–35, and update `.kiro/SYSTEM_GUIDE.md`'s "Archived specs" section to describe the flat, status-metadata-based structure instead of a separate archive location
  - _Requirements: 6.7, 9.6_

- [x] 38. Correct stale "in progress" framing in package-level READMEs
  - Update `backend/README.md` and `infrastructure/README.md` to remove the stale "Phase 2 in progress" / "1 of 6 complete, in progress" framing of the auth-Lambda-splitting refactor (not corroborated by any other current source)
  - Update `packages/api-client/README.md` to note that the `Family API` (`src/family.ts`) section is deprecated
  - Update `backend/functions/budget-alerts/README.md` to replace `familyId`/`getFamilyUsers` terminology with the current `BUDGET#`/budget-access-resolver terminology
  - _Requirements: 4.4 (disposition already assigned as keep-with-correction in design.md's inventory table)_

- [x] 39. Verify Group D completion
  - Grep `docs/README.md`, `.kiro/README.md`, and `.kiro/SYSTEM_GUIDE.md` for the filename of every file deleted in tasks 28–35 and confirm zero matches (Requirement 6.7, 7.4)
  - Confirm `docs/README.md` contains an entry for every file with disposition `keep` or that is a merge target per design.md's inventory table, and no entry for any `delete`-disposition file (Requirement 4.6)
  - Confirm listing `/docs` (non-recursive) shows no file not accounted for in design.md's inventory table, and no file with disposition `delete` (Requirement 10.2)
  - Confirm listing `/docs/archive` fails because the directory no longer exists (Requirement 10.1's sibling check for docs)
  - Cross-check the full set of deletions in tasks 28–35 against design.md's inventory tables to confirm no file outside the explicit deletion list was removed
  - _Requirements: 4.5, 4.6, 4.7, 6.7, 7.4, 10.2_

---

### Group E — Root artifact cleanup (destructive: root file/directory deletion)

**Requires explicit user approval before running.** Independent of Groups B–D; can be approved/run separately.

- [x] 40. Delete stray root-level image files
  - Delete `overview-error.png` and `overview-fixed.png` from the repository root (confirmed via repository-wide grep to have zero references anywhere outside this spec's own requirements.md)
  - _Requirements: 8.1_

- [x] 41. Delete the untracked junk directory at the repository root
  - Delete the directory with the literal name `` test-I`U&M9X `` at the repository root
  - _Requirements: 8.2_

- [x] 42. Verify Group E completion
  - Confirm `overview-error.png`, `overview-fixed.png`, and the `test-I`-prefixed junk directory no longer exist at the repository root (Requirement 10.4)
  - Search the repository root for any `.png`, `.jpg`, or `.jpeg` file and confirm zero results, or if any remain, confirm each is referenced by a Retained_Document or required by build tooling and record the reason (Requirement 8.3, 8.4)
  - _Requirements: 8.3, 8.4, 10.4_

---

### Group F — Steering rule application (low-risk append-only, but changes enforced future behavior)

**Requires explicit user approval before running**, since it changes rules the agent must follow going forward, even though the mechanical change is append-only.

- [x] 43. Append spec lifecycle, doc placement, and no-stray-artifact rules to `structure.md`
  - Append the three drafted sections from Group A task 3 ("Spec Lifecycle", "Documentation Placement", "No Stray Root Artifacts") to `.kiro/steering/structure.md` after the existing "## Adding a Feature" section, without altering any existing line
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 44. Append doc index maintenance rule to `documentation-standards.md`
  - Append the drafted "Doc Index Maintenance" section from Group A task 3 to `.kiro/steering/documentation-standards.md` after the existing "## Code Docs" section, without altering any existing line
  - _Requirements: 9.4, 9.5_

- [x] 45. Verify Group F completion
  - Confirm `structure.md` contains the three new subsections ("Spec Lifecycle", "Documentation Placement", "No Stray Root Artifacts") and that no pre-existing line in the file was altered (diff review)
  - Confirm `documentation-standards.md` contains the "Doc Index Maintenance" subsection and that no pre-existing line in the file was altered (diff review)
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.5_

---

### Group G — Final cross-cutting completion check

Run only after Groups B, C, D, E, and F have all been approved and completed.

- [x] 46. Full consolidation completion verification
  - Re-run all Requirement 10 checks in one pass: no `archive` directory under `.kiro/specs/` (10.1); every remaining `/docs` file except `docs/README.md` has a Doc_Index entry (10.2); `.kiro/specs/README.md` lists every spec directory present (10.3); the three root artifacts no longer exist (10.4); `structure.md` and `documentation-standards.md` contain the Requirement 9 rules (10.5); no two retained `/docs` documents cover the same subject area as separate, non-cross-referencing files (10.6)
  - Grep the full repository (excluding `.git/`) for every deleted filename from Groups B and D to catch any broken reference missed by the narrower Group D check
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

## Notes

- Groups B through F are independent of each other in principle but Group D depends on Group C
  completing first (merges must land before their source files are deleted). Groups B, E, and F
  have no dependency on each other or on C/D and can be approved/run in any order.
- No task in this plan involves writing or running application unit/integration/E2E tests — this
  is a documentation and file-organization feature with no runtime behavior. Verification tasks
  use structural checks (directory listings, grep for references, content assertions) as
  established in design.md's Testing Strategy, in place of automated test suites.
- Every destructive group (B, C, D, E, F) must be explicitly approved by the user before its
  tasks are executed. Group A tasks may be executed immediately since they only create new
  content and do not modify or remove anything existing.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2", "3", "4"] },
    { "id": 1, "tasks": ["6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18"] },
    { "id": 2, "tasks": ["19"] },
    { "id": 3, "tasks": ["20"] },
    { "id": 4, "tasks": ["21", "22", "23", "24", "25", "26", "40", "41", "43", "44"] },
    { "id": 5, "tasks": ["27", "42", "45"] },
    { "id": 6, "tasks": ["28", "29", "30", "31", "32", "33", "34"] },
    { "id": 7, "tasks": ["35"] },
    { "id": 8, "tasks": ["36", "37", "38"] },
    { "id": 9, "tasks": ["39"] },
    { "id": 10, "tasks": ["46"] }
  ]
}
```
