# onboarding-403-fix Bugfix Design

## Overview

The `auth-onboarding` Lambda throws HTTP 403 "No active budget found. Please complete
registration." for every brand-new user because it reads `USER#<userId>/PROFILE`, finds no
`defaultBudgetId`, and immediately throws before any budget-creation logic runs. This is a
chicken-and-egg problem: `auth-register` intentionally creates the profile without a budget,
and `auth-onboarding` is the endpoint that is supposed to create it.

The fix removes the early-exit guard on missing `defaultBudgetId` and replaces it with
first-time onboarding logic: generate a new `budgetId`, write `BUDGET#<budgetId>/METADATA`,
`BUDGET#<budgetId>/MEMBER#<userId>` (role: `owner`), `BUDGET#<budgetId>/PERIOD#<month>`, and
`BUDGET#<budgetId>/ACCOUNT#<cashId>` to DynamoDB, then update `USER#<userId>/PROFILE` with
`defaultBudgetId` and `onboardingCompleted = true`.

Re-onboarding (profile already has `defaultBudgetId`) returns HTTP 409 to prevent duplicate
budget creation. All other error paths (401, 400, 403 profile-not-found, 500 verification
failure) are unchanged.

The fix is confined to `backend/functions/auth-onboarding/index.js`. No new dependencies are
introduced; the existing local `./utils/dynamo-helpers` (`getItem`, `putItem`) and the
`UpdateItemCommand` already imported from `@aws-sdk/client-dynamodb` are sufficient.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — the user profile exists in
  DynamoDB but has no `defaultBudgetId` (first-time onboarding state).
- **Property (P)**: The desired behavior when C holds — onboarding completes successfully
  (HTTP 200), all required DynamoDB records are written, and `defaultBudgetId` is persisted
  to the profile.
- **Preservation**: All existing behavior for inputs where C does NOT hold must remain
  identical after the fix.
- **`isBugCondition(X)`**: Pseudocode predicate that returns `true` when the bug is
  triggered (profile exists, `defaultBudgetId` absent).
- **`completeOnboarding(X)`**: The original (unfixed) handler function.
- **`completeOnboarding'(X)`**: The fixed handler function.
- **`defaultBudgetId`**: The field on `USER#<userId>/PROFILE` that links a user to their
  active budget. Absent on profiles created by `auth-register`.
- **`METADATA` record**: `BUDGET#<budgetId> / METADATA` — stores `budgetType`, `status`,
  `createdAt`, etc.
- **`MEMBER#<userId>` record**: `BUDGET#<budgetId> / MEMBER#<userId>` — stores `role`,
  `status`, `joinedAt`.
- **`PERIOD#<month>` record**: `BUDGET#<budgetId> / PERIOD#<YYYY-MM>` — the monthly budget
  period with income/savings/expense groups.
- **`ACCOUNT#<id>` record**: `BUDGET#<budgetId> / ACCOUNT#<id>` — the default Cash account.
- **`BudgetAccessResolver`**: Common-layer utility that resolves `budgetId` and `role` from
  DynamoDB on every request. Lives in `backend/layers/common/nodejs/utils.js`. **Not
  modified by this fix.**

---

## Bug Details

### Bug Condition

The bug manifests when a newly registered user (whose `USER#<userId>/PROFILE` record was
created by `auth-register` without a `defaultBudgetId`) calls `POST /auth/onboarding` with
a valid request. The handler reads the profile, finds `defaultBudgetId` is `undefined`, and
throws `{ statusCode: 403, message: 'No active budget found. Please complete registration.' }`
before any budget data is written.

**Formal Specification:**

```
FUNCTION isBugCondition(X)
  INPUT: X of type OnboardingRequest
         (valid JWT, valid body, user profile exists in DynamoDB)
  OUTPUT: boolean

  profile ← DynamoDB.getItem(`USER#${X.userId}`, 'PROFILE')

  RETURN profile IS NOT NULL
    AND (profile.defaultBudgetId IS NULL
         OR profile.defaultBudgetId IS UNDEFINED)
END FUNCTION
```

### Examples

- **New user, first onboarding** — profile exists, `defaultBudgetId` absent →
  current code returns 403; expected: 200 with budget created.
- **New user, valid family budget request** — same as above with `budgetType: 'family'` →
  current code returns 403; expected: 200 with METADATA `budgetType` set to `'family'`.
- **Returning user, re-onboarding attempt** — profile has `defaultBudgetId: 'budget_abc'` →
  `isBugCondition` returns `false`; expected: 409 (re-onboarding guard, not the bug).
- **Missing profile entirely** — `getItem` returns `null` →
  `isBugCondition` returns `false`; expected: 403 "User profile not found" (unchanged).

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- `POST /auth/onboarding` with a missing or invalid `Authorization` header SHALL continue
  to return HTTP 401 (auth check runs before profile read).
- `POST /auth/onboarding` with an invalid request body SHALL continue to return HTTP 400
  with validation error details (validation runs before profile read).
- `POST /auth/onboarding` when the user profile record does not exist in DynamoDB SHALL
  continue to return HTTP 403 "User profile not found".
- `POST /auth/onboarding` when `budgetType` is `family` or `shared` SHALL continue to
  update `BUDGET#<budgetId>/METADATA` with the selected `budgetType`.
