# API Troubleshooting Guide

## Issue: 502 Bad Gateway Errors (October 27, 2025)

### Problem Description
During implementation of seamless budget item management (Task 6.4), the API Gateway was returning persistent 502 Bad Gateway errors for all budget-related endpoints:

```
GET https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/budget 502 (Bad Gateway)
GET https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/budget/current?month=2025-10 502 (Bad Gateway)
```

### Symptoms
- All budget API calls failing with 502 errors
- CORS policy errors appearing alongside 502s
- Frontend showing "Network error: Failed to fetch"
- Lambda functions appeared "Active" in AWS Console
- API Gateway endpoints existed and were properly configured

### Root Cause Analysis
The issue was traced to **stale Lambda layer deployments** combined with **DynamoDB query bugs** that weren't being properly redeployed:

1. **Lambda Layer Caching**: Previous deployments showed "no changes" even when code was modified
2. **DynamoDB Query Bug**: The `queryByPK` function in `backend/layers/common/nodejs/utils.js` had a bug where `ExpressionAttributeValues` were being overwritten instead of merged
3. **Cold Start Issues**: Lambda functions were failing during cold starts due to the query bug

### Error Details
From Lambda logs:
```
ValidationException: Invalid KeyConditionExpression: An expression attribute value used in expression is not defined; attribute value: :pk
```

This occurred because when `options.ExpressionAttributeValues` was passed to `queryByPK`, it overwrote the `:pk` parameter instead of merging with it.

### Fixes Applied

#### 1. Fixed DynamoDB Query Bug
**File**: `backend/layers/common/nodejs/utils.js`

**Before** (Buggy Code):
```javascript
async queryByPK(pk, options = {}) {
    const client = getDynamoClient();
    const command = new QueryCommand({
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
            ':pk': pk,
        },
        ...options, // This overwrote the :pk value!
    });
    // ...
}
```

**After** (Fixed Code):
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
    // ...
}
```

#### 2. Forced Lambda Layer Rebuild
To ensure the fix was deployed:

```bash
# Force rebuild by modifying layer files
Get-Date | Out-File -FilePath "backend/layers/common/nodejs/utils.js" -Append -Encoding utf8

# Clean CDK cache
Remove-Item -Recurse -Force cdk.out

# Force deployment
$env:AWS_PROFILE='hitechparadigm'; npx cdk deploy budgetbuddy-dev-api --require-approval never --force
```

#### 3. Added API Gateway Routes
**File**: `infrastructure/lib/api-stack.ts`

Added missing `/budget/current` route that the frontend was calling:
```typescript
// Budget current month endpoint
const budgetCurrentResource = budgetResource.addResource('current');
budgetCurrentResource.addMethod('GET', new apigateway.LambdaIntegration(this.functions.budgetHandler), {
  authorizer,
  operationName: 'GetCurrentBudget',
});
```

### Resolution Steps
1. **Identified the bug** in DynamoDB query function through Lambda logs
2. **Fixed the query merging logic** to properly handle ExpressionAttributeValues
3. **Forced Lambda layer rebuild** by modifying files and clearing CDK cache
4. **Redeployed with --force flag** to ensure fresh deployment
5. **Added missing API Gateway routes** for frontend compatibility

### Prevention Measures
1. **Always check Lambda logs** when seeing 502 errors - they often contain the real error
2. **Force Lambda layer rebuilds** when making changes to shared utilities:
   ```bash
   # Touch a file in the layer to force rebuild
   Get-Date | Out-File -FilePath "backend/layers/common/nodejs/utils.js" -Append -Encoding utf8
   ```
3. **Use --force flag** when CDK shows "no changes" but you know changes were made
4. **Test DynamoDB queries** with proper ExpressionAttributeValues merging
5. **Monitor CloudWatch logs** during deployment to catch runtime errors early

### Testing the Fix
After applying fixes:
1. Refresh browser at `http://localhost:5173/`
2. Try adding income/expenses using the new seamless UX
3. Check browser network tab for successful API calls (200 status codes)
4. Verify budget creation and item addition works end-to-end

### Final Resolution (October 28, 2025)
The issue was ultimately resolved by fixing **ValidationException error** in the Lambda layer:

**Root Cause**: The Lambda layer was using a stale version of `utils.js` despite the correct fix being present in the source code. The `queryByPK` function was not properly merging `ExpressionAttributeValues`, causing the `:pk` parameter to be undefined.

**Final Fix**:
1. **Force triggered CDK change detection** by modifying `utils.js` file
2. **Cleared CDK deployment cache** by removing `infrastructure/cdk.out` directory
3. **Force deployed Lambda layer** with `--force` flag to ensure fresh deployment
4. **Verified Lambda functions updated** to new layer version 25
5. **Cleaned up corrupted timestamp appends** that were causing additional issues

**Result**: Budget health endpoint now returns `200 OK` with proper JSON response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "budget",
    "version": "1.0.0"
  },
  "message": "Budget service is healthy"
}
```

**Frontend Validation**: Budget operations now work successfully:
- ✅ "Budget updated successfully" messages in console
- ✅ Category management working properly
- ✅ No more "ApiClientError: An error occurred processing your request"
- ✅ All budget CRUD operations functional

### Related Issues
- **CORS Errors**: Often appear alongside 502 errors but are symptoms, not the root cause
- **Lambda Cold Starts**: Can mask underlying code bugs that only surface during initialization
- **CDK Deployment Caching**: Can prevent code changes from being deployed even when files are modified

### Future Debugging Steps
When encountering 502 errors:
1. Check CloudWatch logs for the specific Lambda function
2. Look for ValidationException or other runtime errors
3. Verify DynamoDB query syntax and parameter merging
4. Force rebuild Lambda layers if shared utilities were modified
5. Use `--force` flag in CDK deployments when necessary

---
*Last Updated: October 27, 2025*
*Issue Resolution: Task 6.4 - Seamless Budget Item Management*
