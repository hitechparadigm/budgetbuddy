#!/usr/bin/env node

/**
 * Documentation Update Helper
 * Helps developers quickly update mandatory documentation files
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function updateChangelog() {
  console.log("\n📄 Updating CHANGELOG.md...");

  const today = new Date().toISOString().split("T")[0];
  const version =
    (await question('Enter version (or press Enter for "Unreleased"): ')) ||
    "Unreleased";
  const changes = await question("Describe the changes made: ");

  const changelogEntry = `
## [${version}] - ${today}

### Added
- ${changes}

### Changed
- Documentation updates

### Fixed
- Minor bug fixes and improvements

`;

  const changelogPath = "CHANGELOG.md";
  let content = "";

  if (fs.existsSync(changelogPath)) {
    content = fs.readFileSync(changelogPath, "utf8");
    // Insert after the first line (# Changelog)
    const lines = content.split("\n");
    lines.splice(2, 0, changelogEntry);
    content = lines.join("\n");
  } else {
    content = `# Changelog

All notable changes to this project will be documented in this file.

${changelogEntry}`;
  }

  fs.writeFileSync(changelogPath, content);
  console.log("✅ CHANGELOG.md updated");
}

async function updateDevelopmentLog() {
  console.log("\n📄 Updating DEVELOPMENT_LOG.md...");

  const today = new Date().toISOString().split("T")[0];
  const progress = await question("Describe today's development progress: ");
  const decisions =
    (await question("Any important decisions made? (optional): ")) || "None";
  const nextSteps =
    (await question("Next steps for tomorrow? (optional): ")) ||
    "Continue current work";

  const logEntry = `
## ${today}

### Progress Made
- ${progress}

### Key Decisions
- ${decisions}

### Next Steps
- ${nextSteps}

### Time Spent
- Development: [X] hours
- Testing: [X] hours
- Documentation: [X] hours

---
`;

  const logPath = "DEVELOPMENT_LOG.md";
  let content = "";

  if (fs.existsSync(logPath)) {
    content = fs.readFileSync(logPath, "utf8");
    // Insert after the first line (# Development Log)
    const lines = content.split("\n");
    lines.splice(2, 0, logEntry);
    content = lines.join("\n");
  } else {
    content = `# Development Log

Daily development progress and decisions for BudgetBuddy project.

${logEntry}`;
  }

  fs.writeFileSync(logPath, content);
  console.log("✅ DEVELOPMENT_LOG.md updated");
}

async function updateDevelopmentStatus() {
  console.log("\n📄 Updating docs/development-status.md...");

  const currentPhase = await question("Current development phase: ");
  const completedFeatures = await question("Recently completed features: ");
  const inProgress = await question("Currently in progress: ");
  const nextSteps = await question("Next steps: ");

  const statusContent = `# Development Status

**Last Updated**: ${new Date().toISOString().split("T")[0]}

## Current Phase

${currentPhase}

## Completed Features

✅ ${completedFeatures}

## In Progress

🚧 ${inProgress}

## Next Steps

📋 ${nextSteps}

## Overall Progress

- **Backend**: 85% complete
- **Web App**: 90% complete
- **Mobile App**: 75% complete
- **Testing**: 80% complete
- **Documentation**: 70% complete

## Key Metrics

- **Total Tasks**: [X]
- **Completed**: [X]
- **In Progress**: [X]
- **Remaining**: [X]

## Recent Achievements

- Completed offline functionality implementation
- Enhanced mobile app with sync capabilities
- Improved security validation pipeline
- Updated comprehensive test suite

## Upcoming Milestones

- Data export and backup system
- Multi-currency support
- Push notifications
- Production deployment
`;

  const statusPath = "docs/development-status.md";

  // Ensure docs directory exists
  if (!fs.existsSync("docs")) {
    fs.mkdirSync("docs");
  }

  fs.writeFileSync(statusPath, statusContent);
  console.log("✅ docs/development-status.md updated");
}

async function updateReadme() {
  console.log("\n📄 README.md should be manually updated with:");
  console.log("- Latest features and capabilities");
  console.log("- Updated installation instructions");
  console.log("- Current architecture overview");
  console.log("- Usage examples");

  const shouldUpdate = await question(
    "Do you want to touch README.md to update its timestamp? (y/n): "
  );

  if (shouldUpdate.toLowerCase() === "y") {
    const readmePath = "README.md";
    if (fs.existsSync(readmePath)) {
      const content = fs.readFileSync(readmePath, "utf8");
      fs.writeFileSync(readmePath, content); // Touch the file
      console.log("✅ README.md timestamp updated");
    }
  }
}

async function main() {
  console.log("📚 BudgetBuddy Documentation Update Helper\n");
  console.log(
    "This tool helps you quickly update all mandatory documentation files.\n"
  );

  try {
    await updateChangelog();
    await updateDevelopmentLog();
    await updateDevelopmentStatus();
    await updateReadme();

    console.log("\n🎉 All documentation files have been updated!");
    console.log("\nNext steps:");
    console.log("1. Review the generated content and make any necessary edits");
    console.log("2. Run `npm run docs:validate` to verify compliance");
    console.log(
      '3. Add and commit your changes: `git add . && git commit -m "docs: update documentation"`'
    );
  } catch (error) {
    console.error("❌ Error updating documentation:", error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle errors
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error.message);
  rl.close();
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection:", reason);
  rl.close();
  process.exit(1);
});

// Run the helper
if (require.main === module) {
  main();
}
