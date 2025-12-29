import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from '../components/ui';
import { useTheme } from '../hooks/useTheme';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface SummaryData {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  budgetUtilization: number;
  topCategories: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;
}

export default function SummaryScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [summaryData] = useState<SummaryData>({
    totalIncome: 5420.00,
    totalExpenses: 3890.50,
    netIncome: 1529.50,
    budgetUtilization: 78.2,
    topCategories: [
      { name: 'Housing', amount: 1200.00, percentage: 30.8 },
      { name: 'Food', amount: 650.00, percentage: 16.7 },
      { name: 'Transportation', amount: 420.00, percentage: 10.8 },
      { name: 'Entertainment', amount: 280.00, percentage: 7.2 },
    ],
  });

  const onRefresh = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleViewDetails = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to detailed analytics
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Summary</Text>
        <Text style={styles.subtitle}>Your financial overview for December</Text>

        {/* Overview Cards */}
        <View style={styles.overviewGrid}>
          <Card style={[styles.overviewCard, { backgroundColor: colors.success + '10' }]}>
            <Text style={styles.overviewLabel}>Total Income</Text>
            <Text style={[styles.overviewAmount, { color: colors.success }]}>
              ${summaryData.totalIncome.toFixed(2)}
            </Text>
          </Card>

          <Card style={[styles.overviewCard, { backgroundColor: colors.error + '10' }]}>
            <Text style={styles.overviewLabel}>Total Expenses</Text>
            <Text style={[styles.overviewAmount, { color: colors.error }]}>
              ${summaryData.totalExpenses.toFixed(2)}
            </Text>
          </Card>
        </View>

        {/* Net Income Card */}
        <Card style={styles.netIncomeCard}>
          <Text style={styles.netIncomeLabel}>Net Income</Text>
          <Text style={[styles.netIncomeAmount, {
            color: summaryData.netIncome >= 0 ? colors.success : colors.error
          }]}>
            ${summaryData.netIncome.toFixed(2)}
          </Text>
          <View style={styles.utilizationContainer}>
            <Text style={styles.utilizationLabel}>Budget Utilization</Text>
            <Text style={[styles.utilizationPercentage, {
              color: summaryData.budgetUtilization > 90 ? colors.error :
                     summaryData.budgetUtilization > 75 ? colors.warning : colors.success
            }]}>
              {summaryData.budgetUtilization}%
            </Text>
          </View>
        </Card>

        {/* Top Categories */}
        <Card style={styles.categoriesCard}>
          <Text style={styles.sectionTitle}>Top Spending Categories</Text>
          {summaryData.topCategories.map((category, index) => (
            <View key={category.name} style={styles.categoryItem}>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryAmount}>${category.amount.toFixed(2)}</Text>
              </View>
              <View style={styles.categoryBar}>
                <View
                  style={[
                    styles.categoryBarFill,
                    {
                      width: `${category.percentage}%`,
                      backgroundColor: colors.primary
                    }
                  ]}
                />
              </View>
              <Text style={styles.categoryPercentage}>{category.percentage}%</Text>
            </View>
          ))}
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="View Detailed Analytics"
            onPress={handleViewDetails}
            style={styles.actionButton}
          />
          <Button
            title="Export Summary"
            onPress={handleViewDetails}
            variant="outline"
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
  overviewGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  overviewCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  overviewAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  netIncomeCard: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  netIncomeLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  netIncomeAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  utilizationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  utilizationLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  utilizationPercentage: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoriesCard: {
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  categoryItem: {
    marginBottom: 16,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  categoryAmount: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  categoryBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginBottom: 4,
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryPercentage: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
});
