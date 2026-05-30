/**
 * Authentication Page
 * Handles both login and registration with tab switching
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoginForm } from "../components/auth/LoginForm";
import { RegisterForm } from "../components/auth/RegisterForm";
import { apiClient } from "../utils/apiClient";

// ============================================================================
// Types
// ============================================================================

type AuthMode = "login" | "register";

// ============================================================================
// Auth Page Component
// ============================================================================

export const AuthPage: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const navigate = useNavigate();

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleAuthSuccess = async (isNewUser: boolean = false) => {
    try {
      // Check user profile to see if onboarding is completed
      const profile = await apiClient.getProfile();

      if (isNewUser || !profile.onboardingCompleted) {
        // Redirect to onboarding for new users or users who haven't completed onboarding
        navigate("/onboarding");
      } else {
        // Redirect to budget for existing users who completed onboarding
        navigate("/budget");
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      // Default to budget if we can't check
      navigate("/budget");
    }
  };

  const switchToLogin = () => {
    setAuthMode("login");
  };

  const switchToRegister = () => {
    setAuthMode("register");
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            BudgetBuddy
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            AI-powered family budgeting made simple
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-2 px-4 shadow-sm rounded-t-lg">
          <nav
            className="flex space-x-8"
            aria-label="Authentication"
            role="tablist"
          >
            <button
              onClick={switchToLogin}
              role="tab"
              aria-selected={authMode === "login"}
              aria-controls="auth-tabpanel"
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                authMode === "login"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={switchToRegister}
              role="tab"
              aria-selected={authMode === "register"}
              aria-controls="auth-tabpanel"
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                authMode === "register"
                  ? "border-green-500 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Sign Up
            </button>
          </nav>
        </div>
      </div>

      {/* Form Content */}
      <div
        id="auth-tabpanel"
        role="tabpanel"
        className="sm:mx-auto sm:w-full sm:max-w-md"
      >
        {authMode === "login" ? (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToRegister={switchToRegister}
          />
        ) : (
          <RegisterForm
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={switchToLogin}
          />
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          © 2025 BudgetBuddy. All rights reserved.
        </p>
      </div>
    </div>
  );
};
