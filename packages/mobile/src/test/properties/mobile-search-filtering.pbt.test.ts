/**
 * Property-Based Tests for Mobile Search Filtering
 *
 * **Property 14: Mobile Search Filtering**
 * **Validates: Requirements 10.3**
 *
 * Tests that search filtering correctly filters transactions based on
 * various criteria and maintains data integrity.
 */

import fc from 'fast-check';

// ============================================================================
// Search Filtering Functions (extracted for testing)
// ============================================================================

interface Transaction {
  id: string;
  description: string;
  merchant?: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  date: string;
  type: 'income' | 'expense';
}

interface SearchFilters {
  query?: string;
  categoryId?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  type?: 'income' | 'expense';
}

/**
 * Filter transactions based on search query and filters.
 */
function filterTransactions(
  transactions: Transaction[],
  filters: SearchFilters
): Transaction[] {
  return transactions.filter((tx) => {
    // Text search (description and merchant)
    if (filters.query) {
      const query = filters.query.toLowerCase();
      const matchesDescription = tx.description.toLowerCase().includes(query);
      const matchesMerchant = tx.merchant?.toLowerCase().includes(query) || false;
      if (!matchesDescription && !matchesMerchant) {
        return false;
      }
    }

    // Category filter
    if (filters.categoryId && tx.categoryId !== filters.categoryId) {
      return false;
    }

    // Amount range filter
    if (filters.minAmount !== undefined && tx.amount < filters.minAmount) {
      return false;
    }
    if (filters.maxAmount !== undefined && tx.amount > filters.maxAmount) {
      return false;
    }

    // Date range filter
    if (filters.startDate && tx.date < filters.startDate) {
      return false;
    }
    if (filters.endDate && tx.date > filters.endDate) {
      return false;
    }

    // Type filter
    if (filters.type && tx.type !== filters.type) {
      return false;
    }

    return true;
  });
}

/**
 * Highlight search matches in text.
 */
function highlightMatches(text: string, query: string): { text: string; highlighted: boolean }[] {
  if (!query) {
    return [{ text, highlighted: false }];
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const result: { text: string; highlighted: boolean }[] = [];
  let lastIndex = 0;

  let index = lowerText.indexOf(lowerQuery);
  while (index !== -1) {
    // Add non-highlighted text before match
    if (index > lastIndex) {
      result.push({ text: text.slice(lastIndex, index), highlighted: false });
    }
    // Add highlighted match
    result.push({ text: text.slice(index, index + query.length), highlighted: true });
    lastIndex = index + query.length;
    index = lowerText.indexOf(lowerQuery, lastIndex);
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push({ text: text.slice(lastIndex), highlighted: false });
  }

  return result;
}

/**
 * Sort transactions by various criteria.
 */
function sortTransactions(
  transactions: Transaction[],
  sortBy: 'date' | 'amount' | 'description',
  order: 'asc' | 'desc'
): Transaction[] {
  const sorted = [...transactions].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'date':
        comparison = a.date.localeCompare(b.date);
        break;
      case 'amount':
        comparison = a.amount - b.amount;
        break;
      case 'description':
        comparison = a.description.localeCompare(b.description);
        break;
    }
    return order === 'asc' ? comparison : -comparison;
  });
  return sorted;
}

/**
 * Debounce function for search input.
 */
function createDebouncedSearch(
  callback: (query: string) => void,
  delay: number
): { search: (query: string) => void; cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;

  return {
    search: (query: string) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        callback(query);
        timeoutId = null;
      }, delay);
    },
    cancel: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
}

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const transactionArbitrary = fc.record({
  id: fc.uuid(),
  description: fc.string({ minLength: 1, maxLength: 100 }),
  merchant: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
  categoryId: fc.string({ minLength: 1, maxLength: 20 }),
  categoryName: fc.string({ minLength: 1, maxLength: 30 }),
  date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
    .map((d) => d.toISOString().split('T')[0]),
  type: fc.constantFrom('income', 'expense') as fc.Arbitrary<'income' | 'expense'>,
});

