# Active Hooks - BudgetBuddy

**Last Updated**: 2026-02-02
**Status**: Optimized for token efficiency and autonomous development

---

## Overview

The hook system has been optimized for **token efficiency** while maintaining full autonomous development capability. Hooks now reference steering files instead of duplicating content.

**Key Improvements:**

- ✅ Reduced hook count by 38% (13 → 8)
- ✅ Eliminated duplicate validation logic
- ✅ Removed false-trigger AWS monitoring
- ✅ Consolidated continuation logic
- ✅ Simplified prompts for clarity
- ✅ **NEW**: Hooks reference steering files (55% token reduction per trigger)
- ✅ **NEW**: Conditional steering files (35-40% token reduction per interaction)

---

## Active Hooks (8 total)

### Git Hooks (2) - Mandatory Security Layer

#### 1. `.husky/pre-commit`

**Purpose**: Final safety check before commit is recorded
**Trigger**: Every git commit
**Status**: ✅ Active and required
**Logic**:

- Checks for SKIP_PRECOMMIT_VALIDATION flag
- If set (by safe-commit-push.js), skips validation
- Otherwise, runs full validation (security, lint, types, docs)
  **Can be bypassed**: ⚠️ Yes with `--no-verify` (DO NOT DO THIS!)

#### 2. `.husky/pre-push`

**Purpose**: Final security check before code leaves local machine
**Trigger**: Every git push
**Status**: ✅ Active and required
**Logic**: Quick security re-check as safety net
**Safety net**: Catches commits that bypassed pre-commit

---

### Kiro Hooks (6) - Assistive Automation Layer

#### 3. `autonomous-task-executor.kiro.hook` ⭐ CORE

**Purpose**: Guide autonomous overnight development
**Trigger**: agentStop
**Status**: ✅ Active
**Action**: Executes tasks with validation before each commit
**Optimizations**:

- Simplified prompt (removed redundancy)
- References steering files instead of duplicating content
- Focuses on workflow, not implementation details
- **Token cost**: ~200 tokens (down from ~450, 55% reduction)
- **References**: `.kiro/steering/00-global.md` for detailed workflow

#### 4. `task-continuation.kiro.hook` ⭐ NEW

**Purpose**: Automatically continue to next task after completion
**Trigger**: agentStop
**Status**: ✅ Active
**Action**: Checks for incomplete tasks and starts next one immediately
**Replaces**: continuation-checker + monitor-cicd-pipeline (consolidated)

#### 5. `cicd-failure-handler.kiro.hook`

**Purpose**: Auto-fix CI/CD pipeline failures
**Trigger**: userTriggered
**Status**: ✅ Active
**Action**: Analyzes CI/CD logs, fixes issues, re-validates and commits
**Optimizations**:

- Simplified prompt, removed redundant instructions
- References cicd-deployment.md steering file
- **Token cost**: ~100 tokens (down from ~150, 33% reduction)
  **Safety**: Max 2 retry attempts, asks user if still failing

#### 6. `aws-analysis.kiro.hook` ⭐ REFINED

**Purpose**: Analyze AWS CloudWatch logs when explicitly requested
**Trigger**: onMessage with specific patterns
**Status**: ✅ Active
**Patterns**:

- `*analyze aws*`
- `*check aws logs*`
- `*download aws logs*`
- `*aws diagnostics*`
  **Optimizations**:
- Narrowed patterns (no false triggers)
- Simplified prompt
- Renamed from manual-aws-analysis

#### 7. `auto-log-cleanup.kiro.hook`

**Purpose**: Clean up temporary log files after analysis
**Trigger**: fileCreated (temp-logs/_, _.log)
**Status**: ✅ Active
**Action**: Removes temp logs after analysis complete
**Optimizations**: Simplified prompt

#### 8. `doc-management-guide.kiro.hook`

**Purpose**: Guide proper spec documentation practices
**Trigger**: fileCreated with specific patterns
**Status**: ✅ Active
**Patterns**:

- `.kiro/specs/*/requirements.md`
- `.kiro/specs/*/design.md`
- `.kiro/specs/*/tasks.md`
  **Optimizations**:
- Narrowed patterns (no false triggers)
- Simplified prompt

---

## Removed Hooks (7)

### ❌ 1. `post-task-validation.kiro.hook`

**Reason**: Redundant with autonomous-task-executor
**Impact**: No functionality lost, logic integrated into autonomous-task-executor

### ❌ 2. `validation-failure-handler.kiro.hook`

**Reason**: Logic integrated into autonomous-task-executor
**Impact**: Auto-fix logic now part of main autonomous workflow

### ❌ 3. `continuation-checker.kiro.hook`

**Reason**: Consolidated into task-continuation
**Impact**: Single continuation hook replaces duplicate logic

### ❌ 4. `monitor-cicd-pipeline.kiro.hook`

**Reason**: Consolidated into task-continuation
**Impact**: Single continuation hook replaces duplicate logic

### ❌ 5. `aws-logs-analyzer.kiro.hook`

**Reason**: Too broad pattern matching, false triggers
**Example**: "I fixed the error" triggered AWS log download
**Impact**: Replaced by aws-analysis with precise patterns

### ❌ 6. `architecture-review-simplified.kiro.hook`

