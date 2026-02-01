/**
 * Insights API Service
 * Handles financial insights, trends, and analytics
 */

const MAIN_API_BASE = 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1';

// Get token from localStorage
function getToken(): string | null {
  return localStorage.getItem('budgetbuddy_id_token');
}

// API Error class
export class InsightsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'InsightsApiError';
  }
}

// Core API function
async function insightsApiCall<T = any>(
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
    throw new InsightsApiError(errorMessage, response.status);
  }

  return response.json();
}

// Types
export interface SpendingSummary {
  totalSpent: number;
  totalIncome: number;
  savingsRate: number;
  transactionCount: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  change?: number;
  changePercent?: number;
}

export interface Insight {
  type: 'positive' | 'warning' | 'info';
  title: string;
  message: string;
  category?: string;
  amount?: number;
}

export interface WeeklyInsightsResponse {
  period: {
    start: string;
    end: string;
    type: 'weekly';
  };
  summary: SpendingSummary;
  comparison: {
    previousPeriod: SpendingSummary;
    spendingChange: number;
    incomeChange: number;
  };
  categoryBreakdown: CategoryBreakdown[];
  insights: Insight[];
  patterns: any[];
}

export interface MonthlyInsightsResponse {
  period: {
    month: string;
    type: 'monthly';
  };
  summary: SpendingSummary;
  comparison: {
    previousMonth: SpendingSummary;
    spendingChange: number;
    savingsChange: number;
  };
  categoryBreakdown: CategoryBreakdown[];
  budgetComparison: any;
  insights: Insight[];
}

export interface TrendsResponse {
  months: string[];
  spending: number[];
  income: number[];
  savings: number[];
  savingsRate: number[];
  categoryTrends: Record<string, Array<{ month: string; amount: number }>>;
  analysis: {
    spendingTrend: 'increasing' | 'decreasing' | 'stable';
    savingsTrend: 'increasing' | 'decreasing' | 'stable';
    averageSpending: number;
    averageSavings: number;
  };
}

// Insights API
export const insightsApi = {
  // Get weekly insights
  async getWeeklyInsights(): Promise<WeeklyInsightsResponse> {
    const response = await insightsApiCall('/insights/weekly');
    return response.data;
  },

  // Get monthly insights
  async getMonthlyInsights(month?: string): Promise<MonthlyInsightsResponse> {
    const params = new URLSearchParams();
    if (month) params.append('month', month);

    const queryString = params.toString();
    const endpoint = `/insights/monthly${queryString ? `?${queryString}` : ''}`;

    const response = await insightsApiCall(endpoint);
    return response.data;
  },

  // Get spending trends
  async getTrends(months: number = 6): Promise<TrendsResponse> {
    const params = new URLSearchParams();
    params.append('months', months.toString());

    const response = await insightsApiCall(`/insights/trends?${params.toString()}`);
    return response.data;
  },
};

export default insightsApi;
