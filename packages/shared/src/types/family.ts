import { z } from 'zod';

export const FamilySchema = z.object({
  familyId: z.string(),
  familyName: z.string(),
  primaryUserId: z.string(),
  memberIds: z.array(z.string()),
  familyStatus: z.enum(['single', 'married', 'common-law']),
  adults: z.number().min(1),
  children: z.array(z.object({ age: z.number() })),
  sharedBudgetId: z.string(),
  createdAt: z.string(),
});

export type Family = z.infer<typeof FamilySchema>;

export const FamilyInvitationSchema = z.object({
  invitationId: z.string(),
  familyId: z.string(),
  inviterUserId: z.string(),
  inviterName: z.string(),
  inviteeEmail: z.string(),
  token: z.string(),
  status: z.enum(['pending', 'accepted', 'expired']),
  expiresAt: z.string(),
  createdAt: z.string(),
});

export type FamilyInvitation = z.infer<typeof FamilyInvitationSchema>;