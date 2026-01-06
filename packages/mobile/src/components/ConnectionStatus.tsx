/**
 * Connection Status Component
 * Displays network connectivity status and sync information
 */

import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../hooks/useTheme";
import { getNetworkStatus } from "../services/api";
import { getStorageStats } from "../services/offline";

interface ConnectionStatusProps {
  showDetails?: boolean;
  onPress?: () => void;
}

export default function ConnectionStatus({
  showDetails = false,
  onPress,
}: ConnectionStatusProps) {
  const { colors } = useTheme();
  const [isOnline, setIsOnline] = useState(true);
  const [syncStats, setSyncStats] = useState({
    syncQueueSize: 0,
    pendingItems: 0,
    lastSync: null as string | null,
  });
  const [showDetailedView, setShowDetailedView] = useState(showDetails);
  const slideAnimation = new Animated.Value(showDetails ? 1 : 0);

  useEffect(() => {
    // Check initial status
    updateStatus();

    // Set up periodic status checks
    const interval = setInterval(updateStatus, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Animate detailed view
    Animated.timing(slideAnimation, {
      toValue: showDetailedView ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showDetailedView]);

  const updateStatus = async () => {
    try {
      const networkStatus = getNetworkStatus();
      const stats = await getStorageStats();

      setIsOnline(networkStatus.isOnline);
      setSyncStats(stats);
    } catch (error) {
      console.error("Failed to update connection status:", error);
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      setShowDetailedView(!showDetailedView);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const formatLastSync = (lastSync: string | null): string => {
    if (!lastSync) return "Never";

    const syncDate = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getStatusColor = () => {
    if (!isOnline) return colors.error;
    if (syncStats.pendingItems > 0) return colors.warning;
    return colors.success;
  };

  const getStatusIcon = () => {
    if (!isOnline) return "cloud-offline";
    if (syncStats.pendingItems > 0) return "sync";
    return "cloud-done";
  };

  const getStatusText = () => {
    if (!isOnline) return "Offline";
    if (syncStats.pendingItems > 0) return `${syncStats.pendingItems} pending`;
    return "Synced";
  };

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: colors.surface,
          borderRadius: 8,
          marginHorizontal: 16,
          marginVertical: 4,
          elevation: 2,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
        },
        statusBar: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 8,
          minHeight: 40,
        },
        statusIcon: {
          marginRight: 8,
        },
        statusText: {
          flex: 1,
          fontSize: 14,
          fontWeight: "500",
          color: colors.text,
        },
        expandIcon: {
          marginLeft: 8,
        },
        detailsContainer: {
          overflow: "hidden",
        },
        details: {
          paddingHorizontal: 12,
          paddingBottom: 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        detailRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingVertical: 4,
        },
        detailLabel: {
          fontSize: 12,
          color: colors.textSecondary,
        },
        detailValue: {
          fontSize: 12,
          fontWeight: "500",
          color: colors.text,
        },
        offlineIndicator: {
          backgroundColor: colors.error,
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 4,
        },
        offlineText: {
          fontSize: 10,
          color: colors.background,
          fontWeight: "600",
        },
        syncingIndicator: {
          backgroundColor: colors.warning,
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 4,
        },
        syncingText: {
          fontSize: 10,
          color: colors.background,
          fontWeight: "600",
        },
      }),
    [colors]
  );

  const detailsHeight = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120], // Approximate height of details section
  });

  return (
    <View style={dynamicStyles.container}>
      <Pressable style={dynamicStyles.statusBar} onPress={handlePress}>
        <Ionicons
          name={getStatusIcon()}
          size={16}
          color={getStatusColor()}
          style={dynamicStyles.statusIcon}
        />

        <Text style={dynamicStyles.statusText}>{getStatusText()}</Text>

        {!isOnline && (
          <View style={dynamicStyles.offlineIndicator}>
            <Text style={dynamicStyles.offlineText}>OFFLINE</Text>
          </View>
        )}

        {isOnline && syncStats.pendingItems > 0 && (
          <View style={dynamicStyles.syncingIndicator}>
            <Text style={dynamicStyles.syncingText}>SYNCING</Text>
          </View>
        )}

        <Ionicons
          name={showDetailedView ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.textSecondary}
          style={dynamicStyles.expandIcon}
        />
      </Pressable>

      <Animated.View
        style={[dynamicStyles.detailsContainer, { height: detailsHeight }]}
      >
        <View style={dynamicStyles.details}>
          <View style={dynamicStyles.detailRow}>
            <Text style={dynamicStyles.detailLabel}>Connection</Text>
            <Text
              style={[dynamicStyles.detailValue, { color: getStatusColor() }]}
            >
              {isOnline ? "Online" : "Offline"}
            </Text>
          </View>

          <View style={dynamicStyles.detailRow}>
            <Text style={dynamicStyles.detailLabel}>Pending Items</Text>
            <Text style={dynamicStyles.detailValue}>
              {syncStats.pendingItems}
            </Text>
          </View>

          <View style={dynamicStyles.detailRow}>
            <Text style={dynamicStyles.detailLabel}>Queue Size</Text>
            <Text style={dynamicStyles.detailValue}>
              {syncStats.syncQueueSize}
            </Text>
          </View>

          <View style={dynamicStyles.detailRow}>
            <Text style={dynamicStyles.detailLabel}>Last Sync</Text>
            <Text style={dynamicStyles.detailValue}>
              {formatLastSync(syncStats.lastSync)}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
