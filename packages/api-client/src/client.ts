/**
 * BudgetBuddy API Client
 * Authenticated HTTP client wrapper for all API communications
 */

// ============================================================================
// Inline Types (will be moved to shared package later)
// ============================================================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}

export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
  details?: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: string;
  errors?: string[];
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterResponse {
  message: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  accountType: string;
  subscriptionTier: string;
  nextSteps: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  idToken: string;
  user: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    accountType: string;
    subscriptionTier: string;
  };
  expiresIn: number;
}

// ============================================================================
// Configuration
// ============================================================================

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

const DEFAULT_CONFIG: Required<ApiClientConfig> = {
  baseUrl: 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1',
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
};

// ============================================================================
// Token Management
// ============================================================================

class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'budgetbuddy_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'budgetbuddy_refresh_token';
  private static readonly ID_TOKEN_KEY = 'budgetbuddy_id_token';
  private static readonly EXPIRES_AT_KEY = 'budgetbuddy_expires_at';

  static setTokens(tokens: AuthTokens): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
      localStorage.setItem(this.ID_TOKEN_KEY, tokens.idToken);

      // Calculate expiration time
      const expiresAt = Date.now() + (tokens.expiresIn * 1000);
      localStorage.setItem(this.EXPIRES_AT_KEY, expiresAt.toString());
    }
  }

  static getTokens(): AuthTokens | null {
    if (typeof window === 'undefined') return null;

    const accessToken = localStorage.getItem(this.ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    const idToken = localStorage.getItem(this.ID_TOKEN_KEY);
    const expiresAt = localStorage.getItem(this.EXPIRES_AT_KEY);

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

  static clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.ID_TOKEN_KEY);
      localStorage.removeItem(this.EXPIRES_AT_KEY);
    }
  }

  static isTokenExpired(): boolean {
    if (typeof window === 'undefined') return true;

    const expiresAt = localStorage.getItem(this.EXPIRES_AT_KEY);
    if (!expiresAt) return true;

    return Date.now() >= parseInt(expiresAt);
  }

  static getAccessToken(): string | null {
    const tokens = this.getTokens();
    return tokens?.accessToken || null;
  }
}

// ============================================================================
// HTTP Client
// ============================================================================

export class ApiClient {
  private config: Required<ApiClientConfig>;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Core HTTP Methods
  // ============================================================================

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;

    // Add authentication header if available
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    const accessToken = TokenManager.getAccessToken();
    if (accessToken && !TokenManager.isTokenExpired()) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    };

    try {
      const response = await this.fetchWithRetry(url, requestOptions);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw new ApiClientError(error.message, 0);
      }
      throw error;
    }
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt = 1
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);

      // If unauthorized and we have a refresh token, try to refresh
      if (response.status === 401 && !this.isRefreshing) {
        await this.refreshTokenIfNeeded();

        // Retry the request with new token
        const accessToken = TokenManager.getAccessToken();
        if (accessToken) {
          const headers = new Headers(options.headers);
          headers.set('Authorization', `Bearer ${accessToken}`);
          return fetch(url, { ...options, headers });
        }
      }

      return response;
    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        await this.delay(this.config.retryDelay * attempt);
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: ApiError;

    try {
      errorData = await response.json();
    } catch {
      errorData = {
        error: 'Unknown Error',
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    throw new ApiClientError(
      errorData.message || 'An error occurred',
      response.status,
      errorData
    );
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    if (this.isRefreshing) {
      return this.refreshPromise || Promise.resolve();
    }

    const tokens = TokenManager.getTokens();
    if (!tokens?.refreshToken) {
      TokenManager.clearTokens();
      throw new ApiClientError('No refresh token available', 401);
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh(tokens.refreshToken);

    try {
      await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(refreshToken: string): Promise<void> {
    try {
      // TODO: Implement refresh token endpoint when available
      // For now, clear tokens and require re-login
      TokenManager.clearTokens();
      throw new ApiClientError('Token refresh not implemented', 401);
    } catch (error) {
      TokenManager.clearTokens();
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Authentication Methods
  // ============================================================================

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await this.request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return response;
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Store tokens after successful login
    TokenManager.setTokens({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      idToken: response.idToken,
      expiresIn: response.expiresIn,
    });

    return response;
  }

  async logout(): Promise<void> {
    TokenManager.clearTokens();
    // TODO: Call logout endpoint when available
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  isAuthenticated(): boolean {
    const tokens = TokenManager.getTokens();
    return tokens !== null && !TokenManager.isTokenExpired();
  }

  getTokens(): AuthTokens | null {
    return TokenManager.getTokens();
  }

  clearTokens(): void {
    TokenManager.clearTokens();
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health');
  }
}

// ============================================================================
// Error Classes
// ============================================================================

export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public apiError?: ApiError
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

  get isServerError(): boolean {
    return this.statusCode >= 500;
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const apiClient = new ApiClient();
export default apiClient;
