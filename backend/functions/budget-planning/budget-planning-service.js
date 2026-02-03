/**
 * Budget Planning Service
 *
 * Service layer for AI-powered budget planning that:
 * - Analyzes historical spending patterns
 * - Integrates with detected recurring bills
 * - Generates intelligent budget suggestions
 * - Handles bi-weekly frequency calculations
 * - Applies seasonal adjustments
 *
 * Implements the handler → service → repository pattern.
 */

const { v4: uuidv4 } = require("uuid");

/**
 * Default number of months to analyze for historical data
 */
const DEFAULT_HISTORY_MONTHS = 3;

/**
 * Minimum confidence score for suggestions
 */
const MIN_CONFIDENCE_SCORE = 30;

/**
 * High confidence threshold
 */
const HIGH_CONFIDENCE_THRESHOLD = 70;

/**
 * Generate budget suggestions for a target month
 *
 * @param {string} userId - User ID
 * @param {string} familyId - Family ID
 * @param {string} targetMonth - Target month (YYYY-MM)
 * @param {Object} options - Options
 * @param {Object} dependencies - Injected dependencies (for testing)
 * @returns {Promise<Object>} Budget suggestions
 */
async function generateSuggestions(
  userId,
  familyId,
  targetMonth,
  options = {},
  dependencies = {},
) {
  const {
    includeRecurringBills = true,
    includeHistoricalAverage = true,
    historyMonths = DEFAULT_HISTORY_MONTHS,
  } = options;

  // Use injected dependencies or defaults
  const {
    getRecurringBills = defaultGetRecurringBills,
    getHistoricalSpending = defaultGetHistoricalSpending,
    getCategories = defaultGetCategories,
    callAI = null,
  } = dependencies;

  // Validate inputs
  if (!userId) throw new Error("userId is required");
  if (!familyId) throw new Error("familyId is required");
  if (!targetMonth || !/^\d{4}-\d{2}$/.test(targetMonth)) {
    throw new Error("targetMonth must be in YYYY-MM format");
  }

  // Parse target month
  const [targetYear, targetMonthNum] = targetMonth.split("-").map(Number);
  const targetDate = new Date(targetYear, targetMonthNum - 1, 1);

  // Get recurring bills
  let recurringBills = [];
  if (includeRecurringBills) {
    recurringBills = await getRecurringBills(familyId);
  }

  // Get historical spending
  let historicalSpending = [];
  if (includeHistoricalAverage) {
    historicalSpending = await getHistoricalSpending(
      familyId,
      historyMonths,
      targetMonth,
    );
  }

  // Get categories
  const categories = await getCategories(familyId);

  // Generate suggestions by category
  const suggestions = generateCategorySuggestions(
    categories,
    recurringBills,
    historicalSpending,
    targetDate,
  );

  // Optionally enhance with AI
  let enhancedSuggestions = suggestions;
  if (callAI && suggestions.length > 0) {
    try {
      enhancedSuggestions = await enhanceWithAI(
        suggestions,
        recurringBills,
        historicalSpending,
        targetMonth,
        callAI,
      );
    } catch (error) {
      console.warn("AI enhancement failed:", error.message);
    }
  }

  // Calculate totals
  const totalSuggested = enhancedSuggestions.reduce(
    (sum, s) => sum + s.suggestedAmount,
    0,
  );

  // Create suggestion record
  const suggestionId = uuidv4();
  const result = {
    suggestionId,
    familyId,
    userId,
    targetMonth,
    suggestions: enhancedSuggestions,
    totalSuggested,
    status: "pending",
    generatedAt: new Date().toISOString(),
    metadata: {
      recurringBillsCount: recurringBills.length,
      historicalMonthsAnalyzed: historyMonths,
      categoriesAnalyzed: categories.length,
    },
  };

  return result;
}

/**
 * Generate suggestions for each category
 *
 * @param {Array} categories - Budget categories
 * @param {Array} recurringBills - Recurring bills
 * @param {Array} historicalSpending - Historical spending data
 * @param {Date} targetDate - Target month date
 * @returns {Array} Category suggestions
 */
