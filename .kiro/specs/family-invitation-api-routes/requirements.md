# Family Invitation API Routes - Requirements

## Overview

The family Lambda function has handlers for invitation management (get invitations, resend, revoke), but the API Gateway routes are missing. This causes users to be unable to manage pending invitations through the UI, leading to the error "Pending invitation already exists for this email" with no way to resolve it.

## Problem Statement

**Current State:**

- Family Lambda has `handleGetInvitations`, `handleResendInvitation`, and `handleRevokeInvitation` handlers
- API Gateway only has routes for `/family/invite` (POST) and `/family/accept-invitation` (POST)
- Missing routes: GET /family/invitations, DELETE /family/invitations/{invitationId}, POST /family/invitations/{invitationId}/resend

**Impact:**

- Users cannot view pending invitations
- Users cannot revoke/cancel pending invitations
- Users cannot resend invitation emails
- Users get blocked when trying to send a new invitation to an email with a pending invitation

## User Stories

### 1. View Pending Invitations

**As a** primary family user
**I want to** view all pending invitations I've sent
**So that** I can see who I've invited and manage those invitations

**Acceptance Criteria:**
1.1. GET /family/invitations endpoint returns list of all invitations for my family
1.2. Response includes invitation ID, email, role, status, created date, expiry date
1.3. Only primary user can view invitations (403 for non-primary)
1.4. Endpoint requires authentication (401 for unauthenticated)

### 2. Revoke Pending Invitation

**As a** primary family user
**I want to** revoke/cancel a pending invitation
**So that** I can send a new invitation to the same email or remove unwanted invitations

**Acceptance Criteria:**
2.1. DELETE /family/invitations/{invitationId} endpoint deletes the invitation
2.2. Only primary user can revoke invitations (403 for non-primary)
2.3. Returns 404 if invitation doesn't exist
2.4. Returns 403 if invitation doesn't belong to user's family
2.5. Endpoint requires authentication (401 for unauthenticated)
2.6. After revoking, user can send a new invitation to the same email

### 3. Resend Invitation Email

**As a** primary family user
**I want to** resend an invitation email
**So that** the invitee receives the invitation again if they didn't get it or it expired

**Acceptance Criteria:**
3.1. POST /family/invitations/{invitationId}/resend endpoint resends the email
3.2. Only primary user can resend invitations (403 for non-primary)
3.3. Returns 404 if invitation doesn't exist
3.4. Returns 400 if invitation is not pending (already accepted/expired)
3.5. Returns 403 if invitation doesn't belong to user's family
3.6. Generates new token and updates invitation record
3.7. Sends email with new accept URL
3.8. Endpoint requires authentication (401 for unauthenticated)

## Technical Requirements

### API Gateway Routes

**Route 1: GET /family/invitations**

- Method: GET
- Integration: Lambda (familyHandler)
- Authorization: Cognito Authorizer (required)
- Operation Name: GetFamilyInvitations

**Route 2: DELETE /family/invitations/{invitationId}**

- Method: DELETE
- Integration: Lambda (familyHandler)
- Authorization: Cognito Authorizer (required)
- Path Parameter: invitationId
- Operation Name: RevokeFamilyInvitation

**Route 3: POST /family/invitations/{invitationId}/resend**

- Method: POST
- Integration: Lambda (familyHandler)
- Authorization: Cognito Authorizer (required)
- Path Parameter: invitationId
- Operation Name: ResendFamilyInvitation

### Lambda Handler Updates

**No changes needed** - handlers already exist:

- `handleGetInvitations(familyId, familyRole)`
- `handleRevokeInvitation(userId, familyId, familyRole, invitationId)`
- `handleResendInvitation(event, userId, familyId, familyRole, invitationId)`

### Frontend Integration

**Update FamilySettings component** to:

- Fetch and display pending invitations
- Add "Revoke" button for each pending invitation
- Add "Resend" button for each pending invitation
- Handle API calls and error states

## Success Criteria

1. All three API routes are defined in API Gateway
2. Routes are protected with Cognito authorizer
3. Lambda handlers are correctly invoked
4. Frontend can view, revoke, and resend invitations
5. Users can resolve "Pending invitation already exists" error by revoking old invitation
6. All endpoints return appropriate error codes (401, 403, 404, 400)

## Out of Scope

- Automatic expiration of old invitations (future enhancement)
- Invitation analytics/tracking (future enhancement)
- Bulk invitation management (future enhancement)
- Email template customization (future enhancement)

## Dependencies

- Existing family Lambda function (backend/functions/family/index.js)
- API Gateway stack (infrastructure/lib/api-stack.ts)
- FamilySettings UI component (packages/web-app/src/pages/FamilySettings.tsx)

## Risks

- **Low Risk**: Routes are straightforward additions to existing API Gateway configuration
- **Low Risk**: Lambda handlers already exist and are tested
- **Medium Risk**: Frontend changes may require UI/UX design decisions
