#!/usr/bin/env node
/**
 * Consistency Check - Modular Architecture Guardrails
 *
 * Runs one or all of four read-only checks that keep documentation and
 * generated files in sync with the source of truth they describe.
 * Never modifies CDK stacks, API Gateway resources, or DynamoDB.
 *
 * Usage:
 *   node scripts/consistency-check.js                  # run all checks
 *   node scripts/consistency-check.js --check=shared-docs
 *   node scripts/consistency-check.js --check=app-drift
 *   node scripts/consistency-check.js --check=stack-manifest
 *   node scripts/consistency-check.js --check=gateway-routing
 *
 * Exit codes: 0 = all requested checks passed, 1 = at least one mismatch found
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/**
 * Shared helper used by checkAppDrift() and checkStackManifest(): extracts the
 * set of CDK stack slugs from a source string via its `${stackPrefix}-<slug>`
 * template-literal construction pattern.
 * @param {string} source - file contents to scan (app.ts or app.js)
 * @returns {Set<string>} the set of stack slugs found
 */
function extractStackSlugs(source) {
  const slugs = new Set();
  for (const m of source.matchAll(/\$\{stackPrefix\}-([a-z-]+)`/g)) {
    slugs.add(m[1]);
  }
  return slugs;
}

function checkSharedDocs() {
  const readmePath = path.join(ROOT, 'packages/shared/README.md');
  const indexPath = path.join(ROOT, 'packages/shared/src/index.ts');
  const readme = fs.readFileSync(readmePath, 'utf-8');
  const index = fs.readFileSync(indexPath, 'utf-8');

  // Extract top-level directories referenced from index.ts's barrel exports
  const exportDirs = new Set();
  for (const m of index.matchAll(/export \* from '\.\/([^']+)'/g)) {
    exportDirs.add(m[1].split('/')[0]); // top-level dir under src/
  }

  // Extract directories the README claims to document
  const documentedDirs = new Set();
  for (const m of readme.matchAll(/`src\/([^/]+)\/`/g)) {
    documentedDirs.add(m[1]);
  }

  const undocumented = [...exportDirs].filter((d) => !documentedDirs.has(d));
  const stale = [...documentedDirs].filter(
    (d) => !exportDirs.has(d) && !fs.existsSync(path.join(ROOT, 'packages/shared/src', d))
  );

  if (undocumented.length) {
    console.error(`\u274c Undocumented exports in packages/shared: ${undocumented.join(', ')}`);
  }
  if (stale.length) {
    console.error(`\u274c README documents non-existent modules: ${stale.join(', ')}`);
  }
  if (!undocumented.length && !stale.length) {
    console.log('\u2705 packages/shared README matches actual exports');
  }
  return !undocumented.length && !stale.length;
}
function checkAppDrift() { /* Requirement 2 - implemented in task 3.1 */ }
function checkStackManifest() { /* Requirement 3 - implemented in task 5.1 */ }
function checkGatewayRouting() { /* Requirement 4 - implemented in task 7.1 */ }

const CHECKS = {
  'shared-docs': checkSharedDocs,
  'app-drift': checkAppDrift,
  'stack-manifest': checkStackManifest,
  'gateway-routing': checkGatewayRouting,
};

function main() {
  const arg = process.argv.find((a) => a.startsWith('--check='));
  const selected = arg ? [arg.split('=')[1]] : Object.keys(CHECKS);

  let failed = false;
  for (const name of selected) {
    const fn = CHECKS[name];
    if (!fn) {
      console.error(`\u274c Unknown check: ${name}`);
      process.exit(1);
    }
    console.log(`\n\ud83d\udd0d Running check: ${name}`);
    const ok = fn();
    if (!ok) failed = true;
  }

  process.exit(failed ? 1 : 0);
}

main();