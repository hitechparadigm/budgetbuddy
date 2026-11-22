/**
 * Budget period service
 *
 * Reads and writes the monthly budget (PERIOD#<YYYY-MM>) through the same
 * main-gateway endpoints the web app's BudgetPage uses:
 *   GET  /budget/current?month=YYYY-MM  -> the month's income/savings/expense categories
 *   POST /budget {month, groups, isAIGenerated} -> replaces the month's groups
 *
 * Recording a transaction from a category is a client-side edit of the period
 * followed by POST /budget, exactly like BudgetPage.handleTransactionSubmit.
 * The collaboration endpoints (/budgets on the budgets gateway) are not used.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export interface PeriodTransaction {
  id: string;
  categoryId: string;
  amount: number;
  description: string;
  date: string;
  createdAt: string;
}

/** A period category. Backend fields this client does not use pass through untouched. */
export interface PeriodCategory {
  id: string;
  name: string;
  icon: string;
  plannedAmount: number;
  spentAmount: number;
  transactions: PeriodTransaction[];
  [key: string]: unknown;
}

export interface BudgetPeriodGroups {
  income: PeriodCategory[];
  savings: PeriodCategory[];
  expenses: PeriodCategory[];
}

export interface BudgetPeriod {
  budgetId: string;
  month: string;
  totalIncome: number;
  totalSavings: number;
  totalExpenses: number;
  remainingBalance: number;
  groups: BudgetPeriodGroups;
  isAIGenerated?: boolean;
}

export interface RecordTransactionInput {
  amount: number;
  description?: string;
  date: string;
}

const GROUP_KEYS: (keyof BudgetPeriodGroups)[] = ['income', 'savings', 'expenses'];

/** React Query key for one month's period. Kept local: setup.ts mocks api.ts's queryKeys. */
export const budgetPeriodKey = (month: string) => ['budgetPeriod', month];

/** Format a year and 1-based month as 'YYYY-MM'. */
export const monthKey = (year: number, month: number): string =>
  `${year}-${String(month).padStart(2, '0')}`;

/** Same normalization as the web's validateCategory. */
const normalizeCategory = (cat: Partial<PeriodCategory>): PeriodCategory =>
  ({
    ...cat,
    plannedAmount: Number(cat?.plannedAmount) || 0,
    spentAmount: Number(cat?.spentAmount) || 0,
    transactions: cat?.transactions || [],
  }) as PeriodCategory;

const normalizeGroup = (group: unknown): PeriodCategory[] =>
  Array.isArray(group) ? group.map(normalizeCategory) : [];

/**
 * Load a month's budget period. The backend creates the period when the month
 * has none yet.
 */
export const fetchBudgetPeriod = async (month: string): Promise<BudgetPeriod> => {
  const response = await api.get('/budget/current', { month });
  const raw = response.data?.data ?? response.data ?? {};
  const groups = raw.groups ?? {};
  return {
    ...raw,
    budgetId: raw.budgetId,
    month: raw.month ?? month,
    totalIncome: Number(raw.totalIncome) || 0,
    totalSavings: Number(raw.totalSavings) || 0,
    totalExpenses: Number(raw.totalExpenses) || 0,
    remainingBalance: Number(raw.remainingBalance) || 0,
    groups: {
      income: normalizeGroup(groups.income),
      savings: normalizeGroup(groups.savings),
      expenses: normalizeGroup(groups.expenses),
    },
    isAIGenerated: raw.isAIGenerated,
  };
};

/**
 * Return a new period in which only the category `categoryId` (in any group)
 * has the amount added to spentAmount and the new transaction appended.
 *
 * @throws Error when no category has that id
 */
export const recordCategoryTransaction = (
  period: BudgetPeriod,
  categoryId: string,
  input: RecordTransactionInput
): BudgetPeriod => {
  const found = GROUP_KEYS.some((key) =>
    period.groups[key].some((cat) => cat.id === categoryId)
  );
  if (!found) {
    throw new Error('Category not found in this month\'s budget');
  }

  const transaction: PeriodTransaction = {
    id: `transaction_${Date.now()}`,
    categoryId,
    amount: input.amount,
    description: input.description || 'Transaction',
    date: input.date,
    createdAt: new Date().toISOString(),
  };

  const updateGroup = (categories: PeriodCategory[]) =>
    categories.map((cat) =>
      cat.id === categoryId
        ? {
            ...cat,
            spentAmount: cat.spentAmount + input.amount,
            transactions: [...cat.transactions, transaction],
          }
        : cat
    );

  return {
    ...period,
    groups: {
      income: updateGroup(period.groups.income),
      savings: updateGroup(period.groups.savings),
      expenses: updateGroup(period.groups.expenses),
    },
  };
};

/** Save the period's groups with POST /budget. A 409 counts as success, as on the web. */
export const saveBudgetPeriod = async (period: BudgetPeriod): Promise<void> => {
  try {
    await api.post('/budget', {
      month: period.month,
      groups: {
        income: period.groups.income,
        savings: period.groups.savings,
        expenses: period.groups.expenses,
      },
      isAIGenerated: period.isAIGenerated,
    });
  } catch (error) {
    if ((error as { status?: number })?.status === 409) {
      return;
    }
    throw error;
  }
};

export const useBudgetPeriod = (month: string) =>
  useQuery({
    queryKey: budgetPeriodKey(month),
    queryFn: () => fetchBudgetPeriod(month),
    staleTime: 60 * 1000,
  });

export interface RecordCategoryTransactionVariables extends RecordTransactionInput {
  categoryId: string;
}

/**
 * Record a transaction against a category of `month`'s period, save it, and
 * refresh the period query.
 */
export const useRecordCategoryTransaction = (month: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, ...input }: RecordCategoryTransactionVariables) => {
      const cached = queryClient.getQueryData<BudgetPeriod>(budgetPeriodKey(month));
      const period = cached ?? (await fetchBudgetPeriod(month));
      const updated = recordCategoryTransaction(period, categoryId, input);
      await saveBudgetPeriod(updated);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetPeriodKey(month) });
    },
  });
};
