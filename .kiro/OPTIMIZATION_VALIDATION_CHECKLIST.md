# Steering & Hooks Optimization Validation Checklist

**Date**: 2026-02-02
**Purpose**: Verify optimization maintains autonomous development capability

---

## Pre-Optimization Baseline

- [x] Core steering files: 4 files, ~4,500 tokens always loaded
- [x] Hook prompts: ~450 tokens average per trigger
- [x] Total per interaction: ~4,950 tokens
- [x] Autonomous mode: Fully functional

---

## Post-Optimization Validation

### ✅ File Structure

- [x] Core steering files exist and have `inclusion: always`
  - [x] `00-global.md`
  - [x] `product.md`
  - [x] `tech.md`
  - [x] `structure.md`

- [x] Conditional steering files exist with proper frontmatter
  - [x] `aws-integration-testing.md` (conditional: `**/*.test.js`)
  - [x] `cicd-deployment.md` (conditional: CI/CD files)
  - [x] `documentation-standards.md` (conditional: docs)

- [x] Hooks updated with optimized prompts
  - [x] `autonomous-task-executor.kiro.hook` (~200 tokens)
  - [x] `cicd-failure-handler.kiro.hook` (~100 tokens)

- [x] Documentation created
  - [x] `STEERING_OPTIMIZATION_SUMMARY.md`
  - [x] `STEERING_QUICK_REFERENCE.md`
  - [x] `OPTIMIZATION_VALIDATION_CHECKLIST.md` (this file)
  - [x] Updated `ACTIVE_HOOKS.md`

---

## Functional Testing

### Test 1: Core Workflow (Non-Specialized Task)

**Scenario**: Implement a new Lambda function (not test, not CI/CD, not docs)

**Expected Behavior**:

- [ ] Core steering files load (~2,700 tokens)
- [ ] No conditional files load
- [ ] Hook prompts reference steering files
- [ ] Full workflow guidance available
- [ ] Autonomous mode works correctly

**Token Budget**: ~2,900 tokens (vs 4,950 before = 41% savings)

**Test Steps**:

1. Start implementing a Lambda function
2. Check which steering files are loaded
3. Verify workflow guidance is complete
4. Test autonomous task execution
5. Confirm commit and validation work

**Status**: ⏳ Pending user testing

---

### Test 2: Writing Tests

**Scenario**: Write unit tests for Lambda function

**Expected Behavior**:

- [ ] Core steering files load (~2,700 tokens)
- [ ] `aws-integration-testing.md` loads automatically
- [ ] AWS testing rules available
- [ ] Cost limits and constraints visible
- [ ] Autonomous mode works correctly

**Token Budget**: ~3,100 tokens (vs 4,950 before = 37% savings)

**Test Steps**:

1. Create or edit a `*.test.js` file
2. Verify `aws-integration-testing.md` loads
3. Check AWS testing rules are available
4. Test autonomous test execution
5. Confirm AWS profile and cost limits are enforced

**Status**: ⏳ Pending user testing

---

### Test 3: CI/CD Work

**Scenario**: Update GitHub Actions workflow

**Expected Behavior**:

- [ ] Core steering files load (~2,700 tokens)
- [ ] `cicd-deployment.md` loads automatically
- [ ] Deployment monitoring rules available
- [ ] CI/CD failure handling works
- [ ] Autonomous mode works correctly

**Token Budget**: ~3,000 tokens (vs 4,950 before = 39% savings)

**Test Steps**:

1. Edit `.github/workflows/deploy-dev.yml`
2. Verify `cicd-deployment.md` loads
3. Check deployment rules are available
4. Test CI/CD failure handler hook
5. Confirm deployment monitoring works

**Status**: ⏳ Pending user testing

---

### Test 4: Documentation Updates

**Scenario**: Update README.md and CHANGELOG.md

**Expected Behavior**:

- [ ] Core steering files load (~2,700 tokens)
- [ ] `documentation-standards.md` loads automatically
- [ ] Documentation requirements visible
- [ ] Format standards available
- [ ] Autonomous mode works correctly

**Token Budget**: ~2,950 tokens (vs 4,950 before = 40% savings)

**Test Steps**:

1. Edit `README.md` or `CHANGELOG.md`
2. Verify `documentation-standards.md` loads
3. Check documentation standards are available
4. Test validation enforces doc updates
5. Confirm format requirements are followed

**Status**: ⏳ Pending user testing

---

### Test 5: Autonomous Overnight Development

**Scenario**: Run autonomous mode for 10 tasks overnight

**Expected Behavior**:

- [ ] Session continuity works (context transfer)
- [ ] CI/CD monitoring works before each task
- [ ] Validation and commit workflow works
- [ ] Documentation updates enforced
- [ ] Conditional steering loads as needed
- [ ] All tasks complete successfully

**Token Budget**: ~30,000 tokens for 10 tasks (vs ~50,000 before = 40% savings)

**Test Steps**:

1. Set up 10 tasks in `.kiro/specs/*/tasks.md`
2. Start autonomous mode
3. Let it run overnight
4. Check in morning:
   - [ ] All tasks completed
   - [ ] Commits made correctly
   - [ ] Documentation updated
   - [ ] CI/CD passed
   - [ ] No errors or blockers

**Status**: ⏳ Pending user testing

---

## Token Usage Validation

### Measurement Method

Use Kiro's token counter or API logs to measure:

1. **Baseline measurement** (before optimization):
   - Average tokens per interaction: ~4,950
   - Tokens per autonomous task cycle: ~5,000

2. **Post-optimization measurement**:
   - Average tokens per interaction: Target ~3,100
   - Tokens per autonomous task cycle: Target ~3,000

3. **Calculate savings**:
   - Per interaction: (4,950 - 3,100) / 4,950 = 37% savings
   - Per task cycle: (5,000 - 3,000) / 5,000 = 40% savings

### Validation Criteria

- [ ] Average token usage reduced by 30-40%
- [ ] No functionality lost
- [ ] Autonomous mode works identically
- [ ] All steering content still accessible when needed

**Status**: ⏳ Pending measurement

---

## Regression Testing

### Critical Workflows

- [ ] **Safe commit workflow**: `node scripts/safe-commit-push.js`
- [ ] **Validation workflow**: `node scripts/validate-for-commit.js`
- [ ] **CI/CD monitoring**: `node scripts/check-cicd-status.js`
- [ ] **AWS log analysis**: AWS analysis hook
- [ ] **Documentation enforcement**: Pre-commit hooks

### Edge Cases

- [ ] **Multiple file types**: Editing test + CI/CD + docs simultaneously
- [ ] **Pattern matching**: Verify patterns match correctly
- [ ] **Frontmatter parsing**: YAML frontmatter valid in all files
- [ ] **Hook triggering**: Hooks trigger at correct times
- [ ] **Reference resolution**: Steering file references work

**Status**: ⏳ Pending testing

---

## Rollback Plan

If optimization causes issues:

### Immediate Rollback

1. Restore `00-global.md` from git history
2. Delete conditional steering files
3. Restore hook prompts from git history
4. Verify autonomous mode works
5. Document what went wrong

### Partial Rollback

1. Keep conditional files but move content back to always-loaded
2. Keep optimized hook prompts but add back critical details
3. Adjust fileMatchPattern to be more/less specific
4. Test incrementally

---

## Success Criteria

### Must Have (Blocking)

- [x] All steering files have valid frontmatter
- [x] Core workflow documented in 00-global.md
- [x] Conditional files have correct patterns
- [x] Hooks reference steering files
- [ ] Autonomous mode works end-to-end
- [ ] Token usage reduced by 30%+

### Should Have (Important)

- [x] Documentation complete and clear
- [x] Quick reference guide created
- [ ] User testing completed
- [ ] Token measurements taken
- [ ] No regressions found

### Nice to Have (Optional)

- [ ] Additional conditional files for other domains
- [ ] Manual inclusion files for rare scenarios
- [ ] Automated token usage monitoring
- [ ] Dashboard for token efficiency

---

## Sign-Off

### Development Team

- [x] **Optimization implemented**: 2026-02-02
- [ ] **Functional testing passed**: ****\_\_\_****
- [ ] **Token measurements validated**: ****\_\_\_****
- [ ] **Regression testing passed**: ****\_\_\_****

### User Acceptance

- [ ] **Autonomous mode tested**: ****\_\_\_****
- [ ] **Token savings confirmed**: ****\_\_\_****
- [ ] **No functionality lost**: ****\_\_\_****
- [ ] **Approved for production**: ****\_\_\_****

---

## Next Steps

1. **Immediate**: User tests autonomous mode with optimized setup
2. **Week 1**: Monitor token usage in practice
3. **Week 2**: Adjust patterns based on real-world usage
4. **Month 1**: Review and create additional conditional files if needed
5. **Quarter 1**: Full review and optimization iteration

---

**Status**: ✅ Optimization complete, pending validation
**Last Updated**: 2026-02-02
**See Also**:

- `.kiro/STEERING_OPTIMIZATION_SUMMARY.md` - Detailed analysis
- `.kiro/STEERING_QUICK_REFERENCE.md` - Quick lookup guide
- `.kiro/hooks/ACTIVE_HOOKS.md` - Hook documentation
