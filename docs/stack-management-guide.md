# BudgetBuddy Stack Management Guide

**Last Updated**: 2025-11-21
**Scope**: Web Application MVP

## 📋 Stack Overview & Dependencies

### Deployment Order
1. **Independent Stacks** (can be deployed in parallel):
   - `budgetbuddy-dev-auth` - Authentication services
   - `budgetbuddy-dev-database` - Data storage
   - `budgetbuddy-dev-hosting` - Web hosting infrastructure

2. **Dependent Stacks** (deploy after independent stacks):
   - `budgetbuddy-dev-api` - Requires: auth, database
   - `budgetbuddy-dev-monitoring` - Requires: api, database, auth

### Stack Responsibilities Matrix

| Feature | Auth | Database | Hosting | API | Monitoring |
|---------|------|----------|---------|-----|------------|
| User Registration | ✅ | ✅ | ❌ | ✅ | ✅ |
| Budget Management | ❌ | ✅ | ❌ | ✅ | ✅ |
| Web Application | ❌ | ❌ | ✅ | ❌ | ❌ |
| API Endpoints | ❌ | ❌ | ❌ | ✅ | ✅ |
| Data Storage | ❌ | ✅ | ❌ | ❌ | ❌ |
| Monitoring | ❌ | ❌ | ❌ | ❌ | ✅ |

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