const searchFiltersArbitrary = fc.record({
  query: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
  categoryId: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
  minAmount: fc.option(fc.float({ min: Math.fround(0), max: Math.fround(5000), noNaN: true })),
  maxAmount: fc.option(fc.float({ min: Math.fround(5000), max: Math.fround(10000), noNaN: true })),
  startDate: fc.option(
    fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
      .map((d) => d.toISOString().split('T')[0])
  ),
  endDate: fc.option(
    fc.date({ min: new Date('2025-01-01'), max: new Date('2030-12-31') })
      .map((d) => d.toISOString().split('T')[0])
  ),
  type: fc.option(fc.constantFrom('income', 'expense') as fc.Arbitrary<'income' | 'expense'>),
});

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 14: Mobile Search Filtering', () => {
  describe('14.1: Filter Result Subset', () => {
    test('filtered results are always a subset of original transactions', () => {
      fc.assert(
        fc.property(
          fc.array(transactionArbitrary, { minLength: 0, maxLength: 50 }),
          searchFiltersArbitrary,
          (transactions, filters) => {
            const cleanFilters: SearchFilters = {
              query: filters.query ?? undefined,
              categoryId: filters.categoryId ?? undefined,
              minAmount: filters.minAmount ?? undefined,
              maxAmount: filters.maxAmount ?? undefined,
              startDate: filters.startDate ?? undefined,
              endDate: filters.endDate ?? undefined,
              type: filters.type ?? undefined,
            };

            const filtered = filterTransactions(transactions, cleanFilters);

            // Every filtered transaction must exist in original
            filtered.forEach((tx) => {
              expect(transactions.some((orig) => orig.id === tx.id)).toBe(true);
            });

            // Filtered count must be <= original count
            expect(filtered.length).toBeLessThanOrEqual(transactions.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('14.2: Empty Query Returns All', () => {
    test('empty filters return all transactions', () => {
      fc.assert(
        fc.property(
          fc.array(transactionArbitrary, { minLength: 0, maxLength: 50 }),
          (transactions) => {
            const filtered = filterTransactions(transactions, {});
            expect(filtered.length).toBe(transactions.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('14.3: Query Match Accuracy', () => {
    test('all filtered results contain the search query', () => {
      fc.assert(
        fc.property(
          fc.array(transactionArbitrary, { minLength: 1, maxLength: 30 }),
          fc.string({ minLength: 1, maxLength: 10 }),
          (transactions, query) => {
            const filtered = filterTransactions(transactions, { query });

            filtered.forEach((tx) => {
              const matchesDescription = tx.description
                .toLowerCase()
                .includes(query.toLowerCase());
              const matchesMerchant =
                tx.merchant?.toLowerCase().includes(query.toLowerCase()) || false;
              expect(matchesDescription || matchesMerchant).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('14.4: Amount Range Filter', () => {
    test('filtered results respect amount bounds', () => {
      fc.assert(
        fc.property(
          fc.array(transactionArbitrary, { minLength: 1, maxLength: 30 }),
          fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
          fc.float({ min: Math.fround(100), max: Math.fround(10000), noNaN: true }),
          (transactions, minAmount, maxAmount) => {
            const filtered = filterTransactions(transactions, { minAmount, maxAmount });

            filtered.forEach((tx) => {
              expect(tx.amount).toBeGreaterThanOrEqual(minAmount);
              expect(tx.amount).toBeLessThanOrEqual(maxAmount);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('14.5: Date Range Filter', () => {
    test('filtered results respect date bounds', () => {
      fc.assert(
        fc.property(
          fc.array(transactionArbitrary, { minLength: 1, maxLength: 30 }),
          (transactions) => {
            const startDate = '2023-01-01';
            const endDate = '2023-12-31';
            const filtered = filterTransactions(transactions, { startDate, endDate });

            filtered.forEach((tx) => {
              expect(tx.date >= startDate).toBe(true);
              expect(tx.date <= endDate).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('14.6: Category Filter Exactness', () => {
    test('category filter returns only matching category', () => {
      fc.assert(
        fc.property(
          fc.array(transactionArbitrary, { minLength: 1, maxLength: 30 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (transactions, categoryId) => {
            const filtered = filterTransactions(transactions, { categoryId });

            filtered.forEach((tx) => {
              expect(tx.categoryId).toBe(categoryId);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('14.7: Type Filter Correctness', () => {
    test('type filter returns only matching type', () => {
      fc.assert(
        fc.property(
          fc.array(transactionArbitrary, { minLength: 1, maxLength: 30 }),
          fc.constantFrom('income', 'expense') as fc.Arbitrary<'income' | 'expense'>,
          (transactions, type) => {
            const filtered = filterTransactions(transactions, { type });

            filtered.forEach((tx) => {
              expect(tx.type).toBe(type);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('14.8: Highlight Preservation', () => {
    test('highlighted text reconstructs original', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 10 }),
          (text, query) => {
            const highlighted = highlightMatches(text, query);
            const reconstructed = highlighted.map((h) => h.text).join('');
            expect(reconstructed).toBe(text);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('14.9: Sort Stability', () => {
    test('sorting preserves all transactions', () => {
      fc.assert(
        fc.property(
          fc.array(transactionArbitrary, { minLength: 0, maxLength: 30 }),
          fc.constantFrom('date', 'amount', 'description') as fc.Arbitrary<
            'date' | 'amount' | 'description'
          >,
          fc.constantFrom('asc', 'desc') as fc.Arbitrary<'asc' | 'desc'>,
          (transactions, sortBy, order) => {
            const sorted = sortTransactions(transactions, sortBy, order);

            // Same length
            expect(sorted.length).toBe(transactions.length);

            // Same IDs (all transactions preserved)
            const originalIds = new Set(transactions.map((t) => t.id));
            const sortedIds = new Set(sorted.map((t) => t.id));
            expect(sortedIds).toEqual(originalIds);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('14.10: Combined Filters', () => {
    test('multiple filters are applied conjunctively (AND)', () => {
      fc.assert(
        fc.property(
          fc.array(transactionArbitrary, { minLength: 1, maxLength: 30 }),
          (transactions) => {
            const filters: SearchFilters = {
              minAmount: 50,
              maxAmount: 500,
              type: 'expense',
            };

            const filtered = filterTransactions(transactions, filters);

            filtered.forEach((tx) => {
              expect(tx.amount).toBeGreaterThanOrEqual(50);
              expect(tx.amount).toBeLessThanOrEqual(500);
              expect(tx.type).toBe('expense');
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
