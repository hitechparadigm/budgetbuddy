/**
 * Login Form Component
 * Handles user authentication with validation and error handling
 * Supports both email/password and Google Sign-In
 * Includes MFA challenge handling for 2FA-enabled accounts
 */

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "../../utils/validation";
import type { LoginFormData } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { ApiClientError } from "../../utils/apiClient";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { TwoFactorVerify } from "../TwoFactorVerify";

// ============================================================================
// Types
// ============================================================================

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

interface MFAChallenge {
  session: string;
  email: string;
}

// ============================================================================
// Login Form Component
// ============================================================================

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToRegister,
}) => {
  const { login, loading, error, clearError } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mfaChallenge, setMfaChallenge] = useState<MFAChallenge | null>(null);
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // ============================================================================
  // Form Submission
  // ============================================================================

  const onSubmit = async (data: LoginFormData) => {
    try {
      setSubmitError(null);
      clearError();

      await login(data);

      // Reset form on success
      reset();

      // Call success callback
      onSuccess?.();
    } catch (error) {
      console.error("Login error:", error);

      // Check for MFA challenge
      if (
        error instanceof ApiClientError &&
        error.message.includes("MFA_REQUIRED")
      ) {
        // Extract session from error response
        const sessionMatch = error.message.match(/session:([^,]+)/);
        if (sessionMatch) {
          setMfaChallenge({
            session: sessionMatch[1],
            email: data.email,
          });
          return;
        }
      }

      if (error instanceof ApiClientError) {
        if (error.isAuthError) {
          setSubmitError("Invalid email or password. Please try again.");
        } else if (error.isNetworkError) {
          setSubmitError(
            "Network error. Please check your connection and try again.",
          );
        } else {
          setSubmitError(error.message);
        }
      } else {
        setSubmitError("An unexpected error occurred. Please try again.");
      }
    }
  };

  const handleMfaVerify = async (code: string) => {
    if (!mfaChallenge) return;

    try {
      setMfaVerifying(true);
      setSubmitError(null);

      const apiUrl =
        import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1';
      const response = await fetch(`${apiUrl}/auth/mfa/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session: mfaChallenge.session,
          code,
          email: mfaChallenge.email,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Invalid verification code");
      }

      const result = await response.json();

      // Store tokens
      if (result.accessToken) {
        localStorage.setItem("budgetbuddy_access_token", result.accessToken);
        localStorage.setItem("budgetbuddy_refresh_token", result.refreshToken);
        localStorage.setItem("budgetbuddy_id_token", result.idToken);
      }

      // Clear MFA state and call success
      setMfaChallenge(null);
      reset();
      onSuccess?.();
    } catch (error) {
      console.error("MFA verification error:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Verification failed",
      );
    } finally {
      setMfaVerifying(false);
    }
  };

  const handleMfaCancel = () => {
    setMfaChallenge(null);
    setSubmitError(null);
  };

  // ============================================================================
  // Render
  // ============================================================================

  const displayError = submitError || error;

  // Show MFA verification screen if challenge is active
  if (mfaChallenge) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-[var(--color-surface)] dark:bg-gray-800 shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
          <div className="mb-6 text-center">
            <div className="text-4xl mb-4">🔐</div>
            <h2 className="text-2xl font-bold text-[var(--color-foreground)] dark:text-gray-100 mb-2">
              Two-Factor Authentication
            </h2>
            <p className="text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)]">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          {displayError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{displayError}</p>
            </div>
          )}

          <TwoFactorVerify
            onVerify={handleMfaVerify}
            onCancel={handleMfaCancel}
            loading={mfaVerifying}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[var(--color-surface)] dark:bg-gray-800 shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--color-foreground)] dark:text-gray-100 mb-2">
            Welcome Back
          </h2>
          <p className="text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)]">Sign in to your BudgetBuddy account</p>
        </div>

        {displayError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{displayError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Google Sign-In Button */}
        <div className="mb-6">
          <GoogleSignInButton
            onSuccess={onSuccess}
            onError={(error) => setSubmitError(error)}
          />
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--color-border)] dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-[var(--color-surface)] dark:bg-gray-800 text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)]">
              Or continue with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[var(--color-foreground)] text-[var(--color-foreground)] mb-1"
            >
              Email Address
            </label>
            <input
              {...register("email")}
              type="email"
              id="email"
              autoComplete="email"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] bg-[var(--color-background)] text-[var(--color-foreground)] ${
                errors.email ? "border-red-300" : "border-[var(--color-border)]"
              }`}
              placeholder="Enter your email"
              disabled={isSubmitting || loading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[var(--color-foreground)] text-[var(--color-foreground)] mb-1"
            >
              Password
            </label>
            <input
              {...register("password")}
              type="password"
              id="password"
              autoComplete="current-password"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] bg-[var(--color-background)] text-[var(--color-foreground)] ${
                errors.password ? "border-red-300" : "border-[var(--color-border)]"
              }`}
              placeholder="Enter your password"
              disabled={isSubmitting || loading}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isSubmitting || loading
                  ? "bg-[var(--color-muted)] cursor-not-allowed"
                  : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ring)]"
              }`}
            >
              {isSubmitting || loading ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                  Signing In...
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </div>
        </form>

        {/* Switch to Register */}
        {onSwitchToRegister && (
          <div className="mt-6 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                disabled={isSubmitting || loading}
              >
                Sign up here
              </button>
            </p>
          </div>
        )}

        {/* Forgot Password Link */}
        <div className="mt-4 text-center">
          {forgotPasswordSent ? (
            <p className="text-sm text-[var(--color-foreground)]" role="status">
              To reset your password, email us at{" "}
              <a
                href="mailto:support@budgetbuddy.app"
                className="font-medium text-[var(--color-primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2 rounded"
              >
                support@budgetbuddy.app
              </a>{" "}
              and we'll help you get back in.
            </p>
          ) : (
            <button
              type="button"
              className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2 rounded"
              disabled={isSubmitting || loading}
              onClick={() => setForgotPasswordSent(true)}
            >
              Forgot your password?
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
