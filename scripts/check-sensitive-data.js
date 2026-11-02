#!/usr/bin/env node
/**
 * Sensitive-data scanner for BudgetBuddy.
 *
 * Enforces .kiro/steering/data-protection.md. Flags secrets, free-mail email addresses, AWS
 * account IDs and local home paths, either in every tracked file (--all, the default) or only
 * in the lines added by the staged diff (--staged, used by .husky/pre-commit).
 *
 * Output is `<file>:<line>  <category>` per finding plus one summary line. The matched value
 * is never printed, so the report itself cannot leak what it found.
 *
 * Allowed values and excluded paths live in .sensitive-data-allowlist. Tracked code holds only
 * generic patterns. Terms that are themselves protected (real names, employer-internal system
 * or profile names) must never appear in the repo, so they are loaded at run time from the
 * optional, git-ignored .sensitive-data-patterns.local at the repo root, one regular
 * expression per line, `#` comments allowed. Its matches report as `local-pattern`. When the
 * file does not exist, only the generic patterns run.
 *
 * Exit codes: 0 = clean, 1 = findings, 2 = usage, git or pattern-file error.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const ALLOWLIST_FILE = '.sensitive-data-allowlist';
const LOCAL_PATTERNS_FILE = '.sensitive-data-patterns.local';
const BINARY_EXTENSIONS = /\.(png|jpe?g|gif|webp|ico|pdf|woff2?)$/i;
const BINARY_SNIFF_BYTES = 8192;
const SOURCE_MAP_MARKER = 'sourceMappingURL=data:';

// Credential names. Kept lowercase and one per line so the literal greps in
// scripts/security-check.sh do not read this list as an assignment.
const CREDENTIAL_NAMES = [
  'password',
  'passwd',
  'secret',
  'token',
  'api[_-]?key',
];

// A quoted value containing any of these is a reference or a fixture, not a credential.
const CREDENTIAL_VALUE_IGNORE = [
  'process.env',
  '${',
  '<',
  'example',
  'test',
  'mock',
  'fake',
  'dummy',
  'placeholder',
  'changeme',
  'xxx',
];

const FREE_MAIL_DOMAINS = [
  'gmail',
  'googlemail',
  'hotmail',
  'outlook',
  'live',
  'msn',
  'yahoo',
  'ymail',
  'icloud',
  'me',
  'aol',
  'proton',
  'protonmail',
  'pm',
  'gmx',
  'yandex',
  'zoho',
];

const CREDENTIAL_NAME_IN_VALUE = new RegExp('(?:' + CREDENTIAL_NAMES.join('|') + ')', 'i');

/**
 * Built-in detection patterns. `valueGroup` names the capture group that holds the sensitive
 * value; allowlist checks and value filters apply to that group instead of the whole match.
 */
