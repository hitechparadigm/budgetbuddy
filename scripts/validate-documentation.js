#!/usr/bin/env node

/**
 * MANDATORY Documentation Validation Script
 * ALL DOCUMENTATION FILES MUST BE UPDATED BEFORE EVERY COMMIT
 * COMMIT WILL FAIL IF ANY DOCUMENTATION IS NOT UPDATED
 *
 * Simple, straightforward validation:
 * 1. Check files exist
 * 2. Check files were modified recently (within maxDaysOld)
 * 3. Check content follows established patterns
 */

const fs = require("fs");
const path = require("path");

console.log("📚 Validating MANDATORY documentation updates...\n");
console.log("📋 ALL DOCUMENTATION FILES MUST BE UPDATED BEFORE COMMIT\n");

const MANDATORY_DOCS = [
  {
    file: "README.md",
    name: "README",
    maxDaysOld: 7,
    description: "Project overview, features, installation, usage",
  },
  {
    file: "CHANGELOG.md",
    name: "Changelog",
    maxDaysOld: 1, // Must be updated same day as code changes
    description: "Version history and changes for this commit",
  },
  {
    file: "DEVELOPMENT_LOG.md",
    name: "Development Log",
    maxDaysOld: 1, // Must be updated same day as code changes
    description: "Daily development progress and decisions",
  },
  {
    file: "docs/development-status.md",
    name: "Development Status",
    maxDaysOld: 7,
    description: "Current project status and next steps",
  },
];

const validationResults = {
  passed: 0,
  failed: 0,
  details: [],
};

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function getFileStats(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return {
      exists: true,
      lastModified: stats.mtime,
      size: stats.size,
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message,
    };
  }
}

function checkRecentModification(filePath, maxDaysOld) {
  const stats = getFileStats(filePath);
  if (!stats.exists) return false;

  const now = new Date();
  const daysSinceModified = (now - stats.lastModified) / (1000 * 60 * 60 * 24);

  return daysSinceModified <= maxDaysOld;
}

function getTodayDateString() {
  const now = new Date();
  return now.toISOString().split("T")[0]; // YYYY-MM-DD
}

function validateMandatoryDoc(docConfig) {
  const { file: filePath, name, maxDaysOld, description } = docConfig;
  const result = {
    file: filePath,
    name: name,
    status: "PASS",
    issues: [],
    description: description,
  };

  console.log(`📄 Checking ${name} (${filePath})...`);

  // MANDATORY: File must exist
  if (!checkFileExists(filePath)) {
    result.status = "FAIL";
    result.issues.push(
      `MANDATORY: ${filePath} file is missing and must be created`,
    );
    console.log(`   ❌ FAIL: File missing`);
    return result;
  }

  // MANDATORY: File must be recently modified
  if (!checkRecentModification(filePath, maxDaysOld)) {
    result.status = "FAIL";
    result.issues.push(
      `MANDATORY: ${filePath} must be updated within the last ${maxDaysOld} day(s) before committing`,
    );
    console.log(`   ❌ FAIL: Not updated within ${maxDaysOld} day(s)`);
    return result;
  }

  // Read content for pattern validation
  const content = fs.readFileSync(filePath, "utf8");
  const today = getTodayDateString();

  // === README.md validation ===
  if (filePath === "README.md") {
    if (content.length < 1000) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: README.md must contain substantial content (>1000 characters)",
      );
    }

    if (
      !content.includes("## Project Status") &&
      !content.includes("## Current Status")
    ) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: README.md must contain a '## Project Status' or '## Current Status' section",
      );
    }

    if (
      !content.includes("Recent Achievements") &&
      !content.includes("### Recent")
    ) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: README.md must contain a 'Recent Achievements' section",
      );
    }
  }

  // === CHANGELOG.md validation ===
  if (filePath === "CHANGELOG.md") {
    if (!content.startsWith("# Changelog")) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: CHANGELOG.md must start with '# Changelog' header",
      );
    }

    // Must have version entries in format ## [X.Y.Z] - YYYY-MM-DD
    const hasVersionEntries =
      content.includes("## [") && content.includes("] - ");
    if (!hasVersionEntries) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: CHANGELOG.md must contain version entries in format '## [X.Y.Z] - YYYY-MM-DD'",
      );
    }

    // Must have today's date in a version entry
    if (!content.includes(`] - ${today}`)) {
      result.status = "FAIL";
      result.issues.push(
        `MANDATORY: CHANGELOG.md must have a version entry for today (${today})`,
      );
      result.issues.push(`Add entry like: ## [X.Y.Z] - ${today}`);
    }

    // Must have meaningful content (not just a header)
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length < 10) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: CHANGELOG.md must contain detailed change descriptions",
      );
    }
  }

  // === DEVELOPMENT_LOG.md validation ===
  if (filePath === "DEVELOPMENT_LOG.md") {
    if (!content.startsWith("# Development Log")) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: DEVELOPMENT_LOG.md must start with '# Development Log' header",
      );
    }

    // Must have date entries in format ## YYYY-MM-DD -
    const hasDateEntries = content.includes("## 20") && content.includes(" - ");
    if (!hasDateEntries) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: DEVELOPMENT_LOG.md must contain entries in format '## YYYY-MM-DD - Session Title'",
      );
    }

    // Must have today's date entry
    if (!content.includes(`## ${today}`)) {
      result.status = "FAIL";
      result.issues.push(
        `MANDATORY: DEVELOPMENT_LOG.md must have a session entry for today (${today})`,
      );
      result.issues.push(
        `Add entry like: ## ${today} - Session Title (Session X)`,
      );
    }

    // Must have session summary structure
    const hasSessionContent =
      content.includes("### Session Summary") ||
      content.includes("**Duration**") ||
      content.includes("### Work Completed") ||
      content.includes("### Files Changed");

    if (!hasSessionContent) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: DEVELOPMENT_LOG.md session must include Summary, Duration, or Files Changed sections",
      );
    }
  }

  // === docs/development-status.md validation ===
  if (filePath === "docs/development-status.md") {
    const requiredFields = [
      "**Last Updated**:",
      "**Current Phase**:",
      "**Overall Progress**:",
    ];

    const missingFields = requiredFields.filter(
      (field) => !content.includes(field),
    );
    if (missingFields.length > 0) {
      result.status = "FAIL";
      result.issues.push(
        `MANDATORY: development-status.md missing required fields: ${missingFields.join(", ")}`,
      );
    }

    // Last Updated must be today
    const lastUpdatedMatch = content.match(
      /\*\*Last Updated\*\*:\s*(\d{4}-\d{2}-\d{2})/,
    );
    if (lastUpdatedMatch && lastUpdatedMatch[1] !== today) {
      result.status = "FAIL";
      result.issues.push(
        `MANDATORY: development-status.md 'Last Updated' must be today (${today}), found: ${lastUpdatedMatch[1]}`,
      );
    }
  }

  if (result.status === "PASS") {
    console.log(`   ✅ PASS`);
  } else {
    console.log(`   ❌ FAIL`);
  }

  return result;
}

