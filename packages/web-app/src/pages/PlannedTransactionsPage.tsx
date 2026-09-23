/**
 * PlannedTransactionsPage — Schedule future transactions and recurring items
 *
 * Gap from product-requirements.md #9:
 * "Planned transactions frontend — backend Lambda exists (transaction-planning),
 *  no frontend UI yet."
 *
 * Route: /planned-transactions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader, EmptyState, Skeleton } from '../components/ui';
import { CategoryIcon } from '../components/CategoryIcon';
import { formatCurrency } from '@budget-buddy/shared/src/utils/currency';
import { profileApi } from '../services/api';
import {
  getPlannedTransactions,
  deletePlannedTransaction,
  executePlannedTransaction,
  type PlannedTransaction,
} from '../services/plannedTransactionsApi';
import {
  Plus,
  Trash2,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';

type FilterTab = 'upcoming' | 'all' | 'completed';

const FREQ_LABEL: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(scheduledDate: string): boolean {
  return scheduledDate < new Date().toISOString().slice(0, 10);
}

function daysUntil(scheduledDate: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(scheduledDate + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export const PlannedTransactionsPage: React.FC = () => {
  const [plans, setPlans] = useState<PlannedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('upcoming');
  const [executing, setExecuting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PlannedTransaction | null>(null);
  const [currency, setCurrency] = useState('USD');
  const [showNewForm, setShowNewForm] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  // New plan form state
  const [newPlan, setNewPlan] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    categoryName: '',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
    isRecurring: false,
    frequency: 'monthly' as PlannedTransaction['frequency'],
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const includeExecuted = activeTab === 'all' || activeTab === 'completed';
      const data = await getPlannedTransactions({ includeExecuted });
      setPlans(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load planned transactions');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    load();
    profileApi.getProfile().then(p => { if (p?.currency) setCurrency(p.currency); }).catch(() => {});
  }, [load]);

  const handleExecute = async (plan: PlannedTransaction) => {
    setExecuting(plan.planId);
    try {
      await executePlannedTransaction(plan.planId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as done');
    } finally {
      setExecuting(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const plan = confirmDelete;
    setConfirmDelete(null);
    setDeleting(plan.planId);
    try {
      await deletePlannedTransaction(plan.planId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newPlan.amount);
    if (!newPlan.categoryName.trim() || isNaN(amount) || amount <= 0) {
      setSaveError('Category and amount are required.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const { createPlannedTransaction } = await import('../services/plannedTransactionsApi');
      await createPlannedTransaction({
        type: newPlan.type,
        amount,
        currency,
        categoryId: newPlan.categoryName.toLowerCase().replace(/\s+/g, '-'),
        categoryName: newPlan.categoryName.trim(),
        date: newPlan.date,
        notes: newPlan.notes || undefined,
        isRecurring: newPlan.isRecurring,
        frequency: newPlan.isRecurring ? newPlan.frequency : undefined,
      });
      setShowNewForm(false);
      setNewPlan({ type: 'expense', amount: '', categoryName: '', date: new Date().toISOString().slice(0, 10), notes: '', isRecurring: false, frequency: 'monthly' });
      await load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Filter plans based on tab
  const filteredPlans = plans.filter(p => {
    if (activeTab === 'upcoming') return !p.isExecuted;
    if (activeTab === 'completed') return p.isExecuted;
    return true;
  });

  // Sort upcoming by date
  const sortedPlans = [...filteredPlans].sort((a, b) =>
    a.scheduledDate.localeCompare(b.scheduledDate)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <PageHeader
            title="Planned Transactions"
            subtitle="Schedule future income and expenses"
            action={
              <button
                onClick={() => setShowNewForm(v => !v)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                New Planned Transaction
              </button>
            }
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* New plan inline form */}
        {showNewForm && (
          <div className="mb-6 bg-surface border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-4">New Planned Transaction</h3>
            <form onSubmit={handleSaveNew} className="space-y-4">
              {/* Type toggle */}
              <div className="flex gap-2">
                {(['expense', 'income'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewPlan(p => ({ ...p, type: t }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      newPlan.type === t
                        ? t === 'expense' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {t === 'expense' ? '📤 Expense' : '📥 Income'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label htmlFor="plan-category" className="block text-xs text-muted-foreground mb-1">Category *</label>
                  <input
                    id="plan-category"
                    type="text"
                    value={newPlan.categoryName}
                    onChange={e => setNewPlan(p => ({ ...p, categoryName: e.target.value }))}
                    placeholder="e.g. Rent, Salary"
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                {/* Amount */}
                <div>
                  <label htmlFor="plan-amount" className="block text-xs text-muted-foreground mb-1">Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-muted-foreground text-sm">$</span>
                    <input
                      id="plan-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={newPlan.amount}
                      onChange={e => setNewPlan(p => ({ ...p, amount: e.target.value }))}
                      placeholder="0.00"
                      required
                      className="w-full pl-7 pr-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>
                {/* Date */}
                <div>
                  <label htmlFor="plan-date" className="block text-xs text-muted-foreground mb-1">Date *</label>
                  <input
                    id="plan-date"
                    type="date"
                    value={newPlan.date}
                    onChange={e => setNewPlan(p => ({ ...p, date: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                {/* Notes */}
                <div>
                  <label htmlFor="plan-notes" className="block text-xs text-muted-foreground mb-1">Notes</label>
                  <input
                    id="plan-notes"
                    type="text"
                    value={newPlan.notes}
                    onChange={e => setNewPlan(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
              </div>

              {/* Recurring */}
              <div className="flex items-center gap-3">
                <input
                  id="plan-recurring"
                  type="checkbox"
                  checked={newPlan.isRecurring}
                  onChange={e => setNewPlan(p => ({ ...p, isRecurring: e.target.checked }))}
                  className="accent-[var(--color-primary)] w-4 h-4"
                />
                <label htmlFor="plan-recurring" className="text-sm text-foreground">Recurring</label>
                {newPlan.isRecurring && (
                  <select
                    value={newPlan.frequency ?? 'monthly'}
                    onChange={e => setNewPlan(p => ({ ...p, frequency: e.target.value as PlannedTransaction['frequency'] }))}
                    className="ml-2 px-2 py-1 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none"
                  >
                    {Object.entries(FREQ_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                )}
              </div>

              {saveError && (
                <p className="text-sm text-red-600">{saveError}</p>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowNewForm(false)} className="flex-1 py-2 border border-border rounded-lg text-foreground hover:bg-muted text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab row */}
        <div className="flex border-b border-border mb-6">
          {(['upcoming', 'all', 'completed'] as FilterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'upcoming' ? '⏰ Upcoming' : tab === 'completed' ? '✅ Completed' : '📋 All'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-surface rounded-xl border border-border p-4 flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && sortedPlans.length === 0 && (
          <EmptyState
            icon="📅"
            title={activeTab === 'completed' ? 'No completed transactions yet' : 'No planned transactions'}
            description={activeTab === 'upcoming'
              ? 'Schedule recurring bills, salary, rent, and other predictable transactions ahead of time.'
              : 'Completed transactions will appear here once you mark upcoming ones as done.'}
            actionLabel={activeTab !== 'completed' ? 'Plan a Transaction' : undefined}
            onAction={activeTab !== 'completed' ? () => setShowNewForm(true) : undefined}
          />
        )}

        {/* Transaction list */}
        {!loading && sortedPlans.length > 0 && (
          <div className="space-y-2">
            {sortedPlans.map(plan => {
              const days = daysUntil(plan.scheduledDate);
              const overdue = !plan.isExecuted && isOverdue(plan.scheduledDate);
              const isExpanded = expandedPlan === plan.planId;

              return (
                <div
                  key={plan.planId}
                  className={`bg-surface rounded-xl border transition-colors ${
                    overdue ? 'border-red-300 dark:border-red-700' : 'border-border'
                  }`}
                >
                  {/* Main row */}
                  <div className="flex items-center gap-3 p-4">
                    {/* Icon */}
                    <CategoryIcon name={plan.categoryName} size="md" />

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{plan.categoryName}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(plan.scheduledDate)}
                          {!plan.isExecuted && (
                            <span className={`ml-1 ${
                              overdue ? 'text-red-500' : days === 0 ? 'text-amber-500' : days <= 3 ? 'text-amber-400' : 'text-muted-foreground'
                            }`}>
                              {overdue ? '(overdue)' : days === 0 ? '(today)' : `(in ${days}d)`}
                            </span>
                          )}
                        </span>
                        {plan.isRecurring && (
                          <span className="text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <RefreshCw className="w-2.5 h-2.5" aria-hidden="true" />
                            {FREQ_LABEL[plan.frequency ?? ''] ?? plan.frequency}
                          </span>
                        )}
                        {plan.isExecuted && (
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full">Done</span>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <span className={`font-semibold tabular-nums text-sm ${
                      plan.transactionType === 'income' ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {plan.transactionType === 'income' ? '+' : '-'}{formatCurrency(plan.amount, currency)}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-1">
                      {!plan.isExecuted && (
                        <button
                          onClick={() => handleExecute(plan)}
                          disabled={executing === plan.planId}
                          className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                          aria-label={`Mark ${plan.categoryName} as done`}
                          title="Mark as done"
                        >
                          {executing === plan.planId
                            ? <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                            : <CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete(plan)}
                        disabled={deleting === plan.planId}
                        className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        aria-label={`Delete planned ${plan.categoryName}`}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setExpandedPlan(isExpanded ? null : plan.planId)}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors"
                        aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                      >
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4" aria-hidden="true" />
                          : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-border text-sm text-muted-foreground space-y-1">
                      {plan.notes && <p>📝 {plan.notes}</p>}
                      {plan.nextOccurrence && (
                        <p>🔄 Next: {formatDate(plan.nextOccurrence)}</p>
                      )}
                      {plan.isExecuted && plan.executedTransactionId && (
                        <p>✅ Executed as transaction #{plan.executedTransactionId.slice(0, 8)}</p>
                      )}
                      <p className="text-xs">Created {new Date(plan.createdAt).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Overdue summary */}
        {!loading && activeTab === 'upcoming' && (() => {
          const overdueCount = sortedPlans.filter(p => isOverdue(p.scheduledDate)).length;
          if (overdueCount === 0) return null;
          return (
            <div className="mt-6 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {overdueCount} planned {overdueCount === 1 ? 'transaction is' : 'transactions are'} overdue.
            </div>
          );
        })()}
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-plan-title"
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <div className="bg-surface rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 id="delete-plan-title" className="font-semibold text-foreground mb-2">
              Delete planned transaction?
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              "{confirmDelete.categoryName}" on {formatDate(confirmDelete.scheduledDate)}
              {confirmDelete.isRecurring ? ' (and all future recurrences)' : ''} will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                autoFocus
                className="flex-1 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlannedTransactionsPage;
