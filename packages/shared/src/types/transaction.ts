import { z } from 'zod';

export const TransactionSchema = z.object({
  transactionId: z.string(),
  familyId: z.string(),
  budgetMonth: z.string(), // YYYY-MM format
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'), // ISO 4217 currency code
  type: z.enum(['income', 'expense']),
  categoryId: z.string(),
  categoryName: z.string(),
  description: z.string(),
  date: z.string(), // YYYY-MM-DD format
  merchantName: z.string().optional(),
  createdBy: z.string(),
  createdByName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Transaction = z.infer<typeof TransactionSchema>;

export const CreateTransactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  categoryId: z.string(),
  description: z.string().min(1),
  date: z.string(),
  merchantName: z.string().optional(),
});

export type CreateTransactionRequest = z.infer<typeof CreateTransactionSchema>;

export const TransactionFilterSchema = z.object({
  categoryId: z.string().optional(),
  type: z.enum(['income', 'expense']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  createdBy: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type TransactionFilter = z.infer<typeof TransactionFilterSchema>;
