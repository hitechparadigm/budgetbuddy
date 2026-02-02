/**
 * FilterSheet Component
 * Bottom sheet for transaction filtering options
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "../hooks/useTheme";
import { useHaptics } from "../hooks/useHaptics";
import { Button } from "./ui";

export interface TransactionFilters {
  search: string;
  categoryIds: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  amountRange: {
    min: number | null;
    max: number | null;
  };
  type: "all" | "income" | "expense";
}

export const DEFAULT_FILTERS: TransactionFilters = {
  search: "",
  categoryIds: [],
  dateRange: { start: null, end: null },
  amountRange: { min: null, max: null },
  type: "all",
};

interface Category {
  id: string;
  name: string;
  type: "income" | "expense" | "savings";
}

interface FilterSheetProps {
  /** Whether the sheet is visible */
  visible: boolean;
  /** Callback when sheet is closed */
  onClose: () => void;
  /** Current filter values */
  filters: TransactionFilters;
  /** Callback when filters are applied */
  onApply: (filters: TransactionFilters) => void;
  /** Available categories */
  categories: Category[];
}

export default function FilterSheet({
  visible,
  onClose,
  filters,
  onApply,
  categories,
}: FilterSheetProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();

  const [localFilters, setLocalFilters] = useState<TransactionFilters>(filters);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Reset local filters when modal opens
  React.useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
    }
  }, [visible, filters]);

  const handleApply = useCallback(() => {
    haptics.medium();
    onApply(localFilters);
    onClose();
  }, [haptics, localFilters, onApply, onClose]);

  const handleClearAll = useCallback(() => {
    haptics.light();
    setLocalFilters(DEFAULT_FILTERS);
  }, [haptics]);

  const toggleCategory = useCallback(
    (categoryId: string) => {
      haptics.light();
      setLocalFilters((prev) => ({
        ...prev,
        categoryIds: prev.categoryIds.includes(categoryId)
          ? prev.categoryIds.filter((id) => id !== categoryId)
          : [...prev.categoryIds, categoryId],
      }));
    },
    [haptics],
  );

  const setTransactionType = useCallback(
    (type: "all" | "income" | "expense") => {
      haptics.light();
      setLocalFilters((prev) => ({ ...prev, type }));
    },
    [haptics],
  );

  const handleStartDateChange = useCallback((event: any, date?: Date) => {
    setShowStartPicker(Platform.OS === "ios");
    if (date) {
      setLocalFilters((prev) => ({
        ...prev,
        dateRange: { ...prev.dateRange, start: date },
      }));
    }
  }, []);

  const handleEndDateChange = useCallback((event: any, date?: Date) => {
    setShowEndPicker(Platform.OS === "ios");
    if (date) {
      setLocalFilters((prev) => ({
        ...prev,
        dateRange: { ...prev.dateRange, end: date },
      }));
    }
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (localFilters.categoryIds.length > 0) count++;
    if (localFilters.dateRange.start || localFilters.dateRange.end) count++;
    if (
      localFilters.amountRange.min !== null ||
      localFilters.amountRange.max !== null
    )
      count++;
    if (localFilters.type !== "all") count++;
    return count;
  }, [localFilters]);

  const formatDate = (date: Date | null): string => {
    if (!date) return "Select";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Group categories by type
  const groupedCategories = useMemo(() => {
    const income = categories.filter((c) => c.type === "income");
    const expense = categories.filter((c) => c.type === "expense");
    const savings = categories.filter((c) => c.type === "savings");
    return { income, expense, savings };
  }, [categories]);

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
      maxHeight: "80%",
      paddingBottom: insets.bottom + 16,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    clearButton: {
      padding: 8,
    },
    clearText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "600",
    },
    content: {
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 12,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    typeToggle: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 4,
    },
    typeButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      borderRadius: 6,
    },
    typeButtonActive: {
      backgroundColor: colors.primary,
    },
    typeText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    typeTextActive: {
      color: colors.background,
    },
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    categoryChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryChipActive: {
      backgroundColor: colors.primary + "20",
      borderColor: colors.primary,
    },
    categoryText: {
      fontSize: 14,
      color: colors.text,
    },
    categoryTextActive: {
      color: colors.primary,
      fontWeight: "600",
    },
    categoryGroup: {
      marginBottom: 12,
    },
    categoryGroupTitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    dateRow: {
      flexDirection: "row",
      gap: 12,
    },
    dateButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
    },
    dateLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    dateValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "500",
    },
    footer: {
      flexDirection: "row",
      gap: 12,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    badge: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 8,
    },
    badgeText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: "600",
    },
  });

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
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={dynamicStyles.title}>Filters</Text>
              {activeFilterCount > 0 && (
                <View style={dynamicStyles.badge}>
                  <Text style={dynamicStyles.badgeText}>
                    {activeFilterCount}
                  </Text>
                </View>
              )}
            </View>
            <Pressable
              style={dynamicStyles.clearButton}
              onPress={handleClearAll}
              accessibilityLabel="Clear all filters"
              accessibilityRole="button"
            >
              <Text style={dynamicStyles.clearText}>Clear All</Text>
            </Pressable>
          </View>

          <ScrollView
            style={dynamicStyles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Transaction Type */}
            <View style={dynamicStyles.section}>
              <Text style={dynamicStyles.sectionTitle}>Transaction Type</Text>
              <View style={dynamicStyles.typeToggle}>
                {(["all", "income", "expense"] as const).map((type) => (
                  <Pressable
                    key={type}
                    style={[
                      dynamicStyles.typeButton,
                      localFilters.type === type &&
                        dynamicStyles.typeButtonActive,
                    ]}
                    onPress={() => setTransactionType(type)}
                    accessibilityLabel={`Filter by ${type}`}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: localFilters.type === type,
                    }}
                  >
                    <Text
                      style={[
                        dynamicStyles.typeText,
                        localFilters.type === type &&
                          dynamicStyles.typeTextActive,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Categories */}
            <View style={dynamicStyles.section}>
              <Text style={dynamicStyles.sectionTitle}>Categories</Text>

              {groupedCategories.expense.length > 0 && (
                <View style={dynamicStyles.categoryGroup}>
                  <Text style={dynamicStyles.categoryGroupTitle}>Expenses</Text>
                  <View style={dynamicStyles.categoryGrid}>
                    {groupedCategories.expense.map((category) => (
                      <Pressable
                        key={category.id}
                        style={[
                          dynamicStyles.categoryChip,
                          localFilters.categoryIds.includes(category.id) &&
                            dynamicStyles.categoryChipActive,
                        ]}
                        onPress={() => toggleCategory(category.id)}
                        accessibilityLabel={`Filter by ${category.name}`}
                        accessibilityRole="checkbox"
                        accessibilityState={{
                          checked: localFilters.categoryIds.includes(
                            category.id,
                          ),
                        }}
                      >
                        <Text
                          style={[
                            dynamicStyles.categoryText,
                            localFilters.categoryIds.includes(category.id) &&
                              dynamicStyles.categoryTextActive,
                          ]}
                        >
                          {category.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {groupedCategories.income.length > 0 && (
                <View style={dynamicStyles.categoryGroup}>
                  <Text style={dynamicStyles.categoryGroupTitle}>Income</Text>
                  <View style={dynamicStyles.categoryGrid}>
                    {groupedCategories.income.map((category) => (
                      <Pressable
                        key={category.id}
                        style={[
                          dynamicStyles.categoryChip,
                          localFilters.categoryIds.includes(category.id) &&
                            dynamicStyles.categoryChipActive,
                        ]}
                        onPress={() => toggleCategory(category.id)}
                        accessibilityLabel={`Filter by ${category.name}`}
                        accessibilityRole="checkbox"
                        accessibilityState={{
                          checked: localFilters.categoryIds.includes(
                            category.id,
                          ),
                        }}
                      >
                        <Text
                          style={[
                            dynamicStyles.categoryText,
                            localFilters.categoryIds.includes(category.id) &&
                              dynamicStyles.categoryTextActive,
                          ]}
                        >
                          {category.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Date Range */}
            <View style={dynamicStyles.section}>
              <Text style={dynamicStyles.sectionTitle}>Date Range</Text>
              <View style={dynamicStyles.dateRow}>
                <Pressable
                  style={dynamicStyles.dateButton}
                  onPress={() => setShowStartPicker(true)}
                  accessibilityLabel="Select start date"
                  accessibilityRole="button"
                >
                  <View>
                    <Text style={dynamicStyles.dateLabel}>From</Text>
                    <Text style={dynamicStyles.dateValue}>
                      {formatDate(localFilters.dateRange.start)}
                    </Text>
                  </View>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>

                <Pressable
                  style={dynamicStyles.dateButton}
                  onPress={() => setShowEndPicker(true)}
                  accessibilityLabel="Select end date"
                  accessibilityRole="button"
                >
                  <View>
                    <Text style={dynamicStyles.dateLabel}>To</Text>
                    <Text style={dynamicStyles.dateValue}>
                      {formatDate(localFilters.dateRange.end)}
                    </Text>
                  </View>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            {/* Spacer for scroll */}
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer */}
          <View style={dynamicStyles.footer}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <Button
              title="Apply Filters"
              onPress={handleApply}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>

      {/* Date Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={localFilters.dateRange.start || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleStartDateChange}
          maximumDate={localFilters.dateRange.end || new Date()}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={localFilters.dateRange.end || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleEndDateChange}
          minimumDate={localFilters.dateRange.start || undefined}
          maximumDate={new Date()}
        />
      )}
    </Modal>
  );
}
