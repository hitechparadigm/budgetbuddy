/**
 * Insights Service for Mobile
 * Handles financial insights, trends, and AI-powered analytics
 *
 * **Validates: Requirement 39**
 */

import { api } from './api';

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

export interface TrendsResponse {
  months: string[];
  spending: number[];
  income: number[];
  savings: number[];
  savingsRate: number[];
  analysis: {
    spendingTrend: 'increasing' | 'decreasing' | 'stable';
    savingsTrend: 'increasing' | 'decreasing' | 'stable';
    averageSpending: number;
    averageSavings: number;
  };
}

export interface SpendingPattern {
  dayOfWeek: Array<{ day: string; amount: number; count: number }>;
  timeOfMonth: Array<{ period: string; amount: number; count: number }>;
  topMerchants: Array<{ merchant: string; amount: number; count: number }>;
}

export interface PatternsResponse {
  patterns: SpendingPattern;
  period: {
    start: string;
    end: string;
  };
}

export interface AskResponse {
  question: string;
  answer: string;
  context?: {
    totalSpent?: number;
    topCategories?: Array<{ category: string; amount: number }>;
    period?: string;
  };
  suggestions?: string[];
}

// Insights API
export const insightsService = {
  // Get weekly insights
  async getWeeklyInsights(): Promise<WeeklyInsightsResponse> {
    const response = await api.get('/insights/weekly');
    return response.data.data;
  },

  // Get spending trends
  async getTrends(months: number = 6): Promise<TrendsResponse> {
    const response = await api.get('/insights/trends', { months });
    return response.data.data;
  },

  // Get spending patterns
  async getPatterns(months: number = 3): Promise<PatternsResponse> {
    const response = await api.get('/insights/patterns', { months });
    return response.data.data;
  },

  // Ask AI about spending
  async askAboutSpending(question: string): Promise<AskResponse> {
    const response = await api.post('/insights/ask', { question });
    return response.data.data;
  },
};

export default insightsService;
