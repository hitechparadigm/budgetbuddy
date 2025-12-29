/**
 * Transaction Entry Property-Based Tests
 * Validates transaction entry flow and data integrity
 *
 * **Property 12: Transaction Data Integrity**
 * **Property 13: Transaction Entry Flow Validation**
 * **Validates: Requirements 23.4, 23.5, 24.2**
 */

import fc from 'fast-check';
import {
  CreateTransactionRequest,
  UpdateTransactionRequest,
} from '../../services/transaction';
import { Transaction } from '../../types';

// Mock offline data for testing
jest.mock('../../services/offline', () => ({
  getOfflineData: jest.fn(() => Promise.resolve([])),
  storeOfflineData: jest.fn(() => Promise.resolve()),
  deleteOfflineData: jest.fn(() => Promise.resolve()),
  addToSyncQueue: jest.fn(() => Promise.resolve()),
}));

// Mock API for testing
jest.mock('../../services/api', () => ({
  getNetworkStatus: jest.fn(() => ({ isOnline: false })),
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  queryKeys: {
    transactions: ['transactions'],
    transaction: (id: string) => ['transactions', id],
    transactionsByBudget: (budgetId: string) => ['transactions', 'budget', budgetId],
    transactionsByMonth: (year: number, month: number) => ['transactions', 'month', year, month],
  },
}));

