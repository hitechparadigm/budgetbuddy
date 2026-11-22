#!/usr/bin/env node
/**
 * DynamoDB key-in-filter check (Wave 3 design section 9.2).
 *
 * Walks non-test backend JavaScript and reports:
 *   - key-in-filter: a FilterExpression that names a key attribute (PK, SK,
 *     GSI1PK..GSI4SK). A filter on a key reads every item first and discards
 *     most of them; the key belongs in a KeyConditionExpression.
 *   - scan: a `new ScanCommand(` or `dynamoHelpers.scan(` call. A Scan reads
 *     the whole table. Code under scripts/migrations/ is exempt (it is not
 *     walked), and so is the helper's own definition in the common layer.
 *
 * Known violations are listed in scripts/dynamo-filter-allowlist.json with a
 * reason each. The check fails only when a violation is not allowlisted.
 * Allowlist entries are matched by file, rule, enclosing function and (for
 * filters) the expression text, never by line number.
 *
 * Usage: node scripts/dynamo-filter-check.js [--json]
 * Exit codes: 0 = no new violation, 1 = at least one new violation
 *
 * Node built-ins only.
 */

const fs = require('fs');
const path = require('path');
const {
  scanSource,
  findFunctions,
  enclosingFunction,
  lineIndex,
  walk,
  isTestFile,
} = require('./utils/source-scan');