const PATTERNS = [
  {
    category: 'jwt',
    regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/dg,
    skipLine: (line) => line.includes(SOURCE_MAP_MARKER),
  },
  {
    category: 'aws-access-key-id',
    regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/dg,
  },
  {
    category: 'private-key',
    regex: new RegExp('-----BEGIN (?:[A-Z0-9]+ )*' + 'PRIV' + 'ATE KEY-----', 'dg'),
  },
  {
    category: 'credential-assignment',
    regex: new RegExp(
      '(?:' + CREDENTIAL_NAMES.join('|') + ')[A-Za-z0-9_]*["\']?\\s*[:=]\\s*' +
        '(["\'`])([^"\'`\\r\\n]{8,})\\1',
      'dgi'
    ),
    valueGroup: 2,
    ignoreValue: isIgnoredCredentialValue,
  },
  {
    category: 'free-mail-email',
    regex: new RegExp(
      '(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@(?:' + FREE_MAIL_DOMAINS.join('|') + ')' +
        '\\.[A-Za-z]{2,}(?:\\.[A-Za-z]{2,})?(?![A-Za-z0-9-])',
      'dgi'
    ),
  },
  {
    category: 'aws-account-id',
    regex: /\barn:aws[a-z-]*:[a-z0-9-]*:[a-z0-9-]*:(\d{12})(?!\d)/dgi,
    valueGroup: 1,
  },
  {
    category: 'aws-account-id',
    regex: /account(?:[_-]?id)?["']?\s*[:=]\s*["']?(\d{12})(?!\d)/dgi,
    valueGroup: 1,
  },
  {
    // Drive-letter, Git Bash, Linux and macOS home directories. The name must start with a
    // letter or digit, so placeholders such as <name> or %USERPROFILE% do not match.
    category: 'home-path',
    regex: new RegExp(
      '(?:\\b[A-Za-z]:(?:\\\\+|/)Users(?:\\\\+|/)' +
        '|(?<![\\w.~-])/[a-z]/Users/' +
        '|(?<![\\w.~-])/ho' + 'me/' +
        '|(?<![\\w.~-])/Users/(?=[A-Za-z0-9][\\w.-]*/))' +
        '[A-Za-z0-9]',
      'dg'
    ),
  },
];

/**
 * True when a quoted credential value is a reference, fixture or message rather than a
 * literal credential.
 * @param {string} value
 * @returns {boolean}
 */
function isIgnoredCredentialValue(value) {
  const lower = value.toLowerCase();
  if (CREDENTIAL_VALUE_IGNORE.some((word) => lower.includes(word))) return true;
  // Messages and labels contain spaces; storage keys and env names repeat the credential word.
  if (/\s/.test(value)) return true;
  return CREDENTIAL_NAME_IN_VALUE.test(value);
}

/**
 * Builds `local-pattern` detectors from the lines of the local patterns file.
 * @param {string} text file content, one regular expression per line, `#` comments
 * @returns {{category: string, regex: RegExp}[]}
 * @throws {Error} naming the line number (never the pattern) when a line is not a valid regex
 */
function parseLocalPatterns(text) {
  const patterns = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    try {
      patterns.push({ category: 'local-pattern', regex: new RegExp(line, 'dgi') });
    } catch {
      throw new Error(
        `check-sensitive-data: invalid regular expression on line ${index + 1} of ${LOCAL_PATTERNS_FILE}`
      );
    }
  });
  return patterns;
}

/**
 * Finds every sensitive value in one line of text.
 * @param {string} text the line
 * @param {{category: string, regex: RegExp}[]} [extraPatterns] e.g. local patterns
 * @returns {{category: string, match: string, index: number}[]} `match`/`index` describe the
 *   sensitive value itself (the capture group for patterns that define one)
 */
function scanLine(text, extraPatterns = []) {
  const results = [];
  for (const pattern of PATTERNS.concat(extraPatterns)) {
    if (pattern.skipLine && pattern.skipLine(text)) continue;
    for (const found of text.matchAll(pattern.regex)) {
      const group = pattern.valueGroup || 0;
      const value = found[group];
      if (value === undefined) continue;
      if (pattern.ignoreValue && pattern.ignoreValue(value)) continue;
      results.push({ category: pattern.category, match: value, index: found.indices[group][0] });
    }
  }
  return results;
}

/**
 * Parses the allowlist file.
 * @param {string} text one entry per line; `#` comments; `path:<prefix>` excludes files,
 *   anything else is an exact value allowed case-insensitively
 * @returns {{values: string[], paths: string[]}}
 */
function parseAllowlist(text) {
  const allowlist = { values: [], paths: [] };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('path:')) {
      const prefix = line.slice('path:'.length).trim().replace(/\\/g, '/');
      if (prefix) allowlist.paths.push(prefix);
    } else {
      allowlist.values.push(line.toLowerCase());
    }
  }
  return allowlist;
}

/**
 * True when a finding is permitted: the file is under an allowlisted path prefix, the value
 * equals an allowlisted value, or the value lies inside an occurrence of an allowlisted value
 * on the same line (so a local pattern matching part of an allowed address is permitted).
 * @param {{match: string, index?: number}} match a result of scanLine
 * @param {string} filePath repo-relative path
 * @param {{values: string[], paths: string[]}} allowlist
 * @param {string} [lineText] the scanned line, needed for the containment check
 * @returns {boolean}
 */
