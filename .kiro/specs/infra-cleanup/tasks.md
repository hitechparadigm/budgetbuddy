# Implementation Plan: Infra Cleanup

## Overview

This plan executes two independent operational cleanups: destroying the deprecated
`api-family-stack` (with a real-time Operator confirmation gate immediately before the
destructive command) and preparing an AWS SES production-access request (with filing left
entirely to the Operator). Tasks are ordered so that every non-destructive, non-external
action is grouped first and can proceed without further approval, the single destructive CLI
command is isolated as its own explicitly-gated task, the SES support-case filing is assigned
to the Operator rather than executed by the agent, and every downstream code/doc change is
made dependent on the destroy task's confirmed success. There is no application business logic
in this spec, so no unit/property tests are included — verification uses the structural CLI
checks (`cdk synth`, `cdk diff`, filesystem checks, grep checks) defined in design.md's Testing
Strategy and Error Handling sections.

## Tasks

- [ ] 1. Re-verify Api_Family_Stack traffic (fresh check, not reuse of spec-time data)
  - Run `aws logs tail /aws/lambda/<api-family-lambda-name> --since 24h --profile hitechparadigm`
    and `aws cloudwatch get-metric-statistics --namespace AWS/ApiGateway --metric-name Count --dimensions Name=ApiName,Value=budgetbuddy-family-api --start-time <24h-ago> --end-time <now> --period 3600 --statistics Sum --profile hitechparadigm`
  - Record the exact output as a new, distinct, logged verification (do not reuse or restate
    the requirements.md-time verification)
  - If either command shows sustained non-automated-scan traffic, halt this entire spec and
    report the finding as a blocker rather than proceeding to any later task
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Assemble the destroy summary content for Operator confirmation
  - Compose the exact content to be shown in Task 3's `user_input` call: CloudFormation stack
    name `budgetbuddy-dev-api-family`, the resources it will delete (API Gateway
    `budgetbuddy-family-api`, its Lambda functions, its Lambda Layers, stack-scoped IAM
    roles/log groups), and the Task 1 traffic-verification result
  - Do not include any assumption of prior consent — this is prep content only, the actual
    confirmation question is asked fresh in Task 3
  - _Requirements: 2.1_