- `POST /auth/onboarding` when `budgetType` is `personal` SHALL continue to skip the
  METADATA `budgetType` update (only one `UpdateItemCommand` for the profile).
- `POST /auth/onboarding` when the budget period verification read returns `null` SHALL
  continue to return HTTP 500 "Budget Creation Verification Failed".
- All protected budget endpoints that call `BudgetAccessResolver.resolveAccess()` for users
  with an existing `defaultBudgetId` SHALL continue to resolve budget access exactly as
  before — `BudgetAccessResolver` is not modified.
- CORS preflight (`OPTIONS`) SHALL continue to return HTTP 200 with an empty body.

**Scope:**

All inputs where `isBugCondition(X)` returns `false` must produce identical results from
`completeOnboarding(X)` and `completeOnboarding'(X)`. This includes:

- Requests with missing/invalid JWT (401 path).
- Requests with invalid body (400 path).
- Requests where the user profile is absent (403 "User profile not found" path).
- Requests where the profile already has `defaultBudgetId` (409 re-onboarding guard).
- All calls to other Lambda functions that use `BudgetAccessResolver`.

---

## Hypothesized Root Cause

Based on code inspection of `backend/functions/auth-onboarding/index.js` (lines 88–92):

```javascript
const defaultBudgetId = userProfile.defaultBudgetId;
if (!defaultBudgetId) {
  throw { statusCode: 403, message: 'No active budget found. Please complete registration.' };
}
```

1. **Incorrect assumption about registration flow**: The guard assumes `auth-register`
   always creates a budget and writes `defaultBudgetId` to the profile. In reality,
   `auth-register` only creates the Cognito user, `USER#<userId>/PROFILE`, `FAMILY#<id>`,
   and a family member record — no budget is created at registration time.

2. **Misplaced responsibility**: The `defaultBudgetId` can only exist after onboarding
   creates the budget, but the guard fires before the budget-creation code runs. The
   handler already generates a `budgetId` variable (line 130) and writes `PERIOD#` and
   `ACCOUNT#` records — it just never writes `METADATA`, `MEMBER#`, or updates the profile
   with `defaultBudgetId`.

3. **Dead code**: The `budgetId` variable on line 130 (`budget_${Date.now()}...`) is
   declared but never used (marked `eslint-disable-line no-unused-vars`). The handler uses
   `defaultBudgetId` (from the profile) for all writes instead. This confirms the original
   intent was to generate the ID here, but the guard above prevents it from ever being
   reached for new users.

4. **Missing DynamoDB writes**: Even if the guard were removed, the handler currently does
   not write `BUDGET#<budgetId>/METADATA` or `BUDGET#<budgetId>/MEMBER#<userId>`. These
   records are required for `BudgetAccessResolver.resolveAccess()` to succeed on subsequent
   requests.

---

## Correctness Properties

Property 1: Bug Condition — First-Time Onboarding Succeeds

_For any_ valid onboarding request `X` where `isBugCondition(X)` returns `true` (user
profile exists, `defaultBudgetId` is absent), the fixed handler `completeOnboarding'(X)`
SHALL return HTTP 200 with `budgetCreated: true` and a non-null `budgetId`, and SHALL have
written `METADATA`, `MEMBER#<userId>` (role: `owner`), `PERIOD#<month>`, and
`ACCOUNT#<cashId>` records to DynamoDB, and SHALL have updated `USER#<userId>/PROFILE` with
`defaultBudgetId` and `onboardingCompleted: true`.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation — Non-Buggy Inputs Unchanged

_For any_ input `X` where `isBugCondition(X)` returns `false` (invalid JWT, invalid body,
missing profile, or profile already has `defaultBudgetId`), the fixed handler
`completeOnboarding'(X)` SHALL produce the same HTTP status code and response semantics as
the original handler `completeOnboarding(X)`, preserving all existing error handling and
re-onboarding guard behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

---

## Fix Implementation

### Changes Required

**File**: `backend/functions/auth-onboarding/index.js`

**Function**: `exports.handler` (the single exported Lambda handler — no service/repository
split exists in this function; the fix stays within the handler following the existing
pattern)

**Specific Changes**:

