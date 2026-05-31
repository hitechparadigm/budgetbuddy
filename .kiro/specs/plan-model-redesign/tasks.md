# Implementation Plan: Budget Model Redesign

## Overview

Migrate BudgetBuddy from a `FAMILY#`-scoped data model to a `BUDGET#`-scoped model with four
roles (owner, partner, household_member, viewer), time-limited viewer access, and a
`BudgetAccessResolver` that eliminates the stale-JWT bug by resolving budget access from
DynamoDB on every request. No backward-compatibility bridge is needed — all existing DynamoDB
data and Cognito users are deleted before deployment.

**Naming conventions:**
- Container entity: `Budget` (was `Plan` / `Family`)
- Monthly budget data: `BudgetPeriod` (was `BudgetMonth`)
- Access resolver: `BudgetAccessResolver` (was `FamilyIdResolver`)
- DynamoDB partition key: `BUDGET#<budgetId>` (was `FAMILY#<familyId>`)
- DynamoDB sort key for monthly data: `PERIOD#<month>` (was `BUDGET#<month>`)
- API routes: `/budgets/*` (was `/family/*`)

## Tasks

- [x] 1. Run migration script to clear existing data
  - [x] 1.1 Create `scripts/migrate-budget-model.js`
    - Scan and batch-delete all DynamoDB items (25 per `BatchWriteItem` call)
    - List and delete all Cognito users from the User Pool
    - Log counts of deleted items; support a `--dry-run` flag
    - Read table name and User Pool ID from environment variables or CDK context
    - _Requirements: REQ-10_
  - [ ]* 1.2 Write unit tests for migration script dry-run mode
    - Mock DynamoDB scan and Cognito list-users responses
    - Verify item counts are logged correctly without any delete calls being made
    - _Requirements: REQ-10_

- [x] 2. Update common layer — `BudgetAccessResolver` and `entitlements.js`
  - [x] 2.1 Remove `FamilyIdResolver` from `backend/layers/common/nodejs/utils.js`
    - Delete the `FamilyIdResolver` object and all helper functions it uses
    - Update `getUserFromEvent` to remove `familyId` and `role` from the returned object
    - Update `generateId` to replace `family` with `budget`
    - _Requirements: REQ-11, REQ-13_
  - [x] 2.2 Add `BudgetAccessResolver` to `backend/layers/common/nodejs/utils.js`
    - Implement `resolveAccess(userId, dynamoHelpers, requestedBudgetId?)`:
      read `USER#<userId>/PROFILE`, then `BUDGET#<budgetId>/MEMBER#<userId>`, then `BUDGET#<budgetId>/METADATA`
    - Implement `assertPermission(role, action, budgetStatus)` with the full 16-action permission matrix
    - Throw `{ statusCode, message }` objects for all error conditions in the Error Handling table
    - Export `BudgetAccessResolver` alongside existing exports
    - _Requirements: REQ-3, REQ-11_
  - [ ]* 2.3 Property test — Property 1: No membership means no access
    - For any `(userId, budgetId)` pair with no active membership, `resolveAccess` must throw 403
    - Use fast-check to generate random userId/budgetId strings; mock `dynamoHelpers` to return
      a valid profile but no membership record; `numRuns: 100`
    - _Requirements: REQ-3_
  - [ ]* 2.4 Property test — Property 2: Viewer role is always read-only
    - For any write action, `assertPermission('viewer', action, 'active')` must throw 403
    - Use `fc.constantFrom` over all write actions; `numRuns: 100`
    - _Requirements: REQ-7_
  - [ ]* 2.5 Property test — Property 3: Expired viewer access is denied
    - For any membership where `expiresAt` is in the past, `resolveAccess` must throw 403
    - Use `fc.date({ max: new Date(Date.now() - 1000) })`; `numRuns: 100`
    - _Requirements: REQ-7_
  - [ ]* 2.6 Property test — Property 4: Archived budgets are read-only for everyone
    - For any role and any write action, `assertPermission(role, action, 'archived')` must throw 403
    - Use `fc.constantFrom` over all roles and write actions; `numRuns: 100`
    - _Requirements: REQ-15_
  - [x] 2.7 Create `backend/layers/common/nodejs/entitlements.js`
    - Implement `FEATURE_CATALOG` with all 9 feature keys from the design
    - Implement `canUseFeature(subscriptionTier, featureKey)`
    - Export `{ FEATURE_CATALOG, canUseFeature }`
    - _Requirements: REQ-14_
  - [ ]* 2.8 Unit tests for `canUseFeature`
    - Test all 9 feature keys for both `free` and `premium` tiers
    - Test unknown feature key returns `false`
    - _Requirements: REQ-14_

- [x] 3. Checkpoint — Ensure all common layer tests pass

