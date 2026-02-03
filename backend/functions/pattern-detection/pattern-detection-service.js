/**
 * Pattern Detection Service
 *
 * Service layer that orchestrates pattern detection by combining:
 * - Local algorithm-based detection
 * - AI-enhanced detection via AWS Bedrock
 * - Pattern management (CRUD operations)
 *
 * Implements the handler → service → repository pattern.
 */

const { v4: uuidv4 } = require("uuid");
const {
  getTransactionHistory,
  savePattern,
  getPatternsByFamily,
  updatePatternStatus,
} = require("./pattern-detection-repository");
const {
  analyzeTransactions,
  HIGH_CONFIDENCE_THRESHOLD,
} = require("./pattern-detection-algorithm");
const {
  buildPatternDetectionPrompt,
  extractJsonFromResponse,
} = require("./ai-prompt-builder");
const { callBedrock } = require("./bedrock-client");

/**
 * Minimum months of transaction history required
 */
const MIN_ANALYSIS_MONTHS = 3;

/**
 * Maximum months of transaction history to analyze
 */
const MAX_ANALYSIS_MONTHS = 12;

/**
 * Default analysis months
 */
const DEFAULT_ANALYSIS_MONTHS = 6;

/**
 * Analyze transactions and detect recurring patterns
 * Combines local algorithm with optional AI enhancement
 *
 * @param {string} userId - User ID who triggered the analysis
 * @param {string} familyId - Family ID to analyze
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Analysis results with detected patterns
 */
async function analyzeTransactionsForPatterns(userId, familyId, options = {}) {
  const {
    analysisMonths = DEFAULT_ANALYSIS_MONTHS,
    minConfidence = 50,
    useAI = true,
    fuzzyThreshold = 80,
  } = options;

  // Validate inputs
  if (!userId) {
    throw new Error("userId is required");
  }
  if (!familyId) {
    throw new Error("familyId is required");
  }

  // Validate analysis months
  const months = Math.min(
    Math.max(analysisMonths, MIN_ANALYSIS_MONTHS),
    MAX_ANALYSIS_MONTHS,
  );

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];

  // Fetch transaction history
  const transactions = await getTransactionHistory(
    familyId,
    startDateStr,
    endDateStr,
  );

  // Check minimum transaction count
  if (transactions.length < 10) {
    return {
      patterns: [],
      transactionsAnalyzed: transactions.length,
      analysisDate: new Date().toISOString(),
      message:
        "Insufficient transaction history. At least 10 transactions required.",
    };
  }

  // Run local algorithm-based detection
  const algorithmResults = analyzeTransactions(transactions, {
    minOccurrences: 3,
    minConfidence,
    fuzzyThreshold,
  });

  let patterns = algorithmResults.patterns;

  // Optionally enhance with AI
  if (useAI && patterns.length > 0) {
    try {
      patterns = await enhancePatternsWithAI(
        transactions,
        patterns,
        analysisMonths,
      );
    } catch (error) {
      // Log AI error but continue with algorithm results
      console.warn(
        "AI enhancement failed, using algorithm results:",
        error.message,
      );
    }
  }

  // Generate suggested bill names for patterns without them
  patterns = patterns.map((pattern) => ({
    ...pattern,
    suggestedBillName:
      pattern.suggestedBillName || generateBillName(pattern.merchantName),
  }));

  // Save patterns to database
  const savedPatterns = await saveDetectedPatterns(
    patterns,
    userId,
    familyId,
    months,
  );

  return {
    patterns: savedPatterns,
    transactionsAnalyzed: algorithmResults.transactionsAnalyzed,
    merchantGroups: algorithmResults.merchantGroups,
    patternsDetected: savedPatterns.length,
    highConfidencePatterns: savedPatterns.filter(
      (p) => p.confidenceScore >= HIGH_CONFIDENCE_THRESHOLD,
    ).length,
    analysisDate: new Date().toISOString(),
  };
}

/**
 * Enhance patterns with AI analysis
 * @param {Array} transactions - Original transactions
 * @param {Array} algorithmPatterns - Patterns from algorithm
 * @param {number} analysisMonths - Number of months analyzed
 * @returns {Promise<Array>} Enhanced patterns
 */
