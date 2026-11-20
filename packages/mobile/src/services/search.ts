/**
 * Transaction search and filtering
 *
 * The single implementation of the transaction filter. TransactionsScreen
 * calls this rather than filtering inline, so the behaviour the screen shows
 * and the behaviour the tests assert are the same code.
 */

export interface SearchableTransaction {
  id: string;
  description: string;
  merchant?: string;
  tags?: string[];
  /** Signed: positive is income, negative is an expense. */
  amount: number;
  categoryId: string;
  date: string | Date;
}

export interface TransactionFilters {
  type: 'all' | 'income' | 'expense';
  categoryIds: string[];
  dateRange: { start: Date | null; end: Date | null };
  amountRange: { min: number | null; max: number | null };
}

/** Filters that exclude nothing. */
export const EMPTY_FILTERS: TransactionFilters = {
  type: 'all',
  categoryIds: [],
  dateRange: { start: null, end: null },
  amountRange: { min: null, max: null },
};

/**
 * Does the free-text query match this transaction?
 *
 * Matches description, merchant and tags, case-insensitively. A blank query
 * matches everything.
 */
export function matchesQuery(
  transaction: SearchableTransaction,
  query: string,
): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();

  return (
    transaction.description.toLowerCase().includes(q) ||
    transaction.merchant?.toLowerCase().includes(q) === true ||
    transaction.tags?.some(tag => tag.toLowerCase().includes(q)) === true
  );
}

/**
 * Filter transactions by a free-text query and a set of filters.
 *
 * Semantics, matching what the Transactions screen has always shown:
 *   - text matches description, merchant or any tag
 *   - type is derived from the sign of `amount` (> 0 is income)
 *   - categoryIds is an allow-list; empty means "any category"
 *   - dateRange compares Date objects inclusively at the boundaries
 *   - amountRange compares the absolute amount, so a -40 expense matches a
 *     min of 20
 */
export function filterTransactions<T extends SearchableTransaction>(
  transactions: T[],
  query: string,
  filters: TransactionFilters,
): T[] {
  return transactions.filter(transaction => {
    if (!matchesQuery(transaction, query)) return false;

    if (filters.type !== 'all') {
      const isIncome = transaction.amount > 0;
      if (filters.type === 'income' && !isIncome) return false;
      if (filters.type === 'expense' && isIncome) return false;
    }

    if (filters.categoryIds.length > 0) {
      if (!filters.categoryIds.includes(transaction.categoryId)) return false;
    }

    if (filters.dateRange.start || filters.dateRange.end) {
      const date = new Date(transaction.date);
      if (filters.dateRange.start && date < filters.dateRange.start) return false;
      if (filters.dateRange.end && date > filters.dateRange.end) return false;
    }

    if (filters.amountRange.min !== null || filters.amountRange.max !== null) {
      const amount = Math.abs(transaction.amount);
      if (filters.amountRange.min !== null && amount < filters.amountRange.min) {
        return false;
      }
      if (filters.amountRange.max !== null && amount > filters.amountRange.max) {
        return false;
      }
    }

    return true;
  });
}

/** How many filters are narrowing the list, for the UI's badge count. */
export function countActiveFilters(filters: TransactionFilters): number {
  let count = 0;
  if (filters.categoryIds.length > 0) count++;
  if (filters.dateRange.start || filters.dateRange.end) count++;
  if (filters.amountRange.min !== null || filters.amountRange.max !== null) count++;
  if (filters.type !== 'all') count++;
  return count;
}
