# Family Invitation Fix - Requirements

## Problem Statement

Family invitations are not working. When a user tries to invite a family member, the invitation creation fails because the family Lambda cannot reach the email service.

## Root Cause Analysis

The family Lambda function (`backend/functions/family/index.js`) is trying to call the email service using a hardcoded URL that points to the wrong API Gateway:

```javascript
const apiUrl =
  process.env.EMAIL_API_URL ||
  process.env.API_URL ||
  "https://0poeu07vth.execute-api.us-east-1.amazonaws.com/v1";
```

However, both the family Lambda and email Lambda are deployed in the **same API Family Stack** with their own API Gateway. The family Lambda should be calling the email endpoint on the Family API Gateway, not the main API Gateway.

## Current Architecture

- **Family API Stack** (`budgetbuddy-dev-api-family`):
  - Has its own API Gateway (Family API)
  - Contains FamilyHandler Lambda (`budgetbuddy-family`)
  - Contains EmailHandler Lambda (`budgetbuddy-email-family`)
  - Family routes: `/family/*`
  - Email routes: `/email/*`

- **Main API Stack** (`budgetbuddy-dev-api`):
  - Different API Gateway
  - Different URL
  - Does NOT have email endpoints

## Issues

1. **Missing Environment Variable**: The family Lambda doesn't have the Family API URL configured as an environment variable
2. **Wrong Default URL**: The hardcoded fallback URL points to the main API Gateway, not the Family API Gateway
3. **Cross-API Call**: The family Lambda is trying to call an endpoint that doesn't exist on the main API

## User Stories

### 1. As a primary user, I want to invite a family member so they can collaborate on our budget

**Acceptance Criteria**:

- 1.1. When I submit an invitation with a valid email and role, the invitation is created in DynamoDB
- 1.2. The invitation email is sent successfully via the email service
- 1.3. I receive a success response with the invitation details
- 1.4. The invited user receives an email with an accept link

### 2. As a developer, I want the family Lambda to use the correct API URL for email service calls

**Acceptance Criteria**:

- 2.1. The family Lambda has access to the Family API URL via environment variable
- 2.2. The family Lambda uses the Family API URL when calling the email service
- 2.3. The email service endpoint is reachable from the family Lambda
- 2.4. Email sending succeeds and returns a 200 status code

## Technical Requirements

### 1. Environment Variable Configuration

- Add `FAMILY_API_URL` environment variable to the family Lambda
- Set the value to the Family API Gateway URL (from CDK output)
- Use this URL when calling the email service

### 2. Code Changes

- Update `backend/functions/family/index.js` to use `FAMILY_API_URL` environment variable
- Remove hardcoded fallback URL or update it to use the correct Family API URL
- Add error handling for email service failures

### 3. Testing

- Test invitation creation end-to-end
- Verify email service is called with correct URL
- Verify email is sent successfully
- Test error handling when email service fails

## Out of Scope

- Email template changes
- Invitation expiration logic
- Invitation acceptance flow
- SES configuration

## Success Metrics

- Invitation creation success rate: 100%
- Email sending success rate: > 95%
- End-to-end invitation flow completion time: < 5 seconds

## Dependencies

- Family API Stack must be deployed
- Email Lambda must be functional
- SES must be configured with verified sender email

## Risks

- **Low Risk**: Simple environment variable configuration change
- **Mitigation**: Test thoroughly in dev environment before deploying to production
