/**
 * Pattern Detection Algorithm
 *
 * Core algorithm for detecting recurring payment patterns from transaction history.
 * Analyzes frequency, amount variance, and calculates confidence scores.
 */

const { fuzzyMatch } = require("./fuzzy-matching-utils");

/**
 * Frequency types with their expected intervals and tolerances
 */
const FREQUENCY_PATTERNS = {
  weekly: { interval: 7, tolerance: 2, name: "weekly" },
  "bi-weekly": { interval: 14, tolerance: 3, name: "bi-weekly" },
  monthly: { interval: 30, tolerance: 3, name: "monthly" },
  quarterly: { interval: 91, tolerance: 7, name: "quarterly" },
  annual: { interval: 365, tolerance: 14, name: "annual" },
};

/**
 * Minimum occurrences required to establish a pattern
 */
const MIN_OCCURRENCES = 3;

/**
 * Amount variance threshold (30% of mean)
 */
const AMOUNT_VARIANCE_THRESHOLD = 0.3;

/**
 * Confidence score thresholds
 */
const HIGH_CONFIDENCE_THRESHOLD = 70;
const MIN_CONFIDENCE_THRESHOLD = 50;

/**
 * Group transactions by merchant name using fuzzy matching
 * @param {Array} transactions - Array of transaction objects
 * @param {number} threshold - Similarity threshold for fuzzy matching (default: 80)
 * @returns {Object} Grouped transactions by merchant
 */
function groupTransactionsByMerchant(transactions, threshold = 80) {
  const groups = {};

  for (const transaction of transactions) {
    const merchantName = transaction.merchantName || transaction.description;
    if (!merchantName) {
      continue;
    }

    // Find existing group that matches this merchant
    let matchedGroup = null;
    for (const groupKey of Object.keys(groups)) {
      if (fuzzyMatch(merchantName, groupKey, threshold)) {
        matchedGroup = groupKey;
        break;
      }
    }

    if (matchedGroup) {
      groups[matchedGroup].push(transaction);
    } else {
      groups[merchantName] = [transaction];
    }
  }

  return groups;
}

/**
 * Calculate intervals between transactions (in days)
 * @param {Array} transactions - Array of transactions sorted by date
 * @returns {Array} Array of intervals in days
 */
function calculateIntervals(transactions) {
  if (transactions.length < 2) {
    return [];
  }

  const intervals = [];
  for (let i = 1; i < transactions.length; i++) {
    const date1 = new Date(transactions[i - 1].date);
    const date2 = new Date(transactions[i].date);
    const diffMs = date2 - date1;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    intervals.push(diffDays);
  }

  return intervals;
}

/**
 * Detect frequency pattern from intervals
 * @param {Array} intervals - Array of intervals in days
 * @returns {Object|null} Detected frequency pattern or null
 */
function detectFrequency(intervals) {
  if (intervals.length === 0) {
    return null;
  }

  const avgInterval =
    intervals.reduce((sum, val) => sum + val, 0) / intervals.length;

  // Try to match against known frequency patterns
  for (const [key, pattern] of Object.entries(FREQUENCY_PATTERNS)) {
    const lowerBound = pattern.interval - pattern.tolerance;
    const upperBound = pattern.interval + pattern.tolerance;

    if (avgInterval >= lowerBound && avgInterval <= upperBound) {
      // Calculate average deviation from expected interval
      const deviations = intervals.map((interval) =>
        Math.abs(interval - pattern.interval),
      );
      const avgDeviation =
        deviations.reduce((sum, val) => sum + val, 0) / deviations.length;

      return {
        frequency: pattern.name,
        expectedInterval: pattern.interval,
        actualInterval: Math.round(avgInterval),
        avgDeviation: Math.round(avgDeviation * 10) / 10,
      };
    }
  }

  return null;
}

/**
 * Calculate amount statistics
 * @param {Array} transactions - Array of transactions
 * @returns {Object} Amount statistics
 */
