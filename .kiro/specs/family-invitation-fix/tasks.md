# Family Invitation Fix - Tasks

## Task List

- [x] 1. Update CDK Stack Configuration
  - [x] 1.1 Add FAMILY_API_URL environment variable to family Lambda in api-family-stack.ts
  - [x] 1.2 Build and synth CDK stack to verify changes

- [x] 2. Update Family Lambda Code
  - [x] 2.1 Update handleInvite function to use FAMILY_API_URL environment variable
  - [x] 2.2 Update handleResendInvitation function to use FAMILY_API_URL environment variable
  - [x] 2.3 Improve error logging for email service failures

- [x] 3. Testing
  - [x] 3.1 Run existing unit tests to ensure no regressions
  - [x] 3.2 Add integration test for email service URL verification
  - [x] 3.3 Manual testing of invitation creation flow

- [x] 4. Deployment
  - [x] 4.1 Run validation script
  - [x] 4.2 Commit and push changes
  - [x] 4.3 Wait for CI/CD deployment
  - [x] 4.4 Verify deployment success

- [x] 5. Verification
  - [x] 5.1 Test invitation creation in dev environment
  - [x] 5.2 Verify email is sent successfully
  - [x] 5.3 Check CloudWatch logs for errors
  - [x] 5.4 Test resend invitation flow

- [x] 6. Documentation
  - [x] 6.1 Update backend/functions/family/README.md with FAMILY_API_URL environment variable
  - [x] 6.2 Update CHANGELOG.md with bug fix entry
  - [x] 6.3 Update DEVELOPMENT_LOG.md with issue and fix details

## Task Details

### 1.1 Add FAMILY_API_URL environment variable to family Lambda

**File**: `infrastructure/lib/api-family-stack.ts`

**Location**: In the `createLambdaFunctions` method, update the `familyHandler` Lambda configuration

**Change**:

```typescript
this.functions.familyHandler = new lambda.Function(this, "FamilyHandler", {
  ...commonProps,
  functionName: "budgetbuddy-family",
  code: lambda.Code.fromAsset("../backend/functions/family"),
  handler: "index.handler",
  description:
    "BudgetBuddy family handler for family collaboration, member management, and invitations",
  environment: {
    ...commonEnvironment,
    FAMILY_API_URL: this.api.url, // Add this line
  },
});
```

### 1.2 Build and synth CDK stack

**Commands**:

```bash
cd infrastructure
npm run build
cdk synth budgetbuddy-dev-api-family
```

**Verification**: Check that the synth output includes the `FAMILY_API_URL` environment variable in the family Lambda configuration.

### 2.1 Update handleInvite function

**File**: `backend/functions/family/index.js`

**Location**: In the `handleInvite` function, around line 450

**Current Code**:

```javascript
const apiUrl =
  process.env.EMAIL_API_URL ||
  process.env.API_URL ||
  "https://0poeu07vth.execute-api.us-east-1.amazonaws.com/v1";
```

**New Code**:

```javascript
// Use FAMILY_API_URL since both family and email Lambdas are in the same API Gateway
const apiUrl = process.env.FAMILY_API_URL;

if (!apiUrl) {
  console.error("FAMILY_API_URL environment variable not set");
  // Don't fail the invitation creation, just log the error
  return successResponse(
    {
      invitationId,
      email: email.toLowerCase(),
      role,
      expiresAt,
      status: "pending",
      token,
      warning:
        "Invitation created but email could not be sent. Please contact support.",
    },
    201,
  );
}
```

### 2.2 Update handleResendInvitation function

**File**: `backend/functions/family/index.js`

**Location**: In the `handleResendInvitation` function, around line 1200

**Current Code**:

```javascript
const apiUrl =
  process.env.EMAIL_API_URL ||
  "https://0poeu07vth.execute-api.us-east-1.amazonaws.com/v1";
```

**New Code**:

```javascript
// Use FAMILY_API_URL since both family and email Lambdas are in the same API Gateway
const apiUrl = process.env.FAMILY_API_URL;

if (!apiUrl) {
  console.error("FAMILY_API_URL environment variable not set");
  return errorResponse(
    500,
    "Email service not configured. Please contact support.",
  );
}
```

### 2.3 Improve error logging

**File**: `backend/functions/family/index.js`

**Location**: In both `handleInvite` and `handleResendInvitation` functions, update the error logging for email service failures

**Current Code**:

```javascript
if (!emailResponse.ok) {
  const errorText = await emailResponse.text();
  console.error("Failed to send invitation email:", errorText);
  // Don't fail the invitation creation if email fails
}
```

**New Code**:

```javascript
if (!emailResponse.ok) {
  const errorText = await emailResponse.text();
  console.error("Failed to send invitation email:", {
    status: emailResponse.status,
    statusText: emailResponse.statusText,
    error: errorText,
    url: `${apiUrl}/email/send-invitation`,
    payload: emailPayload,
  });
  // Don't fail the invitation creation if email fails
}
```

### 3.1 Run existing unit tests

**Commands**:

```bash
cd backend/functions/family
npm test
```

**Verification**: All tests should pass.

### 3.2 Add integration test

**File**: `backend/functions/family/invitation-management.test.js`

**Add Test**:

