import { z } from 'zod';

export const transactionCreateSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['income', 'expense']),
  categoryId: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required').max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  merchantName: z.string().max(100).optional(),
});

export const transactionUpdateSchema = z.object({
  amount: z.number().positive().optional(),
  categoryId: z.string().min(1).optional(),
  description: z.string().min(1).max(200).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  merchantName: z.string().max(100).optional(),
});

export const transactionFiltersSchema = z.object({
  categoryId: z.string().optional(),
  type: z.enum(['income', 'expense']).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  createdBy: z.string().optional(),
  searchTerm: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  nextToken: z.string().optional(),
});

export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;
export type TransactionFiltersInput = z.infer<typeof transactionFiltersSchema>;