/**
 * Connected Accounts Component
 *
 * Displays linked bank accounts with balance information,
 * sync status, and manual sync controls.
 */

import React, { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";
import {
  LinkedAccount,
  getLinkedAccounts,
  unlinkAccount,
  syncAccountTransactions,
  syncAllTransactions,
} from "../services/plaidApi";

interface ConnectedAccountsProps {
  onAccountsChange?: () => void;
}

export const ConnectedAccounts: React.FC<ConnectedAccountsProps> = ({
  onAccountsChange,
}) => {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState<string | null>(null);
  const currency = "USD";

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLinkedAccounts();
      setAccounts(data);
    } catch (err) {
      console.error("Failed to load accounts:", err);
      setError(err instanceof Error ? err.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleSyncAccount = async (accountId: string) => {
    try {
      setSyncing(accountId);
      setError(null);
      await syncAccountTransactions(accountId);
      await loadAccounts();
      onAccountsChange?.();
    } catch (err) {
      console.error("Failed to sync account:", err);
      setError(err instanceof Error ? err.message : "Failed to sync account");
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncingAll(true);
      setError(null);
      await syncAllTransactions();
      await loadAccounts();
      onAccountsChange?.();
    } catch (err) {
      console.error("Failed to sync all accounts:", err);
      setError(
        err instanceof Error ? err.message : "Failed to sync all accounts",
      );
    } finally {
      setSyncingAll(false);
    }
  };

  const handleUnlink = async (accountId: string) => {
    try {
      setError(null);
      await unlinkAccount(accountId);
      setConfirmUnlink(null);
      await loadAccounts();
      onAccountsChange?.();
    } catch (err) {
      console.error("Failed to unlink account:", err);
      setError(err instanceof Error ? err.message : "Failed to unlink account");
    }
  };

  const formatLastSynced = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
            Active
          </span>
        );
      case "error":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
            Error
          </span>
        );
      case "pending":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      default:
        return null;
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "depository":
        return "🏦";
      case "credit":
        return "💳";
      case "loan":
        return "📋";
      case "investment":
        return "📈";
      default:
        return "💰";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Connected Accounts
        </h3>
        {accounts.length > 0 && (
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg
              hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
          >
            {syncingAll ? (
              <>
                <span className="animate-spin">🔄</span>
                Syncing...
              </>
            ) : (
              <>🔄 Sync All</>
            )}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-100">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-4xl mb-3">🏦</div>
          <p className="text-gray-500">No bank accounts connected yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Connect your bank to automatically import transactions
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {accounts.map((account) => (
            <div
              key={account.accountId}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">
                    {getAccountIcon(account.accountType)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">
                        {account.accountName}
                      </h4>
                      {getStatusBadge(account.syncStatus)}
                    </div>
                    <p className="text-sm text-gray-500">
                      {account.institutionName} •••• {account.mask}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Last synced: {formatLastSynced(account.lastSynced)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(account.currentBalance, currency)}
                  </p>
                  {account.availableBalance !== null &&
                    account.availableBalance !== account.currentBalance && (
                      <p className="text-xs text-gray-500">
                        Available:{" "}
                        {formatCurrency(account.availableBalance, currency)}
                      </p>
                    )}
                </div>
              </div>

              {/* Account Actions */}
              <div className="mt-3 flex gap-2 justify-end">
                <button
                  onClick={() => handleSyncAccount(account.accountId)}
                  disabled={syncing === account.accountId}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded
                    hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  {syncing === account.accountId ? "Syncing..." : "Sync"}
                </button>
                {confirmUnlink === account.accountId ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleUnlink(account.accountId)}
                      className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmUnlink(null)}
                      className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmUnlink(account.accountId)}
                    className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    Unlink
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConnectedAccounts;
