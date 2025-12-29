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
  UpcomingOccurrence,
  RecurringBudgetOverview,
} from '../types/budget';

/**
 * Generate unique ID for offline budgets
 */
const generateBudgetId = (): string => {
  return `budget_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Calculate next occurrence date for a recurring budget
 */
export const calculateNextOccurrence = (
  budget: Budget,
  fromDate?: Date
): Date | null => {
  const start = new Date(budget.startDate);
  const from = fromDate || new Date();
  const config = budget.recurringConfig;

  // For one-time budgets, return null if already past
  if (budget.frequency === 'one-time') {
    return start > from ? start : null;
  }

  let nextDate = new Date(Math.max(start.getTime(), from.getTime()));

  switch (budget.frequency) {
    case 'weekly':
      const targetDayOfWeek = config?.dayOfWeek ?? start.getDay();
      const daysUntilTarget = (targetDayOfWeek - nextDate.getDay() + 7) % 7;
      nextDate.setDate(nextDate.getDate() + (daysUntilTarget || 7));
      break;

    case 'bi-weekly':
      const biWeeklyTarget = config?.dayOfWeek ?? start.getDay();
      const daysSinceStart = Math.floor((nextDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const biWeeklyPeriod = Math.floor(daysSinceStart / 14) + 1;
      const nextBiWeeklyDate = new Date(start);
      nextBiWeeklyDate.setDate(start.getDate() + (biWeeklyPeriod * 14));

      // Adjust to correct day of week
      const biWeeklyDaysUntilTarget = (biWeeklyTarget - nextBiWeeklyDate.getDay() + 7) % 7;
      nextBiWeeklyDate.setDate(nextBiWeeklyDate.getDate() + biWeeklyDaysUntilTarget);
      nextDate = nextBiWeeklyDate;
      break;

    case 'monthly':
      const targetDayOfMonth = config?.dayOfMonth ?? start.getDate();
      nextDate.setDate(1); // Start of month
      nextDate.setMonth(nextDate.getMonth() + (nextDate.getDate() > targetDayOfMonth ? 1 : 0));

      // Handle month-end adjustment
      const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
      const adjustedDay = config?.adjustForMonthEnd && targetDayOfMonth > lastDayOfMonth
        ? lastDayOfMonth
        : Math.min(targetDayOfMonth, lastDayOfMonth);

      nextDate.setDate(adjustedDay);
      break;

    case 'quarterly':
      const quarterlyStart = new Date(start);
      const monthsSinceStart = (nextDate.getFullYear() - start.getFullYear()) * 12 +
        (nextDate.getMonth() - start.getMonth());
      const nextQuarterOffset = Math.ceil((monthsSinceStart + 1) / 3) * 3;

      nextDate = new Date(start);
      nextDate.setMonth(start.getMonth() + nextQuarterOffset);
      break;

    case 'yearly':
      const targetMonth = config?.monthOfYear ?? (start.getMonth() + 1);
      const targetDay = config?.dayOfMonth ?? start.getDate();

      nextDate.setMonth(targetMonth - 1, targetDay);
      if (nextDate <= from) {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
      break;

    case 'custom':
      if (config?.customPattern) {
        return calculateCustomNextOccurrence(budget, from);
      }
      return null;

    default:
      return null;
  }

  // Skip weekends if configured
  if (config?.skipWeekends) {
    while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
      nextDate.setDate(nextDate.getDate() + 1);
    }
  }

  // Check end date
  if (budget.endDate && nextDate > new Date(budget.endDate)) {
    return null;
  }

  return nextDate;
};

/**
 * Calculate next occurrence for custom recurrence patterns
 */
const calculateCustomNextOccurrence = (budget: Budget, fromDate: Date): Date | null => {
  const config = budget.recurringConfig?.customPattern;
  if (!config) return null;

  const start = new Date(budget.startDate);
  let nextDate = new Date(Math.max(start.getTime(), fromDate.getTime()));

  // Handle end conditions
  if (config.endByDate && nextDate > new Date(config.endByDate)) {
    return null;
  }

  // For now, implement basic interval-based custom patterns
  // This can be extended for more complex patterns
  const intervalDays = config.interval * 7; // Assuming weekly intervals for simplicity
  const daysSinceStart = Math.floor((nextDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const nextIntervalDays = Math.ceil((daysSinceStart + 1) / intervalDays) * intervalDays;

  nextDate = new Date(start);
  nextDate.setDate(start.getDate() + nextIntervalDays);

  return nextDate;
};

/**
 * Get all occurrences for a budget in a date range
 */
export const getBudgetOccurrences = (
  budget: Budget,
  startDate: Date,
  endDate: Date
): Date[] => {
  const occurrences: Date[] = [];
  let currentDate = calculateNextOccurrence(budget, startDate);

  while (currentDate && currentDate <= endDate) {
    occurrences.push(new Date(currentDate));

    // Calculate next occurrence after current
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate = calculateNextOccurrence(budget, currentDate);
  }

  return occurrences;
};

/**
 * Get upcoming occurrences for all budgets
 */
export const getUpcomingOccurrences = async (
  daysAhead: number = 30
): Promise<UpcomingOccurrence[]> => {
  const budgets = await fetchBudgets({ isActive: true });
  const now = new Date();
  const endDate = new Date();
  endDate.setDate(now.getDate() + daysAhead);

  const upcomingOccurrences: UpcomingOccurrence[] = [];

  for (const budget of budgets) {
    const nextOccurrence = calculateNextOccurrence(budget, now);

    if (nextOccurrence && nextOccurrence <= endDate) {
      const daysUntil = Math.ceil((nextOccurrence.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      upcomingOccurrences.push({
        budgetId: budget.id,
        budgetName: budget.name,
        occurrenceDate: nextOccurrence.toISOString(),
        plannedAmount: budget.amount,
        daysUntil,
        category: budget.category,
        type: budget.type,
      });
    }
  }

  // Sort by occurrence date
  return upcomingOccurrences.sort((a, b) =>
    new Date(a.occurrenceDate).getTime() - new Date(b.occurrenceDate).getTime()
  );
};

/**
 * Enhanced calculate monthly occurrences with recurring config (simplified)
 */
export const calculateMonthlyOccurrencesEnhanced = (
  budget: Budget,
  year: number,
  month: number
): number => {
  const start = new Date(budget.startDate);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  // If budget starts after this month, no occurrences
  if (start > monthEnd) return 0;

  // If budget has ended before this month, no occurrences
  if (budget.endDate && new Date(budget.endDate) < monthStart) return 0;

  switch (budget.frequency) {
    case 'weekly':
      // Calculate weeks in the month (simplified)
      const weeksInMonth = Math.ceil((monthEnd.getDate() - Math.max(1, start.getDate())) / 7) + 1;
      return Math.max(0, Math.min(5, weeksInMonth));

    case 'bi-weekly':
      // Calculate bi-weekly occurrences (simplified)
      const biWeeksInMonth = Math.ceil((monthEnd.getDate() - Math.max(1, start.getDate())) / 14) + 1;
      return Math.max(0, Math.min(3, biWeeksInMonth));

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
 * Calculate projected monthly total based on historical data
 */
export const calculateProjectedMonthlyTotal = async (
  budgetId: string,
  year: number,
  month: number
): Promise<number> => {
  // Get historical data for the same budget
  const transactions = await getOfflineData('transactions', { budget_id: budgetId });

  // Filter to same month in previous years
  const historicalTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate.getMonth() + 1 === month && transactionDate.getFullYear() < year;
  });

  if (historicalTransactions.length === 0) {
    return 0;
  }

  // Calculate average for this month across previous years
  const totalHistorical = historicalTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const yearsOfData = new Set(historicalTransactions.map(t => new Date(t.date).getFullYear())).size;

  return totalHistorical / yearsOfData;
};

/**
 * Calculate planned amount for a specific month (enhanced)
 */
export const calculatePlannedAmount = (
  budget: Budget,
  year: number,
  month: number
): number => {
  const occurrences = calculateMonthlyOccurrencesEnhanced(budget, year, month);
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
 * Fetch budget summary for a specific month (enhanced)
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

  // Get budget to calculate planned amount and recurring info
  const budgets = await getOfflineData<Budget>('budgets', { id: budgetId });
  const budget = budgets[0];

  if (!budget) {
    throw new Error('Budget not found');
  }

  const planned = calculatePlannedAmount(budget, year, month);
  const occurrencesThisMonth = calculateMonthlyOccurrencesEnhanced(budget, year, month);
  const nextOccurrence = calculateNextOccurrence(budget);
  const projectedMonthlyTotal = await calculateProjectedMonthlyTotal(budgetId, year, month);

  // Calculate total occurrences since budget start
  const budgetStart = new Date(budget.startDate);
  const currentDate = new Date(year, month - 1, 1);
  const totalOccurrences = getBudgetOccurrences(budget, budgetStart, currentDate).length;

  // Calculate average actual amount
  const allTransactions = await getOfflineData('transactions', { budget_id: budgetId });
  const averageActual = allTransactions.length > 0
    ? allTransactions.reduce((sum, t) => sum + (t.amount || 0), 0) / allTransactions.length
    : 0;

  return {
    budgetId,
    planned,
    actual,
    remaining: planned - actual,
    percentUsed: planned > 0 ? (actual / planned) * 100 : 0,
    isOverBudget: actual > planned,
    transactionCount: monthTransactions.length,
    nextOccurrence: nextOccurrence?.toISOString(),
    occurrencesThisMonth,
    totalOccurrences,
    averageActual,
    projectedMonthlyTotal,
  };
};

/**
 * Fetch monthly budget overview (enhanced)
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

  // Create recurring budget overview
  const recurringBudgets = budgetsWithSummary
    .filter(budget => budget.frequency !== 'one-time')
    .map(budget => {
      const plannedOccurrences = calculateMonthlyOccurrencesEnhanced(budget, year, month);
      const actualOccurrences = budget.summary.transactionCount;
      const nextOccurrence = calculateNextOccurrence(budget);

      return {
        budgetId: budget.id,
        name: budget.name,
        frequency: budget.frequency,
        plannedOccurrences,
        actualOccurrences,
        totalPlanned: budget.summary.planned,
        totalActual: budget.summary.actual,
        nextOccurrence: nextOccurrence?.toISOString(),
        isOnTrack: actualOccurrences >= plannedOccurrences * 0.8, // 80% threshold
      };
    });

  // Get upcoming occurrences for this month
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const upcomingOccurrences = await getUpcomingOccurrences(30);
  const monthlyUpcoming = upcomingOccurrences.filter(occurrence => {
    const occurrenceDate = new Date(occurrence.occurrenceDate);
    return occurrenceDate >= monthStart && occurrenceDate <= monthEnd;
  });

  return {
    year,
    month,
    totalPlanned,
    totalActual,
    totalRemaining,
    budgets: budgetsWithSummary,
    categories,
    recurringBudgets,
    upcomingOccurrences: monthlyUpcoming,
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

export const useUpcomingOccurrences = (daysAhead: number = 30) => {
  return useQuery({
    queryKey: queryKeys.upcomingOccurrences(daysAhead),
    queryFn: () => getUpcomingOccurrences(daysAhead),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useRecurringBudgets = () => {
  return useQuery({
    queryKey: queryKeys.recurringBudgets,
    queryFn: () => fetchBudgets({ frequency: 'weekly' }).then(budgets =>
      budgets.filter(b => b.frequency !== 'one-time')
    ),
    staleTime: 5 * 60 * 1000, // 5 minutes
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
