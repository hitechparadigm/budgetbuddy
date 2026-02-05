/**
 * Credit Score Screen
 *
 * Displays current credit score, history, and improvement tips.
 * Features:
 * - Current score with rating
 * - Score change indicator
 * - Factors affecting score
 * - Score history
 * - Personalized improvement tips
 * - Refresh functionality
 *
 * **Validates: Requirement 43**
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  creditScoreService,
  CreditScore,
  CreditScoreHistoryEntry,
} from "../services/creditScore";

export const CreditScoreScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creditScore, setCreditScore] = useState<CreditScore | null>(null);
  const [history, setHistory] = useState<CreditScoreHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [scoreData, historyData] = await Promise.all([
        creditScoreService.getCreditScore(),
        creditScoreService.getHistory(),
      ]);

      setCreditScore(scoreData);
      setHistory(historyData.history);
    } catch (err: any) {
      console.error("Error loading credit score:", err);
      setError(err.response?.data?.message || "Failed to load credit score");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleRefreshScore = async () => {
    try {
      setRefreshing(true);
      setError(null);

      const updatedScore = await creditScoreService.refreshScore();
      setCreditScore(updatedScore);

      // Reload history
      const historyData = await creditScoreService.getHistory();
      setHistory(historyData.history);

      Alert.alert("Success", "Credit score refreshed successfully");
    } catch (err: any) {
      console.error("Error refreshing credit score:", err);
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to refresh credit score",
      );
    } finally {
      setRefreshing(false);
    }
  };

  const getRatingColor = (rating: string): string => {
    switch (rating.toLowerCase()) {
      case "excellent":
        return "#10B981";
      case "very good":
        return "#3B82F6";
      case "good":
        return "#F59E0B";
      case "fair":
        return "#F97316";
      case "poor":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getImpactColor = (impact: string): string => {
    switch (impact) {
      case "high":
        return "#FEE2E2";
      case "medium":
        return "#FEF3C7";
      case "low":
        return "#D1FAE5";
      default:
        return "#F3F4F6";
    }
  };

  const getImpactTextColor = (impact: string): string => {
    switch (impact) {
      case "high":
        return "#991B1B";
      case "medium":
        return "#92400E";
      case "low":
        return "#065F46";
      default:
        return "#374151";
    }
  };

  const getImprovementTips = (): { category: string; tips: string[] }[] => {
    if (!creditScore || !creditScore.score) return [];

    const tipsByCategory: { category: string; tips: string[] }[] = [];

    // Analyze factors
    const hasPaymentIssues = creditScore.factors.some(
      (f) =>
        f.name.toLowerCase().includes("payment") &&
        f.status.toLowerCase().includes("negative"),
    );
    const hasUtilizationIssues = creditScore.factors.some(
      (f) =>
        f.name.toLowerCase().includes("utilization") &&
        f.status.toLowerCase().includes("negative"),
    );

    // Payment History Tips
    if (hasPaymentIssues || creditScore.score < 670) {
      tipsByCategory.push({
        category: "Payment History (35%)",
        tips: [
          "Set up automatic payments for all bills",
          "Make on-time payments for 6-12 months",
          "Contact creditors about payment plans if needed",
        ],
      });
    }

    // Credit Utilization Tips
    if (hasUtilizationIssues || creditScore.score < 740) {
      tipsByCategory.push({
        category: "Credit Utilization (30%)",
        tips: [
          "Keep balances below 30% of credit limit",
          "Pay down high-balance cards first",
          "Make multiple payments per month",
          "Request credit limit increases",
        ],
      });
    }

    // General Tips
    tipsByCategory.push({
      category: "General Best Practices",
      tips: [
        "Check credit report annually for errors",
        "Monitor credit regularly",
        "Be patient - improvements take 3-6 months",
        creditScore.score >= 740
          ? "Keep up the great work!"
          : "Small improvements add up over time",
      ],
    });

    return tipsByCategory;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading credit score...</Text>
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
          <Text style={styles.title}>Credit Score</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefreshScore}
            disabled={refreshing}
          >
            <Text style={styles.refreshButtonText}>
              {refreshing ? "Refreshing..." : "Refresh"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Current Score Card */}
        {creditScore?.score ? (
          <>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreValue}>{creditScore.score}</Text>
              <Text
                style={[
                  styles.scoreRating,
                  { color: getRatingColor(creditScore.rating) },
                ]}
              >
                {creditScore.rating}
              </Text>
              {creditScore.change !== 0 && (
                <View style={styles.changeContainer}>
                  <Text
                    style={[
                      styles.changeText,
                      {
                        color:
                          creditScore.changeDirection === "up"
                            ? "#10B981"
                            : "#EF4444",
                      },
                    ]}
                  >
                    {creditScore.changeDirection === "up" ? "↑" : "↓"}{" "}
                    {Math.abs(creditScore.change)} points
                  </Text>
                </View>
              )}
              <Text style={styles.lastUpdated}>
                Last updated:{" "}
                {new Date(creditScore.lastUpdated).toLocaleDateString()}
              </Text>
            </View>

            {/* Factors Affecting Score */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Factors Affecting Score</Text>
              {creditScore.factors.map((factor, index) => (
                <View key={index} style={styles.factorCard}>
                  <View style={styles.factorHeader}>
                    <Text style={styles.factorName}>{factor.name}</Text>
                    <View
                      style={[
                        styles.impactBadge,
                        { backgroundColor: getImpactColor(factor.impact) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.impactText,
                          { color: getImpactTextColor(factor.impact) },
                        ]}
                      >
                        {factor.impact} impact
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.factorStatus}>{factor.status}</Text>
                </View>
              ))}
            </View>

            {/* Score History */}
            {history.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Score History</Text>
                {history.map((entry, index) => (
                  <View key={index} style={styles.historyCard}>
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyDate}>
                        {new Date(entry.date).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </Text>
                      <Text style={styles.historyScore}>{entry.score}</Text>
                      <Text
                        style={[
                          styles.historyRating,
                          { color: getRatingColor(entry.rating) },
                        ]}
                      >
                        {entry.rating}
                      </Text>
                    </View>
                    {entry.change !== 0 && (
                      <Text
                        style={[
                          styles.historyChange,
                          { color: entry.change > 0 ? "#10B981" : "#EF4444" },
                        ]}
                      >
                        {entry.change > 0 ? "+" : ""}
                        {entry.change}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Improvement Tips */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Personalized Improvement Tips
              </Text>
              <Text style={styles.tipsIntro}>
                Based on your score and factors, here are specific actions:
              </Text>
              {getImprovementTips().map((section, sectionIndex) => (
                <View key={sectionIndex} style={styles.tipSection}>
                  <Text style={styles.tipCategory}>{section.category}</Text>
                  {section.tips.map((tip, tipIndex) => (
                    <View key={tipIndex} style={styles.tipCard}>
                      <Text style={styles.tipBullet}>✓</Text>
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataTitle}>No Credit Score Data</Text>
            <Text style={styles.noDataText}>
              Connect your credit bureau account to start monitoring your credit
              score
            </Text>
            <TouchableOpacity style={styles.connectButton}>
              <Text style={styles.connectButtonText}>Connect Account</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  refreshButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
  },
  refreshButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  errorContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: {
    color: "#991B1B",
    fontSize: 14,
  },
  scoreCard: {
    margin: 16,
    padding: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: "bold",
    color: "#111827",
  },
  scoreRating: {
    fontSize: 24,
    fontWeight: "600",
    marginTop: 8,
  },
  changeContainer: {
    marginTop: 8,
  },
  changeText: {
    fontSize: 16,
    fontWeight: "600",
  },
  lastUpdated: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  factorCard: {
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  factorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  factorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  impactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  impactText: {
    fontSize: 12,
    fontWeight: "600",
  },
  factorStatus: {
    fontSize: 14,
    color: "#6B7280",
  },
  historyCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  historyDate: {
    fontSize: 14,
    color: "#6B7280",
    width: 80,
  },
  historyScore: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  historyRating: {
    fontSize: 14,
    fontWeight: "500",
  },
  historyChange: {
    fontSize: 14,
    fontWeight: "600",
  },
  tipsIntro: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  tipSection: {
    marginBottom: 20,
  },
  tipCategory: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  tipCard: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 16,
    color: "#10B981",
    marginRight: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
  },
  noDataContainer: {
    margin: 16,
    padding: 32,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
  },
  connectButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
  },
  connectButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
