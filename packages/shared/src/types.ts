// BudgetBuddy Shared TypeScript Types
// Common types used across web, mobile, and admin applications

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Budget {
  id: string;
  name: string;
  totalIncome: number;
  totalExpenses: number;
}

// Placeholder types - will be expanded in future tasks