/**
 * Simplified API Service
 * Direct API calls without complex package dependencies
 */

const API_BASE = 'https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1';

// Simple token management
class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'budgetbuddy_access_token';

  static setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    }
  }

  static getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    }
    return null;
  }

  static clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    }
  }
}

// API Error class
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Core API function
async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  // Add auth token if available
  const token = TokenManager.getToken();
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
      // Use default error message if JSON parsing fails
    }
    throw new ApiError(errorMessage, response.status);
  }

  return response.json();
}

// Transaction API
export const transactionApi = {
  async healthCheck() {
    const response = await apiCall('/transactions/health');
    return response.data;
  },

  async getTransactions(filters: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    type?: 'income' | 'expense';
    limit?: number;
  } = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });

    const queryString = params.toString();
    const endpoint = `/transactions${queryString ? `?${queryString}` : ''}`;

    const response = await apiCall(endpoint);
    return response.data;
  },

  async createTransaction(data: {
    amount: number;
    type: 'income' | 'expense';
    categoryId: string;
    description: string;
    merchant?: string;
    date?: string;
  }) {
    const response = await apiCall('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async getTransaction(transactionId: string) {
    const response = await apiCall(`/transactions/${transactionId}`);
    return response.data;
  },

  async updateTransaction(transactionId: string, data: {
    amount?: number;
    type?: 'income' | 'expense';
    categoryId?: string;
    description?: string;
    merchant?: string;
    date?: string;
  }) {
    const response = await apiCall(`/transactions/${transactionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async deleteTransaction(transactionId: string) {
    await apiCall(`/transactions/${transactionId}`, {
      method: 'DELETE',
    });
  },
};

// Auth API
export const authApi = {
  async login(email: string, password: string) {
    const response = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Store token
    if (response.accessToken) {
      TokenManager.setToken(response.accessToken);
    }

    return response;
  },

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const response = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  },

  async logout() {
    TokenManager.clearToken();
  },

  isAuthenticated(): boolean {
    return TokenManager.getToken() !== null;
  },
};

// Budget API
export const budgetApi = {
  async healthCheck() {
    const response = await apiCall('/budget/health');
    return response.data;
  },

  async getBudgets() {
    const response = await apiCall('/budget');
    return response.data;
  },

  async createBudget(data: any) {
    const response = await apiCall('/budget', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async updateBudget(budgetId: string, data: any) {
    const response = await apiCall(`/budget/${budgetId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },
};

export { TokenManager };