- [ ] 3. Destroy `budgetbuddy-dev-api-family` — requires real-time Operator confirmation
  - This task requires a live `user_input` confirmation immediately before executing any
    destroy command. A prior spec-level approval, this document's existence, or any earlier
    conversation turn does NOT satisfy this requirement — the question must be asked fresh,
    after Task 1's fresh traffic data is in hand, and the destroy command must not run until
    an explicit affirmative answer is captured in that same tool call
  - Present the Task 2 summary via `user_input` as an explicit yes/no confirmation request
  - IF the Operator declines or does not affirmatively confirm: stop this task and do not
    execute any destroy command; leave `api-family-stack` deployed and unchanged; do not
    proceed to any of Tasks 4-13
  - IF the Operator confirms: run `cdk destroy budgetbuddy-dev-api-family --profile hitechparadigm`
    from `infrastructure/` as a single targeted destroy (not part of any batched/scripted
    multi-stack sequence)
  - After the command completes, confirm via `aws cloudformation describe-stacks` (or the
    destroy command's own output) that the stack reached `DELETE_COMPLETE` or is reported as
    not found, before considering this task done
  - IF the destroy fails partway (a resource fails to delete): do not proceed to Tasks 4-13;
    the stack must be confirmed fully gone before the app entrypoint is edited, per design.md's
    Error Handling
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 4. Remove `ApiFamilyStack` from `infrastructure/bin/app.ts`
  - Depends on Task 3 completing successfully (stack confirmed destroyed)
  - Remove the `import { ApiFamilyStack } from '../lib/api-family-stack';` line
  - Remove the `apiFamilyStack` instantiation block (including its JSDoc comment)
  - Remove `apiFamilyStack.addDependency(databaseStack);` and
    `apiFamilyStack.addDependency(authStack);`
  - Remove `monitoringStack.addDependency(apiFamilyStack);` only — preserve every other
    `monitoringStack.addDependency(...)` call exactly as-is
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 5. Apply the equivalent hand-edit to `infrastructure/bin/app.js`
  - Depends on Task 3 completing successfully
  - Remove `const api_family_stack_1 = require("../lib/api-family-stack");`
  - Remove the `apiFamilyStack` instantiation block (including its comment), matching the
    file's existing compiled style (`require(...)`, no type annotations)
  - Remove `apiFamilyStack.addDependency(databaseStack);` and
    `apiFamilyStack.addDependency(authStack);`
  - Remove `monitoringStack.addDependency(apiFamilyStack);` only
  - Remove the trailing `//# sourceMappingURL=...` comment at the end of the file (it encodes
    pre-edit source and would be stale/misleading); do not attempt to regenerate a source map
  - Do not backfill the unrelated `api-budgets`/`notificationFunction` drift already present
    between `app.js` and `app.ts` — out of scope for this task
  - _Requirements: 3.4_

- [ ] 6. Run `cdk synth` to confirm a clean entrypoint
  - Depends on Tasks 4 and 5
  - Run `npx cdk synth` from `infrastructure/`
  - Confirm exit code 0 and that no synthesized template references `ApiFamilyStack`,
    `api-family-stack`, or `budgetbuddy-dev-api-family`
  - IF synth fails or any reference remains: fix the `app.ts`/`app.js` edits before proceeding
    to Task 7 — do not delete the stack source files while any reference still exists
  - _Requirements: 3.5_

- [ ] 7. Run `cdk diff` on remaining stacks to confirm scoped impact
  - Depends on Task 6 passing
  - Run `cdk diff` for `budgetbuddy-dev-monitoring` (and any other affected stack) and confirm
    the only change is the `apiFamilyStack` dependency edge being dropped, not an unrelated
    resource change
  - _Requirements: 3.3_

- [ ] 8. Delete the `api-family-stack` source files
  - Depends on Task 6 passing (no remaining references)
  - Delete `infrastructure/lib/api-family-stack.ts`
  - Delete `infrastructure/lib/api-family-stack.js`
  - Delete `infrastructure/lib/api-family-stack.d.ts`
  - Confirm via filesystem check that all three are gone
  - Confirm `infrastructure/.gitignore` (or an equivalent build-output exclusion) covers
    compiled `lib/*.js` and `lib/*.d.ts` siblings going forward; if no such exclusion exists,
    add one so a future `tsc` build does not re-commit these files
  - _Requirements: 4.1, 4.2_

- [ ] 9. Fix stale comments in `infrastructure/lib/api-features-stack.ts`
  - Depends on Task 3 (stack destroyed) — can run in parallel with Task 8
  - Replace `// Note: Family Lambda moved to ApiFamilyStack (standalone stack) to avoid circular dependency`
    with `// Note: Family Lambda removed — ApiFamilyStack was destroyed (see ARCHITECTURE_DECISIONS.md ADR-001)`
  - Replace `// Note: Family routes moved to ApiFamilyStack (standalone stack) to avoid circular dependency`
    with `// Note: Family routes removed — ApiFamilyStack was destroyed; use /budgets/* via ApiBudgetsStack`
  - _Requirements: 4.3_

- [ ] 10. Re-verify `backend/functions/family/` at execution time
  - Depends on Task 3 completing successfully
  - Perform a direct filesystem check (`list_directory` or equivalent) for
    `backend/functions/family/` — do not reuse the design-time/requirements-time verification
  - IF it exists: delete it as part of this same change
  - IF it does not exist: record that no action was needed; do not create any placeholder or
    stub in its place
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 11. Run `infrastructure/` test suite if present
  - Depends on Task 6 passing
  - Run `npm test` in `infrastructure/` (if a test suite exists under `infrastructure/test/`)
  - IF any existing snapshot test asserts the presence of `ApiFamilyStack`: update it to match
    the new stack list as part of this same change
  - _Requirements: 3.5_

- [ ] 12. Update `ARCHITECTURE_DECISIONS.md` for the destroyed stack
  - Depends on Task 3 completing successfully
  - Replace the ADR-001 "What Was Removed" bullet `` `api-family-stack` — still deployed but
    deprecated; will be destroyed after migration period `` with `` `api-family-stack` —
    destroyed; removed from the CDK app entrypoint and deleted from the repository ``
  - Replace the ADR-001 "Consequences" bullet `⚠️ api-family-stack still deployed (returns 410)
    — will be destroyed once confirmed no traffic` with `✅ api-family-stack destroyed after
    confirming zero traffic — no longer part of the deployed infrastructure`
  - Remove the `api-family (DEPRECATED — returns 410)` line from the ADR-002 "Stack Layout"
    fenced block, leaving the remaining deploy-order block unchanged
  - _Requirements: 6.1, 6.4_

- [ ] 13. Update `docs/aws-stack-architecture.md` for the destroyed stack
  - Depends on Task 3 completing successfully
  - Remove the `budgetbuddy-dev-api-family` row from the Deployed Stacks table entirely
  - Replace the `### budgetbuddy-dev-api-family` "Deprecated" section with the destroyed-state
    version from design.md that preserves historical context (what it served, why it returned
    410) while correcting the current-status field to "destroyed" and naming
    `budgetbuddy-dev-api-budgets` as its replacement
  - _Requirements: 6.1, 6.4_

- [ ] 14. Update `docs/product-requirements.md` for the destroyed stack
  - Depends on Task 3 completing successfully
  - Replace the Deprecated/Removed table row `` `api-family-stack` | `api-budgets-stack`
    (family stack still deployed, returns 410) `` with `` `api-family-stack` |
    `api-budgets-stack` (family stack destroyed) ``
  - _Requirements: 6.1_

- [ ] 15. Fix `.kiro/steering/memory/gotchas.md` for the destroyed stack
  - Depends on Task 3 completing successfully
  - Remove the `### api-family-stack still deployed (returns 410)` subsection and its
    `Do NOT destroy without confirming zero traffic` line entirely (not just re-worded)
  - _Requirements: 6.2_

- [ ] 16. Fix `.kiro/steering/memory/architecture.md` for the destroyed stack
  - Depends on Task 3 completing successfully
  - Remove the `` `api-family` stack is DEPRECATED — returns 410. `` line from the Stack Deploy
    Order section
  - Leave the "Removed / Deprecated" section's existing `api-family-stack` mention unchanged
    (already correct)
  - _Requirements: 6.2_

- [ ] 17. Fix `.kiro/steering/memory/work-log.md` Known Open Items for the destroyed stack
  - Depends on Task 3 completing successfully
  - Replace the Infrastructure open item
    `` [ ] `api-family-stack` still deployed (returns 410) - destroy after confirming no traffic ``
    with
    `` [x] `api-family-stack` destroyed and removed from CDK app entrypoint (infra-cleanup spec) ``
  - Add the new open item about `infrastructure/bin/app.js` being already drifted from
    `app.ts` (missing `api-budgets`/`notificationFunction` wiring), noticed during Task 5,
    flagged as needing its own future correction pass
  - Add a dated session entry noting the `api-family-stack` destruction, per this repo's
    per-commit documentation standard
  - _Requirements: 6.2_

- [ ] 18. Consistency grep check across Documentation_Set and Steering_Memory_Files
  - Depends on Tasks 12-17 all completing
  - Grep the repository for the exact strings `still deployed`, `kept deployed`, and
    `budgetbuddy-family-api`, excluding this spec's own `requirements.md`/`design.md`/
    `tasks.md`
  - Confirm zero remaining matches implying the stack is still deployed, and confirm at least
    one file (e.g. `ARCHITECTURE_DECISIONS.md`) states the destroyed status — this is
    **Property 1** from design.md (no file may claim "still deployed" while another states
    "destroyed")
  - IF any contradictory match is found: fix that file before considering this spec's
    documentation reconciliation complete
  - _Requirements: 6.3; Validates: Property 1_

- [ ] 19. Read `docs/ses-email-setup.md` and confirm the bounce/complaint/unsubscribe gap
  - Independent of the destroy workflow — can run at any point, including before Task 1
  - Re-confirm by direct read that no automated bounce/complaint/unsubscribe mechanism exists
    (no SNS topic, no configuration set) — do not fabricate an answer if this has changed
  - _Requirements: 7.3_

- [ ] 20. Draft the SES bounce/complaint/unsubscribe answer and new doc subsection
  - Depends on Task 19
  - Draft the honest, current-state answer (manual monitoring via SES console and
    `node scripts/setup-ses-email.js list`; no SNS automation yet) exactly as specified in
    design.md's "SES Production-Access Request Content" and the new
    "Bounce, Complaint, and Unsubscribe Handling" subsection text
  - Do not apply this draft to the file yet — this task only produces the draft content
  - _Requirements: 7.1, 7.3_

- [ ] 21. Assemble the full SES production-access request content
  - Depends on Task 20
  - Assemble the complete request text from design.md's "SES Production-Access Request
    Content" section: region (`us-east-1`), mail type, use case description, expected sending
    volume, the Task 20 bounce/complaint/unsubscribe answers, and the currently verified
    sender/recipient addresses referenced from `docs/ses-email-setup.md`
  - This is prep content only — it is not submitted to AWS by this task
  - _Requirements: 7.1, 7.2, 7.4_

- [ ] 22. Apply the stale family-era corrections to `docs/ses-email-setup.md`
  - Independent of the destroy workflow
  - Replace `Family invitations are not being sent...` with `Budget invitations are not being
    sent...`
  - Replace `Try sending the family invitation again` with `Try sending the budget invitation
    again`
  - Replace `Revoke stuck invitations via the Family Settings UI` with `Revoke stuck
    invitations via the Budget Members page (/budget/members)`
  - Before finalizing the Lambda log-tail command, confirm the exact deployed function name
    via `aws lambda list-functions` rather than assuming `budgetbuddy-email-family`; update the
    command to the confirmed name
  - Before finalizing the `debug-family-invitation.js` reference, confirm at execution time
    whether that script still exists under that name; if it no longer exists, remove the
    instruction rather than pointing at a dead script, otherwise rename it to
    `debug-invitation.js` per design.md
  - _Requirements: 6.1_

- [ ] 23. Add the Task 20 bounce/complaint/unsubscribe subsection to `docs/ses-email-setup.md`
  - Depends on Tasks 20 and 22
  - Replace the current "Bounce handling" placeholder bullet under "Long-Term Solution
    (Production)" and insert the new "Bounce, Complaint, and Unsubscribe Handling (current
    state)" subsection with the drafted text, including the follow-up note about future SNS
    automation
  - _Requirements: 7.1, 7.3_

- [ ] 24. Present the assembled SES request to the Operator for manual filing
  - Depends on Task 21 (and Task 23 for consistency with the published doc)
  - This task is assigned to the Operator, not executed by the agent: use `user_input` to
    present the full assembled request content from Task 21 to the Operator for their own
    manual submission via the AWS Support Center
  - Do not submit, transmit, or file the AWS Support case through any tool or automated
    process — the agent's role ends at presenting the content
  - Ask the Operator to confirm whether, and if so when, they have filed the case
  - IF the Operator confirms the case has been filed: record the filing date for use in Task
    25
  - IF the Operator has not yet filed: do not proceed to Task 25's "pending" wording — leave
    current sandbox-only documentation and steering language unchanged
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 25. Update Documentation_Set and Steering_Memory_Files for the pending SES request
  - Depends on Task 24 reporting an affirmative filing confirmation from the Operator
  - In `docs/product-requirements.md`, replace the "SES still in sandbox mode" Known Gaps item
    with the "SES production access requested, pending AWS approval" wording from design.md,
    keeping the verified-address list
  - In `.kiro/steering/memory/work-log.md`, replace the "SES still in sandbox - production
    access not yet requested" open item with "SES production access requested, pending AWS
    approval (submitted <filing date>)"
  - In `.kiro/steering/memory/architecture.md`, replace "SES sandbox — verified senders only"
    and the "SES Status" section with the pending-approval wording from design.md, including
    the manual bounce/complaint-handling note
  - _Requirements: 9.1, 9.2_

- [ ] 26. Final consistency grep check including SES status
  - Depends on Task 18 and (if applicable) Task 25
  - Re-run the Task 18 grep check plus a check for any remaining unconditional "SES still in
    sandbox" claim that contradicts a "pending" or "production access granted" claim elsewhere,
    consistent with whichever SES state (not yet filed, filed/pending, or approved) actually
    applies at completion time
  - Confirm no file in the Documentation_Set or Steering_Memory_Files contradicts another
    about either the Api_Family_Stack's destroyed status or the SES request's current state
  - _Requirements: 6.3, 9.3; Validates: Property 1_

## Notes

- Tasks 1-2, 19-23 are non-destructive preparation and can proceed without further approval
  beyond what has already been given for this spec.
- Task 3 is the only destructive action in this spec and requires a fresh, real-time
  `user_input` confirmation immediately before the `cdk destroy` command runs — no earlier
  approval (including this spec's own review) substitutes for that confirmation.
- Task 24 is an Operator-only action. The agent's responsibility is limited to presenting the
  assembled request and recording the Operator's answer about filing status — never to
  submitting the AWS Support case itself.
- Tasks 4-18 all depend on Task 3's successful, confirmed completion and must not run if Task 3
  halts for any reason (decline, failed destroy, or halted traffic re-verification).
- Task 25 depends on an affirmative filing confirmation from Task 24; if the Operator has not
  filed, Task 25 stays blocked indefinitely without failing the rest of the spec.
- No unit, integration, or E2E test tasks are included — per design.md, this spec introduces no
  application business logic, and verification instead relies on `cdk synth`, `cdk diff`,
  direct filesystem checks, and grep-based consistency checks (Tasks 6, 7, 8 (verify), 10, 11,
  18, 26).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2", "19", "22"] },
    { "id": 1, "tasks": ["3", "20"] },
    { "id": 2, "tasks": ["4", "5", "9", "10", "12", "13", "14", "15", "16", "17", "21", "23"] },
    { "id": 3, "tasks": ["6", "24"] },
    { "id": 4, "tasks": ["7", "8", "11", "18", "25"] },
    { "id": 5, "tasks": ["26"] }
  ]
}
```
