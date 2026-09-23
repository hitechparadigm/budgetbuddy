# Requirements Document

## Introduction

BudgetBuddy currently stores all budget data under `FAMILY#<familyId>` partition keys, with a hard cap of 2 members per family and roles `primary | spouse | viewer`. This model works for a couple but breaks for roommates, adult children, financial advisors, and multi-budget households.

This spec redesigns the data model so that **users own accounts, budgets own financial data, and memberships control access**. The change also structurally eliminates the stale-JWT family-ID bug because the JWT no longer carries `familyId` — budget membership is resolved from DynamoDB on every request.

## Overview

The core architectural shift:

- **Before:** `FAMILY#<familyId>` owns all budget data. JWT carries `familyId`. Hard cap of 2 members.
- **After:** `BUDGET#<budgetId>` owns all financial data. JWT carries only `userId`. `BudgetAccessResolver` reads membership from DynamoDB on every request.

The user-facing term is **Budget** (Personal Budget, Family Budget, Shared Budget). The backend container entity is also called **Budget**. Monthly budget data lives in **BudgetPeriod** records.

---

## Glossary

| Term | Definition |
|---|---|
| **Budget** | The long-lived budget container. Replaces the `FAMILY#` concept. A user can belong to multiple budgets. User-facing and backend term. |
| **BudgetMember** | A record linking a user to a budget with a specific role, status, and optional expiry. |
| **BudgetPeriod** | A monthly zero-based budget inside a Budget. Replaces `BUDGET#<month>` under `FAMILY#`. |
| **Owner** | The user who created the budget. Full admin rights including delete, archive, and member management. |
| **Partner** | Trusted co-budgeter (spouse/common-law partner). Full read/write access. On family budgets, sees everything with no restrictions. |
| **Household Member** | Adult child, parent, or in-law who is part of the household budget. Can add/edit transactions but cannot manage the budget. |
| **Viewer** | Read-only access, optionally time-limited. Used for financial advisors, accountants, adult children learning budgeting. |
| **Personal Budget** | A `budgetType = personal` budget owned by one user. Private — no other members. Created automatically at registration. |
| **Family Budget** | A `budgetType = family` budget with full transparency. Owner and Partner see all data equally. No hidden categories or private transactions. |
| **Shared Budget** | A `budgetType = shared` budget for limited shared expenses (roommates, household costs). Members keep their own personal budgets. |
| **defaultBudgetId** | The budget a user sees by default when they open the app. Stored on the user profile in DynamoDB. |
| **BudgetAccessResolver** | The backend utility that replaces `FamilyIdResolver`. Reads `defaultBudgetId` and membership from DynamoDB on every request. |
| **Entitlement** | A feature permission (e.g. `viewer.invite`, `budget.shared.create`). Checked via `canUseFeature()`. Phase 1 establishes the pattern; Phase 2 wires it to subscriptions. |

---

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Migration strategy | Delete all existing user data and start fresh | No production users yet; clean slate is simpler and safer than a live migration |
| Roles | Owner, Partner, Household Member, Viewer | Four roles cover all real-world use cases without over-engineering |
| Viewer expiry | Included in Phase 1 | Key differentiator; simple to implement alongside the membership record |
| Budget types | personal, family, shared | Drives transparency rules and onboarding UX |
| Entitlement check pattern | Included in Phase 1 | `canUseFeature()` function and feature key constants must be established now so no Lambda hard-codes tier checks; Phase 2 wires it to Stripe |
| Subscription groups | Phase 2 | Requires billing integration; schema is already ready (membership records work the same way) |
| Budget status field | Included in Phase 1 | `active \| archived \| deleted` must be defined now so Lambdas handle all states; full archive/delete UI can be minimal |
| Subscription billing | Phase 2 | Entitlement system is separate from access control; not needed for MVP |
| Naming | Budget (container) / BudgetPeriod (monthly) / BudgetAccessResolver | Avoids "Plan" ambiguity once subscriptions are added (SubscriptionPlan vs Budget Plan vs Family Plan) |

---

## Entities

### Budget
The long-lived budget container. Replaces the `FAMILY#` partition key concept.

