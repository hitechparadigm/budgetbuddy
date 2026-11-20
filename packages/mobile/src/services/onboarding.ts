/**
 * Onboarding service
 *
 * Sends the completed onboarding selections to POST /auth/onboarding on the
 * main gateway, which creates the user's budget and its first period. The
 * payload matches what the web app sends (apiClient.completeOnboarding), so
 * both clients produce the same records.
 */

import { api } from './api';

export interface OnboardingCategoryInput {
  name: string;
  icon: string;
  adjustedAmount: number;
}

export interface CompleteOnboardingInput {
  city: string;
  country: string;
  familySize: number;
  /** YYYY-MM */
  currentMonth: string;
  currency?: string;
  budgetType?: 'personal' | 'family' | 'shared';
  selectedCategories: OnboardingCategoryInput[];
}

export interface CompleteOnboardingResult {
  /** True when onboarding had already been completed (HTTP 409). */
  alreadyCompleted: boolean;
}

/** Current month as YYYY-MM. */
export function currentMonthString(date: Date = new Date()): string {
  return date.toISOString().substring(0, 7);
}

/**
 * Complete onboarding.
 *
 * A 409 means the budget already exists, which is success rather than
 * failure: the caller should move on to the budget screen. Any other
 * non-2xx rejects.
 */
export async function completeOnboarding(
  input: CompleteOnboardingInput,
): Promise<CompleteOnboardingResult> {
  try {
    await api.post('/auth/onboarding', input);
    return { alreadyCompleted: false };
  } catch (err) {
    // Checked structurally rather than with `instanceof ApiError`: the status
    // is what matters, and a structural check keeps this working for any
    // error shape carrying one.
    if ((err as { status?: number })?.status === 409) {
      return { alreadyCompleted: true };
    }
    throw err;
  }
}
