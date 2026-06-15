/**
 * Budget Planning API Service
 * Handles AI-powered budget suggestions and planning
 */

import { config } from '../config/environment';

const EXTENDED_API_BASE = config.extendedFeaturesApiUrl;

// Get token from localStorage
function getToken(): string | null {
  return localStorage.getItem('budgetbuddy_id_token');
}

// API Error class
export class BudgetPlanningApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'BudgetPlanningApiError';
  }
}

// Core API function
async function budgetPlanningApiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${EXTENDED_API_BASE}${endpoint}`;

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
    throw new BudgetPlanningApiError(errorMessage, response.status);
  }

  return response.json();
}


// Types
export interface SuggestionBreakdown {
  item: string;
  amount: number;
  type: 'recurring' | 'average' | 'seasonal';
}

export interface BudgetSuggestion {
  categoryId: string;
  categoryName: string;
  suggestedAmount: number;
  currentAmount?: number;
  confidenceScore: number;
  breakdown: SuggestionBreakdown[];
  explanation: string;
}

export interface GenerateSuggestionsRequest {
  targetMonth: string; // YYYY-MM format
  includeRecurringBills?: boolean;
  includeHistoricalAverage?: boolean;
}

export interface GenerateSuggestionsResponse {
  suggestionId: string;
  targetMonth: string;
  suggestions: BudgetSuggestion[];
  totalSuggested: number;
  generatedAt: string;
  status: 'pending' | 'applied' | 'rejected';
}

export interface ApplySuggestionsRequest {
  suggestionId: string;
  selectedCategories?: string[]; // If not provided, apply all
}

export interface ApplySuggestionsResponse {
  success: boolean;
  appliedCategories: string[];
  budgetId: string;
  message: string;
}

// Budget Planning API
export const budgetPlanningApi = {
  // Generate AI budget suggestions for a target month
  async generateSuggestions(request: GenerateSuggestionsRequest): Promise<GenerateSuggestionsResponse> {
    const response = await budgetPlanningApiCall('/budget-planning/suggestions', {
      method: 'POST',
      body: JSON.stringify({
        targetMonth: request.targetMonth,
        includeRecurringBills: request.includeRecurringBills ?? true,
        includeHistoricalAverage: request.includeHistoricalAverage ?? true,
      }),
    });
    return response.data || response;
  },

  // Get existing suggestions for a month
  async getSuggestions(targetMonth?: string): Promise<{ suggestions: GenerateSuggestionsResponse[] }> {
    const params = new URLSearchParams();
    if (targetMonth) params.append('targetMonth', targetMonth);

    const queryString = params.toString();
    const endpoint = `/budget-planning/suggestions${queryString ? `?${queryString}` : ''}`;

    const response = await budgetPlanningApiCall(endpoint);
    return response.data || response;
  },

  // Apply suggestions to budget
  async applySuggestions(request: ApplySuggestionsRequest): Promise<ApplySuggestionsResponse> {
    const response = await budgetPlanningApiCall('/budget-planning/apply', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.data || response;
  },
};

export default budgetPlanningApi;
