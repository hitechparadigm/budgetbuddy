/**
 * Planned Transactions Screen - Schedule Future Income and Expenses
 *
 * Mirrors the web app's PlannedTransactionsPage against the same
 * transaction-planning Lambda (extended features API gateway). Supports
 * listing upcoming/all/completed plans, creating one-off or recurring
 * plans, marking a plan as done (executes it into a real transaction),
 * and deleting a plan.
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
  TextInput,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Card, FloatingActionButton, LoadingSpinner } from "../components/ui";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_EXTENDED_FEATURES_API_URL ||
  "https://hkjzroedjf.execute-api.us-east-1.amazonaws.com/v1";

interface PlannedTransaction {
  planId: string;
  budgetId: string;
  transactionType: "income" | "expense";
  amount: number;
  currency: string;
  categoryId: string;
  categoryName: string;
  scheduledDate: string;
  notes: string | null;
  isRecurring: boolean;
  frequency: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "annually" | null;
  nextOccurrence: string | null;
  isExecuted: boolean;
  executedTransactionId: string | null;
  createdAt: string;
}

type FilterTab = "upcoming" | "all" | "completed";

const FREQUENCIES: PlannedTransaction["frequency"][] = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "annually",
];

const FREQ_LABEL: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
};

function formatDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(scheduledDate: string): boolean {
  return scheduledDate < new Date().toISOString().slice(0, 10);
}

function daysUntil(scheduledDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(scheduledDate + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export default function PlannedTransactionsScreen() {
  const { colors } = useTheme();
  const { tokens } = useAuth();
  const token = tokens?.idToken;
  const currency = "USD";

  const [plans, setPlans] = useState<PlannedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("upcoming");
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New plan form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newType, setNewType] = useState<"income" | "expense">("expense");
  const [newCategory, setNewCategory] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newRecurring, setNewRecurring] = useState(false);
  const [newFrequency, setNewFrequency] = useState<PlannedTransaction["frequency"]>("monthly");
  const [saving, setSaving] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      setError(null);
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const includeExecuted = activeTab !== "upcoming";
      const response = await fetch(
        `${API_BASE_URL}/transaction-planning?includeExecuted=${includeExecuted}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load planned transactions");
      }

      const data = await response.json();
      const body = data.data || data;
      setPlans(body.plans || []);
    } catch (err) {
      console.error("Error loading planned transactions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load planned transactions"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, activeTab]);

  useFocusEffect(
    useCallback(() => {
      loadPlans();
    }, [loadPlans])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadPlans();
  }, [loadPlans]);

  const handleExecute = async (plan: PlannedTransaction) => {
    try {
      setExecutingId(plan.planId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const response = await fetch(`${API_BASE_URL}/transaction-planning/execute`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId: plan.planId }),
      });

      if (!response.ok) throw new Error("Failed to mark as done");

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadPlans();
    } catch (err) {
      console.error("Error executing planned transaction:", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to mark as done");
    } finally {
      setExecutingId(null);
    }
  };

  const confirmDelete = (plan: PlannedTransaction) => {
    Alert.alert(
      "Delete planned transaction?",
      `"${plan.categoryName}" on ${formatDate(plan.scheduledDate)}${
        plan.isRecurring ? " (and all future recurrences)" : ""
      } will be permanently removed.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => handleDelete(plan) },
      ]
    );
  };

  const handleDelete = async (plan: PlannedTransaction) => {
    try {
      setDeletingId(plan.planId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const response = await fetch(
        `${API_BASE_URL}/transaction-planning/${plan.planId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete");

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadPlans();
    } catch (err) {
      console.error("Error deleting planned transaction:", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to delete planned transaction");
    } finally {
      setDeletingId(null);
    }
  };

  const resetNewForm = () => {
    setNewType("expense");
    setNewCategory("");
    setNewAmount("");
    setNewRecurring(false);
    setNewFrequency("monthly");
  };

  const handleSaveNew = async () => {
    const amount = parseFloat(newAmount);
    if (!newCategory.trim() || isNaN(amount) || amount <= 0) {
      Alert.alert("Missing info", "Category and a positive amount are required.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/transaction-planning`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: newType,
          amount,
          currency,
          categoryId: newCategory.trim().toLowerCase().replace(/\s+/g, "-"),
          categoryName: newCategory.trim(),
          date: new Date().toISOString().slice(0, 10),
          isRecurring: newRecurring,
          frequency: newRecurring ? newFrequency : undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowNewForm(false);
      resetNewForm();
      await loadPlans();
    } catch (err) {
      console.error("Error saving planned transaction:", err);
      Alert.alert("Error", "Failed to save planned transaction");
    } finally {
      setSaving(false);
    }
  };

  const filteredPlans = plans.filter((p) => {
    if (activeTab === "upcoming") return !p.isExecuted;
    if (activeTab === "completed") return p.isExecuted;
    return true;
  });

  const sortedPlans = [...filteredPlans].sort((a, b) =>
    a.scheduledDate.localeCompare(b.scheduledDate)
  );

  const renderPlanItem = ({ item: plan }: { item: PlannedTransaction }) => {
    const days = daysUntil(plan.scheduledDate);
    const overdue = !plan.isExecuted && isOverdue(plan.scheduledDate);

    return (
      <Card
        style={[
          styles.planCard,
          overdue ? { borderColor: colors.error, borderWidth: 1 } : {},
        ]}
      >
        <View style={styles.planRow}>
          <View style={styles.planInfo}>
            <Text style={[styles.planName, { color: colors.text }]}>
              {plan.categoryName}
            </Text>
            <View style={styles.planMetaRow}>
              <Text style={[styles.planDate, { color: colors.textSecondary }]}>
                {formatDate(plan.scheduledDate)}
                {!plan.isExecuted && (
                  <Text
                    style={{
                      color: overdue
                        ? colors.error
                        : days === 0
                          ? colors.warning
                          : colors.textSecondary,
                    }}
                  >
                    {overdue ? " (overdue)" : days === 0 ? " (today)" : ` (in ${days}d)`}
                  </Text>
                )}
              </Text>
              {plan.isRecurring && (
                <View style={[styles.badge, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>
                    {FREQ_LABEL[plan.frequency ?? ""] ?? plan.frequency}
                  </Text>
                </View>
              )}
              {plan.isExecuted && (
                <View style={[styles.badge, { backgroundColor: colors.success + "20" }]}>
                  <Text style={[styles.badgeText, { color: colors.success }]}>Done</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.planRight}>
            <Text
              style={[
                styles.planAmount,
                { color: plan.transactionType === "income" ? colors.income : colors.expense },
              ]}
            >
              {plan.transactionType === "income" ? "+" : "-"}
              {formatCurrency(plan.amount, currency)}
            </Text>
            <View style={styles.planActions}>
              {!plan.isExecuted && (
                <Pressable
                  onPress={() => handleExecute(plan)}
                  disabled={executingId === plan.planId}
                  style={styles.actionButton}
                  accessibilityLabel={`Mark ${plan.categoryName} as done`}
                >
                  <Ionicons
                    name={executingId === plan.planId ? "sync" : "checkmark-circle-outline"}
                    size={20}
                    color={colors.success}
                  />
                </Pressable>
              )}
              <Pressable
                onPress={() => confirmDelete(plan)}
                disabled={deletingId === plan.planId}
                style={styles.actionButton}
                accessibilityLabel={`Delete planned ${plan.categoryName}`}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </Pressable>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* New plan form */}
      {showNewForm && (
        <View style={[styles.formOverlay, { backgroundColor: colors.background }]}>
          <ScrollView contentContainerStyle={styles.formContent}>
            <Text style={[styles.formTitle, { color: colors.text }]}>
              New Planned Transaction
            </Text>

            <View style={styles.typeToggleRow}>
              {(["expense", "income"] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setNewType(t)}
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor:
                        newType === t
                          ? t === "expense"
                            ? colors.error
                            : colors.success
                          : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: newType === t ? "#fff" : colors.text,
                      fontWeight: "600",
                    }}
                  >
                    {t === "expense" ? "Expense" : "Income"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Category
            </Text>
            <TextInput
              value={newCategory}
              onChangeText={setNewCategory}
              placeholder="e.g. Rent, Salary"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Amount</Text>
            <TextInput
              value={newAmount}
              onChangeText={setNewAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            />

            <View style={styles.recurringRow}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 0 }]}>
                Recurring
              </Text>
              <Switch value={newRecurring} onValueChange={setNewRecurring} />
            </View>

            {newRecurring && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {FREQUENCIES.map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setNewFrequency(f)}
                    style={[
                      styles.freqButton,
                      { backgroundColor: newFrequency === f ? colors.primary : colors.border },
                    ]}
                  >
                    <Text style={{ color: newFrequency === f ? "#fff" : colors.text, fontSize: 12 }}>
                      {FREQ_LABEL[f ?? ""]}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <View style={styles.formButtonRow}>
              <Pressable
                onPress={() => {
                  setShowNewForm(false);
                  resetNewForm();
                }}
                style={[styles.formButton, { borderColor: colors.border, borderWidth: 1 }]}
              >
                <Text style={{ color: colors.text }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveNew}
                disabled={saving}
                style={[styles.formButton, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                  {saving ? "Saving..." : "Save"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      )}

      {!showNewForm && (
        <>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>?? Planned Transactions</Text>
          </View>

          {/* Filter tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={styles.filterContent}
          >
            {(["upcoming", "all", "completed"] as FilterTab[]).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => {
                  setActiveTab(tab);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.filterButton,
                  { backgroundColor: activeTab === tab ? colors.primary : colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: activeTab === tab ? "#fff" : colors.text },
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Error */}
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + "20" }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          )}

          {/* List */}
          {sortedPlans.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>??</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {activeTab === "completed"
                  ? "No completed transactions yet"
                  : "No planned transactions"}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {activeTab === "upcoming"
                  ? "Schedule recurring bills, salary, rent, and other predictable transactions ahead of time."
                  : "Completed transactions will appear here once you mark upcoming ones as done."}
              </Text>
            </View>
          ) : (
            <FlatList
              data={sortedPlans}
              renderItem={renderPlanItem}
              keyExtractor={(item) => item.planId}
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

          <FloatingActionButton
            actions={[
              {
                icon: "add-circle-outline",
                label: "New Planned Transaction",
                onPress: () => setShowNewForm(true),
              },
            ]}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 24, fontWeight: "bold" },
  filterContainer: { maxHeight: 50 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  filterText: { fontSize: 14, fontWeight: "500" },
  errorContainer: { marginHorizontal: 16, marginVertical: 8, padding: 12, borderRadius: 8 },
  errorText: { fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 100 },
  planCard: { marginBottom: 12, padding: 16 },
  planRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  planInfo: { flex: 1, marginRight: 12 },
  planName: { fontSize: 16, fontWeight: "600" },
  planMetaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 4 },
  planDate: { fontSize: 13 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: "500" },
  planRight: { alignItems: "flex-end" },
  planAmount: { fontSize: 16, fontWeight: "bold" },
  planActions: { flexDirection: "row", gap: 4, marginTop: 8 },
  actionButton: { padding: 4 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "600", marginBottom: 8, textAlign: "center" },
  emptySubtitle: { fontSize: 14, textAlign: "center" },
  formOverlay: { flex: 1 },
  formContent: { padding: 16, paddingTop: 24 },
  formTitle: { fontSize: 20, fontWeight: "700", marginBottom: 20 },
  typeToggleRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  typeButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  inputLabel: { fontSize: 13, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16, fontSize: 15 },
  recurringRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  freqButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  formButtonRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  formButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
});