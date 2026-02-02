/**
 * Insights Screen
 *
 * Displays financial insights, spending trends, and AI-powered analytics.
 * Features:
 * - Weekly insight card with AI-generated insights
 * - AI-powered "Ask about spending" feature
 * - Spending pattern analysis (day of week, time of month)
 * - Spending trend visualization
 * - Category breakdown with comparisons
 *
 * **Validates: Requirement 39**
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  insightsService,
  WeeklyInsightsResponse,
  TrendsResponse,
  PatternsResponse,
  AskResponse,
} from "../services/insights";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const InsightsScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weeklyInsights, setWeeklyInsights] =
    useState<WeeklyInsightsResponse | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [patterns, setPatterns] = useState<PatternsResponse | null>(null);

  // AI Ask feature state
  const [askQuestion, setAskQuestion] = useState("");
  const [askResponse, setAskResponse] = useState<AskResponse | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [showAskSection, setShowAskSection] = useState(false);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      setLoading(true);

      const [weeklyData, trendsData, patternsData] = await Promise.all([
        insightsService.getWeeklyInsights(),
        insightsService.getTrends(6),
        insightsService.getPatterns(3),
      ]);

      setWeeklyInsights(weeklyData);
      setTrends(trendsData);
      setPatterns(patternsData);
    } catch (error) {
      console.error("Error loading insights:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInsights();
    setRefreshing(false);
  }, []);

  const handleAskQuestion = async () => {
    if (!askQuestion.trim()) return;

    try {
      setAskLoading(true);
      const response = await insightsService.askAboutSpending(askQuestion);
      setAskResponse(response);
    } catch (error) {
      console.error("Error asking question:", error);
      setAskResponse({
        question: askQuestion,
        answer:
          "Sorry, I couldn't process your question. Please try again later.",
        suggestions: [
          "How much did I spend on groceries?",
          "What's my biggest expense category?",
          "Am I spending more than last month?",
        ],
      });
    } finally {
      setAskLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setAskQuestion(suggestion);
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
    if (change > 0) return styles.textRed;
    if (change < 0) return styles.textGreen;
    return styles.textGray;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading insights...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Financial Insights</Text>
          <Text style={styles.headerSubtitle}>
            Understand your spending patterns
          </Text>
        </View>

        {/* Weekly Insight Highlight */}
        {weeklyInsights && weeklyInsights.insights.length > 0 && (
          <View style={styles.highlightCard}>
            <View style={styles.highlightHeader}>
              <Text style={styles.highlightIcon}>
                {getInsightIcon(weeklyInsights.insights[0].type)}
              </Text>
              <View style={styles.highlightHeaderText}>
                <Text style={styles.highlightLabel}>Weekly Insight</Text>
                <Text style={styles.highlightPeriod}>
                  {weeklyInsights.period.start} - {weeklyInsights.period.end}
                </Text>
              </View>
            </View>
            <Text style={styles.highlightTitle}>
              {weeklyInsights.insights[0].title}
            </Text>
            <Text style={styles.highlightMessage}>
              {weeklyInsights.insights[0].message}
            </Text>
          </View>
        )}

        {/* Summary Cards */}
        {weeklyInsights && (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>This Week</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(weeklyInsights.summary.totalSpent)}
              </Text>
              <Text
                style={[
                  styles.summaryChange,
                  getChangeColor(weeklyInsights.comparison.spendingChange),
                ]}
              >
                {formatPercent(weeklyInsights.comparison.spendingChange)} vs
                last week
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Savings Rate</Text>
              <Text style={styles.summaryValue}>
                {weeklyInsights.summary.savingsRate.toFixed(1)}%
              </Text>
              <Text style={styles.summarySubtext}>
                {weeklyInsights.summary.transactionCount} transactions
              </Text>
            </View>
          </View>
        )}

        {/* AI Ask Section */}
        <View style={styles.askSection}>
          <TouchableOpacity
            style={styles.askHeader}
            onPress={() => setShowAskSection(!showAskSection)}
          >
            <View style={styles.askHeaderLeft}>
              <Text style={styles.askIcon}>🤖</Text>
              <Text style={styles.askTitle}>Ask About Your Spending</Text>
            </View>
            <Text style={styles.askToggle}>{showAskSection ? "▲" : "▼"}</Text>
          </TouchableOpacity>

          {showAskSection && (
            <View style={styles.askContent}>
              <View style={styles.askInputContainer}>
                <TextInput
                  style={styles.askInput}
                  value={askQuestion}
                  onChangeText={setAskQuestion}
                  placeholder="Ask anything about your spending..."
                  placeholderTextColor="#9ca3af"
                  onSubmitEditing={handleAskQuestion}
                />
                <TouchableOpacity
                  style={[
                    styles.askButton,
                    (!askQuestion.trim() || askLoading) &&
                      styles.askButtonDisabled,
                  ]}
                  onPress={handleAskQuestion}
                  disabled={!askQuestion.trim() || askLoading}
                >
                  <Text style={styles.askButtonText}>
                    {askLoading ? "..." : "Ask"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Suggestions */}
              <View style={styles.suggestionsContainer}>
                {[
                  "How much on groceries?",
                  "Biggest expense?",
                  "On track this month?",
                ].map((suggestion, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.suggestionChip}
                    onPress={() => handleSuggestionClick(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* AI Response */}
              {askResponse && (
                <View style={styles.responseContainer}>
                  <Text style={styles.responseQuestion}>
                    "{askResponse.question}"
                  </Text>
                  <Text style={styles.responseAnswer}>
                    {askResponse.answer}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Spending Patterns */}
        {patterns && patterns.patterns && (
          <View style={styles.patternsSection}>
            <Text style={styles.sectionTitle}>Spending Patterns</Text>

            {/* Day of Week */}
            {patterns.patterns.dayOfWeek &&
              patterns.patterns.dayOfWeek.length > 0 && (
                <View style={styles.patternCard}>
                  <Text style={styles.patternTitle}>By Day of Week</Text>
                  {patterns.patterns.dayOfWeek.map((day, i) => {
                    const maxAmount = Math.max(
                      ...patterns.patterns.dayOfWeek.map((d) => d.amount),
                    );
                    const percentage = (day.amount / maxAmount) * 100;
                    return (
                      <View key={i} style={styles.patternRow}>
                        <Text style={styles.patternLabel}>
                          {day.day.slice(0, 3)}
                        </Text>
                        <View style={styles.patternBarContainer}>
                          <View
                            style={[
                              styles.patternBar,
                              { width: `${percentage}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.patternAmount}>
                          {formatCurrency(day.amount)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

            {/* Top Merchants */}
            {patterns.patterns.topMerchants &&
              patterns.patterns.topMerchants.length > 0 && (
                <View style={styles.patternCard}>
                  <Text style={styles.patternTitle}>Top Merchants</Text>
                  <View style={styles.merchantsContainer}>
                    {patterns.patterns.topMerchants.slice(0, 5).map((m, i) => (
                      <View key={i} style={styles.merchantChip}>
                        <Text style={styles.merchantName}>{m.merchant}</Text>
                        <Text style={styles.merchantAmount}>
                          {formatCurrency(m.amount)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
          </View>
        )}

        {/* Category Breakdown */}
        {weeklyInsights && weeklyInsights.categoryBreakdown.length > 0 && (
          <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>Top Categories</Text>
            {weeklyInsights.categoryBreakdown.slice(0, 5).map((category, i) => (
              <View key={i} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category.category}</Text>
                  <Text style={styles.categoryAmount}>
                    {formatCurrency(category.amount)}
                  </Text>
                </View>
                <View style={styles.categoryBarContainer}>
                  <View
                    style={[
                      styles.categoryBar,
                      { width: `${category.percentage}%` },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Additional Insights */}
        {weeklyInsights && weeklyInsights.insights.length > 1 && (
          <View style={styles.additionalInsights}>
            <Text style={styles.sectionTitle}>More Insights</Text>
            {weeklyInsights.insights.slice(1).map((insight, i) => (
              <View key={i} style={styles.insightCard}>
                <Text style={styles.insightIcon}>
                  {getInsightIcon(insight.type)}
                </Text>
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightMessage}>{insight.message}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
  },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  highlightCard: {
    margin: 16,
    padding: 16,
    backgroundColor: "#3b82f6",
    borderRadius: 12,
  },
  highlightHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  highlightIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  highlightHeaderText: {
    flex: 1,
  },
  highlightLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#dbeafe",
    textTransform: "uppercase",
  },
  highlightPeriod: {
    fontSize: 11,
    color: "#bfdbfe",
  },
  highlightTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  highlightMessage: {
    fontSize: 14,
    color: "#dbeafe",
    lineHeight: 20,
  },
  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  summaryChange: {
    fontSize: 12,
    marginTop: 4,
  },
  summarySubtext: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  textRed: {
    color: "#dc2626",
  },
  textGreen: {
    color: "#16a34a",
  },
  textGray: {
    color: "#6b7280",
  },
  askSection: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  askHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  askHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  askIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  askTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  askToggle: {
    fontSize: 12,
    color: "#6b7280",
  },
  askContent: {
    padding: 16,
    paddingTop: 0,
  },
  askInputContainer: {
    flexDirection: "row",
    gap: 8,
  },
  askInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#111827",
  },
  askButton: {
    height: 44,
    paddingHorizontal: 16,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  askButtonDisabled: {
    opacity: 0.5,
  },
  askButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  suggestionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 16,
  },
  suggestionText: {
    fontSize: 12,
    color: "#4b5563",
  },
  responseContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
  },
  responseQuestion: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
    fontStyle: "italic",
  },
  responseAnswer: {
    fontSize: 14,
    color: "#111827",
    lineHeight: 20,
  },
  patternsSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  patternCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  patternTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 12,
  },
  patternRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  patternLabel: {
    width: 36,
    fontSize: 12,
    color: "#6b7280",
  },
  patternBarContainer: {
    flex: 1,
    height: 16,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    marginHorizontal: 8,
  },
  patternBar: {
    height: 16,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
  },
  patternAmount: {
    width: 70,
    fontSize: 12,
    color: "#6b7280",
    textAlign: "right",
  },
  merchantsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  merchantChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  merchantName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
  },
  merchantAmount: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  categoriesSection: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  categoryRow: {
    marginBottom: 12,
  },
  categoryInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  categoryBarContainer: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
  },
  categoryBar: {
    height: 8,
    backgroundColor: "#3b82f6",
    borderRadius: 4,
  },
  additionalInsights: {
    margin: 16,
  },
  insightCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  insightIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  insightMessage: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  bottomPadding: {
    height: 32,
  },
});

export default InsightsScreen;
