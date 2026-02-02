/**
 * Subscription Form Page - Add/Edit Subscription
 *
 * Form for manually adding subscriptions that weren't auto-detected.
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const API_BASE_URL =
  "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1";

const CATEGORIES = [
  "Streaming",
  "Software",
  "Fitness",
  "News & Media",
  "Gaming",
  "Food & Delivery",
  "Utilities",
  "Insurance",
  "Cloud Storage",
  "Other",
];

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly (every 3 months)" },
  { value: "yearly", label: "Yearly" },
];

interface FormData {
  name: string;
  merchant: string;
  amount: string;
  frequency: string;
  category: string;
  nextBillingDate: string;
  notes: string;
}

export default function SubscriptionFormPage() {
  const { subscriptionId } = useParams();
  const navigate = useNavigate();
  const { tokens } = useAuth();
  const token = tokens?.idToken;
  const isEditing = !!subscriptionId;

  const [formData, setFormData] = useState<FormData>({
    name: "",
    merchant: "",
    amount: "",
    frequency: "monthly",
    category: "Other",
    nextBillingDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && token) {
      loadSubscription();
    }
  }, [isEditing, token, subscriptionId]);

  const loadSubscription = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/subscriptions`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to load subscription");

      const data = await response.json();
      const subscription = data.data?.subscriptions?.find(
        (s: any) => s.subscriptionId === subscriptionId,
      );

      if (subscription) {
        setFormData({
          name: subscription.name,
          merchant: subscription.merchant || "",
          amount: subscription.amount.toString(),
          frequency: subscription.frequency,
          category: subscription.category,
          nextBillingDate: subscription.nextBillingDate,
          notes: subscription.notes || "",
        });
      }
    } catch (err) {
      console.error("Error loading subscription:", err);
      setError("Failed to load subscription");
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError("Subscription name is required");
      return;
    }
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: formData.name.trim(),
        merchant: formData.merchant.trim() || formData.name.trim(),
        amount,
        frequency: formData.frequency,
        category: formData.category,
        nextBillingDate: formData.nextBillingDate,
        notes: formData.notes.trim() || null,
      };

      const url = isEditing
        ? `${API_BASE_URL}/subscriptions/${subscriptionId}`
        : `${API_BASE_URL}/subscriptions`;

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
        throw new Error(errorData.message || "Failed to save subscription");
      }

      navigate("/subscriptions");
    } catch (err) {
      console.error("Error saving subscription:", err);
      setError(
        err instanceof Error ? err.message : "Failed to save subscription",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this subscription?")) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/subscriptions/${subscriptionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) throw new Error("Failed to delete subscription");
      navigate("/subscriptions");
    } catch (err) {
      console.error("Error deleting subscription:", err);
      setError("Failed to delete subscription");
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

  // Calculate monthly equivalent
  const getMonthlyEquivalent = () => {
    const amount = parseFloat(formData.amount);
    if (isNaN(amount)) return null;

    switch (formData.frequency) {
      case "weekly":
        return amount * 4.33;
      case "monthly":
        return amount;
      case "quarterly":
        return amount / 3;
      case "yearly":
        return amount / 12;
      default:
        return amount;
    }
  };

  const monthlyEquivalent = getMonthlyEquivalent();

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
          onClick={() => navigate("/subscriptions")}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Subscriptions
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditing ? "✏️ Edit Subscription" : "➕ Add Subscription"}
        </h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow p-6 space-y-6"
      >
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subscription Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Netflix, Spotify, Adobe Creative Cloud"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Merchant */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Merchant Name
          </label>
          <input
            type="text"
            name="merchant"
            value={formData.merchant}
            onChange={handleChange}
            placeholder="How it appears on your statement"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Used for matching with transactions. Leave blank to use subscription
            name.
          </p>
        </div>

        {/* Amount and Frequency */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frequency *
            </label>
            <select
              name="frequency"
              value={formData.frequency}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {FREQUENCIES.map((freq) => (
                <option key={freq.value} value={freq.value}>
                  {freq.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Monthly Equivalent */}
        {monthlyEquivalent !== null && formData.frequency !== "monthly" && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 Monthly equivalent:{" "}
              <strong>${monthlyEquivalent.toFixed(2)}/month</strong>
            </p>
          </div>
        )}

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Next Billing Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Next Billing Date
          </label>
          <input
            type="date"
            name="nextBillingDate"
            value={formData.nextBillingDate}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Any additional notes about this subscription..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              Delete Subscription
            </button>
          )}
          <div className={`flex gap-3 ${!isEditing ? "ml-auto" : ""}`}>
            <button
              type="button"
              onClick={() => navigate("/subscriptions")}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Add Subscription"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
