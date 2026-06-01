/**
 * Bug Condition Exploration Property-Based Test
 *
 * Property 1: Bug Condition — First-Time Onboarding Returns 403
 *
 * Validates: Requirements 2.1, 2.2, 2.3
 *
 * CRITICAL: This test is EXPECTED TO FAIL on unfixed code.
 * Failure confirms the bug exists (isBugCondition(X) = true → handler returns 403).
 * The test encodes the EXPECTED (correct) behavior — it will pass after the fix.
 *
 * Bug condition: user profile exists in DynamoDB but has no `defaultBudgetId`
 * (first-time onboarding state created by auth-register).
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

describe('Property 1: Bug Condition — First-Time Onboarding Returns 403', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Restore DynamoDBClient.send mock after clearAllMocks
    if (mockDynamoClientSend) {
      mockDynamoClientSend.mockResolvedValue({});
    }

    process.env.TABLE_NAME = 'test-table';
    process.env.AWS_REGION = 'us-east-1';

    // Token always resolves to a valid userId
    parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });

    // Validation always passes (we are testing the bug condition, not validation)
    validateOnboardingInput.mockReturnValue([]);

    // isBugCondition(X) = true:
    //   First getItem call → profile WITHOUT defaultBudgetId (the bug trigger)
    //   Second getItem call → valid period object (verification read)
    dynamoHelpers.getItem
      .mockResolvedValueOnce({ userId: 'user-123' }) // profile — no defaultBudgetId
      .mockResolvedValueOnce({ budgetId: 'budget-xyz', month: '2025-01' }); // verification

    dynamoHelpers.putItem.mockResolvedValue({});
  });

  /**
   * Property 1: Bug Condition — First-Time Onboarding Returns 403
   *
   * For any valid onboarding payload where isBugCondition(X) is true
   * (profile exists, defaultBudgetId absent), the handler MUST NOT return 403.
   * It MUST return 200 with budgetCreated: true and a non-null budgetId.
   *
   * On UNFIXED code this test FAILS — the handler returns 403 for every input,
   * proving the bug exists.
   *
   * Validates: Requirements 2.1, 2.2, 2.3
   */
  test('Property 1: for all valid onboarding payloads where isBugCondition is true, handler must not return 403', async () => {
    // Arbitrary valid onboarding payload generator
    const onboardingPayloadArb = fc.record({
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

    await fc.assert(
      fc.asyncProperty(onboardingPayloadArb, async (payload) => {
        // Reset mocks for each generated input so getItem returns the bug-condition
        // profile (no defaultBudgetId) on the first call and a valid period on the second
        dynamoHelpers.getItem
          .mockReset()
          .mockResolvedValueOnce({ userId: 'user-123' }) // profile — no defaultBudgetId
          .mockResolvedValueOnce({ budgetId: 'budget-xyz', month: payload.currentMonth }); // verification

        dynamoHelpers.putItem.mockResolvedValue({});

        if (mockDynamoClientSend) {
          mockDynamoClientSend.mockResolvedValue({});
        }

        const event = {
          httpMethod: 'POST',
          headers: { Authorization: 'Bearer valid-token' },
          body: JSON.stringify(payload),
        };

        const result = await handler(event);

        // Assert: handler must NOT return 403 (the bug)
        expect(result.statusCode).not.toBe(403);

        // Assert: handler must return 200 with budgetCreated: true and a budgetId
        expect(result.statusCode).toBe(200);

        const body = JSON.parse(result.body);
        expect(body.budgetCreated).toBe(true);
        expect(body.budgetId).not.toBeNull();
        expect(body.budgetId).not.toBeUndefined();
      }),
      {
        numRuns: 20,
        verbose: true,
      },
    );
  });
});
