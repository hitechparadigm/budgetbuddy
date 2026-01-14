# Auth Onboarding Lambda Stack

## Overview

The Auth Onboarding Stack creates a standalone Lambda function for handling user onboarding completion. This is part of the architectural refactoring to split the monolithic 1484-line auth Lambda into separate, focused functions.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  API Gateway                            │
│                                                         │
│  POST /auth/onboarding  →  auth-onboarding Lambda      │
│                                                         │
└─────────────────────────────────────────────────────────┘
                              │
                              ↓
                    ┌─────────────────────┐
                    │  Lambda Layers      │
                    │                     │
                    │  1. Auth Shared     │
                    │     - CORS          │
                    │     - Token parsing │
                    │     - Validation    │
                    │     - Errors        │
                    │                     │
                    │  2. Common          │
                    │     - DynamoDB      │
                    │     - FamilyId      │
                    └─────────────────────┘
                              │
                              ↓
                    ┌─────────────────────┐
                    │   DynamoDB Table    │
                    │                     │
                    │  - User profiles    │
                    │  - Budgets          │
                    └─────────────────────┘
```

## Function Details

- **Name**: `budgetbuddy-auth-onboarding`
- **Runtime**: Node.js 20.x
- **Handler**: `index.handler`
- **Timeout**: 30 seconds
- **Memory**: 512 MB
- **Code Size**: ~300 lines (vs 1484 in monolithic)

## Responsibilities

1. **Authentication**: Parse JWT token and extract userId
2. **Validation**: Validate onboarding input (city, country, familySize, etc.)
3. **Profile Update**: Mark user profile as onboarded in DynamoDB
4. **Budget Creation**: Create initial budget with selected categories
5. **Verification**: Verify budget was created successfully

## IAM Permissions

The Lambda function has minimal permissions following the principle of least privilege:

- **DynamoDB**:
  - `PutItem`: Create budget records
  - `GetItem`: Verify budget creation and resolve family ID
  - `UpdateItem`: Mark user profile as onboarded

## Lambda Layers

### 1. Auth Shared Layer (`authSharedLayer`)

Contains common authentication utilities:

- `getCorsHeaders()`: CORS header generation
- `parseIdToken()`: JWT token parsing
- `validateOnboardingInput()`: Input validation
- `formatErrorResponse()`: Error formatting
- Custom error classes (ValidationError, AuthenticationError)

### 2. Common Layer (`commonLayer`)

Contains DynamoDB utilities:

- `dynamoHelpers`: DynamoDB operations (putItem, getItem, updateItem)
- `FamilyIdResolver`: Family ID resolution logic

## Environment Variables

- `TABLE_NAME`: DynamoDB table name
- `NODE_ENV`: Environment (production)
- `LOG_LEVEL`: Logging level (info)
- `AWS_REGION`: AWS region (auto-set by Lambda)

## API Contract

### Request

```http
POST /auth/onboarding
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "city": "New York",
  "country": "United States",
  "familySize": 2,
  "currentMonth": "2026-01",
  "selectedCategories": [
    {
      "name": "Groceries",
      "icon": "🛒",
      "adjustedAmount": 500
    }
  ]
}
```

### Response (Success)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Onboarding completed successfully",
  "budgetCreated": true,
  "budgetId": "budget_1234567890_abc123",
  "month": "2026-01",
  "totalExpenses": 500,
  "categoriesCreated": 1,
  "debugInfo": {
    "userId": "user-123",
    "familyId": "family-123",
    "jwtFamilyId": "family-123",
    "partitionKey": "FAMILY#family-123",
    "sortKey": "BUDGET#2026-01",
    "resolutionSource": "jwt"
  }
}
```

### Response (Error)

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Validation Error",
  "message": "Request validation failed",
  "details": [
    "City is required and must be a string",
    "Family size must be between 1 and 10"
  ]
}
```

## Deployment

### Prerequisites

1. Database stack deployed (DynamoDB table)
2. Auth stack deployed (Cognito User Pool, Auth Shared Layer)

### Deploy Command

```bash
cd infrastructure
npm run build
cdk deploy budgetbuddy-dev-auth-onboarding
```

### Verify Deployment

```bash
# Check Lambda function exists
aws lambda get-function --function-name budgetbuddy-auth-onboarding

