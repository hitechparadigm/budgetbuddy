import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, Button } from "../components/ui";
import { ExportModal } from "../components/ExportModal";
import { BackupModal } from "../components/BackupModal";
import NotificationSettings from "../components/NotificationSettings";
import FamilySettings from "../components/FamilySettings";
import CurrencySelector, {
  CurrencyDisplay,
} from "../components/CurrencySelector";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../contexts/AuthContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { useBudgets } from "../services/budget";
import { useTransactions } from "../services/transaction";
import { backupService } from "../services/backup";
import * as Haptics from "expo-haptics";

interface SettingsItem {
  id: string;
  title: string;
  subtitle?: string;
  type: "toggle" | "button" | "navigation";
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const { signOut, user } = useAuth();
  const { selectedCurrency, setSelectedCurrency } = useCurrency();
  const { data: budgets = [] } = useBudgets();
  const { data: transactions = [] } = useTransactions();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(isDark);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportType, setExportType] = useState<
    "budgets" | "transactions" | "report"
  >("budgets");
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [backupMode, setBackupMode] = useState<
    "backup" | "restore" | "settings"
  >("backup");
  const [notificationSettingsVisible, setNotificationSettingsVisible] =
    useState(false);
  const [currencySelectorVisible, setCurrencySelectorVisible] = useState(false);
  const [familySettingsVisible, setFamilySettingsVisible] = useState(false);

  const handleSignOut = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            Alert.alert("Error", "Failed to sign out. Please try again.");
          }
        },
      },
    ]);
  };

  const handleCurrencyChange = async (currency: any) => {
    try {
      await setSelectedCurrency(currency);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to change currency:", error);
      Alert.alert("Error", "Failed to change currency. Please try again.");
    }
  };

  const handleDeleteAccount = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Delete Account",
      "This action cannot be undone. Would you like to create a backup before deleting your account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Without Backup",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Account Deletion",
              "Account deletion functionality will be implemented soon.",
            );
          },
        },
        {
          text: "Backup & Delete",
          onPress: async () => {
            try {
              const result = await backupService.createPreDeletionBackup(
                budgets,
                transactions,
                user?.userId || "unknown",
              );

              if (result.success) {
                Alert.alert(
                  "Backup Created",
                  "Your data has been backed up. You can now proceed with account deletion.",
                  [
                    { text: "Cancel" },
                    {
                      text: "Delete Account",
                      style: "destructive",
                      onPress: () => {
                        Alert.alert(
                          "Account Deletion",
                          "Account deletion functionality will be implemented soon.",
                        );
                      },
                    },
                  ],
                );
              } else {
                Alert.alert(
                  "Backup Failed",
                  result.error || "Failed to create backup before deletion.",
                );
              }
            } catch (error) {
              Alert.alert(
                "Error",
                "Failed to create backup. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const accountSettings: SettingsItem[] = [
    {
      id: "profile",
      title: "Profile Settings",
      subtitle: "Update your personal information",
      type: "navigation",
      onPress: () =>
        Alert.alert("Profile", "Profile settings will be implemented soon."),
    },
    {
      id: "family",
      title: "Family Settings",
      subtitle: "Manage family members and invitations",
      type: "navigation",
      onPress: async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFamilySettingsVisible(true);
      },
    },
    {
      id: "currency",
      title: "Currency",
      subtitle: `${selectedCurrency.code} - ${selectedCurrency.name}`,
      type: "navigation",
      onPress: async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrencySelectorVisible(true);
      },
    },
  ];

  const securitySettings: SettingsItem[] = [
    {
      id: "notifications",
      title: "Notification Settings",
      subtitle: "Manage alerts and reminders",
      type: "navigation",
      onPress: async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setNotificationSettingsVisible(true);
      },
    },
    {
      id: "biometric",
      title: "Biometric Authentication",
      subtitle: "Use Face ID or Touch ID to unlock",
      type: "toggle",
      value: biometricEnabled,
      onToggle: async (value) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBiometricEnabled(value);
      },
    },
  ];

  const appSettings: SettingsItem[] = [
    {
      id: "darkMode",
      title: "Dark Mode",
      subtitle: "Use dark theme",
      type: "toggle",
      value: darkModeEnabled,
      onToggle: async (value) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setDarkModeEnabled(value);
        Alert.alert(
          "Dark Mode",
          "Dark mode toggle will be fully implemented soon.",
        );
      },
    },
    {
      id: "tutorial",
      title: "Show Tutorial",
      subtitle: "Replay the onboarding tutorial",
      type: "navigation",
      onPress: () =>
        Alert.alert("Tutorial", "Tutorial replay will be implemented soon."),
    },
  ];

  const dataSettings: SettingsItem[] = [
    {
      id: "export-budgets",
      title: "Export Budgets",
      subtitle: "Download budget data as CSV",
      type: "button",
      onPress: async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExportType("budgets");
        setExportModalVisible(true);
      },
    },
    {
      id: "export-transactions",
      title: "Export Transactions",
      subtitle: "Download transaction data as CSV",
      type: "button",
      onPress: async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExportType("transactions");
        setExportModalVisible(true);
      },
    },
    {
      id: "export-report",
      title: "Generate Report",
      subtitle: "Create monthly budget PDF report",
      type: "button",
      onPress: async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExportType("report");
        setExportModalVisible(true);
      },
    },
    {
      id: "create-backup",
      title: "Create Backup",
      subtitle: "Full backup of all your data",
      type: "button",
      onPress: async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBackupMode("backup");
        setBackupModalVisible(true);
      },
    },
    {
      id: "restore-backup",
      title: "Restore from Backup",
      subtitle: "Restore data from backup file",
      type: "button",
      onPress: async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBackupMode("restore");
        setBackupModalVisible(true);
      },
    },
    {
      id: "backup-settings",
      title: "Backup Settings",
      subtitle: "Configure automatic backups",
      type: "navigation",
      onPress: async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBackupMode("settings");
        setBackupModalVisible(true);
      },
    },
  ];

  const renderSettingsSection = (title: string, items: SettingsItem[]) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <Card style={styles.sectionCard}>
        {items.map((item, index) => (
          <View key={item.id}>
            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                {item.subtitle && (
                  <Text
                    style={[
                      styles.settingSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {item.subtitle}
                  </Text>
                )}
              </View>
              {item.type === "toggle" && (
                <Switch
                  value={item.value}
                  onValueChange={item.onToggle}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={item.value ? colors.background : colors.textMuted}
                />
              )}
              {item.type === "navigation" && (
                <Button
                  title=">"
                  onPress={item.onPress}
                  variant="ghost"
                  style={styles.navigationButton}
                />
              )}
              {item.type === "button" && (
                <Button
                  title={
                    item.id.includes("export")
                      ? "Export"
                      : item.id.includes("backup")
                        ? "Backup"
                        : "Action"
                  }
                  onPress={item.onPress}
                  variant="outline"
                  style={styles.actionButton}
                />
              )}
            </View>
            {index < items.length - 1 && (
              <View
                style={[styles.separator, { backgroundColor: colors.border }]}
              />
            )}
          </View>
        ))}
      </Card>
    </View>
  );

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your preferences</Text>

        {/* User Info */}
        <Card style={styles.userCard}>
          <Text style={styles.userEmail}>
            {user?.email || "user@example.com"}
          </Text>
          <Text style={styles.userStatus}>Premium Member</Text>
        </Card>

        {renderSettingsSection("Account", accountSettings)}
        {renderSettingsSection("Security & Privacy", securitySettings)}
        {renderSettingsSection("App Preferences", appSettings)}
        {renderSettingsSection("Data Management", dataSettings)}

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <Text style={[styles.sectionTitle, { color: colors.error }]}>
            Danger Zone
          </Text>
          <Card style={styles.sectionCard}>
            <Button
              title="Delete Account"
              onPress={handleDeleteAccount}
              variant="outline"
              style={[styles.dangerButton, { borderColor: colors.error }]}
              textStyle={{ color: colors.error }}
            />
          </Card>
        </View>

        {/* Sign Out Button */}
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="outline"
          style={styles.signOutButton}
        />

        {/* App Version */}
        <Text style={styles.version}>Version 1.0.0 (Beta)</Text>
      </ScrollView>

      <ExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        budgets={budgets}
        transactions={transactions}
        type={exportType}
      />

      <BackupModal
        visible={backupModalVisible}
        onClose={() => setBackupModalVisible(false)}
        budgets={budgets}
        transactions={transactions}
        userId={user?.userId || "unknown"}
        mode={backupMode}
      />
      {notificationSettingsVisible && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.background,
          }}
        >
          <NotificationSettings userId={user?.userId || ""} />
        </View>
      )}

      <CurrencySelector
        visible={currencySelectorVisible}
        onClose={() => setCurrencySelectorVisible(false)}
        onCurrencySelect={handleCurrencyChange}
        selectedCurrency={selectedCurrency}
      />

      {familySettingsVisible && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.background,
          }}
        >
          <FamilySettings onClose={() => setFamilySettingsVisible(false)} />
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 32,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 24,
    },
    userCard: {
      padding: 20,
      alignItems: "center",
      marginBottom: 24,
    },
    userEmail: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    userStatus: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "500",
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 12,
    },
    sectionCard: {
      padding: 0,
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: "500",
      marginBottom: 2,
    },
    settingSubtitle: {
      fontSize: 14,
    },
    separator: {
      height: 1,
      marginLeft: 16,
    },
    navigationButton: {
      minWidth: 40,
      height: 40,
    },
    actionButton: {
      minWidth: 80,
    },
    dangerZone: {
      marginBottom: 24,
    },
    dangerButton: {
      margin: 16,
    },
    signOutButton: {
      marginBottom: 16,
    },
    version: {
      textAlign: "center",
      fontSize: 12,
      color: colors.textMuted,
    },
  });
