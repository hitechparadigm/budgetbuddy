/**
 * Debt Payoff Page - Debt Tracking and Payoff Calculator
 *
 * Displays all debts with snowball/avalanche payoff strategies,
 * timeline visualization, and extra payment calculator.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";

import { config } from '../config/environment';
import { PageHeader, EmptyState } from "../components/ui";

// Debt features are on the features API (0poeu07vth), not the main API
const API_BASE_URL = config.featuresApiUrl;

interface Debt {
  debtId: string;
  name: string;
  type: string;
  originalBalance: number;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  dueDay: number;
  status: string;
  totalPaid: number;
  progressPercent: number;
  monthsToPayoff: number;
  paymentCount: number;
}

interface Summary {
  totalDebts: number;
  activeDebts: number;
  totalBalance: number;
  totalMinPayment: number;
  avgInterestRate: number;
  snowballPayoffMonths: number;
  snowballTotalInterest: number;
  avalanchePayoffMonths: number;
  avalancheTotalInterest: number;
  interestSavings: number;
}

interface PayoffPlan {
  strategy: string;
  extraPayment: number;
  totalMonths: number;
  payoffDate: string;
  totalPaid: number;
  totalInterest: number;
  debtOrder: { debtId: string; name: string; paidOffMonth: number }[];
}

type Strategy = "snowball" | "avalanche";

export default function DebtPayoffPage() {
  const { tokens } = useAuth();
  const token = tokens?.idToken;

  const [debts, setDebts] = useState<Debt[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [payoffPlan, setPayoffPlan] = useState<PayoffPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<Strategy>("snowball");
  const [extraPayment, setExtraPayment] = useState(0);
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const currency = "USD";

  const loadDebts = useCallback(async () => {
    try {
      setError(null);
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const [debtsResponse, summaryResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/debts`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
        fetch(`${API_BASE_URL}/debts/summary`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
      ]);

      if (!debtsResponse.ok || !summaryResponse.ok) {
        throw new Error("Failed to load debts");
      }

      const debtsData = await debtsResponse.json();
      const summaryData = await summaryResponse.json();

      setDebts(debtsData.data?.debts || []);
      setSummary(summaryData.data?.summary || null);
    } catch (err) {
      console.error("Error loading debts:", err);
      setError(err instanceof Error ? err.message : "Failed to load debts");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadPayoffPlan = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/debts/payoff-plan?strategy=${strategy}&extraPayment=${extraPayment}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) throw new Error("Failed to load payoff plan");

      const data = await response.json();
      setPayoffPlan(data.data?.plan || null);
    } catch (err) {
      console.error("Error loading payoff plan:", err);
    }
  }, [token, strategy, extraPayment]);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  useEffect(() => {
    if (debts.length > 0) {
      loadPayoffPlan();
    }
  }, [loadPayoffPlan, debts.length]);

  const recordPayment = async (debtId: string, amount: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/debts/${debtId}/payment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) throw new Error("Failed to record payment");
      await loadDebts();
    } catch (err) {
      console.error("Error recording payment:", err);
      setError("Failed to record payment");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  const getDebtTypeIcon = (type: string) => {
    switch (type) {
      case "credit_card":
        return "💳";
      case "student_loan":
        return "🎓";
      case "auto_loan":
        return "🚗";
      case "mortgage":
        return "🏠";
      case "personal_loan":
        return "💰";
      case "medical":
        return "🏥";
      default:
        return "📄";
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="h-8 w-48 rounded animate-pulse bg-gray-200 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl animate-pulse bg-[var(--color-surface)] shadow" />)}
        </div>
        <div className="h-48 rounded-xl animate-pulse bg-[var(--color-surface)] shadow mb-8" />
        <div className="space-y-4">
          {[1,2].map(i => <div key={i} className="h-40 rounded-xl animate-pulse bg-[var(--color-surface)] shadow" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <PageHeader
        title="💸 Debt Payoff"
        action={
          <button
            onClick={() => (window.location.href = "/debts/new")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Add Debt
          </button>
        }
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[var(--color-surface)] rounded-xl shadow p-6">
            <p className="text-sm text-[var(--color-muted-foreground)]">Total Debt</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalBalance)}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {summary.activeDebts} active debts
            </p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-xl shadow p-6">
            <p className="text-sm text-[var(--color-muted-foreground)]">Monthly Minimum</p>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(summary.totalMinPayment)}
            </p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-xl shadow p-6">
            <p className="text-sm text-[var(--color-muted-foreground)]">Avg Interest Rate</p>
            <p className="text-2xl font-bold text-purple-600">
              {summary.avgInterestRate.toFixed(1)}%
            </p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-xl shadow p-6">
            <p className="text-sm text-[var(--color-muted-foreground)]">Interest Savings</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.interestSavings)}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">Avalanche vs Snowball</p>
          </div>
        </div>
      )}

      {/* Strategy Selector */}
      <div className="bg-[var(--color-surface)] rounded-xl shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">📊 Payoff Strategy</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setStrategy("snowball")}
                className={`flex-1 p-4 rounded-lg border-2 transition ${
                  strategy === "snowball"
                    ? "border-blue-500 bg-blue-50"
                    : "border-[var(--color-border)] hover:border-[var(--color-border)]"
                }`}
              >
                <p className="font-semibold">❄️ Snowball</p>
                <p className="text-sm text-[var(--color-muted-foreground)]">Smallest balance first</p>
                {summary && (
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-2">
                    {summary.snowballPayoffMonths} months •{" "}
                    {formatCurrency(summary.snowballTotalInterest)} interest
                  </p>
                )}
              </button>
              <button
                onClick={() => setStrategy("avalanche")}
                className={`flex-1 p-4 rounded-lg border-2 transition ${
                  strategy === "avalanche"
                    ? "border-blue-500 bg-blue-50"
                    : "border-[var(--color-border)] hover:border-[var(--color-border)]"
                }`}
              >
                <p className="font-semibold">🏔️ Avalanche</p>
                <p className="text-sm text-[var(--color-muted-foreground)]">Highest interest first</p>
                {summary && (
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-2">
                    {summary.avalanchePayoffMonths} months •{" "}
                    {formatCurrency(summary.avalancheTotalInterest)} interest
                  </p>
                )}
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                Extra Monthly Payment
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="50"
                  value={extraPayment}
                  onChange={(e) => setExtraPayment(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-lg font-semibold w-24 text-right">
                  {formatCurrency(extraPayment)}
                </span>
              </div>
            </div>
          </div>
          {payoffPlan && (
            <div className="bg-[var(--color-background)] rounded-lg p-4">
              <h3 className="font-semibold mb-3">📅 Payoff Timeline</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted-foreground)]">Debt-free date:</span>
                  <span className="font-semibold">
                    {formatDate(payoffPlan.payoffDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted-foreground)]">Total months:</span>
                  <span className="font-semibold">
                    {payoffPlan.totalMonths}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted-foreground)]">Total interest:</span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(payoffPlan.totalInterest)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted-foreground)]">Total paid:</span>
                  <span className="font-semibold">
                    {formatCurrency(payoffPlan.totalPaid)}
                  </span>
                </div>
              </div>
              {payoffPlan.debtOrder.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-3">Payoff Order — Horizontal Timeline</p>
                  {/* Visual horizontal timeline */}
                  <div className="relative">
                    <div className="absolute top-3.5 left-0 right-0 h-0.5 bg-gray-200" aria-hidden="true" />
                    <div className="flex justify-between relative">
                      {payoffPlan.debtOrder.map((debt) => {
                        const debtType = debts.find(d => d.debtId === debt.debtId)?.type ?? '';
                        const dotColor = debtType === 'mortgage'
                          ? 'bg-blue-600'
                          : debtType === 'credit_card'
                          ? 'bg-red-500'
                          : debtType === 'auto_loan'
                          ? 'bg-gray-500'
                          : 'bg-purple-500';
                        return (
                          <div key={debt.debtId} className="flex flex-col items-center" style={{ width: `${(1 / payoffPlan.debtOrder.length) * 100}%` }}>
                            <div className={`w-4 h-4 rounded-full ${dotColor} border-2 border-white shadow z-10 relative`} title={`${debt.name} — Month ${debt.paidOffMonth}`} />
                            <p className="text-xs text-[var(--color-muted-foreground)] mt-1 text-center leading-tight max-w-[60px]">
                              {debt.name.length > 10 ? `${debt.name.slice(0, 8)}…` : debt.name}
                            </p>
                            <p className="text-xs text-[var(--color-muted-foreground)]">Mo. {debt.paidOffMonth}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-[var(--color-muted-foreground)]">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Mortgage</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Credit Card</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-500 inline-block" /> Auto</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Other</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Debts List */}
      {debts.length === 0 ? (
        <EmptyState
          icon="💸"
          title="No debts tracked"
          description="Add your first debt to start your payoff journey. Every dollar paid down counts."
          actionLabel="Add Your First Debt"
          onAction={() => (window.location.href = '/debts/new')}
        />
      ) : (
        <div className="space-y-4">
          {debts.map((debt) => (
            <div key={debt.debtId} className="bg-[var(--color-surface)] rounded-xl shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getDebtTypeIcon(debt.type)}</span>
                  <div>
                    <h3 className="font-semibold text-lg">{debt.name}</h3>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {debt.interestRate}% APR • Due day {debt.dueDay}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {formatCurrency(debt.currentBalance)}
                  </p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Min: {formatCurrency(debt.minimumPayment)}/mo
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--color-muted-foreground)]">Progress</span>
                  <span className="font-medium">
                    {debt.progressPercent}% paid off
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${debt.progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-[var(--color-muted-foreground)] mt-1">
                  <span>Paid: {formatCurrency(debt.totalPaid)}</span>
                  <span>Original: {formatCurrency(debt.originalBalance)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm">
                  {debt.monthsToPayoff === Infinity ? (
                    <span className="text-red-600">
                      ⚠️ Payment doesn't cover interest
                    </span>
                  ) : (
                    <span className="text-[var(--color-muted-foreground)]">
                      ~{debt.monthsToPayoff} months to payoff at minimum
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setPaymentDebt(debt);
                      setPaymentAmount(String(debt.minimumPayment));
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    + Payment
                  </button>
                  <button
                    onClick={() =>
                      (window.location.href = `/debts/${debt.debtId}/edit`)
                    }
                    className="px-3 py-1 border border-[var(--color-border)] rounded hover:bg-[var(--color-background)] text-sm"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment modal — replaces window.prompt */}
      {paymentDebt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        >
          <div className="bg-[var(--color-surface)] rounded-xl shadow-xl p-6 max-w-sm mx-4 w-full">
            <h3 id="payment-modal-title" className="font-semibold text-[var(--color-foreground)] mb-1">
              Record Payment
            </h3>
            <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
              {paymentDebt.name} — current balance {formatCurrency(paymentDebt.currentBalance)}
            </p>
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2" htmlFor="payment-amount">
              Amount
            </label>
            <input
              id="payment-amount"
              type="number"
              min="1"
              step="0.01"
              value={paymentAmount}
              onChange={e => setPaymentAmount(e.target.value)}
              className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  const amount = parseFloat(paymentAmount);
                  if (!isNaN(amount) && amount > 0) {
                    await recordPayment(paymentDebt.debtId, amount);
                  }
                  setPaymentDebt(null);
                  setPaymentAmount('');
                }}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                Record Payment
              </button>
              <button
                onClick={() => { setPaymentDebt(null); setPaymentAmount(''); }}
                className="flex-1 py-2 border border-[var(--color-border)] text-[var(--color-foreground)] rounded-lg hover:bg-[var(--color-background)] text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
