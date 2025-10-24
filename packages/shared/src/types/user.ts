import { z } from 'zod';

/**
 * Schema for user location information
 * Used to determine regional budget categories and cost of living data
 */
export const LocationSchema = z.object({
  country: z.string(), // ISO country code (e.g., 'CA', 'US')
  province: z.string(), // State/province name (e.g., 'Ontario', 'California')
  city: z.string(), // City name for cost of living calculations
  postalCode: z.string(), // Postal/ZIP code for regional data matching
});

/**
 * Complete user profile schema with validation rules
 * Represents a registered user in the BudgetBuddy system
 */
export const UserSchema = z.object({
  userId: z.string(), // Unique identifier from Cognito
  email: z.string().email(), // User's email address (must be valid format)
  firstName: z.string(), // User's first name
  lastName: z.string(), // User's last name
  age: z.number().min(13).max(120), // Age validation (13+ for legal compliance)
  location: LocationSchema, // Geographic location for regional features
  familyId: z.string().optional(), // Optional family account association
  role: z.enum(['primary', 'spouse', 'viewer']), // Role within family account
  subscriptionTier: z.enum(['free', 'premium']), // Subscription level
  accountType: z.enum(['single', 'family']), // Account type determines sharing capabilities
  onboardingCompleted: z.boolean(), // Whether user has completed initial setup
  createdAt: z.string(), // ISO timestamp of account creation
  updatedAt: z.string(), // ISO timestamp of last profile update
});

export type Location = z.infer<typeof LocationSchema>;
export type User = z.infer<typeof UserSchema>;

/**
 * Comprehensive onboarding questionnaire data schema
 * Collects detailed user information for AI budget generation
 * This data is used by AWS Bedrock to create personalized budget recommendations
 */
export const OnboardingDataSchema = z.object({
  // Family composition information
  familyStatus: z.enum(['single', 'married', 'common-law']), // Relationship status affects budget categories
  adults: z.number().min(1).max(10), // Number of adults in household
  children: z.array(z.object({ age: z.number().min(0).max(25) })), // Children ages for education/childcare budgeting
  
  // Housing situation for major expense calculation
  housing: z.object({
    type: z.enum(['rent', 'own', 'other']), // Housing type affects related expenses
    monthlyPayment: z.number().min(0), // Monthly housing cost for budget allocation
  }),
  
  // Transportation methods affect budget categories and amounts
  transportation: z.array(z.enum(['car', 'public', 'bike', 'walk'])), // Multiple transportation methods allowed
  
  // Lifestyle preferences for expense estimation
  lifestyle: z.object({
    shoppingPreference: z.enum(['budget', 'average', 'premium']), // Affects grocery and shopping budgets
    diningOut: z.enum(['rarely', 'sometimes', 'often']), // Restaurant budget allocation
    entertainment: z.enum(['minimal', 'moderate', 'active']), // Entertainment expense level
  }),
  
  // Income information for budget proportions
  income: z.object({
    range: z.enum(['under-30k', '30k-50k', '50k-75k', '75k-100k', 'over-100k']), // Income bracket for budget scaling
    frequency: z.enum(['weekly', 'bi-weekly', 'monthly', 'annually']), // Pay frequency for cash flow planning
  }),
  
  // Debt information for payment allocation
  debt: z.object({
    hasDebt: z.boolean(), // Whether user has existing debt obligations
    types: z.array(z.enum(['credit-card', 'student-loan', 'mortgage', 'car-loan', 'other'])).optional(), // Debt types for payment categories
  }),
});

export type OnboardingData = z.infer<typeof OnboardingDataSchema>;