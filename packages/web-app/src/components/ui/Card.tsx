/**
 * Card — Surface container primitive
 *
 * Wraps the `.card` CSS utility (bg-surface + border + rounded + shadow-sm).
 * Supports optional header and footer slots.
 */

import React from 'react';

export interface CardProps {
  /** Card header content (title, subtitle, action buttons) */
  header?: React.ReactNode;
  /** Card footer content */
  footer?: React.ReactNode;
  /** Extra classes on the root element */
  className?: string;
  /** Extra classes on the body (padding area) */
  bodyClassName?: string;
  children?: React.ReactNode;
  /** Remove default body padding */
  noPadding?: boolean;
}

/**
 * Card container. Uses `.card` CSS utility for consistent theming.
 *
 * @example
 * <Card header={<h2>Budget Summary</h2>}>
 *   <p>Content here</p>
 * </Card>
 */
export const Card: React.FC<CardProps> = ({
  header,
  footer,
  className = '',
  bodyClassName = '',
  noPadding = false,
  children,
}) => {
  return (
    <div className={`card ${className}`}>
      {header && (
        <div className="px-5 py-4 border-b border-[var(--color-border)]">
          {header}
        </div>
      )}
      <div className={noPadding ? '' : `p-5 ${bodyClassName}`}>
        {children}
      </div>
      {footer && (
        <div className="px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-muted)] rounded-b-lg">
          {footer}
        </div>
      )}
    </div>
  );
};

/**
 * Minimal card with no header/footer slots — for simple content blocks.
 */
export const SimpleCard: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className = '', children }) => (
  <div className={`card p-5 ${className}`}>{children}</div>
);
