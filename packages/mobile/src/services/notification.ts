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
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Budget usage alert (e.g. 80%/90%/100% of budget spent)
 */
export interface BudgetAlert {
  budgetId: string;
  budgetName: string;
  threshold: number;
  currentAmount: number;
  budgetAmount: number;
  percentage: number;
}

/**
 * Upcoming/due recurring budget (bill) reminder
 */
export interface BillReminder {
  budgetId: string;
  budgetName: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
}

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
      this.markNotificationAsRead(String(data.notificationId));
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

/**
 * Local preferences shape used by the daily/weekly/monthly reminder helpers
 * below. This is intentionally simpler than the backend
 * NotificationPreferences (server-synced alerts); it only covers
 * locally-scheduled reminder behavior.
 */
export interface LocalNotificationPreferences {
  budgetAlerts: boolean;
  billReminders: boolean;
  weeklyReports: boolean;
  monthlyReports: boolean;
  dailyExpenseReminder: boolean;
  dailyReminderTime: string; // "HH:mm"
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "HH:mm"
  quietHoursEnd: string; // "HH:mm"
}

const DEFAULT_LOCAL_PREFERENCES: LocalNotificationPreferences = {
  budgetAlerts: true,
  billReminders: true,
  weeklyReports: true,
  monthlyReports: true,
  dailyExpenseReminder: false,
  dailyReminderTime: '20:00',
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
}

const LOCAL_PREFERENCES_STORAGE_KEY = 'budgetbuddy_local_notification_preferences';

/**
 * Local, on-device notification helper singleton.
 *
 * This is distinct from the `NotificationService` class above (which handles
 * device registration and inbound push notification listeners). This
 * singleton schedules local notifications directly on the device for
 * budget alerts, bill reminders, and periodic spending summaries - used by
 * `budgetMonitoringService`.
 */
export class LocalNotificationService {
  private preferences: LocalNotificationPreferences = { ...DEFAULT_LOCAL_PREFERENCES };
  private initialized = false;

  async initialize(): Promise<void> {
    await this.loadPreferences();
    this.initialized = true;
  }

  async loadPreferences(): Promise<LocalNotificationPreferences> {
    try {
      const stored = await AsyncStorage.getItem(LOCAL_PREFERENCES_STORAGE_KEY);
      if (stored) {
        this.preferences = { ...DEFAULT_LOCAL_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading local notification preferences:', error);
    }
    return this.preferences;
  }

  async savePreferences(preferences: Partial<LocalNotificationPreferences>): Promise<void> {
    this.preferences = { ...this.preferences, ...preferences };
    try {
      await AsyncStorage.setItem(
        LOCAL_PREFERENCES_STORAGE_KEY,
        JSON.stringify(this.preferences)
      );
    } catch (error) {
      console.error('Error saving local notification preferences:', error);
    }
  }

  getPreferences(): LocalNotificationPreferences {
    return this.preferences;
  }

  /**
   * Returns true if the given time (defaults to now) falls within the
   * configured quiet hours window. Handles windows that wrap past midnight
   * (e.g. 22:00 -> 08:00).
   */
  private isQuietTime(date: Date = new Date()): boolean {
    if (!this.preferences.quietHoursEnabled) {
      return false;
    }

    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const nowMinutes = date.getHours() * 60 + date.getMinutes();
    const startMinutes = toMinutes(this.preferences.quietHoursStart);
    const endMinutes = toMinutes(this.preferences.quietHoursEnd);

    if (startMinutes === endMinutes) {
      return false;
    }

    if (startMinutes < endMinutes) {
      return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    }

    // Window wraps past midnight (e.g. 22:00 -> 08:00)
    return nowMinutes >= startMinutes || nowMinutes < endMinutes;
  }

  private shouldSendNotification(): boolean {
    return !this.isQuietTime();
  }

  async sendBudgetAlert(alert: BudgetAlert): Promise<void> {
    if (!this.preferences.budgetAlerts || !this.shouldSendNotification()) {
      return;
    }

    await scheduleLocalNotification(
      `Budget Alert: ${alert.budgetName}`,
      `You've reached ${alert.threshold}% of your ${alert.budgetName} budget ($${alert.currentAmount.toFixed(2)} of $${alert.budgetAmount.toFixed(2)}).`,
      null
    );
  }

  async sendBillReminder(reminder: BillReminder): Promise<void> {
    if (!this.preferences.billReminders || !this.shouldSendNotification()) {
      return;
    }

    const dueText =
      reminder.daysUntilDue === 0
        ? 'due today'
        : `due in ${reminder.daysUntilDue} day${reminder.daysUntilDue === 1 ? '' : 's'}`;

    await scheduleLocalNotification(
      `Bill Reminder: ${reminder.budgetName}`,
      `${reminder.budgetName} ($${reminder.amount.toFixed(2)}) is ${dueText}.`,
      null
    );
  }

  async sendWeeklySummary(
    totalSpent: number,
    budgetTotal: number,
    topCategories: Array<{ name: string; amount: number }>
  ): Promise<void> {
    if (!this.preferences.weeklyReports || !this.shouldSendNotification()) {
      return;
    }

    const topCategoryText = topCategories.length > 0
      ? ` Top category: ${topCategories[0].name}.`
      : '';

    await scheduleLocalNotification(
      'Weekly Spending Summary',
      `You spent $${totalSpent.toFixed(2)} of $${budgetTotal.toFixed(2)} this week.${topCategoryText}`,
      null
    );
  }

  async sendMonthlySummary(
    totalSpent: number,
    budgetTotal: number,
    savings: number,
    topCategories: Array<{ name: string; amount: number }>
  ): Promise<void> {
    if (!this.preferences.monthlyReports || !this.shouldSendNotification()) {
      return;
    }

    const topCategoryText = topCategories.length > 0
      ? ` Top category: ${topCategories[0].name}.`
      : '';

    await scheduleLocalNotification(
      'Monthly Spending Summary',
      `You spent $${totalSpent.toFixed(2)} of $${budgetTotal.toFixed(2)} this month and saved $${savings.toFixed(2)}.${topCategoryText}`,
      null
    );
  }

  async sendDailyExpenseReminder(): Promise<void> {
    if (!this.preferences.dailyExpenseReminder || !this.shouldSendNotification()) {
      return;
    }

    await scheduleLocalNotification(
      'Daily Expense Reminder',
      "Don't forget to log today's transactions!",
      null
    );
  }
}

// Export singleton instance used by budgetMonitoringService
export const notificationService = new LocalNotificationService();
