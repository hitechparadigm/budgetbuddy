/**
 * Settings Page - Account Management
 *
 * Allows users to manage their account settings including:
 * - Profile information
 * - Email and password
 * - Membership plan
 * - Two-factor authentication
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('overview');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar - Settings Navigation */}
      <div className="w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <button
            onClick={() => navigate('/budget')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Budget</span>
          </button>

          <h2 className="text-xl font-semibold text-gray-900 mb-6">Account</h2>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveSection('overview')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                activeSection === 'overview'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveSection('personal-info')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                activeSection === 'personal-info'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Personal Info
            </button>
            <button
              onClick={() => setActiveSection('email')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                activeSection === 'email'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Email Address
            </button>
            <button
              onClick={() => setActiveSection('password')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                activeSection === 'password'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Password
            </button>
            <button
              onClick={() => setActiveSection('2fa')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                activeSection === '2fa'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Two-Factor Authentication
            </button>
            <button
              onClick={() => setActiveSection('subscription')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                activeSection === 'subscription'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Subscriptions
            </button>
            <button
              onClick={() => setActiveSection('delete')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                activeSection === 'delete'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Delete Account
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Account</h1>
              <p className="text-gray-600 mb-8">Settings to help keep your BudgetBuddy account secure.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email Address Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-xl">📧</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">Email Address</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Your email address is how you sign in to your BudgetBuddy account.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveSection('email')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    Change Email Address
                  </button>
                </div>

                {/* Password Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-xl">🔒</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">Password</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Your password safeguards your personal information.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveSection('password')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    Change Password
                  </button>
                </div>

                {/* Two-Factor Authentication Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-xl">🔐</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Two-Factor Authentication makes your account extra secure.
                      </p>
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">⚠️ Off</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveSection('2fa')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    Set Up
                  </button>
                </div>

                {/* Membership Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 text-xl">⭐</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">Membership</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Current plan: <span className="font-medium">Free</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Upgrade to Premium for advanced features
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveSection('subscription')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    Upgrade to Premium
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Personal Info Section */}
          {activeSection === 'personal-info' && (
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Personal Info</h1>
              <p className="text-gray-600 mb-8">Update your personal information.</p>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <form className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      defaultValue="Dmytro Malyk"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Email Section */}
          {activeSection === 'email' && (
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Address</h1>
              <p className="text-gray-600 mb-8">Your email address is how you sign in to your account.</p>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="mb-6">
                  <div className="text-sm text-gray-600 mb-2">Current Email</div>
                  <div className="text-lg font-medium text-gray-900">dmytro.malyk@gmail.com</div>
                </div>

                <form className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="Enter new email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      placeholder="Enter your password"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Update Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSection('overview')}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Password Section */}
          {activeSection === 'password' && (
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Change Password</h1>
              <p className="text-gray-600 mb-8">Update your password to keep your account secure.</p>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <form className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Update Password
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSection('overview')}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Two-Factor Authentication Section */}
          {activeSection === '2fa' && (
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Two-Factor Authentication</h1>
              <p className="text-gray-600 mb-8">Add an extra layer of security to your account.</p>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="mb-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded font-medium">
                      ⚠️ Two-Factor Authentication is Off
                    </span>
                  </div>
                  <p className="text-gray-600">
                    Two-Factor Authentication makes your account extra secure by sending you a text each time you sign in.
                  </p>
                </div>

                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium">
                  Enable Two-Factor Authentication
                </button>
              </div>
            </div>
          )}

          {/* Subscription Section */}
          {activeSection === 'subscription' && (
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Membership Plan</h1>
              <p className="text-gray-600 mb-8">Manage your subscription and billing.</p>

              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
                    <p className="text-gray-600">Free</p>
                  </div>
                  <span className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium">
                    $0/month
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-8 text-white mb-6">
                <h2 className="text-2xl font-bold mb-4">Budget Easier and Faster with Premium Features</h2>
                <p className="mb-6">
                  Stream transactions from your bank to your budget, monitor bank balances, and get priority support.
                </p>
                <button className="bg-white text-blue-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-semibold">
                  Upgrade to Premium
                </button>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Comparison</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Customizable budget', free: true, premium: true },
                    { name: 'Savings funds', free: true, premium: true },
                    { name: 'Split transactions', free: true, premium: true },
                    { name: 'Bank connectivity', free: false, premium: true },
                    { name: 'Custom budget reports', free: false, premium: true },
                    { name: 'Automatic transaction streaming', free: false, premium: true },
                    { name: 'Downloadable CSV files', free: false, premium: true },
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-700">{feature.name}</span>
                      <div className="flex space-x-8">
                        <span className="w-16 text-center">
                          {feature.free ? '✓' : '—'}
                        </span>
                        <span className="w-16 text-center text-green-600 font-medium">
                          {feature.premium ? '✓' : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Delete Account Section */}
          {activeSection === 'delete' && (
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Delete Account</h1>
              <p className="text-gray-600 mb-8">Permanently delete your BudgetBuddy account.</p>

              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-red-900 mb-4">⚠️ Warning</h3>
                <p className="text-red-700 mb-6">
                  Deleting your account is permanent and cannot be undone. All your budget data, transactions, and settings will be permanently deleted.
                </p>
                <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium">
                  Delete My Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
