/**
 * Month Navigator Component
 * Provides month navigation with simple button controls
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';

interface MonthNavigatorProps {
  currentMonth: number; // 1-12
  currentYear: number;
  onMonthChange: (year: number, month: number) => void;
  showYear?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MonthNavigator({
  currentMonth,
  currentYear,
  onMonthChange,
  showYear = true,
}: MonthNavigatorProps) {
  const { colors } = useTheme();

  const navigateMonth = (direction: 'prev' | 'next') => {
    let newMonth = currentMonth;
    let newYear = currentYear;

    if (direction === 'next') {
      newMonth += 1;
      if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
      }
    } else {
      newMonth -= 1;
      if (newMonth < 1) {
        newMonth = 12;
        newYear -= 1;
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMonthChange(newYear, newMonth);
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginHorizontal: 16,
      marginBottom: 16,
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    navButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    navButtonPressed: {
      backgroundColor: colors.border,
    },
    monthContainer: {
      flex: 1,
      alignItems: 'center',
    },
    monthText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    yearText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    swipeHint: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
      opacity: 0.7,
    },
  });

  return (
    <View>
      <View style={dynamicStyles.container}>
        <Pressable
          style={({ pressed }) => [
            dynamicStyles.navButton,
            pressed && dynamicStyles.navButtonPressed,
          ]}
          onPress={() => navigateMonth('prev')}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>

        <View style={dynamicStyles.monthContainer}>
          <Text style={dynamicStyles.monthText}>
            {MONTH_NAMES[currentMonth - 1]}
          </Text>
          {showYear && (
            <Text style={dynamicStyles.yearText}>
              {currentYear}
            </Text>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            dynamicStyles.navButton,
            pressed && dynamicStyles.navButtonPressed,
          ]}
          onPress={() => navigateMonth('next')}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      <Text style={dynamicStyles.swipeHint}>
        Tap arrows to navigate months
      </Text>
    </View>
  );
}
