/**
 * development-status.md Validator
 *
 * Validates that docs/development-status.md has "Last Updated" field
 * set to today's date and contains substantial current status content.
 */

const { readFile, extractSection } = require("../utils/content-parser");
const { getTodayString, isToday } = require("../utils/date-utils");

/**
 * Validate docs/development-status.md content
 * @param {string[]} stagedFiles - Array of staged file paths
 * @param {Object} categories - Categorized staged files
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
function validateStatus(stagedFiles, categories) {
  const result = {
    valid: true,
    errors: [],
  };

  try {
    // Read development-status.md
    const content = readFile("docs/development-status.md");

    // Check for "Last Updated" field
    const lastUpdatedPattern = /\*\*Last Updated\*\*:\s*(\d{4}-\d{2}-\d{2})/;
    const lastUpdatedMatch = content.match(lastUpdatedPattern);

    if (!lastUpdatedMatch) {
      result.valid = false;
      result.errors.push(
        "docs/development-status.md must contain '**Last Updated**: YYYY-MM-DD' field at the top.",
      );
      return result;
    }

    // Verify date is today
    const lastUpdatedDate = lastUpdatedMatch[1];
    if (!isToday(lastUpdatedDate)) {
      const today = getTodayString();
      result.valid = false;
      result.errors.push(
        `Last Updated field is not today's date. Found: ${lastUpdatedDate}, Expected: ${today}`,
      );
      result.errors.push(`Update the field to: **Last Updated**: ${today}`);
    }

    // Extract "Current Status" or similar section
    // Note: "Current Phase" is a field, not a section heading
    let statusSection = extractSection(content, /Current Status/i);

    // If no "Current Status" section, check if there's substantial content after "Current Phase" field
    if (!statusSection) {
      // Check for "Current Phase" field and verify there's content after it
      const currentPhasePattern = /\*\*Current Phase\*\*:/i;
      if (currentPhasePattern.test(content)) {
        // Consider the entire document as having status information
        statusSection = content;
      }
    }

    if (!statusSection) {
      result.valid = false;
      result.errors.push(
        "docs/development-status.md must contain a 'Current Status' section or 'Current Phase' field with substantial content.",
      );
      return result;
    }

    // Check for substantial content (> 100 characters)
    // For the whole document check, we need more content
    const minLength = statusSection === content ? 500 : 100;
    const statusContent = statusSection.replace(/^#{1,6}.*\n/gm, "").trim();
    if (statusContent.length < minLength) {
      result.valid = false;
      result.errors.push(
        `Status content has insufficient detail (${statusContent.length} chars). Minimum ${minLength} characters required.`,
      );
      result.errors.push(
        "Add detailed status information about current work, progress, and next steps.",
      );
    }
  } catch (error) {
    result.valid = false;
    result.errors.push(
      `Failed to validate docs/development-status.md: ${error.message}`,
    );
  }

  return result;
}

module.exports = {
  validateStatus,
};
