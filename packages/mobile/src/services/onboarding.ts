/**
 * Onboarding service
 *
 * Sends the completed onboarding selections to POST /auth/onboarding on the
 * main gateway, which creates the user's budget and its first period. The
 * payload matches what the web app sends (apiClient.completeOnboarding), so
 * both clients produce the same records.
 */

import { getLocales } from 'expo-localization';
import {
  createCityKey,
  GeolocationResult,
} from '@budget-buddy/shared/src/services/geolocationService';
import {
  getSuggestions,
  OnboardingSuggestions,
} from '@budget-buddy/shared/src/services/categorySuggestionService';
import { getAllCities } from '@budget-buddy/shared/src/data/cityExpenseData';
import { isValidCurrency } from '@budget-buddy/shared/src/utils/currency';
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

/** The device's locale currency (ISO 4217), or null when the OS reports none. */
export function getDeviceCurrencyCode(): string | null {
  return getLocales()[0]?.currencyCode ?? null;
}

/** Number of categories the onboarding flow selects by default. */
const DEFAULT_CATEGORY_COUNT = 8;

/**
 * Suggestions for the flow's manual-location fallback: the first city in the
 * shared database with countryCode 'ca', as OnboardingFlow.handleManualLocation does.
 */
function fallbackSuggestions(): OnboardingSuggestions | null {
  const city = getAllCities()[0];
  return city ? getSuggestions(createCityKey(city.city, 'ca'), 1) : null;
}

/**
 * Payload for "Skip for now": a minimal personal budget for one person, using
 * the detected location when the city data knows it (otherwise the flow's
 * fallback city), the device currency when supported (otherwise USD) and the
 * flow's default category selection (the top 8 suggestions).
 *
 * POST /auth/onboarding has no AI-generation option, so nothing is sent for it.
 */
export function buildSkipOnboardingInput({
  location,
  currencyCode,
}: {
  location: GeolocationResult | null;
  currencyCode: string | null;
}): CompleteOnboardingInput {
  const detected =
    location?.success && location.city && location.countryCode
      ? getSuggestions(createCityKey(location.city, location.countryCode), 1)
      : null;
  const suggestions = detected ?? fallbackSuggestions();
  if (!suggestions) {
    throw new Error('Could not prepare a default budget. Please try again.');
  }
  return {
    city: suggestions.city,
    country: suggestions.country,
    familySize: 1,
    currentMonth: currentMonthString(),
    currency:
      currencyCode && isValidCurrency(currencyCode) ? currencyCode.toUpperCase() : 'USD',
    budgetType: 'personal',
    selectedCategories: suggestions.categories
      .slice(0, DEFAULT_CATEGORY_COUNT)
      .map((c) => ({ name: c.name, icon: c.icon, adjustedAmount: c.adjustedAmount })),
  };
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
