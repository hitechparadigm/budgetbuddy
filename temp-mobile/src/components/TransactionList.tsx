/**
 * Transaction List Component
 * Displays transactions with mobile-optimized UX
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LoadingSpinner } from './ui';
import { useTheme } from '../hooks/useTheme';
import { Transaction, BudgetCategory } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  categories: BudgetCategory[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onTransactionPress?: (transaction: Transaction) => void;
  onEditTransaction?: (transaction: Transaction) => void;
  onDeleteTransaction?: (transaction: Transaction) => void;
  groupByDate?: boolean;
  showCategory?: boolean;
  emptyMessage?: string;
}

interface GroupedTransaction {
  date: string;
  transactions: Transaction[];
  totalAmount: number;
}

export default function TransactionList({
  transactions,
  categories,
  isLoading = false,
  onRefresh,
  onTransactionPress,
  onEditTransaction,
  onDeleteTransaction,
  groupByDate = true,
  showCategory = true,
  emptyMessage = 'No transactions found',
}: TransactionListProps) {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  const getCategoryIcon = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.icon : '📝';
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const groupTransactionsByDate = (transactions: Transaction[]): GroupedTransaction[] => {
    const grouped = transactions.reduce((acc, transaction) => {
      const date = transaction.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(transaction);
      return acc;
    }, {} as Record<string, Transaction[]>);

    return Object.entries(grouped)
      .map(([date, transactions]) => ({
        date,
        transactions: transactions.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
  };

  const handleTransactionPress = (transaction: Transaction) => {
    if (onTransactionPress) {
      onTransactionPress(transaction);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    if (onEditTransaction) {
      onEditTransaction(transaction);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this transaction?\n\n${transaction.description}\n${formatCurrency(transaction.amount)}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onDeleteTransaction) {
              onDeleteTransaction(transaction);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  const renderTransaction = (transaction: Transaction) => (
    <Pressable
      key={transaction.id}
      style={dynamicStyles.transactionItem}
      onPress={() => handleTransactionPress(transaction)}
      onLongPress={() => handleEditTransaction(transaction)}
    >
      <View style={dynamicStyles.transactionContent}>
        <View style={dynamicStyles.transactionLeft}>
          {showCategory && (
            <Text style={dynamicStyles.transactionIcon}>
              {getCategoryIcon(transaction.categoryId)}
            </Text>
          )}
          <View style={dynamicStyles.transactionDetails}>
            <Text style={dynamicStyles.transactionDescription}>
              {transaction.description}
            </Text>
            {showCategory && (
              <Text style={dynamicStyles.transactionCategory}>
                {getCategoryName(transaction.categoryId)}
              </Text>
            )}
            {transaction.merchant && (
              <Text style={dynamicStyles.transactionMerchant}>
                {transaction.merchant}
              </Text>
            )}
            {transaction.tags && transaction.tags.length > 0 && (
              <View style={dynamicStyles.tagContainer}>
                {transaction.tags.slice(0, 3).map((tag) => (
                  <View key={tag} style={dynamicStyles.tag}>
                    <Text style={dynamicStyles.tagText}>{tag}</Text>
                  </View>
                ))}
                {transaction.tags.length > 3 && (
                  <Text style={dynamicStyles.moreTagsText}>
                    +{transaction.tags.length - 3}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={dynamicStyles.transactionRight}>
          <Text style={dynamicStyles.transactionAmount}>
            {formatCurrency(transaction.amount)}
          </Text>
          {transaction.syncStatus !== 'synced' && (
            <View style={dynamicStyles.syncStatus}>
              <Ionicons
                name={transaction.syncStatus === 'pending' ? 'cloud-upload-outline' : 'warning-outline'}
                size={12}
                color={transaction.syncStatus === 'pending' ? colors.textSecondary : colors.error}
              />
            </View>
          )}
          <Pressable
            style={dynamicStyles.actionButton}
            onPress={() => handleDeleteTransaction(transaction)}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );

  const renderDateGroup = ({ item }: { item: GroupedTransaction }) => (
    <View style={dynamicStyles.dateGroup}>
      <View style={dynamicStyles.dateHeader}>
        <Text style={dynamicStyles.dateText}>{formatDate(item.date)}</Text>
        <Text style={dynamicStyles.dateTotalText}>
          {formatCurrency(item.totalAmount)}
        </Text>
      </View>
      {item.transactions.map(renderTransaction)}
    </View>
  );

  const renderFlatTransaction = ({ item }: { item: Transaction }) => (
    <View style={dynamicStyles.flatTransactionContainer}>
      {renderTransaction(item)}
    </View>
  );

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 64,
      paddingHorizontal: 32,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 16,
      opacity: 0.5,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    dateGroup: {
      marginBottom: 16,
    },
    dateHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderRadius: 8,
      marginBottom: 8,
    },
    dateText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    dateTotalText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    flatTransactionContainer: {
      marginBottom: 8,
    },
    transactionItem: {
      backgroundColor: colors.background,
      borderRadius: 8,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    transactionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    transactionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    transactionIcon: {
      fontSize: 20,
    },
    transactionDetails: {
      flex: 1,
    },
    transactionDescription: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 2,
    },
    transactionCategory: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    transactionMerchant: {
      fontSize: 12,
      color: colors.textSecondary,
      fontStyle: 'italic',
      marginBottom: 4,
    },
    tagContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: 4,
    },
    tag: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    tagText: {
      fontSize: 10,
      color: colors.primary,
    },
    moreTagsText: {
      fontSize: 10,
      color: colors.textSecondary,
      paddingHorizontal: 4,
    },
    transactionRight: {
      alignItems: 'flex-end',
      gap: 4,
    },
    transactionAmount: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    syncStatus: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      padding: 4,
    },
  });

  if (isLoading && transactions.length === 0) {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <LoadingSpinner size="large" />
        <Text style={[dynamicStyles.emptyText, { marginTop: 16 }]}>
          Loading transactions...
        </Text>
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View style={dynamicStyles.emptyContainer}>
        <Text style={dynamicStyles.emptyIcon}>💸</Text>
        <Text style={dynamicStyles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  if (groupByDate) {
    const groupedTransactions = groupTransactionsByDate(transactions);

    return (
      <FlatList
        style={dynamicStyles.container}
        data={groupedTransactions}
        renderItem={renderDateGroup}
        keyExtractor={(item) => item.date}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
      />
    );
  }

  return (
    <FlatList
      style={dynamicStyles.container}
      data={transactions.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )}
      renderItem={renderFlatTransaction}
      keyExtractor={(item) => item.id}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
    />
  );
}
