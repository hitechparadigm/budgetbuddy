# Requirements Document: Fix Accounts & Family Features

## Introduction

This feature addresses critical bugs in two existing features: Manual Account Management and Family Invitations. Both features have backend Lambda functions and frontend UI components implemented, but integration issues prevent them from working correctly. This spec focuses on identifying and fixing the root causes to restore full functionality.

### Reported Issues

1. **Family Invitations Return 401 Unauthorized**: Users report that when trying to invite a family member, the API returns a 401 Unauthorized error. Console logs show:
   - `POST /v1/family/invite` returns 401 (Unauthorized)
   - `GET /v1/family/members` returns 401 (Unauthorized)
   - `GET /v1/auth/profile` returns 401 (Unauthorized)
   - CORS preflight issues on `/v1/auth/mfa/status`

   **Root Cause Identified**: The FamilySettings component sends `budgetbuddy_access_token` in the Authorization header, but the API Gateway Cognito User Pools Authorizer expects an **ID token** (not access token). This is a well-documented AWS behavior - the Cognito authorizer validates ID tokens by default.

2. **Manual Account Creation**: Users report that adding accounts manually doesn't work. The accounts API uses `budgetbuddy_id_token` which is correct, so the issue may be different (response parsing or other integration issues).

## AWS Architecture Assessment

### Current Architecture Review

The current implementation follows AWS serverless best practices with some areas for improvement:

**Strengths:**

- ✅ Serverless architecture with Lambda + API Gateway + DynamoDB
- ✅ Cognito User Pools for authentication
- ✅ Single-table DynamoDB design with proper partition/sort keys
- ✅ Lambda layers for shared code (common, shared)
- ✅ CORS configuration for web clients
- ✅ Structured logging with correlation IDs
- ✅ Role-based access control (RBAC) with family roles

**Areas for Improvement:**

1. **Token Handling Inconsistency** (Security Pillar)
   - FamilySettings uses access_token but API Gateway Cognito authorizer requires id_token
   - Inconsistent token usage across frontend components creates confusion
   - **Recommendation**: Standardize on id_token for all API Gateway calls with Cognito authorizer

2. **Missing Family Metadata Handling** (Reliability Pillar)
   - Family Lambda returns 404 if FAMILY#<familyId> METADATA doesn't exist
   - No graceful degradation or auto-creation for legacy users
   - **Recommendation**: Implement idempotent family metadata creation

3. **Error Response Inconsistency** (Operational Excellence Pillar)
   - Family Lambda uses `{ error: message }` format
   - Accounts Lambda uses `{ success, data, message }` format
   - **Recommendation**: Standardize error response format across all Lambdas

4. **Missing Request Validation** (Security Pillar)
   - Family Lambda does basic validation but no schema validation
   - **Recommendation**: Use Zod or similar for request validation (already in shared package)

5. **No Retry Logic for DynamoDB Operations** (Reliability Pillar)
   - DynamoDB operations don't have retry logic for transient failures
   - **Recommendation**: Add exponential backoff retry for DynamoDB operations

### AWS Well-Architected Framework Alignment

| Pillar                 | Current State                       | Recommendation              |
| ---------------------- | ----------------------------------- | --------------------------- |
| Security               | Token mismatch causes auth failures | Standardize on id_token     |
| Reliability            | Missing metadata causes 404 errors  | Auto-create missing records |
| Operational Excellence | Inconsistent error formats          | Standardize response format |
| Performance            | Good - serverless auto-scales       | No changes needed           |
| Cost Optimization      | Good - pay-per-use model            | No changes needed           |
| Sustainability         | Good - serverless efficient         | No changes needed           |

## Glossary

- **Manual_Account**: A financial account created by the user without bank connection (e.g., checking, savings, credit card)
- **Family_Invitation**: A secure invitation sent to another user to join a family budget
- **Access_Token**: JWT token used for API authentication (stored as `budgetbuddy_access_token`)
- **ID_Token**: JWT token containing user identity claims (stored as `budgetbuddy_id_token`)
- **Family_Metadata**: DynamoDB record with PK `FAMILY#<familyId>` and SK `METADATA` containing family configuration
- **API_Response_Format**: Standard response structure `{ success, data, message, timestamp }`

## Requirements

### Requirement 1: Consistent Token Usage Across API Calls

**User Story:** As a user, I want all API calls to use the correct authentication token, so that I can access my accounts and family features without authentication errors.

#### Acceptance Criteria

1. WHEN the Accounts_API makes requests, THE System SHALL use `budgetbuddy_id_token` from localStorage for authentication
2. WHEN the Family_API makes requests, THE System SHALL use `budgetbuddy_id_token` from localStorage for authentication (API Gateway Cognito authorizer requires ID tokens)
3. IF the required token is missing, THEN THE System SHALL redirect the user to the login page with a clear message
4. THE System SHALL document which token type each API endpoint expects
5. WHEN a 401 Unauthorized response is received, THE System SHALL clear stored tokens and redirect to login

### Requirement 2: Fix Manual Account Creation Flow

**User Story:** As a user, I want to add manual accounts (checking, savings, credit cards), so that I can track all my finances in one place.

#### Acceptance Criteria

