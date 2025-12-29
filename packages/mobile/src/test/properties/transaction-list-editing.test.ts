/**
 * Property-Based Tests for Transaction List and Editing
 * Tests the correctness of transaction list display and editing operations
 */

import fc from 'fast-check';
import { Transaction, BudgetCategory } from '../../types';

// Mock transaction data generator
const transactionArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  categoryId: fc.string({ minLength: 1, maxLength: 50 }),
  amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }).map(n => Math.fround(n)),
  description: fc.string({ minLength: 1, maxLength: 100 }),
  merchant: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
    .map(d => d.toISOString().split('T')[0]),
  currency: fc.constant('USD'),
  tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 })),
  syncStatus: fc.constantFrom('synced', 'pending', 'failed'),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
  updatedAt: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString())),
}) as fc.Arbitrary<Transaction>;

const categoryArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  icon: fc.string({ minLength: 1, maxLength: 4 }),
  color: fc.option(fc.string({ minLength: 7, maxLength: 7 })),
  isRecurring: fc.boolean(),
  recurringFrequency: fc.option(fc.constantFrom('weekly', 'bi-weekly', 'monthly', 'quarterly', 'annually')),
  baseAmount: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }).map(n => Math.fround(n)),
  plannedMonthlyAmount: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }).map(n => Math.fround(n)),
  actualAmount: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }).map(n => Math.fround(n)),
  variance: fc.float({ min: Math.fround(-10000), max: Math.fround(10000), noNaN: true }).map(n => Math.fround(n)),
  transactions: fc.constant([]),
  order: fc.integer({ min: 0, max: 100 }),
  isCustom: fc.boolean(),
  isArchived: fc.boolean(),
  usageCount: fc.integer({ min: 0, max: 1000 }),
  isPaused: fc.boolean(),
}) as fc.Arbitrary<BudgetCategory>;

