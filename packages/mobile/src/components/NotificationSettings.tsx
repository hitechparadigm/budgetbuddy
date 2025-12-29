/**
 * Notification Settings Component
 * Manages notification preferences and settings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Alert,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card, Button, Input } from './ui';
import { useTheme } from '../hooks/useTheme';
import { notificationService, NotificationPreferences } from '../services/notification';

interface NotificationSettingsProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationSettings({
  visible,
  onClose,
}: NotificationSettingsProps) {
  const { colors } = useTheme();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const prefs = await notificationService.loadPreferences();
      const status = await notificationService.getPermissionStatus();
      setPreferences(prefs);
      setPermissionStatus(status);
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      Alert.alert('Error', 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: any) => {
    if (!preferences) return;

    try {
      const newPreferences = { ...preferences, [key]: value };
      setPreferences(newPreferences);
      await notificationService.savePreferences({ [key]: value });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Failed to update preference:', error);
      Alert.alert('Error', 'Failed to update notification setting');
    }
  };

  const requestPermissions = async () => {
    try {
      const granted = await notificationService.requestPermissions();
      if (granted) {
        setPermissionStatus('granted');
        await updatePreference('pushNotifications', true);
        Alert.alert('Success', 'Notification permissions granted');
      } else {
        Alert.alert(
          'Permissions Required',
          'Please enable notifications in your device settings to receive budget alerts and reminders.'
        );
      }
    } catch (error) {
      console.error('Failed to request permissions:', error);
      Alert.alert('Error', 'Failed to request notification permissions');
    }
  };

  const testNotification = async () => {
    try {
      await notificationService.sendBudgetAlert({
        budgetId: 'test',
        budgetName: 'Groceries',
        threshold: 80,
        currentAmount: 400,
        budgetAmount: 500,
        percentage: 80,
      });
      Alert.alert('Test Sent', 'A test notification has been sent');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to send test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    closeButton: {
      padding: 8,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: 8,
      marginBottom: 8,
    },
    settingLeft: {
      flex: 1,
      marginRight: 16,
    },
    settingTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 2,
    },
    settingDescription: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    permissionCard: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 8,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: permissionStatus === 'granted' ? colors.success : colors.warning,
    },
    permissionStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    permissionIcon: {
      marginRight: 8,
    },
    permissionText: {
      fontSize: 14,
      fontWeight: '500',
      color: permissionStatus === 'granted' ? colors.success : colors.warning,
    },
    permissionDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    timeSettingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: 8,
      marginBottom: 8,
    },
    timeValue: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '500',
    },
    testButton: {
      marginTop: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 16,
    },
  });

  if (!visible) return null;

  if (loading || !preferences) {
    return (
      <View style={dynamicStyles.container}>
        <View style={dynamicStyles.header}>
          <Text style={dynamicStyles.headerTitle}>Notification Settings</Text>
          <Pressable style={dynamicStyles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>
        <View style={dynamicStyles.loadingContainer}>
          <Text style={dynamicStyles.loadingText}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.headerTitle}>Notification Settings</Text>
        <Pressable style={dynamicStyles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView style={dynamicStyles.content} showsVerticalScrollIndicator={false}>
        {/* Permission Status */}
        <Card variant="elevated" style={dynamicStyles.permissionCard}>
          <View style={dynamicStyles.permissionStatus}>
            <Ionicons
              name={permissionStatus === 'granted' ? 'checkmark-circle' : 'warning'}
              size={20}
              color={permissionStatus === 'granted' ? colors.success : colors.warning}
              style={dynamicStyles.permissionIcon}
            />
            <Text style={dynamicStyles.permissionText}>
              {permissionStatus === 'granted' ? 'Notifications Enabled' : 'Notifications Disabled'}
            </Text>
          </View>
          <Text style={dynamicStyles.permissionDescription}>
            {permissionStatus === 'granted'
              ? 'You will receive budget alerts and reminders'
              : 'Enable notifications to receive budget alerts and bill reminders'
            }
          </Text>
          {permissionStatus !== 'granted' && (
            <Button
              title="Enable Notifications"
              onPress={requestPermissions}
              variant="primary"
            />
          )}
        </Card>

        {/* Push Notifications */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Push Notifications</Text>

          <View style={dynamicStyles.settingItem}>
            <View style={dynamicStyles.settingLeft}>
              <Text style={dynamicStyles.settingTitle}>Push Notifications</Text>
              <Text style={dynamicStyles.settingDescription}>
                Receive notifications on your device
              </Text>
            </View>
            <Switch
              value={preferences.pushNotifications}
              onValueChange={(value) => updatePreference('pushNotifications', value)}
              trackColor={{ false: colors.border, true: colors.primary + '40' }}
              thumbColor={preferences.pushNotifications ? colors.primary : colors.textSecondary}
            />
          </View>
        </View>

        {/* Budget Alerts */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Budget Alerts</Text>

          <View style={dynamicStyles.settingItem}>
            <View style={dynamicStyles.settingLeft}>
              <Text style={dynamicStyles.settingTitle}>Budget Limit Alerts</Text>
              <Text style={dynamicStyles.settingDescription}>
                Get notified when you reach 80%, 90%, or 100% of your budget
              </Text>
            </View>
            <Switch
              value={preferences.budgetAlerts}
              onValueChange={(value) => updatePreference('budgetAlerts', value)}
              trackColor={{ false: colors.border, true: colors.primary + '40' }}
              thumbColor={preferences.budgetAlerts ? colors.primary : colors.textSecondary}
            />
          </View>

          <View style={dynamicStyles.settingItem}>
            <View style={dynamicStyles.settingLeft}>
              <Text style={dynamicStyles.settingTitle}>Overspending Alerts</Text>
              <Text style={dynamicStyles.settingDescription}>
                Get notified when you exceed your budget
              </Text>
            </View>
            <Switch
              value={preferences.overspendingAlerts}
              onValueChange={(value) => updatePreference('overspendingAlerts', value)}
              trackColor={{ false: colors.border, true: colors.primary + '40' }}
              thumbColor={preferences.overspendingAlerts ? colors.primary : colors.textSecondary}
            />
          </View>
        </View>

        {/* Bill Reminders */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Reminders</Text>

          <View style={dynamicStyles.settingItem}>
            <View style={dynamicStyles.settingLeft}>
              <Text style={dynamicStyles.settingTitle}>Bill Reminders</Text>
              <Text style={dynamicStyles.settingDescription}>
                Get reminded about upcoming recurring bills
              </Text>
            </View>
            <Switch
              value={preferences.billReminders}
              onValueChange={(value) => updatePreference('billReminders', value)}
              trackColor={{ false: colors.border, true: colors.primary + '40' }}
              thumbColor={preferences.billReminders ? colors.primary : colors.textSecondary}
            />
          </View>

          <View style={dynamicStyles.settingItem}>
            <View style={dynamicStyles.settingLeft}>
              <Text style={dynamicStyles.settingTitle}>Daily Expense Reminder</Text>
              <Text style={dynamicStyles.settingDescription}>
                Get reminded to log your daily expenses
              </Text>
            </View>
            <Switch
              value={preferences.dailyExpenseReminder}
              onValueChange={(value) => updatePreference('dailyExpenseReminder', value)}
              trackColor={{ false: colors.border, true: colors.primary + '40' }}
              thumbColor={preferences.dailyExpenseReminder ? colors.primary : colors.textSecondary}
            />
          </View>

          {preferences.dailyExpenseReminder && (
            <Pressable
              style={dynamicStyles.timeSettingItem}
              onPress={() => {
                // TODO: Implement time picker
                Alert.alert('Time Picker', 'Time picker will be implemented');
              }}
            >
              <View style={dynamicStyles.settingLeft}>
                <Text style={dynamicStyles.settingTitle}>Daily Reminder Time</Text>
                <Text style={dynamicStyles.settingDescription}>
                  When to send daily expense reminders
                </Text>
              </View>
              <Text style={dynamicStyles.timeValue}>
                {formatTime(preferences.dailyReminderTime)}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Summary Notifications */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Summary Reports</Text>

          <View style={dynamicStyles.settingItem}>
            <View style={dynamicStyles.settingLeft}>
              <Text style={dynamicStyles.settingTitle}>Weekly Summary</Text>
              <Text style={dynamicStyles.settingDescription}>
                Get a weekly spending summary every Sunday
              </Text>
            </View>
            <Switch
              value={preferences.weeklySummary}
              onValueChange={(value) => updatePreference('weeklySummary', value)}
              trackColor={{ false: colors.border, true: colors.primary + '40' }}
              thumbColor={preferences.weeklySummary ? colors.primary : colors.textSecondary}
            />
          </View>

          <View style={dynamicStyles.settingItem}>
            <View style={dynamicStyles.settingLeft}>
              <Text style={dynamicStyles.settingTitle}>Monthly Summary</Text>
              <Text style={dynamicStyles.settingDescription}>
                Get a monthly financial summary at month end
              </Text>
            </View>
            <Switch
              value={preferences.monthlySummary}
              onValueChange={(value) => updatePreference('monthlySummary', value)}
              trackColor={{ false: colors.border, true: colors.primary + '40' }}
              thumbColor={preferences.monthlySummary ? colors.primary : colors.textSecondary}
            />
          </View>
        </View>

        {/* Sound & Vibration */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Sound & Vibration</Text>

          <View style={dynamicStyles.settingItem}>
            <View style={dynamicStyles.settingLeft}>
              <Text style={dynamicStyles.settingTitle}>Sound</Text>
              <Text style={dynamicStyles.settingDescription}>
                Play sound with notifications
              </Text>
            </View>
            <Switch
              value={preferences.soundEnabled}
              onValueChange={(value) => updatePreference('soundEnabled', value)}
              trackColor={{ false: colors.border, true: colors.primary + '40' }}
              thumbColor={preferences.soundEnabled ? colors.primary : colors.textSecondary}
            />
          </View>

          <View style={dynamicStyles.settingItem}>
            <View style={dynamicStyles.settingLeft}>
              <Text style={dynamicStyles.settingTitle}>Vibration</Text>
              <Text style={dynamicStyles.settingDescription}>
                Vibrate device with notifications
              </Text>
            </View>
            <Switch
              value={preferences.vibrationEnabled}
              onValueChange={(value) => updatePreference('vibrationEnabled', value)}
              trackColor={{ false: colors.border, true: colors.primary + '40' }}
              thumbColor={preferences.vibrationEnabled ? colors.primary : colors.textSecondary}
            />
          </View>
        </View>

        {/* Quiet Hours */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Quiet Hours</Text>

          <View style={dynamicStyles.settingItem}>
            <View style={dynamicStyles.settingLeft}>
              <Text style={dynamicStyles.settingTitle}>Enable Quiet Hours</Text>
              <Text style={dynamicStyles.settingDescription}>
                Disable notifications during specified hours
              </Text>
            </View>
            <Switch
              value={preferences.quietHoursEnabled}
              onValueChange={(value) => updatePreference('quietHoursEnabled', value)}
              trackColor={{ false: colors.border, true: colors.primary + '40' }}
              thumbColor={preferences.quietHoursEnabled ? colors.primary : colors.textSecondary}
            />
          </View>

          {preferences.quietHoursEnabled && (
            <>
              <Pressable
                style={dynamicStyles.timeSettingItem}
                onPress={() => {
                  // TODO: Implement time picker
                  Alert.alert('Time Picker', 'Time picker will be implemented');
                }}
              >
                <View style={dynamicStyles.settingLeft}>
                  <Text style={dynamicStyles.settingTitle}>Start Time</Text>
                  <Text style={dynamicStyles.settingDescription}>
                    When quiet hours begin
                  </Text>
                </View>
                <Text style={dynamicStyles.timeValue}>
                  {formatTime(preferences.quietHoursStart)}
                </Text>
              </Pressable>

              <Pressable
                style={dynamicStyles.timeSettingItem}
                onPress={() => {
                  // TODO: Implement time picker
                  Alert.alert('Time Picker', 'Time picker will be implemented');
                }}
              >
                <View style={dynamicStyles.settingLeft}>
                  <Text style={dynamicStyles.settingTitle}>End Time</Text>
                  <Text style={dynamicStyles.settingDescription}>
                    When quiet hours end
                  </Text>
                </View>
                <Text style={dynamicStyles.timeValue}>
                  {formatTime(preferences.quietHoursEnd)}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Test Notification */}
        <View style={dynamicStyles.section}>
          <Button
            title="Send Test Notification"
            onPress={testNotification}
            variant="outline"
            style={dynamicStyles.testButton}
            disabled={!preferences.pushNotifications || permissionStatus !== 'granted'}
          />
        </View>
      </ScrollView>
    </View>
  );
}
