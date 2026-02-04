/**
 * Bills Page - Bill Reminders Management
 *
 * Displays bills sorted by due date with status indicators,
 * one-tap mark as paid, and bill management.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";
import PatternReviewModal from "../components/PatternReviewModal";

const API_BASE_URL =
  "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1";

interface Bill {
  billId: string;
  name: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
  categoryId: string | null;
  categoryName: string | null;
  status: "unpaid" | "paid" | "overdue";
  statusIndicator: string;
  isRecurring: boolean;
  frequency: string | null;
  nextDueDate: string | null;
  paidDate: string | null;
  paidAmount: number | null;
  transactionId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // AI metadata fields
  aiGenerated?: boolean;
  sourcePatternId?: string;
  aiConfidenceScore?: number;
  aiDetectedDate?: string;
}

interface BillsResponse {
  bills: Bill[];
  count: number;
}

type FilterStatus = "all" | "unpaid" | "paid" | "overdue";

export const BillsPage: React.FC = () => {
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [payingBillId, setPayingBillId] = useState<string | null>(null);
  const [showPatternModal, setShowPatternModal] = useState(false);
  const currency = "USD";

  const loadBills = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

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

      if (response.status === 401) {
        navigate("/auth");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load bills");
      }

      const data = await response.json();
      const billsData: BillsResponse = data.data || data;
      setBills(billsData.bills || []);
    } catch (err) {
      console.error("Error loading bills:", err);
      setError(err instanceof Error ? err.message : "Failed to load bills");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const handleMarkPaid = async (bill: Bill) => {
    try {
      setPayingBillId(bill.billId);

      const token = localStorage.getItem("budgetbuddy_id_token");
      if (!token) {
        navigate("/auth");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/bills/${bill.billId}/pay`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paidDate: new Date().toISOString().split("T")[0],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark bill as paid");
      }

      // Reload bills to get updated list
      await loadBills();
    } catch (err) {
      console.error("Error marking bill as paid:", err);
      setError(
        err instanceof Error ? err.message : "Failed to mark bill as paid",
      );
    } finally {
      setPayingBillId(null);
    }
  };

  const filteredBills = bills.filter((bill) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "unpaid") return bill.status === "unpaid";
    if (filterStatus === "paid") return bill.status === "paid";
    if (filterStatus === "overdue")
      return bill.status === "overdue" || bill.daysUntilDue < 0;
    return true;
  });

  const upcomingBills = filteredBills.filter((b) => b.status !== "paid");
  const paidBills = filteredBills.filter((b) => b.status === "paid");

  const totalDue = upcomingBills.reduce((sum, b) => sum + b.amount, 0);
  const totalPaid = paidBills.reduce(
    (sum, b) => sum + (b.paidAmount || b.amount),
    0,
  );

  const getStatusBadge = (bill: Bill) => {
    if (bill.status === "paid") {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          ✅ Paid
        </span>
      );
    }
    if (bill.status === "overdue" || bill.daysUntilDue < 0) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
          🔴 Overdue
        </span>
      );
    }
    if (bill.daysUntilDue <= 3) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
          🟡 Due Soon
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
        🟢 Upcoming
      </span>
    );
  };

  const getDaysText = (days: number) => {
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    return `Due in ${days} days`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading bills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/budget")}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">📋 Bills</h1>
            </div>
            <button
              onClick={() => navigate("/bills/new")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Bill
            </button>
            <button
              onClick={() => setShowPatternModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              🤖 AI Scan
            </button>
          </div>
        </div>
      </header>

      {/* Pattern Review Modal */}
      <PatternReviewModal
        isOpen={showPatternModal}
        onClose={() => setShowPatternModal(false)}
        onPatternApproved={() => loadBills()}
        currency={currency}
      />

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Due</div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalDue, currency)}
            </div>
            <div className="text-xs text-gray-400">
              {upcomingBills.length} bills
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Paid This Month</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalPaid, currency)}
            </div>
            <div className="text-xs text-gray-400">
              {paidBills.length} bills
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Next Due</div>
            {upcomingBills.length > 0 ? (
              <>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(upcomingBills[0].amount, currency)}
                </div>
                <div className="text-xs text-gray-400">
                  {upcomingBills[0].name} -{" "}
                  {getDaysText(upcomingBills[0].daysUntilDue)}
                </div>
              </>
            ) : (
              <div className="text-lg text-gray-400">No upcoming bills</div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(["all", "unpaid", "overdue", "paid"] as FilterStatus[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ),
          )}
        </div>

        {/* Error Message */}
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

        {/* Bills List */}
        {filteredBills.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No bills found
            </h3>
            <p className="text-gray-500 mb-4">
              {filterStatus === "all"
                ? "Add your first bill to start tracking payments"
                : `No ${filterStatus} bills`}
            </p>
            {filterStatus === "all" && (
              <button
                onClick={() => navigate("/bills/new")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Add Your First Bill
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBills.map((bill) => (
              <div
                key={bill.billId}
                className={`bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow ${
                  bill.status === "paid" ? "opacity-75" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">
                      {bill.aiGenerated ? "🤖" : bill.isRecurring ? "🔄" : "📄"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {bill.name}
                        </h3>
                        {getStatusBadge(bill)}
                        {bill.aiGenerated && (
                          <span
                            className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800"
                            title={`AI Confidence: ${bill.aiConfidenceScore}%`}
                          >
                            AI
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(bill.dueDate)} •{" "}
                        {getDaysText(bill.daysUntilDue)}
                        {bill.isRecurring && (
                          <span className="ml-2 text-blue-600">
                            ({bill.frequency})
                          </span>
                        )}
                      </div>
                      {bill.categoryName && (
                        <div className="text-xs text-gray-400 mt-1">
                          Category: {bill.categoryName}
                          {bill.aiGenerated && bill.aiConfidenceScore && (
                            <span className="ml-2 text-indigo-500">
                              • {bill.aiConfidenceScore}% confidence
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">
                        {formatCurrency(bill.amount, currency)}
                      </div>
                      {bill.paidAmount && bill.paidAmount !== bill.amount && (
                        <div className="text-xs text-gray-500">
                          Paid: {formatCurrency(bill.paidAmount, currency)}
                        </div>
                      )}
                    </div>
                    {bill.status !== "paid" && (
                      <button
                        onClick={() => handleMarkPaid(bill)}
                        disabled={payingBillId === bill.billId}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          payingBillId === bill.billId
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      >
                        {payingBillId === bill.billId ? "..." : "Mark Paid"}
                      </button>
                    )}
                  </div>
                </div>
                {bill.notes && (
                  <div className="mt-2 text-sm text-gray-500 border-t pt-2">
                    {bill.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BillsPage;
