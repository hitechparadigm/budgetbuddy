/**
 * Notification Service
 * Handles push notifications and local notifications for mobile app
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
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

export interface NotificationPreferences {
  budgetAlerts: boolean;
  overspendingAlerts: boolean;
  billReminders: boolean;
  dailyExpenseReminder: boolean;
  dailyReminderTime: string; // HH:MM format
  weeklySummary: boolean;
  monthlySummary: boolean;
  pushNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string; // HH:MM format
}

export interface BudgetAlert {
  budgetId: string;
  budgetName: string;
  threshold: number; // 80, 90, 100 (percentage)
  currentAmount: number;
  budgetAmount: number;
  percentage: number;
}

export interface BillReminder {
  budgetId: string;
  budgetName: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
}

const STORAGE_KEYS = {
  NOTIFICATION_PREFERENCES: 'notification_preferences',
  PUSH_TOKEN: 'push_token',
  NOTIFICATION_PERMISSIONS: 'notification_permissions',
} as const;

const DEFAULT_PREFERENCES: NotificationPreferences = {
  budgetAlerts: true,
  overspendingAlerts: true,
  billReminders: true,
  dailyExpenseReminder: true,
  dailyReminderTime: '19:00', // 7 PM default
  weeklySummary: true,
  monthlySummary: true,
  pushNotifications: true,
  soundEnabled: true,
  vibrationEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

class NotificationService {
  private pushToken: string | null = null;
  private preferences: NotificationPreferences = DEFAULT_PREFERENCES;

  /**
   * Initialize notification service
   */
  async initialize(): Promise<void> {
    try {
      // Load preferences from storage
      await this.loadPreferences();

      // Request permissions and get push token
      if (this.preferences.pushNotifications) {
        await this.requestPermissions();
        await this.registerForPushNotifications();
      }

      // Set up notification listeners
      this.setupNotificationListeners();
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return false;
      }

      // Store permission status
      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICATION_PERMISSIONS,
        JSON.stringify({ granted: true, timestamp: Date.now() })
      );

      return true;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  /**
   * Register for push notifications and get token
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        return null;
      }

      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      this.pushToken = tokenData.data;

      // Store token
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, this.pushToken);

      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      console.log('Push token registered:', this.pushToken);
      return this.pushToken;
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
      return null;
    }
  }

  /**
   * Setup Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    await Notifications.setNotificationChannelAsync('budget-alerts', {
      name: 'Budget Alerts',
      description: 'Notifications about budget limits and overspending',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B6B',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('bill-reminders', {
      name: 'Bill Reminders',
      description: 'Reminders for upcoming bills and recurring expenses',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4ECDC4',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('summaries', {
      name: 'Financial Summaries',
      description: 'Weekly and monthly spending summaries',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#45B7D1',
      sound: 'default',
    });
  }

  /**
   * Setup notification event listeners
   */
  private setupNotificationListeners(): void {
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    // Handle notification tapped
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
      this.handleNotificationTap(response);
    });
  }

  /**
   * Handle notification tap actions
   */
  private handleNotificationTap(response: Notifications.NotificationResponse): void {
    const { notification } = response;
    const data = notification.request.content.data;

    // Navigate based on notification type
    switch (data?.type) {
      case 'budget-alert':
        // Navigate to budget screen
        console.log('Navigate to budget:', data.budgetId);
        break;
      case 'bill-reminder':
        // Navigate to transaction entry with pre-filled data
        console.log('Navigate to add transaction for bill:', data.budgetId);
        break;
      case 'daily-reminder':
        // Navigate to add transaction screen
        console.log('Navigate to add transaction screen');
        break;
      case 'summary':
        // Navigate to summary screen
        console.log('Navigate to summary screen');
        break;
      default:
        console.log('Unknown notification type:', data?.type);
    }
  }

  /**
   * Send budget alert notification
   */
  async sendBudgetAlert(alert: BudgetAlert): Promise<void> {
    if (!this.preferences.budgetAlerts || !this.shouldSendNotification()) {
      return;
    }

    const title = `Budget Alert: ${alert.budgetName}`;
    let body: string;

    if (alert.percentage >= 100) {
      body = `You've exceeded your budget by $${(alert.currentAmount - alert.budgetAmount).toFixed(2)}`;
    } else {
      body = `You've used ${alert.percentage}% of your budget ($${alert.currentAmount.toFixed(2)} of $${alert.budgetAmount.toFixed(2)})`;
    }

    await this.scheduleLocalNotification({
      title,
      body,
      data: {
        type: 'budget-alert',
        budgetId: alert.budgetId,
        threshold: alert.threshold,
      },
      categoryIdentifier: 'budget-alerts',
    });
  }

  /**
   * Send bill reminder notification
   */
  async sendBillReminder(reminder: BillReminder): Promise<void> {
    if (!this.preferences.billReminders || !this.shouldSendNotification()) {
      return;
    }

    const title = `Bill Reminder: ${reminder.budgetName}`;
    const body = reminder.daysUntilDue === 0
      ? `Your bill of $${reminder.amount.toFixed(2)} is due today`
      : `Your bill of $${reminder.amount.toFixed(2)} is due in ${reminder.daysUntilDue} day${reminder.daysUntilDue > 1 ? 's' : ''}`;

    await this.scheduleLocalNotification({
      title,
      body,
      data: {
        type: 'bill-reminder',
        budgetId: reminder.budgetId,
        amount: reminder.amount,
        dueDate: reminder.dueDate,
      },
      categoryIdentifier: 'bill-reminders',
    });
  }

  /**
   * Send daily expense reminder notification
   */
  async sendDailyExpenseReminder(): Promise<void> {
    if (!this.preferences.dailyExpenseReminder || !this.shouldSendNotification()) {
      return;
    }

    const title = 'Daily Expense Reminder';
    const body = 'Don\'t forget to log your expenses for today! Keep your budget on track.';

    await this.scheduleLocalNotification({
      title,
      body,
      data: {
        type: 'daily-reminder',
        timestamp: Date.now(),
      },
      categoryIdentifier: 'summaries',
    });
  }

  /**
   * Send weekly summary notification
   */
  async sendWeeklySummary(totalSpent: number, budgetTotal: number, topCategories: Array<{ name: string; amount: number }>): Promise<void> {
    if (!this.preferences.weeklySummary || !this.shouldSendNotification()) {
      return;
    }

    const title = 'Weekly Spending Summary';
    const percentage = budgetTotal > 0 ? Math.round((totalSpent / budgetTotal) * 100) : 0;
    const topCategory = topCategories[0];

    const body = `You spent $${totalSpent.toFixed(2)} this week (${percentage}% of budget)${topCategory ? `. Top category: ${topCategory.name} ($${topCategory.amount.toFixed(2)})` : ''
      }`;

    await this.scheduleLocalNotification({
      title,
      body,
      data: {
        type: 'summary',
        period: 'weekly',
        totalSpent,
        budgetTotal,
        topCategories,
      },
      categoryIdentifier: 'summaries',
    });
  }

  /**
   * Send monthly summary notification
   */
  async sendMonthlySummary(totalSpent: number, budgetTotal: number, savings: number, topCategories: Array<{ name: string; amount: number }>): Promise<void> {
    if (!this.preferences.monthlySummary || !this.shouldSendNotification()) {
      return;
    }

    const title = 'Monthly Financial Summary';
    const percentage = budgetTotal > 0 ? Math.round((totalSpent / budgetTotal) * 100) : 0;

    const body = `This month: Spent $${totalSpent.toFixed(2)} (${percentage}% of budget), Saved $${savings.toFixed(2)}`;

    await this.scheduleLocalNotification({
      title,
      body,
      data: {
        type: 'summary',
        period: 'monthly',
        totalSpent,
        budgetTotal,
        savings,
        topCategories,
      },
      categoryIdentifier: 'summaries',
    });
  }

  /**
   * Schedule a local notification
   */
  private async scheduleLocalNotification(content: {
    title: string;
    body: string;
    data?: any;
    categoryIdentifier?: string;
  }): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: content.data,
          sound: this.preferences.soundEnabled ? 'default' : undefined,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  /**
   * Check if notification should be sent based on quiet hours
   */
  private shouldSendNotification(): boolean {
    if (!this.preferences.quietHoursEnabled) {
      return true;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const { quietHoursStart, quietHoursEnd } = this.preferences;

    // Handle quiet hours that span midnight
    if (quietHoursStart > quietHoursEnd) {
      return currentTime < quietHoursStart && currentTime >= quietHoursEnd;
    } else {
      return currentTime < quietHoursStart || currentTime >= quietHoursEnd;
    }
  }

  /**
   * Load notification preferences from storage
   */
  async loadPreferences(): Promise<NotificationPreferences> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_PREFERENCES);
      if (stored) {
        this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
      return this.preferences;
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      return DEFAULT_PREFERENCES;
    }
  }

  /**
   * Save notification preferences to storage
   */
  async savePreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      this.preferences = { ...this.preferences, ...preferences };
      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICATION_PREFERENCES,
        JSON.stringify(this.preferences)
      );

      // Re-register for push notifications if push setting changed
      if ('pushNotifications' in preferences) {
        if (preferences.pushNotifications) {
          await this.requestPermissions();
          await this.registerForPushNotifications();
        }
      }
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }

  /**
   * Get current notification preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Get push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }

  /**
   * Get notification permission status
   */
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('Failed to get permission status:', error);
      return 'undetermined';
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
