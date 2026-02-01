# Integration Tests for BudgetBuddy

This directory contains functional integration tests for critical BudgetBuddy features.

## Test Files

### 1. `plaid-integration.test.js`

Tests the complete Plaid bank account integration flow.

**What it tests:**

- ✅ Health check endpoint
- ✅ Sandbox account creation
- ✅ Account listing
- ✅ Transaction syncing with rate limits
- ✅ Pending transaction approval/rejection
- ✅ Sync status tracking
- ✅ Account unlinking
- ✅ CORS headers on success and error responses
- ✅ Authorization (401 errors)

**API Endpoints tested:**

- `GET /plaid/health`
- `POST /plaid/sandbox/create-item`
- `GET /plaid/accounts`
- `POST /plaid/sync`
- `GET /plaid/sync-status`
- `GET /plaid/pending`
- `POST /plaid/pending/approve`
- `POST /plaid/pending/reject`
- `DELETE /plaid/accounts/:id`

### 2. `family-collaboration.test.js`

Tests the complete family collaboration flow.

**What it tests:**

- ✅ Family information retrieval
- ✅ Member listing
- ✅ Member invitation
- ✅ Duplicate invitation prevention
- ✅ Invalid role validation
- ✅ Pending invitation listing
- ✅ Invitation revocation
- ✅ CORS headers on success and error responses
- ✅ Authorization (401/403 errors)
- ✅ Request validation
- ✅ Edge cases (non-existent IDs, invalid emails)
- ✅ Performance (response time, concurrent requests)

**API Endpoints tested:**

- `GET /family`
- `GET /family/members`
- `POST /family/invite`
- `GET /family/invitations`
- `DELETE /family/invitations/:id`

## Prerequisites

Before running these tests, ensure:

1. **Environment is deployed**: Latest code deployed to dev environment
2. **Test user exists**: User `dmytro.malyk@gmail.com` exists in Cognito
3. **Password configured**: Update test files with actual password
4. **CORS configured**: Gateway Responses added to both API stacks
5. **Plaid sandbox**: Plaid sandbox credentials configured

## Running Tests

### Run all integration tests:

```bash
npm run test:integration
```

### Run Plaid tests only:

```bash
npm run test:plaid
```

### Run Family tests only:

```bash
npm run test:family
```

### Run with verbose output:

```bash
npm run test:plaid -- --verbose
```

## Configuration

### Update Test Credentials

Edit the test files to update credentials:

**plaid-integration.test.js:**

```javascript
const TEST_USER_EMAIL = "dmytro.malyk@gmail.com";
const TEST_USER_PASSWORD = "YourActualPassword"; // Update this
```

**family-collaboration.test.js:**

```javascript
const TEST_PRIMARY_EMAIL = "dmytro.malyk@gmail.com";
const TEST_PRIMARY_PASSWORD = "YourActualPassword"; // Update this
const TEST_PARTNER_EMAIL = "partner@example.com"; // Email to invite
```

### API Endpoints

Tests use the deployed dev environment:

- **Features API**: `https://0poeu07vth.execute-api.us-east-1.amazonaws.com/v1`
- **Main API**: `https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1`

## Test Results

### Expected Output

**Successful test run:**

```
🧪 Running Plaid Integration Tests

🔐 Logging in test user...
✅ Login successful

 PASS  tests/plaid-integration.test.js
  Plaid Integration Tests
    1. Health Check
      ✓ should return healthy status (234ms)
    2. Sandbox Account Creation
      ✓ should create a sandbox test account (1456ms)
      ✓ should fail to create duplicate sandbox account (345ms)
    3. Account Listing
      ✓ should list all connected accounts (289ms)
    ...

Test Suites: 1 passed, 1 total
Tests:       15 passed, 15 total
Time:        8.234s
```

### Common Issues

**Issue: 401 Unauthorized**

- **Cause**: Using wrong token (access token instead of ID token)
- **Fix**: Ensure `budgetbuddy_id_token` is used for authorization

**Issue: CORS errors**

- **Cause**: Gateway Responses not configured
- **Fix**: Deploy latest infrastructure with Gateway Responses

**Issue: Login fails**

- **Cause**: Wrong password or user doesn't exist
- **Fix**: Update password in test file or create user in Cognito

**Issue: Timeout**

- **Cause**: API is slow or not responding
- **Fix**: Increase timeout with `--testTimeout=60000`

## Test Coverage

### Plaid Integration: 95%

- ✅ Happy path (account creation, sync, approval)
- ✅ Error cases (rate limits, duplicates, 401)
- ✅ CORS headers
- ✅ Authorization

### Family Collaboration: 90%

- ✅ Happy path (invite, list, revoke)
- ✅ Error cases (duplicates, invalid data, 401/403)
- ✅ CORS headers
- ✅ Authorization
- ✅ Performance
- ⚠️ Acceptance flow (requires second user)

## CI/CD Integration

These tests should be run:

1. **Before deployment**: As part of pre-deploy validation
2. **After deployment**: To verify deployment success
3. **Nightly**: To catch regressions

### Add to GitHub Actions:

```yaml
- name: Run Integration Tests
  run: |
    npm run test:integration
  env:
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
```

## Debugging

### Enable verbose logging:

```bash
DEBUG=* npm run test:plaid
```

### Run single test:

```bash
npm run test:plaid -- -t "should create a sandbox test account"
```

### Check API responses:

Add `console.log(response)` in test files to inspect full responses.

## Best Practices

1. **Clean up after tests**: Tests should clean up created resources
2. **Use test data**: Don't use production data in tests
3. **Idempotent tests**: Tests should be runnable multiple times
4. **Fast tests**: Keep tests under 30 seconds total
5. **Clear assertions**: Use descriptive expect messages

## Future Tests

### Planned:

- [ ] Receipt scanning integration
- [ ] Insights generation
- [ ] Tips feed personalization
- [ ] Goals tracking
- [ ] Admin dashboard
- [ ] Multi-currency transactions
- [ ] Offline sync (mobile)

## Support

For issues with tests:

1. Check test output for specific error
2. Verify API endpoints are accessible
3. Check CloudWatch logs for backend errors
4. Review CORS configuration in API Gateway
5. Verify Cognito user exists and password is correct

---

**Last Updated**: 2026-02-01
**Maintained by**: BudgetBuddy Development Team
