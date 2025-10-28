# API Troubleshooting and Resolution Design Document

## Overview

This design addresses the critical ValidationException error affecting BudgetBuddy's budget API endpoints. The root cause is identified as a stale Lambda layer deployment where the corrected queryByPK function in utils.js is not being used by the Budget_Handler Lambda function. The solution involves forcing a complete Lambda layer rebuild and redeployment using CDK cache clearing and deployment flags.

## Architecture

### Current Problem Architecture
```
Frontend (localhost:5173)
    ↓ GET /v1/budget
API Gateway
    ↓ Route to Lambda
Budget_Handler Lambda Function
    ↓ Uses Lambda Layer
Lambda Layer (STALE VERSION)
    ↓ Contains OLD utils.js
DynamoDB Utils queryByPK()
    ↓ BROKEN: ExpressionAttributeValues overwritten
    ❌ ValidationException: :pk not defined
```

### Target Solution Architecture
```
Frontend (localhost:5173)
    ↓ GET /v1/budget
API Gateway
    ↓ Route to Lambda
Budget_Handler Lambda Function
    ↓ Uses Lambda Layer
Lambda Layer (UPDATED VERSION)
    ↓ Contains FIXED utils.js
DynamoDB Utils queryByPK()
    ↓ FIXED: ExpressionAttributeValues properly merged
    ✅ Successful DynamoDB Query
```

## Components and Interfaces

### 1. Lambda Layer Rebuild System

**Purpose**: Force rebuild and deployment of the Lambda layer with corrected utils.js

**Key Components**:
- **File Modification Trigger**: Append timestamp to utils.js to force CDK change detection
- **CDK Cache Cleaner**: Remove cdk.out directory to prevent cached deployments
- **Force Deployment**: Use --force flag to ensure fresh layer creation

**Interface**:
```bash
# Force rebuild trigger
Get-Date | Out-File -FilePath "backend/layers/common/nodejs/utils.js" -Append -Encoding utf8

# Clear CDK cache
Remove-Item -Recurse -Force infrastructure/cdk.out

# Force deployment
$env:AWS_PROFILE='hitechparadigm'; npx cdk deploy budgetbuddy-dev-api --require-approval never --force
```

### 2. DynamoDB Query Function Validation

**Purpose**: Ensure the queryByPK function correctly merges ExpressionAttributeValues

**Current Correct Implementation**:
```javascript
async queryByPK(pk, options = {}) {
    const client = getDynamoClient();
    const command = new QueryCommand({
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
            ':pk': pk,
            ...(options.ExpressionAttributeValues || {}), // Proper merging
        },
        ...options,
    });

    const result = await client.send(command);
    return result.Items || [];
}
```

**Problem Pattern** (what was causing the error):
```javascript
// WRONG - This overwrites :pk parameter
ExpressionAttributeValues: {
    ':pk': pk,
},
...options, // This overwrites the entire ExpressionAttributeValues object
```

### 3. Budget API Error Recovery

**Purpose**: Restore budget API endpoints to working state

**Key Endpoints**:
- `GET /v1/budget` - List all budgets for family
- `GET /v1/budget/current?month=YYYY-MM` - Get specific month budget
- `PUT /v1/budget/{budgetId}` - Update budget data

**Expected Response Format**:
```json
{
  "success": true,
  "data": {
    "budgets": [
      {
        "budgetId": "budget_uuid",
        "familyId": "family_uuid",
        "month": "2025-10",
        "totalIncome": 0,
        "totalSavings": 0,
        "totalExpenses": 0,
        "remainingBalance": 0,
        "groups": {
          "income": [],
          "savings": [],
          "expenses": []
        },
        "isAIGenerated": false,
        "createdAt": "2025-10-27T...",
        "updatedAt": "2025-10-27T..."
      }
    ],
    "count": 1
  },
  "message": "Budgets retrieved successfully"
}
```

## Data Models

### Lambda Layer Version Tracking

**Layer Metadata**:
```json
{
  "layerName": "budgetbuddy-common-layer",
  "version": "1.0.4",
  "lastModified": "2025-10-27T...",
  "codeSize": "...",
  "compatibleRuntimes": ["nodejs20.x"]
}
```

### Error Tracking Model

**ValidationException Pattern**:
```json
{
  "errorType": "ValidationException",
  "errorMessage": "Invalid KeyConditionExpression: An expression attribute value used in expression is not defined; attribute value: :pk",
  "location": "/opt/nodejs/utils.js:243",
  "function": "queryByPK",
  "requestId": "uuid",
  "timestamp": "2025-10-27T..."
}
```

## Error Handling

### 1. Deployment Validation

**Pre-deployment Checks**:
- Validate utils.js contains correct queryByPK implementation
- Verify package.json files are valid JSON
- Confirm CDK cache is cleared

**Deployment Monitoring**:
- Monitor CloudWatch logs during deployment
- Verify layer version updates in Lambda console
- Test budget health endpoint immediately after deployment

### 2. Runtime Error Recovery

