# Active Hooks - BudgetBuddy

**Last Updated**: 2026-01-31
**Status**: Cleaned up and secured

---

## Git Hooks (Essential - DO NOT DISABLE)

### 1. `.husky/pre-commit`

**Purpose**: Security, linting, type checking, documentation validation
**Trigger**: Before every commit
**Status**: ✅ Active and required
**Can be bypassed**: ⚠️ Yes with `--no-verify` (DO NOT DO THIS!)

### 2. `.husky/pre-push`

**Purpose**: Security re-validation + documentation enforcement
**Trigger**: Before every push
**Status**: ✅ Active and required
**Safety net**: Catches commits that bypassed pre-commit

---

## Kiro Hooks (Optional - Assistive)

### 3. `autonomous-task-executor.kiro.hook` ⭐ NEW

**Purpose**: Enable autonomous overnight development with validation
**Trigger**: User manually triggers for autonomous mode
**Status**: ✅ Active
**Action**: Executes tasks with mandatory validation before each commit
**Safety**: Runs validation script before every commit, never bypasses hooks

### 4. `post-task-validation.kiro.hook` ⭐ NEW

**Purpose**: Validate and commit after each task completion
**Trigger**: After agent stops (task complete)
**Status**: ✅ Active
**Action**: Runs validation, commits if passed, continues to next task
**Safety**: Uses safe-commit-push.js script with full validation

### 5. `validation-failure-handler.kiro.hook` ⭐ NEW

**Purpose**: Auto-fix validation failures
**Trigger**: User manually triggers when validation fails
**Status**: ✅ Active
**Action**: Analyzes failure type and attempts automatic fixes
**Safety**: Max 3 retry attempts, asks user if still failing

### 6. `cicd-failure-handler.kiro.hook` ⭐ NEW

**Purpose**: Auto-fix CI/CD pipeline failures
**Trigger**: User manually triggers when CI/CD fails
**Status**: ✅ Active
**Action**: Analyzes CI/CD logs, fixes issues, re-validates and commits
**Safety**: Max 2 retry attempts, asks user if still failing

### 7. `monitor-cicd-pipeline.kiro.hook`

**Purpose**: Monitor GitHub Actions workflow status
**Trigger**: After agent completes a task
**Status**: ✅ Active
**Action**: Runs CI/CD status check script

### 8. `manual-aws-analysis.kiro.hook`

**Purpose**: Analyze AWS CloudWatch logs when requested
**Trigger**: User explicitly requests AWS analysis
**Status**: ✅ Active
**Action**: Downloads and analyzes logs, then cleans up

### 9. `aws-logs-analyzer.kiro.hook`

**Purpose**: Auto-analyze AWS logs when issues detected
**Trigger**: Messages containing AWS error keywords
**Status**: ✅ Active (with caution)
**Note**: Pattern matching could be narrower

### 10. `architecture-review-simplified.kiro.hook`

**Purpose**: Quick architectural review on code changes
**Trigger**: File edits in infrastructure or backend
**Status**: ✅ Active
**Action**: Reviews for security, best practices, simplicity

### 11. `auto-log-cleanup.kiro.hook`

**Purpose**: Clean up temporary log files
**Trigger**: When log files are created
**Status**: ✅ Active
**Action**: Removes temp logs after analysis

### 12. `doc-management-guide.kiro.hook`

**Purpose**: Guide proper documentation practices
**Trigger**: Documentation file creation/editing
**Status**: ✅ Active
**Action**: Provides guidance on documentation standards

### 13. `continuation-checker.kiro.hook` ⭐ CRITICAL

**Purpose**: Automatically continue to next task without stopping
**Trigger**: After agent stops (task complete or any other reason)
**Status**: ✅ Active
**Action**: Checks for incomplete tasks and starts next one immediately
**Critical**: Enables true autonomous development without manual intervention

---

## Disabled Hooks (Security Risk)

### ❌ `auto-push-continue.kiro.hook.DISABLED`

