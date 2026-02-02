/**
 * DraggableGoalList Component
 * Enables drag-and-drop reordering of goals with haptic feedback
 */

import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../hooks/useTheme";
import { useHaptics } from "../hooks/useHaptics";
import { Card } from "./ui";
import { formatCurrency } from "@budget-buddy/shared/src/utils/currency";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_HEIGHT = 100;

interface Goal {
  goalId: string;
  name: string;
  icon: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  daysRemaining: number | null;
  priority: number;
  status: "active" | "completed" | "paused";
  statusIndicator: string;
  progressPercent: number;
  monthlyRequired: number | null;
  milestones: Record<string, { reached: boolean; date: string | null }>;
  completedAt: string | null;
}

interface DraggableGoalListProps {
  goals: Goal[];
  onReorder: (goalIds: string[]) => void;
  onGoalPress?: (goal: Goal) => void;
  currency?: string;
  isReordering?: boolean;
}

interface DraggableGoalItemProps {
  goal: Goal;
  index: number;
  totalItems: number;
  onDragStart: () => void;
  onDragEnd: (fromIndex: number, toIndex: number) => void;
  onPress?: () => void;
  currency: string;
  isDragging: boolean;
  draggedIndex: number | null;
}

function DraggableGoalItem({
  goal,
  index,
  totalItems,
  onDragStart,
  onDragEnd,
  onPress,
  currency,
  isDragging,
  draggedIndex,
}: DraggableGoalItemProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(0);
  const opacity = useSharedValue(1);
  const isActive = useSharedValue(false);

  // Calculate new index based on drag position
  const getNewIndex = useCallback(
    (translationY: number): number => {
      const newIndex = Math.round(translationY / ITEM_HEIGHT) + index;
      return Math.max(0, Math.min(totalItems - 1, newIndex));
    },
    [index, totalItems],
  );

  const longPressGesture = Gesture.LongPress()
    .minDuration(300)
    .onStart(() => {
      "worklet";
      isActive.value = true;
      scale.value = withSpring(1.05);
      zIndex.value = 100;
      runOnJS(haptics.medium)();
      runOnJS(onDragStart)();
    });

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(300)
    .onStart(() => {
      "worklet";
      if (!isActive.value) {
        isActive.value = true;
        scale.value = withSpring(1.05);
        zIndex.value = 100;
        runOnJS(haptics.medium)();
        runOnJS(onDragStart)();
      }
    })
    .onUpdate((event) => {
      "worklet";
      if (isActive.value) {
        translateY.value = event.translationY;

        // Haptic feedback when crossing item boundaries
        const newIndex = Math.round(event.translationY / ITEM_HEIGHT) + index;
        const clampedIndex = Math.max(0, Math.min(totalItems - 1, newIndex));
        if (
          clampedIndex !== index &&
          Math.abs(event.translationY) % ITEM_HEIGHT < 10
        ) {
          runOnJS(haptics.light)();
        }
      }
    })
    .onEnd((event) => {
      "worklet";
      if (isActive.value) {
        const newIndex = Math.round(event.translationY / ITEM_HEIGHT) + index;
        const clampedIndex = Math.max(0, Math.min(totalItems - 1, newIndex));

        translateY.value = withSpring(0);
        scale.value = withSpring(1);
        zIndex.value = 0;
        isActive.value = false;

        runOnJS(haptics.success)();
        runOnJS(onDragEnd)(index, clampedIndex);
      }
    });

  const composedGesture = Gesture.Simultaneous(longPressGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => {
    // If another item is being dragged, shift this item
    let offsetY = 0;
    if (draggedIndex !== null && draggedIndex !== index) {
      const draggedTranslation = translateY.value;
      const draggedNewIndex =
        Math.round(draggedTranslation / ITEM_HEIGHT) + draggedIndex;

      if (draggedIndex < index && draggedNewIndex >= index) {
        offsetY = -ITEM_HEIGHT;
      } else if (draggedIndex > index && draggedNewIndex <= index) {
        offsetY = ITEM_HEIGHT;
      }
    }

    return {
      transform: [
        {
          translateY: isActive.value
            ? translateY.value
            : withTiming(offsetY, { duration: 200 }),
        },
        { scale: scale.value },
      ],
      zIndex: zIndex.value,
      opacity: opacity.value,
    };
  });

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return colors.success;
    if (percent >= 75) return colors.primary;
    if (percent >= 50) return colors.warning;
    return colors.textSecondary;
  };

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.itemContainer, animatedStyle]}>
        <Pressable onPress={onPress} disabled={isDragging}>
          <Card style={styles.goalCard as any}>
            <View style={styles.dragHandle}>
              <Ionicons
                name="reorder-three"
                size={24}
                color={colors.textSecondary}
              />
            </View>

            <View style={styles.goalContent}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalIcon}>{goal.icon}</Text>
                <View style={styles.goalInfo}>
                  <Text
                    style={[styles.goalName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {goal.name}
                  </Text>
                  <Text
                    style={[styles.goalAmount, { color: colors.textSecondary }]}
                  >
                    {formatCurrency(goal.currentAmount, currency)} /{" "}
                    {formatCurrency(goal.targetAmount, currency)}
                  </Text>
                </View>
              </View>

              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { backgroundColor: colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: getProgressColor(goal.progressPercent),
                        width: `${Math.min(goal.progressPercent, 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.progressText,
                    { color: getProgressColor(goal.progressPercent) },
                  ]}
                >
                  {goal.progressPercent}%
                </Text>
              </View>
            </View>
          </Card>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

export default function DraggableGoalList({
  goals,
  onReorder,
  onGoalPress,
  currency = "USD",
  isReordering = false,
}: DraggableGoalListProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [localGoals, setLocalGoals] = useState(goals);

  // Sync local goals with props
  React.useEffect(() => {
    if (!isDragging) {
      setLocalGoals(goals);
    }
  }, [goals, isDragging]);

  const handleDragStart = useCallback((index: number) => {
    setIsDragging(true);
    setDraggedIndex(index);
  }, []);

  const handleDragEnd = useCallback(
    (fromIndex: number, toIndex: number) => {
      setIsDragging(false);
      setDraggedIndex(null);

      if (fromIndex !== toIndex) {
        // Reorder the goals array
        const newGoals = [...localGoals];
        const [movedGoal] = newGoals.splice(fromIndex, 1);
        newGoals.splice(toIndex, 0, movedGoal);

        setLocalGoals(newGoals);

        // Call the onReorder callback with the new order
        const goalIds = newGoals.map((g) => g.goalId);
        onReorder(goalIds);
      }
    },
    [localGoals, onReorder],
  );

  if (localGoals.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🎯</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No goals to reorder
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="swap-vertical" size={20} color={colors.primary} />
        <Text style={[styles.headerText, { color: colors.textSecondary }]}>
          Long press and drag to reorder
        </Text>
      </View>

      <View style={styles.listContainer}>
        {localGoals.map((goal, index) => (
          <DraggableGoalItem
            key={goal.goalId}
            goal={goal}
            index={index}
            totalItems={localGoals.length}
            onDragStart={() => handleDragStart(index)}
            onDragEnd={handleDragEnd}
            onPress={() => onGoalPress?.(goal)}
            currency={currency}
            isDragging={isDragging}
            draggedIndex={draggedIndex}
          />
        ))}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  headerText: {
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  itemContainer: {
    marginBottom: 12,
  },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
  },
  dragHandle: {
    paddingRight: 12,
    paddingVertical: 8,
  },
  goalContent: {
    flex: 1,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  goalIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontWeight: "600",
  },
  goalAmount: {
    fontSize: 12,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    minWidth: 40,
    textAlign: "right",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
});
