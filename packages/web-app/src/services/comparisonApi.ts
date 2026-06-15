/**
 * Peer Comparison API Service
 * Handles anonymous spending comparison with similar households
 */

import { config } from '../config/environment';

// Comparison lives on the features API (0poeu07vth), not the main API
const MAIN_API_BASE = config.featuresApiUrl;

// Get token from localStorage
function getToken(): string | null {
  return localStorage.getItem('budgetbuddy_id_token');
}

// API Error class
export class ComparisonApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ComparisonApiError';
  }
}

// Core API function
async function comparisonApiCall<T = any>(
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
    throw new ComparisonApiError(errorMessage, response.status);
  }

  return response.json();
}

// Types
export type ComparisonStatus = 'below-average' | 'average' | 'above-average' | 'no-data';

export interface CategoryComparison {
  userAmount: number;
  groupAverage: number | null;
  groupMedian: number | null;
  percentile: number | null;
  vsAverage: number | null;
  status: ComparisonStatus;
}

export interface GroupCriteria {
  region: string;
  familySize: number;
  incomeRange: string;
}

export interface ComparisonSummaryResponse {
  available: boolean;
  message?: string;
  optedOut?: boolean;
  minRequired?: number;
  currentGroupSize?: number;
  groupCriteria?: GroupCriteria;
  groupSize?: number;
  comparison?: Record<string, CategoryComparison>;
  lastUpdated?: string;
}

export interface ComparisonPreferences {
  optedOut: boolean;
  shareData: boolean;
  showInInsights: boolean;
}

// Comparison API
export const comparisonApi = {
  // Get comparison summary
  async getSummary(): Promise<ComparisonSummaryResponse> {
    const response = await comparisonApiCall('/comparison/summary');
    return response.data;
  },

  // Get preferences
  async getPreferences(): Promise<ComparisonPreferences> {
    const response = await comparisonApiCall('/comparison/preferences');
    return response.data;
  },

  // Update preferences
  async updatePreferences(preferences: Partial<ComparisonPreferences>): Promise<ComparisonPreferences> {
    const response = await comparisonApiCall('/comparison/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
    return response.data;
  },
};

export default comparisonApi;
