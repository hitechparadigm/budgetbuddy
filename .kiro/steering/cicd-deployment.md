---
inclusion: conditional
fileMatchPattern: "{.github/workflows/**,scripts/deploy*,scripts/*cicd*}"
---

# CI/CD Deployment Guidelines

**ONLY load when working with CI/CD files**

## Critical Rules

### Before Starting Any Task

1. Check CI/CD status: `node scripts/check-cicd-status.js`
2. Wait if deployment in progress
3. Only proceed after successful deployment

### Deployment Monitoring

- NEVER start new tasks while deployment is in progress
- NEVER start new tasks if last deployment failed
- ALWAYS verify deployment success before continuing
- ALWAYS check `.kiro/cicd-status/latest.json`

### If Deployment Failed

1. Read failure logs from CI/CD status
2. Analyze error and root cause
3. Fix the issue
4. Commit and push the fix
5. Wait for new deployment to succeed
6. Only then continue with next task

### Deployment Commands

**CRITICAL**: NEVER use direct CDK deploy commands (`cdk deploy`, `npm run deploy:dev`)

ALL deployments MUST go through CI/CD pipeline:

1. Complete feature implementation
2. Commit and push code
3. WAIT for GitHub Actions deployment
4. VERIFY deployment succeeded using check-cicd-status.js
5. Only then proceed to next task

## Environments

- **dev**: Auto-deploy from develop branch
- **staging**: Auto-deploy from main branch
- **prod**: Manual approval required