**Reason**: Created noise by triggering on every file edit
**Impact**: Architectural guidance provided by steering files

### ❌ 7. `manual-aws-analysis.kiro.hook`

**Reason**: Renamed and refined to aws-analysis
**Impact**: Same functionality with better naming and patterns

---

## Already Disabled (3)

### 🔴 1. `auto-push-continue.kiro.hook.DISABLED`

**Reason**: Bypasses security checks by auto-committing and pushing
**Risk**: Could push vulnerable code without validation
**Status**: DISABLED - DO NOT RE-ENABLE

### 🔴 2. `validation-success-autopush.kiro.hook.DISABLED`

**Reason**: Assumes documentation validation = safe to push (WRONG!)
**Risk**: Bypasses pre-commit security checks
**Status**: DISABLED - DO NOT RE-ENABLE

### 🔴 3. `master-automation.kiro.hook.DISABLED`

**Reason**: Too aggressive, removes developer control
**Risk**: Makes architectural decisions without human oversight
**Status**: DISABLED - DO NOT RE-ENABLE

---

## Steering File Integration

### Token Efficiency Strategy

Hooks now **reference** steering files instead of duplicating content:

**Before optimization:**

- Hook prompts contained full instructions (~450 tokens)
- Steering files always loaded (~4,500 tokens)
- **Total per interaction**: ~4,950 tokens

**After optimization:**

- Hook prompts reference steering files (~200 tokens)
- Core steering always loaded (~2,700 tokens)
- Conditional steering loads when relevant (~200-300 tokens)
- **Total per interaction**: ~3,100 tokens average
- **Savings**: 35-40% per interaction

### Conditional Steering Files

New conditional files load only when working with specific file types:

1. **`aws-integration-testing.md`** - Loads when editing `**/*.test.js`
2. **`cicd-deployment.md`** - Loads when editing CI/CD files
3. **`documentation-standards.md`** - Loads when editing documentation

**See**: `.kiro/STEERING_OPTIMIZATION_SUMMARY.md` for detailed analysis

---

## Autonomous Development Workflow

### How to Use Autonomous Mode

**Before leaving for the night:**

1. Ensure you have tasks defined in `.kiro/specs/*/tasks.md`
2. Give clear instructions to Kiro:

```
Work through tasks 1-5 autonomously. For each task:
1. Implement the feature
2. Validate: node scripts/validate-for-commit.js
3. Commit: node scripts/safe-commit-push.js "feat: [description]"
4. Monitor CI/CD: gh run list --limit 1
5. Continue to next task

Work autonomously overnight. Don't wait for my input between tasks.
```

**What Kiro will do:**

1. Execute task 1
2. Validate (security, linting, types, docs)
3. If pass → commit and push using safe script
4. If fail → auto-fix and retry (max 3 attempts)
5. Monitor CI/CD
6. task-continuation hook triggers → Move to task 2
7. Repeat until all tasks done

**In the morning:**

- Check git log for commits
- Check CI/CD pipeline status
- Review changes if needed

---

## Validation Flow

### Single Validation Per Commit

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

**Key Point**: Validation runs exactly once per commit attempt

---

## AWS Analysis Flow

### Explicit Request Only

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

**Key Point**: No false triggers on casual mentions of "error" or "AWS"

---

## Hook Usage Guidelines

### ✅ DO

- Let git hooks run on every commit/push
- Use Kiro hooks for monitoring and assistance
- Explicitly request AWS analysis when needed
- Use safe-commit-push.js for all commits in autonomous mode

### ❌ DON'T

- Use `--no-verify` flag to bypass git hooks
- Re-enable disabled hooks without security review
- Expect hooks to trigger on casual keyword mentions
- Commit directly with `git commit` in autonomous mode

---

## Security Policy

**CRITICAL**: Git hooks (pre-commit, pre-push) enforce security policy

1. **Security checks MUST pass** before commit
2. **Documentation MUST be updated** before push
3. **No bypassing** with `--no-verify` flag
4. **CI/CD is final gate** - Even if hooks bypassed, CI/CD will catch issues

---

## Troubleshooting

### If pre-commit fails

1. Read the error message carefully
2. Fix the reported issues
3. Commit again (without `--no-verify`)

### If pre-push fails

1. Check if you bypassed pre-commit (don't do this!)
2. Fix security issues if any
3. Update documentation if missing
4. Push again (without `--no-verify`)

### If AWS analysis doesn't trigger

Use explicit request: "analyze aws logs" or "check aws logs"

### If task continuation doesn't work

Check that tasks.md files have incomplete tasks marked with `[ ]`

---

## Summary

**Total hooks**: 8 active (2 git + 6 Kiro)
**Removed**: 7 (redundant or problematic)
**Disabled**: 3 (security risks)
**Optimizations**: Simplified prompts, narrowed patterns, consolidated logic

**Philosophy**: Hooks should assist, not automate critical decisions. Validation happens once per commit. Autonomous mode works seamlessly without stops. **Token efficiency through steering file references.**

---

**For system overview, see**: `.kiro/SYSTEM_GUIDE.md`
**For optimization details, see**: `.kiro/STEERING_HOOKS_OPTIMIZATION_COMPLETE.md`
