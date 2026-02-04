# CommonLayer Export Conflict - Known Issue

## Issue Description

CloudFormation deployment fails with the error:

```
Cannot update export budgetbuddy-dev-api:ExportsOutputRefCommonLayer306767A07F5FDEDF
as it is in use by budgetbuddy-dev-api-features, budgetbuddy-dev-api-features-extended
and budgetbuddy-dev-notification.
```

## Root Cause

When the CommonLayer code changes in `backend/layers/common`, CDK creates a new Lambda layer version. This layer is exported from the `budgetbuddy-dev-api` stack and imported by three dependent stacks:

- `budgetbuddy-dev-api-features`
- `budgetbuddy-dev-api-features-extended`
- `budgetbuddy-dev-notification`

CloudFormation cannot update the export because the dependent stacks are still using the old layer version. This is a CloudFormation limitation - you cannot update an export that is currently in use.

## Workaround

### Option 1: Manual Stack Update (Recommended)

1. Deploy the dependent stacks first to update them to use the new layer:

   ```bash
   cd infrastructure
   npx cdk deploy budgetbuddy-dev-api-features --require-approval never
   npx cdk deploy budgetbuddy-dev-api-features-extended --require-approval never
   npx cdk deploy budgetbuddy-dev-notification --require-approval never
   ```

2. Then deploy the API stack:
   ```bash
   npx cdk deploy budgetbuddy-dev-api --require-approval never
   ```

### Option 2: Skip CommonLayer Changes

If the CommonLayer changes are not critical, revert them temporarily:

```bash
git checkout HEAD~1 backend/layers/common
git commit -m "temp: revert CommonLayer changes to avoid export conflict"
git push
```

Then deploy, and re-apply the changes later.

### Option 3: Remove Cross-Stack References (Long-term Solution)

Modify the CDK stacks to NOT use cross-stack references for the CommonLayer. Instead:

1. Each stack creates its own CommonLayer from the same source
2. Or use layer ARN imports instead of direct references

This requires CDK infrastructure changes.

## Prevention

To avoid this issue in the future:

1. Avoid making changes to `backend/layers/common` unless necessary
2. When changes are needed, coordinate deployment order manually
3. Consider implementing Option 3 (remove cross-stack references)

## Status

This is a known AWS CloudFormation limitation. The deployment workflow has been updated to deploy dependent stacks first, but this may not always work if the layer code has changed.

## Related Files

- `.github/workflows/deploy-dev.yml` - Deployment workflow
- `infrastructure/lib/api-stack.ts` - API stack with CommonLayer
- `infrastructure/lib/api-features-stack.ts` - Dependent stack
- `infrastructure/lib/api-features-extended-stack.ts` - Dependent stack
- `infrastructure/lib/notification-stack.ts` - Dependent stack
