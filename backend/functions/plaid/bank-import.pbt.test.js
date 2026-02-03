/**
 * Bank Import Data Integrity Property-Based Tests
 *
 * Property-based tests for bank transaction import using fast-check.
 * These tests verify data integrity invariants for Plaid imports.
 *
 * **Property 10: Bank Import Data Integrity**
 * **Validates: Requirements 8.6**
 */

const fc = require('fast-check');

// ============================================================================
// Bank Import Functions (extracted for testing)
// ============================================================================

/**
 * Transform Plaid transaction to BudgetBuddy format.
 */
function transformPlaidTransaction(plaidTxn, accountId, userId) {
  return {
    id: 'txn_' + plaidTxn.transaction_id,
    userId,
    accountId,
    plaidTransactionId: plaidTxn.transaction_id,
    amount: Math.abs(plaidTxn.amount),
    type: plaidTxn.amount < 0 ? 'income' : 'expense',
    description: plaidTxn.name || plaidTxn.merchant_name || 'Unknown',
    merchant: plaidTxn.merchant_name || null,
    date: plaidTxn.date,
    category: plaidTxn.category?.[0] || 'Uncategorized',
    pending: plaidTxn.pending || false,
    importedAt: new Date().toISOString(),
    source: 'plaid',
  };
}

/**
 * Validate imported transaction has required fields.
 */
function validateImportedTransaction(txn) {
  const errors = [];
  if (!txn.id) errors.push('Missing id');
  if (!txn.userId) errors.push('Missing userId');
  if (!txn.accountId) errors.push('Missing accountId');
  if (typeof txn.amount !== 'number' || isNaN(txn.amount)) errors.push('Invalid amount');
  if (!['income', 'expense'].includes(txn.type)) errors.push('Invalid type');
  if (!txn.description) errors.push('Missing description');
  if (!txn.date) errors.push('Missing date');
  if (!txn.source) errors.push('Missing source');
  return { valid: errors.length === 0, errors };
}

/**
 * Deduplicate transactions by plaidTransactionId.
 */
function deduplicateTransactions(existing, incoming) {
  const existingIds = new Set(existing.map(t => t.plaidTransactionId));
  return incoming.filter(t => !existingIds.has(t.plaidTransactionId));
}

/**
 * Calculate total imported amount.
 */
function calculateImportTotal(transactions) {
  return transactions.reduce((sum, t) => {
    return sum + (t.type === 'expense' ? t.amount : -t.amount);
  }, 0);
}

/**
 * Group transactions by date.
 */
function groupByDate(transactions) {
  const groups = {};
  for (const txn of transactions) {
    const date = txn.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(txn);
  }
  return groups;
}

/**
 * Validate date is in valid format (YYYY-MM-DD).
 */
function isValidDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const plaidTransactionArbitrary = fc.record({
  transaction_id: fc.string({ minLength: 10, maxLength: 30 }),
  amount: fc.integer({ min: -10000, max: 10000 }).filter(a => a !== 0),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  merchant_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  date: fc.date({ min: new Date('2020-01-01'), max: new Date('2026-12-31') })
    .map(d => d.toISOString().split('T')[0]),
  category: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 3 }), { nil: null }),
  pending: fc.boolean(),
});

