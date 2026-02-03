/**
 * ReconcileModal Component
 *
 * Modal for reconciling an account balance.
 * Shows current balance, allows entering actual balance,
 * and creates an adjustment transaction on save.
 *
 * **Validates: Requirements 3.7, 3.8**
 */

import React, { useState, useEffect } from "react";
import { Account } from "@budget-buddy/shared/src/types/account";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";

export interface ReconcileModalProps {
  isOpen: boolean;
  account: Account | null;
  onClose: () => void;
  onReconcile: (
    accountId: string,
    newBalance: number,
    notes?: string,
  ) => Promise<void>;
}

export const ReconcileModal: React.FC<ReconcileModalProps> = ({
  isOpen,
  account,
  onClose,
  onReconcile,
}) => {
  const [newBalance, setNewBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens with new account
  useEffect(() => {
    if (isOpen && account) {
      setNewBalance(account.currentBalance.toFixed(2));
      setNotes("");
      setError(null);
    }
  }, [isOpen, account]);

  const handleClose = () => {
    setNewBalance("");
    setNotes("");
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account) return;

    const balance = parseFloat(newBalance);
    if (isNaN(balance)) {
      setError("Please enter a valid balance");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onReconcile(account.accountId, balance, notes.trim() || undefined);
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reconcile account",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !account) return null;

  const currentBalance = account.currentBalance;
  const enteredBalance = parseFloat(newBalance) || 0;
  const difference = enteredBalance - currentBalance;
  const hasDifference = Math.abs(difference) >= 0.01;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Reconcile Account
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded"
              aria-label="Close"
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
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Account Info */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Account</p>
              <p className="font-medium text-gray-900">{account.nickname}</p>
              {account.institutionName && (
                <p className="text-sm text-gray-500">
                  {account.institutionName}
                </p>
              )}
            </div>

            {/* Current Balance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Balance (in BudgetBuddy)
              </label>
              <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-900 font-medium">
                {formatCurrency(currentBalance, account.currency)}
              </div>
            </div>

            {/* New Balance Input */}
            <div>
              <label
                htmlFor="newBalance"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Actual Balance
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {account.currency === "USD" ? "$" : account.currency}
                </span>
                <input
                  type="number"
                  id="newBalance"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  step="0.01"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Difference Display */}
            {hasDifference && (
              <div
                className={`p-3 rounded-lg ${difference >= 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Difference</span>
                  <span
                    className={`font-medium ${difference >= 0 ? "text-green-700" : "text-red-700"}`}
                  >
                    {difference >= 0 ? "+" : ""}
                    {formatCurrency(difference, account.currency)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  An adjustment transaction will be created to reconcile this
                  difference.
                </p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Notes (optional)
              </label>
              <input
                type="text"
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Monthly reconciliation"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                maxLength={500}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !hasDifference}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Reconciling..." : "Reconcile"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReconcileModal;
