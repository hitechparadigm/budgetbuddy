/**
 * BulkAccountAssignmentModal Component
 *
 * Modal for bulk-assigning accounts to multiple transactions.
 * Allows filtering by date range, category, and description.
 */

import React, { useState, useMemo } from "react";
import { Account } from "../../services/accountsApi";

export interface Transaction {
  transactionId: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  categoryId: string;
  accountId: string | null;
}

export interface BulkAccountAssignmentModalProps {
  isOpen: boolean;
  transactions: Transaction[];
  accounts: Account[];
  onAssign: (
    transactionIds: string[],
    accountId: string | null,
  ) => Promise<void>;
  onClose: () => void;
}

interface FilterState {
  startDate: string;
  endDate: string;
  categoryId: string;
  description: string;
  onlyUnassigned: boolean;
}

export const BulkAccountAssignmentModal: React.FC<
  BulkAccountAssignmentModalProps
> = ({ isOpen, transactions, accounts, onAssign, onClose }) => {
  const [filters, setFilters] = useState<FilterState>({
    startDate: "",
    endDate: "",
    categoryId: "",
    description: "",
    onlyUnassigned: true,
  });
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<
    Set<string>
  >(new Set());
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter transactions based on criteria
  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      // Date range filter
      if (filters.startDate && txn.date < filters.startDate) return false;
      if (filters.endDate && txn.date > filters.endDate) return false;

      // Category filter
      if (filters.categoryId && txn.categoryId !== filters.categoryId)
        return false;

      // Description filter (case-insensitive contains)
      if (filters.description) {
        const searchTerm = filters.description.toLowerCase();
        if (!txn.description.toLowerCase().includes(searchTerm)) return false;
      }

      // Only unassigned filter
      if (filters.onlyUnassigned && txn.accountId) return false;

      return true;
    });
  }, [transactions, filters]);

  // Get unique categories from transactions
  const categories = useMemo(() => {
    const categorySet = new Set(transactions.map((t) => t.categoryId));
    return Array.from(categorySet).sort();
  }, [transactions]);

  // Handle select all
  const handleSelectAll = () => {
    if (selectedTransactionIds.size === filteredTransactions.length) {
      setSelectedTransactionIds(new Set());
    } else {
      setSelectedTransactionIds(
        new Set(filteredTransactions.map((t) => t.transactionId)),
      );
    }
  };

  // Handle individual selection
  const handleSelectTransaction = (transactionId: string) => {
    const newSelected = new Set(selectedTransactionIds);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedTransactionIds(newSelected);
  };

  // Handle submit
  const handleSubmit = async () => {
    if (selectedTransactionIds.size === 0) {
      setError("Please select at least one transaction");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onAssign(Array.from(selectedTransactionIds), selectedAccountId);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to assign accounts",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group accounts by type for dropdown
  const accountsByType = useMemo(() => {
    const grouped: Record<string, Account[]> = {};
    accounts.forEach((account) => {
      if (!grouped[account.accountType]) {
        grouped[account.accountType] = [];
      }
      grouped[account.accountType].push(account);
    });
    return grouped;
  }, [accounts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-[var(--color-surface)] rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
              Bulk Assign Account
            </h2>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
              Assign an account to multiple transactions at once
            </p>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 bg-[var(--color-background)] border-b border-[var(--color-border)]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters({ ...filters, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters({ ...filters, endDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                  Category
                </label>
                <select
                  value={filters.categoryId}
                  onChange={(e) =>
                    setFilters({ ...filters, categoryId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Search..."
                  value={filters.description}
                  onChange={(e) =>
                    setFilters({ ...filters, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.onlyUnassigned}
                  onChange={(e) =>
                    setFilters({ ...filters, onlyUnassigned: e.target.checked })
                  }
                  className="rounded border-[var(--color-border)] text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[var(--color-foreground)]">
                  Show only unassigned transactions
                </span>
              </label>
            </div>
          </div>

          {/* Transaction List */}
          <div className="px-6 py-4 overflow-y-auto max-h-[40vh]">
            {filteredTransactions.length === 0 ? (
              <p className="text-center text-[var(--color-muted-foreground)] py-8">
                No transactions match the current filters
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={
                        selectedTransactionIds.size ===
                          filteredTransactions.length &&
                        filteredTransactions.length > 0
                      }
                      onChange={handleSelectAll}
                      className="rounded border-[var(--color-border)] text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-[var(--color-foreground)]">
                      Select all ({filteredTransactions.length})
                    </span>
                  </label>
                  <span className="text-sm text-[var(--color-muted-foreground)]">
                    {selectedTransactionIds.size} selected
                  </span>
                </div>
                <div className="space-y-2">
                  {filteredTransactions.map((txn) => (
                    <div
                      key={txn.transactionId}
                      className={`flex items-center p-3 rounded-lg border ${
                        selectedTransactionIds.has(txn.transactionId)
                          ? "border-blue-500 bg-blue-50"
                          : "border-[var(--color-border)] hover:border-[var(--color-border)]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTransactionIds.has(txn.transactionId)}
                        onChange={() =>
                          handleSelectTransaction(txn.transactionId)
                        }
                        className="rounded border-[var(--color-border)] text-blue-600 focus:ring-blue-500 mr-3"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
                          {txn.description}
                        </p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          {txn.date} • {txn.categoryId}
                        </p>
                      </div>
                      <div
                        className={`text-sm font-medium ${
                          txn.type === "income"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {txn.type === "income" ? "+" : "-"}$
                        {txn.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Account Selection */}
          <div className="px-6 py-4 bg-[var(--color-background)] border-t border-[var(--color-border)]">
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
              Assign to Account
            </label>
            <select
              value={selectedAccountId || ""}
              onChange={(e) => setSelectedAccountId(e.target.value || null)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Remove account assignment</option>
              {Object.entries(accountsByType).map(([type, accts]) => (
                <optgroup
                  key={type}
                  label={type.replace("_", " ").toUpperCase()}
                >
                  {accts.map((account) => (
                    <option key={account.accountId} value={account.accountId}>
                      {account.nickname}
                      {account.mask && ` (••••${account.mask})`}
                      {" - "}${account.currentBalance.toFixed(2)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="px-6 py-2 bg-red-50 border-t border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[var(--color-border)] flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[var(--color-foreground)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || selectedTransactionIds.size === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? "Assigning..."
                : `Assign ${selectedTransactionIds.size} Transaction${selectedTransactionIds.size !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkAccountAssignmentModal;
