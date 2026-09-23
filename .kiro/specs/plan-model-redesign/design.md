# Design Document — Budget Model Redesign

## Overview

This document translates the requirements into concrete technical decisions: which files change,
what the new shared utilities look like, how each Lambda is updated, what the CDK infrastructure
changes are, and how the frontend adapts. Every design decision traces back to a requirement.

---

## Architecture

The architectural shift is from **family-scoped** to **budget-scoped** data access.

**Before:** JWT carries `familyId` → Lambda reads `FAMILY#<familyId>` directly.

**After:** JWT carries only `userId` → Lambda reads `USER#<userId>/PROFILE` to get `defaultBudgetId`
→ verifies `BUDGET#<budgetId>/MEMBER#<userId>` → reads `BUDGET#<budgetId>` data.

```
┌─────────────────────────────────────────────────────────────┐
│                        API Gateway                          │
│                   (Cognito Authorizer)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ JWT: { userId }
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Lambda Handler                           │
│                                                             │
│  1. getUserFromEvent() → userId                             │
│  2. BudgetAccessResolver.resolveAccess(userId)              │
│     ├─ GET USER#<userId>/PROFILE → defaultBudgetId          │
│     ├─ GET BUDGET#<budgetId>/MEMBER#<userId> → role, expiry │
│     └─ GET BUDGET#<budgetId>/METADATA → budgetType, status  │
│  3. assertPermission(role, action, budgetStatus)            │
│  4. canUseFeature(subscriptionTier, featureKey)             │
│  5. Read/write BUDGET#<budgetId>/...                        │
└─────────────────────────────────────────────────────────────┘
```

**Key properties:**
- The JWT is never the source of truth for budget access — DynamoDB is
- Changing budgets (accept invitation, leave budget) takes effect on the next API call
- The stale-JWT bug is structurally impossible in this model

---

## Components and Interfaces

### Backend Layer: `BudgetAccessResolver`

Location: `backend/layers/common/nodejs/utils.js`

```javascript
BudgetAccessResolver.resolveAccess(userId, dynamoHelpers, requestedBudgetId?)
  → Promise<{ budgetId, role, budgetType, budgetStatus, expiresAt, subscriptionTier }>

BudgetAccessResolver.assertPermission(role, action, budgetStatus)
  → void | throws { statusCode: 403, message }
```

### Backend Layer: `entitlements.js`

Location: `backend/layers/common/nodejs/entitlements.js`

```javascript
canUseFeature(subscriptionTier, featureKey) → boolean
FEATURE_CATALOG: Record<string, { tier: 'free' | 'premium', description: string }>
```

### Budgets Lambda API

Replaces the family Lambda. All routes under `/budgets/*`.

```
GET    /budgets                                → list all budgets for user
PUT    /budgets/active                         → set defaultBudgetId
POST   /budgets                               → create new budget
POST   /budgets/{budgetId}/invite             → send invitation
POST   /budgets/accept-invitation             → accept invitation by token
GET    /budgets/{budgetId}/members            → list members
PUT    /budgets/{budgetId}/members/{userId}   → update member role
DELETE /budgets/{budgetId}/members/{userId}   → remove member
POST   /budgets/{budgetId}/leave              → leave budget
GET    /budgets/{budgetId}/invitations        → list pending invitations
POST   /budgets/{budgetId}/invitations/{id}/resend
DELETE /budgets/{budgetId}/invitations/{id}
PUT    /budgets/{budgetId}/members/{userId}/extend  → extend viewer access
PUT    /budgets/{budgetId}/archive
PUT    /budgets/{budgetId}/restore
DELETE /budgets/{budgetId}
```

### Frontend: `budgetService.ts`

Replaces `familyService.ts`. Wraps all `/budgets/*` API calls.

### Frontend: `BudgetSwitcher.tsx`

Shown in app header when user has more than one active budget membership.
Calls `PUT /budgets/active` on selection.

---

## Data Models

### DynamoDB Records