function generateCategorySuggestions(
  categories,
  recurringBills,
  historicalSpending,
  targetDate,
) {
  const suggestions = [];

  for (const category of categories) {
    const categoryId = category.categoryId || category.id;
    const categoryName = category.categoryName || category.name;

    // Get recurring bills for this category
    const categoryBills = recurringBills.filter(
      (bill) => bill.categoryId === categoryId,
    );

    // Get historical spending for this category
    const categoryHistory = historicalSpending.filter(
      (spending) => spending.categoryId === categoryId,
    );

    // Calculate suggestion
    const suggestion = calculateCategorySuggestion(
      categoryId,
      categoryName,
      categoryBills,
      categoryHistory,
      targetDate,
    );

    if (suggestion && suggestion.suggestedAmount > 0) {
      suggestions.push(suggestion);
    }
  }

  // Sort by suggested amount (highest first)
  return suggestions.sort((a, b) => b.suggestedAmount - a.suggestedAmount);
}

/**
 * Calculate suggestion for a single category
 *
 * @param {string} categoryId - Category ID
 * @param {string} categoryName - Category name
 * @param {Array} bills - Recurring bills in this category
 * @param {Array} history - Historical spending in this category
 * @param {Date} targetDate - Target month date
 * @returns {Object|null} Category suggestion
 */
function calculateCategorySuggestion(
  categoryId,
  categoryName,
  bills,
  history,
  targetDate,
) {
  const breakdown = [];
  let totalFromBills = 0;
  let totalFromHistory = 0;
  let confidenceFactors = [];

  // Process recurring bills
  for (const bill of bills) {
    const billAmount = calculateBillAmountForMonth(bill, targetDate);
    if (billAmount > 0) {
      breakdown.push({
        item: bill.name || bill.merchantName,
        amount: billAmount,
        type: "recurring",
        frequency: bill.frequency,
      });
      totalFromBills += billAmount;
      confidenceFactors.push(0.9); // High confidence for recurring bills
    }
  }

  // Process historical spending
  if (history.length > 0) {
    const historicalAvg = calculateHistoricalAverage(history);
    const seasonalAdjustment = calculateSeasonalAdjustment(
      history,
      targetDate.getMonth(),
    );

    const adjustedAverage = historicalAvg * seasonalAdjustment;

    // Only add historical average if it's significantly different from bills
    const nonBillAmount = Math.max(0, adjustedAverage - totalFromBills);
    if (nonBillAmount > 0) {
      breakdown.push({
        item: "Historical average (non-recurring)",
        amount: Math.round(nonBillAmount * 100) / 100,
        type: "average",
        seasonalAdjustment:
          seasonalAdjustment !== 1
            ? Math.round(seasonalAdjustment * 100) / 100
            : null,
      });
      totalFromHistory = nonBillAmount;
      confidenceFactors.push(history.length >= 3 ? 0.7 : 0.5);
    }
  }

  // Calculate total suggested amount
  const suggestedAmount =
    Math.round((totalFromBills + totalFromHistory) * 100) / 100;

  if (suggestedAmount <= 0) {
    return null;
  }

  // Calculate confidence score
  const confidenceScore = calculateConfidenceScore(
    confidenceFactors,
    bills.length,
    history.length,
  );

  // Generate explanation
  const explanation = generateExplanation(
    categoryName,
    bills.length,
    history.length,
    suggestedAmount,
    confidenceScore,
  );

  return {
    categoryId,
    categoryName,
    suggestedAmount,
    confidenceScore,
    breakdown,
    explanation,
  };
}

/**
 * Calculate bill amount for a specific month
 * Handles bi-weekly frequency (2 or 3 occurrences per month)
 *
 * @param {Object} bill - Bill object
 * @param {Date} targetDate - Target month date
 * @returns {number} Amount for the month
 */
