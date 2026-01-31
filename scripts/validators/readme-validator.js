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

    // For major changes (infrastructure, new features), verify section mentions them
    const hasMajorChanges =
      categories.infrastructure.length > 0 ||
      categories.backend.length > 5 ||
      categories.frontend.length > 5;

    if (hasMajorChanges) {
      // This is a warning, not a hard failure
      // Check if achievements section mentions any of the major components
      const majorComponents = [
        ...categories.infrastructure.map((f) => f.split("/")[1]), // e.g., "lib" from "infrastructure/lib/..."
        ...categories.backend
          .filter((f) => f.includes("/functions/"))
          .map((f) => f.split("/")[2]), // e.g., "auth" from "backend/functions/auth/..."
      ].filter((c) => c && c.length > 3);

      if (majorComponents.length > 0) {
        const hasMention = majorComponents.some((component) =>
          achievementsSection.toLowerCase().includes(component.toLowerCase()),
        );

        if (!hasMention) {
          // Warning only - don't fail validation
          result.errors.push(
            `⚠️  Warning: Major changes detected but not mentioned in Recent Achievements. Consider adding: ${majorComponents.slice(0, 2).join(", ")}`,
          );
        }
      }
    }
  } catch (error) {
    result.valid = false;
    result.errors.push(`Failed to validate README.md: ${error.message}`);
  }

  return result;
}

module.exports = {
  validateReadme,
};
