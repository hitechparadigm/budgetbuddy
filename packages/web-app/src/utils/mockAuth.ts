/**
 * Mock Authentication for Development
 *
 * Simple, safe mock authentication for development and testing
 */

import { TokenManager } from '../services/api';
import { canUseMockAuth, logSecurityEvent } from '@budget-buddy/shared/dist/utils/security';

// Mock JWT token for development ONLY (this would normally come from Cognito)
// This is a fake token with mock data - NOT a real authentication token
const MOCK_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJNT0NLX1VTRVJfSUQiLCJmYW1pbHlJZCI6Im1vY2tfZmFtaWx5IiwiZmlyc3ROYW1lIjoiVGVzdCIsImxhc3ROYW1lIjoiVXNlciIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTczMDU4MDAwMCwiZXhwIjoxNzMwNjY2NDAwfQ.MOCK_SIGNATURE_FOR_DEVELOPMENT_ONLY';

export interface MockUser {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export const mockUser: MockUser = {
  userId: 'user_123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'test@example.com'
};

/**
 * Initialize mock authentication (development only)
 */
export function initMockAuth(): void {
  if (!canUseMockAuth()) {
    return;
  }

  logSecurityEvent('Mock authentication initialized for development', 'info');
  console.log('👤 Mock User:', mockUser);

  // Set the mock token
  TokenManager.setToken(MOCK_JWT_TOKEN);

  // Store mock user data
  if (typeof window !== 'undefined') {
    localStorage.setItem('budgetbuddy_mock_user', JSON.stringify(mockUser));
  }
}

/**
 * Get mock user data
 */
export function getMockUser(): MockUser | null {
  if (!canUseMockAuth()) {
    return null;
  }

  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('budgetbuddy_mock_user');
    return userData ? JSON.parse(userData) : null;
  }
  return null;
}

/**
 * Clear mock authentication
 */
export function clearMockAuth(): void {
  TokenManager.clearToken();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('budgetbuddy_mock_user');
  }
  logSecurityEvent('Mock authentication cleared', 'info');
}

/**
 * Check if mock auth is active
 */
export function isMockAuthActive(): boolean {
  return canUseMockAuth() && TokenManager.getToken() === MOCK_JWT_TOKEN;
}