**User Profile** (`USER#<userId> / PROFILE`)
```json
{
  "PK": "USER#user_abc",
  "SK": "PROFILE",
  "userId": "user_abc",
  "email": "user@example.com",
  "firstName": "Dmytro",
  "lastName": "Malyk",
  "defaultBudgetId": "budget_xyz",
  "currency": "USD",
  "subscriptionTier": "free",
  "onboardingCompleted": true,
  "createdAt": "2026-06-01T00:00:00Z",
  "updatedAt": "2026-06-01T00:00:00Z"
}
```

**Budget Metadata** (`BUDGET#<budgetId> / METADATA`)
```json
{
  "PK": "BUDGET#budget_xyz",
  "SK": "METADATA",
  "budgetId": "budget_xyz",
  "name": "Dmytro's Budget",
  "budgetType": "personal",
  "ownerUserId": "user_abc",
  "currency": "USD",
  "country": "CA",
  "status": "active",
  "createdAt": "2026-06-01T00:00:00Z",
  "updatedAt": "2026-06-01T00:00:00Z"
}
```

**Budget Member** (`BUDGET#<budgetId> / MEMBER#<userId>`)
```json
{
  "PK": "BUDGET#budget_xyz",
  "SK": "MEMBER#user_abc",
  "GSI1PK": "USER#user_abc",
  "GSI1SK": "BUDGET#budget_xyz",
  "budgetId": "budget_xyz",
  "userId": "user_abc",
  "role": "owner",
  "status": "active",
  "accessLabel": null,
  "joinedAt": "2026-06-01T00:00:00Z",
  "invitedBy": null,
  "expiresAt": null,
  "historyAccess": "full",
  "createdAt": "2026-06-01T00:00:00Z"
}
```

**Viewer Member** (with expiry)
```json
{
  "PK": "BUDGET#budget_xyz",
  "SK": "MEMBER#user_advisor",
  "GSI1PK": "USER#user_advisor",
  "GSI1SK": "BUDGET#budget_xyz",
  "budgetId": "budget_xyz",
  "userId": "user_advisor",
  "role": "viewer",
  "status": "active",
  "accessLabel": "Financial Advisor",
  "joinedAt": "2026-06-01T00:00:00Z",
  "invitedBy": "user_abc",
  "expiresAt": "2026-09-01T00:00:00Z",
  "historyAccess": "full",
  "createdAt": "2026-06-01T00:00:00Z"
}
```

**Budget Period** (`BUDGET#<budgetId> / PERIOD#<month>`)
```json
{
  "PK": "BUDGET#budget_xyz",
  "SK": "PERIOD#2026-06",
  "budgetId": "budget_xyz",
  "month": "2026-06",
  "totalIncome": 5000,
  "totalSavings": 500,
  "totalExpenses": 3200,
  "remainingBalance": 1300,
  "groups": { "income": [], "savings": [], "expenses": [] },
  "isAIGenerated": true,
  "createdAt": "2026-06-01T00:00:00Z",
  "updatedAt": "2026-06-01T00:00:00Z"
}
```

**Invitation** (`INVITATION#<id> / METADATA`)
```json
{
  "PK": "INVITATION#inv_123",
  "SK": "METADATA",
  "GSI4PK": "INVITATION#iryna@example.com",
  "GSI4SK": "CREATED#2026-06-01T00:00:00Z",
  "invitationId": "inv_123",
  "budgetId": "budget_xyz",
  "invitedBy": "user_abc",
  "invitedEmail": "iryna@example.com",
  "role": "partner",
  "accessLabel": null,
  "token": "<sha256-hash>",
  "status": "pending",
  "expiresAt": "2026-06-08T00:00:00Z",
  "viewerExpiresAt": null,
  "createdAt": "2026-06-01T00:00:00Z"
}
```

Note: `viewerExpiresAt` on the invitation record carries the viewer's membership expiry
(30/60/90 days), distinct from the invitation's own 7-day expiry.

---

## Error Handling

