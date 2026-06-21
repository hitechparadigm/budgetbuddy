/**
 * Error Boundary Component
 *
 * Catches unhandled JavaScript errors in the component tree and displays
 * a user-friendly fallback UI instead of a blank screen.
 *
 * Special case: chunk-load failures after a new deploy (stale hashed chunks)
 * are detected and trigger a one-time auto-reload so users don't see a crash screen.
 */

import { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

/** Returns true when the error looks like a stale lazy-chunk failure */
function isChunkLoadError(error: Error): boolean {
  const msg = error.message || '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    // Vite-specific pattern
    msg.includes('dynamically imported module')
  );
}

const CHUNK_RELOAD_KEY = 'bb_chunk_reload_at';

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const chunkError = isChunkLoadError(error);

    if (chunkError) {
      // Only auto-reload once per 60s to prevent infinite loops
      const lastReload = sessionStorage.getItem(CHUNK_RELOAD_KEY);
      const now = Date.now();
      const canReload = !lastReload || now - parseInt(lastReload, 10) > 60_000;

      if (canReload) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
        // Reload on the next tick so React can finish the current render cycle
        setTimeout(() => window.location.reload(), 50);
        // Return a brief "reloading" state — the reload fires before render completes
        return { hasError: true, error, isChunkError: true };
      }
    }

    return { hasError: true, error, isChunkError: chunkError };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (!isChunkLoadError(error)) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, isChunkError: false });
  };

  handleReload = (): void => {
    window.location.href = "/";
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Chunk error with auto-reload in progress — show minimal loading UI
      if (this.state.isChunkError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-4">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-[var(--color-muted-foreground)]">
                New version available — reloading…
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-6">
              <svg
                className="mx-auto h-16 w-16 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-[var(--color-foreground)] mb-2">
              Something went wrong
            </h1>
            <p className="text-[var(--color-muted-foreground)] mb-6">
              An unexpected error occurred. Please try again or return to the
              home page.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-[var(--color-muted)] text-[var(--color-foreground)] rounded-lg hover:opacity-80 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2"
              >
                Go Home
              </button>
            </div>
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-[var(--color-muted-foreground)] cursor-pointer hover:text-[var(--color-foreground)]">
                  Error details
                </summary>
                <pre className="mt-2 p-3 bg-[var(--color-muted)] rounded text-xs text-red-600 dark:text-red-400 overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
