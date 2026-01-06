/**
 * Summary Modal Component
 * Displays detailed budget summary with charts and category breakdown
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Card } from "./ui";
import { useTheme } from "../hooks/useTheme";
import { MonthlyBudgetOverview } from "../types/budget";

const { width: screenWidth } = Dimensions.get("window");

interface SummaryModalProps {
  visible: boolean;
  onClose: () => void;
  monthlyOverview: MonthlyBudgetOverview;
  currentMonth: string;
}

interface CircularProgressProps {
  size: number;
  progress: number;
  color: string;
  backgroundColor?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  size,
  progress,
  color,
  backgroundColor = "#e5e7eb",
}) => {
  const strokeWidth = 8;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <View style={{ width: size, height: size, position: "relative" }}>
      {/* Background circle */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: backgroundColor,
          position: "absolute",
        }}
      />
      {/* Progress indicator - simplified using a colored overlay */}
      <View
        style={{
          width: size - strokeWidth * 2,
          height: size - strokeWidth * 2,
          borderRadius: (size - strokeWidth * 2) / 2,
          backgroundColor: "transparent",
          position: "absolute",
          top: strokeWidth,
          left: strokeWidth,
          borderWidth: strokeWidth / 2,
          borderColor: color,
          opacity: clampedProgress / 100,
        }}
      />
    </View>
  );
};

