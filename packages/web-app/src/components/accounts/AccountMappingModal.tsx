/**
 * AccountMappingModal Component
 *
 * Displays after Plaid connection success to allow users to:
 * - Review discovered accounts
 * - Enable/disable tracking for each account
 * - Set custom nicknames
 * - Override account types if needed
 *
 * **Validates: Requirements 5.1, 5.2**
 */

import React, { useState } from "react";
import {
  AccountType,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_ICONS,
} from "@budget-buddy/shared/src/types/account";

// Discovered account from Plaid
export interface DiscoveredAccount {
  plaidAccountId: string;
  name: string;
  officialName?: string;
  mask?: string;
  type: string; // Plaid account type
  subtype?: string;
  currentBalance: number;
  availableBalance?: number;
  currency: string;
  institutionName: string;
}

// Account mapping configuration
export interface AccountMapping {
  plaidAccountId: string;
  nickname: string;
  accountType: AccountType;
  isTracked: boolean;
  includeInBudget: boolean;
}

export interface AccountMappingModalProps {
  isOpen: boolean;
  accounts: DiscoveredAccount[];
  institutionName: string;
  onSave: (mappings: AccountMapping[]) => Promise<void>;
  onClose: () => void;
}

// Map Plaid account types to our account types
const mapPlaidType = (
  plaidType: string,
  plaidSubtype?: string,
): AccountType => {
  const type = plaidType.toLowerCase();
  const subtype = plaidSubtype?.toLowerCase();

  if (type === "depository") {
    return AccountType.BANKING;
  }
  if (type === "credit") {
    return AccountType.CREDIT_CARD;
  }
  if (type === "investment" || type === "brokerage") {
    return AccountType.INVESTMENT;
  }
  if (type === "loan" || type === "mortgage") {
    return AccountType.LOAN;
  }
  if (subtype === "cash management" || subtype === "money market") {
    return AccountType.CASH;
  }

  return AccountType.BANKING; // Default
};

export const AccountMappingModal: React.FC<AccountMappingModalProps> = ({
  isOpen,
  accounts,
  institutionName,
  onSave,
  onClose,
}) => {
  // Initialize mappings with defaults
  const [mappings, setMappings] = useState<AccountMapping[]>(() =>
    accounts.map((account) => ({
      plaidAccountId: account.plaidAccountId,
      nickname: account.name,
      accountType: mapPlaidType(account.type, account.subtype),
      isTracked: true, // Default to tracked
      includeInBudget: true,
    })),
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateMapping = (
    plaidAccountId: string,
    updates: Partial<AccountMapping>,
  ) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.plaidAccountId === plaidAccountId ? { ...m, ...updates } : m,
      ),
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(mappings);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save accounts");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const trackedCount = mappings.filter((m) => m.isTracked).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-[var(--color-surface)] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
                Configure Connected Accounts
              </h2>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {institutionName} • {accounts.length} account
                {accounts.length !== 1 ? "s" : ""} found
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[var(--color-muted-foreground)] hover:text-[var(--color-muted-foreground)] p-1 rounded"
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
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
              Review your accounts below. You can customize nicknames, change
              account types, and choose which accounts to track in your budget.
            </p>

            <div className="space-y-4">
              {accounts.map((account, index) => {
                const mapping = mappings[index];

                return (
                  <div
                    key={account.plaidAccountId}
                    className={`border rounded-lg p-4 ${
                      mapping.isTracked
                        ? "border-green-200 bg-green-50"
                        : "border-[var(--color-border)] bg-[var(--color-background)]"
                    }`}
                  >
                    {/* Account Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[var(--color-surface)] rounded-lg flex items-center justify-center border border-[var(--color-border)]">
                          <span className="text-xl">
                            {ACCOUNT_TYPE_ICONS[mapping.accountType]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-[var(--color-foreground)]">
                            {account.officialName || account.name}
                          </p>
                          <p className="text-sm text-[var(--color-muted-foreground)]">
                            {account.mask && `••••${account.mask}`}
                            {account.mask && " • "}
                            {account.type}
                            {account.subtype && ` (${account.subtype})`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[var(--color-foreground)]">
                          $
                          {account.currentBalance.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          {account.currency}
                        </p>
                      </div>
                    </div>

                    {/* Configuration Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Nickname */}
                      <div>
                        <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1">
                          Nickname
                        </label>
                        <input
                          type="text"
                          value={mapping.nickname}
                          onChange={(e) =>
                            updateMapping(account.plaidAccountId, {
                              nickname: e.target.value,
                            })
                          }
                          className="w-full px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="Account nickname"
                        />
                      </div>

                      {/* Account Type */}
                      <div>
                        <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1">
                          Account Type
                        </label>
                        <select
                          value={mapping.accountType}
                          onChange={(e) =>
                            updateMapping(account.plaidAccountId, {
                              accountType: e.target.value as AccountType,
                            })
                          }
                          className="w-full px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          {Object.values(AccountType).map((type) => (
                            <option key={type} value={type}>
                              {ACCOUNT_TYPE_ICONS[type]}{" "}
                              {ACCOUNT_TYPE_LABELS[type]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Tracking Toggle */}
                    <div className="mt-3 flex items-center justify-between">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mapping.isTracked}
                          onChange={(e) =>
                            updateMapping(account.plaidAccountId, {
                              isTracked: e.target.checked,
                              includeInBudget: e.target.checked,
                            })
                          }
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-[var(--color-border)] rounded"
                        />
                        <span className="text-sm text-[var(--color-foreground)]">
                          Track this account
                        </span>
                      </label>

                      {mapping.isTracked && (
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={mapping.includeInBudget}
                            onChange={(e) =>
                              updateMapping(account.plaidAccountId, {
                                includeInBudget: e.target.checked,
                              })
                            }
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-[var(--color-border)] rounded"
                          />
                          <span className="text-sm text-[var(--color-foreground)]">
                            Include in budget
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-background)]">
            {error && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {trackedCount} of {accounts.length} accounts will be tracked
              </p>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-[var(--color-foreground)] hover:bg-[var(--color-muted)] rounded-lg transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Saving..." : "Save Accounts"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountMappingModal;