```
Budget {
  budgetId        // budget_<uuid>
  name            // "Personal Budget", "Family Budget", "House Budget"
  budgetType      // personal | family | shared
  ownerUserId
  currency
  country
  status          // active | archived | deleted
  createdAt
  updatedAt
}
```

**Budget type rules:**
- `personal` — one user only, private
- `family` — full transparency; Owner and Partner see everything; no hidden categories, accounts, or transactions
- `shared` — limited shared expenses only; each member keeps their own personal budget

### BudgetMember
Controls who can access a Budget and what they can do.

```
BudgetMember {
  budgetId
  userId
  role            // owner | partner | household_member | viewer
  status          // active | invited | expired | revoked | left
  accessLabel     // "Spouse", "Partner", "Advisor", "Adult Child", "Roommate", custom
  joinedAt
  invitedBy
  expiresAt?      // viewers only — null means no expiry
  historyAccess   // full | from_join_date
  createdAt
}
```

### BudgetPeriod
Replaces `BUDGET#<month>` under `FAMILY#`. Now lives under `BUDGET#`.

```
BudgetPeriod {
  budgetId
  month           // 2026-06
  totalIncome
  totalSavings
  totalExpenses
  remainingBalance
  groups: { income: [], savings: [], expenses: [] }
  isAIGenerated
  createdAt
  updatedAt
}
```

All other entities (transactions, categories, accounts, goals, rollovers, AI suggestions, reports, exports, notifications) also move from `FAMILY#` to `BUDGET#`.

### User (updated)
```
User {
  userId
  email
  firstName
  lastName
  defaultBudgetId   // the budget shown on first load
  currency
  subscriptionTier
  onboardingCompleted
  createdAt
  updatedAt
}
```

`familyId` and `familyRole` are **removed** from the user profile. Membership is now in `BudgetMember`.

---

## Roles and Permissions

| Action | Owner | Partner | Household Member | Viewer |
|---|---|---|---|---|
| View budget periods | ✅ | ✅ | ✅ | ✅ |
| View transactions | ✅ | ✅ | ✅ | ✅ |
| View categories | ✅ | ✅ | ✅ | ✅ |
| View accounts | ✅ | ✅ | ✅ | ✅ |
| View reports | ✅ | ✅ | ✅ | ✅ |
| Add transaction | ✅ | ✅ | ✅ | ❌ |
| Edit transaction | ✅ | ✅ | ✅ | ❌ |
| Delete transaction | ✅ | ✅ | ❌ | ❌ |
| Edit budget categories | ✅ | ✅ | ❌ | ❌ |
| Edit budget amounts | ✅ | ✅ | ❌ | ❌ |
| Manage accounts | ✅ | ✅ | ❌ | ❌ |
| Invite members | ✅ | ✅ (family budgets only) | ❌ | ❌ |
| Remove members | ✅ | ❌ | ❌ | ❌ |
| Export data | ✅ | ✅ | ❌ | ❌ |
| Archive/delete budget | ✅ | ❌ | ❌ | ❌ |
| Transfer ownership | ✅ | ❌ | ❌ | ❌ |

**Family budget rule:** On a `family` budget, Owner and Partner have identical visibility — no hidden categories, accounts, transactions, savings goals, or debt. This is enforced at the API layer, not just the UI.

---

## DynamoDB Key Schema

```
# Budget metadata
PK = BUDGET#<budgetId>
SK = METADATA

# Budget membership (one record per user per budget)
PK = BUDGET#<budgetId>
SK = MEMBER#<userId>
GSI1PK = USER#<userId>      ← query all budgets a user can access
GSI1SK = BUDGET#<budgetId>

# Budget period (monthly budget)
PK = BUDGET#<budgetId>
SK = PERIOD#<month>         e.g. PERIOD#2026-06

# Transaction
PK = BUDGET#<budgetId>
SK = TRANSACTION#<date>#<transactionId>

# Category
PK = BUDGET#<budgetId>
SK = CATEGORY#<categoryId>

# Account
PK = BUDGET#<budgetId>
SK = ACCOUNT#<accountId>

# Invitation
PK = INVITATION#<invitationId>
SK = METADATA
GSI4PK = INVITATION#<email>   ← existing GSI, unchanged
GSI4SK = CREATED#<timestamp>

# User profile
PK = USER#<userId>
SK = PROFILE
```

