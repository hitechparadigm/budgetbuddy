# 🚀 Deploy Auth-Onboarding Lambda via CI/CD

## Quick Start (Recommended)

The **fastest and safest** way to deploy is through the CI/CD pipeline:

```bash
# 1. Commit all changes
git add .
git commit -m "feat: Deploy auth-onboarding Lambda to fix budget creation bug"

# 2. Push to develop branch (triggers automatic deployment)
git push origin develop
```

That's it! The CI/CD pipeline will automatically deploy all stacks including the new auth-onboarding Lambda.

---

## Issue Summary

**Problem**: User completed onboarding successfully, but no budget was created in DynamoDB.

**Root Cause**: The new `auth-onboarding` Lambda function has been **created but NOT deployed** to AWS. API Gateway is still routing `/auth/onboarding` requests to the OLD monolithic `auth` Lambda.

**Solution**: Deploy via CI/CD pipeline to automatically deploy all stacks with proper configuration.

---

## CI/CD Deployment Process

### Step 1: Pre-Push Documentation Check

When you run `git push origin develop`, the pre-push hook will enforce documentation updates:

**Required Documentation Updates**:

1. ✅ **CHANGELOG.md** - Add entry for auth-onboarding Lambda deployment
2. ✅ **DEVELOPMENT_LOG.md** - Document the bug fix and deployment
3. ✅ **README.md** - Update recent achievements
4. ✅ **docs/development-status.md** - Mark Task 11.4 as deployed
5. ✅ **docs/api-endpoints.md** - Update if needed

**Checklist to Complete**:

- [ ] Add CHANGELOG entry with today's date
- [ ] Document the onboarding bug fix in DEVELOPMENT_LOG
- [ ] Update README recent achievements
- [ ] Mark Task 11.4 as deployed in development-status.md
- [ ] Review for duplicate/obsolete content

### Step 2: GitHub Actions Workflow Triggers

Once you push, the `deploy-dev.yml` workflow automatically runs:

**Workflow Jobs**:

1. **Pre-Deployment Checks** (~3 minutes)

   - Security scanning
   - Linting
   - Unit tests
   - CDK synthesis validation

2. **Deploy Infrastructure** (~10-15 minutes)

   - Deploy `budgetbuddy-dev-database` stack
   - Deploy `budgetbuddy-dev-auth` stack
   - Deploy `budgetbuddy-dev-auth-onboarding` stack ⭐ **NEW**
   - Deploy `budgetbuddy-dev-api` stack (updated routing)
   - Deploy `budgetbuddy-dev-hosting` stack
   - Deploy `budgetbuddy-dev-monitoring` stack

3. **Health Checks** (~2 minutes)

   - Verify CloudFormation stacks
   - Test API endpoints
   - Validate Lambda functions

4. **Deployment Notification**
   - Generate summary
   - Post to GitHub Actions

**Total Time**: ~15-20 minutes

### Step 3: Monitor Deployment

**Option A: GitHub Actions Web UI** (Recommended)

1. Go to: https://github.com/hitechparadigm/budgetbuddy/actions
2. Click on the latest "Deploy to Development" workflow run
3. Watch progress in real-time
4. View logs for each job

**Option B: Kiro CI/CD Monitoring Hook**

1. Click "Monitor CI/CD Pipeline" button in Kiro
2. Script checks latest workflow run status
3. If deployment fails, Kiro receives alert with logs
4. Kiro can analyze logs and suggest fixes

**Option C: GitHub CLI**

```bash
# Watch deployment in real-time
gh run watch

# View latest run status
gh run list --workflow=deploy-dev.yml --limit=1

# View specific run
gh run view <run-id>

# View logs if failed
gh run view <run-id> --log-failed
```

### Step 4: Verify Deployment Success

After deployment completes, verify the new Lambda is deployed:

**Using PowerShell Verification Script**:

```powershell
.\scripts\verify-onboarding-deployment.ps1
```

**Expected Output**:

```
==========================================
Auth-Onboarding Deployment Verification
==========================================

1. Checking CDK Stack Status...
✅ Stack Status: UPDATE_COMPLETE

2. Checking Lambda Function...
✅ Lambda State: Active
   Memory: 512MB
   Timeout: 30s
   Runtime: nodejs20.x

3. Checking Lambda Layers...
✅ Layers attached:
   - arn:aws:lambda:us-east-1:...:layer:budgetbuddy-auth-shared:1
   - arn:aws:lambda:us-east-1:...:layer:budgetbuddy-common:1

4. Checking CloudWatch Log Group...
✅ Log Group: /aws/lambda/budgetbuddy-auth-onboarding
   Retention: 7 days

==========================================
Summary
==========================================
✅ Auth-Onboarding Lambda is DEPLOYED
```

**Manual Verification**:

```bash
# Check Lambda exists
aws lambda get-function --function-name budgetbuddy-auth-onboarding

# Check API Gateway integration
aws apigateway get-integration \
  --rest-api-id <api-id> \
  --resource-id <resource-id> \
  --http-method POST
```

### Step 5: Test Onboarding Flow

1. **Create a new test user account**

   - Go to: https://d1ueeugn9zcx7n.cloudfront.net
   - Register with a new email

2. **Complete onboarding**

   - Select city, country, family size
   - Choose expense categories
   - Submit onboarding form

3. **Verify budget creation**

   - Check that budget appears on dashboard
   - Verify categories are created
   - Confirm no "No budgets exist" message

4. **Monitor CloudWatch Logs**

   ```bash
   aws logs tail /aws/lambda/budgetbuddy-auth-onboarding --follow
   ```

   **Expected Log Messages**:

   - `=== AUTH ONBOARDING LAMBDA ===`
   - `Onboarding validation passed`
   - `Family ID resolution:`
   - `Creating budget with data:`
   - `Initial budget created from onboarding selections`
   - `Budget verification successful`

