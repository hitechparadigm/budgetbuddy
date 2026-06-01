/**
 * Accounts API Service
 * Handles account management, balance tracking, and reconciliation
 *
 * **Validates: Requirements 2, 3, 5, 8, 11**
 */

import { config } from '../config/environment';

const MAIN_API_BASE = config.apiBaseUrl;

// Get token from localStorage
function getToken(): string | null {
  return localStorage.getItem('budgetbuddy_id_token');
}

// API Error class
export class AccountsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown,
    public isNetworkError: boolean = false
  ) {
    super(message);
    this.name = 'AccountsApiError';
  }
}

// Check if error is a network error
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return true;
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }
  return false;
}

// Extract user-friendly error message from response
function extractErrorMessage(errorData: unknown, statusCode: number): string {
  if (typeof errorData === 'object' && errorData !== null) {
    const data = errorData as Record<string, unknown>;
    // Try various error message fields
    if (typeof data.message === 'string' && data.message) {
      return data.message;
    }
    if (typeof data.error === 'string' && data.error) {
      return data.error;
    }
    if (data.data && typeof data.data === 'object') {
      const nestedData = data.data as Record<string, unknown>;
      if (typeof nestedData.message === 'string' && nestedData.message) {
        return nestedData.message;
      }
    }
  }

  // Default messages based on status code
  switch (statusCode) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'Please sign in to continue.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'This operation conflicts with existing data.';
    case 500:
      return 'Server error. Please try again later.';
    default:
      return `Request failed (${statusCode})`;
  }
}

// Core API function
async function accountsApiCall<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${MAIN_API_BASE}${endpoint}`;

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  const token = getToken();
  if (!token) {
    throw new AccountsApiError(
      'Please sign in to continue.',
      401,
      { reason: 'missing_token' }
    );
  }
  headers.set('Authorization', `Bearer ${token}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData: unknown = null;
      try {
        errorData = await response.json();
      } catch {
        // Response body is not JSON
      }

      const errorMessage = extractErrorMessage(errorData, response.status);
      throw new AccountsApiError(errorMessage, response.status, errorData);
    }

    return response.json();
  } catch (error) {
    // Re-throw AccountsApiError as-is
    if (error instanceof AccountsApiError) {
      throw error;
    }

    // Handle network errors
    if (isNetworkError(error)) {
      throw new AccountsApiError(
        'Network error. Please check your internet connection and try again.',
        0,
        { originalError: error instanceof Error ? error.message : 'Unknown error' },
        true
      );
    }

    // Handle other errors
    throw new AccountsApiError(
      'An unexpected error occurred. Please try again.',
      0,
      { originalError: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}

// Account Types
export type AccountType = 'banking' | 'cash' | 'credit_card' | 'investment' | 'loan';

export type BankingSubtype = 'checking' | 'savings' | 'money_market';
export type CashSubtype = 'cash' | 'petty_cash';
export type CreditCardSubtype = 'credit_card' | 'charge_card';
export type InvestmentSubtype = 'brokerage' | 'retirement' | '401k' | 'ira' | 'roth_ira' | 'hsa';
export type LoanSubtype = 'mortgage' | 'auto' | 'student' | 'personal' | 'heloc';

export type AccountSubtype = BankingSubtype | CashSubtype | CreditCardSubtype | InvestmentSubtype | LoanSubtype;

// Account Interface
export interface Account {
  accountId: string;
  budgetId: string;
  accountType: AccountType;
  accountSubtype: AccountSubtype;
  nickname: string;
  institutionName: string | null;
  mask: string | null;
  currentBalance: number;
  currency: string;
  isManual: boolean;
  isTracked: boolean;
  plaidAccountId: string | null;
  plaidItemId: string | null;
  lastSynced: string | null;
  lastReconciled: string | null;
  createdAt: string;
  updatedAt: string;
}

// Create Account Input
export interface CreateAccountInput {
  accountType: AccountType;
  accountSubtype: AccountSubtype;
  nickname: string;
  institutionName?: string;
  currentBalance: number;
  currency?: string;
}

// Update Account Input
export interface UpdateAccountInput {
  nickname?: string;
  institutionName?: string;
  currentBalance?: number;
  isTracked?: boolean;
}

// Reconcile Input
export interface ReconcileInput {
  newBalance: number;
  notes?: string;
}

// Reconcile Result
export interface ReconcileResult {
  account: Account;
  previousBalance: number;
  adjustmentAmount: number;
  notes: string | null;
}

// Accounts Summary
export interface AccountsSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  accountsByType: Record<AccountType, Account[]>;
  accountCount: number;
}

// API Response types - handles both standardized { success, data, message } and legacy formats
interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  // Legacy format fields
  accounts?: Account[];
  account?: Account;
}

