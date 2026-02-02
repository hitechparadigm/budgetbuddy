/**
 * Fuzzy Matching Utilities
 *
 * Utilities for fuzzy merchant name matching using Levenshtein distance.
 * Used to match similar merchant names across transactions (e.g., "Netflix Inc" vs "NETFLIX").
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Levenshtein distance
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create a 2D array for dynamic programming
  const matrix = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first column and row
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Normalize merchant name for comparison
 * - Convert to lowercase
 * - Remove special characters
 * - Remove extra whitespace
 * - Trim leading/trailing whitespace
 *
 * @param {string} name - Merchant name to normalize
 * @returns {string} Normalized name
 */
function normalizeMerchantName(name) {
  if (!name || typeof name !== "string") {
    return "";
  }

  return name
    .toLowerCase() // Convert to lowercase
    .replace(/[^a-z0-9\s]/g, "") // Remove special characters
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim(); // Trim leading/trailing whitespace
}

/**
 * Calculate similarity percentage between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity percentage (0-100)
 */
function calculateSimilarity(str1, str2) {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) {
    return 100; // Both strings are empty
  }

  const distance = levenshteinDistance(str1, str2);
  const similarity = ((maxLength - distance) / maxLength) * 100;
  return Math.round(similarity * 100) / 100; // Round to 2 decimal places
}

/**
 * Check if two merchant names match with fuzzy matching
 * @param {string} name1 - First merchant name
 * @param {string} name2 - Second merchant name
 * @param {number} threshold - Similarity threshold percentage (default: 80)
 * @returns {boolean} True if names match above threshold
 */
function fuzzyMatch(name1, name2, threshold = 80) {
  if (!name1 || !name2) {
    return false;
  }

  // Normalize both names
  const normalized1 = normalizeMerchantName(name1);
  const normalized2 = normalizeMerchantName(name2);

  // If either normalized name is empty, no match
  if (!normalized1 || !normalized2) {
    return false;
  }

  // Calculate similarity
  const similarity = calculateSimilarity(normalized1, normalized2);

  return similarity >= threshold;
}

/**
 * Find the best matching merchant name from a list
 * @param {string} targetName - Target merchant name to match
 * @param {Array<string>} candidateNames - List of candidate names
 * @param {number} threshold - Similarity threshold percentage (default: 80)
 * @returns {Object|null} Best match object with {name, similarity} or null if no match
 */
function findBestMatch(targetName, candidateNames, threshold = 80) {
  if (!targetName || !candidateNames || candidateNames.length === 0) {
    return null;
  }

  const normalizedTarget = normalizeMerchantName(targetName);
  if (!normalizedTarget) {
    return null;
  }

  let bestMatch = null;
  let highestSimilarity = 0;

  for (const candidateName of candidateNames) {
    const normalizedCandidate = normalizeMerchantName(candidateName);
    if (!normalizedCandidate) {
      continue;
    }

    const similarity = calculateSimilarity(
      normalizedTarget,
      normalizedCandidate,
    );
    if (similarity >= threshold && similarity > highestSimilarity) {
      highestSimilarity = similarity;
      bestMatch = {
        name: candidateName,
        similarity: similarity,
      };
    }
  }

  return bestMatch;
}

module.exports = {
  levenshteinDistance,
  normalizeMerchantName,
  calculateSimilarity,
  fuzzyMatch,
  findBestMatch,
};
