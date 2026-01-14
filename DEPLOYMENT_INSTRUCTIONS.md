# 🚨 CRITICAL: Auth-Onboarding Lambda Deployment Required

## Issue Summary

**Problem**: User completed onboarding successfully, but no budget was created in DynamoDB.

**Root Cause**: The new `auth-onboarding` Lambda function has been **created but NOT deployed** to AWS. API Gateway is still routing `/auth/onboarding` requests to the OLD monolithic `auth` Lambda.

**Evidence**:

- Console logs show: `OnboardingPage: Onboarding completed successfully`
- Console logs show: `[loadBudget] Found 0 budget(s) in backend`
- API Gateway routing logic: `const onboardingHandler = this.authOnboardingFunction || this.functions.authHandler;`
- This means if `authOnboardingFunction` is undefined (not deployed), it falls back to the old Lambda

## Why This Matters

The new `auth-onboarding` Lambda includes critical bug fixes:

1. **Import ordering fix**: All imports are at the top of the file (prevents ReferenceError)
2. **Proper budget creation**: Uses correct DynamoDB helpers and family ID resolution
3. **Budget verification**: Immediately verifies budget was created successfully
4. **Enhanced logging**: Better debugging with FamilyIdResolver logs

The old monolithic Lambda may still have the import ordering bug that was causing budget creation failures.

## Deployment Steps

### Step 1: Verify CDK Stack Configuration

The stack is already configured in `infrastructure/bin/app.ts`:

```typescript
const authOnboardingStack = new AuthOnboardingStack(
  app,
  `${stackPrefix}-auth-onboarding`,
  {
    env,
    description:
      "BudgetBuddy auth onboarding Lambda - standalone function for user onboarding completion",
    table: databaseStack.table,
    authSharedLayer: authStack.authSharedLayer,
  }
);
```

### Step 2: Deploy the Auth-Onboarding Stack

```bash
cd infrastructure
npx cdk deploy budgetbuddy-dev-auth-onboarding
```

**What this does**:

- Creates the new `auth-onboarding` Lambda function in AWS
- Sets up IAM permissions (DynamoDB read/write only)
- Creates CloudWatch log group with 7-day retention
- Attaches Lambda layers (auth-shared and common)

### Step 3: Update API Gateway Integration

After deploying the auth-onboarding stack, you need to **redeploy the API stack** to update the API Gateway integration:

```bash
npx cdk deploy budgetbuddy-dev-api
```

**What this does**:

- Updates API Gateway to route `/auth/onboarding` to the NEW Lambda
- The routing logic will now use: `this.authOnboardingFunction` (not null anymore)
- Old monolithic Lambda will no longer handle onboarding requests

### Step 4: Verify Deployment

1. **Check Lambda exists**:

   ```bash
   aws lambda get-function --function-name budgetbuddy-auth-onboarding
   ```

2. **Check API Gateway integration**:

   - Go to AWS Console → API Gateway → budgetbuddy-api
   - Navigate to `/auth/onboarding` → POST method
   - Verify it's integrated with `budgetbuddy-auth-onboarding` Lambda (not `budgetbuddy-auth`)

3. **Test onboarding flow**:
   - Complete onboarding in the app
   - Check CloudWatch logs for `budgetbuddy-auth-onboarding` Lambda
   - Verify budget is created in DynamoDB

### Step 5: Monitor CloudWatch Logs

After deployment, monitor the new Lambda's logs:

```bash
aws logs tail /aws/lambda/budgetbuddy-auth-onboarding --follow
```

Look for these log messages:

- `=== AUTH ONBOARDING LAMBDA ===`
- `Onboarding validation passed`
- `Family ID resolution:`
- `Creating budget with data:`
- `Initial budget created from onboarding selections`
- `Budget verification successful`

## Expected Behavior After Deployment

### Before Deployment (Current State)

- API Gateway routes to OLD `budgetbuddy-auth` Lambda
- Onboarding completes but budget is NOT created
- User sees "No budgets exist in backend"

### After Deployment (Fixed State)

- API Gateway routes to NEW `budgetbuddy-auth-onboarding` Lambda
- Onboarding completes AND budget IS created
- User sees their budget with selected categories
- Budget is immediately verified in DynamoDB

## Rollback Plan (If Needed)

If the new Lambda causes issues, you can quickly rollback:

1. **Remove the auth-onboarding function from API stack**:

   ```typescript
   // In infrastructure/lib/api-stack.ts, line ~432
   const onboardingHandler = this.functions.authHandler; // Force use of old Lambda
   ```

2. **Redeploy API stack**:

   ```bash
   npx cdk deploy budgetbuddy-dev-api
   ```

3. **Delete the auth-onboarding stack** (optional):
   ```bash
   npx cdk destroy budgetbuddy-dev-auth-onboarding
   ```

## Cost Impact

**Minimal cost increase**:

- New Lambda: ~$0.20/month (512 MB, 30s timeout, low usage)
- CloudWatch Logs: ~$0.50/month (7-day retention)
- **Total**: ~$0.70/month additional cost

**Benefits**:

- Isolated onboarding logic (easier debugging)
- Minimal IAM permissions (better security)
- Faster cold starts (smaller deployment package)
- Better monitoring (dedicated CloudWatch logs)

## Next Steps After Deployment

1. **Test the onboarding flow** with a new user account
2. **Verify budget creation** in DynamoDB
3. **Monitor CloudWatch logs** for any errors
4. **Update task status** in `.kiro/specs/auth-lambda-refactoring/tasks.md`:
   - Mark Task 11.4 as deployed
   - Update Phase 2 progress tracking

## Questions?

If you encounter any issues during deployment:

1. Check CloudWatch logs for both Lambdas
2. Verify API Gateway integration in AWS Console
3. Test with a new user account (not existing users)
4. Check DynamoDB for budget records with correct PK/SK

---

**Status**: ⚠️ DEPLOYMENT REQUIRED
**Priority**: 🔴 HIGH (blocking user onboarding)
**Estimated Time**: 10-15 minutes
