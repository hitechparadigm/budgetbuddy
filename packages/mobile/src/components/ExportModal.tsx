import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Button, Input } from './ui';
import { useTheme } from '../hooks/useTheme';
import { exportService, ExportOptions } from '../services/export';
import { Budget, Transaction } from '../types';
import * as Haptics from 'expo-haptics';

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  budgets: Budget[];
  transactions: Transaction[];
  type: 'budgets' | 'transactions' | 'report';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  visible,
  onClose,
  budgets,
  transactions,
  type,
}) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Get unique categories from transactions
  const availableCategories = Array.from(
    new Set(transactions.map(t => t.category))
  ).sort();

  const handleExport = async () => {
    try {
      setLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const options: ExportOptions = {
        format,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      };

      let result;

      switch (type) {
        case 'budgets':
          result = await exportService.exportBudgetsToCSV(budgets, options);
          break;
        case 'transactions':
          result = await exportService.exportTransactionsToCSV(transactions, options);
          break;
        case 'report':
          const reportMonth = startDate ? new Date(startDate) : new Date();
          result = await exportService.generateMonthlyBudgetPDF(
            budgets,
            transactions,
            reportMonth,
            options
          );
          break;
        default:
          throw new Error('Invalid export type');
      }

      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Export Successful',
          `Your ${type} have been exported successfully. The file has been saved and shared.`,
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Export Failed',
          result.error || 'An unknown error occurred during export.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Export Error',
        error instanceof Error ? error.message : 'An unexpected error occurred.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modal: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 20,
      margin: 20,
      maxHeight: '80%',
      width: '90%',
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 10,
    },
    formatContainer: {
      flexDirection: 'row',
      gap: 10,
    },
    formatButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    formatButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    formatButtonText: {
      color: colors.text,
      fontWeight: '500',
    },
    formatButtonTextActive: {
      color: colors.background,
    },
    dateContainer: {
      flexDirection: 'row',
      gap: 10,
    },
    dateInput: {
      flex: 1,
    },
    categoryContainer: {
      maxHeight: 120,
    },
    categoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryItemSelected: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    categoryText: {
      flex: 1,
      color: colors.text,
      marginLeft: 8,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkmark: {
      color: colors.background,
      fontSize: 12,
      fontWeight: 'bold',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 20,
    },
    button: {
      flex: 1,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    loadingText: {
      marginLeft: 10,
      color: colors.text,
      fontSize: 16,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>
            Export {type === 'report' ? 'Budget Report' : type.charAt(0).toUpperCase() + type.slice(1)}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Format Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Format</Text>
              <View style={styles.formatContainer}>
                <Button
                  title="CSV"
                  onPress={() => setFormat('csv')}
                  variant={format === 'csv' ? 'primary' : 'outline'}
                  style={styles.button}
                />
                {type === 'report' && (
                  <Button
                    title="PDF"
                    onPress={() => setFormat('pdf')}
                    variant={format === 'pdf' ? 'primary' : 'outline'}
                    style={styles.button}
                  />
                )}
              </View>
            </View>

            {/* Date Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Date Range (Optional)</Text>
              <View style={styles.dateContainer}>
                <Input
                  placeholder="Start Date (YYYY-MM-DD)"
                  value={startDate}
                  onChangeText={setStartDate}
                  style={styles.dateInput}
                />
                <Input
                  placeholder="End Date (YYYY-MM-DD)"
                  value={endDate}
                  onChangeText={setEndDate}
                  style={styles.dateInput}
                />
              </View>
            </View>

            {/* Category Filter (for transactions) */}
            {type === 'transactions' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Categories (Optional - {selectedCategories.length} selected)
                </Text>
                <ScrollView style={styles.categoryContainer} nestedScrollEnabled>
                  {availableCategories.map(category => (
                    <Button
                      key={category}
                      title={category}
                      onPress={() => toggleCategory(category)}
                      variant={selectedCategories.includes(category) ? 'primary' : 'outline'}
                      style={{ marginVertical: 2 }}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Exporting...</Text>
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              <Button
                title="Cancel"
                onPress={onClose}
                variant="outline"
                style={styles.button}
              />
              <Button
                title="Export"
                onPress={handleExport}
                variant="primary"
                style={styles.button}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
