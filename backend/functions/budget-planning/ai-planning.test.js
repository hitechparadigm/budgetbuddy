/**
 * AI Budget Planning Test Suite
 *
 * Tests for AI-powered budget planning based on historical spending analysis.
 * **Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5**
 */

// ============================================================================
// AI Budget Planning Helper Functions (Pure functions for testing)
// ============================================================================

/**
 * Analyze historical spending by category
 * @param {Array} transactions - Historical transactions
 * @param {number} months - Number of months to analyze
 * @returns {Object} Spending analysis by category
 */
function analyzeHistoricalSpending(transactions, months = 6) {
  const categorySpending = {};
  const now = new Date();
  const cutoffDate = new Date(now);
  cutoffDate.setMonth(cutoffDate.getMonth() - months);

  // Filter transactions within the analysis period
  const relevantTransactions = transactions.filter((t) => {
    const txDate = new Date(t.date);
    return txDate >= cutoffDate && t.amount < 0; // Only expenses
  });

  // Group by category
  relevantTransactions.forEach((t) => {
    const category = t.categoryId || "uncategorized";
    if (!categorySpending[category]) {
      categorySpending[category] = {
        categoryId: category,
        categoryName: t.categoryName || "Uncategorized",
        amounts: [],
        dates: [],
      };
    }
    categorySpending[category].amounts.push(Math.abs(t.amount));
    categorySpending[category].dates.push(t.date);
  });

  // Calculate statistics for each category
  Object.keys(categorySpending).forEach((category) => {
    const data = categorySpending[category];
    const amounts = data.amounts;

    // Calculate mean
    const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;

    // Calculate standard deviation
    const squaredDiffs = amounts.map((a) => Math.pow(a - mean, 2));
    const variance =
      squaredDiffs.reduce((sum, d) => sum + d, 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    // Calculate min/max
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);

    data.statistics = {
      mean: Math.round(mean * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      count: amounts.length,
    };
  });

  return categorySpending;
}

/**
 * Detect seasonal variations in spending
 * @param {Array} transactions - Historical transactions
 * @param {string} categoryId - Category to analyze
 * @returns {Object} Seasonal variation data
 */
function detectSeasonalVariation(transactions, categoryId) {
  const monthlySpending = {};

  // Group spending by month
  transactions
    .filter((t) => t.categoryId === categoryId && t.amount < 0)
    .forEach((t) => {
      const month = new Date(t.date).getMonth(); // 0-11
      if (!monthlySpending[month]) {
        monthlySpending[month] = [];
      }
      monthlySpending[month].push(Math.abs(t.amount));
    });

  // Calculate average for each month
  const monthlyAverages = {};
  Object.keys(monthlySpending).forEach((month) => {
    const amounts = monthlySpending[month];
    monthlyAverages[month] =
      amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
  });

  // Calculate overall average
  const allAmounts = Object.values(monthlySpending).flat();
  const overallAverage =
    allAmounts.length > 0
      ? allAmounts.reduce((sum, a) => sum + a, 0) / allAmounts.length
      : 0;

  // Identify high and low seasons
  const seasonalFactors = {};
  Object.keys(monthlyAverages).forEach((month) => {
    seasonalFactors[month] =
      overallAverage > 0 ? monthlyAverages[month] / overallAverage : 1;
  });

  return {
    monthlyAverages,
    overallAverage: Math.round(overallAverage * 100) / 100,
    seasonalFactors,
    hasSeasonalVariation: Object.values(seasonalFactors).some(
      (f) => f > 1.2 || f < 0.8,
    ),
  };
}

/**
 * Calculate confidence interval for budget suggestion
 * @param {number} mean - Average spending
 * @param {number} stdDev - Standard deviation
 * @param {number} count - Number of data points
 * @param {number} confidenceLevel - Confidence level (0.90, 0.95, 0.99)
 * @returns {Object} Confidence interval
 */
function calculateConfidenceInterval(
  mean,
  stdDev,
  count,
  confidenceLevel = 0.95,
) {
  // Z-scores for common confidence levels
  const zScores = {
    0.9: 1.645,
    0.95: 1.96,
    0.99: 2.576,
  };

  const z = zScores[confidenceLevel] || 1.96;
  const marginOfError = z * (stdDev / Math.sqrt(count));

  return {
    lower: Math.round((mean - marginOfError) * 100) / 100,
    upper: Math.round((mean + marginOfError) * 100) / 100,
    marginOfError: Math.round(marginOfError * 100) / 100,
    confidenceLevel,
  };
}

/**
 * Get city-based default budget for a category
 * @param {string} cityId - City identifier
 * @param {string} categoryId - Category identifier
 * @returns {Object} Default budget data
 */
function getCityBasedDefault(cityId, categoryId) {
  // Simulated city expense data (in real implementation, this would come from static data)
  const cityDefaults = {
    "new-york": {
      housing: 2500,
      food: 800,
      transportation: 150,
      utilities: 200,
      entertainment: 300,
    },
    "san-francisco": {
      housing: 3000,
      food: 900,
      transportation: 100,
      utilities: 180,
      entertainment: 350,
    },
    austin: {
      housing: 1800,
      food: 600,
      transportation: 200,
      utilities: 250,
      entertainment: 250,
    },
    default: {
      housing: 1500,
      food: 500,
      transportation: 150,
      utilities: 150,
      entertainment: 200,
    },
  };

  const cityData = cityDefaults[cityId] || cityDefaults.default;
  return {
    amount: cityData[categoryId] || 100,
    source: cityDefaults[cityId] ? "city-data" : "default",
    cityId: cityId || "default",
  };
}

/**
 * Generate budget suggestion for a category
 * @param {Object} historicalData - Historical spending analysis
 * @param {Object} seasonalData - Seasonal variation data
 * @param {number} targetMonth - Target month (0-11)
 * @param {Object} cityDefault - City-based default
 * @returns {Object} Budget suggestion
 */
function generateBudgetSuggestion(
  historicalData,
  seasonalData,
  targetMonth,
  cityDefault,
) {
  // If no historical data, use city default
  if (!historicalData || !historicalData.statistics) {
    return {
      suggestedAmount: cityDefault.amount,
      source: "city-default",
      confidence: "low",
      reasoning: "No historical data available, using city-based defaults",
    };
  }

  const { mean, stdDev, count } = historicalData.statistics;

  // Apply seasonal adjustment if available
  let adjustedMean = mean;
  if (seasonalData && seasonalData.seasonalFactors[targetMonth]) {
    adjustedMean = mean * seasonalData.seasonalFactors[targetMonth];
  }

  // Calculate confidence interval
  const confidenceInterval = calculateConfidenceInterval(mean, stdDev, count);

  // Determine confidence level based on data quality
  let confidence = "medium";
  if (count >= 6 && stdDev / mean < 0.2) {
    confidence = "high";
  } else if (count < 3 || stdDev / mean > 0.5) {
    confidence = "low";
  }

  return {
    suggestedAmount: Math.round(adjustedMean * 100) / 100,
    source: "historical-analysis",
    confidence,
    confidenceInterval,
    seasonalAdjustment: seasonalData?.seasonalFactors[targetMonth] || 1,
    dataPoints: count,
    reasoning: `Based on ${count} historical transactions with ${confidence} confidence`,
  };
}

/**
 * Learn and adjust suggestions based on user feedback
 * @param {Object} suggestion - Original suggestion
 * @param {number} actualAmount - User's chosen amount
 * @param {number} learningRate - How much to adjust (0-1)
 * @returns {Object} Adjusted suggestion parameters
 */
function learnFromFeedback(suggestion, actualAmount, learningRate = 0.3) {
  const diff = actualAmount - suggestion.suggestedAmount;
  const adjustment = diff * learningRate;

  return {
    originalSuggestion: suggestion.suggestedAmount,
    userChoice: actualAmount,
    adjustment: Math.round(adjustment * 100) / 100,
    newBaseline:
      Math.round((suggestion.suggestedAmount + adjustment) * 100) / 100,
    feedbackApplied: true,
  };
}

// ============================================================================
// Test Data Generators
// ============================================================================

function generateTestTransactions(months = 6) {
  const transactions = [];
  const categories = [
    { id: "food", name: "Food & Dining" },
    { id: "utilities", name: "Utilities" },
    { id: "entertainment", name: "Entertainment" },
    { id: "transportation", name: "Transportation" },
  ];

  const now = new Date();

  for (let m = 0; m < months; m++) {
    const monthDate = new Date(now);
    monthDate.setMonth(monthDate.getMonth() - m);

    categories.forEach((cat) => {
      // Generate 3-5 transactions per category per month
      const txCount = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < txCount; i++) {
        const day = 1 + Math.floor(Math.random() * 28);
        const txDate = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth(),
          day,
        );

        // Base amount with some variation
        let baseAmount;
        switch (cat.id) {
          case "food":
            baseAmount = 150 + Math.random() * 100;
            break;
          case "utilities":
            baseAmount = 80 + Math.random() * 40;
            break;
          case "entertainment":
            baseAmount = 50 + Math.random() * 50;
            break;
          case "transportation":
            baseAmount = 100 + Math.random() * 50;
            break;
          default:
            baseAmount = 50 + Math.random() * 50;
        }

        transactions.push({
          id: `tx_${m}_${cat.id}_${i}`,
          categoryId: cat.id,
          categoryName: cat.name,
          amount: -Math.round(baseAmount * 100) / 100,
          date: txDate.toISOString().split("T")[0],
          type: "expense",
        });
      }
    });
  }

  return transactions;
}

