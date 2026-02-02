/**
 * SwipeableTipCard Component
 *
 * A tip card with swipe gestures:
 * - Swipe left to save (bookmark)
 * - Swipe right to dismiss
 * - Haptic feedback on threshold
 */

import React, { useCallback } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  interpolateColor,
  Extrapolation,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../hooks/useTheme";
import { useHaptics } from "../hooks/useHaptics";
import { Card } from "./ui";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface Tip {
  id: string;
  title: string;
  content: string;
  category: string;
  difficulty?: string;
  isRead?: boolean;
  isSaved?: boolean;
}

interface SwipeableTipCardProps {
  tip: Tip;
  onSave: (tipId: string) => void;
  onDismiss: (tipId: string) => void;
  onPress?: (tip: Tip) => void;
}

export default function SwipeableTipCard({
  tip,
  onSave,
  onDismiss,
  onPress,
}: SwipeableTipCardProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const translateX = useSharedValue(0);
  const cardHeight = useSharedValue(120);
  const cardOpacity = useSharedValue(1);
  const hasTriggeredHaptic = useSharedValue(false);

  const handleSave = useCallback(() => {
    onSave(tip.id);
  }, [onSave, tip.id]);

  const handleDismiss = useCallback(() => {
    onDismiss(tip.id);
  }, [onDismiss, tip.id]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      "worklet";
      translateX.value = event.translationX;

      // Trigger haptic when crossing threshold
      if (
        Math.abs(event.translationX) > SWIPE_THRESHOLD &&
        !hasTriggeredHaptic.value
      ) {
        hasTriggeredHaptic.value = true;
        runOnJS(haptics.medium)();
      } else if (
        Math.abs(event.translationX) < SWIPE_THRESHOLD &&
        hasTriggeredHaptic.value
      ) {
        hasTriggeredHaptic.value = false;
      }
    })
    .onEnd((event) => {
      "worklet";
      hasTriggeredHaptic.value = false;

      if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left - Save
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 200 });
        cardHeight.value = withTiming(0, { duration: 200 });
        cardOpacity.value = withTiming(0, { duration: 200 });
        runOnJS(haptics.success)();
        runOnJS(handleSave)();
      } else if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right - Dismiss
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 200 });
        cardHeight.value = withTiming(0, { duration: 200 });
        cardOpacity.value = withTiming(0, { duration: 200 });
        runOnJS(haptics.light)();
        runOnJS(handleDismiss)();
      } else {
        // Snap back
        translateX.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    height: cardHeight.value,
    opacity: cardOpacity.value,
    marginBottom: interpolate(
      cardHeight.value,
      [0, 120],
      [0, 12],
      Extrapolation.CLAMP,
    ),
  }));

  const leftActionStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      backgroundColor: colors.error,
    };
  });

  const rightActionStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      backgroundColor: colors.success,
    };
  });

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case "budgeting":
        return "💰";
      case "saving":
        return "🏦";
      case "debt":
        return "💳";
      case "investing":
        return "📈";
      default:
        return "💡";
    }
  };

  const getDifficultyColor = (difficulty?: string): string => {
    switch (difficulty) {
      case "beginner":
        return colors.success;
      case "intermediate":
        return colors.warning;
      case "advanced":
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      {/* Left action (dismiss) */}
      <Animated.View
        style={[styles.actionContainer, styles.leftAction, leftActionStyle]}
      >
        <Ionicons name="close" size={28} color="#fff" />
        <Text style={styles.actionText}>Dismiss</Text>
      </Animated.View>

      {/* Right action (save) */}
      <Animated.View
        style={[styles.actionContainer, styles.rightAction, rightActionStyle]}
      >
        <Ionicons name="bookmark" size={28} color="#fff" />
        <Text style={styles.actionText}>Save</Text>
      </Animated.View>

      {/* Card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={cardStyle}>
          <Card
            style={[
              styles.card,
              { backgroundColor: colors.surface },
              !tip.isRead && {
                borderLeftWidth: 3,
                borderLeftColor: colors.primary,
              },
            ]}
            onPress={() => onPress?.(tip)}
          >
            <View style={styles.header}>
              <Text style={styles.categoryIcon}>
                {getCategoryIcon(tip.category)}
              </Text>
              <View style={styles.headerInfo}>
                <Text
                  style={[styles.category, { color: colors.textSecondary }]}
                >
                  {tip.category.charAt(0).toUpperCase() + tip.category.slice(1)}
                </Text>
                {tip.difficulty && (
                  <View
                    style={[
                      styles.difficultyBadge,
                      {
                        backgroundColor:
                          getDifficultyColor(tip.difficulty) + "20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.difficultyText,
                        { color: getDifficultyColor(tip.difficulty) },
                      ]}
                    >
                      {tip.difficulty}
                    </Text>
                  </View>
                )}
              </View>
              {tip.isSaved && (
                <Ionicons name="bookmark" size={18} color={colors.primary} />
              )}
            </View>

            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {tip.title}
            </Text>
            <Text
              style={[styles.content, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {tip.content}
            </Text>
          </Card>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  actionContainer: {
    position: "absolute",
    top: 0,
    bottom: 12,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  leftAction: {
    justifyContent: "flex-start",
  },
  rightAction: {
    justifyContent: "flex-end",
  },
  actionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginHorizontal: 8,
  },
  card: {
    padding: 16,
    borderRadius: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  category: {
    fontSize: 12,
    textTransform: "capitalize",
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
});
