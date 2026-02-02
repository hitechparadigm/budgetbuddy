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

### Method 1: CI/CD Pipeline (Recommended)

The **fastest and safest** way to deploy is through the CI/CD pipeline:

```bash
# 1. Commit all changes
git add .
git commit -m "feat: Your feature description"

# 2. Push to develop branch (triggers automatic deployment)
git push origin develop
```

The CI/CD pipeline will automatically:

1. Run pre-deployment checks (security, linting, tests)
2. Deploy all infrastructure stacks
3. Run health checks
4. Generate deployment summary

**Total Time**: ~15-20 minutes

### Method 2: Manual CDK Commands

```bash
# Bootstrap CDK (first time only)
cd infrastructure
cdk bootstrap

# Install dependencies and build
npm install
npm run build

# Deploy all stacks
cdk deploy --all --context environment=dev --profile hitechparadigm
```

---

## Deployment Environments

| Environment | Stack Prefix           | Removal Policy | Cost     |
| ----------- | ---------------------- | -------------- | -------- |
| Development | `budgetbuddy-dev-`     | DESTROY        | Minimal  |
| Staging     | `budgetbuddy-staging-` | RETAIN         | Moderate |
| Production  | `budgetbuddy-prod-`    | RETAIN         | Full     |

### Deploy to Development

```bash
git push origin develop
# OR manually:
cd infrastructure && cdk deploy --all --context environment=dev
```

### Deploy to Staging

```bash
git push origin main
# OR manually:
cd infrastructure && cdk deploy --all --context environment=staging
```

### Deploy to Production

Production requires manual approval in GitHub Actions.

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

### Destroy Development Environment

```bash
# CAREFUL - destroys all resources!
cd infrastructure
cdk destroy --all --context environment=dev --profile hitechparadigm
```

---

## Cost Estimates

| Environment | Monthly Cost                 |
| ----------- | ---------------------------- |
| Development | ~$10-20                      |
| Staging     | ~$30-50                      |
| Production  | ~$100-500 (depends on usage) |

---

## Additional Resources

- **CI/CD Guide**: `docs/cicd-automation-guide.md`
- **Stack Architecture**: `docs/aws-stack-architecture.md`
- **API Endpoints**: `docs/api-endpoints.md`
