/**
 * Bills Page — Bill Reminders Management
 *
 * Redesigned to:
 * 1. Use design tokens throughout (no hardcoded blue/gray-50)
 * 2. Show budget category link on each bill row clearly
 * 3. Explain the Bills→Budget connection via contextual cues
 * 4. Match the green brand color
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, RefreshCw, Bot, CheckCircle, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '@budget-buddy/shared/src/utils/currency';
import PatternReviewModal from '../components/PatternReviewModal';
import { PageHeader, EmptyState, Badge } from '../components/ui';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1';

interface Bill {
  billId: string;
  name: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
  categoryId: string | null;
  categoryName: string | null;
  status: 'unpaid' | 'paid' | 'overdue';
  statusIndicator: string;
  isRecurring: boolean;
  frequency: string | null;
  nextDueDate: string | null;
  paidDate: string | null;
  paidAmount: number | null;
  transactionId: string | null;
  notes: string | null;
  aiGenerated?: boolean;
  sourcePatternId?: string;
  aiConfidenceScore?: number;
}

type FilterStatus = 'all' | 'unpaid' | 'paid' | 'overdue';

export const BillsPage: React.FC = () => {
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [payingBillId, setPayingBillId] = useState<string | null>(null);
  const [deletingBillId, setDeletingBillId] = useState<string | null>(null);
  const [showPatternModal, setShowPatternModal] = useState(false);
  const currency = 'USD';

  const loadBills = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('budgetbuddy_id_token');
      if (!token) { navigate('/auth'); return; }

      const response = await fetch(`${API_BASE_URL}/bills`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) { navigate('/auth'); return; }
      if (!response.ok) throw new Error('Failed to load bills');

      const data = await response.json();
      const billsData = data.data || data;
      setBills(billsData.bills || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadBills(); }, [loadBills]);

  const handleMarkPaid = async (bill: Bill) => {
    try {
      setPayingBillId(bill.billId);
      const token = localStorage.getItem('budgetbuddy_id_token');
      if (!token) { navigate('/auth'); return; }

      const response = await fetch(`${API_BASE_URL}/bills/${bill.billId}/pay`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ paidDate: new Date().toISOString().split('T')[0] }),
      });

      if (!response.ok) throw new Error('Failed to mark bill as paid');
      await loadBills();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark bill as paid');
    } finally {
      setPayingBillId(null);
    }
  };

  const handleDelete = async (bill: Bill) => {
    try {
      setDeletingBillId(bill.billId);
      const token = localStorage.getItem('budgetbuddy_id_token');
      if (!token) { navigate('/auth'); return; }

      const response = await fetch(`${API_BASE_URL}/bills/${bill.billId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete bill');
      await loadBills();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bill');
    } finally {
      setDeletingBillId(null);
    }
  };

  const filteredBills = bills.filter(bill => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'unpaid') return bill.status === 'unpaid';
    if (filterStatus === 'paid') return bill.status === 'paid';
    if (filterStatus === 'overdue') return bill.status === 'overdue' || bill.daysUntilDue < 0;
    return true;
  });

  const upcomingBills = filteredBills.filter(b => b.status !== 'paid');
  const paidBills = filteredBills.filter(b => b.status === 'paid');
  const totalDue = upcomingBills.reduce((sum, b) => sum + b.amount, 0);
  const totalPaid = paidBills.reduce((sum, b) => sum + (b.paidAmount || b.amount), 0);
  const nextBill = [...upcomingBills].sort((a, b) => a.daysUntilDue - b.daysUntilDue)[0];

  const getStatusBadge = (bill: Bill) => {
    if (bill.status === 'paid') {
      return <Badge variant="success" className="text-xs">Paid</Badge>;
    }
    if (bill.status === 'overdue' || bill.daysUntilDue < 0) {
      return <Badge variant="danger" className="text-xs">Overdue</Badge>;
    }
    if (bill.daysUntilDue === 0) {
      return <Badge variant="danger" className="text-xs">Due today</Badge>;
    }
    if (bill.daysUntilDue <= 3) {
      return <Badge variant="warning" className="text-xs">Due in {bill.daysUntilDue}d</Badge>;
    }
    return <Badge variant="neutral" className="text-xs">Upcoming</Badge>;
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const getDaysText = (days: number) => {
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days} days`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-32 rounded animate-pulse bg-[var(--color-muted)]" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl animate-pulse bg-[var(--color-muted)]" />)}
        </div>
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse bg-[var(--color-muted)]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <PageHeader
        title="Bills"
        subtitle={bills.length > 0 ? `${bills.filter(b => b.status !== 'paid').length} upcoming · ${bills.filter(b => b.status === 'paid').length} paid this month` : undefined}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/bills/new')}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors text-sm font-medium"
            >
              + Add Bill
            </button>
            <button
              onClick={() => setShowPatternModal(true)}
              className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-foreground)] rounded-lg hover:bg-[var(--color-muted)] transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              <Bot className="w-4 h-4" aria-hidden="true" />
              AI Scan
            </button>
          </div>
        }
      />

      {/* Pattern Review Modal */}
      <PatternReviewModal
        isOpen={showPatternModal}
        onClose={() => setShowPatternModal(false)}
        onPatternApproved={() => loadBills()}
        currency={currency}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 mb-6">
        <div className="card p-4">
          <div className="text-xs text-[var(--color-muted-foreground)] mb-1">Total Due</div>
          <div className={`text-xl font-bold tabular-nums ${totalDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--color-foreground)]'}`}>
            {formatCurrency(totalDue, currency)}
          </div>
          <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{upcomingBills.length} {upcomingBills.length === 1 ? 'bill' : 'bills'}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-[var(--color-muted-foreground)] mb-1">Paid This Month</div>
          <div className="text-xl font-bold tabular-nums text-green-600 dark:text-green-400">
            {formatCurrency(totalPaid, currency)}
          </div>
          <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{paidBills.length} {paidBills.length === 1 ? 'bill' : 'bills'}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-[var(--color-muted-foreground)] mb-1">Next Due</div>
          {nextBill ? (
            <>
              <div className="text-xl font-bold tabular-nums text-[var(--color-foreground)]">
                {formatCurrency(nextBill.amount, currency)}
              </div>
              <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5 truncate">
                {nextBill.name} · {getDaysText(nextBill.daysUntilDue)}
              </div>
            </>
          ) : (
            <div className="text-sm text-[var(--color-muted-foreground)]">No upcoming bills</div>
          )}
        </div>
      </div>

      {/* How it works — shown only when no bills have categories yet */}
      {bills.length > 0 && bills.filter(b => b.categoryId).length === 0 && (
        <div className="mb-5 p-4 bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/15 rounded-xl flex items-start gap-3">
          <FileText className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-[var(--color-muted-foreground)]">
            <span className="font-medium text-[var(--color-foreground)]">Tip: </span>
            Link bills to budget categories so paying a bill automatically records an expense in your budget. Edit any bill to add a category.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(['all', 'unpaid', 'overdue', 'paid'] as FilterStatus[]).map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === status
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)]'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300 flex items-start justify-between gap-3">
          {error}
          <button onClick={() => setError(null)} className="shrink-0 text-red-400 hover:text-red-600" aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* Bills list */}
      {filteredBills.length === 0 ? (
        <EmptyState
          icon="📋"
          title={filterStatus === 'all' ? 'No bills tracked' : `No ${filterStatus} bills`}
          description={
            filterStatus === 'all'
              ? 'Add your first bill to get reminders before due dates — and link it to a budget category to keep your budget up to date automatically.'
              : undefined
          }
          actionLabel={filterStatus === 'all' ? 'Add Your First Bill' : undefined}
          onAction={filterStatus === 'all' ? () => navigate('/bills/new') : undefined}
        />
      ) : (
        <div className="space-y-2.5">
          {filteredBills.map(bill => {
            const isOverdue = bill.status === 'overdue' || bill.daysUntilDue < 0;
            const isPaid = bill.status === 'paid';

            return (
              <div
                key={bill.billId}
                className={`card p-4 transition-all ${isPaid ? 'opacity-70' : ''} ${isOverdue && !isPaid ? 'border-red-200 dark:border-red-900' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: icon + name + meta */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isPaid ? 'bg-green-100 dark:bg-green-900/30' : isOverdue ? 'bg-red-100 dark:bg-red-900/30' : 'bg-[var(--color-muted)]'
                    }`}>
                      {bill.aiGenerated ? (
                        <Bot className="w-4 h-4 text-indigo-600" aria-hidden="true" />
                      ) : bill.isRecurring ? (
                        <RefreshCw className={`w-4 h-4 ${isPaid ? 'text-green-600' : isOverdue ? 'text-red-500' : 'text-[var(--color-muted-foreground)]'}`} aria-hidden="true" />
                      ) : (
                        <FileText className={`w-4 h-4 ${isPaid ? 'text-green-600' : isOverdue ? 'text-red-500' : 'text-[var(--color-muted-foreground)]'}`} aria-hidden="true" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[var(--color-foreground)] text-sm">{bill.name}</span>
                        {getStatusBadge(bill)}
                        {bill.aiGenerated && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full font-medium">
                            AI detected
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{formatDate(bill.dueDate)}</span>
                        {bill.isRecurring && bill.frequency && (
                          <span className="text-[var(--color-primary)] font-medium">({bill.frequency})</span>
                        )}
                      </div>

                      {/* Budget category link — the key UX element */}
                      {bill.categoryName ? (
                        <div className="mt-1 text-xs flex items-center gap-1 text-[var(--color-primary)]">
                          <span>→ Budget: {bill.categoryName}</span>
                          {bill.transactionId && (
                            <span className="text-green-600 dark:text-green-400 flex items-center gap-0.5">
                              <CheckCircle className="w-3 h-3" aria-hidden="true" /> logged
                            </span>
                          )}
                        </div>
                      ) : (
                        !isPaid && (
                          <button
                            onClick={() => navigate(`/bills/${bill.billId}/edit`)}
                            className="mt-1 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-0.5 group"
                          >
                            <span className="group-hover:underline">+ Link to budget category</span>
                          </button>
                        )
                      )}

                      {bill.notes && (
                        <p className="mt-1 text-xs text-[var(--color-muted-foreground)] italic truncate max-w-xs">{bill.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Right: amount + actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-lg font-bold tabular-nums text-[var(--color-foreground)]">
                        {formatCurrency(bill.amount, currency)}
                      </div>
                      {bill.paidAmount && bill.paidAmount !== bill.amount && (
                        <div className="text-xs text-[var(--color-muted-foreground)]">
                          Paid {formatCurrency(bill.paidAmount, currency)}
                        </div>
                      )}
                    </div>

                    {!isPaid && (
                      <button
                        onClick={() => handleMarkPaid(bill)}
                        disabled={payingBillId === bill.billId}
                        className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
                      >
                        {payingBillId === bill.billId ? '…' : 'Mark Paid'}
                      </button>
                    )}

                    {/* Edit + Delete */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => navigate(`/bills/${bill.billId}/edit`)}
                        className="p-1.5 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] rounded transition-colors"
                        aria-label={`Edit ${bill.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(bill)}
                        disabled={deletingBillId === bill.billId}
                        className="p-1.5 text-[var(--color-muted-foreground)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors disabled:opacity-50"
                        aria-label={`Delete ${bill.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BillsPage;
