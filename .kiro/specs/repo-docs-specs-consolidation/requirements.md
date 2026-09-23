# Requirements Document

## Introduction

BudgetBuddy's repository has accumulated spec and documentation sprawl across ~162 development sessions: specs are split between an active directory and a separate `archive/` subdirectory, `/docs` contains 21 files plus a nested `archive/` tree (~20 more files across `blockers/`, `sessions/`, `kiro/`) with duplicated and obsolete content, and stray debug artifacts have been committed to the repository root. This feature defines a one-time repository reorganization plus permanent steering rules so specs live under a single flat location with status metadata instead of a separate archive folder, every document in the repository is accounted for (kept, consolidated, or deleted) and indexed with a one-line purpose, naming conventions distinguish feature specs from process/historical specs, and stray root-level artifacts are removed and prevented from recurring. This is an organizational/documentation feature: acceptance criteria describe file, directory, and content state, not application runtime behavior.

## Glossary

- **Spec**: A directory under `.kiro/specs/` containing `requirements.md`, and optionally `design.md`, `tasks.md`, and `.config.kiro`, describing one unit of work.
- **Spec_Status**: A metadata value attached to a Spec indicating its lifecycle state: `active`, `complete`, or `superseded`.
- **Spec_Category**: A classification of a Spec's subject matter: `feature` (user-facing product capability), `process` (development workflow, tooling, hooks, steering, or documentation work), or `fix` (bug fix or defect remediation not tied to a new feature).
- **Doc_Index**: A single Markdown file, `docs/README.md`, that lists every retained document in the repository's documentation set with a one-line purpose statement and its file path.
- **Retained_Document**: A document that the Doc_Inventory_Review determines should continue to exist in the repository after consolidation, either unchanged, edited, or as the merge target of one or more other documents.
- **Consolidated_Document**: A Retained_Document that is the merge target of two or more prior documents whose overlapping content was combined and whose source documents were deleted.
- **Obsolete_Document**: A document describing functionality, tooling, or plans that no longer exist, are superseded, or have already shipped, and which is deleted rather than retained.
- **Doc_Inventory_Review**: The complete enumeration and disposition decision (keep, consolidate, or delete) for every document in scope, covering `/docs` (including its `archive/` subtree), root-level Markdown files, `.kiro/README.md`, `.kiro/SYSTEM_GUIDE.md`, `.github/workflows/README.md`, `.github/BRANCH_PROTECTION.md`, and package/function-level README files under `backend/`, `infrastructure/`, and `packages/*/`.
- **Repository_Root**: The top-level directory of the BudgetBuddy monorepo (the directory containing `package.json` and `.kiro/`).
- **Stray_Artifact**: A file or directory at the Repository_Root that is not source code, configuration, or an intentionally tracked project asset, such as ad-hoc debug screenshots or tool-generated junk directories.
- **Steering_File**: A Markdown file under `.kiro/steering/` that defines a persistent rule the agent must follow in future sessions.

## Requirements

### Requirement 1: Flatten Spec Storage Into a Single Location

**User Story:** As the project owner, I want all specs stored under one location without a separate archive subdirectory, so that I can find any spec — current or historical — in one place without checking two directories.

#### Acceptance Criteria

1. THE Consolidation SHALL move every Spec directory currently under `.kiro/specs/archive/` to `.kiro/specs/` directly, preserving each Spec's internal file contents unchanged except for the additions required by Requirement 2.
2. WHEN the move described in Acceptance Criterion 1 is complete, THE Consolidation SHALL delete the now-empty `.kiro/specs/archive/` directory.
3. THE Consolidation SHALL result in a `.kiro/specs/` directory containing no subdirectory named `archive`.
4. THE Consolidation SHALL result in every one of the 19 Specs identified during the Doc_Inventory_Review and Spec_Inventory_Review (7 previously active plus 12 previously archived) existing as a direct child directory of `.kiro/specs/`.
5. IF two Spec directories being merged into `.kiro/specs/` would have the same directory name, THEN THE Consolidation SHALL rename the more recent or more relevant Spec directory to a disambiguated kebab-case name and record the rename in the design phase.

