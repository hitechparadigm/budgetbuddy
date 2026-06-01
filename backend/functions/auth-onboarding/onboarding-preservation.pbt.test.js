/**
 * Preservation Property-Based Tests
 *
 * Property 2: Preservation — Non-Buggy Inputs Produce Unchanged Responses
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 *
 * METHODOLOGY: Observation-first — behavior was observed on unfixed code first,
 * then assertions were written to capture that baseline.
 *
 * OBSERVED BEHAVIOR ON UNFIXED CODE:
 *   - Missing Authorization header → 401
 *   - Invalid JSON body → 400
 *   - validateOnboardingInput returns errors → 400
 *   - getItem returns null (no profile) → 403 with message: 'User profile not found'
 *   - Profile already has defaultBudgetId → 403 with message: 'No active budget found...' (unfixed)
 *     NOTE: Fixed code returns 409 here — this is an intentional behavior change, not a regression.
 *
 * SCOPE:
 *   P2a — Missing auth: assert statusCode === 401
 *   P2b — Invalid body: assert statusCode === 400
 *   P2c — Profile not found: assert statusCode === 403 and body.message === 'User profile not found'
 *   P2d — Re-onboarding guard: assert statusCode === 409 on FIXED code
 *         (unfixed returns 403 — documented intentional change)
 *   P2e — Verification failure: assert statusCode === 500 on FIXED code
 *
 * RUN STATUS (unfixed code):
 *   P2a ✓ PASSES — 401 preserved
 *   P2b ✓ PASSES — 400 preserved
 *   P2c ✓ PASSES — 403 "User profile not found" preserved
 *   P2d — Written for FIXED code (verified in task 3.7)
 *   P2e — Written for FIXED code (verified in task 3.7)
 */

// Mock AWS SDK before requiring the handler
jest.mock('@aws-sdk/client-dynamodb');

// Mock local utilities
jest.mock('./utils/dynamo-helpers');

const fc = require('fast-check');
const { handler } = require('./index');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { parseIdToken } = require('/opt/nodejs/shared/token-parser');
const { validateOnboardingInput } = require('/opt/nodejs/shared/validators');
const dynamoHelpers = require('./utils/dynamo-helpers');

// Capture the DynamoDBClient mock instance created at module load time
const mockDynamoClientSend = DynamoDBClient.mock.instances[0]?.send;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal valid onboarding event with a given body string.
 * The Authorization header is always present unless explicitly omitted.
 */
function buildEvent({ body, omitAuth = false, origin = 'https://app.budgetbuddy.com' } = {}) {
  return {
    httpMethod: 'POST',
    headers: omitAuth
      ? { origin }
      : { Authorization: 'Bearer valid-token', origin },
    body: body !== undefined ? body : JSON.stringify(validPayload()),
  };
}

/** A minimal valid onboarding payload. */
function validPayload(overrides = {}) {
  return {
    city: 'Austin',
    country: 'United States',
    familySize: 2,
    currentMonth: '2025-06',
    budgetType: 'personal',
    selectedCategories: [
      { name: 'Groceries', icon: '🛒', adjustedAmount: 500 },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates valid onboarding payloads (varying fields). */
const validPayloadArb = fc.record({
  city: fc.string({ minLength: 1, maxLength: 50 }),
  country: fc.constant('United States'),
  familySize: fc.integer({ min: 1, max: 20 }),
  currentMonth: fc.constantFrom('2025-01', '2025-06', '2026-01', '2026-12'),
  budgetType: fc.constantFrom('personal', 'family', 'shared'),
  selectedCategories: fc.array(
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 30 }),
      icon: fc.constant('🛒'),
      adjustedAmount: fc.integer({ min: 1, max: 5000 }),
    }),
    { minLength: 1, maxLength: 5 },
  ),
});

/** Generates arbitrary userId strings. */
const userIdArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

// ---------------------------------------------------------------------------
// beforeEach baseline
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();

  // Restore DynamoDBClient.send mock after clearAllMocks
  if (mockDynamoClientSend) {
    mockDynamoClientSend.mockResolvedValue({});
  }

  process.env.TABLE_NAME = 'test-table';
  process.env.AWS_REGION = 'us-east-1';

  // Default: token resolves to a valid userId
  parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });

  // Default: validation passes
  validateOnboardingInput.mockReturnValue([]);

  // Default: getItem returns null (no profile) — overridden per test
  dynamoHelpers.getItem.mockResolvedValue(null);
  dynamoHelpers.putItem.mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// P2a — Missing Authorization header → 401
