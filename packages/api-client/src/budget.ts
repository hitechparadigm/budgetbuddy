/**
 * Budget API methods
 */

import { 
  Budget, 
  Category, 
  AIBudgetRequest,
  ApiResponse 
} from '@budget-buddy/shared';
import { getApiClient } from './client';

export const budgetApi = {
  async getCurrentBudget(): Promise<ApiResponse<Budget>> {
    const client = getApiClient();
    return client.get<Budget>('/budget/current');
  },

  async getBudgetByMonth(month: string): Promise<ApiResponse<Budget>> {
    const client = getApiClient();
    return client.get<Budget>(`/budget/${month}`);
  },

  async createBudget(budgetData: Partial<Budget>): Promise<ApiResponse<Budget>> {
    const client = getApiClient();
    return client.post<Budget>('/budget', budgetData);
  },

  async updateBudget(budgetId: string, updates: Partial<Budget>): Promise<ApiResponse<Budget>> {
    const client = getApiClient();
    return client.put<Budget>(`/budget/${budgetId}`, updates);
  },

  async generateAIBudget(request: AIBudgetRequest): Promise<ApiResponse<Budget>> {
    const client = getApiClient();
    return client.post<Budget>('/budget/ai-generate', request);
  },

  async getCategories(): Promise<ApiResponse<Category[]>> {
    const client = getApiClient();
    return client.get<Category[]>('/budget/categories');
  },

  async createCategory(categoryData: Partial<Category>): Promise<ApiResponse<Category>> {
    const client = getApiClient();
    return client.post<Category>('/budget/categories', categoryData);
  },

  async updateCategory(categoryId: string, updates: Partial<Category>): Promise<ApiResponse<Category>> {
    const client = getApiClient();
    return client.put<Category>(`/budget/categories/${categoryId}`, updates);
  },

  async deleteCategory(categoryId: string): Promise<ApiResponse<void>> {
    const client = getApiClient();
    return client.delete<void>(`/budget/categories/${categoryId}`);
  },

  async reorderCategories(categoryIds: string[]): Promise<ApiResponse<void>> {
    const client = getApiClient();
    return client.put<void>('/budget/categories/reorder', { categoryIds });
  },
};