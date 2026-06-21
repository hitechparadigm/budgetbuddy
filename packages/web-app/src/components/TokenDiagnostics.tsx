/**
 * Token Diagnostics Component
 * Helps users diagnose and fix authentication token issues
 */

import React, { useState } from "react";
import { checkTokenHealth, clearAllTokens } from "../utils/tokenUtils";

interface TokenDiagnosticsProps {
  onClose?: () => void;
}

export const TokenDiagnostics: React.FC<TokenDiagnosticsProps> = ({
  onClose,
}) => {
  const [diagnostics, setDiagnostics] = useState(checkTokenHealth());
  const [showDetails, setShowDetails] = useState(false);

  const handleRunDiagnostics = () => {
    setDiagnostics(checkTokenHealth());
  };

  const handleClearTokens = () => {
    clearAllTokens();
    setDiagnostics(checkTokenHealth());
    alert("All tokens have been cleared. Please log in again.");
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
            Authentication Diagnostics
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-[var(--color-muted-foreground)] hover:text-[var(--color-muted-foreground)]"
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
          )}
        </div>

        {/* Status */}
        <div className="mb-4">
          <div
            className={`p-3 rounded-lg ${
              diagnostics.tokensValid
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full mr-2 ${
                  diagnostics.tokensValid ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span
                className={`font-medium ${
                  diagnostics.tokensValid ? "text-green-800" : "text-red-800"
                }`}
              >
                {diagnostics.tokensValid
                  ? "Tokens are valid"
                  : "Token issues detected"}
              </span>
            </div>
          </div>
        </div>

        {/* Recommended Action */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-[var(--color-foreground)] mb-2">
            Recommended Action:
          </h3>
          <p className="text-sm text-[var(--color-muted-foreground)] bg-[var(--color-background)] p-3 rounded">
            {diagnostics.recommendedAction}
          </p>
        </div>

        {/* Issues Details */}
        {diagnostics.issues.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {showDetails ? "Hide" : "Show"} Technical Details
            </button>

            {showDetails && (
              <div className="mt-2 text-xs text-[var(--color-muted-foreground)] bg-[var(--color-background)] p-3 rounded">
                <ul className="list-disc list-inside space-y-1">
                  {diagnostics.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col space-y-2">
          <button
            onClick={handleRunDiagnostics}
            className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
          >
            Run Diagnostics Again
          </button>

          {!diagnostics.tokensValid && (
            <button
              onClick={handleClearTokens}
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50 transition-colors"
            >
              Clear All Tokens
            </button>
          )}

          <button
            onClick={handleRefresh}
            className="px-4 py-2 text-sm font-medium text-[var(--color-muted-foreground)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-background)] transition-colors"
          >
            Refresh Page
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-4 text-xs text-[var(--color-muted-foreground)]">
          <p>
            If you're experiencing "User profile not found" errors, this tool
            can help identify and fix authentication token issues. After
            clearing tokens, you'll need to log in again.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TokenDiagnostics;
