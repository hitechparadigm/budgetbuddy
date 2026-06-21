/**
 * Net Worth Page
 *
 * Displays assets, liabilities, and net worth tracking.
 * Features:
 * - Net worth summary with total assets and liabilities
 * - Asset and liability lists with CRUD operations
 * - Net worth history chart
 * - Asset allocation pie chart
 *
 * **Validates: Requirement 41.4, 41.8**
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  netWorthApi,
  Asset,
  Liability,
  NetWorthSummary,
  NetWorthHistory,
  AssetAllocation,
} from "../services/netWorthApi";

const ASSET_TYPES = [
  { value: "cash", label: "Cash & Savings" },
  { value: "investment", label: "Investments" },
  { value: "property", label: "Real Estate" },
  { value: "vehicle", label: "Vehicles" },
  { value: "other", label: "Other Assets" },
];

const LIABILITY_TYPES = [
  { value: "mortgage", label: "Mortgage" },
  { value: "car_loan", label: "Car Loan" },
  { value: "student_loan", label: "Student Loan" },
  { value: "credit_card", label: "Credit Card" },
  { value: "personal_loan", label: "Personal Loan" },
  { value: "other", label: "Other Debt" },
];

export const NetWorthPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<NetWorthSummary | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [history, setHistory] = useState<NetWorthHistory[]>([]);
  const [allocation, setAllocation] = useState<AssetAllocation[]>([]);

  // Modal state
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showLiabilityModal, setShowLiabilityModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(
    null,
  );

  // Form state
  const [assetForm, setAssetForm] = useState({
    name: "",
    type: "cash" as Asset["type"],
    value: "",
    notes: "",
  });
  const [liabilityForm, setLiabilityForm] = useState({
    name: "",
    type: "credit_card" as Liability["type"],
    balance: "",
    interestRate: "",
    minimumPayment: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        summaryData,
        assetsData,
        liabilitiesData,
        historyData,
        allocationData,
      ] = await Promise.all([
        netWorthApi.getSummary(),
        netWorthApi.getAssets(),
        netWorthApi.getLiabilities(),
        netWorthApi.getHistory(12),
        netWorthApi.getAllocation(),
      ]);

      setSummary(summaryData);
      setAssets(assetsData);
      setLiabilities(liabilitiesData);
      setHistory(historyData);
      setAllocation(allocationData);
    } catch (error) {
      console.error("Error loading net worth data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  const getTypeLabel = (
    type: string,
    types: { value: string; label: string }[],
  ) => {
    return types.find((t) => t.value === type)?.label || type;
  };

  const handleAddAsset = () => {
    setEditingAsset(null);
    setAssetForm({ name: "", type: "cash", value: "", notes: "" });
    setShowAssetModal(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setAssetForm({
      name: asset.name,
      type: asset.type,
      value: asset.value.toString(),
      notes: asset.notes || "",
    });
    setShowAssetModal(true);
  };

  const handleSaveAsset = async () => {
    try {
      const assetData = {
        name: assetForm.name,
        type: assetForm.type,
        value: parseFloat(assetForm.value),
        currency: "USD",
        notes: assetForm.notes || undefined,
      };

      if (editingAsset) {
        await netWorthApi.updateAsset(editingAsset.assetId, assetData);
      } else {
        await netWorthApi.createAsset(assetData);
      }

      setShowAssetModal(false);
      loadData();
    } catch (error) {
      console.error("Error saving asset:", error);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;

    try {
      await netWorthApi.deleteAsset(assetId);
      loadData();
    } catch (error) {
      console.error("Error deleting asset:", error);
    }
  };

  const handleAddLiability = () => {
    setEditingLiability(null);
    setLiabilityForm({
      name: "",
      type: "credit_card",
      balance: "",
      interestRate: "",
      minimumPayment: "",
      notes: "",
    });
    setShowLiabilityModal(true);
  };

  const handleEditLiability = (liability: Liability) => {
    setEditingLiability(liability);
    setLiabilityForm({
      name: liability.name,
      type: liability.type,
      balance: liability.balance.toString(),
      interestRate: liability.interestRate?.toString() || "",
      minimumPayment: liability.minimumPayment?.toString() || "",
      notes: liability.notes || "",
    });
    setShowLiabilityModal(true);
  };

  const handleSaveLiability = async () => {
    try {
      const liabilityData = {
        name: liabilityForm.name,
        type: liabilityForm.type,
        balance: parseFloat(liabilityForm.balance),
        interestRate: liabilityForm.interestRate
          ? parseFloat(liabilityForm.interestRate)
          : undefined,
        minimumPayment: liabilityForm.minimumPayment
          ? parseFloat(liabilityForm.minimumPayment)
          : undefined,
        currency: "USD",
        notes: liabilityForm.notes || undefined,
      };

      if (editingLiability) {
        await netWorthApi.updateLiability(
          editingLiability.liabilityId,
          liabilityData,
        );
      } else {
        await netWorthApi.createLiability(liabilityData);
      }

      setShowLiabilityModal(false);
      loadData();
    } catch (error) {
      console.error("Error saving liability:", error);
    }
  };

  const handleDeleteLiability = async (liabilityId: string) => {
    if (!confirm("Are you sure you want to delete this liability?")) return;

    try {
      await netWorthApi.deleteLiability(liabilityId);
      loadData();
    } catch (error) {
      console.error("Error deleting liability:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-[var(--color-muted-foreground)]">Loading net worth data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Net Worth</h1>
              <p className="text-[var(--color-muted-foreground)] mt-1">
                Track your assets and liabilities
              </p>
            </div>
            <button
              onClick={() => navigate("/budget")}
              className="px-4 py-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              ← Back to Budget
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[var(--color-muted-foreground)] text-sm">Total Assets</span>
                <span className="text-2xl">💰</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalAssets)}
              </div>
              <div className="text-sm text-[var(--color-muted-foreground)] mt-1">
                {summary.assetCount} assets
              </div>
            </div>

            <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[var(--color-muted-foreground)] text-sm">Total Liabilities</span>
                <span className="text-2xl">💳</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalLiabilities)}
              </div>
              <div className="text-sm text-[var(--color-muted-foreground)] mt-1">
                {summary.liabilityCount} liabilities
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 shadow-sm text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-100 text-sm">Net Worth</span>
                <span className="text-2xl">📊</span>
              </div>
              <div className="text-3xl font-bold">
                {formatCurrency(summary.netWorth)}
              </div>
              {history.length > 1 && (
                <div
                  className={`text-sm mt-1 ${
                    history[0].change >= 0 ? "text-green-200" : "text-red-200"
                  }`}
                >
                  {formatPercent(history[0].changePercent)} this month
                </div>
              )}
            </div>
          </div>
        )}

        {/* Net Worth History Chart */}
        {history.length > 0 && (
          <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">
              Net Worth Over Time
            </h2>
            <div className="relative h-48">
              <svg
                className="w-full h-full"
                viewBox="0 0 800 180"
                preserveAspectRatio="none"
              >
                {/* Grid lines */}
                {[0, 1, 2, 3].map((i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={i * 45}
                    x2="800"
                    y2={i * 45}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                ))}

                {/* Net worth line */}
                {history.length > 1 && (
                  <polyline
                    points={history
                      .slice()
                      .reverse()
                      .map((h, i) => {
                        const x = (i / (history.length - 1)) * 800;
                        const maxValue = Math.max(
                          ...history.map((h) => h.netWorth),
                        );
                        const minValue = Math.min(
                          ...history.map((h) => h.netWorth),
                        );
                        const range = maxValue - minValue || 1;
                        const y = 160 - ((h.netWorth - minValue) / range) * 140;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                  />
                )}
              </svg>

              {/* Month labels */}
              <div className="flex justify-between mt-2 text-xs text-[var(--color-muted-foreground)]">
                {history
                  .slice()
                  .reverse()
                  .map((h, i) => (
                    <span key={i}>{h.month}</span>
                  ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets Section */}
          <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Assets</h2>
              <button
                onClick={handleAddAsset}
                className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
              >
                + Add Asset
              </button>
            </div>

            {assets.length === 0 ? (
              <p className="text-[var(--color-muted-foreground)] text-center py-8">
                No assets yet. Add your first asset to start tracking.
              </p>
            ) : (
              <div className="space-y-3">
                {assets.map((asset) => (
                  <div
                    key={asset.assetId}
                    className="flex items-center justify-between p-3 bg-[var(--color-background)] rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-[var(--color-foreground)]">{asset.name}</p>
                      <p className="text-sm text-[var(--color-muted-foreground)]">
                        {getTypeLabel(asset.type, ASSET_TYPES)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-green-600">
                        {formatCurrency(asset.value)}
                      </span>
                      <button
                        onClick={() => handleEditAsset(asset)}
                        className="text-[var(--color-muted-foreground)] hover:text-[var(--color-muted-foreground)]"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteAsset(asset.assetId)}
                        className="text-[var(--color-muted-foreground)] hover:text-red-600"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Liabilities Section */}
          <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
                Liabilities
              </h2>
              <button
                onClick={handleAddLiability}
                className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
              >
                + Add Liability
              </button>
            </div>

            {liabilities.length === 0 ? (
              <p className="text-[var(--color-muted-foreground)] text-center py-8">
                No liabilities. Great job staying debt-free!
              </p>
            ) : (
              <div className="space-y-3">
                {liabilities.map((liability) => (
                  <div
                    key={liability.liabilityId}
                    className="flex items-center justify-between p-3 bg-[var(--color-background)] rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-[var(--color-foreground)]">
                        {liability.name}
                      </p>
                      <p className="text-sm text-[var(--color-muted-foreground)]">
                        {getTypeLabel(liability.type, LIABILITY_TYPES)}
                        {liability.interestRate &&
                          ` • ${liability.interestRate}% APR`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-red-600">
                        {formatCurrency(liability.balance)}
                      </span>
                      <button
                        onClick={() => handleEditLiability(liability)}
                        className="text-[var(--color-muted-foreground)] hover:text-[var(--color-muted-foreground)]"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteLiability(liability.liabilityId)
                        }
                        className="text-[var(--color-muted-foreground)] hover:text-red-600"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Asset Allocation */}
        {allocation.length > 0 && (
          <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-sm mt-6">
            <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">
              Asset Allocation
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {allocation.map((item, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl mb-1">
                    {item.type === "cash"
                      ? "💵"
                      : item.type === "investment"
                        ? "📈"
                        : item.type === "property"
                          ? "🏠"
                          : item.type === "vehicle"
                            ? "🚗"
                            : "📦"}
                  </div>
                  <p className="text-sm font-medium text-[var(--color-foreground)]">
                    {getTypeLabel(item.type, ASSET_TYPES)}
                  </p>
                  <p className="text-lg font-bold text-blue-600">
                    {item.percentage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {formatCurrency(item.value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Asset Modal */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">
              {editingAsset ? "Edit Asset" : "Add Asset"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={assetForm.name}
                  onChange={(e) =>
                    setAssetForm({ ...assetForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
                  placeholder="e.g., Savings Account"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                  Type
                </label>
                <select
                  value={assetForm.type}
                  onChange={(e) =>
                    setAssetForm({
                      ...assetForm,
                      type: e.target.value as Asset["type"],
                    })
                  }
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
                >
                  {ASSET_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                  Value
                </label>
                <input
                  type="number"
                  value={assetForm.value}
                  onChange={(e) =>
                    setAssetForm({ ...assetForm, value: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={assetForm.notes}
                  onChange={(e) =>
                    setAssetForm({ ...assetForm, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAssetModal(false)}
                className="flex-1 px-4 py-2 border border-[var(--color-border)] text-[var(--color-foreground)] rounded-lg hover:bg-[var(--color-background)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsset}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liability Modal */}
      {showLiabilityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">
              {editingLiability ? "Edit Liability" : "Add Liability"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={liabilityForm.name}
                  onChange={(e) =>
                    setLiabilityForm({ ...liabilityForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
                  placeholder="e.g., Chase Credit Card"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                  Type
                </label>
                <select
                  value={liabilityForm.type}
                  onChange={(e) =>
                    setLiabilityForm({
                      ...liabilityForm,
                      type: e.target.value as Liability["type"],
                    })
                  }
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
                >
                  {LIABILITY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                  Balance
                </label>
                <input
                  type="number"
                  value={liabilityForm.balance}
                  onChange={(e) =>
                    setLiabilityForm({
                      ...liabilityForm,
                      balance: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                    Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    value={liabilityForm.interestRate}
                    onChange={(e) =>
                      setLiabilityForm({
                        ...liabilityForm,
                        interestRate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                    Min Payment
                  </label>
                  <input
                    type="number"
                    value={liabilityForm.minimumPayment}
                    onChange={(e) =>
                      setLiabilityForm({
                        ...liabilityForm,
                        minimumPayment: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={liabilityForm.notes}
                  onChange={(e) =>
                    setLiabilityForm({
                      ...liabilityForm,
                      notes: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowLiabilityModal(false)}
                className="flex-1 px-4 py-2 border border-[var(--color-border)] text-[var(--color-foreground)] rounded-lg hover:bg-[var(--color-background)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLiability}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetWorthPage;
