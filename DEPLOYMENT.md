# BudgetBuddy AWS Deployment Guide

This guide walks you through deploying the BudgetBuddy application to AWS using CDK.

## Prerequisites

### 1. AWS Account Setup
- AWS account with appropriate permissions
- AWS CLI installed and configured
- AWS CDK installed globally: `npm install -g aws-cdk`

### 2. Required Permissions
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

### 3. Local Setup
```bash
# Install dependencies
yarn install

# Install CDK globally if not already installed
npm install -g aws-cdk

# Configure AWS CLI if not already done
aws configure
```

## Quick Deployment

### Option 1: Using Deployment Script (Recommended)
```bash
# Deploy to development environment
bash scripts/deploy.sh dev

# Check deployment health
bash scripts/check-deployment.sh dev
```

### Option 2: Manual CDK Commands
```bash
# Bootstrap CDK (first time only)
cd infrastructure
cdk bootstrap

# Install dependencies and build
yarn install
yarn build

# Deploy all stacks
cdk deploy --all --context environment=dev
```

## Deployment Environments

### Development Environment
- **Environment**: `dev`
- **Stack Prefix**: `budgetbuddy-dev-`
- **Removal Policy**: `DESTROY` (for easy cleanup)
- **Cost**: Minimal (single-table DynamoDB, basic Lambda)

```bash
bash scripts/deploy.sh dev
```

### Staging Environment
- **Environment**: `staging`
- **Stack Prefix**: `budgetbuddy-staging-`
- **Removal Policy**: `RETAIN`
- **Cost**: Moderate (with monitoring)

```bash
bash scripts/deploy.sh staging
```

### Production Environment
- **Environment**: `prod`
- **Stack Prefix**: `budgetbuddy-prod-`
- **Removal Policy**: `RETAIN`
- **Cost**: Full (with comprehensive monitoring and backups)

```bash
bash scripts/deploy.sh prod
```

## Post-Deployment Steps

### 1. Verify Deployment
```bash
# Run health checks
bash scripts/check-deployment.sh dev

# Test API endpoints manually
curl https://your-api-url/health
curl https://your-api-url/auth/health
```

### 2. Get Deployment Outputs
The deployment script will automatically display all important URLs and IDs after successful deployment.

### 3. Configure Frontend Applications
Update your frontend configuration files with the deployment outputs from the script.

## Cleanup

### Destroy Development Environment
```bash
# Destroy all resources (CAREFUL!)
bash scripts/destroy.sh dev
```

## Next Steps

After successful deployment:

1. **Test Authentication Flow**
2. **Implement Frontend**
3. **Set Up CI/CD**
4. **Production Readiness**