### Requirement 2: Track Spec Lifecycle State as Metadata, Not Location

**User Story:** As the project owner, I want a Spec's completion state recorded as metadata inside the Spec, so that I know at a glance whether a Spec is active, done, or superseded without inferring it from which folder it lives in.

#### Acceptance Criteria

1. THE Consolidation SHALL add a `status` field with value `active`, `complete`, or `superseded` to the `.config.kiro` file of every Spec under `.kiro/specs/`.
2. IF a Spec directory does not already contain a `.config.kiro` file, THEN THE Consolidation SHALL create one containing at minimum the `status` field and a `category` field.
3. WHERE a Spec was located under `.kiro/specs/archive/` prior to Consolidation, THE Consolidation SHALL set that Spec's `status` field to `complete` or `superseded` based on the Spec's actual outcome, never to `active`.
4. THE Consolidation SHALL produce a single index file, `.kiro/specs/README.md`, that lists every Spec directory name, its `status`, its `Spec_Category`, and a one-line description.
5. WHEN a future session marks a Spec as finished, THE Steering_File governing spec structure SHALL instruct the agent to update that Spec's `status` field in place rather than moving the Spec directory to a different location.

### Requirement 3: Categorize and Rename Specs for At-a-Glance Clarity

**User Story:** As the project owner, I want spec directory names to reflect whether they are product features, process/tooling work, or bug fixes, so that I can distinguish current feature work from historical process work without opening each spec.

#### Acceptance Criteria

1. THE Consolidation SHALL assign exactly one Spec_Category value (`feature`, `process`, or `fix`) to each of the 19 Specs based on its subject matter.
2. THE Consolidation SHALL classify `goals-borrow-lend`, `planned-transactions`, `web-app-polish`, `ai-bill-reminders-budget-planning`, `push-notifications-reminders`, `mobile-app`, `competitive-features`, `enhanced-accounts-transactions`, `multi-currency`, `mobile-ui-polish`, `ui-polish-enhancements`, and `plan-model-redesign` as Spec_Category `feature`.
3. THE Consolidation SHALL classify `e2e-testing-infrastructure`, `documentation-cleanup`, `documentation-validation-fix`, `hooks-optimization`, and `test-coverage-improvement` as Spec_Category `process`.
4. THE Consolidation SHALL classify `critical-bug-fixes` and `onboarding-403-fix` as Spec_Category `fix`.
5. THE Consolidation SHALL record each Spec's Spec_Category in its `.config.kiro` file and in the `.kiro/specs/README.md` index, and SHALL NOT rename Spec directories to embed the category as a filename prefix.
6. WHERE a Spec's existing kebab-case directory name does not clearly reflect its feature or solution area, THE Consolidation SHALL propose a clearer kebab-case name in `.kiro/specs/README.md` and apply the rename using a method that preserves reference integrity.

### Requirement 4: Complete Document Inventory Review With No Silent Omissions

**User Story:** As the project owner, I want every document in the repository reviewed and given an explicit disposition, so that nothing is silently forgotten or left in an inconsistent state.

#### Acceptance Criteria

1. THE Doc_Inventory_Review SHALL enumerate every file under `/docs` including all files under `docs/archive/`, `docs/archive/blockers/`, `docs/archive/sessions/`, and `docs/archive/kiro/`.
2. THE Doc_Inventory_Review SHALL enumerate the following Repository_Root files: `README.md`, `CHANGELOG.md`, `DEVELOPMENT_LOG.md`, `ARCHITECTURE_DECISIONS.md`, `SECURITY.md`.
3. THE Doc_Inventory_Review SHALL enumerate `.kiro/README.md`, `.kiro/SYSTEM_GUIDE.md`, `.github/workflows/README.md`, and `.github/BRANCH_PROTECTION.md`.
4. THE Doc_Inventory_Review SHALL enumerate every `README.md` file found under `backend/functions/*/`, `backend/README.md`, `infrastructure/README.md`, and every `README.md` under `packages/*/` excluding any path containing `node_modules`.
5. THE Doc_Inventory_Review SHALL assign exactly one disposition value (`keep`, `consolidate`, or `delete`) to every document enumerated under Acceptance Criteria 1 through 4.
6. THE Doc_Index SHALL contain one entry for every document with disposition `keep` or that is the merge target of a `consolidate` disposition, and SHALL NOT contain an entry for any document with disposition `delete`.
7. IF a document enumerated during the Doc_Inventory_Review is not given a disposition, THEN THE Consolidation SHALL be considered incomplete and SHALL NOT be presented as finished.

