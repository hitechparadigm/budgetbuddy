/**
 * Transaction Template Modal Component
 * Allows users to create and edit transaction templates for recurring expenses
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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card, Button, Input } from './ui';
import { useTheme } from '../hooks/useTheme';
import { quickActionsService, TransactionTemplate } from '../services/quickActions';
import { Budget } from '../types';

interface TransactionTemplateModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (template: TransactionTemplate) => void;
  budgets: Budget[];
  editTemplate?: TransactionTemplate | null;
}

type RecurringFrequency = 'daily' | 'weekly' | 'monthly';

export default function TransactionTemplateModal({
  visible,
  onClose,
  onSave,
  budgets,
  editTemplate,
}: TransactionTemplateModalProps) {
  const { colors } = useTheme();
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>('monthly');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editTemplate) {
        // Populate form with existing template data
        setTemplateName(editTemplate.name);
        setDescription(editTemplate.description);
        setMerchant(editTemplate.merchant || '');
        setAmount(editTemplate.amount?.toString() || '');
        setSelectedCategoryId(editTemplate.categoryId);
        setIsRecurring(editTemplate.isRecurring);
        setRecurringFrequency(editTemplate.recurringFrequency || 'monthly');
        setTags(editTemplate.tags?.join(', ') || '');
      } else {
        // Reset form for new template
        resetForm();
      }
    }
  }, [visible, editTemplate]);

  const resetForm = () => {
    setTemplateName('');
    setDescription('');
    setMerchant('');
    setAmount('');
    setSelectedCategoryId('');
    setIsRecurring(false);
    setRecurringFrequency('monthly');
    setTags('');
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const selectedCategory = getAllCategories().find(c => c.id === selectedCategoryId);
      if (!selectedCategory) {
        Alert.alert('Error', 'Selected category not found');
        return;
      }

      const templateData = {
        name: templateName.trim(),
        description: description.trim(),
        merchant: merchant.trim() || undefined,
        amount: amount ? parseFloat(amount) : undefined,
        categoryId: selectedCategoryId,
        categoryName: selectedCategory.name,
        tags: tags.trim() ? tags.split(',').map(t => t.trim()).filter(t => t) : undefined,
        isRecurring,
        recurringFrequency: isRecurring ? recurringFrequency : undefined,
      };

      let savedTemplate: TransactionTemplate;

      if (editTemplate) {
        // Update existing template (we'll need to add this method to the service)
        savedTemplate = { ...editTemplate, ...templateData };
        // For now, we'll delete and recreate
        await quickActionsService.deleteTemplate(editTemplate.id);
        savedTemplate = await quickActionsService.createTemplate(templateData);
      } else {
        // Create new template
        savedTemplate = await quickActionsService.createTemplate(templateData);
      }

      onSave(savedTemplate);
      onClose();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to save template:', error);
      Alert.alert('Error', 'Failed to save template');
    } finally {
      setLoading(false);
    }
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

  const getSelectedCategoryName = () => {
    const category = getAllCategories().find(c => c.id === selectedCategoryId);
    return category ? `${category.icon} ${category.name}` : 'Select Category';
  };

  const dynamicStyles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    container: {
      backgroundColor: colors.background,
      borderRadius: 16,
      maxHeight: '90%',
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
      padding: 16,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 8,
    },
    categoryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryButtonText: {
      fontSize: 14,
      color: colors.text,
    },
    categoryPlaceholder: {
      color: colors.textSecondary,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    switchLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    frequencyContainer: {
      flexDirection: 'row',
      marginTop: 12,
    },
    frequencyButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      marginHorizontal: 4,
      borderRadius: 8,
    },
    frequencyButtonActive: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    frequencyButtonText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    frequencyButtonTextActive: {
      color: colors.primary,
      fontWeight: '500',
    },
    buttonContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    button: {
      flex: 1,
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
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={dynamicStyles.overlay}>
        <View style={dynamicStyles.container}>
          {/* Header */}
          <View style={dynamicStyles.header}>
            <Text style={dynamicStyles.headerTitle}>
              {editTemplate ? 'Edit Template' : 'Create Template'}
            </Text>
            <Pressable style={dynamicStyles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView style={dynamicStyles.content} showsVerticalScrollIndicator={false}>
            {/* Basic Information */}
            <View style={dynamicStyles.section}>
              <Text style={dynamicStyles.sectionTitle}>Basic Information</Text>

              <View style={dynamicStyles.inputGroup}>
                <Text style={dynamicStyles.label}>Template Name *</Text>
                <Input
                  value={templateName}
                  onChangeText={setTemplateName}
                  placeholder="e.g., Monthly Rent, Weekly Groceries"
                  maxLength={50}
                />
              </View>

              <View style={dynamicStyles.inputGroup}>
                <Text style={dynamicStyles.label}>Description *</Text>
                <Input
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Transaction description"
                  maxLength={100}
                />
              </View>

              <View style={dynamicStyles.inputGroup}>
                <Text style={dynamicStyles.label}>Merchant/Payee</Text>
                <Input
                  value={merchant}
                  onChangeText={setMerchant}
                  placeholder="Optional merchant name"
                  maxLength={50}
                />
              </View>

              <View style={dynamicStyles.inputGroup}>
                <Text style={dynamicStyles.label}>Default Amount</Text>
                <Input
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Category Selection */}
            <View style={dynamicStyles.section}>
              <Text style={dynamicStyles.sectionTitle}>Category</Text>

              <View style={dynamicStyles.inputGroup}>
                <Text style={dynamicStyles.label}>Category *</Text>
                <Pressable
                  style={dynamicStyles.categoryButton}
                  onPress={() => setShowCategoryPicker(true)}
                >
                  <Text style={[
                    dynamicStyles.categoryButtonText,
                    !selectedCategoryId && dynamicStyles.categoryPlaceholder
                  ]}>
                    {getSelectedCategoryName()}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            {/* Recurring Settings */}
            <View style={dynamicStyles.section}>
              <Text style={dynamicStyles.sectionTitle}>Recurring Settings</Text>

              <View style={dynamicStyles.switchRow}>
                <Text style={dynamicStyles.switchLabel}>Recurring Template</Text>
                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  trackColor={{ false: colors.border, true: colors.primary + '40' }}
                  thumbColor={isRecurring ? colors.primary : colors.textSecondary}
                />
              </View>

              {isRecurring && (
                <View style={dynamicStyles.frequencyContainer}>
                  {(['daily', 'weekly', 'monthly'] as RecurringFrequency[]).map((freq) => (
                    <Pressable
                      key={freq}
                      style={[
                        dynamicStyles.frequencyButton,
                        recurringFrequency === freq && dynamicStyles.frequencyButtonActive
                      ]}
                      onPress={() => setRecurringFrequency(freq)}
                    >
                      <Text style={[
                        dynamicStyles.frequencyButtonText,
                        recurringFrequency === freq && dynamicStyles.frequencyButtonTextActive
                      ]}>
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Tags */}
            <View style={dynamicStyles.section}>
              <Text style={dynamicStyles.sectionTitle}>Tags (Optional)</Text>

              <View style={dynamicStyles.inputGroup}>
                <Text style={dynamicStyles.label}>Tags</Text>
                <Input
                  value={tags}
                  onChangeText={setTags}
                  placeholder="e.g., essential, subscription, variable"
                  maxLength={100}
                />
              </View>
            </View>
          </ScrollView>

          {/* Buttons */}
          <View style={dynamicStyles.buttonContainer}>
            <Button
              title="Cancel"
              onPress={onClose}
              variant="outline"
              style={dynamicStyles.button}
            />
            <Button
              title={loading ? 'Saving...' : 'Save Template'}
              onPress={handleSave}
              variant="primary"
              style={dynamicStyles.button}
              disabled={loading}
            />
          </View>
        </View>

        {/* Category Picker Modal */}
        {showCategoryPicker && (
          <View style={dynamicStyles.categoryPickerOverlay}>
            <View style={dynamicStyles.categoryPickerContainer}>
              <View style={dynamicStyles.categoryPickerHeader}>
                <Text style={dynamicStyles.categoryPickerTitle}>Select Category</Text>
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
                            setShowCategoryPicker(false);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                        >
                          <Text style={dynamicStyles.categoryIcon}>{category.icon}</Text>
                          <Text style={dynamicStyles.categoryName}>{category.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
