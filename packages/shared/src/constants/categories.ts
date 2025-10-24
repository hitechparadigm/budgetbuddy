/**
 * Default budget categories by region
 */

export interface DefaultCategory {
  name: string;
  icon: string;
  colorCode: string;
  isRegionSpecific?: boolean;
}

export interface DefaultGroup {
  name: string;
  type: 'income' | 'saving' | 'expense';
  categories: DefaultCategory[];
}

export const DEFAULT_CATEGORIES_CA: DefaultGroup[] = [
  {
    name: 'Income',
    type: 'income',
    categories: [
      { name: 'Salary', icon: '💼', colorCode: '#4CAF50' },
      { name: 'Freelance', icon: '💻', colorCode: '#2196F3' },
      { name: 'Investment Income', icon: '📈', colorCode: '#FF9800' },
      { name: 'Other Income', icon: '💰', colorCode: '#9C27B0' },
    ],
  },
  {
    name: 'Savings & Investments',
    type: 'saving',
    categories: [
      { name: 'Emergency Fund', icon: '🛡️', colorCode: '#F44336' },
      { name: 'RRSP', icon: '🏦', colorCode: '#3F51B5', isRegionSpecific: true },
      { name: 'TFSA', icon: '💎', colorCode: '#009688', isRegionSpecific: true },
      { name: 'RESP', icon: '🎓', colorCode: '#795548', isRegionSpecific: true },
      { name: 'General Savings', icon: '🏛️', colorCode: '#607D8B' },
    ],
  },
  {
    name: 'Housing',
    type: 'expense',
    categories: [
      { name: 'Rent/Mortgage', icon: '🏠', colorCode: '#FF5722' },
      { name: 'Property Tax', icon: '🏛️', colorCode: '#795548' },
      { name: 'Home Insurance', icon: '🛡️', colorCode: '#9E9E9E' },
      { name: 'Utilities', icon: '⚡', colorCode: '#FFEB3B' },
      { name: 'Internet/Cable', icon: '📺', colorCode: '#00BCD4' },
    ],
  },
  {
    name: 'Transportation',
    type: 'expense',
    categories: [
      { name: 'Car Payment', icon: '🚗', colorCode: '#2196F3' },
      { name: 'Gas', icon: '⛽', colorCode: '#FF9800' },
      { name: 'Car Insurance', icon: '🛡️', colorCode: '#9C27B0' },
      { name: 'Public Transit', icon: '🚌', colorCode: '#4CAF50' },
      { name: 'Car Maintenance', icon: '🔧', colorCode: '#607D8B' },
    ],
  },
  {
    name: 'Food',
    type: 'expense',
    categories: [
      { name: 'Groceries', icon: '🛒', colorCode: '#4CAF50' },
      { name: 'Dining Out', icon: '🍽️', colorCode: '#FF5722' },
      { name: 'Coffee/Snacks', icon: '☕', colorCode: '#795548' },
    ],
  },
  {
    name: 'Personal',
    type: 'expense',
    categories: [
      { name: 'Clothing', icon: '👕', colorCode: '#E91E63' },
      { name: 'Personal Care', icon: '💄', colorCode: '#9C27B0' },
      { name: 'Healthcare', icon: '🏥', colorCode: '#F44336' },
      { name: 'Phone', icon: '📱', colorCode: '#2196F3' },
    ],
  },
  {
    name: 'Entertainment',
    type: 'expense',
    categories: [
      { name: 'Streaming Services', icon: '📺', colorCode: '#FF9800' },
      { name: 'Movies/Events', icon: '🎬', colorCode: '#9C27B0' },
      { name: 'Hobbies', icon: '🎨', colorCode: '#00BCD4' },
      { name: 'Sports/Fitness', icon: '🏋️', colorCode: '#4CAF50' },
    ],
  },
];

export const DEFAULT_CATEGORIES_US: DefaultGroup[] = [
  {
    name: 'Income',
    type: 'income',
    categories: [
      { name: 'Salary', icon: '💼', colorCode: '#4CAF50' },
      { name: 'Freelance', icon: '💻', colorCode: '#2196F3' },
      { name: 'Investment Income', icon: '📈', colorCode: '#FF9800' },
      { name: 'Other Income', icon: '💰', colorCode: '#9C27B0' },
    ],
  },
  {
    name: 'Savings & Investments',
    type: 'saving',
    categories: [
      { name: 'Emergency Fund', icon: '🛡️', colorCode: '#F44336' },
      { name: '401(k)', icon: '🏦', colorCode: '#3F51B5', isRegionSpecific: true },
      { name: 'IRA', icon: '💎', colorCode: '#009688', isRegionSpecific: true },
      { name: 'HSA', icon: '🏥', colorCode: '#795548', isRegionSpecific: true },
      { name: 'General Savings', icon: '🏛️', colorCode: '#607D8B' },
    ],
  },
  {
    name: 'Housing',
    type: 'expense',
    categories: [
      { name: 'Rent/Mortgage', icon: '🏠', colorCode: '#FF5722' },
      { name: 'Property Tax', icon: '🏛️', colorCode: '#795548' },
      { name: 'Home Insurance', icon: '🛡️', colorCode: '#9E9E9E' },
      { name: 'Utilities', icon: '⚡', colorCode: '#FFEB3B' },
      { name: 'Internet/Cable', icon: '📺', colorCode: '#00BCD4' },
    ],
  },
  {
    name: 'Transportation',
    type: 'expense',
    categories: [
      { name: 'Car Payment', icon: '🚗', colorCode: '#2196F3' },
      { name: 'Gas', icon: '⛽', colorCode: '#FF9800' },
      { name: 'Car Insurance', icon: '🛡️', colorCode: '#9C27B0' },
      { name: 'Public Transit', icon: '🚌', colorCode: '#4CAF50' },
      { name: 'Car Maintenance', icon: '🔧', colorCode: '#607D8B' },
    ],
  },
  {
    name: 'Food',
    type: 'expense',
    categories: [
      { name: 'Groceries', icon: '🛒', colorCode: '#4CAF50' },
      { name: 'Dining Out', icon: '🍽️', colorCode: '#FF5722' },
      { name: 'Coffee/Snacks', icon: '☕', colorCode: '#795548' },
    ],
  },
  {
    name: 'Personal',
    type: 'expense',
    categories: [
      { name: 'Clothing', icon: '👕', colorCode: '#E91E63' },
      { name: 'Personal Care', icon: '💄', colorCode: '#9C27B0' },
      { name: 'Healthcare', icon: '🏥', colorCode: '#F44336' },
      { name: 'Phone', icon: '📱', colorCode: '#2196F3' },
    ],
  },
  {
    name: 'Entertainment',
    type: 'expense',
    categories: [
      { name: 'Streaming Services', icon: '📺', colorCode: '#FF9800' },
      { name: 'Movies/Events', icon: '🎬', colorCode: '#9C27B0' },
      { name: 'Hobbies', icon: '🎨', colorCode: '#00BCD4' },
      { name: 'Sports/Fitness', icon: '🏋️', colorCode: '#4CAF50' },
    ],
  },
];

export const getDefaultCategories = (country: string): DefaultGroup[] => {
  switch (country.toUpperCase()) {
    case 'CA':
    case 'CANADA':
      return DEFAULT_CATEGORIES_CA;
    case 'US':
    case 'USA':
    case 'UNITED STATES':
      return DEFAULT_CATEGORIES_US;
    default:
      return DEFAULT_CATEGORIES_US;
  }
};