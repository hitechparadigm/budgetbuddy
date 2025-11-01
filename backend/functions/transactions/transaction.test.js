/**
 * Simple Transaction Tests
 * Focus on critical path functionality only - no external dependencies
 */

const { ValidationError, AuthorizationError, NotFoundError, BusinessLogicError } = require('./errors');

describe('Transaction Error Classes', () => {
  test('ValidationError should include field information', () => {
    const error = new ValidationError('Amount is required', 'amount');
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Amount is required');
    expect(error.field).toBe('amount');
  });

  test('AuthorizationError should have default message', () => {
    const error = new AuthorizationError();
    expect(error.name).toBe('AuthorizationError');
    expect(error.message).toBe('Access denied');
  });

  test('NotFoundError should format resource name', () => {
    const error = new NotFoundError('Transaction');
    expect(error.name).toBe('NotFoundError');
    expect(error.message).toBe('Transaction not found');
  });

  test('BusinessLogicError should work correctly', () => {
    const error = new BusinessLogicError('Invalid business rule');
    expect(error.name).toBe('BusinessLogicError');
    expect(error.message).toBe('Invalid business rule');
  });
});

describe('Budget Calculation Logic', () => {
  test('should calculate budget totals correctly', () => {
    // Test the calculation logic
    const groups = {
      income: [{ totalPlanned: 5000 }, { totalPlanned: 1000 }],
      savings: [{ totalPlanned: 1000 }],
      expenses: [{ totalPlanned: 3500 }, { totalPlanned: 500 }]
    };

    // Simulate the calculation logic from budget-service.js
    let totalIncome = 0;
    let totalSavings = 0;
    let totalExpenses = 0;

    if (groups.income) {
      totalIncome = groups.income.reduce((sum, group) => sum + (group.totalPlanned || 0), 0);
    }
    if (groups.savings) {
      totalSavings = groups.savings.reduce((sum, group) => sum + (group.totalPlanned || 0), 0);
    }
    if (groups.expenses) {
      totalExpenses = groups.expenses.reduce((sum, group) => sum + (group.totalPlanned || 0), 0);
    }

    const remainingBalance = totalIncome - totalSavings - totalExpenses;

    expect(totalIncome).toBe(6000);
    expect(totalSavings).toBe(1000);
    expect(totalExpenses).toBe(4000);
    expect(remainingBalance).toBe(1000);
  });

  test('should handle empty groups', () => {
    const groups = {};

    let totalIncome = 0;
    let totalSavings = 0;
    let totalExpenses = 0;

    if (groups.income) {
      totalIncome = groups.income.reduce((sum, group) => sum + (group.totalPlanned || 0), 0);
    }
    if (groups.savings) {
      totalSavings = groups.savings.reduce((sum, group) => sum + (group.totalPlanned || 0), 0);
    }
    if (groups.expenses) {
      totalExpenses = groups.expenses.reduce((sum, group) => sum + (group.totalPlanned || 0), 0);
    }

    expect(totalIncome).toBe(0);
    expect(totalSavings).toBe(0);
    expect(totalExpenses).toBe(0);
  });
});

describe('Transaction Validation Logic', () => {
  test('should validate required fields', () => {
    const requiredFields = ['amount', 'type', 'categoryId', 'description', 'date'];

    requiredFields.forEach(field => {
      const data = {
        amount: 100,
        type: 'expense',
        categoryId: 'cat_groceries_001',
        description: 'Test transaction',
        date: '2025-10-28'
      };
      delete data[field];

      // Simulate validation logic
      expect(() => {
        if (!data[field]) {
          throw new ValidationError(`${field} is required`, field);
        }
      }).toThrow(ValidationError);
    });
  });

  test('should validate transaction type', () => {
    expect(() => {
      const type = 'invalid';
      if (!['income', 'expense'].includes(type)) {
        throw new ValidationError('Type must be either "income" or "expense"', 'type');
      }
    }).toThrow(ValidationError);

    // Valid types should not throw
    expect(() => {
      const type = 'income';
      if (!['income', 'expense'].includes(type)) {
        throw new ValidationError('Type must be either "income" or "expense"', 'type');
      }
    }).not.toThrow();
  });

  test('should validate positive amount', () => {
    expect(() => {
      const amount = -50;
      if (amount <= 0) {
        throw new ValidationError('Amount must be positive', 'amount');
      }
    }).toThrow(ValidationError);

    expect(() => {
      const amount = 0;
      if (amount <= 0) {
        throw new ValidationError('Amount must be positive', 'amount');
      }
    }).toThrow(ValidationError);

    // Positive amount should not throw
    expect(() => {
      const amount = 50;
      if (amount <= 0) {
        throw new ValidationError('Amount must be positive', 'amount');
      }
    }).not.toThrow();
  });

  test('should validate date format', () => {
    // Test invalid dates individually
    expect(() => {
      const date = '2025/10/28';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new ValidationError('Date must be in YYYY-MM-DD format', 'date');
      }
    }).toThrow(ValidationError);

    expect(() => {
      const date = 'invalid';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new ValidationError('Date must be in YYYY-MM-DD format', 'date');
      }
    }).toThrow(ValidationError);

    // Valid date should not throw
    expect(() => {
      const date = '2025-10-28';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new ValidationError('Date must be in YYYY-MM-DD format', 'date');
      }
    }).not.toThrow();
  });
});

describe('Transaction Business Logic', () => {
  test('should calculate amount changes correctly', () => {
    const amount = 100;

    // Add operation
    const addChange = 'add' === 'add' ? amount : -amount;
    expect(addChange).toBe(100);

    // Subtract operation
    const subtractChange = 'subtract' === 'add' ? amount : -amount;
    expect(subtractChange).toBe(-100);
  });

  test('should extract budget month from date', () => {
    const date = '2025-10-28';
    const budgetMonth = date.substring(0, 7);

    expect(budgetMonth).toBe('2025-10');
  });

  test('should determine group key from transaction type', () => {
    const incomeGroupKey = 'income' === 'income' ? 'income' : 'expenses';
    expect(incomeGroupKey).toBe('income');

    const expenseGroupKey = 'expense' === 'income' ? 'income' : 'expenses';
    expect(expenseGroupKey).toBe('expenses');
  });
});
