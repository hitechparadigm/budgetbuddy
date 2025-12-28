/**
 * Mock Authentication for Development Testing
 *
 * This provides a temporary authentication solution for testing
 * the transaction planning features without full auth setup.
 */

import { TokenManager } from '../services/api';

// Mock JWT token for development (this would normally come from Cognito)
const MOCK_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImZhbWlseUlkIjoiZmFtaWx5XzEyMyIsImZpcnN0TmFtZSI6IkpvaG4iLCJsYXN0TmFtZSI6IkRvZSIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTczMDU4MDAwMCwiZXhwIjoxNzMwNjY2NDAwfQ.mock-signature-for-development';

export interface MockUser {
  userId: string;
  familyId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export const mockUser: MockUser = {
  userId: 'user_123',
  familyId: 'family_test_20251026', // Updated to match existing budgets in database
  firstName: 'John',
  lastName: 'Doe',
  email: 'test@example.com'
};

/**
 * Initialize mock authentication for development
 * Call this when the app starts to simulate being logged in
 */
export function initMockAuth(): void {
  console.log('🔧 Mock Authentication Initialized for Development');
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
}

/**
 * Check if mock auth is active
 */
export function isMockAuthActive(): boolean {
  return TokenManager.getToken() === MOCK_JWT_TOKEN;
}