- [x] 4. Update shared layer
  - [x] 4.1 Update `backend/layers/shared/nodejs/shared/token-parser.js`
    - Remove any code that reads or writes `custom:familyId` or `custom:familyRole`
    - _Requirements: REQ-13_
  - [x] 4.2 Update `backend/layers/shared/nodejs/shared/validators.js`
    - Replace `validRoles = ['spouse', 'viewer']` with `validRoles = ['partner', 'household_member', 'viewer']`
    - _Requirements: REQ-5_

- [x] 5. Update auth Lambda — registration flow
  - [x] 5.1 Rewrite the DynamoDB transaction in `backend/functions/auth/index.js`
    - Replace existing 3-item transaction with new 3-item transaction:
      `USER#<userId>/PROFILE` (with `defaultBudgetId`, no `familyId`/`familyRole`),
      `BUDGET#<budgetId>/METADATA` (`budgetType: 'personal'`, `ownerUserId`, `status: 'active'`),
      `BUDGET#<budgetId>/MEMBER#<userId>` (`role: 'owner'`, `status: 'active'`, GSI1 fields)
    - Use `generateId.budget()` for the new budgetId
    - Remove all writes of `custom:familyId` and `custom:familyRole` to Cognito
    - Apply same changes to Google OAuth registration path
    - _Requirements: REQ-1, REQ-13_
  - [ ]* 5.2 Unit tests for registration transaction
    - Verify exactly 3 DynamoDB items written with correct PK/SK patterns
    - Verify no `familyId` field on user profile item
    - Verify `defaultBudgetId` on profile matches `budgetId` in budget metadata item
    - Verify Cognito called with only `custom:userId`
    - _Requirements: REQ-1, REQ-13_

- [x] 6. Update auth-onboarding Lambda
  - [x] 6.1 Delete `backend/functions/auth-onboarding/utils/family-id-resolver.js`
    - Remove the file entirely and its import from `index.js`
    - _Requirements: REQ-11_
  - [x] 6.2 Update `backend/functions/auth-onboarding/index.js`
    - Read `defaultBudgetId` from `USER#<userId>/PROFILE` instead of `FamilyIdResolver`
    - Write budget period to `BUDGET#<defaultBudgetId>/PERIOD#<month>`
    - Accept `budgetType: 'personal' | 'family' | 'shared'` in request body
    - Update the budget's `budgetType` in DynamoDB if user selects family or shared
    - Remove all `familyId` references
    - _Requirements: REQ-2, REQ-12_
  - [ ]* 6.3 Unit tests for onboarding
    - Verify period written with `PK = BUDGET#<budgetId>` and `SK = PERIOD#<month>`
    - Verify budget `budgetType` updated when user selects family or shared
    - _Requirements: REQ-2, REQ-12_

- [x] 7. Update budget Lambda
  - [x] 7.1 Replace `FamilyIdResolver` with `BudgetAccessResolver` in `backend/functions/budget/index.js`
    - Call `BudgetAccessResolver.resolveAccess(userId, dynamoHelpers)` at top of every handler
    - Add `assertPermission(role, 'budget.edit', budgetStatus)` before write operations
    - Replace all `FAMILY#${familyId}` → `BUDGET#${budgetId}` and `BUDGET#${month}` → `PERIOD#${month}`
    - _Requirements: REQ-3_
  - [ ]* 7.2 Unit tests for budget Lambda access control
    - Verify viewer role cannot call budget write endpoints (returns 403)
    - Verify archived budget blocks write operations (returns 403)
    - _Requirements: REQ-3_

- [x] 8. Update transactions Lambda
  - [x] 8.1 Replace `FamilyIdResolver` with `BudgetAccessResolver` in `backend/functions/transactions/index.js`
    - Call `resolveAccess` at top of every handler
    - Add `assertPermission` calls per operation
    - Replace all `FAMILY#${familyId}` → `BUDGET#${budgetId}`
    - _Requirements: REQ-3_
  - [ ]* 8.2 Unit tests for transactions Lambda access control
    - Verify household_member cannot delete transactions (returns 403)
    - Verify viewer cannot create or edit transactions (returns 403)
    - _Requirements: REQ-3_

- [x] 9. Update accounts Lambda
  - [x] 9.1 Replace `FamilyIdResolver` with `BudgetAccessResolver` in `backend/functions/accounts/index.js`
    - Call `resolveAccess` at top of every handler
    - Add `assertPermission(role, 'account.manage', budgetStatus)` before write operations
    - Replace all `FAMILY#${familyId}` → `BUDGET#${budgetId}`
    - _Requirements: REQ-3_

