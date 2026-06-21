/**
 * Button — Primary UI primitive
 *
 * Variants: primary | secondary | ghost | destructive | outline
 * Sizes: sm | md | lg
 *
 * Routes all styling through CSS design tokens so theme changes
 * propagate automatically.
 */

import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show a loading spinner and disable interaction */
  loading?: boolean;
  /** Render as a full-width block */
  fullWidth?: boolean;
  /** Icon rendered before the label */
  leftIcon?: React.ReactNode;
  /** Icon rendered after the label */
  rightIcon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-primary-foreground)] ' +
    'focus-visible:ring-[var(--color-ring)]',
  secondary:
    'bg-[var(--color-muted)] hover:opacity-80 text-[var(--color-foreground)] ' +
    'border border-[var(--color-border)] focus-visible:ring-[var(--color-ring)]',
  ghost:
    'bg-transparent hover:bg-[var(--color-muted)] text-[var(--color-foreground)] ' +
    'focus-visible:ring-[var(--color-ring)]',
  destructive:
    'bg-[var(--color-destructive)] hover:opacity-90 text-[var(--color-destructive-foreground)] ' +
    'focus-visible:ring-red-500',
  outline:
    'bg-transparent border border-[var(--color-border)] text-[var(--color-foreground)] ' +
    'hover:bg-[var(--color-muted)] focus-visible:ring-[var(--color-ring)]',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  // min-h-[44px] on sm ensures WCAG 2.5.5 touch target compliance on mobile
  sm: 'px-3 py-1.5 text-sm gap-1.5 min-h-[44px] sm:min-h-0',
  md: 'px-4 py-2 text-sm gap-2 min-h-[44px]',
  lg: 'px-6 py-2.5 text-base gap-2 min-h-[44px]',
};

/**
 * Reusable Button component. All variants use CSS token colors.
 *
 * @example
 * <Button variant="primary" size="md" onClick={handleSave}>Save</Button>
 * <Button variant="destructive" loading={isDeleting}>Delete</Button>
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          'inline-flex items-center justify-center font-medium rounded-lg transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          fullWidth ? 'w-full' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
