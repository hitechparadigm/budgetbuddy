# LocalStack Development Guide

## Overview

LocalStack allows you to test AWS services locally without deploying to the cloud. This speeds up development and reduces costs.

## Prerequisites

- Docker Desktop installed and running
- LocalStack extension installed in Kiro (already running)

## Quick Start

### 1. Start LocalStack (if not already running)

If using Docker Compose:

```bash
docker-compose -f docker-compose.localstack.yml up -d
```

Or if using the Kiro extension, it should already be running on `http://localhost:4566`.

### 2. Initialize DynamoDB Tables

```bash
node scripts/localstack-setup.js
```

This creates:

- `budgetbuddy-main` table with all GSIs
- Test user profile
- Test family metadata
- Test family member record

### 3. Test Lambda Functions Locally

**Test Accounts Lambda:**

```bash
# Create an account
node scripts/test-lambda-local.js accounts create

# List accounts
node scripts/test-lambda-local.js accounts list
```

**Test Family Lambda:**

```bash
# Send invitation
node scripts/test-lambda-local.js family invite

# Get family members
node scripts/test-lambda-local.js family members
```

## Benefits

### 1. Faster Development

- No waiting for CDK deployments (5-10 minutes → seconds)
- Instant feedback on code changes
- Quick iteration cycles

### 2. Cost Savings

- No AWS charges for testing
- Unlimited local testing
- No DynamoDB read/write costs

### 3. Better Debugging

- Full stack traces in console
- Step through code with debugger
- Detailed error messages

### 4. Offline Development

- Work without internet
- No AWS credentials needed
- Consistent test environment

## Testing the Recent Fix

The `generateId.custom` fix can be tested locally:

```bash
# 1. Setup LocalStack
node scripts/localstack-setup.js

# 2. Test account creation (this was failing with 500 error)
node scripts/test-lambda-local.js accounts create

# Expected output:
# ✅ Response: {
#   "success": true,
#   "data": {
#     "accountId": "acc_...",
#     "accountType": "loan",
#     "accountSubtype": "mortgage",
#     ...
#   }
# }
```

## Debugging Family Invite 500 Error

To debug the family invite issue locally:

```bash
# 1. Test with full logging
node scripts/test-lambda-local.js family invite

# 2. Check the response
# If it returns 500, you'll see the full error stack trace
# If it succeeds, the issue is with API Gateway/Cognito authorizer
```

## Environment Variables

LocalStack uses these environment variables:

```bash
AWS_ENDPOINT_URL=http://localhost:4566
TABLE_NAME=budgetbuddy-main
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

These are automatically set by the test scripts.

## Test Data

Default test user:

- **User ID**: `user_test_123`
- **Email**: `test@example.com`
- **Family ID**: `family_user_test_123`
- **Role**: `primary`

## Troubleshooting

### LocalStack not responding

```bash
# Check if LocalStack is running
curl http://localhost:4566/_localstack/health

# Restart LocalStack
docker-compose -f docker-compose.localstack.yml restart
```

### Table already exists error

```bash
# Delete and recreate tables
aws dynamodb delete-table --table-name budgetbuddy-main --endpoint-url http://localhost:4566
node scripts/localstack-setup.js
```

### Lambda function errors

- Check that `TABLE_NAME` environment variable is set
- Verify LocalStack is running on port 4566
- Check CloudWatch logs in LocalStack

## Integration with CI/CD

LocalStack can be used in CI/CD pipelines:

```yaml
# .github/workflows/test.yml
- name: Start LocalStack
  run: docker-compose -f docker-compose.localstack.yml up -d

- name: Setup LocalStack
  run: node scripts/localstack-setup.js

- name: Run integration tests
  run: npm run test:integration
```

## Next Steps

1. **Add more test scenarios** to `test-lambda-local.js`
2. **Create integration tests** that use LocalStack
3. **Add LocalStack to CI/CD** for automated testing
4. **Test other Lambda functions** (budget, transactions, etc.)

## Resources

- [LocalStack Documentation](https://docs.localstack.cloud/)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/)
- [DynamoDB Local Testing](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)
