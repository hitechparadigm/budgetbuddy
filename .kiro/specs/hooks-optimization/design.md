# Hooks Optimization - Design

## Architecture Overview

The hook system consists of two layers:

1. **Git Hooks** (.husky/): Security and quality gates (mandatory, cannot be bypassed)
2. **Kiro Hooks** (.kiro/hooks/): Assistive automation (optional, enhance workflow)

### Design Principles

1. **Single Responsibility:** Each hook does one thing well
2. **No Duplication:** Validation runs once, not multiple times
3. **Fail Fast:** Catch issues early in the workflow
4. **Autonomous-Friendly:** No manual intervention required
5. **Precise Triggering:** Hooks trigger only when truly needed

## Component Design

### 1. Git Hooks (Mandatory Security Layer)

#### 1.1 Pre-Commit Hook

**Purpose:** Final safety check before commit is recorded
**Trigger:** Every git commit
**Logic:**

```
IF SKIP_PRECOMMIT_VALIDATION is set:
  → Skip validation (already done by safe-commit-push.js)
  → Exit 0
ELSE:
  → Run full validation (security, lint, types, docs)
  → Exit 1 if any fail, Exit 0 if all pass
```

**Optimization:**

- ✅ Already optimized with SKIP_PRECOMMIT_VALIDATION
- ✅ Clear messaging about using safe-commit-push.js
- No changes needed

#### 1.2 Pre-Push Hook

**Purpose:** Final security check before code leaves local machine
**Trigger:** Every git push
**Logic:**

```
Run quick security check
IF security issues found:
  → Block push
  → Exit 1
ELSE:
  → Allow push
  → Exit 0
```

**Optimization:**

- ✅ Already minimal and focused
- No changes needed

### 2. Kiro Hooks (Assistive Automation Layer)

#### 2.1 Core Autonomous Development Hooks

##### Hook: autonomous-task-executor

**Status:** KEEP (with refinements)
**Purpose:** Guide autonomous overnight development
**Trigger:** userTriggered (manual start of autonomous mode)
**Optimization:**

- Simplify prompt (remove redundancy)
- Focus on workflow, not implementation details
- Reference steering files instead of duplicating content

**Refined Prompt:**

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

##### Hook: continuation-checker

**Status:** CONSOLIDATE with monitor-cicd-pipeline
**Purpose:** Automatically continue to next task
**Trigger:** agentStop
**Issue:** Overlaps with monitor-cicd-pipeline
**Solution:** Merge into single continuation hook

**New Hook: task-continuation**

```json
{
  "name": "Task Continuation",
  "version": "2.0.0",
  "description": "Automatically continues to next task after completion",
  "when": {
    "type": "agentStop"
  },
  "then": {
    "type": "askAgent",
    "prompt": "Task complete. Check .kiro/specs/*/tasks.md for next incomplete task. If found, start immediately without asking. If all complete, report status."
  }
}
```

##### Hook: post-task-validation

**Status:** REMOVE (redundant)
**Reason:** Autonomous-task-executor already covers this workflow
**Action:** Delete file

#### 2.2 Failure Handling Hooks

##### Hook: validation-failure-handler

**Status:** KEEP (simplified)
**Purpose:** Auto-fix validation failures
**Trigger:** userTriggered
**Issue:** Should auto-trigger on validation failure, not manual
**Optimization:** Convert to automatic trigger or integrate into autonomous-task-executor

**Decision:** REMOVE - integrate logic into autonomous-task-executor
**Reason:** Autonomous mode should handle failures automatically

##### Hook: cicd-failure-handler

**Status:** KEEP (simplified)
**Purpose:** Auto-fix CI/CD failures
**Trigger:** userTriggered
**Optimization:** Simplify prompt, remove redundant instructions

**Refined Prompt:**

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

#### 2.3 AWS Monitoring Hooks

##### Hook: aws-logs-analyzer

**Status:** REMOVE (too broad, triggers unnecessarily)
**Reason:** Pattern matching is too aggressive
**Example:** "I fixed the error" triggers AWS log download
**Action:** Delete file

