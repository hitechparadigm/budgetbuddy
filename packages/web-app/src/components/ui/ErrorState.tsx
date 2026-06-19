/**
 * ErrorState component
 *
 * Three variants:
 * - "network" — couldn't connect, shows retry button
 * - "auth"    — session expired, redirects to /auth?returnTo=<current>
 * - "partial" — inline section error (doesn't collapse the whole page)
 *
 * Usage:
 *   <ErrorState type="network" onRetry={loadData} />
 *   <ErrorState type="auth" />
 *   <ErrorState type="partial" message="Couldn't load trends" onRetry={loadTrends} />
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { WifiOff, RefreshCw, LogIn, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  type?: 'network' | 'auth' | 'partial';
  message?: string;
  onRetry?: () => void;
  /** Override the return-to URL for auth redirects (defaults to current path) */
  returnTo?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  type = 'network',
  message,
  onRetry,
  returnTo,
  className = '',
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (type === 'auth') {
    const target = returnTo ?? location.pathname + location.search;
    const encoded = encodeURIComponent(target);
    return (
      <div
        role="alert"
        className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
      >
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
          <LogIn className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="font-semibold text-[var(--color-foreground)] mb-1">Session expired</h3>
        <p className="text-sm text-[var(--color-muted-foreground)] mb-4 max-w-xs">
          {message ?? 'Your session has expired. Please log in again to continue.'}
        </p>
        <Button
          variant="primary"
          leftIcon={<LogIn className="w-4 h-4" />}
          onClick={() => navigate(`/auth?returnTo=${encoded}`)}
        >
          Log in again
        </Button>
      </div>
    );
  }

  if (type === 'partial') {
    return (
      <div
        role="alert"
        className={`flex items-center gap-3 p-4 rounded-lg bg-[var(--color-muted)] border border-[var(--color-border)] ${className}`}
      >
        <AlertCircle className="w-4 h-4 text-[var(--color-muted-foreground)] shrink-0" />
        <span className="text-sm text-[var(--color-muted-foreground)] flex-1">
          {message ?? 'This section couldn\'t load.'}
        </span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm text-[var(--color-primary)] hover:underline shrink-0 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
      </div>
    );
  }

  // Default: network error
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
        <WifiOff className="w-6 h-6 text-red-500 dark:text-red-400" />
      </div>
      <h3 className="font-semibold text-[var(--color-foreground)] mb-1">
        Couldn't connect
      </h3>
      <p className="text-sm text-[var(--color-muted-foreground)] mb-4 max-w-xs">
        {message ?? 'Check your internet connection, then try again.'}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={onRetry}
        >
          Retry
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
