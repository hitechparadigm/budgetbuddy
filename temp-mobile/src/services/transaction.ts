/**
 * Transaction Service
 * Handles transaction CRUD operations with offline support
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys, getNetworkStatus } from './api';
import {
  storeOfflineData,
  getOfflineData,
  deleteOfflineData,
  addToSyncQueue,
} from './offline';
import { Transaction, BudgetCategory } from '../types';

/**
 * Transaction request types
 */
export interface CreateTransactionRequest {
  categoryId: string;
  amount: number;
  description: string;
  merchant?: string;
  date: string; // YYYY-MM-DD
  currency?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  tags?: string[];
  receiptUrl?: string;
  isRecurring?: boolean;
  recurringTemplateId?: string;
}

export interface UpdateTransactionRequest extends Partial<CreateTransactionRequest> {
  id: string;
}

export interface TransactionFilters {
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  merchant?: string;
  description?: string;
  tags?: string[];
  syncStatus?: 'synced' | 'pending' | 'failed';
}

export interface TransactionSummary {
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  categoryBreakdown: {
    categoryId: string;
    categoryName: string;
    amount: number;
    transactionCount: number;
  }[];
  merchantBreakdown: {
    merchant: string;
    amount: number;
    transactionCount: number;
  }[];
  dailyTotals: {
    date: string;
    amount: number;
    transactionCount: number;
  }[];
}

/**
 * Generate unique ID for offline transactions
 */