1. **Replace the 403 guard with a re-onboarding 409 guard**

   Remove:
   ```javascript
   const defaultBudgetId = userProfile.defaultBudgetId;
   if (!defaultBudgetId) {
     throw { statusCode: 403, message: 'No active budget found. Please complete registration.' };
   }
   ```

   Replace with:
   ```javascript
   const existingBudgetId = userProfile.defaultBudgetId;
   if (existingBudgetId) {
     // Re-onboarding guard: budget already exists, prevent duplicate creation
     return {
       statusCode: 409,
       headers: getCorsHeaders(origin),
       body: JSON.stringify({
         error: 'Conflict',
         message: 'Onboarding already completed. Budget already exists.',
       }),
     };
   }
   ```

2. **Generate a new budgetId for first-time onboarding**

   Replace the unused `budgetId` variable (line ~130) with a deterministic generation
   using the same pattern already in use:
   ```javascript
   const defaultBudgetId = `budget_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
   ```
   This replaces both the old `defaultBudgetId` (from profile) and the dead `budgetId`
   variable. All subsequent writes use `defaultBudgetId`.

3. **Write `BUDGET#<budgetId>/METADATA` record**

   Insert before the profile `UpdateItemCommand`:
   ```javascript
   const budgetMetadata = {
     PK: `BUDGET#${defaultBudgetId}`,
     SK: 'METADATA',
     budgetId: defaultBudgetId,
     budgetType: budgetType === 'family' || budgetType === 'shared' ? budgetType : 'personal',
     status: 'active',
     currency,
     createdAt: currentTime,
     updatedAt: currentTime,
   };
   await dynamoHelpers.putItem(budgetMetadata);
   ```

4. **Write `BUDGET#<budgetId>/MEMBER#<userId>` record**

   Insert after the METADATA write:
   ```javascript
   const memberRecord = {
     PK: `BUDGET#${defaultBudgetId}`,
     SK: `MEMBER#${userId}`,
     budgetId: defaultBudgetId,
     userId,
     role: 'owner',
     status: 'active',
     joinedAt: currentTime,
     createdAt: currentTime,
     updatedAt: currentTime,
   };
   await dynamoHelpers.putItem(memberRecord);
   ```

5. **Update profile `UpdateItemCommand` to include `defaultBudgetId`**

   Extend the existing `UpdateItemCommand` expression:
   ```javascript
   UpdateExpression:
     'SET onboardingCompleted = :completed, currency = :currency, ' +
     'defaultBudgetId = :budgetId, updatedAt = :updatedAt',
   ExpressionAttributeValues: {
     ':completed': { BOOL: true },
     ':currency':  { S: currency },
     ':budgetId':  { S: defaultBudgetId },
     ':updatedAt': { S: currentTime },
   },
   ```

6. **Remove the now-redundant conditional METADATA `budgetType` update**

   The existing block that conditionally updates METADATA for `family`/`shared` budget
   types can be removed because step 3 writes `budgetType` into the METADATA record at
   creation time. This eliminates a redundant DynamoDB write.

   > **Note**: If the product requirement is to keep the update path separate (e.g. for
   > future re-use), it can be retained. The design recommends removing it to keep the
   > write count minimal and the logic in one place.

### DynamoDB Write Order (Final)

For a first-time onboarding request the handler will perform these writes in order:

| # | Operation | Key |
|---|-----------|-----|
| 1 | `UpdateItemCommand` | `USER#<userId> / PROFILE` (sets `defaultBudgetId`, `onboardingCompleted`, `currency`) |
| 2 | `putItem` | `BUDGET#<budgetId> / METADATA` |
| 3 | `putItem` | `BUDGET#<budgetId> / MEMBER#<userId>` |
| 4 | `putItem` | `BUDGET#<budgetId> / PERIOD#<month>` |
| 5 | `putItem` | `BUDGET#<budgetId> / ACCOUNT#<cashId>` |
| 6 | `getItem` (verify) | `BUDGET#<budgetId> / PERIOD#<month>` |

> The profile update is written first so that if any subsequent write fails, the profile
> already has `defaultBudgetId` and a retry will hit the 409 re-onboarding guard rather
> than attempting to create a second budget.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that
demonstrate the bug on the **unfixed** code, then verify the fix works correctly and
preserves all existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix.
Confirm or refute the root cause analysis. If refuted, re-hypothesize.

**Test Plan**: Write unit tests that mock `dynamoHelpers.getItem` to return a profile
without `defaultBudgetId`, then call the handler with a valid onboarding request. Assert
that the response is NOT 403 on the fixed code (and IS 403 on the unfixed code to confirm
the bug).

**Test Cases**:

1. **New user, personal budget** — profile has no `defaultBudgetId`, valid body with
   `budgetType: 'personal'` → should return 200 on fixed code (fails on unfixed code).
