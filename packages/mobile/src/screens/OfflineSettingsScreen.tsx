/**
 * Offline Settings Screen
 * Allows users to manage offline data, sync settings, and view storage statistics
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Card, Button, LoadingSpinner } from "../components/ui";
import { useTheme } from "../hooks/useTheme";
import { useOfflineSync } from "../hooks/useOfflineSync";
import ConnectionStatus from "../components/ConnectionStatus";
import {
  getStorageStats,
  clearOfflineData,
  getPendingSyncItems,
} from "../services/offline";

interface StorageDetails {
  syncQueueSize: number;
  pendingItems: number;
  lastSync: string | null;
  isOnline: boolean;
  budgetCount: number;
  transactionCount: number;
  categoryCount: number;
  totalSize: string;
}

export default function OfflineSettingsScreen() {
  const { colors } = useTheme();
  const { syncStatus, triggerSync, clearSyncQueue, retryFailedItems } =
    useOfflineSync();
  const [storageDetails, setStorageDetails] = useState<StorageDetails | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStorageDetails();
  }, []);

  const loadStorageDetails = async () => {
    try {
      setIsLoading(true);

      const [stats, pendingItems] = await Promise.all([
        getStorageStats(),
        getPendingSyncItems(),
      ]);

      setStorageDetails({
        syncQueueSize: stats.syncQueueSize,
        pendingItems: stats.pendingItems,
        lastSync: stats.lastSync,
        isOnline: stats.isOnline,
        budgetCount: pendingItems.budgets.length,
        transactionCount: pendingItems.transactions.length,
        categoryCount: pendingItems.categories.length,
        totalSize: "Calculating...", // Would need actual size calculation
      });
    } catch (error) {
      console.error("Failed to load storage details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStorageDetails();
    setRefreshing(false);
  };

  const handleManualSync = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await triggerSync();
      await loadStorageDetails();
    } catch (error) {
      Alert.alert("Sync Failed", "Unable to sync data. Please try again.");
    }
  };

  const handleRetryFailed = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await retryFailedItems();
      await loadStorageDetails();
    } catch (error) {
      Alert.alert(
        "Retry Failed",
        "Unable to retry failed items. Please try again."
      );
    }
  };

  const handleClearOfflineData = () => {
    Alert.alert(
      "Clear Offline Data",
      "This will remove all locally stored data. Any unsynced changes will be lost. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await clearOfflineData();
              await loadStorageDetails();
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              Alert.alert("Success", "Offline data cleared successfully.");
            } catch (error) {
              Alert.alert("Error", "Failed to clear offline data.");
            }
          },
        },
      ]
    );
  };

  const handleClearSyncQueue = () => {
    Alert.alert(
      "Clear Sync Queue",
      "This will remove all pending sync operations. Unsynced changes will be lost. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await clearSyncQueue();
              await loadStorageDetails();
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              Alert.alert("Success", "Sync queue cleared successfully.");
            } catch (error) {
              Alert.alert("Error", "Failed to clear sync queue.");
            }
          },
        },
      ]
    );
  };

  const formatLastSync = (lastSync: string | null): string => {
    if (!lastSync) return "Never";

    const syncDate = new Date(lastSync);
    return syncDate.toLocaleString();
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.text,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 4,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    statRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    statLabel: {
      fontSize: 16,
      color: colors.text,
    },
    statValue: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    buttonContainer: {
      marginTop: 16,
    },
    button: {
      marginBottom: 12,
    },
    dangerButton: {
      backgroundColor: colors.error,
    },
    warningButton: {
      backgroundColor: colors.warning,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    syncingIndicator: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
    },
    syncingText: {
      marginLeft: 8,
      fontSize: 16,
      color: colors.primary,
      fontWeight: "500",
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <View style={dynamicStyles.header}>
          <Text style={dynamicStyles.title}>Offline Settings</Text>
        </View>
        <View style={dynamicStyles.loadingContainer}>
          <LoadingSpinner size="large" />
          <Text
            style={[
              dynamicStyles.subtitle,
              { textAlign: "center", marginTop: 16 },
            ]}
          >
            Loading storage details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.title}>Offline Settings</Text>
        <Text style={dynamicStyles.subtitle}>
          Manage offline data and synchronization
        </Text>
      </View>

      <ScrollView
        style={dynamicStyles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Connection Status */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Connection Status</Text>
          <ConnectionStatus showDetails={true} />
        </View>

        {/* Sync Status */}
        {syncStatus.isSyncing && (
          <View style={dynamicStyles.syncingIndicator}>
            <LoadingSpinner size="small" />
            <Text style={dynamicStyles.syncingText}>
              Syncing... {syncStatus.progress}%
            </Text>
          </View>
        )}

        {/* Storage Statistics */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Storage Statistics</Text>
          <Card>
            <View style={dynamicStyles.statRow}>
              <Text style={dynamicStyles.statLabel}>Pending Items</Text>
              <Text style={dynamicStyles.statValue}>
                {storageDetails?.pendingItems || 0}
              </Text>
            </View>

            <View style={dynamicStyles.statRow}>
              <Text style={dynamicStyles.statLabel}>Sync Queue Size</Text>
              <Text style={dynamicStyles.statValue}>
                {storageDetails?.syncQueueSize || 0}
              </Text>
            </View>

            <View style={dynamicStyles.statRow}>
              <Text style={dynamicStyles.statLabel}>Budgets (Local)</Text>
              <Text style={dynamicStyles.statValue}>
                {storageDetails?.budgetCount || 0}
              </Text>
            </View>

            <View style={dynamicStyles.statRow}>
              <Text style={dynamicStyles.statLabel}>Transactions (Local)</Text>
              <Text style={dynamicStyles.statValue}>
                {storageDetails?.transactionCount || 0}
              </Text>
            </View>

            <View style={dynamicStyles.statRow}>
              <Text style={dynamicStyles.statLabel}>Categories (Local)</Text>
              <Text style={dynamicStyles.statValue}>
                {storageDetails?.categoryCount || 0}
              </Text>
            </View>

            <View style={[dynamicStyles.statRow, { borderBottomWidth: 0 }]}>
              <Text style={dynamicStyles.statLabel}>Last Sync</Text>
              <Text style={dynamicStyles.statValue}>
                {formatLastSync(storageDetails?.lastSync || null)}
              </Text>
            </View>
          </Card>
        </View>

        {/* Sync Actions */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Sync Actions</Text>

          <View style={dynamicStyles.buttonContainer}>
            <Button
              title="Manual Sync"
              onPress={handleManualSync}
              disabled={!syncStatus.isOnline || syncStatus.isSyncing}
              style={dynamicStyles.button}
            />

            <Button
              title="Retry Failed Items"
              onPress={handleRetryFailed}
              disabled={!syncStatus.isOnline || syncStatus.queueSize === 0}
              style={StyleSheet.flatten([
                dynamicStyles.button,
                dynamicStyles.warningButton,
              ])}
            />
          </View>
        </View>

        {/* Data Management */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Data Management</Text>

          <View style={dynamicStyles.buttonContainer}>
            <Button
              title="Clear Sync Queue"
              onPress={handleClearSyncQueue}
              disabled={syncStatus.queueSize === 0}
              style={StyleSheet.flatten([
                dynamicStyles.button,
                dynamicStyles.warningButton,
              ])}
            />

            <Button
              title="Clear All Offline Data"
              onPress={handleClearOfflineData}
              style={StyleSheet.flatten([
                dynamicStyles.button,
                dynamicStyles.dangerButton,
              ])}
            />
          </View>
        </View>

        {/* Information */}
        <View style={dynamicStyles.section}>
          <Card>
            <Text style={[dynamicStyles.sectionTitle, { marginBottom: 8 }]}>
              About Offline Mode
            </Text>
            <Text
              style={[
                dynamicStyles.statLabel,
                { fontSize: 14, lineHeight: 20 },
              ]}
            >
              When offline, all your changes are saved locally and will
              automatically sync when you're back online. You can use the app
              normally without an internet connection for up to 7 days.
            </Text>
          </Card>
        </View>

        {/* Add bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