// ============================================================================
// Requirement 13.1: Historical Spending Analysis
// ============================================================================

describe("Requirement 13.1: Historical Spending Analysis", () => {
  it("should analyze spending by category", () => {
    const transactions = generateTestTransactions(6);
    const analysis = analyzeHistoricalSpending(transactions, 6);

    expect(Object.keys(analysis).length).toBeGreaterThan(0);
    expect(analysis.food).toBeDefined();
    expect(analysis.food.statistics).toBeDefined();
    expect(analysis.food.statistics.mean).toBeGreaterThan(0);
  });

  it("should calculate mean spending correctly", () => {
    const transactions = [
      {
        categoryId: "food",
        categoryName: "Food",
        amount: -100,
        date: "2026-01-15",
      },
      {
        categoryId: "food",
        categoryName: "Food",
        amount: -150,
        date: "2026-01-20",
      },
      {
        categoryId: "food",
        categoryName: "Food",
        amount: -200,
        date: "2026-01-25",
      },
    ];

    const analysis = analyzeHistoricalSpending(transactions, 12);

    expect(analysis.food.statistics.mean).toBe(150);
  });

  it("should calculate standard deviation correctly", () => {
    const transactions = [
      {
        categoryId: "test",
        categoryName: "Test",
        amount: -100,
        date: "2026-01-15",
      },
      {
        categoryId: "test",
        categoryName: "Test",
        amount: -100,
        date: "2026-01-20",
      },
      {
        categoryId: "test",
        categoryName: "Test",
        amount: -100,
        date: "2026-01-25",
      },
    ];

    const analysis = analyzeHistoricalSpending(transactions, 12);

    // All same values = 0 std dev
    expect(analysis.test.statistics.stdDev).toBe(0);
  });

  it("should filter out income transactions", () => {
    const transactions = [
      {
        categoryId: "food",
        categoryName: "Food",
        amount: -100,
        date: "2026-01-15",
      },
      {
        categoryId: "income",
        categoryName: "Income",
        amount: 2000,
        date: "2026-01-01",
      },
    ];

    const analysis = analyzeHistoricalSpending(transactions, 12);

    expect(analysis.food).toBeDefined();
    expect(analysis.income).toBeUndefined();
  });

  it("should respect the analysis period", () => {
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 12);

    const transactions = [
      {
        categoryId: "food",
        categoryName: "Food",
        amount: -100,
        date: "2026-01-15",
      },
      {
        categoryId: "food",
        categoryName: "Food",
        amount: -500,
        date: oldDate.toISOString().split("T")[0],
      },
    ];

    const analysis = analyzeHistoricalSpending(transactions, 6);

    // Old transaction should be excluded
    expect(analysis.food.statistics.count).toBe(1);
    expect(analysis.food.statistics.mean).toBe(100);
  });

  it("should handle empty transaction list", () => {
    const analysis = analyzeHistoricalSpending([], 6);

    expect(Object.keys(analysis).length).toBe(0);
  });
});

