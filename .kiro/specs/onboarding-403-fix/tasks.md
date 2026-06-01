# Implementation Plan

## Overview

Fix the `auth-onboarding` Lambda so that first-time users (profile exists, no `defaultBudgetId`) complete onboarding successfully instead of receiving a 403. The fix removes the erroneous guard, adds a 409 re-onboarding guard, generates a new `budgetId`, writes `METADATA` and `MEMBER#<userId>` records to DynamoDB, and updates the user profile with `defaultBudgetId`. Tests follow the exploratory bugfix workflow: write the bug condition test first (on unfixed code), then preservation tests, then implement the fix.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3.1"] },
    { "wave": 4, "tasks": ["3.2"] },
    { "wave": 5, "tasks": ["3.3"] },
    { "wave": 6, "tasks": ["3.4"] },
    { "wave": 7, "tasks": ["3.5"] },
    { "wave": 8, "tasks": ["3.6", "3.7"] },
    { "wave": 9, "tasks": ["4"] }
  ]
}
```

Tasks 1 and 2 are written and run on unfixed code before any implementation begins. Tasks 3.1–3.5 are the implementation. Tasks 3.6–3.7 re-run the tests from tasks 1 and 2 to validate the fix.

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - First-Time Onboarding Returns 403
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — any valid onboarding request where `isBugCondition(X)` is true (profile exists, `defaultBudgetId` absent)
  - Create `backend/functions/auth-onboarding/onboarding-bug-condition.pbt.test.js`
  - Use `fast-check` (add as devDependency to `package.json` if not present; check `backend/layers/common` first)
  - Mock `./utils/dynamo-helpers` so `getItem` returns a profile **without** `defaultBudgetId` (e.g. `{ userId: 'user-123' }`) for the first call and a valid period object for the verification call
  - Mock `@aws-sdk/client-dynamodb` so `DynamoDBClient.send` resolves to `{}`
  - Mock `/opt/nodejs/shared/*` via `jest.config.js` `moduleNameMapper` (already configured)
  - Generate arbitrary valid onboarding payloads using `fc.record`:
    - `city`: `fc.string({ minLength: 1, maxLength: 50 })`
    - `country`: `fc.constant('United States')`
    - `familySize`: `fc.integer({ min: 1, max: 20 })`
    - `currentMonth`: `fc.constantFrom('2025-01', '2025-06', '2026-01', '2026-12')`
    - `budgetType`: `fc.constantFrom('personal', 'family', 'shared')`
    - `selectedCategories`: `fc.array(fc.record({ name: fc.string({ minLength: 1, maxLength: 30 }), icon: fc.constant('🛒'), adjustedAmount: fc.integer({ min: 1, max: 5000 }) }), { minLength: 1, maxLength: 5 })`
  - Assert: `result.statusCode` is NOT 403 (expected 200 on fixed code)
  - Assert: `JSON.parse(result.body).budgetCreated` is `true`
  - Assert: `JSON.parse(result.body).budgetId` is not null/undefined
  - Run test on UNFIXED code: `cd backend/functions/auth-onboarding && npx jest onboarding-bug-condition.pbt.test.js --testNamePattern "Property 1"`
  - **EXPECTED OUTCOME**: Test FAILS with counterexample showing `statusCode: 403` and `message: 'No active budget found. Please complete registration.'` — this proves the bug exists
  - Document the counterexample (e.g. `handler({ city: 'X', familySize: 1, ... }) → 403`)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Buggy Inputs Produce Unchanged Responses
  - **IMPORTANT**: Follow observation-first methodology — run unfixed code first, record outputs, then write assertions
  - **GOAL**: Establish a baseline of existing behavior for all inputs where `isBugCondition(X)` is false
  - Create `backend/functions/auth-onboarding/onboarding-preservation.pbt.test.js`
  - Use `fast-check` with the same mock setup as task 1
  - **Observe on unfixed code** (run manually before writing assertions):
    - Missing `Authorization` header → observe 401
    - Invalid JSON body → observe 400
    - `validateOnboardingInput` returns errors → observe 400
    - `getItem` returns `null` (no profile) → observe 403 with `message: 'User profile not found'`
    - Profile already has `defaultBudgetId` → observe 403 with `message: 'No active budget found...'` (unfixed) — note: fixed code will return 409 here, so this case is a **known intentional change**, not a regression
  - Write property-based tests capturing observed behavior:
    - **P2a — Missing auth**: `fc.property(fc.record({ httpMethod: fc.constant('POST'), headers: fc.constant({}), body: fc.string() }), ...)` → assert `statusCode === 401`
    - **P2b — Invalid body**: generate payloads where `validateOnboardingInput` mock returns a non-empty errors array → assert `statusCode === 400`
    - **P2c — Profile not found**: `getItem` returns `null` for any userId → assert `statusCode === 403` and `body.message === 'User profile not found'`
    - **P2d — Re-onboarding guard**: profile has `defaultBudgetId` set → assert `statusCode === 409` on fixed code (document that unfixed returns 403 here — this is the intentional behavior change for the re-onboarding path)
    - **P2e — Verification failure**: `getItem` returns profile without `defaultBudgetId` on first call, then `null` on verification call → assert `statusCode === 500` on fixed code
  - Run tests on UNFIXED code (except P2d/P2e which test fixed behavior): `cd backend/functions/auth-onboarding && npx jest onboarding-preservation.pbt.test.js`
  - **EXPECTED OUTCOME**: P2a, P2b, P2c PASS on unfixed code (confirms baseline); P2d and P2e are written for fixed code and will be verified in task 3.3
  - Mark task complete when tests are written, run, and passing baseline cases are documented
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7_

- [x] 3. Fix: remove 403 guard, add 409 re-onboarding guard, write METADATA + MEMBER records, update profile with defaultBudgetId

  - [x] 3.1 Replace the 403 guard with a 409 re-onboarding guard
    - In `backend/functions/auth-onboarding/index.js`, locate lines 88–92:
      ```javascript
      const defaultBudgetId = userProfile.defaultBudgetId;
      if (!defaultBudgetId) {
        throw { statusCode: 403, message: 'No active budget found. Please complete registration.' };
      }
      ```
    - Replace with:
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
    - _Bug_Condition: `isBugCondition(X)` where `profile.defaultBudgetId` is null/undefined_
    - _Requirements: 1.2, 2.2, 2.4_

  - [x] 3.2 Generate a new budgetId for first-time onboarding
    - Replace the dead `budgetId` variable (line ~130, marked `eslint-disable-line no-unused-vars`) with:
      ```javascript
      const defaultBudgetId = `budget_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      ```
    - Remove the `eslint-disable-line no-unused-vars` comment — `defaultBudgetId` is now used
    - All subsequent DynamoDB writes use `defaultBudgetId` (not the old profile-sourced variable, which is now gone)
    - _Bug_Condition: `isBugCondition(X)` — first-time onboarding state_
    - _Expected_Behavior: `result.body.budgetId` is non-null and matches the generated ID_
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Write BUDGET#<budgetId>/METADATA record
    - Insert before the profile `UpdateItemCommand` call:
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
    - Remove the existing conditional `UpdateItemCommand` block that updates METADATA for `family`/`shared` budget types — `budgetType` is now written at creation time, making that block redundant
    - _Expected_Behavior: `dynamoHelpers.putItem` called with `PK: 'BUDGET#<id>'`, `SK: 'METADATA'`_
    - _Requirements: 2.1, 3.5, 3.6_

  - [x] 3.4 Write BUDGET#<budgetId>/MEMBER#<userId> record
    - Insert after the METADATA write:
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
    - _Expected_Behavior: `dynamoHelpers.putItem` called with `PK: 'BUDGET#<id>'`, `SK: 'MEMBER#<userId>'`, `role: 'owner'`_
    - _Requirements: 2.1_

  - [x] 3.5 Update profile UpdateItemCommand to include defaultBudgetId
    - Extend the existing `UpdateItemCommand` expression to include `defaultBudgetId`:
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
    - _Expected_Behavior: `UpdateItemCommand` called with `ExpressionAttributeValues[':budgetId']` equal to the generated `defaultBudgetId`_
    - _Preservation: All other `UpdateItemCommand` fields (`onboardingCompleted`, `currency`, `updatedAt`) remain unchanged_
    - _Requirements: 2.1, 2.3_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - First-Time Onboarding Succeeds
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior; when it passes, the fix is confirmed
    - Run: `cd backend/functions/auth-onboarding && npx jest onboarding-bug-condition.pbt.test.js --testNamePattern "Property 1"`
    - **EXPECTED OUTCOME**: Test PASSES — `statusCode: 200`, `budgetCreated: true`, `budgetId` non-null
    - Also verify `dynamoHelpers.putItem` was called 4 times (METADATA, MEMBER, PERIOD, ACCOUNT)
    - Also verify `UpdateItemCommand` was called with `:budgetId` in `ExpressionAttributeValues`
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Buggy Inputs Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run: `cd backend/functions/auth-onboarding && npx jest onboarding-preservation.pbt.test.js`
    - **EXPECTED OUTCOME**: All preservation tests PASS — 401, 400, 403 (profile not found), 409 (re-onboarding), 500 (verification failure) paths all produce correct status codes
    - Confirm no regressions in existing `index.test.js` suite: `cd backend/functions/auth-onboarding && npx jest index.test.js`
    - Note: existing `index.test.js` tests that assert `statusCode: 403` for missing `defaultBudgetId` must be updated to assert `statusCode: 200` (they test the bug, not the fix) — update those tests as part of this sub-task
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [-] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite: `cd backend/functions/auth-onboarding && npx jest --coverage`
  - Confirm coverage is >80% on `index.js`
  - Confirm no ESLint errors: `cd backend/functions/auth-onboarding && npx eslint index.js`
  - Confirm the DynamoDB write order matches the design (METADATA → MEMBER → PERIOD → ACCOUNT → verify read), with the profile `UpdateItemCommand` first
  - Confirm `budgetType: 'personal'` path fires exactly one `UpdateItemCommand` (profile only — no separate METADATA update command)
  - Confirm `budgetType: 'family'` path writes METADATA `putItem` with `budgetType: 'family'` and fires exactly one `UpdateItemCommand` (profile only)
  - Ask the user if any questions arise before marking complete

## Notes

- All changes are confined to `backend/functions/auth-onboarding/index.js` and new test files in the same directory
- No new runtime dependencies — `fast-check` is a devDependency only; verify it is available in `backend/layers/common` before adding to `package.json`
- The DynamoDB write order from the design is: `UpdateItemCommand` (profile) → `putItem` METADATA → `putItem` MEMBER → `putItem` PERIOD → `putItem` ACCOUNT → `getItem` (verify)
- The existing `index.test.js` tests that assert `statusCode: 403` for a profile without `defaultBudgetId` document the bug, not the correct behavior — update them in task 3.7
- `BudgetAccessResolver` in `backend/layers/common/nodejs/utils.js` is NOT modified by this fix
- Integration tests (full register → onboard → GET /budget/current flow) are out of scope for this task list but are described in the design's Testing Strategy section for future reference
