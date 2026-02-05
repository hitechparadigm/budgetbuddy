# Family Invitation Fix - Design

## Overview

Fix the family invitation flow by configuring the family Lambda to use the correct Family API Gateway URL when calling the email service.

## Architecture

### Current State (Broken)

```
User → Family API Gateway → Family Lambda
                              ↓ (tries to call)
                              ❌ Main API Gateway /email/send-invitation (doesn't exist)
```

### Target State (Fixed)

```
User → Family API Gateway → Family Lambda
                              ↓ (calls)
                              ✅ Family API Gateway /email/send-invitation → Email Lambda → SES
```

## Solution Design

### 1. CDK Stack Changes

**File**: `infrastructure/lib/api-family-stack.ts`

Add the Family API URL as an environment variable to the family Lambda:

```typescript
// In createLambdaFunctions method
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

### 2. Lambda Code Changes

**File**: `backend/functions/family/index.js`

Update the `handleInvite` function to use the `FAMILY_API_URL` environment variable:

**Current Code** (lines ~450-460):

```javascript
const apiUrl =
  process.env.EMAIL_API_URL ||
  process.env.API_URL ||
  "https://0poeu07vth.execute-api.us-east-1.amazonaws.com/v1";

const emailResponse = await fetch(`${apiUrl}/email/send-invitation`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(authHeader ? { Authorization: authHeader } : {}),
  },
  body: JSON.stringify(emailPayload),
});
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

const emailResponse = await fetch(`${apiUrl}/email/send-invitation`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(authHeader ? { Authorization: authHeader } : {}),
  },
  body: JSON.stringify(emailPayload),
});
```

**Same changes needed in**:

- `handleResendInvitation` function (lines ~1200-1230)

### 3. Error Handling

Improve error handling for email service failures:

```javascript
try {
  const emailResponse = await fetch(`${apiUrl}/email/send-invitation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify(emailPayload),
  });

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    console.error("Failed to send invitation email:", {
      status: emailResponse.status,
      statusText: emailResponse.statusText,
      error: errorText,
      url: `${apiUrl}/email/send-invitation`,
    });
    // Don't fail the invitation creation if email fails
  } else {
    console.log("Invitation email sent successfully");
  }
} catch (emailError) {
  console.error("Error sending invitation email:", {
    error: emailError.message,
    stack: emailError.stack,
    url: `${apiUrl}/email/send-invitation`,
  });
  // Don't fail the invitation creation if email fails
}
```

## Data Flow

### Invitation Creation Flow

1. **User Request**: POST `/family/invite` with `{ email, role }`
2. **Family Lambda**:
   - Validates user is primary
   - Validates email and role
   - Checks family not full
   - Checks no pending invitation exists
   - Generates secure token
   - Creates invitation record in DynamoDB
   - Calls email service at `${FAMILY_API_URL}/email/send-invitation`
3. **Email Lambda**:
   - Validates request payload
   - Generates email from template
   - Sends email via SES
   - Returns success response
4. **Family Lambda**:
   - Returns invitation details to user

## Testing Strategy

### Unit Tests

No new unit tests needed - existing tests cover the invitation logic.

### Integration Tests

**File**: `backend/functions/family/invitation-management.test.js`

Add test case to verify email service is called with correct URL:

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
});
```

### Manual Testing

1. Deploy the updated stack to dev environment
2. Log in as a primary user
3. Navigate to family settings
4. Send an invitation to a test email
5. Verify:
   - Invitation is created in DynamoDB
   - Email is sent successfully
   - CloudWatch logs show correct API URL being used
   - No errors in Lambda logs

## Deployment Plan

### Step 1: Update CDK Stack

1. Update `infrastructure/lib/api-family-stack.ts`
2. Add `FAMILY_API_URL` environment variable to family Lambda
3. Run `npm run build` in infrastructure directory
4. Run `cdk synth` to verify changes

### Step 2: Update Lambda Code

1. Update `backend/functions/family/index.js`
2. Update `handleInvite` function to use `FAMILY_API_URL`
3. Update `handleResendInvitation` function to use `FAMILY_API_URL`
4. Improve error logging

### Step 3: Deploy

1. Run validation: `node scripts/validate-for-commit.js`
2. Commit changes: `node scripts/safe-commit-push.js "fix: configure family Lambda to use Family API URL for email service"`
3. Wait for CI/CD deployment to complete
4. Verify deployment success

### Step 4: Test

1. Test invitation creation in dev environment
2. Verify email is sent
3. Check CloudWatch logs for any errors
4. Test resend invitation flow

## Rollback Plan

If the fix doesn't work:

1. Revert the CDK stack changes
2. Revert the Lambda code changes
3. Redeploy the previous version
4. Investigate the issue further

## Monitoring

### CloudWatch Metrics

- Monitor `FamilyHandler` invocation count
- Monitor `FamilyHandler` error rate
- Monitor `EmailHandler` invocation count
- Monitor `EmailHandler` error rate

### CloudWatch Logs

- Check family Lambda logs for email service call errors
- Check email Lambda logs for SES errors
- Look for "Failed to send invitation email" messages

### Alarms

No new alarms needed - existing alarms will catch errors.

## Security Considerations

- No security changes needed
- Email service is already protected by Cognito authorizer
- Authorization header is passed through from family Lambda to email Lambda

## Performance Considerations

- No performance impact expected
- Email service call is already asynchronous
- Invitation creation doesn't wait for email to be sent

## Cost Considerations

- No cost impact
- Same number of Lambda invocations
- Same number of API Gateway requests

## Documentation Updates

### Files to Update

1. `backend/functions/family/README.md`:
   - Add `FAMILY_API_URL` to environment variables section
   - Update architecture diagram

2. `CHANGELOG.md`:
   - Add entry for bug fix

3. `DEVELOPMENT_LOG.md`:
   - Document the issue and fix

## Correctness Properties

### Property 1: Email Service URL Correctness

**Validates**: Requirements 2.1, 2.2

**Property**: When the family Lambda calls the email service, it MUST use the Family API Gateway URL, not the main API Gateway URL.

**Test Strategy**: Mock the `fetch` function and verify it's called with the correct URL prefix.

### Property 2: Invitation Creation Resilience

**Validates**: Requirements 1.1, 1.3

**Property**: Invitation creation MUST succeed even if the email service fails. The invitation record MUST be created in DynamoDB regardless of email sending status.

**Test Strategy**: Mock the email service to fail and verify the invitation is still created.

### Property 3: Environment Variable Presence

**Validates**: Requirements 2.1

**Property**: The `FAMILY_API_URL` environment variable MUST be set in the family Lambda configuration.

**Test Strategy**: Check the Lambda configuration in AWS Console or via CDK output.

## Summary

This is a simple configuration fix that adds the Family API URL as an environment variable to the family Lambda. The Lambda code is updated to use this URL when calling the email service. This ensures that the family Lambda calls the correct API Gateway endpoint for sending invitation emails.

The fix is low-risk and can be deployed quickly. The main benefit is that family invitations will work correctly, allowing users to invite family members to collaborate on their budget.
