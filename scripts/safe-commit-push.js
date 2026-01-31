#!/usr/bin/env node

/**
 * Safe Commit and Push - Validates before committing
 *
 * This script ensures that all validation checks pass before
 * committing and pushing code. It's designed for autonomous
 * development where Kiro needs to commit safely.
 *
 * Usage:
 *   node scripts/safe-commit-push.js "commit message"
 */

const { execSync } = require("child_process");

function main() {
  console.log("🔒 Safe Commit and Push Workflow\n");

  // Get commit message from command line argument
  const message = process.argv[2];
  if (!message) {
    console.error("❌ Error: Commit message required");
    console.error('Usage: node scripts/safe-commit-push.js "commit message"');
    process.exit(1);
  }

  // Step 1: Validate
  console.log("Step 1: Running validation...\n");
  try {
    execSync("node scripts/validate-for-commit.js", { stdio: "inherit" });
  } catch (error) {
    console.log("\n❌ Validation failed. Cannot commit.");
    console.log("Fix the issues and try again.\n");
    process.exit(1);
  }

  // Step 2: Stage changes
  console.log("\nStep 2: Staging changes...");
  try {
    execSync("git add .", { stdio: "inherit" });
    console.log("✅ Changes staged\n");
  } catch (error) {
    console.log("❌ Failed to stage changes\n");
    process.exit(1);
  }

  // Step 3: Commit
  console.log("Step 3: Committing changes...");
  try {
    // Escape double quotes in commit message
    const escapedMessage = message.replace(/"/g, '\\"');
    execSync(`git commit -m "${escapedMessage}"`, { stdio: "inherit" });
    console.log("✅ Commit successful\n");
  } catch (error) {
    console.log("❌ Commit failed\n");
    process.exit(1);
  }

  // Step 4: Push
  console.log("Step 4: Pushing to remote...");
  try {
    execSync("git push origin develop", { stdio: "inherit" });
    console.log("✅ Push successful\n");
  } catch (error) {
    console.log("❌ Push failed\n");
    console.log("Note: Commit was successful but push failed.");
    console.log("You may need to pull changes first or resolve conflicts.\n");
    process.exit(1);
  }

  console.log("✅ Safe commit and push completed successfully!\n");
}

main();
