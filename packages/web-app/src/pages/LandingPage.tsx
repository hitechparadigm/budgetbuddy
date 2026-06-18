/**
 * Landing Page
 *
 * Public-facing page for unauthenticated users.
 * Shows value proposition, features, and sign-up CTA.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui";

const features = [
  {
    icon: "🤖",
    title: "AI-Powered Budgets",
    description:
      "Get personalized budget suggestions based on your location, family size, and local cost of living across 348 cities.",
  },
  {
    icon: "👨‍👩‍👧‍👦",
    title: "Family Collaboration",
    description:
      "Share budgets with your partner. Role-based permissions keep everyone on the same page.",
  },
  {
    icon: "📊",
    title: "Zero-Based Budgeting",
    description:
      "Every dollar gets a job. Track income, expenses, and savings with real-time progress updates.",
  },
  {
    icon: "🏦",
    title: "Bank Sync",
    description:
      "Connect your bank accounts to automatically import transactions. No more manual entry.",
  },
  {
    icon: "📱",
    title: "Multi-Platform",
    description:
      "Access your budget from web, iOS, or Android. Your data syncs instantly across all devices.",
  },
  {
    icon: "🔒",
    title: "Bank-Level Security",
    description:
      "Your data is encrypted at rest and in transit. We never sell your financial information.",
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💰</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                BudgetBuddy
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/auth")}
              >
                Log in
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate("/auth")}
              >
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
            Take control of your
            <span className="text-emerald-600"> family finances</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            AI-powered budgeting that adapts to your life. Create a personalized
            budget in minutes, track spending together, and reach your financial
            goals faster.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate("/auth")}
              className="shadow-lg shadow-emerald-500/25"
            >
              Start Budgeting Free
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate("/about")}
            >
              Learn More
            </Button>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
            Free forever. No credit card required.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Everything you need to budget smarter
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Built for families who want clarity and control over their money.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Ready to take control?
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Join thousands of families who budget smarter with BudgetBuddy.
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate("/auth")}
            className="mt-8 shadow-lg shadow-emerald-500/25"
          >
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">💰</span>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              BudgetBuddy
            </span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500 dark:text-gray-500">
            <button
              onClick={() => navigate("/privacy")}
              className="hover:text-gray-700 dark:hover:text-gray-300 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
            >
              Privacy
            </button>
            <button
              onClick={() => navigate("/terms")}
              className="hover:text-gray-700 dark:hover:text-gray-300 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
            >
              Terms
            </button>
            <button
              onClick={() => navigate("/help")}
              className="hover:text-gray-700 dark:hover:text-gray-300 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
            >
              Help
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            © 2026 BudgetBuddy. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
