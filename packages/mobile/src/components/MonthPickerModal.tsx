/**
 * Month Picker Modal Component
 * Provides a touch-optimized month and year picker for mobile
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../hooks/useTheme";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface MonthPickerModalProps {
  visible: boolean;
  onClose: () => void;
  currentMonth: number; // 1-12
  currentYear: number;
  onMonthYearSelect: (year: number, month: number) => void;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function MonthPickerModal({
  visible,
  onClose,
  currentMonth,
  currentYear,
  onMonthYearSelect,
}: MonthPickerModalProps) {
  const { colors } = useTheme();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Generate year range (current year ± 5 years)
  const currentRealYear = new Date().getFullYear();
  const yearRange = Array.from(
    { length: 11 },
    (_, i) => currentRealYear - 5 + i
  );

  const handleClose = () => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
    onClose();
  };

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMonthYearSelect(selectedYear, selectedMonth);
    onClose();
  };

  const selectMonth = (month: number) => {
    setSelectedMonth(month);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const selectYear = (year: number) => {
    setSelectedYear(year);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const isCurrentMonth = (month: number, year: number) => {
    const now = new Date();
    return month === now.getMonth() + 1 && year === now.getFullYear();
  };

  const dynamicStyles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    container: {
      backgroundColor: colors.background,
      borderRadius: 20,
      margin: 20,
      maxHeight: screenHeight * 0.8,
      width: screenWidth - 40,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
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
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    yearSection: {
      marginBottom: 24,
    },
    yearScrollContainer: {
      maxHeight: 120,
    },
    yearGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    yearButton: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: 70,
      alignItems: "center",
    },
    yearButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    yearText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    yearTextSelected: {
      color: colors.background,
    },
    monthSection: {
      marginBottom: 24,
    },
    monthGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    monthButton: {
      paddingHorizontal: 12,
      paddingVertical: 16,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      width: (screenWidth - 120) / 3, // 3 columns with gaps
      alignItems: "center",
      position: "relative",
    },
    monthButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    monthButtonCurrent: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    monthText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      textAlign: "center",
    },
    monthTextSelected: {
      color: colors.background,
    },
    currentIndicator: {
      position: "absolute",
      top: 4,
      right: 4,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    buttonContainer: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    confirmButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: "center",
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.background,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={dynamicStyles.overlay} onPress={handleClose}>
        <Pressable onPress={() => {}}>
          <View style={dynamicStyles.container}>
            {/* Header */}
            <View style={dynamicStyles.header}>
              <Text style={dynamicStyles.title}>Select Month & Year</Text>
              <Pressable
                style={dynamicStyles.closeButton}
                onPress={handleClose}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Content */}
            <ScrollView
              style={dynamicStyles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* Year Selection */}
              <View style={dynamicStyles.yearSection}>
                <Text style={dynamicStyles.sectionTitle}>Year</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 4 }}
                >
                  <View style={dynamicStyles.yearGrid}>
                    {yearRange.map((year) => (
                      <Pressable
                        key={year}
                        style={[
                          dynamicStyles.yearButton,
                          selectedYear === year &&
                            dynamicStyles.yearButtonSelected,
                        ]}
                        onPress={() => selectYear(year)}
                      >
                        <Text
                          style={[
                            dynamicStyles.yearText,
                            selectedYear === year &&
                              dynamicStyles.yearTextSelected,
                          ]}
                        >
                          {year}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Month Selection */}
              <View style={dynamicStyles.monthSection}>
                <Text style={dynamicStyles.sectionTitle}>Month</Text>
                <View style={dynamicStyles.monthGrid}>
                  {MONTH_NAMES_SHORT.map((monthName, index) => {
                    const monthNumber = index + 1;
                    const isCurrent = isCurrentMonth(monthNumber, selectedYear);
                    const isSelected = selectedMonth === monthNumber;

                    return (
                      <Pressable
                        key={monthNumber}
                        style={[
                          dynamicStyles.monthButton,
                          isSelected && dynamicStyles.monthButtonSelected,
                          isCurrent &&
                            !isSelected &&
                            dynamicStyles.monthButtonCurrent,
                        ]}
                        onPress={() => selectMonth(monthNumber)}
                      >
                        <Text
                          style={[
                            dynamicStyles.monthText,
                            isSelected && dynamicStyles.monthTextSelected,
                          ]}
                        >
                          {monthName}
                        </Text>
                        {isCurrent && !isSelected && (
                          <View style={dynamicStyles.currentIndicator} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={dynamicStyles.buttonContainer}>
              <Pressable
                style={dynamicStyles.cancelButton}
                onPress={handleClose}
              >
                <Text style={dynamicStyles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={dynamicStyles.confirmButton}
                onPress={handleConfirm}
              >
                <Text style={dynamicStyles.confirmButtonText}>Select</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
