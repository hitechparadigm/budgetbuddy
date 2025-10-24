/**
 * Base API client for BudgetBuddy application
 * Handles HTTP requests with authentication, retries, and error handling
 * Provides a consistent interface for all API interactions
 */

import { ApiResponse } from '@budget-buddy/shared';

/**
 * Configuration options for the API client
 */
export interface ApiClientConfig {
  baseUrl: string; // Base URL for all API requests (e.g., 'https://api.budgetbuddy.com')
  timeout?: number; // Request timeout in milliseconds (default: 10000)
  retries?: number; // Number of retry attempts for failed requests (default: 3)
}

/**
 * HTTP client class with built-in authentication, retry logic, and error handling
 * Manages JWT tokens and provides methods for all HTTP verbs
 */
export class ApiClient {
  private baseUrl: string; // API base URL
  private timeout: number; // Request timeout duration
  private retries: number; // Maximum retry attempts
  private accessToken?: string; // JWT access token for authenticated requests

  /**
   * Initialize the API client with configuration
   * @param config - Client configuration including base URL and optional timeout/retry settings
   */
  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 10000; // Default 10 second timeout
    this.retries = config.retries || 3; // Default 3 retry attempts
  }

  /**
   * Set the JWT access token for authenticated requests
   * Token will be included in Authorization header for subsequent requests
   * @param token - JWT access token from authentication response
   */
  setAccessToken(token: string) {
    this.accessToken = token;
  }

  /**
   * Clear the stored access token (used during logout)
   * Removes authentication from subsequent requests
   */
  clearAccessToken() {
    this.accessToken = undefined;
  }

  /**
   * Core HTTP request method with retry logic and error handling
   * Handles authentication, timeouts, and automatic retries for transient failures
   * @param endpoint - API endpoint path (e.g., '/auth/login')
   * @param options - Fetch API options (method, body, headers, etc.)
   * @returns Promise resolving to typed API response
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Set up default headers with JSON content type
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add JWT token to Authorization header if available
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
    };

    let lastError: Error;
    
    // Retry loop with exponential backoff
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        // Set up request timeout using AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Parse JSON response
        const data = await response.json();

        // Check for HTTP error status codes
        if (!response.ok) {
          throw new Error(data.error?.message || `HTTP ${response.status}`);
        }

        return data;
      } catch (error) {
        lastError = error as Error;
        
        // Only retry if we haven't exceeded max attempts and error is retryable
        if (attempt < this.retries && this.shouldRetry(error as Error)) {
          // Exponential backoff: wait 1s, 2s, 4s, etc.
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }
        
        break;
      }
    }

    // If all retries failed, throw the last error
    throw lastError!;
  }

  /**
   * Determine if an error should trigger a retry attempt
   * Retries network errors, timeouts, and server errors (5xx)
   * @param error - The error that occurred during the request
   * @returns true if the request should be retried
   */
  private shouldRetry(error: Error): boolean {
    // Retry on network errors, timeouts, or 5xx server errors
    return error.name === 'AbortError' || 
           error.message.includes('fetch') ||
           error.message.includes('5');
  }

  /**
   * Utility method to create a delay for retry backoff
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after the specified delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Perform a GET request to retrieve data
   * @param endpoint - API endpoint path
   * @returns Promise resolving to typed response data
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'GET' });
  }

  /**
   * Perform a POST request to create or submit data
   * @param endpoint - API endpoint path
   * @param data - Optional request body data (will be JSON stringified)
   * @returns Promise resolving to typed response data
   */
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Perform a PUT request to update existing data
   * @param endpoint - API endpoint path
   * @param data - Optional request body data (will be JSON stringified)
   * @returns Promise resolving to typed response data
   */
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Perform a DELETE request to remove data
   * @param endpoint - API endpoint path
   * @returns Promise resolving to typed response data
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' });
  }
}

// Global API client instance - singleton pattern for consistent configuration
let apiClient: ApiClient;

/**
 * Initialize the global API client with configuration
 * Must be called before using getApiClient() or any API methods
 * @param config - API client configuration
 * @returns Configured API client instance
 */
export const initializeApiClient = (config: ApiClientConfig) => {
  apiClient = new ApiClient(config);
  return apiClient;
};

/**
 * Get the global API client instance
 * Throws error if client hasn't been initialized
 * @returns The configured API client instance
 * @throws Error if initializeApiClient hasn't been called
 */
export const getApiClient = (): ApiClient => {
  if (!apiClient) {
    throw new Error('API client not initialized. Call initializeApiClient first.');
  }
  return apiClient;
};