##### Hook: manual-aws-analysis

**Status:** KEEP (rename to aws-analysis)
**Purpose:** Analyze AWS logs when explicitly requested
**Trigger:** onMessage with specific patterns
**Optimization:** Narrow patterns to explicit requests only

**Refined Patterns:**

```json
"patterns": [
  "*analyze aws*",
  "*check aws logs*",
  "*download aws logs*",
  "*aws diagnostics*"
]
```

**Refined Prompt:**

```
AWS analysis requested:

1. Download logs: powershell -ExecutionPolicy Bypass -File scripts/download-aws-logs.ps1
2. Review ANALYSIS_SUMMARY.md
3. Identify and fix issues
4. Cleanup: Remove-Item -Recurse -Force temp-logs
5. Verify fixes

Work autonomously to resolve issues.
```

##### Hook: auto-log-cleanup

**Status:** KEEP (simplified)
**Purpose:** Clean up temporary log files
**Trigger:** fileCreated (temp-logs/_, _.log)
**Optimization:** Simplify prompt

**Refined Prompt:**

```
Log files detected. After analysis complete, cleanup:
powershell -ExecutionPolicy Bypass -Command "if (Test-Path 'temp-logs') { Remove-Item -Recurse -Force 'temp-logs' }"
```

#### 2.4 Code Quality Hooks

##### Hook: architecture-review-simplified

**Status:** EVALUATE → REMOVE
**Reason:** Triggers on every file edit, creates noise
**Alternative:** Rely on code review and steering files
**Decision:** REMOVE - architectural guidance is in steering files

##### Hook: doc-management-guide

**Status:** KEEP (refined patterns)
**Purpose:** Guide documentation practices
**Trigger:** fileCreated with specific patterns
**Optimization:** Narrow patterns to avoid false triggers

**Refined Patterns:**

```json
"patterns": [
  ".kiro/specs/*/requirements.md",
  ".kiro/specs/*/design.md",
  ".kiro/specs/*/tasks.md"
]
```

**Refined Prompt:**

```
Spec document created/edited. Ensure:
1. Adding to existing content (not replacing)
2. Following spec structure from .kiro/steering/structure.md
3. Maintaining separation: requirements vs design vs tasks

See .kiro/SPEC_STRUCTURE_EXPLAINED.md for guidance.
```

#### 2.5 Removed Hooks

##### Hook: monitor-cicd-pipeline

**Status:** REMOVE (consolidated into task-continuation)
**Reason:** Duplicate continuation logic

## Data Flow

### Autonomous Development Flow

```
User: "Work autonomously on tasks 1-5"
  ↓
autonomous-task-executor hook triggers
  ↓
FOR EACH TASK:
  Implement → Validate → Commit → Monitor → Continue
  ↓
task-continuation hook (on agentStop)
  ↓
Check for next task → Start immediately
  ↓
REPEAT until all tasks complete
```

### Validation Flow

```
safe-commit-push.js called
  ↓
Run validate-for-commit.js
  ↓
IF PASS:
  Set SKIP_PRECOMMIT_VALIDATION=1
  git commit (pre-commit hook skips validation)
  git push (pre-push hook runs security check)
ELSE:
  Report failure
  Exit
```

### AWS Analysis Flow

```
User: "analyze aws logs"
  ↓
aws-analysis hook triggers
  ↓
Download logs → Analyze → Fix → Cleanup
  ↓
auto-log-cleanup hook triggers
  ↓
Remove temp files
```

## Hook Inventory (Optimized)

### Active Hooks (8 total)

**Git Hooks (2):**

1. pre-commit - Security gate
2. pre-push - Final security check

**Kiro Hooks (6):**

1. autonomous-task-executor - Guide autonomous mode
2. task-continuation - Auto-continue to next task
3. cicd-failure-handler - Fix CI/CD failures
4. aws-analysis - Analyze AWS logs (explicit request)
5. auto-log-cleanup - Clean up log files
6. doc-management-guide - Guide spec documentation