2. **New user, family budget** — profile has no `defaultBudgetId`, valid body with
   `budgetType: 'family'` → should return 200 on fixed code (fails on unfixed code).
3. **New user, minimal categories** — profile has no `defaultBudgetId`, single category →
   should return 200 on fixed code (fails on unfixed code).
4. **New user, verification failure** — profile has no `defaultBudgetId`, but verification
   `getItem` returns `null` → should return 500 on fixed code (currently returns 403 on
   unfixed code — different failure mode).

**Expected Counterexamples on Unfixed Code**:

- All cases above return 403 with `message: 'No active budget found. Please complete
  registration.'` — confirming the guard fires before any budget writes.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function
produces the expected behavior.

**Pseudocode:**

```
FOR ALL X WHERE isBugCondition(X) DO
  result ← completeOnboarding'(X)
  ASSERT result.statusCode = 200
    AND result.body.budgetCreated = true
    AND result.body.budgetId IS NOT NULL
    AND dynamoHelpers.putItem WAS CALLED WITH PK = `BUDGET#${result.body.budgetId}`, SK = 'METADATA'
    AND dynamoHelpers.putItem WAS CALLED WITH PK = `BUDGET#${result.body.budgetId}`, SK = `MEMBER#${X.userId}`
    AND dynamoHelpers.putItem WAS CALLED WITH PK = `BUDGET#${result.body.budgetId}`, SK = `PERIOD#${X.currentMonth}`
    AND dynamoHelpers.putItem WAS CALLED WITH PK = `BUDGET#${result.body.budgetId}`, SK MATCHES /^ACCOUNT#/
    AND UpdateItemCommand WAS CALLED WITH Key.PK = `USER#${X.userId}` AND ExpressionAttributeValues[':budgetId'] = result.body.budgetId
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed
function produces the same result as the original function.

**Pseudocode:**

```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT completeOnboarding(X).statusCode = completeOnboarding'(X).statusCode
  ASSERT completeOnboarding(X).body.error  = completeOnboarding'(X).body.error
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking
because it generates many test cases automatically across the input domain, catching edge
cases that manual unit tests might miss.

**Test Plan**: Observe behavior on unfixed code first for non-buggy inputs, then write
property-based tests (using `fast-check`, already installed in the common layer) capturing
that behavior.

**Test Cases**:

1. **Missing Authorization header** — observe 401 on unfixed code, assert 401 on fixed code.
2. **Invalid JSON body** — observe 400 on unfixed code, assert 400 on fixed code.
3. **Validation errors** — observe 400 on unfixed code, assert 400 on fixed code.
4. **Profile not found** — observe 403 "User profile not found" on unfixed code, assert
   same on fixed code.
5. **Re-onboarding (profile has `defaultBudgetId`)** — observe 403 on unfixed code (same
   guard path), assert 409 on fixed code (new re-onboarding guard).
6. **`budgetType: 'personal'` — single `UpdateItemCommand`** — assert only one
   `UpdateItemCommand` fires (no separate METADATA type update).
7. **`budgetType: 'family'` — METADATA written with correct type** — assert METADATA
   `putItem` includes `budgetType: 'family'`.
8. **Verification failure** — assert 500 "Budget Creation Verification Failed".

### Unit Tests

- Test that a profile with no `defaultBudgetId` returns 200 and writes all 4 DynamoDB
  records (METADATA, MEMBER, PERIOD, ACCOUNT).
- Test that `defaultBudgetId` is included in the profile `UpdateItemCommand`.
- Test that a profile with an existing `defaultBudgetId` returns 409.
- Test that a missing profile still returns 403 "User profile not found".
- Test that missing Authorization header returns 401.
- Test that invalid body returns 400.
- Test that verification failure returns 500.
- Test that `budgetType: 'personal'` fires exactly one `UpdateItemCommand`.
- Test that `budgetType: 'family'` writes METADATA with `budgetType: 'family'`.

### Property-Based Tests

- Generate random valid onboarding payloads (varying `city`, `familySize`, `currentMonth`,
  `selectedCategories` length 1–20, `budgetType`) for users with no `defaultBudgetId` and
  assert all return 200 with `budgetCreated: true`.
- Generate random invalid payloads (missing required fields, out-of-range values) and
  assert all return 400 regardless of profile state.
- Generate random profiles that already have `defaultBudgetId` and assert all return 409.

### Integration Tests

- Full flow: register user (no budget) → call `POST /auth/onboarding` → assert 200 →
  call `GET /budget/current` → assert 200 (budget resolves via `BudgetAccessResolver`).
- Re-onboarding: call `POST /auth/onboarding` twice for the same user → first returns 200,
  second returns 409.
- Verify `BudgetAccessResolver.resolveAccess()` succeeds after onboarding by calling a
  protected budget endpoint.
