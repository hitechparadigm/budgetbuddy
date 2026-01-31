# Shared Layer Export Dependency Issue

## Status: DEPLOYMENT BLOCKER

**Date**: 2026-01-31
**Commit**: ed72257 (Permission middleware)
**CI/CD Run**: 21551975611

## Problem

CDK deployment fails when updating AuthSharedLayer because it's exported and used by other stacks:

```
Cannot update export budgetbuddy-dev-auth:ExportsOutputRefAuthSharedLayer5BE359A433E00034
as it is in use by budgetbuddy-dev-auth-onboarding.
```

## Root Cause

**Export Dependency Chain**:

1. `budgetbuddy-dev-auth` stack exports `AuthSharedLayer`
2. `budgetbuddy-dev-auth-onboarding` stack imports this export
3. When we update the layer (add permissions module), CDK tries to create a new layer version
4. CloudFormation cannot update the export because it's in use

**Why This Happened**:

- Added `permissions.js` and `permissions.test.js` to shared layer
- Updated `index.js` to export permission functions
- This changed the layer content, triggering a new layer version
- CDK tries to update the export, but dependent stack blocks it

## CDK Export Dependency Rules

1. **Cannot update exports in use**: CloudFormation prevents updating exports that other stacks depend on
2. **Must deploy dependents first**: Need to update all dependent stacks to remove the import
3. **Or deploy together**: Deploy all stacks in dependency order in single operation

## Solution Options

### Option 1: Deploy All Stacks Together (RECOMMENDED)

Deploy all stacks that use the shared layer in a single CDK deploy:

```bash
npx cdk deploy budgetbuddy-dev-auth budgetbuddy-dev-auth-onboarding --all
```

This ensures CloudFormation updates dependencies in correct order.

### Option 2: Remove Export, Use Direct Reference

Instead of exporting the layer, pass it directly between stacks:

```typescript
// In auth-stack.ts
this.authSharedLayer = new lambda.LayerVersion(...);

// In auth-onboarding-stack.ts (constructor)
constructor(scope, id, props: { authSharedLayer: lambda.ILayerVersion }) {
  // Use props.authSharedLayer directly
}
```

### Option 3: Separate Layer Stack

Create dedicated stack for shared layers:

```typescript
// shared-layers-stack.ts
export class SharedLayersStack extends Stack {
  public readonly authSharedLayer: lambda.LayerVersion;

  constructor(scope, id, props) {
    super(scope, id, props);
    this.authSharedLayer = new lambda.LayerVersion(...);
  }
}
```

Then all other stacks depend on this stack.

## Immediate Workaround

For now, we can:

1. **Continue with other tasks** that don't require deployment
2. **Test locally** using unit tests (already passing)
3. **Fix deployment** in a separate commit that deploys all stacks together

## Files Affected

- `backend/layers/shared/nodejs/shared/permissions.js` (new)
- `backend/layers/shared/nodejs/shared/permissions.test.js` (new)
- `backend/layers/shared/nodejs/shared/index.js` (updated exports)
- `infrastructure/lib/auth-stack.ts` (exports layer)
- `infrastructure/lib/auth-onboarding-stack.ts` (imports layer)

## Impact

- **Blocked**: Cannot deploy permission middleware to dev environment
- **Not Blocked**: Can continue implementing Tasks 3.2, 3.3, 3.4 locally
- **Tests**: All unit tests pass (34 tests for permissions)
- **Code**: Permission system is complete and tested

## Next Steps

1. Continue with Tasks 3.2 and 3.3 (add permission checks to budget/transaction Lambdas)
2. Test everything locally
3. Create fix commit that:
   - Updates CDK deployment to handle layer updates
   - Or refactors to remove export dependency
   - Deploys all affected stacks together

## Related Issues

- Family Lambda 502 error (separate issue, documented in `.kiro/FAMILY_LAMBDA_502_BLOCKER.md`)
- Both are deployment issues, not code issues

## Resolution Required

Manual CDK deployment strategy update or infrastructure refactoring to handle layer updates gracefully.
