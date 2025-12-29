/**
 * Bulk Actions Modal Component
 * Provides bulk operations for managing multiple transactions at once
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card, Button } from './ui';
import { useTheme } from '../hooks/useTheme';
import { quickActionsService } from '../services/quickActions';
import { Transaction, Budget } from '../types';

interface BulkActionsModalProps {
  visible: boolean;
  onClose: () => void;
  transactions: Transaction[];
  budgets: Budget[];
  onBulkUpdate: (transactionIds: string[], updates: Partial<Transaction>) => void;
  onBulkDelete: (transactionIds: string[]) => void;
}

interface BulkSuggestion {
  type: 'category_change' | 'merchant_update' | 'duplicate_removal';
  description: string;
  transactionIds: string[];
  suggestedAction: any;
}

export default function BulkActionsModal({
  visible,
  onClose,
  transactions,
  budgets,
  onBulkUpdate,
  onBulkDelete,
}: BulkActionsModalProps) {
  const { colors } = useTheme();
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<BulkSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  useEffect(() => {
    if (visible) {
      loadSuggestions();
      setSelectedTransactions(new Set());
    }
  }, [visible, transactions]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const bulkSuggestions = quickActionsService.getBulkOperationSuggestions(transactions);
      setSuggestions(bulkSuggestions);
    } catch (error) {
      console.error('Failed to load bulk suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTransactionSelection = (transactionId: string) => {
    const newSelection = new Set(selectedTransactions);
    if (newSelection.has(transactionId)) {
      newSelection.delete(transactionId);
    } else {
      newSelection.add(transactionId);
    }
    setSelectedTransactions(newSelection);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const selectAllTransactions = () => {
    const allIds = new Set(transactions.map(t => t.id));
    setSelectedTransactions(allIds);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const clearSelection = () => {
    setSelectedTransactions(new Set());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const applySuggestion = async (suggestion: BulkSuggestion) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      switch (suggestion.type) {
        case 'category_change':
          const categoryId = suggestion.suggestedAction.mostCommonCategory;
          onBulkUpdate(suggestion.transactionIds, { categoryId });
          break;

        case 'duplicate_removal':
          Alert.alert(
            'Remove Duplicates',
            `Are you sure you want to delete ${suggestion.transactionIds.length} duplicate transactions?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => onBulkDelete(suggestion.transactionIds),
              },
            ]
          );
          return; // Don't close modal yet

        case 'merchant_update':
          // Handle merchant updates if needed
          break;
      }

      onClose();
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
      Alert.alert('Error', 'Failed to apply bulk action');
    }
  };

  const handleBulkCategoryChange = () => {
    if (selectedTransactions.size === 0) {
      Alert.alert('No Selection', 'Please select transactions to update');
      return;
    }
    setShowCategoryPicker(true);
  };

  const applyBulkCategoryChange = () => {
    if (!selectedCategoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    onBulkUpdate(Array.from(selectedTransactions), { categoryId: selectedCategoryId });
    setShowCategoryPicker(false);
    onClose();
  };

  const handleBulkDelete = () => {
    if (selectedTransactions.size === 0) {
      Alert.alert('No Selection', 'Please select transactions to delete');
      return;
    }

    Alert.alert(
      'Delete Transactions',
      `Are you sure you want to delete ${selectedTransactions.size} selected transactions?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onBulkDelete(Array.from(selectedTransactions));
            onClose();
          },
        },
      ]
    );
  };

  const getAllCategories = () => {
    const categories: Array<{ id: string; name: string; icon: string; groupName: string }> = [];

    budgets.forEach(budget => {
      budget.groups?.forEach(group => {
        group.categories?.forEach(category => {
          categories.push({
            id: category.id,
            name: category.name,
            icon: category.icon,
            groupName: group.name,
          });
        });
      });
    });

    return categories;
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const dynamicStyles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
      minHeight: '60%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    closeButton: {
      padding: 8,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    selectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    selectionCount: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    selectionActions: {
      flexDirection: 'row',
      gap: 12,
    },
    selectionButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.surface,
      borderRadius: 6,
    },
    selectionButtonText: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '500',
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 8,
      marginBottom: 4,
    },
    transactionSelected: {
      backgroundColor: colors.primary + '20',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.border,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    transactionContent: {
      flex: 1,
    },
    transactionDescription: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 2,
    },
    transactionMeta: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    transactionAmount: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    suggestionItem: {
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 8,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    suggestionTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 4,
    },
    suggestionDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    suggestionButton: {
      alignSelf: 'flex-start',
    },
    bulkActionButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
    },
    bulkActionButton: {
      flex: 1,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    emptyDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    categoryPickerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    categoryPickerContainer: {
      backgroundColor: colors.background,
      borderRadius: 16,
      maxHeight: '70%',
    },
    categoryPickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    categoryPickerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    categoryList: {
      padding: 16,
    },
    categoryGroup: {
      marginBottom: 20,
    },
    categoryGroupTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    categoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 8,
      marginBottom: 4,
    },
    categoryIcon: {
      fontSize: 20,
      marginRight: 12,
    },
    categoryName: {
      fontSize: 14,
      color: colors.text,
    },
    categoryPickerButtons: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    categoryPickerButton: {
      flex: 1,
    },
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={dynamicStyles.overlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={dynamicStyles.container}>
          {/* Header */}
          <View style={dynamicStyles.header}>
            <Text style={dynamicStyles.headerTitle}>Bulk Actions</Text>
            <Pressable style={dynamicStyles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={dynamicStyles.content} showsVerticalScrollIndicator={false}>
            {/* Smart Suggestions */}
            {suggestions.length > 0 && (
              <View style={dynamicStyles.section}>
                <Text style={dynamicStyles.sectionTitle}>Smart Suggestions</Text>
                {suggestions.map((suggestion, index) => (
                  <View key={index} style={dynamicStyles.suggestionItem}>
                    <Text style={dynamicStyles.suggestionTitle}>
                      {suggestion.description}
                    </Text>
                    <Text style={dynamicStyles.suggestionDescription}>
                      {suggestion.transactionIds.length} transactions affected
                    </Text>
                    <Button
                      title="Apply"
                      onPress={() => applySuggestion(suggestion)}
                      variant="primary"
                      style={dynamicStyles.suggestionButton}
                    />
                  </View>
                ))}
              </View>
            )}

            {/* Manual Selection */}
            <View style={dynamicStyles.section}>
              <Text style={dynamicStyles.sectionTitle}>Manual Selection</Text>

              <View style={dynamicStyles.selectionHeader}>
                <Text style={dynamicStyles.selectionCount}>
                  {selectedTransactions.size} of {transactions.length} selected
                </Text>
                <View style={dynamicStyles.selectionActions}>
                  <Pressable style={dynamicStyles.selectionButton} onPress={selectAllTransactions}>
                    <Text style={dynamicStyles.selectionButtonText}>Select All</Text>
                  </Pressable>
                  <Pressable style={dynamicStyles.selectionButton} onPress={clearSelection}>
                    <Text style={dynamicStyles.selectionButtonText}>Clear</Text>
                  </Pressable>
                </View>
              </View>

              {transactions.length === 0 ? (
                <View style={dynamicStyles.emptyState}>
                  <Ionicons
                    name="document-outline"
                    size={48}
                    color={colors.textSecondary}
                    style={dynamicStyles.emptyIcon}
                  />
                  <Text style={dynamicStyles.emptyTitle}>No Transactions</Text>
                  <Text style={dynamicStyles.emptyDescription}>
                    Add some transactions to use bulk actions
                  </Text>
                </View>
              ) : (
                <>
                  {transactions.slice(0, 20).map((transaction) => (
                    <Pressable
                      key={transaction.id}
                      style={[
                        dynamicStyles.transactionItem,
                        selectedTransactions.has(transaction.id) && dynamicStyles.transactionSelected
                      ]}
                      onPress={() => toggleTransactionSelection(transaction.id)}
                    >
                      <View style={[
                        dynamicStyles.checkbox,
                        selectedTransactions.has(transaction.id) && dynamicStyles.checkboxSelected
                      ]}>
                        {selectedTransactions.has(transaction.id) && (
                          <Ionicons name="checkmark" size={12} color={colors.background} />
                        )}
                      </View>
                      <View style={dynamicStyles.transactionContent}>
                        <Text style={dynamicStyles.transactionDescription}>
                          {transaction.description}
                        </Text>
                        <Text style={dynamicStyles.transactionMeta}>
                          {transaction.date} • {transaction.merchant || 'No merchant'}
                        </Text>
                      </View>
                      <Text style={dynamicStyles.transactionAmount}>
                        {formatAmount(transaction.amount)}
                      </Text>
                    </Pressable>
                  ))}

                  {transactions.length > 20 && (
                    <Text style={dynamicStyles.selectionCount}>
                      Showing first 20 transactions. Use search to find specific transactions.
                    </Text>
                  )}

                  {/* Bulk Action Buttons */}
                  <View style={dynamicStyles.bulkActionButtons}>
                    <Button
                      title="Change Category"
                      onPress={handleBulkCategoryChange}
                      variant="outline"
                      style={dynamicStyles.bulkActionButton}
                      disabled={selectedTransactions.size === 0}
                    />
                    <Button
                      title="Delete Selected"
                      onPress={handleBulkDelete}
                      variant="outline"
                      style={dynamicStyles.bulkActionButton}
                      disabled={selectedTransactions.size === 0}
                    />
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Category Picker Modal */}
        {showCategoryPicker && (
          <View style={dynamicStyles.categoryPickerOverlay}>
            <View style={dynamicStyles.categoryPickerContainer}>
              <View style={dynamicStyles.categoryPickerHeader}>
                <Text style={dynamicStyles.categoryPickerTitle}>Select New Category</Text>
                <Pressable
                  style={dynamicStyles.closeButton}
                  onPress={() => setShowCategoryPicker(false)}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView style={dynamicStyles.categoryList} showsVerticalScrollIndicator={false}>
                {budgets.map(budget =>
                  budget.groups?.map(group => (
                    <View key={group.id} style={dynamicStyles.categoryGroup}>
                      <Text style={dynamicStyles.categoryGroupTitle}>{group.name}</Text>
                      {group.categories?.map(category => (
                        <Pressable
                          key={category.id}
                          style={dynamicStyles.categoryItem}
                          onPress={() => {
                            setSelectedCategoryId(category.id);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                        >
                          <Text style={dynamicStyles.categoryIcon}>{category.icon}</Text>
                          <Text style={dynamicStyles.categoryName}>{category.name}</Text>
                          {selectedCategoryId === category.id && (
                            <Ionicons name="checkmark" size={20} color={colors.primary} />
                          )}
                        </Pressable>
                      ))}
                    </View>
                  ))
                )}
              </ScrollView>

              <View style={dynamicStyles.categoryPickerButtons}>
                <Button
                  title="Cancel"
                  onPress={() => setShowCategoryPicker(false)}
                  variant="outline"
                  style={dynamicStyles.categoryPickerButton}
                />
                <Button
                  title="Apply Changes"
                  onPress={applyBulkCategoryChange}
                  variant="primary"
                  style={dynamicStyles.categoryPickerButton}
                  disabled={!selectedCategoryId}
                />
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