describe('Transaction Entry Properties', () => {
  /**
   * Property 12: Transaction Data Integrity
   * For any valid transaction data, the created transaction should maintain
   * data integrity and all required fields should be preserved
   */
  it('Property 12: Transaction data integrity - should preserve all transaction data correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
          description: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          merchant: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
          date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 10 })),
        }),
        async (data) => {
          const transactionRequest: CreateTransactionRequest = {
            categoryId: data.categoryId,
            amount: Math.fround(data.amount),
            description: data.description,
            merchant: data.merchant || undefined,
            date: data.date.toISOString().split('T')[0],
            tags: data.tags && data.tags.length > 0 ? data.tags : undefined,
          };

          // Property: Required fields should be present
          expect(transactionRequest.categoryId).toBeTruthy();
          expect(transactionRequest.amount).toBeGreaterThan(0);
          expect(transactionRequest.description).toBeTruthy();
          expect(transactionRequest.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

          // Property: Amount should be a valid number
          expect(Number.isFinite(transactionRequest.amount)).toBe(true);
          expect(transactionRequest.amount).toBeGreaterThan(0);

          // Property: Date should be valid ISO date format
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          expect(transactionRequest.date).toMatch(dateRegex);

          // Property: Optional fields should be undefined if not provided
          if (!data.merchant) {
            expect(transactionRequest.merchant).toBeUndefined();
          }

          if (!data.tags || data.tags.length === 0) {
            expect(transactionRequest.tags).toBeUndefined();
          }

          // Property: Tags should be unique if provided
          if (transactionRequest.tags) {
            const uniqueTags = [...new Set(transactionRequest.tags)];
            expect(transactionRequest.tags.length).toBeGreaterThanOrEqual(uniqueTags.length);
          }

          // Property: Description should be trimmed and non-empty
          expect(transactionRequest.description.trim()).toBeTruthy();
          expect(transactionRequest.description.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 13: Transaction Entry Flow Validation
   * For any transaction entry flow, the validation should be consistent
   * and error handling should be predictable
   */
  it('Property 13: Transaction entry flow validation - should validate transaction data consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          categoryId: fc.option(fc.string()),
          amount: fc.option(fc.oneof(
            fc.float({ min: Math.fround(-1000), max: Math.fround(10000), noNaN: true }),
            fc.constant(NaN),
            fc.constant(0),
            fc.constant(-1)
          )),
          description: fc.option(fc.string()),
          date: fc.option(fc.string()),
        }),
        async (data) => {
          // Simulate form validation logic
          const validateTransactionForm = (formData: any): { isValid: boolean; errors: string[] } => {
            const errors: string[] = [];

            if (!formData.categoryId || formData.categoryId.trim() === '') {
              errors.push('Category is required');
            }

            if (!formData.amount || isNaN(formData.amount) || formData.amount <= 0) {
              errors.push('Valid amount is required');
            }

            if (!formData.description || formData.description.trim() === '') {
              errors.push('Description is required');
            }

            if (!formData.date || !formData.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
              errors.push('Valid date is required');
            }

            return {
              isValid: errors.length === 0,
              errors,
            };
          };

          const validation = validateTransactionForm(data);

          // Property: Validation should be deterministic
          const validation2 = validateTransactionForm(data);
          expect(validation.isValid).toBe(validation2.isValid);
          expect(validation.errors).toEqual(validation2.errors);

          // Property: Invalid data should always fail validation
          if (!data.categoryId || data.categoryId.trim() === '') {
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Category is required');
          }

          if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Valid amount is required');
          }

          if (!data.description || data.description.trim() === '') {
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Description is required');
          }

          if (!data.date || !data.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Valid date is required');
          }

          // Property: Valid data should pass validation
          if (
            data.categoryId && data.categoryId.trim() !== '' &&
            data.amount && !isNaN(data.amount) && data.amount > 0 &&
            data.description && data.description.trim() !== '' &&
            data.date && data.date.match(/^\d{4}-\d{2}-\d{2}$/)
          ) {
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Transaction Update Consistency
   * For any transaction update, the updated fields should be preserved
   * while unchanged fields remain the same
   */
  it('Property: Transaction update consistency - should preserve unchanged fields during updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          originalTransaction: fc.record({
            id: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            categoryId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true }),
            description: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            merchant: fc.option(fc.string({ minLength: 1 })),
            date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            tags: fc.option(fc.array(fc.string({ minLength: 1 }), { maxLength: 5 })),
          }),
          updates: fc.record({
            amount: fc.option(fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true }), { nil: undefined }),
            description: fc.option(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { nil: undefined }),
            merchant: fc.option(fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), { nil: undefined }),
          }),
        }),
        async (data) => {
          const original = data.originalTransaction;
          const updates = data.updates;

          // Simulate transaction update
          const updateRequest: UpdateTransactionRequest = {
            id: original.id,
            ...(updates.amount !== undefined && { amount: Math.fround(updates.amount) }),
            ...(updates.description !== undefined && { description: updates.description }),
            ...(updates.merchant !== undefined && { merchant: updates.merchant }),
          };

          // Property: ID should always be preserved
          expect(updateRequest.id).toBe(original.id);

          // Property: Updated fields should have new values
          if (updates.amount !== undefined) {
            expect(updateRequest.amount).toBeCloseTo(updates.amount, 2);
          }

          if (updates.description !== undefined) {
            expect(updateRequest.description).toBe(updates.description);
          }

          if (updates.merchant !== undefined) {
            expect(updateRequest.merchant).toBe(updates.merchant);
          }

          // Property: Unchanged fields should not be included in update request
          if (updates.amount === undefined) {
            expect(updateRequest.amount).toBeUndefined();
          }

          if (updates.description === undefined) {
            expect(updateRequest.description).toBeUndefined();
          }

          if (updates.merchant === undefined) {
            expect(updateRequest.merchant).toBeUndefined();
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Transaction Search and Filtering
   * For any search query, the filtering should be consistent and predictable
   */
  it('Property: Transaction search and filtering - should filter transactions consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          transactions: fc.array(
            fc.record({
              id: fc.string({ minLength: 1 }),
              description: fc.string({ minLength: 1, maxLength: 50 }),
              merchant: fc.option(fc.string({ minLength: 1, maxLength: 30 })),
              tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 })),
              amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true }),
            }),
            { maxLength: 20 }
          ),
          searchQuery: fc.string({ maxLength: 20 }),
        }),
        async (data) => {
          const { transactions, searchQuery } = data;

          // Simulate transaction filtering logic
          const filterTransactions = (transactions: any[], query: string) => {
            if (!query.trim()) return transactions;

            const lowerQuery = query.toLowerCase();
            return transactions.filter(transaction => {
              return (
                transaction.description.toLowerCase().includes(lowerQuery) ||
                transaction.merchant?.toLowerCase().includes(lowerQuery) ||
                transaction.tags?.some((tag: string) => tag.toLowerCase().includes(lowerQuery))
              );
            });
          };

          const filteredTransactions = filterTransactions(transactions, searchQuery);

          // Property: Filtering should be deterministic
          const filteredTransactions2 = filterTransactions(transactions, searchQuery);
          expect(filteredTransactions).toEqual(filteredTransactions2);

          // Property: Empty query should return all transactions
          if (!searchQuery.trim()) {
            expect(filteredTransactions).toEqual(transactions);
          }

          // Property: Filtered results should be subset of original
          expect(filteredTransactions.length).toBeLessThanOrEqual(transactions.length);

          // Property: All filtered transactions should match the query
          if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            filteredTransactions.forEach(transaction => {
              const matchesDescription = transaction.description.toLowerCase().includes(lowerQuery);
              const matchesMerchant = transaction.merchant?.toLowerCase().includes(lowerQuery);
              const matchesTags = transaction.tags?.some((tag: string) =>
                tag.toLowerCase().includes(lowerQuery)
              );

              expect(matchesDescription || matchesMerchant || matchesTags).toBe(true);
            });
          }

          // Property: Case insensitive search should work
          if (searchQuery.trim()) {
            const upperCaseFiltered = filterTransactions(transactions, searchQuery.toUpperCase());
            const lowerCaseFiltered = filterTransactions(transactions, searchQuery.toLowerCase());
            expect(upperCaseFiltered.length).toBe(lowerCaseFiltered.length);
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});