function runMandatoryValidation() {
  console.log("🔍 Checking all mandatory documentation files...\n");

  MANDATORY_DOCS.forEach((docConfig) => {
    const result = validateMandatoryDoc(docConfig);
    validationResults.details.push(result);

    if (result.status === "PASS") {
      validationResults.passed++;
    } else {
      validationResults.failed++;
      result.issues.forEach((issue) => {
        console.log(`   ❌ ${issue}`);
      });
    }

    console.log("");
  });
}

function generateMandatoryReport() {
  console.log("📊 MANDATORY Documentation Validation Summary:");
  console.log(`   ✅ Passed: ${validationResults.passed}`);
  console.log(`   ❌ Failed: ${validationResults.failed}`);
  console.log(
    `   📄 Total: ${validationResults.passed + validationResults.failed}\n`,
  );

  if (validationResults.failed > 0) {
    console.log("🚫 COMMIT BLOCKED - MANDATORY DOCUMENTATION NOT UPDATED!");
    console.log("");
    console.log("📋 Required Actions:");

    validationResults.details.forEach((result) => {
      if (result.status === "FAIL") {
        console.log(`\n📄 ${result.name} (${result.file}):`);
        console.log(`   Purpose: ${result.description}`);
        result.issues.forEach((issue) => {
          console.log(`   ❌ ${issue}`);
        });
      }
    });

    console.log("\n💡 Quick Fix Guide:");
    console.log(
      "   1. README.md: Update 'Recent Achievements' section with latest work",
    );
    console.log(
      "   2. CHANGELOG.md: Add entry '## [X.Y.Z] - YYYY-MM-DD' with detailed changes",
    );
    console.log(
      "   3. DEVELOPMENT_LOG.md: Add entry '## YYYY-MM-DD - Session Title (Session X)'",
    );
    console.log(
      "   4. docs/development-status.md: Update 'Last Updated' field to today's date",
    );
    console.log("");

    return false;
  } else {
    console.log("✅ ALL MANDATORY DOCUMENTATION CHECKS PASSED!");
    console.log("🎉 Commit can proceed - all documentation is up to date.\n");
    return true;
  }
}

function main() {
  console.log("📚 BudgetBuddy MANDATORY Documentation Validation\n");

  runMandatoryValidation();
  const success = generateMandatoryReport();

  process.exit(success ? 0 : 1);
}

// Handle errors
process.on("uncaughtException", (error) => {
  console.error("💥 Documentation validation failed:", error.message);
  process.exit(1);
});

// Run validation
if (require.main === module) {
  main();
}

module.exports = {
  runMandatoryValidation,
  validationResults,
};