**Reason**: Bypasses security checks by auto-committing and pushing
**Risk**: Could push vulnerable code without validation
**Status**: 🔴 DISABLED - DO NOT RE-ENABLE

### ❌ `validation-success-autopush.kiro.hook.DISABLED`

**Reason**: Assumes documentation validation = safe to push (WRONG!)
**Risk**: Bypasses pre-commit security checks
**Status**: 🔴 DISABLED - DO NOT RE-ENABLE

### ❌ `master-automation.kiro.hook.DISABLED`

**Reason**: Too aggressive, removes developer control
**Risk**: Makes architectural decisions without human oversight
**Status**: 🔴 DISABLED - DO NOT RE-ENABLE

---

## Removed Hooks (Redundant)

### 🗑️ `doc-validation-hook.kiro.hook` (REMOVED)

**Reason**: Redundant with `.husky/pre-commit` hook
**Replacement**: Git pre-commit hook handles documentation validation

### 🗑️ `intelligent-aws-monitor.kiro.hook` (REMOVED)

**Reason**: Redundant with `aws-logs-analyzer.kiro.hook`
**Replacement**: Use `manual-aws-analysis.kiro.hook` for explicit analysis

---

## Autonomous Development Workflow ⭐ NEW

### How to Use Autonomous Mode

**Before leaving for the night:**

1. Ensure you have tasks defined in a task list or spec
2. Give clear instructions to Kiro:

```
Work through tasks 1-5 autonomously. For each task:
1. Implement the feature
2. Run validation: node scripts/validate-for-commit.js
3. If validation passes, commit using: node scripts/safe-commit-push.js "feat: [description]"
4. If validation fails, fix issues and retry (max 3 attempts)
5. Monitor CI/CD and fix failures if any
6. Continue to next task

Work autonomously overnight. Don't wait for my input between tasks.
```

**What Kiro will do:**

1. Execute task 1
2. Validate (security, linting, types, docs)
3. If pass → commit and push using safe script
4. If fail → auto-fix and retry
5. Monitor CI/CD
6. Move to task 2
7. Repeat until all tasks done

**In the morning:**

- Check git log for commits
- Check CI/CD pipeline status
- Review changes if needed

### New Scripts Available

**`scripts/validate-for-commit.js`**

- Runs all pre-commit checks (security, linting, types, docs)
- Returns exit code 0 if all pass, 1 if any fail
- Use this before every commit in autonomous mode

**`scripts/safe-commit-push.js`**

- Validates first, then commits and pushes
- Never bypasses hooks
- Usage: `node scripts/safe-commit-push.js "commit message"`

### Safety Mechanisms

1. **Validation is Mandatory**: Every commit must pass all checks
2. **Auto-Fix with Limits**: Max 3 retry attempts per task
3. **CI/CD Monitoring**: Watches deployment and auto-fixes failures
4. **Audit Trail**: All commits have descriptive messages
5. **No Bypass**: Never uses --no-verify flag

---

## Hook Usage Guidelines

### ✅ DO

- Let git hooks run on every commit/push
- Use Kiro hooks for monitoring and assistance
- Explicitly request AWS analysis when needed
- Review architectural feedback from hooks

### ❌ DON'T

- Use `--no-verify` flag to bypass git hooks
- Re-enable disabled hooks without security review
- Create hooks that auto-commit or auto-push
- Create hooks with overly broad pattern matching

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

### If Kiro hook is too noisy

1. Check `.kiro/hooks/COMPREHENSIVE_HOOK_ANALYSIS.md`
2. Adjust pattern matching in the hook
3. Or disable the specific hook if not needed

---

## Summary

**Total hooks**: 12 active (2 git + 10 Kiro)
**Disabled**: 3 (security risks)
**Removed**: 2 (redundant)
**New**: 4 (autonomous development with validation)

**Philosophy**: Hooks should assist, not automate critical decisions. New autonomous hooks validate before every commit.

---

**For detailed analysis, see**: `COMPREHENSIVE_HOOK_ANALYSIS.md`
