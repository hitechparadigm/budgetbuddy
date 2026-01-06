/**
 * Sync Settings Screen
 * Advanced synchronization settings and conflict resolution
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Card, Button, LoadingSpinner } from "../components/ui";
import { useTheme } from "../hooks/useTheme";
import { useOfflineSync } from "../hooks/useOfflineSync";
import ConnectionStatus from "../components/ConnectionStatus";
import { syncService, SyncResult } from "../services/syncService";

interface SyncSettings {
  autoSync: boolean;
  syncInterval: number; // minutes
  conflictStrategy: "server_wins" | "client_wins" | "merge";
  batchSize: number;
  maxRetries: number;
  syncOnAppStart: boolean;
  syncOnNetworkRestore: boolean;
}

const DEFAULT_SETTINGS: SyncSettings = {
  autoSync: true,
  syncInterval: 5,
  conflictStrategy: "server_wins",
  batchSize: 10,
  maxRetries: 3,
  syncOnAppStart: true,
  syncOnNetworkRestore: true,
};

export default function SyncSettingsScreen() {
  const { colors } = useTheme();
  const { syncStatus, triggerSync, forceSync } = useOfflineSync();
  const [settings, setSettings] = useState<SyncSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    loadSettings();

    // Listen for sync results
    const removeListener = syncService.addSyncListener((result) => {
      setLastSyncResult(result);
    });

    return removeListener;
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      // In a real app, load settings from AsyncStorage
      // For now, use defaults
      setSettings(DEFAULT_SETTINGS);
    } catch (error) {
      console.error("Failed to load sync settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: SyncSettings) => {
    try {
      // In a real app, save to AsyncStorage
      setSettings(newSettings);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to save sync settings:", error);
      Alert.alert("Error", "Failed to save settings");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSettings();
    setRefreshing(false);
  };

  const handleManualSync = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await triggerSync();
    } catch (error) {
      Alert.alert("Sync Failed", "Unable to sync data. Please try again.");
    }
  };

  const handleForceSync = async () => {
    Alert.alert(
      "Force Sync",
      "This will sync even when offline. This may fail if there's no connection. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Force Sync",
          style: "destructive",
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              await forceSync();
            } catch (error) {
              Alert.alert("Force Sync Failed", "Unable to force sync.");
            }
          },
        },
      ]
    );
  };

  const updateSetting = <K extends keyof SyncSettings>(
    key: K,
    value: SyncSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const formatSyncResult = (result: SyncResult | null): string => {
    if (!result) return "No recent sync";

    if (result.success) {
      return `✅ Success: ${result.syncedItems} synced, ${result.conflicts} conflicts resolved`;
    } else {
      return `❌ Failed: ${result.errors.length} errors`;
    }
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
    settingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingLabel: {
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    settingDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    settingValue: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.primary,
      marginLeft: 12,
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
    resultText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontFamily: "monospace",
      marginTop: 8,
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <View style={dynamicStyles.header}>
          <Text style={dynamicStyles.title}>Sync Settings</Text>
        </View>
        <View style={dynamicStyles.loadingContainer}>
          <LoadingSpinner size="large" />
          <Text
            style={[
              dynamicStyles.subtitle,
              { textAlign: "center", marginTop: 16 },
            ]}
          >
            Loading sync settings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.title}>Sync Settings</Text>
        <Text style={dynamicStyles.subtitle}>
          Configure automatic synchronization
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
          <Text style={dynamicStyles.sectionTitle}>Current Status</Text>
          <ConnectionStatus showDetails={true} />

          {syncStatus.isSyncing && (
            <View style={dynamicStyles.syncingIndicator}>
              <LoadingSpinner size="small" />
              <Text style={dynamicStyles.syncingText}>
                Syncing... {syncStatus.progress}%
              </Text>
            </View>
          )}

          {lastSyncResult && (
            <Text style={dynamicStyles.resultText}>
              {formatSyncResult(lastSyncResult)}
            </Text>
          )}
        </View>

        {/* Auto Sync Settings */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Automatic Sync</Text>
          <Card>
            <View style={dynamicStyles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={dynamicStyles.settingLabel}>Enable Auto Sync</Text>
                <Text style={dynamicStyles.settingDescription}>
                  Automatically sync when online
                </Text>
              </View>
              <Switch
                value={settings.autoSync}
                onValueChange={(value) => updateSetting("autoSync", value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.background}
              />
            </View>

            <View style={dynamicStyles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={dynamicStyles.settingLabel}>
                  Sync on App Start
                </Text>
                <Text style={dynamicStyles.settingDescription}>
                  Sync when app opens
                </Text>
              </View>
              <Switch
                value={settings.syncOnAppStart}
                onValueChange={(value) =>
                  updateSetting("syncOnAppStart", value)
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.background}
              />
            </View>

            <View style={[dynamicStyles.settingRow, { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={dynamicStyles.settingLabel}>
                  Sync on Network Restore
                </Text>
                <Text style={dynamicStyles.settingDescription}>
                  Sync when connection restored
                </Text>
              </View>
              <Switch
                value={settings.syncOnNetworkRestore}
                onValueChange={(value) =>
                  updateSetting("syncOnNetworkRestore", value)
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.background}
              />
            </View>
          </Card>
        </View>

        {/* Conflict Resolution */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Conflict Resolution</Text>
          <Card>
            <View style={dynamicStyles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={dynamicStyles.settingLabel}>Strategy</Text>
                <Text style={dynamicStyles.settingDescription}>
                  How to handle sync conflicts
                </Text>
              </View>
              <Text style={dynamicStyles.settingValue}>
                {settings.conflictStrategy === "server_wins"
                  ? "Server Wins"
                  : settings.conflictStrategy === "client_wins"
                  ? "Client Wins"
                  : "Merge"}
              </Text>
            </View>

            <View style={dynamicStyles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={dynamicStyles.settingLabel}>Batch Size</Text>
                <Text style={dynamicStyles.settingDescription}>
                  Items per sync batch
                </Text>
              </View>
              <Text style={dynamicStyles.settingValue}>
                {settings.batchSize}
              </Text>
            </View>

            <View style={[dynamicStyles.settingRow, { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={dynamicStyles.settingLabel}>Max Retries</Text>
                <Text style={dynamicStyles.settingDescription}>
                  Retry attempts for failed items
                </Text>
              </View>
              <Text style={dynamicStyles.settingValue}>
                {settings.maxRetries}
              </Text>
            </View>
          </Card>
        </View>

        {/* Manual Actions */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Manual Actions</Text>

          <View style={dynamicStyles.buttonContainer}>
            <Button
              title="Sync Now"
              onPress={handleManualSync}
              disabled={syncStatus.isSyncing}
              style={dynamicStyles.button}
            />

            <Button
              title="Force Sync (Ignore Network)"
              onPress={handleForceSync}
              disabled={syncStatus.isSyncing}
              style={StyleSheet.flatten([
                dynamicStyles.button,
                dynamicStyles.warningButton,
              ])}
            />
          </View>
        </View>

        {/* Information */}
        <View style={dynamicStyles.section}>
          <Card>
            <Text style={[dynamicStyles.sectionTitle, { marginBottom: 8 }]}>
              About Sync
            </Text>
            <Text
              style={[
                dynamicStyles.settingLabel,
                { fontSize: 14, lineHeight: 20 },
              ]}
            >
              Automatic sync keeps your data up-to-date across devices. When
              conflicts occur, the selected strategy determines which version to
              keep. Server Wins is recommended for most users to ensure data
              consistency.
            </Text>
          </Card>
        </View>

        {/* Add bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
