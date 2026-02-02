/**
 * Net Worth Service for Mobile
 * Handles assets, liabilities, and net worth tracking
 *
 * **Validates: Requirement 41**
 */

import { api } from './api';

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

// Net Worth API
export const netWorthService = {
  // Get net worth summary
  async getSummary(): Promise<NetWorthSummary> {
    const response = await api.get('/net-worth/summary');
    return response.data.data;
  },

  // Get all assets
  async getAssets(): Promise<Asset[]> {
    const response = await api.get('/net-worth/assets');
    return response.data.data.assets;
  },

  // Create asset
  async createAsset(asset: Omit<Asset, 'assetId' | 'lastUpdated' | 'createdAt'>): Promise<Asset> {
    const response = await api.post('/net-worth/assets', asset);
    return response.data.data;
  },

  // Update asset
  async updateAsset(assetId: string, updates: Partial<Asset>): Promise<Asset> {
    const response = await api.put(`/net-worth/assets/${assetId}`, updates);
    return response.data.data;
  },

  // Delete asset
  async deleteAsset(assetId: string): Promise<void> {
    await api.delete(`/net-worth/assets/${assetId}`);
  },

  // Get all liabilities
  async getLiabilities(): Promise<Liability[]> {
    const response = await api.get('/net-worth/liabilities');
    return response.data.data.liabilities;
  },

  // Create liability
  async createLiability(liability: Omit<Liability, 'liabilityId' | 'lastUpdated' | 'createdAt'>): Promise<Liability> {
    const response = await api.post('/net-worth/liabilities', liability);
    return response.data.data;
  },

  // Update liability
  async updateLiability(liabilityId: string, updates: Partial<Liability>): Promise<Liability> {
    const response = await api.put(`/net-worth/liabilities/${liabilityId}`, updates);
    return response.data.data;
  },

  // Delete liability
  async deleteLiability(liabilityId: string): Promise<void> {
    await api.delete(`/net-worth/liabilities/${liabilityId}`);
  },

  // Get net worth history
  async getHistory(months: number = 12): Promise<NetWorthHistory[]> {
    const response = await api.get('/net-worth/history', { months });
    return response.data.data.history;
  },
};

export default netWorthService;
