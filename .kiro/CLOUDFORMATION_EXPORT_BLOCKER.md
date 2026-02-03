# CloudFormation Export Dependency Blocker

## Status: RESOLVED - Stack Split Applied

## Latest Fix

**Date**: 2026-02-03
**Fix**: Split api-features-stack into two stacks to stay under CloudFormation's 500 resource limit
**Commit**: Pending

## Problem (Current)

The deployment was failing because the `api-features` stack exceeded CloudFormation's 500 resource limit (had 501 resources).

**Error**: "Number of resources in stack 'budgetbuddy-dev-api-features': 501 is greater than allowed maximum of 500"

## Root Cause

The api-features stack grew too large with:

- 174 API Gateway Methods
- 90 API Gateway Resources
- 166 Lambda Permissions
- 14 Lambda Functions
- Plus other resources (IAM roles, policies, S3 buckets, etc.)

## Solution Applied

Split the api-features-stack into two stacks:

1. **api-features-stack** (core features):
   - Plaid, Reconciliation, Admin, Comparison, Tips, Learn, Subscriptions, Debt Payoff
   - ~350 resources

2. **api-features-extended-stack** (AI-powered features):
   - Insights, Receipt, Pattern Detection, Budget Planning
   - ~150 resources

## Files Modified

- `infrastructure/lib/api-features-stack.ts` - Removed AI features
- `infrastructure/lib/api-features-extended-stack.ts` - New stack with AI features
- `infrastructure/bin/app.ts` - Added ApiFeaturesExtendedStack

## Impact

- Both stacks now stay under the 500 resource limit
- AI features have their own API Gateway at a separate URL
- Frontend may need to be updated to use the new extended API URL for AI features

## Previous Issue (Historical)

**Date**: 2026-01-31 - Session 40
**Issue**: CloudFormation export dependency between api and api-features stacks
**Fix**: Modified api-features-stack to create its own SharedLayer instead of importing from api-stack

## Date Identified

2026-02-03 - Session 112

## Date Resolved

2026-02-03 - Session 112 (stack split applied)
