/**
 * Subscriptions Screen - Subscription Tracking Dashboard
 *
 * Displays all subscriptions with monthly cost summary, status badges,
 * and automatic detection from transaction patterns.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  RefreshControl,
  Pressable,
  FlatList,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Card, FloatingActionButton, LoadingSpinner } from "../components/ui";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";

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

interface Summary {
  totalSubscriptions: number;
  activeSubscriptions: number;
  monthlyTotal: number;
  yearlyTotal: number;
  byStatus: { keep: number; review: number; cancel: number };
  upcomingRenewals: number;
}

type FilterStatus = "all" | "active" | "paused" | "cancelled";

export default function SubscriptionsScreen() {
  const { colors } = useTheme();
  const { tokens } = useAuth();
  const token = tokens?.idToken;

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
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
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadSubscriptions();
    }, [loadSubscriptions]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadSubscriptions();
  }, [loadSubscriptions]);

  const updateStatus = async (
    subscriptionId: string,
    status?: string,
    reviewStatus?: string,
  ) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadSubscriptions();
    } catch (err) {
      console.error("Error updating status:", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to update subscription status");
    }
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (filterStatus === "all") return true;
    return sub.status === filterStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return colors.success;
      case "paused":
        return colors.warning;
      case "cancelled":
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getReviewColor = (reviewStatus: string) => {
    switch (reviewStatus) {
      case "keep":
        return colors.success;
      case "review":
        return colors.warning;
      case "cancel":
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const renderSubscriptionItem = ({ item: sub }: { item: Subscription }) => (
    <Card style={styles.subscriptionCard}>
      <View style={styles.subscriptionHeader}>
        <View style={styles.subscriptionInfo}>
          <Text style={[styles.subscriptionName, { color: colors.text }]}>
            {sub.statusIndicator} {sub.name}
          </Text>
          <Text
            style={[
              styles.subscriptionCategory,
              { color: colors.textSecondary },
            ]}
          >
            {sub.category}
          </Text>
        </View>
        <View style={styles.subscriptionAmount}>
          <Text style={[styles.amountText, { color: colors.text }]}>
            {formatCurrency(sub.amount, currency)}
          </Text>
          <Text style={[styles.frequencyText, { color: colors.textSecondary }]}>
            /{sub.frequency}
          </Text>
        </View>
      </View>

      <View style={styles.subscriptionDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Next billing:
          </Text>
          <Text
            style={[
              styles.detailValue,
              {
                color: sub.daysUntilRenewal <= 3 ? colors.error : colors.text,
              },
            ]}
          >
            {formatDate(sub.nextBillingDate)}
            {sub.daysUntilRenewal <= 0
              ? " (Today)"
              : ` (${sub.daysUntilRenewal}d)`}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Monthly:
          </Text>
          <Text style={[styles.detailValue, { color: colors.primary }]}>
            {formatCurrency(sub.monthlyAmount, currency)}/mo
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <View style={styles.statusButtons}>
          {(["keep", "review", "cancel"] as const).map((review) => (
            <Pressable
              key={review}
              onPress={() =>
                updateStatus(sub.subscriptionId, undefined, review)
              }
              style={[
                styles.statusButton,
                {
                  backgroundColor:
                    sub.reviewStatus === review
                      ? getReviewColor(review) + "30"
                      : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  {
                    color:
                      sub.reviewStatus === review
                        ? getReviewColor(review)
                        : colors.textSecondary,
                  },
                ]}
              >
                {review === "keep" ? "✓" : review === "review" ? "🔍" : "⚠"}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => {
            Alert.alert("Change Status", "Select subscription status", [
              {
                text: "Active",
                onPress: () => updateStatus(sub.subscriptionId, "active"),
              },
              {
                text: "Paused",
                onPress: () => updateStatus(sub.subscriptionId, "paused"),
              },
              {
                text: "Cancelled",
                onPress: () => updateStatus(sub.subscriptionId, "cancelled"),
              },
              { text: "Cancel", style: "cancel" },
            ]);
          }}
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(sub.status) + "20" },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: getStatusColor(sub.status) },
            ]}
          >
            {sub.status}
          </Text>
        </Pressable>
      </View>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          🔄 Subscriptions
        </Text>
      </View>

      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryContainer}>
          <Card style={styles.summaryCard}>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              Monthly
            </Text>
            <Text style={[styles.summaryAmount, { color: colors.error }]}>
              {formatCurrency(summary.monthlyTotal, currency)}
            </Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              Yearly
            </Text>
            <Text style={[styles.summaryAmount, { color: colors.warning }]}>
              {formatCurrency(summary.yearlyTotal, currency)}
            </Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              Active
            </Text>
            <Text style={[styles.summaryAmount, { color: colors.primary }]}>
              {summary.activeSubscriptions}
            </Text>
          </Card>
        </View>
      )}

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {(["all", "active", "paused", "cancelled"] as FilterStatus[]).map(
          (status) => (
            <Pressable
              key={status}
              onPress={() => {
                setFilterStatus(status);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.filterButton,
                filterStatus === status && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: filterStatus === status ? "#fff" : colors.text },
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </Pressable>
          ),
        )}
      </ScrollView>

      {/* Error Message */}
      {error && (
        <View
          style={[
            styles.errorContainer,
            { backgroundColor: colors.error + "20" },
          ]}
        >
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
        </View>
      )}

      {/* Subscriptions List */}
      {filteredSubscriptions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔄</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No subscriptions found
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {filterStatus === "all"
              ? "Add your first subscription to start tracking"
              : `No ${filterStatus} subscriptions`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredSubscriptions}
          renderItem={renderSubscriptionItem}
          keyExtractor={(item) => item.subscriptionId}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* FAB */}
      <FloatingActionButton
        actions={[
          {
            icon: "add-circle-outline",
            label: "Add Subscription",
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Alert.alert("Add Subscription", "Subscription form coming soon!");
            },
          },
          {
            icon: "search-outline",
            label: "Detect Subscriptions",
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Alert.alert(
                "Detect Subscriptions",
                "Analyzing your transactions for recurring patterns...",
              );
            },
          },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 4,
  },
  filterContainer: {
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
  },
  errorContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  subscriptionCard: {
    marginBottom: 12,
    padding: 16,
  },
  subscriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionName: {
    fontSize: 16,
    fontWeight: "600",
  },
  subscriptionCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  subscriptionAmount: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  frequencyText: {
    fontSize: 12,
  },
  subscriptionDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  statusButtons: {
    flexDirection: "row",
    gap: 8,
  },
  statusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  statusButtonText: {
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
});
