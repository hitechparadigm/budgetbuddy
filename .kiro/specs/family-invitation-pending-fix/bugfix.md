# Bugfix Requirements Document

## Introduction

The "Pending Invitations" section on the Family Members page is not rendering, leaving users unable to cancel or resend existing pending invitations. When a user tries to invite an email that already has a pending invitation, they see the error "Pending invitation already exists for this email" but have no way to resolve it because the section with Cancel/Resend buttons is invisible.

The root cause is in the backend `handleGetInvitations` function, which uses an invalid DynamoDB query pattern (`begins_with` on a partition key in a `KeyConditionExpression`). DynamoDB requires an exact equality match (`=`) on the partition key — `begins_with` is only valid on sort keys. This causes the GET /family/invitations endpoint to fail or return no results. The frontend silently catches this failure and leaves `pendingInvitations` as an empty array, so the conditionally-rendered "Pending Invitations" section never appears.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a primary user navigates to the Family Members page THEN the system fails to load pending invitations because the backend `handleGetInvitations` function uses `begins_with(GSI4PK, :invPrefix)` as a `KeyConditionExpression` on a DynamoDB GSI partition key, which is an unsupported query pattern

1.2 WHEN the GET /family/invitations endpoint fails or returns empty results due to the invalid query THEN the frontend silently catches the error and sets `pendingInvitations` to an empty array, causing the "Pending Invitations" section to not render

1.3 WHEN a primary user attempts to invite an email that already has a pending invitation THEN the system displays "Pending invitation already exists for this email" but provides no way to cancel or resend the existing invitation because the Pending Invitations section is hidden

### Expected Behavior (Correct)

2.1 WHEN a primary user navigates to the Family Members page THEN the system SHALL successfully query all pending invitations for the user's family using a valid DynamoDB query pattern and return them to the frontend

2.2 WHEN the GET /family/invitations endpoint returns pending invitations THEN the frontend SHALL render the "Pending Invitations" section showing each invitation with its email, role, status, sent date, expiry date, and Cancel/Resend action buttons

2.3 WHEN a primary user has a pending invitation that blocks a new invite THEN the system SHALL display the pending invitation in the "Pending Invitations" section so the user can cancel it (via DELETE /family/invitations/{id}) and then re-invite if desired

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a non-primary user (spouse or viewer) navigates to the Family Members page THEN the system SHALL CONTINUE TO not fetch or display pending invitations (invitations are only visible to the primary user)

3.2 WHEN a primary user sends a new invitation to an email with no existing pending invitation THEN the system SHALL CONTINUE TO create the invitation successfully and return a 201 response

3.3 WHEN a primary user cancels a pending invitation via the Cancel button THEN the system SHALL CONTINUE TO delete the invitation via DELETE /family/invitations/{id} and refresh the list

3.4 WHEN a primary user resends a pending invitation via the Resend button THEN the system SHALL CONTINUE TO regenerate the token and send a new email via POST /family/invitations/{id}/resend

3.5 WHEN there are no pending invitations for the family THEN the system SHALL CONTINUE TO hide the "Pending Invitations" section (conditional rendering based on empty array is correct behavior)
