# BudgetBuddy Deployment Guide

This guide covers deploying the BudgetBuddy application to AWS using CDK and CI/CD.

## Prerequisites

### AWS Account Setup

- AWS account with appropriate permissions
- AWS CLI installed and configured
- AWS CDK installed globally: `npm install -g aws-cdk`

### Required Permissions

Your AWS user/role needs these permissions:

- CloudFormation (full access)
- IAM (create/manage roles and policies)
- Lambda (create/manage functions)
- DynamoDB (create/manage tables)
- S3 (create/manage buckets)
- CloudFront (create/manage distributions)
- Cognito (create/manage user pools)
- API Gateway (create/manage APIs)
- CloudWatch (create/manage logs and metrics)
- SNS (create/manage topics)

### Local Setup

```bash
# Install dependencies
npm install

# Install CDK globally if not already installed
npm install -g aws-cdk

# Configure AWS CLI if not already done
aws configure --profile hitechparadigm
```

---

## Deployment Methods

### GitHub Actions (the only supported method)

All deployments go through GitHub Actions. Do not run `cdk deploy` from a workstation: only one
CloudFormation deployment may run at a time, and the workflow is what enforces that.

```bash
# 1. Make sure no deployment is running (must report SUCCESS)
node scripts/check-cicd-status.js

# 2. Commit and push to develop (validates, commits, pushes; triggers deploy-dev.yml)
node scripts/safe-commit-push.js "feat: your feature description"
```

`deploy-dev.yml` then:

1. Runs pre-deployment checks (security, linting, tests)
2. Runs `cdk synth` and a staged `cdk deploy` of all stacks
3. Builds the web app, syncs it to S3 and invalidates the CloudFront cache
4. Fails the run if any stack ends in a failed or rolled-back state
5. Runs health checks and writes a deployment summary

Pushes that change only markdown or `docs/**` do not trigger a deployment.

---

## Deployment Environments

| Environment | Stack Prefix       | Status | Triggered by |
| ----------- | ------------------ | ------ | ------------ |
| Development | `budgetbuddy-dev-` | Deployed; holds the real users and data | Push to `develop` or manual dispatch of `deploy-dev.yml` |
| Staging     | `budgetbuddy-staging-` | Not deployed | No workflow deploys staging; a push to `main` runs only the synth-only `deployment-security.yml` |
| Production  | `budgetbuddy-prod-` | Not deployed | Manual dispatch of `deploy-prod.yml` (no prod stacks exist yet) |

Data protection is on in every environment, dev included: the `budgetbuddy-main` table and the
Cognito user pool have deletion protection and `RETAIN` unless a throwaway stack is deployed with
`--context dataProtection=false`. Details: [architecture.md](./architecture.md#9-environments-and-cicd).

---

## Monitoring Deployment

### GitHub Actions Web UI

1. Go to: https://github.com/hitechparadigm/budgetbuddy/actions
2. Click on the latest workflow run
3. Watch progress in real-time

### GitHub CLI

```bash
# Watch deployment in real-time
gh run watch

# View latest run status
gh run list --workflow=deploy-dev.yml --limit=1

# View logs if failed
gh run view <run-id> --log-failed
```

### Check CI/CD Status Script

```bash
node scripts/check-cicd-status.js
```

---

## Post-Deployment Verification

### Health Checks

```bash
# Test API health endpoint
curl https://your-api-url/health

# Test auth health endpoint
curl https://your-api-url/auth/health
```

### Verify Lambda Functions

```bash
aws lambda get-function --function-name budgetbuddy-auth --profile hitechparadigm
```

### Check CloudWatch Logs

```bash
aws logs tail /aws/lambda/budgetbuddy-auth --follow --profile hitechparadigm
```

---

## Troubleshooting

### Deployment Fails at Pre-Deployment Checks

```bash
# Run checks locally first
npm run lint
npm run test

# Fix any issues, then push again
```

### CloudFormation Stack Errors

```bash
# View CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name budgetbuddy-dev-api \
  --max-items 10 \
  --profile hitechparadigm

# Check stack status
aws cloudformation describe-stacks \
  --stack-name budgetbuddy-dev-api \
  --query "Stacks[0].StackStatus" \
  --profile hitechparadigm
```

### Health Checks Fail

1. Check API Gateway endpoints manually
2. Verify Lambda function is active
3. Check CloudWatch logs for errors

---

## Cleanup

### Destroying an Environment

Dev holds the real users and data, so it is never destroyed. With data protection on, `cdk destroy`
of the database or auth stack leaves the table and the user pool behind; they need manual cleanup.
Tearing down any environment is an owner decision.

---

## Cost Estimates

| Environment | Monthly Cost                 |
| ----------- | ---------------------------- |
| Development | ~$10-20                      |
| Staging     | ~$30-50 (estimate; not deployed) |
| Production  | ~$100-500 (estimate; not deployed, depends on usage) |

---

## Additional Resources

- **CI/CD Workflows**: `.github/workflows/README.md`
- **Architecture**: [architecture.md](./architecture.md)
- **API Endpoints**: `docs/api-endpoints.md`
