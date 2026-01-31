# Family Lambda 502 Error - Deployment Blocker

## Status: BLOCKED

**Date**: 2026-01-31
**Task**: 2.8 Add unit tests (blocked by deployment failure)
**Attempts**: 3 deployment attempts, all failed with same error

## Problem

Family Lambda health endpoint consistently returns 502 Bad Gateway error during deployment health checks, preventing successful deployment.

## Error Details

```
[ERROR] /family/health responded with status 502 (expected 200)
[ERROR] family service failed
```

**Endpoint**: `https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/family/health`
**Expected**: 200 OK
**Actual**: 502 Bad Gateway

## What We Tried

### Attempt 1: Added Health Endpoint

- **Commit**: 737aec4
- **Change**: Added `GET /family/health` endpoint to index.js
- **Result**: FAILED - 502 error
- **Issue**: Health check was AFTER authentication check

### Attempt 2: Moved Health Check Before Auth

- **Commit**: 248b1ac
- **Change**: Moved health check before user context validation
- **Result**: FAILED - 502 error
- **Issue**: Still inside try block, might be crashing before reaching it

### Attempt 3: Improved Error Handling

- **Commit**: e606684
- **Change**: Wrapped entire handler in try-catch, added path variants
- **Result**: FAILED - 502 error
- **Issue**: Lambda might not be deploying at all or has configuration issue

## Possible Root Causes

1. **Lambda Not Deployed**: CDK might not be deploying the family Lambda
   - Check: CloudFormation stack for family Lambda resource
   - Check: Lambda function exists in AWS console

2. **Missing Dependencies**: npm packages not installed during CDK build
   - package.json has aws-sdk and uuid dependencies
   - CDK might need explicit bundling configuration

3. **IAM Permissions**: Lambda might not have permissions to execute
   - Check: Lambda execution role
   - Check: API Gateway integration permissions

4. **API Gateway Configuration**: Route might not be properly configured
   - Check: `/family/health` route exists in API Gateway
   - Check: Integration is pointing to correct Lambda

5. **Lambda Timeout/Crash**: Lambda might be timing out or crashing on startup
   - Check: CloudWatch logs for family Lambda
   - Check: Lambda initialization errors

## Current Code State

**File**: `backend/functions/family/index.js`

```javascript
exports.handler = async (event) => {
  try {
    console.log("Family Lambda invoked:", JSON.stringify(event, null, 2));

    // Handle OPTIONS requests for CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: "",
      };
    }

    // Handle health check BEFORE authentication (public endpoint)
    if (
      event.httpMethod === "GET" &&
      (event.path === "/family/health" || event.path === "/v1/family/health")
    ) {
      return successResponse({ status: "healthy", service: "family" });
    }

    // ... rest of handler
  } catch (error) {
    console.error("Error in family handler:", error);
    return errorResponse(500, "Internal server error", error.message);
  }
};
```

**CDK Configuration**: `infrastructure/lib/api-stack.ts`

```typescript
this.functions.familyHandler = new lambda.Function(this, "FamilyHandler", {
  ...commonProps,
  functionName: "budgetbuddy-family",
  code: lambda.Code.fromAsset("../backend/functions/family"),
  handler: "index.handler",
  description:
    "BudgetBuddy family handler for shared accounts, invitations, and member management",
});

// Health endpoint (public, no authorizer)
const familyHealthResource = familyResource.addResource("health");
familyHealthResource.addMethod(
  "GET",
  new apigateway.LambdaIntegration(this.functions.familyHandler),
  {
    methodResponses: [{ statusCode: "200" }],
    operationName: "FamilyHealthCheck",
  },
);
```

## Next Steps (Manual Investigation Required)

1. **Check AWS Console**:
   - Verify family Lambda exists: `budgetbuddy-family`
   - Check CloudWatch logs for any invocation attempts
   - Verify API Gateway has `/family/health` route
   - Check Lambda execution role permissions

2. **Test Lambda Directly**:
   - Invoke Lambda directly from AWS console with test event
   - Check if Lambda responds correctly outside API Gateway

3. **Check CDK Deployment**:
   - Verify CDK synthesized the family Lambda correctly
   - Check if npm dependencies are being bundled
   - Look for any CDK deployment errors in CI/CD logs

4. **Compare with Working Lambdas**:
   - Auth, budget, transactions all work fine
   - Compare their configuration with family Lambda
   - Check if there's a pattern we're missing

## Workaround

For now, we can:

1. Skip the family health check in deployment script (temporary)
2. Continue with other family Lambda tasks (unit tests, etc.)
3. Fix deployment issue separately

## Impact

- **Blocked Tasks**: Task 2.8 (unit tests) can proceed, but deployment will fail
- **Phase 2**: Cannot complete until deployment succeeds
- **Phase 3+**: Blocked until Phase 2 completes

## Resolution Required

This requires manual investigation in AWS console or deeper CDK debugging. The autonomous development process should continue with other tasks while this is investigated.

## Files Involved

- `backend/functions/family/index.js` - Lambda handler
- `backend/functions/family/package.json` - Dependencies
- `infrastructure/lib/api-stack.ts` - CDK configuration
- `scripts/check-deployment.sh` - Health check script
