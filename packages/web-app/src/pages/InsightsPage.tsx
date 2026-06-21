/**
 * Insights Page
 *
 * Displays financial insights, spending trends, and analytics.
 * Features:
 * - Weekly insight card with AI-generated insights
 * - AI financial coach ("Ask your AI coach") with chat bubble UI
 * - Spending pattern analysis (day of week, time of month)
 * - Spending trend chart (recharts, lazy-loaded, 6 or 12-month view with category filter)
 * - Category breakdown with comparisons
 * - Month-over-month analysis
 *
 * **Validates: Requirement 39.1, 39.3, 39.4, 39.8, 39.9**
 */

import React, { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import {
  insightsApi,
  WeeklyInsightsResponse,
  TrendsResponse,
  PatternsResponse,
} from "../services/insightsApi";
import { PageHeader, PremiumBadge, Skeleton } from "../components/ui";

// Lazy-load recharts — only needed on this page
const LazyTrendChart = lazy(() => import("../components/InsightsTrendChart"));

export const InsightsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [weeklyInsights, setWeeklyInsights] =
    useState<WeeklyInsightsResponse | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [patterns, setPatterns] = useState<PatternsResponse | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<"6" | "12">("6");

  // AI Ask feature state — chat thread UI
  const [askQuestion, setAskQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{question: string; answer: string; suggestions?: string[]}>>(() => {
    // Restore last 5 Q&A pairs from sessionStorage on mount
    try {
      const stored = sessionStorage.getItem('budgetbuddy_insights_chat');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
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
    const question = askQuestion.trim();

    try {
      setAskLoading(true);
      setAskQuestion("");
      const response = await insightsApi.askAboutSpending(question);

      const newEntry = {
        question,
        answer: response.answer,
        suggestions: response.suggestions,
      };

      setChatHistory(prev => {
        const updated = [...prev, newEntry].slice(-5); // Keep last 5
        try {
          sessionStorage.setItem('budgetbuddy_insights_chat', JSON.stringify(updated));
        } catch {
          // sessionStorage not available
        }
        return updated;
      });
      setAskLoading(false);
    } catch (error) {
      console.error("Error asking question:", error);
      setAskLoading(false);

      let errorMessage =
        "Sorry, I couldn't process your question. Please try again later.";
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        errorMessage =
          "Network error: Unable to connect to the server. Please check your internet connection and try again.";
      }

      const errorEntry = {
        question,
        answer: errorMessage,
        suggestions: [
          "How much did I spend on groceries?",
          "What's my biggest expense category?",
          "Am I spending more than last month?",
        ],
      };

      setChatHistory(prev => {
        const updated = [...prev, errorEntry].slice(-5);
        try {
          sessionStorage.setItem('budgetbuddy_insights_chat', JSON.stringify(updated));
        } catch {
          // sessionStorage not available
        }
        return updated;
      });
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setAskQuestion(suggestion);
    // Auto-submit after a tick so state is set
    setTimeout(() => {
      // Trigger via direct call since handleAskQuestion reads from state
      if (!suggestion.trim()) return;
      const question = suggestion.trim();
      setAskLoading(true);
      setAskQuestion("");
      insightsApi.askAboutSpending(question).then(response => {
        const newEntry = { question, answer: response.answer, suggestions: response.suggestions };
        setChatHistory(prev => {
          const updated = [...prev, newEntry].slice(-5);
          try { sessionStorage.setItem('budgetbuddy_insights_chat', JSON.stringify(updated)); } catch { /* ok */ }
          return updated;
        });
        setAskLoading(false);
      }).catch(() => {
        setAskLoading(false);
      });
    }, 0);
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
    return "text-[var(--color-muted-foreground)]";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)]">
        <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="h-8 w-48 rounded animate-pulse bg-gray-200 mb-2" />
            <div className="h-4 w-64 rounded animate-pulse bg-[var(--color-muted)]" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          <div className="h-32 w-full rounded-lg animate-pulse bg-gray-200" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-28 rounded-lg animate-pulse bg-[var(--color-surface)] border border-[var(--color-border)]" />)}
          </div>
          <div className="h-48 w-full rounded-lg animate-pulse bg-[var(--color-surface)] border border-[var(--color-border)]" />
          <div className="h-72 w-full rounded-lg animate-pulse bg-[var(--color-surface)] border border-[var(--color-border)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate("/budget")}
            className="px-4 py-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] mb-2"
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
            <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[var(--color-muted-foreground)] text-sm">
                  This Week's Spending
                </span>
                <span className="text-2xl">💸</span>
              </div>
              <div className="text-2xl font-bold text-[var(--color-foreground)]">
                {formatCurrency(weeklyInsights.summary.totalSpent)}
              </div>
              <div
                className={`text-sm mt-1 ${getChangeColor(weeklyInsights.comparison.spendingChange)}`}
              >
                {formatPercent(weeklyInsights.comparison.spendingChange)} vs
                last week
              </div>
            </div>

            <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[var(--color-muted-foreground)] text-sm">Income</span>
                <span className="text-2xl">💰</span>
              </div>
              <div className="text-2xl font-bold text-[var(--color-foreground)]">
                {formatCurrency(weeklyInsights.summary.totalIncome)}
              </div>
              <div
                className={`text-sm mt-1 ${getChangeColor(-weeklyInsights.comparison.incomeChange)}`}
              >
                {formatPercent(weeklyInsights.comparison.incomeChange)} vs last
                week
              </div>
            </div>

            <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[var(--color-muted-foreground)] text-sm">Savings Rate</span>
                <span className="text-2xl">🏦</span>
              </div>
              <div className="text-2xl font-bold text-[var(--color-foreground)]">
                {((weeklyInsights.summary.savingsRate ?? 0) || 0).toFixed(1)}%
              </div>
              <div className="text-sm text-[var(--color-muted-foreground)] mt-1">
                {weeklyInsights.summary.transactionCount} transactions
              </div>
            </div>
          </div>
        )}

        {/* AI Ask About Spending Section — chat bubble UI */}
        <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
                Ask Your AI Coach
              </h2>
              <PremiumBadge feature="AI Coach with memory" /></div>
            <button
              onClick={() => setShowAskSection(!showAskSection)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {showAskSection ? "Hide" : "Show"}
            </button>
          </div>

          {showAskSection && (
            <div className="space-y-4">
              {/* Chat history */}
              {chatHistory.length > 0 && (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {chatHistory.map((entry, i) => (
                    <div key={i} className="space-y-2">
                      {/* User bubble — right */}
                      <div className="flex justify-end">
                        <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-tr-sm max-w-xs lg:max-w-md text-sm">
                          {entry.question}
                        </div>
                      </div>
                      {/* AI bubble — left */}
                      <div className="flex justify-start">
                        <div className="bg-[var(--color-muted)] text-[var(--color-foreground)] px-4 py-2 rounded-2xl rounded-tl-sm max-w-xs lg:max-w-md text-sm">
                          {entry.answer}
                          {entry.suggestions && entry.suggestions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {entry.suggestions.map((s, si) => (
                                <button
                                  key={si}
                                  onClick={() => handleSuggestionClick(s)}
                                  className="px-2 py-0.5 text-xs bg-[var(--color-surface)] text-blue-600 rounded border border-blue-200 hover:bg-blue-50"
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Typing indicator */}
                  {askLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[var(--color-muted)] px-4 py-3 rounded-2xl rounded-tl-sm">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Premium memory note */}
                  <p className="text-xs text-[var(--color-muted-foreground)] text-center mt-2">
                    Conversation history persists for this session only.
                    <button
                      onClick={() => { window.location.href = '/auth?upgrade=1'; }}
                      className="ml-1 text-amber-600 hover:underline"
                    >
                      Upgrade to Premium
                    </button>
                    {' '}to keep your history across sessions.
                  </p>
                </div>
              )}

              {/* Suggestion chips — show when no history */}
              {chatHistory.length === 0 && !askLoading && (
                <div className="flex flex-wrap gap-2">
                  {[
                    "How much did I spend on groceries?",
                    "What's my biggest expense?",
                    "Am I on track this month?",
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-3 py-1 text-sm bg-[var(--color-muted)] text-[var(--color-foreground)] rounded-full hover:bg-gray-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Input row */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={askQuestion}
                  onChange={(e) => setAskQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAskQuestion()}
                  placeholder="Ask anything about your spending..."
                  className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={askLoading}
                />
                <button
                  onClick={handleAskQuestion}
                  disabled={askLoading || !askQuestion.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ask
                </button>
                {chatHistory.length > 0 && (
                  <button
                    onClick={() => {
                      setChatHistory([]);
                      try { sessionStorage.removeItem('budgetbuddy_insights_chat'); } catch { /* ok */ }
                    }}
                    className="px-3 py-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-muted-foreground)] text-sm"
                    title="Clear conversation"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Spending Patterns Section */}
        {patterns && patterns.patterns && (
          <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">
              Spending Patterns
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Day of Week Pattern */}
              {patterns.patterns.dayOfWeek &&
                patterns.patterns.dayOfWeek.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-[var(--color-foreground)] mb-3">
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
                            <span className="w-12 text-xs text-[var(--color-muted-foreground)]">
                              {day.day.slice(0, 3)}
                            </span>
                            <div className="flex-1 bg-[var(--color-muted)] rounded-full h-4">
                              <div
                                className="bg-blue-500 h-4 rounded-full"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="w-20 text-xs text-[var(--color-muted-foreground)] text-right">
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
                    <h3 className="text-sm font-medium text-[var(--color-foreground)] mb-3">
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
                            <span className="w-20 text-xs text-[var(--color-muted-foreground)]">
                              {period.period}
                            </span>
                            <div className="flex-1 bg-[var(--color-muted)] rounded-full h-4">
                              <div
                                className="bg-purple-500 h-4 rounded-full"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="w-20 text-xs text-[var(--color-muted-foreground)] text-right">
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
                  <h3 className="text-sm font-medium text-[var(--color-foreground)] mb-3">
                    Top Merchants
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {patterns.patterns.topMerchants.slice(0, 8).map((m, i) => (
                      <div
                        key={i}
                        className="px-3 py-2 bg-[var(--color-background)] rounded-lg text-sm"
                      >
                        <span className="font-medium text-[var(--color-foreground)]">
                          {m.merchant}
                        </span>
                        <span className="text-[var(--color-muted-foreground)] ml-2">
                          {formatCurrency(m.amount)}
                        </span>
                        <span className="text-[var(--color-muted-foreground)] ml-1">({m.count}x)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Spending Trends Chart — recharts (lazy loaded) */}
        {trends && (
          <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
                Spending Trends
              </h2>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedPeriod("6")}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    selectedPeriod === "6"
                      ? "bg-blue-600 text-white"
                      : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:bg-gray-200"
                  }`}
                >
                  6 Months
                </button>
                <button
                  onClick={() => setSelectedPeriod("12")}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    selectedPeriod === "12"
                      ? "bg-blue-600 text-white"
                      : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:bg-gray-200"
                  }`}
                >
                  12 Months
                </button>
              </div>
            </div>

            <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
              <LazyTrendChart
                months={trends.months}
                spending={trends.spending}
                income={trends.income}
                analysis={trends.analysis}
              />
            </Suspense>
          </div>
        )}

        {/* Category Breakdown */}
        {weeklyInsights && weeklyInsights.categoryBreakdown.length > 0 && (
          <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">
              Top Spending Categories
            </h2>
            <div className="space-y-4">
              {weeklyInsights.categoryBreakdown
                .slice(0, 5)
                .map((category, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[var(--color-foreground)]">
                        {category.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--color-foreground)]">
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
              <div key={index} className="bg-[var(--color-surface)] rounded-lg p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">
                    {getInsightIcon(insight.type)}
                  </span>
                  <div>
                    <h3 className="font-semibold text-[var(--color-foreground)] mb-1">
                      {insight.title}
                    </h3>
                    <p className="text-sm text-[var(--color-muted-foreground)]">{insight.message}</p>
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
