/**
 * PeerComparisonWidget Component
 * Shows anonymous spending comparison with similar households
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  comparisonApi,
  ComparisonSummaryResponse,
  CategoryComparison,
  ComparisonStatus,
} from "../services/comparisonApi";

interface PeerComparisonWidgetProps {
  className?: string;
  compact?: boolean;
}

// Status colors and labels
const statusConfig: Record<
  ComparisonStatus,
  { color: string; bgColor: string; label: string; icon: string }
> = {
  "below-average": {
    color: "text-green-700",
    bgColor: "bg-green-100",
    label: "Below Average",
    icon: "✅",
  },
  average: {
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
    label: "Average",
    icon: "➡️",
  },
  "above-average": {
    color: "text-red-700",
    bgColor: "bg-red-100",
    label: "Above Average",
    icon: "⚠️",
  },
  "no-data": {
    color: "text-[var(--color-muted-foreground)]",
    bgColor: "bg-[var(--color-muted)]",
    label: "No Data",
    icon: "❓",
  },
};

// Category icons
const categoryIcons: Record<string, string> = {
  Housing: "🏠",
  Transportation: "🚗",
  Food: "🍽️",
  Utilities: "💡",
  Healthcare: "🏥",
  Entertainment: "🎬",
  Shopping: "🛍️",
  Personal: "💇",
  Savings: "💰",
  Debt: "💳",
};

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const PeerComparisonWidget: React.FC<PeerComparisonWidgetProps> = ({
  className = "",
  compact = false,
}) => {
  const [data, setData] = useState<ComparisonSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);

  // Load comparison data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await comparisonApi.getSummary();
      setData(response);
    } catch (err) {
      console.error("Failed to load comparison data:", err);
      setError("Failed to load comparison data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate overall score
  const calculateOverallScore = (
    comparison: Record<string, CategoryComparison>,
  ): number => {
    const categories = Object.values(comparison).filter(
      (c) => c.percentile !== null,
    );
    if (categories.length === 0) return 50;

    const avgPercentile =
      categories.reduce((sum, c) => sum + (c.percentile || 50), 0) /
      categories.length;
    // Invert so lower spending = higher score
    return Math.round(100 - avgPercentile);
  };

  // Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  // Render loading state
  if (loading) {
    return (
      <div className={`bg-[var(--color-surface)] rounded-lg shadow-sm p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`bg-[var(--color-surface)] rounded-lg shadow-sm p-6 ${className}`}>
        <div className="text-center text-red-500">
          <p>{error}</p>
          <button
            onClick={loadData}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Render opted out state
  if (data?.optedOut) {
    return (
      <div className={`bg-[var(--color-surface)] rounded-lg shadow-sm p-6 ${className}`}>
        <div className="text-center text-[var(--color-muted-foreground)]">
          <span className="text-3xl mb-2 block">🔒</span>
          <p>Peer comparison is disabled</p>
          <p className="text-sm mt-1">
            Enable it in settings to see how you compare
          </p>
        </div>
      </div>
    );
  }

  // Render not available state
  if (!data?.available) {
    return (
      <div className={`bg-[var(--color-surface)] rounded-lg shadow-sm p-6 ${className}`}>
        <div className="text-center text-[var(--color-muted-foreground)]">
          <span className="text-3xl mb-2 block">📊</span>
          <p>{data?.message || "Comparison data not available"}</p>
          {data?.minRequired && data?.currentGroupSize !== undefined && (
            <p className="text-sm mt-1">
              Need {data.minRequired - data.currentGroupSize} more similar users
            </p>
          )}
        </div>
      </div>
    );
  }

  const comparison = data.comparison || {};
  const overallScore = calculateOverallScore(comparison);
  const categories = Object.entries(comparison).filter(
    ([_, c]) => c.status !== "no-data",
  );

  return (
    <div
      className={`bg-[var(--color-surface)] rounded-lg shadow-sm overflow-hidden ${className}`}
    >
      {/* Header */}
      <div
        className="p-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white cursor-pointer"
        onClick={() => compact && setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Peer Comparison</h3>
            <p className="text-purple-100 text-sm">
              vs {data.groupSize} similar households
            </p>
          </div>
          <div className="text-right">
            <div
              className={`text-3xl font-bold ${getScoreColor(overallScore)}`}
              style={{ color: "white" }}
            >
              {overallScore}
            </div>
            <div className="text-purple-100 text-xs">Financial Score</div>
          </div>
        </div>
        {compact && (
          <div className="mt-2 text-center">
            <span className="text-purple-200 text-sm">
              {expanded ? "▲ Collapse" : "▼ Expand"}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4">
          {/* Category List */}
          <div className="space-y-3">
            {categories.map(([category, comp]) => {
              const config = statusConfig[comp.status];
              const icon = categoryIcons[category] || "📊";

              return (
                <div key={category} className="flex items-center gap-3">
                  {/* Category Icon */}
                  <span className="text-xl w-8 text-center">{icon}</span>

                  {/* Category Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--color-foreground)] text-sm">
                        {category}
                      </span>
                      <span className={`text-sm font-medium ${config.color}`}>
                        {formatCurrency(comp.userAmount)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-1 relative">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            comp.status === "below-average"
                              ? "bg-green-500"
                              : comp.status === "average"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{
                            width: `${Math.min(100, comp.percentile || 0)}%`,
                          }}
                        />
                      </div>
                      {/* Percentile markers */}
                      <div className="absolute top-0 left-1/4 w-px h-2 bg-gray-400"></div>
                      <div className="absolute top-0 left-1/2 w-px h-2 bg-gray-400"></div>
                      <div className="absolute top-0 left-3/4 w-px h-2 bg-gray-400"></div>
                    </div>

                    {/* Comparison Text */}
                    <div className="flex items-center justify-between mt-1">
                      <span
                        className={`text-xs ${config.color} ${config.bgColor} px-2 py-0.5 rounded`}
                      >
                        {config.icon} {config.label}
                      </span>
                      {comp.vsAverage !== null && (
                        <span className="text-xs text-[var(--color-muted-foreground)]">
                          {comp.vsAverage > 0 ? "+" : ""}
                          {comp.vsAverage}% vs avg
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
            <div className="flex justify-center gap-4 text-xs text-[var(--color-muted-foreground)]">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                Below Avg
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                Average
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                Above Avg
              </span>
            </div>
          </div>

          {/* Group Info */}
          {data.groupCriteria && (
            <div className="mt-3 text-center text-xs text-[var(--color-muted-foreground)]">
              Comparing with {data.groupCriteria.region} •{" "}
              {data.groupCriteria.familySize} person household •{" "}
              {data.groupCriteria.incomeRange}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PeerComparisonWidget;
