/**
 * Notification Navigation Helper
 *
 * Handles navigation logic for push notifications.
 * Routes users to appropriate screens based on notification type.
 */

import { NavigationProp } from '@react-navigation/native';

export type NotificationData = {
  type: 'budget_alert' | 'daily_reminder' | 'general';
  budgetId?: string;
  categoryId?: string;
  threshold?: number;
  notificationId?: string;
  [key: string]: any;
};

/**
 * Handle notification navigation
 * Routes to appropriate screen based on notification type
 */
export function handleNotificationNavigation(
  navigation: NavigationProp<any>,
  data: NotificationData
): void {
  console.log('Handling notification navigation:', data);

  switch (data.type) {
    case 'budget_alert':
      // Navigate to Budget screen for budget alerts
      navigateToBudget(navigation, data);
      break;

    case 'daily_reminder':
      // Navigate to Transactions screen for daily reminders
      navigateToTransactions(navigation, data);
      break;

    case 'general':
    default:
      // Navigate to home/budget screen for general notifications
      navigateToBudget(navigation, data);
      break;
  }
}

/**
 * Navigate to Budget screen
 * Optionally highlights specific budget or category
 */
function navigateToBudget(
  navigation: NavigationProp<any>,
  data: NotificationData
): void {
  try {
    navigation.navigate('Budget', {
      screen: 'BudgetList',
      params: {
        budgetId: data.budgetId,
        categoryId: data.categoryId,
        highlightCategory: data.categoryId ? true : false,
        fromNotification: true,
      },
    });

    console.log('Navigated to Budget screen');
  } catch (error) {
    console.error('Error navigating to Budget screen:', error);
  }
}

/**
 * Navigate to Transactions screen
 * Optionally filters by budget or category
 */
function navigateToTransactions(
  navigation: NavigationProp<any>,
  data: NotificationData
): void {
  try {
    navigation.navigate('Transactions', {
      screen: 'TransactionList',
      params: {
        budgetId: data.budgetId,
        categoryId: data.categoryId,
        fromNotification: true,
      },
    });

    console.log('Navigated to Transactions screen');
  } catch (error) {
    console.error('Error navigating to Transactions screen:', error);
  }
}

/**
 * Get notification display info
 * Returns formatted title and message for notification
 */
export function getNotificationDisplayInfo(data: NotificationData): {
  title: string;
  message: string;
} {
  switch (data.type) {
    case 'budget_alert':
      return {
        title: '💰 Budget Alert',
        message: `You've reached ${data.threshold}% of your budget for ${data.categoryId || 'a category'}`,
      };

    case 'daily_reminder':
      return {
        title: '📝 Daily Reminder',
        message: "Don't forget to log your transactions today!",
      };

    case 'general':
    default:
      return {
        title: '🔔 Notification',
        message: 'You have a new notification',
      };
  }
}
