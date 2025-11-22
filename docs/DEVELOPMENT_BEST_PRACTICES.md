# Development Best Practices - BudgetBuddy

**Last Updated**: 2025-11-21

This document consolidates lessons learned and best practices for maintaining code quality in the BudgetBuddy project.

## Code Quality & Validation

### 1. JSON File Safety
**Issue**: JSON files can be accidentally overwritten with code content, causing runtime errors.

**Prevention**:
- Always validate JSON files before committing: `node -e "JSON.parse(require('fs').readFileSync('file.json'))"`
- Use IDE JSON validation features
- Review file changes carefully in git diff before committing

### 2. JavaScript Syntax Validation
**Issue**: Syntax errors like invalid optional chaining (`? .` instead of `?.`) can cause 502 errors.

**Prevention**:
- ESLint is configured to catch these errors
- Pre-commit hooks validate all Lambda functions
- Run `npm run lint` before committing

### 3. File Encoding
**Issue**: Mixed encodings can cause garbled Unicode characters in documentation.

**Prevention**:
- Always save files with UTF-8 encoding
- Use simple text markers (✓) instead of emojis when possible
- Test PowerShell scripts before committing

## Date Handling Best Practices

### JavaScript Date Objects
**Issue**: Using `setMonth()` on Date objects created from strings causes month boundary bugs.

**Wrong**:
```javascript
const date = new Date(currentMonth + '-01');
date.setMonth(date.getMonth() + offset); // Can cause issues
```

**Correct**:
```javascript
const [year, month] = currentMonth.split('-').map(Number);
const date = new Date(year, month - 1 + offset, 1); // Immutable, reliable
```

**Application**: Use the Date constructor with explicit year, month, day for all date calculations.

## React/UI Best Practices

### Layout Stability
**Issue**: Variable dimensions cause layout jumping during state changes.

**Solution**:
- Use fixed dimensions (`min-h`, `min-w`) for dynamic elements
- Use flexbox centering for consistent alignment
- Test transitions between states

### Selection State Management
**Issue**: Value-based selection can cause multiple items to appear selected.

**Solution**:
- Use position-based selection (e.g., `offset === 0`) instead of value comparison
- Use unique keys for React lists based on actual data, not indices
- Disable interaction on selected items

## Documentation Maintenance

### Keep Documentation Current
- Update CHANGELOG.md with every significant change
- Update DEVELOPMENT_LOG.md with session details and lessons learned
- Update README.md progress percentages to match other docs
- Remove obsolete information regularly

### Avoid Duplication
- Consolidate similar documentation into single files
- Reference other docs instead of repeating information
- Delete outdated files rather than leaving them

## Git Workflow

### Pre-Push Checklist
The pre-push hook enforces documentation updates. Ensure:
1. CHANGELOG.md has new version entry with today's date
2. DEVELOPMENT_LOG.md has session accomplishments
3. README.md has updated progress and recent achievements
4. docs/development-status.md has current status
5. All obsolete information is removed

### Commit Messages
- Use descriptive commit messages
- Reference issue numbers when applicable
- Group related changes in single commits

## Testing

### Before Deployment
- Run `npm run lint` to catch syntax errors
- Run `npm run test` to verify functionality
- Test API endpoints manually after deployment
- Check CloudWatch logs for errors

### After Deployment
- Verify all API endpoints return expected responses
- Check CloudWatch metrics for errors
- Test authentication flow end-to-end
- Verify budget and transaction operations

## AWS Best Practices

### Resource Naming
- Use consistent naming: `budgetbuddy-{env}-{service}`
- Tag all resources with Project, Environment, ManagedBy
- Document resource purposes in CDK code

### Cost Management
- Use DynamoDB on-demand billing for variable workloads
- Monitor Lambda execution times and optimize
- Set up billing alerts
- Review CloudWatch logs retention policies

### Security
- Never commit AWS credentials or secrets
- Use environment variables for sensitive data
- Rotate Cognito client secrets regularly
- Enable CloudWatch logging for all services

## Code Review Checklist

Before merging:
- [ ] Code follows project conventions
- [ ] No syntax errors or linting warnings
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No hardcoded credentials or secrets
- [ ] Error handling implemented
- [ ] Logging added for debugging
- [ ] Performance considered
- [ ] Security implications reviewed

## Common Pitfalls to Avoid

1. **Don't** use `setMonth()` on Date objects - use Date constructor
2. **Don't** commit without running linter
3. **Don't** skip documentation updates
4. **Don't** leave obsolete code or comments
5. **Don't** use variable dimensions for dynamic UI elements
6. **Don't** compare values for selection state - use position
7. **Don't** overwrite JSON files with code content
8. **Don't** use emojis in PowerShell scripts

## Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [React Best Practices](https://react.dev/learn)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [ESLint Rules](https://eslint.org/docs/rules/)
