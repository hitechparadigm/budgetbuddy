/**
 * Accept Invitation Page
 *
 * Allows users to accept family invitations via email link
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { config } from "../config/environment";

// Family API is on a separate API Gateway (api-family stack)
const API_BASE = config.familyApiUrl;
// Auth endpoints are on the main API Gateway
const AUTH_API_BASE = config.apiBaseUrl;

export const AcceptInvitationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Login/Register form state
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated (use id_token — required by API Gateway Cognito authorizer)
    const idToken = localStorage.getItem("budgetbuddy_id_token");
    if (idToken) {
      setIsAuthenticated(true);
    } else {
      // If not authenticated, show auth form by default for new users
      setShowAuthForm(true);
      setAuthMode("register"); // Default to register for invited users
    }

    // Validate token exists
    if (!token) {
      setError("Invalid invitation link. No token provided.");
      setLoading(false);
      return;
    }

    // Load invitation details (optional - could be done on accept)
    setLoading(false);
  }, [token]);

  const handleAcceptInvitation = async () => {
    if (!token) {
      setError("Invalid invitation token");
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      setShowAuthForm(true);
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      // Use id_token for API Gateway Cognito authorizer (not access_token)
      const idToken = localStorage.getItem("budgetbuddy_id_token");
      if (!idToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_BASE}/family/accept-invitation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to accept invitation");
      }

      const data = await response.json();

      // Success! Redirect to budget page
      navigate("/budget", {
        state: {
          message: `Successfully joined family! You are now a ${data.role}.`,
        },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to accept invitation",
      );
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineInvitation = () => {
    if (
      confirm(
        "Are you sure you want to decline this invitation? You will need a new invitation to join this family.",
      )
    ) {
      navigate("/");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthenticating(true);
    setAuthError(null);

    try {
      const response = await fetch(`${AUTH_API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }

      const data = await response.json();

      // Store token
      localStorage.setItem("budgetbuddy_access_token", data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem("budgetbuddy_refresh_token", data.refreshToken);
      }
      if (data.idToken) {
        localStorage.setItem("budgetbuddy_id_token", data.idToken);
      }
      if (data.userId) {
        const userData = { userId: data.userId, email: email };
        localStorage.setItem("budgetbuddy_user", JSON.stringify(userData));
      }

      setIsAuthenticated(true);
      setShowAuthForm(false);

      // Now accept the invitation
      await handleAcceptInvitation();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setAuthenticating(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthenticating(true);
    setAuthError(null);

    try {
      const response = await fetch(`${AUTH_API_BASE}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Registration failed");
      }

      // Registration succeeded — now log in
      // handleLogin manages its own authenticating state, so clear ours first
      setAuthenticating(false);
      await handleLogin(e);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Registration failed");
      setAuthenticating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Invalid Invitation
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">👨‍👩‍👧‍👦</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Family Invitation
          </h1>
          <p className="text-gray-600">
            You've been invited to join a family budget on BudgetBuddy!
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Auth Form - Show by default for non-authenticated users */}
        {showAuthForm && !isAuthenticated ? (
          <div className="space-y-6">
            {/* Info Message */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                {authMode === "register"
                  ? "Create your BudgetBuddy account to accept this invitation and start managing your family budget together."
                  : "Log in to your BudgetBuddy account to accept this invitation."}
              </p>
            </div>

            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => {
                  setAuthMode("register");
                  setAuthError(null);
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                  authMode === "register"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Create Account
              </button>
              <button
                onClick={() => {
                  setAuthMode("login");
                  setAuthError(null);
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                  authMode === "login"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Login
              </button>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {authError}
              </div>
            )}

            {authMode === "register" ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="registerEmail"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="registerEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="registerPassword"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Password
                  </label>
                  <input
                    id="registerPassword"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 8 characters
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={authenticating}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium"
                >
                  {authenticating
                    ? "Creating account..."
                    : "Create Account & Join Family"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authenticating}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium"
                >
                  {authenticating
                    ? "Logging in..."
                    : "Login & Accept Invitation"}
                </button>
              </form>
            )}

            <button
              onClick={() => setShowAuthForm(false)}
              className="w-full px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            {/* Invitation Info */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-2">You'll join as:</div>
              <div className="font-medium text-gray-900 text-lg">
                Family Member
              </div>
              <div className="text-sm text-gray-600 mt-1">
                You'll gain access to the shared family budget
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleAcceptInvitation}
                disabled={accepting}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center space-x-2"
              >
                {accepting ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
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
                    <span>Accepting...</span>
                  </>
                ) : (
                  <span>Accept Invitation</span>
                )}
              </button>

              <button
                onClick={handleDeclineInvitation}
                disabled={accepting}
                className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium"
              >
                Decline
              </button>
            </div>

            {/* Info Note */}
            <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-600">
                By accepting this invitation, you'll gain access to the shared
                family budget. You can leave the family at any time from the
                settings page.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitationPage;
