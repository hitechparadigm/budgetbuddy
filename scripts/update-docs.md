# Documentation Update Guidelines

## When to Update Documentation

### After Every Development Session
1. **CHANGELOG.md** - Add new features, fixes, and lessons learned
2. **DEVELOPMENT_LOG.md** - Add detailed session notes with issues and resolutions
3. **README.md** - Update project status and progress metrics
4. **docs/development-status.md** - Update current state and next steps

### Documentation Consistency Checklist

#### ✅ CHANGELOG.md Updates
- [ ] Add new version entry with date
- [ ] List all features added
- [ ] Document all issues fixed with root cause and resolution
- [ ] Record lessons learned with application guidance
- [ ] Update progress metrics

#### ✅ DEVELOPMENT_LOG.md Updates
- [ ] Add session accomplishments
- [ ] Document all issues encountered with detailed resolution steps
- [ ] Record lessons learned with context and application
- [ ] Update cumulative lessons learned summary
- [ ] Update progress metrics

#### ✅ README.md Updates
- [ ] Update project status phase
- [ ] Update overall progress percentage
- [ ] Update recent achievements section
- [ ] Update roadmap completion status
- [ ] Verify all links and commands work

#### ✅ Task Status Updates
- [ ] Mark completed tasks in tasks.md
- [ ] Update task progress in development-status.md
- [ ] Verify next priority tasks are accurate

## Documentation Standards

### Issue Documentation Format
```markdown
**Issue**: Clear description of the problem
**Root Cause**: What caused the issue
**Resolution**: Step-by-step fix
**Lesson**: Key takeaway
**Prevention**: How to avoid in future
**Time Impact**: How long to resolve
```

### Lesson Documentation Format
```markdown
**Context**: What we were trying to accomplish
**Discovery**: What we learned
**Application**: How to apply this lesson
**Impact**: How this affects future development
```

### Progress Metrics Format
```markdown
- **Component Name**: X% complete (description of current state)
- **Overall MVP Progress**: X% (change from previous)
```

## Automation Tools

### 🚀 Interactive Documentation Assistant
```powershell
# Run before every git push
./scripts/update-docs-interactive.ps1
```
This script will:
- Check if documentation files exist and are recent
- Show interactive checklist for all required updates
- Prevent proceeding until all documentation is confirmed updated

### 🔧 Git Hooks (Optional)
```powershell
# One-time setup
./scripts/setup-git-hooks.ps1
```
This will automatically run documentation checks before every `git push`

### 📋 Quick Reference
See `scripts/DOCUMENTATION_CHECKLIST.md` for:
- Complete checklist of all documentation requirements
- Templates for issues and lessons learned
- Categories and formatting standards

### Recommended Process
1. **Complete development work**
2. **Run documentation assistant**: `./scripts/update-docs-interactive.ps1`
3. **Update all flagged documentation files**
4. **Commit and push**: Git hooks will verify documentation is current

## Benefits of This Approach

### For Current Development
- **Faster Issue Resolution**: Documented solutions prevent re-solving same problems
- **Better Decision Making**: Lessons learned inform future architectural choices
- **Progress Tracking**: Clear visibility into project advancement

### For Future Sessions
- **Context Preservation**: Complete history of decisions and solutions
- **Onboarding**: New developers can understand project evolution
- **Knowledge Transfer**: Lessons learned prevent repeating mistakes

### For Project Management
- **Accurate Estimates**: Historical data improves time estimates
- **Risk Mitigation**: Known issues and solutions reduce project risk
- **Quality Assurance**: Documented best practices improve code quality
