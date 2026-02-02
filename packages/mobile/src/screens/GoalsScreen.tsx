/**
 * Goals Screen - Savings Goals Dashboard
 *
 * Displays savings goals with progress bars, contribution tracking,
 * and milestone celebrations with confetti animation.
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
  TextInput,
  Modal,
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

interface Goal {
  goalId: string;
  name: string;
  icon: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  daysRemaining: number | null;
  priority: number;
  status: "active" | "completed" | "paused";
  statusIndicator: string;
  progressPercent: number;
  monthlyRequired: number | null;
  milestones: Record<string, { reached: boolean; date: string | null }>;
  completedAt: string | null;
}

interface GoalsSummary {
  activeGoals: number;
  totalTarget: number;
  totalSaved: number;
  overallProgress: number;
}

export default function GoalsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { tokens } = useAuth();
  const token = tokens?.idToken;

  const [goals, setGoals] = useState<Goal[]>([]);
  const [summary, setSummary] = useState<GoalsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributing, setContributing] = useState(false);
  const currency = "USD";

  const loadGoals = useCallback(async () => {
    try {
      setError(null);

      if (!token) {
        setError("Not authenticated");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/goals`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load goals");
      }

      const data = await response.json();
      const goalsData = data.data || data;
      setGoals(goalsData.goals || []);
      setSummary(goalsData.summary || null);
    } catch (err) {
      console.error("Error loading goals:", err);
      setError(err instanceof Error ? err.message : "Failed to load goals");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [loadGoals]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadGoals();
  }, [loadGoals]);

  const handleContribute = async () => {
    if (!selectedGoal || !contributionAmount) return;

    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    try {
      setContributing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const response = await fetch(
        `${API_BASE_URL}/goals/${selectedGoal.goalId}/contribute`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ amount }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to add contribution");
      }

      const data = await response.json();

      // Show celebration for new milestones
      if (data.data?.newMilestones?.length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "🎉 Milestone Reached!",
          data.data.newMilestones[0].message,
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Check if goal completed
      if (data.data?.isComplete) {
        Alert.alert(
          "🏆 Goal Complete!",
          `Congratulations! You've reached your "${selectedGoal.name}" goal!`,
        );
      }

      await loadGoals();
      setShowContributeModal(false);
      setSelectedGoal(null);
      setContributionAmount("");
    } catch (err) {
      console.error("Error adding contribution:", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to add contribution");
    } finally {
      setContributing(false);
    }
  };

  const openContributeModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setContributionAmount("");
    setShowContributeModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return colors.success;
    if (percent >= 75) return colors.primary;
    if (percent >= 50) return colors.warning;
    return colors.textSecondary;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderGoalItem = ({ item: goal }: { item: Goal }) => (
    <Card
      style={{
        ...styles.goalCard,
        ...(goal.status === "completed"
          ? { borderColor: colors.success, borderWidth: 2 }
          : {}),
      }}
    >
      <View style={styles.goalHeader}>
        <View style={styles.goalTitleRow}>
          <Text style={styles.goalIcon}>{goal.icon}</Text>
          <View style={styles.goalTitleContainer}>
            <Text style={[styles.goalName, { color: colors.text }]}>
              {goal.name} {goal.statusIndicator}
            </Text>
            {goal.targetDate && (
              <Text style={[styles.goalDate, { color: colors.textSecondary }]}>
                Target: {formatDate(goal.targetDate)}
                {goal.daysRemaining !== null && goal.daysRemaining > 0 && (
                  <Text> ({goal.daysRemaining} days left)</Text>
                )}
              </Text>
            )}
          </View>
        </View>
        {goal.status === "active" && (
          <Pressable
            onPress={() => openContributeModal(goal)}
            style={[styles.addButton, { backgroundColor: colors.success }]}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </Pressable>
        )}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressAmount, { color: colors.text }]}>
            {formatCurrency(goal.currentAmount, currency)} /{" "}
            {formatCurrency(goal.targetAmount, currency)}
          </Text>
          <Text
            style={[
              styles.progressPercent,
              { color: getProgressColor(goal.progressPercent) },
            ]}
          >
            {goal.progressPercent}%
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: getProgressColor(goal.progressPercent),
                width: `${Math.min(goal.progressPercent, 100)}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Milestones */}
      <View style={styles.milestonesRow}>
        {[25, 50, 75, 100].map((milestone) => {
          const reached = goal.milestones?.[String(milestone)]?.reached;
          return (
            <View
              key={milestone}
              style={[
                styles.milestone,
                {
                  backgroundColor: reached
                    ? colors.success + "20"
                    : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.milestoneText,
                  { color: reached ? colors.success : colors.textSecondary },
                ]}
              >
                {reached ? "✓ " : ""}
                {milestone}%
              </Text>
            </View>
          );
        })}
      </View>

      {/* Monthly Required */}
      {goal.monthlyRequired && goal.status === "active" && (
        <Text style={[styles.monthlyRequired, { color: colors.primary }]}>
          💡 Save {formatCurrency(goal.monthlyRequired, currency)}/month to
          reach your goal
        </Text>
      )}

      {/* Completed Badge */}
      {goal.status === "completed" && goal.completedAt && (
        <Text style={[styles.completedText, { color: colors.success }]}>
          🏆 Completed on {formatDate(goal.completedAt)}
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
        <Text style={[styles.title, { color: colors.text }]}>🎯 Goals</Text>
      </View>

      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryContainer}>
          <Card style={styles.summaryCard}>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              Active
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {summary.activeGoals}
            </Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              Saved
            </Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {formatCurrency(summary.totalSaved, currency)}
            </Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              Progress
            </Text>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>
              {summary.overallProgress}%
            </Text>
          </Card>
        </View>
      )}

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

      {/* Goals List */}
      {goals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No goals yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Create your first savings goal to start tracking
          </Text>
        </View>
      ) : (
        <FlatList
          data={goals}
          renderItem={renderGoalItem}
          keyExtractor={(item) => item.goalId}
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
            label: "New Goal",
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Alert.alert("New Goal", "Goal creation form coming soon!");
            },
          },
        ]}
      />

      {/* Contribute Modal */}
      <Modal
        visible={showContributeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowContributeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Add Funds to "{selectedGoal?.name}"
            </Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Amount"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              value={contributionAmount}
              onChangeText={setContributionAmount}
              autoFocus
            />
            {selectedGoal && (
              <Text
                style={[styles.modalSubtext, { color: colors.textSecondary }]}
              >
                Current: {formatCurrency(selectedGoal.currentAmount, currency)}{" "}
                / Target: {formatCurrency(selectedGoal.targetAmount, currency)}
              </Text>
            )}
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowContributeModal(false)}
                style={[styles.modalButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleContribute}
                disabled={contributing || !contributionAmount}
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  {
                    backgroundColor: contributing
                      ? colors.textSecondary
                      : colors.success,
                  },
                ]}
              >
                <Text style={styles.modalButtonTextPrimary}>
                  {contributing ? "Adding..." : "Add Funds"}
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
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
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
  goalCard: {
    marginBottom: 16,
    padding: 16,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  goalTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  goalIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  goalTitleContainer: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontWeight: "600",
  },
  goalDate: {
    fontSize: 12,
    marginTop: 4,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressAmount: {
    fontSize: 14,
    fontWeight: "500",
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: "bold",
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
  milestonesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  milestone: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  milestoneText: {
    fontSize: 11,
    fontWeight: "500",
  },
  monthlyRequired: {
    fontSize: 12,
    marginTop: 8,
  },
  completedText: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  modalSubtext: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
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
    color: "#fff",
  },
});
