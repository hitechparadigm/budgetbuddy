/**
 * Debt Form Page - Add/Edit Debt
 *
 * Form for adding and editing debts with interest rate and payment details.
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

import { config } from '../config/environment';

// Debt features are on the features API (0poeu07vth), not the main API
const API_BASE_URL = config.featuresApiUrl;

const DEBT_TYPES = [
  { value: "credit_card", label: "💳 Credit Card" },
  { value: "student_loan", label: "🎓 Student Loan" },
  { value: "auto_loan", label: "🚗 Auto Loan" },
  { value: "mortgage", label: "🏠 Mortgage" },
  { value: "personal_loan", label: "💰 Personal Loan" },
  { value: "medical", label: "🏥 Medical Debt" },
  { value: "other", label: "📄 Other" },
];

interface FormData {
  name: string;
  type: string;
  originalBalance: string;
  currentBalance: string;
  interestRate: string;
  minimumPayment: string;
  dueDay: string;
  notes: string;
}

export default function DebtFormPage() {
  const { debtId } = useParams();
  const navigate = useNavigate();
  const { tokens } = useAuth();
  const token = tokens?.idToken;
  const isEditing = !!debtId;

  const [formData, setFormData] = useState<FormData>({
    name: "",
    type: "credit_card",
    originalBalance: "",
    currentBalance: "",
    interestRate: "",
    minimumPayment: "",
    dueDay: "1",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && token) {
      loadDebt();
    }
  }, [isEditing, token, debtId]);

  const loadDebt = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/debts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to load debt");

      const data = await response.json();
      const debt = data.data?.debts?.find((d: any) => d.debtId === debtId);

      if (debt) {
        setFormData({
          name: debt.name,
          type: debt.type || "other",
          originalBalance: debt.originalBalance.toString(),
          currentBalance: debt.currentBalance.toString(),
          interestRate: debt.interestRate.toString(),
          minimumPayment: debt.minimumPayment.toString(),
          dueDay: debt.dueDay.toString(),
          notes: debt.notes || "",
        });
      }
    } catch (err) {
      console.error("Error loading debt:", err);
      setError("Failed to load debt");
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError("Debt name is required");
      return;
    }
    const currentBalance = parseFloat(formData.currentBalance);
    if (isNaN(currentBalance) || currentBalance < 0) {
      setError("Please enter a valid current balance");
      return;
    }
    const interestRate = parseFloat(formData.interestRate);
    if (isNaN(interestRate) || interestRate < 0 || interestRate > 100) {
      setError("Interest rate must be between 0 and 100");
      return;
    }
    const minimumPayment = parseFloat(formData.minimumPayment);
    if (isNaN(minimumPayment) || minimumPayment < 0) {
      setError("Please enter a valid minimum payment");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        originalBalance: parseFloat(formData.originalBalance) || currentBalance,
        currentBalance,
        interestRate,
        minimumPayment,
        dueDay: parseInt(formData.dueDay) || 1,
        notes: formData.notes.trim() || null,
      };

      const url = isEditing
        ? `${API_BASE_URL}/debts/${debtId}`
        : `${API_BASE_URL}/debts`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save debt");
      }

      navigate("/debts");
    } catch (err) {
      console.error("Error saving debt:", err);
      setError(err instanceof Error ? err.message : "Failed to save debt");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this debt?")) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/debts/${debtId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to delete debt");
      navigate("/debts");
    } catch (err) {
      console.error("Error deleting debt:", err);
      setError("Failed to delete debt");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Calculate monthly interest
  const getMonthlyInterest = () => {
    const balance = parseFloat(formData.currentBalance);
    const rate = parseFloat(formData.interestRate);
    if (isNaN(balance) || isNaN(rate)) return null;
    return balance * (rate / 100 / 12);
  };

  const monthlyInterest = getMonthlyInterest();
  const minimumPayment = parseFloat(formData.minimumPayment);
  const coversInterest =
    monthlyInterest !== null &&
    !isNaN(minimumPayment) &&
    minimumPayment > monthlyInterest;

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate("/debts")}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Debts
        </button>
        <h1 className="text-3xl font-bold text-[var(--color-foreground)]">
          {isEditing ? "✏️ Edit Debt" : "➕ Add Debt"}
        </h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-[var(--color-surface)] rounded-xl shadow p-6 space-y-6"
      >
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
            Debt Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Chase Sapphire, Student Loan"
            className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
            Debt Type
          </label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {DEBT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
              Current Balance *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-[var(--color-muted-foreground)]">$</span>
              <input
                type="number"
                name="currentBalance"
                value={formData.currentBalance}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
              Original Balance
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-[var(--color-muted-foreground)]">$</span>
              <input
                type="number"
                name="originalBalance"
                value={formData.originalBalance}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="Same as current"
                className="w-full pl-8 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Interest Rate and Minimum Payment */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
              Interest Rate (APR) *
            </label>
            <div className="relative">
              <input
                type="number"
                name="interestRate"
                value={formData.interestRate}
                onChange={handleChange}
                step="0.01"
                min="0"
                max="100"
                placeholder="0.00"
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <span className="absolute right-3 top-2 text-[var(--color-muted-foreground)]">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
              Minimum Payment *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-[var(--color-muted-foreground)]">$</span>
              <input
                type="number"
                name="minimumPayment"
                value={formData.minimumPayment}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>

        {/* Interest Warning */}
        {monthlyInterest !== null && (
          <div
            className={`p-3 rounded-lg ${coversInterest ? "bg-green-50" : "bg-red-50"}`}
          >
            <p
              className={`text-sm ${coversInterest ? "text-green-800" : "text-red-800"}`}
            >
              {coversInterest ? "✅" : "⚠️"} Monthly interest: $
              {monthlyInterest.toFixed(2)}
              {!coversInterest && " - Minimum payment doesn't cover interest!"}
            </p>
          </div>
        )}

        {/* Due Day */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
            Due Day of Month
          </label>
          <select
            name="dueDay"
            value={formData.dueDay}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Any additional notes about this debt..."
            className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4">
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              Delete Debt
            </button>
          )}
          <div className={`flex gap-3 ${!isEditing ? "ml-auto" : ""}`}>
            <button
              type="button"
              onClick={() => navigate("/debts")}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : isEditing ? "Save Changes" : "Add Debt"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