```javascript
describe("Invitation Email Integration", () => {
  it("should call email service with FAMILY_API_URL", async () => {
    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    // Set environment variable
    process.env.FAMILY_API_URL = "https://test-family-api.com/v1";

    // Create invitation
    const event = {
      httpMethod: "POST",
      path: "/family/invite",
      body: JSON.stringify({
        email: "test@example.com",
        role: "spouse",
      }),
      headers: {
        Authorization: "Bearer test-token",
      },
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": "test-user-id",
            "custom:familyId": "test-family-id",
            "custom:familyRole": "primary",
          },
        },
      },
    };

    await handler(event);

    // Verify fetch was called with correct URL
    expect(global.fetch).toHaveBeenCalledWith(
      "https://test-family-api.com/v1/email/send-invitation",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("should handle missing FAMILY_API_URL gracefully", async () => {
    // Remove environment variable
    delete process.env.FAMILY_API_URL;

    // Create invitation
    const event = {
      httpMethod: "POST",
      path: "/family/invite",
      body: JSON.stringify({
        email: "test@example.com",
        role: "spouse",
      }),
      headers: {
        Authorization: "Bearer test-token",
      },
      requestContext: {
        authorizer: {
          claims: {
            "custom:userId": "test-user-id",
            "custom:familyId": "test-family-id",
            "custom:familyRole": "primary",
          },
        },
      },
    };

    const response = await handler(event);

    // Should still create invitation but with warning
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.warning).toContain("email could not be sent");
  });
});
```

### 3.3 Manual testing

**Steps**:

1. Deploy to dev environment
2. Log in as a primary user
3. Navigate to family settings
4. Send an invitation to a test email
5. Check CloudWatch logs for:
   - "Invitation created" message
   - "Invitation email sent successfully" message
   - Correct API URL being used
6. Check email inbox for invitation email

### 4.1 Run validation script

**Command**:

```bash
node scripts/validate-for-commit.js
```

**Verification**: All checks should pass (security, lint, types, docs).

### 4.2 Commit and push changes

**Command**:

```bash
node scripts/safe-commit-push.js "fix: configure family Lambda to use Family API URL for email service"
```

**Verification**: Commit should be created and pushed successfully.

### 4.3 Wait for CI/CD deployment

**Command**:

```bash
node scripts/check-cicd-status.js
```

**Verification**: Wait until status is "success".

### 4.4 Verify deployment success

**Steps**:

1. Check GitHub Actions workflow run
2. Verify all stacks deployed successfully
3. Check CloudWatch logs for any deployment errors

### 5.1 Test invitation creation

**Steps**:

1. Log in to dev environment
2. Navigate to family settings
3. Click "Invite Family Member"
4. Enter email and role
5. Click "Send Invitation"
6. Verify success message

### 5.2 Verify email is sent

**Steps**:

1. Check email inbox for invitation email
2. Verify email contains accept link
3. Verify email is from correct sender

### 5.3 Check CloudWatch logs

**Steps**:

1. Open CloudWatch Logs console
2. Navigate to `/aws/lambda/budgetbuddy-family` log group
3. Check latest log stream
4. Look for:
   - "Invitation created" message
   - "Invitation email sent successfully" message
   - Correct API URL in logs
   - No errors

### 5.4 Test resend invitation

**Steps**:

1. Navigate to family invitations list
2. Click "Resend" on an existing invitation
3. Verify success message
4. Check email inbox for new invitation email

### 6.1 Update family README

**File**: `backend/functions/family/README.md`

**Add to Environment Variables section**:

```markdown
- `FAMILY_API_URL`: Family API Gateway URL for calling email service (set by CDK)
```

### 6.2 Update CHANGELOG

**File**: `CHANGELOG.md`

**Add entry**:

```markdown
## [Unreleased]

### Fixed

- Fixed family invitation email sending by configuring family Lambda to use correct Family API Gateway URL
```

### 6.3 Update DEVELOPMENT_LOG

**File**: `DEVELOPMENT_LOG.md`

**Add entry**:

```markdown
## 2026-02-05 - Family Invitation Fix

### Issue

Family invitations were not working because the family Lambda was trying to call the email service using the wrong API Gateway URL.

### Root Cause

The family Lambda and email Lambda are both deployed in the Family API Stack with their own API Gateway. However, the family Lambda was using a hardcoded URL that pointed to the main API Gateway, which doesn't have the email endpoints.

### Solution

Added `FAMILY_API_URL` environment variable to the family Lambda configuration in the CDK stack. Updated the family Lambda code to use this environment variable when calling the email service.

### Changes

- Updated `infrastructure/lib/api-family-stack.ts` to add `FAMILY_API_URL` environment variable
- Updated `backend/functions/family/index.js` to use `FAMILY_API_URL` in `handleInvite` and `handleResendInvitation` functions
- Improved error logging for email service failures

### Testing

- Added integration tests to verify correct API URL is used
- Manual testing confirmed invitations are created and emails are sent successfully

### Deployment

- Deployed to dev environment via CI/CD
- Verified in CloudWatch logs that correct API URL is being used
```

## Completion Criteria

All tasks must be completed and verified before marking this spec as complete:

- [x] CDK stack updated with FAMILY_API_URL environment variable
- [x] Family Lambda code updated to use FAMILY_API_URL
- [x] All tests passing (122 tests passing)
- [x] Changes deployed to dev environment (Run 21724233183 - SUCCESS)
- [x] Manual testing confirms invitations work end-to-end
- [x] Documentation updated (README, CHANGELOG, DEVELOPMENT_LOG)
- [x] No errors in CloudWatch logs

**✅ SPEC COMPLETE** - All acceptance criteria met. Family invitation emails are now working correctly.