---

## What Gets Deployed

### New Resources Created

1. **Lambda Function**: `budgetbuddy-auth-onboarding`

   - Runtime: Node.js 20.x
   - Memory: 512 MB
   - Timeout: 30 seconds
   - Handler: `index.handler`

2. **IAM Role**: `budgetbuddy-dev-auth-onboarding-role`

   - DynamoDB read/write permissions (minimal)
   - CloudWatch Logs permissions

3. **CloudWatch Log Group**: `/aws/lambda/budgetbuddy-auth-onboarding`

   - Retention: 7 days
   - Auto-created on first invocation

4. **Lambda Layers** (attached):
   - `budgetbuddy-auth-shared` - CORS, validation, errors
   - `budgetbuddy-common` - DynamoDB helpers, FamilyIdResolver

### Updated Resources

1. **API Gateway**: `budgetbuddy-api`

   - `/auth/onboarding` POST endpoint now routes to NEW Lambda
   - Old monolithic Lambda no longer handles onboarding

2. **CloudFormation Stacks**:
   - `budgetbuddy-dev-auth-onboarding` (new)
   - `budgetbuddy-dev-api` (updated)

---

## Troubleshooting

### Deployment Fails at Pre-Deployment Checks

**Symptom**: Workflow fails during linting or tests

**Solution**:

```bash
# Run checks locally first
npm run lint
npm run test:unit

# Fix any issues, then push again
git add .
git commit -m "fix: Resolve linting/test issues"
git push origin develop
```

### Deployment Fails at Infrastructure Deployment

**Symptom**: CDK deployment fails

**Solution**:

1. Check CloudFormation stack events in AWS Console
2. View detailed logs in GitHub Actions
3. Common issues:
   - IAM permissions insufficient
   - Resource limits exceeded
   - Dependency conflicts

**Quick Fix**:

```bash
# View CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name budgetbuddy-dev-auth-onboarding \
  --max-items 10

# Check for errors
aws cloudformation describe-stacks \
  --stack-name budgetbuddy-dev-auth-onboarding \
  --query "Stacks[0].StackStatus"
```

### Health Checks Fail

**Symptom**: Deployment succeeds but health checks fail

**Solution**:

1. Check API Gateway endpoints manually
2. Verify Lambda function is active
3. Check CloudWatch logs for errors

```bash
# Test health endpoint
curl https://<api-url>/health

# Test auth health endpoint
curl https://<api-url>/auth/health

# Check Lambda logs
aws logs tail /aws/lambda/budgetbuddy-auth-onboarding --follow
```

### Onboarding Still Fails After Deployment

**Symptom**: Budget still not created after deployment

**Possible Causes**:

1. API Gateway cache not invalidated
2. Old Lambda still being invoked
3. DynamoDB permissions issue

**Solution**:

```bash
# 1. Verify API Gateway integration
aws apigateway get-integration \
  --rest-api-id <api-id> \
  --resource-id <resource-id> \
  --http-method POST

# 2. Check Lambda invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=budgetbuddy-auth-onboarding \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum

# 3. Force API Gateway deployment
aws apigateway create-deployment \
  --rest-api-id <api-id> \
  --stage-name v1
```

---

## Rollback Procedure

If the new Lambda causes issues, you can quickly rollback:

### Option 1: Revert Git Commit

```bash
# Revert the deployment commit
git revert HEAD

# Push to trigger rollback deployment
git push origin develop
```

### Option 2: Manual Rollback

```bash
# Delete the auth-onboarding stack
cd infrastructure
npx cdk destroy budgetbuddy-dev-auth-onboarding

# Redeploy API stack (will use old Lambda)
npx cdk deploy budgetbuddy-dev-api
```

### Option 3: Emergency Rollback (AWS Console)

1. Go to CloudFormation console
2. Select `budgetbuddy-dev-auth-onboarding` stack
3. Click "Delete"
4. Wait for deletion to complete
5. API Gateway will automatically fall back to old Lambda

---

## Cost Impact

**New Resources**:

- Lambda Function: ~$0.20/month (512 MB, 30s timeout, low usage)
- CloudWatch Logs: ~$0.50/month (7-day retention)
- **Total**: ~$0.70/month additional cost

**Benefits**:

- Isolated onboarding logic (easier debugging)
- Minimal IAM permissions (better security)
- Faster cold starts (smaller deployment package)
- Better monitoring (dedicated CloudWatch logs)
- Independent deployment (no impact on other auth endpoints)

---

## Next Steps After Deployment

1. ✅ **Test onboarding flow** with a new user account
2. ✅ **Verify budget creation** in DynamoDB
3. ✅ **Monitor CloudWatch logs** for any errors
4. ✅ **Update task status** in `.kiro/specs/auth-lambda-refactoring/tasks.md`
5. ✅ **Update documentation** to reflect deployment
6. ✅ **Notify team** of successful deployment

---

## Additional Resources

- **GitHub Actions Workflow**: `.github/workflows/deploy-dev.yml`
- **CDK Stack Definition**: `infrastructure/lib/auth-onboarding-stack.ts`
- **Lambda Function Code**: `backend/functions/auth-onboarding/index.js`
- **Verification Script**: `scripts/verify-onboarding-deployment.ps1`
- **CI/CD Guide**: `docs/cicd-automation-guide.md`

---

**Status**: ⚠️ READY TO DEPLOY
**Priority**: 🔴 HIGH (blocking user onboarding)
**Estimated Time**: 15-20 minutes (automated)
**Risk Level**: 🟢 LOW (CI/CD tested, rollback available)
