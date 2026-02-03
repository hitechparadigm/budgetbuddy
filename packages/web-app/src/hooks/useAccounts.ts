/**
 * Account Hooks
 * Custom hooks for account management with loading states and error handling
 *
 * **Validates: Requirements 2.6, 3.5**
 */

import { useState, useEffect, useCallback } from 'react';
import {
  accountsApi,
  Account,
  AccountType,
  AccountsSummary,
  CreateAccountInput,
  UpdateAccountInput,
  ReconcileInput,
  ReconcileResult,
  AccountsApiError,
} from '../services/accountsApi';

// Hook return types
interface UseAccountsReturn {
  accounts: Account[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseAccountReturn {
  account: Account | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseAccountsSummaryReturn {
  summary: AccountsSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseAccountMutationsReturn {
  createAccount: (input: CreateAccountInput) => Promise<Account>;
  updateAccount: (accountId: string, input: UpdateAccountInput) => Promise<Account>;
  deleteAccount: (accountId: string) => Promise<void>;
  reconcileAccount: (accountId: string, input: ReconcileInput) => Promise<ReconcileResult>;
  setAccountTracking: (accountId: string, isTracked: boolean) => Promise<Account>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for fetching all accounts
 */
export function useAccounts(filters?: {
  accountType?: AccountType;
  isManual?: boolean;
  isTracked?: boolean;
}): UseAccountsReturn {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await accountsApi.getAccounts(filters);
      setAccounts(data);
    } catch (err) {
      const message = err instanceof AccountsApiError
        ? err.message
        : 'Failed to load accounts';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters?.accountType, filters?.isManual, filters?.isTracked]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return {
    accounts,
    isLoading,
    error,
    refetch: fetchAccounts,
  };
}

/**
 * Hook for fetching a single account
 */
export function useAccount(accountId: string | null): UseAccountReturn {
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccount = useCallback(async () => {
    if (!accountId) {
      setAccount(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await accountsApi.getAccount(accountId);
      setAccount(data);
    } catch (err) {
      const message = err instanceof AccountsApiError
        ? err.message
        : 'Failed to load account';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  return {
    account,
    isLoading,
    error,
    refetch: fetchAccount,
  };
}

/**
 * Hook for fetching accounts summary (net worth data)
 */
export function useAccountsSummary(): UseAccountsSummaryReturn {
  const [summary, setSummary] = useState<AccountsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await accountsApi.getAccountsSummary();
      setSummary(data);
    } catch (err) {
      const message = err instanceof AccountsApiError
        ? err.message
        : 'Failed to load accounts summary';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    isLoading,
    error,
    refetch: fetchSummary,
  };
}

/**
 * Hook for account mutations (create, update, delete, reconcile, tracking)
 */
export function useAccountMutations(): UseAccountMutationsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAccount = useCallback(async (input: CreateAccountInput): Promise<Account> => {
    setIsLoading(true);
    setError(null);
    try {
      const account = await accountsApi.createAccount(input);
      return account;
    } catch (err) {
      const message = err instanceof AccountsApiError
        ? err.message
        : 'Failed to create account';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateAccount = useCallback(async (accountId: string, input: UpdateAccountInput): Promise<Account> => {
    setIsLoading(true);
    setError(null);
    try {
      const account = await accountsApi.updateAccount(accountId, input);
      return account;
    } catch (err) {
      const message = err instanceof AccountsApiError
        ? err.message
        : 'Failed to update account';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteAccount = useCallback(async (accountId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await accountsApi.deleteAccount(accountId);
    } catch (err) {
      const message = err instanceof AccountsApiError
        ? err.message
        : 'Failed to delete account';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reconcileAccount = useCallback(async (accountId: string, input: ReconcileInput): Promise<ReconcileResult> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await accountsApi.reconcileAccount(accountId, input);
      return result;
    } catch (err) {
      const message = err instanceof AccountsApiError
        ? err.message
        : 'Failed to reconcile account';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setAccountTracking = useCallback(async (accountId: string, isTracked: boolean): Promise<Account> => {
    setIsLoading(true);
    setError(null);
    try {
      const account = await accountsApi.setAccountTracking(accountId, isTracked);
      return account;
    } catch (err) {
      const message = err instanceof AccountsApiError
        ? err.message
        : 'Failed to update account tracking';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createAccount,
    updateAccount,
    deleteAccount,
    reconcileAccount,
    setAccountTracking,
    isLoading,
    error,
  };
}

// Re-export types for convenience
export type {
  Account,
  AccountType,
  AccountsSummary,
  CreateAccountInput,
  UpdateAccountInput,
  ReconcileInput,
  ReconcileResult,
};
