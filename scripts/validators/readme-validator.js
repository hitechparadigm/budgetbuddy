/**
 * README.md Validator
 *
 * Validates that README.md contains recent achievements section
 * with updates within the last 7 days.
 */

const {
  readFile,
  extractSection,
  findDatesInContent,
} = require("../utils/content-parser");
const { isWithinDays } = require("../utils/date-utils");

/**
 * Validate README.md content
 * @param {string[]} stagedFiles - Array of staged file paths
 * @param {Object} categories - Categorized staged files
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
function validateReadme(stagedFiles, categories) {
  const result = {
    valid: true,
    errors: [],
  };

  try {
    // Read README.md
    const content = readFile("README.md");

    // Check for "Recent Achievements" section
    const achievementsSection = extractSection(content, /Recent Achievements/i);

    if (!achievementsSection) {
      result.valid = false;
      result.errors.push(
        "README.md must contain a 'Recent Achievements' section (e.g., '### Recent Achievements')",
      );
      return result;
    }

    // Find all dates in the achievements section
    const dates = findDatesInContent(achievementsSection);

    if (dates.length === 0) {
      result.valid = false;
      result.errors.push(
        "Recent Achievements section contains no dated entries. Add achievements with dates (YYYY-MM-DD format).",
      );
      return result;
    }

    // Check if any achievement is within last 7 days
    const hasRecentAchievement = dates.some((date) => isWithinDays(date, 7));

    if (!hasRecentAchievement) {
      result.valid = false;
      result.errors.push(
        "Recent Achievements section has no updates within the last 7 days.",
      );
      result.errors.push(
        "Add or update an achievement entry with today's date to reflect current work.",
      );
    }

    // For major changes (infrastructure, new features), we don't add extra requirements
    // Note: We don't fail for major changes not being mentioned
    // The 7-day check is sufficient - if Recent Achievements is current, that's enough
  } catch (error) {
    result.valid = false;
    result.errors.push(`Failed to validate README.md: ${error.message}`);
  }

  return result;
}

module.exports = {
  validateReadme,
};
