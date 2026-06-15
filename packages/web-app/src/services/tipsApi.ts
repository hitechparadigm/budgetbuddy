/**
 * Tips API Service
 * Handles financial tips feed and personalization
 */

import { config } from '../config/environment';

// Tips live on the features API (0poeu07vth), not the main API
const MAIN_API_BASE = config.featuresApiUrl;

// Get token from localStorage
function getToken(): string | null {
  return localStorage.getItem('budgetbuddy_id_token');
}

// API Error class
export class TipsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'TipsApiError';
  }
}

// Core API function
async function tipsApiCall<T = any>(
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
    throw new TipsApiError(errorMessage, response.status);
  }

  return response.json();
}

// Types
export interface Tip {
  id: string;
  title: string;
  content: string;
  category: 'budgeting' | 'saving' | 'debt' | 'investing' | 'general';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  relevanceScore?: number;
  savedAt?: string;
}

export interface TipsFeedResponse {
  tips: Tip[];
  total: number;
  hasMore: boolean;
}

export interface DailyTipResponse {
  tip: Tip;
  date: string;
  alreadyViewed: boolean;
}

export interface SavedTipsResponse {
  tips: Tip[];
  total: number;
}

// Tips API
export const tipsApi = {
  // Get personalized tips feed
  async getFeed(category?: string, limit: number = 10): Promise<TipsFeedResponse> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    params.append('limit', limit.toString());

    const queryString = params.toString();
    const endpoint = `/tips/feed${queryString ? `?${queryString}` : ''}`;

    const response = await tipsApiCall(endpoint);
    return response.data;
  },

  // Get daily tip
  async getDailyTip(): Promise<DailyTipResponse> {
    const response = await tipsApiCall('/tips/daily');
    return response.data;
  },

  // Save a tip
  async saveTip(tipId: string): Promise<void> {
    await tipsApiCall(`/tips/${tipId}/save`, {
      method: 'POST',
    });
  },

  // Dismiss a tip
  async dismissTip(tipId: string): Promise<void> {
    await tipsApiCall(`/tips/${tipId}/dismiss`, {
      method: 'POST',
    });
  },

  // Get saved tips
  async getSavedTips(): Promise<SavedTipsResponse> {
    const response = await tipsApiCall('/tips/saved');
    return response.data;
  },
};

export default tipsApi;
