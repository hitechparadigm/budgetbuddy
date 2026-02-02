/**
 * TransactionFilters Component
 *
 * Provides comprehensive filtering options for transactions:
 * - Search by description/merchant
 * - Filter by category
 * - Filter by date range
 * - Filter by amount range
 * - Filter by transaction type (income/expense)
 */

import React, { useState } from "react";

export interface TransactionFiltersState {
  search: string;
  category: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  amountMin: number | null;
  amountMax: number | null;
  type: "income" | "expense" | null;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  type: "income" | "savings" | "expense";
}

interface TransactionFiltersProps {
  filters: TransactionFiltersState;
  onFiltersChange: (filters: TransactionFiltersState) => void;
  categories: Category[];
  className?: string;
  compact?: boolean;
}

const initialFilters: TransactionFiltersState = {
  search: "",
  category: null,
  dateFrom: null,
  dateTo: null,
  amountMin: null,
  amountMax: null,
  type: null,
};

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  filters,
  onFiltersChange,
  categories,
  className = "",
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if any filters are active (besides search)
  const hasActiveFilters =
    filters.category !== null ||
    filters.dateFrom !== null ||
    filters.dateTo !== null ||
    filters.amountMin !== null ||
    filters.amountMax !== null ||
    filters.type !== null;

  const activeFilterCount = [
    filters.category,
    filters.dateFrom || filters.dateTo,
    filters.amountMin || filters.amountMax,
    filters.type,
  ].filter(Boolean).length;

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleCategoryChange = (value: string) => {
    onFiltersChange({ ...filters, category: value || null });
  };

  const handleDateFromChange = (value: string) => {
    onFiltersChange({ ...filters, dateFrom: value || null });
  };

  const handleDateToChange = (value: string) => {
    onFiltersChange({ ...filters, dateTo: value || null });
  };

  const handleAmountMinChange = (value: string) => {
    const num = value ? parseFloat(value) : null;
    onFiltersChange({ ...filters, amountMin: num });
  };

  const handleAmountMaxChange = (value: string) => {
    const num = value ? parseFloat(value) : null;
    onFiltersChange({ ...filters, amountMax: num });
  };

  const handleTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      type: value as "income" | "expense" | null,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange(initialFilters);
    setIsExpanded(false);
  };

  const clearFilter = (filterName: keyof TransactionFiltersState) => {
    if (filterName === "dateFrom" || filterName === "dateTo") {
      onFiltersChange({ ...filters, dateFrom: null, dateTo: null });
    } else if (filterName === "amountMin" || filterName === "amountMax") {
      onFiltersChange({ ...filters, amountMin: null, amountMax: null });
    } else {
      onFiltersChange({
        ...filters,
        [filterName]: filterName === "search" ? "" : null,
      });
    }
  };

  // Group categories by type
  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter(
    (c) => c.type === "expense" || c.type === "savings",
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <svg
          className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search transactions..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {filters.search && (
          <button
            onClick={() => clearFilter("search")}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            hasActiveFilters
              ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-red-600 hover:text-red-700 flex items-center space-x-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <span>Clear all</span>
          </button>
        )}
      </div>

      {/* Active Filter Pills */}
      {hasActiveFilters && !isExpanded && (
        <div className="flex flex-wrap gap-2">
          {filters.category && (
            <FilterPill
              label={`Category: ${categories.find((c) => c.id === filters.category)?.name || filters.category}`}
              onRemove={() => clearFilter("category")}
            />
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <FilterPill
              label={`Date: ${filters.dateFrom || "Any"} - ${filters.dateTo || "Any"}`}
              onRemove={() => clearFilter("dateFrom")}
            />
          )}
          {(filters.amountMin !== null || filters.amountMax !== null) && (
            <FilterPill
              label={`Amount: $${filters.amountMin || 0} - $${filters.amountMax || "∞"}`}
              onRemove={() => clearFilter("amountMin")}
            />
          )}
          {filters.type && (
            <FilterPill
              label={`Type: ${filters.type}`}
              onRemove={() => clearFilter("type")}
            />
          )}
        </div>
      )}

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4 border border-gray-200">
          <div
            className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}
          >
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={filters.category || ""}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All categories</option>
                {incomeCategories.length > 0 && (
                  <optgroup label="Income">
                    {incomeCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {expenseCategories.length > 0 && (
                  <optgroup label="Expenses">
                    {expenseCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={filters.type || ""}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => handleDateFromChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => handleDateToChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Amount Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Amount ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={filters.amountMin ?? ""}
                onChange={(e) => handleAmountMinChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Amount ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="No limit"
                value={filters.amountMax ?? ""}
                onChange={(e) => handleAmountMaxChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Filter Pill Component
interface FilterPillProps {
  label: string;
  onRemove: () => void;
}

const FilterPill: React.FC<FilterPillProps> = ({ label, onRemove }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
    {label}
    <button
      onClick={onRemove}
      className="ml-1.5 hover:text-blue-600"
      aria-label={`Remove ${label} filter`}
    >
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  </span>
);

// Hook for managing filter state
export function useTransactionFilters(
  initialState?: Partial<TransactionFiltersState>,
) {
  const [filters, setFilters] = useState<TransactionFiltersState>({
    ...initialFilters,
    ...initialState,
  });

  const clearFilters = () => setFilters(initialFilters);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.category !== null ||
    filters.dateFrom !== null ||
    filters.dateTo !== null ||
    filters.amountMin !== null ||
    filters.amountMax !== null ||
    filters.type !== null;

  return {
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters,
  };
}

// Filter function to apply filters to transactions
export function filterTransactions<
  T extends {
    description?: string;
    amount: number;
    date: string;
    categoryId?: string;
  },
>(
  transactions: T[],
  filters: TransactionFiltersState,
  getCategoryType?: (
    categoryId: string,
  ) => "income" | "expense" | "savings" | undefined,
): T[] {
  return transactions.filter((txn) => {
    // Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      const description = (txn.description || "").toLowerCase();
      if (!description.includes(query)) {
        return false;
      }
    }

    // Category filter
    if (filters.category && txn.categoryId !== filters.category) {
      return false;
    }

    // Date range filter
    if (filters.dateFrom && txn.date < filters.dateFrom) {
      return false;
    }
    if (filters.dateTo && txn.date > filters.dateTo) {
      return false;
    }

    // Amount range filter
    if (filters.amountMin !== null && txn.amount < filters.amountMin) {
      return false;
    }
    if (filters.amountMax !== null && txn.amount > filters.amountMax) {
      return false;
    }

    // Type filter
    if (filters.type && getCategoryType && txn.categoryId) {
      const catType = getCategoryType(txn.categoryId);
      if (filters.type === "income" && catType !== "income") {
        return false;
      }
      if (
        filters.type === "expense" &&
        catType !== "expense" &&
        catType !== "savings"
      ) {
        return false;
      }
    }

    return true;
  });
}

export default TransactionFilters;
