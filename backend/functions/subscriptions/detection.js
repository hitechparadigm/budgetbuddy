/**
 * Subscription Detection Functions
 *
 * Extracted for testing - these functions are used by the main Lambda handler
 * and can be tested independently.
 */

/**
 * Detect recurring pattern in transactions
 * @param {Array} transactions - Array of transactions sorted by date
 * @returns {Object|null} - Pattern object or null if no pattern detected
 */
function detectRecurringPattern(transactions) {
  if (!transactions || transactions.length < 2) return null;

  // Sort by date
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.transactionDate) - new Date(b.transactionDate),
  );

  // Calculate intervals between transactions
  const intervals = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].transactionDate);
    const curr = new Date(sorted[i].transactionDate);
    const daysDiff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    intervals.push(daysDiff);
  }

  // Calculate average interval
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  // Check if intervals are consistent (within 20% variance)
  const variance =
    intervals.reduce((sum, interval) => {
      return sum + Math.abs(interval - avgInterval);
    }, 0) / intervals.length;

  const variancePercent = (variance / avgInterval) * 100;
  if (variancePercent > 20) return null;

  // Determine frequency
  let frequency;
  let confidence;

  if (avgInterval >= 25 && avgInterval <= 35) {
    frequency = "monthly";
    confidence = 0.9 - variancePercent / 100;
  } else if (avgInterval >= 5 && avgInterval <= 9) {
    frequency = "weekly";
    confidence = 0.85 - variancePercent / 100;
  } else if (avgInterval >= 85 && avgInterval <= 95) {
    frequency = "quarterly";
    confidence = 0.85 - variancePercent / 100;
  } else if (avgInterval >= 355 && avgInterval <= 375) {
    frequency = "yearly";
    confidence = 0.8 - variancePercent / 100;
  } else {
    return null;
  }

  // Check amount consistency (within 10% variance)
  const amounts = sorted.map((tx) => Math.abs(tx.amount));
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const amountVariance =
    amounts.reduce((sum, amt) => {
      return sum + Math.abs(amt - avgAmount);
    }, 0) / amounts.length;

  const amountVariancePercent = (amountVariance / avgAmount) * 100;
  if (amountVariancePercent > 10) {
    confidence *= 0.7; // Reduce confidence if amounts vary
  }

  return {
    frequency,
    averageAmount: Math.round(avgAmount * 100) / 100,
    confidence: Math.max(0.5, Math.min(1, confidence)),
    intervalDays: Math.round(avgInterval),
  };
}

/**
 * Normalize amount to monthly equivalent
 * @param {number} amount - Amount to normalize
 * @param {string} frequency - Frequency (weekly, monthly, quarterly, yearly)
 * @returns {number} - Monthly equivalent amount
 */
function normalizeToMonthly(amount, frequency) {
  switch (frequency) {
    case "weekly":
      return amount * 4.33; // Average weeks per month
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "yearly":
      return amount / 12;
    default:
      return amount;
  }
}

/**
 * Guess category from merchant name
 * @param {string} merchant - Merchant name
 * @returns {string} - Guessed category
 */
function guessCategoryFromMerchant(merchant) {
  const merchantLower = merchant.toLowerCase();

  const categoryPatterns = {
    Streaming: [
      "netflix",
      "hulu",
      "disney",
      "hbo",
      "spotify",
      "apple music",
      "youtube",
      "amazon prime",
      "peacock",
      "paramount",
    ],
    Software: [
      "adobe",
      "microsoft",
      "google",
      "dropbox",
      "slack",
      "zoom",
      "notion",
      "figma",
      "github",
      "aws",
    ],
    Fitness: [
      "gym",
      "fitness",
      "peloton",
      "planet fitness",
      "la fitness",
      "equinox",
      "crossfit",
    ],
    "News & Media": [
      "nytimes",
      "wsj",
      "washington post",
      "medium",
      "substack",
      "patreon",
    ],
    Gaming: [
      "xbox",
      "playstation",
      "nintendo",
      "steam",
      "epic games",
      "twitch",
    ],
    "Food & Delivery": [
      "doordash",
      "uber eats",
      "grubhub",
      "instacart",
      "hello fresh",
      "blue apron",
    ],
    Utilities: [
      "electric",
      "gas",
      "water",
      "internet",
      "phone",
      "verizon",
      "at&t",
      "t-mobile",
      "comcast",
    ],
    Insurance: ["insurance", "geico", "progressive", "state farm", "allstate"],
    "Cloud Storage": ["icloud", "google drive", "onedrive", "backblaze"],
  };

  for (const [category, patterns] of Object.entries(categoryPatterns)) {
    if (patterns.some((pattern) => merchantLower.includes(pattern))) {
      return category;
    }
  }

  return "Other";
}

module.exports = {
  detectRecurringPattern,
  normalizeToMonthly,
  guessCategoryFromMerchant,
};
