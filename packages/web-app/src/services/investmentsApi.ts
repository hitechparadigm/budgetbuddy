/**
 * Investments API Service
 * Handles investment portfolio tracking, holdings, and performance
 *
 * **Validates: Requirement 45**
 */

import { config } from '../config/environment';

// Investments is on the features API (0poeu07vth), not the main API
const MAIN_API_BASE = config.featuresApiUrl;

// Get token from localStorage
function getToken(): string | null {
  return localStorage.getItem('budgetbuddy_id_token');
}

// API Error class
export class InvestmentsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'InvestmentsApiError';
  }
}

// Core API function
async function investmentsApiCall<T = any>(
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
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // Use default error message
    }
    throw new InvestmentsApiError(errorMessage, response.status);
  }

  return response.json();
}

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

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string | null;
  sentiment: 'Bearish' | 'Somewhat-Bearish' | 'Neutral' | 'Somewhat-Bullish' | 'Bullish';
  sentimentScore: number;
  relatedTickers: Array<{ ticker: string; relevance: number; sentiment: string }>;
  bannerImage: string | null;
}

export interface MarketNewsResponse {
  news: NewsArticle[];
  count: number;
  fetchedAt: string;
  message?: string;
}

export interface MarketSignal {
  ticker: string;
  price: string;
  changeAmount: string;
  changePercent: string;
  volume: string;
  category: 'gainer' | 'loser' | 'active';
}

export interface MarketSignalsResponse {
  topGainers: MarketSignal[];
  topLosers: MarketSignal[];
  mostActive: MarketSignal[];
  portfolioSignals: MarketSignal[];
  fetchedAt: string;
  message?: string;
}

// API Methods
export const investmentsApi = {
  /**
   * Get portfolio overview with summary statistics
   */
  async getPortfolio(): Promise<PortfolioSummary> {
    return investmentsApiCall<PortfolioSummary>('/investments');
  },

  /**
   * Get all holdings
   */
  async getHoldings(): Promise<Holding[]> {
    const response = await investmentsApiCall<{ holdings: Holding[] }>('/investments/holdings');
    return response.holdings;
  },

  /**
   * Create a new holding
   */
  async createHolding(data: CreateHoldingRequest): Promise<Holding> {
    return investmentsApiCall<Holding>('/investments/holdings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing holding
   */
  async updateHolding(holdingId: string, data: UpdateHoldingRequest): Promise<Holding> {
    return investmentsApiCall<Holding>(`/investments/holdings/${holdingId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a holding
   */
  async deleteHolding(holdingId: string): Promise<{ success: boolean }> {
    return investmentsApiCall<{ success: boolean }>(`/investments/holdings/${holdingId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get performance history
   * @param period - Time period: 1M, 3M, 6M, 1Y, ALL
   */
  async getPerformance(period: string = '1M'): Promise<PerformanceHistory> {
    return investmentsApiCall<PerformanceHistory>(`/investments/performance?period=${period}`);
  },

  /**
   * Save current portfolio snapshot
   */
  async saveSnapshot(): Promise<any> {
    return investmentsApiCall('/investments/snapshot', {
      method: 'POST',
    });
  },

  /**
   * Get market news articles via Alpha Vantage.
   * @param symbols - Optional comma-separated tickers e.g. "AAPL,MSFT"
   * @param topics  - Optional topics e.g. "finance,economy,earnings"
   */
  async getNews(symbols?: string, topics?: string): Promise<MarketNewsResponse> {
    const params = new URLSearchParams();
    if (symbols) params.set('symbols', symbols);
    if (topics) params.set('topics', topics);
    const qs = params.toString();
    return investmentsApiCall<MarketNewsResponse>(`/investments/news${qs ? '?' + qs : ''}`);
  },

  /**
   * Get market trending signals (top gainers, losers, most active) via Alpha Vantage.
   * @param symbols - Optional comma-separated portfolio tickers to highlight
   */
  async getSignals(symbols?: string): Promise<MarketSignalsResponse> {
    const qs = symbols ? `?symbols=${encodeURIComponent(symbols)}` : '';
    return investmentsApiCall<MarketSignalsResponse>(`/investments/signals${qs}`);
  },
};
