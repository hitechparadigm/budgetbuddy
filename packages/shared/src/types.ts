/**
 * BudgetBuddy Shared TypeScript Types
 * Common types used across web, mobile, and admin applications
 */

// ============================================================================
// User & Authentication Types
// ============================================================================

export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  accountType: 'single' | 'family';
  subscriptionTier: 'free' | 'premium';
  familyId?: string;
  familyRole?: 'primary' | 'spouse' | 'viewer';
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  tokens: AuthTokens | null;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
  details?: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: string;
  errors?: string[];
}

// Authentication API Types
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterResponse {
  message: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  accountType: string;
  subscriptionTier: string;
  nextSteps: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  idToken: string;
  user: User;
  expiresIn: number;
}

// ============================================================================
// Budget & Financial Types
// ============================================================================

export interface Budget {
  budgetId: string;
  familyId: string;
  month: string; // YYYY-MM format
  totalIncome: number;
  totalSavings: number;
  totalExpenses: number;
  remainingBalance: number;
  groups: {
    income: BudgetGroup[];
    savings: BudgetGroup[];
    expenses: BudgetGroup[];
  };
  isAIGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetGroup {
  groupName: string;
  groupType: 'income' | 'saving' | 'expense';
  categories: BudgetCategory[];
  totalPlanned: number;
  totalSpent: number;
  totalRemaining: number;
}

export interface BudgetCategory {
  categoryId: string;
  categoryName: string;
  parentGroup: string;
  groupType: 'income' | 'saving' | 'expense';
  categoryOrder: number;
  icon: string;
  colorCode: string;
  plannedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  isCustom: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Transaction {
  transactionId: string;
  familyId: string;
  budgetMonth: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId: string;
  categoryName: string;
  description: string;
  date: string;
  merchantName?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Family & Account Types
// ============================================================================

export interface Family {
  familyId: string;
  familyName: string;
  primaryUserId: string;
  memberIds: string[];
  familyStatus: 'single' | 'married' | 'common-law';
  adults: number;
  children: Array<{ age: number }>;
  sharedBudgetId: string;
  createdAt: string;
}

export interface FamilyMember {
  userId: string;
  familyId: string;
  role: 'primary' | 'spouse' | 'viewer';
  firstName: string;
  lastName: string;
  email: string;
  joinedAt: string;
}

// ============================================================================
// Onboarding & AI Types
// ============================================================================

export interface OnboardingData {
  location: {
    country: string;
    province: string;
    city: string;
    postalCode: string;
  };
  familyInfo: {
    status: 'single' | 'married' | 'common-law';
    adults: number;
    children: Array<{ age: number }>;
  };
  lifestyle: {
    transportation: string[];
    shopping: string[];
    recreation: string[];
    dining: string[];
  };
  financial: {
    incomeRange: string;
    existingDebt: boolean;
    monthlyExpenses: number;
  };
}

export interface CostOfLivingData {
  cityName: string;
  province: string;
  country: string;
  medianIncome: number;
  medianRent2Bed: number;
  avgGroceriesFamily4: number;
  avgUtilities: number;
  avgTransportation: number;
  avgChildcare: number;
  avgHealthcare: number;
  avgEntertainment: number;
  lastUpdated: string;
}

// ============================================================================
// Form & Validation Types
// ============================================================================

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'checkbox';
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

// ============================================================================
// UI & Component Types
// ============================================================================

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface NotificationState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface ModalState {
  isOpen: boolean;
  title?: string;
  content?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
