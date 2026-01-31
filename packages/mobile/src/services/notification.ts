/**
 * Notification Service
 *
 * Handles push notification registration, management, and event handling for mobile app.
 * Provides a centralized service for managing push notifications with proper lifecycle management.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
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
 * NotificationService Class
 * Centralized service for managing push notifications with proper lifecycle management
 */
export class NotificationService {
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private deviceToken: string | null = null;
  private apiClient: any = null;
  private navigationCallback: ((notification: any) => void) | null = null;

  /**
   * Initialize the notification service
   */
  constructor(apiClient: any) {
    this.apiClient = apiClient;
  }

  /**
   * Register device for push notifications
   * Requests permissions, gets push token, and registers with backend
   */
  async registerDevice(userId: string): Promise<{ success: boolean; token?: string; deviceId?: string }> {
    try {
      // Check if running on physical device
      if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return { success: false };
      }

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Push notification permissions denied');
        return { success: false };
      }

      // Get Expo push token
      const token = await this.getExpoPushToken();
      if (!token) {
        console.log('Failed to get Expo push token');
        return { success: false };
      }

      this.deviceToken = token;

      // Register with backend
      const response = await this.apiClient.post('/notifications/register-device', {
        token,
        platform: Platform.OS,
        deviceName: Device.deviceName || `${Platform.OS} Device`,
      });

      console.log('Device registered for push notifications:', response.data.deviceId);

      return {
        success: true,
        token,
        deviceId: response.data.deviceId,
      };
    } catch (error) {
      console.error('Error registering device for push notifications:', error);
      return { success: false };
    }
  }

  /**
   * Setup notification handlers
   * Configures listeners for received notifications and user interactions
   */
  setupNotificationHandlers(onNavigate?: (notification: any) => void): void {
    // Store navigation callback
    if (onNavigate) {
      this.navigationCallback = onNavigate;
    }

    // Remove existing listeners
    this.removeNotificationHandlers();

    // Add listener for notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    // Add listener for user tapping on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    console.log('Notification handlers setup complete');
  }

  /**
   * Handle notification received (foreground)
   * Shows in-app banner and logs the notification
   */
  private handleNotificationReceived(notification: Notifications.Notification): void {
    console.log('Notification received:', notification);

    const { title, body, data } = notification.request.content;

    // Show in-app alert for foreground notifications
    Alert.alert(
      title || 'Notification',
      body || '',
      [
        {
          text: 'Dismiss',
          style: 'cancel',
        },
        {
          text: 'View',
          onPress: () => {
            // Navigate to appropriate screen
            if (this.navigationCallback && data) {
              this.navigationCallback(data);
            }
          },
        },
      ]
    );

    // Log notification for analytics
    this.logNotification(notification);
  }

  /**
   * Handle notification tap (user interaction)
   * Parses notification data and navigates to appropriate screen
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    console.log('Notification tapped:', response);

    const { data } = response.notification.request.content;

    // Navigate to appropriate screen based on notification type
    if (this.navigationCallback && data) {
      this.navigationCallback(data);
    }

    // Mark notification as read
    if (data?.notificationId) {
      this.markNotificationAsRead(data.notificationId);
    }
  }

  /**
   * Log notification for analytics
   */
  private logNotification(notification: Notifications.Notification): void {
    // TODO: Implement analytics logging
    console.log('Logging notification:', {
      id: notification.request.identifier,
      title: notification.request.content.title,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Mark notification as read
   */
  private async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await this.apiClient.put(`/notifications/${notificationId}/read`);
      console.log('Notification marked as read:', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Remove notification handlers
   * Cleans up listeners to prevent memory leaks
   */
  removeNotificationHandlers(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }

    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }

    console.log('Notification handlers removed');
  }

  /**
   * Request notification permissions
   */
  private async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  /**
   * Get Expo push token
   */
  private async getExpoPushToken(): Promise<string | null> {
    try {
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
   * Get device token
   */
  getDeviceToken(): string | null {
    return this.deviceToken;
  }

  /**
   * Cleanup service
   * Removes all listeners and clears state
   */
  cleanup(): void {
    this.removeNotificationHandlers();
    this.deviceToken = null;
    this.navigationCallback = null;
  }
}

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
