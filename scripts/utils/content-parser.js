/**
 * Content Parser Utilities for Documentation Validation
 *
 * Provides functions to read and parse documentation file content.
 */

const fs = require("fs");
const path = require("path");

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Read file content with error handling and size limits
 * @param {string} filePath - Path to file (relative to workspace root)
 * @returns {string} File content
 * @throws {Error} If file doesn't exist, can't be read, or exceeds size limit
 */
function readFile(filePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(
        `File ${filePath} exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    // Read file
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if (
      error.message.includes("File not found") ||
      error.message.includes("exceeds maximum")
    ) {
      throw error;
    }
    throw new Error(`Failed to read file ${filePath}: ${error.message}`);
  }
}

/**
 * Extract a markdown section by heading
 * @param {string} content - File content
 * @param {string|RegExp} headingPattern - Heading pattern to match
 * @returns {string} Section content (empty string if not found)
 */
function extractSection(content, headingPattern) {
  if (!content) return "";

  const lines = content.split("\n");
  const pattern =
    typeof headingPattern === "string"
      ? new RegExp(`^#{1,6}\\s+${headingPattern}`, "i")
      : headingPattern;

  let sectionStart = -1;
  let sectionEnd = -1;

  // Find section start
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      sectionStart = i;
      break;
    }
  }

  if (sectionStart === -1) return "";

  // Check if the matched line is actually a heading
  const headingMatch = lines[sectionStart].match(/^(#{1,6})\s/);
  if (!headingMatch) {
    // Not a heading, return empty
    return "";
  }

  // Find section end (next heading of same or higher level)
  const startLevel = headingMatch[1].length;
  for (let i = sectionStart + 1; i < lines.length; i++) {
    const headingMatch = lines[i].match(/^(#{1,6})\s/);
    if (headingMatch && headingMatch[1].length <= startLevel) {
      sectionEnd = i;
      break;
    }
  }

  // Extract section
  if (sectionEnd === -1) {
    return lines.slice(sectionStart).join("\n");
  }
  return lines.slice(sectionStart, sectionEnd).join("\n");
}

/**
 * Find all date patterns in content
 * @param {string} content - Content to search
 * @returns {string[]} Array of date strings found (YYYY-MM-DD format)
 */
function findDatesInContent(content) {
  if (!content) return [];

  // Match YYYY-MM-DD and YYYY/MM/DD formats
  const datePattern = /\b(\d{4}[-/]\d{2}[-/]\d{2})\b/g;
  const matches = content.match(datePattern);

  if (!matches) return [];

  // Normalize to YYYY-MM-DD format
  return matches.map((date) => date.replace(/\//g, "-"));
}

/**
 * Check if content contains any of the specified keywords
 * @param {string} content - Content to search
 * @param {string[]} keywords - Keywords to search for
 * @param {boolean} caseSensitive - Whether search is case-sensitive (default: false)
 * @returns {boolean} True if any keyword is found
 */
function containsKeywords(content, keywords, caseSensitive = false) {
  if (!content || !keywords || keywords.length === 0) return false;

  const searchContent = caseSensitive ? content : content.toLowerCase();

  return keywords.some((keyword) => {
    const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();
    return searchContent.includes(searchKeyword);
  });
}

module.exports = {
  readFile,
  extractSection,
  findDatesInContent,
  containsKeywords,
};
