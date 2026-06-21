/**
 * TransactionModal Component
 *
 * Enhanced transaction entry modal with:
 * - Account selection dropdown
 * - Batch entry mode
 * - Last account preference
 *
 * **Validates: Requirements 1.1-1.9, 4.1-4.8**
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Account } from "../../hooks/useAccounts";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";

// Account type labels for grouping
const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  banking: "Banking",
  cash: "Cash",
  credit_card: "Credit Cards",
  investment: "Investments",
  loan: "Loans",
};

const ACCOUNT_TYPE_ORDER = [
  "banking",
  "cash",
  "credit_card",
  "investment",
  "loan",
];

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface TransactionFormData {
  amount: string;
  description: string;
  date: string;
  categoryId: string;
  accountId: string | null;
}

export interface TransactionModalProps {
  isOpen: boolean;
  type: "income" | "expense";
  accounts: Account[];
  categories: Category[];
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onClose: () => void;
  onOpenTemplates?: () => void;
  onSaveTemplate?: () => void;
  initialData?: Partial<TransactionFormData>;
}

// Local storage key for last used account
const LAST_ACCOUNT_KEY = "budgetbuddy_last_account";

const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  type,
  accounts,
  categories,
  onSubmit,
  onClose,
  onOpenTemplates,
  onSaveTemplate,
  initialData,
}) => {
  // Form state
  const [formData, setFormData] = useState<TransactionFormData>({
    amount: "",
    description: "",
    date: getTodayString(),
    categoryId: "",
    accountId: null,
  });

  // Batch mode state
  const [createAnother, setCreateAnother] = useState(false);
  const [batchCount, setBatchCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get last used account from localStorage
  const getLastAccount = (): string | null => {
    try {
      return localStorage.getItem(LAST_ACCOUNT_KEY);
    } catch {
      return null;
    }
  };

  // Save last used account to localStorage
  const saveLastAccount = (accountId: string | null) => {
    try {
      if (accountId) {
        localStorage.setItem(LAST_ACCOUNT_KEY, accountId);
      } else {
        localStorage.removeItem(LAST_ACCOUNT_KEY);
      }
    } catch {
      // Ignore localStorage errors
    }
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const lastAccountId = getLastAccount();
      // Verify last account still exists
      const validLastAccount = accounts.find(
        (a) => a.accountId === lastAccountId,
      );

      setFormData({
        amount: initialData?.amount || "",
        description: initialData?.description || "",
        date: initialData?.date || getTodayString(),
        categoryId: initialData?.categoryId || "",
        accountId:
          initialData?.accountId !== undefined
            ? initialData.accountId
            : validLastAccount
              ? lastAccountId
              : null,
      });
      setError(null);
      // Don't reset batch count when reopening in batch mode
      if (!createAnother) {
        setBatchCount(0);
      }
    }
  }, [isOpen, initialData, accounts]);

  // Group accounts by type for dropdown
  const accountsByType = useMemo(() => {
    const grouped: Record<string, Account[]> = {};

    ACCOUNT_TYPE_ORDER.forEach((type) => {
      grouped[type] = [];
    });

    accounts.forEach((account) => {
      if (grouped[account.accountType]) {
        grouped[account.accountType].push(account);
      }
    });

    return grouped;
  }, [accounts]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      accountId: value === "" ? null : value,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.categoryId) {
      setError("Please select a category");
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(formData);

      // Save last used account
      saveLastAccount(formData.accountId);

      // Increment batch count
      setBatchCount((prev) => prev + 1);

      if (createAnother) {
        // Clear form but preserve type and account (batch mode)
        setFormData((prev) => ({
          amount: "",
          description: "",
          date: getTodayString(),
          categoryId: "",
          accountId: prev.accountId, // Preserve account selection
        }));
      } else {
        // Close modal
        handleClose();
      }
    } catch (err) {
      // Keep form data on error for retry
      setError(
        err instanceof Error ? err.message : "Failed to save transaction",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCreateAnother(false);
    setBatchCount(0);
    setError(null);
    onClose();
  };

  // Focus trap: track focusable elements and trap Tab key
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
        return;
      }

      if (e.key !== "Tab" || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Auto-focus first input when modal opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstInput = modalRef.current.querySelector<HTMLElement>(
        "select, input, button",
      );
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 50);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canSaveTemplate = formData.categoryId && formData.description;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
      aria-hidden="true"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-modal-title"
        className="bg-[var(--color-surface)] dark:bg-gray-800 rounded-lg max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3
              id="transaction-modal-title"
              className="text-lg font-semibold text-[var(--color-foreground)] dark:text-gray-100"
            >
              {type === "income"
                ? "Add Income Transaction"
                : "Add Expense Transaction"}
            </h3>
            {batchCount > 0 && (
              <p className="text-sm text-green-600">
                {batchCount} transaction{batchCount !== 1 ? "s" : ""} added this
                session
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {onOpenTemplates && (
              <button
                type="button"
                onClick={onOpenTemplates}
                className="p-2 text-[var(--color-muted-foreground)] hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Use template"
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </button>
            )}
            <button
              onClick={handleClose}
              className="text-[var(--color-muted-foreground)] hover:text-[var(--color-muted-foreground)]"
              aria-label="Close"
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Selection */}
          <div>
            <label
              htmlFor="categoryId"
              className="block text-sm font-medium text-[var(--color-foreground)] dark:text-gray-300 mb-1"
            >
              Category *
            </label>
            <select
              id="categoryId"
              name="categoryId"
              value={formData.categoryId}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-[var(--color-border)] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-[var(--color-primary)]"
              required
            >
              <option value="">Select a category...</option>
              {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Account Selection (NEW) */}
          <div>
            <label
              htmlFor="accountId"
              className="block text-sm font-medium text-[var(--color-foreground)] dark:text-gray-300 mb-1"
            >
              Account (optional)
            </label>
            <select
              id="accountId"
              name="accountId"
              value={formData.accountId || ""}
              onChange={handleAccountChange}
              className="w-full px-4 py-2 border border-[var(--color-border)] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-[var(--color-primary)]"
            >
              <option value="">No account selected</option>
              {ACCOUNT_TYPE_ORDER.map((accountType) => {
                const typeAccounts = accountsByType[accountType];
                if (typeAccounts.length === 0) return null;

                return (
                  <optgroup
                    key={accountType}
                    label={ACCOUNT_TYPE_LABELS[accountType]}
                  >
                    {typeAccounts.map((account) => (
                      <option key={account.accountId} value={account.accountId}>
                        {account.nickname}
                        {account.mask ? ` (••••${account.mask})` : ""}
                        {" - "}
                        {formatCurrency(
                          account.currentBalance,
                          account.currency,
                        )}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-[var(--color-foreground)] dark:text-gray-300 mb-1"
            >
              Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-[var(--color-muted-foreground)]">$</span>
              <input
                type="number"
                id="amount"
                name="amount"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={handleInputChange}
                className="w-full pl-8 pr-4 py-2 border border-[var(--color-border)] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-[var(--color-primary)]"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-[var(--color-foreground)] dark:text-gray-300 mb-1"
            >
              Description
            </label>
            <input
              type="text"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-[var(--color-border)] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-[var(--color-primary)]"
              placeholder="Enter description..."
            />
          </div>

          {/* Date */}
          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-[var(--color-foreground)] dark:text-gray-300 mb-1"
            >
              Date *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-[var(--color-border)] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-[var(--color-primary)]"
              required
            />
          </div>

          {/* Batch Mode Checkbox (NEW) */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="createAnother"
              checked={createAnother}
              onChange={(e) => setCreateAnother(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-[var(--color-primary)] border-[var(--color-border)] rounded"
            />
            <label
              htmlFor="createAnother"
              className="ml-2 text-sm text-[var(--color-foreground)] dark:text-gray-300"
            >
              Create another transaction after saving
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-[var(--color-foreground)] dark:text-gray-300 bg-[var(--color-muted)] dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              disabled={isSubmitting}
            >
              {createAnother && batchCount > 0 ? "Done" : "Cancel"}
            </button>
            {canSaveTemplate && onSaveTemplate && (
              <button
                type="button"
                onClick={onSaveTemplate}
                className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                title="Save as template"
                disabled={isSubmitting}
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
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : "Add Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
