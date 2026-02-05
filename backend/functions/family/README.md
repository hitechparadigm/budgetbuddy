# Family Lambda Function

## Overview

The Family Lambda function handles all family collaboration features in BudgetBuddy, enabling couples to share budget management through secure invitations, role-based permissions, and real-time synchronization.

## Features

- **Invitation System**: Send and accept family invitations via secure tokens
- **Member Management**: View, update roles, and remove family members
- **Permission Enforcement**: Role-based access control (primary, spouse, viewer)
- **Leave Family**: Non-primary members can leave and create their own family

## API Endpoints

### POST /family/invite

Send invitation to join family (primary only).

**Request:**

```json
{
  "email": "partner@example.com",
  "role": "spouse"
}
```

**Response:**

```json
{
  "invitationId": "uuid",
  "email": "partner@example.com",
  "role": "spouse",
  "expiresAt": "2026-02-07T12:00:00Z",
  "status": "pending"
}
```

### POST /family/accept-invitation

Accept family invitation.

**Request:**

```json
{
  "token": "secure-token-from-email"
}
```

**Response:**

```json
{
  "familyId": "uuid",
  "role": "spouse",
  "family": {
    "primaryUserId": "uuid",
    "memberCount": 2
  }
}
```

### GET /family/members

Get all family members.

**Response:**

```json
{
  "familyId": "uuid",
  "members": [
    {
      "userId": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "primary",
      "joinedAt": "2026-01-01T12:00:00Z"
    }
  ]
}
```

### PUT /family/members/:userId/role

Change member role (primary only).

**Request:**

```json
{
  "role": "viewer"
}
```

**Response:**

```json
{
  "userId": "uuid",
  "role": "viewer",
  "updatedAt": "2026-01-31T12:00:00Z"
}
```

### DELETE /family/members/:userId

Remove family member (primary only).

**Response:**

```json
{
  "message": "Member removed successfully",
  "userId": "uuid"
}
```

### POST /family/leave

Leave family (non-primary only).

**Response:**

```json
{
  "message": "Left family successfully",
  "newFamilyId": "uuid"
}
```

## Environment Variables

- `TABLE_NAME`: DynamoDB table name (default: budgetbuddy-main)
- `AWS_REGION`: AWS region for DynamoDB and SES
- `FAMILY_API_URL`: Family API Gateway URL for calling email service (set by CDK)

## IAM Permissions Required

- `dynamodb:GetItem` - Read family and invitation data
- `dynamodb:PutItem` - Create invitations and family records
- `dynamodb:UpdateItem` - Update member roles and invitation status
- `dynamodb:DeleteItem` - Remove members
- `dynamodb:Query` - Query family members and invitations
- `ses:SendEmail` - Send invitation emails

## Data Models

### Family Record

```
PK: "FAMILY#<familyId>"
SK: "METADATA"
familyId: string
primaryUserId: string
createdAt: string (ISO 8601)
memberCount: number (max 2)
subscriptionTier: string
```

### Family Member Record

```
PK: "FAMILY#<familyId>"
SK: "MEMBER#<userId>"
userId: string
role: string (primary|spouse|viewer)
joinedAt: string (ISO 8601)
addedBy: string (userId)
```

### Invitation Record

```
PK: "INVITATION#<invitationId>"
SK: "METADATA"
invitationId: string
familyId: string
invitedBy: string (userId)
invitedEmail: string
role: string (spouse|viewer)
token: string (hashed)
status: string (pending|accepted|expired|revoked)
createdAt: string (ISO 8601)
expiresAt: string (ISO 8601, 7 days)
```

## Testing

Run unit tests:

```bash
npm test
```

Run with coverage:

```bash
npm run test:coverage
```

## Security Considerations

1. **Token Security**: Invitation tokens are cryptographically secure (32 bytes) and hashed before storage
2. **Permission Enforcement**: All endpoints validate user role before performing actions
3. **Data Isolation**: Family data is isolated by familyId to prevent cross-family access
4. **Email Validation**: Email addresses are validated before sending invitations
5. **Rate Limiting**: Invitation sends are rate-limited to prevent spam

## Error Handling

- `400 Bad Request`: Invalid input (email, role, token)
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: Insufficient permissions for action
- `404 Not Found`: Family, member, or invitation not found
- `409 Conflict`: Family full or invitation already exists
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Unexpected server error

## Deployment

This function is deployed via AWS CDK as part of the API stack. See `infrastructure/lib/api-stack.ts` for configuration.

## Monitoring

Key metrics to monitor:

- Invitation send rate
- Invitation acceptance rate
- Permission check latency
- Permission violation count
- Family creation rate
- Member removal rate

CloudWatch alarms are configured for:

- High permission violation rate (> 1%)
- Invitation email failures (> 5%)
- Permission check latency (> 100ms)
- Family API errors (> 0.1%)
