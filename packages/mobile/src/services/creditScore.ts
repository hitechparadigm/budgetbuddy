/**
 * Credit Score Service for Mobile
 * Handles credit score monitoring and history
 *
 * **Validates: Requirement 43**
 */

import { api } from './api';

// Types
export interface CreditFactor {
  name: string;
  impact: 'high' | 'medium' | 'low';
  status: string;
}

export interface CreditScore {
  score: number;
  rating: string;
  provider: string;
  scoreType: string;
  factors: CreditFactor[];
  lastUpdated: string;
  change: number;
  changeDirection: 'up' | 'down' | 'same';
}

export interface CreditScoreHistoryEntry {
  date: string;
  score: number;
  rating: string;
  change: number;
}

export interface CreditScoreHistory {
  history: CreditScoreHistoryEntry[];
}

export interface CreditScoreSettings {
  notificationsEnabled: boolean;
  notificationThreshold: number;
}

// Credit Score API
export const creditScoreService = {
  // Get current credit score
  async getCreditScore(): Promise<CreditScore> {
    const response = await api.get('/credit-score');
    return response.data.data;
  },

  // Get credit score history
  async getHistory(): Promise<CreditScoreHistory> {
    const response = await api.get('/credit-score/history');
    return response.data.data;
  },

  // Refresh credit score from bureau
  async refreshScore(): Promise<CreditScore> {
    const response = await api.post('/credit-score/refresh');
    return response.data.data;
  },

  // Get credit score settings
  async getSettings(): Promise<CreditScoreSettings> {
    const response = await api.get('/credit-score/settings');
    return response.data.data;
  },

  // Update credit score settings
  async updateSettings(settings: Partial<CreditScoreSettings>): Promise<CreditScoreSettings> {
    const response = await api.put('/credit-score/settings', settings);
    return response.data.data;
  },
};
