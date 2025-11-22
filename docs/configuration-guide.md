# BudgetBuddy Configuration Guide

**Last Updated**: 2025-11-21
**Scope**: Web Application MVP

## 🔧 Environment Configuration

### Development Environment
```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=hitechparadigm
ENVIRONMENT=dev

# Database
TABLE_NAME=budgetbuddy-dev-main

# Authentication
USER_POOL_ID=us-east-1_xxxxxxxxx
USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# API Gateway
API_URL=https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/

# Monitoring
LOG_LEVEL=INFO
CORRELATION_ID_HEADER=x-correlation-id
```

## 📱 Frontend Configuration

### React Web Application

The web application is configured directly in the code with the API URL:

```typescript
// packages/web-app/src/pages/BudgetPage.tsx
const API_BASE_URL = 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1';
```

### Authentication Configuration

Cognito configuration is embedded in the authentication flow:

```typescript
// Authentication endpoints
POST /auth/register - User registration
POST /auth/login - User login with JWT tokens
GET /auth/profile - Get user profile (authenticated)
```

### Local Development

```bash
# Start the web application
cd packages/web-app
npm run dev

# Application runs on http://localhost:5173
```

## 🏷️ AWS Resource Tags

All resources are tagged with the following standard tags:

```json
{
  "Project": "BudgetBuddy",
  "Application": "budgetbuddy",
  "Environment": "dev",
  "ManagedBy": "CDK",
  "Owner": "BudgetBuddy-Team",
  "CostCenter": "BudgetBuddy-Core",
  "Purpose": "Budget-Management-Application"
}
```

### Service-Specific Tags

#### Database Resources (DynamoDB)
```json
{
  "Component": "Database",
  "Service": "DynamoDB",
  "DataType": "Application-Data",
  "BackupRequired": "Yes",
  "CostCenter": "BudgetBuddy-Core"
}
```

#### Lambda Functions
```json
{
  "Component": "API",
  "Service": "Lambda",
  "Handler": "auth|budget|transaction",
  "Runtime": "NodeJS-20",
  "CostCenter": "BudgetBuddy-Compute"
}
```

#### API Gateway
```json
{
  "Component": "API",
  "Service": "APIGateway",
  "APIType": "REST",
  "CostCenter": "BudgetBuddy-API"
}
```

#### Cognito User Pool
```json
{
  "Component": "Authentication",
  "Service": "Cognito",
  "CostCenter": "BudgetBuddy-Auth"
}
```

#### S3 and CloudFront
```json
{
  "Component": "Hosting",
  "Service": "S3|CloudFront",
  "CostCenter": "BudgetBuddy-Hosting"
}
```

## 🔐 Security Configuration

### JWT Token Management

Tokens are stored in localStorage:
- `budgetbuddy_access_token` - Short-lived access token (1 hour)
- `budgetbuddy_refresh_token` - Long-lived refresh token (30 days)
- `budgetbuddy_id_token` - ID token with user claims
- `budgetbuddy_expires_at` - Token expiration timestamp

### CORS Configuration

API Gateway is configured to allow requests from:
- `http://localhost:5173` (development)
- CloudFront distribution URL (production)

### API Authentication

All API requests (except `/auth/register` and `/auth/login`) require:
```
Authorization: Bearer <access_token>
```

## 📊 Monitoring Configuration

### CloudWatch Logs

Lambda functions log to:
```
/aws/lambda/budgetbuddy-dev-auth
/aws/lambda/budgetbuddy-dev-budget
/aws/lambda/budgetbuddy-dev-transaction
```

### CloudWatch Metrics

Key metrics tracked:
- API Gateway request count
- Lambda invocation count
- Lambda error count
- Lambda duration
- DynamoDB read/write capacity

## 🚀 Deployment Configuration

### CDK Deployment

```bash
# Deploy all stacks
cd infrastructure
npm run deploy:dev

# Deploy specific stack
npx cdk deploy budgetbuddy-dev-api --context environment=dev
```

### Web App Deployment

```bash
# Build and deploy web app
cd packages/web-app
npm run build

# Deploy to S3/CloudFront (via CDK)
cd ../../infrastructure
npm run deploy:dev
```

## 🔄 CI/CD Configuration

### GitHub Actions

Workflows are configured in `.github/workflows/`:
- `deploy-dev.yml` - Automated deployment on push to develop branch

### Required GitHub Secrets

- `HITECHPARADIGM_AWS_ACCESS_KEY_ID`
- `HITECHPARADIGM_AWS_SECRET_ACCESS_KEY`

See [GitHub Secrets Setup](./github-secrets-setup.md) for details.

## 📝 Configuration Files

### Infrastructure (CDK)
- `infrastructure/cdk.json` - CDK configuration
- `infrastructure/bin/app.ts` - CDK app entry point
- `infrastructure/lib/*-stack.ts` - Stack definitions

### Frontend
- `packages/web-app/vite.config.ts` - Vite configuration
- `packages/web-app/tsconfig.json` - TypeScript configuration
- `packages/web-app/tailwind.config.js` - Tailwind CSS configuration

### Backend
- `backend/package.json` - Lambda dependencies
- `backend/layers/common/nodejs/utils.js` - Shared utilities

## 🔧 Environment-Specific Configuration

### Development (dev)
- DynamoDB: On-demand billing
- Lambda: 512MB memory, 30s timeout
- API Gateway: No caching
- CloudWatch: 7-day log retention

### Production (prod) - Future
- DynamoDB: Provisioned capacity with auto-scaling
- Lambda: Optimized memory allocation
- API Gateway: Caching enabled
- CloudWatch: 30-day log retention
- CloudFront: Custom domain with SSL

## 📚 Additional Resources

- [API Endpoints Documentation](./api-endpoints.md)
- [AWS Stack Architecture](./aws-stack-architecture.md)
- [Stack Management Guide](./stack-management-guide.md)
- [CI/CD Automation Guide](./cicd-automation-guide.md)
