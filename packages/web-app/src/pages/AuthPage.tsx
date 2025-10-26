/**
 * Authentication Page
 * Handles both login and registration with tab switching
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';

// ============================================================================
// Types
// ============================================================================

type AuthMode = 'login' | 'register';

// ============================================================================
// Auth Page Component
// ============================================================================

export const AuthPage: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const navigate = useNavigate();

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleAuthSuccess = () => {
    // Redirect to dashboard after successful authentication
    navigate('/dashboard');
  };

  const switchToLogin = () => {
    setAuthMode('login');
  };

  const switchToRegister = () => {
    setAuthMode('register');
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            BudgetBuddy
          </h1>
          <p className="text-gray-600">
            AI-powered family budgeting made simple
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-2 px-4 shadow-sm rounded-t-lg">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={switchToLogin}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${authMode === 'login'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Sign In
            </button>
            <button
              onClick={switchToRegister}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${authMode === 'register'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Sign Up
            </button>
          </nav>
        </div>
      </div>

      {/* Form Content */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {authMode === 'login' ? (
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
        <p className="text-xs text-gray-500">
          © 2025 BudgetBuddy. All rights reserved.
        </p>
      </div>
    </div>
  );
};