// ---------------------------------------------------------------------------

describe('P2a — Missing auth: statusCode === 401', () => {
  /**
   * Property 2a: For any onboarding request with no Authorization header,
   * the handler MUST return 401 regardless of the body content.
   *
   * Observed on unfixed code: 401 (AuthenticationError thrown before profile read).
   * Expected on fixed code: same 401 — auth check is unchanged.
   *
   * Validates: Requirements 3.3
   */
  test('Property 2a: any request without Authorization header returns 401', async () => {
    await fc.assert(
      fc.asyncProperty(validPayloadArb, async (payload) => {
        const event = buildEvent({ body: JSON.stringify(payload), omitAuth: true });
        const result = await handler(event);
        expect(result.statusCode).toBe(401);
      }),
      { numRuns: 20, verbose: true },
    );
  });
});

// ---------------------------------------------------------------------------
// P2b — Invalid body → 400
// ---------------------------------------------------------------------------

describe('P2b — Invalid body: statusCode === 400', () => {
  /**
   * Property 2b: For any request where validateOnboardingInput returns a
   * non-empty errors array, the handler MUST return 400.
   *
   * Observed on unfixed code: 400 (ValidationError thrown before profile read).
   * Expected on fixed code: same 400 — validation runs before profile read.
   *
   * Validates: Requirements 3.2
   */
  test('Property 2b: any request where validation returns errors returns 400', async () => {
    // Arbitrary non-empty error arrays
    const errorsArb = fc.array(fc.string({ minLength: 1, maxLength: 80 }), {
      minLength: 1,
      maxLength: 5,
    });

    await fc.assert(
      fc.asyncProperty(validPayloadArb, errorsArb, async (payload, errors) => {
        // Override validation to return errors for this input
        validateOnboardingInput.mockReturnValue(errors);

        const event = buildEvent({ body: JSON.stringify(payload) });
        const result = await handler(event);
        expect(result.statusCode).toBe(400);
      }),
      { numRuns: 20, verbose: true },
    );
  });

  /**
   * Property 2b (invalid JSON): A request body that is not valid JSON returns 400.
   *
   * Validates: Requirements 3.2
   */
  test('Property 2b: invalid JSON body returns 400', async () => {
    // Strings that are definitely not valid JSON objects
    const invalidJsonArb = fc.oneof(
      fc.constant('not-json'),
      fc.constant('{bad json'),
      fc.constant('undefined'),
      fc.constant(''),
      fc.string({ minLength: 1, maxLength: 20 }).filter((s) => {
        try {
          JSON.parse(s);
          return false;
        } catch {
          return true;
        }
      }),
    );

    await fc.assert(
      fc.asyncProperty(invalidJsonArb, async (badBody) => {
        const event = buildEvent({ body: badBody });
        const result = await handler(event);
        expect(result.statusCode).toBe(400);
      }),
      { numRuns: 20, verbose: true },
    );
  });
});

// ---------------------------------------------------------------------------
// P2c — Profile not found → 403 "User profile not found"
// ---------------------------------------------------------------------------

describe('P2c — Profile not found: statusCode === 403 and correct message', () => {
  /**
   * Property 2c: For any valid onboarding request where getItem returns null
   * (no profile in DynamoDB), the handler MUST return 403 with
   * message: 'User profile not found'.
   *
   * Observed on unfixed code: 403 with message 'User profile not found'.
   * Expected on fixed code: same — this path is unchanged by the fix.
   *
   * Validates: Requirements 3.4
   */
  test('Property 2c: getItem returns null for any userId → 403 User profile not found', async () => {
    await fc.assert(
      fc.asyncProperty(validPayloadArb, userIdArb, async (payload, userId) => {
        // Token resolves to the generated userId
        parseIdToken.mockReturnValue({ 'custom:userId': userId });

        // Validation passes
        validateOnboardingInput.mockReturnValue([]);

        // getItem always returns null → no profile
        dynamoHelpers.getItem.mockResolvedValue(null);

        const event = buildEvent({ body: JSON.stringify(payload) });
        const result = await handler(event);

        expect(result.statusCode).toBe(403);

        const body = JSON.parse(result.body);
        expect(body.message).toBe('User profile not found');
      }),
      { numRuns: 20, verbose: true },
    );
  });
});

