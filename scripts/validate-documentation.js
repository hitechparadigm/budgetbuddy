#!/usr/bin/env node

/**
 * MANDATORY Documentation Validation Script
 * ALL DOCUMENTATION FILES MUST BE UPDATED BEFORE EVERY COMMIT
 * COMMIT WILL FAIL IF ANY DOCUMENTATION IS NOT UPDATED
 *
 * This script uses content-based validation to ensure documentation
 * accurately reflects the current commit's work.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Import utilities and validators
const {
  getStagedFiles,
  categorizeChanges,
  isDocumentationStaged,
} = require("./utils/git-utils");
const { validateChangelog } = require("./validators/changelog-validator");
const { validateDevLog } = require("./validators/dev-log-validator");
const { validateReadme } = require("./validators/readme-validator");
const { validateStatus } = require("./validators/status-validator");

console.log("📚 Validating MANDATORY documentation updates...\n");
console.log("📋 ALL DOCUMENTATION FILES MUST BE UPDATED BEFORE COMMIT\n");

const validationResults = {
  passed: 0,
  failed: 0,
  details: [],
};

/**
 * Run content-based validation on all documentation files
 */
function runMandatoryValidation() {
  console.log("🔍 Checking all mandatory documentation files...\n");

  try {
    // Get staged files and categorize them
    const stagedFiles = getStagedFiles();

    if (stagedFiles.length === 0) {
      console.log("ℹ️  No files staged for commit.");
      console.log("✅ Validation skipped - nothing to commit.\n");
      return true;
    }

    console.log("📝 Changes detected:");
    console.log(`   Files staged: ${stagedFiles.length}`);

    const categories = categorizeChanges(stagedFiles);
    const hasCodeChanges =
      categories.backend.length > 0 ||
      categories.frontend.length > 0 ||
      categories.infrastructure.length > 0;

    if (!hasCodeChanges && categories.docs.length > 0) {
      console.log("   ℹ️  Documentation-only commit - relaxed validation");
    } else if (hasCodeChanges) {
      console.log("   ⚠️  Code changes detected - documentation required!");
      console.log(`   Backend: ${categories.backend.length} files`);
      console.log(`   Frontend: ${categories.frontend.length} files`);
      console.log(
        `   Infrastructure: ${categories.infrastructure.length} files`,
      );
    }
    console.log("");

    // Run validators
    const results = {
      changelog: validateChangelog(stagedFiles, categories),
      devLog: validateDevLog(stagedFiles, categories),
      readme: validateReadme(stagedFiles, categories),
      status: validateStatus(stagedFiles, categories),
    };

    // Process results
    Object.entries(results).forEach(([name, result]) => {
      const fileName = {
        changelog: "CHANGELOG.md",
        devLog: "DEVELOPMENT_LOG.md",
        readme: "README.md",
        status: "docs/development-status.md",
      }[name];

      console.log(`📄 Checking ${fileName}...`);

      if (result.valid) {
        console.log(`   ✅ PASS`);
        validationResults.passed++;
      } else {
        console.log(`   ❌ FAIL`);
        result.errors.forEach((error) => {
          console.log(`   ❌ ${error}`);
        });
        validationResults.failed++;
      }

      validationResults.details.push({
        file: fileName,
        status: result.valid ? "PASS" : "FAIL",
        errors: result.errors,
      });

      console.log("");
    });

    return validationResults.failed === 0;
  } catch (error) {
    console.error(`💥 Validation error: ${error.message}`);
    validationResults.failed++;
    return false;
  }
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
        console.log(`\n📄 ${result.file}:`);
        result.errors.forEach((error) => {
          console.log(`   ❌ ${error}`);
        });
      }
    });

    console.log("\n💡 Quick Fix Guide:");
    console.log(
      "   1. README.md: Update 'Recent Achievements' section with latest work",
    );
    console.log(
      "   2. CHANGELOG.md: Add entry with format '## [X.Y.Z] - YYYY-MM-DD' and detailed changes",
    );
    console.log(
      "   3. DEVELOPMENT_LOG.md: Add entry with format '## YYYY-MM-DD - Session Title (Session X)'",
    );
    console.log(
      "   4. docs/development-status.md: Update 'Last Updated' field to today's date",
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

  const success = runMandatoryValidation();
  const reportSuccess = generateMandatoryReport();

  process.exit(success && reportSuccess ? 0 : 1);
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
  runMandatoryValidation,
  validationResults,
};
