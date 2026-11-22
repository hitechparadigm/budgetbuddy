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
import { Card, FloatingActionButton, LoadingSpinner } from "../components/ui";
import { useTheme } from "../hooks/useTheme";
import { useCurrency } from "../contexts/CurrencyContext";
import MonthNavigator from "../components/MonthNavigator";
import MonthPickerModal from "../components/MonthPickerModal";
import QuickAddTransaction, {
  QuickAddCategory,
} from "../components/QuickAddTransaction";
import ConnectionStatus from "../components/ConnectionStatus";
import OfflineBanner from "../components/OfflineBanner";
import {
  monthKey,
  PeriodCategory,
  useBudgetPeriod,
  useRecordCategoryTransaction,
} from "../services/budgetPeriod";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { CreateTransactionRequest } from "../services/transaction";

const MONTH_NAMES = [
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

const sumSpent = (categories: PeriodCategory[]) =>
  categories.reduce((sum, cat) => sum + cat.spentAmount, 0);

/**
 * Budget tab: the month's budget period (GET /budget/current on the main
 * gateway), the same data the web app's BudgetPage shows. Recording a
 * transaction from a category saves the period with POST /budget.
 */
export default function BudgetScreen() {
  const { colors } = useTheme();
  const { formatAmount } = useCurrency();
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    };
  });
  const [refreshing, setRefreshing] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [preselectedCategoryId, setPreselectedCategoryId] = useState<
    string | undefined
  >();
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const month = monthKey(currentDate.year, currentDate.month);
  const { data: period, isLoading, error, refetch } = useBudgetPeriod(month);
  const recordTransaction = useRecordCategoryTransaction(month);
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

  const handleMonthChange = (year: number, monthNumber: number) => {
    setCurrentDate({ year, month: monthNumber });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleMonthPickerSelect = (year: number, monthNumber: number) => {
    setCurrentDate({ year, month: monthNumber });
    setShowMonthPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const openQuickAdd = (categoryId?: string) => {
    setPreselectedCategoryId(categoryId);
    setShowQuickAdd(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleRecordTransaction = (data: CreateTransactionRequest) => {
    recordTransaction.mutate(
      {
        categoryId: data.categoryId,
        amount: data.amount,
        description: data.description,
        date: data.date,
      },
      {
        onSuccess: () => {
          setShowQuickAdd(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (err) => {
          Alert.alert(
            "Error",
            err instanceof Error && err.message
              ? err.message
              : "Failed to record the transaction. Please try again."
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      }
    );
  };

  // QuickAdd shows "expense" categories by default; tag each group so the
  // modal's filter can tell them apart. Sorted A-Z within the list.
  const quickAddCategories = useMemo<QuickAddCategory[]>(() => {
    if (!period) return [];
    const tag = (cats: PeriodCategory[], type: string) =>
      cats.map((c) => ({ id: c.id, name: c.name, icon: c.icon, type }));
    return [
      ...tag(period.groups.expenses, "expense"),
      ...tag(period.groups.savings, "savings"),
      ...tag(period.groups.income, "income"),
    ].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [period]);

  const fabActions = [
    {
      icon: "add-circle" as const,
      label: "Record transaction",
      onPress: () => openQuickAdd(undefined),
      color: "#F59E0B",
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
      color: colors.success,
    },
    negativeAmount: {
      color: colors.error,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginTop: 8,
      marginBottom: 8,
    },
    emptyGroup: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    categoryRow: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    categoryHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    categoryIcon: {
      fontSize: 20,
      marginRight: 8,
    },
    categoryName: {
      flex: 1,
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
    },
    categoryAmounts: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 6,
    },
    amountLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    amountValue: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
      overflow: "hidden",
    },
    progressFill: {
      height: 6,
      borderRadius: 3,
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

  const renderCategory = (cat: PeriodCategory) => {
    const remaining = cat.plannedAmount - cat.spentAmount;
    const isOver = cat.spentAmount > cat.plannedAmount;
    const ratio =
      cat.plannedAmount > 0 ? cat.spentAmount / cat.plannedAmount : isOver ? 1 : 0;
    const percent = Math.min(Math.max(ratio, 0), 1) * 100;

    return (
      <Pressable
        key={cat.id}
        testID={`category-${cat.id}`}
        style={dynamicStyles.categoryRow}
        onPress={() => openQuickAdd(cat.id)}
        accessibilityRole="button"
        accessibilityLabel={`Record a transaction for ${cat.name}`}
      >
        <View style={dynamicStyles.categoryHeader}>
          {cat.icon ? (
            <Text style={dynamicStyles.categoryIcon}>{cat.icon}</Text>
          ) : null}
          <Text style={dynamicStyles.categoryName}>{cat.name}</Text>
        </View>
        <View style={dynamicStyles.progressTrack}>
          <View
            style={[
              dynamicStyles.progressFill,
              {
                width: `${percent}%`,
                backgroundColor: isOver ? colors.error : colors.primary,
              },
            ]}
          />
        </View>
        <View style={dynamicStyles.categoryAmounts}>
          <View>
            <Text style={dynamicStyles.amountLabel}>Planned</Text>
            <Text style={dynamicStyles.amountValue}>
              {formatAmount(cat.plannedAmount)}
            </Text>
          </View>
          <View>
            <Text style={dynamicStyles.amountLabel}>Spent</Text>
            <Text
              testID={`spent-${cat.id}`}
              style={[
                dynamicStyles.amountValue,
                isOver && dynamicStyles.negativeAmount,
              ]}
            >
              {formatAmount(cat.spentAmount)}
            </Text>
          </View>
          <View>
            <Text style={dynamicStyles.amountLabel}>Remaining</Text>
            <Text
              style={[
                dynamicStyles.amountValue,
                remaining < 0 && dynamicStyles.negativeAmount,
              ]}
            >
              {formatAmount(remaining)}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderGroup = (title: string, categories: PeriodCategory[]) => (
    <View key={title}>
      <Text style={dynamicStyles.sectionTitle}>{title}</Text>
      {categories.length === 0 ? (
        <Text style={dynamicStyles.emptyGroup}>No categories yet</Text>
      ) : (
        categories.map(renderCategory)
      )}
    </View>
  );

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
    // Show the server's message: a user with no budget gets the access
    // resolver's explanation rather than a generic connection error.
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Failed to load budget data. Please check your connection and try again.";
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <Text style={dynamicStyles.title}>Budget</Text>
        <MonthNavigator
          currentMonth={currentDate.month}
          currentYear={currentDate.year}
          onMonthChange={handleMonthChange}
        />
        <View style={dynamicStyles.errorContainer}>
          <Text style={dynamicStyles.errorText}>{message}</Text>
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

  const groups = period?.groups ?? { income: [], savings: [], expenses: [] };
  const spent = sumSpent(groups.expenses);
  const saved = sumSpent(groups.savings);
  const leftToBudget = period?.remainingBalance ?? 0;

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* Offline Banner */}
      <OfflineBanner
        isVisible={!syncStatus.isOnline}
        pendingItems={syncStatus.pendingItems}
      />

      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.title}>Budget</Text>
      </View>

      <Text style={dynamicStyles.subtitle}>
        {MONTH_NAMES[currentDate.month - 1]} {currentDate.year} overview
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
        {period && (
          <Card variant="elevated" style={dynamicStyles.summaryCard}>
            <View style={dynamicStyles.summaryRow}>
              <Text style={dynamicStyles.summaryLabel}>Income planned</Text>
              <Text style={dynamicStyles.summaryAmount}>
                {formatAmount(period.totalIncome)}
              </Text>
            </View>
            <View style={dynamicStyles.summaryRow}>
              <Text style={dynamicStyles.summaryLabel}>Spent</Text>
              <Text style={dynamicStyles.summaryAmount}>
                {formatAmount(spent)}
              </Text>
            </View>
            <View style={dynamicStyles.summaryRow}>
              <Text style={dynamicStyles.summaryLabel}>Saved</Text>
              <Text style={dynamicStyles.summaryAmount}>
                {formatAmount(saved)}
              </Text>
            </View>
            {/* remainingBalance is planned income - planned savings - planned
                expenses, so it reads as "left to budget", not cash left. */}
            <View style={[dynamicStyles.summaryRow, dynamicStyles.totalRow]}>
              <Text style={[dynamicStyles.summaryLabel, { fontWeight: "600" }]}>
                Left to budget
              </Text>
              <Text
                style={[
                  dynamicStyles.totalAmount,
                  leftToBudget >= 0
                    ? dynamicStyles.positiveAmount
                    : dynamicStyles.negativeAmount,
                ]}
              >
                {formatAmount(leftToBudget)}
              </Text>
            </View>
          </Card>
        )}

        {renderGroup("Income", groups.income)}
        {renderGroup("Savings", groups.savings)}
        {renderGroup("Expenses", groups.expenses)}

        {/* Add bottom padding for FAB */}
        <View style={{ height: 100 }} />
      </ScrollView>

      <FloatingActionButton
        actions={fabActions}
        mainIcon="add"
        mainColor={colors.primary}
      />

      {/* Record Transaction Modal */}
      <QuickAddTransaction
        visible={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onSubmit={handleRecordTransaction}
        categories={quickAddCategories}
        selectedCategoryId={preselectedCategoryId}
        isLoading={recordTransaction.isLoading}
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
