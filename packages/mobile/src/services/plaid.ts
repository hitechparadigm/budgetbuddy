/**
 * Plaid API Service for Mobile
 *
 * Handles communication with the Plaid backend for bank account linking,
 * transaction sync, and pending transaction management.
 */

import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_FEATURES_API_URL ||
  "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1";

export interface LinkedAccount {
  accountId: string;
  institutionName: string;
  accountName: string;
  accountType: string;
  accountSubtype: string;
  mask: string;
  currentBalance: number;
  availableBalance: number | null;
  currency: string;
  lastSynced: string | null;
  syncStatus: "active" | "error" | "pending";
  itemId: string;
}

export interface PendingTransaction {
  pendingId: string;
  accountId: string;
  institutionName: string;
  plaidTransactionId: string;
  amount: number;
  merchantName: string | null;
  description: string;
  date: string;
  category: string[];
  suggestedCategory: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface SyncStatus {
  lastSync: string | null;
  accountsCount: number;
  pendingCount: number;
  syncInProgress: boolean;
}

/**
 * Get auth headers
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await SecureStore.getItemAsync("budgetbuddy_id_token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * Create a Plaid Link token for account linking
 */
export async function createLinkToken(): Promise<{
  linkToken: string;
  expiration: string;
  environment: string;
}> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/plaid/link-token`, {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create link token");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Exchange public token for access token after successful Plaid Link
 */
export async function exchangePublicToken(
  publicToken: string
): Promise<{ accounts: LinkedAccount[] }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/plaid/exchange-token`, {
    method: "POST",
    headers,
    body: JSON.stringify({ publicToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to exchange token");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Get all linked bank accounts
 */
export async function getLinkedAccounts(): Promise<LinkedAccount[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/plaid/accounts`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to get linked accounts");
  }

  const data = await response.json();
  return data.data?.accounts || [];
}

/**
 * Unlink a bank account
 */
export async function unlinkAccount(accountId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/plaid/accounts/${accountId}`, {
    method: "DELETE",
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to unlink account");
  }
}

/**
 * Sync transactions for all linked accounts
 */
export async function syncAllTransactions(): Promise<{
  synced: number;
  pending: number;
}> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/plaid/sync`, {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to sync transactions");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Sync transactions for a specific account
 */
export async function syncAccountTransactions(
  accountId: string
): Promise<{ synced: number; pending: number }> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/plaid/accounts/${accountId}/sync`,
    {
      method: "POST",
      headers,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to sync account");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Get pending transactions awaiting approval
 */
export async function getPendingTransactions(): Promise<PendingTransaction[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/plaid/pending`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to get pending transactions");
  }

  const data = await response.json();
  return data.data?.transactions || [];
}

/**
 * Approve pending transactions
 */
export async function approvePendingTransactions(
  pendingIds: string[],
  categoryOverrides?: Record<string, string>
): Promise<{ approved: number; created: number }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/plaid/pending/approve`, {
    method: "POST",
    headers,
    body: JSON.stringify({ pendingIds, categoryOverrides }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to approve transactions");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Reject pending transactions
 */
export async function rejectPendingTransactions(
  pendingIds: string[]
): Promise<{ rejected: number }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/plaid/pending/reject`, {
    method: "POST",
    headers,
    body: JSON.stringify({ pendingIds }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to reject transactions");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/plaid/sync-status`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to get sync status");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Create sandbox test item (development only)
 */
export async function createSandboxItem(): Promise<{
  accounts: LinkedAccount[];
}> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/plaid/sandbox/create-item`, {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create sandbox item");
  }

  const data = await response.json();
  return data.data;
}

/**
 * Open Plaid Link in a web browser (fallback for mobile)
 * Note: For production, use react-native-plaid-link-sdk
 */
export async function openPlaidLink(linkToken: string): Promise<void> {
  // For now, we use a web-based approach
  // In production, integrate react-native-plaid-link-sdk
  const plaidUrl = `https://cdn.plaid.com/link/v2/stable/link.html?token=${linkToken}`;
  await WebBrowser.openBrowserAsync(plaidUrl);
}
