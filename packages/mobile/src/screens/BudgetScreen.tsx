import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  RefreshControl,
  Pressable,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Card, FloatingActionButton, LoadingSpinner } from "../components/ui";
import { useTheme } from "../hooks/useTheme";
import MonthNavigator from "../components/MonthNavigator";
import MonthPickerModal from "../components/MonthPickerModal";
import BudgetList from "../components/BudgetList";
import BudgetForm from "../components/BudgetForm";
import UpcomingOccurrences from "../components/UpcomingOccurrences";
import SummaryModal from "../components/SummaryModal";
import QuickAddTransaction from "../components/QuickAddTransaction";
import ConnectionStatus from "../components/ConnectionStatus";
import OfflineBanner from "../components/OfflineBanner";
import {
  useMonthlyBudgetOverview,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
} from "../services/budget";
import { useCreateTransaction } from "../services/transaction";
import { useOfflineSync } from "../hooks/useOfflineSync";
import {
  Budget,
  BudgetWithSummary,
  CreateBudgetRequest,
  UpdateBudgetRequest,
  BudgetType,
} from "../types/budget";
import { CreateTransactionRequest } from "../services/transaction";

export default function BudgetScreen() {
  const { colors } = useTheme();
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    };
  });
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>();
  const [selectedBudgetType, setSelectedBudgetType] =
    useState<BudgetType>("expense");
  const [refreshing, setRefreshing] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Queries and mutations
  const {
    data: monthlyOverview,
    isLoading,
    error,
    refetch,
  } = useMonthlyBudgetOverview(currentDate.year, currentDate.month);

  const createBudgetMutation = useCreateBudget();
  const updateBudgetMutation = useUpdateBudget();
  const deleteBudgetMutation = useDeleteBudget();
  const createTransactionMutation = useCreateTransaction();
  const { syncStatus, triggerSync } = useOfflineSync();

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await refetch();
      // Also trigger sync if online
      if (syncStatus.isOnline) {
        await triggerSync();
      }
    } finally {
      setRefreshing(false);
    }
  }, [refetch, syncStatus.isOnline, triggerSync]);

  const handleMonthChange = (year: number, month: number) => {
    setCurrentDate({ year, month });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleMonthPickerSelect = (year: number, month: number) => {
    setCurrentDate({ year, month });
    setShowMonthPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleCreateBudget = (type: BudgetType) => {
    setSelectedBudgetType(type);
    setEditingBudget(undefined);
    setShowBudgetForm(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleEditBudget = (budget: BudgetWithSummary) => {
    setEditingBudget(budget);
    setShowBudgetForm(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleDeleteBudget = (budget: BudgetWithSummary) => {
    Alert.alert(
      "Delete Budget",
      `Are you sure you want to delete "${budget.name}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteBudgetMutation.mutate(budget.id, {
              onSuccess: () => {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
              },
              onError: (error) => {
                console.error("Failed to delete budget:", error);
                Alert.alert(
                  "Error",
                  "Failed to delete budget. Please try again."
                );
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Error
                );
              },
            });
          },
        },
      ]
    );
  };

  const handleBudgetFormSubmit = (
    data: CreateBudgetRequest | UpdateBudgetRequest
  ) => {
    if ("id" in data) {
      // Update existing budget
      updateBudgetMutation.mutate(data, {
        onSuccess: () => {
          setShowBudgetForm(false);
          setEditingBudget(undefined);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (error) => {
          console.error("Failed to update budget:", error);
          Alert.alert("Error", "Failed to update budget. Please try again.");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      });
    } else {
      // Create new budget
      const createData = { ...data, type: selectedBudgetType };
      createBudgetMutation.mutate(createData, {
        onSuccess: () => {
          setShowBudgetForm(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (error) => {
          console.error("Failed to create budget:", error);
          Alert.alert("Error", "Failed to create budget. Please try again.");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      });
    }
  };

  const handleQuickAddTransaction = (data: CreateTransactionRequest) => {
    createTransactionMutation.mutate(data, {
      onSuccess: () => {
        setShowQuickAdd(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Refresh budget data to show updated amounts
        refetch();
      },
      onError: (error) => {
        console.error("Failed to create transaction:", error);
        Alert.alert("Error", "Failed to create transaction. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getMonthName = (month: number): string => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return monthNames[month - 1];
  };

  // Memoize categories for performance
  const quickAddCategories = useMemo(() => {
    return monthlyOverview?.budgets || [];
  }, [monthlyOverview?.budgets]);

  const fabActions = [
    {
      icon: "flash" as const,
      label: "Quick Add",
      onPress: () => {
        setShowQuickAdd(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
      color: "#F59E0B",
    },
    {
      icon: "trending-up" as const,
      label: "Add Income",
      onPress: () => handleCreateBudget("income"),
      color: "#10B981",
    },
    {
      icon: "trending-down" as const,
      label: "Add Expense",
      onPress: () => handleCreateBudget("expense"),
      color: "#EF4444",
    },
    {
      icon: "save" as const,
      label: "Add Savings",
      onPress: () => handleCreateBudget("savings"),
      color: "#3B82F6",
    },
  ];

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    summaryButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    summaryButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 4,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.text,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 16,
      paddingHorizontal: 16,
    },
    summaryCard: {
      backgroundColor: colors.surface,
      marginBottom: 16,
      marginHorizontal: 16,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
    },
    summaryLabel: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    summaryAmount: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 8,
      paddingTop: 12,
    },
    totalAmount: {
      fontSize: 18,
      fontWeight: "bold",
    },
    positiveAmount: {
      color: "#10B981",
    },
    negativeAmount: {
      color: "#EF4444",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },
    errorText: {
      fontSize: 16,
      color: colors.error,
      textAlign: "center",
      marginBottom: 16,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: "600",
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <Text style={dynamicStyles.title}>Budget</Text>
        <MonthNavigator
          currentMonth={currentDate.month}
          currentYear={currentDate.year}
          onMonthChange={handleMonthChange}
        />
        <View style={dynamicStyles.loadingContainer}>
          <LoadingSpinner size="large" />
          <Text
            style={[
              dynamicStyles.subtitle,
              { textAlign: "center", marginTop: 16 },
            ]}
          >
            Loading your budget...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <Text style={dynamicStyles.title}>Budget</Text>
        <MonthNavigator
          currentMonth={currentDate.month}
          currentYear={currentDate.year}
          onMonthChange={handleMonthChange}
        />
        <View style={dynamicStyles.errorContainer}>
          <Text style={dynamicStyles.errorText}>
            Failed to load budget data. Please check your connection and try
            again.
          </Text>
          <Pressable
            style={dynamicStyles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={dynamicStyles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* Offline Banner */}
      <OfflineBanner
        isVisible={!syncStatus.isOnline}
        pendingItems={syncStatus.pendingItems}
        onPress={() => {
          // Could show detailed sync status or settings
          console.log("Offline banner pressed");
        }}
      />

      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.title}>Budget</Text>
        <Pressable
          style={dynamicStyles.summaryButton}
          onPress={() => setShowSummaryModal(true)}
        >
          <Ionicons name="pie-chart" size={20} color={colors.primary} />
          <Text style={dynamicStyles.summaryButtonText}>Summary</Text>
        </Pressable>
      </View>

      <Text style={dynamicStyles.subtitle}>
        {getMonthName(currentDate.month)} {currentDate.year} overview
      </Text>

      <Pressable
        onLongPress={() => {
          setShowMonthPicker(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
      >
        <MonthNavigator
          currentMonth={currentDate.month}
          currentYear={currentDate.year}
          onMonthChange={handleMonthChange}
        />
      </Pressable>

      {monthlyOverview && (
        <Card variant="elevated" style={dynamicStyles.summaryCard}>
          <View style={dynamicStyles.summaryRow}>
            <Text style={dynamicStyles.summaryLabel}>Total Planned</Text>
            <Text style={dynamicStyles.summaryAmount}>
              {formatCurrency(monthlyOverview.totalPlanned)}
            </Text>
          </View>

          <View style={dynamicStyles.summaryRow}>
            <Text style={dynamicStyles.summaryLabel}>Total Actual</Text>
            <Text style={dynamicStyles.summaryAmount}>
              {formatCurrency(monthlyOverview.totalActual)}
            </Text>
          </View>

          <View style={[dynamicStyles.summaryRow, dynamicStyles.totalRow]}>
            <Text style={[dynamicStyles.summaryLabel, { fontWeight: "600" }]}>
              Remaining
            </Text>
            <Text
              style={[
                dynamicStyles.totalAmount,
                monthlyOverview.totalRemaining >= 0
                  ? dynamicStyles.positiveAmount
                  : dynamicStyles.negativeAmount,
              ]}
            >
              {formatCurrency(monthlyOverview.totalRemaining)}
            </Text>
          </View>
        </Card>
      )}

      <ScrollView
        style={dynamicStyles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <UpcomingOccurrences
          daysAhead={30}
          maxItems={5}
          onOccurrencePress={(occurrence) => {
            console.log("Occurrence pressed:", occurrence.budgetName);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Could navigate to budget details or transaction entry
          }}
        />

        <BudgetList
          budgets={monthlyOverview?.budgets || []}
          isLoading={isLoading}
          onBudgetPress={(budget) => {
            console.log("Budget pressed:", budget.name);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          onEditBudget={handleEditBudget}
          onDeleteBudget={handleDeleteBudget}
          groupByType={true}
        />

        {/* Add bottom padding for FAB */}
        <View style={{ height: 100 }} />
      </ScrollView>

      <FloatingActionButton
        actions={fabActions}
        mainIcon="add"
        mainColor={colors.primary}
      />

      <BudgetForm
        visible={showBudgetForm}
        onClose={() => {
          setShowBudgetForm(false);
          setEditingBudget(undefined);
        }}
        onSubmit={handleBudgetFormSubmit}
        budget={editingBudget}
        isLoading={
          createBudgetMutation.isPending || updateBudgetMutation.isPending
        }
      />

      {/* Summary Modal */}
      {showSummaryModal && monthlyOverview && (
        <SummaryModal
          visible={showSummaryModal}
          onClose={() => setShowSummaryModal(false)}
          monthlyOverview={monthlyOverview}
          currentMonth={getMonthName(currentDate.month)}
        />
      )}

      {/* Quick Add Transaction Modal */}
      <QuickAddTransaction
        visible={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onSubmit={handleQuickAddTransaction}
        categories={quickAddCategories}
        isLoading={createTransactionMutation.isPending}
      />

      {/* Month Picker Modal */}
      <MonthPickerModal
        visible={showMonthPicker}
        onClose={() => setShowMonthPicker(false)}
        currentMonth={currentDate.month}
        currentYear={currentDate.year}
        onMonthYearSelect={handleMonthPickerSelect}
      />

      {/* Connection Status */}
      <ConnectionStatus />
    </SafeAreaView>
  );
}
