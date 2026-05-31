# Family Invitation Pending Fix — Bugfix Design

## Overview

The `handleGetInvitations` function in `backend/functions/family/index.js` uses `begins_with(GSI4PK, :invPrefix)` as a `KeyConditionExpression` on a DynamoDB GSI partition key. DynamoDB only supports exact equality (`=`) on partition keys in key condition expressions — `begins_with` is only valid on sort keys. This causes the query to fail with a validation error, which the backend catches and returns as a 500 (or empty result). The frontend silently swallows the error and leaves `pendingInvitations` as `[]`, so the conditionally-rendered "Pending Invitations" section never appears.

The fix replaces the invalid GSI4 query with a Scan + FilterExpression approach (since there is no GSI that partitions invitations by familyId), and adds error visibility in the frontend so silent API failures are surfaced to the user.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — any call to `handleGetInvitations` that attempts to query GSI4 with `begins_with` on the partition key `GSI4PK`
- **Property (P)**: The desired behavior — `handleGetInvitations` returns all pending invitations for the given `familyId`
- **Preservation**: Existing invitation creation, cancellation, resend, role-based access control, and conditional UI rendering must remain unchanged
- **handleGetInvitations**: The function in `backend/functions/family/index.js` that queries pending invitations for a family
- **GSI4**: Global Secondary Index with `GSI4PK = INVITATION#<email>` and `GSI4SK = CREATED#<timestamp>` — designed for per-email lookups, not per-family lookups
- **FamilySettings**: The React component in `packages/web-app/src/components/FamilySettings.tsx` that renders the Family Members page including the Pending Invitations section

## Bug Details

### Bug Condition

The bug manifests when a primary user navigates to the Family Members page and the frontend calls `GET /family/invitations`. The `handleGetInvitations` function constructs a DynamoDB `QueryCommand` using `begins_with(GSI4PK, :invPrefix)` as the `KeyConditionExpression`. Since `GSI4PK` is a partition key, DynamoDB rejects `begins_with` — only exact `=` is allowed on partition keys. The query either throws a `ValidationException` or returns no results.

**Formal Specification:**

```
FUNCTION isBugCondition(input)
  INPUT: input of type { familyId: string, familyRole: string }
  OUTPUT: boolean

  RETURN input.familyRole = "primary"
         AND familyHasPendingInvitations(input.familyId)
         AND queryUsesBeginsWith_OnPartitionKey("GSI4PK")
END FUNCTION
```

### Examples

- Primary user with 2 pending invitations navigates to Family Members → Expected: sees "Pending Invitations" section with 2 entries. Actual: section is hidden, `pendingInvitations` is `[]`
- Primary user tries to invite `partner@example.com` which already has a pending invitation → Expected: sees existing invitation in Pending Invitations with Cancel button. Actual: gets "Pending invitation already exists for this email" error with no way to resolve it
- Primary user with 1 pending invitation and 1 expired invitation → Expected: sees only the pending one. Actual: sees nothing
- Non-primary user navigates to Family Members → Expected: no invitations fetched (403). Actual: no invitations fetched (403) — this case is unaffected by the bug

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- Non-primary users (spouse, viewer) must continue to receive a 403 when attempting to view invitations
- Invitation creation via `POST /family/invite` must continue to work (uses correct `GSI4PK = :email` query)
- Invitation cancellation via `DELETE /family/invitations/{id}` must continue to work (uses `GetCommand` on main table PK/SK)
- Invitation resend via `POST /family/invitations/{id}/resend` must continue to work (uses `GetCommand` on main table PK/SK)
- When there are zero pending invitations, the "Pending Invitations" section must remain hidden (conditional rendering on empty array is correct)
- Mouse clicks, form submissions, and all other UI interactions must remain unchanged

**Scope:**
All inputs that do NOT involve the `GET /family/invitations` endpoint query logic should be completely unaffected by this fix. This includes:

- All other family API endpoints (members, invite, accept, leave, role changes)
- Frontend rendering logic (only the error handling around the invitations fetch changes)
- DynamoDB table schema and GSI definitions (no schema changes needed)

## Hypothesized Root Cause

Based on the code analysis, the root cause is confirmed:

1. **Invalid DynamoDB KeyConditionExpression**: In `handleGetInvitations` (line ~1112), the query uses:

   ```js
   KeyConditionExpression: "begins_with(GSI4PK, :invPrefix)";
   ```

   DynamoDB requires exact equality (`=`) on partition keys. `begins_with` is only valid on sort keys. This causes a `ValidationException`.

2. **Wrong GSI for the access pattern**: GSI4 is designed for per-email lookups (`GSI4PK = INVITATION#<email>`). There is no GSI that partitions invitations by `familyId`. The original code attempted to work around this by scanning all `INVITATION#*` entries on GSI4 and filtering by `familyId`, but the `begins_with` on the partition key is invalid.

3. **Silent frontend error swallowing**: In `FamilySettings.tsx` (line ~97), the invitations fetch is wrapped in a try/catch that logs to console but does not surface the error to the user:
   ```tsx
   } catch (invErr) {
     console.error("Failed to load invitations:", invErr);
     // Don't fail the whole load if invitations fail
   }
   ```
   This means the user sees no indication that invitations failed to load.