function isAllowed(match, filePath, allowlist, lineText) {
  const normalizedPath = String(filePath).replace(/\\/g, '/');
  if (allowlist.paths.some((prefix) => normalizedPath.startsWith(prefix))) return true;
  const value = match.match.toLowerCase();
  if (allowlist.values.includes(value)) return true;
  if (typeof lineText !== 'string' || typeof match.index !== 'number') return false;

  const lowerLine = lineText.toLowerCase();
  const start = match.index;
  const end = start + match.match.length;
  return allowlist.values.some((allowed) => {
    let from = lowerLine.indexOf(allowed);
    while (from !== -1) {
      if (from <= start && from + allowed.length >= end) return true;
      from = lowerLine.indexOf(allowed, from + 1);
    }
    return false;
  });
}

/**
 * Extracts the added lines of a `git diff --cached -U0` with their new-file line numbers.
 * @param {string} diffText
 * @returns {{file: string, line: number, text: string}[]}
 */
function parseStagedDiff(diffText) {
  const added = [];
  let file = null;
  let lineNo = 0;
  let inHunk = false;

  for (const rawLine of diffText.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (line.startsWith('diff --git ')) {
      file = null;
      inHunk = false;
      continue;
    }
    if (!inHunk) {
      if (line.startsWith('+++ ')) {
        const target = line.slice(4).replace(/^"(.*)"$/, '$1');
        file = target === '/dev/null' ? null : target.replace(/^b\//, '');
      }
      if (!line.startsWith('@@')) continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk) {
      inHunk = true;
      lineNo = Number(hunk[1]);
      continue;
    }
    if (line.startsWith('+')) {
      if (file) added.push({ file, line: lineNo, text: line.slice(1) });
      lineNo += 1;
    } else if (line.startsWith(' ')) {
      lineNo += 1;
    }
    // '-' (removed) and '\' (no newline at end of file) lines do not advance the new file.
  }
  return added;
}

/**
 * Scans one line and returns at most one finding per category that the allowlist does not
 * permit.
 */
function scanEntry(file, lineNo, text, opts) {
  const findings = [];
  const seen = new Set();
  for (const match of scanLine(text, opts.localPatterns || [])) {
    if (seen.has(match.category)) continue;
    if (isAllowed(match, file, opts.allowlist, text)) continue;
    seen.add(match.category);
    findings.push({ file, line: lineNo, category: match.category });
  }
  return findings;
}

function isAllowlistedPath(file, allowlist) {
  return allowlist.paths.some((prefix) => file.startsWith(prefix));
}

/**
 * Scans whole files.
 * @param {string[]} files repo-relative paths
 * @param {{root: string, allowlist: {values: string[], paths: string[]},
 *   localPatterns?: object[], readFile?: function(string): Buffer}} opts
 * @returns {{findings: {file: string, line: number, category: string}[], scanned: number}}
 */
function scanFiles(files, opts) {
  const readFile = opts.readFile || ((absPath) => fs.readFileSync(absPath));
  const findings = [];
  let scanned = 0;

  for (const file of files) {
    if (BINARY_EXTENSIONS.test(file) || isAllowlistedPath(file, opts.allowlist)) continue;
    let buffer;
    try {
      buffer = readFile(path.join(opts.root, file));
    } catch {
      continue; // deleted in the working tree or unreadable; nothing to scan
    }
    if (buffer.subarray(0, BINARY_SNIFF_BYTES).includes(0)) continue;
    scanned += 1;
    buffer
      .toString('utf8')
      .split(/\r?\n/)
      .forEach((text, index) => {
        findings.push(...scanEntry(file, index + 1, text, opts));
      });
  }
  return { findings, scanned };
}

/**
 * Scans the added lines of a staged diff.
 * @param {{file: string, line: number, text: string}[]} entries from parseStagedDiff
 * @param {object} opts as for scanFiles
 */
function scanAddedLines(entries, opts) {
  const findings = [];
  const files = new Set();
  for (const entry of entries) {
    if (BINARY_EXTENSIONS.test(entry.file) || isAllowlistedPath(entry.file, opts.allowlist)) {
      continue;
    }
    files.add(entry.file);
    findings.push(...scanEntry(entry.file, entry.line, entry.text, opts));
  }
  return { findings, scanned: files.size };
}

function git(args, cwd) {
  return childProcess.execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function readOptionalFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

function printUsage(log) {
  log('Usage: node scripts/check-sensitive-data.js [--all | --staged]');
  log('  --all     scan every tracked file (default)');
  log('  --staged  scan only the lines added in the staged diff');
}

function summarize(findings) {
  const counts = {};
  for (const finding of findings) counts[finding.category] = (counts[finding.category] || 0) + 1;
  return Object.keys(counts)
    .sort()
    .map((category) => `${category}=${counts[category]}`)
    .join(', ');
}

/**
 * CLI entry point.
 * @param {string[]} argv arguments after the script name
 * @returns {number} exit code
 */
function main(argv = process.argv.slice(2)) {
  const known = new Set(['--all', '--staged', '--help', '-h']);
  const unknown = argv.filter((arg) => !known.has(arg));
  if (unknown.length > 0 || (argv.includes('--all') && argv.includes('--staged'))) {
    printUsage(console.error);
    return 2;
  }
  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage(console.log);
    return 0;
  }
  const mode = argv.includes('--staged') ? 'staged' : 'all';

  let root;
  try {
    root = git(['rev-parse', '--show-toplevel'], process.cwd()).trim();
  } catch {
    console.error('check-sensitive-data: not inside a git repository, or git is unavailable');
    return 2;
  }

  let opts;
  try {
    const allowlistText = readOptionalFile(path.join(root, ALLOWLIST_FILE));
    const localText = readOptionalFile(path.join(root, LOCAL_PATTERNS_FILE));
    opts = {
      root,
      allowlist: parseAllowlist(allowlistText || ''),
      localPatterns: localText ? parseLocalPatterns(localText) : [],
    };
  } catch (error) {
    console.error(error.message);
    return 2;
  }

  let result;
  try {
    if (mode === 'staged') {
      const diff = git(
        ['-c', 'core.quotePath=false', 'diff', '--cached', '-U0', '--no-color', '--no-ext-diff',
          '--diff-filter=ACMR'],
        root
      );
      result = scanAddedLines(parseStagedDiff(diff), opts);
    } else {
      const listing = git(['-c', 'core.quotePath=false', 'ls-files', '-z'], root);
      result = scanFiles(listing.split('\0').filter(Boolean), opts);
    }
  } catch {
    console.error(`check-sensitive-data: git command failed in --${mode} mode`);
    return 2;
  }

  const unit = mode === 'staged' ? 'staged file(s)' : 'file(s)';
  for (const finding of result.findings) {
    console.log(`${finding.file}:${finding.line}  ${finding.category}`);
  }
  if (result.findings.length === 0) {
    console.log(`check-sensitive-data: no findings (${result.scanned} ${unit} scanned)`);
    return 0;
  }
  const fileCount = new Set(result.findings.map((finding) => finding.file)).size;
  console.log(
    `check-sensitive-data: ${result.findings.length} finding(s) in ${fileCount} file(s) ` +
      `(${result.scanned} ${unit} scanned) [${summarize(result.findings)}]`
  );
  console.error(
    'See .kiro/steering/data-protection.md: mask the value, or add an allowed value to ' +
      ALLOWLIST_FILE + '.'
  );
  return 1;
}

module.exports = {
  scanLine,
  parseAllowlist,
  parseLocalPatterns,
  isAllowed,
  parseStagedDiff,
  scanFiles,
  scanAddedLines,
  main,
};

if (require.main === module) {
  process.exitCode = main();
}
