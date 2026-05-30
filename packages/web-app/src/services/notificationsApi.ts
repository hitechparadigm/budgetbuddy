/**
 * Notifications API Service
 * Handles notification history, preferences, and read status
 */

import { config } from '../config/environment';

const MAIN_API_BASE = config.apiBaseUrl;

// Get token from localStorage
function getToken(): string | null {
  return localStorage.getItem('budgetbuddy_id_token');
}

// Get userId from token
function getUserId(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || payload['cognito:username'];
  } catch {
    return null;
  }
}

// API Error class
export class NotificationsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'NotificationsApiError';
  }
}

// Core API function
async function notificationsApiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${MAIN_API_BASE}${endpoint}`;

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Use default error message
    }
    throw new NotificationsApiError(errorMessage, response.status);
  }

  return response.json();
}

// Types
export interface Notification {
  id: string;
  type: 'budget_alert' | 'reminder' | 'tip' | 'family' | 'system';
  title: string;
  body: string;
  data?: Record<string, any>;
  sentAt: string;
  read: boolean;
}

export interface NotificationPreferences {
  budgetAlerts: boolean;
  dailyReminders: boolean;
  reminderTime: string;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface NotificationHistoryResponse {
  notifications: Notification[];
  lastEvaluatedKey?: any;
}

// Notifications API
export const notificationsApi = {
  // Get notification history
  async getHistory(limit: number = 20): Promise<NotificationHistoryResponse> {
    const userId = getUserId();
    if (!userId) {
      throw new NotificationsApiError('Not authenticated', 401);
    }

    const params = new URLSearchParams();
    params.append('userId', userId);
    params.append('limit', limit.toString());

    const response = await notificationsApiCall(`/notifications/history?${params.toString()}`);

    // Transform backend response to match our types
    const notifications = (response.notifications || []).map((n: any) => ({
      id: n.SK?.replace('NOTIFICATION#', '') || n.id || String(Date.now()),
      type: n.type || 'system',
      title: n.title || 'Notification',
      body: n.body || n.message || '',
      data: n.data,
      sentAt: n.sentAt || new Date().toISOString(),
      read: n.read || false,
    }));

    return { notifications, lastEvaluatedKey: response.lastEvaluatedKey };
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<{ success: boolean }> {
    const userId = getUserId();
    if (!userId) {
      throw new NotificationsApiError('Not authenticated', 401);
    }

    return notificationsApiCall(`/notifications/${notificationId}/read`, {
      method: 'PUT',
      body: JSON.stringify({ userId }),
    });
  },

  // Get notification preferences
  async getPreferences(): Promise<NotificationPreferences> {
    const userId = getUserId();
    if (!userId) {
      throw new NotificationsApiError('Not authenticated', 401);
    }

    const params = new URLSearchParams();
    params.append('userId', userId);

    return notificationsApiCall(`/notifications/preferences?${params.toString()}`);
  },

  // Update notification preferences
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<{ success: boolean }> {
    const userId = getUserId();
    if (!userId) {
      throw new NotificationsApiError('Not authenticated', 401);
    }

    return notificationsApiCall('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({ userId, preferences }),
    });
  },

  // Get unread count
  async getUnreadCount(): Promise<number> {
    try {
      const { notifications } = await this.getHistory(50);
      return notifications.filter(n => !n.read).length;
    } catch {
      return 0;
    }
  },
};

export default notificationsApi;