// ============================================================================
// Requirement 13.2: Seasonal Variation Accounting
// ============================================================================

describe("Requirement 13.2: Seasonal Variation Accounting", () => {
  it("should detect seasonal patterns in spending", () => {
    // Create transactions with higher spending in December
    const transactions = [];
    for (let month = 0; month < 12; month++) {
      const baseAmount = month === 11 ? 500 : 200; // December is higher
      transactions.push({
        categoryId: "gifts",
        categoryName: "Gifts",
        amount: -baseAmount,
        date: `2025-${String(month + 1).padStart(2, "0")}-15`,
      });
    }

    const seasonal = detectSeasonalVariation(transactions, "gifts");

    expect(seasonal.hasSeasonalVariation).toBe(true);
    expect(seasonal.seasonalFactors[11]).toBeGreaterThan(1.2); // December factor > 1.2
  });

  it("should calculate monthly averages correctly", () => {
    const transactions = [
      {
        categoryId: "food",
        categoryName: "Food",
        amount: -100,
        date: "2025-01-15",
      },
      {
        categoryId: "food",
        categoryName: "Food",
        amount: -200,
        date: "2025-01-20",
      },
      {
        categoryId: "food",
        categoryName: "Food",
        amount: -150,
        date: "2025-02-15",
      },
    ];

    const seasonal = detectSeasonalVariation(transactions, "food");

    expect(seasonal.monthlyAverages[0]).toBe(150); // January average
    expect(seasonal.monthlyAverages[1]).toBe(150); // February average
  });

  it("should identify no seasonal variation for consistent spending", () => {
    const transactions = [];
    for (let month = 0; month < 12; month++) {
      transactions.push({
        categoryId: "utilities",
        categoryName: "Utilities",
        amount: -100,
        date: `2025-${String(month + 1).padStart(2, "0")}-15`,
      });
    }

    const seasonal = detectSeasonalVariation(transactions, "utilities");

    expect(seasonal.hasSeasonalVariation).toBe(false);
    // All factors should be close to 1
    Object.values(seasonal.seasonalFactors).forEach((factor) => {
      expect(factor).toBeCloseTo(1, 1);
    });
  });

  it("should handle missing months gracefully", () => {
    const transactions = [
      {
        categoryId: "food",
        categoryName: "Food",
        amount: -100,
        date: "2025-01-15",
      },
      {
        categoryId: "food",
        categoryName: "Food",
        amount: -100,
        date: "2025-06-15",
      },
    ];

    const seasonal = detectSeasonalVariation(transactions, "food");

    expect(seasonal.monthlyAverages[0]).toBeDefined(); // January
    expect(seasonal.monthlyAverages[5]).toBeDefined(); // June
    expect(seasonal.monthlyAverages[2]).toBeUndefined(); // March (no data)
  });
});

