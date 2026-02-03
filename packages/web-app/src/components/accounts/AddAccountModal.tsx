/**
 * AddAccountModal Component
 *
 * Modal for creating a new manual account.
 * Features:
 * - Account type selection step
 * - Form with nickname, institution, balance, currency
 * - Validation using Zod schemas
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 */

import React, { useState } from "react";
import {
  AccountType,
  AccountSubtype,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_ICONS,
  ACCOUNT_SUBTYPES,
  ACCOUNT_SUBTYPE_LABELS,
  ACCOUNT_SUBTYPE_ICONS,
  CreateAccountInput,
} from "@budget-buddy/shared/src/types/account";

export interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: CreateAccountInput) => Promise<void>;
  defaultCurrency?: string;
}

type Step = "type" | "details";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultCurrency = "USD",
}) => {
  const [step, setStep] = useState<Step>("type");
  const [selectedType, setSelectedType] = useState<AccountType | null>(null);
  const [selectedSubtype, setSelectedSubtype] = useState<AccountSubtype | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nickname: "",
    institutionName: "",
    currentBalance: "",
    currency: defaultCurrency,
  });

  const resetForm = () => {
    setStep("type");
    setSelectedType(null);
    setSelectedSubtype(null);
    setFormData({
      nickname: "",
      institutionName: "",
      currentBalance: "",
      currency: defaultCurrency,
    });
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTypeSelect = (type: AccountType) => {
    setSelectedType(type);
    // Auto-select first subtype
    const subtypes = ACCOUNT_SUBTYPES[type];
    if (subtypes && subtypes.length > 0) {
      setSelectedSubtype(subtypes[0] as AccountSubtype);
    }
    setStep("details");
  };

  const handleSubtypeSelect = (subtype: string) => {
    setSelectedSubtype(subtype as AccountSubtype);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedType || !selectedSubtype) {
      setError("Please select an account type");
      return;
    }

    if (!formData.nickname.trim()) {
      setError("Account nickname is required");
      return;
    }

    const balance = parseFloat(formData.currentBalance) || 0;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        accountType: selectedType,
        accountSubtype: selectedSubtype,
        nickname: formData.nickname.trim(),
        institutionName: formData.institutionName.trim() || null,
        currentBalance: balance,
        currency: formData.currency,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
              {step === "type" ? "Add Manual Account" : "Account Details"}
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
          <div className="p-4">
            {step === "type" ? (
              /* Step 1: Account Type Selection */
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">
                  Select the type of account you want to add:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(AccountType).map((type) => (
                    <button
                      key={type}
                      onClick={() => handleTypeSelect(type)}
                      className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                    >
                      <span className="text-2xl mb-2">
                        {ACCOUNT_TYPE_ICONS[type]}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {ACCOUNT_TYPE_LABELS[type]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Step 2: Account Details Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => setStep("type")}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back to account types
                </button>

                {/* Selected Type Display */}
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-2xl">
                    {selectedType && ACCOUNT_TYPE_ICONS[selectedType]}
                  </span>
                  <span className="font-medium">
                    {selectedType && ACCOUNT_TYPE_LABELS[selectedType]}
                  </span>
                </div>

                {/* Subtype Selection */}
                {selectedType && ACCOUNT_SUBTYPES[selectedType].length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Subtype
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ACCOUNT_SUBTYPES[selectedType].map((subtype) => (
                        <button
                          key={subtype}
                          type="button"
                          onClick={() => handleSubtypeSelect(subtype)}
                          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                            selectedSubtype === subtype
                              ? "border-green-500 bg-green-50 text-green-700"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <span className="mr-1">
                            {ACCOUNT_SUBTYPE_ICONS[subtype]}
                          </span>
                          {ACCOUNT_SUBTYPE_LABELS[subtype]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nickname */}
                <div>
                  <label
                    htmlFor="nickname"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Account Nickname *
                  </label>
                  <input
                    type="text"
                    id="nickname"
                    name="nickname"
                    value={formData.nickname}
                    onChange={handleInputChange}
                    placeholder="e.g., Main Checking, Emergency Fund"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>

                {/* Institution Name */}
                <div>
                  <label
                    htmlFor="institutionName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Institution Name (optional)
                  </label>
                  <input
                    type="text"
                    id="institutionName"
                    name="institutionName"
                    value={formData.institutionName}
                    onChange={handleInputChange}
                    placeholder="e.g., Chase Bank, Fidelity"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Balance and Currency */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="currentBalance"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Current Balance
                    </label>
                    <input
                      type="number"
                      id="currentBalance"
                      name="currentBalance"
                      value={formData.currentBalance}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="currency"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Currency
                    </label>
                    <select
                      id="currency"
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      {CURRENCIES.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
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
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Adding..." : "Add Account"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddAccountModal;
