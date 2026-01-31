/**
 * Git Utilities for Documentation Validation
 *
 * Provides functions to interact with git and analyze staged files.
 */

const { execSync } = require("child_process");

/**
 * Get list of staged files from git
 * @returns {string[]} Array of file paths staged for commit
 * @throws {Error} If git command fails or not in a git repository
 */
function getStagedFiles() {
  try {
    const output = execSync("git diff --cached --name-only", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    return output
      .trim()
      .split("\n")
      .filter((file) => file.length > 0);
  } catch (error) {
    throw new Error(
      `Failed to get staged files from git: ${error.message}. Ensure you're in a git repository.`,
    );
  }
}

/**
 * Categorize staged files by type
 * @param {string[]} stagedFiles - Array of file paths
 * @returns {Object} Object with categorized file arrays
 */
function categorizeChanges(stagedFiles) {
  const categories = {
    backend: [],
    frontend: [],
    infrastructure: [],
    tests: [],
    docs: [],
  };

  stagedFiles.forEach((file) => {
    // Backend: backend/**/*.js, backend/**/*.json
    if (
      file.startsWith("backend/") &&
      (file.endsWith(".js") || file.endsWith(".json"))
    ) {
      categories.backend.push(file);
    }
    // Frontend: packages/**/*.tsx, packages/**/*.ts, packages/**/*.jsx, packages/**/*.js
    else if (
      file.startsWith("packages/") &&
      (file.endsWith(".tsx") ||
        file.endsWith(".ts") ||
        file.endsWith(".jsx") ||
        file.endsWith(".js"))
    ) {
      categories.frontend.push(file);
    }
    // Infrastructure: infrastructure/**/*.ts, .github/workflows/**/*.yml
    else if (
      (file.startsWith("infrastructure/") && file.endsWith(".ts")) ||
      (file.startsWith(".github/workflows/") && file.endsWith(".yml"))
    ) {
      categories.infrastructure.push(file);
    }
    // Tests: tests/**/*.js, **/*.test.js, **/*.spec.js
    else if (
      file.startsWith("tests/") ||
      file.includes(".test.") ||
      file.includes(".spec.")
    ) {
      categories.tests.push(file);
    }
    // Docs: docs/**/*.md, *.md
    else if (file.startsWith("docs/") || file.endsWith(".md")) {
      categories.docs.push(file);
    }
  });

  return categories;
}

/**
 * Check if documentation files are staged
 * @param {string[]} stagedFiles - Array of file paths
 * @returns {boolean} True if any documentation file is staged
 */
function isDocumentationStaged(stagedFiles) {
  const docFiles = [
    "README.md",
    "CHANGELOG.md",
    "DEVELOPMENT_LOG.md",
    "docs/development-status.md",
  ];

  return stagedFiles.some((file) => docFiles.includes(file));
}

module.exports = {
  getStagedFiles,
  categorizeChanges,
  isDocumentationStaged,
};
