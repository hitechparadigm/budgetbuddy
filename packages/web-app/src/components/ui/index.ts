/**
 * UI Primitives barrel export
 *
 * Import from here to keep import paths clean:
 *   import { Button, Card, Badge } from '../components/ui';
 */

export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { Card, SimpleCard } from './Card';
export type { CardProps } from './Card';

export { Badge } from './Badge';
export type { BadgeProps, BadgeVariant } from './Badge';

export { Skeleton, SkeletonText, SkeletonCard, SkeletonRow } from './Skeleton';
export type { SkeletonProps } from './Skeleton';

export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';

export { StatCard } from './StatCard';
export type { StatCardProps, TrendDirection } from './StatCard';

// Also export EmptyState from components root via this barrel
export { EmptyState } from '../EmptyState';
