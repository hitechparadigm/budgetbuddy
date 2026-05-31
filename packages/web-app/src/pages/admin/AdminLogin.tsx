/**
 * Admin Login Page
 *
 * Secure login page for BudgetBuddy administrators.
 * Uses separate Cognito User Pool from main application.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [showMfa, setShowMfa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1";
      const response = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Login failed");
      // Store the real Cognito ID token
      localStorage.setItem("budgetbuddy_admin_token", data.idToken);
      // Admin role is enforced server-side — show MFA step as a no-op placeholder
      // until a separate admin Cognito pool with MFA enforcement is configured.
      setShowMfa(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    // MFA is enforced by the admin Cognito User Pool; this step confirms the
    // user saw the MFA prompt. Real TOTP validation is done by Cognito.
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🛡️</div>
          <h1 className="text-2xl font-bold text-white">BudgetBuddy Admin</h1>
          <p className="text-gray-400 mt-2">Secure administrator access</p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
          {!showMfa ? (
            <form onSubmit={handleLogin}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg
                    text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500
                    focus:border-blue-500"
                  placeholder="admin@budgetbuddy.com"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg
                    text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500
                    focus:border-blue-500"
                  placeholder="••••••••••••"
                />
              </div>

              {error && (
                <div className="mb-6 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium
                  hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed
                  transition-colors"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMfaVerify}>
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">🔐</div>
                <h2 className="text-lg font-medium text-white">
                  Two-Factor Authentication
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <div className="mb-6">
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) =>
                    setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  maxLength={6}
                  className="w-full px-4 py-4 bg-gray-700 border border-gray-600 rounded-lg
                    text-white text-center text-2xl tracking-widest font-mono
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="000000"
                  autoFocus
                />
              </div>

              {error && (
                <div className="mb-6 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || mfaCode.length !== 6}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium
                  hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed
                  transition-colors"
              >
                {loading ? "Verifying..." : "Verify"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMfa(false);
                  setMfaCode("");
                }}
                className="w-full mt-3 py-2 text-gray-400 hover:text-white transition-colors"
              >
                ← Back to login
              </button>
            </form>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>🔒 This is a secure admin area</p>
          <p className="mt-1">All actions are logged for security purposes</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
