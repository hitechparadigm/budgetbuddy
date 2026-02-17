/**
 * Investments Service
 * Handles investment portfolio tracking, holdings, and performance
 *
 * **Validates: Requirement 45**
 */

import { apiCall } from './api';

// Types
export interface Holding {
  holdingId: string;
  symbol: string;
  name: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  previousPrice?: number;
  accountType: 'brokerage' | '401k' | 'ira' | 'roth_ira' | 'hsa' | 'crypto';
  lastUpdated: string;
  createdAt: string;
}

export interface AssetAllocation {
  type: string;
  value: number;
  percent: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
  allocation: AssetAllocation[];
  holdings: Holding[];
}

export interface PerformanceDataPoint {
  date: string;
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
}

export interface PerformanceHistory {
  performance: PerformanceDataPoint[];
  totalReturn: number;
  totalReturnPercent: number;
  period: string;
  message?: string;
}

export interface CreateHoldingRequest {
  symbol: string;
  name: string;
  shares: number;
  costBasis: number;
  currentPrice?: number;
  accountType: Holding['accountType'];
}

export interface UpdateHoldingRequest {
  shares?: number;
  costBasis?: number;
  currentPrice?: number;
  accountType?: Holding['accountType'];
}

// API Methods
export const investmentsService = {
  /**
   * Get portfolio overview with summary statistics
   */
  async getPortfolio(): Promise<PortfolioSummary> {
    return apiCall<PortfolioSummary>('/investments');
  },

  /**
   * Get all holdings
   */
  async getHoldings(): Promise<Holding[]> {
    const response = await apiCall<{ holdings: Holding[] }>('/investments/holdings');
    return response.holdings;
  },

  /**
   * Create a new holding
   */
  async createHolding(data: CreateHoldingRequest): Promise<Holding> {
    return apiCall<Holding>('/investments/holdings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing holding
   */
  async updateHolding(holdingId: string, data: UpdateHoldingRequest): Promise<Holding> {
    return apiCall<Holding>(`/investments/holdings/${holdingId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a holding
   */
  async deleteHolding(holdingId: string): Promise<{ success: boolean }> {
    return apiCall<{ success: boolean }>(`/investments/holdings/${holdingId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get performance history
   * @param period - Time period: 1M, 3M, 6M, 1Y, ALL
   */
  async getPerformance(period: string = '1M'): Promise<PerformanceHistory> {
    return apiCall<PerformanceHistory>(`/investments/performance?period=${period}`);
  },

  /**
   * Save current portfolio snapshot
   */
  async saveSnapshot(): Promise<any> {
    return apiCall('/investments/snapshot', {
      method: 'POST',
    });
  },
};
