/**
 * Delete Account Modal
 *
 * A multi-step modal for account deletion with data export option.
 * Requires user to type "DELETE" to confirm.
 */

import React, { useState } from "react";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

type Step = "warning" | "export" | "confirm";

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onDeleted,
}) => {
  const [step, setStep] = useState<Step>("warning");
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportComplete, setExportComplete] = useState(false);

  if (!isOpen) return null;

  const handleExportData = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("budgetbuddy_access_token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const apiUrl =
        import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1';
      const response = await fetch(`${apiUrl}/export?type=json`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export data");
      }

      // Download the backup file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `budgetbuddy-final-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportComplete(true);
    } catch (err) {
      console.error("Export error:", err);
      setError("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETE") {
      setError("Please type DELETE to confirm");
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("budgetbuddy_access_token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const apiUrl =
        import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1';
      const response = await fetch(`${apiUrl}/auth/account`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete account");
      }

      // Clear all local storage
      localStorage.clear();

      // Notify parent and redirect
      onDeleted();
    } catch (err) {
      console.error("Delete account error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete account. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setStep("warning");
    setConfirmText("");
    setError(null);
    setExportComplete(false);
    onClose();
  };

  const renderWarningStep = () => (
    <>
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            Delete Your Account
          </h3>
          <p className="text-sm text-gray-500">This action cannot be undone</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <p className="text-gray-600">
          Deleting your account will permanently remove:
        </p>
        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-2">
          <li>All your budgets and budget history</li>
          <li>All your transactions</li>
          <li>All your savings goals and progress</li>
          <li>All your connected bank accounts</li>
          <li>Your profile and preferences</li>
          <li>Your family sharing settings</li>
        </ul>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Important:</strong> If you're the primary account holder of
            a family, all family members will lose access to the shared budget.
          </p>
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={handleClose}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => setStep("export")}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Continue
        </button>
      </div>
    </>
  );

  const renderExportStep = () => (
    <>
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            Export Your Data
          </h3>
          <p className="text-sm text-gray-500">
            Download a copy before deleting
          </p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <p className="text-gray-600">
          Before deleting your account, we recommend downloading a backup of all
          your data. This will include your budgets, transactions, goals, and
          settings.
        </p>

        {exportComplete ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
            <svg
              className="w-5 h-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-green-800">Data exported successfully!</span>
          </div>
        ) : (
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="w-full px-4 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isExporting ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Exporting...</span>
              </>
            ) : (
              <>
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
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                  />
                </svg>
                <span>Download My Data</span>
              </>
            )}
          </button>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => setStep("warning")}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={() => {
            setError(null);
            setStep("confirm");
          }}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          {exportComplete ? "Continue to Delete" : "Skip & Continue"}
        </button>
      </div>
    </>
  );

  const renderConfirmStep = () => (
    <>
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-red-600"
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
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            Final Confirmation
          </h3>
          <p className="text-sm text-gray-500">Type DELETE to confirm</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-medium">
            ⚠️ This action is permanent and cannot be undone. All your data will
            be permanently deleted.
          </p>
        </div>

        <div>
          <label
            htmlFor="confirm-delete"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Type{" "}
            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
              DELETE
            </span>{" "}
            to confirm:
          </label>
          <input
            id="confirm-delete"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder="Type DELETE here"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            autoComplete="off"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => {
            setError(null);
            setStep("export");
          }}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          disabled={isDeleting}
        >
          Back
        </button>
        <button
          onClick={handleDeleteAccount}
          disabled={confirmText !== "DELETE" || isDeleting}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isDeleting ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Deleting...</span>
            </>
          ) : (
            <span>Delete My Account</span>
          )}
        </button>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        {step === "warning" && renderWarningStep()}
        {step === "export" && renderExportStep()}
        {step === "confirm" && renderConfirmStep()}
      </div>
    </div>
  );
};

export default DeleteAccountModal;