// ---------------------------------------------------------------------------
// P2d — Re-onboarding guard: profile has defaultBudgetId → 409 (FIXED code)
// ---------------------------------------------------------------------------

describe('P2d — Re-onboarding guard: statusCode === 409 on fixed code', () => {
  /**
   * Property 2d: For any valid onboarding request where the user profile
   * already has a defaultBudgetId set, the handler MUST return 409 on the
   * FIXED code (preventing duplicate budget creation).
   *
   * OBSERVED ON UNFIXED CODE: 403 with message 'No active budget found...'
   *   — the unfixed code hits the same guard but throws 403 instead of 409.
   *   This is an INTENTIONAL behavior change introduced by the fix.
   *   It is NOT a regression; it is the correct re-onboarding guard.
   *
   * This test is written for FIXED code and will be verified in task 3.7.
   * It is expected to FAIL on unfixed code (returns 403, not 409).
   *
   * Validates: Requirements 2.4
   */
  test('Property 2d: profile with defaultBudgetId returns 409 on fixed code', async () => {
    // Arbitrary existing budgetId strings
    const existingBudgetIdArb = fc
      .string({ minLength: 1, maxLength: 60 })
      .filter((s) => s.trim().length > 0);

    await fc.assert(
      fc.asyncProperty(validPayloadArb, userIdArb, existingBudgetIdArb, async (payload, userId, existingBudgetId) => {
        parseIdToken.mockReturnValue({ 'custom:userId': userId });
        validateOnboardingInput.mockReturnValue([]);

        // Profile already has defaultBudgetId — re-onboarding scenario
        dynamoHelpers.getItem.mockResolvedValue({
          userId,
          defaultBudgetId: existingBudgetId,
          onboardingCompleted: true,
        });

        const event = buildEvent({ body: JSON.stringify(payload) });
        const result = await handler(event);

        // Fixed code: 409 Conflict (re-onboarding guard)
        expect(result.statusCode).toBe(409);
      }),
      { numRuns: 20, verbose: true },
    );
  });
});

// ---------------------------------------------------------------------------
// P2e — Verification failure → 500 (FIXED code)
// ---------------------------------------------------------------------------

describe('P2e — Verification failure: statusCode === 500 on fixed code', () => {
  /**
   * Property 2e: For any valid onboarding request where the profile has no
   * defaultBudgetId (bug condition) but the verification getItem call returns
   * null, the handler MUST return 500 "Budget Creation Verification Failed".
   *
   * Mock sequence:
   *   1st getItem call → profile WITHOUT defaultBudgetId (triggers first-time onboarding)
   *   2nd getItem call → null (verification read fails)
   *
   * OBSERVED ON UNFIXED CODE: 403 (the guard fires before verification is reached).
   * EXPECTED ON FIXED CODE: 500 — the fix removes the guard, so verification
   *   is reached and the null result triggers the 500 path.
   *
   * This test is written for FIXED code and will be verified in task 3.7.
   * It is expected to FAIL on unfixed code (returns 403, not 500).
   *
   * Validates: Requirements 3.7
   */
  test('Property 2e: verification getItem returns null → 500 on fixed code', async () => {
    await fc.assert(
      fc.asyncProperty(validPayloadArb, userIdArb, async (payload, userId) => {
        parseIdToken.mockReturnValue({ 'custom:userId': userId });
        validateOnboardingInput.mockReturnValue([]);

        // DynamoDBClient.send must succeed for UpdateItemCommand calls
        if (mockDynamoClientSend) {
          mockDynamoClientSend.mockResolvedValue({});
        }

        dynamoHelpers.putItem.mockResolvedValue({});

        // 1st call: profile without defaultBudgetId (first-time onboarding — bug condition)
        // 2nd call: null (verification read fails → triggers 500)
        dynamoHelpers.getItem
          .mockReset()
          .mockResolvedValueOnce({ userId }) // profile — no defaultBudgetId
          .mockResolvedValueOnce(null);       // verification read → null

        const event = buildEvent({ body: JSON.stringify(payload) });
        const result = await handler(event);

        // Fixed code: 500 Budget Creation Verification Failed
        expect(result.statusCode).toBe(500);
      }),
      { numRuns: 20, verbose: true },
    );
  });
});
