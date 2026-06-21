/**
 * Subscriptions Page — Know what you're paying for
 *
 * AI-powered subscription detection with 3-action workflow (Keep / Remind to Cancel / Ignore).
 * Cancel reminders are created as Bill entries so they show up in the bills calendar.
 * No manual "Add Subscription" form — detection is the primary entry point.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { config } from '../config/environment';
import { PageHeader } from '../components/ui';

const FEATURES_API = config.featuresApiUrl;
const MAIN_API = config.apiBaseUrl;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Subscription {
  subscriptionId: string;
  name: string;
  merchant: string;
  amount: number;
  frequency: string;
  monthlyAmount: number;
  category: string;
  nextBillingDate: string;
  daysUntilRenewal: number;
  status: 'active' | 'paused' | 'cancelled';
  reviewStatus: 'keep' | 'review' | 'cancel';
  cancelReminderDate?: string;
  notes: string | null;
}

interface DetectedSubscription {
  merchant: string;
  amount: number;
  frequency: string;
  confidence: number;
  lastTransaction: string;
  transactionCount: number;
  suggestedCategory: string;
}

interface Summary {
  totalSubscriptions: number;
  activeSubscriptions: number;
  monthlyTotal: number;
  yearlyTotal: number;
  byStatus: { keep: number; review: number; cancel: number };
  byCategory: Record<string, { count: number; monthlyTotal: number }>;
  upcomingRenewals: number;
}

/** Which detected card is showing the inline date picker */
type CancelPickerState = { merchant: string; date: string } | null;

/** Which tracked subscription is showing the inline cancel reminder form */
type TrackedCancelState = { subscriptionId: string; date: string } | null;

// ─── Category icons ────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  entertainment: '🎬',
  streaming: '📺',
  music: '🎵',
  gaming: '🎮',
  software: '💻',
  productivity: '📋',
  health: '💊',
  fitness: '🏋️',
  news: '📰',
  food: '🍔',
  shopping: '🛍️',
  cloud: '☁️',
  security: '🔒',
  finance: '💳',
  subscription: '🔄',
  other: '📦',
};

