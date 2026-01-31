/**
 * CHANGELOG.md Validator
 *
 * Validates that CHANGELOG.md contains a version entry for today's work
 * and mentions relevant changes based on staged files.
 */

const {
  readFile,
  findDatesInContent,
  containsKeywords,
} = require("../utils/content-parser");
const { getTodayString, isToday } = require("../utils/date-utils");

/**
 * Validate CHANGELOG.md content
 * @param {string[]} stagedFiles - Array of staged file paths
 * @param {Object} categories - Categorized staged files
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
function validateChangelog(stagedFiles, categories) {
  const result = {
    valid: true,
    errors: [],
  };

  try {
    // Read CHANGELOG.md
    const content = readFile("CHANGELOG.md");

    // Check for version entry with today's date
    const today = getTodayString();
    const versionPattern = /## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})/g;
    const versionMatches = [...content.matchAll(versionPattern)];

    if (versionMatches.length === 0) {
      result.valid = false;
      result.errors.push(
        "No version entries found. CHANGELOG.md must contain version entries in format '## [X.Y.Z] - YYYY-MM-DD'",
      );
      return result;
    }

    // Check if any version entry is for today
    const todayEntry = versionMatches.find((match) => isToday(match[2]));

    if (!todayEntry) {
      result.valid = false;
      result.errors.push(
        `No version entry found for today (${today}). Add entry: '## [X.Y.Z] - ${today}'`,
      );
      result.errors.push(
        `Staged files: ${stagedFiles.slice(0, 5).join(", ")}${stagedFiles.length > 5 ? "..." : ""}`,
      );
      return result;
    }

    // Verify semantic version format
    const version = todayEntry[1];
    const semverPattern = /^\d+\.\d+\.\d+$/;
    if (!semverPattern.test(version)) {
      result.valid = false;
      result.errors.push(
        `Invalid semantic version format: ${version}. Must be X.Y.Z (e.g., 1.2.3)`,
      );
    }

    // Extract today's entry content (from this version to next version or EOF)
    const entryStartIndex = content.indexOf(todayEntry[0]);
    const nextVersionIndex = content.indexOf("\n## [", entryStartIndex + 1);
    const entryContent =
      nextVersionIndex === -1
        ? content.substring(entryStartIndex)
        : content.substring(entryStartIndex, nextVersionIndex);

    // Check for category mentions based on staged files
    if (categories.backend.length > 0) {
      const backendKeywords = [
        "backend",
        "Lambda",
        "function",
        "API",
        "service",
      ];
      if (!containsKeywords(entryContent, backendKeywords)) {
        result.valid = false;
        result.errors.push(
          `Backend files staged but not mentioned in today's CHANGELOG entry. Staged: ${categories.backend.slice(0, 3).join(", ")}`,
        );
      }
    }

    if (categories.frontend.length > 0) {
      const frontendKeywords = [
        "frontend",
        "web",
        "mobile",
        "UI",
        "component",
        "React",
      ];
      if (!containsKeywords(entryContent, frontendKeywords)) {
        result.valid = false;
        result.errors.push(
          `Frontend files staged but not mentioned in today's CHANGELOG entry. Staged: ${categories.frontend.slice(0, 3).join(", ")}`,
        );
      }
    }

    if (categories.infrastructure.length > 0) {
      const infraKeywords = [
        "infrastructure",
        "CDK",
        "stack",
        "CloudFormation",
        "deployment",
      ];
      if (!containsKeywords(entryContent, infraKeywords)) {
        result.valid = false;
        result.errors.push(
          `Infrastructure files staged but not mentioned in today's CHANGELOG entry. Staged: ${categories.infrastructure.slice(0, 3).join(", ")}`,
        );
      }
    }
  } catch (error) {
    result.valid = false;
    result.errors.push(`Failed to validate CHANGELOG.md: ${error.message}`);
  }

  return result;
}

module.exports = {
  validateChangelog,
};