| Condition | Status | Message |
|---|---|---|
| No user profile | 403 | "User profile not found" |
| No defaultBudgetId | 403 | "No active budget found. Please complete onboarding." |
| No membership record | 403 | "You do not have access to this budget." |
| Membership revoked/left | 403 | "You do not have access to this budget." |
| Viewer access expired | 403 | "Your viewer access has expired. Contact the budget owner to renew." |
| Budget deleted | 403 | "This budget has been deleted." |
| Budget archived + write action | 403 | "This budget is archived and is read-only." |
| Role lacks permission | 403 | "You do not have permission to perform this action." |
| Personal budget invite | 400 | "Personal budgets cannot have members." |
| Second partner on family budget | 409 | "This budget already has a partner." |
| Invite existing member | 409 | "This user is already a member of this budget." |
| Owner tries to leave | 400 | "You cannot leave a budget you own. Archive the budget instead." |
| Delete personal budget | 400 | "You cannot delete your personal budget." |

---

## Correctness Properties

### Property 1: No membership means no access
For any `(userId, budgetId)` pair where no `BUDGET#<budgetId>/MEMBER#<userId>` record exists
with `status = active`, every API call returns 403. **Validates: REQ-3**

### Property 2: Viewer role is always read-only
For any request where `role = viewer`, any write action returns 403, regardless of expiry.
**Validates: REQ-7**

### Property 3: Expired viewer access is denied
For any membership where `expiresAt < now`, all actions return 403. **Validates: REQ-7**

### Property 4: Archived budgets are read-only for everyone
For any budget where `status = archived`, all write actions return 403 for all roles.
**Validates: REQ-15**

### Property 5: Personal budgets cannot have members
A `budgetType = personal` budget can only have one member (the owner). Any invite returns 400.
**Validates: REQ-5**

### Property 6: Family budgets have at most one partner
A `budgetType = family` budget can have at most one member with `role = partner`.
A second partner invite returns 409. **Validates: REQ-5**

### Property 7: defaultBudgetId always points to an accessible budget
After any operation that changes membership (leave, remove, archive, delete), the affected
user's `defaultBudgetId` is updated to a budget they still have active access to.
**Validates: REQ-8, REQ-15**

---

## Testing Strategy

### Unit tests
- `BudgetAccessResolver.resolveAccess()` — all error paths
- `BudgetAccessResolver.assertPermission()` — all role × action combinations
- `canUseFeature()` — all feature keys for both tiers
- Migration script — dry-run mode

### Integration tests (dev environment)
- Registration: verify 3 DynamoDB records, no `familyId` on profile
- Onboarding: verify period written to `BUDGET#<budgetId>/PERIOD#<month>`
- Invitation flow: invite → accept → membership created → `defaultBudgetId` updated
- Viewer expiry: past `expiresAt` → 403 on read
- Leave budget: `defaultBudgetId` restored to personal budget
- Archive budget: write operations return 403

### Property-based tests (fast-check)
- Any `userId` + any `budgetId` with no membership → always 403
- `role = viewer` + any write action → always 403
- `expiresAt` in the past + any action → always 403

---

## 1. Layer Changes — `backend/layers/common/nodejs/`

### 1.1 Remove `FamilyIdResolver` from `utils.js` (REQ-11)

`FamilyIdResolver` is deleted entirely. Replaced by `BudgetAccessResolver`.

### 1.2 Add `BudgetAccessResolver` to `utils.js`

