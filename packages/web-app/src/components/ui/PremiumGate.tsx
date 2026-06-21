/**
 * PremiumGate — Contextual premium upgrade prompt
 *
 * Design principle: Show the feature, then gate it.
 * Never hide the existence of a premium feature — show a preview/blur
 * and a soft "Upgrade" button. Don't hard-block with a modal.
 *
 * Usage:
 *   <PremiumGate
 *     feature="AI Coach with memory"
 *     description="Keep your conversation history and get personalized advice."
 *   >
 *     <ActualFeatureContent />  ← shown blurred when not premium
 *   </PremiumGate>
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from './Button';

export interface PremiumGateProps {
  /** Feature name displayed in the gate */
  feature: string;
  /** One-line description of what Premium unlocks */
  description?: string;
  /** Whether the user is premium (gate not shown when true) */
  isPremium?: boolean;
  /** Show children blurred behind the gate */
  blurChildren?: boolean;
  children?: React.ReactNode;
  className?: string;
  /** Optional override for the upgrade action (defaults to navigating to /pricing) */
  onUpgrade?: () => void;
}

/**
 * Contextual premium gate — soft, non-blocking.
 *
 * @example
 * <PremiumGate feature="AI Coach memory" description="Remembers your last 30 conversations.">
 *   <AIChatHistory />
 * </PremiumGate>
 */
export const PremiumGate: React.FC<PremiumGateProps> = ({
  feature,
  description,
  isPremium = false,
  blurChildren = true,
  children,
  className = '',
  onUpgrade,
}) => {
  // If premium, render children directly
  if (isPremium) {
    return <>{children}</>;
  }

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Navigate to pricing page (use window.location to avoid React Router dependency)
      window.location.href = '/auth?upgrade=1';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Blurred preview of children */}
      {children && blurChildren && (
        <div className="pointer-events-none select-none blur-sm opacity-60" aria-hidden="true">
          {children}
        </div>
      )}

      {/* Gate overlay */}
      <div
        className={[
          'rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-5',
          children && blurChildren ? 'absolute inset-0 flex items-center justify-center bg-amber-50/90 dark:bg-gray-900/90' : '',
        ].join(' ')}
      >
        <div className="text-center max-w-xs mx-auto">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--color-foreground)] dark:text-white mb-1">
            {feature} is a Premium feature
          </h3>
          {description && (
            <p className="text-xs text-[var(--color-muted-foreground)] dark:text-[var(--color-muted-foreground)] mb-4">
              {description}
            </p>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleUpgrade}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Upgrade to Premium
          </Button>
          <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">$9.99/mo — cancel anytime</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Inline premium badge — for small feature hints inside existing UI.
 * Shows without blurring children.
 */
export const PremiumBadge: React.FC<{
  feature: string;
  onUpgrade?: () => void;
}> = ({ feature, onUpgrade }) => (
  <button
    onClick={onUpgrade || (() => { window.location.href = '/auth?upgrade=1'; })}
    className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium hover:bg-amber-200 dark:hover:bg-amber-800/40 transition-colors"
    title={`${feature} requires Premium`}
  >
    <Sparkles className="w-3 h-3" aria-hidden="true" />
    Premium
  </button>
);
