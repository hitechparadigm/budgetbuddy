# API Gateway Deployment Fix

## Issue Summary

After deploying the new `auth-onboarding` Lambda function via CI/CD, budget creation was still failing. Investigation revealed that **API Gateway was not routing requests to the new Lambda function** despite successful deployment.

## Root Cause

**API Gateway deployments are not automatically triggered when Lambda function code changes**, even if the Lambda is successfully deployed. CDK shows "no changes" when:

1. The infrastructure code hasn't changed (Lambda reference was already in place)
2. Only the Lambda function code was updated
3. API Gateway integration configuration remains the same

This means API Gateway continues using the old Lambda integration or has stale cached integrations.

## The Problem Flow

```
User completes onboarding
    ↓
Frontend calls: POST /auth/onboarding
    ↓
API Gateway routes to: budgetbuddy-auth (OLD Lambda) ❌
    ↓
Old Lambda has bugs (ReferenceError: dynamoHelpers not defined)
    ↓
Budget creation fails
```

## Expected Flow

```
User completes onboarding
    ↓
Frontend calls: POST /auth/onboarding
    ↓
API Gateway routes to: budgetbuddy-auth-onboarding (NEW Lambda) ✅
    ↓
New Lambda creates budget successfully
    ↓
Budget appears in DynamoDB
```

## Solution Applied

### 1. Force API Gateway Redeployment

Modified `infrastructure/lib/api-stack.ts` to include a timestamp in deployment description:

```typescript
deployOptions: {
  stageName: 'v1',
  loggingLevel: apigateway.MethodLoggingLevel.INFO,
  dataTraceEnabled: true,
  metricsEnabled: true,
  // Force deployment when Lambda integrations change
  description: `Deployment ${new Date().toISOString()}`,
},
```

This ensures CDK detects a change and triggers API Gateway redeployment.

### 2. Added Integration Logging

Added console logging to show which Lambda is being used:

```typescript
if (this.authOnboardingFunction) {
  console.log(
    "✅ Using standalone auth-onboarding Lambda for /auth/onboarding endpoint",
  );
} else {
  console.log(
    "⚠️  Using monolithic auth Lambda for /auth/onboarding endpoint (fallback)",
  );
}
```

### 3. Created Verification Script

Created `scripts/check-api-gateway-integration.ps1` to verify:

- Which Lambda function is integrated with `/auth/onboarding`
- Recent Lambda invocations
- API Gateway deployment timestamp
- Whether the correct Lambda is being used

## How to Verify the Fix

### Step 1: Run the verification script

```powershell
.\scripts\check-api-gateway-integration.ps1
```

This will show:

- ✅ If using `budgetbuddy-auth-onboarding` (correct)
- ❌ If using `budgetbuddy-auth` (incorrect - needs redeployment)

### Step 2: Check CloudWatch Logs

```powershell
# Check new Lambda logs
aws logs tail /aws/lambda/budgetbuddy-auth-onboarding --since 30m

# Check old Lambda logs (should NOT show onboarding requests)
aws logs tail /aws/lambda/budgetbuddy-auth --since 30m
```

### Step 3: Test Onboarding

1. Complete onboarding in the app
2. Check logs for "=== AUTH ONBOARDING LAMBDA ===" message
3. Verify budget creation in DynamoDB

## Deployment Instructions

### Push Changes to GitHub

```bash
git add infrastructure/lib/api-stack.ts
git add scripts/check-api-gateway-integration.ps1
git add API_GATEWAY_DEPLOYMENT_FIX.md
git commit -m "fix: Force API Gateway redeployment for auth-onboarding Lambda integration"
git push origin main
```

### Monitor Deployment

1. GitHub Actions will trigger automatically
2. Watch for CDK deployment output showing API Gateway changes
3. Verify deployment completes successfully

### Post-Deployment Verification

```powershell
# 1. Check API Gateway integration
.\scripts\check-api-gateway-integration.ps1

# 2. Test onboarding
# Complete onboarding in the app

# 3. Check Lambda logs
aws logs tail /aws/lambda/budgetbuddy-auth-onboarding --since 5m

# 4. Verify budget in DynamoDB
aws dynamodb query \
  --table-name budgetbuddy-table \
  --key-condition-expression "PK = :pk AND begins_with(SK, :sk)" \
  --expression-attribute-values '{":pk":{"S":"FAMILY#<your-family-id>"},":sk":{"S":"BUDGET#"}}'
```

## Why This Happens

CDK's change detection is based on CloudFormation template differences. When:

- Lambda function code changes (via CI/CD or manual deployment)
- But infrastructure code remains the same
- CDK sees "no changes" and skips API Gateway redeployment

This is a known CDK behavior. The timestamp in deployment description forces a change detection.

## Alternative Solutions (Not Used)

1. **Manual API Gateway deployment**: `aws apigateway create-deployment`
2. **CDK deployment with --force flag**: Forces all resources to redeploy
3. **Change Lambda function name**: Forces new integration (breaks existing references)
4. **Use Lambda aliases/versions**: More complex, requires version management

## Related Files

- `infrastructure/lib/api-stack.ts` - API Gateway configuration
- `infrastructure/bin/app.ts` - CDK app with auth-onboarding stack
- `backend/functions/auth-onboarding/index.js` - New Lambda function
- `scripts/check-api-gateway-integration.ps1` - Verification script
- `scripts/verify-onboarding-deployment.ps1` - Deployment verification

## Lessons Learned

1. **API Gateway deployments are separate from Lambda deployments**
2. **CDK "no changes" doesn't mean everything is up to date**
3. **Always verify API Gateway integrations after Lambda updates**
4. **Use verification scripts to catch integration issues early**
5. **Force redeployment when Lambda integrations change**

## Next Steps

After this fix is deployed:

1. ✅ API Gateway will route to new `auth-onboarding` Lambda
2. ✅ Budget creation will work correctly
3. ✅ Onboarding will complete successfully
4. ✅ Users will see their budgets immediately after onboarding