```javascript
const BudgetAccessResolver = {
  async resolveAccess(userId, dynamoHelpers, requestedBudgetId = null) {
    const profile = await dynamoHelpers.getItem(`USER#${userId}`, 'PROFILE');
    if (!profile) throw { statusCode: 403, message: 'User profile not found' };

    const budgetId = requestedBudgetId || profile.defaultBudgetId;
    if (!budgetId) throw { statusCode: 403, message: 'No active budget found. Please complete onboarding.' };

    const membership = await dynamoHelpers.getItem(`BUDGET#${budgetId}`, `MEMBER#${userId}`);
    if (!membership || membership.status === 'revoked' || membership.status === 'left') {
      throw { statusCode: 403, message: 'You do not have access to this budget.' };
    }

    if (membership.expiresAt && new Date(membership.expiresAt) < new Date()) {
      throw { statusCode: 403, message: 'Your viewer access has expired. Contact the budget owner to renew.' };
    }

    const budget = await dynamoHelpers.getItem(`BUDGET#${budgetId}`, 'METADATA');
    if (!budget) throw { statusCode: 404, message: 'Budget not found.' };
    if (budget.status === 'deleted') throw { statusCode: 403, message: 'This budget has been deleted.' };

    return {
      budgetId,
      role: membership.role,
      budgetType: budget.budgetType,
      budgetStatus: budget.status,
      expiresAt: membership.expiresAt || null,
      subscriptionTier: profile.subscriptionTier || 'free',
    };
  },

  assertPermission(role, action, budgetStatus = 'active') {
    if (budgetStatus === 'archived') {
      const readActions = ['budget.read', 'transaction.read', 'category.read', 'account.read', 'report.read'];
      if (!readActions.includes(action)) {
        throw { statusCode: 403, message: 'This budget is archived and is read-only.' };
      }
    }

    const PERMISSIONS = {
      'budget.read':        ['owner', 'partner', 'household_member', 'viewer'],
      'transaction.read':   ['owner', 'partner', 'household_member', 'viewer'],
      'category.read':      ['owner', 'partner', 'household_member', 'viewer'],
      'account.read':       ['owner', 'partner', 'household_member', 'viewer'],
      'report.read':        ['owner', 'partner', 'household_member', 'viewer'],
      'transaction.create': ['owner', 'partner', 'household_member'],
      'transaction.edit':   ['owner', 'partner', 'household_member'],
      'transaction.delete': ['owner', 'partner'],
      'budget.edit':        ['owner', 'partner'],
      'category.edit':      ['owner', 'partner'],
      'account.manage':     ['owner', 'partner'],
      'member.invite':      ['owner', 'partner'],
      'member.remove':      ['owner'],
      'budget.export':      ['owner', 'partner'],
      'budget.archive':     ['owner'],
      'budget.delete':      ['owner'],
    };

    const allowed = PERMISSIONS[action];
    if (!allowed) throw { statusCode: 400, message: `Unknown action: ${action}` };
    if (!allowed.includes(role)) throw { statusCode: 403, message: 'You do not have permission to perform this action.' };
  },
};
```

### 1.3 Add `entitlements.js` to common layer (REQ-14)

New file: `backend/layers/common/nodejs/entitlements.js`

```javascript
const FEATURE_CATALOG = {
  'viewer.invite':       { tier: 'free',    description: 'Invite read-only viewers' },
  'viewer.expiry':       { tier: 'free',    description: 'Set viewer expiration dates' },
  'budget.personal':     { tier: 'free',    description: 'Personal budget' },
  'budget.family':       { tier: 'free',    description: 'Family budget' },
  'budget.shared':       { tier: 'free',    description: 'Shared budget' },
  'member.invite':       { tier: 'free',    description: 'Invite budget members' },
  'budget.ai.generate':  { tier: 'free',    description: 'AI budget generation' },
  'reports.advanced':    { tier: 'premium', description: 'Advanced reports' },
  'budget.export':       { tier: 'premium', description: 'Export budget data' },
};

function canUseFeature(subscriptionTier, featureKey) {
  const feature = FEATURE_CATALOG[featureKey];
  if (!feature) return false;
  if (feature.tier === 'free') return true;
  return subscriptionTier === 'premium';
}