function calculateBillAmountForMonth(bill, targetDate) {
  const amount = bill.amount || bill.averageAmount || 0;
  const frequency = bill.frequency;

  switch (frequency) {
    case "weekly":
      // 4-5 weeks per month, use 4.33 average
      return Math.round(amount * 4.33 * 100) / 100;

    case "bi-weekly":
      // Calculate actual occurrences in target month
      const biWeeklyOccurrences = calculateBiWeeklyOccurrences(
        bill.dueDate || bill.nextExpectedDate,
        targetDate,
      );
      return Math.round(amount * biWeeklyOccurrences * 100) / 100;

    case "monthly":
      return amount;

    case "quarterly":
      // Check if bill is due in target month
      if (isBillDueInMonth(bill, targetDate, 3)) {
        return amount;
      }
      return 0;

    case "annual":
    case "annually":
      // Check if bill is due in target month
      if (isBillDueInMonth(bill, targetDate, 12)) {
        return amount;
      }
      return 0;

    default:
      return amount; // Assume monthly
  }
}

/**
 * Calculate number of bi-weekly occurrences in a month
 *
 * @param {string} startDate - Bill start/due date
 * @param {Date} targetDate - Target month date
 * @returns {number} Number of occurrences (2 or 3)
 */
function calculateBiWeeklyOccurrences(startDate, targetDate) {
  if (!startDate) return 2; // Default to 2

  const start = new Date(startDate);
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();

  // Get first and last day of target month
  const firstDay = new Date(targetYear, targetMonth, 1);
  const lastDay = new Date(targetYear, targetMonth + 1, 0);

  // Calculate days since start date
  const daysSinceStart = Math.floor((firstDay - start) / (1000 * 60 * 60 * 24));

  // Find first occurrence in target month
  let daysToFirstOccurrence = daysSinceStart % 14;
  if (daysToFirstOccurrence < 0) {
    daysToFirstOccurrence += 14;
  }

  const firstOccurrence = new Date(firstDay);
  firstOccurrence.setDate(firstOccurrence.getDate() + daysToFirstOccurrence);

  // Count occurrences
  let occurrences = 0;
  let currentDate = new Date(firstOccurrence);

  while (currentDate <= lastDay) {
    if (currentDate >= firstDay) {
      occurrences++;
    }
    currentDate.setDate(currentDate.getDate() + 14);
  }

  return Math.max(occurrences, 2); // At least 2
}

/**
 * Check if a bill is due in the target month
 *
 * @param {Object} bill - Bill object
 * @param {Date} targetDate - Target month date
 * @param {number} intervalMonths - Interval in months
 * @returns {boolean} True if due in target month
 */
function isBillDueInMonth(bill, targetDate, intervalMonths) {
  const dueDate = bill.dueDate || bill.nextExpectedDate;
  if (!dueDate) return false;

  const due = new Date(dueDate);
  const targetMonth = targetDate.getMonth();
  const targetYear = targetDate.getFullYear();

  // Calculate months difference
  const monthsDiff =
    (targetYear - due.getFullYear()) * 12 + (targetMonth - due.getMonth());

  // Check if target month aligns with interval
  return monthsDiff >= 0 && monthsDiff % intervalMonths === 0;
}

/**
 * Calculate historical average spending
 *
 * @param {Array} history - Historical spending data
 * @returns {number} Average amount
 */
function calculateHistoricalAverage(history) {
  if (!history || history.length === 0) return 0;

  const total = history.reduce((sum, h) => sum + (h.amount || 0), 0);
  return total / history.length;
}

/**
 * Calculate seasonal adjustment factor
 *
 * @param {Array} history - Historical spending data
 * @param {number} targetMonth - Target month (0-11)
 * @returns {number} Adjustment factor (1.0 = no adjustment)
 */
function calculateSeasonalAdjustment(history, targetMonth) {
  if (!history || history.length < 6) return 1.0; // Not enough data

  // Group by month
  const monthlyTotals = {};
  const monthlyCounts = {};

  for (const h of history) {
    const month = new Date(h.date || h.month).getMonth();
    monthlyTotals[month] = (monthlyTotals[month] || 0) + (h.amount || 0);
    monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
  }

  // Calculate monthly averages
  const monthlyAverages = {};
  for (const month in monthlyTotals) {
    monthlyAverages[month] = monthlyTotals[month] / monthlyCounts[month];
  }

  // Calculate overall average
  const overallAvg = calculateHistoricalAverage(history);
  if (overallAvg === 0) return 1.0;

  // Get target month average
  const targetMonthAvg = monthlyAverages[targetMonth];
  if (!targetMonthAvg) return 1.0;

  // Calculate adjustment (capped between 0.5 and 2.0)
  const adjustment = targetMonthAvg / overallAvg;
  return Math.max(0.5, Math.min(2.0, adjustment));
}

