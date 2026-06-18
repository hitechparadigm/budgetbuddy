/**
 * Landing Page
 *
 * Public-facing page for unauthenticated users.
 * New headline: "Your budget, built in 60 seconds."
 * Includes hero, 3-step proof section, feature grid, pricing, and footer.
 */

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui";

// Redirect authenticated users away from landing page
function useAuthRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const token = localStorage.getItem('budgetbuddy_id_token');
    if (token) {
      navigate('/overview', { replace: true });
    }
  }, [navigate]);
}

const features = [
  {
    icon: "🤖",
    title: "AI-Powered Budgets",
    description:
      "Tell us your city and household size. We generate a personalized zero-based budget using real cost-of-living data from 348 cities.",
  },
  {
    icon: "👥",
    title: "Built for Collaboration",
    description:
      "Share budgets with a partner, household member, or financial advisor. Role-based permissions keep everyone on the same page.",
  },
  {
    icon: "📊",
    title: "Zero-Based Budgeting",
    description:
      "Every dollar gets a job. Assign income to categories, track spending in real time, and see exactly what's left.",
  },
  {
    icon: "🏦",
    title: "Bank Sync",
    description:
      "Connect your bank accounts to automatically import transactions. Review, approve, and categorize — no manual entry.",
  },
  {
    icon: "🎯",
    title: "Goals & Debt Payoff",
    description:
      "Set savings goals, track milestones, and run snowball or avalanche debt payoff strategies — all in one place.",
  },
  {
    icon: "💡",
    title: "AI Spending Insights",
    description:
      "Ask about your spending in plain English. Get weekly summaries, trend analysis, and proactive budget alerts.",
  },
];

const PROOF_STEPS = [
  { step: '1', label: 'Pick your city', icon: '📍', desc: 'We know cost-of-living for 348 cities worldwide' },
  { step: '2', label: 'AI builds your budget', icon: '🤖', desc: 'Bedrock AI generates categories + amounts in seconds' },
  { step: '3', label: "You're ready", icon: '✅', desc: 'Edit, sync your bank, and start tracking' },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  useAuthRedirect(); // Redirect to /overview if already authenticated

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">$</span>
              </div>
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
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Social proof pill */}
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
            <span>🌍</span>
            <span>Used across 348 cities worldwide</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
            Your budget, built in{' '}
            <span className="text-emerald-600">60 seconds.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Tell us your city and household size. We'll generate a personalized
            zero-based budget using local cost-of-living data. No spreadsheets.
            No guesswork.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate("/auth")}
              className="shadow-lg shadow-emerald-500/25"
            >
              Build my budget — it's free
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                const el = document.getElementById('how-it-works');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              See how it works
            </Button>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
            Free forever. No credit card required.
          </p>
        </div>
      </section>

      {/* How it works — 3-step proof */}
      <section id="how-it-works" className="py-16 px-4 sm:px-6 lg:px-8 bg-emerald-50 dark:bg-emerald-950/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              From zero to budget in 3 steps
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PROOF_STEPS.map(({ step, label, icon, desc }) => (
              <div key={step} className="flex flex-col items-center text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-900">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center justify-center text-xl font-bold mb-4">
                  {step}
                </div>
                <div className="text-2xl mb-2">{icon}</div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{label}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
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
              For individuals, couples, families, and roommates.
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

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-12">
            Start free — upgrade when you're ready.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Free tier */}
            <div className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-left">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Free</h3>
              <p className="text-4xl font-bold text-gray-900 dark:text-white mb-6">$0<span className="text-base font-normal text-gray-500">/mo</span></p>
              <ul className="space-y-3 mb-8 text-gray-600 dark:text-gray-400 text-sm">
                {['1 personal budget', 'AI budget generation', 'Bank account sync (Plaid)', 'Goals & debt payoff tracking', 'Basic spending insights', 'Invite 1 viewer'].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span> {item}
                  </li>
                ))}
              </ul>
              <Button variant="outline" fullWidth onClick={() => navigate('/auth')}>
                Get started free
              </Button>
            </div>
            {/* Premium tier */}
            <div className="border-2 border-emerald-500 rounded-2xl p-8 text-left relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Most popular
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Premium</h3>
              <p className="text-4xl font-bold text-gray-900 dark:text-white mb-6">$9.99<span className="text-base font-normal text-gray-500">/mo</span></p>
              <ul className="space-y-3 mb-8 text-gray-600 dark:text-gray-400 text-sm">
                {['Everything in Free', 'Multiple budgets (personal, family, shared)', 'AI coach with conversation memory', 'Advanced spending reports', 'Data export (CSV, PDF)', 'Budget Health Score history', 'Unlimited members & viewers'].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span> {item}
                  </li>
                ))}
              </ul>
              <Button variant="primary" fullWidth onClick={() => navigate('/auth')}>
                Start free trial
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-emerald-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Your budget, built in 60 seconds.
          </h2>
          <p className="text-lg text-emerald-100 mb-8">
            Join thousands of households across 348 cities who budget smarter with BudgetBuddy.
          </p>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-white text-emerald-700 hover:bg-emerald-50 border-0"
          >
            Build my budget — it's free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">$</span>
            </div>
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
            <button
              onClick={() => navigate("/about")}
              className="hover:text-gray-700 dark:hover:text-gray-300 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
            >
              About
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
