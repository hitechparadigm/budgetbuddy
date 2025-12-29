import { QueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * API Configuration and Client
 * Handles API requests with offline support and caching
 */

// API Configuration
export const API_CONFIG = {
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://api.budgetbuddy.com',
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
};

// Network status tracking
let isOnline = true;
let networkListenerUnsubscribe: (() => void) | null = null;

/**
 * Initialize network status monitoring
 */
export const initializeNetworkMonitoring = () => {
  // Subscribe to network state changes
  networkListenerUnsubscribe = NetInfo.addEventListener(state => {
    isOnline = state.isConnected ?? false;
    console.log('Network status changed:', { isOnline, type: state.type });
  });

  // Get initial network state
  NetInfo.fetch().then(state => {
    isOnline = state.isConnected ?? false;
  });
};

/**
 * Cleanup network monitoring
 */
export const cleanupNetworkMonitoring = () => {
  if (networkListenerUnsubscribe) {
    networkListenerUnsubscribe();
    networkListenerUnsubscribe = null;
  }
};

/**
 * Get current network status
 */
export const getNetworkStatus = () => ({
  isOnline,
  isOffline: !isOnline,
});

/**
 * API Request types
 */
export interface ApiRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  params?: Record<string, string | number>;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
  error?: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: any;

  constructor(error: { message: string; status: number; code?: string; details?: any }) {
    super(error.message);
    this.name = 'ApiError';
    this.status = error.status;
    this.code = error.code;
    this.details = error.details;
  }
}

/**
 * Get authentication token from storage
 */
const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('auth_token');
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
};

/**
 * Build request headers
 */
const buildHeaders = async (customHeaders: Record<string, string> = {}): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...customHeaders,
  };

  // Add auth token if available
  const token = await getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Build request URL with parameters
 */
const buildUrl = (endpoint: string, params?: Record<string, string | number>): string => {
  const url = new URL(endpoint, API_CONFIG.baseURL);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  return url.toString();
};

/**
 * Handle API errors
 */
const handleApiError = (error: any, request: ApiRequest): ApiError => {
  if (error.response) {
    // Server responded with error status
    return new ApiError({
      message: error.response.data?.message || error.message || 'Server error',
      status: error.response.status,
      code: error.response.data?.code,
      details: error.response.data,
    });
  } else if (error.request) {
    // Network error
    return new ApiError({
      message: isOnline ? 'Network error' : 'No internet connection',
      status: 0,
      code: 'NETWORK_ERROR',
      details: { isOnline, endpoint: request.endpoint },
    });
  } else {
    // Other error
    return new ApiError({
      message: error.message || 'Unknown error',
      status: 0,
      code: 'UNKNOWN_ERROR',
      details: error,
    });
  }
};

/**
 * Retry logic for failed requests
 */
const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  attempt: number = 1
): Promise<T> => {
  try {
    return await requestFn();
  } catch (error) {
    if (attempt < API_CONFIG.retryAttempts) {
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay * attempt));
      return retryRequest(requestFn, attempt + 1);
    }
    throw error;
  }
};

/**
 * Make API request
 */
export const apiRequest = async <T = any>(request: ApiRequest): Promise<ApiResponse<T>> => {
  const { endpoint, method, data, params, headers: customHeaders, requiresAuth = true } = request;

  // Check if request requires auth and we're not authenticated
  if (requiresAuth) {
    const token = await getAuthToken();
    if (!token) {
      throw new ApiError({
        message: 'Authentication required',
        status: 401,
        code: 'AUTH_REQUIRED',
      });
    }
  }

  const requestFn = async () => {
    const url = buildUrl(endpoint, params);
    const headers = await buildHeaders(customHeaders);

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(API_CONFIG.timeout),
    };

    if (data && method !== 'GET') {
      fetchOptions.body = JSON.stringify(data);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        response: {
          status: response.status,
          data: errorData,
        },
        message: errorData.message || response.statusText,
      };
    }

    const responseData = await response.json();

    return {
      data: responseData,
      status: response.status,
      message: responseData.message,
    };
  };

  try {
    return await retryRequest(requestFn);
  } catch (error) {
    throw handleApiError(error, request);
  }
};

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T = any>(endpoint: string, params?: Record<string, string | number>, options?: Partial<ApiRequest>) =>
    apiRequest<T>({ endpoint, method: 'GET', params, ...options }),

  post: <T = any>(endpoint: string, data?: any, options?: Partial<ApiRequest>) =>
    apiRequest<T>({ endpoint, method: 'POST', data, ...options }),

  put: <T = any>(endpoint: string, data?: any, options?: Partial<ApiRequest>) =>
    apiRequest<T>({ endpoint, method: 'PUT', data, ...options }),

  patch: <T = any>(endpoint: string, data?: any, options?: Partial<ApiRequest>) =>
    apiRequest<T>({ endpoint, method: 'PATCH', data, ...options }),

  delete: <T = any>(endpoint: string, options?: Partial<ApiRequest>) =>
    apiRequest<T>({ endpoint, method: 'DELETE', ...options }),
};

/**
 * React Query configuration
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      cacheTime: 10 * 60 * 1000,
      // Retry failed requests 3 times
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Don't retry on client errors (4xx)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Don't refetch on window focus in mobile app
      refetchOnWindowFocus: false,
      // Refetch on network reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Retry with 1 second delay
      retryDelay: 1000,
    },
  },
});

/**
 * Query keys for consistent caching
 */
export const queryKeys = {
  // Auth
  user: ['user'] as const,

  // Budgets
  budgets: ['budgets'] as const,
  budget: (id: string) => ['budgets', id] as const,
  budgetsByMonth: (year: number, month: number) => ['budgets', 'month', year, month] as const,
  recurringBudgets: ['budgets', 'recurring'] as const,
  upcomingOccurrences: (daysAhead: number) => ['budgets', 'upcoming', daysAhead] as const,

  // Transactions
  transactions: ['transactions'] as const,
  transaction: (id: string) => ['transactions', id] as const,
  transactionsByBudget: (budgetId: string) => ['transactions', 'budget', budgetId] as const,
  transactionsByMonth: (year: number, month: number) => ['transactions', 'month', year, month] as const,

  // Categories
  categories: ['categories'] as const,

  // Summary
  summary: ['summary'] as const,
  summaryByMonth: (year: number, month: number) => ['summary', 'month', year, month] as const,
};

/**
 * Initialize API client
 */
export const initializeApiClient = () => {
  initializeNetworkMonitoring();
  console.log('API client initialized');
};

/**
 * Cleanup API client
 */
export const cleanupApiClient = () => {
  cleanupNetworkMonitoring();
  queryClient.clear();
  console.log('API client cleaned up');
};
