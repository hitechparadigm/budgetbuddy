# Family Collaboration - Design

## Architecture Overview

The family collaboration system enables couples to share budget management through a secure invitation system, role-based permissions, and real-time data synchronization.

**Key Components:**

1. Family Lambda - Invitation and member management
2. Permission Middleware - Role-based access control
3. Email Service - Invitation delivery
4. DynamoDB - Family data storage

## Data Models

### Family Record

```typescript
interface Family {
  PK: string; // "FAMILY#<familyId>"
  SK: string; // "METADATA"
  familyId: string; // UUID
  primaryUserId: string; // User who created the family
  createdAt: string; // ISO 8601 timestamp
  editorCount: number; // Current editor count (max 2: primary + spouse)
  viewerCount: number; // Current viewer count (unlimited)
  subscriptionTier: string; // "free" | "premium"
}
```

### Family Member Record

```typescript
interface FamilyMember {
  PK: string; // "FAMILY#<familyId>"
  SK: string; // "MEMBER#<userId>"
  userId: string; // User ID
  role: string; // "primary" | "spouse" | "viewer"
  joinedAt: string; // ISO 8601 timestamp
  addedBy: string; // User ID who added this member
}
```

### Invitation Record

```typescript
interface Invitation {
  PK: string; // "INVITATION#<invitationId>"
  SK: string; // "METADATA"
  invitationId: string; // UUID
  familyId: string; // Family ID
  invitedBy: string; // User ID who sent invitation
  invitedEmail: string; // Email address
  role: string; // "spouse" | "viewer"
  token: string; // Secure token (hashed)
  status: string; // "pending" | "accepted" | "expired" | "revoked"
  createdAt: string; // ISO 8601 timestamp
  expiresAt: string; // ISO 8601 timestamp (7 days)
  acceptedAt?: string; // ISO 8601 timestamp
  acceptedBy?: string; // User ID who accepted
}
```

### GSI: InvitationByEmail

- **Partition Key**: `invitedEmail`
- **Sort Key**: `createdAt`
- **Purpose**: Look up invitations by email address

## API Design

### POST /family/invite

Send invitation to join family.

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

**Errors:**

