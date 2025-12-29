/**
 * Budget Types and Interfaces
 * Defines the data models for budget management
 */

export interface Budget {
  id: string;
  name: string;
  amount: number;
  category: string;
  frequency: BudgetFrequency;
  startDate: string; // ISO date string
  endDate?: string; // ISO date string, optional for ongoing budgets
  type: BudgetType;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Recurring budget specific fields
  recurringConfig?: RecurringBudgetConfig;
}

export interface RecurringBudgetConfig {
  // Day of week for weekly budgets (0 = Sunday, 6 = Saturday)
  dayOfWeek?: number;
  // Day of month for monthly budgets (1-31)
  dayOfMonth?: number;
  // Month for yearly budgets (1-12)
  monthOfYear?: number;
  // Custom recurrence pattern
  customPattern?: CustomRecurrencePattern;
  // Next occurrence date (calculated)
  nextOccurrence?: string;
  // Skip weekends/holidays
  skipWeekends?: boolean;
  skipHolidays?: boolean;
  // Auto-adjust for month-end (e.g., if day 31 doesn't exist, use last day)
  adjustForMonthEnd?: boolean;
}

export interface CustomRecurrencePattern {
  // Every N periods (e.g., every 2 weeks, every 3 months)
  interval: number;
  // Specific days for weekly patterns
  daysOfWeek?: number[];
  // Specific weeks of month for monthly patterns
  weeksOfMonth?: number[];
  // End conditions
  endAfterOccurrences?: number;
  endByDate?: string;
}

export interface RecurringBudgetOccurrence {
  budgetId: string;
  occurrenceDate: string;
  plannedAmount: number;
  actualAmount?: number;
  isSkipped: boolean;
  skipReason?: string;
  createdAt: string;
}

export interface BudgetSummary {
  budgetId: string;
  planned: number;
  actual: number;
  remaining: number;
  percentUsed: number;
  isOverBudget: boolean;
  transactionCount: number;
  // Recurring budget summary fields
  nextOccurrence?: string;
  occurrencesThisMonth: number;
  totalOccurrences: number;
  averageActual?: number;
  projectedMonthlyTotal?: number;
}

export interface MonthlyBudgetOverview {
  year: number;
  month: number; // 1-12
  totalPlanned: number;
  totalActual: number;
  totalRemaining: number;
  budgets: BudgetWithSummary[];
  categories: CategorySummary[];
  // Recurring budget overview fields
  recurringBudgets: RecurringBudgetOverview[];
  upcomingOccurrences: UpcomingOccurrence[];
}

export interface RecurringBudgetOverview {
  budgetId: string;
  name: string;
  frequency: BudgetFrequency;
  plannedOccurrences: number;
  actualOccurrences: number;
  totalPlanned: number;
  totalActual: number;
  nextOccurrence?: string;
  isOnTrack: boolean;
}

export interface UpcomingOccurrence {
  budgetId: string;
  budgetName: string;
  occurrenceDate: string;
  plannedAmount: number;
  daysUntil: number;
  category: string;
  type: BudgetType;
}

export interface BudgetWithSummary extends Budget {
  summary: BudgetSummary;
}

export interface CategorySummary {
  category: string;
  planned: number;
  actual: number;
  remaining: number;
  budgetCount: number;
}

export type BudgetType = 'income' | 'expense' | 'savings';

export type BudgetFrequency =
  | 'weekly'
  | 'bi-weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'one-time'
  | 'custom';

export interface CreateBudgetRequest {
  name: string;
  amount: number;
  category: string;
  frequency: BudgetFrequency;
  startDate: string;
  endDate?: string;
  type: BudgetType;
  description?: string;
  recurringConfig?: RecurringBudgetConfig;
}

export interface UpdateBudgetRequest extends Partial<CreateBudgetRequest> {
  id: string;
}

export interface BudgetFilters {
  type?: BudgetType;
  category?: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  frequency?: BudgetFrequency;
  hasUpcomingOccurrences?: boolean;
}

// Common budget categories
export const BUDGET_CATEGORIES = {
  income: [
    'Salary',
    'Freelance',
    'Investment',
    'Business',
    'Other Income',
  ],
  expense: [
    'Housing',
    'Transportation',
    'Food & Dining',
    'Utilities',
    'Healthcare',
    'Entertainment',
    'Shopping',
    'Personal Care',
    'Education',
    'Insurance',
    'Debt Payment',
    'Other Expenses',
  ],
  savings: [
    'Emergency Fund',
    'Retirement',
    'Vacation',
    'Home Down Payment',
    'Investment',
    'Other Savings',
  ],
} as const;

// Budget frequency display names
export const FREQUENCY_LABELS: Record<BudgetFrequency, string> = {
  'weekly': 'Weekly',
  'bi-weekly': 'Bi-weekly',
  'monthly': 'Monthly',
  'quarterly': 'Quarterly',
  'yearly': 'Yearly',
  'one-time': 'One-time',
  'custom': 'Custom',
};

// Budget frequency descriptions
export const FREQUENCY_DESCRIPTIONS: Record<BudgetFrequency, string> = {
  'weekly': 'Repeats every week',
  'bi-weekly': 'Repeats every 2 weeks',
  'monthly': 'Repeats every month',
  'quarterly': 'Repeats every 3 months',
  'yearly': 'Repeats every year',
  'one-time': 'Does not repeat',
  'custom': 'Custom recurrence pattern',
};

// Budget type display names and colors
export const BUDGET_TYPE_CONFIG = {
  income: {
    label: 'Income',
    icon: '💰',
    color: '#10B981', // green
  },
  expense: {
    label: 'Expense',
    icon: '💸',
    color: '#EF4444', // red
  },
  savings: {
    label: 'Savings',
    icon: '💾',
    color: '#3B82F6', // blue
  },
} as const;

// Days of week for recurring configuration
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

// Weeks of month for recurring configuration
export const WEEKS_OF_MONTH = [
  { value: 1, label: 'First week' },
  { value: 2, label: 'Second week' },
  { value: 3, label: 'Third week' },
  { value: 4, label: 'Fourth week' },
  { value: -1, label: 'Last week' },
];

// Months for yearly recurring configuration
export const MONTHS_OF_YEAR = [
  { value: 1, label: 'January', short: 'Jan' },
  { value: 2, label: 'February', short: 'Feb' },
  { value: 3, label: 'March', short: 'Mar' },
  { value: 4, label: 'April', short: 'Apr' },
  { value: 5, label: 'May', short: 'May' },
  { value: 6, label: 'June', short: 'Jun' },
  { value: 7, label: 'July', short: 'Jul' },
  { value: 8, label: 'August', short: 'Aug' },
  { value: 9, label: 'September', short: 'Sep' },
  { value: 10, label: 'October', short: 'Oct' },
  { value: 11, label: 'November', short: 'Nov' },
  { value: 12, label: 'December', short: 'Dec' },
];
