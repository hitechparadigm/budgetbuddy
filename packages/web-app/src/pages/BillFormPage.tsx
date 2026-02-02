/**
 * Bill Form Page - Create/Edit Bill
 *
 * Form for creating new bills or editing existing ones.
 * Includes name, amount, due date, frequency, category, and notes.
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE_URL =
  "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1";

interface BillFormData {
  name: string;
  amount: string;
  dueDate: string;
  categoryId: string;
  categoryName: string;
  isRecurring: boolean;
  frequency: "weekly" | "bi-weekly" | "monthly" | "quarterly" | "annually";
  notes: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

export const BillFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { billId } = useParams<{ billId?: string }>();
  const isEditing = !!billId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [form, setForm] = useState<BillFormData>({
    name: "",
    amount: "",
    dueDate: new Date().toISOString().split("T")[0],
    categoryId: "",
    categoryName: "",
    isRecurring: false,
    frequency: "monthly",
    notes: "",
  });

  // Load categories from budget
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const token = localStorage.getItem("budgetbuddy_id_token");
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/budget/current`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          const budget = data.data || data;

          // Extract expense categories from budget
          const expenseCategories: Category[] = [];
          if (budget.groups) {
            const groups = Array.isArray(budget.groups) ? budget.groups : [];
            groups.forEach((group: any) => {
              if (group.type === "expense" || group.type === "savings") {
                group.categories?.forEach((cat: any) => {
                  expenseCategories.push({
                    id: cat.id,
                    name: cat.name,
                    icon: cat.icon || "💰",
                  });
                });
              }
            });
          }
          setCategories(expenseCategories);
        }
      } catch (err) {
        console.error("Error loading categories:", err);
      }
    };

    loadCategories();
  }, []);

  // Load existing bill if editing
  useEffect(() => {
    if (!billId) return;

    const loadBill = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("budgetbuddy_id_token");
        if (!token) {
          navigate("/auth");
          return;
        }

        const response = await fetch(`${API_BASE_URL}/bills`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
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
              categoryId: bill.categoryId || "",
              categoryName: bill.categoryName || "",
              isRecurring: bill.isRecurring || false,
              frequency: bill.frequency || "monthly",
              notes: bill.notes || "",
            });
          } else {
            setError("Bill not found");
          }
        }
      } catch (err) {
        console.error("Error loading bill:", err);
        setError("Failed to load bill");
      } finally {
        setLoading(false);
      }
    };

    loadBill();
  }, [billId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!form.name.trim()) {
      setError("Bill name is required");
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError("Valid amount is required");
      return;
    }
    if (!form.dueDate) {
      setError("Due date is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const token = localStorage.getItem("budgetbuddy_id_token");
      if (!token) {
        navigate("/auth");
        return;
      }

      const payload = {
        name: form.name.trim(),
        amount: parseFloat(form.amount),
        dueDate: form.dueDate,
        categoryId: form.categoryId || null,
        categoryName: form.categoryName || null,
        isRecurring: form.isRecurring,
        frequency: form.isRecurring ? form.frequency : null,
        notes: form.notes.trim() || null,
      };

      const url = isEditing
        ? `${API_BASE_URL}/bills/${billId}`
        : `${API_BASE_URL}/bills`;

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save bill");
      }

      navigate("/bills");
    } catch (err) {
      console.error("Error saving bill:", err);
      setError(err instanceof Error ? err.message : "Failed to save bill");
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    setForm({
      ...form,
      categoryId,
      categoryName: category?.name || "",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/bills")}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditing ? "Edit Bill" : "Add Bill"}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow p-6 space-y-6"
        >
          {/* Bill Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bill Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Electric Bill, Netflix, Rent"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date *
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category (Optional)
            </label>
            <select
              value={form.categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              When marked as paid, a transaction will be created in this
              category
            </p>
          </div>

          {/* Recurring Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isRecurring"
              checked={form.isRecurring}
              onChange={(e) =>
                setForm({ ...form, isRecurring: e.target.checked })
              }
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="isRecurring"
              className="text-sm font-medium text-gray-700"
            >
              This is a recurring bill
            </label>
          </div>

          {/* Frequency (shown if recurring) */}
          {form.isRecurring && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frequency
              </label>
              <select
                value={form.frequency}
                onChange={(e) =>
                  setForm({ ...form, frequency: e.target.value as any })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {FREQUENCIES.map((freq) => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                A new bill will be created automatically when you mark this one
                as paid
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Add any notes about this bill..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate("/bills")}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                saving
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {saving ? "Saving..." : isEditing ? "Update Bill" : "Add Bill"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BillFormPage;
