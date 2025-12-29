import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Card, Button, Input, FloatingActionButton } from '../components/ui';
import { useTheme } from '../hooks/useTheme';
import TransactionList from '../components/TransactionList';
import TransactionForm from '../components/TransactionForm';
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from '../services/transaction';
import { useBudgets } from '../services/budget';
import {
  Transaction,
  BudgetCategory,
  CreateTransactionRequest,
  UpdateTransactionRequest,
} from '../types';

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();

  // Queries and mutations
  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = useTransactions();

  const {
    data: budgets = [],
  } = useBudgets();

  const createTransactionMutation = useCreateTransaction();
  const updateTransactionMutation = useUpdateTransaction();
  const deleteTransactionMutation = useDeleteTransaction();

  // Extract categories from budgets
  const categories: BudgetCategory[] = budgets.flatMap(budget =>
    // For now, create a simple category structure from budget data
    // This would be replaced with actual category data from the API
    [{
      id: budget.id,
      name: budget.name,
      icon: budget.type === 'income' ? '💰' : budget.type === 'savings' ? '💾' : '💸',
      color: budget.type === 'income' ? '#10B981' : budget.type === 'savings' ? '#3B82F6' : '#EF4444',
      isRecurring: budget.frequency !== 'one-time',
      recurringFrequency: budget.frequency === 'weekly' ? 'weekly' :
                         budget.frequency === 'monthly' ? 'monthly' :
                         budget.frequency === 'quarterly' ? 'quarterly' :
                         budget.frequency === 'yearly' ? 'annually' : undefined,
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
    }]
  );

  // Filter transactions based on search query
  const filteredTransactions = transactions.filter(transaction => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      transaction.description.toLowerCase().includes(query) ||
      transaction.merchant?.toLowerCase().includes(query) ||
      transaction.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetchTransactions();
    }, [refetchTransactions])
  );

  const handleAddTransaction = (categoryId?: string) => {
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
        console.error('Failed to delete transaction:', error);
        Alert.alert('Error', 'Failed to delete transaction. Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    });
  };

  const handleTransactionFormSubmit = (data: CreateTransactionRequest | UpdateTransactionRequest) => {
    if ('id' in data) {
      // Update existing transaction
      updateTransactionMutation.mutate(data, {
        onSuccess: () => {
          setShowTransactionForm(false);
          setEditingTransaction(undefined);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (error) => {
          console.error('Failed to update transaction:', error);
          Alert.alert('Error', 'Failed to update transaction. Please try again.');
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
          console.error('Failed to create transaction:', error);
          Alert.alert('Error', 'Failed to create transaction. Please try again.');
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
      fontWeight: 'bold',
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
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    summaryCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginBottom: 16,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    summaryLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    placeholderCard: {
      backgroundColor: colors.surface,
      padding: 24,
      alignItems: 'center',
      marginHorizontal: 16,
      marginBottom: 16,
    },
    placeholderText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    placeholderEmoji: {
      fontSize: 48,
      marginBottom: 16,
    },
  });

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  const transactionCount = filteredTransactions.length;

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <Text style={dynamicStyles.title}>Transactions</Text>
      <Text style={dynamicStyles.subtitle}>Track your spending</Text>

      <View style={dynamicStyles.searchContainer}>
        <Input
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search transactions..."
          leftIcon="search"
        />
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
            <Text style={dynamicStyles.placeholderEmoji}>💸</Text>
            <Text style={dynamicStyles.placeholderText}>
              {searchQuery.trim()
                ? `No transactions found matching "${searchQuery}"`
                : 'Your transactions will appear here once you start adding them.'
              }
            </Text>
            {!searchQuery.trim() && (
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
              console.log('Transaction pressed:', transaction.description);
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
            icon: 'add',
            label: 'Add Transaction',
            onPress: () => handleAddTransaction(),
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
        }}
        onSubmit={handleTransactionFormSubmit}
        transaction={editingTransaction}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        isLoading={createTransactionMutation.isPending || updateTransactionMutation.isPending}
      />
    </SafeAreaView>
  );
}
