/**
 * Notification Navigation Tests
 *
 * Tests for notification navigation logic
 */

import {
  handleNotificationNavigation,
  getNotificationDisplayInfo,
  NotificationData,
} from './notificationNavigation';

describe('notificationNavigation', () => {
  let mockNavigation: any;

  beforeEach(() => {
    mockNavigation = {
      navigate: jest.fn(),
    };
  });

  describe('handleNotificationNavigation', () => {
    it('should navigate to Budget screen for budget alerts', () => {
      const data: NotificationData = {
        type: 'budget_alert',
        budgetId: 'budget-123',
        categoryId: 'groceries',
        threshold: 80,
      };

      handleNotificationNavigation(mockNavigation, data);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Budget', {
        screen: 'BudgetList',
        params: {
          budgetId: 'budget-123',
          categoryId: 'groceries',
          highlightCategory: true,
          fromNotification: true,
        },
      });
    });

    it('should navigate to Transactions screen for daily reminders', () => {
      const data: NotificationData = {
        type: 'daily_reminder',
      };

      handleNotificationNavigation(mockNavigation, data);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Transactions', {
        screen: 'TransactionList',
        params: {
          budgetId: undefined,
          categoryId: undefined,
          fromNotification: true,
        },
      });
    });

    it('should navigate to Budget screen for general notifications', () => {
      const data: NotificationData = {
        type: 'general',
      };

      handleNotificationNavigation(mockNavigation, data);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Budget', {
        screen: 'BudgetList',
        params: {
          budgetId: undefined,
          categoryId: undefined,
          highlightCategory: false,
          fromNotification: true,
        },
      });
    });

    it('should handle navigation errors gracefully', () => {
      mockNavigation.navigate.mockImplementation(() => {
        throw new Error('Navigation error');
      });

      const data: NotificationData = {
        type: 'budget_alert',
        budgetId: 'budget-123',
      };

      // Should not throw
      expect(() => handleNotificationNavigation(mockNavigation, data)).not.toThrow();
    });

    it('should pass budget and category IDs when provided', () => {
      const data: NotificationData = {
        type: 'budget_alert',
        budgetId: 'budget-456',
        categoryId: 'entertainment',
        threshold: 90,
      };

      handleNotificationNavigation(mockNavigation, data);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Budget', {
        screen: 'BudgetList',
        params: expect.objectContaining({
          budgetId: 'budget-456',
          categoryId: 'entertainment',
        }),
      });
    });
  });

  describe('getNotificationDisplayInfo', () => {
    it('should return correct info for budget alerts', () => {
      const data: NotificationData = {
        type: 'budget_alert',
        categoryId: 'groceries',
        threshold: 80,
      };

      const info = getNotificationDisplayInfo(data);

      expect(info.title).toBe('💰 Budget Alert');
      expect(info.message).toContain('80%');
      expect(info.message).toContain('groceries');
    });

    it('should return correct info for daily reminders', () => {
      const data: NotificationData = {
        type: 'daily_reminder',
      };

      const info = getNotificationDisplayInfo(data);

      expect(info.title).toBe('📝 Daily Reminder');
      expect(info.message).toContain('log your transactions');
    });

    it('should return correct info for general notifications', () => {
      const data: NotificationData = {
        type: 'general',
      };

      const info = getNotificationDisplayInfo(data);

      expect(info.title).toBe('🔔 Notification');
      expect(info.message).toContain('new notification');
    });

    it('should handle missing category ID in budget alerts', () => {
      const data: NotificationData = {
        type: 'budget_alert',
        threshold: 90,
      };

      const info = getNotificationDisplayInfo(data);

      expect(info.message).toContain('a category');
    });
  });
});