async function enhancePatternsWithAI(
  transactions,
  algorithmPatterns,
  analysisMonths,
) {
  // Build prompt for AI
  const prompt = buildPatternDetectionPrompt(transactions, { analysisMonths });

  // Call Bedrock
  const response = await callBedrock(prompt, {
    temperature: 0.1,
    maxTokens: 4096,
  });

  // Extract JSON from response
  let aiPatterns;
  try {
    aiPatterns = extractJsonFromResponse(response.text);
  } catch (error) {
    console.warn("Failed to parse AI response:", error.message);
    return algorithmPatterns;
  }

  // Merge AI insights with algorithm patterns
  return mergePatterns(algorithmPatterns, aiPatterns);
}

/**
 * Merge algorithm patterns with AI patterns
 * AI provides better bill names and explanations
 * @param {Array} algorithmPatterns - Patterns from algorithm
 * @param {Array} aiPatterns - Patterns from AI
 * @returns {Array} Merged patterns
 */
function mergePatterns(algorithmPatterns, aiPatterns) {
  if (!Array.isArray(aiPatterns) || aiPatterns.length === 0) {
    return algorithmPatterns;
  }

  return algorithmPatterns.map((algPattern) => {
    // Find matching AI pattern by merchant name
    const aiMatch = aiPatterns.find((aiP) => {
      const algName = (algPattern.merchantName || "").toLowerCase();
      const aiName = (aiP.merchantName || "").toLowerCase();
      return (
        algName.includes(aiName) ||
        aiName.includes(algName) ||
        algName === aiName
      );
    });

    if (aiMatch) {
      return {
        ...algPattern,
        suggestedBillName:
          aiMatch.suggestedBillName || algPattern.suggestedBillName,
        explanation: aiMatch.explanation || algPattern.explanation,
        // Keep algorithm's confidence score as it's more reliable
      };
    }

    return algPattern;
  });
}

/**
 * Generate a bill name from merchant name
 * @param {string} merchantName - Merchant name
 * @returns {string} Suggested bill name
 */
function generateBillName(merchantName) {
  if (!merchantName) {
    return "Unknown Bill";
  }

  // Clean up merchant name
  let name = merchantName
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Capitalize first letter of each word
  name = name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  // Add "Subscription" or "Payment" suffix if not already descriptive
  const descriptiveWords = [
    "subscription",
    "payment",
    "bill",
    "service",
    "membership",
  ];
  const hasDescriptive = descriptiveWords.some((word) =>
    name.toLowerCase().includes(word),
  );

  if (!hasDescriptive && name.length < 20) {
    return `${name} Subscription`;
  }

  return name;
}

/**
 * Save detected patterns to database
 * @param {Array} patterns - Detected patterns
 * @param {string} userId - User ID
 * @param {string} familyId - Family ID
 * @param {number} analysisMonths - Months analyzed
 * @returns {Promise<Array>} Saved patterns
 */
async function saveDetectedPatterns(
  patterns,
  userId,
  familyId,
  analysisMonths,
) {
  const savedPatterns = [];

  for (const pattern of patterns) {
    const patternToSave = {
      patternId: uuidv4(),
      familyId,
      userId,
      merchantName: pattern.merchantName,
      suggestedBillName: pattern.suggestedBillName,
      averageAmount: pattern.averageAmount,
      amountStdDev: pattern.amountStdDev || 0,
      frequency: pattern.frequency,
      confidenceScore: pattern.confidenceScore,
      status: "pending",
      categoryId: pattern.categoryId || null,
      nextExpectedDate: pattern.nextExpectedDate,
      occurrences: pattern.occurrences || [],
      explanation: pattern.explanation || generateExplanation(pattern),
      analysisMonths,
    };

    try {
      const saved = await savePattern(patternToSave);
      savedPatterns.push(saved);
    } catch (error) {
      console.error("Failed to save pattern:", error.message);
    }
  }

  return savedPatterns;
}

/**
 * Generate explanation for a pattern
 * @param {Object} pattern - Pattern object
 * @returns {string} Explanation text
 */
