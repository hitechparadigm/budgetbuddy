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
const API_BASE_URL =
  "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1";
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

## 🔐 Google OAuth Configuration

### Setup Instructions

#### For Development (Recommended)

Use Expo's credential management system:

```bash
cd packages/mobile
npx eas credentials
```

This will:

1. Guide you through creating credentials for iOS and Android
2. Automatically handle SHA-1 fingerprints
3. Store credentials securely
4. Generate the necessary environment variables

#### For Production

**Step 1: Get Platform-Specific Client IDs**

**For Web:**

- Client ID: Stored in AWS Secrets Manager
- Client Secret: Stored in AWS Secrets Manager (never commit to code)

**For iOS:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID for iOS
4. Bundle ID: `com.budgetbuddy.mobile`

**For Android:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 Client ID for Android
3. Package name: `com.budgetbuddy.mobile`
4. Get SHA-1 fingerprint using `npx eas credentials`

**Step 2: Environment Variables**

Create `.env.local` in `packages/mobile/`:

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id-here
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_SECRET=your-web-client-secret-here
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id-here
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id-here
```

**Step 3: AWS Secrets Manager (Production)**

```bash
aws secretsmanager create-secret \
  --name budgetbuddy/google-oauth \
  --secret-string '{
    "web_client_id": "...",
    "web_client_secret": "...",
    "ios_client_id": "...",
    "android_client_id": "..."
  }'
```

### Testing Google OAuth

**Web:** `npm run web` → Click "Sign in with Google"
**iOS:** `npm run ios` or use Expo Go app
**Android:** `npm run android` or use Expo Go app

### Troubleshooting Google OAuth

- **"Google Sign-In failed"**: Check platform-specific client ID and package name/bundle ID
- **"Redirect URI mismatch"**: Verify redirect URI matches Expo's generated URI
- **keytool not found**: Use `npx eas credentials` instead of manual keytool

**Security Notes:**

- Never commit credentials to version control
- Use environment variables for all sensitive data
- Store production credentials in AWS Secrets Manager
- Rotate credentials regularly

## 🔐 GitHub Secrets Configuration

### Required GitHub Secrets

Navigate to GitHub repository → Settings → Secrets and variables → Actions:

#### AWS Credentials

- **`HITECHPARADIGM_AWS_ACCESS_KEY_ID`**: AWS Access Key ID for hitechparadigm profile
- **`HITECHPARADIGM_AWS_SECRET_ACCESS_KEY`**: AWS Secret Access Key for hitechparadigm profile

### AWS Profile Configuration

CI/CD pipeline uses **hitechparadigm** AWS profile:

- **Default Region**: `us-east-1`
- **Profile Name**: `hitechparadigm`

### Required AWS Permissions

The hitechparadigm profile needs permissions for:

- CloudFormation (full access for stack management)
- IAM (role management)
- Lambda (function management)
- DynamoDB (table management)
- S3 (bucket management)
- CloudFront (distribution management)
- Cognito (user pool management)
- API Gateway (full access)
- CloudWatch (logging and monitoring)
- SNS (notifications)

### Security Best Practices

- ✅ Never commit AWS credentials to code
- ✅ Use GitHub Secrets for sensitive information
- ✅ Rotate AWS keys regularly
- ✅ Use least privilege principle
- ✅ Enable two-factor authentication
- ✅ Monitor AWS CloudTrail for API usage

### Verification

Test the configuration:

1. Create test branch and PR
2. Check workflow logs in Actions tab
3. Test development deployment by pushing to develop branch

### Troubleshooting

**Authentication Errors**: Verify AWS credentials are correct and not expired
**Permission Denied**: Check AWS IAM permissions for hitechparadigm profile
**Region Mismatch**: Ensure all resources are in us-east-1 region
