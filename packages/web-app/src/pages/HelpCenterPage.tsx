/**
 * Help Center Page
 *
 * Displays FAQs, support options, and helpful resources.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQ[] = [
  {
    id: "1",
    question: "How do I create my first budget?",
    answer:
      "When you first sign up, BudgetBuddy will guide you through creating a personalized budget based on your location and family size. You can also manually create a budget by going to the Budget page and adding income and expense categories.",
    category: "Getting Started",
  },
  {
    id: "2",
    question: "How do I add a transaction?",
    answer:
      "Click the + button (FAB) on the Budget page, or use the keyboard shortcut Ctrl+N. Select whether it's income or expense, choose a category, enter the amount, and save.",
    category: "Getting Started",
  },
  {
    id: "3",
    question: "Can I share my budget with my partner?",
    answer:
      "Yes! Go to Settings > Family Settings and invite your partner by email. They can join as a Spouse (full edit access) or Viewer (read-only access).",
    category: "Family Sharing",
  },
  {
    id: "4",
    question: "How do I connect my bank account?",
    answer:
      'Go to Settings > Connected Bank Accounts or navigate to the Accounts page. Click "Connect Bank" and follow the secure Plaid connection flow to link your accounts.',
    category: "Bank Sync",
  },
  {
    id: "5",
    question: "Is my financial data secure?",
    answer:
      "Absolutely. We use bank-level encryption (AES-256) for all data at rest and TLS 1.2+ for data in transit. Bank connections are handled through Plaid, a trusted financial services provider. We never store your bank credentials.",
    category: "Security",
  },
  {
    id: "6",
    question: "How do I enable two-factor authentication?",
    answer:
      'Go to Settings > Two-Factor Authentication and click "Enable". You\'ll need an authenticator app like Google Authenticator or Authy to scan the QR code and complete setup.',
    category: "Security",
  },
  {
    id: "7",
    question: "How do rollover budgets work?",
    answer:
      'When enabled for a category, any unspent amount at the end of the month rolls over to the next month. Go to a budget category, click the settings icon, and enable "Rollover unused amount".',
    category: "Budgeting",
  },
  {
    id: "8",
    question: "How do I set up savings goals?",
    answer:
      'Navigate to the Goals page and click "Add Goal". Choose from templates like Emergency Fund, Vacation, or create a custom goal. Set your target amount and date, and track your progress.',
    category: "Goals",
  },
  {
    id: "9",
    question: "Can I export my data?",
    answer:
      "Yes! Go to Settings > Data Backup & Restore. You can download your data in JSON format for backup, or export to CSV/PDF for reporting.",
    category: "Data",
  },
  {
    id: "10",
    question: "How do I delete my account?",
    answer:
      'Go to Settings > Danger Zone and click "Delete My Account". You\'ll have the option to export your data first. This action is permanent and cannot be undone.',
    category: "Account",
  },
];

const categories = [
  "All",
  "Getting Started",
  "Family Sharing",
  "Bank Sync",
  "Security",
  "Budgeting",
  "Goals",
  "Data",
  "Account",
];

export const HelpCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory =
      selectedCategory === "All" || faq.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
              Help Center
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--color-muted-foreground)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-[var(--color-border)] dark:border-gray-600 rounded-lg bg-[var(--color-surface)] dark:bg-gray-800 text-[var(--color-foreground)] dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex space-x-2 pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-[var(--color-foreground)] dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-[var(--color-surface)] dark:bg-gray-800 rounded-lg shadow-sm border border-[var(--color-border)] dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          {filteredFaqs.length === 0 ? (
            <div className="p-8 text-center text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)]">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-[var(--color-muted-foreground)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p>No results found. Try a different search term.</p>
            </div>
          ) : (
            filteredFaqs.map((faq) => (
              <div key={faq.id} className="p-4">
                <button
                  onClick={() =>
                    setExpandedFaq(expandedFaq === faq.id ? null : faq.id)
                  }
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex-1 pr-4">
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
                      {faq.category}
                    </span>
                    <h3 className="mt-1 text-[var(--color-foreground)] dark:text-white font-medium">
                      {faq.question}
                    </h3>
                  </div>
                  <svg
                    className={`w-5 h-5 text-[var(--color-muted-foreground)] transition-transform ${expandedFaq === faq.id ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {expandedFaq === faq.id && (
                  <div className="mt-3 text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)] text-sm leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Contact Support */}
        <div className="mt-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <h2 className="text-xl font-semibold mb-2">Still need help?</h2>
          <p className="text-green-100 mb-4">
            Our support team is here to assist you with any questions or issues.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:support@budgetbuddy.app"
              className="inline-flex items-center px-4 py-2 bg-[var(--color-surface)] text-green-600 rounded-lg font-medium hover:bg-green-50 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Email Support
            </a>
            <button
              onClick={() => navigate("/about")}
              className="inline-flex items-center px-4 py-2 bg-green-700 text-white rounded-lg font-medium hover:bg-green-800 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              About BudgetBuddy
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate("/settings")}
            className="p-4 bg-[var(--color-surface)] dark:bg-gray-800 rounded-lg border border-[var(--color-border)] dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-colors text-center"
          >
            <svg
              className="w-8 h-8 mx-auto mb-2 text-[var(--color-muted-foreground)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-sm text-[var(--color-foreground)] dark:text-gray-300">
              Settings
            </span>
          </button>
          <button
            onClick={() => navigate("/learn")}
            className="p-4 bg-[var(--color-surface)] dark:bg-gray-800 rounded-lg border border-[var(--color-border)] dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-colors text-center"
          >
            <svg
              className="w-8 h-8 mx-auto mb-2 text-[var(--color-muted-foreground)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <span className="text-sm text-[var(--color-foreground)] dark:text-gray-300">
              Learn
            </span>
          </button>
          <button
            onClick={() => navigate("/tips")}
            className="p-4 bg-[var(--color-surface)] dark:bg-gray-800 rounded-lg border border-[var(--color-border)] dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-colors text-center"
          >
            <svg
              className="w-8 h-8 mx-auto mb-2 text-[var(--color-muted-foreground)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <span className="text-sm text-[var(--color-foreground)] dark:text-gray-300">
              Tips
            </span>
          </button>
          <button
            onClick={() => navigate("/insights")}
            className="p-4 bg-[var(--color-surface)] dark:bg-gray-800 rounded-lg border border-[var(--color-border)] dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-colors text-center"
          >
            <svg
              className="w-8 h-8 mx-auto mb-2 text-[var(--color-muted-foreground)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span className="text-sm text-[var(--color-foreground)] dark:text-gray-300">
              Insights
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpCenterPage;
