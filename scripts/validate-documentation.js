#!/usr/bin/env node

/**
 * MANDATORY Documentation Validation Script
 * ALL DOCUMENTATION FILES MUST BE UPDATED BEFORE EVERY COMMIT
 * COMMIT WILL FAIL IF ANY DOCUMENTATION IS NOT UPDATED
 */

const fs = require("fs");
const path = require("path");

console.log("📚 Validating MANDATORY documentation updates...\n");
console.log("� AaLL DOCUMENTATION FILES MUST BE UPDATED BEFORE COMMIT\n");

const MANDATORY_DOCS = [
  {
    file: "README.md",
    name: "README",
    maxDaysOld: 7, // Must be updated within 7 days
    description: "Project overview, features, installation, usage",
  },
  {
    file: "CHANGELOG.md",
    name: "Changelog",
    maxDaysOld: 3, // Must be updated within 3 days when changes are made
    description: "Version history and changes for this commit",
  },
  {
    file: "DEVELOPMENT_LOG.md",
    name: "Development Log",
    maxDaysOld: 3, // Must be updated within 3 days when development occurs
    description: "Daily development progress and decisions",
  },
  {
    file: "docs/development-status.md",
    name: "Development Status",
    maxDaysOld: 7, // Must be updated within 7 days
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
      `MANDATORY: ${filePath} file is missing and must be created`
    );
    console.log(`   ❌ FAIL: File missing`);
    return result;
  }

  // MANDATORY: File must be recently modified
  if (!checkRecentModification(filePath, maxDaysOld)) {
    result.status = "FAIL";
    result.issues.push(
      `MANDATORY: ${filePath} must be updated within the last ${maxDaysOld} day(s) before committing`
    );
    console.log(`   ❌ FAIL: Not updated within ${maxDaysOld} day(s)`);
    return result;
  }

  // Additional content validation based on file type and established patterns
  const content = fs.readFileSync(filePath, "utf8");

  if (filePath === "README.md") {
    // Pattern: Must have substantial content with project overview, status, and features
    if (content.length < 1000) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: README.md must contain substantial content (>1000 characters) with project overview, current status, and features"
      );
    }

    // Pattern: Must contain current project status section
    if (
      !content.includes("## Project Status") &&
      !content.includes("## Current Status")
    ) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: README.md must contain a '## Project Status' or '## Current Status' section"
      );
    }

    // Pattern: Must contain recent achievements section
    if (
      !content.includes("Recent Achievements") &&
      !content.includes("### Recent")
    ) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: README.md must contain a 'Recent Achievements' section with latest updates"
      );
    }
  }

  if (filePath === "CHANGELOG.md") {
    // Pattern: Must start with "# Changelog" header
    if (!content.startsWith("# Changelog")) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: CHANGELOG.md must start with '# Changelog' header following established pattern"
      );
    }

    // Pattern: Must follow semantic versioning format
    const hasVersionEntries =
      content.includes("## [") && content.includes("] - ");
    if (!hasVersionEntries) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: CHANGELOG.md must contain version entries following the pattern '## [X.Y.Z] - YYYY-MM-DD'"
      );
    }

    // Pattern: Must contain detailed technical information and impact analysis
    const lines = content.split("\n");
    const recentSections = lines.filter(
      (line) =>
        line.includes("### 🔒") ||
        line.includes("### 🔧") ||
        line.includes("### 🐛") ||
        line.includes("### 🚀") ||
        line.includes("**Technical Details**") ||
        line.includes("**Impact**")
    );

    if (recentSections.length === 0) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: CHANGELOG.md must contain detailed sections with emojis (🔒🔧🐛🚀) and technical details following established pattern"
      );
    }
  }

  if (filePath === "DEVELOPMENT_LOG.md") {
    // Pattern: Must start with "# Development Log" header
    if (!content.startsWith("# Development Log")) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: DEVELOPMENT_LOG.md must start with '# Development Log' header following established pattern"
      );
    }

    // Pattern: Must contain session summaries with duration, focus, and outcome
    const hasSessionSummary =
      content.includes("### Session Summary") &&
      content.includes("**Duration**") &&
      content.includes("**Focus**") &&
      content.includes("**Outcome**");

    if (!hasSessionSummary) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: DEVELOPMENT_LOG.md must contain '### Session Summary' sections with Duration, Focus, and Outcome following established pattern"
      );
    }

    // Pattern: Must follow date format for entries
    const hasDateEntries = content.includes("## 20") && content.includes(" - ");
    if (!hasDateEntries) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: DEVELOPMENT_LOG.md must contain entries following the pattern '## YYYY-MM-DD - Session Title'"
      );
    }
  }

  if (filePath === "docs/development-status.md") {
    // Pattern: Must follow established structure with specific sections
    const requiredSections = [
      "# Development Status - BudgetBuddy",
      "**Last Updated**:",
      "**Current Phase**:",
      "**Overall Progress**:",
    ];

    const missingSections = requiredSections.filter(
      (section) => !content.includes(section)
    );

    if (missingSections.length > 0) {
      result.status = "FAIL";
      result.issues.push(
        `MANDATORY: development-status.md missing required sections: ${missingSections.join(
          ", "
        )} - must follow established pattern`
      );
    }

    // Pattern: Must contain "What's Working ✅" and "What's Missing ❌" sections
    if (
      !content.includes("## What's Working ✅") ||
      !content.includes("## What's Missing ❌")
    ) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: development-status.md must contain '## What's Working ✅' and '## What's Missing ❌' sections following established pattern"
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

      // Print detailed failure information
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
    `   📄 Total: ${validationResults.passed + validationResults.failed}\n`
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
      "   1. README.md: Update with latest features, current status, and recent achievements"
    );
    console.log(
      "   2. CHANGELOG.md: Add entry with format '## [X.Y.Z] - YYYY-MM-DD' and detailed technical sections"
    );
    console.log(
      "   3. DEVELOPMENT_LOG.md: Add entry with format '## YYYY-MM-DD - Session Title (Session X)' and session summary"
    );
    console.log(
      "   4. docs/development-status.md: Update 'Last Updated' field and progress sections"
    );
    console.log("");
    console.log("📋 Follow Established Patterns:");
    console.log(
      "   • README.md: Include '## Project Status' and 'Recent Achievements' sections"
    );
    console.log(
      "   • CHANGELOG.md: Use emojis (🔒🔧🐛🚀), technical details, and impact analysis"
    );
    console.log(
      "   • DEVELOPMENT_LOG.md: Include session summaries with Duration, Focus, Outcome"
    );
    console.log(
      "   • development-status.md: Update Last Updated field and maintain What's Working/Missing sections"
    );
    console.log("");
    console.log(
      '   Then run: git add . && git commit -m "docs: update documentation"'
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

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Documentation validation failed:", reason);
  process.exit(1);
});

// Run validation
if (require.main === module) {
  main();
}

module.exports = {
  validateMandatoryDoc,
  runMandatoryValidation,
  validationResults,
  MANDATORY_DOCS,
};