### Requirement 5: Eliminate Duplicate and Overlapping Documentation

**User Story:** As the project owner, I want overlapping documents merged into a single source of truth, so that I don't have to reconcile conflicting or redundant explanations of the same subject.

#### Acceptance Criteria

1. THE Consolidation SHALL merge the overlapping content of `aws-stack-architecture.md`, `aws-resource-standards.md`, and `stack-management-guide.md` into a single Consolidated_Document, and SHALL delete the source files that are not chosen as the merge target.
2. THE Consolidation SHALL determine whether `budgetbuddy-serverless-architecture.drawio` remains accurate and, IF it does, THEN THE Consolidation SHALL reference it from the merge target produced by Acceptance Criterion 1; IF it does not, THEN THE Consolidation SHALL delete it.
3. THE Consolidation SHALL merge the overlapping content of `user-guide-budget-collaboration.md`, `user-guide-notifications.md`, `multi-currency-guide.md`, and `push-notifications-guide.md` into a single Consolidated_Document covering user-facing collaboration and notification features, and SHALL delete the source files that are not chosen as the merge target.
4. THE Doc_Index SHALL contain exactly one entry for the architecture/stack subject area and exactly one entry for the user-facing collaboration/notifications subject area after Consolidation.
5. IF the Doc_Inventory_Review identifies additional overlapping document pairs or groups beyond those named in Acceptance Criteria 1 and 3, THEN THE Consolidation SHALL merge each such group using the same keep-one-delete-rest approach and record the merge in the Doc_Index.

### Requirement 6: Remove Obsolete Documentation

**User Story:** As the project owner, I want documents describing removed tooling, shipped plans, or superseded functionality deleted, so that the documentation set only describes what is true today.

#### Acceptance Criteria

1. THE Consolidation SHALL delete `cicd-automation-guide.md` if the hooks or automation it documents no longer exist in `.kiro/hooks/`, or SHALL update it to match current hooks if it is retained.
2. THE Consolidation SHALL delete `localstack-guide.md` if LocalStack is no longer part of the development workflow, or SHALL retain and correct it if LocalStack usage is confirmed still current.
3. THE Consolidation SHALL delete `web-app-polish-plan.md` given that the `web-app-polish` Spec's status is `complete`.
4. THE Consolidation SHALL delete `MVP-SPRINT-PLAN.md` given that the MVP milestone it plans has already shipped.
5. THE Consolidation SHALL evaluate every file under `docs/archive/sessions/`, `docs/archive/blockers/`, and `docs/archive/kiro/` and delete each file whose content describes a one-off historical fix or session summary with no ongoing reference value, retaining only files that document a still-relevant architectural decision or unresolved issue.
6. WHERE a file described in Acceptance Criteria 1 through 5 contains information with ongoing reference value, THE Consolidation SHALL migrate that information into a Retained_Document before deleting the source file.
7. THE Consolidation SHALL update `docs/README.md`, `.kiro/README.md`, and `.kiro/SYSTEM_GUIDE.md` to remove references to any document deleted under this Requirement.

### Requirement 7: Produce a Self-Describing Documentation Index

**User Story:** As the project owner, I want a single index that tells me what every retained document means, so that I can navigate the documentation set without opening every file.

#### Acceptance Criteria

