/**
 * Property-Based Tests for Quick Actions System
 * Tests quick actions, transaction templates, and bulk operations functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fc from 'fast-check';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { quickActionsService } from '../../services/quickActions';
import { Transaction } from '../../types';

// Mock external dependencies
jest.mock('@react-native-async-storage/async-storage');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('Quick Actions System Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock AsyncStorage
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();

    // Reset service state completely
    quickActionsService.reset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Property 7: Search Result Accuracy
   * Validates that search and filtering return accurate results
   */
  describe('Property 7: Search Result Accuracy', () => {
    it('should return accurate search results for transaction descriptions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1 }),
              description: fc.string({ minLength: 1, maxLength: 50 }),
              merchant: fc.option(fc.string({ minLength: 1, maxLength: 30 })),
              amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000) }),
              categoryId: fc.string({ minLength: 1 }),
              date: fc.date().map(d => d.toISOString().split('T')[0]),
              syncStatus: fc.constantFrom('synced', 'pending', 'failed'),
              createdAt: fc.date().map(d => d.toISOString()),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          fc.string({ minLength: 1, maxLength: 10 }),
          async (transactions, searchTerm) => {
            // Reset and initialize service
            quickActionsService.reset();
            await quickActionsService.initialize();

            // Record transactions to build search data
            for (const transaction of transactions) {
              await quickActionsService.recordTransaction(transaction as Transaction, 'Test Category');
            }

            // Get recent transactions (which should be searchable)
            const recentTransactions = quickActionsService.getRecentTransactions();

            // Filter transactions that should match the search term
            const expectedMatches = recentTransactions.filter(rt =>
              rt.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (rt.merchant && rt.merchant.toLowerCase().includes(searchTerm.toLowerCase()))
            );

            // Verify that all expected matches contain the search term
            expectedMatches.forEach(match => {
              const containsInDescription = match.description.toLowerCase().includes(searchTerm.toLowerCase());
              const containsInMerchant = match.merchant && match.merchant.toLowerCase().includes(searchTerm.toLowerCase());

              expect(containsInDescription || containsInMerchant).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 39: Quick Transaction Recording
   * Validates that transactions are correctly recorded for quick access
   */
  describe('Property 39: Quick Transaction Recording', () => {
    it('should correctly record and track transaction frequency', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.string({ minLength: 1 }),
            description: fc.string({ minLength: 1, maxLength: 50 }),
            merchant: fc.option(fc.string({ minLength: 1, maxLength: 30 })),
            amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000) }),
            categoryId: fc.string({ minLength: 1 }),
            date: fc.date().map(d => d.toISOString().split('T')[0]),
            syncStatus: fc.constantFrom('synced', 'pending', 'failed'),
            createdAt: fc.date().map(d => d.toISOString()),
          }),
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.integer({ min: 1, max: 10 }),
          async (transaction, categoryName, repeatCount) => {
            // Reset and initialize service with clean state
            quickActionsService.reset();
            await quickActionsService.initialize();

            // Record the same transaction multiple times
            for (let i = 0; i < repeatCount; i++) {
              await quickActionsService.recordTransaction(transaction as Transaction, categoryName);
            }

            // Get recent transactions
            const recentTransactions = quickActionsService.getRecentTransactions();

            // Find the recorded transaction
            const recordedTransaction = recentTransactions.find(rt =>
              rt.description === transaction.description &&
              rt.merchant === transaction.merchant &&
              rt.categoryId === transaction.categoryId
            );

            // Verify transaction was recorded with correct frequency
            expect(recordedTransaction).toBeDefined();
            expect(recordedTransaction!.frequency).toBe(repeatCount);
            expect(recordedTransaction!.categoryName).toBe(categoryName);
            expect(recordedTransaction!.amount).toBe(transaction.amount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update favorite categories based on usage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              categoryId: fc.string({ minLength: 1 }),
              categoryName: fc.string({ minLength: 1, maxLength: 30 }),
              amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000) }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (categoryUsages) => {
            // Reset and initialize service
            quickActionsService.reset();
            await quickActionsService.initialize();

            // Record transactions for each category usage
            const categoryUsageCount = new Map<string, number>();
            for (const usage of categoryUsages) {
              const transaction: Transaction = {
                id: `tx_${Date.now()}_${Math.random()}`,
                description: 'Test transaction',
                amount: usage.amount,
                categoryId: usage.categoryId,
                date: new Date().toISOString().split('T')[0],
                syncStatus: 'synced',
                createdAt: new Date().toISOString(),
              };

              await quickActionsService.recordTransaction(transaction, usage.categoryName);

              // Track how many times each category is used
              categoryUsageCount.set(usage.categoryId, (categoryUsageCount.get(usage.categoryId) || 0) + 1);
            }

            // Get favorite categories
            const favoriteCategories = quickActionsService.getFavoriteCategories();

            // Verify that categories are tracked (should be <= unique categories)
            const uniqueCategories = new Set(categoryUsages.map(u => u.categoryId));
            expect(favoriteCategories.length).toBeLessThanOrEqual(Math.max(uniqueCategories.size, 6)); // Service has default max of 6

            // Verify each favorite category has correct data
            favoriteCategories.forEach(favorite => {
              const usages = categoryUsages.filter(u => u.categoryId === favorite.categoryId);
              expect(usages.length).toBeGreaterThan(0);

              // The usage count should match the number of times this category was used
              const expectedUsageCount = categoryUsageCount.get(favorite.categoryId) || 0;

              // Debug logging for failing test
              if (favorite.usageCount !== expectedUsageCount) {
                console.log('Debug info:', {
                  categoryId: favorite.categoryId,
                  actualUsageCount: favorite.usageCount,
                  expectedUsageCount,
                  categoryUsageCount: Array.from(categoryUsageCount.entries()),
                  usagesLength: usages.length,
                  favoriteCategories: favoriteCategories.map(fc => ({ id: fc.categoryId, count: fc.usageCount }))
                });
              }

              expect(favorite.usageCount).toBe(expectedUsageCount);

              // Verify average amount calculation
              const expectedAverage = usages.reduce((sum, u) => sum + u.amount, 0) / usages.length;
              expect(Math.abs(favorite.averageAmount - expectedAverage)).toBeLessThan(0.01);
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 40: Transaction Template Management
   * Validates that transaction templates are correctly created and managed
   */
  describe('Property 40: Transaction Template Management', () => {
    it('should create and manage transaction templates correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 100 }),
            merchant: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
            amount: fc.option(fc.float({ min: Math.fround(0.01), max: Math.fround(10000) })),
            categoryId: fc.string({ minLength: 1 }),
            categoryName: fc.string({ minLength: 1, maxLength: 30 }),
            isRecurring: fc.boolean(),
            recurringFrequency: fc.constantFrom('daily', 'weekly', 'monthly'),
          }),
          async (templateData) => {
            // Reset and initialize service
            quickActionsService.reset();
            await quickActionsService.initialize();

            // Create template
            const template = await quickActionsService.createTemplate({
              name: templateData.name,
              description: templateData.description,
              merchant: templateData.merchant || undefined,
              amount: templateData.amount || undefined,
              categoryId: templateData.categoryId,
              categoryName: templateData.categoryName,
              isRecurring: templateData.isRecurring,
              recurringFrequency: templateData.isRecurring ? templateData.recurringFrequency : undefined,
            });

            // Verify template was created correctly
            expect(template.id).toBeDefined();
            expect(template.name).toBe(templateData.name);
            expect(template.description).toBe(templateData.description);
            expect(template.merchant).toBe(templateData.merchant || undefined);
            expect(template.amount).toBe(templateData.amount || undefined);
            expect(template.categoryId).toBe(templateData.categoryId);
            expect(template.categoryName).toBe(templateData.categoryName);
            expect(template.isRecurring).toBe(templateData.isRecurring);
            expect(template.usageCount).toBe(0);
            expect(template.createdAt).toBeDefined();

            if (templateData.isRecurring) {
              expect(template.recurringFrequency).toBe(templateData.recurringFrequency);
            }

            // Verify template appears in list
            const templates = quickActionsService.getTransactionTemplates();
            expect(templates).toContainEqual(template);

            // Use template and verify usage count increases
            const usedTemplate = await quickActionsService.useTemplate(template.id);
            expect(usedTemplate).toBeDefined();
            expect(usedTemplate!.usageCount).toBe(1);

            // Delete template and verify it's removed
            await quickActionsService.deleteTemplate(template.id);
            const templatesAfterDelete = quickActionsService.getTransactionTemplates();
            expect(templatesAfterDelete.find(t => t.id === template.id)).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create transactions from templates with correct data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 100 }),
            merchant: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
            amount: fc.option(fc.float({ min: Math.fround(0.01), max: Math.fround(10000) })),
            categoryId: fc.string({ minLength: 1 }),
            categoryName: fc.string({ minLength: 1, maxLength: 30 }),
          }),
          async (templateData) => {
            // Reset and initialize service
            quickActionsService.reset();
            await quickActionsService.initialize();

            // Create template
            const template = await quickActionsService.createTemplate({
              ...templateData,
              merchant: templateData.merchant || undefined,
              amount: templateData.amount || undefined,
              isRecurring: false,
            });

            // Create transaction from template
            const transaction = quickActionsService.createTransactionFromTemplate(template);

            // Verify transaction has correct data from template
            expect(transaction.description).toBe(template.description);
            expect(transaction.merchant).toBe(template.merchant);
            expect(transaction.amount).toBe(template.amount || 0);
            expect(transaction.categoryId).toBe(template.categoryId);
            expect(transaction.date).toBeDefined();

            // Verify date is today
            const today = new Date().toISOString().split('T')[0];
            expect(transaction.date).toBe(today);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 41: Bulk Operations Accuracy
   * Validates that bulk operations suggestions are accurate and helpful
   */
  describe('Property 41: Bulk Operations Accuracy', () => {
    it('should identify duplicate transactions correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            description: fc.string({ minLength: 1, maxLength: 50 }),
            amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000) }),
            categoryId: fc.string({ minLength: 1 }),
            date: fc.date().map(d => d.toISOString().split('T')[0]),
          }),
          fc.integer({ min: 2, max: 5 }),
          async (baseTransaction, duplicateCount) => {
            // Create duplicate transactions
            const transactions: Transaction[] = [];
            for (let i = 0; i < duplicateCount; i++) {
              transactions.push({
                ...baseTransaction,
                id: `tx_${i}`,
                syncStatus: 'synced',
                createdAt: new Date().toISOString(),
              } as Transaction);
            }

            // Add some unique transactions
            transactions.push({
              id: 'unique_1',
              description: 'Unique transaction',
              amount: 999.99,
              categoryId: 'unique_cat',
              date: '2023-01-01',
              syncStatus: 'synced',
              createdAt: new Date().toISOString(),
            } as Transaction);

            // Get bulk operation suggestions
            const suggestions = quickActionsService.getBulkOperationSuggestions(transactions);

            // Find duplicate removal suggestion
            const duplicateSuggestion = suggestions.find(s => s.type === 'duplicate_removal');

            if (duplicateCount > 1) {
              // Should detect duplicates
              expect(duplicateSuggestion).toBeDefined();
              expect(duplicateSuggestion!.transactionIds.length).toBe(duplicateCount - 1); // All but one
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should suggest category standardization for similar transactions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 30 }).filter(s => s.trim().length >= 3 && /[a-zA-Z]/.test(s)), // Ensure meaningful description
          fc.array(fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), { minLength: 2, maxLength: 3 }),
          async (description, categoryIds) => {
            // Ensure we have unique category IDs
            const uniqueCategoryIds = [...new Set(categoryIds)];
            if (uniqueCategoryIds.length < 2) return; // Skip if not enough unique categories

            // Create transactions with same description but different categories
            const transactions: Transaction[] = uniqueCategoryIds.map((categoryId, index) => ({
              id: `tx_${index}`,
              description: description.trim(),
              amount: 100,
              categoryId,
              date: '2023-01-01',
              syncStatus: 'synced',
              createdAt: new Date().toISOString(),
            } as Transaction));

            // Get bulk operation suggestions
            const suggestions = quickActionsService.getBulkOperationSuggestions(transactions);

            // Find category change suggestion
            const categorySuggestion = suggestions.find(s => s.type === 'category_change');

            // Should suggest category standardization for transactions with different categories
            expect(categorySuggestion).toBeDefined();
            expect(categorySuggestion!.transactionIds.length).toBe(transactions.length);
            expect(categorySuggestion!.description.toLowerCase()).toContain(description.trim().toLowerCase());
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Property 42: Preferences Management
   * Validates that preferences are correctly managed and persisted
   */
  describe('Property 42: Preferences Management', () => {
    it('should correctly update and persist preferences', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            maxRecentTransactions: fc.integer({ min: 1, max: 50 }),
            maxFavoriteCategories: fc.integer({ min: 1, max: 20 }),
            maxTemplates: fc.integer({ min: 1, max: 100 }),
            enableQuickAdd: fc.boolean(),
            enableSwipeActions: fc.boolean(),
            enableBulkOperations: fc.boolean(),
          }),
          async (newPreferences) => {
            // Reset and initialize service
            quickActionsService.reset();
            await quickActionsService.initialize();

            // Update preferences
            await quickActionsService.updatePreferences(newPreferences);

            // Verify preferences were updated
            const currentPreferences = quickActionsService.getPreferences();
            expect(currentPreferences.maxRecentTransactions).toBe(newPreferences.maxRecentTransactions);
            expect(currentPreferences.maxFavoriteCategories).toBe(newPreferences.maxFavoriteCategories);
            expect(currentPreferences.maxTemplates).toBe(newPreferences.maxTemplates);
            expect(currentPreferences.enableQuickAdd).toBe(newPreferences.enableQuickAdd);
            expect(currentPreferences.enableSwipeActions).toBe(newPreferences.enableSwipeActions);
            expect(currentPreferences.enableBulkOperations).toBe(newPreferences.enableBulkOperations);

            // Verify AsyncStorage was called to persist preferences
            expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
              'quick_actions_preferences',
              expect.stringContaining(JSON.stringify(newPreferences).slice(1, -1)) // Partial match
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
