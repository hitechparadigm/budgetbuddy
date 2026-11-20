/**
 * Property-Based Tests for Mobile Search Filtering
 *
 * **Property 14: Mobile Search Filtering**
 * **Validates: Requirements 10.3**
 *
 * These exercise the REAL filter (src/services/search.ts), which is also what
 * TransactionsScreen calls. An earlier version of this file re-declared its
 * own filterTransactions whose semantics differed materially from the screen's
 * (no tag matching, unsigned amount comparison, a single categoryId, ISO
 * string dates), so it passed while proving nothing about shipped behaviour.
 */

import fc from 'fast-check';
import {
  filterTransactions,
  matchesQuery,
  countActiveFilters,
  EMPTY_FILTERS,
  type SearchableTransaction,
  type TransactionFilters,
} from '../../services/search';

// ============================================================================
// Arbitraries
// ============================================================================

const transactionArb: fc.Arbitrary<SearchableTransaction> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 12 }),
  description: fc.string({ maxLength: 40 }),
  merchant: fc.option(fc.string({ maxLength: 30 }), { nil: undefined }),
  tags: fc.option(fc.array(fc.string({ maxLength: 12 }), { maxLength: 4 }), {
    nil: undefined,
  }),
  // noNaN: a NaN amount makes every comparison false and produces a
  // deterministic failure rather than a real counterexample.
  amount: fc.double({ min: -100000, max: 100000, noNaN: true }),
  categoryId: fc.constantFrom('cat_1', 'cat_2', 'cat_3'),
  date: fc
    .date({
      min: new Date('2020-01-01T00:00:00.000Z'),
      max: new Date('2030-12-31T00:00:00.000Z'),
    })
    .map(d => d.toISOString().slice(0, 10)),
});

const transactionsArb = fc.array(transactionArb, { maxLength: 30 });

const filtersArb: fc.Arbitrary<TransactionFilters> = fc.record({
  type: fc.constantFrom('all', 'income', 'expense') as fc.Arbitrary<
    TransactionFilters['type']
  >,
  categoryIds: fc.array(fc.constantFrom('cat_1', 'cat_2', 'cat_3'), {
    maxLength: 3,
  }),
  dateRange: fc.record({
    start: fc.option(
      fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
      { nil: null },
    ),
    end: fc.option(
      fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
      { nil: null },
    ),
  }),
  amountRange: fc.record({
    min: fc.option(fc.double({ min: 0, max: 50000, noNaN: true }), { nil: null }),
    max: fc.option(fc.double({ min: 0, max: 100000, noNaN: true }), { nil: null }),
  }),
});

// ============================================================================
// Properties
// ============================================================================

