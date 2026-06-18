/**
 * PageHeader — Consistent title + subtitle + action slot
 *
 * Applied to every page for visual consistency. Eliminates the
 * per-page title/subtitle markup duplication.
 */

import React from 'react';

export interface PageHeaderProps {
  title: string;
  /** Optional subtitle — can include dynamic stats (e.g. "3 active · $12,400 saved") */
  subtitle?: React.ReactNode;
  /** Right-aligned slot — primary action button(s), filters, etc. */
  action?: React.ReactNode;
  /** Back button or breadcrumbs rendered above the title */
  breadcrumb?: React.ReactNode;
  className?: string;
}

/**
 * Standardized page header.
 *
 * @example
 * <PageHeader
 *   title="Goals"
 *   subtitle="3 active · $12,400 saved of $28,000 total"
 *   action={<Button variant="primary" size="sm">Add Goal</Button>}
 * />
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  action,
  breadcrumb,
  className = '',
}) => (
  <div className={`mb-6 ${className}`}>
    {breadcrumb && (
      <div className="mb-2 text-sm text-[var(--color-muted-foreground)]">
        {breadcrumb}
      </div>
    )}
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)] truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="shrink-0 flex items-center gap-2">{action}</div>
      )}
    </div>
  </div>
);
