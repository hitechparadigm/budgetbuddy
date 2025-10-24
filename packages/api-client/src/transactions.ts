/**
 * Transaction API methods
 */

import { 
  Transaction, 
  CreateTransactionRequest, 
  TransactionFilter,
  ApiResponse 
} from '@budget-buddy/shared';
import { getApiClient } from './client';

export const transactionApi = {
  async getTransactions(filter?: TransactionFilter): Promise<ApiResponse<Transaction[]>> {
    const client = getApiClient();
    const queryParams = filter ? `?${new URLSearchParams(filter as any).toString()}` : '';
    return client.get<Transaction[]>(`/transactions${queryParams}`);
  },

  async getTransaction(transactionId: string): Promise<ApiResponse<Transaction>> {
    const client = getApiClient();
    return client.get<Transaction>(`/transactions/${transactionId}`);
  },

  async createTransaction(transactionData: CreateTransactionRequest): Promise<ApiResponse<Transaction>> {
    const client = getApiClient();
    return client.post<Transaction>('/transactions', transactionData);
  },

  async updateTransaction(transactionId: string, updates: Partial<CreateTransactionRequest>): Promise<ApiResponse<Transaction>> {
    const client = getApiClient();
    return client.put<Transaction>(`/transactions/${transactionId}`, updates);
  },

  async deleteTransaction(transactionId: string): Promise<ApiResponse<void>> {
    const client = getApiClient();
    return client.delete<void>(`/transactions/${transactionId}`);
  },

  async getTransactionsByCategory(categoryId: string, limit?: number): Promise<ApiResponse<Transaction[]>> {
    const client = getApiClient();
    const queryParams = limit ? `?limit=${limit}` : '';
    return client.get<Transaction[]>(`/transactions/category/${categoryId}${queryParams}`);
  },

  async getTransactionsByMonth(month: string): Promise<ApiResponse<Transaction[]>> {
    const client = getApiClient();
    return client.get<Transaction[]>(`/transactions/month/${month}`);
  },

  async searchTransactions(query: string, limit?: number): Promise<ApiResponse<Transaction[]>> {
    const client = getApiClient();
    const queryParams = new URLSearchParams({ q: query });
    if (limit) queryParams.set('limit', limit.toString());
    return client.get<Transaction[]>(`/transactions/search?${queryParams.toString()}`);
  },
};