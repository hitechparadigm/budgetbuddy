import { z } from 'zod';

export const SubscriptionSchema = z.object({
  userId: z.string(),
  tier: z.enum(['free', 'premium']),
  status: z.enum(['active', 'canceled', 'past_due']),
  stripeSubscriptionId: z.string().optional(),
  stripeCustomerId: z.string().optional(),
  currentPeriodStart: z.string(),
  currentPeriodEnd: z.string(),
  cancelAtPeriodEnd: z.boolean(),
  createdAt: z.string(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

export const FinancialTipSchema = z.object({
  tipId: z.string(),
  title: z.string(),
  content: z.string(),
  category: z.enum(['budgeting', 'saving', 'investing', 'debt', 'retirement']),
  country: z.enum(['CA', 'US', 'ALL']),
  status: z.enum(['draft', 'published', 'archived']),
  scheduledDate: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
});

export type FinancialTip = z.infer<typeof FinancialTipSchema>;