/**
 * QuickActionsFAB Component
 * Floating action button with expandable quick actions menu
 * Provides rapid access to common actions: Add Transaction, Scan Receipt, View Budget
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHaptics } from "../hooks/useHaptics";
import { useTheme } from "../hooks/useTheme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
}

interface QuickActionsFABProps {
  /** Callback when "Add Transaction" is pressed */
  onAddTransaction: () => void;
  /** Callback when "Scan Receipt" is pressed */
  onScanReceipt: () => void;
  /** Callback when "View Budget" is pressed */
  onViewBudget: () => void;
  /** Whether the FAB is visible */
  visible?: boolean;
}

const ACTIONS: QuickAction[] = [
  { id: "transaction", label: "Add Transaction", icon: "add-circle-outline" },
  { id: "receipt", label: "Scan Receipt", icon: "camera-outline" },
  { id: "budget", label: "View Budget", icon: "pie-chart-outline" },
];

const FAB_SIZE = 56;
const ACTION_SIZE = 48;
const ACTION_SPACING = 16;
const ANIMATION_DURATION = 200;
const STAGGER_DELAY = 50;

export default function QuickActionsFAB({
  onAddTransaction,
  onScanReceipt,
  onViewBudget,
  visible = true,
}: QuickActionsFABProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();

  const [isExpanded, setIsExpanded] = useState(false);

  // Animation values
  const [rotationAnim] = useState(new Animated.Value(0));
  const [backdropAnim] = useState(new Animated.Value(0));
  const [actionAnims] = useState(
    ACTIONS.map(() => ({
      scale: new Animated.Value(0),
      translateY: new Animated.Value(0),
    })),
  );

  const toggleExpanded = useCallback(() => {
    const toExpanded = !isExpanded;
    setIsExpanded(toExpanded);

    // Haptic feedback
    haptics.light();

    if (toExpanded) {
      // Expand animations
      Animated.parallel([
        // Rotate FAB icon
        Animated.spring(rotationAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 15,
          stiffness: 150,
        }),
        // Fade in backdrop
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        // Stagger action buttons
        ...actionAnims.map((anim, index) =>
          Animated.sequence([
            Animated.delay(index * STAGGER_DELAY),
            Animated.parallel([
              Animated.spring(anim.scale, {
                toValue: 1,
                useNativeDriver: true,
                damping: 15,
                stiffness: 150,
              }),
              Animated.spring(anim.translateY, {
                toValue: -(index + 1) * (ACTION_SIZE + ACTION_SPACING),
                useNativeDriver: true,
                damping: 15,
                stiffness: 150,
              }),
            ]),
          ]),
        ),
      ]).start();
    } else {
      // Collapse animations
      Animated.parallel([
        // Rotate FAB icon back
        Animated.spring(rotationAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 15,
          stiffness: 150,
        }),
        // Fade out backdrop
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        // Collapse action buttons
        ...actionAnims.map((anim) =>
          Animated.parallel([
            Animated.spring(anim.scale, {
              toValue: 0,
              useNativeDriver: true,
              damping: 15,
              stiffness: 150,
            }),
            Animated.spring(anim.translateY, {
              toValue: 0,
              useNativeDriver: true,
              damping: 15,
              stiffness: 150,
            }),
          ]),
        ),
      ]).start();
    }
  }, [isExpanded, rotationAnim, backdropAnim, actionAnims, haptics]);

  const handleActionPress = useCallback(
    (actionId: string) => {
      haptics.medium();

      // Close the menu
      toggleExpanded();

      // Execute the action
      switch (actionId) {
        case "transaction":
          onAddTransaction();
          break;
        case "receipt":
          onScanReceipt();
          break;
        case "budget":
          onViewBudget();
          break;
      }
    },
    [haptics, toggleExpanded, onAddTransaction, onScanReceipt, onViewBudget],
  );

  const handleBackdropPress = useCallback(() => {
    if (isExpanded) {
      toggleExpanded();
    }
  }, [isExpanded, toggleExpanded]);

  // Interpolate rotation
  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  if (!visible) {
    return null;
  }

  const dynamicStyles = StyleSheet.create({
    container: {
      position: "absolute",
      bottom: insets.bottom + 16,
      right: 16,
      alignItems: "flex-end",
    },
    backdrop: {
      position: "absolute",
      top: -SCREEN_HEIGHT,
      left: -SCREEN_WIDTH,
      width: SCREEN_WIDTH * 2,
      height: SCREEN_HEIGHT * 2,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    fab: {
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: FAB_SIZE / 2,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    actionContainer: {
      position: "absolute",
      bottom: 0,
      right: (FAB_SIZE - ACTION_SIZE) / 2,
      alignItems: "center",
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: ACTION_SIZE / 2,
      paddingRight: 16,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 3,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    actionIcon: {
      width: ACTION_SIZE,
      height: ACTION_SIZE,
      borderRadius: ACTION_SIZE / 2,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    actionLabel: {
      marginLeft: 12,
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
  });

  return (
    <View style={dynamicStyles.container} pointerEvents="box-none">
      {/* Backdrop */}
      {isExpanded && (
        <Animated.View
          style={[dynamicStyles.backdrop, { opacity: backdropAnim }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleBackdropPress}
          />
        </Animated.View>
      )}

      {/* Action Buttons */}
      {ACTIONS.map((action, index) => (
        <Animated.View
          key={action.id}
          style={[
            dynamicStyles.actionContainer,
            {
              transform: [
                { scale: actionAnims[index].scale },
                { translateY: actionAnims[index].translateY },
              ],
            },
          ]}
          pointerEvents={isExpanded ? "auto" : "none"}
        >
          <Pressable
            style={dynamicStyles.actionButton}
            onPress={() => handleActionPress(action.id)}
            accessibilityLabel={action.label}
            accessibilityRole="button"
          >
            <View style={dynamicStyles.actionIcon}>
              <Ionicons
                name={action.icon}
                size={24}
                color={colors.background}
              />
            </View>
            <Text style={dynamicStyles.actionLabel}>{action.label}</Text>
          </Pressable>
        </Animated.View>
      ))}

      {/* Main FAB */}
      <Pressable
        style={dynamicStyles.fab}
        onPress={toggleExpanded}
        accessibilityLabel="Quick Actions"
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityHint="Double tap to open quick actions menu"
      >
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Ionicons name="add" size={28} color={colors.background} />
        </Animated.View>
      </Pressable>
    </View>
  );
}
