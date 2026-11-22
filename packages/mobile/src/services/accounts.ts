/**
 * Accounts service
 *
 * Lists the budget's accounts (including the Cash account onboarding creates)
 * with GET /accounts on the main gateway, the endpoint the web app's
 * accountsApi.getAccounts uses.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export type AccountType = 'cash' | 'banking' | 'credit_card' | 'investment' | 'loan';

export interface Account {
  accountId: string;
  accountType: AccountType | string;
  accountSubtype?: string;
  nickname: string;
  institutionName?: string | null;
  currentBalance: number;
  currency?: string;
  isManual?: boolean;
  isTracked?: boolean;
}

/** Tolerates both `{data: {accounts}}` and `{accounts}`, like the web client. */
export const fetchAccounts = async (): Promise<Account[]> => {
  const response = await api.get('/accounts');
  return response.data?.data?.accounts ?? response.data?.accounts ?? [];
};

export const useAccounts = () =>
  useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
  });
