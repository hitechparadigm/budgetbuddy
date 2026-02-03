/**
 * Accounts API Service
 * Handles account management, balance tracking, and reconciliation
 *
 * **Validates: Requirements 2, 3, 5, 8, 11**
 */

const MAIN_API_BASE = 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1';

// Get token from localStorage
function getToken(): string | null {
  return localStorage.getItem('budgetbuddy_id_token');
}

// API Error class
export class AccountsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AccountsApiError';
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
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Use default error message
    }
    throw new AccountsApiError(errorMessage, response.status);
  }

  return response.json();
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
  familyId: string;
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

// API Response types
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
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
    return response.data.accounts;
  },

  // Get single account
  async getAccount(accountId: string): Promise<Account> {
    const response = await accountsApiCall<ApiResponse<Account>>(`/accounts/${accountId}`);
    return response.data;
  },

  // Create account
  async createAccount(input: CreateAccountInput): Promise<Account> {
    const response = await accountsApiCall<ApiResponse<Account>>('/accounts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.data;
  },

  // Update account
  async updateAccount(accountId: string, input: UpdateAccountInput): Promise<Account> {
    const response = await accountsApiCall<ApiResponse<Account>>(`/accounts/${accountId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return response.data;
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
    return response.data;
  },

  // Set account tracking
  async setAccountTracking(accountId: string, isTracked: boolean): Promise<Account> {
    const response = await accountsApiCall<ApiResponse<Account>>(`/accounts/${accountId}/tracking`, {
      method: 'PUT',
      body: JSON.stringify({ isTracked }),
    });
    return response.data;
  },

  // Get accounts summary
  async getAccountsSummary(): Promise<AccountsSummary> {
    const response = await accountsApiCall<ApiResponse<AccountsSummary>>('/accounts/summary');
    return response.data;
  },
};

export default accountsApi;
