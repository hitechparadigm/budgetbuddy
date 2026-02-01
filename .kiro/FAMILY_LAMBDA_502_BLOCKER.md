# Family Lambda 502 Error - RESOLVED

## Status: RESOLVED ✅

**Date Resolved**: 2026-01-31
**Root Cause**: AWS SDK version mismatch

## Problem

Family Lambda health endpoint consistently returned 502 Bad Gateway error during deployment health checks.

## Root Cause

The Family Lambda was using AWS SDK v2 (`aws-sdk`), which is NOT included in the Lambda runtime by default for Node.js 18+. The common Lambda layer only includes AWS SDK v3 (`@aws-sdk/*`).

```javascript
// OLD (broken) - AWS SDK v2
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

// NEW (fixed) - AWS SDK v3
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, ... } = require("@aws-sdk/lib-dynamodb");
```

## Solution

Updated `backend/functions/family/index.js` to use AWS SDK v3:

1. Changed imports from `aws-sdk` to `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb`
2. Updated all DynamoDB operations to use the new command pattern (`send(new GetCommand(...))`)
3. Updated `package.json` to list v3 dependencies
4. Updated test file to mock AWS SDK v3 instead of v2

## Files Changed

- `backend/functions/family/index.js` - Migrated to AWS SDK v3
- `backend/functions/family/package.json` - Updated dependencies
- `backend/functions/family/index.test.js` - Updated mocks for SDK v3

## Verification

All 18 unit tests pass after the migration.

## Lessons Learned

1. Always use AWS SDK v3 for Node.js 18+ Lambda functions
2. Check that Lambda dependencies match what's available in Lambda layers
3. Compare new Lambda configurations with working ones (auth, budget, transactions all use SDK v3)
