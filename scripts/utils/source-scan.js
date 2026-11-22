/**
 * Lightweight JS/TS source scanning helpers for the static guardrail checks
 * (route-contract-check.js, dynamo-filter-check.js).
 *
 * Node built-ins only. This is not a full parser: it understands comments,
 * string literals, template literals (with nested `${}` expressions) and
 * regex literals well enough that structural regexes never match inside a
 * comment or a string, and brace matching is not thrown off by braces inside
 * strings.
 */

const fs = require('fs');
const path = require('path');

const REGEX_PRECEDERS = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);
const REGEX_KEYWORDS = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);
const CONTROL_WORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'with', 'function', 'return', 'typeof']);

/**
 * Produce two position-preserving views of a source file.
 *
 * - `code`: comments replaced by spaces (newlines kept), everything else as is.
 * - `masked`: like `code`, but the contents of string, template and regex
 *   literals are also replaced by spaces. Delimiters and the code inside a
 *   template's `${...}` stay, so structure can be matched on `masked` and the
 *   literal values read from `code` at the same offsets.
 *
 * @param {string} src - file contents
 * @returns {{ code: string, masked: string }}
 */
function scanSource(src) {
  const code = src.split('');
  const masked = src.split('');
  const n = src.length;
  const blank = (arr, i) => {
    if (i < n && arr[i] !== '\n' && arr[i] !== '\r') arr[i] = ' ';
  };
  // Context stack: 'code' (top level or inside `${}`) tracks its own brace depth.
  const stack = [{ type: 'code', depth: 0 }];
  let lastSignificant = '';
  let lastWord = '';
  let i = 0;

  while (i < n) {
    const ctx = stack[stack.length - 1];
    const ch = src[i];
    const next = src[i + 1];

    if (ctx.type === 'template') {
      if (ch === '\\') {
        blank(masked, i);
        blank(masked, i + 1);
        i += 2;
      } else if (ch === '`') {
        stack.pop();
        lastSignificant = '`';
        lastWord = '';
        i += 1;
      } else if (ch === '$' && next === '{') {
        stack.push({ type: 'code', depth: 0 });
        lastSignificant = '{';
        i += 2;
      } else {
        blank(masked, i);
        i += 1;
      }
      continue;
    }

    if (ch === '/' && next === '/') {
      while (i < n && src[i] !== '\n') {
        blank(code, i);
        blank(masked, i);
        i += 1;
      }
      continue;
    }
    if (ch === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      for (let j = i; j < stop; j += 1) {
        blank(code, j);
        blank(masked, j);
      }
      i = stop;
      continue;
    }
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < n && src[j] !== ch && src[j] !== '\n') {
        if (src[j] === '\\') {
          blank(masked, j);
          j += 1;
        }
        blank(masked, j);
        j += 1;
      }
      i = j + 1;
      lastSignificant = ch;
      lastWord = '';
      continue;
    }
    if (ch === '`') {
      stack.push({ type: 'template' });
      i += 1;
      continue;
    }
    if (ch === '/' && (REGEX_PRECEDERS.has(lastSignificant) || lastSignificant === '' || REGEX_KEYWORDS.has(lastWord))) {
      let j = i + 1;
      let inClass = false;
      while (j < n && src[j] !== '\n') {
        const c = src[j];
        if (c === '\\') {
          blank(masked, j);
          blank(masked, j + 1);
          j += 2;
          continue;
        }
        if (c === '[') inClass = true;
        else if (c === ']') inClass = false;
        else if (c === '/' && !inClass) break;
        blank(masked, j);
        j += 1;
      }
      i = j + 1;
      while (i < n && /[a-z]/i.test(src[i])) i += 1;
      lastSignificant = '/';
      lastWord = '';
      continue;
    }
    if (ch === '{') {
      ctx.depth += 1;
    } else if (ch === '}') {
      if (ctx.depth === 0 && stack.length > 1) {
        stack.pop();
        lastSignificant = '}';
        i += 1;
        continue;
      }
      ctx.depth -= 1;
    }
    if (/[A-Za-z0-9_$]/.test(ch)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j += 1;
      lastWord = src.slice(i, j);
      lastSignificant = 'w';
      i = j;
      continue;
    }
    if (!/\s/.test(ch)) {
      lastSignificant = ch;
      lastWord = '';
    }
    i += 1;
  }
  return { code: code.join(''), masked: masked.join('') };
}

/**
 * Index of the bracket that closes the one at `openIndex`, matched on the
 * masked view so brackets in strings and comments are ignored.
 * @param {string} masked
 * @param {number} openIndex - index of '(', '{' or '['
 * @returns {number} closing index, or -1
 */
