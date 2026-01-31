#!/usr/bin/env node

/**
 * MANDATORY Documentation Validation Script
 * ALL DOCUMENTATION FILES MUST BE UPDATED BEFORE EVERY COMMIT
 * COMMIT WILL FAIL IF ANY DOCUMENTATION IS NOT UPDATED
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

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

function getChangesSinceLastCommit() {
  try {
    // Get files staged for commit (what's about to be committed)
    const stagedFiles = execSync("git diff --cached --name-only", {
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .filter((file) => file.length > 0);

    // Get all current changes (staged + unstaged)
    const currentChanges = execSync("git status --porcelain", {
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => line.substring(3)); // Remove status indicators

    // Get last commit message to understand what was completed
    const lastCommitMessage = execSync('git log -1 --pretty=format:"%s"', {
      encoding: "utf8",
    });

    // Check if staged files include code files (non-documentation)
    const codeFilePatterns = /\.(js|ts|tsx|jsx|json|yml|yaml|sh|ps1)$/;
    const docFilePatterns =
      /^(README\.md|CHANGELOG\.md|DEVELOPMENT_LOG\.md|docs\/.*\.md)$/;

    const stagedCodeFiles = stagedFiles.filter(
      (file) => codeFilePatterns.test(file) && !docFilePatterns.test(file),
    );

    return {
      stagedFiles,
      stagedCodeFiles,
      currentChanges,
      lastCommitMessage,
      hasChanges: stagedFiles.length > 0 || currentChanges.length > 0,
      hasCodeChanges: stagedCodeFiles.length > 0,
    };
  } catch (error) {
    console.log(
      "⚠️  Could not check git changes (not in git repo or no commits)",
    );
    return {
      stagedFiles: [],
      stagedCodeFiles: [],
      currentChanges: [],
      lastCommitMessage: "",
      hasChanges: false,
      hasCodeChanges: false,
    };
  }
}

function validateMandatoryDoc(docConfig, gitChanges = null) {
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

  // MANDATORY: File must be recently modified OR contain today's date
  const hasRecentModification = checkRecentModification(filePath, maxDaysOld);
  const content = fs.readFileSync(filePath, "utf8");
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
  const hasCurrentDateContent =
    content.includes(today) || content.includes(today.replace(/-/g, "/"));

  if (!hasRecentModification && !hasCurrentDateContent) {
    result.status = "FAIL";
    result.issues.push(
      `MANDATORY: ${filePath} must be updated within the last ${maxDaysOld} day(s) OR contain current work from ${today}`,
    );
    console.log(
      `   ❌ FAIL: Not updated within ${maxDaysOld} day(s) and no current date content`,
    );
    return result;
  }

  // Additional content validation based on file type and established patterns

  if (filePath === "README.md") {
    // Pattern: Must have substantial content with project overview, status, and features
    if (content.length < 1000) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: README.md must contain substantial content (>1000 characters) with project overview, current status, and features",
      );
    }

    // Pattern: Must contain current project status section
    if (
      !content.includes("## Project Status") &&
      !content.includes("## Current Status")
    ) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: README.md must contain a '## Project Status' or '## Current Status' section",
      );
    }

    // Pattern: Must contain recent achievements section with current date or recent date
    const hasRecentAchievements =
      content.includes("Recent Achievements") || content.includes("### Recent");
    if (!hasRecentAchievements) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: README.md must contain a 'Recent Achievements' section with latest updates",
      );
    }

    // Enhanced: Check for current work indicators
    const currentYear = new Date().getFullYear();
    const hasCurrentYearWork =
      content.includes(`${currentYear}`) &&
      (content.includes("COMPLETE") ||
        content.includes("✅") ||
        content.includes("implemented") ||
        content.includes("fixed"));

    if (!hasCurrentYearWork) {
      result.status = "FAIL";
      result.issues.push(
        `MANDATORY: README.md must contain recent work completion indicators for ${currentYear} (COMPLETE, ✅, implemented, fixed)`,
      );
    }
  }

  if (filePath === "CHANGELOG.md") {
    // Pattern: Must start with "# Changelog" header
    if (!content.startsWith("# Changelog")) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: CHANGELOG.md must start with '# Changelog' header following established pattern",
      );
    }

    // Pattern: Must follow semantic versioning format
    const hasVersionEntries =
      content.includes("## [") && content.includes("] - ");
    if (!hasVersionEntries) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: CHANGELOG.md must contain version entries following the pattern '## [X.Y.Z] - YYYY-MM-DD'",
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
        line.includes("**Impact**"),
    );

    if (recentSections.length === 0) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: CHANGELOG.md must contain detailed sections with emojis (🔒🔧🐛🚀) and technical details following established pattern",
      );
    }

    // Enhanced: Check for current date entries indicating recent work
    const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const hasCurrentWork =
      content.includes(currentDate) || content.includes(yesterday);

    if (!hasCurrentWork) {
      result.status = "FAIL";
      result.issues.push(
        `MANDATORY: CHANGELOG.md must contain entries for current work (${currentDate} or ${yesterday}) - ensure recent changes are documented`,
      );
    }
  }

  if (filePath === "DEVELOPMENT_LOG.md") {
    // Pattern: Must start with "# Development Log" header
    if (!content.startsWith("# Development Log")) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: DEVELOPMENT_LOG.md must start with '# Development Log' header following established pattern",
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
        "MANDATORY: DEVELOPMENT_LOG.md must contain '### Session Summary' sections with Duration, Focus, and Outcome following established pattern",
      );
    }

    // Pattern: Must follow date format for entries
    const hasDateEntries = content.includes("## 20") && content.includes(" - ");
    if (!hasDateEntries) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: DEVELOPMENT_LOG.md must contain entries following the pattern '## YYYY-MM-DD - Session Title'",
      );
    }

    // Enhanced: Check for current session work
    const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const hasCurrentSession =
      content.includes(currentDate) || content.includes(yesterday);

    if (!hasCurrentSession) {
      result.status = "FAIL";
      result.issues.push(
        `MANDATORY: DEVELOPMENT_LOG.md must contain session entry for current work (${currentDate} or ${yesterday}) - document today's development session`,
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
      (section) => !content.includes(section),
    );

    if (missingSections.length > 0) {
      result.status = "FAIL";
      result.issues.push(
        `MANDATORY: development-status.md missing required sections: ${missingSections.join(
          ", ",
        )} - must follow established pattern`,
      );
    }

    // Pattern: Must contain "What's Working ✅" and "What's Missing ❌" sections
    if (
      !content.includes("## What's Working ✅") ||
      !content.includes("## What's Missing ❌")
    ) {
      result.status = "FAIL";
      result.issues.push(
        "MANDATORY: development-status.md must contain '## What's Working ✅' and '## What's Missing ❌' sections following established pattern",
      );
    }
  }

  // ENHANCED: Check if current changes/work is documented - SMART MODE
  if (gitChanges && gitChanges.hasCodeChanges) {
    // Only require docs if CODE files are being committed
    const today = new Date().toISOString().split("T")[0];

    // Check if this doc file is staged for commit
    const fileIsStaged = gitChanges.stagedFiles.includes(filePath);

    if (!fileIsStaged) {
      result.status = "FAIL";
      result.issues.push(
        `MANDATORY: ${filePath} must be staged when committing code changes`,
      );
      result.issues.push(
        `CODE FILES STAGED: ${gitChanges.stagedCodeFiles
          .slice(0, 3)
          .join(", ")}${gitChanges.stagedCodeFiles.length > 3 ? "..." : ""}`,
      );

      // Provide specific guidance for each file type
      if (filePath === "CHANGELOG.md") {
        result.issues.push(
          `REQUIRED: Add new version entry '## [X.Y.Z] - ${today}' with details of all changes in this commit`,
        );
      }

      if (filePath === "DEVELOPMENT_LOG.md") {
        result.issues.push(
          `REQUIRED: Add session entry '## ${today} - [Session Title] (Session X)' documenting today's work`,
        );
      }

      if (filePath === "README.md") {
        result.issues.push(
          `REQUIRED: Update 'Recent Achievements' section with latest work completed`,
        );
      }

      if (filePath === "docs/development-status.md") {
        result.issues.push(
          `REQUIRED: Update 'Last Updated' field to ${today} and document progress`,
        );
      }
    }
  } else if (
    gitChanges &&
    !gitChanges.hasCodeChanges &&
    gitChanges.stagedFiles.length > 0
  ) {
    // Documentation-only commit - allow it without strict validation
    console.log(
      `   ℹ️  Documentation-only commit detected - relaxed validation`,
    );
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

  // First, check what work has been completed since last commit
  const gitChanges = getChangesSinceLastCommit();

  if (gitChanges.hasChanges) {
    console.log("📝 Changes detected:");
    if (gitChanges.stagedFiles.length > 0) {
      console.log(
        "   Files staged for commit:",
        gitChanges.stagedFiles.join(", "),
      );
    }
    if (gitChanges.stagedCodeFiles.length > 0) {
      console.log(
        "   Code files staged:",
        gitChanges.stagedCodeFiles.join(", "),
      );
      console.log("   ⚠️  Code changes detected - documentation required!");
    } else {
      console.log("   ℹ️  Documentation-only commit - validation relaxed");
    }
    console.log("   Last commit:", gitChanges.lastCommitMessage);
    console.log("");
  }

  MANDATORY_DOCS.forEach((docConfig) => {
    const result = validateMandatoryDoc(docConfig, gitChanges);
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
      "   1. README.md: Update with latest features, current status, and recent achievements",
    );
    console.log(
      "   2. CHANGELOG.md: Add entry with format '## [X.Y.Z] - YYYY-MM-DD' and detailed technical sections",
    );
    console.log(
      "   3. DEVELOPMENT_LOG.md: Add entry with format '## YYYY-MM-DD - Session Title (Session X)' and session summary",
    );
    console.log(
      "   4. docs/development-status.md: Update 'Last Updated' field and progress sections",
    );
    console.log("");
    console.log("📋 Follow Established Patterns:");
    console.log(
      "   • README.md: Include '## Project Status' and 'Recent Achievements' sections",
    );
    console.log(
      "   • CHANGELOG.md: Use emojis (🔒🔧🐛🚀), technical details, and impact analysis",
    );
    console.log(
      "   • DEVELOPMENT_LOG.md: Include session summaries with Duration, Focus, Outcome",
    );
    console.log(
      "   • development-status.md: Update Last Updated field and maintain What's Working/Missing sections",
    );
    console.log("");
    console.log(
      '   Then run: git add . && git commit -m "docs: update documentation"',
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
