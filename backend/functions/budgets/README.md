# Budgets Lambda

Handles all budget collaboration features for BudgetBuddy. Replaces the legacy `family` Lambda.

## Overview

All routes are under `/budgets/*`. Budget access is resolved from DynamoDB on every request
via `BudgetAccessResolver` — the JWT carries only `userId`. This eliminates the stale-JWT bug
structurally (REQ-11).

## Endpoints

| Method | Path | Handler | Requirements |
|--------|------|---------|--------------|
| GET | `/budgets` | `handleGetBudgets` | REQ-4 |
| PUT | `/budgets/active` | `handleSetActiveBudget` | REQ-4 |
| POST | `/budgets` | `handleCreateBudget` | REQ-4 |
| POST | `/budgets/{budgetId}/invite` | `handleInvite` | REQ-5 |
| POST | `/budgets/accept-invitation` | `handleAcceptInvitation` | REQ-6 |
| GET | `/budgets/{budgetId}/members` | `handleGetMembers` | REQ-7 |
| PUT | `/budgets/{budgetId}/members/{userId}` | `handleUpdateMemberRole` | REQ-7 |
| DELETE | `/budgets/{budgetId}/members/{userId}` | `handleRemoveMember` | REQ-8 |
| POST | `/budgets/{budgetId}/leave` | `handleLeaveBudget` | REQ-8 |
| GET | `/budgets/{budgetId}/invitations` | `handleGetInvitations` | REQ-5 |
| POST | `/budgets/{budgetId}/invitations/{id}/resend` | `handleResendInvitation` | REQ-5 |
| DELETE | `/budgets/{budgetId}/invitations/{id}` | `handleRevokeInvitation` | REQ-5 |
| PUT | `/budgets/{budgetId}/members/{userId}/extend` | `handleExtendViewerAccess` | REQ-7 |
| PUT | `/budgets/{budgetId}/archive` | `handleArchiveBudget` | REQ-15 |
| PUT | `/budgets/{budgetId}/restore` | `handleRestoreBudget` | REQ-15 |
| DELETE | `/budgets/{budgetId}` | `handleDeleteBudget` | REQ-15 |

## Access Control

Every handler calls `BudgetAccessResolver.resolveAccess(userId, dynamoHelpers, budgetId)` which:

1. Reads `USER#<userId>/PROFILE` → gets `defaultBudgetId`
2. Reads `BUDGET#<budgetId>/MEMBER#<userId>` → gets `role`, `status`, `expiresAt`
3. Reads `BUDGET#<budgetId>/METADATA` → gets `budgetType`, `status`

Then calls `BudgetAccessResolver.assertPermission(role, action, budgetStatus)` to enforce RBAC.

## Roles

| Role | Description |
|------|-------------|
| `owner` | Full admin rights including archive, delete, member management |
| `partner` | Full read/write; can invite on family budgets |
| `household_member` | Can add/edit transactions; cannot manage budget |
| `viewer` | Read-only; optional time-limited expiry |

## Budget Types

| Type | Description |
|------|-------------|
| `personal` | One user only; private; no members allowed |
| `family` | Full transparency; max 1 partner |
| `shared` | Shared expenses; members keep personal budgets |

## DynamoDB Key Patterns

```
Budget metadata:  PK = BUDGET#<budgetId>  SK = METADATA
Budget member:    PK = BUDGET#<budgetId>  SK = MEMBER#<userId>
                  GSI1PK = USER#<userId>  GSI1SK = BUDGET#<budgetId>
Invitation:       PK = INVITATION#<id>    SK = METADATA
                  GSI4PK = INVITATION#<email>  GSI4SK = CREATED#<timestamp>
User profile:     PK = USER#<userId>      SK = PROFILE
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TABLE_NAME` | DynamoDB table name |
| `BUDGETS_API_URL` | Base URL for the API Gateway (used for email sending) |
| `WEB_APP_URL` | Frontend URL for invitation accept links |

## Error Responses

| Condition | Status | Message |
|-----------|--------|---------|
| Personal budget invite | 400 | "Personal budgets cannot have members." |
| Second partner on family budget | 409 | "This budget already has a partner." |
| Invite existing member | 409 | "This user is already a member of this budget." |
| Owner tries to leave | 400 | "You cannot leave a budget you own. Archive the budget instead." |
| Delete personal budget | 400 | "You cannot delete your personal budget." |
| Non-owner tries to archive/delete | 403 | "You do not have permission to perform this action." |

## Security

- Invitation tokens: 32 bytes cryptographically secure random, stored as SHA-256 hash
- Tokens are single-use and expire in 7 days
- Invitation acceptance requires the accepting user's email to match the invited email
- No `familyId` is ever written to user profiles

## Layer Dependencies

- `/opt/nodejs/utils` — `BudgetAccessResolver`, `dynamoHelpers`, `generateId`, `getUserFromEvent`, response helpers
- `/opt/nodejs/entitlements` — `canUseFeature`
