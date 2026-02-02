/**
 * Subscriptions Page - Subscription Tracking Dashboard
 *
 * Displays all subscriptions with monthly cost summary, status badges,
 * and automatic detection from transaction patterns.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";

const API_BASE_URL =
  "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1";

interface Subscription {
  subscriptionId: string;
  name: string;
  merchant: string;
  amount: number;
  frequency: string;
  monthlyAmount: number;
  category: string;
  nextBillingDate: string;
  daysUntilRenewal: number;
  status: "active" | "paused" | "cancelled";
  reviewStatus: "keep" | "review" | "cancel";
  statusIndicator: string;
  notes: string | null;
}

interface DetectedSubscription {
  merchant: string;
  amount: number;
  frequency: string;
  confidence: number;
  lastTransaction: string;
  transactionCount: number;
  suggestedCategory: string;
}

interface Summary {
  totalSubscriptions: number;
  activeSubscriptions: number;
  monthlyTotal: number;
  yearlyTotal: number;
  byStatus: { keep: number; review: number; cancel: number };
  byCategory: Record<string, { count: number; monthlyTotal: number }>;
  upcomingRenewals: number;
}

type FilterStatus = "all" | "active" | "paused" | "cancelled";
type ReviewFilter = "all" | "keep" | "review" | "cancel";

export default function SubscriptionsPage() {
  const { tokens } = useAuth();
  const token = tokens?.idToken;

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [detected, setDetected] = useState<DetectedSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [showDetected, setShowDetected] = useState(false);
  const currency = "USD";

  const loadSubscriptions = useCallback(async () => {
    try {
      setError(null);
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const [subsResponse, summaryResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/subscriptions`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
        fetch(`${API_BASE_URL}/subscriptions/summary`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
      ]);

      if (!subsResponse.ok || !summaryResponse.ok) {
        throw new Error("Failed to load subscriptions");
      }

      const subsData = await subsResponse.json();
      const summaryData = await summaryResponse.json();

      setSubscriptions(subsData.data?.subscriptions || []);
      setSummary(summaryData.data?.summary || null);
    } catch (err) {
      console.error("Error loading subscriptions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load subscriptions",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  const detectSubscriptions = async () => {
    try {
      setDetecting(true);
      const response = await fetch(`${API_BASE_URL}/subscriptions/detect`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to detect subscriptions");

      const data = await response.json();
      setDetected(data.data?.detected || []);
      setShowDetected(true);
    } catch (err) {
      console.error("Error detecting subscriptions:", err);
      setError("Failed to detect subscriptions");
    } finally {
      setDetecting(false);
    }
  };

  const updateStatus = async (
    subscriptionId: string,
    status?: string,
    reviewStatus?: string,
  ) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/subscriptions/${subscriptionId}/status`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status, reviewStatus }),
        },
      );

      if (!response.ok) throw new Error("Failed to update status");
      await loadSubscriptions();
    } catch (err) {
      console.error("Error updating status:", err);
      setError("Failed to update subscription status");
    }
  };

  const addDetectedSubscription = async (detected: DetectedSubscription) => {
    try {
      const response = await fetch(`${API_BASE_URL}/subscriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: detected.merchant,
          merchant: detected.merchant,
          amount: detected.amount,
          frequency: detected.frequency,
          category: detected.suggestedCategory,
        }),
      });

      if (!response.ok) throw new Error("Failed to add subscription");

      setDetected((prev) =>
        prev.filter((d) => d.merchant !== detected.merchant),
      );
      await loadSubscriptions();
    } catch (err) {
      console.error("Error adding subscription:", err);
      setError("Failed to add subscription");
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (filterStatus !== "all" && sub.status !== filterStatus) return false;
    if (reviewFilter !== "all" && sub.reviewStatus !== reviewFilter)
      return false;
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getReviewColor = (reviewStatus: string) => {
    switch (reviewStatus) {
      case "keep":
        return "bg-green-100 text-green-800";
      case "review":
        return "bg-yellow-100 text-yellow-800";
      case "cancel":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
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
        <h1 className="text-3xl font-bold text-gray-900">🔄 Subscriptions</h1>
        <div className="flex gap-3">
          <button
            onClick={detectSubscriptions}
            disabled={detecting}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {detecting ? "Detecting..." : "🔍 Detect Subscriptions"}
          </button>
          <button
            onClick={() => (window.location.href = "/subscriptions/new")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Add Subscription
          </button>
        </div>
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
            <p className="text-sm text-gray-500">Monthly Cost</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.monthlyTotal)}
            </p>
            <p className="text-xs text-gray-400">
              {summary.activeSubscriptions} active
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-500">Yearly Cost</p>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(summary.yearlyTotal)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-500">Upcoming Renewals</p>
            <p className="text-2xl font-bold text-blue-600">
              {summary.upcomingRenewals}
            </p>
            <p className="text-xs text-gray-400">Next 7 days</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-500">Review Status</p>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                ✓ {summary.byStatus.keep}
              </span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                🔍 {summary.byStatus.review}
              </span>
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                ⚠ {summary.byStatus.cancel}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Detected Subscriptions Modal */}
      {showDetected && detected.length > 0 && (
        <div className="mb-8 bg-purple-50 border border-purple-200 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-purple-900">
              🔍 Detected Subscriptions ({detected.length})
            </h2>
            <button
              onClick={() => setShowDetected(false)}
              className="text-purple-600 hover:text-purple-800"
            >
              ✕ Close
            </button>
          </div>
          <div className="space-y-3">
            {detected.map((d, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-white rounded-lg p-4"
              >
                <div>
                  <p className="font-medium">{d.merchant}</p>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(d.amount)} / {d.frequency} •{" "}
                    {d.suggestedCategory}
                  </p>
                  <p className="text-xs text-gray-400">
                    Confidence: {Math.round(d.confidence * 100)}% •{" "}
                    {d.transactionCount} transactions
                  </p>
                </div>
                <button
                  onClick={() => addDetectedSubscription(d)}
                  className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                >
                  + Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex gap-2">
          {(["all", "active", "paused", "cancelled"] as FilterStatus[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-full text-sm ${
                  filterStatus === status
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ),
          )}
        </div>
        <div className="flex gap-2">
          {(["all", "keep", "review", "cancel"] as ReviewFilter[]).map(
            (review) => (
              <button
                key={review}
                onClick={() => setReviewFilter(review)}
                className={`px-3 py-1 rounded-full text-sm ${
                  reviewFilter === review
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {review === "all"
                  ? "All Reviews"
                  : review.charAt(0).toUpperCase() + review.slice(1)}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Subscriptions List */}
      {filteredSubscriptions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow">
          <p className="text-6xl mb-4">🔄</p>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No subscriptions found
          </h2>
          <p className="text-gray-500">
            {filterStatus === "all" && reviewFilter === "all"
              ? "Add your first subscription or detect from transactions"
              : "No subscriptions match your filters"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Subscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Next Billing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Review
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubscriptions.map((sub) => (
                <tr key={sub.subscriptionId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{sub.name}</p>
                      <p className="text-sm text-gray-500">{sub.category}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium">{formatCurrency(sub.amount)}</p>
                    <p className="text-xs text-gray-500">
                      {sub.frequency} ({formatCurrency(sub.monthlyAmount)}/mo)
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p>{formatDate(sub.nextBillingDate)}</p>
                    <p
                      className={`text-xs ${sub.daysUntilRenewal <= 3 ? "text-red-600" : "text-gray-500"}`}
                    >
                      {sub.daysUntilRenewal <= 0
                        ? "Due today"
                        : `In ${sub.daysUntilRenewal} days`}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={sub.status}
                      onChange={(e) =>
                        updateStatus(sub.subscriptionId, e.target.value)
                      }
                      className={`px-2 py-1 rounded text-sm ${getStatusColor(sub.status)}`}
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={sub.reviewStatus}
                      onChange={(e) =>
                        updateStatus(
                          sub.subscriptionId,
                          undefined,
                          e.target.value,
                        )
                      }
                      className={`px-2 py-1 rounded text-sm ${getReviewColor(sub.reviewStatus)}`}
                    >
                      <option value="keep">✓ Keep</option>
                      <option value="review">🔍 Review</option>
                      <option value="cancel">⚠ Cancel</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() =>
                        (window.location.href = `/subscriptions/${sub.subscriptionId}/edit`)
                      }
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Category Breakdown */}
      {summary && Object.keys(summary.byCategory).length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">📊 By Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary.byCategory).map(([category, data]) => (
              <div key={category} className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{category}</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(data.monthlyTotal)}/mo
                </p>
                <p className="text-xs text-gray-500">
                  {data.count} subscriptions
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
