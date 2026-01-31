/**
 * DEVELOPMENT_LOG.md Validator
 *
 * Validates that DEVELOPMENT_LOG.md contains a session entry for today's work
 * with substantial content.
 */

const {
  readFile,
  extractSection,
  containsKeywords,
} = require("../utils/content-parser");
const { getTodayString, isToday } = require("../utils/date-utils");

/**
 * Validate DEVELOPMENT_LOG.md content
 * @param {string[]} stagedFiles - Array of staged file paths
 * @param {Object} categories - Categorized staged files
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
function validateDevLog(stagedFiles, categories) {
  const result = {
    valid: true,
    errors: [],
  };

  try {
    // Read DEVELOPMENT_LOG.md
    const content = readFile("DEVELOPMENT_LOG.md");

    // Check for session entry with today's date
    const today = getTodayString();
    const sessionPattern = /## (\d{4}-\d{2}-\d{2}) - /g;
    const sessionMatches = [...content.matchAll(sessionPattern)];

    if (sessionMatches.length === 0) {
      result.valid = false;
      result.errors.push(
        "No session entries found. DEVELOPMENT_LOG.md must contain entries in format '## YYYY-MM-DD - Session Title'",
      );
      return result;
    }

    // Check if any session entry is for today
    const todaySession = sessionMatches.find((match) => isToday(match[1]));

    if (!todaySession) {
      result.valid = false;
      result.errors.push(
        `No session entry found for today (${today}). Add entry: '## ${today} - [Session Title] (Session X)'`,
      );
      result.errors.push(
        `Staged files: ${stagedFiles.slice(0, 5).join(", ")}${stagedFiles.length > 5 ? "..." : ""}`,
      );
      return result;
    }

    // Extract today's session content
    const sessionStartIndex = content.indexOf(todaySession[0]);
    const nextSessionIndex = content.indexOf("\n## 20", sessionStartIndex + 1);
    const sessionContent =
      nextSessionIndex === -1
        ? content.substring(sessionStartIndex)
        : content.substring(sessionStartIndex, nextSessionIndex);

    // Check for substantial content (> 50 characters excluding heading)
    const contentWithoutHeading = sessionContent.replace(/^## .*\n/, "").trim();
    if (contentWithoutHeading.length < 50) {
      result.valid = false;
      result.errors.push(
        `Today's session entry has insufficient content (${contentWithoutHeading.length} chars). Minimum 50 characters required.`,
      );
      result.errors.push(
        "Add session summary with Duration, Focus, and Outcome sections.",
      );
    }

    // Check for mentions of relevant work based on staged files
    const allStagedKeywords = [
      ...categories.backend.map((f) =>
        f
          .split("/")
          .pop()
          .replace(/\.(js|json)$/, ""),
      ),
      ...categories.frontend.map((f) =>
        f
          .split("/")
          .pop()
          .replace(/\.(tsx?|jsx?)$/, ""),
      ),
      ...categories.infrastructure.map((f) =>
        f.split("/").pop().replace(/\.ts$/, ""),
      ),
    ].filter((k) => k.length > 3); // Only keywords longer than 3 chars

    if (allStagedKeywords.length > 0) {
      const hasRelevantMention = allStagedKeywords.some((keyword) =>
        sessionContent.toLowerCase().includes(keyword.toLowerCase()),
      );

      if (!hasRelevantMention) {
        result.valid = false;
        result.errors.push(
          `Today's session entry doesn't mention any of the modified files or components.`,
        );
        result.errors.push(
          `Consider mentioning: ${allStagedKeywords.slice(0, 3).join(", ")}`,
        );
      }
    }
  } catch (error) {
    result.valid = false;
    result.errors.push(
      `Failed to validate DEVELOPMENT_LOG.md: ${error.message}`,
    );
  }

  return result;
}

module.exports = {
  validateDevLog,
};