## Correctness Properties

Property 1: Bug Condition — Pending Invitations Are Returned

_For any_ primary user whose family has one or more pending invitations, the fixed `handleGetInvitations` function SHALL return all pending invitations for that family with correct `invitationId`, `email`, `role`, `status`, `createdAt`, and `expiresAt` fields.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation — Non-Primary Access Denied

_For any_ user with a role other than "primary" (spouse, viewer), the fixed `handleGetInvitations` function SHALL return a 403 error, preserving the existing role-based access control.

**Validates: Requirements 3.1**

Property 3: Preservation — Empty Invitations Return Empty Array

_For any_ primary user whose family has zero pending invitations, the fixed `handleGetInvitations` function SHALL return an empty invitations array with count 0, preserving the conditional rendering behavior that hides the Pending Invitations section.

**Validates: Requirements 3.5**

## Fix Implementation

### Changes Required

**File**: `backend/functions/family/index.js`

**Function**: `handleGetInvitations`

**Specific Changes**:

1. **Replace invalid GSI4 query with a Scan + FilterExpression**: Since no GSI partitions invitations by `familyId`, use a `ScanCommand` with a `FilterExpression` that matches items where `GSI4PK` begins with `INVITATION#` and `familyId` equals the target family. This is acceptable because the total number of invitations in the system is expected to be small (family app, not high-scale).

   Alternatively, query the main table using a `begins_with` on the sort key: items are stored with `PK: INVITATION#<id>, SK: METADATA`. However, since invitations are not stored under `FAMILY#<familyId>` as PK, a Scan is the most straightforward approach without schema changes.

2. **Add status filter**: Filter for `status = "pending"` to only return active invitations (not accepted, expired, or revoked ones).

**File**: `packages/web-app/src/components/FamilySettings.tsx`

**Function**: `loadFamilyMembers` (invitations fetch block)

**Specific Changes**: 3. **Surface invitation loading errors**: Instead of silently catching and ignoring the error, set an `invitationError` state (or use the existing `error` state with a non-blocking warning) so the user knows invitations failed to load.

4. **Add non-ok response handling**: The current code only checks `invitationsResponse.ok` but doesn't parse or display the error body. Add error message extraction from the response.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that the root cause is the invalid `begins_with` on GSI4PK.

**Test Plan**: Write unit tests that mock DynamoDB and call `handleGetInvitations` with a valid `familyId` and `familyRole = "primary"`. Verify that the current code constructs an invalid query. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:

1. **Invalid Query Detection**: Call `handleGetInvitations` with a family that has pending invitations — verify the DynamoDB query uses `begins_with` on partition key (will fail/return 500 on unfixed code)
2. **Empty Result Despite Data**: Mock DynamoDB to return empty Items for the invalid query pattern — verify invitations array is empty even when data exists (will demonstrate the bug)
3. **Error Propagation**: Verify that when the backend returns a 500, the frontend silently swallows it (will demonstrate the silent failure)

**Expected Counterexamples**:

- `handleGetInvitations` returns 500 or empty array when invitations exist for the family
- Possible causes: `begins_with` on partition key causes `ValidationException`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**

```
FOR ALL input WHERE isBugCondition(input) DO
  result := handleGetInvitations_fixed(input.familyId, "primary")
  ASSERT result.statusCode = 200
  ASSERT result.body.invitations contains all pending invitations for input.familyId
  ASSERT each invitation has invitationId, email, role, status, createdAt, expiresAt
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**

```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT handleGetInvitations_original(input) = handleGetInvitations_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:

- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-primary role access and empty invitation scenarios, then write property-based tests capturing that behavior.

**Test Cases**:

1. **Non-Primary Role Preservation**: Observe that non-primary users get 403 on unfixed code, then verify this continues after fix
2. **Empty Family Preservation**: Observe that families with no invitations return empty array on unfixed code, then verify this continues after fix
3. **Other Endpoint Preservation**: Verify that invitation creation, cancellation, and resend endpoints continue working after fix

### Unit Tests

- Test `handleGetInvitations` returns correct invitations for a family with pending invitations (mocked DynamoDB)
- Test `handleGetInvitations` returns 403 for non-primary users
- Test `handleGetInvitations` returns empty array when no invitations exist
- Test `handleGetInvitations` filters by `familyId` correctly (doesn't return other families' invitations)
- Test `handleGetInvitations` only returns pending invitations (not accepted/expired/revoked)

### Property-Based Tests

- Generate random familyIds and invitation sets, verify `handleGetInvitations` returns exactly the invitations matching the target familyId with status "pending"
- Generate random non-primary roles (spouse, viewer, arbitrary strings), verify all get 403
- Generate random invitation states (pending, accepted, expired, revoked), verify only pending ones are returned

### Integration Tests

- Test full flow: create invitation → get invitations → verify invitation appears in list
- Test full flow: create invitation → cancel invitation → get invitations → verify invitation is gone
- Test frontend: mock API returning invitations → verify Pending Invitations section renders with correct data
- Test frontend: mock API returning error → verify error message is displayed to user