### Removed Hooks (7)

1. ❌ post-task-validation - Redundant with autonomous-task-executor
2. ❌ validation-failure-handler - Integrated into autonomous-task-executor
3. ❌ continuation-checker - Consolidated into task-continuation
4. ❌ monitor-cicd-pipeline - Consolidated into task-continuation
5. ❌ aws-logs-analyzer - Too broad, false triggers
6. ❌ architecture-review-simplified - Creates noise, steering files sufficient
7. ❌ manual-aws-analysis - Renamed to aws-analysis

### Already Disabled (3)

1. 🔴 auto-push-continue.kiro.hook.DISABLED
2. 🔴 validation-success-autopush.kiro.hook.DISABLED
3. 🔴 master-automation.kiro.hook.DISABLED

## Correctness Properties

### Property 1: Single Validation Per Commit

**Invariant:** Validation runs exactly once per commit attempt
**Test:** Verify SKIP_PRECOMMIT_VALIDATION prevents duplicate validation
**Implementation:** safe-commit-push.js sets flag, pre-commit checks flag

### Property 2: No False AWS Triggers

**Invariant:** AWS log analysis only triggers on explicit user request
**Test:** Verify patterns match only explicit requests
**Implementation:** Narrow pattern matching in aws-analysis hook

### Property 3: Autonomous Continuation

**Invariant:** After task completion, next task starts automatically
**Test:** Verify task-continuation hook identifies and starts next task
**Implementation:** Hook checks tasks.md files for incomplete tasks

### Property 4: Security Always Enforced

**Invariant:** Security checks cannot be bypassed
**Test:** Verify pre-commit and pre-push hooks always run
**Implementation:** Git hooks are mandatory, no --no-verify allowed

### Property 5: No Hook Duplication

**Invariant:** No two hooks perform the same function
**Test:** Review hook purposes and triggers
**Implementation:** Clear separation of concerns in design

## Implementation Plan

### Phase 1: Remove Redundant Hooks

1. Delete post-task-validation.kiro.hook
2. Delete validation-failure-handler.kiro.hook
3. Delete continuation-checker.kiro.hook
4. Delete monitor-cicd-pipeline.kiro.hook
5. Delete aws-logs-analyzer.kiro.hook
6. Delete architecture-review-simplified.kiro.hook

### Phase 2: Create Consolidated Hooks

1. Create task-continuation.kiro.hook (consolidates continuation logic)
2. Rename manual-aws-analysis.kiro.hook to aws-analysis.kiro.hook

### Phase 3: Refine Existing Hooks

1. Simplify autonomous-task-executor.kiro.hook prompt
2. Simplify cicd-failure-handler.kiro.hook prompt
3. Refine aws-analysis.kiro.hook patterns and prompt
4. Refine doc-management-guide.kiro.hook patterns and prompt
5. Simplify auto-log-cleanup.kiro.hook prompt

### Phase 4: Update Documentation

1. Update ACTIVE_HOOKS.md with new structure
2. Update .kiro/steering/00-global.md if needed
3. Create migration guide for users

### Phase 5: Testing

1. Test autonomous mode end-to-end
2. Test validation flow (no duplicates)
3. Test AWS analysis (no false triggers)
4. Test continuation logic
5. Test failure handling

## Risk Analysis

### Risk 1: Breaking Autonomous Mode

**Probability:** Medium
**Impact:** High
**Mitigation:** Thorough testing before deployment

### Risk 2: Missing Edge Cases

**Probability:** Low
**Impact:** Medium
**Mitigation:** Comprehensive testing scenarios

### Risk 3: User Confusion

**Probability:** Low
**Impact:** Low
**Mitigation:** Clear documentation and migration guide

## Success Criteria

- ✅ Hook count reduced from 13 to 8 active hooks
- ✅ Zero duplicate validations
- ✅ Zero false AWS log triggers
- ✅ Autonomous mode works without stops
- ✅ All tests pass
- ✅ Documentation updated
