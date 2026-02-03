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

### CRITICAL: No Parallel Deployments

**NEVER run multiple CI/CD deployments in parallel - they will conflict!**

- Only ONE deployment can run at a time
- Deployments modify shared AWS infrastructure (CloudFormation stacks)
- Parallel deployments will cause:
  - Stack update conflicts (UPDATE_IN_PROGRESS errors)
  - Resource contention
  - Deployment failures
  - Inconsistent infrastructure state

**If you push while deployment is in progress:**

- The new deployment will queue and wait
- OR it will fail with "Stack is in UPDATE_IN_PROGRESS state"
- You MUST wait for current deployment to complete

**Workflow:**

1. Push commit → Deployment starts
2. WAIT for deployment to complete (check status every 2 minutes)
3. Verify success with `node scripts/check-cicd-status.js`
4. Only then push next commit

### Deployment Monitoring

- NEVER start new tasks while deployment is in progress
- NEVER start new tasks if last deployment failed
- NEVER push new commits while deployment is running
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
3. WAIT for GitHub Actions deployment (check every 2 minutes)
4. VERIFY deployment succeeded using check-cicd-status.js
5. Only then proceed to next task

## Environments

- **dev**: Auto-deploy from develop branch
- **staging**: Auto-deploy from main branch
- **prod**: Manual approval required
