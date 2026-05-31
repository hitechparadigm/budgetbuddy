# BudgetBuddy AWS Stack Architecture Documentation

**Last Updated**: 2026-05-31
**Scope**: Web Application MVP

## Stack Overview

BudgetBuddy is deployed using AWS CDK with a modular stack architecture. Each stack is responsible for specific functionality and can be deployed independently.

### Deployed Stacks

| Stack Name | Status | Created | Purpose |
|------------|--------|---------|---------|
| `budgetbuddy-dev-auth` | CREATE_COMPLETE | 2025-10-24 18:06:26 UTC | User Authentication & Authorization |
| `budgetbuddy-dev-database` | CREATE_COMPLETE | 2025-10-24 18:06:44 UTC | Data Storage & Management |
| `budgetbuddy-dev-hosting` | CREATE_COMPLETE | 2025-10-24 18:07:33 UTC | Web Application Hosting |
| `budgetbuddy-dev-api` | CREATE_COMPLETE | 2025-10-24 18:11:39 UTC | Backend API & Business Logic |
| `budgetbuddy-dev-monitoring` | CREATE_COMPLETE | 2025-10-24 18:13:05 UTC | Observability & Monitoring |

## Stack Dependencies

```
budgetbuddy-dev-auth (Independent)
budgetbuddy-dev-database (Independent)
budgetbuddy-dev-hosting (Independent)
budgetbuddy-dev-api (Depends on: auth, database)
budgetbuddy-dev-monitoring (Depends on: api, database, auth)
```

## Authentication Stack (`budgetbuddy-dev-auth`)

### Purpose
Manages user authentication, registration, and authorization using Amazon Cognito.

### Resources Created
- **Cognito User Pool**: `budgetbuddy-dev-users`
- **User Pool Client**: Web and mobile app client
- **User Pool Domain**: Custom authentication domain (optional)

### Key Features (MVP)
- Email-based user registration
- Password reset functionality
- JWT token management (JWT carries only `userId`; plan context is resolved server-side)
- Email verification

### Configuration
```json
{
  "passwordPolicy": {
    "minimumLength": 8,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true,
    "requireSymbols": false
  },
  "emailVerification": true
}
```

### Outputs
- `UserPoolId`: For frontend authentication configuration
- `UserPoolClientId`: For application client setup
- `UserPoolArn`: For IAM policies and cross-service access

### Environment Variables
```bash
USER_POOL_ID=us-east-1_xxxxxxxxx
USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Database Stack (`budgetbuddy-dev-database`)

### Purpose
Provides scalable NoSQL data storage using DynamoDB with single-table design for cost optimization.

### Resources Created
- **DynamoDB Table**: `budgetbuddy-dev-main`
- **Global Secondary Indexes (GSI)**:
  - **GSI1**: Plan membership queries — `GSI1PK = USER#<userId>` on membership records, used to retrieve all plans a user belongs to
  - **GSI2**: Date-based queries (`GSI2PK`, `GSI2SK`)
  - **GSI3**: Category analytics (`GSI3PK`, `GSI3SK`)

### Table Schema
```
Primary Key: PK (Partition Key), SK (Sort Key)
Billing Mode: On-demand (pay per request)
Encryption: AWS managed keys (AES-256)
Point-in-time Recovery: Enabled
```

### Key Schema (Current)

| Entity | PK | SK | Notes |
|--------|----|----|-------|
| User profile | `USER#<userId>` | `PROFILE` | Contains `defaultPlanId`; no `familyId` or `familyRole` |
| Plan metadata | `PLAN#<planId>` | `METADATA` | Plan type (`personal`, `family`, `shared`) and status |
| Plan membership | `PLAN#<planId>` | `MEMBER#<userId>` | Role: `owner`, `partner`, `household_member`, `viewer`; optional `expiresAt` for viewers |
| Budget month | `PLAN#<planId>` | `BUDGET_MONTH#<month>` | Monthly budget under a plan partition |

GSI1 is populated on membership records so a single query on `GSI1PK = USER#<userId>` returns every plan the user belongs to.

### Data Entities Supported (MVP)
- **Users**: Profile information including `defaultPlanId`
- **Plans**: Personal, family, or shared plan entities with type and status
- **PlanMemberships**: Per-member roles and optional expiry within a plan
- **BudgetMonths**: Monthly budgets with income, savings, and expense categories under a plan partition
- **Transactions**: Income/expense records linked to budget categories
- **Categories**: Budget categories with planned and spent amounts

### Access Patterns
1. Get user profile by `userId` → `PK = USER#<userId>`, `SK = PROFILE`
2. Get all plans for a user → GSI1 query on `GSI1PK = USER#<userId>`
3. Get plan metadata by `planId` → `PK = PLAN#<planId>`, `SK = METADATA`
4. Get plan members by `planId` → `PK = PLAN#<planId>`, `SK begins_with MEMBER#`
5. Get budget month by `planId` and month → `PK = PLAN#<planId>`, `SK = BUDGET_MONTH#<month>`
6. Get transactions by `planId` and date range
7. Get categories by `planId` and group
8. Get cost of living data by location

### Outputs
- `TableName`: For Lambda function environment variables
- `TableArn`: For IAM permissions and monitoring

