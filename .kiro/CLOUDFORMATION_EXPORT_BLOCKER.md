# CloudFormation Export Dependency Blocker

## Status: BLOCKED - Requires Manual Intervention

## Problem

The deployment is failing because of a CloudFormation export dependency issue that cannot be resolved through code changes alone.

**Error**: "Cannot delete export budgetbuddy-dev-auth:ExportsOutputRefAuthSharedLayer5BE359A433E00034 as it is in use by budgetbuddy-dev-auth-onboarding"

## Root Cause

1. The auth-onboarding stack was previously deployed with a configuration that imports the AuthSharedLayer from the auth stack
2. This created a CloudFormation export/import relationship
3. We updated the code so auth-onboarding creates its own layer (no import)
4. However, the EXISTING CloudFormation stack still has the import
5. CloudFormation won't let us update the auth stack (to remove the export) while auth-onboarding still imports it
6. CDK deploys stacks in alphabetical order, so it tries to deploy auth before auth-onboarding

## Solution Options

### Option 1: Deploy Stacks Individually (RECOMMENDED)

```bash
# Deploy auth-onboarding first to remove the import
npx cdk deploy budgetbuddy-dev-auth-onboarding --require-approval never

# Then deploy auth to remove the export
npx cdk deploy budgetbuddy-dev-auth --require-approval never

# Then deploy the rest
npx cdk deploy --all --require-approval never
```

### Option 2: Manually Delete and Recreate Stacks

```bash
# Delete auth-onboarding stack
aws cloudformation delete-stack --stack-name budgetbuddy-dev-auth-onboarding

# Wait for deletion to complete
aws cloudformation wait stack-delete-complete --stack-name budgetbuddy-dev-auth-onboarding

# Then deploy all stacks
npx cdk deploy --all --require-approval never
```

### Option 3: Update CI/CD Pipeline

Modify `.github/workflows/deploy-dev.yml` to deploy stacks in the correct order:

```yaml
- name: Deploy infrastructure stacks
  run: |
    echo "Deploying auth-onboarding first..."
    npx cdk deploy budgetbuddy-dev-auth-onboarding --require-approval never

    echo "Deploying remaining stacks..."
    npx cdk deploy --all --require-approval never
```

## Impact

- **Blocked Tasks**: Phase 4 (Email Service Integration) and all subsequent infrastructure changes
- **Workaround**: Can continue with non-infrastructure tasks (documentation, planning, etc.)
- **Resolution Time**: Requires manual AWS CLI commands or CI/CD pipeline update

## Files Modified (Already Committed)

- `infrastructure/lib/auth-stack.ts` - Removed export from layer output
- `infrastructure/lib/auth-onboarding-stack.ts` - Creates own layer, removed prop
- `infrastructure/bin/app.ts` - Removed authSharedLayer prop, removed dependency

## Next Steps

1. User needs to manually deploy stacks in correct order (Option 1)
2. OR update CI/CD pipeline to deploy in correct order (Option 3)
3. Once resolved, continue with Phase 4 tasks

## Date Identified

2026-01-31 - Session 40
