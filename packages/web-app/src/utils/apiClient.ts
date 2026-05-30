/**
 * Simple API Client for Web App
 * Handles authentication, token management, and API requests
 */

import type { LoginRequest, RegisterRequest, AuthTokens } from '../types';
import { config } from '../config/environment';

const API_BASE_URL = config.apiBaseUrl;

export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'ApiClientError';
  }

  get isNetworkError(): boolean {
    return this.statusCode === 0;
  }

  get isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  get isValidationError(): boolean {
    return this.statusCode === 400;
  }
}

class SimpleApiClient {
  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    const accessToken = this.getAccessToken();

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 - attempt token refresh
      if (response.status === 401 && this.getRefreshToken()) {
        const refreshed = await this.refreshTokens();
        if (refreshed) {
          // Retry the original request with new token
          const newToken = this.getAccessToken();
          if (newToken) {
            headers.set('Authorization', `Bearer ${newToken}`);
          }
          const retryResponse = await fetch(url, { ...options, headers });
          if (!retryResponse.ok) {
            let errorData;
            try {
              errorData = await retryResponse.json();
            } catch {
              errorData = { message: `HTTP ${retryResponse.status}: ${retryResponse.statusText}` };
            }
            throw new ApiClientError(
              errorData.message || 'An error occurred',
              retryResponse.status
            );
          }
          return await retryResponse.json();
        } else {
          // Refresh failed - clear tokens and redirect to login
          this.clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/auth';
          }
          throw new ApiClientError('Session expired. Please log in again.', 401);
        }
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }

        throw new ApiClientError(
          errorData.message || 'An error occurred',
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      throw new ApiClientError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`, 0);
    }
  }

  private async refreshTokens(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      if (data.accessToken && data.idToken) {
        this.setTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || refreshToken,
          idToken: data.idToken,
          expiresIn: data.expiresIn || 3600,
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('budgetbuddy_refresh_token');
  }

  async register(data: RegisterRequest) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginRequest) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Store tokens
    this.setTokens({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      idToken: response.idToken,
      expiresIn: response.expiresIn,
    });

    return response;
  }

  async logout() {
    this.clearTokens();
  }

  async getProfile() {
    return this.request('/auth/profile', {
      method: 'GET',
    });
  }

  async completeOnboarding(data: {
    city: string;
    country: string;
    familySize: number;
    currentMonth: string;
    selectedCategories: Array<{
      name: string;
      icon: string;
      adjustedAmount: number;
    }>;
  }) {
    return this.request('/auth/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Budget endpoints
  async get(endpoint: string) {
    return this.request(endpoint, {
      method: 'GET',
    });
  }

  async post(endpoint: string, data?: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  }

  async put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint: string) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  setTokens(tokens: AuthTokens): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('budgetbuddy_access_token', tokens.accessToken);
      localStorage.setItem('budgetbuddy_refresh_token', tokens.refreshToken);
      localStorage.setItem('budgetbuddy_id_token', tokens.idToken);

      const expiresAt = Date.now() + (tokens.expiresIn * 1000);
      localStorage.setItem('budgetbuddy_expires_at', expiresAt.toString());
    }
  }

  getTokens(): AuthTokens | null {
    if (typeof window === 'undefined') return null;

    const accessToken = localStorage.getItem('budgetbuddy_access_token');
    const refreshToken = localStorage.getItem('budgetbuddy_refresh_token');
    const idToken = localStorage.getItem('budgetbuddy_id_token');
    const expiresAt = localStorage.getItem('budgetbuddy_expires_at');

    if (!accessToken || !refreshToken || !idToken || !expiresAt) {
      return null;
    }

    const expiresIn = Math.max(0, Math.floor((parseInt(expiresAt) - Date.now()) / 1000));

    return {
      accessToken,
      refreshToken,
      idToken,
      expiresIn,
    };
  }

  clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('budgetbuddy_access_token');
      localStorage.removeItem('budgetbuddy_refresh_token');
      localStorage.removeItem('budgetbuddy_id_token');
      localStorage.removeItem('budgetbuddy_expires_at');
    }
  }

  isAuthenticated(): boolean {
    const tokens = this.getTokens();
    if (!tokens) return false;

    const expiresAt = localStorage.getItem('budgetbuddy_expires_at');
    if (!expiresAt) return false;

    return Date.now() < parseInt(expiresAt);
  }

  getAccessToken(): string | null {
    const tokens = this.getTokens();
    // Use ID token for API Gateway Cognito authorizer
    return tokens?.idToken || null;
  }
}

export const apiClient = new SimpleApiClient();
