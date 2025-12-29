/**
 * Quick Actions Modal Component
 * Provides quick access to recent transactions, templates, and favorite categories
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
import {
  quickActionsService,
  QuickTransaction,
  TransactionTemplate,
  FavoriteCategory
} from '../services/quickActions';
import { Transaction } from '../types';

interface QuickActionsModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateTransaction: (transaction: Partial<Transaction>) => void;
  onCreateTemplate: () => void;
}

type TabType = 'recent' | 'templates' | 'favorites';

export default function QuickActionsModal({
  visible,
  onClose,
  onCreateTransaction,
  onCreateTemplate,
}: QuickActionsModalProps) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('recent');
  const [recentTransactions, setRecentTransactions] = useState<QuickTransaction[]>([]);
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [favoriteCategories, setFavoriteCategories] = useState<FavoriteCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadQuickActions();
    }
  }, [visible]);

  const loadQuickActions = async () => {
    try {
      setLoading(true);
      await quickActionsService.initialize();

      setRecentTransactions(quickActionsService.getRecentTransactions());
      setTemplates(quickActionsService.getTransactionTemplates());
      setFavoriteCategories(quickActionsService.getFavoriteCategories());
    } catch (error) {
      console.error('Failed to load quick actions:', error);
      Alert.alert('Error', 'Failed to load quick actions');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTransactionPress = (quickTransaction: QuickTransaction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const transaction = quickActionsService.createTransactionFromQuick(quickTransaction);
    onCreateTransaction(transaction);
    onClose();
  };

  const handleTemplatePress = async (template: TransactionTemplate) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await quickActionsService.useTemplate(template.id);
      const transaction = quickActionsService.createTransactionFromTemplate(template);
      onCreateTransaction(transaction);
      onClose();
    } catch (error) {
      console.error('Failed to use template:', error);
      Alert.alert('Error', 'Failed to use template');
    }
  };

  const handleFavoriteCategoryPress = (category: FavoriteCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const transaction: Partial<Transaction> = {
      categoryId: category.categoryId,
      amount: category.averageAmount,
      date: new Date().toISOString().split('T')[0],
      description: '',
    };
    onCreateTransaction(transaction);
    onClose();
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await quickActionsService.deleteTemplate(templateId);
      setTemplates(quickActionsService.getTransactionTemplates());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to delete template:', error);
      Alert.alert('Error', 'Failed to delete template');
    }
  };

  const confirmDeleteTemplate = (template: TransactionTemplate) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteTemplate(template.id)
        },
      ]
    );
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
      maxHeight: '80%',
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
    tabContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 8,
      marginHorizontal: 4,
    },
    activeTab: {
      backgroundColor: colors.primary + '20',
    },
    tabText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    activeTabText: {
      color: colors.primary,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
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
      marginBottom: 16,
    },
    quickItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 8,
    },
    quickItemIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    quickItemContent: {
      flex: 1,
    },
    quickItemTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 2,
    },
    quickItemSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    quickItemAmount: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    templateItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 8,
    },
    templateContent: {
      flex: 1,
    },
    templateTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 2,
    },
    templateDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    templateMeta: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    templateActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      padding: 8,
      marginLeft: 8,
    },
    favoriteItem: {
      width: '48%',
      aspectRatio: 1,
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    favoriteIcon: {
      fontSize: 24,
      marginBottom: 8,
    },
    favoriteName: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 4,
    },
    favoriteAmount: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    favoriteGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    createButton: {
      marginTop: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 16,
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
            <Text style={dynamicStyles.headerTitle}>Quick Actions</Text>
            <Pressable style={dynamicStyles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={dynamicStyles.tabContainer}>
            <Pressable
              style={[dynamicStyles.tab, activeTab === 'recent' && dynamicStyles.activeTab]}
              onPress={() => setActiveTab('recent')}
            >
              <Text style={[
                dynamicStyles.tabText,
                activeTab === 'recent' && dynamicStyles.activeTabText
              ]}>
                Recent
              </Text>
            </Pressable>
            <Pressable
              style={[dynamicStyles.tab, activeTab === 'templates' && dynamicStyles.activeTab]}
              onPress={() => setActiveTab('templates')}
            >
              <Text style={[
                dynamicStyles.tabText,
                activeTab === 'templates' && dynamicStyles.activeTabText
              ]}>
                Templates
              </Text>
            </Pressable>
            <Pressable
              style={[dynamicStyles.tab, activeTab === 'favorites' && dynamicStyles.activeTab]}
              onPress={() => setActiveTab('favorites')}
            >
              <Text style={[
                dynamicStyles.tabText,
                activeTab === 'favorites' && dynamicStyles.activeTabText
              ]}>
                Favorites
              </Text>
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView style={dynamicStyles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={dynamicStyles.loadingContainer}>
                <Text style={dynamicStyles.loadingText}>Loading...</Text>
              </View>
            ) : (
              <>
                {/* Recent Transactions Tab */}
                {activeTab === 'recent' && (
                  <>
                    {recentTransactions.length === 0 ? (
                      <View style={dynamicStyles.emptyState}>
                        <Ionicons
                          name="time-outline"
                          size={48}
                          color={colors.textSecondary}
                          style={dynamicStyles.emptyIcon}
                        />
                        <Text style={dynamicStyles.emptyTitle}>No Recent Transactions</Text>
                        <Text style={dynamicStyles.emptyDescription}>
                          Your recent transactions will appear here for quick access
                        </Text>
                      </View>
                    ) : (
                      recentTransactions.map((transaction) => (
                        <Pressable
                          key={transaction.id}
                          style={dynamicStyles.quickItem}
                          onPress={() => handleQuickTransactionPress(transaction)}
                        >
                          <View style={dynamicStyles.quickItemIcon}>
                            <Ionicons name="repeat" size={20} color={colors.primary} />
                          </View>
                          <View style={dynamicStyles.quickItemContent}>
                            <Text style={dynamicStyles.quickItemTitle}>
                              {transaction.description}
                            </Text>
                            <Text style={dynamicStyles.quickItemSubtitle}>
                              {transaction.categoryName} • Used {transaction.frequency} times
                            </Text>
                          </View>
                          <Text style={dynamicStyles.quickItemAmount}>
                            {formatAmount(transaction.amount)}
                          </Text>
                        </Pressable>
                      ))
                    )}
                  </>
                )}

                {/* Templates Tab */}
                {activeTab === 'templates' && (
                  <>
                    {templates.length === 0 ? (
                      <View style={dynamicStyles.emptyState}>
                        <Ionicons
                          name="document-outline"
                          size={48}
                          color={colors.textSecondary}
                          style={dynamicStyles.emptyIcon}
                        />
                        <Text style={dynamicStyles.emptyTitle}>No Templates</Text>
                        <Text style={dynamicStyles.emptyDescription}>
                          Create templates for recurring transactions to save time
                        </Text>
                        <Button
                          title="Create Template"
                          onPress={() => {
                            onCreateTemplate();
                            onClose();
                          }}
                          variant="primary"
                          style={dynamicStyles.createButton}
                        />
                      </View>
                    ) : (
                      <>
                        {templates.map((template) => (
                          <View key={template.id} style={dynamicStyles.templateItem}>
                            <View style={dynamicStyles.templateContent}>
                              <Text style={dynamicStyles.templateTitle}>
                                {template.name}
                              </Text>
                              <Text style={dynamicStyles.templateDescription}>
                                {template.description}
                              </Text>
                              <Text style={dynamicStyles.templateMeta}>
                                {template.categoryName} • Used {template.usageCount} times
                                {template.isRecurring && ` • ${template.recurringFrequency}`}
                              </Text>
                            </View>
                            <View style={dynamicStyles.templateActions}>
                              <Pressable
                                style={dynamicStyles.actionButton}
                                onPress={() => handleTemplatePress(template)}
                              >
                                <Ionicons name="add-circle" size={24} color={colors.primary} />
                              </Pressable>
                              <Pressable
                                style={dynamicStyles.actionButton}
                                onPress={() => confirmDeleteTemplate(template)}
                              >
                                <Ionicons name="trash-outline" size={20} color={colors.error} />
                              </Pressable>
                            </View>
                          </View>
                        ))}
                        <Button
                          title="Create New Template"
                          onPress={() => {
                            onCreateTemplate();
                            onClose();
                          }}
                          variant="outline"
                          style={dynamicStyles.createButton}
                        />
                      </>
                    )}
                  </>
                )}

                {/* Favorites Tab */}
                {activeTab === 'favorites' && (
                  <>
                    {favoriteCategories.length === 0 ? (
                      <View style={dynamicStyles.emptyState}>
                        <Ionicons
                          name="heart-outline"
                          size={48}
                          color={colors.textSecondary}
                          style={dynamicStyles.emptyIcon}
                        />
                        <Text style={dynamicStyles.emptyTitle}>No Favorite Categories</Text>
                        <Text style={dynamicStyles.emptyDescription}>
                          Your most used categories will appear here for quick access
                        </Text>
                      </View>
                    ) : (
                      <View style={dynamicStyles.favoriteGrid}>
                        {favoriteCategories.map((category) => (
                          <Pressable
                            key={category.categoryId}
                            style={dynamicStyles.favoriteItem}
                            onPress={() => handleFavoriteCategoryPress(category)}
                          >
                            <Text style={dynamicStyles.favoriteIcon}>
                              {category.icon}
                            </Text>
                            <Text style={dynamicStyles.favoriteName}>
                              {category.categoryName}
                            </Text>
                            <Text style={dynamicStyles.favoriteAmount}>
                              Avg: {formatAmount(category.averageAmount)}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