module.exports = { FEATURE_CATALOG, canUseFeature };
```

### 1.4 Update `getUserFromEvent` in `utils.js` (REQ-13)

Remove `familyId` and `role` from the returned object:

```javascript
const getUserFromEvent = (event) => {
  const claims = event.requestContext?.authorizer?.claims;
  if (!claims) throw new Error('No user claims found in request');
  return {
    userId: claims['custom:userId'] || claims.sub,
    email: claims.email,
    firstName: claims.given_name || claims['cognito:username'],
    lastName: claims.family_name || 'User',
    subscriptionTier: claims['custom:subscriptionTier'] || 'free',
    // familyId and role removed — resolved from DynamoDB via BudgetAccessResolver
  };
};
```

### 1.5 Update `generateId` in `utils.js`

```javascript
const generateId = {
  user:        () => `user_${uuidv4()}`,
  budget:      () => `budget_${uuidv4()}`,   // replaces family
  transaction: () => `txn_${uuidv4()}`,
  category:    () => `cat_${uuidv4()}`,
  invitation:  () => `inv_${uuidv4()}`,
  account:     () => `acc_${uuidv4()}`,
  custom:      (prefix) => `${prefix}_${uuidv4()}`,
};
```

---

## 2. DynamoDB Schema Changes (REQ-3, REQ-4)

### 2.1 GSI1 repurposed for budget membership queries

**GSI1:**
- `GSI1PK = USER#<userId>` on `BUDGET#<budgetId> / MEMBER#<userId>` records
- `GSI1SK = BUDGET#<budgetId>`
- Query: `GSI1PK = USER#<userId>` → returns all budgets a user belongs to

The GSI already exists; only the usage changes.

### 2.2 Key pattern changes

| Old | New |
|---|---|
| `PK = FAMILY#<familyId>` | `PK = BUDGET#<budgetId>` |
| `SK = BUDGET#<month>` | `SK = PERIOD#<month>` |
| `SK = MEMBER#<userId>` | `SK = MEMBER#<userId>` (unchanged) |
| `SK = METADATA` | `SK = METADATA` (unchanged) |
| `SK = TRANSACTION#<id>` | `SK = TRANSACTION#<date>#<id>` |
| `SK = CATEGORY#<id>` | `SK = CATEGORY#<id>` (unchanged) |
| `SK = ACCOUNT#<id>` | `SK = ACCOUNT#<id>` (unchanged) |

### 2.3 User profile changes

Fields **removed**: `familyId`, `familyRole`
Fields **added**: `defaultBudgetId`
Fields **unchanged**: `userId`, `email`, `firstName`, `lastName`, `currency`, `subscriptionTier`, `onboardingCompleted`

---

## 3. Lambda Changes

### 3.1 `backend/functions/auth/index.js` — Registration (REQ-1, REQ-13)

Replace the current 3-item DynamoDB transaction with:

```
1. USER#<userId> / PROFILE
   - defaultBudgetId: budgetId
   - subscriptionTier: 'free'
   - onboardingCompleted: false
   - (no familyId, no familyRole)

2. BUDGET#<budgetId> / METADATA
   - budgetId
   - name: "<firstName>'s Budget"
   - budgetType: 'personal'
   - ownerUserId: userId
   - currency: 'USD'
   - status: 'active'

3. BUDGET#<budgetId> / MEMBER#<userId>
   - budgetId, userId
   - role: 'owner', status: 'active'
   - GSI1PK: USER#<userId>, GSI1SK: BUDGET#<budgetId>
   - joinedAt: now, invitedBy: null
```

Cognito attributes written: only `custom:userId`.

### 3.2 `backend/functions/auth-onboarding/index.js` — Onboarding (REQ-2, REQ-12)

- Read `defaultBudgetId` from user profile
- Write budget period to `BUDGET#<defaultBudgetId> / PERIOD#<month>`
- Remove `FamilyIdResolver` import
- Accept `budgetType: 'personal' | 'family' | 'shared'` in request body
- Update the budget's `budgetType` in DynamoDB if user selects family or shared

### 3.3 Budget Lambda (REQ-3)

At the top of every handler:
```javascript
const { budgetId, role, budgetType, budgetStatus, subscriptionTier } =
  await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers);
```

Key changes:
- `FAMILY#${familyId}` → `BUDGET#${budgetId}`
- `BUDGET#${month}` → `PERIOD#${month}`

### 3.4 Transactions Lambda (REQ-3)

Same pattern. Permission checks:
- GET → `assertPermission(role, 'transaction.read', budgetStatus)`
- POST → `assertPermission(role, 'transaction.create', budgetStatus)`
- PUT → `assertPermission(role, 'transaction.edit', budgetStatus)`
- DELETE → `assertPermission(role, 'transaction.delete', budgetStatus)`

