/**
 * Accept Invitation Page
 *
 * Smart invitation page that:
 * 1. Fetches invitation preview (unauthenticated) to get inviter name, budget name, role
 * 2. Defaults to the correct auth tab (Login if user exists, Create Account if new)
 * 3. Pre-fills the invitee email in both login and register forms
 * 4. Shows an error immediately if the invitation is invalid/expired
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { config } from "../config/environment";
import { budgetService } from "../services/budgetService";

// Auth endpoints are on the main API Gateway
const AUTH_API_BASE = config.apiBaseUrl;
const BUDGETS_API_BASE = config.budgetsApiUrl;

interface InvitationPreview {
  inviterFirstName: string;
  inviteeEmail: string;
  budgetName: string;
  role: string;
  expiresAt: string;
  userExists: boolean;
}

export const AcceptInvitationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem("budgetbuddy_id_token")
  );
  const [showAuthForm, setShowAuthForm] = useState(
    () => !localStorage.getItem("budgetbuddy_id_token")
  );
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  // Fetch invitation preview on load — unauthenticated call
  useEffect(() => {
    const idToken = localStorage.getItem("budgetbuddy_id_token");
    if (idToken) {
      setIsAuthenticated(true);
      setShowAuthForm(false);
    }

    if (!token) {
      setPreviewError("Invalid invitation link. No token provided.");
      setLoadingPreview(false);
      return;
    }

    fetch(
      `${BUDGETS_API_BASE}/budgets/invitation-preview?token=${encodeURIComponent(token)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          const previewData = data.data as InvitationPreview;
          setPreview(previewData);
          // Pre-fill email from invitation
          setEmail(previewData.inviteeEmail);
          // Smart tab default: Login if account exists, Create Account if new
          if (!idToken) {
            setAuthMode(previewData.userExists ? "login" : "register");
          }
        } else {
          setPreviewError(data.message || "Invalid or expired invitation.");
        }
      })
      .catch(() => setPreviewError("Could not load invitation details."))
      .finally(() => setLoadingPreview(false));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAcceptInvitation = async () => {
    if (!token) {
      setError("Invalid invitation token");
      return;
    }

    if (!isAuthenticated) {
      setShowAuthForm(true);
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      const idToken = localStorage.getItem("budgetbuddy_id_token");
      if (!idToken) {
        setShowAuthForm(true);
        setAccepting(false);
        return;
      }

      const data = await budgetService.acceptInvitation(token);

      navigate(`/budget/${data.budgetId}`, {
        state: {
          message: `Successfully joined ${preview?.budgetName || "budget"}! You are now a ${data.role}.`,
        },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to accept invitation"
      );
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineInvitation = () => {
    if (confirm("Are you sure you want to decline this invitation?")) {
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Login failed");
      }

      const data = await response.json();
      localStorage.setItem("budgetbuddy_access_token", data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem("budgetbuddy_refresh_token", data.refreshToken);
      }
      if (data.idToken) {
        localStorage.setItem("budgetbuddy_id_token", data.idToken);
      }
      if (data.userId) {
        localStorage.setItem(
          "budgetbuddy_user",
          JSON.stringify({ userId: data.userId, email })
        );
      }

      setIsAuthenticated(true);
      setShowAuthForm(false);

      // Accept the invitation now that we're authenticated
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Registration failed");
      }

      // Registration succeeded — now log in
      setAuthenticating(false);
      await handleLogin(e);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Registration failed");
      setAuthenticating(false);
    }
  };

  // Loading preview
  if (loadingPreview) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Invalid / expired invitation — show error immediately, no need to try accepting
  if (previewError) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4">
        <div className="bg-[var(--color-surface)] rounded-lg shadow-lg max-w-md w-full p-8 text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-4">
            Invalid Invitation
          </h1>
          <p className="text-[var(--color-muted-foreground)] mb-6">{previewError}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg font-medium"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const inviterFirstName = preview?.inviterFirstName || "Someone";
  const budgetName = preview?.budgetName || "Family Budget";

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4">
      <div className="bg-[var(--color-surface)] rounded-lg shadow-lg max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">👨‍👩‍👧‍👦</div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
            Family Invitation
          </h1>
          <p className="text-[var(--color-muted-foreground)]">
            <span className="font-semibold text-[var(--color-foreground)]">
              {inviterFirstName}
            </span>{" "}
            invited you to join{" "}
            <span className="font-semibold text-[var(--color-foreground)]">{budgetName}</span>{" "}
            on BudgetBuddy!
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Auth Form */}
        {showAuthForm && !isAuthenticated ? (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                {authMode === "register"
                  ? `Create your BudgetBuddy account to accept ${inviterFirstName}'s invitation.`
                  : `Log in to accept ${inviterFirstName}'s invitation.`}
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => {
                  setAuthMode("register");
                  setAuthError(null);
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                  authMode === "register"
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-muted)] text-[var(--color-foreground)] hover:bg-[var(--color-border)]"
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
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-muted)] text-[var(--color-foreground)] hover:bg-[var(--color-border)]"
                }`}
              >
                Log In
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
                      className="block text-sm font-medium text-[var(--color-foreground)] mb-1"
                    >
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-[var(--color-foreground)] mb-1"
                    >
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="registerEmail"
                    className="block text-sm font-medium text-[var(--color-foreground)] mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="registerEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    readOnly={!!preview?.inviteeEmail}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--color-background)]"
                  />
                  {preview?.inviteeEmail && (
                    <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                      Invitation sent to this email address
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="registerPassword"
                    className="block text-sm font-medium text-[var(--color-foreground)] mb-1"
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
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                    Minimum 8 characters
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={authenticating}
                  className="w-full px-4 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white rounded-lg font-medium"
                >
                  {authenticating ? "Creating account..." : "Create Account & Join"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-[var(--color-foreground)] mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    readOnly={!!preview?.inviteeEmail}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--color-background)]"
                  />
                  {preview?.inviteeEmail && (
                    <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                      Your account email
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-[var(--color-foreground)] mb-1"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authenticating}
                  className="w-full px-4 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white rounded-lg font-medium"
                >
                  {authenticating ? "Logging in..." : "Log In & Accept Invitation"}
                </button>
              </form>
            )}
          </div>
        ) : (
          <>
            {/* Invitation details for authenticated users */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-[var(--color-muted-foreground)] mb-2">You'll join as:</div>
              <div className="font-medium text-[var(--color-foreground)] text-lg capitalize">
                {preview?.role || "Family Member"}
              </div>
              <div className="text-sm text-[var(--color-muted-foreground)] mt-1">
                You'll gain access to <strong>{budgetName}</strong>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleAcceptInvitation}
                disabled={accepting}
                className="w-full px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center space-x-2"
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
                className="w-full px-6 py-3 border-2 border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-background)] rounded-lg font-medium"
              >
                Decline
              </button>
            </div>

            {/* Info Note */}
            <div className="mt-6 p-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg">
              <p className="text-xs text-[var(--color-muted-foreground)]">
                By accepting, you'll gain access to the shared family budget.
                You can leave at any time from settings.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitationPage;

