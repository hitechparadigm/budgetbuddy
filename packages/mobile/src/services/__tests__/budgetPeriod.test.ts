/**
 * budgetPeriod service: the monthly-period reads and writes the Budget tab
 * shares with the web app's BudgetPage. `../api` is the global mock from
 * src/test/setup.ts.
 */
import { api, budgetsApi } from '../api';
import {
  BudgetPeriod,
  fetchBudgetPeriod,
  monthKey,
  recordCategoryTransaction,
  saveBudgetPeriod,
} from '../budgetPeriod';

const mockedApi = api as jest.Mocked<typeof api>;
const mockedBudgetsApi = budgetsApi as jest.Mocked<typeof budgetsApi>;

const makePeriod = (): BudgetPeriod => ({
  budgetId: 'budget_test',
  month: '2026-11',
  totalIncome: 5000,
  totalSavings: 500,
  totalExpenses: 1200,
  remainingBalance: 3300,
  isAIGenerated: false,
  groups: {
    income: [
      { id: 'inc', name: 'Salary', icon: 'I', plannedAmount: 5000, spentAmount: 0, transactions: [] },
    ],
    savings: [
      { id: 'sav', name: 'Emergency Fund', icon: 'S', plannedAmount: 500, spentAmount: 100, transactions: [] },
    ],
    expenses: [
      {
        id: 'food',
        name: 'Groceries',
        icon: 'G',
        plannedAmount: 400,
        spentAmount: 120,
        transactions: [],
        rollover: { enabled: true, cap: 50 },
        isRecurring: true,
      },
      { id: 'rent', name: 'Rent', icon: 'R', plannedAmount: 800, spentAmount: 800, transactions: [] },
    ],
  },
});

const INPUT = { amount: 25, description: 'Lunch', date: '2026-11-20' };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('monthKey', () => {
  it('pads the month to two digits', () => {
    expect(monthKey(2026, 3)).toBe('2026-03');
    expect(monthKey(2026, 11)).toBe('2026-11');
  });
});

describe('fetchBudgetPeriod', () => {
  it('calls GET /budget/current with the month on the main gateway and normalizes categories', async () => {
    mockedApi.get.mockResolvedValueOnce({
      status: 200,
      data: {
        success: true,
        data: {
          budgetId: 'budget_test',
          month: '2026-11',
          totalIncome: '5000',
          totalSavings: 0,
          totalExpenses: 400,
          remainingBalance: 4600,
          isAIGenerated: true,
          groups: {
            income: [{ id: 'inc', name: 'Salary', icon: 'I', plannedAmount: '5000' }],
            expenses: [
              { id: 'food', name: 'Groceries', plannedAmount: '400', spentAmount: 'abc', parentId: 'p1' },
            ],
          },
        },
      },
    });

    const period = await fetchBudgetPeriod('2026-11');

    expect(mockedApi.get).toHaveBeenCalledWith('/budget/current', { month: '2026-11' });
    expect(mockedBudgetsApi.get).not.toHaveBeenCalled();
    expect(period.totalIncome).toBe(5000);
    expect(period.isAIGenerated).toBe(true);
    expect(period.groups.income[0]).toEqual({
      id: 'inc',
      name: 'Salary',
      icon: 'I',
      plannedAmount: 5000,
      spentAmount: 0,
      transactions: [],
    });
    expect(period.groups.expenses[0]).toMatchObject({
      plannedAmount: 400,
      spentAmount: 0,
      transactions: [],
      parentId: 'p1',
    });
    expect(period.groups.savings).toEqual([]);
  });

  it('accepts an unwrapped body and falls back to the requested month', async () => {
    mockedApi.get.mockResolvedValueOnce({
      status: 200,
      data: { budgetId: 'budget_test', groups: {} },
    });

    const period = await fetchBudgetPeriod('2026-12');

    expect(period.month).toBe('2026-12');
    expect(period.groups).toEqual({ income: [], savings: [], expenses: [] });
  });
});

describe('recordCategoryTransaction', () => {
  it.each([
    ['expenses', 'food'],
    ['savings', 'sav'],
    ['income', 'inc'],
  ] as const)('updates only the target category in %s', (group, id) => {
    const period = makePeriod();
    const before = JSON.parse(JSON.stringify(period));

    const updated = recordCategoryTransaction(period, id, INPUT);

    const target = updated.groups[group].find((c) => c.id === id)!;
    const original = before.groups[group].find((c: { id: string }) => c.id === id);
    expect(target.spentAmount).toBe(original.spentAmount + 25);
    expect(target.transactions).toHaveLength(1);
    expect(target.transactions[0]).toMatchObject({
      categoryId: id,
      amount: 25,
      description: 'Lunch',
      date: '2026-11-20',
    });
    expect(target.transactions[0].id).toMatch(/^transaction_\d+$/);
    expect(typeof target.transactions[0].createdAt).toBe('string');

    // Every other category is untouched.
    for (const key of ['income', 'savings', 'expenses'] as const) {
      updated.groups[key].forEach((cat, i) => {
        if (cat.id !== id) expect(cat).toEqual(before.groups[key][i]);
      });
    }
    // The input period is not mutated.
    expect(period).toEqual(before);
  });

  it('keeps fields this client does not know about', () => {
    const updated = recordCategoryTransaction(makePeriod(), 'food', INPUT);
    expect(updated.groups.expenses[0]).toMatchObject({
      rollover: { enabled: true, cap: 50 },
      isRecurring: true,
      icon: 'G',
    });
    expect(updated.budgetId).toBe('budget_test');
    expect(updated.isAIGenerated).toBe(false);
  });

  it('defaults an empty description to "Transaction"', () => {
    const updated = recordCategoryTransaction(makePeriod(), 'rent', { ...INPUT, description: '' });
    expect(updated.groups.expenses[1].transactions[0].description).toBe('Transaction');
  });

  it('throws on an unknown category id', () => {
    expect(() => recordCategoryTransaction(makePeriod(), 'missing', INPUT)).toThrow(
      /Category not found/
    );
  });
});

describe('saveBudgetPeriod', () => {
  it('posts exactly {month, groups, isAIGenerated} to /budget on the main gateway', async () => {
    const period = makePeriod();
    await saveBudgetPeriod(period);

    expect(mockedApi.post).toHaveBeenCalledTimes(1);
    expect(mockedApi.post).toHaveBeenCalledWith('/budget', {
      month: '2026-11',
      groups: {
        income: period.groups.income,
        savings: period.groups.savings,
        expenses: period.groups.expenses,
      },
      isAIGenerated: false,
    });
    expect(mockedBudgetsApi.post).not.toHaveBeenCalled();
  });

  it('treats a 409 as success, like the web', async () => {
    mockedApi.post.mockRejectedValueOnce(Object.assign(new Error('exists'), { status: 409 }));
    await expect(saveBudgetPeriod(makePeriod())).resolves.toBeUndefined();
  });

  it('rethrows other failures', async () => {
    mockedApi.post.mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 500 }));
    await expect(saveBudgetPeriod(makePeriod())).rejects.toThrow('boom');
  });
});