**Error Detection**:
```javascript
// In Budget Handler
try {
    const budgets = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
        FilterExpression: 'entityType = :entityType',
        ExpressionAttributeValues: {
            ':entityType': 'BUDGET'
        }
    });
} catch (error) {
    if (error.name === 'ValidationException' && error.message.includes(':pk')) {
        logger.error('Lambda layer not updated - queryByPK still has old implementation');
        return errorResponse.internalError('System update in progress, please try again');
    }
    throw error;
}
```

**Graceful Degradation**:
- Return helpful error messages instead of generic 500 errors
- Log specific error patterns for monitoring
- Provide retry guidance to users

### 3. Post-Deployment Verification

**Automated Testing**:
```bash
# Test budget health endpoint
curl -X GET "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/budget/health"

# Test authenticated budget endpoint (requires valid JWT)
curl -X GET "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/budget" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Success Criteria**:
- Budget health endpoint returns 200 OK
- Budget list endpoint returns 200 OK or empty array (not 500 error)
- CloudWatch logs show successful queryByPK operations
- No ValidationException errors in logs

## Testing Strategy

### 1. Layer Deployment Testing

**Pre-deployment**:
- Verify utils.js file contains correct queryByPK implementation
- Run local tests to confirm ExpressionAttributeValues merging works
- Validate all JSON files in the layer

**During Deployment**:
- Monitor CDK deployment output for layer version changes
- Watch CloudWatch logs for Lambda function updates
- Verify layer attachment to Budget_Handler function

**Post-deployment**:
- Test budget health endpoint immediately
- Execute authenticated budget API calls
- Monitor CloudWatch logs for 5 minutes to catch any errors

### 2. API Endpoint Testing

**Test Scenarios**:
1. **Empty Budget State**: User with no existing budgets
2. **Existing Budget State**: User with budgets for multiple months
3. **Budget Creation**: Adding new budget items
4. **Budget Updates**: Modifying existing budget data

**Test Commands**:
```bash
# 1. Test health endpoint
curl -X GET "$API_BASE/budget/health"

# 2. Test budget list (requires authentication)
curl -X GET "$API_BASE/budget" -H "Authorization: Bearer $TOKEN"

# 3. Test current month budget
curl -X GET "$API_BASE/budget/current?month=2025-10" -H "Authorization: Bearer $TOKEN"
```

### 3. Frontend Integration Testing

**Browser Testing**:
1. Open http://localhost:5173/
2. Login with existing user credentials
3. Navigate to dashboard
4. Verify budget data loads without errors
5. Test adding new budget items
6. Verify no "ApiClientError" messages appear

**Expected Results**:
- Dashboard loads successfully
- Budget data displays properly
- No 500 errors in browser network tab
- Budget operations complete successfully

## Implementation Steps

### Phase 1: Force Lambda Layer Rebuild (15 minutes)

1. **Trigger Change Detection**:
   ```bash
   cd backend/layers/common/nodejs
   Get-Date | Out-File -FilePath "utils.js" -Append -Encoding utf8
   ```

2. **Clear CDK Cache**:
   ```bash
   cd infrastructure
   Remove-Item -Recurse -Force cdk.out
   ```

3. **Force Deployment**:
   ```bash
   $env:AWS_PROFILE='hitechparadigm'
   npx cdk deploy budgetbuddy-dev-api --require-approval never --force
   ```

### Phase 2: Verification and Testing (10 minutes)

1. **Immediate Health Check**:
   ```bash
   curl -X GET "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/budget/health"
   ```

2. **CloudWatch Log Monitoring**:
   ```bash
   aws logs filter-log-events --log-group-name "/aws/lambda/budgetbuddy-budget" --start-time $(date -d "5 minutes ago" +%s)000 --profile hitechparadigm
   ```

3. **Frontend Testing**:
   - Refresh browser at localhost:5173
   - Login and navigate to dashboard
   - Verify budget operations work

### Phase 3: Monitoring and Validation (5 minutes)

1. **Error Pattern Monitoring**:
   - Watch for ValidationException errors in logs
   - Monitor API response times
   - Verify successful DynamoDB operations

2. **User Experience Validation**:
   - Test budget creation flow
   - Test budget item addition
   - Verify no 500 errors occur

## Success Metrics

### Technical Metrics
- **Zero ValidationException errors** in CloudWatch logs
- **Budget health endpoint** returns 200 OK consistently
- **Budget API endpoints** return 200 OK or appropriate status codes (not 500)
- **Lambda layer version** updated to latest with corrected utils.js

### User Experience Metrics
- **Dashboard loads successfully** without API errors
- **Budget operations complete** without "ApiClientError" messages
- **Response times** remain under 2 seconds for budget operations
- **No 500 errors** in browser network tab

### Monitoring and Alerting
- **CloudWatch alarms** for Lambda errors
- **API Gateway error rate** monitoring
- **User session success rate** tracking
- **Budget operation completion rate** metrics

This design provides a comprehensive solution to the ValidationException error by addressing the root cause (stale Lambda layer) and implementing proper testing and monitoring to prevent similar issues in the future.