### 3.5 `backend/functions/family/index.js` → `backend/functions/budgets/index.js` (REQ-4–8, REQ-15)

New directory `backend/functions/budgets/`. All `familyId` → `budgetId`.

**New `handleGetBudgets`:**
```javascript
async function handleGetBudgets(userId) {
  const memberships = await dynamodb.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :userKey',
    ExpressionAttributeValues: { ':userKey': `USER#${userId}` },
  }));

  const budgets = await Promise.all(
    memberships.Items
      .filter(m => m.status === 'active')
      .map(async (m) => {
        const budget = await dynamodb.send(new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: `BUDGET#${m.budgetId}`, SK: 'METADATA' },
        }));
        return {
          budgetId: m.budgetId,
          name: budget.Item?.name,
          budgetType: budget.Item?.budgetType,
          status: budget.Item?.status,
          role: m.role,
          accessLabel: m.accessLabel,
          expiresAt: m.expiresAt || null,
        };
      })
  );

  return successResponse({ budgets });
}
```

### 3.6 Accounts, Goals, AI Lambdas (REQ-3)

Same `BudgetAccessResolver` pattern. All `FAMILY#${familyId}` → `BUDGET#${budgetId}`.

---

## 4. Infrastructure Changes (CDK)

### 4.1 `infrastructure/lib/api-family-stack.ts` → `api-budgets-stack.ts`

- Lambda function name: `budgetbuddy-budgets`
- API Gateway routes: `/budgets/*`
- Lambda code: `backend/functions/budgets/`
- Same DynamoDB permissions and IAM policy

### 4.2 `infrastructure/lib/auth-stack.ts`

Mark `custom:familyId` and `custom:familyRole` as optional (cannot delete from Cognito schema).
Ensure `custom:userId` remains the only attribute written during registration.

### 4.3 CDK app entry point

Replace `ApiFamilyStack` with `ApiBudgetsStack`.

### 4.4 Migration script

New file: `scripts/migrate-budget-model.js`
- Scan and batch-delete all DynamoDB items (25 per `BatchWriteItem`)
- List and delete all Cognito users
- Support `--dry-run` flag

---

## 5. Frontend Changes

### 5.1 `packages/web-app/src/services/budgetService.ts`

Replaces `familyService.ts`. Key methods:
- `getBudgets()` — GET `/budgets`
- `setActiveBudget(budgetId)` — PUT `/budgets/active`
- `createBudget(name, budgetType, currency)` — POST `/budgets`
- `inviteMember(budgetId, email, role, expiresAt?)` — POST `/budgets/{budgetId}/invite`
- `extendViewerAccess(budgetId, userId, expiresAt)` — PUT `/budgets/{budgetId}/members/{userId}/extend`
- `archiveBudget(budgetId)` — PUT `/budgets/{budgetId}/archive`
- `deleteBudget(budgetId)` — DELETE `/budgets/{budgetId}`

### 5.2 `BudgetSwitcher.tsx`

Shown in app header when `budgets.length > 1`. Calls `budgetService.setActiveBudget(budgetId)`.

### 5.3 Onboarding — budget type selection (REQ-12)

New step before budget setup:
```
What kind of budget are you creating?
○ Personal Budget — just for me
○ Family Budget — for me and my spouse/partner
○ Shared Budget — for roommates or shared expenses
```

For Family Budget, show transparency disclosure modal.

### 5.4 Members/sharing UI (REQ-5, REQ-7)

`FamilySettings.tsx` → `BudgetMembersPage.tsx`:
- Role selector: Partner, Household Member, Viewer
- Viewer invitation: expiry picker (30/60/90 days / No expiry)
- Member list shows `accessLabel` and `expiresAt` for viewer rows
- "Revoke" and "Extend" buttons for viewer rows
- "Archive Budget" and "Delete Budget" buttons (Owner only)

### 5.5 `AcceptInvitationPage.tsx`

Update success handler to use `budgetId` from API response. No token refresh needed.

### 5.6 `AuthContext.tsx`

Remove `familyId` and `familyRole` from context state. Budget resolution is server-side.
