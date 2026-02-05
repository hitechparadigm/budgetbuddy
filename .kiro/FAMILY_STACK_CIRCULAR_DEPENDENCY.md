# Family Stack Circular Dependency Issue

## Problem

Deployment of `budgetbuddy-dev-api-features` stack fails with circular dependency error involving FamilyHandler and API Gateway deployment stage.

## Root Cause

1. **CloudFormation Resource Limit**: api-features-stack has 488 resources (approaching 500 limit)
2. **Circular Dependency**: API Gateway deployment stage depends on all API method permissions, which depend on Lambda functions, creating a circular reference
3. **Too Many Routes**: Having 11 family routes + 10 other feature groups (Plaid, Reconciliation, Admin, Comparison, Tips, Learn, Subscriptions, Debt Payoff, Credit Score, Email) in one API Gateway creates complexity

## Error Details

```
ValidationError: Circular dependency between resources: [
  FeaturesApiDeploymentStagev157A2DBA9,
  FamilyHandlerB720DBEF,
  FamilyHandlerLogRetentionB180384A,
  ... (100+ family-related API permissions)
]
```

## Attempted Solution

Moved FamilyHandler from `api-stack.ts` (427 resources) to `api-features-stack.ts` (488 resources). This successfully removed it from api-stack but created circular dependency in api-features-stack.

## Recommended Solution

Create a **fourth stack** specifically for family functionality:

### Option 1: Standalone Family Stack (RECOMMENDED)

Create `infrastructure/lib/api-family-stack.ts`:

- Own API Gateway
- FamilyHandler Lambda
- EmailHandler Lambda (for invitations)
- 11 family routes
- ~150 resources (well under 500 limit)

**Benefits**:

- Isolates family functionality
- Reduces api-features-stack to ~340 resources
- No circular dependencies
- Clear separation of concerns

### Option 2: Move Multiple Features to Extended Stack

Move FamilyHandler + 2-3 other handlers to `api-features-extended-stack.ts`:

- Family (11 routes)
- Credit Score (4 routes)
- Email (3 routes)

**Benefits**:

- Reuses existing third stack
- Balances resource distribution

**Drawbacks**:

- Less clear separation
- May still approach limits

## Implementation Steps (Option 1)

1. Create `infrastructure/lib/api-family-stack.ts`
2. Move FamilyHandler and EmailHandler from api-features-stack
3. Create separate API Gateway for family routes
4. Update `infrastructure/bin/budgetbuddy.ts` to instantiate new stack
5. Update deployment order in `.github/workflows/deploy-dev.yml`
6. Deploy in order: base → api-features → api-family → api

## Status

- **Date**: 2026-02-05
- **Deployment**: ✅ RESOLVED - Successfully deployed standalone family stack
- **Stack**: budgetbuddy-dev-api-family
- **Resources**: ~150 (well under 500 limit)
- **Deployment Status**: SUCCESS (Run ID: 21715218313)
- **Action**: Deployed standalone family stack with own API Gateway

## Resolution Summary

Successfully resolved the circular dependency issue by creating a standalone API Family Stack. The deployment completed successfully after updating the health check script to use the correct Family API URL.

**Deployment Timeline**:

1. **First Attempt** (Run 21714633217): Failed - health check tested family endpoint on wrong API
2. **Second Attempt** (Run 21715218313): ✅ SUCCESS - health check updated to use Family API URL

## Implementation Details

Created `infrastructure/lib/api-family-stack.ts`:

- Own API Gateway for family routes
- FamilyHandler Lambda (budgetbuddy-family)
- EmailHandler Lambda (budgetbuddy-email-family)
- 11 family routes (GET/POST family, invite, accept, members, etc.)
- 3 email routes (send-invitation, send-removal, send-acceptance)
- Independent CommonLayer and SharedLayer (no cross-stack dependencies)

Updated `infrastructure/bin/app.ts`:

- Added ApiFamilyStack instantiation
- Added stack dependencies (database, auth)
- Added to monitoring stack dependencies

Updated `.github/workflows/deploy-dev.yml`:

- Added api-family to Step 2 deployment
- Added api-family to health check stacks

Removed from `infrastructure/lib/api-features-stack.ts`:

- Removed setupFamilyRoutes method
- Updated comments to reflect family moved to ApiFamilyStack

## Benefits Achieved

1. **Resolved Circular Dependency**: Family features now in isolated stack
2. **Reduced api-features-stack**: From 488 to ~340 resources (30% reduction)
3. **Clear Separation**: Family features have dedicated API Gateway
4. **No Cross-Stack Dependencies**: Each stack creates own layers
5. **Scalable Architecture**: Can add more features without hitting limits

## Related Files

- `infrastructure/lib/api-stack.ts` (FamilyHandler removed ✅)
- `infrastructure/lib/api-features-stack.ts` (FamilyHandler added, circular dependency ❌)
- `.kiro/cicd-status/latest.json` (deployment error logs)