function calculateAmountStats(transactions) {
  const amounts = transactions.map((t) => Math.abs(t.amount));

  // Calculate mean
  const mean = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;

  // Calculate standard deviation
  const squaredDiffs = amounts.map((val) => Math.pow(val - mean, 2));
  const variance =
    squaredDiffs.reduce((sum, val) => sum + val, 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  // Calculate median
  const sortedAmounts = [...amounts].sort((a, b) => a - b);
  const mid = Math.floor(sortedAmounts.length / 2);
  const median =
    sortedAmounts.length % 2 === 0
      ? (sortedAmounts[mid - 1] + sortedAmounts[mid]) / 2
      : sortedAmounts[mid];

  // Check if variable amount
  const isVariable = stdDev / mean > AMOUNT_VARIANCE_THRESHOLD;

  return {
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    isVariable,
    suggestedAmount: isVariable ? median : mean,
  };
}

/**
 * Calculate confidence score for a pattern
 * @param {Object} frequencyData - Frequency detection data
 * @param {Object} amountStats - Amount statistics
 * @param {number} occurrenceCount - Number of occurrences
 * @param {string} merchantName - Merchant name
 * @returns {number} Confidence score (0-100)
 */
function calculateConfidenceScore(
  frequencyData,
  amountStats,
  occurrenceCount,
  merchantName,
) {
  // Timing consistency (40% weight)
  const timingConsistency =
    1 -
    Math.min(frequencyData.avgDeviation / frequencyData.expectedInterval, 1);

  // Amount consistency (30% weight)
  const amountConsistency =
    1 - Math.min(amountStats.stdDev / amountStats.mean, 1);

  // Occurrence count (20% weight) - normalize to 6 occurrences
  const occurrenceScore = Math.min(occurrenceCount / 6, 1);

  // Merchant clarity (10% weight) - simple heuristic for now
  const hasKnownMerchant = merchantName && merchantName.length > 3;
  const merchantClarity = hasKnownMerchant ? 1 : 0.7;

  const confidenceScore =
    timingConsistency * 0.4 +
    amountConsistency * 0.3 +
    occurrenceScore * 0.2 +
    merchantClarity * 0.1;

  return Math.round(confidenceScore * 100);
}

/**
 * Calculate next expected date based on frequency
 * @param {Date} lastDate - Last occurrence date
 * @param {string} frequency - Frequency type
 * @returns {string} Next expected date (ISO 8601)
 */
function calculateNextExpectedDate(lastDate, frequency) {
  const date = new Date(lastDate);
  const pattern = FREQUENCY_PATTERNS[frequency];

  if (!pattern) {
    return null;
  }

  date.setDate(date.getDate() + pattern.interval);
  return date.toISOString().split("T")[0];
}

/**
 * Detect patterns from grouped transactions
 * @param {Object} groupedTransactions - Transactions grouped by merchant
 * @param {Object} options - Detection options
 * @returns {Array} Detected patterns
 */
function detectPatterns(groupedTransactions, options = {}) {
  const {
    minOccurrences = MIN_OCCURRENCES,
    minConfidence = MIN_CONFIDENCE_THRESHOLD,
  } = options;

  const patterns = [];

  for (const [merchantName, transactions] of Object.entries(
    groupedTransactions,
  )) {
    // Filter out groups with insufficient occurrences
    if (transactions.length < minOccurrences) {
      continue;
    }

    // Sort transactions by date
    const sortedTransactions = [...transactions].sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );

    // Calculate intervals
    const intervals = calculateIntervals(sortedTransactions);

    // Detect frequency
    const frequencyData = detectFrequency(intervals);
    if (!frequencyData) {
      continue; // No recognizable frequency pattern
    }

    // Calculate amount statistics
    const amountStats = calculateAmountStats(sortedTransactions);

    // Calculate confidence score
    const confidenceScore = calculateConfidenceScore(
      frequencyData,
      amountStats,
      sortedTransactions.length,
      merchantName,
    );

    // Filter out low-confidence patterns
    if (confidenceScore < minConfidence) {
      continue;
    }

    // Calculate next expected date
    const lastTransaction = sortedTransactions[sortedTransactions.length - 1];
    const nextExpectedDate = calculateNextExpectedDate(
      lastTransaction.date,
      frequencyData.frequency,
    );

    // Build pattern object
    const pattern = {
      merchantName,
      frequency: frequencyData.frequency,
      averageAmount: amountStats.suggestedAmount,
      amountStdDev: amountStats.stdDev,
      isVariableAmount: amountStats.isVariable,
      confidenceScore,
      occurrences: sortedTransactions.map((t) => ({
        date: t.date,
        amount: Math.abs(t.amount),
        transactionId: t.transactionId || t.id,
      })),
      nextExpectedDate,
      timingConsistency: Math.round(
        (1 - frequencyData.avgDeviation / frequencyData.expectedInterval) * 100,
      ),
      amountConsistency: Math.round(
        (1 - amountStats.stdDev / amountStats.mean) * 100,
      ),
    };

    patterns.push(pattern);
  }

  // Sort by confidence score (highest first)
  patterns.sort((a, b) => b.confidenceScore - a.confidenceScore);

  return patterns;
}

/**
 * Analyze transactions and detect recurring patterns
 * @param {Array} transactions - Array of transaction objects
 * @param {Object} options - Analysis options
 * @returns {Object} Analysis results with detected patterns
 */
function analyzeTransactions(transactions, options = {}) {
  const {
    minOccurrences = MIN_OCCURRENCES,
    minConfidence = MIN_CONFIDENCE_THRESHOLD,
    fuzzyThreshold = 80,
  } = options;

  // Filter out income and transfers (only analyze expenses)
  const expenses = transactions.filter(
    (t) => t.amount < 0 && t.type !== "transfer" && t.type !== "income",
  );

  // Group transactions by merchant
  const groupedTransactions = groupTransactionsByMerchant(
    expenses,
    fuzzyThreshold,
  );

  // Detect patterns
  const patterns = detectPatterns(groupedTransactions, {
    minOccurrences,
    minConfidence,
  });

  return {
    patterns,
    transactionsAnalyzed: expenses.length,
    merchantGroups: Object.keys(groupedTransactions).length,
    patternsDetected: patterns.length,
    highConfidencePatterns: patterns.filter(
      (p) => p.confidenceScore >= HIGH_CONFIDENCE_THRESHOLD,
    ).length,
  };
}

module.exports = {
  groupTransactionsByMerchant,
  calculateIntervals,
  detectFrequency,
  calculateAmountStats,
  calculateConfidenceScore,
  calculateNextExpectedDate,
  detectPatterns,
  analyzeTransactions,
  // Export constants for testing
  FREQUENCY_PATTERNS,
  MIN_OCCURRENCES,
  AMOUNT_VARIANCE_THRESHOLD,
  HIGH_CONFIDENCE_THRESHOLD,
  MIN_CONFIDENCE_THRESHOLD,
};
