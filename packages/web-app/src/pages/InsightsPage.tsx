/**
 * Insights Page
 *
 * Displays financial insights, spending trends, and analytics.
 * Features:
 * - Weekly insight card with AI-generated insights
 * - Spending trend chart (6-month view)
 * - Category breakdown with comparisons
 * - Month-over-month analysis
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  insightsApi,
  WeeklyInsightsResponse,
  TrendsResponse,
} from "../services/insightsApi";

export const InsightsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [weeklyInsights, setWeeklyInsights] =
    useState<WeeklyInsightsResponse | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<"6" | "12">("6");

  useEffect(() => {
    loadInsights();
  }, [selectedPeriod]);

  const loadInsights = async () => {
    try {
      setLoading(true);

      // Load weekly insights and trends in parallel
      const [weeklyData, trendsData] = await Promise.all([
        insightsApi.getWeeklyInsights(),
        insightsApi.getTrends(parseInt(selectedPeriod)),
      ]);

      setWeeklyInsights(weeklyData);
      setTrends(trendsData);
      setLoading(false);
    } catch (error) {
      console.error("Error loading insights:", error);
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

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "positive":
        return "✅";
      case "warning":
        return "⚠️";
      default:
        return "💡";
    }
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-red-600";
    if (change < 0) return "text-green-600";
    return "text-gray-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Financial Insights
              </h1>
              <p className="text-gray-600 mt-1">
                Understand your spending patterns and trends
              </p>
            </div>
            <button
              onClick={() => navigate("/budget")}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Back to Budget
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Weekly Insight Highlight */}
        {weeklyInsights && weeklyInsights.insights.length > 0 && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white mb-6 shadow-lg">
            <div className="flex items-start gap-4">
              <span className="text-4xl">
                {getInsightIcon(weeklyInsights.insights[0].type)}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold uppercase tracking-wide">
                    Weekly Insight
                  </span>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">
                    {weeklyInsights.period.start} - {weeklyInsights.period.end}
                  </span>
                </div>
                <h2 className="text-xl font-bold mb-2">
                  {weeklyInsights.insights[0].title}
                </h2>
                <p className="text-blue-50">
                  {weeklyInsights.insights[0].message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {weeklyInsights && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">
                  This Week's Spending
                </span>
                <span className="text-2xl">💸</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(weeklyInsights.summary.totalSpent)}
              </div>
              <div
                className={`text-sm mt-1 ${getChangeColor(weeklyInsights.comparison.spendingChange)}`}
              >
                {formatPercent(weeklyInsights.comparison.spendingChange)} vs
                last week
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Income</span>
                <span className="text-2xl">💰</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(weeklyInsights.summary.totalIncome)}
              </div>
              <div
                className={`text-sm mt-1 ${getChangeColor(-weeklyInsights.comparison.incomeChange)}`}
              >
                {formatPercent(weeklyInsights.comparison.incomeChange)} vs last
                week
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Savings Rate</span>
                <span className="text-2xl">🏦</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {weeklyInsights.summary.savingsRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {weeklyInsights.summary.transactionCount} transactions
              </div>
            </div>
          </div>
        )}

        {/* Spending Trends Chart */}
        {trends && (
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Spending Trends
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedPeriod("6")}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    selectedPeriod === "6"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  6 Months
                </button>
                <button
                  onClick={() => setSelectedPeriod("12")}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    selectedPeriod === "12"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  12 Months
                </button>
              </div>
            </div>

            {/* Simple Line Chart */}
            <div className="relative h-64">
              <svg
                className="w-full h-full"
                viewBox="0 0 800 250"
                preserveAspectRatio="none"
              >
                {/* Grid lines */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={i * 50}
                    x2="800"
                    y2={i * 50}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                ))}

                {/* Spending line */}
                {trends.spending.length > 1 && (
                  <polyline
                    points={trends.spending
                      .map((value, i) => {
                        const x = (i / (trends.spending.length - 1)) * 800;
                        const maxValue = Math.max(...trends.spending);
                        const y = 250 - (value / maxValue) * 200;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                  />
                )}

                {/* Income line */}
                {trends.income.length > 1 && (
                  <polyline
                    points={trends.income
                      .map((value, i) => {
                        const x = (i / (trends.income.length - 1)) * 800;
                        const maxValue = Math.max(...trends.income);
                        const y = 250 - (value / maxValue) * 200;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeDasharray="5,5"
                  />
                )}
              </svg>

              {/* Month labels */}
              <div className="flex justify-between mt-2 text-xs text-gray-600">
                {trends.months.map((month, i) => (
                  <span key={i}>{month}</span>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-6 mt-4 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-blue-600"></div>
                <span className="text-sm text-gray-600">Spending</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-1 bg-green-600"
                  style={{ borderTop: "1px dashed" }}
                ></div>
                <span className="text-sm text-gray-600">Income</span>
              </div>
            </div>

            {/* Trend Analysis */}
            {trends.analysis && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Spending Trend:</span>
                    <span
                      className={`ml-2 font-medium ${
                        trends.analysis.spendingTrend === "increasing"
                          ? "text-red-600"
                          : trends.analysis.spendingTrend === "decreasing"
                            ? "text-green-600"
                            : "text-gray-600"
                      }`}
                    >
                      {trends.analysis.spendingTrend === "increasing"
                        ? "📈 Increasing"
                        : trends.analysis.spendingTrend === "decreasing"
                          ? "📉 Decreasing"
                          : "➡️ Stable"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Average Spending:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {formatCurrency(trends.analysis.averageSpending)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Category Breakdown */}
        {weeklyInsights && weeklyInsights.categoryBreakdown.length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Top Spending Categories
            </h2>
            <div className="space-y-4">
              {weeklyInsights.categoryBreakdown
                .slice(0, 5)
                .map((category, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {category.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(category.amount)}
                        </span>
                        {category.changePercent !== undefined && (
                          <span
                            className={`text-xs ${getChangeColor(category.changePercent)}`}
                          >
                            {formatPercent(category.changePercent)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${category.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Additional Insights */}
        {weeklyInsights && weeklyInsights.insights.length > 1 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {weeklyInsights.insights.slice(1).map((insight, index) => (
              <div key={index} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">
                    {getInsightIcon(insight.type)}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {insight.title}
                    </h3>
                    <p className="text-sm text-gray-600">{insight.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightsPage;
