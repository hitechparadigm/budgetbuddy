/**
 * Recurring Budget Configuration Component
 * Allows users to configure recurring budget settings
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button, Input, Card } from './ui';
import { useTheme } from '../hooks/useTheme';
import {
  BudgetFrequency,
  RecurringBudgetConfig,
  FREQUENCY_LABELS,
  FREQUENCY_DESCRIPTIONS,
  DAYS_OF_WEEK,
  WEEKS_OF_MONTH,
  MONTHS_OF_YEAR,
} from '../types/budget';

interface RecurringBudgetConfigProps {
  frequency: BudgetFrequency;
  config?: RecurringBudgetConfig;
  onConfigChange: (config: RecurringBudgetConfig) => void;
}

export const RecurringBudgetConfigComponent: React.FC<RecurringBudgetConfigProps> = ({
  frequency,
  config = {},
  onConfigChange,
}) => {
  const { colors } = useTheme();
  const [localConfig, setLocalConfig] = useState<RecurringBudgetConfig>(config);

  const updateConfig = (updates: Partial<RecurringBudgetConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  const renderFrequencySpecificConfig = () => {
    switch (frequency) {
      case 'weekly':
        return (
          <View style={styles.configSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Day of Week
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.daySelector}>
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    title={day.short}
                    variant={localConfig.dayOfWeek === day.value ? 'primary' : 'outline'}
                    onPress={() => updateConfig({ dayOfWeek: day.value })}
                    style={styles.dayButton}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        );

      case 'bi-weekly':
        return (
          <View style={styles.configSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Day of Week
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.daySelector}>
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    title={day.short}
                    variant={localConfig.dayOfWeek === day.value ? 'primary' : 'outline'}
                    onPress={() => updateConfig({ dayOfWeek: day.value })}
                    style={styles.dayButton}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        );

      case 'monthly':
        return (
          <View style={styles.configSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Day of Month
            </Text>
            <Input
              placeholder="Day (1-31)"
              value={localConfig.dayOfMonth?.toString() || ''}
              onChangeText={(text) => {
                const day = parseInt(text, 10);
                if (!isNaN(day) && day >= 1 && day <= 31) {
                  updateConfig({ dayOfMonth: day });
                }
              }}
              keyboardType="numeric"
              style={styles.dayInput}
            />
            <View style={styles.checkboxContainer}>
              <Button
                title={localConfig.adjustForMonthEnd ? '✓' : '○'}
                variant="outline"
                onPress={() => updateConfig({ adjustForMonthEnd: !localConfig.adjustForMonthEnd })}
                style={styles.checkbox}
              />
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                Adjust for month-end (use last day if day doesn't exist)
              </Text>
            </View>
          </View>
        );

      case 'yearly':
        return (
          <View style={styles.configSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Month and Day
            </Text>
            <View style={styles.yearlyConfig}>
              <View style={styles.monthSelector}>
                <Text style={[styles.label, { color: colors.text }]}>Month</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.monthButtons}>
                    {MONTHS_OF_YEAR.map((month) => (
                      <Button
                        key={month.value}
                        title={month.short}
                        variant={localConfig.monthOfYear === month.value ? 'primary' : 'outline'}
                        onPress={() => updateConfig({ monthOfYear: month.value })}
                        style={styles.monthButton}
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
              <View style={styles.dayInputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>Day</Text>
                <Input
                  placeholder="Day (1-31)"
                  value={localConfig.dayOfMonth?.toString() || ''}
                  onChangeText={(text) => {
                    const day = parseInt(text, 10);
                    if (!isNaN(day) && day >= 1 && day <= 31) {
                      updateConfig({ dayOfMonth: day });
                    }
                  }}
                  keyboardType="numeric"
                  style={styles.dayInput}
                />
              </View>
            </View>
          </View>
        );

      case 'custom':
        return (
          <View style={styles.configSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Custom Pattern
            </Text>
            <View style={styles.customConfig}>
              <View style={styles.intervalConfig}>
                <Text style={[styles.label, { color: colors.text }]}>Every</Text>
                <Input
                  placeholder="1"
                  value={localConfig.customPattern?.interval?.toString() || ''}
                  onChangeText={(text) => {
                    const interval = parseInt(text, 10);
                    if (!isNaN(interval) && interval >= 1) {
                      updateConfig({
                        customPattern: {
                          ...localConfig.customPattern,
                          interval,
                        },
                      });
                    }
                  }}
                  keyboardType="numeric"
                  style={styles.intervalInput}
                />
                <Text style={[styles.label, { color: colors.text }]}>weeks</Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const renderAdvancedOptions = () => {
    if (frequency === 'one-time') return null;

    return (
      <View style={styles.configSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Advanced Options
        </Text>

        <View style={styles.checkboxContainer}>
          <Button
            title={localConfig.skipWeekends ? '✓' : '○'}
            variant="outline"
            onPress={() => updateConfig({ skipWeekends: !localConfig.skipWeekends })}
            style={styles.checkbox}
          />
          <Text style={[styles.checkboxLabel, { color: colors.text }]}>
            Skip weekends (move to next weekday)
          </Text>
        </View>

        <View style={styles.checkboxContainer}>
          <Button
            title={localConfig.skipHolidays ? '✓' : '○'}
            variant="outline"
            onPress={() => updateConfig({ skipHolidays: !localConfig.skipHolidays })}
            style={styles.checkbox}
          />
          <Text style={[styles.checkboxLabel, { color: colors.text }]}>
            Skip holidays
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {FREQUENCY_LABELS[frequency]} Configuration
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {FREQUENCY_DESCRIPTIONS[frequency]}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderFrequencySpecificConfig()}
        {renderAdvancedOptions()}
      </ScrollView>
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
  description: {
    fontSize: 14,
  },
  content: {
    maxHeight: 400,
  },
  configSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  daySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  dayButton: {
    minWidth: 50,
    paddingHorizontal: 12,
  },
  dayInput: {
    width: 100,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  checkbox: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
  },
  yearlyConfig: {
    gap: 16,
  },
  monthSelector: {
    marginBottom: 16,
  },
  monthButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  monthButton: {
    minWidth: 50,
    paddingHorizontal: 8,
  },
  dayInputContainer: {
    width: 120,
  },
  customConfig: {
    gap: 16,
  },
  intervalConfig: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  intervalInput: {
    width: 60,
  },
});

export default RecurringBudgetConfigComponent;
