/**
 * Pattern Detection API Service
 * Handles AI-powered recurring bill pattern detection
 */

const EXTENDED_API_BASE = 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1';

// Get token from localStorage
function getToken(): string | null {
  return localStorage.getItem('budgetbuddy_id_token');
}

// API Error class
export class PatternDetectionApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'PatternDetectionApiError';
  }
}

// Core API function
async function patternApiCall<T = any>(
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
    throw new PatternDetectionApiError(errorMessage, response.status);
  }

  return response.json();
}


// Types
export interface PatternOccurrence {
  date: string;
  amount: number;
  transactionId: string;
}

export interface DetectedPattern {
  patternId: string;
  merchantName: string;
  suggestedBillName: string;
  averageAmount: number;
  amountStdDev: number;
  frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'annual';
  confidenceScore: number;
  nextExpectedDate: string;
  occurrences: PatternOccurrence[];
  categoryId: string | null;
  categoryName?: string;
  explanation: string;
  status: 'pending' | 'approved' | 'rejected' | 'ignored';
  createdAt: string;
  updatedAt: string;
  billId?: string;
}

export interface DetectPatternsRequest {
  analysisMonths?: number;
  minConfidence?: number;
}

export interface DetectPatternsResponse {
  patterns: DetectedPattern[];
  analysisDate: string;
  transactionsAnalyzed: number;
}

export interface UpdatePatternRequest {
  suggestedBillName?: string;
  averageAmount?: number;
  frequency?: string;
  categoryId?: string;
  status?: 'approved' | 'rejected' | 'ignored';
}

export interface CreateManualPatternRequest {
  transactionId: string;
  frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'annual';
  billName?: string;
  createBillReminder?: boolean;
}

// Pattern Detection API
export const patternDetectionApi = {
  // Trigger pattern detection analysis
  async detectPatterns(options: DetectPatternsRequest = {}): Promise<DetectPatternsResponse> {
    const response = await patternApiCall('/patterns/detect', {
      method: 'POST',
      body: JSON.stringify({
        analysisMonths: options.analysisMonths || 6,
        minConfidence: options.minConfidence || 50,
      }),
    });
    return response.data || response;
  },

  // Get all detected patterns
  async getPatterns(status?: string): Promise<{ patterns: DetectedPattern[] }> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    const queryString = params.toString();
    const endpoint = `/patterns${queryString ? `?${queryString}` : ''}`;

    const response = await patternApiCall(endpoint);
    return response.data || response;
  },

  // Get a single pattern by ID
  async getPattern(patternId: string): Promise<DetectedPattern> {
    const response = await patternApiCall(`/patterns/${patternId}`);
    return response.data || response;
  },

  // Update a pattern (edit or change status)
  async updatePattern(patternId: string, updates: UpdatePatternRequest): Promise<DetectedPattern> {
    const response = await patternApiCall(`/patterns/${patternId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data || response;
  },

  // Approve a pattern (creates bill reminder)
  async approvePattern(patternId: string): Promise<DetectedPattern> {
    return this.updatePattern(patternId, { status: 'approved' });
  },

  // Reject a pattern
  async rejectPattern(patternId: string): Promise<DetectedPattern> {
    return this.updatePattern(patternId, { status: 'rejected' });
  },

  // Ignore a pattern (won't show again)
  async ignorePattern(patternId: string): Promise<DetectedPattern> {
    return this.updatePattern(patternId, { status: 'ignored' });
  },

  // Delete a pattern
  async deletePattern(patternId: string): Promise<void> {
    await patternApiCall(`/patterns/${patternId}`, {
      method: 'DELETE',
    });
  },

  // Create a manual pattern from a transaction
  async createManualPattern(request: CreateManualPatternRequest): Promise<DetectedPattern> {
    const response = await patternApiCall('/patterns/manual', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.data || response;
  },
};

export default patternDetectionApi;
