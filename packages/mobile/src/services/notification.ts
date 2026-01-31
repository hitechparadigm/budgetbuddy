/**
 * Notification Service
 *
 * Handles push notification registration and management for mobile app.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Must use physical device for push notifications');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push notification permissions');
    return false;
  }

  return true;
}

/**
 * Get Expo push token
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    return token.data;
  } catch (error) {
    console.error('Error getting Expo push token:', error);
    return null;
  }
}

/**
 * Register device for push notifications
 */
export async function registerForPushNotifications(
  userId: string,
  apiClient: any
): Promise<{ success: boolean; token?: string }> {
  try {
    // Request permissions
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return { success: false };
    }

    // Get push token
    const token = await getExpoPushToken();
    if (!token) {
      return { success: false };
    }

    // Register with backend
    await apiClient.post('/notifications/register', {
      userId,
      deviceToken: token,
      platform: Platform.OS,
    });

    return { success: true, token };
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return { success: false };
  }
}

/**
 * Unregister device from push notifications
 */
export async function unregisterFromPushNotifications(
  userId: string,
  token: string,
  apiClient: any
): Promise<boolean> {
  try {
    await apiClient.delete('/notifications/register', {
      data: {
        userId,
        deviceToken: token,
      },
    });

    return true;
  } catch (error) {
    console.error('Error unregistering from push notifications:', error);
    return false;
  }
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener (when user taps notification)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Schedule local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger,
  });
}

/**
 * Cancel scheduled notification
 */
export async function cancelScheduledNotification(
  notificationId: string
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get notification preferences
 */
export async function getNotificationPreferences(
  userId: string,
  apiClient: any
): Promise<any> {
  try {
    const response = await apiClient.get(`/notifications/preferences?userId=${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return null;
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: any,
  apiClient: any
): Promise<boolean> {
  try {
    await apiClient.put('/notifications/preferences', {
      userId,
      preferences,
    });
    return true;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return false;
  }
}
