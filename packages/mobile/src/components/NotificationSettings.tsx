/**
 * Notification Settings Component (Mobile)
 * Manages notification preferences for budget alerts and daily reminders
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Alert,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../hooks/useTheme";

interface NotificationPreferences {
  budgetAlertsEnabled: boolean;
  dailyRemindersEnabled: boolean;
  reminderTime: string; // HH:mm format
  quietHoursStart: string; // HH:mm format
  quietHoursEnd: string; // HH:mm format;
}

interface NotificationSettingsProps {
  userId: string;
}

export default function NotificationSettings({
  userId,
}: NotificationSettingsProps) {
  const { colors } = useTheme();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    budgetAlertsEnabled: true,
    dailyRemindersEnabled: true,
    reminderTime: "19:00",
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<
    "granted" | "denied" | "undetermined"
  >("undetermined");
  const [deviceToken, setDeviceToken] = useState<string | null>(null);

  // Time picker states
  const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);
  const [showQuietStartPicker, setShowQuietStartPicker] = useState(false);
  const [showQuietEndPicker, setShowQuietEndPicker] = useState(false);

  useEffect(() => {
    loadPreferences();
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(
        status === "granted"
          ? "granted"
          : status === "denied"
            ? "denied"
            : "undetermined",
      );
    } catch (error) {
      console.error("Error checking permissions:", error);
    }
  };

  const requestPermissions = async () => {
    try {
      if (!Device.isDevice) {
        Alert.alert(
          "Error",
          "Push notifications only work on physical devices",
        );
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync();

      if (status === "granted") {
        setPermissionStatus("granted");
        await registerDevice();
        Alert.alert("Success", "Notification permissions granted");
      } else {
        setPermissionStatus("denied");
        Alert.alert(
          "Permissions Required",
          "Please enable notifications in your device settings to receive budget alerts and reminders.",
        );
      }
    } catch (error) {
      console.error("Error requesting permissions:", error);
      Alert.alert("Error", "Failed to request notification permissions");
    }
  };

  const registerDevice = async () => {
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      setDeviceToken(token.data);

      // Register device with backend
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/notifications/register-device`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            deviceToken: token.data,
            platform: Platform.OS,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to register device");
      }

      console.log("Device registered successfully");
    } catch (error) {
      console.error("Error registering device:", error);
    }
  };

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/notifications/preferences?userId=${userId}`,
      );

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
      Alert.alert("Error", "Failed to load notification settings");
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences: NotificationPreferences) => {
    try {
      setSaving(true);
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/notifications/preferences`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            ...newPreferences,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to save preferences");
      }

      setPreferences(newPreferences);
    } catch (error) {
      console.error("Error saving preferences:", error);
      Alert.alert("Error", "Failed to save notification settings");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    savePreferences(newPreferences);
  };

  const handleTimeChange = (
    key: "reminderTime" | "quietHoursStart" | "quietHoursEnd",
    date: Date,
  ) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const timeString = `${hours}:${minutes}`;

    const newPreferences = { ...preferences, [key]: timeString };
    savePreferences(newPreferences);

    // Close picker
    if (key === "reminderTime") setShowReminderTimePicker(false);
    if (key === "quietHoursStart") setShowQuietStartPicker(false);
    if (key === "quietHoursEnd") setShowQuietEndPicker(false);
  };

  const parseTime = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(":").map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    return date;
  };

  const formatTime = (timeString: string): string => {
    const [hours, minutes] = timeString.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
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
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    permissionCard: {
      backgroundColor:
        permissionStatus === "granted"
          ? colors.success + "20"
          : colors.warning + "20",
      borderWidth: 1,
      borderColor:
        permissionStatus === "granted" ? colors.success : colors.warning,
    },
    permissionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    permissionIcon: {
      marginRight: 8,
    },
    permissionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: permissionStatus === "granted" ? colors.success : colors.warning,
    },
    permissionDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    permissionButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: "center",
    },
    permissionButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "600",
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
    },
    settingLeft: {
      flex: 1,
      marginRight: 16,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    timeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 8,
    },
    timeButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.primary + "20",
      borderRadius: 8,
    },
    timeText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.primary,
      marginRight: 8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 16,
    },
  });

  if (loading) {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <Text style={dynamicStyles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={dynamicStyles.container}
      contentContainerStyle={dynamicStyles.scrollContent}
    >
      {/* Permission Status */}
      <View style={dynamicStyles.section}>
        <View style={[dynamicStyles.card, dynamicStyles.permissionCard]}>
          <View style={dynamicStyles.permissionHeader}>
            <Ionicons
              name={
                permissionStatus === "granted" ? "checkmark-circle" : "warning"
              }
              size={24}
              color={
                permissionStatus === "granted" ? colors.success : colors.warning
              }
              style={dynamicStyles.permissionIcon}
            />
            <Text style={dynamicStyles.permissionTitle}>
              {permissionStatus === "granted"
                ? "Notifications Enabled"
                : "Notifications Disabled"}
            </Text>
          </View>
          <Text style={dynamicStyles.permissionDescription}>
            {permissionStatus === "granted"
              ? "You will receive budget alerts and daily reminders"
              : "Enable notifications to receive budget alerts and daily reminders"}
          </Text>
          {permissionStatus !== "granted" && (
            <TouchableOpacity
              style={dynamicStyles.permissionButton}
              onPress={requestPermissions}
            >
              <Text style={dynamicStyles.permissionButtonText}>
                Enable Notifications
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Budget Alerts */}
      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>Budget Alerts</Text>
        <View style={dynamicStyles.card}>
          <View style={dynamicStyles.settingRow}>
            <View style={dynamicStyles.settingLeft}>
              <Text style={dynamicStyles.settingTitle}>Budget Alerts</Text>
              <Text style={dynamicStyles.settingDescription}>
                Get notified when you reach 80%, 90%, or 100% of your budget
              </Text>
            </View>
            <Switch
              value={preferences.budgetAlertsEnabled}
              onValueChange={(value) =>
                handleToggle("budgetAlertsEnabled", value)
              }
              trackColor={{ false: colors.border, true: colors.primary + "40" }}
              thumbColor={
                preferences.budgetAlertsEnabled
                  ? colors.primary
                  : colors.textSecondary
              }
              disabled={saving}
            />
          </View>
        </View>
      </View>

      {/* Daily Reminders */}
      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>Daily Reminders</Text>
        <View style={dynamicStyles.card}>
          <View style={dynamicStyles.settingRow}>
            <View style={dynamicStyles.settingLeft}>
              <Text style={dynamicStyles.settingTitle}>Daily Reminders</Text>
              <Text style={dynamicStyles.settingDescription}>
                Get reminded to log your daily expenses
              </Text>
            </View>
            <Switch
              value={preferences.dailyRemindersEnabled}
              onValueChange={(value) =>
                handleToggle("dailyRemindersEnabled", value)
              }
              trackColor={{ false: colors.border, true: colors.primary + "40" }}
              thumbColor={
                preferences.dailyRemindersEnabled
                  ? colors.primary
                  : colors.textSecondary
              }
              disabled={saving}
            />
          </View>

          {preferences.dailyRemindersEnabled && (
            <View style={dynamicStyles.timeRow}>
              <View style={dynamicStyles.settingLeft}>
                <Text style={dynamicStyles.settingTitle}>Reminder Time</Text>
                <Text style={dynamicStyles.settingDescription}>
                  When to send daily reminders
                </Text>
              </View>
              <TouchableOpacity
                style={dynamicStyles.timeButton}
                onPress={() => setShowReminderTimePicker(true)}
                disabled={saving}
              >
                <Text style={dynamicStyles.timeText}>
                  {formatTime(preferences.reminderTime)}
                </Text>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Quiet Hours */}
      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>Quiet Hours</Text>
        <View style={dynamicStyles.card}>
          <View style={dynamicStyles.timeRow}>
            <View style={dynamicStyles.settingLeft}>
              <Text style={dynamicStyles.settingTitle}>Start Time</Text>
              <Text style={dynamicStyles.settingDescription}>
                When quiet hours begin
              </Text>
            </View>
            <TouchableOpacity
              style={dynamicStyles.timeButton}
              onPress={() => setShowQuietStartPicker(true)}
              disabled={saving}
            >
              <Text style={dynamicStyles.timeText}>
                {formatTime(preferences.quietHoursStart)}
              </Text>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={dynamicStyles.timeRow}>
            <View style={dynamicStyles.settingLeft}>
              <Text style={dynamicStyles.settingTitle}>End Time</Text>
              <Text style={dynamicStyles.settingDescription}>
                When quiet hours end
              </Text>
            </View>
            <TouchableOpacity
              style={dynamicStyles.timeButton}
              onPress={() => setShowQuietEndPicker(true)}
              disabled={saving}
            >
              <Text style={dynamicStyles.timeText}>
                {formatTime(preferences.quietHoursEnd)}
              </Text>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Time Pickers */}
      {showReminderTimePicker && (
        <DateTimePicker
          value={parseTime(preferences.reminderTime)}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={(event, selectedDate) => {
            if (event.type === "set" && selectedDate) {
              handleTimeChange("reminderTime", selectedDate);
            } else {
              setShowReminderTimePicker(false);
            }
          }}
        />
      )}

      {showQuietStartPicker && (
        <DateTimePicker
          value={parseTime(preferences.quietHoursStart)}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={(event, selectedDate) => {
            if (event.type === "set" && selectedDate) {
              handleTimeChange("quietHoursStart", selectedDate);
            } else {
              setShowQuietStartPicker(false);
            }
          }}
        />
      )}

      {showQuietEndPicker && (
        <DateTimePicker
          value={parseTime(preferences.quietHoursEnd)}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={(event, selectedDate) => {
            if (event.type === "set" && selectedDate) {
              handleTimeChange("quietHoursEnd", selectedDate);
            } else {
              setShowQuietEndPicker(false);
            }
          }}
        />
      )}
    </ScrollView>
  );
}
