/**
 * Debt Payoff Screen - Debt Tracking and Payoff Calculator
 *
 * Displays all debts with snowball/avalanche payoff strategies,
 * progress tracking, and payment recording.
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
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Card, FloatingActionButton, LoadingSpinner } from "../components/ui";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";

import { featuresApiUrl } from "../config/api";


// /debts lives on the features gateway, not the main gateway.
const API_BASE_URL = featuresApiUrl;

interface Debt {
  debtId: string;
  name: string;
  type: string;
  originalBalance: number;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  status: string;
  totalPaid: number;
  progressPercent: number;
  monthsToPayoff: number;
}

interface Summary {
  totalDebts: number;
  activeDebts: number;
  totalBalance: number;
  totalMinPayment: number;
  avgInterestRate: number;
  snowballPayoffMonths: number;
  avalanchePayoffMonths: number;
  interestSavings: number;
}

type Strategy = "snowball" | "avalanche";

export default function DebtPayoffScreen() {
  const { colors } = useTheme();
  const { tokens } = useAuth();
  const token = tokens?.idToken;

  const [debts, setDebts] = useState<Debt[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<Strategy>("snowball");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    currentBalance: "",
    interestRate: "",
    minimumPayment: "",
  });

  /**
   * Create a debt. POST /debts requires name, a non-negative currentBalance,
   * an interestRate between 0 and 100 and a non-negative minimumPayment, all
   * as numbers (backend/functions/debt-payoff/index.js).
   */
  const handleCreateDebt = async () => {
    const currentBalance = parseFloat(form.currentBalance);
    const interestRate = parseFloat(form.interestRate);
    const minimumPayment = parseFloat(form.minimumPayment);

    if (!form.name.trim()) {
      setCreateError("Enter a debt name.");
      return;
    }
    if (isNaN(currentBalance) || currentBalance < 0) {
      setCreateError("Enter the current balance.");
      return;
    }
    if (isNaN(interestRate) || interestRate < 0 || interestRate > 100) {
      setCreateError("Enter an interest rate between 0 and 100.");
      return;
    }
    if (isNaN(minimumPayment) || minimumPayment < 0) {
      setCreateError("Enter the minimum payment.");
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);

      const response = await fetch(`${API_BASE_URL}/debts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          currentBalance,
          interestRate,
          minimumPayment,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? "Failed to add the debt");
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreateModal(false);
      await loadDebts();
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setCreateError(
        err instanceof Error ? err.message : "Failed to add the debt"
      );
    } finally {
      setCreating(false);
    }
  };
  const currency = "USD";

  const loadDebts = useCallback(async () => {
    try {
      setError(null);
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const [debtsResponse, summaryResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/debts`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
        fetch(`${API_BASE_URL}/debts/summary`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
      ]);

      if (!debtsResponse.ok || !summaryResponse.ok) {
        throw new Error("Failed to load debts");
      }

      const debtsData = await debtsResponse.json();
      const summaryData = await summaryResponse.json();

      setDebts(debtsData.data?.debts || []);
      setSummary(summaryData.data?.summary || null);
    } catch (err) {
      console.error("Error loading debts:", err);
      setError(err instanceof Error ? err.message : "Failed to load debts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadDebts();
    }, [loadDebts]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadDebts();
  }, [loadDebts]);

  const recordPayment = async (debt: Debt) => {
    Alert.prompt(
      "Record Payment",
      `Enter payment amount for ${debt.name}:`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Record",
          onPress: async (amount) => {
            if (!amount || isNaN(parseFloat(amount))) return;

            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

              const response = await fetch(
                `${API_BASE_URL}/debts/${debt.debtId}/payment`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ amount: parseFloat(amount) }),
                },
              );

              if (!response.ok) throw new Error("Failed to record payment");

              const data = await response.json();
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );

              if (data.data?.isPaidOff) {
                Alert.alert(
                  "🎉 Congratulations!",
                  `You've paid off ${debt.name}!`,
                );
              }

              await loadDebts();
            } catch (err) {
              console.error("Error recording payment:", err);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Error", "Failed to record payment");
            }
          },
        },
      ],
      "plain-text",
      "",
      "decimal-pad",
    );
  };

  const getDebtTypeIcon = (type: string) => {
    switch (type) {
      case "credit_card":
        return "💳";
      case "student_loan":
        return "🎓";
      case "auto_loan":
        return "🚗";
      case "mortgage":
        return "🏠";
      case "personal_loan":
        return "💰";
      case "medical":
        return "🏥";
      default:
        return "📄";
    }
  };

  const renderDebtItem = ({ item: debt }: { item: Debt }) => (
    <Card style={styles.debtCard}>
      <View style={styles.debtHeader}>
        <View style={styles.debtInfo}>
          <Text style={styles.debtIcon}>{getDebtTypeIcon(debt.type)}</Text>
          <View style={styles.debtTitleContainer}>
            <Text style={[styles.debtName, { color: colors.text }]}>
              {debt.name}
            </Text>
            <Text style={[styles.debtRate, { color: colors.textSecondary }]}>
              {debt.interestRate}% APR
            </Text>
          </View>
        </View>
        <View style={styles.debtAmount}>
          <Text style={[styles.balanceText, { color: colors.text }]}>
            {formatCurrency(debt.currentBalance, currency)}
          </Text>
          <Text
            style={[styles.minPaymentText, { color: colors.textSecondary }]}
          >
            Min: {formatCurrency(debt.minimumPayment, currency)}/mo
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
            Progress
          </Text>
          <Text style={[styles.progressPercent, { color: colors.success }]}>
            {debt.progressPercent}% paid
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.success,
                width: `${debt.progressPercent}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionRow}>
        <Text style={[styles.payoffText, { color: colors.textSecondary }]}>
          {debt.monthsToPayoff === Infinity
            ? "⚠️ Payment < interest"
            : `~${debt.monthsToPayoff} months left`}
        </Text>
        <Pressable
          onPress={() => recordPayment(debt)}
          style={[styles.payButton, { backgroundColor: colors.success }]}
        >
          <Text style={styles.payButtonText}>+ Payment</Text>
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
          💸 Debt Payoff
        </Text>
      </View>

      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryContainer}>
          <Card style={styles.summaryCard}>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              Total Debt
            </Text>
            <Text style={[styles.summaryAmount, { color: colors.error }]}>
              {formatCurrency(summary.totalBalance, currency)}
            </Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              Monthly
            </Text>
            <Text style={[styles.summaryAmount, { color: colors.warning }]}>
              {formatCurrency(summary.totalMinPayment, currency)}
            </Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              Avg APR
            </Text>
            <Text style={[styles.summaryAmount, { color: colors.primary }]}>
              {summary.avgInterestRate.toFixed(1)}%
            </Text>
          </Card>
        </View>
      )}

      {/* Strategy Selector */}
      <View style={styles.strategyContainer}>
        <Pressable
          onPress={() => {
            setStrategy("snowball");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={[
            styles.strategyButton,
            strategy === "snowball" && {
              backgroundColor: colors.primary + "20",
              borderColor: colors.primary,
            },
          ]}
        >
          <Text
            style={[
              styles.strategyTitle,
              { color: strategy === "snowball" ? colors.primary : colors.text },
            ]}
          >
            ❄️ Snowball
          </Text>
          {summary && (
            <Text
              style={[styles.strategyInfo, { color: colors.textSecondary }]}
            >
              {summary.snowballPayoffMonths} months
            </Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => {
            setStrategy("avalanche");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={[
            styles.strategyButton,
            strategy === "avalanche" && {
              backgroundColor: colors.primary + "20",
              borderColor: colors.primary,
            },
          ]}
        >
          <Text
            style={[
              styles.strategyTitle,
              {
                color: strategy === "avalanche" ? colors.primary : colors.text,
              },
            ]}
          >
            🏔️ Avalanche
          </Text>
          {summary && (
            <Text
              style={[styles.strategyInfo, { color: colors.textSecondary }]}
            >
              {summary.avalanchePayoffMonths} months
            </Text>
          )}
        </Pressable>
      </View>

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

      {/* Debts List */}
      {debts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💸</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No debts tracked
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Add your first debt to start your payoff journey
          </Text>
        </View>
      ) : (
        <FlatList
          data={debts}
          renderItem={renderDebtItem}
          keyExtractor={(item) => item.debtId}
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
            label: "Add Debt",
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setForm({
                name: "",
                currentBalance: "",
                interestRate: "",
                minimumPayment: "",
              });
              setCreateError(null);
              setShowCreateModal(true);
            },
          },
        ]}
      />

      {/* Create debt */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Add Debt
            </Text>

            <TextInput
              style={[
                styles.input,
                { borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Debt name"
              placeholderTextColor={colors.textSecondary}
              value={form.name}
              onChangeText={(name) => setForm((f) => ({ ...f, name }))}
              accessibilityLabel="Debt name"
            />
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Current balance"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              value={form.currentBalance}
              onChangeText={(currentBalance) =>
                setForm((f) => ({ ...f, currentBalance }))
              }
              accessibilityLabel="Current balance"
            />
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Interest rate (%)"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              value={form.interestRate}
              onChangeText={(interestRate) =>
                setForm((f) => ({ ...f, interestRate }))
              }
              accessibilityLabel="Interest rate"
            />
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Minimum monthly payment"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              value={form.minimumPayment}
              onChangeText={(minimumPayment) =>
                setForm((f) => ({ ...f, minimumPayment }))
              }
              accessibilityLabel="Minimum payment"
            />

            {createError && (
              <Text style={[styles.modalError, { color: colors.error }]}>
                {createError}
              </Text>
            )}

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowCreateModal(false)}
                style={[styles.modalButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleCreateDebt}
                disabled={creating}
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  {
                    backgroundColor: creating
                      ? colors.textSecondary
                      : colors.primary,
                  },
                ]}
              >
                <Text style={styles.modalButtonTextPrimary}>
                  {creating ? "Saving..." : "Add"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  modalError: {
    fontSize: 13,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  modalButtonPrimary: {
    borderWidth: 0,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
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
    fontSize: 11,
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 4,
  },
  strategyContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  strategyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    alignItems: "center",
  },
  strategyTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  strategyInfo: {
    fontSize: 11,
    marginTop: 2,
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
  debtCard: {
    marginBottom: 12,
    padding: 16,
  },
  debtHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  debtInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  debtIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  debtTitleContainer: {
    flex: 1,
  },
  debtName: {
    fontSize: 16,
    fontWeight: "600",
  },
  debtRate: {
    fontSize: 12,
    marginTop: 2,
  },
  debtAmount: {
    alignItems: "flex-end",
  },
  balanceText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  minPaymentText: {
    fontSize: 11,
    marginTop: 2,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  payoffText: {
    fontSize: 12,
  },
  payButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  payButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
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
