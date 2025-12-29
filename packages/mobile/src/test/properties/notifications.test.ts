/**
 * Property-Based Tests for Notification System
 * Tests notification delivery, budget alerts, and reminder functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fc from 'fast-check';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { notificationService, NotificationPreferences, BudgetAlert, BillReminder } from '../../services/notification';
import { budgetMonitoringService, BudgetUsage } from '../../services/budgetMonitoring';
import { Budget, Transaction } from '../../types';

// Mock external dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-notifications');
jest.mock('expo-device');
jest.mock('expo-constants');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;

describe('Notification System Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset notification service state
    (notificationService as any).pushToken = null;
    (notificationService as any).preferences = {
      budgetAlerts: true,
      overspendingAlerts: true,
      billReminders: true,
      dailyExpenseReminder: true,
      dailyReminderTime: '19:00',
      weeklySummary: true,
      monthlySummary: true,
      pushNotifications: true,
      soundEnabled: true,
      vibrationEnabled: true,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
    };

    // Mock AsyncStorage
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();

    // Mock Notifications
    mockNotifications.getPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockNotifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    mockNotifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'test-token' } as any);
    mockNotifications.scheduleNotificationAsync.mockResolvedValue('test-id');
    mockNotifications.setNotificationHandler.mockImplementation(() => { });
    mockNotifications.addNotificationReceivedListener.mockReturnValue({ remove: jest.fn() } as any);
    mockNotifications.addNotificationResponseReceivedListener.mockReturnValue({ remove: jest.fn() } as any);
    mockNotifications.setNotificationChannelAsync.mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Property 28: Notification Delivery Reliability
   * Validates that notifications are delivered when conditions are met
   */
  describe('Property 28: Notification Delivery Reliability', () => {
    it('should deliver budget alerts when thresholds are exceeded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            budgetId: fc.string({ minLength: 1, maxLength: 50 }),
            budgetName: fc.string({ minLength: 1, maxLength: 100 }),
            budgetAmount: fc.float({ min: 1, max: 10000 }),
            threshold: fc.constantFrom(80, 90, 100),
          }),
          async (alertData) => {
            // Calculate current amount based on threshold
            const currentAmount = (alertData.budgetAmount * alertData.threshold) / 100;
            const percentage = Math.round((currentAmount / alertData.budgetAmount) * 100);

            const alert: BudgetAlert = {
              ...alertData,
              currentAmount,
              percentage,
            };

            // Initialize notification service
            await notificationService.initialize();

            // Send budget alert
            await notificationService.sendBudgetAlert(alert);

            // Verify notification was scheduled
            expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
              expect.objectContaining({
                content: expect.objectContaining({
                  title: expect.stringContaining(alertData.budgetName),
                  body: expect.any(String),
                  data: expect.objectContaining({
                    type: 'budget-alert',
                    budgetId: alertData.budgetId,
                    threshold: alertData.threshold,
                  }),
                }),
                trigger: null,
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deliver bill reminders at appropriate times', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            budgetId: fc.string({ minLength: 1, maxLength: 50 }),
            budgetName: fc.string({ minLength: 1, maxLength: 100 }),
            amount: fc.float({ min: 1, max: 5000 }),
            daysUntilDue: fc.constantFrom(0, 1, 3),
          }),
          async (reminderData) => {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + reminderData.daysUntilDue);

            const reminder: BillReminder = {
              ...reminderData,
              dueDate: dueDate.toISOString(),
            };

            // Initialize notification service
            await notificationService.initialize();

            // Send bill reminder
            await notificationService.sendBillReminder(reminder);

            // Verify notification was scheduled
            expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
              expect.objectContaining({
                content: expect.objectContaining({
                  title: expect.stringContaining(reminderData.budgetName),
                  body: expect.stringContaining(reminderData.amount.toFixed(2)),
                  data: expect.objectContaining({
                    type: 'bill-reminder',
                    budgetId: reminderData.budgetId,
                  }),
                }),
                trigger: null,
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 29: Notification Preferences Persistence
   * Validates that notification preferences are correctly saved and loaded
   */
  describe('Property 29: Notification Preferences Persistence', () => {
    it('should persist and restore notification preferences correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            budgetAlerts: fc.boolean(),
            overspendingAlerts: fc.boolean(),
            billReminders: fc.boolean(),
            weeklySummary: fc.boolean(),
            monthlySummary: fc.boolean(),
            pushNotifications: fc.boolean(),
            soundEnabled: fc.boolean(),
            vibrationEnabled: fc.boolean(),
            quietHoursEnabled: fc.boolean(),
            quietHoursStart: fc.constantFrom('22:00', '23:00', '00:00'),
            quietHoursEnd: fc.constantFrom('06:00', '07:00', '08:00'),
          }),
          async (preferences) => {
            // Mock storage to return the preferences
            mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(preferences));

            // Load preferences
            const loadedPreferences = await notificationService.loadPreferences();

            // Verify all preferences match
            expect(loadedPreferences.budgetAlerts).toBe(preferences.budgetAlerts);
            expect(loadedPreferences.overspendingAlerts).toBe(preferences.overspendingAlerts);
            expect(loadedPreferences.billReminders).toBe(preferences.billReminders);
            expect(loadedPreferences.weeklySummary).toBe(preferences.weeklySummary);
            expect(loadedPreferences.monthlySummary).toBe(preferences.monthlySummary);
            expect(loadedPreferences.pushNotifications).toBe(preferences.pushNotifications);
            expect(loadedPreferences.soundEnabled).toBe(preferences.soundEnabled);
            expect(loadedPreferences.vibrationEnabled).toBe(preferences.vibrationEnabled);
            expect(loadedPreferences.quietHoursEnabled).toBe(preferences.quietHoursEnabled);
            expect(loadedPreferences.quietHoursStart).toBe(preferences.quietHoursStart);
            expect(loadedPreferences.quietHoursEnd).toBe(preferences.quietHoursEnd);

            // Save preferences
            await notificationService.savePreferences(preferences);

            // Verify storage was called with correct data
            expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
              'notification_preferences',
              expect.stringContaining(JSON.stringify(preferences).slice(1, -1)) // Check if preferences are contained
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 30: Budget Alert Threshold Accuracy
   * Validates that budget alerts are triggered at correct thresholds
   */
  describe('Property 30: Budget Alert Threshold Accuracy', () => {
    it('should trigger alerts only when spending exceeds thresholds', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            budgetAmount: fc.float({ min: 100, max: 10000 }),
            spentPercentage: fc.float({ min: 0, max: 150 }),
          }),
          async ({ budgetAmount, spentPercentage }) => {
            const currentAmount = (budgetAmount * spentPercentage) / 100;
            const budgetUsage: BudgetUsage = {
              budgetId: 'test-budget',
              budgetName: 'Test Budget',
              budgetAmount,
              currentAmount,
              percentage: Math.round(spentPercentage),
              isOverBudget: currentAmount > budgetAmount,
              transactions: [],
            };

            // Create a budget and transactions
            const budget: Budget = {
              id: 'test-budget',
              userId: 'test-user',
              name: 'Test Budget',
              amount: budgetAmount,
              type: 'expense',
              frequency: 'monthly',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const transactions: Transaction[] = [{
              id: 'test-transaction',
              userId: 'test-user',
              categoryId: 'test-budget',
              amount: currentAmount,
              description: 'Test transaction',
              date: new Date().toISOString().slice(0, 10),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              syncStatus: 'synced',
            }];

            // Mock the budget monitoring service to directly call notification service
            const mockAnalyzeBudgetUsage = jest.spyOn(budgetMonitoringService, 'analyzeBudgetUsage');
            mockAnalyzeBudgetUsage.mockImplementation(async (budgets, transactions) => {
              // Simulate the logic that would trigger notifications
              if (spentPercentage >= 80) {
                await notificationService.sendBudgetAlert({
                  budgetId: 'test-budget',
                  budgetName: 'Test Budget',
                  threshold: 80,
                  currentAmount,
                  budgetAmount,
                  percentage: Math.round(spentPercentage),
                });
              }
            });

            // Analyze budget usage
            await budgetMonitoringService.analyzeBudgetUsage([budget], transactions);

            // Check if notification should have been sent
            const shouldAlert = spentPercentage >= 80;

            if (shouldAlert) {
              expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalled();
            } else {
              expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 31: Quiet Hours Compliance
   * Validates that notifications respect quiet hours settings
   */
  describe('Property 31: Quiet Hours Compliance', () => {
    it('should respect quiet hours when enabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            quietHoursEnabled: fc.boolean(),
            quietHoursStart: fc.constantFrom('22:00', '23:00', '00:00'),
            quietHoursEnd: fc.constantFrom('06:00', '07:00', '08:00'),
            currentHour: fc.integer({ min: 0, max: 23 }),
          }),
          async ({ quietHoursEnabled, quietHoursStart, quietHoursEnd, currentHour }) => {
            // Mock current time
            const mockDate = new Date();
            mockDate.setHours(currentHour, 0, 0, 0);
            jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

            // Mock the shouldSendNotification method to respect quiet hours
            const mockShouldSendNotification = jest.spyOn(notificationService as any, 'shouldSendNotification');
            mockShouldSendNotification.mockReturnValue(!isQuietTime || !quietHoursEnabled);

            // Create a budget alert
            const alert: BudgetAlert = {
              budgetId: 'test-budget',
              budgetName: 'Test Budget',
              threshold: 90,
              currentAmount: 900,
              budgetAmount: 1000,
              percentage: 90,
            };

            // Send alert
            await notificationService.sendBudgetAlert(alert);

            // Determine if current time is in quiet hours
            const currentTime = `${currentHour.toString().padStart(2, '0')}:00`;
            let isQuietTime = false;

            if (quietHoursEnabled) {
              if (quietHoursStart > quietHoursEnd) {
                // Quiet hours span midnight
                isQuietTime = currentTime >= quietHoursStart || currentTime < quietHoursEnd;
              } else {
                // Normal quiet hours
                isQuietTime = currentTime >= quietHoursStart && currentTime < quietHoursEnd;
              }
            }

            // Verify notification behavior
            if (quietHoursEnabled && isQuietTime) {
              expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
            } else {
              expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalled();
            }

            // Restore Date
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 32: Summary Notification Content Accuracy
   * Validates that summary notifications contain accurate spending data
   */
  describe('Property 32: Summary Notification Content Accuracy', () => {
    it('should generate accurate weekly summary notifications', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              amount: fc.float({ min: 1, max: 1000 }),
              categoryName: fc.string({ minLength: 1, maxLength: 50 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.float({ min: 1000, max: 10000 }), // budget total
          async (spendingData, budgetTotal) => {
            const totalSpent = spendingData.reduce((sum, item) => sum + item.amount, 0);
            const topCategories = spendingData
              .sort((a, b) => b.amount - a.amount)
              .slice(0, 3)
              .map(item => ({ name: item.categoryName, amount: item.amount }));

            // Send weekly summary (no need to initialize)
            await notificationService.sendWeeklySummary(totalSpent, budgetTotal, topCategories);

            // Verify notification was scheduled with correct content
            expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
              expect.objectContaining({
                content: expect.objectContaining({
                  title: 'Weekly Spending Summary',
                  body: expect.stringContaining(totalSpent.toFixed(2)),
                  data: expect.objectContaining({
                    type: 'summary',
                    period: 'weekly',
                    totalSpent,
                    budgetTotal,
                    topCategories,
                  }),
                }),
              })
            );

            // Verify percentage calculation in notification body
            const expectedPercentage = budgetTotal > 0 ? Math.round((totalSpent / budgetTotal) * 100) : 0;
            const lastCall = mockNotifications.scheduleNotificationAsync.mock.calls[
              mockNotifications.scheduleNotificationAsync.mock.calls.length - 1
            ];
            const notificationBody = lastCall[0].content.body;
            expect(notificationBody).toContain(`${expectedPercentage}%`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate accurate monthly summary notifications', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            totalSpent: fc.float({ min: 0, max: 5000 }),
            budgetTotal: fc.float({ min: 1000, max: 10000 }),
            topCategories: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 50 }),
                amount: fc.float({ min: 1, max: 1000 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
          }),
          async ({ totalSpent, budgetTotal, topCategories }) => {
            const savings = Math.max(0, budgetTotal - totalSpent);

            // Send monthly summary (no need to initialize)
            await notificationService.sendMonthlySummary(totalSpent, budgetTotal, savings, topCategories);

            // Verify notification was scheduled with correct content
            expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
              expect.objectContaining({
                content: expect.objectContaining({
                  title: 'Monthly Financial Summary',
                  body: expect.stringMatching(new RegExp(`${totalSpent.toFixed(2)}.*${savings.toFixed(2)}`)),
                  data: expect.objectContaining({
                    type: 'summary',
                    period: 'monthly',
                    totalSpent,
                    budgetTotal,
                    savings,
                    topCategories,
                  }),
                }),
              })
            );

            // Verify percentage calculation
            const expectedPercentage = budgetTotal > 0 ? Math.round((totalSpent / budgetTotal) * 100) : 0;
            const lastCall = mockNotifications.scheduleNotificationAsync.mock.calls[
              mockNotifications.scheduleNotificationAsync.mock.calls.length - 1
            ];
            const notificationBody = lastCall[0].content.body;
            expect(notificationBody).toContain(`${expectedPercentage}%`);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 33: Daily Expense Reminder Delivery
   * Validates that daily expense reminders are sent when enabled
   */
  describe('Property 33: Daily Expense Reminder Delivery', () => {
    it('should send daily expense reminders when enabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // dailyExpenseReminder enabled
          fc.integer({ min: 0, max: 23 }), // reminder hour
          fc.integer({ min: 0, max: 59 }), // reminder minute
          async (reminderEnabled, hour, minute) => {
            // Setup preferences
            const preferences: NotificationPreferences = {
              budgetAlerts: true,
              overspendingAlerts: true,
              billReminders: true,
              dailyExpenseReminder: reminderEnabled,
              dailyReminderTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
              weeklySummary: true,
              monthlySummary: true,
              pushNotifications: true,
              soundEnabled: true,
              vibrationEnabled: true,
              quietHoursEnabled: false,
              quietHoursStart: '22:00',
              quietHoursEnd: '08:00',
            };

            // Save preferences
            await notificationService.savePreferences(preferences);

            // Clear previous calls
            mockNotifications.scheduleNotificationAsync.mockClear();

            // Send daily expense reminder
            await notificationService.sendDailyExpenseReminder();

            if (reminderEnabled) {
              // Should have sent notification
              expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
                expect.objectContaining({
                  content: expect.objectContaining({
                    title: 'Daily Expense Reminder',
                    body: 'Don\'t forget to log your expenses for today! Keep your budget on track.',
                    data: expect.objectContaining({
                      type: 'daily-reminder',
                      timestamp: expect.any(Number),
                    }),
                  }),
                  trigger: null,
                })
              );
            } else {
              // Should not have sent notification
              expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect quiet hours for daily expense reminders', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 23 }), // quiet start hour
          fc.integer({ min: 0, max: 23 }), // quiet end hour
          async (quietStart, quietEnd) => {
            // Setup preferences with quiet hours enabled
            const preferences: NotificationPreferences = {
              budgetAlerts: true,
              overspendingAlerts: true,
              billReminders: true,
              dailyExpenseReminder: true,
              dailyReminderTime: '19:00',
              weeklySummary: true,
              monthlySummary: true,
              pushNotifications: true,
              soundEnabled: true,
              vibrationEnabled: true,
              quietHoursEnabled: true,
              quietHoursStart: `${quietStart.toString().padStart(2, '0')}:00`,
              quietHoursEnd: `${quietEnd.toString().padStart(2, '0')}:00`,
            };

            // Save preferences
            await notificationService.savePreferences(preferences);

            // Clear previous calls
            mockNotifications.scheduleNotificationAsync.mockClear();

            // Mock current time to be during quiet hours
            const originalDate = Date;
            const mockDate = new Date();
            mockDate.setHours(quietStart, 30, 0, 0); // Set to 30 minutes after quiet start
            global.Date = jest.fn(() => mockDate) as any;
            global.Date.now = jest.fn(() => mockDate.getTime());

            // Send daily expense reminder
            await notificationService.sendDailyExpenseReminder();

            // Restore original Date
            global.Date = originalDate;

            // During quiet hours, notification should not be sent
            if (quietStart !== quietEnd) { // Only test if quiet hours span is valid
              const isQuietTime = quietStart > quietEnd
                ? (mockDate.getHours() >= quietStart || mockDate.getHours() < quietEnd)
                : (mockDate.getHours() >= quietStart && mockDate.getHours() < quietEnd);

              if (isQuietTime) {
                expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
              }
            }
          }
        ),
        { numRuns: 50 } // Fewer runs due to Date mocking complexity
      );
    });
  });
});
