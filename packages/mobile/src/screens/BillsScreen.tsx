/**
 * Bills Screen - Bill Reminders Management
 *
 * Displays bills sorted by due date with status indicators,
 * one-tap mark as paid, and calendar view.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  RefreshControl,
  Pressable,
  ScrollView,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Card, FloatingActionButton, LoadingSpinner } from "../components/ui";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";

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
}

type FilterStatus = "all" | "unpaid" | "paid" | "overdue";

export default function BillsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { tokens } = useAuth();
  const token = tokens?.idToken;

  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [payingBillId, setPayingBillId] = useState<string | null>(null);
  const currency = "USD";

  const loadBills = useCallback(async () => {
    try {
      setError(null);

      if (!token) {
        setError("Not authenticated");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/bills`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load bills");
      }

      const data = await response.json();
      const billsData = data.data || data;
      setBills(billsData.bills || []);
    } catch (err) {
      console.error("Error loading bills:", err);
      setError(err instanceof Error ? err.message : "Failed to load bills");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadBills();
    }, [loadBills]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadBills();
  }, [loadBills]);

  const handleMarkPaid = async (bill: Bill) => {
    try {
      setPayingBillId(bill.billId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadBills();
    } catch (err) {
      console.error("Error marking bill as paid:", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to mark bill as paid");
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

  const getStatusColor = (bill: Bill) => {
    if (bill.status === "paid") return colors.success;
    if (bill.status === "overdue" || bill.daysUntilDue < 0) return colors.error;
    if (bill.daysUntilDue <= 3) return colors.warning;
    return colors.primary;
  };

  const renderBillItem = ({ item: bill }: { item: Bill }) => (
    <Card
      style={{
        ...styles.billCard,
        ...(bill.status === "paid" ? styles.paidCard : {}),
      }}
    >
      <View style={styles.billContent}>
        <View style={styles.billLeft}>
          <Text style={styles.billIcon}>{bill.isRecurring ? "🔄" : "📄"}</Text>
        </View>
        <View style={styles.billInfo}>
          <View style={styles.billHeader}>
            <Text style={[styles.billName, { color: colors.text }]}>
              {bill.name}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(bill) + "20" },
              ]}
            >
              <Text
                style={[styles.statusText, { color: getStatusColor(bill) }]}
              >
                {bill.statusIndicator}{" "}
                {bill.status === "paid"
                  ? "Paid"
                  : bill.daysUntilDue <= 3
                    ? "Due Soon"
                    : "Upcoming"}
              </Text>
            </View>
          </View>
          <Text style={[styles.billDate, { color: colors.textSecondary }]}>
            {formatDate(bill.dueDate)} • {getDaysText(bill.daysUntilDue)}
          </Text>
          {bill.isRecurring && (
            <Text style={[styles.recurringText, { color: colors.primary }]}>
              {bill.frequency}
            </Text>
          )}
          {bill.categoryName && (
            <Text
              style={[styles.categoryText, { color: colors.textSecondary }]}
            >
              {bill.categoryName}
            </Text>
          )}
        </View>
        <View style={styles.billRight}>
          <Text style={[styles.billAmount, { color: colors.text }]}>
            {formatCurrency(bill.amount, currency)}
          </Text>
          {bill.status !== "paid" && (
            <Pressable
              onPress={() => handleMarkPaid(bill)}
              disabled={payingBillId === bill.billId}
              style={[
                styles.payButton,
                { backgroundColor: colors.success },
                payingBillId === bill.billId && styles.payButtonDisabled,
              ]}
            >
              <Text style={styles.payButtonText}>
                {payingBillId === bill.billId ? "..." : "Pay"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
      {bill.notes && (
        <Text style={[styles.notes, { color: colors.textSecondary }]}>
          {bill.notes}
        </Text>
      )}
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
        <Text style={[styles.title, { color: colors.text }]}>📋 Bills</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Total Due
          </Text>
          <Text style={[styles.summaryAmount, { color: colors.error }]}>
            {formatCurrency(totalDue, currency)}
          </Text>
          <Text style={[styles.summaryCount, { color: colors.textSecondary }]}>
            {upcomingBills.length} bills
          </Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Paid
          </Text>
          <Text style={[styles.summaryAmount, { color: colors.success }]}>
            {formatCurrency(totalPaid, currency)}
          </Text>
          <Text style={[styles.summaryCount, { color: colors.textSecondary }]}>
            {paidBills.length} bills
          </Text>
        </Card>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {(["all", "unpaid", "overdue", "paid"] as FilterStatus[]).map(
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

      {/* Bills List */}
      {filteredBills.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No bills found
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {filterStatus === "all"
              ? "Add your first bill to start tracking"
              : `No ${filterStatus} bills`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBills}
          renderItem={renderBillItem}
          keyExtractor={(item) => item.billId}
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

      {/* FAB for adding new bill */}
      <FloatingActionButton
        actions={[
          {
            icon: "add-circle-outline",
            label: "Add Bill",
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Alert.alert("Add Bill", "Bill creation form coming soon!");
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
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 4,
  },
  summaryCount: {
    fontSize: 11,
    marginTop: 2,
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
  billCard: {
    marginBottom: 12,
    padding: 16,
  },
  paidCard: {
    opacity: 0.7,
  },
  billContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  billLeft: {
    marginRight: 12,
  },
  billIcon: {
    fontSize: 28,
  },
  billInfo: {
    flex: 1,
  },
  billHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  billName: {
    fontSize: 16,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "500",
  },
  billDate: {
    fontSize: 13,
    marginTop: 4,
  },
  recurringText: {
    fontSize: 12,
    marginTop: 2,
  },
  categoryText: {
    fontSize: 11,
    marginTop: 2,
  },
  billRight: {
    alignItems: "flex-end",
    marginLeft: 12,
  },
  billAmount: {
    fontSize: 18,
    fontWeight: "bold",
  },
  payButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  notes: {
    fontSize: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
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