/**
 * Calculate confidence score for a suggestion
 *
 * @param {Array} factors - Individual confidence factors
 * @param {number} billCount - Number of recurring bills
 * @param {number} historyCount - Number of historical data points
 * @returns {number} Confidence score (0-100)
 */
function calculateConfidenceScore(factors, billCount, historyCount) {
  if (factors.length === 0) return MIN_CONFIDENCE_SCORE;

  // Base score from factors
  const avgFactor = factors.reduce((sum, f) => sum + f, 0) / factors.length;

  // Bonus for more data
  const dataBonus = Math.min(0.2, (billCount + historyCount) * 0.02);

  // Calculate final score
  const score = Math.round((avgFactor + dataBonus) * 100);

  return Math.max(MIN_CONFIDENCE_SCORE, Math.min(100, score));
}

/**
 * Generate explanation for a suggestion
 *
 * @param {string} categoryName - Category name
 * @param {number} billCount - Number of recurring bills
 * @param {number} historyCount - Number of historical data points
 * @param {number} amount - Suggested amount
 * @param {number} confidence - Confidence score
 * @returns {string} Explanation text
 */
function generateExplanation(
  categoryName,
  billCount,
  historyCount,
  amount,
  confidence,
) {
  let explanation = `Suggested ${amount.toFixed(2)} for ${categoryName}. `;

  if (billCount > 0) {
    explanation += `Based on ${billCount} recurring bill${billCount > 1 ? "s" : ""}. `;
  }

  if (historyCount > 0) {
    explanation += `Analyzed ${historyCount} month${historyCount > 1 ? "s" : ""} of spending history. `;
  }

  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    explanation += "High confidence based on consistent patterns.";
  } else if (confidence >= 50) {
    explanation += "Moderate confidence - consider reviewing.";
  } else {
    explanation += "Lower confidence - limited data available.";
  }

  return explanation;
}

/**
 * Enhance suggestions with AI
 *
 * @param {Array} suggestions - Base suggestions
 * @param {Array} bills - Recurring bills
 * @param {Array} history - Historical spending
 * @param {string} targetMonth - Target month
 * @param {Function} callAI - AI call function
 * @returns {Promise<Array>} Enhanced suggestions
 */
async function enhanceWithAI(suggestions, bills, history, targetMonth, callAI) {
  // Build AI prompt
  const prompt = buildBudgetPlanningPrompt(
    suggestions,
    bills,
    history,
    targetMonth,
  );

  // Call AI
  const response = await callAI(prompt);

  // Parse AI response
  try {
    const aiSuggestions = JSON.parse(response);
    return mergeSuggestionsWithAI(suggestions, aiSuggestions);
  } catch (error) {
    console.warn("Failed to parse AI response:", error.message);
    return suggestions;
  }
}

/**
 * Build AI prompt for budget planning
 *
 * @param {Array} suggestions - Base suggestions
 * @param {Array} bills - Recurring bills
 * @param {Array} history - Historical spending
 * @param {string} targetMonth - Target month
 * @returns {string} AI prompt
 */
function buildBudgetPlanningPrompt(suggestions, bills, history, targetMonth) {
  return `You are a budget planning assistant. Review these budget suggestions and provide improvements.

Target Month: ${targetMonth}

Current Suggestions:
${JSON.stringify(suggestions, null, 2)}

Recurring Bills:
${JSON.stringify(bills.slice(0, 10), null, 2)}

Historical Spending Summary:
${JSON.stringify(history.slice(0, 20), null, 2)}

Provide improved suggestions in JSON format:
[
  {
    "categoryId": "string",
    "suggestedAmount": number,
    "explanation": "string with reasoning"
  }
]

Focus on:
1. Identifying missing categories
2. Adjusting amounts based on patterns
3. Seasonal considerations for ${targetMonth}`;
}

