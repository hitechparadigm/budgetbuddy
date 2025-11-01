/**
 * Transaction API Service
 * Handles all transaction-related API calls
 */

import { ApiClient } from './client';

// ============================================================================
// Types
// ============================================================================

export interface Transaction {
  transactionId: string;
  familyId: string;
  userId: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId: string;
  description: string;
  merchant?: string;
  transactionDate: string;
  budgetMonth: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface CreateTransactionRequest {
  amount: number;
  type: 'income' | 'expense';
  categoryId: string;
  description: string;
  merchant?: string;
  date?: string; // ISO date string, defaults to today
}

export interface UpdateTransactionRequest {
  amount?: number;
  type?: 'income' | 'expense';
  categoryId?: string;
  description?: string;
  merchant?: string;
  date?: string;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  type?: 'income' | 'expense';
  limit?: number;
  offset?: number;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  count: number;
  pagination: {
    limit: number;
    offset: number;
  };
}

export interface TransactionResponse {
  transaction: Transaction;
}

// ============================================================================
// Transaction Service
// ============================================================================

export class TransactionService {
  constructor(private client: ApiClient) {}

  /**
   * Get all transactions with optional filtering
   */
  async getTransactions(filters: TransactionFilters = {}): Promise<TransactionListResponse> {
    const queryParams = new URLSearchParams();

    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.categoryId) queryParams.append('categoryId', filters.categoryId);
    if (filters.type) queryParams.append('type', filters.type);
    if (filters.limit) queryParams.append('limit', filters.limit.toString());
    if (filters.offset) queryParams.append('offset', filters.offset.toString());

    const queryString = queryParams.toString();
    const endpoint = `/transactions${queryString ? `?${queryString}` : ''}`;

    const response = await this.client['request']<{ data: TransactionListResponse }>(endpoint);
    return response.data;
  }

  /**
   * Get a single transaction by ID
   */
  async getTransaction(transactionId: string): Promise<Transaction> {
    const response = await this.client['request']<{ data: TransactionResponse }>(`/transactions/${transactionId}`);
    return response.data.transaction;
  }

  /**
   * Create a new transaction
   */
  async createTransaction(data: CreateTransactionRequest): Promise<Transaction> {
    const response = await this.client['request']<{ data: TransactionResponse }>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data.transaction;
  }

  /**
   * Update an existing transaction
   */
  async updateTransaction(transactionId: string, data: UpdateTransactionRequest): Promise<Transaction> {
    const response = await this.client['request']<{ data: TransactionResponse }>(`/transactions/${transactionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data.transaction;
  }

  /**
   * Delete a transaction
   */
  async deleteTransaction(transactionId: string): Promise<void> {
    await this.client['request'](`/transactions/${transactionId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get transaction summary for a date range
   */
  async getTransactionSummary(startDate: string, endDate: string): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
    transactionCount: number;
  }> {
    const transactions = await this.getTransactions({ startDate, endDate });

    const income = transactions.transactions.filter(t => t.type === 'income');
    const expenses = transactions.transactions.filter(t => t.type === 'expense');

    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome,
      totalExpenses,
      netAmount: totalIncome - totalExpenses,
      transactionCount: transactions.transactions.length,
    };
  }

  /**
   * Get transactions grouped by category
   */
  async getTransactionsByCategory(filters: TransactionFilters = {}): Promise<Record<string, Transaction[]>> {
    const transactions = await this.getTransactions(filters);

    return transactions.transactions.reduce((groups, transaction) => {
      const category = transaction.categoryId;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(transaction);
      return groups;
    }, {} as Record<string, Transaction[]>);
  }

  /**
   * Health check for transaction service
   */
  async healthCheck(): Promise<{ status: string; service: string; version: string }> {
    const response = await this.client['request']<{ data: any }>('/transactions/health');
    return response.data;
  }
}

// ============================================================================
// Export
// ============================================================================

export default TransactionService;
