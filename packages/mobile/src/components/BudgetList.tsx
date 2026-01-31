/**
 * Budget List Component
 * Displays budgets with planned vs actual amounts and visual progress
 */

import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Card, LoadingSpinner } from "./ui";
import { useTheme } from "../hooks/useTheme";
import { useCurrency } from "../contexts/CurrencyContext";
import { BudgetWithSummary, BUDGET_TYPE_CONFIG } from "../types/budget";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";

interface BudgetListProps {
  budgets: BudgetWithSummary[];
  isLoading?: boolean;
  onBudgetPress?: (budget: BudgetWithSummary) => void;
  onEditBudget?: (budget: BudgetWithSummary) => void;
  onDeleteBudget?: (budget: BudgetWithSummary) => void;
  groupByType?: boolean;
}

interface BudgetItemProps {
  budget: BudgetWithSummary;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const BudgetItem: React.FC<BudgetItemProps> = ({
  budget,
  onPress,
  onEdit,
  onDelete,
}) => {
  const { colors } = useTheme();
  const { selectedCurrency } = useCurrency();
  const { summary } = budget;
  const typeConfig = BUDGET_TYPE_CONFIG[budget.type];

  const progressPercentage = Math.min(Math.max(summary.percentUsed, 0), 100);
  const isOverBudget = summary.isOverBudget;

  const getProgressColor = (): string => {
    if (isOverBudget) return colors.error;
    if (progressPercentage > 80) return colors.warning;
    return typeConfig.color;
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onEdit?.();
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onDelete?.();
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      marginBottom: 12,
    },
    pressable: {
      padding: 16,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    titleContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    typeIcon: {
      fontSize: 20,
      marginRight: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
    },
    category: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    actionsContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    actionButton: {
      padding: 8,
      marginLeft: 4,
      borderRadius: 6,
    },
    amountContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    amountSection: {
      flex: 1,
      alignItems: "center",
    },
    amountLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    amountValue: {
      fontSize: 16,
      fontWeight: "600",
    },
    plannedAmount: {
      color: colors.text,
    },
    actualAmount: {
      color: typeConfig.color,
    },
    remainingAmount: {
      color: isOverBudget ? colors.error : colors.success,
    },
    progressContainer: {
      marginBottom: 8,
    },
    progressBar: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: getProgressColor(),
      borderRadius: 3,
      width: `${progressPercentage}%`,
    },
    progressText: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 4,
    },
    overBudgetText: {
      color: colors.error,
      fontWeight: "600",
    },
    transactionCount: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: "right",
    },
  });

  return (
    <Card variant="elevated" style={dynamicStyles.container}>
      <Pressable style={dynamicStyles.pressable} onPress={handlePress}>
        <View style={dynamicStyles.header}>
          <View style={dynamicStyles.titleContainer}>
            <Text style={dynamicStyles.typeIcon}>{typeConfig.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={dynamicStyles.title}>{budget.name}</Text>
              <Text style={dynamicStyles.category}>{budget.category}</Text>
            </View>
          </View>

          <View style={dynamicStyles.actionsContainer}>
            <Pressable style={dynamicStyles.actionButton} onPress={handleEdit}>
              <Ionicons name="pencil" size={16} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              style={dynamicStyles.actionButton}
              onPress={handleDelete}
            >
              <Ionicons name="trash" size={16} color={colors.error} />
            </Pressable>
          </View>
        </View>

        <View style={dynamicStyles.amountContainer}>
          <View style={dynamicStyles.amountSection}>
            <Text style={dynamicStyles.amountLabel}>Planned</Text>
            <Text
              style={[dynamicStyles.amountValue, dynamicStyles.plannedAmount]}
            >
              {formatCurrency(summary.planned, selectedCurrency.code)}
            </Text>
          </View>

          <View style={dynamicStyles.amountSection}>
            <Text style={dynamicStyles.amountLabel}>Actual</Text>
            <Text
              style={[dynamicStyles.amountValue, dynamicStyles.actualAmount]}
            >
              {formatCurrency(summary.actual, selectedCurrency.code)}
            </Text>
          </View>

          <View style={dynamicStyles.amountSection}>
            <Text style={dynamicStyles.amountLabel}>Remaining</Text>
            <Text
              style={[dynamicStyles.amountValue, dynamicStyles.remainingAmount]}
            >
              {formatCurrency(summary.remaining, selectedCurrency.code)}
            </Text>
          </View>
        </View>

        <View style={dynamicStyles.progressContainer}>
          <View style={dynamicStyles.progressBar}>
            <View style={dynamicStyles.progressFill} />
          </View>
          <Text
            style={[
              dynamicStyles.progressText,
              isOverBudget && dynamicStyles.overBudgetText,
            ]}
          >
            {isOverBudget
              ? `Over budget by ${formatCurrency(Math.abs(summary.remaining), selectedCurrency.code)}`
              : `${progressPercentage.toFixed(0)}% used`}
          </Text>
        </View>

        <Text style={dynamicStyles.transactionCount}>
          {summary.transactionCount} transaction
          {summary.transactionCount !== 1 ? "s" : ""}
        </Text>
      </Pressable>
    </Card>
  );
};

export default function BudgetList({
  budgets,
  isLoading = false,
  onBudgetPress,
  onEditBudget,
  onDeleteBudget,
  groupByType = true,
}: BudgetListProps) {
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading budgets...
        </Text>
      </View>
    );
  }

  if (budgets.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="wallet-outline"
          size={48}
          color={colors.textSecondary}
        />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No budgets yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Create your first budget to start tracking your finances
        </Text>
      </View>
    );
  }

  const renderBudgets = () => {
    if (!groupByType) {
      return budgets.map((budget) => (
        <BudgetItem
          key={budget.id}
          budget={budget}
          onPress={() => onBudgetPress?.(budget)}
          onEdit={() => onEditBudget?.(budget)}
          onDelete={() => onDeleteBudget?.(budget)}
        />
      ));
    }

    // Group budgets by type
    const groupedBudgets = budgets.reduce(
      (groups, budget) => {
        const type = budget.type;
        if (!groups[type]) {
          groups[type] = [];
        }
        groups[type].push(budget);
        return groups;
      },
      {} as Record<string, BudgetWithSummary[]>,
    );

    return Object.entries(groupedBudgets).map(([type, typeBudgets]) => {
      const typeConfig =
        BUDGET_TYPE_CONFIG[type as keyof typeof BUDGET_TYPE_CONFIG];

      return (
        <View key={type}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {typeConfig.icon} {typeConfig.label}
          </Text>
          {typeBudgets.map((budget) => (
            <BudgetItem
              key={budget.id}
              budget={budget}
              onPress={() => onBudgetPress?.(budget)}
              onEdit={() => onEditBudget?.(budget)}
              onDelete={() => onDeleteBudget?.(budget)}
            />
          ))}
        </View>
      );
    });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {renderBudgets()}
      {/* Add bottom padding for FAB */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 24,
    paddingHorizontal: 16,
  },
});
