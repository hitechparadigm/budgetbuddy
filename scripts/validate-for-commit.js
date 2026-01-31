#!/usr/bin/env node

/**
 * Validation Runner - Runs ALL pre-commit checks
 * Returns exit code 0 if all pass, 1 if any fail
 *
 * This script mimics what git hooks do, allowing Kiro to validate
 * before committing when working autonomously.
 */

const { execSync } = require("child_process");

console.log("🔍 Running pre-commit validation checks...\n");

let allPassed = true;
const results = [];

// 1. Security Check
try {
  console.log("1️⃣  Security validation...");
  execSync("npm run security:pre-commit", { stdio: "inherit" });
  results.push({ check: "Security", status: "PASS" });
} catch (error) {
  results.push({ check: "Security", status: "FAIL" });
  allPassed = false;
}

// 2. Linting
try {
  console.log("\n2️⃣  ESLint validation...");
  execSync("npm run lint:check", { stdio: "inherit" });
  results.push({ check: "Linting", status: "PASS" });
} catch (error) {
  results.push({ check: "Linting", status: "FAIL" });
  allPassed = false;
}

// 3. Type Checking
try {
  console.log("\n3️⃣  TypeScript validation...");
  execSync("npm run type-check", { stdio: "inherit" });
  results.push({ check: "Type Check", status: "PASS" });
} catch (error) {
  results.push({ check: "Type Check", status: "FAIL" });
  allPassed = false;
}

// 4. Documentation
try {
  console.log("\n4️⃣  Documentation validation...");
  execSync("npm run docs:validate", { stdio: "inherit" });
  results.push({ check: "Documentation", status: "PASS" });
} catch (error) {
  results.push({ check: "Documentation", status: "FAIL" });
  allPassed = false;
}

// Summary
console.log("\n" + "=".repeat(50));
console.log("VALIDATION SUMMARY");
console.log("=".repeat(50));
results.forEach((r) => {
  const icon = r.status === "PASS" ? "✅" : "❌";
  console.log(`${icon} ${r.check}: ${r.status}`);
});
console.log("=".repeat(50));

if (allPassed) {
  console.log("\n✅ ALL VALIDATION CHECKS PASSED");
  console.log("✅ Safe to commit and push\n");
  process.exit(0);
} else {
  console.log("\n❌ VALIDATION FAILED");
  console.log("❌ Fix issues before committing\n");
  process.exit(1);
}
