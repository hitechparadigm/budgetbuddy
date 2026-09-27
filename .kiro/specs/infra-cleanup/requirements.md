# Requirements Document

## Introduction

This spec covers two independent, low-complexity operational cleanup items for BudgetBuddy's
AWS infrastructure. Both are grouped into a single lightweight spec because neither has design
ambiguity: Item 1 removes a deployed CDK stack that has been fully superseded and carries no
real traffic, and Item 2 requests AWS SES production access using an already-documented setup.

- **Item 1**: Destroy the deprecated `api-family-stack` CDK stack, remove it from the app
  entrypoint, and reconcile all code/doc/steering references to its deployment status.
- **Item 2**: Request AWS SES production access for the `us-east-1` region so BudgetBuddy can
  send email to real (non-verified) recipients.

## Glossary

- **Api_Family_Stack**: The CDK stack construct `ApiFamilyStack` defined in
  `infrastructure/lib/api-family-stack.ts`, deployed as CloudFormation stack
  `budgetbuddy-dev-api-family`, backing API Gateway `budgetbuddy-family-api` (id `gp8jspfboa`).
  Every route currently returns HTTP 410 Gone.
- **App_Entrypoint**: The CDK app definition file `infrastructure/bin/app.ts` (and its compiled
  `infrastructure/bin/app.js`) that instantiates all stacks and wires their dependencies.
- **Steering_Memory_Files**: The workspace steering files that describe current system state —
  `.kiro/steering/architecture.md`, `.kiro/steering/work-log.md`, `.kiro/steering/gotchas.md`,
  and `.kiro/steering/product.md`.
- **Documentation_Set**: `ARCHITECTURE_DECISIONS.md`, `docs/aws-stack-architecture.md`, and
  `docs/product-requirements.md`, all of which currently state that `budgetbuddy-dev-api-family`
  is still deployed.
- **SES_Sandbox_Mode**: The default Amazon SES restriction that permits sending only to
  explicitly verified email addresses/domains.
- **SES_Production_Access**: The Amazon SES account status, granted via an AWS Support case,
  that removes the sandbox restriction and allows sending to arbitrary recipient addresses.
- **Traffic_Verification_Step**: The action of querying CloudWatch metrics/logs for
  `budgetbuddy-family-api` to confirm request volume immediately before stack destruction.
- **Operator**: The human user executing the destructive AWS actions in this spec (stack
  destruction and SES support case submission).

## Requirements

### Requirement 1: Pre-Destruction Traffic Verification

**User Story:** As the Operator, I want to reconfirm that the Api_Family_Stack has no real
traffic immediately before destroying it, so that a stale assumption from spec-writing time
does not cause an accidental loss of live functionality.

#### Acceptance Criteria

1. WHEN the destruction task for the Api_Family_Stack begins execution, THE Operator SHALL
   re-query CloudWatch metrics or logs for `budgetbuddy-family-api` covering the period since
   the last verification, before issuing any destroy command.
2. IF the re-verification in Criterion 1 shows request activity inconsistent with automated
   scans or health checks (for example, sustained traffic or a new pattern of real client
   requests), THEN THE Operator SHALL halt the destruction task and treat the stack as
   still-in-use pending further investigation.
3. THE Traffic_Verification_Step SHALL be performed as a distinct, logged action separate from
   the original verification recorded in this requirements document.

### Requirement 2: Explicit Confirmation Before Stack Destruction

**User Story:** As the Operator, I want the destruction of the Api_Family_Stack to require my
explicit confirmation at execution time, so that an irreversible CloudFormation deletion never
happens without a final human decision.

#### Acceptance Criteria

1. THE destruction workflow SHALL require explicit Operator confirmation immediately before any
   `cdk destroy` (or equivalent stack-deletion) command targeting `budgetbuddy-dev-api-family` is
   executed.
2. THE destruction workflow SHALL NOT execute a stack-deletion command automatically as part of
   an unattended or batched sequence of infrastructure changes.
3. WHEN Operator confirmation is given, THE destruction workflow SHALL destroy the
   `budgetbuddy-dev-api-family` CloudFormation stack, including its API Gateway
   (`budgetbuddy-family-api`), its Lambda functions, and any other stack-scoped resources.

