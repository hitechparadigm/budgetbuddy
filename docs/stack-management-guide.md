# BudgetBuddy Stack Management Guide

**Last Updated**: 2026-06-01
**Scope**: Web Application — Current Production Architecture

## 📋 Stack Overview & Dependencies

### Deployment Order

```
Step 1 (independent):
  budgetbuddy-{env}-database
  budgetbuddy-{env}-auth
  budgetbuddy-{env}-hosting

Step 2 (depend on database + auth):
  budgetbuddy-{env}-auth-onboarding
  budgetbuddy-{env}-api-features
  budgetbuddy-{env}-api-features-extended
  budgetbuddy-{env}-api-budgets
  budgetbuddy-{env}-notification

Step 3 (depends on auth-onboarding):
  budgetbuddy-{env}-api

Step 4 (depends on all):
  budgetbuddy-{env}-monitoring

Deprecated (still deployed, returns 410):
  budgetbuddy-{env}-api-family
```

> **CDK Critical Rule**: Lambda Layers are **never exported across stacks**. Each stack creates its own `CommonLayer` and `SharedLayer` from the same source. Cross-stack layer refs cause CloudFormation deployment failures.

### Stack Responsibilities Matrix

| Feature | database | auth | auth-onboarding | api | api-features | api-features-extended | api-budgets | notification | hosting | monitoring |
|---------|----------|------|-----------------|-----|-------------|----------------------|-------------|-------------|---------|------------|
| DynamoDB table | ✅ | | | | | | | | | |
| Cognito / OAuth | | ✅ | | | | | | | | |
| User onboarding | | | ✅ | | | | | | | |
| Budget / Transactions / AI | | | | ✅ | | | | | | |
| Plaid / Export / Bills / Goals | | | | | ✅ | | | | | |
| Insights / Receipt / Planning | | | | | | ✅ | | | | |
| Budget collaboration / Invitations | | | | | | | ✅ | | | |
| Push notifications / Reminders | | | | | | | | ✅ | | |
| Web app hosting (S3 + CloudFront) | | | | | | | | | ✅ | |
| CloudWatch dashboards + alarms | | | | | | | | | | ✅ |

## 🔧 Configuration Management

### Environment Variables by Stack

#### Auth Stack
```bash
# Cognito Configuration
USER_POOL_NAME=budgetbuddy-dev-users
USER_POOL_CLIENT_NAME=budgetbuddy-dev-client
PASSWORD_POLICY_MIN_LENGTH=8
MFA_CONFIGURATION=OPTIONAL
EMAIL_VERIFICATION_REQUIRED=true
```

#### Database Stack
```bash
# DynamoDB Configuration
TABLE_NAME=budgetbuddy-dev-main
BILLING_MODE=PAY_PER_REQUEST
POINT_IN_TIME_RECOVERY=true
ENCRYPTION_TYPE=AWS_MANAGED
GSI_COUNT=3
```

#### API Stack
```bash
# Lambda Configuration
LAMBDA_RUNTIME=nodejs20.x
LAMBDA_TIMEOUT=30
LAMBDA_MEMORY=512
LAYER_NAME=budgetbuddy-common

# API Gateway Configuration
API_NAME=budgetbuddy-dev-api
CORS_ENABLED=true
THROTTLE_RATE_LIMIT=1000
THROTTLE_BURST_LIMIT=2000
```### Cr
oss-Stack References

#### How Stacks Communicate
```typescript
// API Stack references Auth Stack
const userPool = UserPool.fromUserPoolId(
  this,
  'ImportedUserPool',
  Fn.importValue('budgetbuddy-dev-user-pool-id')
);

// API Stack references Database Stack
const table = Table.fromTableName(
  this,
  'ImportedTable',
  Fn.importValue('budgetbuddy-dev-table-name')
);

// Monitoring Stack references API Stack
const api = RestApi.fromRestApiId(
  this,
  'ImportedApi',
  Fn.importValue('budgetbuddy-dev-api-id')
);
```

## 🚀 Deployment Scenarios

### Full Environment Deployment
```bash
# Deploy all stacks in correct order
cd infrastructure

# 1. Deploy independent stacks first
npx cdk deploy budgetbuddy-dev-auth --context environment=dev
npx cdk deploy budgetbuddy-dev-database --context environment=dev
npx cdk deploy budgetbuddy-dev-hosting --context environment=dev

# 2. Deploy dependent stacks
npx cdk deploy budgetbuddy-dev-api --context environment=dev
npx cdk deploy budgetbuddy-dev-monitoring --context environment=dev

# Or deploy all at once (CDK handles dependencies)
npx cdk deploy --all --context environment=dev
```

### Individual Stack Updates
```bash
# Update only Lambda functions (API stack)
npx cdk deploy budgetbuddy-dev-api --context environment=dev

# Update only monitoring configuration
npx cdk deploy budgetbuddy-dev-monitoring --context environment=dev

# Update database schema (careful - may cause downtime)
npx cdk deploy budgetbuddy-dev-database --context environment=dev
```

### Rollback Procedures
```bash
# View stack history
aws cloudformation describe-stack-events --stack-name budgetbuddy-dev-api

# Rollback to previous version (if deployment fails)
aws cloudformation cancel-update-stack --stack-name budgetbuddy-dev-api

# Manual rollback using CDK
git checkout <previous-commit>
npx cdk deploy budgetbuddy-dev-api --context environment=dev
```