- 400: Invalid email or role
- 403: Not primary user
- 409: Editor limit reached (max 2) or invitation already exists
- 429: Too many invitations

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
    "memberCount": 2,
    "members": [...]
  }
}
```

**Errors:**

- 400: Invalid or expired token
- 404: Invitation not found
- 409: Editor limit reached (max 2 editors) - only for spouse invitations

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
    },
    {
      "userId": "uuid",
      "email": "partner@example.com",
      "name": "Jane Doe",
      "role": "spouse",
      "joinedAt": "2026-01-15T12:00:00Z"
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

**Errors:**

- 400: Invalid role
- 403: Not primary user
- 404: Member not found

### DELETE /family/members/:userId

Remove family member (primary only).

**Response:**

```json
{
  "message": "Member removed successfully",
  "userId": "uuid"
}
```

**Errors:**

- 403: Not primary user or trying to remove self
- 404: Member not found

### POST /family/leave

Leave family (non-primary only).

**Response:**

```json
{
  "message": "Left family successfully",
  "newFamilyId": "uuid"
}
```

**Errors:**

- 403: Primary user cannot leave
- 404: Not in a family

## Permission System

### Role Permissions Matrix

| Action             | Primary | Spouse | Viewer |
| ------------------ | ------- | ------ | ------ |
| View budgets       | ✅      | ✅     | ✅     |
| Create budget      | ✅      | ✅     | ❌     |
| Edit budget        | ✅      | ✅     | ❌     |
| Delete budget      | ✅      | ✅     | ❌     |
| Add transaction    | ✅      | ✅     | ❌     |
| Edit transaction   | ✅      | ✅     | ❌     |
| Delete transaction | ✅      | ✅     | ❌     |
| Invite member      | ✅      | ❌     | ❌     |
| Remove member      | ✅      | ❌     | ❌     |
| Change roles       | ✅      | ❌     | ❌     |
| Leave family       | ❌      | ✅     | ✅     |

### Permission Middleware

```javascript
function checkPermission(requiredRole, action) {
  return async (event) => {
    const user = await getUserFromToken(event);
    const family = await getFamily(user.familyId);
    const member = await getFamilyMember(family.familyId, user.userId);

    if (!hasPermission(member.role, action)) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: "Forbidden",
          message: `Role '${member.role}' cannot perform action '${action}'`,
        }),
      };
    }

    // Continue with request
  };
}
```

## Invitation Flow

### Send Invitation

1. Validate user is primary
2. Check editor limit if inviting as "spouse" (< 2 editors)
3. No limit check for "viewer" invitations
4. Check no pending invitation for email
5. Generate secure token
6. Create invitation record
7. Send email via SES
8. Return invitation details

### Accept Invitation

**Flow Overview:**

The invitation acceptance flow handles three scenarios:

1. **New User (No Account)**: Default flow - shows registration form
2. **Existing User (Has Account)**: Shows login form
3. **Already Authenticated**: Direct acceptance

**Detailed Steps:**

1. **Parse Token from URL**
   - Extract token from query parameter `?token=xxx`
   - Validate token exists
   - Display error if missing

2. **Check Authentication State**
   - Check for `budgetbuddy_access_token` in localStorage
   - If authenticated: Show accept/decline buttons
   - If not authenticated: Show auth form (default to registration)

3. **New User Registration Flow**
   - Display registration form by default (most common case)
   - Collect: firstName, lastName, email, password
   - Validate password (min 8 characters)
   - Call POST /auth/register with user data
   - On success: Automatically log in user
   - Store tokens: `budgetbuddy_access_token`, `budgetbuddy_refresh_token`, `budgetbuddy_id_token`
   - Store user data: `budgetbuddy_user` (JSON with userId, email)
   - Proceed to step 5 (Accept Invitation)

4. **Existing User Login Flow**
   - User switches to "Login" tab
   - Display login form
   - Collect: email, password
   - Call POST /auth/login with credentials
   - On success: Store authentication tokens (same as registration)
   - Proceed to step 5 (Accept Invitation)

5. **Accept Invitation API Call**
   - Call POST /family/accept-invitation with token
   - Include Authorization header with access token
   - Validate invitation not expired (7 days)
   - If role is "spouse": Validate editor limit not reached (< 2 editors)
   - If role is "viewer": No limit check (unlimited viewers)
   - Add user to family with specified role
   - Update invitation status to "accepted"
   - Increment editorCount or viewerCount accordingly

6. **Post-Acceptance**
   - Redirect to /budget page
   - Display success message: "Successfully joined family! You are now a [role]."
   - User immediately sees shared family budget

**Error Handling:**

- **Invalid Token**: Display error, offer link to home page
- **Expired Token**: Display error with expiration date, suggest requesting new invitation
- **Editor Limit Reached**: Display error for spouse invitations only, explain 2-editor limit
- **Registration Failed**: Display error message, allow retry
- **Login Failed**: Display error message, allow retry
- **Network Error**: Display error, offer retry button

**Token Storage Consistency:**

All components MUST use these localStorage keys:

- `budgetbuddy_access_token` - Access token for API calls
- `budgetbuddy_refresh_token` - Refresh token for token renewal
- `budgetbuddy_id_token` - ID token from Cognito
- `budgetbuddy_user` - JSON object with { userId, email, ... }

**UI/UX Considerations:**

- Default to registration form (most invitees are new users)
- Provide clear toggle between "Create Account" and "Login"
- Show informative message about what happens after acceptance
- Display role information (Spouse vs Viewer permissions)
- Use loading states during API calls
- Provide confirmation for decline action
- Mobile-responsive design

### Email Template

```html
Subject: You're invited to join [Primary Name]'s BudgetBuddy family! Hi there!
[Primary Name] has invited you to join their family budget on BudgetBuddy. As a
[Role], you'll be able to: - View your shared budget - Add and track
transactions - Collaborate on financial goals Click here to accept:
https://app.budgetbuddy.com/family/accept?token=[TOKEN] This invitation expires
in 7 days. Questions? Reply to this email or visit our help center. Best, The
BudgetBuddy Team
```

## Data Synchronization

### Strategy: Last-Write-Wins

- All budget/transaction updates include timestamp
- Concurrent edits resolved by latest timestamp
- UI shows who made last change
- No complex conflict resolution needed

### Implementation

```javascript
async function updateBudget(familyId, budgetId, updates, userId) {
  const timestamp = new Date().toISOString();

  await dynamodb.update({
    TableName: "budgetbuddy-main",
    Key: {
      PK: `FAMILY#${familyId}`,
      SK: `BUDGET#${budgetId}`,
    },
    UpdateExpression:
      "SET #data = :data, #updatedAt = :timestamp, #updatedBy = :userId",
    ExpressionAttributeNames: {
      "#data": "data",
      "#updatedAt": "updatedAt",
      "#updatedBy": "updatedBy",
    },
    ExpressionAttributeValues: {
      ":data": updates,
      ":timestamp": timestamp,
      ":userId": userId,
    },
  });
}
```

## Security Considerations

### 1. Invitation Token Security

- Generate cryptographically secure tokens (32 bytes)
- Hash tokens before storing in database
- Include expiration timestamp
- Validate on every use

### 2. Permission Enforcement

- Check permissions on every API request
- Never trust client-side permission checks
- Log all permission violations
- Rate limit permission checks

### 3. Data Isolation

- Use familyId as partition key
- Validate user belongs to family
- Prevent cross-family data access
- Audit all family data access

### 4. Email Security

- Validate email format
- Prevent email enumeration
- Rate limit invitation sends
- Include unsubscribe link

## Performance Optimization

### 1. Caching

- Cache family membership in JWT claims
- Cache permission matrix in memory
- Invalidate cache on role changes

### 2. Database Access

- Use GSI for email lookups
- Batch get family members
- Use consistent reads for permissions

### 3. API Optimization

- Combine family + members in single query
- Return minimal data in responses
- Use pagination for large families (future)

## Monitoring

### Metrics

- Invitation send rate
- Invitation acceptance rate
- Permission check latency
- Permission violation count
- Family creation rate
- Member removal rate

### Alarms

- High permission violation rate (> 1%)
- Invitation email failures (> 5%)
- Permission check latency (> 100ms)
- Family API errors (> 0.1%)

## Testing Strategy

### Unit Tests

- Permission matrix validation
- Token generation and validation
- Email template rendering
- Role change logic

### Integration Tests

- Complete invitation flow
- Permission enforcement
- Family member management
- Data synchronization

### Property-Based Tests

- Permission checks always enforce correctly
- Invitation tokens always expire
- Family size never exceeds 2
- Data isolation always maintained

## Deployment Strategy

### Phase 1: Backend (Week 1)

1. Create Family Lambda
2. Implement invitation system
3. Add permission middleware
4. Deploy to dev environment

### Phase 2: Frontend (Week 2)

1. Add family settings page
2. Implement invitation UI
3. Add member management
4. Add role indicators

### Phase 3: Testing (Week 3)

1. End-to-end testing
2. Security testing
3. Performance testing
4. User acceptance testing

## Cost Estimation

### AWS Services

- Lambda invocations: ~1000/day = $0.20/month
- DynamoDB storage: ~1KB/family = $0.25/month (1000 families)
- SES emails: ~100/day = $1.00/month
- **Total**: ~$1.50/month (1000 families)

### Scaling

- 10K families: ~$15/month
- 100K families: ~$150/month

## Future Enhancements

1. Family budget templates
2. Family spending insights
3. Family goals and challenges
4. Family transaction categories
5. Family notification preferences
6. Family data export
