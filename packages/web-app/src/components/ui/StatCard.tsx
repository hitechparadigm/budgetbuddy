/**
 * StatCard — Labeled number with optional trend indicator
 *
 * Used on Dashboard, Goals, Debt Payoff, Insights pages
 * for key financial metrics.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type TrendDirection = 'up' | 'down' | 'neutral';

export interface StatCardProps {
  /** The metric label */
  label: string;
  /** Primary displayed value (formatted string) */
  value: string;
  /** Optional Lucide icon */
  icon?: LucideIcon;
  /** Icon background color class (Tailwind) */
  iconColor?: string;
  /** Trend delta text, e.g. "+$240 this month" */
  trend?: string;
  /** Whether the trend is positive/negative/neutral (affects color) */
  trendDirection?: TrendDirection;
  /** Loading state */
  loading?: boolean;
  className?: string;
  /** Click handler for navigating to detail */
  onClick?: () => void;
}

const TREND_CLASSES: Record<TrendDirection, string> = {
  up: 'text-green-600 dark:text-green-400',
  down: 'text-red-600 dark:text-red-400',
  neutral: 'text-[var(--color-muted-foreground)]',
};

/**
 * @example
 * <StatCard
 *   label="Monthly Budget"
 *   value="$4,200"
 *   trend="+$240 vs last month"
 *   trendDirection="up"
 *   icon={Wallet}
 * />
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  iconColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  trend,
  trendDirection = 'neutral',
  loading = false,
  className = '',
  onClick,
}) => {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      className={[
        'card p-5 flex items-start gap-4',
        onClick
          ? 'cursor-pointer hover:border-[var(--color-primary)] transition-colors text-left'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      {...(onClick ? { type: 'button' as const } : {})}
    >
      {Icon && (
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}
          aria-hidden="true"
        >
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--color-muted-foreground)] font-medium truncate">
          {label}
        </p>
        {loading ? (
          <div
            className="mt-1 h-7 w-24 rounded animate-pulse bg-[var(--color-muted)]"
            aria-hidden="true"
          />
        ) : (
          <p className="mt-0.5 text-2xl font-semibold text-[var(--color-foreground)] tabular-nums">
            {value}
          </p>
        )}
        {trend && !loading && (
          <p className={`mt-1 text-xs ${TREND_CLASSES[trendDirection]}`}>
            {trend}
          </p>
        )}
      </div>
    </Tag>
  );
};