const generateTransactionId = (): string => {
  return `transaction_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Fetch transactions from API or offline storage
 */
const fetchTransactions = async (filters?: TransactionFilters): Promise<Transaction[]> => {
  const { isOnline } = getNetworkStatus();

  try {
    if (isOnline) {
      // Try to fetch from API
      const response = await api.get<Transaction[]>('/transactions', filters as Record<string, string | number>);

      // Store in offline storage
      for (const transaction of response.data) {
        await storeOfflineData('transactions', transaction, 'synced');
      }

      return response.data;
    }
  } catch (error) {
    console.warn('Failed to fetch transactions from API, using offline data:', error);
  }

  // Fallback to offline data
  const offlineTransactions = await getOfflineData<Transaction>('transactions', filters);
  return offlineTransactions;
};

/**
 * Fetch single transaction
 */
const fetchTransaction = async (transactionId: string): Promise<Transaction | null> => {
  const { isOnline } = getNetworkStatus();

  try {
    if (isOnline) {
      const response = await api.get<Transaction>(`/transactions/${transactionId}`);
      await storeOfflineData('transactions', response.data, 'synced');
      return response.data;
    }
  } catch (error) {
    console.warn('Failed to fetch transaction from API, using offline data:', error);
  }

  // Fallback to offline data
  const offlineTransactions = await getOfflineData<Transaction>('transactions', { id: transactionId });
  return offlineTransactions[0] || null;
};

/**
 * Fetch transaction summary for a date range
 */
const fetchTransactionSummary = async (
  startDate: string,
  endDate: string,
  categoryId?: string
): Promise<TransactionSummary> => {
  const filters: TransactionFilters = {
    startDate,
    endDate,
    ...(categoryId && { categoryId }),
  };

  const transactions = await fetchTransactions(filters);

  // Calculate summary
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const transactionCount = transactions.length;
  const averageAmount = transactionCount > 0 ? totalAmount / transactionCount : 0;

  // Category breakdown
  const categoryMap = new Map<string, { amount: number; count: number; name: string }>();
  transactions.forEach(t => {
    const existing = categoryMap.get(t.categoryId) || { amount: 0, count: 0, name: 'Unknown' };
    categoryMap.set(t.categoryId, {
      amount: existing.amount + t.amount,
      count: existing.count + 1,
      name: existing.name, // This would need to be populated from category data
    });
  });

  const categoryBreakdown = Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
    categoryId,
    categoryName: data.name,
    amount: data.amount,
    transactionCount: data.count,
  }));

  // Merchant breakdown
  const merchantMap = new Map<string, { amount: number; count: number }>();
  transactions.forEach(t => {
    if (t.merchant) {
      const existing = merchantMap.get(t.merchant) || { amount: 0, count: 0 };
      merchantMap.set(t.merchant, {
        amount: existing.amount + t.amount,
        count: existing.count + 1,
      });
    }
  });

  const merchantBreakdown = Array.from(merchantMap.entries()).map(([merchant, data]) => ({
    merchant,
    amount: data.amount,
    transactionCount: data.count,
  }));

  // Daily totals
  const dailyMap = new Map<string, { amount: number; count: number }>();
  transactions.forEach(t => {
    const existing = dailyMap.get(t.date) || { amount: 0, count: 0 };
    dailyMap.set(t.date, {
      amount: existing.amount + t.amount,
      count: existing.count + 1,
    });
  });

  const dailyTotals = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      amount: data.amount,
      transactionCount: data.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalAmount,
    transactionCount,
    averageAmount,
    categoryBreakdown,
    merchantBreakdown,
    dailyTotals,
  };
};

/**
 * Create new transaction
 */
const createTransaction = async (transactionData: CreateTransactionRequest): Promise<Transaction> => {
  const { isOnline } = getNetworkStatus();
  const now = new Date().toISOString();

  const newTransaction: Transaction = {
    id: generateTransactionId(),
    ...transactionData,
    syncStatus: isOnline ? 'pending' : 'pending',
    createdAt: now,
    updatedAt: now,
  };

  // Store offline first
  await storeOfflineData('transactions', newTransaction, isOnline ? 'pending' : 'pending');

  if (isOnline) {
    try {
      // Try to create on server
      const response = await api.post<Transaction>('/transactions', transactionData);

      // Update with server ID and mark as synced
      const serverTransaction = response.data;
      await storeOfflineData('transactions', serverTransaction, 'synced');

      return serverTransaction;
    } catch (error) {
      console.warn('Failed to create transaction on server, queued for sync:', error);

      // Add to sync queue
      await addToSyncQueue({
        type: 'CREATE',
        entity: 'transaction',
        data: newTransaction,
      });
    }
  } else {
    // Add to sync queue for when online
    await addToSyncQueue({
      type: 'CREATE',
      entity: 'transaction',
      data: newTransaction,
    });
  }

  return newTransaction;
};

/**
 * Update existing transaction
 */
const updateTransaction = async (transactionData: UpdateTransactionRequest): Promise<Transaction> => {
  const { isOnline } = getNetworkStatus();
  const now = new Date().toISOString();

  // Get existing transaction
  const existingTransactions = await getOfflineData<Transaction>('transactions', { id: transactionData.id });
  const existingTransaction = existingTransactions[0];

  if (!existingTransaction) {
    throw new Error('Transaction not found');
  }

  const updatedTransaction: Transaction = {
    ...existingTransaction,
    ...transactionData,
    updatedAt: now,
    syncStatus: isOnline ? 'pending' : 'pending',
  };

  // Store offline first
  await storeOfflineData('transactions', updatedTransaction, isOnline ? 'pending' : 'pending');

  if (isOnline) {
    try {
      // Try to update on server
      const response = await api.put<Transaction>(`/transactions/${transactionData.id}`, transactionData);

      // Mark as synced
      const serverTransaction = response.data;
      await storeOfflineData('transactions', serverTransaction, 'synced');

      return serverTransaction;
    } catch (error) {
      console.warn('Failed to update transaction on server, queued for sync:', error);

      // Add to sync queue
      await addToSyncQueue({
        type: 'UPDATE',
        entity: 'transaction',
        data: updatedTransaction,
      });
    }
  } else {
    // Add to sync queue for when online
    await addToSyncQueue({
      type: 'UPDATE',
      entity: 'transaction',
      data: updatedTransaction,
    });
  }

  return updatedTransaction;
};

/**
 * Delete transaction
 */
const deleteTransaction = async (transactionId: string): Promise<void> => {
  const { isOnline } = getNetworkStatus();

  // Soft delete offline
  await deleteOfflineData('transactions', transactionId);

  if (isOnline) {
    try {
      // Try to delete on server
      await api.delete(`/transactions/${transactionId}`);
    } catch (error) {
      console.warn('Failed to delete transaction on server, queued for sync:', error);

      // Add to sync queue
      await addToSyncQueue({
        type: 'DELETE',
        entity: 'transaction',
        data: { id: transactionId },
      });
    }
  } else {
    // Add to sync queue for when online
    await addToSyncQueue({
      type: 'DELETE',
      entity: 'transaction',
      data: { id: transactionId },
    });
  }
};

/**
 * Get recent transactions for quick-add suggestions
 */
const getRecentTransactions = async (limit: number = 10): Promise<Transaction[]> => {
  const transactions = await fetchTransactions();
  return transactions
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
};

/**
 * Get frequent merchants for suggestions
 */
const getFrequentMerchants = async (limit: number = 10): Promise<string[]> => {
  const transactions = await fetchTransactions();
  const merchantCounts = new Map<string, number>();

  transactions.forEach(t => {
    if (t.merchant) {
      merchantCounts.set(t.merchant, (merchantCounts.get(t.merchant) || 0) + 1);
    }
  });

  return Array.from(merchantCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([merchant]) => merchant);
};

/**
 * React Query Hooks
 */

export const useTransactions = (filters?: TransactionFilters) => {
  return useQuery({
    queryKey: queryKeys.transactions,
    queryFn: () => fetchTransactions(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useTransaction = (transactionId: string) => {
  return useQuery({
    queryKey: queryKeys.transaction(transactionId),
    queryFn: () => fetchTransaction(transactionId),
    enabled: !!transactionId,
  });
};

export const useTransactionsByCategory = (categoryId: string) => {
  return useQuery({
    queryKey: queryKeys.transactionsByBudget(categoryId),
    queryFn: () => fetchTransactions({ categoryId }),
    enabled: !!categoryId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useTransactionsByMonth = (year: number, month: number) => {
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;

  return useQuery({
    queryKey: queryKeys.transactionsByMonth(year, month),
    queryFn: () => fetchTransactions({ startDate, endDate }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useTransactionSummary = (startDate: string, endDate: string, categoryId?: string) => {
  return useQuery({
    queryKey: ['transactionSummary', startDate, endDate, categoryId],
    queryFn: () => fetchTransactionSummary(startDate, endDate, categoryId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useRecentTransactions = (limit: number = 10) => {
  return useQuery({
    queryKey: ['recentTransactions', limit],
    queryFn: () => getRecentTransactions(limit),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useFrequentMerchants = (limit: number = 10) => {
  return useQuery({
    queryKey: ['frequentMerchants', limit],
    queryFn: () => getFrequentMerchants(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets });
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTransaction,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaction(data.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets });
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets });
    },
  });
};
