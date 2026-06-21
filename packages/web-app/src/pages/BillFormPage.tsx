/**
 * Bill Form Page — Create / Edit a Bill
 *
 * Redesigned to:
 * 1. Use design tokens throughout (no hardcoded blue/gray)
 * 2. Fix category loading — handles both array and object group formats
 * 3. Explain the Bills → Budget connection clearly in the UI
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FileText, RefreshCw, DollarSign, Calendar, Tag, AlignLeft, Tv } from 'lucide-react';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1';

interface BillFormData {
  name: string;
  amount: string;
  dueDate: string;
  categoryId: string;
  categoryName: string;
  isRecurring: boolean;
  frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'annually';
  notes: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

export const BillFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { billId } = useParams<{ billId?: string }>();
  const [searchParams] = useSearchParams();
  const isEditing = !!billId;

  // ?type=subscription — pre-fills the form for subscription entry
  const isSubscriptionMode = searchParams.get('type') === 'subscription';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [form, setForm] = useState<BillFormData>({
    name: '',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    categoryId: '',
    categoryName: '',
    isRecurring: true, // Most bills are recurring — default to true
    frequency: 'monthly',
    notes: '',
  });
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const token = localStorage.getItem('budgetbuddy_id_token');
        if (!token) return;

        // /budget/current requires ?month=YYYY-MM
        const currentMonth = new Date().toISOString().substring(0, 7);
        const response = await fetch(`${API_BASE_URL}/budget/current?month=${currentMonth}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) return;
        const data = await response.json();
        const budget = data.data || data;

        const expenseCategories: Category[] = [];
        if (budget.groups) {
          // Handle both array format and object format from backend
          let groups: any[] = [];
          if (Array.isArray(budget.groups)) {
            groups = budget.groups;
          } else {
            // Object format: { income: [...], savings: [...], expenses: [...] }
            if (budget.groups.savings) {
              budget.groups.savings.forEach((g: any) => {
                groups.push({ ...g, type: 'savings' });
              });
            }
            if (budget.groups.expenses) {
              budget.groups.expenses.forEach((g: any) => {
                groups.push({ ...g, type: 'expense' });
              });
            }
          }

          groups.forEach((group: any) => {
            const t = group.type || '';
            if (t === 'expense' || t === 'savings') {
              (group.categories || []).forEach((cat: any) => {
                expenseCategories.push({
                  id: cat.id || cat.categoryId,
                  name: cat.name || cat.categoryName,
                  icon: cat.icon || '💰',
                });
              });
            }
          });
        }
        setCategories(expenseCategories);
      } catch (err) {
        console.error('Error loading categories:', err);
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Load existing bill when editing
  useEffect(() => {
    if (!billId) return;

    const loadBill = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('budgetbuddy_id_token');
        if (!token) { navigate('/auth'); return; }

        const response = await fetch(`${API_BASE_URL}/bills`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          const bills = data.data?.bills || data.bills || [];
          const bill = bills.find((b: any) => b.billId === billId);
          if (bill) {
            setForm({
              name: bill.name,
              amount: bill.amount.toString(),
              dueDate: bill.dueDate,
              categoryId: bill.categoryId || '',
              categoryName: bill.categoryName || '',
              isRecurring: bill.isRecurring || false,
              frequency: bill.frequency || 'monthly',
              notes: bill.notes || '',
            });
          } else {
            setError('Bill not found');
          }
        }
      } catch (err) {
        setError('Failed to load bill');
      } finally {
        setLoading(false);
      }
    };

    loadBill();
  }, [billId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Bill name is required'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Valid amount is required'); return; }
    if (!form.dueDate) { setError('Due date is required'); return; }

    try {
      setSaving(true);
      setError(null);
      const token = localStorage.getItem('budgetbuddy_id_token');
      if (!token) { navigate('/auth'); return; }

      const selectedCat = categories.find(c => c.id === form.categoryId);
      const payload = {
        name: form.name.trim(),
        amount: parseFloat(form.amount),
        dueDate: form.dueDate,
        categoryId: form.categoryId || null,
        categoryName: selectedCat?.name || form.categoryName || null,
        isRecurring: form.isRecurring,
        frequency: form.isRecurring ? form.frequency : null,
        notes: form.notes.trim() || null,
      };

      const url = isEditing ? `${API_BASE_URL}/bills/${billId}` : `${API_BASE_URL}/bills`;
      const method = isEditing ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to save bill');
      }

      navigate(isSubscriptionMode ? '/subscriptions' : '/bills');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save bill');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)] mx-auto" />
          <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(isSubscriptionMode ? '/subscriptions' : '/bills')}
            className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold text-[var(--color-foreground)]">
            {isEditing ? 'Edit Bill' : isSubscriptionMode ? 'Add Subscription' : 'Add Bill'}
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* How Bills work — info banner */}
        <div className="mb-6 p-4 bg-[var(--color-primary)]/8 border border-[var(--color-primary)]/20 rounded-xl flex items-start gap-3">
          {isSubscriptionMode ? (
            <Tv className="w-5 h-5 text-[var(--color-primary)] shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <FileText className="w-5 h-5 text-[var(--color-primary)] shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <div className="text-sm text-[var(--color-foreground)]">
            <p className="font-medium mb-0.5">
              {isSubscriptionMode ? 'Adding a subscription manually' : 'Bills → Budget connection'}
            </p>
            <p className="text-[var(--color-muted-foreground)]">
              {isSubscriptionMode
                ? 'This will appear in your Bills list as a recurring charge. Link it to a budget category so it updates your budget when paid. You can also find subscriptions automatically via AI Scan on the Subscriptions page.'
                : 'When you link a bill to a budget category and mark it paid, a transaction is automatically added to that category — keeping your budget up to date without double-entry.'
              }
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300 flex items-start justify-between gap-3">
            {error}
            <button onClick={() => setError(null)} className="shrink-0 text-red-400 hover:text-red-600" aria-label="Dismiss error">✕</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-5">

          {/* Bill Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1.5" htmlFor="bill-name">
              Bill Name
            </label>
            <input
              id="bill-name"
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder={isSubscriptionMode ? 'e.g., Netflix, Spotify, Adobe Creative' : 'e.g., London Hydro, Rogers, Rent'}
              className="w-full px-4 py-2.5 border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
              required
              autoFocus
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1.5" htmlFor="bill-amount">
              Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-[var(--color-muted-foreground)]" aria-hidden="true" />
              <input
                id="bill-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-2.5 border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                required
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1.5" htmlFor="bill-due-date">
              Due Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-[var(--color-muted-foreground)]" aria-hidden="true" />
              <input
                id="bill-due-date"
                type="date"
                value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                required
              />
            </div>
          </div>

          {/* Budget Category — the key linking field */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1.5" htmlFor="bill-category">
              Budget Category
              <span className="ml-1.5 text-xs font-normal text-[var(--color-muted-foreground)]">(optional but recommended)</span>
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-2.5 w-4 h-4 text-[var(--color-muted-foreground)]" aria-hidden="true" />
              <select
                id="bill-category"
                value={form.categoryId}
                onChange={e => {
                  const cat = categories.find(c => c.id === e.target.value);
                  setForm({ ...form, categoryId: e.target.value, categoryName: cat?.name || '' });
                }}
                disabled={categoriesLoading}
                className="w-full pl-9 pr-4 py-2.5 border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm appearance-none disabled:opacity-60"
              >
                <option value="">— No category —</option>
                {categoriesLoading && (
                  <option disabled>Loading from your budget…</option>
                )}
                {!categoriesLoading && categories.length === 0 && (
                  <option disabled>No expense categories found in budget</option>
                )}
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
            {form.categoryId ? (
              <p className="mt-1.5 text-xs text-[var(--color-primary)] flex items-center gap-1">
                <span>✓</span>
                Marking this bill paid will add a transaction to <strong>{form.categoryName || form.categoryId}</strong> in your budget
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-[var(--color-muted-foreground)]">
                Link to a budget category so paying this bill automatically updates your budget spending
              </p>
            )}
          </div>

          {/* Recurring */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={form.isRecurring}
                  onChange={e => setForm({ ...form, isRecurring: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 rounded-full bg-[var(--color-muted)] peer-checked:bg-[var(--color-primary)] transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
              </div>
              <div>
                <span className="text-sm font-medium text-[var(--color-foreground)] flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-[var(--color-muted-foreground)]" aria-hidden="true" />
                  Recurring bill
                </span>
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  Next occurrence is created automatically when marked paid
                </span>
              </div>
            </label>
          </div>

          {/* Frequency */}
          {form.isRecurring && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1.5" htmlFor="bill-frequency">
                Frequency
              </label>
              <select
                id="bill-frequency"
                value={form.frequency}
                onChange={e => setForm({ ...form, frequency: e.target.value as any })}
                className="w-full px-4 py-2.5 border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
              >
                {FREQUENCIES.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1.5" htmlFor="bill-notes">
              Notes
              <span className="ml-1.5 text-xs font-normal text-[var(--color-muted-foreground)]">(optional)</span>
            </label>
            <div className="relative">
              <AlignLeft className="absolute left-3 top-2.5 w-4 h-4 text-[var(--color-muted-foreground)]" aria-hidden="true" />
              <textarea
                id="bill-notes"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Account number, notes about this bill…"
                rows={3}
                className="w-full pl-9 pr-4 py-2.5 border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(isSubscriptionMode ? '/subscriptions' : '/bills')}
              className="flex-1 px-4 py-2.5 border border-[var(--color-border)] text-[var(--color-foreground)] rounded-lg hover:bg-[var(--color-muted)] transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
            >
              {saving ? 'Saving…' : isEditing ? 'Update Bill' : 'Add Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BillFormPage;
