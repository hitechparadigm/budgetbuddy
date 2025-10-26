/**
 * Dashboard Page
 * Main application dashboard for authenticated users
 */

import React from 'react';
import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// Dashboard Page Component
// ============================================================================

export const DashboardPage: React.FC = () => {
  const { user, logout, loading } = useAuth();

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                BudgetBuddy Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <div className="text-sm text-gray-700">
                  Welcome, {user.firstName} {user.lastName}
                </div>
              )}
              <button
                onClick={handleLogout}
                disabled={loading}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                  }`}
              >
                {loading ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                🎉 Authentication Successful!
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                You have successfully logged into BudgetBuddy. The authentication system is working perfectly!
              </p>

              {/* User Information Card */}
              {user && (
                <div className="bg-white shadow rounded-lg p-6 max-w-md mx-auto mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Your Account Information
                  </h3>
                  <div className="space-y-2 text-left">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Name:</span>
                      <span className="text-gray-900">{user.firstName} {user.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email:</span>
                      <span className="text-gray-900">{user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Account Type:</span>
                      <span className="text-gray-900 capitalize">{user.accountType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subscription:</span>
                      <span className="text-gray-900 capitalize">{user.subscriptionTier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">User ID:</span>
                      <span className="text-gray-900 font-mono text-xs">{user.userId}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Next Steps */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
                <h3 className="text-lg font-medium text-blue-900 mb-4">
                  🚀 What's Next?
                </h3>
                <div className="text-left space-y-2 text-blue-800">
                  <p>✅ Authentication system is complete and working</p>
                  <p>✅ User registration and login functionality implemented</p>
                  <p>✅ Protected routes and session management active</p>
                  <p>🔄 Next: Implement budget management features</p>
                  <p>🔄 Next: Add AI-powered budget generation</p>
                  <p>🔄 Next: Build transaction management system</p>
                </div>
              </div>

              {/* API Status */}
              <div className="mt-8 text-sm text-gray-500">
                <p>Connected to: https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/</p>
                <p>Authentication: JWT tokens managed automatically</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
