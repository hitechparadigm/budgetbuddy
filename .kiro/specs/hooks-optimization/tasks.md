# Hooks Optimization - Tasks

## Phase 1: Remove Redundant Hooks

### Task 1.1: Delete Redundant Continuation Hooks

**Status:** [ ] Not Started
**Description:** Remove hooks that duplicate continuation logic
**Files to Delete:**

- `.kiro/hooks/continuation-checker.kiro.hook`
- `.kiro/hooks/monitor-cicd-pipeline.kiro.hook`
  **Reason:** Will be consolidated into single task-continuation hook
  **Validation:** Verify files are deleted

### Task 1.2: Delete Redundant Validation Hooks

**Status:** [ ] Not Started
**Description:** Remove hooks that duplicate validation logic
**Files to Delete:**

- `.kiro/hooks/post-task-validation.kiro.hook`
- `.kiro/hooks/validation-failure-handler.kiro.hook`
  **Reason:** Logic integrated into autonomous-task-executor
  **Validation:** Verify files are deleted

### Task 1.3: Delete Overly Broad AWS Hook

**Status:** [ ] Not Started
**Description:** Remove hook with too-broad pattern matching
**Files to Delete:**

- `.kiro/hooks/aws-logs-analyzer.kiro.hook`
  **Reason:** Triggers on false positives, replaced by aws-analysis
  **Validation:** Verify file is deleted

### Task 1.4: Delete Noisy Architecture Hook

**Status:** [ ] Not Started
**Description:** Remove hook that triggers on every file edit
**Files to Delete:**

- `.kiro/hooks/architecture-review-simplified.kiro.hook`
  **Reason:** Creates noise, steering files provide guidance
  **Validation:** Verify file is deleted

## Phase 2: Create Consolidated Hooks

### Task 2.1: Create Task Continuation Hook

**Status:** [ ] Not Started
**Description:** Create single hook for task continuation logic
**File to Create:** `.kiro/hooks/task-continuation.kiro.hook`
**Content:**

```json
{
  "name": "Task Continuation",
  "version": "2.0.0",
  "description": "Automatically continues to next task after completion",
  "enabled": true,
  "when": {
    "type": "agentStop"
  },
  "then": {
    "type": "askAgent",
    "prompt": "Task complete. Check .kiro/specs/*/tasks.md for next incomplete task. If found, start immediately without asking. If all complete, report status."
  }
}
```

**Validation:** Verify hook triggers on agentStop and identifies next task

### Task 2.2: Rename and Refine AWS Analysis Hook

**Status:** [ ] Not Started
**Description:** Rename manual-aws-analysis to aws-analysis and refine patterns
**Actions:**

1. Rename `.kiro/hooks/manual-aws-analysis.kiro.hook` to `.kiro/hooks/aws-analysis.kiro.hook`
2. Update patterns to be more specific
3. Simplify prompt

**New Content:**

```json
{
  "name": "AWS Analysis",
  "version": "2.0.0",
  "description": "Analyzes AWS CloudWatch logs when explicitly requested",
  "enabled": true,
  "when": {
    "type": "onMessage",
    "patterns": [
      "*analyze aws*",
      "*check aws logs*",
      "*download aws logs*",
      "*aws diagnostics*"
    ]
  },
  "then": {
    "type": "askAgent",
    "prompt": "AWS analysis requested:\n\n1. Download logs: powershell -ExecutionPolicy Bypass -File scripts/download-aws-logs.ps1\n2. Review ANALYSIS_SUMMARY.md\n3. Identify and fix issues\n4. Cleanup: Remove-Item -Recurse -Force temp-logs\n5. Verify fixes\n\nWork autonomously to resolve issues."
  }
}
```

**Validation:** Verify hook only triggers on explicit AWS analysis requests

## Phase 3: Refine Existing Hooks

### Task 3.1: Simplify Autonomous Task Executor

**Status:** [ ] Not Started
**Description:** Simplify prompt and remove redundancy
**File to Update:** `.kiro/hooks/autonomous-task-executor.kiro.hook`
**Changes:**

- Remove redundant instructions
- Reference steering files instead of duplicating content
- Focus on workflow, not implementation details

**New Prompt:**

