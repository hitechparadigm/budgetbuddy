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
      dynamoHelpers.getItem.mockResolvedValueOnce({ defaultBudgetId: 'budget-abc' }); // profile
      dynamoHelpers.putItem.mockResolvedValue();
      dynamoHelpers.getItem.mockResolvedValueOnce({ budgetId: 'budget-abc' }); // verification

      await handler(BASE_EVENT);

      expect(parseIdToken).toHaveBeenCalledWith('valid-token');
    });

    test('should fallback to sub if custom:userId not in token', async () => {
      parseIdToken.mockReturnValue({ sub: 'cognito-sub-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem.mockResolvedValueOnce({ defaultBudgetId: 'budget-abc' });
      dynamoHelpers.putItem.mockResolvedValue();
      dynamoHelpers.getItem.mockResolvedValueOnce({ budgetId: 'budget-abc' });

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

      const response = await handler(BASE_EVENT);

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('User profile not found');
    });

    test('should return 403 if profile has no defaultBudgetId', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem.mockResolvedValueOnce({ userId: 'user-123' }); // profile without defaultBudgetId

      const response = await handler(BASE_EVENT);

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('No active budget found');
    });
  });

  describe('Successful onboarding', () => {
    test('should complete onboarding and create budget period', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ defaultBudgetId: 'budget-abc' }) // profile
        .mockResolvedValueOnce({ budgetId: 'budget-abc', month: '2026-01' }); // verification
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
  });

  describe('Budget period creation', () => {
    test('should write budget period with new BUDGET#/PERIOD# key pattern', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ defaultBudgetId: 'budget-abc' })
        .mockResolvedValueOnce({ budgetId: 'budget-abc' });
      dynamoHelpers.putItem.mockResolvedValue();

      await handler(BASE_EVENT);

      // First putItem call is the budget period
      const periodArg = dynamoHelpers.putItem.mock.calls[0][0];
      expect(periodArg.PK).toBe('BUDGET#budget-abc');
      expect(periodArg.SK).toBe('PERIOD#2026-01');
      expect(periodArg.month).toBe('2026-01');
      expect(periodArg.totalExpenses).toBe(500);
      expect(periodArg.groups.expenses).toHaveLength(1);
    });

    test('should write cash account under BUDGET# partition key', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ defaultBudgetId: 'budget-abc' })
        .mockResolvedValueOnce({ budgetId: 'budget-abc' });
      dynamoHelpers.putItem.mockResolvedValue();

      await handler(BASE_EVENT);

      // Second putItem call is the cash account
      const accountArg = dynamoHelpers.putItem.mock.calls[1][0];
      expect(accountArg.PK).toBe('BUDGET#budget-abc');
      expect(accountArg.SK).toMatch(/^ACCOUNT#/);
      expect(accountArg.nickname).toBe('Cash');
    });

    test('should return 500 if budget period verification fails', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ defaultBudgetId: 'budget-abc' }) // profile
        .mockResolvedValueOnce(null); // verification returns null
      dynamoHelpers.putItem.mockResolvedValue();

      const response = await handler(BASE_EVENT);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Budget Creation Verification Failed');
    });
  });

  describe('budgetType handling', () => {
    test('should update budget metadata when budgetType is family', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ defaultBudgetId: 'budget-abc' })
        .mockResolvedValueOnce({ budgetId: 'budget-abc' });
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

      // Two UpdateItemCommand calls: profile update + budget metadata update
      expect(_mockDynamoClientSend).toHaveBeenCalledTimes(2);
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.debugInfo.budgetType).toBe('family');
    });

    test('should update budget metadata when budgetType is shared', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ defaultBudgetId: 'budget-abc' })
        .mockResolvedValueOnce({ budgetId: 'budget-abc' });
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

      expect(_mockDynamoClientSend).toHaveBeenCalledTimes(2);
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.debugInfo.budgetType).toBe('shared');
    });

    test('should NOT update budget metadata when budgetType is personal', async () => {
      parseIdToken.mockReturnValue({ 'custom:userId': 'user-123' });
      validateOnboardingInput.mockReturnValue([]);
      dynamoHelpers.getItem
        .mockResolvedValueOnce({ defaultBudgetId: 'budget-abc' })
        .mockResolvedValueOnce({ budgetId: 'budget-abc' });
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
