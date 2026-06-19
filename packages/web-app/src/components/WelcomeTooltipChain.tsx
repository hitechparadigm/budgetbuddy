/**
 * WelcomeTooltipChain
 *
 * 3-step tooltip chain shown on first login to the Overview page.
 * Highlights the three most important features in sequence:
 * 1. Financial Health Bar
 * 2. AI Insight of the Day
 * 3. Quick Add Transaction
 *
 * Uses localStorage key "budgetbuddy_welcome_seen" to show only once.
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, BarChart2, Plus, X, ChevronRight } from 'lucide-react';
import { Button } from './ui';

const STORAGE_KEY = 'budgetbuddy_welcome_seen';

const STEPS = [
  {
    icon: <BarChart2 className="w-7 h-7 text-[var(--color-primary)]" />,
    title: 'Your Financial Health at a Glance',
    body: "The Financial Health Bar shows how much of your income you've assigned and spent this month. Aim to keep it green — fully budgeted and on track.",
  },
  {
    icon: <Sparkles className="w-7 h-7 text-[var(--color-primary)]" />,
    title: 'AI Insight Every Day',
    body: "Your AI coach surfaces a fresh spending insight at the top of this page every day. Click 'Insights' in the sidebar to ask it anything about your finances.",
  },
  {
    icon: <Plus className="w-7 h-7 text-[var(--color-primary)]" />,
    title: 'Add Transactions in Seconds',
    body: "Hit the 'Add Transaction' button (or press T on your keyboard on the Budget page) to log a purchase instantly — no modal, just fast entry.",
  },
];

export const WelcomeTooltipChain: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Only show on first visit
    if (!localStorage.getItem(STORAGE_KEY)) {
      // Small delay so the page has loaded before the tooltip appears
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <>
      {/* Backdrop — semi-transparent, clicking dismisses */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Tooltip card — centered, above backdrop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-tooltip-title"
        aria-describedby="welcome-tooltip-body"
        className="fixed z-50 bottom-8 left-1/2 -translate-x-1/2 w-full max-w-sm bg-[var(--color-surface)] rounded-2xl shadow-2xl border border-[var(--color-border)] p-6 mx-4"
      >
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] rounded-full p-1"
          aria-label="Dismiss welcome tour"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step dots */}
        <div className="flex gap-1.5 mb-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? 'bg-[var(--color-primary)] w-5'
                  : 'bg-[var(--color-muted)] w-1.5'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="mb-3">{current.icon}</div>

        {/* Content */}
        <h3
          id="welcome-tooltip-title"
          className="text-base font-semibold text-[var(--color-foreground)] mb-2"
        >
          {current.title}
        </h3>
        <p
          id="welcome-tooltip-body"
          className="text-sm text-[var(--color-muted-foreground)] leading-relaxed mb-5"
        >
          {current.body}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={dismiss}
            className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          >
            Skip tour
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={next}
            rightIcon={<ChevronRight className="w-4 h-4" />}
          >
            {step < STEPS.length - 1 ? 'Next' : 'Get started'}
          </Button>
        </div>
      </div>
    </>
  );
};

export default WelcomeTooltipChain;
