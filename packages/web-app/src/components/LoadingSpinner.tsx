/**
 * LoadingSpinner Component
 *
 * Consistent loading indicator used across all pages.
 * Supports full-page, inline, and overlay variants.
 */

interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: "sm" | "md" | "lg";
  /** Optional message to display below the spinner */
  message?: string;
  /** Whether to center in the full viewport */
  fullPage?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  message,
  fullPage = false,
}) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-4",
  };

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`${sizeClasses[size]} rounded-full border-[var(--color-border)] border-t-emerald-600 animate-spin`}
        role="status"
        aria-label={message || "Loading"}
      />
      {message && (
        <p className="text-sm text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)]">{message}</p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] dark:bg-gray-900">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">{spinner}</div>
  );
};
