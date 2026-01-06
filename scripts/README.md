# Scripts Directory

## Essential Development Scripts

This directory contains only the essential scripts needed for the BudgetBuddy development workflow.

### Security Scripts
- `security-check-win.ps1` - Windows security validation
- `security-check.sh` - Linux/Mac security validation
- `pre-commit-security.sh` - Pre-commit security hooks

### Git Hooks
- `setup-git-hooks.ps1` - Git hooks setup (Windows)
- `setup-git-hooks.sh` - Git hooks setup (Linux/Mac)

### Deployment Scripts
- `deploy-dev.js` - Development deployment

### Testing Scripts
- `create-test-user.js` - Test user creation
- `test-transactions.js` - Transaction API testing
- `test-user-journey.js` - End-to-end testing

### Utility Scripts
- `delete-corrupted-budgets.js` - Database cleanup utility
- `check-cicd-status.js` - CI/CD monitoring
- `cleanup-analysis.js` - Codebase cleanup analysis tool
- `cleanup-executor.js` - Codebase cleanup execution tool

## Usage

### Security Validation
```bash
# Windows
.\scripts\security-check-win.ps1

# Linux/Mac
./scripts/security-check.sh
```

### Development Deployment
```bash
node scripts/deploy-dev.js
```

### Testing
```bash
# Create test user
node scripts/create-test-user.js

# Test transactions API
node scripts/test-transactions.js

# Test complete user journey
node scripts/test-user-journey.js
```

### Database Cleanup
```bash
# Clean corrupted budgets
node scripts/delete-corrupted-budgets.js [familyId]
```

### Codebase Cleanup
```bash
# Analyze codebase for cleanup
node scripts/cleanup-analysis.js

# Execute cleanup
node scripts/cleanup-executor.js
```

## Removed Scripts

The following obsolete scripts were removed during codebase cleanup:

### Documentation Automation (Obsolete)
- `auto-update-docs.ps1` - Automated doc updates (replaced by manual process)
- `smart-commit.ps1` - Auto-commit with docs (not used in current workflow)
- `doc-review.ps1` - Document review automation (obsolete)
- `simple-doc-check.ps1` - Simple doc validation (redundant)
- `update-docs-check.bat` - Batch file for docs (obsolete)
- `update-docs-interactive.ps1` - Interactive doc updates (not used)
- `update-docs.js` - JavaScript doc updater (obsolete)
- `git-hooks-auto.ps1` - Auto git hooks setup (manual setup preferred)

### Development Tools (Obsolete)
- `local-server.js` - Empty file, no content
- `quick-delete-budgets.js` - Empty file, no content
- `deploy-web-app.ps1` - Replaced by CDK deployment
- `test-local-deployment.sh` - Not used in current workflow
- `validate-json.ps1` - Basic validation, not needed
- `generateCityData.ts` - AI data generation (one-time use, completed)

### Cleanup Scripts (Consolidated)
- `delete-corrupted-budgets.ps1` - PowerShell version (kept JS version)
- `DELETE_BUDGETS_README.md` - Redundant documentation

## Notes

- All security-related scripts are preserved and essential
- Deployment scripts use CDK for infrastructure management
- Testing scripts provide comprehensive API and user journey validation
- Database cleanup utilities are available for development needs
- Git hooks setup is manual to ensure proper configuration
