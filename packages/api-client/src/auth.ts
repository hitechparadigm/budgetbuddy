/**
 * Authentication API methods
 */

import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse,
  ApiResponse 
} from '@budget-buddy/shared';
import { getApiClient } from './client';

export const authApi = {
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const client = getApiClient();
    return client.post<AuthResponse>('/auth/login', credentials);
  },

  async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    const client = getApiClient();
    return client.post<AuthResponse>('/auth/register', userData);
  },

  async logout(): Promise<ApiResponse<void>> {
    const client = getApiClient();
    const response = await client.post<void>('/auth/logout');
    client.clearAccessToken();
    return response;
  },

  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthResponse>> {
    const client = getApiClient();
    return client.post<AuthResponse>('/auth/refresh', { refreshToken });
  },

  async verifyEmail(token: string): Promise<ApiResponse<void>> {
    const client = getApiClient();
    return client.post<void>('/auth/verify-email', { token });
  },

  async requestPasswordReset(email: string): Promise<ApiResponse<void>> {
    const client = getApiClient();
    return client.post<void>('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<void>> {
    const client = getApiClient();
    return client.post<void>('/auth/reset-password', { token, newPassword });
  },

  async getCurrentUser(): Promise<ApiResponse<AuthResponse['user']>> {
    const client = getApiClient();
    return client.get<AuthResponse['user']>('/auth/me');
  },
};