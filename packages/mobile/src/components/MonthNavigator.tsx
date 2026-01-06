/**
 * Month Navigator Component
 * Provides month navigation with swipe gestures and touch-optimized controls
 */

import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../hooks/useTheme";

interface MonthNavigatorProps {
  currentMonth: number; // 1-12
  currentYear: number;
  onMonthChange: (year: number, month: number) => void;
  showYear?: boolean;
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

export default function MonthNavigator({
  currentMonth,
  currentYear,
  onMonthChange,
  showYear = true,
}: MonthNavigatorProps) {
  const { colors } = useTheme();
  const swipeAnimation = useRef(new Animated.Value(0)).current;
  const isSwipingRef = useRef(false);

  const navigateMonth = (direction: "prev" | "next") => {
    let newMonth = currentMonth;
    let newYear = currentYear;

    if (direction === "next") {
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

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes
        return (
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 10
        );
      },
      onPanResponderGrant: () => {
        isSwipingRef.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (evt, gestureState) => {
        // Animate the swipe feedback
        const clampedDx = Math.max(-50, Math.min(50, gestureState.dx));
        swipeAnimation.setValue(clampedDx);
      },
      onPanResponderRelease: (evt, gestureState) => {
        isSwipingRef.current = false;

        // Reset animation
        Animated.spring(swipeAnimation, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();

        // Determine swipe direction and threshold
        const swipeThreshold = 30;
        if (Math.abs(gestureState.dx) > swipeThreshold) {
          if (gestureState.dx > 0) {
            // Swipe right - go to previous month
            navigateMonth("prev");
          } else {
            // Swipe left - go to next month
            navigateMonth("next");
          }
        }
      },
      onPanResponderTerminate: () => {
        isSwipingRef.current = false;
        Animated.spring(swipeAnimation, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const goToCurrentMonth = () => {
    const now = new Date();
    const currentRealMonth = now.getMonth() + 1;
    const currentRealYear = now.getFullYear();

    if (currentMonth !== currentRealMonth || currentYear !== currentRealYear) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onMonthChange(currentRealYear, currentRealMonth);
    }
  };

  // Check if we're viewing the current month
  const now = new Date();
  const isCurrentMonth =
    currentMonth === now.getMonth() + 1 && currentYear === now.getFullYear();

  const dynamicStyles = StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 16,
    },
    navigationContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 16,
      elevation: 3,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      minHeight: 70,
    },
    navButton: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.background,
      minWidth: 44,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    navButtonPressed: {
      backgroundColor: colors.border,
      transform: [{ scale: 0.95 }],
    },
    monthContainer: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 16,
    },
    swipeableArea: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
    },
    monthText: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
    yearText: {
      fontSize: 15,
      color: colors.textSecondary,
      marginTop: 2,
      fontWeight: "500",
    },
    todayButton: {
      backgroundColor: colors.primary + "20",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      marginTop: 8,
    },
    todayButtonText: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: "600",
    },
    swipeHint: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 8,
      opacity: 0.7,
      fontStyle: "italic",
    },
    monthIndicator: {
      position: "absolute",
      bottom: -2,
      left: "50%",
      transform: [{ translateX: -15 }],
      width: 30,
      height: 3,
      backgroundColor: colors.primary,
      borderRadius: 2,
      opacity: isCurrentMonth ? 1 : 0,
    },
    swipeIndicator: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 4,
      opacity: 0.5,
    },
    swipeIndicatorDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.textSecondary,
      marginHorizontal: 2,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.navigationContainer}>
        <Pressable
          style={({ pressed }) => [
            dynamicStyles.navButton,
            pressed && dynamicStyles.navButtonPressed,
          ]}
          onPress={() => navigateMonth("prev")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>

        <Animated.View
          style={[
            dynamicStyles.monthContainer,
            {
              transform: [{ translateX: swipeAnimation }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={dynamicStyles.swipeableArea}>
            <Text style={dynamicStyles.monthText}>
              {MONTH_NAMES[currentMonth - 1]}
            </Text>
            {showYear && (
              <Text style={dynamicStyles.yearText}>{currentYear}</Text>
            )}

            {!isCurrentMonth && (
              <Pressable
                style={dynamicStyles.todayButton}
                onPress={goToCurrentMonth}
              >
                <Text style={dynamicStyles.todayButtonText}>Today</Text>
              </Pressable>
            )}

            <View style={dynamicStyles.monthIndicator} />
          </View>
        </Animated.View>

        <Pressable
          style={({ pressed }) => [
            dynamicStyles.navButton,
            pressed && dynamicStyles.navButtonPressed,
          ]}
          onPress={() => navigateMonth("next")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={dynamicStyles.swipeIndicator}>
        <View style={dynamicStyles.swipeIndicatorDot} />
        <View style={dynamicStyles.swipeIndicatorDot} />
        <View style={dynamicStyles.swipeIndicatorDot} />
      </View>

      <Text style={dynamicStyles.swipeHint}>
        Swipe left/right, tap arrows, or long press to navigate months
      </Text>
    </View>
  );
}
