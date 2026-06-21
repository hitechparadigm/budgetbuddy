/**
 * Terms of Service Page
 *
 * Static page displaying the terms of service for BudgetBuddy.
 */

import React from "react";
import { useNavigate } from "react-router-dom";

export const TermsOfServicePage: React.FC = () => {
  const navigate = useNavigate();
  const lastUpdated = "February 1, 2026";

  return (
    <div className="min-h-screen bg-[var(--color-background)] dark:bg-gray-900">
      {/* Header */}
      <div className="bg-[var(--color-surface)] dark:bg-gray-800 border-b border-[var(--color-border)] dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] dark:hover:text-gray-100"
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
            <h1 className="text-2xl font-bold text-[var(--color-foreground)] dark:text-white">
              Terms of Service
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-[var(--color-surface)] dark:bg-gray-800 rounded-lg shadow-sm border border-[var(--color-border)] dark:border-gray-700 p-8">
          <p className="text-sm text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)] mb-6">
            Last Updated: {lastUpdated}
          </p>

          <div className="prose dark:prose-invert max-w-none">
            <h2 className="text-xl font-semibold text-[var(--color-foreground)] dark:text-white mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-[var(--color-muted-foreground)] dark:text-gray-300 mb-6">
              By accessing or using BudgetBuddy ("the Service"), you agree to be
              bound by these Terms of Service. If you do not agree to these
              terms, please do not use the Service.
            </p>

            <h2 className="text-xl font-semibold text-[var(--color-foreground)] dark:text-white mb-4">
              2. Description of Service
            </h2>
            <p className="text-[var(--color-muted-foreground)] dark:text-gray-300 mb-6">
              BudgetBuddy is a personal finance management application that
              helps users track expenses, create budgets, set financial goals,
              and manage their money. The Service includes web and mobile
              applications, AI-powered budget suggestions, and optional bank
              account integration.
            </p>

            <h2 className="text-xl font-semibold text-[var(--color-foreground)] dark:text-white mb-4">
              3. User Accounts
            </h2>
            <p className="text-[var(--color-muted-foreground)] dark:text-gray-300 mb-4">
              To use certain features of the Service, you must create an
              account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-[var(--color-muted-foreground)] dark:text-gray-300 mb-6 space-y-2">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>
                Notify us immediately of any unauthorized use of your account
              </li>
              <li>
                Accept responsibility for all activities under your account
              </li>
            </ul>

            <h2 className="text-xl font-semibold text-[var(--color-foreground)] dark:text-white mb-4">
              4. Privacy and Data
            </h2>
            <p className="text-[var(--color-muted-foreground)] dark:text-gray-300 mb-6">
              Your privacy is important to us. Our collection and use of
              personal information is governed by our Privacy Policy. By using
              the Service, you consent to the collection and use of your
              information as described in the Privacy Policy.
            </p>

            <h2 className="text-xl font-semibold text-[var(--color-foreground)] dark:text-white mb-4">
              5. Subscription and Payments
            </h2>
            <p className="text-[var(--color-muted-foreground)] dark:text-gray-300 mb-4">
              BudgetBuddy offers both free and premium subscription plans:
            </p>
            <ul className="list-disc pl-6 text-[var(--color-muted-foreground)] dark:text-gray-300 mb-6 space-y-2">
              <li>
                Free tier includes basic budgeting and transaction tracking
              </li>
              <li>
                Premium subscription ($9.99/month) includes advanced features
              </li>
              <li>Subscriptions auto-renew unless cancelled before renewal</li>
              <li>Refunds are handled according to app store policies</li>
            </ul>

            <h2 className="text-xl font-semibold text-[var(--color-foreground)] dark:text-white mb-4">
              6. Acceptable Use
            </h2>
            <p className="text-[var(--color-muted-foreground)] dark:text-gray-300 mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 text-[var(--color-muted-foreground)] dark:text-gray-300 mb-6 space-y-2">
              <li>Use the Service for any illegal purpose</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Upload malicious code or content</li>
              <li>Impersonate others or provide false information</li>
            </ul>

            <h2 className="text-xl font-semibold text-[var(--color-foreground)] dark:text-white mb-4">
              7. Intellectual Property
            </h2>
            <p className="text-[var(--color-muted-foreground)] dark:text-gray-300 mb-6">
              The Service and its original content, features, and functionality
              are owned by BudgetBuddy and are protected by international
              copyright, trademark, and other intellectual property laws.
            </p>

            <h2 className="text-xl font-semibold text-[var(--color-foreground)] dark:text-white mb-4">
              8. Disclaimer of Warranties
            </h2>
            <p className="text-[var(--color-muted-foreground)] dark:text-gray-300 mb-6">
              The Service is provided "as is" without warranties of any kind.
              BudgetBuddy does not provide financial advice. The information and
              tools provided are for informational purposes only and should not
              be considered professional financial advice.
            </p>

            <h2 className="text-xl font-semibold text-[var(--color-foreground)] dark:text-white mb-4">
              9. Limitation of Liability
            </h2>
            <p className="text-[var(--color-muted-foreground)] dark:text-gray-300 mb-6">
              BudgetBuddy shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages resulting from your
              use of or inability to use the Service.
            </p>

            <h2 className="text-xl font-semibold text-[var(--color-foreground)] dark:text-white mb-4">
              10. Changes to Terms
            </h2>
            <p className="text-[var(--color-muted-foreground)] dark:text-gray-300 mb-6">
              We reserve the right to modify these terms at any time. We will
              notify users of significant changes via email or in-app
              notification. Continued use of the Service after changes
              constitutes acceptance of the new terms.
            </p>

            <h2 className="text-xl font-semibold text-[var(--color-foreground)] dark:text-white mb-4">
              11. Contact Us
            </h2>
            <p className="text-[var(--color-muted-foreground)] dark:text-gray-300 mb-2">
              If you have questions about these Terms of Service, please contact
              us at:
            </p>
            <p className="text-[var(--color-muted-foreground)] dark:text-gray-300">
              Email:{" "}
              <a
                href="mailto:legal@budgetbuddy.app"
                className="text-green-600 dark:text-green-400 hover:underline"
              >
                legal@budgetbuddy.app
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
