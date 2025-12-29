/**
 * Budget Form Component
 * Form for creating and editing budgets
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button, Input, Card } from './ui';
import { useTheme } from '../hooks/useTheme';
import {
  Budget,
  CreateBudgetRequest,
  UpdateBudgetRequest,
  BudgetType,
  BudgetFrequency,
  RecurringBudgetConfig,
  BUDGET_CATEGORIES,
  FREQUENCY_LABELS,
  BUDGET_TYPE_CONFIG,
} from '../types/budget';
import RecurringBudgetConfigComponent from './RecurringBudgetConfig';

interface BudgetFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBudgetRequest | UpdateBudgetRequest) => void;
  budget?: Budget; // For editing
  isLoading?: boolean;
}

interface FormData {
  name: string;
  amount: string;
  category: string;
  frequency: BudgetFrequency;
  startDate: string;
  endDate: string;
  type: BudgetType;
  description: string;
  recurringConfig: RecurringBudgetConfig;
}

const initialFormData: FormData = {
  name: '',
  amount: '',
  category: '',
  frequency: 'monthly',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  type: 'expense',
  description: '',
  recurringConfig: {},
};

export default function BudgetForm({
  visible,
  onClose,
  onSubmit,
  budget,
  isLoading = false,
}: BudgetFormProps) {
  const { colors } = useTheme();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);

  const isEditing = !!budget;

  // Initialize form data when budget changes
  useEffect(() => {
    if (budget) {
      setFormData({
        name: budget.name,
        amount: budget.amount.toString(),
        category: budget.category,
        frequency: budget.frequency,
        startDate: budget.startDate.split('T')[0],
        endDate: budget.endDate?.split('T')[0] || '',
        type: budget.type,
        description: budget.description || '',
        recurringConfig: budget.recurringConfig || {},
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
  }, [budget, visible]);

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Budget name is required';
    }

    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Valid amount is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const submitData = {
      name: formData.name.trim(),
      amount: parseFloat(formData.amount),
      category: formData.category,
      frequency: formData.frequency,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      type: formData.type,
      description: formData.description.trim() || undefined,
      recurringConfig: formData.frequency !== 'one-time' ? formData.recurringConfig : undefined,
    };

    if (isEditing) {
      onSubmit({ ...submitData, id: budget!.id } as UpdateBudgetRequest);
    } else {
      onSubmit(submitData as CreateBudgetRequest);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setErrors({});
    onClose();
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const renderTypeSelector = () => (
    <View style={dynamicStyles.typeSelector}>
      {Object.entries(BUDGET_TYPE_CONFIG).map(([type, config]) => (
        <Pressable
          key={type}
          style={[
            dynamicStyles.typeOption,
            formData.type === type && dynamicStyles.typeOptionSelected,
          ]}
          onPress={() => {
            updateFormData('type', type as BudgetType);
            // Reset category when type changes
            updateFormData('category', '');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Text style={dynamicStyles.typeIcon}>{config.icon}</Text>
          <Text style={[
            dynamicStyles.typeLabel,
            formData.type === type && dynamicStyles.typeLabelSelected,
          ]}>
            {config.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const renderCategoryPicker = () => {
    const categories = BUDGET_CATEGORIES[formData.type];

    return (
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContent}>
            <View style={dynamicStyles.modalHeader}>
              <Text style={dynamicStyles.modalTitle}>Select Category</Text>
              <Pressable onPress={() => setShowCategoryPicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={dynamicStyles.categoryList}>
              {categories.map((category) => (
                <Pressable
                  key={category}
                  style={[
                    dynamicStyles.categoryOption,
                    formData.category === category && dynamicStyles.categoryOptionSelected,
                  ]}
                  onPress={() => {
                    updateFormData('category', category);
                    setShowCategoryPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[
                    dynamicStyles.categoryText,
                    formData.category === category && dynamicStyles.categoryTextSelected,
                  ]}>
                    {category}
                  </Text>
                  {formData.category === category && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderFrequencyPicker = () => (
    <Modal
      visible={showFrequencyPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFrequencyPicker(false)}
    >
      <View style={dynamicStyles.modalOverlay}>
        <View style={dynamicStyles.modalContent}>
          <View style={dynamicStyles.modalHeader}>
            <Text style={dynamicStyles.modalTitle}>Select Frequency</Text>
            <Pressable onPress={() => setShowFrequencyPicker(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={dynamicStyles.categoryList}>
            {Object.entries(FREQUENCY_LABELS).map(([frequency, label]) => (
              <Pressable
                key={frequency}
                style={[
                  dynamicStyles.categoryOption,
                  formData.frequency === frequency && dynamicStyles.categoryOptionSelected,
                ]}
                onPress={() => {
                  updateFormData('frequency', frequency as BudgetFrequency);
                  setShowFrequencyPicker(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[
                  dynamicStyles.categoryText,
                  formData.frequency === frequency && dynamicStyles.categoryTextSelected,
                ]}>
                  {label}
                </Text>
                {formData.frequency === frequency && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
    typeSelector: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 16,
    },
    typeOption: {
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      backgroundColor: colors.surface,
      minWidth: 80,
    },
    typeOptionSelected: {
      backgroundColor: colors.primary + '20',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    typeIcon: {
      fontSize: 24,
      marginBottom: 8,
    },
    typeLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    typeLabelSelected: {
      color: colors.primary,
      fontWeight: '600',
    },
    pickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pickerButtonError: {
      borderColor: colors.error,
    },
    pickerText: {
      fontSize: 16,
      color: colors.text,
    },
    pickerPlaceholder: {
      color: colors.textSecondary,
    },
    dateRow: {
      flexDirection: 'row',
      gap: 12,
    },
    dateInput: {
      flex: 1,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '70%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    categoryList: {
      maxHeight: 400,
    },
    categoryOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    categoryOptionSelected: {
      backgroundColor: colors.primary + '10',
    },
    categoryText: {
      fontSize: 16,
      color: colors.text,
    },
    categoryTextSelected: {
      color: colors.primary,
      fontWeight: '600',
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={dynamicStyles.container}>
        <View style={dynamicStyles.header}>
          <Text style={dynamicStyles.headerTitle}>
            {isEditing ? 'Edit Budget' : 'Create Budget'}
          </Text>
          <Pressable style={dynamicStyles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView style={dynamicStyles.content}>
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>Budget Type</Text>
            {renderTypeSelector()}
          </View>

          <View style={dynamicStyles.section}>
            <Input
              label="Budget Name"
              value={formData.name}
              onChangeText={(value) => updateFormData('name', value)}
              placeholder="e.g., Monthly Groceries"
              error={errors.name}
            />
          </View>

          <View style={dynamicStyles.section}>
            <Input
              label="Amount"
              value={formData.amount}
              onChangeText={(value) => updateFormData('amount', value)}
              placeholder="0.00"
              keyboardType="numeric"
              error={errors.amount}
            />
          </View>

          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>Category</Text>
            <Pressable
              style={[
                dynamicStyles.pickerButton,
                ...(errors.category ? [dynamicStyles.pickerButtonError] : []),
              ]}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Text style={[
                dynamicStyles.pickerText,
                !formData.category && dynamicStyles.pickerPlaceholder,
              ]}>
                {formData.category || 'Select category'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </Pressable>
            {errors.category && (
              <Text style={{ color: colors.error, fontSize: 12, marginTop: 4 }}>
                {errors.category}
              </Text>
            )}
          </View>

          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>Frequency</Text>
            <Pressable
              style={dynamicStyles.pickerButton}
              onPress={() => setShowFrequencyPicker(true)}
            >
              <Text style={dynamicStyles.pickerText}>
                {FREQUENCY_LABELS[formData.frequency]}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Recurring Budget Configuration */}
          {formData.frequency !== 'one-time' && (
            <RecurringBudgetConfigComponent
              frequency={formData.frequency}
              config={formData.recurringConfig}
              onConfigChange={(config) => updateFormData('recurringConfig', config)}
            />
          )}

          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>Dates</Text>
            <View style={dynamicStyles.dateRow}>
              <Input
                label="Start Date"
                value={formData.startDate}
                onChangeText={(value) => updateFormData('startDate', value)}
                placeholder="YYYY-MM-DD"
                error={errors.startDate}
              />
              <Input
                label="End Date (Optional)"
                value={formData.endDate}
                onChangeText={(value) => updateFormData('endDate', value)}
                placeholder="YYYY-MM-DD"
                error={errors.endDate}
              />
            </View>
          </View>

          <View style={dynamicStyles.section}>
            <Input
              label="Description (Optional)"
              value={formData.description}
              onChangeText={(value) => updateFormData('description', value)}
              placeholder="Additional notes about this budget"
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>

        <View style={dynamicStyles.buttonContainer}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={handleClose}
            style={{ flex: 1 }}
          />
          <Button
            title={isEditing ? 'Update Budget' : 'Create Budget'}
            onPress={handleSubmit}
            loading={isLoading}
            style={{ flex: 1 }}
          />
        </View>

        {renderCategoryPicker()}
        {renderFrequencyPicker()}
      </SafeAreaView>
    </Modal>
  );
}