const userIdArbitrary = fc.string({ minLength: 5, maxLength: 20 }).map(s => 'user_' + s);
const accountIdArbitrary = fc.string({ minLength: 5, maxLength: 20 }).map(s => 'acc_' + s);

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 10: Bank Import Data Integrity', () => {
  describe('10.1: Transaction Transformation Preserves Data', () => {
    test('transformed transaction preserves original amount magnitude', () => {
      fc.assert(
        fc.property(
          plaidTransactionArbitrary,
          accountIdArbitrary,
          userIdArbitrary,
          (plaidTxn, accountId, userId) => {
            const transformed = transformPlaidTransaction(plaidTxn, accountId, userId);
            expect(transformed.amount).toBe(Math.abs(plaidTxn.amount));
          }
        ),
        { numRuns: 100 }
      );
    });

    test('transformed transaction has correct type based on amount sign', () => {
      fc.assert(
        fc.property(
          plaidTransactionArbitrary,
          accountIdArbitrary,
          userIdArbitrary,
          (plaidTxn, accountId, userId) => {
            const transformed = transformPlaidTransaction(plaidTxn, accountId, userId);
            if (plaidTxn.amount < 0) {
              expect(transformed.type).toBe('income');
            } else {
              expect(transformed.type).toBe('expense');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('transformed transaction preserves date', () => {
      fc.assert(
        fc.property(
          plaidTransactionArbitrary,
          accountIdArbitrary,
          userIdArbitrary,
          (plaidTxn, accountId, userId) => {
            const transformed = transformPlaidTransaction(plaidTxn, accountId, userId);
            expect(transformed.date).toBe(plaidTxn.date);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('transformed transaction links to correct account and user', () => {
      fc.assert(
        fc.property(
          plaidTransactionArbitrary,
          accountIdArbitrary,
          userIdArbitrary,
          (plaidTxn, accountId, userId) => {
            const transformed = transformPlaidTransaction(plaidTxn, accountId, userId);
            expect(transformed.accountId).toBe(accountId);
            expect(transformed.userId).toBe(userId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('10.2: Transformed Transactions Are Valid', () => {
    test('all transformed transactions pass validation', () => {
      fc.assert(
        fc.property(
          plaidTransactionArbitrary,
          accountIdArbitrary,
          userIdArbitrary,
          (plaidTxn, accountId, userId) => {
            const transformed = transformPlaidTransaction(plaidTxn, accountId, userId);
            const validation = validateImportedTransaction(transformed);
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('transformed transactions have plaid source marker', () => {
      fc.assert(
        fc.property(
          plaidTransactionArbitrary,
          accountIdArbitrary,
          userIdArbitrary,
          (plaidTxn, accountId, userId) => {
            const transformed = transformPlaidTransaction(plaidTxn, accountId, userId);
            expect(transformed.source).toBe('plaid');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('10.3: Deduplication Prevents Duplicates', () => {
    test('deduplication removes transactions with existing plaidTransactionId', () => {
      fc.assert(
        fc.property(
          fc.array(plaidTransactionArbitrary, { minLength: 1, maxLength: 10 }),
          accountIdArbitrary,
          userIdArbitrary,
          (plaidTxns, accountId, userId) => {
            const transformed = plaidTxns.map(t => transformPlaidTransaction(t, accountId, userId));
            // Simulate some already existing
            const existing = transformed.slice(0, Math.floor(transformed.length / 2));
            const incoming = transformed;
            
            const deduplicated = deduplicateTransactions(existing, incoming);
            
            // No duplicates should exist
            const existingIds = new Set(existing.map(t => t.plaidTransactionId));
            for (const txn of deduplicated) {
              expect(existingIds.has(txn.plaidTransactionId)).toBe(false);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('deduplication preserves new transactions', () => {
      fc.assert(
        fc.property(
          fc.array(plaidTransactionArbitrary, { minLength: 2, maxLength: 10 }),
          accountIdArbitrary,
          userIdArbitrary,
          (plaidTxns, accountId, userId) => {
            // Ensure unique transaction IDs
            const uniqueTxns = plaidTxns.filter((t, i, arr) => 
              arr.findIndex(x => x.transaction_id === t.transaction_id) === i
            );
            if (uniqueTxns.length < 2) return true;
            
            const transformed = uniqueTxns.map(t => transformPlaidTransaction(t, accountId, userId));
            const existing = [transformed[0]];
            const incoming = transformed;
            
            const deduplicated = deduplicateTransactions(existing, incoming);
            
            // Should have all except the one that exists
            expect(deduplicated.length).toBe(transformed.length - 1);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('deduplication with empty existing returns all incoming', () => {
      fc.assert(
        fc.property(
          fc.array(plaidTransactionArbitrary, { minLength: 1, maxLength: 10 }),
          accountIdArbitrary,
          userIdArbitrary,
          (plaidTxns, accountId, userId) => {
            const transformed = plaidTxns.map(t => transformPlaidTransaction(t, accountId, userId));
            const deduplicated = deduplicateTransactions([], transformed);
            expect(deduplicated.length).toBe(transformed.length);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('10.4: Import Totals Are Consistent', () => {
    test('total import equals sum of individual amounts with correct signs', () => {
      fc.assert(
        fc.property(
          fc.array(plaidTransactionArbitrary, { minLength: 1, maxLength: 20 }),
          accountIdArbitrary,
          userIdArbitrary,
          (plaidTxns, accountId, userId) => {
            const transformed = plaidTxns.map(t => transformPlaidTransaction(t, accountId, userId));
            const total = calculateImportTotal(transformed);
            
            let manualTotal = 0;
            for (const txn of transformed) {
              manualTotal += txn.type === 'expense' ? txn.amount : -txn.amount;
            }
            
            expect(total).toBe(manualTotal);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('10.5: Date Grouping Is Correct', () => {
    test('grouping by date preserves all transactions', () => {
      fc.assert(
        fc.property(
          fc.array(plaidTransactionArbitrary, { minLength: 1, maxLength: 20 }),
          accountIdArbitrary,
          userIdArbitrary,
          (plaidTxns, accountId, userId) => {
            const transformed = plaidTxns.map(t => transformPlaidTransaction(t, accountId, userId));
            const grouped = groupByDate(transformed);
            
            let totalInGroups = 0;
            for (const date in grouped) {
              totalInGroups += grouped[date].length;
            }
            
            expect(totalInGroups).toBe(transformed.length);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('all transactions in a date group have that date', () => {
      fc.assert(
        fc.property(
          fc.array(plaidTransactionArbitrary, { minLength: 1, maxLength: 20 }),
          accountIdArbitrary,
          userIdArbitrary,
          (plaidTxns, accountId, userId) => {
            const transformed = plaidTxns.map(t => transformPlaidTransaction(t, accountId, userId));
            const grouped = groupByDate(transformed);
            
            for (const date in grouped) {
              for (const txn of grouped[date]) {
                expect(txn.date).toBe(date);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('10.6: Date Validation', () => {
    test('all transformed dates are valid', () => {
      fc.assert(
        fc.property(
          plaidTransactionArbitrary,
          accountIdArbitrary,
          userIdArbitrary,
          (plaidTxn, accountId, userId) => {
            const transformed = transformPlaidTransaction(plaidTxn, accountId, userId);
            expect(isValidDate(transformed.date)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