// Helper to extract data from response (handles both formats)
function extractData<T>(response: ApiResponse<T>, fallbackKey?: keyof ApiResponse<T>): T {
  // Standardized format: { success, data, message }
  if (response.data !== undefined) {
    return response.data;
  }
  // Legacy format: data at root level
  if (fallbackKey && response[fallbackKey] !== undefined) {
    return response[fallbackKey] as T;
  }
  // Return the whole response as data (for backwards compatibility)
  return response as unknown as T;
}

// Accounts API
export const accountsApi = {
  // Get all accounts
  async getAccounts(filters?: { accountType?: AccountType; isManual?: boolean; isTracked?: boolean }): Promise<Account[]> {
    let endpoint = '/accounts';
    const params = new URLSearchParams();

    if (filters?.accountType) params.append('accountType', filters.accountType);
    if (filters?.isManual !== undefined) params.append('isManual', String(filters.isManual));
    if (filters?.isTracked !== undefined) params.append('isTracked', String(filters.isTracked));

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    const response = await accountsApiCall<ApiResponse<{ accounts: Account[] }>>(endpoint);
    // Handle both { data: { accounts } } and { accounts }
    const data = extractData(response, 'accounts' as keyof typeof response);
    return (data as { accounts: Account[] }).accounts || (response.accounts as Account[]) || [];
  },

  // Get single account
  async getAccount(accountId: string): Promise<Account> {
    const response = await accountsApiCall<ApiResponse<Account>>(`/accounts/${accountId}`);
    return extractData(response, 'account' as keyof typeof response);
  },

  // Create account
  async createAccount(input: CreateAccountInput): Promise<Account> {
    const response = await accountsApiCall<ApiResponse<{ account: Account }>>('/accounts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    // Handle both { data: { account } } and { account }
    const data = extractData(response, 'account' as keyof typeof response);
    return (data as { account: Account }).account || (response.account as Account) || data as Account;
  },

  // Update account
  async updateAccount(accountId: string, input: UpdateAccountInput): Promise<Account> {
    const response = await accountsApiCall<ApiResponse<{ account: Account }>>(`/accounts/${accountId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    // Handle both { data: { account } } and { account }
    const data = extractData(response, 'account' as keyof typeof response);
    return (data as { account: Account }).account || (response.account as Account) || data as Account;
  },

  // Delete account
  async deleteAccount(accountId: string): Promise<void> {
    await accountsApiCall(`/accounts/${accountId}`, {
      method: 'DELETE',
    });
  },

  // Reconcile account
  async reconcileAccount(accountId: string, input: ReconcileInput): Promise<ReconcileResult> {
    const response = await accountsApiCall<ApiResponse<ReconcileResult>>(`/accounts/${accountId}/reconcile`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return extractData(response);
  },

  // Set account tracking
  async setAccountTracking(accountId: string, isTracked: boolean): Promise<Account> {
    const response = await accountsApiCall<ApiResponse<{ account: Account }>>(`/accounts/${accountId}/tracking`, {
      method: 'PUT',
      body: JSON.stringify({ isTracked }),
    });
    const data = extractData(response, 'account' as keyof typeof response);
    return (data as { account: Account }).account || (response.account as Account) || data as Account;
  },

  // Get accounts summary
  async getAccountsSummary(): Promise<AccountsSummary> {
    const response = await accountsApiCall<ApiResponse<AccountsSummary>>('/accounts/summary');
    return extractData(response);
  },
};

export default accountsApi;
