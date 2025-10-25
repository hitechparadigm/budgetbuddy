# BudgetBuddy Configuration Guide

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

# External Services
STRIPE_SECRET_KEY=sk_test_... # Configure separately
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0

# Monitoring
LOG_LEVEL=INFO
CORRELATION_ID_HEADER=x-correlation-id
```

## 📱 Frontend Configuration

### React Web Application
```javascript
// src/config/aws-config.js
export const awsConfig = {
  // API Configuration
  apiUrl: 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1',
  
  // Cognito Configuration
  cognito: {
    userPoolId: 'us-east-1_xxxxxxxxx',
    userPoolClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    region: 'us-east-1',
    
    // Optional: Custom domain
    domain: 'auth.budgetbuddy.com', // If configured
  },
  
  // CloudFront URLs (after deployment)
  hosting: {
    webAppUrl: 'https://xxxxxxxxxxxxxx.cloudfront.net',
    adminDashboardUrl: 'https://yyyyyyyyyyyyyy.cloudfront.net'
  },
  
  // Feature Flags
  features: {
    aiGeneration: true,
    familyAccounts: true,
    premiumFeatures: true,
    analytics: true
  }
};
```#
## React Native Mobile Application
```javascript
// src/config/aws-config.js
export const awsConfig = {
  // API Configuration
  apiUrl: 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1',
  
  // Cognito Configuration
  cognito: {
    userPoolId: 'us-east-1_xxxxxxxxx',
    userPoolClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    region: 'us-east-1',
  },
  
  // Platform-specific settings
  platform: {
    ios: {
      bundleId: 'com.budgetbuddy.app',
      urlScheme: 'budgetbuddy'
    },
    android: {
      packageName: 'com.budgetbuddy.app',
      urlScheme: 'budgetbuddy'
    }
  }
};
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
  "Purpose": "Family-Budgeting-Application"
}
```

### Service-Specific Tags

#### Database Resources
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
  "Handler": "auth|budget|transaction|ai|family|payment|email|admin",
  "Runtime": "NodeJS-20",
  "CostCenter": "BudgetBuddy-Compute"
}
```