# BudgetBuddy AWS Stack Architecture Documentation

## 🏗️ Stack Overview

BudgetBuddy is deployed using AWS CDK with a modular stack architecture. Each stack is responsible for specific functionality and can be deployed independently.

### Deployed Stacks

| Stack Name | Status | Created | Purpose |
|------------|--------|---------|---------|
| `budgetbuddy-dev-auth` | ✅ CREATE_COMPLETE | 2025-10-24 18:06:26 UTC | User Authentication & Authorization |
| `budgetbuddy-dev-database` | ✅ CREATE_COMPLETE | 2025-10-24 18:06:44 UTC | Data Storage & Management |
| `budgetbuddy-dev-hosting` | ✅ CREATE_COMPLETE | 2025-10-24 18:07:33 UTC | Web Application Hosting |
| `budgetbuddy-dev-api` | ✅ CREATE_COMPLETE | 2025-10-24 18:11:39 UTC | Backend API & Business Logic |
| `budgetbuddy-dev-monitoring` | ✅ CREATE_COMPLETE | 2025-10-24 18:13:05 UTC | Observability & Monitoring |

## 📋 Stack Dependencies

```
budgetbuddy-dev-auth (Independent)
budgetbuddy-dev-database (Independent)
budgetbuddy-dev-hosting (Independent)
budgetbuddy-dev-api (Depends on: auth, database)
budgetbuddy-dev-monitoring (Depends on: api, database, auth)
```

## 🔐 Authentication Stack (`budgetbuddy-dev-auth`)

### Purpose
Manages user authentication, registration, and authorization using Amazon Cognito.

### Resources Created
- **Cognito User Pool**: `budgetbuddy-dev-users`
- **User Pool Client**: Web and mobile app client
- **User Pool Domain**: Custom authentication domain (optional)

### Key Features
- Email-based user registration
- Password reset functionality
- JWT token management
- Multi-factor authentication support
- Custom user attributes for family relationships### C
onfiguration
```json
{
  "passwordPolicy": {
    "minimumLength": 8,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true,
    "requireSymbols": false
  },
  "emailVerification": true,
  "mfaConfiguration": "OPTIONAL",
  "customAttributes": [
    "family_id",
    "account_type",
    "subscription_tier"
  ]
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

## 🗄️ Database Stack (`budgetbuddy-dev-database`)

### Purpose
Provides scalable NoSQL data storage using DynamoDB with single-table design for cost optimization.

### Resources Created
- **DynamoDB Table**: `budgetbuddy-dev-main`
- **Global Secondary Indexes (GSI)**:
  - **GSI1**: Family-based queries (`GSI1PK`, `GSI1SK`)
  - **GSI2**: Date-based queries (`GSI2PK`, `GSI2SK`) 
  - **GSI3**: Category analytics (`GSI3PK`, `GSI3SK`)

### Table Schema
```
Primary Key: PK (Partition Key), SK (Sort Key)
Billing Mode: On-demand (pay per request)
Encryption: AWS managed keys (AES-256)
Point-in-time Recovery: Enabled
```###
 Data Entities Supported
- **Users**: Profile information, preferences, family relationships
- **Families**: Family account metadata, member relationships
- **Budgets**: Monthly budgets, categories, planned amounts
- **Transactions**: Income/expense records, categorization
- **Categories**: Budget categories, custom user categories
- **Subscriptions**: Payment information, subscription status
- **Cost Data**: Regional cost of living data for AI recommendations

### Access Patterns
1. Get user profile by userId
2. Get family members by familyId
3. Get budget by familyId and month
4. Get transactions by familyId and date range
5. Get categories by familyId and group
6. Get cost of living data by location

### Outputs
- `TableName`: For Lambda function environment variables
- `TableArn`: For IAM permissions and monitoring

## 🌐 Hosting Stack (`budgetbuddy-dev-hosting`)

### Purpose
Hosts static web applications with global content delivery network (CDN) for optimal performance.

### Resources Created
- **S3 Buckets**:
  - `budgetbuddy-dev-web-app`: React web application hosting
  - `budgetbuddy-dev-admin-dashboard`: Admin interface hosting
- **CloudFront Distributions**:
  - Web app distribution with SPA routing support
  - Admin dashboard distribution with security isolation
- **Origin Access Controls**: Secure S3 bucket access###
 Configuration
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

## ⚡ API Stack (`budgetbuddy-dev-api`)

### Purpose
Serverless backend API providing all business logic through Lambda functions and API Gateway.

### Resources Created
- **API Gateway**: RESTful API with CORS support
- **Lambda Functions** (8 services):
  - `budgetbuddy-dev-auth`: Authentication & user management
  - `budgetbuddy-dev-budget`: Budget CRUD & calculations
  - `budgetbuddy-dev-transactions`: Transaction management
  - `budgetbuddy-dev-ai`: AI budget generation (AWS Bedrock)
  - `budgetbuddy-dev-family`: Family account management
  - `budgetbuddy-dev-payment`: Stripe payment integration
  - `budgetbuddy-dev-email`: SES email notifications
  - `budgetbuddy-dev-admin`: Admin dashboard operations
- **Lambda Layer**: Shared dependencies and utilities#
## Lambda Function Configuration
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

## 📊 Monitoring Stack (`budgetbuddy-dev-monitoring`)

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
- Budget creation and transaction volumes
- Cost and billing information

### Outputs
- `DashboardUrl`: Link to CloudWatch dashboard
- `AlertTopicArn`: For additional alert subscriptions