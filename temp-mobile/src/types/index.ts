// Core application types
export interface User {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  timezone: string;
  currency: string;
  location?: {
    country: string;
    city: string;
    zipCode: string;
  };
  preferences: {
    notifications: NotificationPreferences;
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
  subscription: {
    tier: 'free' | 'premium';
    expiresAt?: string;
    features: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  budgetAlerts: boolean;
  overspendingAlerts: boolean;
  billReminders: boolean;
  weeklyReports: boolean;
  monthlyReports: boolean;
}

export interface Budget {
  id: string;
  userId: string;
  month: string; // YYYY-MM format
  groups: BudgetGroup[];
  isAIGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetGroup {
  id: string;
  name: string;
  type: 'income' | 'savings' | 'expense';
  icon: string;
  categories: BudgetCategory[];
  isCollapsed: boolean;
  order: number;
}

export interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  color?: string;

  // Recurring settings
  isRecurring: boolean;
  recurringFrequency?: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'annually';
  baseAmount: number;
  startDate?: string;
  endDate?: string;
  nextExpectedDate?: string;
  expectedDates?: string[];
  isPaused: boolean;

  // Calculated amounts
  plannedMonthlyAmount: number;
  actualAmount: number;
  variance: number;

  transactions: Transaction[];
  order: number;

  // Category management
  isCustom: boolean;
  parentCategoryId?: string;
  isArchived: boolean;
  usageCount: number;
  lastUsed?: string;
}

export interface Transaction {
  id: string;
  categoryId: string;
  amount: number;
  description: string;
  merchant?: string;
  date: string; // YYYY-MM-DD
  currency?: string;
  exchangeRate?: number;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  tags?: string[];
  receiptUrl?: string;
  isRecurring?: boolean;
  recurringTemplateId?: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  createdAt: string;
  updatedAt?: string;
}

// Navigation types
export type RootTabParamList = {
  Budget: undefined;
  Transactions: undefined;
  Summary: undefined;
  Settings: undefined;
};

export type BudgetStackParamList = {
  BudgetList: undefined;
  BudgetDetail: { budgetId: string };
  AddCategory: { groupType: 'income' | 'savings' | 'expense' };
  EditCategory: { categoryId: string };
};

export type TransactionStackParamList = {
  TransactionList: undefined;
  AddTransaction: { categoryId?: string };
  EditTransaction: { transactionId: string };
  TransactionDetail: { transactionId: string };
};

// API types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: string;
  message: string;
  timestamp: string;
}

// Transaction request types
export interface CreateTransactionRequest {
  categoryId: string;
  amount: number;
  description: string;
  merchant?: string;
  date: string; // YYYY-MM-DD
  currency?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  tags?: string[];
  receiptUrl?: string;
  isRecurring?: boolean;
  recurringTemplateId?: string;
}

export interface UpdateTransactionRequest extends CreateTransactionRequest {
  id: string;
}

// Offline sync types
export interface LocalBudget {
  id: string;
  month: string;
  data: Budget;
  lastSynced: string;
  isDirty: boolean;
}

export interface LocalTransaction {
  id: string;
  budgetId: string;
  data: Transaction;
  syncStatus: 'synced' | 'pending' | 'failed';
  createdLocally: boolean;
  lastSyncAttempt?: string;
}

export interface SyncQueue {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'budget' | 'transaction' | 'category';
  entityId: string;
  data: any;
  attempts: number;
  lastAttempt?: string;
  error?: string;
}