/**
 * Merge base suggestions with AI improvements
 *
 * @param {Array} baseSuggestions - Base suggestions
 * @param {Array} aiSuggestions - AI suggestions
 * @returns {Array} Merged suggestions
 */
function mergeSuggestionsWithAI(baseSuggestions, aiSuggestions) {
  if (!Array.isArray(aiSuggestions)) return baseSuggestions;

  return baseSuggestions.map((base) => {
    const aiMatch = aiSuggestions.find(
      (ai) => ai.categoryId === base.categoryId,
    );
    if (aiMatch && aiMatch.explanation) {
      return {
        ...base,
        aiExplanation: aiMatch.explanation,
        aiSuggestedAmount: aiMatch.suggestedAmount,
      };
    }
    return base;
  });
}

/**
 * Apply suggestions to a budget
 *
 * @param {string} userId - User ID
 * @param {string} familyId - Family ID
 * @param {string} suggestionId - Suggestion ID
 * @param {Array} selectedCategories - Categories to apply (null = all)
 * @param {Object} dependencies - Injected dependencies
 * @returns {Promise<Object>} Applied result
 */
async function applySuggestions(
  userId,
  familyId,
  suggestionId,
  selectedCategories = null,
  dependencies = {},
) {
  const {
    getSuggestion = defaultGetSuggestion,
    updateBudget = defaultUpdateBudget,
    updateSuggestionStatus = defaultUpdateSuggestionStatus,
  } = dependencies;

  // Validate inputs
  if (!userId) throw new Error("userId is required");
  if (!familyId) throw new Error("familyId is required");
  if (!suggestionId) throw new Error("suggestionId is required");

  // Get suggestion
  const suggestion = await getSuggestion(familyId, suggestionId);
  if (!suggestion) {
    throw new Error("Suggestion not found");
  }

  if (suggestion.status === "applied") {
    throw new Error("Suggestion already applied");
  }

  // Filter suggestions if specific categories selected
  let suggestionsToApply = suggestion.suggestions;
  if (selectedCategories && selectedCategories.length > 0) {
    suggestionsToApply = suggestion.suggestions.filter((s) =>
      selectedCategories.includes(s.categoryId),
    );
  }

  // Apply to budget
  const appliedCategories = [];
  for (const s of suggestionsToApply) {
    try {
      await updateBudget(familyId, suggestion.targetMonth, s.categoryId, {
        budgeted: s.suggestedAmount,
        aiSuggested: true,
        suggestionId,
      });
      appliedCategories.push(s.categoryId);
    } catch (error) {
      console.error(
        `Failed to apply suggestion for ${s.categoryId}:`,
        error.message,
      );
    }
  }

  // Update suggestion status
  await updateSuggestionStatus(familyId, suggestionId, "applied", userId);

  return {
    suggestionId,
    targetMonth: suggestion.targetMonth,
    appliedCategories,
    totalApplied: appliedCategories.length,
    appliedAt: new Date().toISOString(),
  };
}

/**
 * Get suggestions for a family
 *
 * @param {string} userId - User ID
 * @param {string} familyId - Family ID
 * @param {Object} filters - Optional filters
 * @param {Object} dependencies - Injected dependencies
 * @returns {Promise<Array>} Suggestions
 */
async function getSuggestions(
  userId,
  familyId,
  filters = {},
  dependencies = {},
) {
  const { getSuggestionsByFamily = defaultGetSuggestionsByFamily } =
    dependencies;

  if (!familyId) throw new Error("familyId is required");

  const { status, targetMonth } = filters;

  let suggestions = await getSuggestionsByFamily(familyId);

  // Apply filters
  if (status) {
    suggestions = suggestions.filter((s) => s.status === status);
  }
  if (targetMonth) {
    suggestions = suggestions.filter((s) => s.targetMonth === targetMonth);
  }

  // Sort by generated date (newest first)
  return suggestions.sort(
    (a, b) => new Date(b.generatedAt) - new Date(a.generatedAt),
  );
}

