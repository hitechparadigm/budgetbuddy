/**
 * Category Suggestion Service
 * Provides rule-based category suggestions based on location and family size
 */

import { CityExpenseData, getCityExpenseData } from '../data/cityExpenseData';

export interface CategorySuggestion {
  name: string;
  icon: string;
  baseAmount: number;
  adjustedAmount: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface OnboardingSuggestions {
  city: string;
  country: string;
  familySize: number;
  classification: 'urban' | 'suburban' | 'rural';
  categories: CategorySuggestion[];
  totalMonthlyBudget: number;
}

/**
 * Get category suggestions for a location and family size
 */
export function getSuggestions(
  cityKey: string,
  familySize: number = 1
): OnboardingSuggestions | null {
  const cityData = getCityExpenseData(cityKey);
  if (!cityData) {
    return null;
  }

  const suggestions = generateCategorySuggestions(cityData, familySize);
  const totalMonthlyBudget = suggestions.reduce((sum, cat) => sum + cat.adjustedAmount, 0);

  return {
    city: cityData.city,
    country: cityData.country,
    familySize,
    classification: cityData.classification,
    categories: suggestions,
    totalMonthlyBudget,
  };
}

/**
 * Generate category suggestions based on city data and family size
 */
function generateCategorySuggestions(
  cityData: CityExpenseData,
  familySize: number
): CategorySuggestion[] {
  const multiplier = calculateFamilySizeMultiplier(familySize);
  const adjustments = getUrbanRuralAdjustments(cityData.classification);

  const categories: CategorySuggestion[] = [
    {
      name: 'Housing',
      icon: '🏠',
      baseAmount: cityData.expenses.housing,
      adjustedAmount: Math.round(cityData.expenses.housing * multiplier * adjustments.housing),
      reason: `${familySize} person${familySize > 1 ? 's' : ''} household in ${cityData.city}`,
      priority: 'high',
    },
    {
      name: 'Transportation',
      icon: '🚗',
      baseAmount: cityData.expenses.transportation,
      adjustedAmount: Math.round(
        cityData.expenses.transportation * multiplier * adjustments.transportation
      ),
      reason: `${cityData.classification} area transportation costs`,
      priority: 'high',
    },
    {
      name: 'Groceries',
      icon: '🛒',
      baseAmount: cityData.expenses.groceries,
      adjustedAmount: Math.round(cityData.expenses.groceries * multiplier * adjustments.groceries),
      reason: `Food for ${familySize} person${familySize > 1 ? 's' : ''}`,
      priority: 'high',
    },
    {
      name: 'Utilities',
      icon: '💡',
      baseAmount: cityData.expenses.utilities,
      adjustedAmount: Math.round(cityData.expenses.utilities * multiplier * adjustments.utilities),
      reason: `Electricity, water, internet for ${familySize} person${familySize > 1 ? 's' : ''}`,
      priority: 'high',
    },
    {
      name: 'Entertainment',
      icon: '🎬',
      baseAmount: cityData.expenses.entertainment,
      adjustedAmount: Math.round(
        cityData.expenses.entertainment * multiplier * adjustments.entertainment
      ),
      reason: 'Movies, streaming, hobbies',
      priority: 'medium',
    },
    {
      name: 'Healthcare',
      icon: '⚕️',
      baseAmount: cityData.expenses.healthcare,
      adjustedAmount: Math.round(
        cityData.expenses.healthcare * multiplier * adjustments.healthcare
      ),
      reason: 'Medical expenses and insurance',
      priority: 'high',
    },
    {
      name: 'Insurance',
      icon: '🛡️',
      baseAmount: cityData.expenses.insurance,
      adjustedAmount: Math.round(cityData.expenses.insurance * multiplier * adjustments.insurance),
      reason: 'Auto, home, and other insurance',
      priority: 'high',
    },
    {
      name: 'Dining Out',
      icon: '🍽️',
      baseAmount: cityData.expenses.dining,
      adjustedAmount: Math.round(cityData.expenses.dining * multiplier * adjustments.dining),
      reason: 'Restaurants and takeout',
      priority: 'medium',
    },
    {
      name: 'Personal Care',
      icon: '💅',
      baseAmount: cityData.expenses.personal,
      adjustedAmount: Math.round(cityData.expenses.personal * multiplier * adjustments.personal),
      reason: 'Haircuts, gym, personal items',
      priority: 'low',
    },
  ];

  // Add childcare if family size > 1
  if (familySize > 1 && cityData.expenses.childcare > 0) {
    categories.push({
      name: 'Childcare',
      icon: '👶',
      baseAmount: cityData.expenses.childcare,
      adjustedAmount: Math.round(cityData.expenses.childcare * adjustments.childcare),
      reason: `Daycare/childcare for ${familySize - 1} child${familySize - 1 > 1 ? 'ren' : ''}`,
      priority: 'high',
    });
  }

  // Sort by priority
  return categories.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Calculate family size multiplier for shared expenses
 * Single person = 1.0x
 * 2-3 people = 1.3-1.5x
 * 4+ people = 1.5-2.0x
 */
function calculateFamilySizeMultiplier(familySize: number): number {
  if (familySize <= 1) return 1.0;
  if (familySize === 2) return 1.3;
  if (familySize === 3) return 1.5;
  if (familySize === 4) return 1.7;
  return 2.0; // 5+ people
}

/**
 * Get urban/rural adjustments for expense categories
 * Urban areas have higher transportation and dining costs
 * Rural areas have lower transportation but potentially higher utilities
 */
function getUrbanRuralAdjustments(
  classification: 'urban' | 'suburban' | 'rural'
): Record<string, number> {
  const baseAdjustments = {
    housing: 1.0,
    transportation: 1.0,
    groceries: 1.0,
    utilities: 1.0,
    entertainment: 1.0,
    healthcare: 1.0,
    insurance: 1.0,
    childcare: 1.0,
    dining: 1.0,
    personal: 1.0,
  };

  if (classification === 'urban') {
    return {
      ...baseAdjustments,
      transportation: 1.2, // Higher public transit costs
      dining: 1.3, // More restaurants
      entertainment: 1.2, // More activities
    };
  }

  if (classification === 'rural') {
    return {
      ...baseAdjustments,
      transportation: 0.7, // Lower public transit, but more car dependency
      dining: 0.6, // Fewer restaurants
      entertainment: 0.7, // Fewer activities
      utilities: 1.1, // Potentially higher heating/cooling
    };
  }

  // Suburban - use base adjustments
  return baseAdjustments;
}

/**
 * Get top N categories by priority
 */
export function getTopCategories(
  suggestions: OnboardingSuggestions,
  count: number = 8
): CategorySuggestion[] {
  return suggestions.categories.slice(0, count);
}

/**
 * Calculate total budget for selected categories
 */
export function calculateTotalBudget(categories: CategorySuggestion[]): number {
  return categories.reduce((sum, cat) => sum + cat.adjustedAmount, 0);
}
