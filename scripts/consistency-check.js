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

function checkAppDrift() {
  const ts = fs.readFileSync(path.join(ROOT, 'infrastructure/bin/app.ts'), 'utf-8');
  const js = fs.readFileSync(path.join(ROOT, 'infrastructure/bin/app.js'), 'utf-8');

  const tsSlugs = extractStackSlugs(ts);
  const jsSlugs = extractStackSlugs(js);

  const onlyInTs = [...tsSlugs].filter((s) => !jsSlugs.has(s));
  const onlyInJs = [...jsSlugs].filter((s) => !tsSlugs.has(s));

  if (onlyInTs.length || onlyInJs.length) {
    console.error('\u274c app.ts and app.js stack lists differ:');
    if (onlyInTs.length) console.error(`   Only in app.ts: ${onlyInTs.join(', ')}`);
    if (onlyInJs.length) console.error(`   Only in app.js: ${onlyInJs.join(', ')}`);
    return false;
  }
  console.log('\u2705 app.ts and app.js instantiate the same stacks');
  return true;
}

function checkStackManifest() {
  const ts = fs.readFileSync(path.join(ROOT, 'infrastructure/bin/app.ts'), 'utf-8');
  const tsSlugs = extractStackSlugs(ts);

  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'infrastructure/stack-manifest.json'), 'utf-8'));
  const manifestSlugs = new Set(manifest.stacks.map((s) => s.slug));

  const onlyInApp = [...tsSlugs].filter((s) => !manifestSlugs.has(s));
  const onlyInManifest = [...manifestSlugs].filter((s) => !tsSlugs.has(s));

  if (onlyInApp.length || onlyInManifest.length) {
    console.error('\u274c stack-manifest.json is out of sync with app.ts:');
    if (onlyInApp.length) console.error(`   In app.ts, missing from manifest: ${onlyInApp.join(', ')}`);
    if (onlyInManifest.length) console.error(`   In manifest, missing from app.ts: ${onlyInManifest.join(', ')}`);
    return false;
  }
  console.log('\u2705 stack-manifest.json matches app.ts');
  return true;
}
const API_STACK_FILES = {
  'api-stack.ts': 'apiBaseUrl',
  'api-features-stack.ts': 'featuresApiUrl',
  'api-features-extended-stack.ts': 'extendedFeaturesApiUrl',
  'api-budgets-stack.ts': 'budgetsApiUrl',
};

/**
 * Extracts every top-level API Gateway route prefix created via
 * `this.api.root.addResource('<prefix>')` in a CDK API stack source string.
 * @param {string} source - file contents of a CDK API stack file
 * @returns {Set<string>} the set of route prefixes found
 */
function extractRoutePrefixes(source) {
  const prefixes = new Set();
  for (const m of source.matchAll(/this\.api\.root\.addResource\('([a-z0-9-]+)'\)/g)) {
    prefixes.add(m[1]);
  }
  return prefixes;
}

function checkGatewayRouting() {
  const mapDoc = fs.readFileSync(path.join(ROOT, 'docs/gateway-routing-map.md'), 'utf-8');
  const documented = new Set([...mapDoc.matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]));

  const undocumented = [];
  for (const [file, gatewayKey] of Object.entries(API_STACK_FILES)) {
    const source = fs.readFileSync(path.join(ROOT, 'infrastructure/lib', file), 'utf-8');
    const prefixes = extractRoutePrefixes(source);
    for (const prefix of prefixes) {
      if (!documented.has(prefix)) {
        undocumented.push(`${prefix} (${file} -> ${gatewayKey})`);
      }
    }
  }

  if (undocumented.length) {
    console.error(`\u274c Undocumented route prefixes: ${undocumented.join(', ')}`);
    console.error('   Add each to docs/gateway-routing-map.md under its owning gateway.');
    return false;
  }
  console.log('\u2705 All CDK route prefixes are documented in gateway-routing-map.md');
  return true;
}

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

if (require.main === module) {
  main();
}

module.exports = {
  extractStackSlugs,
  extractRoutePrefixes,
  checkSharedDocs,
  checkAppDrift,
  checkStackManifest,
  checkGatewayRouting,
  CHECKS,
};