describe('Property 14: Mobile Search Filtering', () => {
  it('always returns a subset of the input, preserving order', () => {
    fc.assert(
      fc.property(
        transactionsArb,
        fc.string({ maxLength: 10 }),
        filtersArb,
        (txs, query, filters) => {
          const result = filterTransactions(txs, query, filters);

          expect(result.length).toBeLessThanOrEqual(txs.length);
          for (const tx of result) {
            expect(txs).toContain(tx);
          }
          // Order is preserved: the result is a subsequence of the input.
          const indices = result.map(tx => txs.indexOf(tx));
          const ascending = [...indices].sort((a, b) => a - b);
          expect(indices).toEqual(ascending);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns everything when nothing is filtered', () => {
    fc.assert(
      fc.property(transactionsArb, txs => {
        expect(filterTransactions(txs, '', EMPTY_FILTERS)).toHaveLength(txs.length);
      }),
      { numRuns: 50 },
    );
  });

  it('treats a whitespace-only query as no query', () => {
    fc.assert(
      fc.property(transactionsArb, fc.constantFrom('', ' ', '   ', '\t'), (txs, blank) => {
        expect(filterTransactions(txs, blank, EMPTY_FILTERS)).toHaveLength(txs.length);
      }),
      { numRuns: 30 },
    );
  });

  it('is idempotent, so filtering a filtered list changes nothing', () => {
    fc.assert(
      fc.property(
        transactionsArb,
        fc.string({ maxLength: 8 }),
        filtersArb,
        (txs, query, filters) => {
          const once = filterTransactions(txs, query, filters);
          const twice = filterTransactions(once, query, filters);
          expect(twice).toEqual(once);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('every retained transaction matches the query on description, merchant or a tag', () => {
    fc.assert(
      fc.property(transactionsArb, fc.string({ minLength: 1, maxLength: 6 }), (txs, query) => {
        for (const tx of filterTransactions(txs, query, EMPTY_FILTERS)) {
          expect(matchesQuery(tx, query)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('matches tags, which the screen has always done', () => {
    const tx: SearchableTransaction = {
      id: 't1',
      description: 'nothing relevant',
      merchant: 'nowhere',
      tags: ['vacation', 'flights'],
      amount: -250,
      categoryId: 'cat_1',
      date: '2026-05-01',
    };

    expect(filterTransactions([tx], 'vacation', EMPTY_FILTERS)).toHaveLength(1);
    expect(filterTransactions([tx], 'VACATION', EMPTY_FILTERS)).toHaveLength(1);
    expect(filterTransactions([tx], 'unrelated', EMPTY_FILTERS)).toHaveLength(0);
  });

  it('derives income and expense from the sign of the amount', () => {
    fc.assert(
      fc.property(transactionsArb, txs => {
        const income = filterTransactions(txs, '', { ...EMPTY_FILTERS, type: 'income' });
        const expense = filterTransactions(txs, '', { ...EMPTY_FILTERS, type: 'expense' });

        for (const tx of income) expect(tx.amount).toBeGreaterThan(0);
        for (const tx of expense) expect(tx.amount).toBeLessThanOrEqual(0);
        // Every transaction lands in exactly one of the two.
        expect(income.length + expense.length).toBe(txs.length);
      }),
      { numRuns: 100 },
    );
  });

  it('treats an empty categoryIds list as any category', () => {
    fc.assert(
      fc.property(transactionsArb, txs => {
        expect(
          filterTransactions(txs, '', { ...EMPTY_FILTERS, categoryIds: [] }),
        ).toHaveLength(txs.length);
      }),
      { numRuns: 50 },
    );
  });

  it('keeps only the allow-listed categories', () => {
    fc.assert(
      fc.property(
        transactionsArb,
        fc.array(fc.constantFrom('cat_1', 'cat_2', 'cat_3'), {
          minLength: 1,
          maxLength: 2,
        }),
        (txs, categoryIds) => {
          for (const tx of filterTransactions(txs, '', { ...EMPTY_FILTERS, categoryIds })) {
            expect(categoryIds).toContain(tx.categoryId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('compares the absolute amount, so an expense matches a positive range', () => {
    const expense: SearchableTransaction = {
      id: 't1',
      description: 'groceries',
      amount: -40,
      categoryId: 'cat_1',
      date: '2026-05-01',
    };

    expect(
      filterTransactions([expense], '', {
        ...EMPTY_FILTERS,
        amountRange: { min: 20, max: 60 },
      }),
    ).toHaveLength(1);

    expect(
      filterTransactions([expense], '', {
        ...EMPTY_FILTERS,
        amountRange: { min: 50, max: null },
      }),
    ).toHaveLength(0);
  });

  it('every retained transaction is inside the amount range', () => {
    fc.assert(
      fc.property(
        transactionsArb,
        fc.double({ min: 0, max: 1000, noNaN: true }),
        fc.double({ min: 1000, max: 100000, noNaN: true }),
        (txs, min, max) => {
          for (const tx of filterTransactions(txs, '', {
            ...EMPTY_FILTERS,
            amountRange: { min, max },
          })) {
            const amount = Math.abs(tx.amount);
            expect(amount).toBeGreaterThanOrEqual(min);
            expect(amount).toBeLessThanOrEqual(max);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('every retained transaction is inside the date range', () => {
    fc.assert(
      fc.property(transactionsArb, txs => {
        const start = new Date('2024-01-01');
        const end = new Date('2026-12-31');

        for (const tx of filterTransactions(txs, '', {
          ...EMPTY_FILTERS,
          dateRange: { start, end },
        })) {
          const date = new Date(tx.date);
          expect(date.getTime()).toBeGreaterThanOrEqual(start.getTime());
          expect(date.getTime()).toBeLessThanOrEqual(end.getTime());
        }
      }),
      { numRuns: 100 },
    );
  });

  it('accepts Date objects as well as ISO strings for a transaction date', () => {
    const base = {
      id: 't1',
      description: 'rent',
      amount: -1200,
      categoryId: 'cat_1',
    };
    const range = { start: new Date('2026-05-01'), end: new Date('2026-05-31') };

    const asString: SearchableTransaction = { ...base, date: '2026-05-15' };
    const asDate: SearchableTransaction = { ...base, date: new Date('2026-05-15') };

    expect(
      filterTransactions([asString], '', { ...EMPTY_FILTERS, dateRange: range }),
    ).toHaveLength(1);
    expect(
      filterTransactions([asDate], '', { ...EMPTY_FILTERS, dateRange: range }),
    ).toHaveLength(1);
  });

  it('does not mutate its inputs', () => {
    fc.assert(
      fc.property(
        transactionsArb,
        fc.string({ maxLength: 8 }),
        filtersArb,
        (txs, query, filters) => {
          const txsBefore = JSON.stringify(txs);
          const filtersBefore = JSON.stringify(filters);

          filterTransactions(txs, query, filters);

          expect(JSON.stringify(txs)).toBe(txsBefore);
          expect(JSON.stringify(filters)).toBe(filtersBefore);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('countActiveFilters', () => {
  it('is 0 for the empty filters', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
  });

  it('counts each narrowing dimension once, never exceeding four', () => {
    fc.assert(
      fc.property(filtersArb, filters => {
        const count = countActiveFilters(filters);
        expect(count).toBeGreaterThanOrEqual(0);
        expect(count).toBeLessThanOrEqual(4);
      }),
      { numRuns: 100 },
    );
  });

  it('counts type, category, date and amount independently', () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, type: 'income' })).toBe(1);
    expect(countActiveFilters({ ...EMPTY_FILTERS, categoryIds: ['cat_1'] })).toBe(1);
    expect(
      countActiveFilters({
        ...EMPTY_FILTERS,
        dateRange: { start: new Date('2026-01-01'), end: null },
      }),
    ).toBe(1);
    expect(
      countActiveFilters({ ...EMPTY_FILTERS, amountRange: { min: 10, max: null } }),
    ).toBe(1);
    expect(
      countActiveFilters({
        type: 'expense',
        categoryIds: ['cat_1'],
        dateRange: { start: new Date('2026-01-01'), end: new Date('2026-12-31') },
        amountRange: { min: 10, max: 100 },
      }),
    ).toBe(4);
  });
});
