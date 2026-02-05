/**
 * Credit Score API Service
 *
 * Handles all credit score monitoring API calls
 * Requirements: 43.1, 43.2, 43.3, 43.5, 43.6, 43.7, 43.8
 */

import { apiClient } from '../utils/apiClient';

export interface CreditScore {
  score: number | null;
  rating: string;
  lastUpdated: string;
  factors: CreditFactor[];
  change: number;
  changeDirection: 'up' | 'down' | 'none';
}

export interface CreditFactor {
  name: string;
  impact: 'high' | 'medium' | 'low';
  status: string;
}

export interface CreditScoreHistory {
  date: string;
  score: number;
  rating: string;
  change: number;
}

export interface CreditScoreSettings {
  connected: boolean;
  notificationsEnabled: boolean;
}

/**
 * Get current credit score
 */
export async function getCreditScore(): Promise<CreditScore> {
  const response = await apiClient.get('/credit-score');
  return response.data;
}

/**
 * Get credit score history (last 12 months)
 */
export async function getCreditScoreHistory(): Promise<{ history: CreditScoreHistory[] }> {
  const response = await apiClient.get('/credit-score/history');
  return response.data;
}

/**
 * Refresh credit score from credit bureau
 */
export async function refreshCreditScore(): Promise<CreditScore> {
  const response = await apiClient.post('/credit-score/refresh');
  return response.data;
}

/**
 * Update credit score monitoring settings
 */
export async function updateCreditScoreSettings(settings: Partial<CreditScoreSettings>): Promise<{ message: string; settings: CreditScoreSettings }> {
  const response = await apiClient.put('/credit-score/settings', settings);
  return response.data;
}
