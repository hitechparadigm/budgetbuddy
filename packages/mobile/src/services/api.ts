import { QueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  apiBaseUrl,
  featuresApiUrl,
  extendedFeaturesApiUrl,
  budgetsApiUrl,
} from '../config/api';
import { ID_TOKEN_KEY } from './storage-keys';

/**
 * API Configuration and Client
 * Handles API requests with offline support and caching
 */

// API Configuration. `baseURL` is the main gateway; the other three gateways
// are reached through the per-gateway clients exported at the bottom of this
// file (featuresApi, extendedFeaturesApi, budgetsApi).
export const API_CONFIG = {
  baseURL: apiBaseUrl,
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
  /**
   * Which API Gateway to send this request to. Defaults to the main gateway.
   * Normally set by the per-gateway client rather than per call site.
   */
  baseUrl?: string;
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
// ID_TOKEN_KEY comes from services/storage-keys and must match what
// services/auth.ts writes - that is the only place a real session token is
// ever stored (SecureStore on native, localStorage on web via the same
// Platform.OS branch). Reading any other key sends every request out with no
// Authorization header at all.
const getAuthToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(ID_TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(ID_TOKEN_KEY);
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
 *
 * new URL(endpoint, base) drops the base URL's own path (e.g. '/v1')
 * whenever endpoint starts with '/', per the WHATWG URL spec (a leading
 * slash is resolved as absolute-from-origin). Every call site here passes
 * a leading-slash endpoint ('/budgets', etc.), so the API Gateway stage
 * prefix must be concatenated manually instead of relying on URL base
 * resolution to preserve it.
 */
const buildUrl = (
  endpoint: string,
  params?: Record<string, string | number>,
  baseUrl?: string
): string => {
  const base = (baseUrl ?? API_CONFIG.baseURL).replace(/\/+$/, '');
  const path = endpoint.replace(/^\/+/, '');
  const url = new URL(`${base}/${path}`);
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
 * Whether a failed request is worth sending again.
 *
 * A 4xx is the server rejecting the request itself, so replaying it byte for
 * byte cannot produce a different answer - and for a POST it is actively
 * harmful: the first attempt may already have written, leaving the caller to
 * wait out two more attempts before it sees the real status. POST
 * /auth/onboarding is exactly that case - attempt 1 creates the budget,
 * attempts 2 and 3 return 409. This matches the queryClient retry policy
 * below, which also stops at any 4xx.
 *
 * Network and timeout failures carry no status and stay retryable, which is
 * what the retry exists for on mobile.
 */
export const isRetryableError = (error: unknown): boolean => {
  const err = error as { response?: { status?: number }; status?: number };
  const status = err?.response?.status ?? err?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return false;
  }
  return true;
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
    if (attempt < API_CONFIG.retryAttempts && isRetryableError(error)) {
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
  const {
    endpoint,
    method,
    data,
    params,
    headers: customHeaders,
    requiresAuth = true,
    baseUrl,
  } = request;

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
    const url = buildUrl(endpoint, params, baseUrl);
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

export interface ApiClient {
  get: <T = any>(
    endpoint: string,
    params?: Record<string, string | number>,
    options?: Partial<ApiRequest>
  ) => Promise<ApiResponse<T>>;
  post: <T = any>(endpoint: string, data?: any, options?: Partial<ApiRequest>) => Promise<ApiResponse<T>>;
  put: <T = any>(endpoint: string, data?: any, options?: Partial<ApiRequest>) => Promise<ApiResponse<T>>;
  patch: <T = any>(endpoint: string, data?: any, options?: Partial<ApiRequest>) => Promise<ApiResponse<T>>;
  delete: <T = any>(endpoint: string, options?: Partial<ApiRequest>) => Promise<ApiResponse<T>>;
}

/**
 * Build a client bound to one API Gateway.
 *
 * A caller can still override the gateway per call via `options.baseUrl`, but
 * picking the right client is the intended mechanism: there are four gateways
 * and roughly forty call sites.
 */
export const createApiClient = (baseUrl: string): ApiClient => ({
  get: (endpoint, params, options) =>
    apiRequest({ endpoint, method: 'GET', params, baseUrl, ...options }),

  post: (endpoint, data, options) =>
    apiRequest({ endpoint, method: 'POST', data, baseUrl, ...options }),

  put: (endpoint, data, options) =>
    apiRequest({ endpoint, method: 'PUT', data, baseUrl, ...options }),

  patch: (endpoint, data, options) =>
    apiRequest({ endpoint, method: 'PATCH', data, baseUrl, ...options }),

  delete: (endpoint, options) =>
    apiRequest({ endpoint, method: 'DELETE', baseUrl, ...options }),
});

/** Main gateway: auth, budget, transactions, accounts, goals, bills, ai. */
export const api = createApiClient(apiBaseUrl);

/** Features gateway: investments, plaid, tips, learn, subscriptions, debts, credit-score. */
export const featuresApi = createApiClient(featuresApiUrl);

/** Extended features gateway: insights, receipt, patterns, rules, net-worth. */
export const extendedFeaturesApi = createApiClient(extendedFeaturesApiUrl);

/** Budgets gateway: budget collaboration, members, invitations. */
export const budgetsApi = createApiClient(budgetsApiUrl);

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

/**
 * Get the shared API client object (get/post/put/patch/delete helpers).
 * Services that need an object with HTTP-verb methods (rather than the
 * `apiRequest`/`apiCall` functions) should use this.
 */
export const getApiClient = () => api;

/**
 * Generic fetch-style API call helper for services that build their own
 * RequestInit-like options (method/body) rather than using `api.get/post/...`.
 */
export const apiCall = async <T = any>(
  endpoint: string,
  options: {
    method?: ApiRequest['method'];
    body?: string;
    headers?: Record<string, string>;
    /** Target gateway; defaults to the main gateway. */
    baseUrl?: string;
  } = {}
): Promise<T> => {
  const { method = 'GET', body, headers, baseUrl } = options;
  const response = await apiRequest<T>({
    endpoint,
    method,
    data: body ? JSON.parse(body) : undefined,
    headers,
    baseUrl,
  });
  return response.data;
};