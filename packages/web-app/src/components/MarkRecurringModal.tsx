/**
 * MarkRecurringModal Component
 * Allows users to mark a transaction as recurring and create a bill reminder
 *
 * Requirements: 5.1, 5.2
 */

import React, { useState } from "react";
import { patternDetectionApi } from "../services/patternDetectionApi";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryName?: string;
}

interface MarkRecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSuccess?: () => void;
  currency?: string;
}

const frequencyOptions = [
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Yearly" },
];

export const MarkRecurringModal: React.FC<MarkRecurringModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onSuccess,
  currency = "USD",
}) => {
  const [frequency, setFrequency] = useState<
    "weekly" | "bi-weekly" | "monthly" | "quarterly" | "annual"
  >("monthly");
  const [billName, setBillName] = useState("");
  const [createReminder, setCreateReminder] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when transaction changes
  React.useEffect(() => {
    if (transaction) {
      setBillName(transaction.description);
      setFrequency("monthly");
      setCreateReminder(true);
      setError(null);
    }
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    setLoading(true);
    setError(null);

    try {
      await patternDetectionApi.createManualPattern({
        transactionId: transaction.id,
        frequency,
        billName: billName || transaction.description,
        createBillReminder: createReminder,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to create recurring pattern:", err);
      setError("Failed to mark as recurring. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !transaction) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="mark-recurring-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative inline-block w-full max-w-md bg-[var(--color-surface)] rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3
                id="mark-recurring-title"
                className="text-lg font-semibold text-white"
              >
                🔄 Mark as Recurring
              </h3>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200"
              >
                <svg
                  className="w-6 h-6"
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
            </div>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="px-6 py-4">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Transaction Info */}
            <div className="mb-6 p-4 bg-[var(--color-background)] rounded-lg">
              <p className="text-sm text-[var(--color-muted-foreground)]">Transaction</p>
              <p className="font-medium text-[var(--color-foreground)]">
                {transaction.description}
              </p>
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-[var(--color-muted-foreground)]">
                  {new Date(transaction.date).toLocaleDateString()}
                </span>
                <span className="font-medium text-[var(--color-foreground)]">
                  {formatCurrency(transaction.amount, currency)}
                </span>
              </div>
            </div>

            {/* Bill Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                Bill Name
              </label>
              <input
                type="text"
                value={billName}
                onChange={(e) => setBillName(e.target.value)}
                placeholder="e.g., Netflix Subscription"
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Frequency */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                How often does this occur?
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {frequencyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Create Reminder Checkbox */}
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createReminder}
                  onChange={(e) => setCreateReminder(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-[var(--color-foreground)]">
                  Create a bill reminder for this recurring expense
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 font-medium"
              >
                {loading ? "Creating..." : "Create Pattern"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MarkRecurringModal;