---

## Requirements

### REQ-1: Budget creation on registration

**When** a new user registers (email/password or Google OAuth),
**Then** the system creates:
1. A `USER#<userId> / PROFILE` record with `defaultBudgetId` set
2. A `BUDGET#<budgetId> / METADATA` record with `budgetType = personal`
3. A `BUDGET#<budgetId> / MEMBER#<userId>` record with `role = owner`

The `familyId` field is **not** written to the user profile. The `FAMILY#` partition is **not** created.

**Edge cases:**
- Google OAuth new user: same flow, `authProvider = google`
- Registration failure after Cognito user created: DynamoDB transaction rolls back atomically

---

### REQ-2: Onboarding creates budget period under the user's personal budget

**When** a user completes onboarding,
**Then** the budget period is written to `BUDGET#<defaultBudgetId> / PERIOD#<month>`, not `FAMILY#<familyId>`.

The `defaultBudgetId` is read from the user's DynamoDB profile, not from the JWT.

---

### REQ-3: All budget API calls resolve budgetId from DynamoDB, not JWT

**When** any Lambda (budget, transactions, categories, accounts, goals, AI) receives a request,
**Then** it:
1. Extracts `userId` from the Cognito JWT (unchanged)
2. Reads `defaultBudgetId` from `USER#<userId> / PROFILE` in DynamoDB
3. Verifies `BUDGET#<budgetId> / MEMBER#<userId>` exists with `status = active`
4. Checks `expiresAt` if present (viewer expiry)
5. Checks role permissions for the requested action
6. Returns data from `BUDGET#<budgetId>`

The JWT carries **no** `familyId` or `budgetId`. This eliminates the stale-JWT bug structurally.

**Edge case:** If `defaultBudgetId` is null or the membership record is missing, return 403 with message "No active budget found. Please complete onboarding."

---

### REQ-4: Budget switcher — user can belong to multiple budgets

**When** a user is a member of more than one budget,
**Then** the API supports:
- `GET /budgets` — returns all budgets the user has active membership in (query GSI1PK = `USER#<userId>`)
- `PUT /budgets/active` — sets `defaultBudgetId` on the user profile

The frontend shows a budget switcher (like Slack workspaces) when the user has more than one budget.

---

### REQ-5: Invitations are budget-scoped, not family-scoped

**When** an Owner (or Partner on a family budget) sends an invitation,
**Then** the invitation record includes `budgetId` (not `familyId`).

The invitation token is:
- Random, cryptographically secure (32 bytes hex)
- Stored hashed in DynamoDB
- Single-use
- Expires in 7 days
- Tied to the invited email address
- Tied to one `budgetId` and one `role`

**Roles that can be invited:** partner, household_member, viewer

**Edge cases:**
- Inviting someone already in the budget → 409 Conflict
- Inviting to a `personal` budget → 400 Bad Request (personal budgets cannot have members)
- Inviting more than 1 partner to a `family` budget → 409 Conflict (max 1 partner)
- Forwarded invite accepted by wrong email → 403 Forbidden

---

### REQ-6: Accepting an invitation sets budget membership, not familyId

**When** a user accepts an invitation,
**Then**:
1. A `BUDGET#<budgetId> / MEMBER#<userId>` record is created with the invited role
2. The user's `defaultBudgetId` is updated to the new budget (they are now viewing the shared budget by default)
3. The user's **personal budget is preserved** — it is not deleted or archived
4. `onboardingCompleted = true` is set on the user profile (invited users skip onboarding)
5. The invitation record status is set to `accepted`

**No `familyId` is written to the user profile.** The JWT does not need to be refreshed because budget resolution uses DynamoDB, not the JWT.

**Edge cases:**
- User already in another budget as partner → must leave that budget first (return 409 with clear message)
- Budget is full (family budget already has a partner) → 409 Conflict
- Invitation expired → 400 with message to request a new invitation

---

### REQ-7: Viewer access with time-limited expiry

**When** an Owner invites someone as a Viewer,
**Then** the invitation UI offers expiry options: 30 days, 60 days, 90 days, or no expiry.