# Check CloudWatch logs
aws logs tail /aws/lambda/budgetbuddy-auth-onboarding --follow

# Test invocation
aws lambda invoke \
  --function-name budgetbuddy-auth-onboarding \
  --payload file://test-event.json \
  response.json
```

## Monitoring

### CloudWatch Metrics

- **Invocations**: Number of times function is invoked
- **Errors**: Number of errors (should be 0)
- **Duration**: Execution time (should be < 1 second)
- **Throttles**: Number of throttled requests (should be 0)
- **ConcurrentExecutions**: Number of concurrent executions

### CloudWatch Logs

Log groups are automatically created:

- `/aws/lambda/budgetbuddy-auth-onboarding`

Retention: 7 days (cost optimization)

### Alarms (Future)

- Error rate > 5% for 5 minutes
- P99 latency > 1 second for 5 minutes
- Throttles > 0 for 5 minutes

## Testing

### Unit Tests

```bash
cd backend/functions/auth-onboarding
npm test
```

12 tests covering:

- CORS preflight handling
- Authentication (missing header, token parsing)
- Validation (missing body, invalid JSON, validation errors)
- Successful onboarding flow
- Budget creation with correct structure
- Budget verification failure handling
- Import availability verification

### Integration Tests

```bash
# Test with real AWS resources
cd infrastructure
npm run test:integration
```

## Rollback

If issues occur after deployment:

1. **Immediate**: Route traffic back to monolithic Lambda

   ```bash
   # Update API Gateway integration
   aws apigateway update-integration \
     --rest-api-id <API_ID> \
     --resource-id <RESOURCE_ID> \
     --http-method POST \
     --patch-operations op=replace,path=/uri,value=arn:aws:lambda:...:function:budgetbuddy-auth
   ```

2. **Investigation**: Check CloudWatch logs

   ```bash
   aws logs tail /aws/lambda/budgetbuddy-auth-onboarding --since 1h
   ```

3. **Fix**: Deploy updated version
   ```bash
   cdk deploy budgetbuddy-dev-auth-onboarding
   ```

## Cost Optimization

- **On-demand billing**: Only pay for actual invocations
- **512 MB memory**: Balanced for cost and performance
- **7-day log retention**: Reduce CloudWatch costs
- **Shared layers**: Reduce deployment package size

Estimated cost: $0.01 per 1000 requests

## Security

- **Least privilege IAM**: Only DynamoDB read/write permissions
- **JWT authentication**: Required for all requests
- **Input validation**: Prevent injection attacks
- **CORS**: Restrict origins to allowed domains
- **Encryption**: Data encrypted at rest and in transit

## Critical Fix

**Problem**: Monolithic Lambda had imports at line 1036 used at line 928, causing ReferenceError

**Solution**: All imports at top of file in auth-onboarding Lambda

```javascript
// AWS SDK imports (MUST be at top)
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

// Shared utilities from Lambda Layer (MUST be at top)
const { getCorsHeaders } = require("/opt/nodejs/shared/cors");

// Local utilities (MUST be at top)
const dynamoHelpers = require("./utils/dynamo-helpers");
const FamilyIdResolver = require("./utils/family-id-resolver");
```

This architectural change makes import ordering bugs **impossible**.

## Next Steps

Continue Phase 2 refactoring:

- Task 7: Create auth-register Lambda
- Task 8: Create auth-login Lambda
- Task 9: Create auth-google Lambda
- Task 10: Create auth-profile Lambda
- Task 12: Create auth-geolocation Lambda

## References

- [Design Document](.kiro/specs/auth-lambda-refactoring/design.md)
- [Requirements](.kiro/specs/auth-lambda-refactoring/requirements.md)
- [Tasks](.kiro/specs/auth-lambda-refactoring/tasks.md)
- [Lambda Function Code](../backend/functions/auth-onboarding/index.js)
- [Unit Tests](../backend/functions/auth-onboarding/index.test.js)