1. WHEN a user opens the Add Account modal, THE System SHALL display account type selection options
2. WHEN a user submits valid account data, THE System SHALL create the account in DynamoDB
3. WHEN the backend returns a success response, THE Frontend SHALL correctly parse the response format `{ success: true, data: { account }, message }`
4. WHEN an account is created successfully, THE System SHALL display the new account in the accounts list
5. IF account creation fails, THEN THE System SHALL display a clear error message to the user
6. WHEN listing accounts, THE Frontend SHALL correctly parse the response format `{ success: true, data: { accounts: [...], count }, message }`
7. THE System SHALL validate required fields (nickname, accountType, accountSubtype, currentBalance) before submission

### Requirement 3: Fix Family Invitation Send Flow

**User Story:** As a primary account holder, I want to send family invitations, so that my partner can access our shared budget.

#### Acceptance Criteria

1. WHEN a primary user sends an invitation, THE System SHALL verify the `FAMILY#<familyId>` METADATA record exists
2. IF the Family_Metadata record does not exist, THEN THE System SHALL create it before processing the invitation
3. WHEN an invitation is sent successfully, THE System SHALL return the invitation details including the token
4. WHEN an invitation is sent, THE System SHALL store it with status "pending" in DynamoDB
5. THE System SHALL prevent duplicate pending invitations to the same email address
6. THE System SHALL enforce the family member limit (max 2 editors: primary + spouse)
7. IF the family is full for editor roles, THEN THE System SHALL return a clear error message

### Requirement 4: Fix Family Invitation Accept Flow

**User Story:** As an invited user, I want to accept a family invitation, so that I can access the shared budget.

#### Acceptance Criteria

1. WHEN a user accepts an invitation with a valid token, THE System SHALL add them to the family
2. WHEN accepting an invitation, THE System SHALL validate the token has not expired (7-day limit)
3. WHEN accepting an invitation, THE System SHALL update the invitation status to "accepted"
4. WHEN accepting an invitation, THE System SHALL increment the family member count
5. IF the invitation token is invalid or expired, THEN THE System SHALL return a clear error message
6. WHEN a user successfully joins a family, THE System SHALL update their user profile with the new familyId
7. THE System SHALL handle the case where the accepting user already has an account

### Requirement 5: Ensure Family Metadata Consistency

**User Story:** As a system administrator, I want family metadata to be consistent, so that family features work reliably.

#### Acceptance Criteria

1. WHEN a new user registers, THE System SHALL create a `FAMILY#<familyId>` METADATA record
2. THE Family_Metadata record SHALL include: familyId, primaryUserId, createdAt, memberCount, subscriptionTier
3. WHEN querying family metadata, THE System SHALL handle missing records gracefully by creating them
4. THE System SHALL ensure memberCount accurately reflects the number of family members
5. WHEN a member is added or removed, THE System SHALL update the memberCount atomically

### Requirement 6: Proper Error Handling and User Feedback

**User Story:** As a user, I want clear error messages when something goes wrong, so that I understand what happened and how to fix it.

#### Acceptance Criteria

1. WHEN an API call fails, THE System SHALL display a user-friendly error message
2. THE System SHALL NOT expose internal error details or stack traces to users
3. WHEN a network error occurs, THE System SHALL suggest the user check their connection
4. WHEN a validation error occurs, THE System SHALL highlight the specific field(s) with issues
5. THE System SHALL log detailed error information for debugging purposes
6. WHEN an operation succeeds, THE System SHALL display a success confirmation

### Requirement 7: API Response Format Consistency

**User Story:** As a developer, I want consistent API response formats, so that the frontend can reliably parse responses.

#### Acceptance Criteria

1. THE Backend SHALL return responses in the format: `{ success: boolean, data: any, message: string, timestamp: string }`
2. THE Frontend SHALL expect and parse this standard response format
3. WHEN the response format doesn't match expectations, THE System SHALL handle it gracefully
4. THE System SHALL include appropriate HTTP status codes (200 for success, 4xx for client errors, 5xx for server errors)
5. THE System SHALL include correlation IDs in error responses for debugging

## Technical Requirements

### Performance

- Account creation response time < 500ms
- Family invitation send time < 1 second
- Family invitation accept time < 2 seconds
- Account list load time < 500ms

### Security

- All API calls require valid JWT authentication
- Invitation tokens are cryptographically secure (32 bytes)
- Invitation tokens expire after 7 days
- Family data is isolated by familyId
- No sensitive data exposed in error messages

### Reliability

- API calls include retry logic for transient failures
- DynamoDB operations use conditional writes where appropriate
- Family metadata creation is idempotent
- Token validation is performed server-side

### Accessibility

- Error messages are announced to screen readers
- Form validation errors are associated with their fields
- Success/failure states have visual and text indicators

## Success Metrics

- 100% of manual account creations succeed when valid data is provided
- 100% of family invitations are sent successfully when family metadata exists
- 100% of valid invitation tokens can be accepted
- Zero authentication errors due to token mismatch
- < 1% API error rate for accounts and family endpoints

## Out of Scope

- Plaid bank connection integration
- Email delivery for invitations (currently returns token in response)
- Family budget copying when leaving family
- Multi-family support per user
- Advanced family permission customization

## Dependencies

- AWS DynamoDB for data storage
- AWS Cognito for authentication
- Existing accounts Lambda function
- Existing family Lambda function
- Existing frontend components (AccountsPage, FamilySettings)

## Risks

1. **Token Inconsistency**: Different APIs expect different tokens - Mitigated by documenting and standardizing
2. **Missing Family Metadata**: Legacy users may not have metadata records - Mitigated by auto-creation
3. **Response Format Mismatch**: Frontend/backend format expectations differ - Mitigated by explicit parsing
4. **Concurrent Updates**: Race conditions on memberCount - Mitigated by atomic DynamoDB operations
