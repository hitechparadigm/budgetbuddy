#!/usr/bin/env node
/**
 * Run unit tests for all Lambda functions and report results.
 * Usage: node scripts/run-all-tests.js
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const FUNCTIONS_DIR = path.join(ROOT, 'backend', 'functions');

const functions = fs.readdirSync(FUNCTIONS_DIR).filter(name => {
  const pkgPath = path.join(FUNCTIONS_DIR, name, 'package.json');
  return fs.existsSync(pkgPath);
});

const results = [];
let totalPassed = 0;
let totalFailed = 0;
let totalSkipped = 0;

console.log(`\n${'='.repeat(70)}`);
console.log('  BudgetBuddy — Lambda Unit Test Suite');
console.log(`${'='.repeat(70)}\n`);

for (const fn of functions) {
  const fnDir = path.join(FUNCTIONS_DIR, fn);

  // Check if there are any test files
  const testFiles = fs.readdirSync(fnDir).filter(f => f.endsWith('.test.js'));
  if (testFiles.length === 0) {
    results.push({ fn, status: 'SKIP', passed: 0, failed: 0, message: 'no test files' });
    totalSkipped++;
    continue;
  }

  // Install deps if needed
  if (!fs.existsSync(path.join(fnDir, 'node_modules'))) {
    try {
      execSync('npm install --silent', { cwd: fnDir, stdio: 'pipe' });
    } catch (e) {
      results.push({ fn, status: 'ERROR', passed: 0, failed: 0, message: 'npm install failed' });
      continue;
    }
  }

  try {
    const output = execSync('npx jest --no-coverage --forceExit 2>&1', {
      cwd: fnDir,
      stdio: 'pipe',
      timeout: 60000,
      encoding: 'utf8'
    });

    const testsMatch = output.match(/Tests:\s+(\d+) passed(?:,\s+(\d+) total)?/);
    const passed = testsMatch ? parseInt(testsMatch[1]) : 0;
    totalPassed += passed;
    results.push({ fn, status: 'PASS', passed, failed: 0, message: `${passed} tests passed` });
    process.stdout.write(`  ✅ ${fn.padEnd(30)} ${passed} passed\n`);
  } catch (e) {
    const output = e.stdout || '';
    const failMatch = output.match(/Tests:\s+(\d+) failed(?:,\s+(\d+) passed)?(?:,\s+(\d+) total)?/);
    const passMatch = output.match(/(\d+) passed/);
    const failed = failMatch ? parseInt(failMatch[1]) : 0;
    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    totalFailed += failed;
    totalPassed += passed;

    // Extract failing test names
    const failingTests = [];
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('● ') && !line.includes('console')) {
        failingTests.push(line.trim().replace(/^●\s+/, ''));
      }
    }

    results.push({ fn, status: 'FAIL', passed, failed, message: failingTests.slice(0, 3).join('; ') });
    process.stdout.write(`  ❌ ${fn.padEnd(30)} ${failed} failed, ${passed} passed\n`);
    if (failingTests.length > 0) {
      failingTests.slice(0, 3).forEach(t => process.stdout.write(`     └─ ${t}\n`));
    }
  }
}

console.log(`\n${'='.repeat(70)}`);
console.log('  SUMMARY');
console.log(`${'='.repeat(70)}`);
console.log(`  Total passed:  ${totalPassed}`);
console.log(`  Total failed:  ${totalFailed}`);
console.log(`  Skipped:       ${totalSkipped} (no test files)`);
console.log(`  Functions:     ${functions.length}`);

const failedFunctions = results.filter(r => r.status === 'FAIL');
if (failedFunctions.length > 0) {
  console.log(`\n  Failed functions (${failedFunctions.length}):`);
  failedFunctions.forEach(r => {
    console.log(`    ❌ ${r.fn}: ${r.failed} failed — ${r.message}`);
  });
}

const skippedFunctions = results.filter(r => r.status === 'SKIP');
if (skippedFunctions.length > 0) {
  console.log(`\n  No tests (${skippedFunctions.length}): ${skippedFunctions.map(r => r.fn).join(', ')}`);
}

console.log(`\n${'='.repeat(70)}\n`);

process.exit(totalFailed > 0 ? 1 : 0);