// Default implementations (to be replaced with actual repository calls)
async function defaultGetRecurringBills(familyId) {
  console.log("defaultGetRecurringBills called for:", familyId);
  return [];
}

async function defaultGetHistoricalSpending(familyId, months, targetMonth) {
  console.log("defaultGetHistoricalSpending called:", {
    familyId,
    months,
    targetMonth,
  });
  return [];
}

async function defaultGetCategories(familyId) {
  console.log("defaultGetCategories called for:", familyId);
  // Return default budget categories
  return [
    { categoryId: "housing", categoryName: "Housing" },
    { categoryId: "transportation", categoryName: "Transportation" },
    { categoryId: "food", categoryName: "Food" },
    { categoryId: "utilities", categoryName: "Utilities" },
    { categoryId: "insurance", categoryName: "Insurance" },
    { categoryId: "healthcare", categoryName: "Healthcare" },
    { categoryId: "savings", categoryName: "Savings" },
    { categoryId: "personal", categoryName: "Personal" },
    { categoryId: "entertainment", categoryName: "Entertainment" },
    { categoryId: "debt", categoryName: "Debt" },
  ];
}

async function defaultGetSuggestion(familyId, suggestionId) {
  console.log("defaultGetSuggestion called:", { familyId, suggestionId });
  return null;
}

async function defaultUpdateBudget(familyId, month, categoryId, updates) {
  console.log("defaultUpdateBudget called:", {
    familyId,
    month,
    categoryId,
    updates,
  });
}

async function defaultUpdateSuggestionStatus(
  familyId,
  suggestionId,
  status,
  userId,
) {
  console.log("defaultUpdateSuggestionStatus called:", {
    familyId,
    suggestionId,
    status,
    userId,
  });
}

async function defaultGetSuggestionsByFamily(familyId) {
  console.log("defaultGetSuggestionsByFamily called for:", familyId);
  return [];
}

/**
 * Delete all budget suggestions for a family (used during account deletion)
 *
 * @param {string} familyId - Family ID
 * @param {Object} dependencies - Injected dependencies
 * @returns {Promise<Object>} Deletion result
 */
async function deleteAllSuggestionsForFamily(familyId, dependencies = {}) {
  const {
    getSuggestionsByFamily = defaultGetSuggestionsByFamily,
    deleteSuggestion = defaultDeleteSuggestion,
  } = dependencies;

  if (!familyId) {
    throw new Error("familyId is required");
  }

  try {
    // Get all suggestions for the family
    const suggestions = await getSuggestionsByFamily(familyId);

    if (suggestions.length === 0) {
      return { deletedCount: 0, message: "No suggestions to delete" };
    }

    // Delete each suggestion
    let deletedCount = 0;
    for (const suggestion of suggestions) {
      try {
        await deleteSuggestion(familyId, suggestion.suggestionId);
        deletedCount++;
      } catch (error) {
        console.error(
          `Failed to delete suggestion ${suggestion.suggestionId}:`,
          error.message,
        );
      }
    }

    return {
      deletedCount,
      message: `Successfully deleted ${deletedCount} suggestions for family ${familyId}`,
    };
  } catch (error) {
    console.error("Error deleting suggestions for family:", error);
    throw new Error(`Failed to delete suggestions: ${error.message}`);
  }
}

async function defaultDeleteSuggestion(familyId, suggestionId) {
  console.log("defaultDeleteSuggestion called:", { familyId, suggestionId });
}

module.exports = {
  generateSuggestions,
  applySuggestions,
  getSuggestions,
  deleteAllSuggestionsForFamily,
  // Export helpers for testing
  calculateBillAmountForMonth,
  calculateBiWeeklyOccurrences,
  calculateHistoricalAverage,
  calculateSeasonalAdjustment,
  calculateConfidenceScore,
  generateExplanation,
  generateCategorySuggestions,
  // Export constants
  DEFAULT_HISTORY_MONTHS,
  MIN_CONFIDENCE_SCORE,
  HIGH_CONFIDENCE_THRESHOLD,
};
