/**
 * Debt Payoff Page - Debt Tracking and Payoff Calculator
 *
 * Displays all debts with snowball/avalanche payoff strategies,
 * timeline visualization, and extra payment calculator.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";

const API_BASE_URL =
  "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1";

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">💸 Debt Payoff</h1>
        <button
          onClick={() => (window.location.href = "/debts/new")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Debt
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-500">Total Debt</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalBalance)}
            </p>
            <p className="text-xs text-gray-400">
              {summary.activeDebts} active debts
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-500">Monthly Minimum</p>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(summary.totalMinPayment)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-500">Avg Interest Rate</p>
            <p className="text-2xl font-bold text-purple-600">
              {summary.avgInterestRate.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-500">Interest Savings</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.interestSavings)}
            </p>
            <p className="text-xs text-gray-400">Avalanche vs Snowball</p>
          </div>
        </div>
      )}

      {/* Strategy Selector */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">📊 Payoff Strategy</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setStrategy("snowball")}
                className={`flex-1 p-4 rounded-lg border-2 transition ${
                  strategy === "snowball"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="font-semibold">❄️ Snowball</p>
                <p className="text-sm text-gray-500">Smallest balance first</p>
                {summary && (
                  <p className="text-xs text-gray-400 mt-2">
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
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="font-semibold">🏔️ Avalanche</p>
                <p className="text-sm text-gray-500">Highest interest first</p>
                {summary && (
                  <p className="text-xs text-gray-400 mt-2">
                    {summary.avalanchePayoffMonths} months •{" "}
                    {formatCurrency(summary.avalancheTotalInterest)} interest
                  </p>
                )}
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">📅 Payoff Timeline</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Debt-free date:</span>
                  <span className="font-semibold">
                    {formatDate(payoffPlan.payoffDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total months:</span>
                  <span className="font-semibold">
                    {payoffPlan.totalMonths}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total interest:</span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(payoffPlan.totalInterest)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total paid:</span>
                  <span className="font-semibold">
                    {formatCurrency(payoffPlan.totalPaid)}
                  </span>
                </div>
              </div>
              {payoffPlan.debtOrder.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Payoff Order:</p>
                  <ol className="text-sm space-y-1">
                    {payoffPlan.debtOrder.map((debt, idx) => (
                      <li key={debt.debtId} className="flex justify-between">
                        <span>
                          {idx + 1}. {debt.name}
                        </span>
                        <span className="text-gray-500">
                          Month {debt.paidOffMonth}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Debts List */}
      {debts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow">
          <p className="text-6xl mb-4">💸</p>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No debts tracked
          </h2>
          <p className="text-gray-500">
            Add your first debt to start your payoff journey
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {debts.map((debt, idx) => (
            <div key={debt.debtId} className="bg-white rounded-xl shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getDebtTypeIcon(debt.type)}</span>
                  <div>
                    <h3 className="font-semibold text-lg">{debt.name}</h3>
                    <p className="text-sm text-gray-500">
                      {debt.interestRate}% APR • Due day {debt.dueDay}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {formatCurrency(debt.currentBalance)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Min: {formatCurrency(debt.minimumPayment)}/mo
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Progress</span>
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
                <div className="flex justify-between text-xs text-gray-500 mt-1">
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
                    <span className="text-gray-600">
                      ~{debt.monthsToPayoff} months to payoff at minimum
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const amount = prompt("Enter payment amount:");
                      if (amount && !isNaN(parseFloat(amount))) {
                        recordPayment(debt.debtId, parseFloat(amount));
                      }
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    + Payment
                  </button>
                  <button
                    onClick={() =>
                      (window.location.href = `/debts/${debt.debtId}/edit`)
                    }
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
