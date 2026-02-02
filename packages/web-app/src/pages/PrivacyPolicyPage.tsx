/**
 * Privacy Policy Page
 *
 * Static page displaying the privacy policy for BudgetBuddy.
 */

import React from "react";
import { useNavigate } from "react-router-dom";

export const PrivacyPolicyPage: React.FC = () => {
  const navigate = useNavigate();
  const lastUpdated = "February 1, 2026";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              aria-label="Go back"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Privacy Policy
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Last Updated: {lastUpdated}
          </p>

          <div className="prose dark:prose-invert max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              1. Introduction
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              BudgetBuddy ("we", "our", or "us") is committed to protecting your
              privacy. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our personal
              finance management application.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              2. Information We Collect
            </h2>
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
              2.1 Information You Provide
            </h3>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Account information (name, email, password)</li>
              <li>Profile information (location, family size, income range)</li>
              <li>Financial data (budgets, transactions, goals)</li>
              <li>Bank account information (when using Plaid integration)</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
              2.2 Information Collected Automatically
            </h3>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-6 space-y-2">
              <li>Device information (type, operating system, browser)</li>
              <li>Usage data (features used, time spent, interactions)</li>
              <li>Location data (country, city for AI budget suggestions)</li>
              <li>Log data (IP address, access times, error reports)</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              3. How We Use Your Information
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We use your information to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-6 space-y-2">
              <li>Provide and maintain the Service</li>
              <li>Generate personalized budget recommendations</li>
              <li>Process transactions and sync bank accounts</li>
              <li>Send notifications and reminders</li>
              <li>Improve and optimize the Service</li>
              <li>Provide customer support</li>
              <li>Detect and prevent fraud or abuse</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              4. Data Sharing and Disclosure
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We do not sell your personal information. We may share your
              information with:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-6 space-y-2">
              <li>
                Service providers (AWS, Plaid) who help us operate the Service
              </li>
              <li>Family members you invite to share your budget</li>
              <li>
                Law enforcement when required by law or to protect our rights
              </li>
              <li>
                Aggregated, anonymized data for peer comparison features (opt-in
                only)
              </li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              5. Data Security
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We implement industry-standard security measures:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-6 space-y-2">
              <li>Encryption at rest and in transit (TLS 1.2+)</li>
              <li>Secure authentication with AWS Cognito</li>
              <li>Regular security audits and penetration testing</li>
              <li>Access controls and audit logging</li>
              <li>Bank-level security for Plaid integration</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              6. Data Retention
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We retain your data for as long as your account is active or as
              needed to provide services. You can request deletion of your
              account and data at any time through the Settings page. Some data
              may be retained for legal compliance purposes.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              7. Your Rights
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-6 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and data</li>
              <li>Export your data (CSV, PDF, JSON)</li>
              <li>Opt out of marketing communications</li>
              <li>Opt out of peer comparison features</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              8. Children's Privacy
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              BudgetBuddy is not intended for children under 13. We do not
              knowingly collect personal information from children under 13. If
              you believe we have collected such information, please contact us
              immediately.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              9. International Data Transfers
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your data may be processed in the United States where our servers
              are located. By using the Service, you consent to the transfer of
              your data to the United States.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              10. Changes to This Policy
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We may update this Privacy Policy from time to time. We will
              notify you of significant changes via email or in-app
              notification. Your continued use of the Service after changes
              constitutes acceptance of the updated policy.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              11. Contact Us
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              If you have questions about this Privacy Policy, please contact
              us:
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              Email:{" "}
              <a
                href="mailto:privacy@budgetbuddy.app"
                className="text-green-600 dark:text-green-400 hover:underline"
              >
                privacy@budgetbuddy.app
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
