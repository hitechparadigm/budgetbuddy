/**
 * Unified Category System for BudgetBuddy
 *
 * This defines the single source of truth for all categories
 * used across budgets, transactions, and planning.
 */

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'savings' | 'expense';
  group: string;
  isDefault: boolean;
  isActive: boolean;
  order: number;
}

export interface CategoryGroup {
  id: string;
  name: string;
  type: 'income' | 'savings' | 'expense';
  color: string;
  order: number;
  categories: Category[];
}

// Default category definitions that match the screenshots
export const DEFAULT_CATEGORIES: CategoryGroup[] = [
  {
    id: 'income_group',
    name: 'Income',
    type: 'income',
    color: 'green',
    order: 1,
    categories: [
      {
        id: 'cat_salary',
        name: 'Salary',
        icon: '💰',
        color: 'bg-blue-600',
        type: 'income',
        group: 'income_group',
        isDefault: true,
        isActive: true,
        order: 1
      },
      {
        id: 'cat_investment',
        name: 'Investment',
        icon: '📈',
        color: 'bg-green-600',
        type: 'income',
        group: 'income_group',
        isDefault: true,
        isActive: true,
        order: 2
      },
      {
        id: 'cat_rewards',
        name: 'Rewards',
        icon: '🏆',
        color: 'bg-yellow-600',
        type: 'income',
        group: 'income_group',
        isDefault: true,
        isActive: true,
        order: 3
      },
      {
        id: 'cat_gifts',
        name: 'Gifts',
        icon: '🎁',
        color: 'bg-pink-600',
        type: 'income',
        group: 'income_group',
        isDefault: true,
        isActive: true,
        order: 4
      },
      {
        id: 'cat_business',
        name: 'Business',
        icon: '💼',
        color: 'bg-purple-600',
        type: 'income',
        group: 'income_group',
        isDefault: true,
        isActive: true,
        order: 5
      },
      {
        id: 'cat_other_income',
        name: 'Other',
        icon: '⚪',
        color: 'bg-gray-600',
        type: 'income',
        group: 'income_group',
        isDefault: true,
        isActive: true,
        order: 6
      }
    ]
  },
  {
    id: 'savings_group',
    name: 'Savings',
    type: 'savings',
    color: 'blue',
    order: 2,
    categories: [
      {
        id: 'cat_emergency_fund',
        name: 'Emergency Fund',
        icon: '🛡️',
        color: 'bg-red-600',
        type: 'savings',
        group: 'savings_group',
        isDefault: true,
        isActive: true,
        order: 1
      },
      {
        id: 'cat_retirement',
        name: 'Retirement',
        icon: '🏖️',
        color: 'bg-blue-600',
        type: 'savings',
        group: 'savings_group',
        isDefault: true,
        isActive: true,
        order: 2
      },
      {
        id: 'cat_vacation',
        name: 'Vacation',
        icon: '✈️',
        color: 'bg-sky-600',
        type: 'savings',
        group: 'savings_group',
        isDefault: true,
        isActive: true,
        order: 3
      },
      {
        id: 'cat_house_fund',
        name: 'House Fund',
        icon: '🏠',
        color: 'bg-green-700',
        type: 'savings',
        group: 'savings_group',
        isDefault: true,
        isActive: true,
        order: 4
      }
    ]
  },
  {
    id: 'expenses_group',
    name: 'Expenses',
    type: 'expense',
    color: 'red',
    order: 3,
    categories: [
      {
        id: 'cat_groceries',
        name: 'Groceries',
        icon: '🛒',
        color: 'bg-red-600',
        type: 'expense',
        group: 'expenses_group',
        isDefault: true,
        isActive: true,
        order: 1
      },
      {
        id: 'cat_housing',
        name: 'Housing',
        icon: '🏠',
        color: 'bg-brown-600',
        type: 'expense',
        group: 'expenses_group',
        isDefault: true,
        isActive: true,
        order: 2
      },
      {
        id: 'cat_utilities',
        name: 'Utilities',
        icon: '⚡',
        color: 'bg-yellow-600',
        type: 'expense',
        group: 'expenses_group',
        isDefault: true,
        isActive: true,
        order: 3
      },
      {
        id: 'cat_transportation',
        name: 'Transportation',
        icon: '🚗',
        color: 'bg-blue-700',
        type: 'expense',
        group: 'expenses_group',
        isDefault: true,
        isActive: true,
        order: 4
      },
      {
        id: 'cat_entertainment',
        name: 'Entertainment',
        icon: '🎬',
        color: 'bg-purple-600',
        type: 'expense',
        group: 'expenses_group',
        isDefault: true,
        isActive: true,
        order: 5
      },
      {
        id: 'cat_clothing',
        name: 'Clothing',
        icon: '👕',
        color: 'bg-blue-600',
        type: 'expense',
        group: 'expenses_group',
        isDefault: true,
        isActive: true,
        order: 6
      },
      {
        id: 'cat_healthcare',
        name: 'Healthcare',
        icon: '🏥',
        color: 'bg-red-500',
        type: 'expense',
        group: 'expenses_group',
        isDefault: true,
        isActive: true,
        order: 7
      },
      {
        id: 'cat_education',
        name: 'Education',
        icon: '🎓',
        color: 'bg-green-700',
        type: 'expense',
        group: 'expenses_group',
        isDefault: true,
        isActive: true,
        order: 8
      },
      {
        id: 'cat_food_dining',
        name: 'Dining Out',
        icon: '🍽️',
        color: 'bg-orange-600',
        type: 'expense',
        group: 'expenses_group',
        isDefault: true,
        isActive: true,
        order: 9
      },
      {
        id: 'cat_personal_care',
        name: 'Personal Care',
        icon: '💄',
        color: 'bg-pink-500',
        type: 'expense',
        group: 'expenses_group',
        isDefault: true,
        isActive: true,
        order: 10
      }
    ]
  }
];

// Helper functions
export function getCategoriesByType(type: 'income' | 'savings' | 'expense'): Category[] {
  return DEFAULT_CATEGORIES
    .filter(group => group.type === type)
    .flatMap(group => group.categories)
    .sort((a, b) => a.order - b.order);
}

export function getCategoryById(categoryId: string): Category | undefined {
  return DEFAULT_CATEGORIES
    .flatMap(group => group.categories)
    .find(category => category.id === categoryId);
}

export function getCategoryGroupByType(type: 'income' | 'savings' | 'expense'): CategoryGroup | undefined {
  return DEFAULT_CATEGORIES.find(group => group.type === type);
}
