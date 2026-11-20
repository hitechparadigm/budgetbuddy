/**
 * Google Sign-In Section
 * The Google button plus its "or continue with email" divider, shown only when
 * config.enableGoogleSignIn is on (VITE_ENABLE_GOOGLE_SIGNIN=true; default off).
 *
 * The button is lazy-loaded so that, with the flag off, @react-oauth/google is not
 * fetched and the Google Identity Services script is never injected.
 */

import React, { Suspense } from 'react';
import { config } from '../../config/environment';

const LazyGoogleSignInButton = config.enableGoogleSignIn
  ? React.lazy(() => import('./GoogleSignInButton'))
  : null;

interface GoogleSignInSectionProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  /** Divider text between the Google button and the email form. */
  dividerLabel: string;
}

export const GoogleSignInSection: React.FC<GoogleSignInSectionProps> = ({
  onSuccess,
  onError,
  dividerLabel,
}) => {
  if (!LazyGoogleSignInButton) return null;

  return (
    <>
      <div className="mb-6">
        <Suspense fallback={null}>
          <LazyGoogleSignInButton onSuccess={onSuccess} onError={onError} />
        </Suspense>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--color-border)] dark:border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-[var(--color-surface)] dark:bg-gray-800 text-[var(--color-muted-foreground)]">
            {dividerLabel}
          </span>
        </div>
      </div>
    </>
  );
};
