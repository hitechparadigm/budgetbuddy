/**
 * Mock Authentication for Development Testing
 *
 * ⚠️  WARNING: FOR DEVELOPMENT USE ONLY ⚠️
 * This provides a temporary authentication solution for testing
 * the transaction planning features without full auth setup.
 *
 * DO NOT USE IN PRODUCTION - Contains mock tokens for testing only
 */

import { TokenManager } from '../services/api';
import { mockAuthGuard } from '@/security/MockAuthGuard';

// Mock JWT token for development ONLY (this would normally come from Cognito)
// This is a fake token with mock data - NOT a real authentication token
const MOCK_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJNT0NLX1VTRVJfSUQiLCJmYW1pbHlJZCI6Im1vY2tfZmFtaWx5IiwiZmlyc3ROYW1lIjoiVGVzdCIsImxhc3ROYW1lIjoiVXNlciIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTczMDU4MDAwMCwiZXhwIjoxNzMwNjY2NDAwfQ.MOCK_SIGNATURE_FOR_DEVELOPMENT_ONLY';

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
  // Security check: Ensure mock auth is allowed in current environment
  if (!mockAuthGuard.canInitializeMockAuth()) {
    console.error('🚫 Mock Authentication BLOCKED: Not allowed in current environment');
    return;
  }

  // Validate environment safety
  const validation = mockAuthGuard.validateMockAuthSafety();
  if (!validation.isValid) {
    console.error('🚫 Mock Authentication BLOCKED:', validation.errors);
    return;
  }

  // Show warnings if any
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Mock Authentication Warnings:', validation.warnings);
  }

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
