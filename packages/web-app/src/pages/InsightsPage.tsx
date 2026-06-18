/**
 * Insights Page
 *
 * Displays financial insights, spending trends, and analytics.
 * Features:
 * - Weekly insight card with AI-generated insights
 * - AI-powered "Ask about spending" feature
 * - Spending pattern analysis (day of week, time of month)
 * - Spending trend chart (6-month view)
 * - Category breakdown with comparisons
 * - Month-over-month analysis
 *
 * **Validates: Requirement 39.1, 39.3, 39.4, 39.8, 39.9**
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  insightsApi,
  WeeklyInsightsResponse,
  TrendsResponse,
  PatternsResponse,
  AskResponse,
} from "../services/insightsApi";
import { PageHeader } from "../components/ui";

export const InsightsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [weeklyInsights, setWeeklyInsights] =
    useState<WeeklyInsightsResponse | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [patterns, setPatterns] = useState<PatternsResponse | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<"6" | "12">("6");

  // AI Ask feature state
  const [askQuestion, setAskQuestion] = useState("");
  const [askResponse, setAskResponse] = useState<AskResponse | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [showAskSection, setShowAskSection] = useState(false);

  useEffect(() => {
    loadInsights();
  }, [selectedPeriod]);

  const loadInsights = async () => {
    try {
      setLoading(true);

      // Load weekly insights, trends, and patterns in parallel
      const [weeklyData, trendsData, patternsData] = await Promise.all([
        insightsApi.getWeeklyInsights(),
        insightsApi.getTrends(parseInt(selectedPeriod)),
        insightsApi.getPatterns(3),
      ]);

      setWeeklyInsights(weeklyData);
      setTrends(trendsData);
      setPatterns(patternsData);
      setLoading(false);
    } catch (error) {
      console.error("Error loading insights:", error);
      // Set error state for network errors - could add error state to component
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        console.error("Network error: Unable to connect to the server");
      }
      setLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!askQuestion.trim()) return;

    try {
      setAskLoading(true);
      const response = await insightsApi.askAboutSpending(askQuestion);
      setAskResponse(response);
      setAskLoading(false);
    } catch (error) {
      console.error("Error asking question:", error);
      setAskLoading(false);

      // Detect network errors specifically
      let errorMessage =
        "Sorry, I couldn't process your question. Please try again later.";
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        errorMessage =
          "Network error: Unable to connect to the server. Please check your internet connection and try again.";
      }

      setAskResponse({
        question: askQuestion,
        answer: errorMessage,
        suggestions: [
          "How much did I spend on groceries?",
          "What's my biggest expense category?",
          "Am I spending more than last month?",
        ],
      });
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setAskQuestion(suggestion);
    // Auto-submit after setting the question
    setTimeout(() => {
      handleAskQuestion();
    }, 100);
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount == null || isNaN(amount as number)) return '$0.00';
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount as number);
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
          <button
            onClick={() => navigate("/budget")}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            ← Back to Budget
          </button>
          <PageHeader
            title="Financial Insights"
            subtitle="Understand your spending patterns and trends"
          />
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
                {((weeklyInsights.summary.savingsRate ?? 0) || 0).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {weeklyInsights.summary.transactionCount} transactions
              </div>
            </div>
          </div>
        )}

        {/* AI Ask About Spending Section */}
        <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <h2 className="text-lg font-semibold text-gray-900">
                Ask About Your Spending
              </h2>
            </div>
            <button
              onClick={() => setShowAskSection(!showAskSection)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {showAskSection ? "Hide" : "Show"}
            </button>
          </div>

          {showAskSection && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={askQuestion}
                  onChange={(e) => setAskQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAskQuestion()}
                  placeholder="Ask anything about your spending..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleAskQuestion}
                  disabled={askLoading || !askQuestion.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {askLoading ? "..." : "Ask"}
                </button>
              </div>

              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  "How much did I spend on groceries?",
                  "What's my biggest expense?",
                  "Am I on track this month?",
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              {/* AI Response */}
              {askResponse && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">💬</span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">
                        "{askResponse.question}"
                      </p>
                      <p className="text-gray-900">{askResponse.answer}</p>
                      {askResponse.suggestions &&
                        askResponse.suggestions.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 mb-2">
                              Try asking:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {askResponse.suggestions.map((s, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleSuggestionClick(s)}
                                  className="px-2 py-1 text-xs bg-white text-blue-600 rounded border border-blue-200 hover:bg-blue-50"
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Spending Patterns Section */}
        {patterns && patterns.patterns && (
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Spending Patterns
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Day of Week Pattern */}
              {patterns.patterns.dayOfWeek &&
                patterns.patterns.dayOfWeek.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      By Day of Week
                    </h3>
                    <div className="space-y-2">
                      {patterns.patterns.dayOfWeek.map((day, i) => {
                        const maxAmount = Math.max(
                          ...patterns.patterns.dayOfWeek.map((d) => d.amount),
                        );
                        const percentage = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0;
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="w-12 text-xs text-gray-600">
                              {day.day.slice(0, 3)}
                            </span>
                            <div className="flex-1 bg-gray-100 rounded-full h-4">
                              <div
                                className="bg-blue-500 h-4 rounded-full"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="w-20 text-xs text-gray-600 text-right">
                              {formatCurrency(day.amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Time of Month Pattern */}
              {patterns.patterns.timeOfMonth &&
                patterns.patterns.timeOfMonth.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      By Time of Month
                    </h3>
                    <div className="space-y-2">
                      {patterns.patterns.timeOfMonth.map((period, i) => {
                        const maxAmount = Math.max(
                          ...patterns.patterns.timeOfMonth.map((p) => p.amount),
                        );
                        const percentage = maxAmount > 0 ? (period.amount / maxAmount) * 100 : 0;
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="w-20 text-xs text-gray-600">
                              {period.period}
                            </span>
                            <div className="flex-1 bg-gray-100 rounded-full h-4">
                              <div
                                className="bg-purple-500 h-4 rounded-full"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="w-20 text-xs text-gray-600 text-right">
                              {formatCurrency(period.amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>

            {/* Top Merchants */}
            {patterns.patterns.topMerchants &&
              patterns.patterns.topMerchants.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Top Merchants
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {patterns.patterns.topMerchants.slice(0, 8).map((m, i) => (
                      <div
                        key={i}
                        className="px-3 py-2 bg-gray-50 rounded-lg text-sm"
                      >
                        <span className="font-medium text-gray-900">
                          {m.merchant}
                        </span>
                        <span className="text-gray-500 ml-2">
                          {formatCurrency(m.amount)}
                        </span>
                        <span className="text-gray-400 ml-1">({m.count}x)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
