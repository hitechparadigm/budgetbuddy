/**
 * Pricing Page
 *
 * Standalone /pricing page with Free vs Premium comparison table.
 * Linked from in-app upgrade prompts so users can explore features
 * without leaving the authenticated flow.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  X,
  Zap,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  BarChart3,
} from 'lucide-react';
import { Button } from '../components/ui';

interface PlanFeature {
  label: string;
  free: boolean | string;
  premium: boolean | string;
  highlight?: boolean;
}

const FEATURES: PlanFeature[] = [
  { label: 'Zero-based budget builder', free: true, premium: true },
  { label: 'AI-powered budget generation', free: true, premium: true, highlight: true },
  { label: 'Bank account sync (Plaid)', free: true, premium: true },
  { label: 'Transaction tracking', free: true, premium: true },
  { label: 'Savings goals', free: '3 goals', premium: 'Unlimited', highlight: true },
  { label: 'Budget collaboration', free: '1 partner', premium: 'Up to 5 members', highlight: true },
  { label: 'Bills & subscription tracking', free: true, premium: true },
  { label: 'Debt payoff calculator', free: true, premium: true },
  { label: 'Weekly spending insights', free: true, premium: true },
  { label: 'AI financial coach', free: 'Session only', premium: 'Full memory', highlight: true },
  { label: 'AI conversation history', free: false, premium: true, highlight: true },
  { label: 'Budget Health Score', free: 'Current month', premium: '12-month history', highlight: true },
  { label: 'Advanced reports & analytics', free: false, premium: true },
  { label: 'Data export (CSV / PDF)', free: false, premium: true, highlight: true },
  { label: 'Priority support', free: false, premium: true },
  { label: 'Ad-free experience', free: false, premium: true },
  { label: 'Multiple budgets', free: false, premium: true },
];

const Cell: React.FC<{ value: boolean | string; isPremium?: boolean }> = ({ value, isPremium }) => {
  if (value === true) {
    return (
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${isPremium ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
        <Check className="w-4 h-4" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 text-[var(--color-muted-foreground)]">
        <X className="w-4 h-4" />
      </span>
    );
  }
  return (
    <span className={`text-sm font-medium ${isPremium ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted-foreground)]'}`}>
      {value}
    </span>
  );
};

export const PricingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Nav bar */}
      <nav className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] flex items-center gap-1"
        >
          ← Back
        </button>
        <span className="font-bold text-[var(--color-foreground)]">BudgetBuddy</span>
        <Button variant="primary" size="sm" onClick={() => navigate('/auth')}>
          Get started free
        </Button>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-foreground)] mb-3">
            Simple, honest pricing
          </h1>
          <p className="text-lg text-[var(--color-muted-foreground)] max-w-xl mx-auto">
            Start free. Upgrade when you're ready for the full AI experience.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Free */}
          <div className="card p-8 border-2 border-[var(--color-border)]">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-[var(--color-muted-foreground)]" />
              <h2 className="text-xl font-bold text-[var(--color-foreground)]">Free</h2>
            </div>
            <p className="text-[var(--color-muted-foreground)] text-sm mb-6">
              Everything you need to start budgeting.
            </p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-[var(--color-foreground)]">$0</span>
              <span className="text-[var(--color-muted-foreground)] ml-1">/month, forever</span>
            </div>
            <Button variant="outline" fullWidth onClick={() => navigate('/auth')}>
              Get started free
            </Button>
          </div>

          {/* Premium */}
          <div className="card p-8 border-2 border-[var(--color-primary)] relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-[var(--color-primary)] text-white text-xs font-bold px-3 py-1 rounded-full">
              MOST POPULAR
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-xl font-bold text-[var(--color-foreground)]">Premium</h2>
            </div>
            <p className="text-[var(--color-muted-foreground)] text-sm mb-6">
              The full AI financial coaching experience.
            </p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-[var(--color-foreground)]">$9.99</span>
              <span className="text-[var(--color-muted-foreground)] ml-1">/month</span>
            </div>
            <Button variant="primary" fullWidth onClick={() => navigate('/auth?upgrade=1')}>
              Start Premium — 14 days free
            </Button>
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="card overflow-hidden">
          <div className="grid grid-cols-3 bg-[var(--color-muted)]/40 px-6 py-4 text-sm font-medium text-[var(--color-muted-foreground)]">
            <div>Feature</div>
            <div className="text-center">Free</div>
            <div className="text-center text-[var(--color-primary)]">Premium</div>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 px-6 py-3.5 items-center ${feature.highlight ? 'bg-[var(--color-primary)]/5' : ''}`}
              >
                <span className={`text-sm ${feature.highlight ? 'font-medium text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)]'}`}>
                  {feature.label}
                </span>
                <div className="flex justify-center">
                  <Cell value={feature.free} />
                </div>
                <div className="flex justify-center">
                  <Cell value={feature.premium} isPremium />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Value props */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
          {[
            {
              icon: <Sparkles className="w-6 h-6 text-[var(--color-primary)]" />,
              title: 'AI that remembers you',
              desc: 'Premium AI coach retains your conversation history and budget context across every session.',
            },
            {
              icon: <TrendingUp className="w-6 h-6 text-[var(--color-primary)]" />,
              title: '12-month health score',
              desc: 'Track your financial wellness over time with a single score that covers savings, budgeting, and goals.',
            },
            {
              icon: <Users className="w-6 h-6 text-[var(--color-primary)]" />,
              title: 'Grow your budget team',
              desc: 'Add up to 5 collaborators with role-based permissions — partners, household members, or advisors.',
            },
            {
              icon: <BarChart3 className="w-6 h-6 text-[var(--color-primary)]" />,
              title: 'Export everything',
              desc: 'Download your full transaction history and budget reports as CSV or PDF for taxes or analysis.',
            },
          ].map((prop, i) => (
            <div key={i} className="card p-5">
              <div className="mb-3">{prop.icon}</div>
              <h3 className="font-semibold text-[var(--color-foreground)] mb-1">{prop.title}</h3>
              <p className="text-sm text-[var(--color-muted-foreground)]">{prop.desc}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-[var(--color-foreground)] mb-6 text-center">Common questions</h2>
          <div className="space-y-4 max-w-2xl mx-auto">
            {[
              {
                q: 'Can I switch plans anytime?',
                a: 'Yes. Upgrade or downgrade at any time. If you downgrade mid-month, you keep Premium access until the end of your billing period.',
              },
              {
                q: 'Is my financial data safe?',
                a: 'All data is encrypted at rest and in transit. Bank connections use Plaid — we never store your banking credentials.',
              },
              {
                q: 'What happens to my data if I cancel?',
                a: 'Your budgets and transaction history are preserved if you return. You can also export everything before cancelling.',
              },
              {
                q: 'Does the free plan have ads?',
                a: 'The free plan may include contextual upgrade prompts within the app. Premium is completely ad-free.',
              },
            ].map((faq, i) => (
              <div key={i} className="card p-5">
                <h3 className="font-medium text-[var(--color-foreground)] mb-1">{faq.q}</h3>
                <p className="text-sm text-[var(--color-muted-foreground)]">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center card p-8 bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20">
          <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
            Ready to take control of your money?
          </h2>
          <p className="text-[var(--color-muted-foreground)] mb-6">
            Join thousands of users who've built better financial habits with BudgetBuddy.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button variant="primary" size="lg" onClick={() => navigate('/auth')}>
              Start for free
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/auth?upgrade=1')}>
              Try Premium free for 14 days
            </Button>
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-3">No credit card required for the free plan.</p>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
