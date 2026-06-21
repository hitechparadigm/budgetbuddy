/**
 * QuickAddTransactionModal
 *
 * Opens from any page — no navigation required.
 * UX flow (3.10 Reduce Excise, 1.4 Mental Model Alignment):
 *  1. Type toggle: Income | Expense (most common first = Expense on right since it gets primary attention)
 *  2. Amount (autofocused, numeric keyboard on mobile)
 *  3. Category (filtered by type, loaded from current budget)
 *  4. Description (optional)
 *  5. Date (defaults today)
 *  6. Save → toast confirmation, modal closes, caller's onSuccess() fires
 *
 * Keyboard: Enter submits when amount + category filled. Escape closes.
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, TrendingUp, TrendingDown, Check } from 'lucide-react';
import { getCurrentMonthString, getTodayString } from '../utils/monthHelpers';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1';

interface Category {
  id: string;
  name: string;
  icon: string;
  type: 'income' | 'savings' | 'expense';
}

interface QuickAddTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (type: 'income' | 'expense', amount: number, categoryName: string) => void;
  /** Pre-select type — e.g. when opened from an income section */
  defaultType?: 'income' | 'expense';
}

export const QuickAddTransactionModal: React.FC<QuickAddTransactionModalProps> = ({
  open,
  onClose,
  onSuccess,
  defaultType = 'expense',
}) => {
  const [type, setType] = useState<'income' | 'expense'>(defaultType);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  // Load budget categories when modal opens
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        const token = localStorage.getItem('budgetbuddy_id_token');
        if (!token) return;
        const res = await fetch(`${API_BASE}/budget/current?month=${getCurrentMonthString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const budget = data.data || data;
        const cats: Category[] = [];
        const g = budget.groups || {};

        // Backend returns groups as { income: [...], savings: [...], expenses: [...] }
        // where each value is a flat array of category objects (not group objects).
        // Also handle array format (frontend-transformed) for robustness.
        if (Array.isArray(g)) {
          // Already-transformed array format: [{type, categories:[...]}, ...]
          g.forEach((group: any) => {
            const t: string = group.type || '';
            (group.categories || []).forEach((c: any) => {
              cats.push({
                id: c.id || c.categoryId,
                name: c.name || c.categoryName,
                icon: c.icon || (t === 'income' ? '💰' : '💸'),
                type: t === 'income' ? 'income' : 'expense',
              });
            });
          });
        } else {
          // Object format from backend: { income:[...], savings:[...], expenses:[...] }
          (g.income || []).forEach((c: any) => {
            cats.push({ id: c.id || c.categoryId, name: c.name || c.categoryName, icon: c.icon || '💰', type: 'income' });
          });
          (g.savings || []).forEach((c: any) => {
            cats.push({ id: c.id || c.categoryId, name: c.name || c.categoryName, icon: c.icon || '💾', type: 'expense' });
          });
          (g.expenses || []).forEach((c: any) => {
            cats.push({ id: c.id || c.categoryId, name: c.name || c.categoryName, icon: c.icon || '💸', type: 'expense' });
          });
        }
        setCategories(cats);
      } catch {
        // silent — user can still enter without category
      }
    };
    load();
    // Reset form
    setAmount('');
    setCategoryId('');
    setDescription('');
    setDate(getTodayString());
    setError(null);
    setSaved(false);
    setType(defaultType);
    setTimeout(() => amountRef.current?.focus(), 100);
  }, [open, defaultType]);

  // Reset category when type changes
  useEffect(() => {
    setCategoryId('');
  }, [type]);

  const filteredCats = categories.filter(c =>
    type === 'income' ? c.type === 'income' : c.type !== 'income',
  );

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Enter an amount');
      amountRef.current?.focus();
      return;
    }
    if (!categoryId) {
      setError('Select a category');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const token = localStorage.getItem('budgetbuddy_id_token');
      if (!token) { setError('Please log in again'); return; }

      // Transactions go to the budget via saveBudgetToBackend pattern.
      // The fastest API path: POST /budget (update the category's spentAmount)
      // Since the budget page uses its own local state, we use the same backend
      // endpoint the budget page uses but write directly to the transaction entity.
      const month = getCurrentMonthString();
      const cat = categories.find(c => c.id === categoryId);
      const txnBody = {
        amount: parseFloat(amount),
        categoryId,
        categoryName: cat?.name || '',
        description: description.trim() || (cat?.name || 'Transaction'),
        date,
        type: type === 'income' ? 'income' : 'expense',
        month,
      };

      const res = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(txnBody),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Save failed (${res.status})`);
      }

      setSaved(true);
      onSuccess?.(type, parseFloat(amount), cat?.name || '');
      setTimeout(() => { onClose(); setSaved(false); }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && !saving) handleSave();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal — slides up from bottom on mobile, centered on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add Transaction"
        className="fixed z-50 bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md sm:w-full bg-[var(--color-surface)] rounded-t-2xl sm:rounded-2xl shadow-2xl border-t border-[var(--color-border)] sm:border overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Handle bar — mobile only */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[var(--color-muted)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2 sm:pt-5">
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">Add Transaction</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type toggle — Income / Expense as large segmented control */}
        <div className="px-5 pb-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--color-muted)] rounded-xl">
            <button
              onClick={() => setType('expense')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                type === 'expense'
                  ? 'bg-red-500 text-white shadow'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              }`}
            >
              <TrendingDown className="w-4 h-4" aria-hidden="true" />
              Expense
            </button>
            <button
              onClick={() => setType('income')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                type === 'income'
                  ? 'bg-green-500 text-white shadow'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              }`}
            >
              <TrendingUp className="w-4 h-4" aria-hidden="true" />
              Income
            </button>
          </div>
        </div>

        {/* Form fields */}
        <div className="px-5 pb-5 space-y-3">
          {/* Amount — large, autofocused */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1" htmlFor="qt-amount">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] font-medium">$</span>
              <input
                ref={amountRef}
                id="qt-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 text-xl font-bold bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-[var(--color-foreground)]"
                aria-label="Transaction amount"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1" htmlFor="qt-category">Category</label>
            <select
              id="qt-category"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm text-[var(--color-foreground)]"
            >
              <option value="">Select category…</option>
              {filteredCats.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
              {filteredCats.length === 0 && (
                <option disabled>No {type} categories found</option>
              )}
            </select>
          </div>

          {/* Description — optional */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1" htmlFor="qt-desc">
              Description <span className="font-normal">(optional)</span>
            </label>
            <input
              id="qt-desc"
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g., Grocery run, Paycheck…"
              className="w-full px-4 py-2.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm text-[var(--color-foreground)]"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1" htmlFor="qt-date">Date</label>
            <input
              id="qt-date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm text-[var(--color-foreground)]"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <span>⚠</span> {error}
            </p>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              saved
                ? 'bg-green-500 text-white'
                : type === 'expense'
                ? 'bg-red-500 hover:bg-red-600 text-white disabled:opacity-50'
                : 'bg-green-500 hover:bg-green-600 text-white disabled:opacity-50'
            }`}
          >
            {saved ? (
              <><Check className="w-4 h-4" /> Saved!</>
            ) : saving ? (
              'Saving…'
            ) : (
              `Add ${type === 'expense' ? 'Expense' : 'Income'}`
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default QuickAddTransactionModal;