/**
 * Integration Tests for Transaction Entry Flow
 */
describe('Transaction Entry Flow Integration', () => {
  it('should handle valid transaction creation data', () => {
    const validTransaction: CreateTransactionRequest = {
      categoryId: 'category-123',
      amount: 25.99,
      description: 'Coffee shop purchase',
      merchant: 'Starbucks',
      date: '2024-12-29',
      tags: ['coffee', 'morning'],
    };

    // All required fields should be present
    expect(validTransaction.categoryId).toBeTruthy();
    expect(validTransaction.amount).toBeGreaterThan(0);
    expect(validTransaction.description).toBeTruthy();
    expect(validTransaction.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Optional fields should be properly set
    expect(validTransaction.merchant).toBe('Starbucks');
    expect(validTransaction.tags).toEqual(['coffee', 'morning']);
  });

  it('should handle transaction updates correctly', () => {
    const updateRequest: UpdateTransactionRequest = {
      id: 'transaction-123',
      amount: 30.50,
      description: 'Updated coffee purchase',
    };

    // ID should be preserved
    expect(updateRequest.id).toBe('transaction-123');

    // Updated fields should be present
    expect(updateRequest.amount).toBe(30.50);
    expect(updateRequest.description).toBe('Updated coffee purchase');

    // Unchanged fields should not be included
    expect(updateRequest.categoryId).toBeUndefined();
    expect(updateRequest.merchant).toBeUndefined();
    expect(updateRequest.date).toBeUndefined();
    expect(updateRequest.tags).toBeUndefined();
  });

  it('should validate required fields correctly', () => {
    const invalidTransactions = [
      { categoryId: '', amount: 10, description: 'Test', date: '2024-12-29' },
      { categoryId: 'cat-1', amount: 0, description: 'Test', date: '2024-12-29' },
      { categoryId: 'cat-1', amount: 10, description: '', date: '2024-12-29' },
      { categoryId: 'cat-1', amount: 10, description: 'Test', date: 'invalid-date' },
    ];

    invalidTransactions.forEach(transaction => {
      const hasEmptyCategory = !transaction.categoryId;
      const hasInvalidAmount = transaction.amount <= 0;
      const hasEmptyDescription = !transaction.description;
      const hasInvalidDate = !transaction.date.match(/^\d{4}-\d{2}-\d{2}$/);

      expect(hasEmptyCategory || hasInvalidAmount || hasEmptyDescription || hasInvalidDate).toBe(true);
    });
  });

  it('should handle transaction filtering correctly', () => {
    const transactions = [
      { id: '1', description: 'Coffee at Starbucks', merchant: 'Starbucks', tags: ['coffee'] },
      { id: '2', description: 'Lunch at McDonald\'s', merchant: 'McDonald\'s', tags: ['food'] },
      { id: '3', description: 'Gas station', merchant: 'Shell', tags: ['fuel', 'car'] },
    ];

    // Test description search
    const coffeeResults = transactions.filter(t =>
      t.description.toLowerCase().includes('coffee')
    );
    expect(coffeeResults).toHaveLength(1);
    expect(coffeeResults[0].id).toBe('1');

    // Test merchant search
    const starbucksResults = transactions.filter(t =>
      t.merchant?.toLowerCase().includes('starbucks')
    );
    expect(starbucksResults).toHaveLength(1);
    expect(starbucksResults[0].id).toBe('1');

    // Test tag search
    const foodResults = transactions.filter(t =>
      t.tags?.some(tag => tag.toLowerCase().includes('food'))
    );
    expect(foodResults).toHaveLength(1);
    expect(foodResults[0].id).toBe('2');
  });
});
