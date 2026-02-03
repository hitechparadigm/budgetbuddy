# CloudFormation Export Dependency Blocker

## Status: RESOLVED - Fix Applied

## Latest Fix

**Date**: 2026-02-03
**Fix**: Modified `api-features-stack.ts` to create its own SharedLayer instead of importing from `api-stack`
**Commit**: Pending

## Problem (Historical)

The deployment was failing because of a CloudFormation export dependency issue.

**Error**: "Cannot update export budgetbuddy-dev-api:ExportsOutputRefSharedLayer27DFABF0C2CA2696 as it is in use by budgetbuddy-dev-api-features"

## Root Cause

1. The `api-features` stack was importing the SharedLayer from the `api` stack via props
2. This created a CloudFormation export/import relationship
3. When the SharedLayer was updated, CloudFormation couldn't update the export because it was still being used
4. CDK deploys stacks in alphabetical order, so it tried to deploy `api` before `api-features`

## Solution Applied

Modified `api-features-stack.ts` to create its own SharedLayer internally:

```typescript
// Create own SharedLayer to avoid CloudFormation export dependency issues
const sharedLayer = new lambda.LayerVersion(this, "FeaturesSharedLayer", {
  layerVersionName: "budgetbuddy-features-shared",
  code: lambda.Code.fromAsset("../backend/layers/shared"),
  compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
  description:
    "Shared utilities for BudgetBuddy Features API Lambda functions (independent copy)",
});
```

Updated `bin/app.ts` to remove the `sharedLayer` prop from `ApiFeaturesStack`.

## Files Modified

- `infrastructure/lib/api-features-stack.ts` - Creates own SharedLayer, removed prop
- `infrastructure/bin/app.ts` - Removed sharedLayer prop from ApiFeaturesStack

## Impact

- Both stacks now have independent SharedLayers
- No cross-stack export dependency for SharedLayer
- Deployments can proceed independently
- Slight increase in Lambda layer storage (duplicate layer), but negligible cost impact

## Date Identified

2026-01-31 - Session 40

## Date Resolved

2026-02-03 - Session 112
