import { z } from 'zod';

export const userLocationSchema = z.object({
  country: z.string().min(2),
  province: z.string().min(1),
  city: z.string().min(1),
  postalCode: z.string().min(3),
});

export const onboardingDataSchema = z.object({
  familyStatus: z.enum(['single', 'married', 'common-law']),
  adults: z.number().min(1).max(10),
  children: z.array(z.object({ age: z.number().min(0).max(25) })),
  transportation: z.array(z.string()),
  lifestyle: z.array(z.string()),
  roughIncome: z.string(),
  monthlyExpenses: z.record(z.string(), z.number().min(0)),
  housingCosts: z.object({
    rent: z.number().min(0).optional(),
    mortgage: z.number().min(0).optional(),
    utilities: z.number().min(0),
  }),
});

export const userProfileUpdateSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  age: z.number().min(13).max(120).optional(),
  location: userLocationSchema.optional(),
});

export type OnboardingDataInput = z.infer<typeof onboardingDataSchema>;
export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>;