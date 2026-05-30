/**
 * Net Worth API Service
 * Handles assets, liabilities, and net worth tracking
 *
 * **Validates: Requirement 41**
 */

import { config } from '../config/environment';

const MAIN_API_BASE = config.apiBaseUrl;

// Get token from localStorage
function getToken(): string | null {
  return localStorage.getItem('budgetbuddy_id_token');
}

// API Error class
export class NetWorthApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'NetWorthApiError';
  }
}

// Core API function
async function netWorthApiCall<T = any>(
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
    throw new NetWorthApiError(errorMessage, response.status);
  }

  return response.json();
}

// Types
export interface Asset {
  assetId: string;
  name: string;
  type: 'cash' | 'investment' | 'property' | 'vehicle' | 'other';
  value: number;
  currency: string;
  notes?: string;
  lastUpdated: string;
  createdAt: string;
}

export interface Liability {
  liabilityId: string;
  name: string;
  type: 'mortgage' | 'car_loan' | 'student_loan' | 'credit_card' | 'personal_loan' | 'other';
  balance: number;
  interestRate?: number;
  minimumPayment?: number;
  currency: string;
  notes?: string;
  lastUpdated: string;
  createdAt: string;
}

export interface NetWorthSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assetCount: number;
  liabilityCount: number;
  currency: string;
  lastUpdated: string;
}

export interface NetWorthHistory {
  month: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  change: number;
  changePercent: number;
}

export interface AssetAllocation {
  type: string;
  value: number;
  percentage: number;
}

// Net Worth API
export const netWorthApi = {
  // Get net worth summary
  async getSummary(): Promise<NetWorthSummary> {
    const response = await netWorthApiCall('/net-worth/summary');
    return response.data;
  },

  // Get all assets
  async getAssets(): Promise<Asset[]> {
    const response = await netWorthApiCall('/net-worth/assets');
    return response.data.assets;
  },

  // Create asset
  async createAsset(asset: Omit<Asset, 'assetId' | 'lastUpdated' | 'createdAt'>): Promise<Asset> {
    const response = await netWorthApiCall('/net-worth/assets', {
      method: 'POST',
      body: JSON.stringify(asset),
    });
    return response.data;
  },

  // Update asset
  async updateAsset(assetId: string, updates: Partial<Asset>): Promise<Asset> {
    const response = await netWorthApiCall(`/net-worth/assets/${assetId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data;
  },

  // Delete asset
  async deleteAsset(assetId: string): Promise<void> {
    await netWorthApiCall(`/net-worth/assets/${assetId}`, {
      method: 'DELETE',
    });
  },

  // Get all liabilities
  async getLiabilities(): Promise<Liability[]> {
    const response = await netWorthApiCall('/net-worth/liabilities');
    return response.data.liabilities;
  },

  // Create liability
  async createLiability(liability: Omit<Liability, 'liabilityId' | 'lastUpdated' | 'createdAt'>): Promise<Liability> {
    const response = await netWorthApiCall('/net-worth/liabilities', {
      method: 'POST',
      body: JSON.stringify(liability),
    });
    return response.data;
  },

  // Update liability
  async updateLiability(liabilityId: string, updates: Partial<Liability>): Promise<Liability> {
    const response = await netWorthApiCall(`/net-worth/liabilities/${liabilityId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data;
  },

  // Delete liability
  async deleteLiability(liabilityId: string): Promise<void> {
    await netWorthApiCall(`/net-worth/liabilities/${liabilityId}`, {
      method: 'DELETE',
    });
  },

  // Get net worth history
  async getHistory(months: number = 12): Promise<NetWorthHistory[]> {
    const response = await netWorthApiCall(`/net-worth/history?months=${months}`);
    return response.data.history;
  },

  // Get asset allocation
  async getAllocation(): Promise<AssetAllocation[]> {
    const response = await netWorthApiCall('/net-worth/allocation');
    return response.data.allocation;
  },
};

export default netWorthApi;