// ============================================================================
// Requirement 13.3: Confidence Interval Display
// ============================================================================

describe("Requirement 13.3: Confidence Interval Display", () => {
  it("should calculate 95% confidence interval correctly", () => {
    const ci = calculateConfidenceInterval(100, 20, 30, 0.95);

    expect(ci.lower).toBeLessThan(100);
    expect(ci.upper).toBeGreaterThan(100);
    expect(ci.confidenceLevel).toBe(0.95);
  });

  it("should narrow interval with more data points", () => {
    const ci10 = calculateConfidenceInterval(100, 20, 10, 0.95);
    const ci100 = calculateConfidenceInterval(100, 20, 100, 0.95);

    expect(ci100.marginOfError).toBeLessThan(ci10.marginOfError);
  });

  it("should widen interval with higher confidence level", () => {
    const ci90 = calculateConfidenceInterval(100, 20, 30, 0.9);
    const ci99 = calculateConfidenceInterval(100, 20, 30, 0.99);

    expect(ci99.marginOfError).toBeGreaterThan(ci90.marginOfError);
  });

  it("should have zero margin of error with zero std dev", () => {
    const ci = calculateConfidenceInterval(100, 0, 30, 0.95);

    expect(ci.marginOfError).toBe(0);
    expect(ci.lower).toBe(100);
    expect(ci.upper).toBe(100);
  });

  it("should include confidence interval in budget suggestion", () => {
    const historicalData = {
      statistics: { mean: 200, stdDev: 30, count: 10 },
    };

    const suggestion = generateBudgetSuggestion(historicalData, null, 0, {
      amount: 150,
    });

    expect(suggestion.confidenceInterval).toBeDefined();
    expect(suggestion.confidenceInterval.lower).toBeLessThan(200);
    expect(suggestion.confidenceInterval.upper).toBeGreaterThan(200);
  });
});