```
🌙 AUTONOMOUS DEVELOPMENT MODE

Execute tasks from .kiro/specs/*/tasks.md autonomously:

FOR EACH TASK:
1. Implement fully (code + tests + docs)
2. Validate: node scripts/validate-for-commit.js
3. Commit: node scripts/safe-commit-push.js "feat: [description]"
4. Monitor CI/CD: gh run list --limit 1
5. Continue to next task

FAILURE HANDLING:
- Validation fails: Auto-fix and retry (max 3 attempts)
- CI/CD fails: Analyze, fix, retry (max 2 attempts)
- Still failing: Document and continue to next task

See .kiro/steering/00-global.md for detailed rules.
```

**Validation:** Verify autonomous mode still works correctly

### Task 3.2: Simplify CI/CD Failure Handler

**Status:** [ ] Not Started
**Description:** Simplify prompt and remove redundant instructions
**File to Update:** `.kiro/hooks/cicd-failure-handler.kiro.hook`
**New Prompt:**

```
🔴 CI/CD FAILURE - Auto-fix workflow:

1. Get logs: gh run view --log-failed
2. Identify issue type (build/test/deploy/lint/types)
3. Fix the issue
4. Validate: node scripts/validate-for-commit.js
5. Commit: node scripts/safe-commit-push.js "fix: [description]"
6. Monitor: gh run watch

Max 2 attempts. If still failing, document and ask user.
```

**Validation:** Verify CI/CD failure handling still works

### Task 3.3: Refine Doc Management Guide

**Status:** [ ] Not Started
**Description:** Narrow patterns to avoid false triggers
**File to Update:** `.kiro/hooks/doc-management-guide.kiro.hook`
**Changes:**

- Update patterns to be more specific
- Simplify prompt

**New Patterns:**

```json
"patterns": [
  ".kiro/specs/*/requirements.md",
  ".kiro/specs/*/design.md",
  ".kiro/specs/*/tasks.md"
]
```

**New Prompt:**

```
Spec document created/edited. Ensure:
1. Adding to existing content (not replacing)
2. Following spec structure from .kiro/steering/structure.md
3. Maintaining separation: requirements vs design vs tasks

See .kiro/SPEC_STRUCTURE_EXPLAINED.md for guidance.
```

**Validation:** Verify hook only triggers on spec documents

### Task 3.4: Simplify Auto Log Cleanup

**Status:** [ ] Not Started
**Description:** Simplify prompt
**File to Update:** `.kiro/hooks/auto-log-cleanup.kiro.hook`
**New Prompt:**

```
Log files detected. After analysis complete, cleanup:
powershell -ExecutionPolicy Bypass -Command "if (Test-Path 'temp-logs') { Remove-Item -Recurse -Force 'temp-logs' }"
```

**Validation:** Verify log cleanup still works

## Phase 4: Update Documentation

### Task 4.1: Update ACTIVE_HOOKS.md

**Status:** [ ] Not Started
**Description:** Update documentation to reflect new hook structure
**File to Update:** `.kiro/hooks/ACTIVE_HOOKS.md`
**Changes:**

- Update hook count (13 → 8 active)
- Remove references to deleted hooks
- Add new task-continuation hook
- Update aws-analysis hook (renamed)
- Update all hook descriptions

**New Structure:**

```markdown
## Active Hooks (8 total)

### Git Hooks (2)

1. pre-commit - Security gate
2. pre-push - Final security check

### Kiro Hooks (6)

1. autonomous-task-executor - Guide autonomous mode
2. task-continuation - Auto-continue to next task
3. cicd-failure-handler - Fix CI/CD failures
4. aws-analysis - Analyze AWS logs (explicit request)
5. auto-log-cleanup - Clean up log files
6. doc-management-guide - Guide spec documentation

### Removed Hooks (7)

[List all removed hooks with reasons]
```

**Validation:** Documentation is accurate and complete

### Task 4.2: Create Migration Guide

**Status:** [ ] Not Started
**Description:** Create guide for users to understand changes
**File to Create:** `.kiro/hooks/MIGRATION_GUIDE.md`
**Content:**

- What changed and why
- How to use new hooks
- What to do if issues arise
- FAQ section

