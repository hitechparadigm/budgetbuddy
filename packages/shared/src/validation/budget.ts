import { z } from 'zod';

export const budgetCategorySchema = z.object({
  categoryName: z.string().min(1, 'Category name is required').max(50),
  parentGroup: z.string().min(1, 'Parent group is required'),
  groupType: z.enum(['income', 'saving', 'expense']),
  plannedAmount: z.number().min(0, 'Planned amount must be positive'),
  icon: z.string().optional(),
  colorCode: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color code').optional(),
});

export const budgetGroupSchema = z.object({
  groupName: z.string().min(1, 'Group name is required').max(50),
  groupType: z.enum(['income', 'saving', 'expense']),
  categories: z.array(budgetCategorySchema),
});

export const budgetCreateSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (YYYY-MM)'),
  groups: z.object({
    income: z.array(budgetGroupSchema),
    savings: z.array(budgetGroupSchema),
    expenses: z.array(budgetGroupSchema),
  }),
});

export const budgetUpdateSchema = z.object({
  groups: z.object({
    income: z.array(budgetGroupSchema).optional(),
    savings: z.array(budgetGroupSchema).optional(),
    expenses: z.array(budgetGroupSchema).optional(),
  }).optional(),
});

export const categoryUpdateSchema = z.object({
  categoryName: z.string().min(1).max(50).optional(),
  plannedAmount: z.number().min(0).optional(),
  icon: z.string().optional(),
  colorCode: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  categoryOrder: z.number().min(0).optional(),
});

export type BudgetCategoryInput = z.infer<typeof budgetCategorySchema>;
export type BudgetGroupInput = z.infer<typeof budgetGroupSchema>;
export type BudgetCreateInput = z.infer<typeof budgetCreateSchema>;
export type BudgetUpdateInput = z.infer<typeof budgetUpdateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;