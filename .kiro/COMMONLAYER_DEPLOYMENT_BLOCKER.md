# CommonLayer Deployment Blocker - Active Issue

## Status: DEPLOYMENT BLOCKER (Manual AWS Intervention Required)

**Date**: 2026-02-04
**Attempts**: 3 deployment attempts
**Issue**: CloudFormation export circular dependency

## Problem

CloudFormation cannot delete the CommonLayer export from `budgetbuddy-dev-api` stack because dependent stacks (`budgetbuddy-dev-api-features`, `budgetbuddy-dev-api-features-extended`, `budgetbuddy-dev-notification`) are still using the old export.

**Error**: "Cannot delete export budgetbuddy-dev-api:ExportsOutputRefCommonLayer306767A07F5FDEDF as it is in use by [dependent stacks]"

## Root Cause

Chicken-and-egg problem:

1. We updated dependent stacks to create their own CommonLayer (no longer import from api stack)
2. But the dependent stacks in AWS still reference the OLD export
3. We need to deploy dependent stacks first to update them
4. But CloudFormation won't let us delete the export from api stack until dependent stacks are updated
5. Circular dependency

## Solution Attempts

### Attempt 1: Update deployment order

- Modified `.github/workflows/deploy-dev.yml` to deploy dependent stacks first
- **Result**: FAILED - Still tries to update api stack which triggers export conflict

### Attempt 2: Remove cross-stack references

- Each stack now creates its own CommonLayer from source
- Removed `commonLayer` prop from all stack instantiations
- **Result**: FAILED - CloudFormation tries to DELETE export, but dependent stacks still use it

### Attempt 3: Remove stack dependencies

- Removed `apiStack` dependency from dependent stacks in CDK app
- **Result**: IN PROGRESS - Likely will fail for same reason

## Manual Resolution Required

The ONLY way to resolve this is:

1. **Manually deploy dependent stacks ONLY** (skip api stack):

   ```bash
   cd infrastructure
   npx cdk deploy budgetbuddy-dev-api-features --exclusively --require-approval never
   npx cdk deploy budgetbuddy-dev-api-features-extended --exclusively --require-approval never
   npx cdk deploy budgetbuddy-dev-notification --exclusively --require-approval never
   ```

2. **Then deploy api stack**:
   ```bash
   npx cdk deploy budgetbuddy-dev-api --require-approval never
   ```

## Why This Happened

We made the SAME mistake as with SharedLayer (commits f21b2a9, dfbc103). The difference is:

- SharedLayer: We caught it early and fixed before deployment
- CommonLayer: Code changes were already deployed, creating the export dependency in AWS

## Prevention

**Updated steering** (`.kiro/steering/structure.md`) with:

- NEVER export/import Lambda Layers across stacks
- Each stack creates its own layer from source
- Reference previous incidents (SharedLayer, AuthSharedLayer, CommonLayer)

## Impact

- **Blocked**: Cannot deploy any infrastructure changes via CI/CD
- **Workaround**: Manual deployment required (see above)
- **Code**: All code changes are correct and ready
- **Tests**: All tests pass locally

## Next Steps

1. User must manually deploy stacks in correct order (see Manual Resolution above)
2. Once resolved, CI/CD will work normally
3. Document this incident in DEVELOPMENT_LOG.md
4. Add to lessons learned in steering files

## Related Files

- `.kiro/steering/structure.md` - Updated with prevention guidelines
- `.kiro/SHARED_LAYER_EXPORT_ISSUE.md` - Previous similar issue
- `infrastructure/lib/api-features-stack.ts` - Creates own CommonLayer
- `infrastructure/lib/api-features-extended-stack.ts` - Creates own CommonLayer
- `infrastructure/lib/notification-stack.ts` - Creates own CommonLayer
- `infrastructure/bin/app.ts` - Removed cross-stack dependencies
