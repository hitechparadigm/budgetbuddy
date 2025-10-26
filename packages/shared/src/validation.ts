/**
 * BudgetBuddy Validation Schemas
 * Zod schemas for form validation and API request/response validation
 */

import { z } from 'zod';

// ============================================================================
// Authentication Validation Schemas
// ============================================================================

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  code: z
    .string()
    .min(6, 'Verification code must be 6 digits')
    .max(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only numbers'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

// ============================================================================
// Budget & Transaction Validation Schemas
// ============================================================================

export const transactionSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .max(1000000, 'Amount cannot exceed $1,000,000'),
  type: z.enum(['income', 'expense'], {
    required_error: 'Transaction type is required',
  }),
  categoryId: z
    .string()
    .min(1, 'Category is required'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(200, 'Description must be less than 200 characters'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  merchantName: z
    .string()
    .max(100, 'Merchant name must be less than 100 characters')
    .optional(),
});

export const budgetCategorySchema = z.object({
  categoryName: z
    .string()
    .min(1, 'Category name is required')
    .max(50, 'Category name must be less than 50 characters'),
  plannedAmount: z
    .number()
    .min(0, 'Planned amount cannot be negative')
    .max(1000000, 'Planned amount cannot exceed $1,000,000'),
  groupType: z.enum(['income', 'saving', 'expense'], {
    required_error: 'Group type is required',
  }),
  icon: z
    .string()
    .min(1, 'Icon is required'),
  colorCode: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color code'),
});

// ============================================================================
// Onboarding Validation Schemas
// ============================================================================

export const locationSchema = z.object({
  country: z.enum(['CA', 'US'], {
    required_error: 'Please select a country',
  }),
  province: z
    .string()
    .min(1, 'Province/State is required'),
  city: z
    .string()
    .min(1, 'City is required')
    .max(100, 'City name must be less than 100 characters'),
  postalCode: z
    .string()
    .min(1, 'Postal/ZIP code is required')
    .regex(
      /^[A-Za-z0-9\s-]{3,10}$/,
      'Please enter a valid postal/ZIP code'
    ),
});

export const familyInfoSchema = z.object({
  status: z.enum(['single', 'married', 'common-law'], {
    required_error: 'Please select your family status',
  }),
  adults: z
    .number()
    .int()
    .min(1, 'Number of adults must be at least 1')
    .max(10, 'Number of adults cannot exceed 10'),
  children: z
    .array(
      z.object({
        age: z
          .number()
          .int()
          .min(0, 'Child age cannot be negative')
          .max(25, 'Child age cannot exceed 25'),
      })
    )
    .max(10, 'Cannot have more than 10 children'),
});

export const lifestyleSchema = z.object({
  transportation: z
    .array(z.string())
    .min(1, 'Please select at least one transportation method'),
  shopping: z
    .array(z.string())
    .min(1, 'Please select at least one shopping preference'),
  recreation: z
    .array(z.string()),
  dining: z
    .array(z.string()),
});

export const financialInfoSchema = z.object({
  incomeRange: z
    .string()
    .min(1, 'Please select your income range'),
  existingDebt: z
    .boolean(),
  monthlyExpenses: z
    .number()
    .min(0, 'Monthly expenses cannot be negative')
    .max(1000000, 'Monthly expenses cannot exceed $1,000,000'),
});

// ============================================================================
// Family Management Validation Schemas
// ============================================================================

export const familyInviteSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  role: z.enum(['spouse', 'viewer'], {
    required_error: 'Please select a role for the family member',
  }),
});

export const familyNameSchema = z.object({
  familyName: z
    .string()
    .min(1, 'Family name is required')
    .max(100, 'Family name must be less than 100 characters'),
});

// ============================================================================
// Utility Validation Functions
// ============================================================================

export const validateEmail = (email: string): boolean => {
  return z.string().email().safeParse(email).success;
};

export const validatePassword = (password: string): boolean => {
  return registerSchema.shape.password.safeParse(password).success;
};

export const validateAmount = (amount: number): boolean => {
  return z.number().positive().max(1000000).safeParse(amount).success;
};

// ============================================================================
// Form Validation Helper Types
// ============================================================================

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type TransactionFormData = z.infer<typeof transactionSchema>;
export type BudgetCategoryFormData = z.infer<typeof budgetCategorySchema>;
export type LocationFormData = z.infer<typeof locationSchema>;
export type FamilyInfoFormData = z.infer<typeof familyInfoSchema>;
export type LifestyleFormData = z.infer<typeof lifestyleSchema>;
export type FinancialInfoFormData = z.infer<typeof financialInfoSchema>;
export type FamilyInviteFormData = z.infer<typeof familyInviteSchema>;
export type FamilyNameFormData = z.infer<typeof familyNameSchema>;