1. THE Consolidation SHALL create or rewrite `docs/README.md` to serve as the Doc_Index for all documents under `/docs`.
2. THE Doc_Index SHALL list, for every Retained_Document under `/docs`, its relative file path and a one-line purpose statement not exceeding 160 characters.
3. THE Doc_Index SHALL group entries by category matching the subject areas present after Consolidation (for example: architecture and infrastructure, configuration and setup, user guides, development process).
4. THE Doc_Index SHALL NOT reference any document path that does not exist after Consolidation is complete.
5. THE Consolidation SHALL update the "Last Updated" date field in `docs/README.md` to the date the Consolidation is performed.
6. WHERE a Retained_Document exists outside `/docs` (Repository_Root files, `.kiro/README.md`, `.kiro/SYSTEM_GUIDE.md`, package-level READMEs), THE Doc_Index SHALL include a separate section listing each such document's path and one-line purpose statement.

### Requirement 8: Remove Stray Root-Level Artifacts

**User Story:** As the project owner, I want debug screenshots and junk directories removed from the repository root, so that the root directory only contains intentional project files.

#### Acceptance Criteria

1. THE Consolidation SHALL delete the tracked files `overview-error.png` and `overview-fixed.png` from the Repository_Root.
2. THE Consolidation SHALL delete the untracked junk directory at the Repository_Root whose name begins with `test-I` and contains non-printable or control characters.
3. AFTER the Consolidation completes, THE Repository_Root SHALL contain no `.png`, `.jpg`, or `.jpeg` file that is not referenced by a Retained_Document or required by application source code or configuration.
4. IF a Stray_Artifact under review is found to be referenced by a Retained_Document or required by build tooling, THEN THE Consolidation SHALL retain that artifact and record the reason in the Doc_Index rather than deleting it.

### Requirement 9: Establish Steering Rules to Prevent Recurrence

**User Story:** As the project owner, I want enforceable steering rules that stop the same sprawl problems from happening again, so that future sessions don't recreate an archive split, duplicate documentation, or stray root files.

#### Acceptance Criteria

1. THE Consolidation SHALL add a rule to `structure.md` stating that all Specs live as direct children of `.kiro/specs/` and that a Spec's lifecycle state is recorded via the `status` field in `.config.kiro`, never by moving the Spec to a differently named directory.
2. THE Consolidation SHALL add a rule to `structure.md` or `documentation-standards.md` stating that before creating a new document under `/docs`, the agent SHALL first check `docs/README.md` for an existing document covering the same subject area and SHALL extend that document instead of creating a new one when substantial overlap exists.
3. THE Consolidation SHALL add a rule to `structure.md` stating that no debug screenshot, log file, or ad-hoc generated artifact SHALL be committed to the Repository_Root, and that such artifacts belong in a git-ignored directory or must be deleted after use.
4. THE Consolidation SHALL add a rule to `documentation-standards.md` requiring that `docs/README.md` be updated in the same commit whenever a document under `/docs` is added, deleted, or renamed.
5. WHEN a future session completes a Spec, THE Steering_File governing spec structure SHALL instruct the agent to update `.kiro/specs/README.md` in the same commit that marks the Spec's `status` as `complete`.
6. THE Consolidation SHALL update `.kiro/README.md` and `.kiro/SYSTEM_GUIDE.md` to remove all references to `.kiro/specs/archive/` as a distinct location and to describe the flat, status-metadata-based structure instead.

### Requirement 10: Verifiable Structural Completion State

**User Story:** As the project owner, I want the completion of this consolidation to be checkable against concrete file-system and content conditions, so that "done" is objective rather than a subjective judgment call.

#### Acceptance Criteria

1. THE Consolidation SHALL be considered complete only if no directory named `archive` exists under `.kiro/specs/`.
2. THE Consolidation SHALL be considered complete only if every file remaining under `/docs` after Consolidation, excluding `docs/README.md` itself, has a corresponding entry in the Doc_Index.
3. THE Consolidation SHALL be considered complete only if `.kiro/specs/README.md` exists and lists every Spec directory present under `.kiro/specs/` at that time.
4. THE Consolidation SHALL be considered complete only if `overview-error.png`, `overview-fixed.png`, and the `test-I`-prefixed junk directory no longer exist at the Repository_Root.
5. THE Consolidation SHALL be considered complete only if `structure.md` and `documentation-standards.md` contain the rules described in Requirement 9.
6. THE Consolidation SHALL be considered complete only if no two Retained_Documents under `/docs` cover the same subject area described in Requirement 5 as separate, non-cross-referencing files.
