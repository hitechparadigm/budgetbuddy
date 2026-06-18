/**
 * EmptyState Component
 *
 * Consistent empty state UI used when a page has no data to display.
 * Includes an icon, title, description, and optional CTA button.
 * Uses CSS design tokens for consistent theming.
 */

import React from 'react';
import { Button } from './ui';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  /** Lucide icon component (preferred) or emoji string */
  icon?: LucideIcon | string;
  /** Main heading */
  title: string;
  /** Supporting description */
  description?: string;
  /** Primary CTA button label */
  actionLabel?: string;
  /** Primary CTA button handler */
  onAction?: () => void;
  /** Secondary link/action */
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  className = '',
}) => {
  const isLucideIcon = icon && typeof icon !== 'string';

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      {icon && (
        <div className="mb-4" aria-hidden="true">
          {isLucideIcon ? (
            <div className="w-12 h-12 rounded-full bg-[var(--color-muted)] flex items-center justify-center mx-auto">
              {React.createElement(icon as LucideIcon, {
                className: 'w-6 h-6 text-[var(--color-muted-foreground)]',
              })}
            </div>
          ) : (
            <span className="text-5xl">{icon as string}</span>
          )}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[var(--color-muted-foreground)] max-w-sm mb-6">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
          {secondaryLabel && onSecondaryAction && (
            <Button variant="ghost" size="sm" onClick={onSecondaryAction}>
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