// ============================================================================
// Requirement 13.4: City-Based Defaults Fallback
// ============================================================================

describe("Requirement 13.4: City-Based Defaults Fallback", () => {
  it("should return city-specific defaults", () => {
    const nyDefault = getCityBasedDefault("new-york", "housing");
    const sfDefault = getCityBasedDefault("san-francisco", "housing");

    expect(nyDefault.amount).toBe(2500);
    expect(sfDefault.amount).toBe(3000);
    expect(nyDefault.source).toBe("city-data");
  });

  it("should fall back to default when city not found", () => {
    const unknownCity = getCityBasedDefault("unknown-city", "housing");

    expect(unknownCity.source).toBe("default");
    expect(unknownCity.amount).toBe(1500);
  });

  it("should return default for unknown category", () => {
    const unknown = getCityBasedDefault("new-york", "unknown-category");

    expect(unknown.amount).toBe(100); // Default fallback
  });

  it("should use city default when no historical data", () => {
    const cityDefault = getCityBasedDefault("austin", "food");

    const suggestion = generateBudgetSuggestion(
      null, // No historical data
      null,
      0,
      cityDefault,
    );

    expect(suggestion.suggestedAmount).toBe(600); // Austin food default
    expect(suggestion.source).toBe("city-default");
    expect(suggestion.confidence).toBe("low");
  });

  it("should prefer historical data over city defaults", () => {
    const historicalData = {
      statistics: { mean: 800, stdDev: 50, count: 12 },
    };
    const cityDefault = getCityBasedDefault("austin", "food");

    const suggestion = generateBudgetSuggestion(
      historicalData,
      null,
      0,
      cityDefault,
    );

    expect(suggestion.suggestedAmount).toBe(800); // Historical, not city default
    expect(suggestion.source).toBe("historical-analysis");
  });
});

// ============================================================================
// Requirement 13.5: Learning and Adjustment
// ============================================================================

