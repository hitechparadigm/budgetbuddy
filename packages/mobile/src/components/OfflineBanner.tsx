/**
 * Offline Banner Component
 * Shows a prominent banner when the app is offline
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../hooks/useTheme";

const { width: screenWidth } = Dimensions.get("window");

interface OfflineBannerProps {
  isVisible: boolean;
  pendingItems?: number;
  onPress?: () => void;
}

export default function OfflineBanner({
  isVisible,
  pendingItems = 0,
  onPress,
}: OfflineBannerProps) {
  const { colors } = useTheme();
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isVisible) {
      // Slide down animation
      Animated.timing(slideAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Pulse animation for attention
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 0.95,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    } else {
      // Slide up animation
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  const translateY = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 0], // Banner height
  });

  const dynamicStyles = StyleSheet.create({
    container: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      backgroundColor: colors.error,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      elevation: 10,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    leftContent: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    icon: {
      marginRight: 8,
    },
    textContainer: {
      flex: 1,
    },
    mainText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.background,
    },
    subText: {
      fontSize: 12,
      color: colors.background,
      opacity: 0.9,
      marginTop: 2,
    },
    rightContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    pendingBadge: {
      backgroundColor: colors.background,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 8,
    },
    pendingText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.error,
    },
    actionIcon: {
      padding: 4,
    },
  });

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        dynamicStyles.container,
        {
          transform: [{ translateY }, { scale: pulseAnimation }],
        },
      ]}
    >
      <Pressable style={dynamicStyles.leftContent} onPress={handlePress}>
        <Ionicons
          name="cloud-offline"
          size={20}
          color={colors.background}
          style={dynamicStyles.icon}
        />

        <View style={dynamicStyles.textContainer}>
          <Text style={dynamicStyles.mainText}>You're offline</Text>
          <Text style={dynamicStyles.subText}>
            {pendingItems > 0
              ? `${pendingItems} changes will sync when online`
              : "Changes will be saved locally"}
          </Text>
        </View>
      </Pressable>

      <View style={dynamicStyles.rightContent}>
        {pendingItems > 0 && (
          <View style={dynamicStyles.pendingBadge}>
            <Text style={dynamicStyles.pendingText}>{pendingItems}</Text>
          </View>
        )}

        <Pressable style={dynamicStyles.actionIcon} onPress={handlePress}>
          <Ionicons
            name="information-circle"
            size={20}
            color={colors.background}
          />
        </Pressable>
      </View>
    </Animated.View>
  );
}
