/**
 * Upcoming Occurrences Component
 * Displays upcoming budget occurrences with dates and amounts
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Card, LoadingSpinner } from './ui';
import { useTheme } from '../hooks/useTheme';
import { useUpcomingOccurrences } from '../services/budget';
import { UpcomingOccurrence, BUDGET_TYPE_CONFIG } from '../types/budget';

interface UpcomingOccurrencesProps {
  daysAhead?: number;
  onOccurrencePress?: (occurrence: UpcomingOccurrence) => void;
  maxItems?: number;
}

export const UpcomingOccurrences: React.FC<UpcomingOccurrencesProps> = ({
  daysAhead = 30,
  onOccurrencePress,
  maxItems = 10,
}) => {
  const { colors } = useTheme();
  const { data: occurrences, isLoading, error } = useUpcomingOccurrences(daysAhead);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
      });
    }
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getDaysUntilText = (daysUntil: number): string => {
    if (daysUntil === 0) return 'Today';
    if (daysUntil === 1) return 'Tomorrow';
    return `in ${daysUntil} days`;
  };

  const renderOccurrence = ({ item }: { item: UpcomingOccurrence }) => {
    const typeConfig = BUDGET_TYPE_CONFIG[item.type];

    return (
      <TouchableOpacity
        style={[styles.occurrenceItem, { borderLeftColor: typeConfig.color }]}
        onPress={() => onOccurrencePress?.(item)}
        activeOpacity={0.7}
      >
        <View style={styles.occurrenceHeader}>
          <View style={styles.occurrenceInfo}>
            <Text style={[styles.budgetName, { color: colors.text }]}>
              {item.budgetName}
            </Text>
            <Text style={[styles.category, { color: colors.textSecondary }]}>
              {item.category}
            </Text>
          </View>
          <View style={styles.occurrenceAmount}>
            <Text style={[styles.amount, { color: typeConfig.color }]}>
              {typeConfig.icon} {formatAmount(item.plannedAmount)}
            </Text>
          </View>
        </View>

        <View style={styles.occurrenceFooter}>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {formatDate(item.occurrenceDate)}
          </Text>
          <Text style={[styles.daysUntil, { color: colors.textMuted }]}>
            {getDaysUntilText(item.daysUntil)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <Card style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Upcoming Occurrences
          </Text>
        </View>
        <LoadingSpinner />
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Upcoming Occurrences
          </Text>
        </View>
        <Text style={[styles.errorText, { color: colors.error }]}>
          Failed to load upcoming occurrences
        </Text>
      </Card>
    );
  }

  if (!occurrences || occurrences.length === 0) {
    return (
      <Card style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Upcoming Occurrences
          </Text>
        </View>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No upcoming budget occurrences in the next {daysAhead} days
        </Text>
      </Card>
    );
  }

  const displayOccurrences = occurrences.slice(0, maxItems);

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Upcoming Occurrences
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Next {displayOccurrences.length} of {occurrences.length} occurrences
        </Text>
      </View>

      <FlatList
        data={displayOccurrences}
        renderItem={renderOccurrence}
        keyExtractor={(item) => `${item.budgetId}-${item.occurrenceDate}`}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />

      {occurrences.length > maxItems && (
        <TouchableOpacity style={styles.showMoreButton}>
          <Text style={[styles.showMoreText, { color: colors.primary }]}>
            Show {occurrences.length - maxItems} more occurrences
          </Text>
        </TouchableOpacity>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  list: {
    maxHeight: 400,
  },
  occurrenceItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderLeftWidth: 4,
    marginBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 8,
  },
  occurrenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  occurrenceInfo: {
    flex: 1,
  },
  budgetName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  category: {
    fontSize: 14,
  },
  occurrenceAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
  },
  occurrenceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 14,
    fontWeight: '500',
  },
  daysUntil: {
    fontSize: 12,
  },
  showMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    marginTop: 8,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    padding: 20,
  },
});

export default UpcomingOccurrences;
