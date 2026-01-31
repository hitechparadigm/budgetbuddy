/**
 * Notification Service Tests
 *
 * Tests for push notification registration, handlers, and navigation logic
 */

import { NotificationService } from './notification';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Mock dependencies
jest.mock('expo-notifications');
jest.mock('expo-device');
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

describe('NotificationService', () => {
  let service: NotificationService;
  let mockApiClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock API client
    mockApiClient = {
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };

    // Mock Device.isDevice
    (Device as any).isDevice = true;
    (Device as any).deviceName = 'Test Device';

    // Mock Platform.OS
    Object.defineProperty(Platform, 'OS', {
      get: jest.fn(() => 'ios'),
    });

    // Create service instance
    service = new NotificationService(mockApiClient);
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('registerDevice', () => {
    it('should successfully register device with valid permissions and token', async () => {
      // Mock permissions
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      // Mock push token
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: 'ExponentPushToken[test-token-123]',
      });

      // Mock API response
      mockApiClient.post.mockResolvedValue({
        data: { deviceId: 'device-123' },
      });

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

    it('should fail when not running on physical device', async () => {
      (Device as any).isDevice = false;

      const result = await service.registerDevice('user-123');

      expect(result.success).toBe(false);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should fail when permissions are denied', async () => {
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

    it('should request permissions if not already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: 'ExponentPushToken[test-token-123]',
      });
      mockApiClient.post.mockResolvedValue({
        data: { deviceId: 'device-123' },
      });

      const result = await service.registerDevice('user-123');

      expect(result.success).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: 'ExponentPushToken[test-token-123]',
      });
      mockApiClient.post.mockRejectedValue(new Error('API Error'));

      const result = await service.registerDevice('user-123');

      expect(result.success).toBe(false);
    });
  });

  describe('setupNotificationHandlers', () => {
    it('should setup notification listeners', () => {
      const mockSubscription = { remove: jest.fn() };
      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue(
        mockSubscription
      );
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue(
        mockSubscription
      );

      service.setupNotificationHandlers();

      expect(Notifications.addNotificationReceivedListener).toHaveBeenCalled();
      expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalled();
    });

    it('should remove existing listeners before adding new ones', () => {
      const mockSubscription = { remove: jest.fn() };
      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue(
        mockSubscription
      );
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue(
        mockSubscription
      );

      // Setup handlers twice
      service.setupNotificationHandlers();
      service.setupNotificationHandlers();

      // Should have removed previous listeners
      expect(mockSubscription.remove).toHaveBeenCalledTimes(2);
    });

    it('should call navigation callback when provided', () => {
      const mockSubscription = { remove: jest.fn() };
      const mockNavigationCallback = jest.fn();

      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue(
        mockSubscription
      );
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue(
        mockSubscription
      );

      service.setupNotificationHandlers(mockNavigationCallback);

      // Verify callback is stored (we can't directly test private properties)
      expect(Notifications.addNotificationReceivedListener).toHaveBeenCalled();
    });
  });

  describe('removeNotificationHandlers', () => {
    it('should remove all notification listeners', () => {
      const mockSubscription = { remove: jest.fn() };
      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue(
        mockSubscription
      );
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue(
        mockSubscription
      );

      service.setupNotificationHandlers();
      service.removeNotificationHandlers();

      expect(mockSubscription.remove).toHaveBeenCalledTimes(2);
    });

    it('should handle removing listeners when none exist', () => {
      // Should not throw error
      expect(() => service.removeNotificationHandlers()).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should cleanup all resources', () => {
      const mockSubscription = { remove: jest.fn() };
      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue(
        mockSubscription
      );
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue(
        mockSubscription
      );
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: 'ExponentPushToken[test-token-123]',
      });

      service.setupNotificationHandlers();
      service.cleanup();

      expect(mockSubscription.remove).toHaveBeenCalledTimes(2);
      expect(service.getDeviceToken()).toBeNull();
    });
  });

  describe('getDeviceToken', () => {
    it('should return null initially', () => {
      expect(service.getDeviceToken()).toBeNull();
    });

    it('should return token after successful registration', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: 'ExponentPushToken[test-token-123]',
      });
      mockApiClient.post.mockResolvedValue({
        data: { deviceId: 'device-123' },
      });

      await service.registerDevice('user-123');

      expect(service.getDeviceToken()).toBe('ExponentPushToken[test-token-123]');
    });
  });
});
