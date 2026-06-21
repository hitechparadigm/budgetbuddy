/**
 * Bank Sync Page
 *
 * Main page for managing bank account connections via Plaid.
 * Allows users to connect accounts, view balances, sync transactions,
 * and approve pending imports.
 */

import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PlaidLinkButton } from "../components/PlaidLinkButton";
import { ConnectedAccounts } from "../components/ConnectedAccounts";
import { PendingTransactions } from "../components/PendingTransactions";
import { createSandboxItem } from "../services/plaidApi";

export const BankSyncPage: React.FC = () => {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingSandbox, setCreatingSandbox] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleLinkSuccess = (accounts: unknown[]) => {
    const count = Array.isArray(accounts) ? accounts.length : 0;
    setSuccessMessage(
      `Successfully connected ${count} account${count !== 1 ? "s" : ""}!`,
    );
    setError(null);
    handleRefresh();
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleLinkError = (err: Error) => {
    setError(err.message);
    setSuccessMessage(null);
  };

  const handleCreateSandbox = async () => {
    try {
      setCreatingSandbox(true);
      setError(null);
      const result = await createSandboxItem();
      const count = result.accounts?.length || 0;
      setSuccessMessage(
        `Created sandbox account with ${count} test account${count !== 1 ? "s" : ""}!`,
      );
      handleRefresh();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error("Failed to create sandbox item:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create sandbox account",
      );
    } finally {
      setCreatingSandbox(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="bg-[var(--color-surface)] shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/budget")}
                className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-[var(--color-foreground)]">🏦 Bank Sync</h1>
            </div>
            <div className="flex gap-2">
              <PlaidLinkButton
                onSuccess={handleLinkSuccess}
                onError={handleLinkError}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex justify-between items-center">
            <span>✅ {successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-500 hover:text-green-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex justify-between items-center">
            <span>❌ {error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-medium text-blue-900">
                Automatic Transaction Import
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Connect your bank accounts to automatically import transactions.
                Imported transactions will appear in the "Pending" section for
                your review before being added to your budget.
              </p>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connected Accounts */}
          <div>
            <ConnectedAccounts
              key={`accounts-${refreshKey}`}
              onAccountsChange={handleRefresh}
            />

            {/* Sandbox Testing Section (Development Only) */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-xl">🧪</span>
                <div className="flex-1">
                  <h4 className="font-medium text-yellow-900">
                    Sandbox Testing
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Create a test account with sample transactions for
                    development and testing purposes.
                  </p>
                  <button
                    onClick={handleCreateSandbox}
                    disabled={creatingSandbox}
                    className="mt-3 px-4 py-2 text-sm bg-yellow-600 text-white rounded-lg
                      hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                  >
                    {creatingSandbox ? "Creating..." : "Create Sandbox Account"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Transactions */}
          <div>
            <PendingTransactions
              key={`pending-${refreshKey}`}
              onTransactionsProcessed={handleRefresh}
            />
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 p-6 bg-[var(--color-surface)] rounded-lg shadow">
          <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">
            How Bank Sync Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-2">1️⃣</div>
              <h4 className="font-medium text-[var(--color-foreground)]">Connect</h4>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                Securely link your bank accounts using Plaid's encrypted
                connection
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">2️⃣</div>
              <h4 className="font-medium text-[var(--color-foreground)]">Review</h4>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                Imported transactions appear as pending for you to categorize
                and approve
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">3️⃣</div>
              <h4 className="font-medium text-[var(--color-foreground)]">Track</h4>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                Approved transactions are added to your budget automatically
              </p>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-[var(--color-muted)] rounded-lg">
          <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
            <span>🔒</span>
            <span>
              Your bank credentials are never stored by BudgetBuddy. All
              connections are secured by Plaid, a trusted financial data
              platform used by thousands of apps.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BankSyncPage;