- [x] 10. Update goals Lambda
  - [x] 10.1 Replace `FamilyIdResolver` with `BudgetAccessResolver` in `backend/functions/goals/index.js`
    - Same pattern as budget, transactions, and accounts
    - Replace all `FAMILY#${familyId}` → `BUDGET#${budgetId}`
    - _Requirements: REQ-3_

- [x] 11. Update AI Lambda
  - [x] 11.1 Replace `FamilyIdResolver` with `BudgetAccessResolver` in `backend/functions/ai/index.js`
    - Call `resolveAccess` at top of every handler
    - AI budget generation writes to `BUDGET#<budgetId>/PERIOD#<month>`
    - _Requirements: REQ-3_

- [x] 12. Checkpoint — Ensure all Lambda unit tests pass

- [x] 13. Create budgets Lambda (replaces family Lambda)
  - [x] 13.1 Create `backend/functions/budgets/` with `index.js`, `package.json`, `README.md`
    - Copy `backend/functions/family/index.js` as starting point
    - Rename all `familyId` → `budgetId` throughout
    - _Requirements: REQ-4_
  - [x] 13.2 Implement `handleGetBudgets` and `handleSetActiveBudget`
    - `GET /budgets`: query `GSI1PK = USER#<userId>`, batch-fetch budget metadata
    - `PUT /budgets/active`: validate budgetId and membership, update `defaultBudgetId`
    - `POST /budgets`: create new budget with METADATA and MEMBER records
    - _Requirements: REQ-4_
  - [x] 13.3 Implement `handleInvite` with budget-scoped invitation logic
    - Validate `budgetId`; validate `role` is `partner | household_member | viewer`
    - For `viewer`: accept optional `viewerExpiresAt` (30/60/90 days or null)
    - For `partner` on family budget: enforce max 1 partner constraint (409 if exists)
    - Block invitations to `personal` budgets (400)
    - Block inviting existing active member (409)
    - Remove old `memberCount >= 2` hard cap
    - _Requirements: REQ-5_
  - [x] 13.4 Implement `handleAcceptInvitation`
    - Create `BUDGET#<budgetId>/MEMBER#<userId>` with GSI1 fields, role, `expiresAt` from `viewerExpiresAt`
    - Update `defaultBudgetId` on user profile
    - Set `onboardingCompleted = true`
    - Set invitation `status = accepted`
    - Write no `familyId` to user profile
    - _Requirements: REQ-6_
  - [x] 13.5 Implement `handleLeaveBudget` and `handleRemoveMember`
    - `POST /budgets/{budgetId}/leave`: block owner (400); delete membership; restore `defaultBudgetId`
      to personal budget via GSI1 query; if personal budget not found, create a new one
    - `DELETE /budgets/{budgetId}/members/{userId}`: owner-only; delete membership; restore
      `defaultBudgetId` for removed user using same fallback logic
    - _Requirements: REQ-8_
  - [x] 13.6 Implement viewer access management endpoints
    - `PUT /budgets/{budgetId}/members/{userId}/extend`: owner-only; update `expiresAt`
    - `GET /budgets/{budgetId}/members`: return all members with role, accessLabel, expiresAt, status
    - `PUT /budgets/{budgetId}/members/{userId}`: owner-only role update
    - _Requirements: REQ-7_
  - [x] 13.7 Implement budget lifecycle endpoints
    - `PUT /budgets/{budgetId}/archive`: owner-only; set `status = archived`; update `defaultBudgetId`
      for all members whose `defaultBudgetId` is this budget
    - `PUT /budgets/{budgetId}/restore`: owner-only; set `status = active`
    - `DELETE /budgets/{budgetId}`: owner-only; block deletion of personal budgets (400);
      set `status = deleted`; update `defaultBudgetId` for all affected members
    - _Requirements: REQ-15_
  - [ ]* 13.8 Property test — Property 5: Personal budgets cannot have members
    - For any invite to a `budgetType = personal` budget, `handleInvite` must return 400
    - Use fast-check to generate random email/role combinations; `numRuns: 100`
    - _Requirements: REQ-5_
  - [ ]* 13.9 Property test — Property 6: Family budgets have at most one partner
    - For any family budget with one existing partner, a second `role = partner` invite must return 409
    - Use fast-check to generate random invitee emails; `numRuns: 100`
    - _Requirements: REQ-5_
  - [ ]* 13.10 Property test — Property 7: defaultBudgetId always points to an accessible budget
    - After any membership-changing operation, the affected user's `defaultBudgetId` must point
      to a budget they still have active access to; `numRuns: 100`
    - _Requirements: REQ-8, REQ-15_
  - [ ]* 13.11 Unit tests for budgets Lambda
    - Invitation conflict cases: existing member (409), second partner (409), personal budget (400)
    - Leave budget: owner blocked (400), member leaves and defaultBudgetId restored
    - Archive/delete: non-owner blocked (403), personal budget delete blocked (400)
    - _Requirements: REQ-5, REQ-6, REQ-8, REQ-15_

