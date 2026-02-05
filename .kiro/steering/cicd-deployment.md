---
inclusion: conditional
fileMatchPattern: "{.github/workflows/**,scripts/deploy*,scripts/*cicd*}"
---

# CI/CD Deployment

**ONLY load when working with CI/CD files**

## Critical Rules

### No Parallel Deployments

**NEVER run multiple deployments in parallel - they WILL conflict!**

- Only ONE deployment at a time
- Deployments modify shared AWS infrastructure (CloudFormation)
- Parallel deployments cause:
  - Stack UPDATE_IN_PROGRESS conflicts
  - Resource contention
  - Deployment failures
  - Inconsistent infrastructure

**If you push during deployment:**

- New deployment queues or fails with "Stack in UPDATE_IN_PROGRESS"
- MUST wait for current deployment to complete

**Workflow:**

1. Push commit → deployment starts
2. WAIT for completion (check every 2min)
3. Verify: `node scripts/check-cicd-status.js`
4. Then push next commit

### Before Any Task

1. Check: `node scripts/check-cicd-status.js`
2. Wait if in progress
3. Proceed only after success

### Deployment Monitoring

- NEVER start tasks while deployment in progress
- NEVER start tasks if last deployment failed
- NEVER push while deployment running
- ALWAYS verify success before continuing
- ALWAYS check `.kiro/cicd-status/latest.json`

### If Deployment Failed

1. Read failure logs from CI/CD status
2. Analyze error and root cause
3. Fix the issue
4. Commit and push fix
5. Wait for new deployment to succeed
6. Then continue with next task

### Deployment Commands

**CRITICAL**: NEVER use direct CDK deploy (`cdk deploy`, `npm run deploy:dev`)

ALL deployments via CI/CD:

1. Complete implementation
2. Commit and push
3. WAIT for GitHub Actions (check every 2min)
4. VERIFY success: `node scripts/check-cicd-status.js`
5. Then proceed to next task

## Environments

- **dev**: Auto-deploy from develop
- **staging**: Auto-deploy from main
- **prod**: Manual approval
