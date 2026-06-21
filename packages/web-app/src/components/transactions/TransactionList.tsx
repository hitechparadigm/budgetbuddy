/**
 * TransactionList Component
 *
 * Displays a list of transactions with account information.
 * Shows account icon and name for transactions with accounts,
 * "Unassigned" for transactions without accounts.
 *
 * **Validates: Requirements 9.1, 9.2**
 */

import React, { useMemo } from "react";
import { Account } from "../../hooks/useAccounts";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";

export interface Transaction {
  transactionId: string;
  amount: number;
  type: "income" | "expense";
  categoryId: string;
  categoryName?: string;
  categoryIcon?: string;
  description: string;
  merchant?: string;
  transactionDate: string;
  accountId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  accounts?: Account[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
  loading?: boolean;
  currency?: string;
}

// Account type icons
const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  banking: "🏦",
  cash: "💵",
  credit_card: "💳",
  investment: "📈",
  loan: "📋",
};

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  accounts = [],
  onEdit,
  onDelete,
  loading = false,
  currency = "USD",
}) => {
  // Create account lookup map
  const accountMap = useMemo(() => {
    const map = new Map<string, Account>();
    accounts.forEach((account) => {
      map.set(account.accountId, account);
    });
    return map;
  }, [accounts]);

  // Get account display info for a transaction
  const getAccountDisplay = (
    accountId: string | null | undefined,
  ): { icon: string; name: string; isUnassigned: boolean } => {
    if (!accountId) {
      return { icon: "📝", name: "Unassigned", isUnassigned: true };
    }

    const account = accountMap.get(accountId);
    if (!account) {
      return { icon: "❓", name: "Unknown Account", isUnassigned: true };
    }

    return {
      icon: ACCOUNT_TYPE_ICONS[account.accountType] || "🏦",
      name: account.nickname,
      isUnassigned: false,
    };
  };

  if (loading) {
    return (
      <div className="transaction-list-loading p-8 text-center">
        <div className="loading-spinner text-[var(--color-muted-foreground)]">
          Loading transactions...
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="transaction-list-empty p-8 text-center">
        <div className="empty-state">
          <h3 className="text-lg font-medium text-[var(--color-foreground)]">
            No transactions yet
          </h3>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            Start by adding your first income or expense transaction.
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="transaction-list">
      <div className="transaction-list-header flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
          Recent Transactions
        </h2>
        <div className="transaction-count text-sm text-[var(--color-muted-foreground)]">
          {transactions.length} transaction
          {transactions.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="transaction-items space-y-2">
        {transactions.map((transaction) => {
          const accountDisplay = getAccountDisplay(transaction.accountId);
          const isIncome = transaction.type === "income";

          return (
            <div
              key={transaction.transactionId}
              className="transaction-item group flex items-center p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors cursor-pointer"
              onDoubleClick={() => onEdit(transaction)}
              title="Double-click to edit"
            >
              {/* Category Icon */}
              <div
                className={`w-10 h-10 ${
                  isIncome ? "bg-green-100" : "bg-red-100"
                } rounded-full flex items-center justify-center flex-shrink-0`}
              >
                <span
                  className={`${
                    isIncome ? "text-green-600" : "text-red-600"
                  } text-lg`}
                >
                  {transaction.categoryIcon || "$"}
                </span>
              </div>

              {/* Transaction Info */}
              <div className="flex-1 min-w-0 ml-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-[var(--color-foreground)] truncate">
                    {transaction.description}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-[var(--color-muted-foreground)] mt-0.5">
                  <span>
                    {transaction.categoryName || transaction.categoryId}
                  </span>
                  {transaction.merchant && (
                    <>
                      <span>•</span>
                      <span className="truncate">{transaction.merchant}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{formatDate(transaction.transactionDate)}</span>
                </div>
              </div>

              {/* Account Column (NEW) */}
              <div
                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                  accountDisplay.isUnassigned
                    ? "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                    : "bg-blue-50 text-blue-700"
                }`}
                title={accountDisplay.name}
              >
                <span>{accountDisplay.icon}</span>
                <span className="max-w-[80px] truncate">
                  {accountDisplay.name}
                </span>
              </div>

              {/* Amount */}
              <div
                className={`text-sm font-semibold ml-3 ${
                  isIncome ? "text-green-600" : "text-red-600"
                }`}
              >
                {isIncome ? "+" : "-"}
                {formatCurrency(transaction.amount, currency)}
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(transaction);
                  }}
                  className="p-1 text-[var(--color-muted-foreground)] hover:text-blue-600 rounded transition-colors"
                  title="Edit transaction"
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(transaction.transactionId);
                  }}
                  className="p-1 text-[var(--color-muted-foreground)] hover:text-red-600 rounded transition-colors"
                  title="Delete transaction"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TransactionList;