function generateExplanation(pattern) {
  const {
    merchantName,
    frequency,
    averageAmount,
    confidenceScore,
    occurrences,
  } = pattern;

  const occurrenceCount = occurrences?.length || 0;
  const amountStr = `$${averageAmount.toFixed(2)}`;

  let explanation = `Detected ${frequency} payment of ${amountStr} to ${merchantName}. `;
  explanation += `Found ${occurrenceCount} occurrences. `;

  if (confidenceScore >= 90) {
    explanation += "Very consistent pattern with high confidence.";
  } else if (confidenceScore >= 70) {
    explanation += "Consistent pattern with good confidence.";
  } else {
    explanation += "Pattern detected but may have some variation.";
  }

  return explanation;
}

/**
 * Get patterns for a family with optional filtering
 * @param {string} userId - User ID (for authorization)
 * @param {string} familyId - Family ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Patterns
 */
async function getPatterns(userId, familyId, filters = {}) {
  if (!familyId) {
    throw new Error("familyId is required");
  }

  const { status = null } = filters;

  const patterns = await getPatternsByFamily(familyId, status);

  // Sort by confidence score (highest first)
  return patterns.sort((a, b) => b.confidenceScore - a.confidenceScore);
}

/**
 * Update a pattern (user edits)
 * @param {string} patternId - Pattern ID
 * @param {string} userId - User ID
 * @param {string} familyId - Family ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated pattern
 */
async function updatePattern(patternId, userId, familyId, updates) {
  if (!patternId || !familyId) {
    throw new Error("patternId and familyId are required");
  }

  // Get existing pattern to verify ownership
  const patterns = await getPatternsByFamily(familyId);
  const existingPattern = patterns.find((p) => p.patternId === patternId);

  if (!existingPattern) {
    throw new Error("Pattern not found");
  }

  // Apply updates
  const allowedFields = [
    "suggestedBillName",
    "averageAmount",
    "frequency",
    "categoryId",
    "nextExpectedDate",
  ];

  const filteredUpdates = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      filteredUpdates[field] = updates[field];
    }
  }

  // Mark as user-modified
  filteredUpdates.userModified = true;
  filteredUpdates.updatedAt = new Date().toISOString();
  filteredUpdates.updatedBy = userId;

  // Save updated pattern
  const updatedPattern = {
    ...existingPattern,
    ...filteredUpdates,
  };

  return savePattern(updatedPattern);
}

/**
 * Approve a pattern and optionally create a bill reminder
 * @param {string} patternId - Pattern ID
 * @param {string} userId - User ID
 * @param {string} familyId - Family ID
 * @param {Object} options - Options (createBill, billId)
 * @returns {Promise<Object>} Updated pattern
 */
async function approvePattern(patternId, userId, familyId, options = {}) {
  if (!patternId || !familyId) {
    throw new Error("patternId and familyId are required");
  }

  const { billId = null } = options;

  const updatedPattern = await updatePatternStatus(
    familyId,
    patternId,
    "approved",
    userId,
    billId,
  );

  return updatedPattern;
}

/**
 * Reject a pattern (exclude from future suggestions)
 * @param {string} patternId - Pattern ID
 * @param {string} userId - User ID
 * @param {string} familyId - Family ID
 * @returns {Promise<Object>} Updated pattern
 */
async function rejectPattern(patternId, userId, familyId) {
  if (!patternId || !familyId) {
    throw new Error("patternId and familyId are required");
  }

  const updatedPattern = await updatePatternStatus(
    familyId,
    patternId,
    "rejected",
    userId,
  );

  return updatedPattern;
}

/**
 * Ignore a pattern (don't show again but don't mark as rejected)
 * @param {string} patternId - Pattern ID
 * @param {string} userId - User ID
 * @param {string} familyId - Family ID
 * @returns {Promise<Object>} Updated pattern
 */
async function ignorePattern(patternId, userId, familyId) {
  if (!patternId || !familyId) {
    throw new Error("patternId and familyId are required");
  }

  const updatedPattern = await updatePatternStatus(
    familyId,
    patternId,
    "ignored",
    userId,
  );

  return updatedPattern;
}

module.exports = {
  analyzeTransactionsForPatterns,
  getPatterns,
  updatePattern,
  approvePattern,
  rejectPattern,
  ignorePattern,
  // Export helpers for testing
  generateBillName,
  generateExplanation,
  mergePatterns,
  // Export constants
  MIN_ANALYSIS_MONTHS,
  MAX_ANALYSIS_MONTHS,
  DEFAULT_ANALYSIS_MONTHS,
};
