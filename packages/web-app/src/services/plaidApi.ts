/**
 * Plaid API Service
 * Handles bank account linking via Plaid
 */

const FEATURES_API_BASE = 'https://0poeu07vth.execute-api.us-east-1.amazonaws.com/v1';

// Get token from localStorage
function getToken(): string | null {
  return localStorage.getItem('budgetbuddy_access_token');
}

// API Error class
export class PlaidApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'PlaidApiError';
  }
}

// Core API function for Features API
async function plaidApiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${FEATURES_API_BASE}${endpoint}`;

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
    throw new PlaidApiError(errorMessage, response.status);
  }

  return response.json();
}

// Types
export interface PlaidAccount {
  accountId: string;
  institutionName: string;
  accountName: string;
  officialName?: string;
  accountType: string;
  accountSubtype?: string;
  accountMask: string;
  currentBalance: number;
  availableBalance?: number;
  isoCurrencyCode: string;
  lastSyncAt: string | null;
  status: string;
  createdAt: string;
}

export interface PendingTransaction {
  pendingId: string;
  plaidAccountId: string;
  amount: number;
  description: string;
  merchant: string;
  date: string;
  suggestedCategory: string;
  categoryDetailed?: string;
  isPending: boolean;
  paymentChannel?: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
  };
  status: string;
  createdAt: string;
}

export interface SyncStatus {
  accountId: string;
  institutionName: string;
  accountName: string;
  lastSyncAt: string | null;
  syncsToday: number;
  syncsRemaining: number;
  canSync: boolean;
  nextSyncAvailable: string;
}

// Plaid API
export const plaidApi = {
  // Health check
  async healthCheck() {
    const response = await plaidApiCall('/plaid/health');
    return response.data;
  },

  // Create link token for Plaid Link
  async createLinkToken(): Promise<{ linkToken: string; expiration: string; environment: string }> {
    const response = await plaidApiCall('/plaid/link-token', {
      method: 'POST',
    });
    return response.data;
  },

  // Exchange public token after Plaid Link success
  async exchangeToken(publicToken: string, institutionName?: string): Promise<{
    itemId: string;
    accounts: PlaidAccount[];
    institutionName: string;
  }> {
    const response = await plaidApiCall('/plaid/exchange-token', {
      method: 'POST',
      body: JSON.stringify({ publicToken, institutionName }),
    });
    return response.data;
  },

  // Get all linked accounts
  async getAccounts(): Promise<{ accounts: PlaidAccount[]; count: number }> {
    const response = await plaidApiCall('/plaid/accounts');
    return response.data;
  },

  // Unlink an account
  async unlinkAccount(accountId: string): Promise<void> {
    await plaidApiCall(`/plaid/accounts/${accountId}`, {
      method: 'DELETE',
    });
  },

  // Sync all accounts
  async syncAll(): Promise<{
    results: Array<{
      accountId: string;
      status: string;
      transactionsAdded?: number;
      reason?: string;
    }>;
    syncedCount: number;
    skippedCount: number;
  }> {
    const response = await plaidApiCall('/plaid/sync', {
      method: 'POST',
    });
    return response.data;
  },

  // Get pending transactions
  async getPendingTransactions(): Promise<{ transactions: PendingTransaction[]; count: number }> {
    const response = await plaidApiCall('/plaid/pending');
    return response.data;
  },

  // Approve pending transactions
  async approveTransactions(transactionIds: string[], categoryMappings?: Record<string, { categoryId: string; categoryName: string }>): Promise<{
    approved: Array<{ pendingId: string; transactionId: string }>;
    failed: Array<{ id: string; reason: string }>;
  }> {
    const response = await plaidApiCall('/plaid/pending/approve', {
      method: 'POST',
      body: JSON.stringify({ transactionIds, categoryMappings }),
    });
    return response.data;
  },

  // Reject pending transactions
  async rejectTransactions(transactionIds: string[], reason?: string): Promise<{
    rejected: Array<{ pendingId: string }>;
    failed: Array<{ id: string; reason: string }>;
  }> {
    const response = await plaidApiCall('/plaid/pending/reject', {
      method: 'POST',
      body: JSON.stringify({ transactionIds, reason }),
    });
    return response.data;
  },

  // Get sync status
  async getSyncStatus(): Promise<{ accounts: SyncStatus[]; dailyLimit: number }> {
    const response = await plaidApiCall('/plaid/sync-status');
    return response.data;
  },

  // Create sandbox test account (sandbox only)
  async createSandboxAccount(institutionId?: string): Promise<{
    itemId: string;
    accounts: PlaidAccount[];
    institutionName: string;
  }> {
    const response = await plaidApiCall('/plaid/sandbox/create-item', {
      method: 'POST',
      body: JSON.stringify({ institutionId }),
    });
    return response.data;
  },
};

export default plaidApi;
