import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Input, Button } from '../components/ui';
import { useTheme } from '../hooks/useTheme';

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const mockTransactions = [
    {
      id: '1',
      description: 'Grocery Store',
      amount: -85.50,
      category: 'Groceries',
      date: '2025-12-28',
      type: 'expense',
    },
    {
      id: '2',
      description: 'Salary Deposit',
      amount: 2000.00,
      category: 'Salary',
      date: '2025-12-27',
      type: 'income',
    },
    {
      id: '3',
      description: 'Coffee Shop',
      amount: -4.75,
      category: 'Dining',
      date: '2025-12-26',
      type: 'expense',
    },
  ];

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 24,
    },
    transactionCard: {
      backgroundColor: colors.surface,
      marginBottom: 12,
    },
    transactionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    transactionDescription: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    transactionAmount: {
      fontSize: 18,
      fontWeight: 'bold',
      marginLeft: 12,
    },
    incomeAmount: {
      color: colors.income,
    },
    expenseAmount: {
      color: colors.expense,
    },
    transactionMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    transactionCategory: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    transactionDate: {
      fontSize: 12,
      color: colors.textMuted,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyStateText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 16,
    },
  });

  const filteredTransactions = mockTransactions.filter(transaction =>
    transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <ScrollView
        contentContainerStyle={dynamicStyles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={dynamicStyles.title}>Transactions</Text>
        <Text style={dynamicStyles.subtitle}>Track your income and expenses</Text>

        <Input
          placeholder="Search transactions..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          variant="filled"
        />

        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => (
            <Card
              key={transaction.id}
              variant="elevated"
              style={dynamicStyles.transactionCard}
              pressable
              onPress={() => console.log('Transaction pressed:', transaction.id)}
            >
              <View style={dynamicStyles.transactionHeader}>
                <Text style={dynamicStyles.transactionDescription}>
                  {transaction.description}
                </Text>
                <Text
                  style={[
                    dynamicStyles.transactionAmount,
                    transaction.type === 'income'
                      ? dynamicStyles.incomeAmount
                      : dynamicStyles.expenseAmount
                  ]}
                >
                  {transaction.type === 'income' ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                </Text>
              </View>
              <View style={dynamicStyles.transactionMeta}>
                <Text style={dynamicStyles.transactionCategory}>
                  {transaction.category}
                </Text>
                <Text style={dynamicStyles.transactionDate}>
                  {new Date(transaction.date).toLocaleDateString()}
                </Text>
              </View>
            </Card>
          ))
        ) : (
          <View style={dynamicStyles.emptyState}>
            <Text style={{ fontSize: 48 }}>📝</Text>
            <Text style={dynamicStyles.emptyStateText}>
              {searchQuery ? 'No transactions match your search' : 'No transactions yet'}
            </Text>
            {!searchQuery && (
              <Button
                title="Add Your First Transaction"
                onPress={() => console.log('Add transaction')}
                style={{ marginTop: 16 }}
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
