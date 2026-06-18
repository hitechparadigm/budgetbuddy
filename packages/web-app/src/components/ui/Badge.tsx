/**
 * Badge — Status indicator primitive
 *
 * Variants: success | warning | danger | neutral | primary | outline
 */

import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'primary' | 'outline';

export interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
  /** Render as a dot indicator with no text */
  dot?: boolean;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  danger:  'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  neutral: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
  primary: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  outline: 'border border-[var(--color-border)] text-[var(--color-foreground)] bg-transparent',
};

/**
 * Inline badge for status labels, role indicators, counts, etc.
 *
 * @example
 * <Badge variant="success">Active</Badge>
 * <Badge variant="danger">Overdue</Badge>
 */
export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  className = '',
  dot = false,
  children,
}) => {
  if (dot) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${className}`}
        role="status"
      >
        <span
          className={`w-2 h-2 rounded-full ${VARIANT_CLASSES[variant].split(' ')[0]}`}
          aria-hidden="true"
        />
        {children}
      </span>
    );
  }

  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        VARIANT_CLASSES[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
};
