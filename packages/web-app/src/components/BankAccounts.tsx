/**
 * BankAccounts Component
 * Displays connected bank accounts and allows linking new accounts via Plaid
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  plaidApi,
  PlaidAccount,
  PendingTransaction,
} from "../services/plaidApi";

// Account type icons
const accountTypeIcons: Record<string, string> = {
  depository: "🏦",
  credit: "💳",
  loan: "📋",
  investment: "📈",
  other: "💰",
};

// Format currency
const formatCurrency = (amount: number, currency: string = "USD"): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
};

// Format date
const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const BankAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<
    PendingTransaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(
    new Set(),
  );

  // Load accounts and pending transactions
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [accountsData, pendingData] = await Promise.all([
        plaidApi.getAccounts(),
        plaidApi.getPendingTransactions(),
      ]);

      setAccounts(accountsData.accounts);
      setPendingTransactions(pendingData.transactions);
    } catch (err: any) {
      setError(err.message || "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create sandbox test account
  const handleCreateSandboxAccount = async () => {
    try {
      setError(null);
      setSuccessMessage(null);
      setSyncing(true);

      const result = await plaidApi.createSandboxAccount();
      setSuccessMessage(
        `Connected ${result.accounts.length} test account(s) from ${result.institutionName}`,
      );
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to create sandbox account");
    } finally {
      setSyncing(false);
    }
  };

  // Sync all accounts
  const handleSyncAll = async () => {
    try {
      setError(null);
      setSuccessMessage(null);
      setSyncing(true);

      const result = await plaidApi.syncAll();
      const totalAdded = result.results.reduce(
        (sum, r) => sum + (r.transactionsAdded || 0),
        0,
      );
      setSuccessMessage(
        `Synced ${result.syncedCount} account(s). ${totalAdded} new transaction(s) found.`,
      );
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to sync accounts");
    } finally {
      setSyncing(false);
    }
  };

  // Unlink account
  const handleUnlinkAccount = async (accountId: string) => {
    if (!confirm("Are you sure you want to unlink this account?")) return;

    try {
      setError(null);
      await plaidApi.unlinkAccount(accountId);
      setSuccessMessage("Account unlinked successfully");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to unlink account");
    }
  };

  // Toggle transaction selection
  const toggleTransaction = (pendingId: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(pendingId)) {
      newSelected.delete(pendingId);
    } else {
      newSelected.add(pendingId);
    }
    setSelectedTransactions(newSelected);
  };

  // Select all transactions
  const selectAllTransactions = () => {
    if (selectedTransactions.size === pendingTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(
        new Set(pendingTransactions.map((t) => t.pendingId)),
      );
    }
  };

  // Approve selected transactions
  const handleApproveSelected = async () => {
    if (selectedTransactions.size === 0) return;

    try {
      setError(null);
      const result = await plaidApi.approveTransactions(
        Array.from(selectedTransactions),
      );
      setSuccessMessage(`Approved ${result.approved.length} transaction(s)`);
      setSelectedTransactions(new Set());
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to approve transactions");
    }
  };

  // Reject selected transactions
  const handleRejectSelected = async () => {
    if (selectedTransactions.size === 0) return;

    try {
      setError(null);
      const result = await plaidApi.rejectTransactions(
        Array.from(selectedTransactions),
      );
      setSuccessMessage(`Rejected ${result.rejected.length} transaction(s)`);
      setSelectedTransactions(new Set());
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to reject transactions");
    }
  };

  if (loading) {
    return (
      <div className="bank-accounts-loading">
        <div className="spinner"></div>
        <p>Loading accounts...</p>
      </div>
    );
  }

  return (
    <div className="bank-accounts">
      <div className="bank-accounts-header">
        <h2>🏦 Connected Bank Accounts</h2>
        <p className="subtitle">
          Link your bank accounts to automatically import transactions
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="message error">
          <span>❌</span> {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      {successMessage && (
        <div className="message success">
          <span>✅</span> {successMessage}
          <button onClick={() => setSuccessMessage(null)}>×</button>
        </div>
      )}

      {/* Actions */}
      <div className="bank-actions">
        <button
          className="btn btn-primary"
          onClick={handleCreateSandboxAccount}
          disabled={syncing}
        >
          {syncing ? "⏳ Creating..." : "🧪 Create Test Account (Sandbox)"}
        </button>

        {accounts.length > 0 && (
          <button
            className="btn btn-secondary"
            onClick={handleSyncAll}
            disabled={syncing}
          >
            {syncing ? "⏳ Syncing..." : "🔄 Sync All Accounts"}
          </button>
        )}
      </div>

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <div className="no-accounts">
          <div className="empty-icon">🏦</div>
          <h3>No accounts connected</h3>
          <p>
            Click "Create Test Account" to add a sandbox bank account for
            testing.
          </p>
        </div>
      ) : (
        <div className="accounts-list">
          <h3>Your Accounts ({accounts.length})</h3>
          {accounts.map((account) => (
            <div key={account.accountId} className="account-card">
              <div className="account-icon">
                {accountTypeIcons[account.accountType] || "💰"}
              </div>
              <div className="account-info">
                <div className="account-name">
                  <strong>{account.accountName}</strong>
                  <span className="account-mask">
                    ••••{account.accountMask}
                  </span>
                </div>
                <div className="account-institution">
                  {account.institutionName}
                </div>
                <div className="account-type">
                  {account.accountType} • {account.accountSubtype}
                </div>
              </div>
              <div className="account-balance">
                <div className="balance-amount">
                  {formatCurrency(
                    account.currentBalance,
                    account.isoCurrencyCode,
                  )}
                </div>
                <div className="balance-label">Current Balance</div>
                <div className="last-sync">
                  Last sync: {formatDate(account.lastSyncAt)}
                </div>
              </div>
              <div className="account-actions">
                <button
                  className="btn btn-small btn-danger"
                  onClick={() => handleUnlinkAccount(account.accountId)}
                >
                  Unlink
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending Transactions */}
      {pendingTransactions.length > 0 && (
        <div className="pending-transactions">
          <div className="pending-header">
            <h3>📥 Pending Transactions ({pendingTransactions.length})</h3>
            <p>Review and approve transactions to add them to your budget</p>
          </div>

          <div className="pending-actions">
            <label className="select-all">
              <input
                type="checkbox"
                checked={
                  selectedTransactions.size === pendingTransactions.length
                }
                onChange={selectAllTransactions}
              />
              Select All
            </label>
            <button
              className="btn btn-success btn-small"
              onClick={handleApproveSelected}
              disabled={selectedTransactions.size === 0}
            >
              ✓ Approve ({selectedTransactions.size})
            </button>
            <button
              className="btn btn-danger btn-small"
              onClick={handleRejectSelected}
              disabled={selectedTransactions.size === 0}
            >
              ✗ Reject ({selectedTransactions.size})
            </button>
          </div>

          <div className="transactions-list">
            {pendingTransactions.map((txn) => (
              <div
                key={txn.pendingId}
                className={`transaction-row ${selectedTransactions.has(txn.pendingId) ? "selected" : ""}`}
                onClick={() => toggleTransaction(txn.pendingId)}
              >
                <input
                  type="checkbox"
                  checked={selectedTransactions.has(txn.pendingId)}
                  onChange={() => toggleTransaction(txn.pendingId)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="txn-date">{txn.date}</div>
                <div className="txn-merchant">
                  <div className="merchant-name">{txn.merchant}</div>
                  <div className="merchant-desc">{txn.description}</div>
                </div>
                <div className="txn-category">
                  <span className="category-badge">
                    {txn.suggestedCategory}
                  </span>
                </div>
                <div
                  className={`txn-amount ${txn.amount < 0 ? "expense" : "income"}`}
                >
                  {formatCurrency(Math.abs(txn.amount))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .bank-accounts {
          padding: 20px;
          max-width: 900px;
          margin: 0 auto;
        }
        .bank-accounts-header {
          margin-bottom: 24px;
        }
        .bank-accounts-header h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
        }
        .subtitle {
          color: #666;
          margin: 0;
        }
        .bank-accounts-loading {
          text-align: center;
          padding: 60px 20px;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #4CAF50;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .message {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .message.error {
          background: #ffebee;
          color: #c62828;
        }
        .message.success {
          background: #e8f5e9;
          color: #2e7d32;
        }
        .message button {
          margin-left: auto;
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          opacity: 0.6;
        }
        .bank-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }
        .btn {
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-primary {
          background: #4CAF50;
          color: white;
        }
        .btn-primary:hover:not(:disabled) {
          background: #43a047;
        }
        .btn-secondary {
          background: #2196F3;
          color: white;
        }
        .btn-secondary:hover:not(:disabled) {
          background: #1e88e5;
        }
        .btn-success {
          background: #4CAF50;
          color: white;
        }
        .btn-danger {
          background: #f44336;
          color: white;
        }
        .btn-small {
          padding: 8px 16px;
          font-size: 13px;
        }
        .no-accounts {
          text-align: center;
          padding: 60px 20px;
          background: #f5f5f5;
          border-radius: 12px;
        }
        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .no-accounts h3 {
          margin: 0 0 8px 0;
        }
        .no-accounts p {
          color: #666;
          margin: 0;
        }
        .accounts-list h3 {
          margin: 0 0 16px 0;
        }
        .account-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          margin-bottom: 12px;
        }
        .account-icon {
          font-size: 32px;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f5f5;
          border-radius: 8px;
        }
        .account-info {
          flex: 1;
        }
        .account-name {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .account-mask {
          color: #999;
          font-size: 13px;
        }
        .account-institution {
          color: #666;
          font-size: 14px;
        }
        .account-type {
          color: #999;
          font-size: 12px;
          text-transform: capitalize;
        }
        .account-balance {
          text-align: right;
        }
        .balance-amount {
          font-size: 18px;
          font-weight: 600;
        }
        .balance-label {
          color: #999;
          font-size: 12px;
        }
        .last-sync {
          color: #999;
          font-size: 11px;
          margin-top: 4px;
        }
        .pending-transactions {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e0e0e0;
        }
        .pending-header {
          margin-bottom: 16px;
        }
        .pending-header h3 {
          margin: 0 0 4px 0;
        }
        .pending-header p {
          color: #666;
          margin: 0;
          font-size: 14px;
        }
        .pending-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .select-all {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        .transactions-list {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          overflow: hidden;
        }
        .transaction-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 16px;
          border-bottom: 1px solid #f0f0f0;
          cursor: pointer;
          transition: background 0.2s;
        }
        .transaction-row:last-child {
          border-bottom: none;
        }
        .transaction-row:hover {
          background: #f9f9f9;
        }
        .transaction-row.selected {
          background: #e3f2fd;
        }
        .txn-date {
          width: 80px;
          color: #666;
          font-size: 13px;
        }
        .txn-merchant {
          flex: 1;
        }
        .merchant-name {
          font-weight: 500;
        }
        .merchant-desc {
          color: #999;
          font-size: 12px;
        }
        .txn-category {
          width: 120px;
        }
        .category-badge {
          display: inline-block;
          padding: 4px 8px;
          background: #e0e0e0;
          border-radius: 4px;
          font-size: 12px;
        }
        .txn-amount {
          width: 100px;
          text-align: right;
          font-weight: 600;
        }
        .txn-amount.expense {
          color: #f44336;
        }
        .txn-amount.income {
          color: #4CAF50;
        }
      `}</style>
    </div>
  );
};

export default BankAccounts;
