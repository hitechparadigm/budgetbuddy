# Bugfix Requirements Document

## Introduction

New users completing the onboarding flow receive a 403 "No active budget found. Please complete registration." error from `POST /auth/onboarding`. This is a chicken-and-egg problem: the onboarding endpoint is the one responsible for *creating* the first budget, yet it checks for an existing `defaultBudgetId` on the user profile before proceeding — a field that can only exist after onboarding has already run.

The root cause is a two-part mismatch:

1. `auth-register` creates the user profile without a `defaultBudgetId` (registration only creates a Cognito user, a `USER#` profile, a `FAMILY#` record, and a family member record — no budget).
2. `auth-onboarding` reads `USER#<userId>/PROFILE`, finds no `defaultBudgetId`, and throws `{ statusCode: 403, message: 'No active budget found. Please complete registration.' }` before it ever reaches the budget-creation logic.

The fix must allow onboarding to generate the budget ID itself (as it already does for the budget period write), write the budget `METADATA` and `MEMBER#<userId>` records to DynamoDB, and then update the user profile's `defaultBudgetId` — all without requiring a pre-existing budget.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a newly registered user (whose profile has no `defaultBudgetId`) calls `POST /auth/onboarding` with valid onboarding data THEN the system returns HTTP 403 with message "No active budget found. Please complete registration."

1.2 WHEN the onboarding handler reads `USER#<userId>/PROFILE` and finds `defaultBudgetId` is absent or undefined THEN the system throws `{ statusCode: 403, message: 'No active budget found. Please complete registration.' }` and halts execution before any budget data is written.

1.3 WHEN a new user calls `GET /budget/current` before completing onboarding THEN the system returns HTTP 403 because no budget exists yet, which is expected — but this correct 403 is indistinguishable from the erroneous 403 on the onboarding endpoint itself.

### Expected Behavior (Correct)

2.1 WHEN a newly registered user (whose profile has no `defaultBudgetId`) calls `POST /auth/onboarding` with valid onboarding data THEN the system SHALL generate a new `budgetId`, create the budget `METADATA` record, create the `MEMBER#<userId>` record with role `owner`, create the `PERIOD#<currentMonth>` record, create the default Cash account, update the user profile with `defaultBudgetId` and `onboardingCompleted = true`, and return HTTP 200 with the created budget details.

2.2 WHEN the onboarding handler finds no `defaultBudgetId` on the user profile THEN the system SHALL treat this as the expected first-time onboarding state, generate a new budget ID, and proceed with budget creation rather than returning an error.

2.3 WHEN onboarding completes successfully THEN the system SHALL write `defaultBudgetId` to `USER#<userId>/PROFILE` so that subsequent calls to `GET /budget/current` and `BudgetAccessResolver.resolveAccess()` can resolve the budget correctly.

2.4 WHEN a user who has already completed onboarding (profile already has `defaultBudgetId`) calls `POST /auth/onboarding` again THEN the system SHALL return HTTP 409 or use the existing `defaultBudgetId` without overwriting the existing budget, preventing duplicate budget creation.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user with a valid `defaultBudgetId` on their profile calls any protected budget endpoint THEN the system SHALL CONTINUE TO resolve budget access via `BudgetAccessResolver.resolveAccess()` as before.

3.2 WHEN the onboarding request body fails validation (missing city, invalid familySize, etc.) THEN the system SHALL CONTINUE TO return HTTP 400 with validation error details before any DynamoDB writes occur.

3.3 WHEN the Authorization header is missing or the JWT is invalid on `POST /auth/onboarding` THEN the system SHALL CONTINUE TO return HTTP 401.

3.4 WHEN the user profile record does not exist in DynamoDB (userId not found) THEN the system SHALL CONTINUE TO return HTTP 403 with message "User profile not found."

3.5 WHEN `budgetType` is `family` or `shared` THEN the system SHALL CONTINUE TO update the budget `METADATA` record with the selected `budgetType`.

3.6 WHEN `budgetType` is `personal` THEN the system SHALL CONTINUE TO skip the budget metadata `budgetType` update (only one `UpdateItemCommand` for the profile).

3.7 WHEN the budget period write succeeds but the verification read returns null THEN the system SHALL CONTINUE TO return HTTP 500 with "Budget Creation Verification Failed".

---

### Bug Condition (Pseudocode)

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type OnboardingRequest
  OUTPUT: boolean

  // Returns true when the bug is triggered:
  // user exists in Cognito and has a PROFILE record,
  // but has never completed onboarding (no defaultBudgetId yet)
  profile ← DynamoDB.getItem(`USER#${X.userId}`, 'PROFILE')
  RETURN profile IS NOT NULL
    AND profile.defaultBudgetId IS NULL OR UNDEFINED
END FUNCTION
```

```pascal
// Property: Fix Checking — onboarding must succeed for brand-new users
FOR ALL X WHERE isBugCondition(X) DO
  result ← completeOnboarding'(X)
  ASSERT result.statusCode = 200
    AND result.body.budgetCreated = true
    AND result.body.budgetId IS NOT NULL
END FOR
```

```pascal
// Property: Preservation Checking — existing users are unaffected
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT completeOnboarding(X) = completeOnboarding'(X)
END FOR
```
