/**
 * Transaction Editing Property-Based Tests
 *
 * Property tests for transaction editing functionality using fast-check.
 * These tests validate universal properties across many generated inputs.
 *
 * Feature: test-coverage-improvement
 * Properties: 1, 2, 3
 * Validates: Requirements 1.3, 1.4, 1.6
 */

const fc = require('fast-check');

// Mocks are loaded via jest.config.js moduleNameMapper
const { dynamoHelpers, getUserFromEvent, BudgetAccessResolver } = require('/opt/nodejs/utils');

// Import handler after mocks are set up
const { handler } = require('./index');

// Arbitrary generators for transaction data
// Use integer cents and convert to dollars to avoid float precision issues
const validAmount = fc
  .integer({ min: 1, max: 10000000 })
  .map((cents) => cents / 100);
const validType = fc.constantFrom('income', 'expense');
const validCategoryId = fc
  .stringOf(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789_"), {
    minLength: 5,
    maxLength: 20,
  })
  .map((s) => `cat_${s}`);
const validDescription = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);
const validMerchantName = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

// Generate valid dates in YYYY-MM-DD format
const validDate = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  )
  .map(([year, month, day]) => {
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  });

// Invalid data generators
const invalidAmount = fc.oneof(
  fc.constant(0),
  fc.constant(-1),
  fc.constant(-100),
  fc.integer({ min: -10000, max: -1 }).map((cents) => cents / 100),
);
const invalidType = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => !['income', 'expense'].includes(s));
const invalidDate = fc.oneof(
  fc.constant('2025/11/15'),
  fc.constant('11-15-2025'),
  fc.constant('15/11/2025'),
  fc.constant('invalid'),
  fc.constant(''),
  fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => !/^\d{4}-\d{2}-\d{2}$/.test(s)),
);