export default function SummaryModal({
  visible,
  onClose,
  monthlyOverview,
  currentMonth,
}: SummaryModalProps) {
  const { colors } = useTheme();

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(amount));
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  // Calculate progress percentages
  const spentPercentage =
    monthlyOverview.totalPlanned > 0
      ? Math.min(
          (monthlyOverview.totalActual / monthlyOverview.totalPlanned) * 100,
          100
        )
      : 0;

  // Group budgets by type for category breakdown
  const categoryBreakdown = monthlyOverview.budgets.reduce((acc, budget) => {
    const type = budget.type;
    if (!acc[type]) {
      acc[type] = {
        planned: 0,
        actual: 0,
        count: 0,
      };
    }
    acc[type].planned += budget.summary.planned;
    acc[type].actual += budget.summary.actual;
    acc[type].count += 1;
    return acc;
  }, {} as Record<string, { planned: number; actual: number; count: number }>);

  const dynamicStyles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    container: {
      backgroundColor: colors.background,
      borderRadius: 16,
      margin: 20,
      maxHeight: "80%",
      width: screenWidth - 40,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
    },
    closeButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
    },
    content: {
      padding: 20,
    },
    chartContainer: {
      alignItems: "center",
      marginBottom: 24,
    },
    chartCenter: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
    },
    chartLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      textTransform: "uppercase",
    },
    chartValue: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginTop: 4,
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: 24,
    },
    statItem: {
      alignItems: "center",
      flex: 1,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    statValue: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    categoryItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: 8,
      marginBottom: 8,
    },
    categoryLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    categoryDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 12,
    },
    categoryName: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
    },
    categoryRight: {
      alignItems: "flex-end",
    },
    categoryAmount: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    categoryPercentage: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });

  const categoryColors = {
    income: "#10B981",
    expense: "#EF4444",
    savings: "#3B82F6",
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={dynamicStyles.overlay} onPress={handleClose}>
        <Pressable onPress={() => {}}>
          <View style={dynamicStyles.container}>
            {/* Header */}
            <View style={dynamicStyles.header}>
              <Text style={dynamicStyles.title}>{currentMonth} Summary</Text>
              <Pressable
                style={dynamicStyles.closeButton}
                onPress={handleClose}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Content */}
            <ScrollView
              style={dynamicStyles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* Circular Progress Chart */}
              <View style={dynamicStyles.chartContainer}>
                <View style={{ position: "relative" }}>
                  <CircularProgress
                    size={160}
                    progress={spentPercentage}
                    color={
                      spentPercentage > 100 ? colors.error : colors.primary
                    }
                  />
                  <View style={dynamicStyles.chartCenter}>
                    <Text style={dynamicStyles.chartLabel}>Spent</Text>
                    <Text style={dynamicStyles.chartValue}>
                      {formatCurrency(monthlyOverview.totalActual)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Stats Row */}
              <View style={dynamicStyles.statsRow}>
                <View style={dynamicStyles.statItem}>
                  <Text style={dynamicStyles.statLabel}>Planned</Text>
                  <Text style={dynamicStyles.statValue}>
                    {formatCurrency(monthlyOverview.totalPlanned)}
                  </Text>
                </View>
                <View style={dynamicStyles.statItem}>
                  <Text style={dynamicStyles.statLabel}>Actual</Text>
                  <Text style={dynamicStyles.statValue}>
                    {formatCurrency(monthlyOverview.totalActual)}
                  </Text>
                </View>
                <View style={dynamicStyles.statItem}>
                  <Text style={dynamicStyles.statLabel}>Remaining</Text>
                  <Text
                    style={[
                      dynamicStyles.statValue,
                      {
                        color:
                          monthlyOverview.totalRemaining >= 0
                            ? colors.success
                            : colors.error,
                      },
                    ]}
                  >
                    {formatCurrency(monthlyOverview.totalRemaining)}
                  </Text>
                </View>
              </View>

              {/* Category Breakdown */}
              <Text style={dynamicStyles.sectionTitle}>Category Breakdown</Text>
              {Object.entries(categoryBreakdown).map(([type, data]) => {
                const percentage =
                  monthlyOverview.totalPlanned > 0
                    ? Math.round(
                        (data.planned / monthlyOverview.totalPlanned) * 100
                      )
                    : 0;

                return (
                  <View key={type} style={dynamicStyles.categoryItem}>
                    <View style={dynamicStyles.categoryLeft}>
                      <View
                        style={[
                          dynamicStyles.categoryDot,
                          {
                            backgroundColor:
                              categoryColors[
                                type as keyof typeof categoryColors
                              ] || colors.primary,
                          },
                        ]}
                      />
                      <Text style={dynamicStyles.categoryName}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </View>
                    <View style={dynamicStyles.categoryRight}>
                      <Text style={dynamicStyles.categoryAmount}>
                        {formatCurrency(data.planned)}
                      </Text>
                      <Text style={dynamicStyles.categoryPercentage}>
                        ({percentage}%)
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Individual Budget Details */}
              <Text style={[dynamicStyles.sectionTitle, { marginTop: 24 }]}>
                Budget Details
              </Text>
              {monthlyOverview.budgets.map((budget) => {
                const percentUsed = budget.summary.percentUsed;
                const isOverBudget = budget.summary.isOverBudget;

                return (
                  <View key={budget.id} style={dynamicStyles.categoryItem}>
                    <View style={dynamicStyles.categoryLeft}>
                      <View
                        style={[
                          dynamicStyles.categoryDot,
                          {
                            backgroundColor:
                              categoryColors[
                                budget.type as keyof typeof categoryColors
                              ] || colors.primary,
                          },
                        ]}
                      />
                      <View>
                        <Text style={dynamicStyles.categoryName}>
                          {budget.name}
                        </Text>
                        <Text
                          style={[
                            dynamicStyles.categoryPercentage,
                            { marginTop: 0 },
                          ]}
                        >
                          {budget.category}
                        </Text>
                      </View>
                    </View>
                    <View style={dynamicStyles.categoryRight}>
                      <Text
                        style={[
                          dynamicStyles.categoryAmount,
                          { color: isOverBudget ? colors.error : colors.text },
                        ]}
                      >
                        {formatCurrency(budget.summary.actual)}
                      </Text>
                      <Text
                        style={[
                          dynamicStyles.categoryPercentage,
                          {
                            color: isOverBudget
                              ? colors.error
                              : colors.textSecondary,
                          },
                        ]}
                      >
                        {isOverBudget
                          ? "Over budget"
                          : `${Math.round(percentUsed)}% used`}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Add bottom padding */}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
