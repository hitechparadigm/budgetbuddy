# Autonomous Development Quick Start Guide

## What is Autonomous Development?

The autonomous development system allows you to give me (Kiro) instructions at night and have working, validated, and deployed code in the morning. Every commit is validated for security, linting, type checking, and documentation before being pushed.

## How to Use It

### 1. Before You Leave for the Night

Give me clear instructions with a task list. For example:

```
Work through these tasks autonomously:

1. Add user profile editing feature
2. Implement password reset flow
3. Add email verification
4. Update documentation

For each task:
- Implement the feature
- Run validation: node scripts/validate-for-commit.js
- If validation passes, commit: node scripts/safe-commit-push.js "feat: [description]"
- If validation fails, fix issues and retry (max 3 attempts)
- Monitor CI/CD and fix failures if any
- Continue to next task

Work autonomously overnight. Don't wait for my input between tasks.
```

### 2. What I'll Do Overnight

For each task, I will:

1. **Implement** the feature/fix
2. **Validate** using `node scripts/validate-for-commit.js`
   - Security check (npm audit)
   - Linting (ESLint)
   - Type checking (TypeScript)
   - Documentation (all 4 files updated)
3. **If validation passes**: Commit and push using safe script
4. **If validation fails**: Auto-fix and retry (max 3 attempts)
5. **Monitor CI/CD**: Watch deployment and fix failures
6. **Continue** to next task

### 3. In the Morning

Check the results:

```bash
# See what was committed
git log --oneline -10

# Check CI/CD status
gh run list --limit 5

# Review changes if needed
git diff HEAD~5..HEAD
```

## Available Scripts

### `scripts/validate-for-commit.js`

Runs all pre-commit checks (same as git hooks):

- Security validation
- ESLint checks
- TypeScript type checking
- Documentation validation

Returns exit code 0 if all pass, 1 if any fail.

```bash
node scripts/validate-for-commit.js
```

### `scripts/safe-commit-push.js`

Validates first, then commits and pushes:

```bash
node scripts/safe-commit-push.js "feat: add user profile editing"
```

**Never bypasses hooks** - Always validates before committing.

## Available Hooks

### For Autonomous Mode

**`autonomous-task-executor.kiro.hook`** (Manual trigger)

- Main workflow orchestrator
- Provides complete instructions for autonomous development
- Use this when starting autonomous mode

**`post-task-validation.kiro.hook`** (Auto-triggers after tasks)

- Validates and commits after each task completion
- Continues to next task automatically

### For Fixing Issues

**`validation-failure-handler.kiro.hook`** (Manual trigger)

- Auto-fixes validation failures by type
- Max 3 retry attempts
- Use when validation fails

**`cicd-failure-handler.kiro.hook`** (Manual trigger)

- Analyzes and fixes CI/CD failures
- Max 2 retry attempts
- Use when deployment fails

## Safety Mechanisms

1. **Validation is Mandatory**: Every commit must pass all checks
2. **Auto-Fix with Limits**: Max 3 attempts per task, then asks for help
3. **CI/CD Monitoring**: Watches deployment and auto-fixes failures
4. **Audit Trail**: All commits have descriptive messages
5. **No Bypass**: Never uses --no-verify flag
6. **Documentation Required**: All 4 docs must be updated

## What Gets Validated

### 1. Security (npm audit)

- No moderate or high severity vulnerabilities
- No exposed secrets or credentials
- .gitignore security entries present

### 2. Linting (ESLint)

- Code follows style guidelines
- No errors (warnings are acceptable)

### 3. Type Checking (TypeScript)

- All types are correct
- No type errors

### 4. Documentation

- README.md updated
- CHANGELOG.md updated
- DEVELOPMENT_LOG.md updated
- docs/development-status.md updated

## Example Autonomous Session

**You (at 10 PM):**

```
Work through tasks 1-3 in the spec autonomously. Use the autonomous workflow.
```

**Me (overnight):**

```
Task 1: Implement user profile editing
→ Implementing feature...
→ Running validation... ✅ All checks passed
→ Committing: "feat: add user profile editing"
→ Pushing to develop... ✅ Success
→ Monitoring CI/CD... ✅ Deployment successful

Task 2: Implement password reset flow
→ Implementing feature...
→ Running validation... ❌ Documentation missing
→ Auto-fixing: Updating all 4 docs...
→ Re-running validation... ✅ All checks passed
→ Committing: "feat: add password reset flow"
→ Pushing to develop... ✅ Success
→ Monitoring CI/CD... ✅ Deployment successful

Task 3: Add email verification
→ Implementing feature...
→ Running validation... ✅ All checks passed
→ Committing: "feat: add email verification"
→ Pushing to develop... ✅ Success
→ Monitoring CI/CD... ✅ Deployment successful

All tasks complete! 3/3 successful.
```

**You (in the morning):**

```bash
git log --oneline -3
# d1fb604 feat: add email verification
# a2bc345 feat: add password reset flow
# 9def678 feat: add user profile editing

gh run list --limit 3
# ✅ All deployments successful
```

## Troubleshooting

### If validation keeps failing

- Check the error output carefully
- Fix the specific issue (security, linting, types, or docs)
- Re-run validation
- If still failing after 3 attempts, I'll ask for your help

### If CI/CD fails

- I'll analyze the logs automatically
- Implement a fix
- Validate locally
- Commit the fix
- Monitor the new deployment
- If still failing after 2 attempts, I'll ask for your help

### If you want to stop autonomous mode

Just say "stop" and I'll pause and wait for your input.

## Best Practices

1. **Clear task list**: Provide specific, well-defined tasks
2. **Reasonable scope**: Don't try to do too much in one night
3. **Review in morning**: Always review changes before merging to main
4. **Trust the validation**: If validation passes, the code is safe
5. **Check CI/CD**: Make sure deployments succeeded

## What's Different from Before?

### Old (Dangerous) Approach

```
Task complete → Auto git commit → Auto git push
❌ No validation
❌ Bypassed hooks
❌ Could push vulnerable code
```

### New (Safe) Approach

```
Task complete → Validate → If pass: commit → If pass: push
✅ Explicit validation
✅ Same checks as hooks
✅ Auto-fix on failure
✅ Audit trail
```

## Key Insight

**Git hooks only run when YOU execute git commands, not when I do.**

That's why I now explicitly run validation scripts before committing. This ensures the same security checks happen whether you commit manually or I commit autonomously.

## Questions?

Just ask! I can:

- Explain any part of the system
- Show you how to use specific hooks
- Help troubleshoot issues
- Customize the workflow for your needs

---

**Ready to try autonomous development?** Just give me a task list and say "work autonomously"!
