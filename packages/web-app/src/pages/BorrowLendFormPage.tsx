/**
 * BorrowLendFormPage — Create / edit a borrowed or lent money entry
 *
 * Saves as a goal with subType 'borrowed' or 'lent'.
 * The goals Lambda stores arbitrary fields, so no backend changes are needed.
 *
 * Routes:
 *   /goals/borrow-lend/new?type=borrowed
 *   /goals/borrow-lend/new?type=lent
 *   /goals/borrow-lend/:goalId/edit
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/ui';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1';

interface FormData {
  subType: 'borrowed' | 'lent';
  personName: string;
  amount: string;
  currentAmount: string;   // how much has been repaid (borrowed) or received back (lent)
  dueDate: string;
  notes: string;
}

export const BorrowLendFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { goalId } = useParams<{ goalId?: string }>(); // defined when editing
  const [searchParams] = useSearchParams();

  const isEdit = !!goalId;
  const defaultType = (searchParams.get('type') as 'borrowed' | 'lent') ?? 'borrowed';

  const [form, setForm] = useState<FormData>({
    subType: defaultType,
    personName: '',
    amount: '',
    currentAmount: '0',
    dueDate: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);

  // Load existing entry when editing
  useEffect(() => {
    if (!isEdit) return;

    const token = localStorage.getItem('budgetbuddy_id_token');
    if (!token) { navigate('/auth'); return; }

    fetch(`${API_BASE_URL}/goals/${goalId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        const g = data.data ?? data;
        setForm({
          subType: g.subType ?? 'borrowed',
          personName: g.personName ?? '',
          amount: String(g.targetAmount ?? ''),
          currentAmount: String(g.currentAmount ?? '0'),
          dueDate: g.targetDate?.slice(0, 10) ?? '',
          notes: g.notes ?? '',
        });
      })
      .catch(() => setError('Failed to load entry'))
      .finally(() => setLoading(false));
  }, [goalId, isEdit, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.personName.trim() || isNaN(amount) || amount <= 0) {
      setError('Person name and a positive amount are required.');
      return;
    }

    setSaving(true);
    setError(null);

    const token = localStorage.getItem('budgetbuddy_id_token');
    if (!token) { navigate('/auth'); return; }

    const payload = {
      name: form.subType === 'borrowed'
        ? `Borrowed from ${form.personName}`
        : `Lent to ${form.personName}`,
      icon: form.subType === 'borrowed' ? '💸' : '🤝',
      targetAmount: amount,
      currentAmount: parseFloat(form.currentAmount) || 0,
      targetDate: form.dueDate || null,
      // Custom extension fields stored directly in DynamoDB
      subType: form.subType,
      personName: form.personName.trim(),
      notes: form.notes.trim() || null,
    };

    try {
      const url = isEdit
        ? `${API_BASE_URL}/goals/${goalId}`
        : `${API_BASE_URL}/goals`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Failed to save');
      }

      navigate('/goals?tab=borrowed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  const isBorrowed = form.subType === 'borrowed';
  const title = isEdit
    ? `Edit ${isBorrowed ? 'Borrowed' : 'Lent'} Entry`
    : isBorrowed ? 'Track Borrowed Money' : 'Track Money You Lent';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-4">
        <button
          onClick={() => navigate('/goals?tab=borrowed')}
          className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded mb-2 block"
          aria-label="Back to Goals"
        >
          ← Back
        </button>
        <PageHeader title={title} />
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Type toggle — only on new */}
        {!isEdit && (
          <div className="mb-6 flex rounded-lg overflow-hidden border border-border">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, subType: 'borrowed' }))}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                form.subType === 'borrowed'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-surface text-muted-foreground hover:bg-muted'
              }`}
            >
              💸 I Borrowed Money
            </button>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, subType: 'lent' }))}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                form.subType === 'lent'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-surface text-muted-foreground hover:bg-muted'
              }`}
            >
              🤝 I Lent Money
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Person name */}
          <div>
            <label htmlFor="person-name" className="block text-sm font-medium text-foreground mb-1.5">
              {isBorrowed ? 'Who did you borrow from?' : 'Who did you lend to?'}
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              id="person-name"
              type="text"
              value={form.personName}
              onChange={e => setForm(f => ({ ...f, personName: e.target.value }))}
              placeholder={isBorrowed ? 'e.g. John Smith' : 'e.g. Sarah Jones'}
              required
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground
                         focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="borrow-amount" className="block text-sm font-medium text-foreground mb-1.5">
              {isBorrowed ? 'How much did you borrow?' : 'How much did you lend?'}
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
              <input
                id="borrow-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                required
                className="w-full pl-7 pr-3 py-2 border border-border rounded-lg bg-background text-foreground
                           focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>

          {/* Amount already repaid/received */}
          {isEdit && (
            <div>
              <label htmlFor="repaid-amount" className="block text-sm font-medium text-foreground mb-1.5">
                {isBorrowed ? 'How much have you repaid so far?' : 'How much has been returned so far?'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
                <input
                  id="repaid-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.currentAmount}
                  onChange={e => setForm(f => ({ ...f, currentAmount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 border border-border rounded-lg bg-background text-foreground
                             focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>
          )}

          {/* Due date */}
          <div>
            <label htmlFor="due-date" className="block text-sm font-medium text-foreground mb-1.5">
              Due date <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <input
              id="due-date"
              type="date"
              value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground
                         focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="borrow-notes" className="block text-sm font-medium text-foreground mb-1.5">
              Notes <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <textarea
              id="borrow-notes"
              rows={3}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder={isBorrowed ? 'e.g. For car repair, repay by end of month' : 'e.g. Helping out with rent'}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground
                         focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/goals?tab=borrowed')}
              className="flex-1 py-2.5 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : (isBorrowed ? 'Track Debt' : 'Track Loan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BorrowLendFormPage;