function getCategoryIcon(category: string): string {
  const key = (category || '').toLowerCase();
  return CATEGORY_ICONS[key] ?? '🔄';
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'High confidence';
  if (confidence >= 0.5) return 'Medium confidence';
  return 'Low confidence';
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'bg-green-500';
  if (confidence >= 0.5) return 'bg-yellow-500';
  return 'bg-red-400';
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const { tokens } = useAuth();
  const token = tokens?.idToken;

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [detected, setDetected] = useState<DetectedSubscription[]>([]);
  const [ignoredMerchants, setIgnoredMerchants] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showDetectionBanner, setShowDetectionBanner] = useState(false);

  // Inline cancel picker states
  const [detectedCancelPicker, setDetectedCancelPicker] = useState<CancelPickerState>(null);
  const [trackedCancelPicker, setTrackedCancelPicker] = useState<TrackedCancelState>(null);
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Prevent double auto-scan
  const autoScanFired = useRef(false);

  // ── Data loading ─────────────────────────────────────────────────────────────

  const loadSubscriptions = useCallback(async () => {
    if (!token) { setError('Not authenticated'); setLoading(false); return; }
    try {
      setError(null);
      const [subsRes, summaryRes] = await Promise.all([
        fetch(`${FEATURES_API}/subscriptions`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        }),
        fetch(`${FEATURES_API}/subscriptions/summary`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        }),
      ]);

      if (!subsRes.ok || !summaryRes.ok) throw new Error('Failed to load subscriptions');

      const subsData = await subsRes.json();
      const summaryData = await summaryRes.json();

      setSubscriptions(subsData.data?.subscriptions || []);
      setSummary(summaryData.data?.summary || null);
    } catch (err) {
      console.error('Error loading subscriptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const detectSubscriptions = useCallback(async () => {
    if (!token) return;
    try {
      setDetecting(true);
      setError(null);
      const res = await fetch(`${FEATURES_API}/subscriptions/detect`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to detect subscriptions');
      const data = await res.json();
      const found: DetectedSubscription[] = (data.data?.detected || []).filter(
        (d: DetectedSubscription) => !ignoredMerchants.has(d.merchant),
      );
      setDetected(found);
      setShowDetectionBanner(true);
    } catch (err) {
      console.error('Error detecting subscriptions:', err);
      setError('Failed to scan transactions. Try again shortly.');
    } finally {
      setDetecting(false);
    }
  }, [token, ignoredMerchants]);

  // Auto-scan on first load if no subscriptions
  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  useEffect(() => {
    if (!loading && subscriptions.length === 0 && !autoScanFired.current) {
      autoScanFired.current = true;
      detectSubscriptions();
    }
  }, [loading, subscriptions.length, detectSubscriptions]);

  // Auto-dismiss success message
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 4000);
    return () => clearTimeout(t);
  }, [successMsg]);

  // ── Detection actions ─────────────────────────────────────────────────────────

  const handleKeep = async (d: DetectedSubscription) => {
    if (!token) return;
    try {
      const res = await fetch(`${FEATURES_API}/subscriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: d.merchant,
          merchant: d.merchant,
          amount: d.amount,
          frequency: d.frequency,
          category: d.suggestedCategory,
          reviewStatus: 'keep',
        }),
      });
      if (!res.ok) throw new Error('Failed to add subscription');
      setDetected(prev => prev.filter(x => x.merchant !== d.merchant));
      setSuccessMsg(`✅ ${d.merchant} added to your tracked subscriptions.`);
      await loadSubscriptions();
    } catch (err) {
      console.error(err);
      setError('Failed to add subscription. Try again.');
    }
  };

  const handleIgnore = (d: DetectedSubscription) => {
    setIgnoredMerchants(prev => new Set([...prev, d.merchant]));
    setDetected(prev => prev.filter(x => x.merchant !== d.merchant));
  };

  // Cancel reminder for detected subscription
  const handleDetectedCancelReminder = async (d: DetectedSubscription, cancelDate: string) => {
    if (!token || savingReminder) return;
    try {
      setSavingReminder(true);
      // 1. Add to tracked subscriptions with status 'cancel'
      const subRes = await fetch(`${FEATURES_API}/subscriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: d.merchant,
          merchant: d.merchant,
          amount: d.amount,
          frequency: d.frequency,
          category: d.suggestedCategory,
          reviewStatus: 'cancel',
        }),
      });
      if (!subRes.ok) throw new Error('Failed to add subscription');

      // 2. Create a Bill reminder
      await createCancelBill(d.merchant, d.amount, cancelDate, token);

      setDetected(prev => prev.filter(x => x.merchant !== d.merchant));
      setDetectedCancelPicker(null);
      setSuccessMsg(`⏰ Reminder set! We'll remind you to cancel ${d.merchant} on ${formatDate(cancelDate)}.`);
      await loadSubscriptions();
    } catch (err) {
      console.error(err);
      setError('Failed to set cancel reminder. Try again.');
    } finally {
      setSavingReminder(false);
    }
  };

  // Cancel reminder for tracked subscription
  const handleTrackedCancelReminder = async (sub: Subscription, cancelDate: string) => {
    if (!token || savingReminder) return;
    try {
      setSavingReminder(true);
      // Update review status to 'cancel'
      await fetch(`${FEATURES_API}/subscriptions/${sub.subscriptionId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewStatus: 'cancel' }),
      });
      // Create bill reminder
      await createCancelBill(sub.merchant || sub.name, sub.amount, cancelDate, token);

      setTrackedCancelPicker(null);
      setSuccessMsg(`⏰ Reminder set! We'll remind you to cancel ${sub.merchant || sub.name} on ${formatDate(cancelDate)}.`);
      await loadSubscriptions();
    } catch (err) {
      console.error(err);
      setError('Failed to set cancel reminder. Try again.');
    } finally {
      setSavingReminder(false);
    }
  };

  const updateSubscriptionStatus = async (
    subscriptionId: string,
    status?: string,
    reviewStatus?: string,
  ) => {
    if (!token) return;
    try {
      const res = await fetch(`${FEATURES_API}/subscriptions/${subscriptionId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      await loadSubscriptions();
    } catch (err) {
      console.error(err);
      setError('Failed to update subscription status.');
    }
  };

  const removeSubscription = async (subscriptionId: string, name: string) => {
    if (!token) return;
    // Use controlled state confirmation instead of window.confirm
    setDeleteConfirm({ id: subscriptionId, name });
  };

  const confirmRemoveSubscription = async () => {
    if (!token || !deleteConfirm) return;
    const { id } = deleteConfirm;
    setDeleteConfirm(null);
    try {
      const res = await fetch(`${FEATURES_API}/subscriptions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to remove');
      await loadSubscriptions();
    } catch (err) {
      console.error(err);
      setError('Failed to remove subscription.');
    }
  };

  // ── Computed stats ────────────────────────────────────────────────────────────

  const potentialSavings = subscriptions
    .filter(s => s.reviewStatus === 'cancel')
    .reduce((sum, s) => sum + (s.monthlyAmount || s.amount), 0);

  const reviewNeeded = subscriptions.filter(s => s.reviewStatus === 'review').length;

  const visibleDetected = detected.filter(d => !ignoredMerchants.has(d.merchant));

  // ── Loading state ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-[var(--color-muted-foreground)]">Loading your subscriptions…</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-xl shadow-xl p-6 max-w-sm mx-4 w-full">
            <h3 className="font-semibold text-[var(--color-foreground)] mb-2">Remove subscription?</h3>
            <p className="text-sm text-[var(--color-muted-foreground)] mb-5">
              Remove <strong>{deleteConfirm.name}</strong> from your tracked subscriptions? This won't cancel the subscription itself.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmRemoveSubscription}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                Remove
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 border border-[var(--color-border)] text-[var(--color-foreground)] rounded-lg hover:bg-[var(--color-muted)] text-sm"
              >
                Keep it
              </button>
            </div>
          </div>
        </div>
      )}
      <PageHeader
        title="🔄 Subscriptions"
        subtitle="Know what you're paying for"
        action={
          <button
            onClick={detectSubscriptions}
            disabled={detecting}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-60 transition-colors font-medium shadow-sm"
          >
            {detecting ? (
              <>
                <span className="animate-spin inline-block">⟳</span>
                Scanning…
              </>
            ) : (
              <>🔍 Scan Transactions</>
            )}
          </button>
        }
      />

      {/* ── Alerts ── */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-green-400 hover:text-green-600 ml-4">✕</button>
        </div>
      )}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Monthly"
          value={formatCurrency(summary?.monthlyTotal ?? 0)}
          valueColor={(summary?.monthlyTotal ?? 0) > 200 ? 'text-red-600' : 'text-[var(--color-foreground)]'}
          sub={`${summary?.activeSubscriptions ?? 0} active`}
        />
        <StatCard
          label="Potential Savings"
          value={formatCurrency(potentialSavings)}
          valueColor={potentialSavings > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--color-foreground)]'}
          sub="marked for cancel"
        />
        <StatCard
          label="Upcoming Renewals"
          value={String(summary?.upcomingRenewals ?? 0)}
          valueColor="text-[var(--color-primary)]"
          sub="in 7 days"
        />
        <StatCard
          label="Review Needed"
          value={String(reviewNeeded)}
          valueColor={reviewNeeded > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--color-foreground)]'}
          sub="subscriptions"
        />
      </div>

      {/* ── Detection Banner ── */}
      {showDetectionBanner && (
        <DetectionBanner
          detected={visibleDetected}
          detecting={detecting}
          savingReminder={savingReminder}
          detectedCancelPicker={detectedCancelPicker}
          onKeep={handleKeep}
          onIgnore={handleIgnore}
          onStartCancelPicker={(merchant) =>
            setDetectedCancelPicker({ merchant, date: defaultCancelDate() })
          }
          onCancelPickerChange={(merchant, date) =>
            setDetectedCancelPicker({ merchant, date })
          }
          onSaveCancelReminder={(d, date) => handleDetectedCancelReminder(d, date)}
          onClosePicker={() => setDetectedCancelPicker(null)}
          onClose={() => setShowDetectionBanner(false)}
        />
      )}

      {/* ── Tracked Subscriptions ── */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
            Tracked Subscriptions
            {subscriptions.length > 0 && (
              <span className="ml-2 text-sm font-normal text-[var(--color-muted-foreground)]">({subscriptions.length})</span>
            )}
          </h2>
        </div>

        {subscriptions.length === 0 ? (
          <EmptyState onScan={detectSubscriptions} detecting={detecting} />
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {subscriptions.map(sub => (
              <TrackedSubscriptionRow
                key={sub.subscriptionId}
                sub={sub}
                trackedCancelPicker={trackedCancelPicker}
                savingReminder={savingReminder}
                onUpdateStatus={updateSubscriptionStatus}
                onRemove={removeSubscription}
                onStartCancelPicker={(id) =>
                  setTrackedCancelPicker({ subscriptionId: id, date: defaultCancelDate() })
                }
                onCancelPickerChange={(id, date) =>
                  setTrackedCancelPicker({ subscriptionId: id, date })
                }
                onSaveCancelReminder={(cancelDate) =>
                  handleTrackedCancelReminder(sub, cancelDate)
                }
                onClosePicker={() => setTrackedCancelPicker(null)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── createCancelBill helper ──────────────────────────────────────────────────

async function createCancelBill(
  merchantName: string,
  amount: number,
  cancelDate: string,
  token: string,
): Promise<void> {
  const body = {
    name: `Cancel ${merchantName}`,
    amount,
    dueDate: cancelDate,
    isRecurring: false,
    frequency: null,
    notes: `Remember to cancel ${merchantName} by this date to avoid being charged again.`,
    categoryName: 'Subscription',
    isActive: true,
  };
  const res = await fetch(`${MAIN_API}/bills`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create cancel reminder bill');
  }
}

function defaultCancelDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  valueColor: string;
  sub: string;
}
function StatCard({ label, value, valueColor, sub }: StatCardProps) {
  return (
    <div className="card p-5">
      <p className="text-sm text-[var(--color-muted-foreground)] mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      <p className="text-xs text-[var(--color-muted-foreground)] mt-1">{sub}</p>
    </div>
  );
}

// ── Detection Banner ──────────────────────────────────────────────────────────

interface DetectionBannerProps {
  detected: DetectedSubscription[];
  detecting: boolean;
  savingReminder: boolean;
  detectedCancelPicker: CancelPickerState;
  onKeep: (d: DetectedSubscription) => void;
  onIgnore: (d: DetectedSubscription) => void;
  onStartCancelPicker: (merchant: string) => void;
  onCancelPickerChange: (merchant: string, date: string) => void;
  onSaveCancelReminder: (d: DetectedSubscription, date: string) => void;
  onClosePicker: () => void;
  onClose: () => void;
}

function DetectionBanner({
  detected,
  detecting,
  savingReminder,
  detectedCancelPicker,
  onKeep,
  onIgnore,
  onStartCancelPicker,
  onCancelPickerChange,
  onSaveCancelReminder,
  onClosePicker,
  onClose,
}: DetectionBannerProps) {
  const count = detected.length;

  return (
    <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
      {/* Banner header */}
      <div className="flex items-center justify-between px-6 py-4 bg-amber-100 border-b border-amber-200">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h2 className="font-semibold text-amber-900">
              {detecting
                ? 'Scanning your transactions…'
                : count === 0
                ? 'AI Scan Complete — No new subscriptions found'
                : `AI Scan Complete — Found ${count} potential subscription${count !== 1 ? 's' : ''}`}
            </h2>
            {!detecting && count > 0 && (
              <p className="text-sm text-amber-700">
                Review each one: keep it, set a cancel reminder, or ignore
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-amber-600 hover:text-amber-800 text-lg leading-none"
          aria-label="Close detection banner"
        >
          ✕
        </button>
      </div>

      {/* Detected cards */}
      {!detecting && count > 0 && (
        <div className="p-6 space-y-4">
          {detected.map((d, idx) => {
            const isPickerOpen = detectedCancelPicker?.merchant === d.merchant;
            return (
              <div key={idx} className="bg-white rounded-lg border border-amber-100 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0">{getCategoryIcon(d.suggestedCategory)}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{d.merchant}</p>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(d.amount)} / {d.frequency} · {d.suggestedCategory}
                      </p>
                      {/* Confidence bar */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${confidenceColor(d.confidence)}`}
                            style={{ width: `${Math.round(d.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {confidenceLabel(d.confidence)} — charged {d.transactionCount} month{d.transactionCount !== 1 ? 's' : ''} in a row
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => onKeep(d)}
                      className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 text-sm font-medium transition-colors"
                      title="Track this subscription as 'keep'"
                    >
                      ✅ Keep
                    </button>
                    <button
                      onClick={() =>
                        isPickerOpen ? onClosePicker() : onStartCancelPicker(d.merchant)
                      }
                      className="px-3 py-1.5 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 text-sm font-medium transition-colors"
                      title="Set a reminder to cancel this subscription"
                    >
                      ⏰ Remind to Cancel
                    </button>
                    <button
                      onClick={() => onIgnore(d)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
                      title="Dismiss — won't show for 30 days"
                    >
                      👻 Ignore
                    </button>
                  </div>
                </div>

                {/* Inline cancel date picker */}
                {isPickerOpen && detectedCancelPicker && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-gray-600 font-medium">Cancel by:</span>
                    <input
                      type="date"
                      value={detectedCancelPicker.date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => onCancelPickerChange(d.merchant, e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400"
                    />
                    <button
                      onClick={() => onSaveCancelReminder(d, detectedCancelPicker.date)}
                      disabled={savingReminder || !detectedCancelPicker.date}
                      className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {savingReminder ? 'Saving…' : 'Save Reminder'}
                    </button>
                    <button
                      onClick={onClosePicker}
                      className="text-gray-400 hover:text-gray-600 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tracked Subscription Row ──────────────────────────────────────────────────

interface TrackedRowProps {
  sub: Subscription;
  trackedCancelPicker: TrackedCancelState;
  savingReminder: boolean;
  onUpdateStatus: (id: string, status?: string, reviewStatus?: string) => void;
  onRemove: (id: string, name: string) => void;
  onStartCancelPicker: (id: string) => void;
  onCancelPickerChange: (id: string, date: string) => void;
  onSaveCancelReminder: (cancelDate: string) => void;
  onClosePicker: () => void;
}

function TrackedSubscriptionRow({
  sub,
  trackedCancelPicker,
  savingReminder,
  onUpdateStatus,
  onRemove,
  onStartCancelPicker,
  onCancelPickerChange,
  onSaveCancelReminder,
  onClosePicker,
}: TrackedRowProps) {
  const isPickerOpen = trackedCancelPicker?.subscriptionId === sub.subscriptionId;
  const displayName = sub.name || sub.merchant;

  const reviewBadge = (() => {
    switch (sub.reviewStatus) {
      case 'keep':
        return <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">✓ Keep</span>;
      case 'cancel':
        return (
          <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-medium">
            ⏰ Cancel Reminder{sub.cancelReminderDate ? ` · ${formatDate(sub.cancelReminderDate)}` : ''}
          </span>
        );
      default:
        return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">🔍 Under Review</span>;
    }
  })();

  return (
    <div className="px-6 py-4 hover:bg-[var(--color-muted)]/50 transition-colors">
      <div className="flex items-center gap-4">
        {/* Icon + name */}
        <span className="text-xl flex-shrink-0">{getCategoryIcon(sub.category)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-[var(--color-foreground)] truncate">{displayName}</p>
            {reviewBadge}
          </div>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
            {formatCurrency(sub.amount)} / {sub.frequency}
            {sub.monthlyAmount && sub.frequency !== 'monthly' ? ` (${formatCurrency(sub.monthlyAmount)}/mo)` : ''}
          </p>
        </div>

        {/* Next billing */}
        <div className="text-right flex-shrink-0 hidden sm:block">
          <p className="text-sm text-[var(--color-foreground)]">{sub.nextBillingDate ? formatDate(sub.nextBillingDate) : '—'}</p>
          {sub.daysUntilRenewal !== undefined && (
            <p className={`text-xs ${sub.daysUntilRenewal <= 3 ? 'text-red-600 font-medium' : 'text-[var(--color-muted-foreground)]'}`}>
              {sub.daysUntilRenewal <= 0 ? 'Due today' : `In ${sub.daysUntilRenewal}d`}
            </p>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {sub.reviewStatus !== 'keep' && (
            <button
              onClick={() => onUpdateStatus(sub.subscriptionId, undefined, 'keep')}
              className="text-xs px-2 py-1 text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-300 rounded hover:bg-green-100 transition-colors"
              title="Mark as keep"
            >
              ✅ Keep
            </button>
          )}
          {sub.reviewStatus !== 'cancel' && (
            <button
              onClick={() => isPickerOpen ? onClosePicker() : onStartCancelPicker(sub.subscriptionId)}
              className="text-xs px-2 py-1 text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-300 rounded hover:bg-red-100 transition-colors"
              title="Set cancel reminder"
            >
              ⏰ Remind
            </button>
          )}
          <button
            onClick={() => onRemove(sub.subscriptionId, displayName)}
            className="text-xs px-2 py-1 text-[var(--color-muted-foreground)] bg-[var(--color-muted)] rounded hover:bg-[var(--color-border)] transition-colors"
            title="Remove from tracked list"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Inline cancel date picker for tracked sub */}
      {isPickerOpen && trackedCancelPicker && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center gap-3 flex-wrap">
          <span className="text-sm text-[var(--color-foreground)] font-medium">Cancel by:</span>
          <input
            type="date"
            value={trackedCancelPicker.date}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => onCancelPickerChange(sub.subscriptionId, e.target.value)}
            className="px-3 py-1.5 border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400"
          />
          <button
            onClick={() => onSaveCancelReminder(trackedCancelPicker.date)}
            disabled={savingReminder || !trackedCancelPicker.date}
            className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {savingReminder ? 'Saving…' : 'Save Reminder'}
          </button>
          <button onClick={onClosePicker} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] text-sm">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onScan, detecting }: { onScan: () => void; detecting: boolean }) {
  return (
    <div className="text-center py-16 px-4">
      <p className="text-5xl mb-4">🔄</p>
      <h3 className="text-xl font-semibold text-[var(--color-foreground)] mb-2">No subscriptions tracked yet</h3>
      <p className="text-[var(--color-muted-foreground)] mb-6 max-w-sm mx-auto">
        Scan your transactions and we'll find recurring charges automatically.
        Then decide what to keep and what to cancel.
      </p>
      <button
        onClick={onScan}
        disabled={detecting}
        className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-60 font-medium transition-colors"
      >
        {detecting ? '🔍 Scanning…' : '🔍 Scan Transactions'}
      </button>
    </div>
  );
}
