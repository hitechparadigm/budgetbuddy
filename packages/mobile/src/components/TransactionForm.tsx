/**
 * Transaction Form Component
 * Form for creating and editing transactions with mobile-optimized UX
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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Button, Input, Card } from './ui';
import { useTheme } from '../hooks/useTheme';
import {
  Transaction,
  BudgetCategory,
  CreateTransactionRequest,
  UpdateTransactionRequest,
} from '../types';
import {
  useFrequentMerchants,
  useRecentTransactions,
} from '../services/transaction';

interface TransactionFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTransactionRequest | UpdateTransactionRequest) => void;
  transaction?: Transaction; // For editing
  categories: BudgetCategory[];
  selectedCategoryId?: string;
  isLoading?: boolean;
}

interface FormData {
  categoryId: string;
  amount: string;
  description: string;
  merchant: string;
  date: string;
  tags: string[];
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

const initialFormData: FormData = {
  categoryId: '',
  amount: '',
  description: '',
  merchant: '',
  date: new Date().toISOString().split('T')[0],
  tags: [],
};

export default function TransactionForm({
  visible,
  onClose,
  onSubmit,
  transaction,
  categories,
  selectedCategoryId,
  isLoading = false,
}: TransactionFormProps) {
  const { colors } = useTheme();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | null>(null);

  const isEditing = !!transaction;

  // Fetch suggestions
  const { data: frequentMerchants = [] } = useFrequentMerchants(5);
  const { data: recentTransactions = [] } = useRecentTransactions(5);

  // Initialize form data when transaction or selectedCategoryId changes
  useEffect(() => {
    if (transaction) {
      setFormData({
        categoryId: transaction.categoryId,
        amount: transaction.amount.toString(),
        description: transaction.description,
        merchant: transaction.merchant || '',
        date: transaction.date,
        tags: transaction.tags || [],
        location: transaction.location,
      });
    } else {
      setFormData({
        ...initialFormData,
        categoryId: selectedCategoryId || '',
      });
    }
    setErrors({});
  }, [transaction, selectedCategoryId, visible]);

  // Request location permission on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
    })();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Valid amount is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Get current location if permission granted
    let location = formData.location;
    if (locationPermission === Location.PermissionStatus.GRANTED && !location) {
      try {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        location = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        };
      } catch (error) {
        console.warn('Failed to get current location:', error);
      }
    }

    const submitData = {
      categoryId: formData.categoryId,
      amount: parseFloat(formData.amount),
      description: formData.description.trim(),
      merchant: formData.merchant.trim() || undefined,
      date: formData.date,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      location,
    };

    if (isEditing) {
      onSubmit({ ...submitData, id: transaction!.id } as UpdateTransactionRequest);
    } else {
      onSubmit(submitData as CreateTransactionRequest);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setErrors({});
    setTagInput('');
    onClose();
  };

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      updateFormData('tags', [...formData.tags, tag]);
      setTagInput('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const removeTag = (tagToRemove: string) => {
    updateFormData('tags', formData.tags.filter(tag => tag !== tagToRemove));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleQuickAdd = (recentTransaction: Transaction) => {
    setFormData(prev => ({
      ...prev,
      categoryId: recentTransaction.categoryId,
      description: recentTransaction.description,
      merchant: recentTransaction.merchant || '',
      tags: recentTransaction.tags || [],
    }));
    setShowQuickAdd(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  const getCategoryIcon = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.icon : '📝';
  };

  const renderCategoryPicker = () => (
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
                key={category.id}
                style={[
                  dynamicStyles.categoryOption,
                  formData.categoryId === category.id && dynamicStyles.categoryOptionSelected,
                ]}
                onPress={() => {
                  updateFormData('categoryId', category.id);
                  setShowCategoryPicker(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View style={dynamicStyles.categoryInfo}>
                  <Text style={dynamicStyles.categoryIcon}>{category.icon}</Text>
                  <Text style={[
                    dynamicStyles.categoryText,
                    formData.categoryId === category.id && dynamicStyles.categoryTextSelected,
                  ]}>
                    {category.name}
                  </Text>
                </View>
                {formData.categoryId === category.id && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderQuickAddModal = () => (
    <Modal
      visible={showQuickAdd}
      transparent
      animationType="slide"
      onRequestClose={() => setShowQuickAdd(false)}
    >
      <View style={dynamicStyles.modalOverlay}>
        <View style={dynamicStyles.modalContent}>
          <View style={dynamicStyles.modalHeader}>
            <Text style={dynamicStyles.modalTitle}>Quick Add</Text>
            <Pressable onPress={() => setShowQuickAdd(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={dynamicStyles.quickAddList}>
            <Text style={dynamicStyles.sectionTitle}>Recent Transactions</Text>
            {recentTransactions.map((transaction) => (
              <Pressable
                key={transaction.id}
                style={dynamicStyles.quickAddOption}
                onPress={() => handleQuickAdd(transaction)}
              >
                <View style={dynamicStyles.quickAddInfo}>
                  <Text style={dynamicStyles.quickAddIcon}>
                    {getCategoryIcon(transaction.categoryId)}
                  </Text>
                  <View style={dynamicStyles.quickAddDetails}>
                    <Text style={dynamicStyles.quickAddDescription}>
                      {transaction.description}
                    </Text>
                    <Text style={dynamicStyles.quickAddCategory}>
                      {getCategoryName(transaction.categoryId)}
                    </Text>
                    {transaction.merchant && (
                      <Text style={dynamicStyles.quickAddMerchant}>
                        {transaction.merchant}
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={dynamicStyles.quickAddAmount}>
                  ${transaction.amount.toFixed(2)}
                </Text>
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
    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    headerButton: {
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
    pickerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    pickerIcon: {
      fontSize: 20,
    },
    pickerText: {
      fontSize: 16,
      color: colors.text,
    },
    pickerPlaceholder: {
      color: colors.textSecondary,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    currencySymbol: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      paddingTop: 8,
    },
    merchantSuggestions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    suggestionChip: {
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    suggestionText: {
      fontSize: 14,
      color: colors.text,
    },
    tagContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    tag: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    tagText: {
      fontSize: 14,
      color: colors.primary,
    },
    tagRemove: {
      padding: 2,
    },
    tagInputRow: {
      flexDirection: 'row',
      gap: 8,
    },
    tagInput: {
      flex: 1,
    },
    addTagButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      justifyContent: 'center',
    },
    addTagText: {
      color: colors.background,
      fontSize: 14,
      fontWeight: '600',
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
    categoryInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    categoryIcon: {
      fontSize: 20,
    },
    categoryText: {
      fontSize: 16,
      color: colors.text,
    },
    categoryTextSelected: {
      color: colors.primary,
      fontWeight: '600',
    },
    quickAddList: {
      maxHeight: 400,
    },
    quickAddOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    quickAddInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    quickAddIcon: {
      fontSize: 20,
    },
    quickAddDetails: {
      flex: 1,
    },
    quickAddDescription: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
    },
    quickAddCategory: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    quickAddMerchant: {
      fontSize: 12,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    quickAddAmount: {
      fontSize: 16,
      color: colors.text,
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
            {isEditing ? 'Edit Transaction' : 'Add Transaction'}
          </Text>
          <View style={dynamicStyles.headerActions}>
            <Pressable
              style={dynamicStyles.headerButton}
              onPress={() => setShowQuickAdd(true)}
            >
              <Ionicons name="flash" size={24} color={colors.primary} />
            </Pressable>
            <Pressable style={dynamicStyles.headerButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <ScrollView style={dynamicStyles.content}>
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>Category</Text>
            <Pressable
              style={[
                dynamicStyles.pickerButton,
                ...(errors.categoryId ? [dynamicStyles.pickerButtonError] : []),
              ]}
              onPress={() => setShowCategoryPicker(true)}
            >
              <View style={dynamicStyles.pickerContent}>
                {formData.categoryId ? (
                  <>
                    <Text style={dynamicStyles.pickerIcon}>
                      {getCategoryIcon(formData.categoryId)}
                    </Text>
                    <Text style={dynamicStyles.pickerText}>
                      {getCategoryName(formData.categoryId)}
                    </Text>
                  </>
                ) : (
                  <Text style={[dynamicStyles.pickerText, dynamicStyles.pickerPlaceholder]}>
                    Select category
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </Pressable>
            {errors.categoryId && (
              <Text style={{ color: colors.error, fontSize: 12, marginTop: 4 }}>
                {errors.categoryId}
              </Text>
            )}
          </View>

          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>Amount</Text>
            <View style={dynamicStyles.amountRow}>
              <Text style={dynamicStyles.currencySymbol}>$</Text>
              <Input
                value={formData.amount}
                onChangeText={(value) => updateFormData('amount', value)}
                placeholder="0.00"
                keyboardType="numeric"
                error={errors.amount}
                style={{ flex: 1 }}
              />
            </View>
          </View>

          <View style={dynamicStyles.section}>
            <Input
              label="Description"
              value={formData.description}
              onChangeText={(value) => updateFormData('description', value)}
              placeholder="What did you spend on?"
              error={errors.description}
            />
          </View>

          <View style={dynamicStyles.section}>
            <Input
              label="Merchant (Optional)"
              value={formData.merchant}
              onChangeText={(value) => updateFormData('merchant', value)}
              placeholder="Where did you spend?"
            />
            {frequentMerchants.length > 0 && (
              <View style={dynamicStyles.merchantSuggestions}>
                {frequentMerchants.map((merchant) => (
                  <Pressable
                    key={merchant}
                    style={dynamicStyles.suggestionChip}
                    onPress={() => {
                      updateFormData('merchant', merchant);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text style={dynamicStyles.suggestionText}>{merchant}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={dynamicStyles.section}>
            <Input
              label="Date"
              value={formData.date}
              onChangeText={(value) => updateFormData('date', value)}
              placeholder="YYYY-MM-DD"
              error={errors.date}
            />
          </View>

          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>Tags (Optional)</Text>
            {formData.tags.length > 0 && (
              <View style={dynamicStyles.tagContainer}>
                {formData.tags.map((tag) => (
                  <View key={tag} style={dynamicStyles.tag}>
                    <Text style={dynamicStyles.tagText}>{tag}</Text>
                    <Pressable
                      style={dynamicStyles.tagRemove}
                      onPress={() => removeTag(tag)}
                    >
                      <Ionicons name="close" size={16} color={colors.primary} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <View style={dynamicStyles.tagInputRow}>
              <TextInput
                style={[
                  dynamicStyles.tagInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 12,
                    color: colors.text,
                  },
                ]}
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="Add tag"
                placeholderTextColor={colors.textSecondary}
                onSubmitEditing={addTag}
                returnKeyType="done"
              />
              <Pressable style={dynamicStyles.addTagButton} onPress={addTag}>
                <Text style={dynamicStyles.addTagText}>Add</Text>
              </Pressable>
            </View>
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
            title={isEditing ? 'Update Transaction' : 'Add Transaction'}
            onPress={handleSubmit}
            loading={isLoading}
            style={{ flex: 1 }}
          />
        </View>

        {renderCategoryPicker()}
        {renderQuickAddModal()}
      </SafeAreaView>
    </Modal>
  );
}