The `expiresAt` field is stored on the `BudgetMember` record.

**On every API request** for a viewer:
- If `expiresAt` is set and `expiresAt < now`, return 403 with message "Your viewer access has expired. Contact the budget owner to renew."
- The membership `status` is **not** automatically updated to `expired` on read — expiry is checked inline. A background job (or next-access check) can update the status.

**Owner UI shows:**
- Viewer name, access label (e.g. "Financial Advisor"), expiry date
- "Revoke access" button
- "Extend access" button (re-sets `expiresAt`)

**Edge cases:**
- Viewer tries to write data → 403 regardless of expiry
- Owner revokes access → membership `status = revoked`, immediate effect
- Viewer has no expiry set → access is permanent until revoked

---

### REQ-8: Leaving a budget restores the user's personal budget

**When** a non-Owner member leaves a budget,
**Then**:
1. The `BUDGET#<budgetId> / MEMBER#<userId>` record is deleted
2. The user's `defaultBudgetId` is set back to their personal budget (looked up from GSI1)
3. The user's personal budget (created at registration) is still intact — it was never deleted

**When** an Owner tries to leave,
**Then** return 400: "You cannot leave a budget you own. Transfer ownership first, or archive the budget."

**Edge cases:**
- User's personal budget was deleted (edge case) → create a new personal budget on leave
- Owner removes a member (not the member leaving) → same membership deletion + defaultBudgetId restoration for the removed user

---

### REQ-9: Budget type transparency enforcement

**When** a budget has `budgetType = family`,
**Then** the API enforces:
- No `visibleToUserIds` filter on any query
- No `isPrivate` flag on transactions, categories, or accounts
- All data in the budget is visible to all Owner and Partner members equally

**When** a budget has `budgetType = shared`,
**Then** members see all data in that budget, but their personal budgets remain private.

---

### REQ-10: Migration — delete all existing data

**Since** there are no production users, the migration strategy is:
1. Delete all items from the DynamoDB table
2. Delete all Cognito users from the User Pool
3. Deploy the new Lambda code
4. New registrations use the Budget model from day one

No backward-compatibility bridge is needed. No `legacyFamilyId` field is needed.

---

### REQ-11: Stale-JWT bug is eliminated by architecture

The bug from the old model (invited member sees wrong budget because JWT carries stale `familyId`) **does not exist** in the new model because:

- The JWT carries only `userId` (via `custom:userId` or `sub`)
- No `familyId` or `budgetId` is stored in the JWT or Cognito custom attributes
- Every budget API call reads `defaultBudgetId` from DynamoDB and verifies membership
- Changing budgets (accepting an invitation, leaving a budget) updates DynamoDB immediately and takes effect on the next API call — no token refresh needed

The `FamilyIdResolver` utility in `backend/layers/common/nodejs/utils.js` is **removed** and replaced with a `BudgetAccessResolver` that:
1. Reads `defaultBudgetId` from `USER#<userId> / PROFILE`
2. Reads `BUDGET#<budgetId> / MEMBER#<userId>` to get role and expiry
3. Returns `{ budgetId, role, expiresAt }` or throws 403

---

### REQ-12: Onboarding budget type selection

**When** a user completes onboarding,
**Then** they are asked: "What kind of budget are you creating?"

Options:
- **Personal Budget** — just for me
- **Family Budget** — for me and my spouse/partner; full transparency, both see everything
- **Shared Budget** — for roommates, adult children, or shared expenses only

This sets `budgetType` on the budget created during onboarding.

For **Family Budget**, the UI shows a clear disclosure before proceeding:
> "A Family Budget is a fully transparent household budget. Both partners will see all income, expenses, accounts, debts, savings goals, and transactions. There are no hidden categories or private sections."

---

### REQ-13: Cognito custom attributes cleanup

**When** the new model is deployed,
**Then** the Cognito User Pool no longer uses:
- `custom:familyId`
- `custom:familyRole`

These attributes may remain in the schema for backward compatibility but are **not written** for new users and **not read** by any Lambda.

The only Cognito custom attribute used for identity is `custom:userId`.

---

### REQ-14: Entitlement check pattern established in Phase 1

