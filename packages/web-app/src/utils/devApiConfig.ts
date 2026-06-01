/**
 * Development API Configuration
 *
 * Provides mock responses for development when backend is not available
 */

export const DEV_MODE = import.meta.env.DEV;

// Mock data for development
export const mockTransactions = [
  {
    transactionId: 'txn_001',
    familyId: 'family_123',
    budgetMonth: '2025-11',
    amount: 150.00,
    type: 'expense',
    categoryId: 'cat_groceries_001',
    description: 'Weekly grocery shopping',
    date: '2025-11-15',
    merchantName: 'Supermarket',
    createdBy: 'user_123',
    createdByName: 'John Doe',
    createdAt: '2025-11-15T10:30:00Z',
    updatedAt: '2025-11-15T10:30:00Z'
  },
  {
    transactionId: 'txn_002',
    familyId: 'family_123',
    budgetMonth: '2025-11',
    amount: 3000.00,
    type: 'income',
    categoryId: 'cat_salary_001',
    description: 'Monthly salary',
    date: '2025-11-01',
    merchantName: null,
    createdBy: 'user_123',
    createdByName: 'John Doe',
    createdAt: '2025-11-01T09:00:00Z',
    updatedAt: '2025-11-01T09:00:00Z'
  }
];

export const mockBudgets = [
  {
    budgetId: 'budget_001',
    familyId: 'family_123',
    month: '2025-11',
    totalIncome: 3000.00,
    totalSavings: 500.00,
    totalExpenses: 2000.00,
    remainingBalance: 500.00,
    groups: {
      income: [
        {
          groupName: 'Income',
          categories: [
            {
              categoryId: 'cat_salary_001',
              categoryName: 'Salary',
              plannedAmount: 3000.00,
              spentAmount: 3000.00,
              remainingAmount: 0.00
            }
          ]
        }
      ],
      savings: [
        {
          groupName: 'Savings',
          categories: [
            {
              categoryId: 'cat_emergency_001',
              categoryName: 'Emergency Fund',
              plannedAmount: 500.00,
              spentAmount: 500.00,
              remainingAmount: 0.00
            }
          ]
        }
      ],
      expenses: [
        {
          groupName: 'Expenses',
          categories: [
            {
              categoryId: 'cat_groceries_001',
              categoryName: 'Groceries',
              plannedAmount: 600.00,
              spentAmount: 150.00,
              remainingAmount: 450.00
            },
            {
              categoryId: 'cat_utilities_001',
              categoryName: 'Utilities',
              plannedAmount: 200.00,
              spentAmount: 0.00,
              remainingAmount: 200.00
            }
          ]
        }
      ]
    },
    isAIGenerated: false,
    createdAt: '2025-11-01T00:00:00Z',
    updatedAt: '2025-11-15T10:30:00Z'
  }
];

/**
 * Mock API responses for development
 */
export const mockApiResponses = {
  '/transactions/health': {
    success: true,
    data: {
      status: 'healthy',
      service: 'transactions',
      version: '1.0.0'
    },
    message: 'Transaction service is healthy'
  },

  '/transactions': {
    success: true,
    data: {
      transactions: mockTransactions,
      count: mockTransactions.length
    },
    message: 'Transactions retrieved successfully'
  },

  '/budget/health': {
    success: true,
    data: {
      status: 'healthy',
      service: 'budget',
      version: '1.0.0'
    },
    message: 'Budget service is healthy'
  },

  '/budget': {
    success: true,
    data: {
      budgets: mockBudgets,
      count: mockBudgets.length
    },
    message: 'Budgets retrieved successfully'
  }
};

/**
 * Check if we should use mock data
 */
export function shouldUseMockData(): boolean {
  return DEV_MODE && localStorage.getItem('budgetbuddy_use_mock_data') === 'true';
}

/**
 * Enable mock data mode
 */
export function enableMockData(): void {
  localStorage.setItem('budgetbuddy_use_mock_data', 'true');
  console.log('🔧 Mock data mode enabled');
}

/**
 * Disable mock data mode
 */
export function disableMockData(): void {
  localStorage.setItem('budgetbuddy_use_mock_data', 'false');
  console.log('🔧 Mock data mode disabled');
}

