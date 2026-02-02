/**
 * Pending Transactions Component
 *
 * Displays transactions imported from Plaid that are awaiting user approval.
 * Users can approve, reject, or modify category assignments before
 * transactions are added to their budget.
 */

import React, { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";
import {
  PendingTransaction,
  getPendingTransactions,
  approvePendingTransactions,
  rejectPendingTransactions,
} from "../services/plaidApi";

// Common budget categories
const CATEGORIES = [
  "Food & Dining",
  "Groceries",
  "Transportation",
  "Gas & Fuel",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Healthcare",
  "Personal Care",
  "Education",
  "Travel",
  "Gifts & Donations",
  "Business",
  "Income",
  "Transfer",
  "Other",
];

interface PendingTransactionsProps {
  onTransactionsProcessed?: () => void;
}

export const PendingTransactions: React.FC<PendingTransactionsProps> = ({
  onTransactionsProcessed,
}) => {
  const [transactions, setTransactions] = useState<PendingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [categoryOverrides, setCategoryOverrides] = useState<
    Record<string, string>
  >({});
  const currency = "USD";

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPendingTransactions();
      setTransactions(data);
      // Select all by default
      setSelectedIds(new Set(data.map((t) => t.pendingId)));
    } catch (err) {
      console.error("Failed to load pending transactions:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load pending transactions",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const toggleSelection = (pendingId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(pendingId)) {
      newSelected.delete(pendingId);
    } else {
      newSelected.add(pendingId);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.pendingId)));
    }
  };

  const handleCategoryChange = (pendingId: string, category: string) => {
    setCategoryOverrides((prev) => ({
      ...prev,
      [pendingId]: category,
    }));
  };

  const handleApproveSelected = async () => {
    if (selectedIds.size === 0) return;

    try {
      setProcessing(true);
      setError(null);

      // Build category overrides for selected transactions
      const overrides: Record<string, string> = {};
      selectedIds.forEach((id) => {
        if (categoryOverrides[id]) {
          overrides[id] = categoryOverrides[id];
        }
      });

      await approvePendingTransactions(Array.from(selectedIds), overrides);
      await loadTransactions();
      onTransactionsProcessed?.();
    } catch (err) {
      console.error("Failed to approve transactions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to approve transactions",
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectSelected = async () => {
    if (selectedIds.size === 0) return;

    try {
      setProcessing(true);
      setError(null);
      await rejectPendingTransactions(Array.from(selectedIds));
      await loadTransactions();
      onTransactionsProcessed?.();
    } catch (err) {
      console.error("Failed to reject transactions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to reject transactions",
      );
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Pending Transactions
            </h3>
            <p className="text-sm text-gray-500">
              {transactions.length} transaction
              {transactions.length !== 1 ? "s" : ""} awaiting review
            </p>
          </div>
          {transactions.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleRejectSelected}
                disabled={processing || selectedIds.size === 0}
                className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg
                  hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                Reject ({selectedIds.size})
              </button>
              <button
                onClick={handleApproveSelected}
                disabled={processing || selectedIds.size === 0}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg
                  hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {processing ? "Processing..." : `Approve (${selectedIds.size})`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-100">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-500">No pending transactions</p>
          <p className="text-sm text-gray-400 mt-1">
            All imported transactions have been processed
          </p>
        </div>
      ) : (
        <>
          {/* Select All Header */}
          <div className="px-4 py-2 bg-gray-50 border-b flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedIds.size === transactions.length}
              onChange={toggleSelectAll}
              className="w-4 h-4 text-blue-600 rounded border-gray-300
                focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              {selectedIds.size === transactions.length
                ? "Deselect all"
                : "Select all"}
            </span>
          </div>

          {/* Transaction Rows */}
          <div className="divide-y max-h-96 overflow-y-auto">
            {transactions.map((transaction) => (
              <div
                key={transaction.pendingId}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  selectedIds.has(transaction.pendingId) ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(transaction.pendingId)}
                    onChange={() => toggleSelection(transaction.pendingId)}
                    className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300
                      focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {transaction.merchantName || transaction.description}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(transaction.date)} •{" "}
                          {transaction.institutionName}
                        </p>
                      </div>
                      <p
                        className={`font-semibold whitespace-nowrap ${
                          transaction.amount < 0
                            ? "text-green-600"
                            : "text-gray-900"
                        }`}
                      >
                        {transaction.amount < 0 ? "+" : "-"}
                        {formatCurrency(Math.abs(transaction.amount), currency)}
                      </p>
                    </div>

                    {/* Category Selection */}
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs text-gray-500">Category:</label>
                      <select
                        value={
                          categoryOverrides[transaction.pendingId] ||
                          transaction.suggestedCategory ||
                          ""
                        }
                        onChange={(e) =>
                          handleCategoryChange(
                            transaction.pendingId,
                            e.target.value,
                          )
                        }
                        className="text-sm border border-gray-300 rounded px-2 py-1
                          focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select category...</option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      {transaction.suggestedCategory && (
                        <span className="text-xs text-gray-400">
                          (suggested: {transaction.suggestedCategory})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PendingTransactions;
