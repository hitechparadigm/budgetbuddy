/**
 * Credit Score API Service
 *
 * Handles all credit score monitoring API calls
 * Requirements: 43.1, 43.2, 43.3, 43.5, 43.6, 43.7, 43.8
 */

import { config } from '../config/environment';

// Credit score is on the features API (0poeu07vth)
const CREDIT_SCORE_BASE = config.featuresApiUrl;

function getToken(): string | null {
  return localStorage.getItem('budgetbuddy_id_token');
}

async function creditScoreApiCall<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${CREDIT_SCORE_BASE}${endpoint}`;
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${response.status}`);
  }
  const raw = await response.json();
  return raw?.data ?? raw;
}

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
  return await creditScoreApiCall('/credit-score');
}

/**
 * Get credit score history (last 12 months)
 */
export async function getCreditScoreHistory(): Promise<{ history: CreditScoreHistory[] }> {
  return await creditScoreApiCall('/credit-score/history');
}

/**
 * Refresh credit score from credit bureau
 */
export async function refreshCreditScore(): Promise<CreditScore> {
  return await creditScoreApiCall('/credit-score/refresh', { method: 'POST', body: JSON.stringify({}) });
}

/**
 * Update credit score monitoring settings
 */
export async function updateCreditScoreSettings(settings: Partial<CreditScoreSettings>): Promise<{ message: string; settings: CreditScoreSettings }> {
  return await creditScoreApiCall('/credit-score/settings', { method: 'PUT', body: JSON.stringify(settings) });
}