**Validation:** Guide is clear and helpful

### Task 4.3: Update Steering Files (if needed)

**Status:** [ ] Not Started
**Description:** Update steering files to reference new hook structure
**Files to Check:**

- `.kiro/steering/00-global.md`
- `.kiro/AUTONOMOUS_DEVELOPMENT_GUIDE.md`

**Changes:** Update references to hooks if any
**Validation:** Steering files are consistent with new structure

## Phase 5: Testing

### Task 5.1: Test Autonomous Mode End-to-End

**Status:** [ ] Not Started
**Description:** Verify autonomous mode works without stops
**Test Scenario:**

1. Create test tasks in a spec
2. Trigger autonomous-task-executor
3. Verify tasks execute sequentially
4. Verify task-continuation triggers
5. Verify no manual intervention needed

**Success Criteria:**

- All tasks complete automatically
- Validation runs once per commit
- Continuation logic works
- No stops or errors

### Task 5.2: Test Validation Flow

**Status:** [ ] Not Started
**Description:** Verify validation runs exactly once per commit
**Test Scenario:**

1. Make code change
2. Run safe-commit-push.js
3. Verify validation runs once
4. Verify pre-commit hook skips validation
5. Verify commit succeeds

**Success Criteria:**

- Validation runs exactly once
- No duplicate validation
- SKIP_PRECOMMIT_VALIDATION works correctly

### Task 5.3: Test AWS Analysis Triggering

**Status:** [ ] Not Started
**Description:** Verify AWS analysis only triggers on explicit requests
**Test Scenarios:**

1. Say "I fixed the error" → Should NOT trigger
2. Say "analyze aws logs" → Should trigger
3. Say "check aws logs" → Should trigger
4. Say "AWS error occurred" → Should NOT trigger

**Success Criteria:**

- No false positives
- Triggers only on explicit requests
- Patterns work correctly

### Task 5.4: Test Continuation Logic

**Status:** [ ] Not Started
**Description:** Verify task-continuation identifies and starts next task
**Test Scenario:**

1. Complete a task
2. Verify agentStop triggers task-continuation
3. Verify hook identifies next incomplete task
4. Verify next task starts automatically

**Success Criteria:**

- Continuation logic works
- Next task identified correctly
- No manual intervention needed

### Task 5.5: Test Failure Handling

**Status:** [ ] Not Started
**Description:** Verify failure handling works correctly
**Test Scenarios:**

1. Validation failure → Auto-fix and retry
2. CI/CD failure → Analyze and fix
3. Max retries reached → Document and continue

**Success Criteria:**

- Auto-fix logic works
- Retry limits respected
- Graceful degradation

## Phase 6: Cleanup and Finalization

### Task 6.1: Remove Backup Files

**Status:** [ ] Not Started
**Description:** Remove any backup or temporary files created during migration
**Actions:**

- Check for .bak files
- Check for temporary test files
- Clean up workspace

**Validation:** Workspace is clean

### Task 6.2: Final Documentation Review

**Status:** [ ] Not Started
**Description:** Review all documentation for accuracy
**Files to Review:**

- ACTIVE_HOOKS.md
- MIGRATION_GUIDE.md
- Steering files
- Hook files

**Validation:** All documentation is accurate and complete

### Task 6.3: Update CHANGELOG and DEVELOPMENT_LOG

**Status:** [ ] Not Started
**Description:** Document the optimization work
**Files to Update:**

- CHANGELOG.md - Add version entry
- DEVELOPMENT_LOG.md - Add session entry
- docs/development-status.md - Update status

**Validation:** All mandatory docs updated

## Definition of Done

For each task:

- [ ] Implementation complete
- [ ] Tests passing (if applicable)
- [ ] Documentation updated
- [ ] Validation passed
- [ ] Code reviewed (if not autonomous)

For the entire project:

- [ ] All 6 phases complete
- [ ] Hook count reduced to 8 active hooks
- [ ] Zero duplicate validations
- [ ] Zero false AWS triggers
- [ ] Autonomous mode works without stops
- [ ] All tests passing
- [ ] Documentation complete and accurate
- [ ] CHANGELOG and DEVELOPMENT_LOG updated