describe("Requirement 13.5: Learning and Adjustment", () => {
  it("should learn from user feedback", () => {
    const suggestion = { suggestedAmount: 200 };
    const actualAmount = 250;

    const learning = learnFromFeedback(suggestion, actualAmount, 0.3);

    expect(learning.feedbackApplied).toBe(true);
    expect(learning.adjustment).toBe(15); // (250-200) * 0.3
    expect(learning.newBaseline).toBe(215); // 200 + 15
  });

  it("should adjust downward when user chooses less", () => {
    const suggestion = { suggestedAmount: 300 };
    const actualAmount = 200;

    const learning = learnFromFeedback(suggestion, actualAmount, 0.3);

    expect(learning.adjustment).toBe(-30); // (200-300) * 0.3
    expect(learning.newBaseline).toBe(270); // 300 - 30
  });

  it("should respect learning rate", () => {
    const suggestion = { suggestedAmount: 100 };
    const actualAmount = 200;

    const slowLearning = learnFromFeedback(suggestion, actualAmount, 0.1);
    const fastLearning = learnFromFeedback(suggestion, actualAmount, 0.5);

    expect(slowLearning.adjustment).toBe(10); // 100 * 0.1
    expect(fastLearning.adjustment).toBe(50); // 100 * 0.5
  });

  it("should not adjust when user accepts suggestion", () => {
    const suggestion = { suggestedAmount: 200 };
    const actualAmount = 200;

    const learning = learnFromFeedback(suggestion, actualAmount, 0.3);

    expect(learning.adjustment).toBe(0);
    expect(learning.newBaseline).toBe(200);
  });

  it("should track original suggestion and user choice", () => {
    const suggestion = { suggestedAmount: 150 };
    const actualAmount = 180;

    const learning = learnFromFeedback(suggestion, actualAmount, 0.3);

    expect(learning.originalSuggestion).toBe(150);
    expect(learning.userChoice).toBe(180);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("AI Budget Planning Integration", () => {
  it("should generate complete budget suggestion with all components", () => {
    const transactions = generateTestTransactions(6);
    const analysis = analyzeHistoricalSpending(transactions, 6);
    const seasonal = detectSeasonalVariation(transactions, "food");
    const cityDefault = getCityBasedDefault("austin", "food");

    const suggestion = generateBudgetSuggestion(
      analysis.food,
      seasonal,
      0, // January
      cityDefault,
    );

    expect(suggestion.suggestedAmount).toBeGreaterThan(0);
    expect(suggestion.source).toBe("historical-analysis");
    expect(suggestion.confidence).toBeDefined();
    expect(suggestion.confidenceInterval).toBeDefined();
    expect(suggestion.dataPoints).toBeGreaterThan(0);
  });

  it("should handle full workflow from transactions to suggestion", () => {
    // Step 1: Generate test data
    const transactions = generateTestTransactions(6);

    // Step 2: Analyze historical spending
    const analysis = analyzeHistoricalSpending(transactions, 6);
    expect(Object.keys(analysis).length).toBeGreaterThan(0);

    // Step 3: Detect seasonal variation
    const seasonal = detectSeasonalVariation(transactions, "food");
    expect(seasonal.overallAverage).toBeGreaterThan(0);

    // Step 4: Get city default as fallback
    const cityDefault = getCityBasedDefault("new-york", "food");
    expect(cityDefault.amount).toBeGreaterThan(0);

    // Step 5: Generate suggestion
    const suggestion = generateBudgetSuggestion(
      analysis.food,
      seasonal,
      new Date().getMonth(),
      cityDefault,
    );
    expect(suggestion.suggestedAmount).toBeGreaterThan(0);

    // Step 6: Learn from feedback
    const userChoice = suggestion.suggestedAmount * 1.1; // User chooses 10% more
    const learning = learnFromFeedback(suggestion, userChoice, 0.3);
    expect(learning.feedbackApplied).toBe(true);
  });

  it("should provide different confidence levels based on data quality", () => {
    // High confidence: many data points, low variance
    const highQualityData = {
      statistics: { mean: 200, stdDev: 20, count: 12 },
    };
    const highConfSuggestion = generateBudgetSuggestion(
      highQualityData,
      null,
      0,
      { amount: 150 },
    );
    expect(highConfSuggestion.confidence).toBe("high");

    // Low confidence: few data points, high variance
    const lowQualityData = {
      statistics: { mean: 200, stdDev: 150, count: 2 },
    };
    const lowConfSuggestion = generateBudgetSuggestion(
      lowQualityData,
      null,
      0,
      { amount: 150 },
    );
    expect(lowConfSuggestion.confidence).toBe("low");
  });

  it("should apply seasonal adjustment to suggestions", () => {
    const historicalData = {
      statistics: { mean: 200, stdDev: 30, count: 10 },
    };

    // December has 1.5x seasonal factor
    const seasonalData = {
      seasonalFactors: { 11: 1.5 },
    };

    const suggestion = generateBudgetSuggestion(
      historicalData,
      seasonalData,
      11, // December
      { amount: 150 },
    );

    expect(suggestion.suggestedAmount).toBe(300); // 200 * 1.5
    expect(suggestion.seasonalAdjustment).toBe(1.5);
  });
});