### Requirement 3: Removal from the CDK App Entrypoint

**User Story:** As a developer, I want the Api_Family_Stack removed from the CDK app definition,
so that future deployments never re-create the deprecated stack.

#### Acceptance Criteria

1. WHEN the Api_Family_Stack has been destroyed per Requirement 2, THE App_Entrypoint SHALL no
   longer import `ApiFamilyStack` from `infrastructure/lib/api-family-stack`.
2. THE App_Entrypoint SHALL no longer instantiate `apiFamilyStack` or declare its
   `addDependency` calls (on `databaseStack` and `authStack`).
3. THE App_Entrypoint SHALL remove `monitoringStack`'s dependency on `apiFamilyStack` while
   preserving `monitoringStack`'s other existing dependencies unchanged.
4. WHERE the compiled `infrastructure/bin/app.js` is checked into the repository, THE
   App_Entrypoint changes SHALL be reflected in `app.js` consistently with `app.ts` (either by
   regenerating it via the project's build step or by editing both files equivalently).
5. WHEN the App_Entrypoint changes are complete, THE CDK app SHALL synthesize successfully
   (`cdk synth`) without errors referencing the removed stack.

### Requirement 4: Disposition of the Stack Source Files

**User Story:** As a developer, I want a clear, explicit decision on what happens to the
Api_Family_Stack's source files after removal from the App_Entrypoint, so that the repository
does not accumulate dead code without a documented reason.

#### Acceptance Criteria

1. THE Api_Family_Stack source file `infrastructure/lib/api-family-stack.ts` and its compiled
   siblings `infrastructure/lib/api-family-stack.js` and `infrastructure/lib/api-family-stack.d.ts`
   SHALL be deleted from the repository once Requirements 2 and 3 are complete.
2. IF a compiled artifact matching `api-family-stack.js` or `api-family-stack.d.ts` is
   regenerated by a subsequent build step, THEN THE build process SHALL be configured (for
   example, via `.gitignore` or build-output exclusion) so the regenerated file is not
   re-committed to the repository.
3. THE comment in `infrastructure/lib/api-features-stack.ts` referencing "Family Lambda moved to
   ApiFamilyStack" and "Family routes moved to ApiFamilyStack" SHALL be updated to reflect that
   the stack has been destroyed and removed, not merely relocated.

### Requirement 5: Backend Lambda Source Reconciliation

**User Story:** As a developer, I want confirmation of whether an orphaned `family` Lambda source
directory exists, so that cleanup is based on verified filesystem state rather than assumption.

#### Acceptance Criteria

1. THE cleanup task SHALL verify, via direct filesystem inspection, whether
   `backend/functions/family/` exists in the repository before taking any action on it.
2. IF `backend/functions/family/` exists at execution time, THEN THE cleanup task SHALL delete it
   as part of this same change, since its only consumer (the Api_Family_Stack) will have been
   destroyed and removed.
3. IF `backend/functions/family/` does not exist at execution time, THEN THE cleanup task SHALL
   record that no action was needed, without creating any placeholder or stub in its place.

> **Note (verified at requirements time):** A repository search at spec-authoring time found no
> `backend/functions/family/` directory — it appears to have already been removed in a prior
> session. Criterion 5.1 requires this to be re-verified at execution time rather than trusting
> this note, since file state may change between spec authoring and task execution.

### Requirement 6: Documentation and Steering Memory Reconciliation

**User Story:** As a developer relying on project documentation and steering memory, I want every
reference to the Api_Family_Stack's deployment status corrected after it is destroyed, so that
the documented system state matches reality.

#### Acceptance Criteria

1. WHEN the Api_Family_Stack has been destroyed and removed from the App_Entrypoint, THE
   Documentation_Set SHALL be updated to state that `budgetbuddy-dev-api-family` has been
   destroyed, replacing any text stating it is "still deployed" or "kept deployed during client
   migration period."
2. THE Steering_Memory_Files SHALL be updated to remove or correct the open item currently
   reading "`api-family-stack` still deployed (returns 410) - destroy after confirming no
   traffic" and the corresponding note in `gotchas.md` reading "Do NOT destroy without
   confirming zero traffic."
3. THE updated Documentation_Set and Steering_Memory_Files SHALL reference the same destruction
   outcome consistently (no file SHALL contradict another about whether the stack still exists).
4. WHERE a Documentation_Set entry also documents historical context (for example, a deprecation
   table row explaining why the stack existed), THE update SHALL preserve that historical context
   while correcting only the current-status field.

### Requirement 7: SES Production Access Request Preparation

**User Story:** As a developer preparing BudgetBuddy for real users, I want the AWS SES
production-access request assembled with all information AWS requires, so that the Operator can
submit a complete support case without back-and-forth delays.

#### Acceptance Criteria

1. THE SES production-access preparation SHALL produce a written summary covering: the intended
   use case (transactional email for budget invitations, notifications, and password resets),
   the expected sending volume, the bounce-handling process, the complaint-handling process, and
   the unsubscribe mechanism for recipients.
2. THE SES production-access preparation SHALL reference the existing SES configuration described
   in `docs/ses-email-setup.md`, including the current `FROM_EMAIL` address `info@hitechparadigm.com`
   and the list of currently verified sender/recipient addresses.
3. IF `docs/ses-email-setup.md` does not yet document a bounce-handling process, a
   complaint-handling process, or an unsubscribe mechanism, THEN THE SES production-access
   preparation SHALL flag the missing item as an open gap to resolve before submission, rather
   than fabricating an answer for the support case.
4. THE SES production-access preparation SHALL identify `us-east-1` as the target AWS region for
   the request, consistent with the region BudgetBuddy's SES-related infrastructure currently
   runs in.

### Requirement 8: SES Production Access Submission Ownership

**User Story:** As the Operator, I want to personally submit the AWS SES production-access
support case, so that account-level AWS support tooling and any account/contact/billing
information involved stays under my direct control.

#### Acceptance Criteria

1. THE SES production-access workflow SHALL NOT submit the AWS Support case automatically or
   autonomously on the Operator's behalf.
2. WHEN the preparation in Requirement 7 is complete, THE SES production-access workflow SHALL
   present the assembled request content to the Operator for manual submission via the AWS
   Support Center.
3. THE SES production-access workflow SHALL treat submission as complete only after the Operator
   confirms the support case has been filed.

### Requirement 9: Interim State While Awaiting SES Approval

**User Story:** As a developer, I want documented guidance for operating BudgetBuddy while the
SES production-access request is pending, so that email-dependent features have a known,
communicated limitation during the approval wait.

#### Acceptance Criteria

1. WHILE the SES production-access request is pending AWS approval, THE Documentation_Set SHALL
   state that outbound email delivery remains restricted to the verified addresses listed in
   `docs/ses-email-setup.md`.
2. WHEN the AWS Support case is filed per Requirement 8, THE Steering_Memory_Files SHALL be
   updated to record that SES production access has been requested and is pending, replacing the
   current "SES still in sandbox" open item with a status reflecting the pending request.
3. WHEN AWS grants SES production access, THE Steering_Memory_Files and Documentation_Set SHALL
   be updated again to reflect production status, removing the sandbox-mode restriction language.

## Open Questions

1. **Resolved during authoring**: Whether `backend/functions/family/` still exists was verified
   by direct filesystem search at spec-authoring time — it does not exist. Requirement 5 still
   requires re-verification at execution time per this project's norm of not trusting stale
   assumptions, but no code deletion is expected to be needed there.
2. **Not yet resolved**: `docs/ses-email-setup.md` in its current form documents the sandbox
   problem and verified-identity workaround but does not clearly state a bounce-handling process,
   complaint-handling process, or unsubscribe mechanism. Requirement 7, Criterion 3 requires this
   gap to be flagged rather than guessed at — the design/tasks phase should confirm whether these
   processes exist elsewhere (for example, in SES configuration itself, such as an SNS bounce
   topic) or need to be built before the support case can be submitted with accurate answers.
3. **Not yet resolved**: `infrastructure/bin/app.js` is a compiled artifact checked into the
   repository. Requirement 3, Criterion 4 leaves open whether the correct approach is to hand-edit
   it alongside `app.ts` or to regenerate it via the project's TypeScript build step — the design
   phase should confirm which approach matches how `app.js` is currently kept in sync (if at all)
   before implementation.
