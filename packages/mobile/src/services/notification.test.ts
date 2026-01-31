/**
 * Notification Service Tests
 *
 * Tests for push notification registration, management, and event handling.
 * Covers device registration, notification handlers, and navigation logic.
 */

import { NotificationService } from './notification';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';

// Mock dependencies
jest.mock('expo-notifications');
jest.mock('expo-device', () => ({
  isDevice: true,
  deviceName: 'Test Device',
}));
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  Alert: {
    alert: jest.fn(),
  },
}));
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        eas: {
          projectId: 'test-project-id',
        },
      },
    },
  },
}));

describe('NotificationService', () => {
  let service: NotificationService;
  let mockApiClient: any;
  let mockNavigationCallback: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock API client
    mockApiClient = {
      post: jest.fn().mockResolvedValue({ data: { deviceId: 'device-123' } }),
      put: jest.fn().mockResolvedValue({}),
      get: jest.fn().mockResolvedValue({ data: {} }),
      delete: jest.fn().mockResolvedValue({}),
    };

    // Setup mock navigation callback
    mockNavigationCallback = jest.fn();

    // Create service instance
    service = new NotificationService(mockApiClient);

    // Setup default mocks
    (Device.isDevice as any) = true;
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: 'ExponentPushToken[test-token-123]',
    });
    (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue({
      remove: jest.fn(),
    });
    (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue({
      remove: jest.fn(),
    });
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('registerDevice', () => {
    it('should successfully register device with valid permissions', async () => {
      const result = await service.registerDevice('user-123');

      expect(result.success).toBe(true);
      expect(result.token).toBe('ExponentPushToken[test-token-123]');
      expect(result.deviceId).toBe('device-123');
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/notifications/register-device',
        expect.objectContaining({
          token: 'ExponentPushToken[test-token-123]',
          platform: 'ios',
        })
      );
    });

    it('should fail registration on emulator/simulator', async () => {
      // Use jest.requireActual to get the real Device module and mock isDevice
      jest.doMock('expo-device', () => ({
        isDevice: false,
        deviceName: 'Simulator',
      }));

      // Re-import the service to get the new mock
      jest.resetModules();
      const { NotificationService: TestService } = require('./notification');
      const testService = new TestService(mockApiClient);

      const result = await testService.registerDevice('user-123');

      expect(result.success).toBe(false);
      expect(result.token).toBeUndefined();
      expect(mockApiClient.post).not.toHaveBeenCalled();

      // Cleanup
      testService.cleanup();

      // Restore the original mock
      jest.doMock('expo-device', () => ({
        isDevice: true,
        deviceName: 'Test Device',
      }));
      jest.resetModules();
    });

    it('should fail registration when permissions denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await service.registerDevice('user-123');

      expect(result.success).toBe(false);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should fail registration when token retrieval fails', async () => {
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(
        new Error('Token error')
      );

      const result = await service.registerDevice('user-123');

      expect(result.success).toBe(false);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should fail registration when API call fails', async () => {
      mockApiClient.post.mockRejectedValue(new Error('API error'));

      const result = await service.registerDevice('user-123');

      expect(result.success).toBe(false);
    });

    it('should request permissions if not already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await service.registerDevice('user-123');

      expect(result.success).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });
  });

  describe('setupNotificationHandlers', () => {
    it('should setup notification listeners', () => {
      service.setupNotificationHandlers(mockNavigationCallback);

      expect(Notifications.addNotificationReceivedListener).toHaveBeenCalled();
      expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalled();
    });

    it('should remove existing listeners before adding new ones', () => {
      const mockRemove = jest.fn();
      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue({
        remove: mockRemove,
      });

      // Setup handlers twice
      service.setupNotificationHandlers(mockNavigationCallback);
      service.setupNotificationHandlers(mockNavigationCallback);

      expect(mockRemove).toHaveBeenCalled();
    });

    it('should work without navigation callback', () => {
      expect(() => {
        service.setupNotificationHandlers();
      }).not.toThrow();
    });
  });

  describe('handleNotificationReceived', () => {
    it('should show alert for foreground notification', () => {
      service.setupNotificationHandlers(mockNavigationCallback);

      const mockNotification = {
        request: {
          identifier: 'notif-123',
          content: {
            title: 'Test Notification',
            body: 'Test body',
            data: { type: 'budget_alert', budgetId: 'budget-123' },
          },
        },
      } as any;

      // Trigger notification received
      const listener = (Notifications.addNotificationReceivedListener as jest.Mock).mock
        .calls[0][0];
      listener(mockNotification);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Test Notification',
        'Test body',
        expect.any(Array)
      );
    });

    it('should handle notification without title/body', () => {
      service.setupNotificationHandlers(mockNavigationCallback);

      const mockNotification = {
        request: {
          identifier: 'notif-123',
          content: {
            data: {},
          },
        },
      } as any;

      const listener = (Notifications.addNotificationReceivedListener as jest.Mock).mock
        .calls[0][0];
      listener(mockNotification);

      expect(Alert.alert).toHaveBeenCalledWith('Notification', '', expect.any(Array));
    });

    it('should call navigation callback when View button pressed', () => {
      service.setupNotificationHandlers(mockNavigationCallback);

      const mockNotification = {
        request: {
          identifier: 'notif-123',
          content: {
            title: 'Test',
            body: 'Test',
            data: { type: 'budget_alert', budgetId: 'budget-123' },
          },
        },
      } as any;

      const listener = (Notifications.addNotificationReceivedListener as jest.Mock).mock
        .calls[0][0];
      listener(mockNotification);

      // Get the View button callback
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      const viewButton = buttons.find((b: any) => b.text === 'View');

      // Trigger View button
      viewButton.onPress();

      expect(mockNavigationCallback).toHaveBeenCalledWith({
        type: 'budget_alert',
        budgetId: 'budget-123',
      });
    });
  });

  describe('handleNotificationResponse', () => {
    it('should call navigation callback when notification tapped', () => {
      service.setupNotificationHandlers(mockNavigationCallback);

      const mockResponse = {
        notification: {
          request: {
            content: {
              data: { type: 'daily_reminder' },
            },
          },
        },
      } as any;

      // Trigger notification response
      const listener = (
        Notifications.addNotificationResponseReceivedListener as jest.Mock
      ).mock.calls[0][0];
      listener(mockResponse);

      expect(mockNavigationCallback).toHaveBeenCalledWith({ type: 'daily_reminder' });
    });

    it('should mark notification as read when tapped', async () => {
      service.setupNotificationHandlers(mockNavigationCallback);

      const mockResponse = {
        notification: {
          request: {
            content: {
              data: { notificationId: 'notif-123' },
            },
          },
        },
      } as any;

      const listener = (
        Notifications.addNotificationResponseReceivedListener as jest.Mock
      ).mock.calls[0][0];
      listener(mockResponse);

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockApiClient.put).toHaveBeenCalledWith('/notifications/notif-123/read');
    });

    it('should handle notification without data', () => {
      service.setupNotificationHandlers(mockNavigationCallback);

      const mockResponse = {
        notification: {
          request: {
            content: {},
          },
        },
      } as any;

      const listener = (
        Notifications.addNotificationResponseReceivedListener as jest.Mock
      ).mock.calls[0][0];

      expect(() => {
        listener(mockResponse);
      }).not.toThrow();
    });

    it('should handle API error when marking as read', async () => {
      mockApiClient.put.mockRejectedValue(new Error('API error'));
      service.setupNotificationHandlers(mockNavigationCallback);

      const mockResponse = {
        notification: {
          request: {
            content: {
              data: { notificationId: 'notif-123' },
            },
          },
        },
      } as any;

      const listener = (
        Notifications.addNotificationResponseReceivedListener as jest.Mock
      ).mock.calls[0][0];

      expect(() => {
        listener(mockResponse);
      }).not.toThrow();
    });
  });

  describe('removeNotificationHandlers', () => {
    it('should remove all listeners', () => {
      const mockRemove1 = jest.fn();
      const mockRemove2 = jest.fn();

      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue({
        remove: mockRemove1,
      });
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue({
        remove: mockRemove2,
      });

      service.setupNotificationHandlers(mockNavigationCallback);
      service.removeNotificationHandlers();

      expect(mockRemove1).toHaveBeenCalled();
      expect(mockRemove2).toHaveBeenCalled();
    });

    it('should handle removing listeners when none exist', () => {
      expect(() => {
        service.removeNotificationHandlers();
      }).not.toThrow();
    });
  });

  describe('getDeviceToken', () => {
    it('should return null before registration', () => {
      expect(service.getDeviceToken()).toBeNull();
    });

    it('should return token after successful registration', async () => {
      await service.registerDevice('user-123');

      expect(service.getDeviceToken()).toBe('ExponentPushToken[test-token-123]');
    });
  });

  describe('cleanup', () => {
    it('should remove listeners and clear state', async () => {
      const mockRemove = jest.fn();
      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue({
        remove: mockRemove,
      });

      await service.registerDevice('user-123');
      service.setupNotificationHandlers(mockNavigationCallback);
      service.cleanup();

      expect(mockRemove).toHaveBeenCalled();
      expect(service.getDeviceToken()).toBeNull();
    });
  });

  describe('navigation logic', () => {
    it('should navigate to Budget screen for budget_alert', () => {
      service.setupNotificationHandlers(mockNavigationCallback);

      const mockResponse = {
        notification: {
          request: {
            content: {
              data: {
                type: 'budget_alert',
                budgetId: 'budget-123',
                categoryId: 'category-456',
              },
            },
          },
        },
      } as any;

      const listener = (
        Notifications.addNotificationResponseReceivedListener as jest.Mock
      ).mock.calls[0][0];
      listener(mockResponse);

      expect(mockNavigationCallback).toHaveBeenCalledWith({
        type: 'budget_alert',
        budgetId: 'budget-123',
        categoryId: 'category-456',
      });
    });

    it('should navigate to Transactions screen for daily_reminder', () => {
      service.setupNotificationHandlers(mockNavigationCallback);

      const mockResponse = {
        notification: {
          request: {
            content: {
              data: {
                type: 'daily_reminder',
              },
            },
          },
        },
      } as any;

      const listener = (
        Notifications.addNotificationResponseReceivedListener as jest.Mock
      ).mock.calls[0][0];
      listener(mockResponse);

      expect(mockNavigationCallback).toHaveBeenCalledWith({
        type: 'daily_reminder',
      });
    });

    it('should handle unknown notification types', () => {
      service.setupNotificationHandlers(mockNavigationCallback);

      const mockResponse = {
        notification: {
          request: {
            content: {
              data: {
                type: 'unknown_type',
              },
            },
          },
        },
      } as any;

      const listener = (
        Notifications.addNotificationResponseReceivedListener as jest.Mock
      ).mock.calls[0][0];

      expect(() => {
        listener(mockResponse);
      }).not.toThrow();

      expect(mockNavigationCallback).toHaveBeenCalledWith({
        type: 'unknown_type',
      });
    });
  });

  describe('error handling', () => {
    it('should handle permission request errors gracefully', async () => {
      (Notifications.requestPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission error')
      );
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });

      const result = await service.registerDevice('user-123');

      expect(result.success).toBe(false);
    });

    it('should handle token generation errors gracefully', async () => {
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(
        new Error('Token generation failed')
      );

      const result = await service.registerDevice('user-123');

      expect(result.success).toBe(false);
    });

    it('should handle backend registration errors gracefully', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Backend error'));

      const result = await service.registerDevice('user-123');

      expect(result.success).toBe(false);
    });
  });

  describe('platform-specific behavior', () => {
    it('should register with ios platform', async () => {
      (Platform.OS as any) = 'ios';

      await service.registerDevice('user-123');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/notifications/register-device',
        expect.objectContaining({
          platform: 'ios',
        })
      );
    });

    it('should register with android platform', async () => {
      (Platform.OS as any) = 'android';

      await service.registerDevice('user-123');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/notifications/register-device',
        expect.objectContaining({
          platform: 'android',
        })
      );
    });
  });
});