**Why it's in Phase 1:** If Lambdas hard-code `if (user.subscriptionTier === 'premium')` checks now, every one will need to be ripped out when Phase 2 wires entitlements to Stripe. The check pattern must be consistent from day one.

**The pattern:**

```javascript
// backend/layers/common/nodejs/entitlements.js
const FEATURE_CATALOG = {
  'viewer.invite':        { tier: 'free',    description: 'Invite read-only viewers' },
  'viewer.expiry':        { tier: 'free',    description: 'Set viewer expiration dates' },
  'budget.personal':      { tier: 'free',    description: 'Personal budget' },
  'budget.family':        { tier: 'free',    description: 'Family budget' },
  'budget.shared':        { tier: 'free',    description: 'Shared budget' },
  'member.invite':        { tier: 'free',    description: 'Invite budget members' },
  'budget.ai.generate':   { tier: 'free',    description: 'AI budget generation' },
  'reports.advanced':     { tier: 'premium', description: 'Advanced reports' },
  'budget.export':        { tier: 'premium', description: 'Export budget data' },
};

function canUseFeature(subscriptionTier, featureKey) {
  const feature = FEATURE_CATALOG[featureKey];
  if (!feature) return false;
  if (feature.tier === 'free') return true;
  return subscriptionTier === 'premium';
}
```

**When** any Lambda needs to gate a feature,
**Then** it calls `canUseFeature(user.subscriptionTier, 'feature.key')` — never checks `subscriptionTier` directly.

This means Phase 2 only needs to update `FEATURE_CATALOG` and the `canUseFeature` function — no Lambda business logic changes.

**In Phase 1, all features are available on the free tier** (the catalog above reflects this). Phase 2 moves specific features to `premium`.

---

### REQ-15: Budget status lifecycle

**The Budget entity has `status: active | archived | deleted`.**

**Active:** Normal operation. All members can access according to their role.

**Archived:**
- Only the Owner can archive a budget
- Archived budgets are read-only — no new transactions, budget edits, or member invitations
- All existing members retain read access
- The budget appears in the budget list with an "Archived" badge
- The Owner can restore an archived budget to active

**Deleted (soft delete):**
- Only the Owner can delete a budget
- Deleted budgets are hidden from all members immediately
- Data is retained in DynamoDB for 90 days, then eligible for hard deletion
- A deleted budget cannot be restored via the UI (admin-only operation)
- If a user's `defaultBudgetId` points to a deleted budget, the system falls back to their personal budget

**API endpoints required:**
- `PUT /budgets/{budgetId}/archive` — Owner only
- `PUT /budgets/{budgetId}/restore` — Owner only (archived → active)
- `DELETE /budgets/{budgetId}` — Owner only (soft delete)

**Edge cases:**
- Archiving a budget that is someone's `defaultBudgetId` → their `defaultBudgetId` is updated to their personal budget
- Deleting a personal budget → blocked with 400: "You cannot delete your personal budget"
- Member tries to archive/delete → 403 Forbidden

---

### REQ-16: Subscription groups — schema ready, billing deferred

**The schema supports subscription groups without any changes.** A covered user is simply a user whose `subscriptionTier` is set to `premium` by the group owner's billing event. They still get individual `BudgetMember` records like any other user.

**What Phase 1 establishes:**
- `subscriptionTier` field on the user profile (`free | premium`)
- `canUseFeature()` checks this field
- No `SubscriptionGroup` entity is created yet

**What Phase 2 adds:**
- `SubscriptionGroup` entity (group owner, covered users, billing customer ID)
- Stripe webhook that sets `subscriptionTier = premium` on covered users
- UI for managing covered users

**The key point:** Phase 1 does not block Phase 2. The entitlement check pattern (REQ-14) is the only architectural dependency, and it's being established now.

---

## Out of Scope (Phase 2)

- Subscription groups (SubscriptionGroup entity, Stripe integration, covered-user management)
- Budget-level billing
- Advisor dashboard (view multiple client budgets in one UI)
- Ownership transfer UI
- Hard deletion of archived budgets
- Advanced reports (gated behind premium entitlement, but the reports feature itself is Phase 2)