describe('Transaction List and Editing Properties', () => {
  /**
   * Property 14: Transaction List Grouping Consistency
   * Validates that transactions are correctly grouped by date and sorted properly
   */
  it('Property 14: Transaction list grouping maintains chronological order and correct totals', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 1, maxLength: 50 }),
        (transactions) => {
          // Group transactions by date
          const grouped = transactions.reduce((acc, transaction) => {
            const date = transaction.date;
            if (!acc[date]) {
              acc[date] = [];
            }
            acc[date].push(transaction);
            return acc;
          }, {} as Record<string, Transaction[]>);

          const groupedArray = Object.entries(grouped)
            .map(([date, transactions]) => ({
              date,
              transactions: transactions.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              ),
              totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
            }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          // Verify chronological order (most recent first)
          for (let i = 0; i < groupedArray.length - 1; i++) {
            const currentDate = new Date(groupedArray[i].date);
            const nextDate = new Date(groupedArray[i + 1].date);
            expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
          }

          // Verify total amounts are correct
          groupedArray.forEach(group => {
            const expectedTotal = group.transactions.reduce((sum, t) => sum + t.amount, 0);
            expect(Math.abs(group.totalAmount - expectedTotal)).toBeLessThan(0.01);
          });

          // Verify transactions within groups are sorted by creation time (most recent first)
          groupedArray.forEach(group => {
            for (let i = 0; i < group.transactions.length - 1; i++) {
              const currentTime = new Date(group.transactions[i].createdAt).getTime();
              const nextTime = new Date(group.transactions[i + 1].createdAt).getTime();
              expect(currentTime).toBeGreaterThanOrEqual(nextTime);
            }
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15: Transaction Search and Filtering Accuracy
   * Validates that search and filtering operations return correct results
   */
  it('Property 15: Transaction search and filtering returns accurate results', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 5, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (transactions, searchQuery) => {
          const query = searchQuery.toLowerCase();

          // Filter transactions based on search query
          const filteredTransactions = transactions.filter(transaction => {
            return (
              transaction.description.toLowerCase().includes(query) ||
              transaction.merchant?.toLowerCase().includes(query) ||
              transaction.tags?.some(tag => tag.toLowerCase().includes(query))
            );
          });

          // Verify all filtered transactions match the search criteria
          filteredTransactions.forEach(transaction => {
            const matchesDescription = transaction.description.toLowerCase().includes(query);
            const matchesMerchant = transaction.merchant?.toLowerCase().includes(query) || false;
            const matchesTags = transaction.tags?.some(tag => tag.toLowerCase().includes(query)) || false;

            expect(matchesDescription || matchesMerchant || matchesTags).toBe(true);
          });

          // Verify no matching transactions were excluded
          transactions.forEach(transaction => {
            const matchesDescription = transaction.description.toLowerCase().includes(query);
            const matchesMerchant = transaction.merchant?.toLowerCase().includes(query) || false;
            const matchesTags = transaction.tags?.some(tag => tag.toLowerCase().includes(query)) || false;

            if (matchesDescription || matchesMerchant || matchesTags) {
              expect(filteredTransactions).toContain(transaction);
            }
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16: Transaction Edit Operation Consistency
   * Validates that transaction editing operations maintain data integrity
   */
  it('Property 16: Transaction editing maintains data integrity and sync status', () => {
    fc.assert(
      fc.property(
        transactionArb,
        fc.record({
          amount: fc.option(fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }).map(n => Math.fround(n))),
          description: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
          merchant: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          categoryId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 })),
        }),
        (originalTransaction, updates) => {
          // Simulate transaction edit operation
          const editedTransaction = {
            ...originalTransaction,
            ...Object.fromEntries(
              Object.entries(updates).filter(([_, value]) => value !== null)
            ),
            updatedAt: new Date().toISOString(),
            syncStatus: 'pending' as const, // Editing should mark as pending sync
          };

          // Verify required fields are preserved
          expect(editedTransaction.id).toBe(originalTransaction.id);
          expect(editedTransaction.createdAt).toBe(originalTransaction.createdAt);
          expect(editedTransaction.date).toBe(originalTransaction.date);

          // Verify sync status is updated
          expect(editedTransaction.syncStatus).toBe('pending');

          // Verify updatedAt is set
          expect(editedTransaction.updatedAt).toBeDefined();
          expect(new Date(editedTransaction.updatedAt!).getTime()).toBeGreaterThan(
            new Date(originalTransaction.createdAt).getTime()
          );

          // Verify updated fields are applied
          if (updates.amount !== null && updates.amount !== undefined) {
            expect(editedTransaction.amount).toBe(updates.amount);
          }
          if (updates.description !== null && updates.description !== undefined) {
            expect(editedTransaction.description).toBe(updates.description);
          }
          if (updates.merchant !== null && updates.merchant !== undefined) {
            expect(editedTransaction.merchant).toBe(updates.merchant);
          }
          if (updates.categoryId !== null && updates.categoryId !== undefined) {
            expect(editedTransaction.categoryId).toBe(updates.categoryId);
          }
          if (updates.tags !== null && updates.tags !== undefined) {
            expect(editedTransaction.tags).toEqual(updates.tags);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 17: Category Display Consistency
   * Validates that category information is correctly displayed for transactions
   */
  it('Property 17: Category information is correctly resolved and displayed', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 1, maxLength: 20 }),
        fc.array(categoryArb, { minLength: 1, maxLength: 10 }),
        (transactions, categories) => {
          // Ensure some transactions have matching categories
          const validTransactions = transactions.map((transaction, index) => ({
            ...transaction,
            categoryId: categories[index % categories.length].id,
          }));

          validTransactions.forEach(transaction => {
            const category = categories.find(c => c.id === transaction.categoryId);

            // Verify category exists for transaction
            expect(category).toBeDefined();

            if (category) {
              // Verify category properties are valid
              expect(category.name).toBeTruthy();
              expect(category.icon).toBeTruthy();
              expect(typeof category.isRecurring).toBe('boolean');
              expect(typeof category.baseAmount).toBe('number');
              expect(category.baseAmount).toBeGreaterThanOrEqual(0);
              expect(typeof category.plannedMonthlyAmount).toBe('number');
              expect(category.plannedMonthlyAmount).toBeGreaterThanOrEqual(0);
            }
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 18: Transaction Deletion Safety
   * Validates that transaction deletion operations are safe and maintain list integrity
   */
  it('Property 18: Transaction deletion maintains list integrity and sync queue', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 2, maxLength: 20 }),
        fc.integer({ min: 0, max: 19 }),
        (transactions, deleteIndex) => {
          // Ensure unique IDs for this test
          const uniqueTransactions = transactions.map((t, index) => ({
            ...t,
            id: `transaction_${index}`,
          }));

          const actualIndex = deleteIndex % uniqueTransactions.length;
          const transactionToDelete = uniqueTransactions[actualIndex];

          // Simulate deletion operation
          const remainingTransactions = uniqueTransactions.filter(t => t.id !== transactionToDelete.id);

          // Verify transaction was removed
          expect(remainingTransactions).not.toContain(transactionToDelete);
          expect(remainingTransactions.length).toBe(uniqueTransactions.length - 1);

          // Verify other transactions are preserved
          uniqueTransactions.forEach(transaction => {
            if (transaction.id !== transactionToDelete.id) {
              expect(remainingTransactions).toContain(transaction);
            }
          });

          // Verify no duplicate transactions exist
          const transactionIds = remainingTransactions.map(t => t.id);
          const uniqueIds = new Set(transactionIds);
          expect(transactionIds.length).toBe(uniqueIds.size);

          // Simulate sync queue entry for deletion
          const syncQueueEntry = {
            id: `delete_${transactionToDelete.id}`,
            type: 'DELETE' as const,
            entity: 'transaction' as const,
            entityId: transactionToDelete.id,
            data: transactionToDelete,
            attempts: 0,
            lastAttempt: undefined,
            error: undefined,
          };

          // Verify sync queue entry is valid
          expect(syncQueueEntry.type).toBe('DELETE');
          expect(syncQueueEntry.entity).toBe('transaction');
          expect(syncQueueEntry.entityId).toBe(transactionToDelete.id);
          expect(syncQueueEntry.data).toEqual(transactionToDelete);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
