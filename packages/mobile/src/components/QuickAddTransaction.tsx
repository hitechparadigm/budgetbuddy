/**
 * Quick Add Transaction Component
 * Optimized for rapid mobile transaction entry with minimal taps
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Button } from "./ui";
import { useTheme } from "../hooks/useTheme";
import { BudgetCategory, CreateTransactionRequest } from "../types";
import { BudgetWithSummary } from "../types/budget";
import {
  useFrequentMerchants,
  useRecentTransactions,
} from "../services/transaction";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface QuickAddTransactionProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTransactionRequest) => void;
  categories: BudgetWithSummary[];
  selectedCategoryId?: string;
  isLoading?: boolean;
}

interface QuickFormData {
  categoryId: string;
  amount: string;
  description: string;
}

const QUICK_AMOUNTS = [5, 10, 15, 20, 25, 50, 100];
const COMMON_DESCRIPTIONS = [
  "Coffee",
  "Lunch",
  "Gas",
  "Groceries",
  "Parking",
  "Uber",
  "Snack",
  "Dinner",
];

export default function QuickAddTransaction({
  visible,
  onClose,
  onSubmit,
  categories,
  selectedCategoryId,
  isLoading = false,
}: QuickAddTransactionProps) {
  const { colors } = useTheme();
  const [formData, setFormData] = useState<QuickFormData>({
    categoryId: selectedCategoryId || "",
    amount: "",
    description: "",
  });
  const [isRecording, setIsRecording] = useState(false);

  const { data: recentTransactions = [] } = useRecentTransactions(3);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setFormData({
        categoryId: selectedCategoryId || "",
        amount: "",
        description: "",
      });
    }
  }, [visible, selectedCategoryId]);

  const handleClose = () => {
    setFormData({ categoryId: "", amount: "", description: "" });
    onClose();
  };

  const handleSubmit = () => {
    if (!formData.categoryId || !formData.amount || !formData.description) {
      Alert.alert("Missing Information", "Please fill in all required fields");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const submitData: CreateTransactionRequest = {
      categoryId: formData.categoryId,
      amount,
      description: formData.description.trim(),
      date: new Date().toISOString().split("T")[0],
    };

    onSubmit(submitData);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const updateFormData = (field: keyof QuickFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const selectAmount = (amount: number) => {
    updateFormData("amount", amount.toString());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const selectDescription = (description: string) => {
    updateFormData("description", description);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const selectCategory = (categoryId: string) => {
    updateFormData("categoryId", categoryId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const startRecording = async () => {
    // Voice recording functionality will be implemented when expo-av is available
    Alert.alert(
      "Voice Input",
      "Voice recording feature coming soon! For now, please type your description."
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const stopRecording = async () => {
    setIsRecording(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : "Unknown";
  };

  const getCategoryIcon = (categoryId: string): string => {
    const category = categories.find((c) => c.id === categoryId);
    // BudgetWithSummary doesn't have icon, use category name to determine icon
    if (!category) return "📝";

    // Map category names to icons
    const iconMap: Record<string, string> = {
      "Food & Dining": "🍽️",
      Transportation: "🚗",
      Shopping: "🛍️",
      Entertainment: "🎬",
      Healthcare: "🏥",
      Utilities: "⚡",
      Housing: "🏠",
      "Personal Care": "💄",
      Education: "📚",
      Insurance: "🛡️",
      "Debt Payment": "💳",
      "Other Expenses": "📝",
      Salary: "💰",
      Freelance: "💼",
      Investment: "📈",
      Business: "🏢",
      "Other Income": "💵",
      "Emergency Fund": "🚨",
      Retirement: "🏖️",
      Vacation: "✈️",
      "Home Down Payment": "🏡",
      "Other Savings": "💾",
    };

    return iconMap[category.category] || iconMap[category.name] || "📝";
  };

  const expenseCategories = categories
    .filter(
      (c) =>
        c.type === "expense" ||
        c.category.toLowerCase().includes("expense") ||
        c.category.toLowerCase().includes("food") ||
        c.category.toLowerCase().includes("transport") ||
        c.category.toLowerCase().includes("shopping")
    )
    .slice(0, 6);

  const dynamicStyles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    container: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: screenHeight * 0.85,
      paddingBottom: Platform.OS === "ios" ? 34 : 20, // Account for home indicator
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
    },
    closeButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
    },
    content: {
      padding: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    amountGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    amountButton: {
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: 60,
      alignItems: "center",
    },
    amountButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    amountText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    amountTextSelected: {
      color: colors.background,
    },
    customAmountContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 12,
      gap: 8,
    },
    currencySymbol: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
    },
    customAmountInput: {
      flex: 1,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
    },
    descriptionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    descriptionButton: {
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    descriptionButtonSelected: {
      backgroundColor: colors.primary + "20",
      borderColor: colors.primary,
    },
    descriptionText: {
      fontSize: 14,
      color: colors.text,
    },
    descriptionTextSelected: {
      color: colors.primary,
      fontWeight: "600",
    },
    customDescriptionContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 12,
      gap: 8,
    },
    customDescriptionInput: {
      flex: 1,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
    },
    voiceButton: {
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    voiceButtonRecording: {
      backgroundColor: colors.error,
    },
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    categoryButton: {
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    categoryButtonSelected: {
      backgroundColor: colors.primary + "20",
      borderColor: colors.primary,
    },
    categoryIcon: {
      fontSize: 16,
    },
    categoryText: {
      fontSize: 14,
      color: colors.text,
    },
    categoryTextSelected: {
      color: colors.primary,
      fontWeight: "600",
    },
    recentSection: {
      marginBottom: 16,
    },
    recentItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 8,
      marginBottom: 8,
    },
    recentLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    recentIcon: {
      fontSize: 16,
    },
    recentDescription: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "500",
    },
    recentAmount: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    buttonContainer: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={dynamicStyles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={{ flex: 1 }} onPress={handleClose} />
        <View style={dynamicStyles.container}>
          {/* Header */}
          <View style={dynamicStyles.header}>
            <Text style={dynamicStyles.title}>Quick Add</Text>
            <Pressable style={dynamicStyles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Content */}
          <View style={dynamicStyles.content}>
            {/* Recent Transactions */}
            {recentTransactions.length > 0 && (
              <View style={dynamicStyles.recentSection}>
                <Text style={dynamicStyles.sectionTitle}>Recent</Text>
                {recentTransactions.slice(0, 2).map((transaction) => (
                  <Pressable
                    key={transaction.id}
                    style={dynamicStyles.recentItem}
                    onPress={() => {
                      updateFormData("categoryId", transaction.categoryId);
                      updateFormData("description", transaction.description);
                      updateFormData("amount", transaction.amount.toString());
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }}
                  >
                    <View style={dynamicStyles.recentLeft}>
                      <Text style={dynamicStyles.recentIcon}>
                        {getCategoryIcon(transaction.categoryId)}
                      </Text>
                      <Text style={dynamicStyles.recentDescription}>
                        {transaction.description}
                      </Text>
                    </View>
                    <Text style={dynamicStyles.recentAmount}>
                      ${transaction.amount.toFixed(2)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Quick Amount Selection */}
            <View style={dynamicStyles.section}>
              <Text style={dynamicStyles.sectionTitle}>Amount</Text>
              <View style={dynamicStyles.amountGrid}>
                {QUICK_AMOUNTS.map((amount) => (
                  <Pressable
                    key={amount}
                    style={[
                      dynamicStyles.amountButton,
                      formData.amount === amount.toString() &&
                        dynamicStyles.amountButtonSelected,
                    ]}
                    onPress={() => selectAmount(amount)}
                  >
                    <Text
                      style={[
                        dynamicStyles.amountText,
                        formData.amount === amount.toString() &&
                          dynamicStyles.amountTextSelected,
                      ]}
                    >
                      ${amount}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={dynamicStyles.customAmountContainer}>
                <Text style={dynamicStyles.currencySymbol}>$</Text>
                <TextInput
                  style={dynamicStyles.customAmountInput}
                  value={formData.amount}
                  onChangeText={(value) => updateFormData("amount", value)}
                  placeholder="Custom amount"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Quick Description Selection */}
            <View style={dynamicStyles.section}>
              <Text style={dynamicStyles.sectionTitle}>Description</Text>
              <View style={dynamicStyles.descriptionGrid}>
                {COMMON_DESCRIPTIONS.map((desc) => (
                  <Pressable
                    key={desc}
                    style={[
                      dynamicStyles.descriptionButton,
                      formData.description === desc &&
                        dynamicStyles.descriptionButtonSelected,
                    ]}
                    onPress={() => selectDescription(desc)}
                  >
                    <Text
                      style={[
                        dynamicStyles.descriptionText,
                        formData.description === desc &&
                          dynamicStyles.descriptionTextSelected,
                      ]}
                    >
                      {desc}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={dynamicStyles.customDescriptionContainer}>
                <TextInput
                  style={dynamicStyles.customDescriptionInput}
                  value={formData.description}
                  onChangeText={(value) => updateFormData("description", value)}
                  placeholder="Custom description"
                  placeholderTextColor={colors.textSecondary}
                />
                <Pressable
                  style={[
                    dynamicStyles.voiceButton,
                    isRecording && dynamicStyles.voiceButtonRecording,
                  ]}
                  onPress={isRecording ? stopRecording : startRecording}
                >
                  <Ionicons
                    name={isRecording ? "stop" : "mic"}
                    size={20}
                    color={colors.background}
                  />
                </Pressable>
              </View>
            </View>

            {/* Quick Category Selection */}
            <View style={dynamicStyles.section}>
              <Text style={dynamicStyles.sectionTitle}>Category</Text>
              <View style={dynamicStyles.categoryGrid}>
                {expenseCategories.map((category) => (
                  <Pressable
                    key={category.id}
                    style={[
                      dynamicStyles.categoryButton,
                      formData.categoryId === category.id &&
                        dynamicStyles.categoryButtonSelected,
                    ]}
                    onPress={() => selectCategory(category.id)}
                  >
                    <Text style={dynamicStyles.categoryIcon}>
                      {getCategoryIcon(category.id)}
                    </Text>
                    <Text
                      style={[
                        dynamicStyles.categoryText,
                        formData.categoryId === category.id &&
                          dynamicStyles.categoryTextSelected,
                      ]}
                    >
                      {category.category}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={dynamicStyles.buttonContainer}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={handleClose}
              style={{ flex: 1 }}
            />
            <Button
              title="Add Transaction"
              onPress={handleSubmit}
              loading={isLoading}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
