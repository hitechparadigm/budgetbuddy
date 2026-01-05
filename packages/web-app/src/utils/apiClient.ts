/**
 * Simple API Client for Web App
 * Temporary implementation until workspace dependencies work
 */

import type { LoginRequest, RegisterRequest, AuthTokens } from '../types';

const API_BASE_URL = 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1';

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
    console.log("API CLIENT DEBUG - Making request:");
    console.log("  - URL:", url);
    console.log("  - Method:", options.method || 'GET');
    console.log("  - Has access token:", !!accessToken);
    console.log("  - Access token preview:", accessToken ? accessToken.substring(0, 20) + '...' : 'none');

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

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
      console.error('Network error details:', error);
      throw new ApiClientError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`, 0);
    }
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
    console.log("API CLIENT DEBUG - completeOnboarding called");
    console.log("  - Data:", data);
    console.log("  - Access token exists:", !!this.getAccessToken());
    console.log("  - Access token length:", this.getAccessToken()?.length || 0);

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

  async post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
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
