/**
 * TwoFactorVerify Component
 *
 * Displays during login when MFA is required.
 * Features:
 * - 6-digit code input with auto-submit
 * - Backup code option
 * - Error handling
 */

import React, { useState, useRef, useEffect } from "react";

interface TwoFactorVerifyProps {
  onVerify: (code: string, isBackupCode: boolean) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

export const TwoFactorVerify: React.FC<TwoFactorVerifyProps> = ({
  onVerify,
  onCancel,
  loading = false,
  error = null,
}) => {
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [useBackupCode]);

  // Auto-submit when 6 digits entered (for TOTP codes)
  useEffect(() => {
    if (!useBackupCode && code.length === 6 && !loading) {
      onVerify(code, false);
    }
  }, [code, useBackupCode, loading, onVerify]);

  const handleCodeChange = (value: string) => {
    if (useBackupCode) {
      // Backup codes can have different formats
      setCode(value.toUpperCase().replace(/[^A-Z0-9-]/g, ""));
    } else {
      // TOTP codes are numeric only
      setCode(value.replace(/\D/g, "").slice(0, 6));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code && !loading) {
      onVerify(code, useBackupCode);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Two-Factor Authentication
          </h2>
          <p className="text-gray-600">
            {useBackupCode
              ? "Enter one of your backup codes"
              : "Enter the 6-digit code from your authenticator app"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {useBackupCode ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backup Code
              </label>
              <input
                ref={inputRef}
                type="text"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="XXXX-XXXX-XXXX"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-mono text-lg tracking-wider"
                disabled={loading}
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="000000"
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-3xl tracking-widest font-mono"
                disabled={loading}
                autoComplete="one-time-code"
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Code refreshes every 30 seconds
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Verifying...</span>
              </>
            ) : (
              "Verify"
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setCode("");
            }}
            className="w-full text-sm text-blue-600 hover:text-blue-700"
            disabled={loading}
          >
            {useBackupCode
              ? "Use authenticator app instead"
              : "Use a backup code instead"}
          </button>
        </div>

        <div className="mt-4">
          <button
            onClick={onCancel}
            className="w-full text-sm text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            Cancel and sign in with a different account
          </button>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorVerify;