function matchBracket(masked, openIndex) {
  const open = masked[openIndex];
  const close = { '(': ')', '{': '}', '[': ']' }[open];
  let depth = 0;
  for (let i = openIndex; i < masked.length; i += 1) {
    if (masked[i] === open) depth += 1;
    else if (masked[i] === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Split `[start, end)` on top-level commas (depth 0 for (), {}, []).
 * @param {string} masked
 * @param {number} start
 * @param {number} end
 * @returns {Array<[number, number]>} non-empty part ranges
 */
function splitTopLevel(masked, start, end) {
  const parts = [];
  let depth = 0;
  let partStart = start;
  for (let i = start; i < end; i += 1) {
    const c = masked[i];
    if (c === '(' || c === '{' || c === '[') depth += 1;
    else if (c === ')' || c === '}' || c === ']') depth -= 1;
    else if (c === ',' && depth === 0) {
      parts.push([partStart, i]);
      partStart = i + 1;
    }
  }
  if (partStart < end) parts.push([partStart, end]);
  return parts.filter(([s, e]) => masked.slice(s, e).trim() !== '');
}

/**
 * Build a function that maps an offset to its 1-based line number.
 * @param {string} src
 * @returns {(index: number) => number}
 */
function lineIndex(src) {
  const starts = [0];
  for (let i = 0; i < src.length; i += 1) if (src[i] === '\n') starts.push(i + 1);
  return (index) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

/**
 * Word that ends right before `index` (skipping whitespace and one TS generic
 * parameter list), with its start offset.
 * @param {string} masked
 * @param {number} index
 * @returns {{ word: string, start: number }}
 */
function wordBefore(masked, index) {
  let b = index - 1;
  while (b >= 0 && /\s/.test(masked[b])) b -= 1;
  if (masked[b] === '>' && masked[b - 1] !== '=') {
    const limit = Math.max(0, b - 200);
    let angle = 0;
    let k = b;
    for (; k >= limit; k -= 1) {
      if (masked[k] === '>') angle += 1;
      else if (masked[k] === '<') {
        angle -= 1;
        if (angle === 0) break;
      }
    }
    if (angle === 0 && k >= limit) {
      b = k - 1;
      while (b >= 0 && /\s/.test(masked[b])) b -= 1;
    }
  }
  const end = b + 1;
  while (b >= 0 && /[A-Za-z0-9_$]/.test(masked[b])) b -= 1;
  return { word: masked.slice(b + 1, end), start: b + 1 };
}

/**
 * Find function-like bodies: `function name(...) {`, arrow functions with a
 * block body, and class or object methods `name(...) {`.
 * @param {string} masked
 * @param {string} code
 * @returns {Array<{ name: string|null, params: string, start: number, end: number }>}
 *   `start`/`end` are the offsets of the body's `{` and `}`
 */
function findFunctions(masked, code) {
  const fns = [];
  for (let i = 0; i < masked.length; i += 1) {
    if (masked[i] !== '(') continue;
    const close = matchBracket(masked, i);
    if (close === -1) continue;
    let k = close + 1;
    while (k < masked.length && /\s/.test(masked[k])) k += 1;
    if (masked[k] === ':') {
      // TS return type annotation: skip to the body `{` or the arrow
      let angle = 0;
      let paren = 0;
      k += 1;
      while (k < masked.length) {
        const c = masked[k];
        if (c === '<') angle += 1;
        else if (c === '>' && masked[k - 1] !== '=') angle -= 1;
        else if (c === '(') paren += 1;
        else if (c === ')') {
          if (paren === 0) break;
          paren -= 1;
        } else if (angle <= 0 && paren === 0 && (c === '{' || (c === '=' && masked[k + 1] === '>') || c === ';' || c === ',')) break;
        k += 1;
      }
    }
    let isArrow = false;
    if (masked[k] === '=' && masked[k + 1] === '>') {
      isArrow = true;
      k += 2;
      while (k < masked.length && /\s/.test(masked[k])) k += 1;
    }
    if (masked[k] !== '{') continue;
    const { word } = wordBefore(masked, i);
    if (!isArrow && word !== 'function' && (CONTROL_WORDS.has(word) || word === '')) continue;
    let name = word && !CONTROL_WORDS.has(word) && word !== 'async' ? word : null;
    if (isArrow || word === 'function' || word === 'async' || !word) {
      const before = masked.slice(Math.max(0, i - 160), i);
      const m = before.match(/([A-Za-z0-9_$]+)\s*(?::\s*[^=;{}()]+)?\s*[=:]\s*(?:async\s*)?(?:function\s*[A-Za-z0-9_$]*\s*)?(?:<[^>]*>\s*)?$/);
      if (m) name = m[1];
    }
    const bodyEnd = matchBracket(masked, k);
    if (bodyEnd === -1) continue;
    fns.push({ name, params: code.slice(i + 1, close), start: k, end: bodyEnd });
  }
  return fns;
}

/**
 * Innermost function whose body contains `index`.
 * @param {Array<{start:number,end:number}>} fns
 * @param {number} index
 * @returns {object|null}
 */
function enclosingFunction(fns, index) {
  let best = null;
  for (const fn of fns) {
    if (fn.start < index && index < fn.end && (!best || fn.start > best.start)) best = fn;
  }
  return best;
}

/**
 * Recursively list files under `dir` with one of `exts`, skipping
 * node_modules, build output and dot-directories.
 * @param {string} dir
 * @param {string[]} exts
 * @returns {string[]} absolute paths, sorted
 */
function walk(dir, exts) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const skip = new Set(['node_modules', 'dist', 'build', 'coverage', 'cdk.out', 'cdk-out-temp']);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name) || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, exts));
    else if (exts.some((e) => entry.name.endsWith(e)) && !entry.name.endsWith('.d.ts')) out.push(full);
  }
  return out.sort();
}

/**
 * True for test files and test-only directories.
 * @param {string} file
 * @returns {boolean}
 */
function isTestFile(file) {
  const p = file.replace(/\\/g, '/');
  return /\.(test|spec)\.[jt]sx?$/.test(p) || p.includes('/__tests__/') || p.includes('/__mocks__/');
}

module.exports = {
  scanSource,
  matchBracket,
  splitTopLevel,
  lineIndex,
  wordBefore,
  findFunctions,
  enclosingFunction,
  walk,
  isTestFile,
};
