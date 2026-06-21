/**
 * TwoFactorSetup Component
 *
 * Step-by-step wizard for setting up two-factor authentication:
 * 1. Introduction - Explain 2FA benefits
 * 2. QR Code - Display QR code for authenticator app
 * 3. Verify - Enter code to verify setup
 * 4. Backup Codes - Display and save backup codes
 */

import React, { useState, useEffect } from "react";

interface TwoFactorSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type SetupStep = "intro" | "qr" | "verify" | "backup";

interface MFASetupData {
  secretCode: string;
  qrCodeUrl: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1';

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState<SetupStep>("intro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaData, setMfaData] = useState<MFASetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedBackup, setCopiedBackup] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep("intro");
      setError(null);
      setMfaData(null);
      setVerificationCode("");
      setBackupCodes([]);
      setCopiedBackup(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartSetup = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("budgetbuddy_id_token");
      if (!token) {
        setError("Please log in to continue");
        return;
      }

      // Call API to initiate MFA setup
      const response = await fetch(`${API_BASE_URL}/auth/mfa/setup`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to start MFA setup");
      }

      const data = await response.json();
      setMfaData({
        secretCode: data.data?.secretCode || data.secretCode,
        qrCodeUrl: data.data?.qrCodeUrl || data.qrCodeUrl,
      });
      setStep("qr");
    } catch (err) {
      console.error("Error starting MFA setup:", err);
      setError(err instanceof Error ? err.message : "Failed to start setup");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("budgetbuddy_id_token");
      if (!token) {
        setError("Please log in to continue");
        return;
      }

      // Call API to verify MFA code
      const response = await fetch(`${API_BASE_URL}/auth/mfa/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Invalid verification code");
      }

      const data = await response.json();
      setBackupCodes(data.data?.backupCodes || data.backupCodes || []);
      setStep("backup");
    } catch (err) {
      console.error("Error verifying MFA code:", err);
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBackupCodes = () => {
    const codesText = backupCodes.join("\n");
    navigator.clipboard.writeText(codesText);
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  const renderStep = () => {
    switch (step) {
      case "intro":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🔐</div>
              <h3 className="text-xl font-semibold text-[var(--color-foreground)] mb-2">
                Secure Your Account
              </h3>
              <p className="text-[var(--color-muted-foreground)]">
                Two-factor authentication adds an extra layer of security to
                your account. You'll need your phone to sign in.
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-blue-900">What you'll need:</h4>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-center gap-2">
                  <span>📱</span>
                  <span>
                    An authenticator app (Google Authenticator, Authy, etc.)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span>⏱️</span>
                  <span>About 2 minutes to complete setup</span>
                </li>
              </ul>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Benefits:</h4>
              <ul className="space-y-1 text-sm text-green-800">
                <li>✓ Protect your financial data</li>
                <li>✓ Prevent unauthorized access</li>
                <li>✓ Get notified of login attempts</li>
              </ul>
            </div>

            <button
              onClick={handleStartSetup}
              disabled={loading}
              className="w-full py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
            >
              {loading ? "Setting up..." : "Get Started"}
            </button>
          </div>
        );

      case "qr":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-[var(--color-foreground)] mb-2">
                Scan QR Code
              </h3>
              <p className="text-[var(--color-muted-foreground)] text-sm">
                Open your authenticator app and scan this QR code
              </p>
            </div>

            {mfaData && (
              <>
                <div className="flex justify-center">
                  <div className="bg-[var(--color-surface)] p-4 rounded-lg border-2 border-[var(--color-border)]">
                    {/* QR Code placeholder - in production, use a QR code library */}
                    <div className="w-48 h-48 bg-[var(--color-muted)] flex items-center justify-center">
                      <img
                        src={mfaData.qrCodeUrl}
                        alt="QR Code for 2FA setup"
                        className="w-full h-full"
                        onError={(e) => {
                          // Fallback if QR image fails to load
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--color-background)] rounded-lg p-4">
                  <p className="text-sm text-[var(--color-muted-foreground)] mb-2">
                    Can't scan? Enter this code manually:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-[var(--color-surface)] px-3 py-2 rounded border text-sm font-mono break-all">
                      {mfaData.secretCode}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(mfaData.secretCode);
                      }}
                      className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Copy code"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              onClick={() => setStep("verify")}
              className="w-full py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              I've Scanned the Code
            </button>
          </div>
        );

      case "verify":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-[var(--color-foreground)] mb-2">
                Verify Setup
              </h3>
              <p className="text-[var(--color-muted-foreground)] text-sm">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setVerificationCode(value);
                  setError(null);
                }}
                placeholder="000000"
                className="w-full text-center text-3xl tracking-widest py-4 border-2 border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-[var(--color-primary)]"
                autoFocus
              />
              <p className="text-xs text-[var(--color-muted-foreground)] mt-2 text-center">
                The code changes every 30 seconds
              </p>
            </div>

            <button
              onClick={handleVerifyCode}
              disabled={loading || verificationCode.length !== 6}
              className="w-full py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>

            <button
              onClick={() => setStep("qr")}
              className="w-full py-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              ← Back to QR Code
            </button>
          </div>
        );

      case "backup":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-[var(--color-foreground)] mb-2">
                2FA Enabled!
              </h3>
              <p className="text-[var(--color-muted-foreground)] text-sm">
                Save these backup codes in a safe place
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 mb-3">
                ⚠️ These codes can be used to access your account if you lose
                your phone. Each code can only be used once.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <code
                    key={index}
                    className="bg-[var(--color-surface)] px-3 py-2 rounded border text-sm font-mono text-center"
                  >
                    {code}
                  </code>
                ))}
              </div>
            </div>

            <button
              onClick={handleCopyBackupCodes}
              className="w-full py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors flex items-center justify-center gap-2"
            >
              {copiedBackup ? (
                <>
                  <span>✓</span>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <span>📋</span>
                  <span>Copy Backup Codes</span>
                </>
              )}
            </button>

            <button
              onClick={handleComplete}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Done
            </button>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-surface)] rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔐</span>
            <span className="font-semibold text-[var(--color-foreground)]">
              Two-Factor Authentication
            </span>
          </div>
          {step !== "backup" && (
            <button
              onClick={onClose}
              className="text-[var(--color-muted-foreground)] hover:text-[var(--color-muted-foreground)]"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
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

        {/* Progress Indicator */}
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-2">
            {["intro", "qr", "verify", "backup"].map((s, index) => (
              <React.Fragment key={s}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? "bg-[var(--color-primary)] text-white"
                      : ["intro", "qr", "verify", "backup"].indexOf(step) >
                          index
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-[var(--color-muted-foreground)]"
                  }`}
                >
                  {["intro", "qr", "verify", "backup"].indexOf(step) > index
                    ? "✓"
                    : index + 1}
                </div>
                {index < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      ["intro", "qr", "verify", "backup"].indexOf(step) > index
                        ? "bg-green-500"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between text-xs text-[var(--color-muted-foreground)] mb-4">
            <span>Intro</span>
            <span>Scan</span>
            <span>Verify</span>
            <span>Done</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default TwoFactorSetup;
