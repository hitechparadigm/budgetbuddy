/**
 * AccountsPage - Enhanced Account Management
 *
 * Features:
 * - Manual account management (CRUD)
 * - Connected bank accounts via Plaid
 * - Accounts grouped by type
 * - Net worth summary
 * - Balance reconciliation
 *
 * **Validates: Requirements 8.1, 8.3, 8.4, 8.6**
 */

import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";
import { AccountCard } from "../components/accounts/AccountCard";
import { AddAccountModal } from "../components/accounts/AddAccountModal";
import { ReconcileModal } from "../components/accounts/ReconcileModal";
import { BankAccounts } from "../components/BankAccounts";
import {
  useAccounts,
  useAccountsSummary,
  useAccountMutations,
  Account,
  CreateAccountInput,
} from "../hooks/useAccounts";
import { PageHeader } from "../components/ui";

// Account type labels and icons (local definitions to avoid type conflicts)
const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  banking: "Banking",
  cash: "Cash",
  credit_card: "Credit Cards",
  investment: "Investments",
  loan: "Loans",
};

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  banking: "🏦",
  cash: "💵",
  credit_card: "💳",
  investment: "📈",
  loan: "📋",
};

const ACCOUNT_TYPE_ORDER = [
  "banking",
  "cash",
  "credit_card",
  "investment",
  "loan",
];

export const AccountsPage: React.FC = () => {
  const navigate = useNavigate();
  const { accounts, isLoading, error, refetch } = useAccounts();
  const { summary, isLoading: summaryLoading } = useAccountsSummary();
  const { createAccount, deleteAccount, reconcileAccount, setAccountTracking } =
    useAccountMutations();

  // Tab state
  const [activeTab, setActiveTab] = useState<"manual" | "connected">("manual");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  // Group accounts by type
  const accountsByType = useMemo(() => {
    const grouped: Record<string, Account[]> = {};

    ACCOUNT_TYPE_ORDER.forEach((type) => {
      grouped[type] = [];
    });

    accounts.forEach((account) => {
      const type = account.accountType;
      if (grouped[type]) {
        grouped[type].push(account);
      }
    });

    return grouped;
  }, [accounts]);

  // Handlers
  const handleAddAccount = async (input: CreateAccountInput) => {
    await createAccount(input);
    refetch();
  };

  const handleEditAccount = (account: Account) => {
    // TODO: Implement edit modal
    console.log("Edit account:", account);
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this account? Transactions will be preserved.",
      )
    ) {
      await deleteAccount(accountId);
      refetch();
    }
  };

  const handleReconcile = (accountId: string) => {
    const account = accounts.find((a) => a.accountId === accountId);
    if (account) {
      setSelectedAccount(account);
      setShowReconcileModal(true);
    }
  };

  const handleReconcileSubmit = async (
    accountId: string,
    newBalance: number,
    notes?: string,
  ) => {
    await reconcileAccount(accountId, { newBalance, notes });
    refetch();
  };

  const handleToggleTracking = async (
    accountId: string,
    isTracked: boolean,
  ) => {
    await setAccountTracking(accountId, isTracked);
    refetch();
  };

  const handleViewTransactions = (accountId: string) => {
    // Navigate to budget page with account filter
    navigate(`/budget?accountId=${accountId}`);
  };

  // Render account group section
  const renderAccountGroup = (type: string, groupAccounts: Account[]) => {
    if (groupAccounts.length === 0) return null;

    return (
      <div key={type} className="mb-6">
        <h3 className="flex items-center space-x-2 text-lg font-semibold text-gray-900 mb-3">
          <span>{ACCOUNT_TYPE_ICONS[type]}</span>
          <span>{ACCOUNT_TYPE_LABELS[type]}</span>
          <span className="text-sm font-normal text-gray-500">
            ({groupAccounts.length})
          </span>
        </h3>
        <div className="space-y-3">
          {groupAccounts.map((account) => (
            <AccountCard
              key={account.accountId}
              account={account as any}
              onEdit={handleEditAccount as any}
              onDelete={handleDeleteAccount}
              onReconcile={handleReconcile}
              onToggleTracking={handleToggleTracking}
              onViewTransactions={handleViewTransactions}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            to="/budget"
            aria-label="Back to Budget"
            className="text-gray-600 hover:text-gray-900 flex items-center mb-2 w-fit"
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </Link>
          <PageHeader
            title="Accounts"
            action={
              activeTab === "manual" ? (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <span>+</span>
                  <span>Add Manual Account</span>
                </button>
              ) : undefined
            }
          />

          {/* Tab switcher */}
          <div className="flex space-x-1 mt-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("manual")}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === "manual"
                  ? "border-green-600 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Manual Accounts
            </button>
            <button
              onClick={() => setActiveTab("connected")}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center space-x-1 ${
                activeTab === "connected"
                  ? "border-green-600 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span>🏦</span>
              <span>Connected Banks</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Connected Banks Tab */}
        {activeTab === "connected" && <BankAccounts />}

        {/* Manual Accounts Tab */}
        {activeTab === "manual" && (
          <div>
        {/* Summary Cards */}
        {!summaryLoading && summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Total Assets</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalAssets, "USD")}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Total Liabilities</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalLiabilities, "USD")}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Net Worth</p>
              <p
                className={`text-2xl font-bold ${summary.netWorth >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {/* Prefix + / − so sign is not conveyed by color alone (8.6) */}
                {summary.netWorth >= 0 ? "+" : "−"}
                {formatCurrency(Math.abs(summary.netWorth), "USD")}
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className="ml-3 text-gray-600">Loading accounts...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
            <button
              onClick={refetch}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && accounts.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-4">🏦</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No accounts yet
            </h3>
            <p className="text-gray-600 mb-4">
              Add your first account to start tracking your finances.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Add Manual Account
            </button>
          </div>
        )}

        {/* Account Groups */}
        {!isLoading && !error && accounts.length > 0 && (
          <div>
            {ACCOUNT_TYPE_ORDER.map((type) =>
              renderAccountGroup(type, accountsByType[type]),
            )}
          </div>
        )}
          </div>
        )}
      </main>

      {/* Modals */}
      <AddAccountModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddAccount as any}
      />

      <ReconcileModal
        isOpen={showReconcileModal}
        account={selectedAccount as any}
        onClose={() => {
          setShowReconcileModal(false);
          setSelectedAccount(null);
        }}
        onReconcile={handleReconcileSubmit}
      />
    </div>
  );
};

export default AccountsPage;