describe('Transaction Editing Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default user
    getUserFromEvent.mockReturnValue({
      userId: 'user_123456789',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
    });

    // Default: resolveAccess succeeds with owner role, assertPermission is a no-op
    BudgetAccessResolver.resolveAccess.mockResolvedValue({
      budgetId: 'budget_test123',
      role: 'owner',
      budgetType: 'family',
      budgetStatus: 'active',
      subscriptionTier: 'free',
    });
    BudgetAccessResolver.assertPermission.mockImplementation(() => {});
  });

  /**
   * Property 1: Transaction Edit Round-Trip
   *
   * For any valid transaction and any valid edit (amount, category, description),
   * editing the transaction and then retrieving it SHALL return the updated values exactly.
   *
   * **Validates: Requirements 1.6**
   */
  test('Property 1: Transaction Edit Round-Trip - edited values are persisted and retrievable', async () => {
    await fc.assert(
      fc.asyncProperty(
        validAmount,
        validCategoryId,
        validDescription,
        validMerchantName,
        async (newAmount, newCategoryId, newDescription, newMerchantName) => {
          // Setup: Mock existing transaction using BUDGET# key
          const originalTransaction = {
            PK: 'BUDGET#budget_test123',
            SK: 'TRANSACTION#trans_roundtrip',
            entityType: 'TRANSACTION',
            transactionId: 'trans_roundtrip',
            budgetId: 'budget_test123',
            amount: 100,
            type: 'expense',
            categoryId: 'cat_original',
            description: 'Original',
            merchantName: 'Original Store',
            date: '2025-11-15',
            budgetMonth: '2025-11',
            accountId: null,
            createdBy: 'user_123456789',
            createdByName: 'Test User',
            createdAt: '2025-11-15T10:00:00Z',
            updatedAt: '2025-11-15T10:00:00Z',
          };

          // Track what was updated
          let updatedValues = {};

          dynamoHelpers.getItem.mockResolvedValue(originalTransaction);
          dynamoHelpers.updateItem.mockImplementation(async (pk, sk, updates) => {
            updatedValues = updates;
            return {
              ...originalTransaction,
              ...updates,
            };
          });
          dynamoHelpers.queryByPK.mockResolvedValue([]);

          // Edit the transaction
          const editEvent = {
            httpMethod: 'PUT',
            path: '/transactions/trans_roundtrip',
            pathParameters: { transactionId: 'trans_roundtrip' },
            headers: { Authorization: 'Bearer valid-token' },
            body: JSON.stringify({
              amount: newAmount,
              categoryId: newCategoryId,
              description: newDescription,
              merchantName: newMerchantName,
            }),
            requestContext: {
              authorizer: {
                claims: { 'custom:userId': 'user_123456789' },
              },
            },
          };

          const editResponse = await handler(editEvent, { awsRequestId: 'test-roundtrip' });

          // Verify edit succeeded
          expect(editResponse.statusCode).toBe(200);

          // Verify the updated values match what we sent
          expect(updatedValues.amount).toBe(newAmount);
          expect(updatedValues.categoryId).toBe(newCategoryId);
          expect(updatedValues.description).toBe(newDescription);
          expect(updatedValues.merchantName).toBe(newMerchantName);

          // Verify response contains updated values
          const responseBody = JSON.parse(editResponse.body);
          expect(responseBody.data.amount).toBe(newAmount);
          expect(responseBody.data.categoryId).toBe(newCategoryId);
          expect(responseBody.data.description).toBe(newDescription);
          expect(responseBody.data.merchantName).toBe(newMerchantName);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 2: Transaction Date Validation
   *
   * For any transaction edit with a date, the system SHALL accept dates
   * in YYYY-MM-DD format and reject dates in other formats.
   *
   * **Validates: Requirements 1.3**
   */
  test('Property 2: Transaction Date Validation - valid dates accepted, invalid rejected', async () => {
    // Test valid dates are accepted
    await fc.assert(
      fc.asyncProperty(validDate, async (date) => {
        const originalTransaction = {
          PK: 'BUDGET#budget_test123',
          SK: 'TRANSACTION#trans_date',
          entityType: 'TRANSACTION',
          transactionId: 'trans_date',
          budgetId: 'budget_test123',
          amount: 100,
          type: 'expense',
          categoryId: 'cat_test',
          description: 'Test',
          date: '2025-11-15',
          budgetMonth: '2025-11',
          accountId: null,
          createdBy: 'user_123456789',
          createdByName: 'Test User',
          createdAt: '2025-11-15T10:00:00Z',
          updatedAt: '2025-11-15T10:00:00Z',
        };

        dynamoHelpers.getItem.mockResolvedValue(originalTransaction);
        dynamoHelpers.updateItem.mockImplementation(async (pk, sk, updates) => ({
          ...originalTransaction,
          ...updates,
        }));
        dynamoHelpers.queryByPK.mockResolvedValue([]);

        const event = {
          httpMethod: 'PUT',
          path: '/transactions/trans_date',
          pathParameters: { transactionId: 'trans_date' },
          headers: { Authorization: 'Bearer valid-token' },
          body: JSON.stringify({ date }),
          requestContext: {
            authorizer: {
              claims: { 'custom:userId': 'user_123456789' },
            },
          },
        };

        const response = await handler(event, { awsRequestId: 'test-date-valid' });

        // Valid dates should be accepted (200)
        expect(response.statusCode).toBe(200);

        // Budget month should be extracted correctly
        const expectedBudgetMonth = date.substring(0, 7);
        const responseBody = JSON.parse(response.body);
        expect(responseBody.data.budgetMonth).toBe(expectedBudgetMonth);
      }),
      { numRuns: 30 },
    );

    // Test invalid dates are rejected
    await fc.assert(
      fc.asyncProperty(invalidDate, async (date) => {
        const originalTransaction = {
          PK: 'BUDGET#budget_test123',
          SK: 'TRANSACTION#trans_date_invalid',
          entityType: 'TRANSACTION',
          transactionId: 'trans_date_invalid',
          budgetId: 'budget_test123',
          amount: 100,
          type: 'expense',
          categoryId: 'cat_test',
          description: 'Test',
          date: '2025-11-15',
          budgetMonth: '2025-11',
          accountId: null,
          createdBy: 'user_123456789',
          createdByName: 'Test User',
          createdAt: '2025-11-15T10:00:00Z',
          updatedAt: '2025-11-15T10:00:00Z',
        };

        dynamoHelpers.getItem.mockResolvedValue(originalTransaction);

        const event = {
          httpMethod: 'PUT',
          path: '/transactions/trans_date_invalid',
          pathParameters: { transactionId: 'trans_date_invalid' },
          headers: { Authorization: 'Bearer valid-token' },
          body: JSON.stringify({ date }),
          requestContext: {
            authorizer: {
              claims: { 'custom:userId': 'user_123456789' },
            },
          },
        };

        const response = await handler(event, { awsRequestId: 'test-date-invalid' });

        // Invalid dates should be rejected (400)
        expect(response.statusCode).toBe(400);
      }),
      { numRuns: 30 },
    );
  });

  /**
   * Property 3: Transaction Invalid Data Rejection
   *
   * For any transaction edit with invalid data (negative amount, invalid type),
   * the system SHALL reject the edit and return validation errors.
   *
   * **Validates: Requirements 1.4**
   */
  test('Property 3: Transaction Invalid Data Rejection - invalid amounts rejected', async () => {
    await fc.assert(
      fc.asyncProperty(invalidAmount, async (amount) => {
        const originalTransaction = {
          PK: 'BUDGET#budget_test123',
          SK: 'TRANSACTION#trans_invalid',
          entityType: 'TRANSACTION',
          transactionId: 'trans_invalid',
          budgetId: 'budget_test123',
          amount: 100,
          type: 'expense',
          categoryId: 'cat_test',
          description: 'Test',
          date: '2025-11-15',
          budgetMonth: '2025-11',
          accountId: null,
          createdBy: 'user_123456789',
          createdByName: 'Test User',
          createdAt: '2025-11-15T10:00:00Z',
          updatedAt: '2025-11-15T10:00:00Z',
        };

        dynamoHelpers.getItem.mockResolvedValue(originalTransaction);

        const event = {
          httpMethod: 'PUT',
          path: '/transactions/trans_invalid',
          pathParameters: { transactionId: 'trans_invalid' },
          headers: { Authorization: 'Bearer valid-token' },
          body: JSON.stringify({ amount }),
          requestContext: {
            authorizer: {
              claims: { 'custom:userId': 'user_123456789' },
            },
          },
        };

        const response = await handler(event, { awsRequestId: 'test-invalid-amount' });

        // Invalid amounts should be rejected (400)
        expect(response.statusCode).toBe(400);
      }),
      { numRuns: 30 },
    );
  });

  test('Property 3: Transaction Invalid Data Rejection - invalid types rejected', async () => {
    await fc.assert(
      fc.asyncProperty(invalidType, async (type) => {
        const originalTransaction = {
          PK: 'BUDGET#budget_test123',
          SK: 'TRANSACTION#trans_invalid_type',
          entityType: 'TRANSACTION',
          transactionId: 'trans_invalid_type',
          budgetId: 'budget_test123',
          amount: 100,
          type: 'expense',
          categoryId: 'cat_test',
          description: 'Test',
          date: '2025-11-15',
          budgetMonth: '2025-11',
          accountId: null,
          createdBy: 'user_123456789',
          createdByName: 'Test User',
          createdAt: '2025-11-15T10:00:00Z',
          updatedAt: '2025-11-15T10:00:00Z',
        };

        dynamoHelpers.getItem.mockResolvedValue(originalTransaction);

        const event = {
          httpMethod: 'PUT',
          path: '/transactions/trans_invalid_type',
          pathParameters: { transactionId: 'trans_invalid_type' },
          headers: { Authorization: 'Bearer valid-token' },
          body: JSON.stringify({ type }),
          requestContext: {
            authorizer: {
              claims: { 'custom:userId': 'user_123456789' },
            },
          },
        };

        const response = await handler(event, { awsRequestId: 'test-invalid-type' });

        // Invalid types should be rejected (400)
        expect(response.statusCode).toBe(400);
      }),
      { numRuns: 30 },
    );
  });

  /**
   * Additional Property: Type Change Consistency
   *
   * For any valid type change (income <-> expense), the system SHALL
   * accept the change and update the transaction type correctly.
   */
  test('Property: Type Change Consistency - valid type changes accepted', async () => {
    await fc.assert(
      fc.asyncProperty(validType, async (newType) => {
        const originalTransaction = {
          PK: 'BUDGET#budget_test123',
          SK: 'TRANSACTION#trans_type',
          entityType: 'TRANSACTION',
          transactionId: 'trans_type',
          budgetId: 'budget_test123',
          amount: 100,
          type: 'expense', // Original type
          categoryId: 'cat_test',
          description: 'Test',
          date: '2025-11-15',
          budgetMonth: '2025-11',
          accountId: null,
          createdBy: 'user_123456789',
          createdByName: 'Test User',
          createdAt: '2025-11-15T10:00:00Z',
          updatedAt: '2025-11-15T10:00:00Z',
        };

        let updatedType = null;

        dynamoHelpers.getItem.mockResolvedValue(originalTransaction);
        dynamoHelpers.updateItem.mockImplementation(async (pk, sk, updates) => {
          updatedType = updates.type;
          return {
            ...originalTransaction,
            ...updates,
          };
        });
        dynamoHelpers.queryByPK.mockResolvedValue([]);

        const event = {
          httpMethod: 'PUT',
          path: '/transactions/trans_type',
          pathParameters: { transactionId: 'trans_type' },
          headers: { Authorization: 'Bearer valid-token' },
          body: JSON.stringify({ type: newType }),
          requestContext: {
            authorizer: {
              claims: { 'custom:userId': 'user_123456789' },
            },
          },
        };

        const response = await handler(event, { awsRequestId: 'test-type-change' });

        // Valid type changes should be accepted
        expect(response.statusCode).toBe(200);
        expect(updatedType).toBe(newType);

        const responseBody = JSON.parse(response.body);
        expect(responseBody.data.type).toBe(newType);
      }),
      { numRuns: 20 },
    );
  });
});
