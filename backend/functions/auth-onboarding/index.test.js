/**
 * Unit tests for auth-onboarding Lambda function
 */

// Mock AWS SDK before requiring the handler
jest.mock('@aws-sdk/client-dynamodb');

// Mock local utilities
jest.mock('./utils/dynamo-helpers');

const { handler } = require('./index');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { parseIdToken } = require('/opt/nodejs/shared/token-parser');
const { validateOnboardingInput } = require('/opt/nodejs/shared/validators');
const dynamoHelpers = require('./utils/dynamo-helpers');

// Capture the dynamoClient instance created at module load time.
// Jest's auto-mock places `send` as an instance property, so spying on the
// prototype or using mockImplementation for new instances won't affect it.
const _mockDynamoClientSend = DynamoDBClient.mock.instances[0]?.send;

const BASE_EVENT = {
  httpMethod: 'POST',
  headers: { Authorization: 'Bearer valid-token' },
  body: JSON.stringify({
    city: 'New York',
    country: 'United States',
    familySize: 2,
    currentMonth: '2026-01',
    selectedCategories: [
      { name: 'Groceries', icon: '🛒', adjustedAmount: 500 },
    ],
  }),
};

describe('Auth Onboarding Lambda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-set the return value after clearAllMocks (which clears call history but not implementations)
    if (_mockDynamoClientSend) {
      _mockDynamoClientSend.mockResolvedValue({});
    }
    process.env.TABLE_NAME = 'test-table';
    process.env.AWS_REGION = 'us-east-1';
  });

  describe('CORS preflight', () => {
    test('should handle OPTIONS request', async () => {
      const event = {
        httpMethod: 'OPTIONS',
        headers: { origin: 'http://localhost:3000' },
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('');
    });
  });

  describe('Authentication', () => {
    test('should return 401 if Authorization header is missing', async () => {
      const event = {
        httpMethod: 'POST',
        headers: {},
        body: JSON.stringify({}),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    test('should parse JWT token and extract userId', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ userId: 'user-123' }) // profile without defaultBudgetId
        .mockResolvedValueOnce({ budgetId: 'some-id' }); // verification
      dynamoHelpers.putItem.mockResolvedValue();

      await handler(BASE_EVENT);

      expect(parseIdToken).toHaveBeenCalledWith('valid-token');
    });

    test('should fallback to sub if custom:userId not in token', async () => {
      parseIdToken.mockReturnValue({ sub: 'cognito-sub-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ userId: 'cognito-sub-123' }) // profile without defaultBudgetId
        .mockResolvedValueOnce({ budgetId: 'some-id' }); // verification
      dynamoHelpers.putItem.mockResolvedValue();

      const response = await handler(BASE_EVENT);

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Validation', () => {
    test('should return 400 if request body is missing', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });

      const event = { httpMethod: 'POST', headers: { Authorization: 'Bearer valid-token' }, body: null };
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    test('should return 400 if JSON is invalid', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });

      const event = { httpMethod: 'POST', headers: { Authorization: 'Bearer valid-token' }, body: 'invalid-json' };
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
    });

    test('should return 400 if validation fails', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue(['City is required', 'Family size must be between 1 and 20']);

      const event = {
        httpMethod: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({ city: '', country: 'US', familySize: 0, currentMonth: '2026-01', selectedCategories: [] }),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(validateOnboardingInput).toHaveBeenCalled();
    });
  });

  describe('Profile resolution', () => {
    test('should return 403 if user profile not found', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem.mockResolvedValueOnce(null); // no profile
      dynamoHelpers.putItem.mockResolvedValue();

      const response = await handler(BASE_EVENT);

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('User profile not found');
    });

    test('should return 409 if profile already has defaultBudgetId (re-onboarding guard)', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem.mockResolvedValueOnce({ defaultBudgetId: 'budget-abc' }); // profile with existing budget

      const response = await handler(BASE_EVENT);

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Onboarding already completed');
    });

    test('should proceed with first-time onboarding if profile has no defaultBudgetId', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ userId: 'user-123' }) // profile without defaultBudgetId
        .mockResolvedValueOnce({ budgetId: 'some-id', month: '2026-01' }); // verification
      dynamoHelpers.putItem.mockResolvedValue();

      const response = await handler(BASE_EVENT);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.budgetCreated).toBe(true);
    });
  });

  describe('Successful onboarding', () => {
    test('should complete onboarding and create budget period', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ userId: 'user-123' }) // profile without defaultBudgetId (first-time)
        .mockResolvedValueOnce({ budgetId: 'some-id', month: '2026-01' }); // verification
      dynamoHelpers.putItem.mockResolvedValue();

      const event = {
        httpMethod: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({
          city: 'New York',
          country: 'United States',
          familySize: 2,
          currentMonth: '2026-01',
          selectedCategories: [
            { name: 'Groceries', icon: '🛒', adjustedAmount: 500 },
            { name: 'Rent', icon: '🏠', adjustedAmount: 2000 },
          ],
        }),
      };

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Onboarding completed successfully');
      expect(body.budgetCreated).toBe(true);
      expect(body.totalExpenses).toBe(2500);
      expect(body.categoriesCreated).toBe(2);
    });

    test('should call UpdateItemCommand with :budgetId matching the budgetId in the response body', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ userId: 'user-123' }) // profile without defaultBudgetId (first-time)
        .mockResolvedValueOnce({ budgetId: 'some-id', month: '2026-01' }); // verification
      dynamoHelpers.putItem.mockResolvedValue();

      const { UpdateItemCommand: MockUpdateItemCommand } = require('@aws-sdk/client-dynamodb');

      const response = await handler(BASE_EVENT);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.budgetId).toBeDefined();

      // Verify UpdateItemCommand was constructed with :budgetId equal to the budgetId in the response
      expect(MockUpdateItemCommand).toHaveBeenCalledTimes(1);
      const constructorArg = MockUpdateItemCommand.mock.calls[0][0];
      expect(constructorArg.ExpressionAttributeValues[':budgetId']).toEqual({ S: body.budgetId });
    });
  });

  describe('Budget period creation', () => {
    test('should write METADATA record before budget period', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ userId: 'user-123' }) // profile without defaultBudgetId
        .mockResolvedValueOnce({ budgetId: 'some-id' }); // verification
      dynamoHelpers.putItem.mockResolvedValue();

      await handler(BASE_EVENT);

      // First putItem call is the METADATA record
      const metadataArg = dynamoHelpers.putItem.mock.calls[0][0];
      expect(metadataArg.PK).toMatch(/^BUDGET#budget_/);
      expect(metadataArg.SK).toBe('METADATA');
      expect(metadataArg.budgetType).toBe('personal');
      expect(metadataArg.status).toBe('active');
    });

    test('should write MEMBER#userId record after METADATA', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ userId: 'user-123' }) // profile without defaultBudgetId
        .mockResolvedValueOnce({ budgetId: 'some-id' }); // verification
      dynamoHelpers.putItem.mockResolvedValue();

      await handler(BASE_EVENT);

      // Second putItem call is the MEMBER record
      const memberArg = dynamoHelpers.putItem.mock.calls[1][0];
      expect(memberArg.PK).toMatch(/^BUDGET#budget_/);
      expect(memberArg.SK).toBe('MEMBER#user-123');
      expect(memberArg.role).toBe('owner');
      expect(memberArg.status).toBe('active');
      expect(memberArg.userId).toBe('user-123');
      // MEMBER should share the same budgetId as METADATA
      expect(memberArg.PK).toBe(dynamoHelpers.putItem.mock.calls[0][0].PK);
    });

    test('should write budget period with BUDGET#/PERIOD# key pattern', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ userId: 'user-123' }) // profile without defaultBudgetId
        .mockResolvedValueOnce({ budgetId: 'some-id' }); // verification
      dynamoHelpers.putItem.mockResolvedValue();

      await handler(BASE_EVENT);

      // Third putItem call is the budget period (after METADATA and MEMBER#userId)
      const periodArg = dynamoHelpers.putItem.mock.calls[2][0];
      expect(periodArg.PK).toMatch(/^BUDGET#budget_/);
      expect(periodArg.SK).toBe('PERIOD#2026-01');
      expect(periodArg.month).toBe('2026-01');
      expect(periodArg.totalExpenses).toBe(500);
      expect(periodArg.groups.expenses).toHaveLength(1);
      // METADATA and PERIOD should share the same budgetId
      expect(periodArg.PK).toBe(dynamoHelpers.putItem.mock.calls[0][0].PK);
    });

    test('should write cash account under BUDGET# partition key', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ userId: 'user-123' }) // profile without defaultBudgetId
        .mockResolvedValueOnce({ budgetId: 'some-id' }); // verification
      dynamoHelpers.putItem.mockResolvedValue();

      await handler(BASE_EVENT);

      // Fourth putItem call is the cash account (after METADATA, MEMBER#userId, PERIOD#month)
      const accountArg = dynamoHelpers.putItem.mock.calls[3][0];
      expect(accountArg.PK).toMatch(/^BUDGET#budget_/);
      expect(accountArg.SK).toMatch(/^ACCOUNT#/);
      expect(accountArg.nickname).toBe('Cash');
    });

    test('should return 500 if budget period verification fails', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ userId: 'user-123' }) // profile without defaultBudgetId
        .mockResolvedValueOnce(null); // verification returns null
      dynamoHelpers.putItem.mockResolvedValue();

      const response = await handler(BASE_EVENT);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Budget Creation Verification Failed');
    });
  });

  describe('budgetType handling', () => {
    test('should write METADATA with budgetType family via putItem', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ userId: 'user-123' }) // profile without defaultBudgetId
        .mockResolvedValueOnce({ budgetId: 'some-id' }); // verification
      dynamoHelpers.putItem.mockResolvedValue();

      const event = {
        httpMethod: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({
          city: 'New York',
          country: 'United States',
          familySize: 2,
          currentMonth: '2026-01',
          budgetType: 'family',
          selectedCategories: [{ name: 'Groceries', icon: '🛒', adjustedAmount: 500 }],
        }),
      };

      const response = await handler(event);

      // Only one UpdateItemCommand call: profile update (METADATA is now written via putItem)
      expect(_mockDynamoClientSend).toHaveBeenCalledTimes(1);
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.debugInfo.budgetType).toBe('family');

      // METADATA putItem (first call) should have budgetType: 'family'
      const metadataArg = dynamoHelpers.putItem.mock.calls[0][0];
      expect(metadataArg.SK).toBe('METADATA');
      expect(metadataArg.budgetType).toBe('family');
    });

    test('should write METADATA with budgetType shared via putItem', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ userId: 'user-123' }) // profile without defaultBudgetId
        .mockResolvedValueOnce({ budgetId: 'some-id' }); // verification
      dynamoHelpers.putItem.mockResolvedValue();

      const event = {
        httpMethod: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({
          city: 'New York',
          country: 'United States',
          familySize: 2,
          currentMonth: '2026-01',
          budgetType: 'shared',
          selectedCategories: [{ name: 'Groceries', icon: '🛒', adjustedAmount: 500 }],
        }),
      };

      const response = await handler(event);

      expect(_mockDynamoClientSend).toHaveBeenCalledTimes(1);
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.debugInfo.budgetType).toBe('shared');

      // METADATA putItem (first call) should have budgetType: 'shared'
      const metadataArg = dynamoHelpers.putItem.mock.calls[0][0];
      expect(metadataArg.SK).toBe('METADATA');
      expect(metadataArg.budgetType).toBe('shared');
    });

    test('should NOT update budget metadata when budgetType is personal', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ userId: 'user-123' }) // profile without defaultBudgetId
        .mockResolvedValueOnce({ budgetId: 'some-id' }); // verification
      dynamoHelpers.putItem.mockResolvedValue();

      const event = {
        httpMethod: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({
          city: 'New York',
          country: 'United States',
          familySize: 1,
          currentMonth: '2026-01',
          budgetType: 'personal',
          selectedCategories: [{ name: 'Groceries', icon: '🛒', adjustedAmount: 500 }],
        }),
      };

      const response = await handler(event);

      // Only one UpdateItemCommand call: profile update only (no budget metadata update for personal)
      expect(_mockDynamoClientSend).toHaveBeenCalledTimes(1);
      expect(response.statusCode).toBe(200);

      // METADATA putItem (first call) should have budgetType: 'personal'
      const metadataArg = dynamoHelpers.putItem.mock.calls[0][0];
      expect(metadataArg.SK).toBe('METADATA');
      expect(metadataArg.budgetType).toBe('personal');
    });
  });

  describe('Import availability', () => {
    test('should have handler exported', () => {
      const { handler: h } = require('./index');
      expect(h).toBeDefined();
      expect(typeof h).toBe('function');
    });
  });
});
