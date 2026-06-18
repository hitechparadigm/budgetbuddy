/**
 * Skeleton — Animated loading placeholder
 *
 * Use in place of content while data is loading.
 * Dramatically reduces perceived load time vs. full-page spinners.
 */

import React from 'react';

export interface SkeletonProps {
  /** Width (Tailwind class or inline style) */
  width?: string;
  /** Height (Tailwind class or inline style) */
  height?: string;
  /** Fully round (for avatars/circles) */
  circle?: boolean;
  className?: string;
}

/**
 * Single skeleton block.
 *
 * @example
 * <Skeleton className="h-4 w-48" />
 * <Skeleton circle className="w-10 h-10" />
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  circle = false,
  className = '',
}) => (
  <div
    className={[
      'animate-pulse bg-[var(--color-muted)]',
      circle ? 'rounded-full' : 'rounded',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    aria-hidden="true"
  />
);

/** A block of multiple skeleton lines — mimics a text paragraph */
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div className={`space-y-2 ${className}`} aria-hidden="true">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
      />
    ))}
  </div>
);

/** A card-shaped skeleton for list/grid items */
export const SkeletonCard: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <div className={`card p-5 ${className}`} aria-hidden="true">
    <div className="flex items-center gap-3 mb-4">
      <Skeleton circle className="w-10 h-10 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <SkeletonText lines={2} />
  </div>
);

/** Row skeleton for table/list layouts */
export const SkeletonRow: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <div
    className={`flex items-center gap-3 py-3 border-b border-[var(--color-border)] ${className}`}
    aria-hidden="true"
  >
    <Skeleton className="h-4 w-4 shrink-0" />
    <Skeleton className="h-4 flex-1" />
    <Skeleton className="h-4 w-20 shrink-0" />
    <Skeleton className="h-4 w-16 shrink-0" />
  </div>
);