const ROOT = path.join(__dirname, '..');
const ALLOWLIST_PATH = path.join(__dirname, 'dynamo-filter-allowlist.json');
const KEY_ATTRIBUTE = /(^|[^:#\w])(PK|SK|GSI[1-4](?:PK|SK))\b/;
const SCAN_HELPER_FILE = 'backend/layers/common/nodejs/utils.js';

/**
 * End offset of an expression value that starts at `start`: the first
 * top-level `,`, `;`, `}` or `)`.
 * @param {string} masked
 * @param {number} start
 * @returns {number}
 */
function valueEnd(masked, start) {
  let depth = 0;
  for (let i = start; i < masked.length; i += 1) {
    const c = masked[i];
    if (c === '(' || c === '{' || c === '[') depth += 1;
    else if (c === ')' || c === '}' || c === ']') {
      if (depth === 0) return i;
      depth -= 1;
    } else if ((c === ',' || c === ';') && depth === 0) return i;
  }
  return masked.length;
}

/**
 * Concatenated contents of every string or template literal in `code[start, end)`.
 * @param {string} code
 * @param {string} masked
 * @param {number} start
 * @param {number} end
 * @returns {string}
 */
function literalText(code, masked, start, end) {
  const parts = [];
  let i = start;
  while (i < end) {
    const q = masked[i];
    if (q === "'" || q === '"' || q === '`') {
      let j = i + 1;
      while (j < end && masked[j] !== q) j += 1;
      parts.push(code.slice(i + 1, j));
      i = j + 1;
    } else {
      i += 1;
    }
  }
  return parts.join(' ');
}

/**
 * Text a FilterExpression value can hold: its own literals, or for a bare
 * identifier the literals of every assignment, `+=` and `.push()` to that
 * identifier in the same file.
 * @param {string} code
 * @param {string} masked
 * @param {number} start
 * @param {number} end
 * @returns {string}
 */
function filterValueText(code, masked, start, end) {
  const raw = masked.slice(start, end).trim();
  if (!/^[A-Za-z_$][\w$]*$/.test(raw)) return literalText(code, masked, start, end);
  const texts = [];
  const assign = new RegExp(`\\b${raw}\\s*(?::\\s*[\\w<>\\[\\]|]+\\s*)?(\\+?=)(?!=)`, 'g');
  for (const m of masked.matchAll(assign)) {
    const s = m.index + m[0].length;
    texts.push(literalText(code, masked, s, valueEnd(masked, s)));
  }
  const push = new RegExp(`\\b${raw}\\.push\\(`, 'g');
  for (const m of masked.matchAll(push)) {
    const s = m.index + m[0].length;
    texts.push(literalText(code, masked, s, valueEnd(masked, s)));
  }
  return texts.join(' ');
}

/**
 * Find violations in one file's source.
 * @param {string} rel - repo-relative path with forward slashes
 * @param {string} src - file contents
 * @returns {Array<{ rule: string, file: string, line: number, function: string|null, expression?: string }>}
 */
function checkSource(rel, src) {
  const { code, masked } = scanSource(src);
  const fns = findFunctions(masked, code);
  const lineOf = lineIndex(src);
  const findings = [];
  const fnName = (idx) => {
    const fn = enclosingFunction(fns, idx);
    return fn ? fn.name : null;
  };

  for (const m of masked.matchAll(/\bFilterExpression\s*(?::|=(?!=))/g)) {
    const s = m.index + m[0].length;
    const e = valueEnd(masked, s);
    const text = filterValueText(code, masked, s, e);
    if (KEY_ATTRIBUTE.test(text)) {
      findings.push({
        rule: 'key-in-filter',
        file: rel,
        line: lineOf(m.index),
        function: fnName(m.index),
        expression: text.replace(/\s+/g, ' ').trim(),
      });
    }
  }

  if (rel !== SCAN_HELPER_FILE) {
    for (const m of masked.matchAll(/\bnew\s+ScanCommand\s*\(|\bdynamoHelpers\s*\.\s*scan\s*\(/g)) {
      findings.push({ rule: 'scan', file: rel, line: lineOf(m.index), function: fnName(m.index) });
    }
  }
  return findings;
}

/**
 * Stable identity of a finding or allowlist entry (no line number).
 * @param {{ rule: string, file: string, function: string|null, expression?: string }} f
 * @returns {string}
 */
function findingKey(f) {
  return [f.rule, f.file, f.function || '', f.expression || ''].join('|');
}

/**
 * Split findings into allowlisted and new, and list allowlist entries that
 * matched nothing. Entries are a multiset: two identical findings need two
 * identical entries.
 * @param {Array} findings
 * @param {Array} allowlist
 * @returns {{ allowed: Array, fresh: Array, stale: Array }}
 */
function classify(findings, allowlist) {
  const pool = new Map();
  for (const entry of allowlist) {
    const k = findingKey(entry);
    if (!pool.has(k)) pool.set(k, []);
    pool.get(k).push(entry);
  }
  const allowed = [];
  const fresh = [];
  for (const f of findings) {
    const bucket = pool.get(findingKey(f));
    if (bucket && bucket.length) allowed.push({ ...f, reason: bucket.shift().reason });
    else fresh.push(f);
  }
  const stale = [...pool.values()].flat();
  return { allowed, fresh, stale };
}

/**
 * Run the check over the repository.
 * @param {{ root?: string, allowlist?: Array }} [opts]
 * @returns {{ findings: Array, allowed: Array, fresh: Array, stale: Array, files: number }}
 */
function run(opts = {}) {
  const root = opts.root || ROOT;
  const allowlist = opts.allowlist || JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf-8')).entries;
  const files = walk(path.join(root, 'backend'), ['.js']).filter((f) => !isTestFile(f));
  const findings = [];
  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    findings.push(...checkSource(rel, fs.readFileSync(file, 'utf-8')));
  }
  return { findings, files: files.length, ...classify(findings, allowlist) };
}

function main() {
  const result = run();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`DynamoDB key-in-filter check: ${result.files} files, ${result.findings.length} findings`);
    for (const f of result.allowed) {
      const what = f.rule === 'scan' ? 'Scan' : `FilterExpression "${f.expression}"`;
      console.log(`  allowlisted  ${f.file}:${f.line} (${f.function || 'top level'}) ${what} - ${f.reason}`);
    }
    for (const f of result.fresh) {
      const what = f.rule === 'scan' ? 'Scan' : `FilterExpression "${f.expression}"`;
      console.error(`\u274c NEW        ${f.file}:${f.line} (${f.function || 'top level'}) ${what}`);
    }
    for (const s of result.stale) {
      console.warn(`\u26a0\ufe0f  stale allowlist entry (matches nothing, remove it): ${findingKey(s)}`);
    }
    if (result.fresh.length) {
      console.error('Put the key attribute in a KeyConditionExpression (or a GSI query) instead of a filter,');
      console.error('and replace Scans with a Query. See .kiro/steering/gotchas.md.');
    } else {
      console.log('\u2705 No new key-in-filter or Scan violations');
    }
  }
  process.exit(result.fresh.length ? 1 : 0);
}

if (require.main === module) {
  main();
}

module.exports = { checkSource, classify, findingKey, run, KEY_ATTRIBUTE };
