/**
 * AccountCard Component
 *
 * Displays a single account with its details and action menu.
 * Shows icon, nickname, institution, mask, balance, and status badges.
 *
 * **Validates: Requirements 8.2, 8.5**
 */

import React, { useState } from "react";
import {
  Account,
  getAccountIcon,
  getAccountSubtypeLabel,
  isLiabilityAccount,
} from "@budget-buddy/shared/src/types/account";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";

export interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (accountId: string) => void;
  onReconcile: (accountId: string) => void;
  onToggleTracking: (accountId: string, isTracked: boolean) => void;
  onViewTransactions?: (accountId: string) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onEdit,
  onDelete,
  onReconcile,
  onToggleTracking,
  onViewTransactions,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const icon = getAccountIcon(account);
  const subtypeLabel = getAccountSubtypeLabel(account.accountSubtype);
  const isLiability = isLiabilityAccount(account.accountType);

  // Format balance with color coding
  const balanceColor =
    account.currentBalance >= 0 ? "text-green-600" : "text-red-600";
  // For liabilities, show as negative (debt)
  const displayBalance = isLiability
    ? -Math.abs(account.currentBalance)
    : account.currentBalance;

  const handleMenuAction = (action: () => void) => {
    action();
    setShowMenu(false);
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        {/* Account Info */}
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          {/* Icon */}
          <div className="w-10 h-10 bg-[var(--color-muted)] rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-xl" aria-hidden="true">
              {icon}
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-[var(--color-foreground)] truncate">
                {account.nickname}
              </h3>
              {/* Status Badges */}
              {!account.isTracked && (
                <span className="px-2 py-0.5 text-xs bg-[var(--color-muted)] text-[var(--color-muted-foreground)] rounded-full">
                  Not Tracked
                </span>
              )}
              {!account.isManual && (
                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                  Connected
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 text-sm text-[var(--color-muted-foreground)] mt-0.5">
              <span>{subtypeLabel}</span>
              {account.institutionName && (
                <>
                  <span>•</span>
                  <span className="truncate">{account.institutionName}</span>
                </>
              )}
              {account.mask && (
                <>
                  <span>•</span>
                  <span>••••{account.mask}</span>
                </>
              )}
            </div>

            {/* Last synced/reconciled info */}
            {account.lastSynced && (
              <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                Last synced: {new Date(account.lastSynced).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Balance and Menu */}
        <div className="flex items-start space-x-2 ml-4">
          {/* Balance */}
          <div className="text-right">
            <p className={`font-semibold ${balanceColor}`}>
              {formatCurrency(displayBalance, account.currency)}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">{account.currency}</p>
          </div>

          {/* Menu Button */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-muted-foreground)] rounded-full hover:bg-[var(--color-muted)]"
              aria-label="Account actions"
              aria-expanded={showMenu}
              aria-haspopup="menu"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />

                {/* Menu */}
                <div
                  className="absolute right-0 mt-1 w-48 bg-[var(--color-surface)] rounded-lg shadow-lg border border-[var(--color-border)] py-1 z-20"
                  role="menu"
                >
                  <button
                    onClick={() => handleMenuAction(() => onEdit(account))}
                    className="w-full px-4 py-2 text-left text-sm text-[var(--color-foreground)] hover:bg-[var(--color-muted)] flex items-center space-x-2"
                    role="menuitem"
                  >
                    <span>✏️</span>
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() =>
                      handleMenuAction(() => onReconcile(account.accountId))
                    }
                    className="w-full px-4 py-2 text-left text-sm text-[var(--color-foreground)] hover:bg-[var(--color-muted)] flex items-center space-x-2"
                    role="menuitem"
                  >
                    <span>🔄</span>
                    <span>Reconcile Balance</span>
                  </button>

                  {onViewTransactions && (
                    <button
                      onClick={() =>
                        handleMenuAction(() =>
                          onViewTransactions(account.accountId),
                        )
                      }
                      className="w-full px-4 py-2 text-left text-sm text-[var(--color-foreground)] hover:bg-[var(--color-muted)] flex items-center space-x-2"
                      role="menuitem"
                    >
                      <span>📋</span>
                      <span>View Transactions</span>
                    </button>
                  )}

                  <button
                    onClick={() =>
                      handleMenuAction(() =>
                        onToggleTracking(account.accountId, !account.isTracked),
                      )
                    }
                    className="w-full px-4 py-2 text-left text-sm text-[var(--color-foreground)] hover:bg-[var(--color-muted)] flex items-center space-x-2"
                    role="menuitem"
                  >
                    <span>{account.isTracked ? "👁️‍🗨️" : "👁️"}</span>
                    <span>
                      {account.isTracked ? "Stop Tracking" : "Start Tracking"}
                    </span>
                  </button>

                  <hr className="my-1 border-[var(--color-border)]" />

                  {account.isManual && (
                    <button
                      onClick={() =>
                        handleMenuAction(() => onDelete(account.accountId))
                      }
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                      role="menuitem"
                    >
                      <span>🗑️</span>
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountCard;