- [x] 14. Checkpoint — Ensure all budgets Lambda tests pass

- [x] 15. Update CDK infrastructure
  - [x] 15.1 Rename `infrastructure/lib/api-family-stack.ts` to `api-budgets-stack.ts`
    - Update Lambda function name to `budgetbuddy-budgets`
    - Update API Gateway routes from `/family/*` to `/budgets/*`
    - Point Lambda code at `backend/functions/budgets/`
    - Keep same DynamoDB permissions and IAM policy
    - _Requirements: REQ-4_
  - [x] 15.2 Update `infrastructure/lib/auth-stack.ts`
    - Mark `custom:familyId` and `custom:familyRole` as optional (cannot delete from Cognito schema)
    - Ensure `custom:userId` remains the only attribute written during registration
    - _Requirements: REQ-13_
  - [x] 15.3 Update CDK app entry point
    - Replace `ApiFamilyStack` with `ApiBudgetsStack`
    - Ensure stack dependencies are wired correctly
    - _Requirements: REQ-4_

- [x] 16. Update frontend service layer
  - [x] 16.1 Create `packages/web-app/src/services/budgetService.ts`
    - Implement all methods: `getBudgets()`, `setActiveBudget(budgetId)`, `createBudget()`,
      `inviteMember()`, `acceptInvitation()`, `getMembers()`, `updateMemberRole()`,
      `removeMember()`, `leaveBudget()`, `extendViewerAccess()`, `archiveBudget()`,
      `restoreBudget()`, `deleteBudget()`
    - All endpoints use `/budgets/*`; use `fetch` (no axios)
    - _Requirements: REQ-4, REQ-5, REQ-6, REQ-7, REQ-8, REQ-15_
  - [x] 16.2 Remove or archive `packages/web-app/src/services/familyService.ts`
    - Replace all imports of `familyService` with `budgetService`
    - _Requirements: REQ-4_

- [x] 17. Update frontend context and auth state
  - [x] 17.1 Update `packages/web-app/src/contexts/AuthContext.tsx`
    - Remove `familyId` and `familyRole` from context state and all related types
    - Remove any localStorage reads/writes for `familyId`
    - _Requirements: REQ-13_

- [x] 18. Update frontend pages and components
  - [x] 18.1 Create `packages/web-app/src/components/BudgetSwitcher.tsx`
    - Show in app header when `budgets.length > 1`
    - Display budget name and type badge (personal / family / shared)
    - On selection, call `budgetService.setActiveBudget(budgetId)` then reload budget data
    - _Requirements: REQ-4_
  - [x] 18.2 Update `packages/web-app/src/pages/OnboardingPage.tsx`
    - Add budget type selection step: Personal Budget, Family Budget, Shared Budget
    - For Family Budget, show transparency disclosure modal
    - Pass `budgetType` in the onboarding API request body
    - _Requirements: REQ-12_
  - [x] 18.3 Rewrite `packages/web-app/src/pages/FamilySettings.tsx` as `BudgetMembersPage.tsx`
    - Role selector: Partner, Household Member, Viewer
    - Viewer invitation: expiry picker (30/60/90 days / No expiry)
    - Member list shows `accessLabel` and `expiresAt` for viewer rows
    - "Revoke" and "Extend" buttons for viewer rows
    - "Archive Budget" and "Delete Budget" buttons (Owner only)
    - _Requirements: REQ-5, REQ-7, REQ-15_
  - [x] 18.4 Update `packages/web-app/src/pages/AcceptInvitationPage.tsx`
    - Update success handler to use `budgetId` from API response
    - _Requirements: REQ-6_

- [x] 19. Final checkpoint — Ensure all tests pass and lint is clean

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The migration script (Task 1) must be run before deploying new Lambda code
- Property tests use fast-check with `numRuns: 100` minimum
- The `budgets` Lambda directory is new — the old `family` Lambda is left in place until
  the CDK stack is updated and deployment is verified
- GSI1 already exists in the DynamoDB table; no schema change needed — only usage changes
- Cognito custom attributes `custom:familyId` and `custom:familyRole` cannot be deleted from
  the User Pool schema, but must be made optional and must not be written by any Lambda

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3"] },
    { "wave": 4, "tasks": ["4"] },
    { "wave": 5, "tasks": ["5", "6", "7", "8", "9", "10", "11"] },
    { "wave": 6, "tasks": ["12"] },
    { "wave": 7, "tasks": ["13"] },
    { "wave": 8, "tasks": ["14"] },
    { "wave": 9, "tasks": ["15"] },
    { "wave": 10, "tasks": ["16", "17", "18"] },
    { "wave": 11, "tasks": ["19"] }
  ]
}
```
