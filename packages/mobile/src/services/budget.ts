/**
 * Budget Service
 * Handles budget CRUD operations with offline support
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys, getNetworkStatus } from './api';
import {
  storeOfflineData,
  getOfflineData,
  deleteOfflineData,
  addToSyncQueue,
} from './offline';
import {
  Budget,
  BudgetSummary,
  MonthlyBudgetOverview,
  CreateBudgetRequest,
  UpdateBudgetRequest,
  BudgetFilters,
  BudgetFrequency,
} from '../types/budget';

/**
 * Generate unique ID for offline budgets
 */
const generateBudgetId = (): string => {
  return `budget_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Calculate monthly occurrences for recurring budgets
 */
export const calculateMonthlyOccurrences = (
  frequency: BudgetFrequency,
  startDate: string,
  year: number,
  month: number
): number => {
  const start = new Date(startDate);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  // If budget starts after this month, no occurrences
  if (start > monthEnd) return 0;

  switch (frequency) {
    case 'weekly':
      // Calculate weeks in the month
      const weeksInMonth = Math.ceil((monthEnd.getDate() - Math.max(1, start.getDate())) / 7) + 1;
      return Math.max(0, Math.min(4, weeksInMonth));

    case 'bi-weekly':
      // Calculate bi-weekly occurrences
      const biWeeksInMonth = Math.ceil((monthEnd.getDate() - Math.max(1, start.getDate())) / 14) + 1;
      return Math.max(0, Math.min(2, biWeeksInMonth));

    case 'monthly':
      return 1;

    case 'quarterly':
      // Check if this month is a quarter month for this budget
      const startMonth = start.getMonth() + 1;
      const quarterMonths = [startMonth, startMonth + 3, startMonth + 6, startMonth + 9]
        .map(m => m > 12 ? m - 12 : m);
      return quarterMonths.includes(month) ? 1 : 0;

    case 'yearly':
      // Check if this month matches the start month
      return start.getMonth() + 1 === month ? 1 : 0;

    case 'one-time':
      // Check if the one-time budget falls in this month
      return start.getMonth() + 1 === month && start.getFullYear() === year ? 1 : 0;

    default:
      return 0;
  }
};

/**
 * Calculate planned amount for a specific month
 */
export const calculatePlannedAmount = (
  budget: Budget,
  year: number,
  month: number
): number => {
  const occurrences = calculateMonthlyOccurrences(budget.frequency, budget.startDate, year, month);
  return budget.amount * occurrences;
};

/**
 * Fetch budgets from API or offline storage
 */
const fetchBudgets = async (filters?: BudgetFilters): Promise<Budget[]> => {
  const { isOnline } = getNetworkStatus();

  try {
    if (isOnline) {
      // Try to fetch from API
      const response = await api.get<Budget[]>('/budgets', filters as Record<string, string | number>);

      // Store in offline storage
      for (const budget of response.data) {
        await storeOfflineData('budgets', budget, 'synced');
      }

      return response.data;
    }
  } catch (error) {
    console.warn('Failed to fetch budgets from API, using offline data:', error);
  }

  // Fallback to offline data
  const offlineBudgets = await getOfflineData<any>('budgets', filters);
  return offlineBudgets.map((budget: any) => ({
    ...budget,
    startDate: budget.start_date || budget.startDate,
    endDate: budget.end_date || budget.endDate,
    createdAt: budget.created_at || budget.createdAt,
    updatedAt: budget.updated_at || budget.updatedAt,
  }));
};

/**
 * Fetch budget summary for a specific month
 */
const fetchBudgetSummary = async (budgetId: string, year: number, month: number): Promise<BudgetSummary> => {
  const { isOnline } = getNetworkStatus();

  try {
    if (isOnline) {
      const response = await api.get<BudgetSummary>(`/budgets/${budgetId}/summary`, {
        year: year.toString(),
        month: month.toString(),
      });
      return response.data;
    }
  } catch (error) {
    console.warn('Failed to fetch budget summary from API, calculating offline:', error);
  }

  // Calculate summary from offline data
  const transactions = await getOfflineData('transactions', { budget_id: budgetId });
  const monthTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate.getFullYear() === year && transactionDate.getMonth() + 1 === month;
  });

  const actual = monthTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  // Get budget to calculate planned amount
  const budgets = await getOfflineData<Budget>('budgets', { id: budgetId });
  const budget = budgets[0];
  const planned = budget ? calculatePlannedAmount(budget, year, month) : 0;

  return {
    budgetId,
    planned,
    actual,
    remaining: planned - actual,
    percentUsed: planned > 0 ? (actual / planned) * 100 : 0,
    isOverBudget: actual > planned,
    transactionCount: monthTransactions.length,
  };
};

/**
 * Fetch monthly budget overview
 */
const fetchMonthlyOverview = async (year: number, month: number): Promise<MonthlyBudgetOverview> => {
  const budgets = await fetchBudgets({ isActive: true });
  const budgetsWithSummary = await Promise.all(
    budgets.map(async (budget) => ({
      ...budget,
      summary: await fetchBudgetSummary(budget.id, year, month),
    }))
  );

  // Calculate totals
  const totalPlanned = budgetsWithSummary.reduce((sum, b) => sum + b.summary.planned, 0);
  const totalActual = budgetsWithSummary.reduce((sum, b) => sum + b.summary.actual, 0);
  const totalRemaining = totalPlanned - totalActual;

  // Group by category
  const categoryMap = new Map<string, {
    planned: number;
    actual: number;
    budgetCount: number;
  }>();

  budgetsWithSummary.forEach(budget => {
    const existing = categoryMap.get(budget.category) || { planned: 0, actual: 0, budgetCount: 0 };
    categoryMap.set(budget.category, {
      planned: existing.planned + budget.summary.planned,
      actual: existing.actual + budget.summary.actual,
      budgetCount: existing.budgetCount + 1,
    });
  });

  const categories = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    planned: data.planned,
    actual: data.actual,
    remaining: data.planned - data.actual,
    budgetCount: data.budgetCount,
  }));

  return {
    year,
    month,
    totalPlanned,
    totalActual,
    totalRemaining,
    budgets: budgetsWithSummary,
    categories,
  };
};

/**
 * Create new budget
 */
const createBudget = async (budgetData: CreateBudgetRequest): Promise<Budget> => {
  const { isOnline } = getNetworkStatus();
  const now = new Date().toISOString();

  const newBudget: Budget = {
    id: generateBudgetId(),
    ...budgetData,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  // Store offline first
  await storeOfflineData('budgets', newBudget, isOnline ? 'pending' : 'pending');

  if (isOnline) {
    try {
      // Try to create on server
      const response = await api.post<Budget>('/budgets', budgetData);

      // Update with server ID and mark as synced
      const serverBudget = response.data;
      await storeOfflineData('budgets', serverBudget, 'synced');

      return serverBudget;
    } catch (error) {
      console.warn('Failed to create budget on server, queued for sync:', error);

      // Add to sync queue
      await addToSyncQueue({
        type: 'CREATE',
        entity: 'budget',
        data: newBudget,
      });
    }
  } else {
    // Add to sync queue for when online
    await addToSyncQueue({
      type: 'CREATE',
      entity: 'budget',
      data: newBudget,
    });
  }

  return newBudget;
};

/**
 * Update existing budget
 */
const updateBudget = async (budgetData: UpdateBudgetRequest): Promise<Budget> => {
  const { isOnline } = getNetworkStatus();
  const now = new Date().toISOString();

  // Get existing budget
  const existingBudgets = await getOfflineData<Budget>('budgets', { id: budgetData.id });
  const existingBudget = existingBudgets[0];

  if (!existingBudget) {
    throw new Error('Budget not found');
  }

  const updatedBudget: Budget = {
    ...existingBudget,
    ...budgetData,
    updatedAt: now,
  };

  // Store offline first
  await storeOfflineData('budgets', updatedBudget, isOnline ? 'pending' : 'pending');

  if (isOnline) {
    try {
      // Try to update on server
      const response = await api.put<Budget>(`/budgets/${budgetData.id}`, budgetData);

      // Mark as synced
      const serverBudget = response.data;
      await storeOfflineData('budgets', serverBudget, 'synced');

      return serverBudget;
    } catch (error) {
      console.warn('Failed to update budget on server, queued for sync:', error);

      // Add to sync queue
      await addToSyncQueue({
        type: 'UPDATE',
        entity: 'budget',
        data: updatedBudget,
      });
    }
  } else {
    // Add to sync queue for when online
    await addToSyncQueue({
      type: 'UPDATE',
      entity: 'budget',
      data: updatedBudget,
    });
  }

  return updatedBudget;
};

/**
 * Delete budget
 */
const deleteBudget = async (budgetId: string): Promise<void> => {
  const { isOnline } = getNetworkStatus();

  // Soft delete offline
  await deleteOfflineData('budgets', budgetId);

  if (isOnline) {
    try {
      // Try to delete on server
      await api.delete(`/budgets/${budgetId}`);
    } catch (error) {
      console.warn('Failed to delete budget on server, queued for sync:', error);

      // Add to sync queue
      await addToSyncQueue({
        type: 'DELETE',
        entity: 'budget',
        data: { id: budgetId },
      });
    }
  } else {
    // Add to sync queue for when online
    await addToSyncQueue({
      type: 'DELETE',
      entity: 'budget',
      data: { id: budgetId },
    });
  }
};

/**
 * React Query Hooks
 */

export const useBudgets = (filters?: BudgetFilters) => {
  return useQuery({
    queryKey: queryKeys.budgets,
    queryFn: () => fetchBudgets(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useBudget = (budgetId: string) => {
  return useQuery({
    queryKey: queryKeys.budget(budgetId),
    queryFn: async () => {
      const budgets = await fetchBudgets({ id: budgetId } as any);
      return budgets[0] || null;
    },
    enabled: !!budgetId,
  });
};

export const useMonthlyBudgetOverview = (year: number, month: number) => {
  return useQuery({
    queryKey: queryKeys.budgetsByMonth(year, month),
    queryFn: () => fetchMonthlyOverview(year, month),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCreateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets });
    },
  });
};

export const useUpdateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateBudget,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets });
      queryClient.invalidateQueries({ queryKey: queryKeys.budget(data.id) });
    },
  });
};

export const useDeleteBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets });
    },
  });
};