## Hosting Stack (`budgetbuddy-dev-hosting`)

### Purpose
Hosts static web applications with global content delivery network (CDN) for optimal performance.

### Resources Created
- **S3 Buckets**:
  - `budgetbuddy-dev-web-app`: React web application hosting
  - `budgetbuddy-dev-admin-dashboard`: Admin interface hosting
- **CloudFront Distributions**:
  - Web app distribution with SPA routing support
  - Admin dashboard distribution with security isolation
- **Origin Access Controls**: Secure S3 bucket access

### Configuration
```json
{
  "caching": {
    "defaultTTL": 86400,
    "maxTTL": 31536000,
    "compress": true
  },
  "security": {
    "httpsOnly": true,
    "securityHeaders": true,
    "corsEnabled": true
  },
  "routing": {
    "spaSupport": true,
    "errorPages": {
      "404": "/index.html",
      "403": "/index.html"
    }
  }
}
```

### Outputs
- `WebDistributionDomainName`: URL for web application
- `AdminDistributionDomainName`: URL for admin dashboard
- `WebBucketName`: For deployment scripts
- `AdminBucketName`: For admin deployment

## API Stack (`budgetbuddy-dev-api`)

### Purpose
Serverless backend API providing all business logic through Lambda functions and API Gateway.

### Resources Created
- **API Gateway**: RESTful API with CORS support
- **Lambda Functions** (8 services):
  - `budgetbuddy-dev-auth`: Authentication & user management (`backend/functions/auth/index.js`)
  - `budgetbuddy-dev-budget`: Budget CRUD & calculations (`backend/functions/budget/index.js`)
  - `budgetbuddy-dev-transactions`: Transaction management
  - `budgetbuddy-dev-ai`: AI budget generation (AWS Bedrock)
  - `budgetbuddy-dev-plans`: Plan account management (`backend/functions/plans/index.js`)
  - `budgetbuddy-dev-payment`: Stripe payment integration
  - `budgetbuddy-dev-email`: SES email notifications
  - `budgetbuddy-dev-admin`: Admin dashboard operations
- **Lambda Layer**: Shared dependencies and utilities (common layer)

### Lambda Layer — Shared Utilities (Common Layer)

| Utility | Description |
|---------|-------------|
| `PlanAccessResolver` | Resolves plan access from a `userId`. Reads `USER#<userId>/PROFILE` for `defaultPlanId`, then `PLAN#<planId>/MEMBER#<userId>` for role, then `PLAN#<planId>/METADATA` for plan type and status. Replaces the former `FamilyIdResolver`. |
| `entitlements.js` | `canUseFeature(subscriptionTier, featureKey)` — determines whether a subscription tier grants access to a given feature. |

### Lambda Access Pattern

JWTs carry only `userId`. Plan context is never embedded in the token. Each Lambda that requires plan-scoped access calls `PlanAccessResolver` to:

1. Read `USER#<userId>` / `PROFILE` → obtain `defaultPlanId`
2. Read `PLAN#<planId>` / `MEMBER#<userId>` → obtain member role
3. Read `PLAN#<planId>` / `METADATA` → obtain plan type and status

### Plans Stack (`api-plans-stack`)

The `api-plans-stack` (formerly `api-family-stack`) owns the Plans Lambda and its API Gateway routes.

- **Lambda**: `budgetbuddy-dev-plans` at `backend/functions/plans/index.js`
- **Routes**: `/plans/*` (replaces the former `/family/*` routes)

### Lambda Function Configuration
```json
{
  "runtime": "nodejs20.x",
  "timeout": 30,
  "memorySize": 512,
  "environment": {
    "TABLE_NAME": "budgetbuddy-dev-main",
    "USER_POOL_ID": "us-east-1_xxxxxxxxx",
    "LOG_LEVEL": "INFO"
  },
  "layers": [
    "arn:aws:lambda:us-east-1:ACCOUNT:layer:budgetbuddy-common:1"
  ]
}
```

### API Gateway Configuration
```json
{
  "cors": {
    "allowOrigins": ["*"],
    "allowMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allowHeaders": ["Content-Type", "Authorization", "X-Correlation-ID"]
  },
  "throttling": {
    "rateLimit": 1000,
    "burstLimit": 2000
  }
}
```

### Outputs
- `ApiUrl`: Base URL for all API calls
- `ApiId`: For custom domain setup

## Monitoring Stack (`budgetbuddy-dev-monitoring`)

### Purpose
Provides comprehensive observability, alerting, and performance monitoring for the entire application.

### Resources Created
- **CloudWatch Dashboard**: `budgetbuddy-dev-application-metrics`
- **SNS Topic**: `budgetbuddy-dev-alerts`
- **CloudWatch Alarms**:
  - API Gateway 5XX error rate > 5%
  - Lambda function errors > 10/hour
  - DynamoDB throttling detected
  - Monthly costs > $100

### Dashboard Metrics
- API request counts and response times
- Lambda function invocations and error rates
- DynamoDB read/write operations and throttles
- User authentication and registration metrics
- Plan creation, membership, and budget volumes
- Cost and billing information

### Outputs
- `DashboardUrl`: Link to CloudWatch dashboard
- `AlertTopicArn`: For additional alert subscriptions
