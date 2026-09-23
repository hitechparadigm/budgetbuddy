/**
 * AiCoachChip — contextual floating AI coach button for BudgetPage.
 *
 * Surfaces a short, data-driven prompt based on the current budget state
 * (over-budget categories, unallocated income, spending pace) and opens
 * the Insights page when clicked so the user can chat with the AI coach.
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@budget-buddy/shared/src/utils/currency';

interface BudgetSummary {
  income: number;
  planned: number;
  spent: number;
  remaining: number;
  /** Categories where spent > planned */
  overBudgetCount: number;
  /** Name of the most-overspent category, if any */
  topOverBudgetCategory?: string;
  currency?: string;
}

interface AiCoachChipProps {
  summary: BudgetSummary;
  /** Whether a budget exists for the current month */
  hasBudget: boolean;
}

/**
 * Derives a short, contextual prompt label from the budget summary.
 * The label changes based on what matters most right now.
 */
function derivePrompt(summary: BudgetSummary): string {
  const { income, planned, spent, remaining, overBudgetCount, topOverBudgetCategory, currency = 'USD' } = summary;

  if (overBudgetCount > 0 && topOverBudgetCategory) {
    return `${topOverBudgetCategory} is over budget — ask AI`;
  }

  if (remaining < 0) {
    const over = formatCurrency(Math.abs(remaining), currency);
    return `${over} over-assigned — ask AI`;
  }

  if (remaining > 0 && income > 0) {
    const pct = Math.round((remaining / income) * 100);
    if (pct >= 20) {
      const amount = formatCurrency(remaining, currency);
      return `${amount} unallocated — ask AI`;
    }
  }

  if (spent > 0 && planned > 0) {
    const pct = Math.round((spent / planned) * 100);
    if (pct >= 80) {
      return `${pct}% spent — ask AI coach`;
    }
  }

  return 'Ask AI Coach';
}

export const AiCoachChip: React.FC<AiCoachChipProps> = ({ summary, hasBudget }) => {
  const navigate = useNavigate();
  const label = useMemo(() => derivePrompt(summary), [summary]);

  // Only show when a budget exists — no point prompting on empty state
  if (!hasBudget) return null;

  const hasAlert = summary.overBudgetCount > 0 || summary.remaining < 0;

  return (
    <button
      onClick={() => navigate('/insights')}
      className={
        `fixed bottom-6 left-1/2 -translate-x-1/2 z-30
        flex items-center gap-2 px-4 py-2.5
        rounded-full shadow-lg border
        text-sm font-medium
        transition-all duration-200
        hover:scale-105 active:scale-95
        ${
          hasAlert
            ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50'
            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)]'
        }`
      }
      aria-label="Open AI Coach"
    >
      {/* Sparkle icon */}
      <svg
        className={`w-4 h-4 flex-shrink-0 ${
          hasAlert ? 'text-amber-500' : 'text-[var(--color-primary)]'
        }`}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
      </svg>
      <span className="truncate max-w-[220px]">{label}</span>
    </button>
  );
};

export default AiCoachChip;
