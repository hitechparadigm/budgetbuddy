import { z } from 'zod';

export const CategorySchema = z.object({
  categoryId: z.string(),
  categoryName: z.string(),
  parentGroup: z.string(),
  groupType: z.enum(['income', 'saving', 'expense']),
  categoryOrder: z.number(),
  icon: z.string(),
  colorCode: z.string(),
  plannedAmount: z.number(),
  spentAmount: z.number(),
  remainingAmount: z.number(),
  isCustom: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export type Category = z.infer<typeof CategorySchema>;

export const BudgetGroupSchema = z.object({
  groupName: z.string(),
  groupType: z.enum(['income', 'saving', 'expense']),
  categories: z.array(CategorySchema),
  totalPlanned: z.number(),
  totalSpent: z.number(),
  totalRemaining: z.number(),
});

export type BudgetGroup = z.infer<typeof BudgetGroupSchema>;

export const BudgetSchema = z.object({
  budgetId: z.string(),
  familyId: z.string(),
  month: z.string(), // YYYY-MM format
  totalIncome: z.number(),
  totalSavings: z.number(),
  totalExpenses: z.number(),
  remainingBalance: z.number(),
  groups: z.object({
    income: z.array(BudgetGroupSchema),
    savings: z.array(BudgetGroupSchema),
    expenses: z.array(BudgetGroupSchema),
  }),
  isAIGenerated: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Budget = z.infer<typeof BudgetSchema>;

export const AIBudgetRequestSchema = z.object({
  userId: z.string(),
  onboardingData: z.object({
    location: z.object({
      country: z.string(),
      province: z.string(),
      city: z.string(),
      postalCode: z.string(),
    }),
    familyStatus: z.string(),
    adults: z.number(),
    children: z.array(z.object({ age: z.number() })),
    housing: z.object({
      type: z.string(),
      monthlyPayment: z.number(),
    }),
    transportation: z.array(z.string()),
    lifestyle: z.object({
      shoppingPreference: z.string(),
      diningOut: z.string(),
      entertainment: z.string(),
    }),
    income: z.object({
      range: z.string(),
      frequency: z.string(),
    }),
  }),
});

export type AIBudgetRequest = z.infer<typeof AIBudgetRequestSchema>;