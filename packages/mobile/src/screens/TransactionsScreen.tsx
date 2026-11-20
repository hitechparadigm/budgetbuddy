import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Alert, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Card, Button, FloatingActionButton } from "../components/ui";
import { useTheme } from "../hooks/useTheme";
import TransactionList from "../components/TransactionList";
import TransactionForm from "../components/TransactionForm";
import SearchBar from "../components/SearchBar";
import FilterSheet, {
  TransactionFilters,
  DEFAULT_FILTERS,
} from "../components/FilterSheet";
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from "../services/transaction";
import { useBudgets } from "../services/budget";
import { filterTransactions, countActiveFilters } from "../services/search";
import { ReceiptScanner } from "../components/ReceiptScanner";
import { ReceiptConfirmation } from "../components/ReceiptConfirmation";
import TransactionTemplateModal from "../components/TransactionTemplateModal";
import type { TransactionTemplate } from "../hooks/useTemplates";
import type {
  ExtractedReceiptData,
  ProcessReceiptResponse,
} from "../services/receipt";
import {
  Transaction,
  BudgetCategory,
  CreateTransactionRequest,
  UpdateTransactionRequest,
} from "../types";

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);
  const [editingTransaction, setEditingTransaction] = useState<
    Transaction | undefined
  >();
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | undefined
  >();
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const [showReceiptConfirmation, setShowReceiptConfirmation] = useState(false);
  const [scannedReceipt, setScannedReceipt] =
    useState<ExtractedReceiptData | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateDraft, setTemplateDraft] = useState<
    TransactionTemplate | undefined
  >();

  // Queries and mutations
  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = useTransactions();

  const { data: budgets = [] } = useBudgets();

  const createTransactionMutation = useCreateTransaction();
  const updateTransactionMutation = useUpdateTransaction();
  const deleteTransactionMutation = useDeleteTransaction();

  // Extract categories from budgets.
  //
  // Memoised on `budgets` so the array keeps one identity across re-renders.
  // Built inline it produced a fresh array on every render, which made the
  // `filterCategories` memo below a no-op and, more seriously, re-triggered
  // any child effect that depended on it.
  const categories: BudgetCategory[] = useMemo(
    () =>
      budgets.flatMap((budget) =>
        // For now, create a simple category structure from budget data
        // This would be replaced with actual category data from the API
        [
          {
            id: budget.id,
            name: budget.name,
            icon:
              budget.type === "income"
                ? "💰"
                : budget.type === "savings"
                  ? "💾"
                  : "💸",
            color:
              budget.type === "income"
                ? "#10B981"
                : budget.type === "savings"
                  ? "#3B82F6"
                  : "#EF4444",
            isRecurring: budget.frequency !== "one-time",
            recurringFrequency:
              budget.frequency === "weekly"
                ? "weekly"
                : budget.frequency === "monthly"
                  ? "monthly"
                  : budget.frequency === "quarterly"
                    ? "quarterly"
                    : budget.frequency === "yearly"
                      ? "annually"
                      : undefined,
            baseAmount: budget.amount,
            plannedMonthlyAmount: budget.amount,
            actualAmount: 0,
            variance: 0,
            transactions: [],
            order: 0,
            isCustom: false,
            isArchived: false,
            usageCount: 0,
            isPaused: false,
          },
        ],
      ),
    [budgets],
  );

  // Filtering lives in services/search so the screen and its property tests
  // exercise the same code.
  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, searchQuery, filters),
    [transactions, searchQuery, filters]
  );

  // Calculate active filter count for badge
  const activeFilterCount = useMemo(
    () => countActiveFilters(filters),
    [filters]
  );

  // Filter categories for FilterSheet (convert BudgetCategory to simpler format)
  const filterCategories = useMemo(() => {
    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      type:
        cat.color === "#10B981"
          ? ("income" as const)
          : cat.color === "#3B82F6"
            ? ("savings" as const)
            : ("expense" as const),
    }));
  }, [categories]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetchTransactions();
    }, [refetchTransactions]),
  );

  /**
   * Receipt scan -> confirm -> create.
   *
   * ReceiptScanner uploads and OCRs through services/receipt (extended
   * features gateway), hands back the extracted fields, and
   * ReceiptConfirmation lets the user correct them before a transaction is
   * created. Both components existed but were mounted nowhere.
   */
  const handleScanComplete = (result: ProcessReceiptResponse) => {
    if (categories.length === 0) {
      // Nothing the confirmation sheet could file this against.
      Alert.alert(
        "No categories",
        "Create a budget category before saving a receipt.",
      );
      setShowReceiptScanner(false);
      return;
    }

    setScannedReceipt(result.extractedData);
    setShowReceiptScanner(false);
    setShowReceiptConfirmation(true);
  };

  const handleReceiptSave = (data: {
    merchant: string;
    date: string;
    amount: number;
    categoryId: string;
    notes?: string;
  }) => {
    // ReceiptConfirmation picks from this screen's own `categories`, so the
    // id it returns is already one of the budget's. It used to return a name
    // from a hardcoded list, so a name matching nothing was filed under
    // categories[0] with a success haptic.
    createTransactionMutation.mutate(
      {
        categoryId: data.categoryId,
        amount: data.amount,
        description: data.notes?.trim() || data.merchant,
        merchant: data.merchant,
        date: data.date,
      },
      {
        onSuccess: () => {
          setShowReceiptConfirmation(false);
          setScannedReceipt(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (error) => {
          console.error("Failed to save receipt transaction:", error);
          Alert.alert("Error", "Failed to save the receipt. Please try again.");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      },
    );
  };

  /** Apply a saved template by opening the form prefilled from it. */
  const handleSelectTemplate = (template: TransactionTemplate) => {
    setShowTemplateModal(false);
    setSelectedCategoryId(template.categoryId);
    setEditingTransaction(undefined);
    setTemplateDraft(template);
    setShowTransactionForm(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleAddTransaction = (categoryId?: string) => {
    setTemplateDraft(undefined);
    setSelectedCategoryId(categoryId);
    setEditingTransaction(undefined);
    setShowTransactionForm(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowTransactionForm(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    deleteTransactionMutation.mutate(transaction.id, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      onError: (error) => {
        console.error("Failed to delete transaction:", error);
        Alert.alert("Error", "Failed to delete transaction. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    });
  };

  const handleTransactionFormSubmit = (
    data: CreateTransactionRequest | UpdateTransactionRequest,
  ) => {
    if ("id" in data) {
      // Update existing transaction
      updateTransactionMutation.mutate(data, {
        onSuccess: () => {
          setShowTransactionForm(false);
          setEditingTransaction(undefined);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (error) => {
          console.error("Failed to update transaction:", error);
          Alert.alert(
            "Error",
            "Failed to update transaction. Please try again.",
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      });
    } else {
      // Create new transaction
      createTransactionMutation.mutate(data, {
        onSuccess: () => {
          setShowTransactionForm(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (error) => {
          console.error("Failed to create transaction:", error);
          Alert.alert(
            "Error",
            "Failed to create transaction. Please try again.",
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      });
    }
  };

  const handleRefresh = () => {
    refetchTransactions();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 8,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 16,
      paddingHorizontal: 16,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      marginBottom: 16,
      gap: 12,
    },
    searchBar: {
      flex: 1,
    },
    filterButton: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    filterButtonActive: {
      backgroundColor: colors.primary + "20",
      borderColor: colors.primary,
    },
    filterBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      backgroundColor: colors.primary,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    filterBadgeText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: "600",
    },
    summaryCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 16,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
    },
    summaryLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    placeholderCard: {
      backgroundColor: colors.surface,
      padding: 24,
      alignItems: "center",
      marginHorizontal: 16,
      marginBottom: 16,
    },
    placeholderText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 16,
    },
    placeholderEmoji: {
      fontSize: 48,
      marginBottom: 16,
    },
  });

  const totalAmount = filteredTransactions.reduce(
    (sum, t) => sum + t.amount,
    0,
  );
  const transactionCount = filteredTransactions.length;

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <Text style={dynamicStyles.title}>Transactions</Text>
      <Text style={dynamicStyles.subtitle}>Track your spending</Text>

      <View style={dynamicStyles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search transactions..."
          style={dynamicStyles.searchBar}
        />
        <Pressable
          style={[
            dynamicStyles.filterButton,
            activeFilterCount > 0 && dynamicStyles.filterButtonActive,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFilterSheet(true);
          }}
          accessibilityLabel={`Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ""}`}
          accessibilityRole="button"
        >
          <Ionicons
            name="options-outline"
            size={24}
            color={
              activeFilterCount > 0 ? colors.primary : colors.textSecondary
            }
          />
          {activeFilterCount > 0 && (
            <View style={dynamicStyles.filterBadge}>
              <Text style={dynamicStyles.filterBadgeText}>
                {activeFilterCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {transactionCount > 0 && (
        <Card variant="elevated" style={dynamicStyles.summaryCard}>
          <View style={dynamicStyles.summaryRow}>
            <Text style={dynamicStyles.summaryLabel}>Total Transactions</Text>
            <Text style={dynamicStyles.summaryValue}>{transactionCount}</Text>
          </View>
          <View style={dynamicStyles.summaryRow}>
            <Text style={dynamicStyles.summaryLabel}>Total Amount</Text>
            <Text style={dynamicStyles.summaryValue}>
              ${totalAmount.toFixed(2)}
            </Text>
          </View>
        </Card>
      )}

      <View style={dynamicStyles.content}>
        {transactionsLoading && transactions.length === 0 ? (
          <Card variant="elevated" style={dynamicStyles.placeholderCard}>
            <Text style={dynamicStyles.placeholderEmoji}>⏳</Text>
            <Text style={dynamicStyles.placeholderText}>
              Loading your transactions...
            </Text>
          </Card>
        ) : filteredTransactions.length === 0 ? (
          <Card variant="elevated" style={dynamicStyles.placeholderCard}>
            <Text style={dynamicStyles.placeholderEmoji}>
              {searchQuery.trim() || activeFilterCount > 0 ? "🔍" : "💸"}
            </Text>
            <Text style={dynamicStyles.placeholderText}>
              {searchQuery.trim() || activeFilterCount > 0
                ? "No transactions match your search or filters"
                : "Your transactions will appear here once you start adding them."}
            </Text>
            {searchQuery.trim() || activeFilterCount > 0 ? (
              <Button
                title="Clear Filters"
                variant="outline"
                onPress={() => {
                  setSearchQuery("");
                  setFilters(DEFAULT_FILTERS);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
            ) : (
              <Button
                title="Add Your First Transaction"
                onPress={() => handleAddTransaction()}
              />
            )}
          </Card>
        ) : (
          <TransactionList
            transactions={filteredTransactions}
            categories={categories}
            isLoading={transactionsLoading}
            onRefresh={handleRefresh}
            onTransactionPress={(transaction) => {
              console.log("Transaction pressed:", transaction.description);
              // Could navigate to transaction details
            }}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            groupByDate={true}
            showCategory={true}
            emptyMessage="No transactions found"
          />
        )}
      </View>

      <FloatingActionButton
        actions={[
          {
            icon: "add",
            label: "Add Transaction",
            onPress: () => handleAddTransaction(),
            color: colors.primary,
          },
          {
            icon: "camera-outline",
            label: "Scan Receipt",
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowReceiptScanner(true);
            },
            color: colors.primary,
          },
          {
            icon: "copy-outline",
            label: "Use Template",
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowTemplateModal(true);
            },
            color: colors.primary,
          },
        ]}
        mainIcon="add"
        mainColor={colors.primary}
      />

      <TransactionForm
        visible={showTransactionForm}
        onClose={() => {
          setShowTransactionForm(false);
          setEditingTransaction(undefined);
          setSelectedCategoryId(undefined);
          setTemplateDraft(undefined);
        }}
        onSubmit={handleTransactionFormSubmit}
        transaction={editingTransaction}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        isLoading={
          createTransactionMutation.isPending ||
          updateTransactionMutation.isPending
        }
      />

      {/* Receipt scan -> confirm -> create (extended features gateway) */}
      <ReceiptScanner
        visible={showReceiptScanner}
        onClose={() => setShowReceiptScanner(false)}
        onScanComplete={handleScanComplete}
      />

      <ReceiptConfirmation
        visible={showReceiptConfirmation}
        extractedData={scannedReceipt}
        categories={categories}
        onClose={() => {
          setShowReceiptConfirmation(false);
          setScannedReceipt(null);
        }}
        onSave={handleReceiptSave}
      />

      {/* The modal owns its own useTemplates(), so it loads and saves
          templates itself; passing a second saver would double-write. */}
      <TransactionTemplateModal
        visible={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelectTemplate={handleSelectTemplate}
        getCategoryName={(categoryId) =>
          categories.find((c) => c.id === categoryId)?.name ?? "Unknown"
        }
        currentTransaction={
          templateDraft
            ? {
                description: templateDraft.description,
                amount: templateDraft.amount,
                categoryId: templateDraft.categoryId,
              }
            : undefined
        }
      />

      <FilterSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        filters={filters}
        onApply={(newFilters) => {
          setFilters(newFilters);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        categories={filterCategories}
      />
    </SafeAreaView>
  );
}
