#!/usr/bin/env node
/**
 * Route contract check (Wave 3 design section 9.1, phase 0 form).
 *
 * Compares three things on (method, path template):
 *   1. Gateway routes, parsed from the four CDK API stack files by following
 *      each `x.addResource('seg')` chain and `x.addMethod('VERB', ...)`.
 *   2. Client calls, extracted statically from non-test web and mobile source
 *      (`fetch`, file-local fetch wrappers such as `apiCall`, and the mobile
 *      per-gateway client objects `api`, `featuresApi`, ...).
 *   3. Handlers: from phase 5 each handler exports `ROUTES`. Until then the
 *      gateway routes known to have no handler branch are declared in the
 *      allowlist (`noHandler`) and the check only confirms they still exist.
 *
 * Mismatch kinds:
 *   no-route        client calls a method + path no gateway defines
 *   wrong-gateway   the route exists, but on a different gateway than the
 *                   base URL the client uses
 *   no-auth         the route uses the Cognito authorizer, the call sends no
 *                   Authorization header
 *   cors-header     the call sets a non-safelisted header the owning
 *                   gateway's CORS allowHeaders does not list
 *   unparsed        a call whose URL or method the extractor cannot resolve
 *   token-decode    backend code decodes the Authorization header itself
 *                   instead of reading the caller through getUserFromEvent
 *
 * Known mismatches are listed in scripts/route-contract-allowlist.json with a
 * reason each; the check fails only when a mismatch is not listed. Entries
 * are matched without line numbers.
 *
 * Usage: node scripts/route-contract-check.js [--json]
 * Exit codes: 0 = no new mismatch, 1 = at least one new mismatch
 *
 * Node built-ins only.
 */

const fs = require('fs');
const path = require('path');
const {
  scanSource,
  matchBracket,
  splitTopLevel,
  lineIndex,
  findFunctions,
  enclosingFunction,
  walk,
  isTestFile,
} = require('./utils/source-scan');

const ROOT = path.join(__dirname, '..');
const ALLOWLIST_PATH = path.join(__dirname, 'route-contract-allowlist.json');

const API_STACKS = [
  { file: 'infrastructure/lib/api-stack.ts', gateway: 'main' },
  { file: 'infrastructure/lib/api-budgets-stack.ts', gateway: 'budgets' },
  { file: 'infrastructure/lib/api-features-stack.ts', gateway: 'features' },
  { file: 'infrastructure/lib/api-features-extended-stack.ts', gateway: 'extended' },
];

const CLIENT_ROOTS = [
  { dir: 'packages/web-app/src', client: 'web' },
  { dir: 'packages/mobile/src', client: 'mobile' },
];

/** Base-URL keywords, checked in this order (more specific names first). */
const BASE_KEYWORDS = [
  ['extended', /\bextendedFeaturesApiUrl\b|EXTENDED_FEATURES_API_URL|hkjzroedjf/],
  ['budgets', /\bbudgetsApiUrl\b|BUDGETS_API_URL|jcl39tq8x0/],
  ['family', /\bfamilyApiUrl\b|FAMILY_API_URL|gp8jspfboa/],
  ['features', /\bfeaturesApiUrl\b|(?<!EXTENDED_)FEATURES_API_URL|0poeu07vth/],
  ['main', /\bapiBaseUrl\b|VITE_API_BASE_URL|VITE_API_URL|EXPO_PUBLIC_API_URL|q0zoob6728|API_CONFIG\s*\.\s*baseURL/],
];

/** Mobile/web client objects whose methods take a path relative to one gateway. */
const CLIENT_OBJECTS = {
  api: 'main',
  apiClient: 'main',
  featuresApi: 'features',
  extendedFeaturesApi: 'extended',
  budgetsApi: 'budgets',
};

/** Request headers a browser sends cross-origin without listing them in CORS. */
const CORS_SAFELISTED = new Set(['accept', 'accept-language', 'content-language', 'content-type']);

// ---------------------------------------------------------------------------
// 1. Gateway routes
// ---------------------------------------------------------------------------

/**
 * Parse the routes one CDK API stack defines.
 * @param {string} src - stack source
 * @param {string} gateway - gateway key
 * @param {string} [file] - repo-relative file name for the report
 * @returns {{ routes: Array<{gateway:string, method:string, path:string, auth:string, target:string|null, file:string, line:number}>, allowHeaders: string[] }}
 */
function parseGatewayRoutes(src, gateway, file = '') {
  const { code, masked } = scanSource(src);
  const lineOf = lineIndex(src);
  const resources = new Map();
  const integrations = new Map();
  const routes = [];

  // `const x = new apigateway.LambdaIntegration(this.functions.y)` style integrations
  for (const m of code.matchAll(/(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+apigateway\.LambdaIntegration\(\s*([^,)]+)/g)) {
    integrations.set(m[1], m[2].trim());
  }

  const resolveChain = (expr) => {
    // expr: `base(.addResource('seg'))*`
    const m = expr.match(/^([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*?)((?:\s*\.\s*addResource\(\s*'[^']*'\s*\))*)\s*$/);
    if (!m) return null;
    const base = m[1].replace(/\s+/g, '');
    let basePath;
    if (/(^|\.)root$/.test(base)) basePath = '';
    else if (resources.has(base)) basePath = resources.get(base);
    else return null;
    const segs = [...m[2].matchAll(/addResource\(\s*'([^']*)'\s*\)/g)].map((s) => s[1]);
    return basePath + segs.map((s) => `/${s}`).join('');
  };

  // Walk statements in order so later reassignments win.
  const events = [];
  for (const m of code.matchAll(/(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;=]*?\.addResource\(\s*'[^']*'\s*\))\s*;/g)) {
    events.push({ at: m.index, type: 'decl', name: m[1], expr: m[2] });
  }
  for (const m of masked.matchAll(/\.\s*addMethod\s*\(/g)) {
    events.push({ at: m.index, type: 'method' });
  }
  events.sort((a, b) => a.at - b.at);

  for (const ev of events) {
    if (ev.type === 'decl') {
      const p = resolveChain(ev.expr.trim());
      if (p !== null) resources.set(ev.name, p);
      continue;
    }
    // Receiver: text from the start of the statement to `.addMethod(`
    let s = ev.at;
    while (s > 0 && !/[;{}\n]/.test(masked[s - 1])) s -= 1;
    const receiver = code.slice(s, ev.at).trim();
    const p = resolveChain(receiver);
    const open = masked.indexOf('(', ev.at);
    const close = matchBracket(masked, open);
    const args = splitTopLevel(masked, open + 1, close).map(([a, b]) => code.slice(a, b).trim());
    const methodMatch = (args[0] || '').match(/^'([A-Z]+)'$/);
    if (p === null || !methodMatch) {
      routes.push({ gateway, method: methodMatch ? methodMatch[1] : '?', path: null, auth: '?', target: null, file, line: lineOf(ev.at), unparsed: receiver });
      continue;
    }
    if (methodMatch[1] === 'OPTIONS') continue;
    let target = null;
    const integ = args[1] || '';
    const inline = integ.match(/LambdaIntegration\(\s*([^,)]+)/);
    const raw = inline ? inline[1].trim() : integrations.get(integ) || integ;
    const t = raw.match(/([A-Za-z_$][\w$]*)\s*$/);
    if (t) target = t[1];
    const options = args[2] || '';
    const auth = /\bauthorizer\b/.test(options.replace(/authorizerName[^,}]*/g, '')) ? 'cognito' : 'none';
    routes.push({ gateway, method: methodMatch[1], path: p || '/', auth, target, file, line: lineOf(ev.at) });
  }

  const allowHeaders = [];
  for (const m of code.matchAll(/allowHeaders\s*:\s*\[([^\]]*)\]/g)) {
    for (const h of m[1].matchAll(/'([^']+)'/g)) allowHeaders.push(h[1]);
  }
  return { routes, allowHeaders };
}

/**
 * Parse all four API stacks.
 * @param {string} root
 * @returns {{ routes: Array, allowHeaders: Object<string, string[]>, unparsed: Array }}
 */
function loadGateway(root) {
  const routes = [];
  const unparsed = [];
  const allowHeaders = {};
  for (const { file, gateway } of API_STACKS) {
    const parsed = parseGatewayRoutes(fs.readFileSync(path.join(root, file), 'utf-8'), gateway, file);
    for (const r of parsed.routes) (r.path === null ? unparsed : routes).push(r);
    allowHeaders[gateway] = parsed.allowHeaders;
  }
  return { routes, allowHeaders, unparsed };
}

/**
 * True when a client path matches a gateway path template. `{x}` in the
 * gateway matches any one segment; `{param}` in the client matches only a
 * gateway parameter.
 * @param {string} routePath
 * @param {string} clientPath
 * @returns {boolean}
 */
function pathMatches(routePath, clientPath) {
  const r = routePath.split('/').filter(Boolean);
  const c = clientPath.split('/').filter(Boolean);
  if (r.length !== c.length) return false;
  return r.every((seg, i) => {
    const rp = /^\{.+\}$/.test(seg);
    const cp = c[i] === '{param}';
    if (rp) return true;
    if (cp) return false;
    return seg === c[i];
  });
}

// ---------------------------------------------------------------------------
// 2. Client calls
// ---------------------------------------------------------------------------

/**
 * Parse a template literal's source text (including backticks) into pieces.
 * @param {string} text
 * @returns {Array<{ lit?: string, expr?: string }>|null}
 */
function templatePieces(text) {
  if (!text.startsWith('`') || !text.endsWith('`')) return null;
  const body = text.slice(1, -1);
  const pieces = [];
  let lit = '';
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] === '\\') {
      lit += body[i + 1] || '';
      i += 1;
    } else if (body[i] === '$' && body[i + 1] === '{') {
      if (lit) pieces.push({ lit });
      lit = '';
      let depth = 1;
      let j = i + 2;
      while (j < body.length && depth > 0) {
        if (body[j] === '{') depth += 1;
        else if (body[j] === '}') depth -= 1;
        if (depth > 0) j += 1;
      }
      pieces.push({ expr: body.slice(i + 2, j).trim() });
      i = j;
    } else {
      lit += body[i];
    }
  }
  if (lit) pieces.push({ lit });
  return pieces;
}

/**
 * Turn template pieces that form a path into a path template: `${x}` at the
 * start of a segment becomes `{param}`, `${x}` glued to the end of a segment
 * is treated as a query suffix, and everything from the first `?` is dropped.
 * @param {Array<{lit?:string, expr?:string}>} pieces
 * @returns {string|null} path, or null when it does not start with '/'
 */
function piecesToPath(pieces) {
  let out = '';
  for (const p of pieces) {
    if (p.lit !== undefined) {
      const q = p.lit.indexOf('?');
      if (q !== -1) {
        out += p.lit.slice(0, q);
        break;
      }
      out += p.lit;
    } else if (out === '' || out.endsWith('/')) {
      out += '{param}';
    } else {
      break; // `${query}` suffix
    }
  }
  // A dynamic first segment (`/${endpoint}/...`) names no route we can check
  if (!out.startsWith('/') || out.startsWith('/{param}')) return null;
  out = out.replace(/\/+$/, '');
  return out || '/';
}

/**
 * Split a top-level ternary `a ? b : c` into [b, c]; otherwise [text].
 * @param {string} text
 * @returns {string[]}
 */
function ternaryArms(text) {
  const { masked } = scanSource(text);
  let depth = 0;
  let q = -1;
  for (let i = 0; i < masked.length; i += 1) {
    const c = masked[i];
    if ('([{'.includes(c)) depth += 1;
    else if (')]}'.includes(c)) depth -= 1;
    else if (depth === 0 && c === '?' && masked[i + 1] !== '.' && masked[i + 1] !== '?' && masked[i - 1] !== '?') {
      q = i;
      break;
    }
  }
  if (q === -1) return [text];
  depth = 0;
  let nested = 0;
  for (let i = q + 1; i < masked.length; i += 1) {
    const c = masked[i];
    if ('([{'.includes(c)) depth += 1;
    else if (')]}'.includes(c)) depth -= 1;
    else if (depth === 0 && c === '?' && masked[i + 1] !== '.' && masked[i + 1] !== '?') nested += 1;
    else if (depth === 0 && c === ':') {
      if (nested === 0) return [text.slice(q + 1, i).trim(), text.slice(i + 1).trim()];
      nested -= 1;
    }
  }
  return [text];
}

/** Per-file analysis context, cached by absolute path. */
const fileCache = new Map();

/**
 * Load and scan a client source file.
 * @param {string} abs
 * @returns {object|null}
 */
function loadFile(abs) {
  if (fileCache.has(abs)) return fileCache.get(abs);
  if (!fs.existsSync(abs)) return null;
  const src = fs.readFileSync(abs, 'utf-8');
  const { code, masked } = scanSource(src);
  const ctx = { abs, src, code, masked, fns: findFunctions(masked, code), lineOf: lineIndex(src), imports: new Map() };
  for (const m of code.matchAll(/import\s+(?:[A-Za-z_$][\w$]*\s*,\s*)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    for (const part of m[1].split(',')) {
      const [orig, alias] = part.trim().split(/\s+as\s+/);
      if (orig) ctx.imports.set((alias || orig).trim(), { name: orig.trim(), from: m[2] });
    }
  }
  fileCache.set(abs, ctx);
  return ctx;
}

/**
 * Resolve an import specifier relative to a file.
 * @param {string} fromAbs
 * @param {string} spec
 * @returns {string|null}
 */
function resolveImport(fromAbs, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromAbs), spec);
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
  }
  return null;
}

/**
 * Text of the value assigned to `name` by the nearest declaration before
 * `pos` (or anywhere in the file when none precedes it).
 * @param {object} ctx
 * @param {string} name
 * @param {number} pos
 * @returns {{ text: string, at: number }|null}
 */
function declarationValue(ctx, name, pos) {
  const re = new RegExp(`(?:\\b(?:const|let|var)\\s+|(?<![\\w$.])export\\s+const\\s+)${name.replace(/\$/g, '\\$')}\\s*(?::[^=;]+?)?=(?![=>])`, 'g');
  let best = null;
  let first = null;
  for (const m of ctx.masked.matchAll(re)) {
    if (!first) first = m;
    if (m.index < pos) best = m;
  }
  const m = best || first;
  if (!m) return null;
  const s = m.index + m[0].length;
  let depth = 0;
  let e = s;
  for (; e < ctx.masked.length; e += 1) {
    const c = ctx.masked[e];
    if ('([{'.includes(c)) depth += 1;
    else if (')]}'.includes(c)) {
      if (depth === 0) break;
      depth -= 1;
    } else if ((c === ';' || c === ',') && depth === 0) break;
    else if (c === '\n' && depth === 0) {
      // a declaration ends at a newline unless the expression clearly continues
      const rest = ctx.masked.slice(e + 1).trimStart();
      const prev = ctx.masked.slice(s, e).trim();
      if (prev && !/^(\|\||&&|\?|:|\+|\.)/.test(rest) && !/(\|\||&&|\?|:|\+|=)$/.test(prev)) break;
    }
  }
  return { text: ctx.code.slice(s, e).trim(), at: m.index };
}

/**
 * Resolve a base-URL expression to a gateway and optional path prefix.
 * @param {object} ctx
 * @param {string} expr
 * @param {number} pos
 * @param {number} [depth]
 * @returns {{ gateway: string, prefix: string }|null}
 */
function resolveBase(ctx, expr, pos, depth = 0) {
  if (depth > 6) return null;
  const text = expr.trim();
  const pieces = templatePieces(text);
  if (pieces) {
    if (!pieces.length || pieces[0].expr === undefined) return null;
    const head = resolveBase(ctx, pieces[0].expr, pos, depth + 1);
    if (!head) return null;
    const rest = pieces.slice(1);
    if (rest.some((p) => p.expr !== undefined)) return null;
    return { gateway: head.gateway, prefix: head.prefix + rest.map((p) => p.lit).join('') };
  }
  const call = text.match(/^([A-Za-z_$][\w$]*)\(\s*\)$/);
  if (call) {
    // `${getBaseUrl()}`: classify the same-file function's body
    const fn = ctx.fns.find((f) => f.name === call[1]);
    if (fn) {
      const body = ctx.code.slice(fn.start, fn.end);
      for (const [gateway, re] of BASE_KEYWORDS) {
        if (re.test(body)) return { gateway, prefix: '' };
      }
    }
    return null;
  }
  if (/^[A-Za-z_$][\w$]*$/.test(text)) {
    const decl = declarationValue(ctx, text, pos);
    if (decl) return resolveBase(ctx, decl.text, decl.at, depth + 1);
    const imp = ctx.imports.get(text);
    if (imp) {
      const target = resolveImport(ctx.abs, imp.from);
      const other = target && loadFile(target);
      if (other) {
        const d = declarationValue(other, imp.name, other.masked.length);
        if (d) return resolveBase(other, d.text, d.at, depth + 1);
      }
    }
  }
  for (const [gateway, re] of BASE_KEYWORDS) {
    if (re.test(text)) return { gateway, prefix: '' };
  }
  return null;
}

/**
 * Resolve a URL argument into candidate { base, path } pairs. `param` is set
 * when the URL is `${BASE}${p}` (or plain `p` for client objects) with `p` a
 * parameter of the enclosing function, which makes that function a wrapper.
 * @param {object} ctx
 * @param {string} argText
 * @param {number} pos
 * @param {{ relative: boolean }} opts - relative: path is relative to a known gateway
 * @param {number} [depth]
 * @returns {Array<{ base: object|null, path: string|null, param?: string, external?: boolean }>}
 */
function resolveUrl(ctx, argText, pos, opts, depth = 0) {
  const text = argText.trim();
  if (depth > 4 || !text) return [{ base: null, path: null }];
  const arms = ternaryArms(text);
  if (arms.length === 2) return arms.flatMap((a) => resolveUrl(ctx, a, pos, opts, depth + 1));
  const fn = enclosingFunction(ctx.fns, pos);
  const isParam = (name) => fn && new RegExp(`(^|[\\s,({])${name}\\s*[:?,=)]|(^|[\\s,({])${name}\\s*$`).test(fn.params);

  const str = text.match(/^(['"])(.*)\1$/);
  if (str) {
    if (/^https?:/.test(str[2])) {
      const b = resolveBase(ctx, text, pos);
      return [{ base: b, path: null, external: !b }];
    }
    return [{ base: null, path: piecesToPath([{ lit: str[2] }]) }];
  }
  const pieces = templatePieces(text);
  if (pieces) {
    if (pieces[0] && pieces[0].lit !== undefined) {
      if (/^https?:/.test(pieces[0].lit)) return [{ base: null, path: null, external: true }];
      return [{ base: null, path: piecesToPath(pieces) }];
    }
    if (opts.relative) {
      // `${prefix}/x` against a client object: unknown first segment
      if (pieces.length === 1 && isParam(pieces[0].expr)) return [{ base: null, path: null, param: pieces[0].expr }];
      return [{ base: null, path: piecesToPath(pieces) }];
    }
    const base = resolveBase(ctx, `\`\${${pieces[0].expr}}\``, pos);
    if (!base) return [{ base: null, path: null }];
    const rest = pieces.slice(1);
    if (rest.length === 1 && rest[0].expr !== undefined && isParam(rest[0].expr)) {
      return [{ base, path: null, param: rest[0].expr }];
    }
    if (!rest.length) return [{ base, path: base.prefix || '/' }];
    const p = piecesToPath([{ lit: base.prefix }, ...rest].filter((x) => x.lit !== ''));
    return [{ base, path: p }];
  }
  if (/^[A-Za-z_$][\w$]*$/.test(text)) {
    if (isParam(text)) return [{ base: null, path: null, param: text }];
    const decl = declarationValue(ctx, text, pos);
    if (decl) return resolveUrl(ctx, decl.text, decl.at + 1, opts, depth + 1);
  }
  return [{ base: null, path: null }];
}

/**
 * Methods named by an options object (or identifier resolving to one).
 * @param {object} ctx
 * @param {string} text
 * @param {number} pos
 * @returns {{ methods: string[]|null, headers: string[], headersExpr: string|null, hasMethodKey: boolean }}
 */
function readOptions(ctx, text, pos) {
  let t = (text || '').trim();
  if (/^[A-Za-z_$][\w$]*$/.test(t)) {
    const d = declarationValue(ctx, t, pos);
    t = d ? d.text : '';
  }
  const res = { methods: null, headers: [], headersExpr: null, hasMethodKey: false };
  if (!t.startsWith('{')) return res;
  const { masked } = scanSource(t);
  const close = matchBracket(masked, 0);
  const props = splitTopLevel(masked, 1, close === -1 ? t.length : close).map(([a, b]) => t.slice(a, b).trim());
  for (const prop of props) {
    const mm = prop.match(/^method\s*:\s*([\s\S]+)$/);
    if (mm || prop === 'method') {
      res.hasMethodKey = true;
      let value = mm ? mm[1].trim() : 'method';
      if (/^[A-Za-z_$][\w$]*$/.test(value)) {
        // `method` shorthand or `method: m`: read the variable's value
        const d = declarationValue(ctx, value, pos);
        if (d) value = d.text;
      }
      const arms = ternaryArms(value);
      const lits = arms.map((a) => (a.match(/^['"]([A-Za-z]+)['"](?:\s+as\s+const)?$/) || [])[1]);
      res.methods = lits.every(Boolean) ? lits.map((x) => x.toUpperCase()) : null;
    }
    const hm = prop.match(/^headers\s*:\s*([\s\S]+)$/);
    if (hm || prop === 'headers') {
      const v = hm ? hm[1].trim() : 'headers';
      res.headersExpr = v;
      if (v.startsWith('{')) {
        for (const k of v.matchAll(/(?:^|[{,]\s*)['"]?([A-Za-z][\w-]*)['"]?\s*:/g)) res.headers.push(k[1]);
      }
    }
  }
  return res;
}

/**
 * Names of same-file functions whose body sets an Authorization header.
 * @param {object} ctx
 * @returns {Set<string>}
 */
function authHelpers(ctx) {
  if (ctx.authHelpers) return ctx.authHelpers;
  const names = new Set();
  for (const fn of ctx.fns) {
    if (fn.name && /\bAuthorization\b/.test(ctx.code.slice(fn.start, fn.end))) names.add(fn.name);
  }
  ctx.authHelpers = names;
  return names;
}

/**
 * Whether a raw fetch call sends an Authorization header.
 * @param {object} ctx
 * @param {string} callText - full text of the fetch call
 * @param {object} options - readOptions() result
 * @param {number} pos
 * @returns {boolean}
 */
function fetchSendsAuth(ctx, callText, options, pos) {
  if (/\bAuthorization\b/.test(callText)) return true;
  const helpers = authHelpers(ctx);
  const callsHelper = (t) => [...helpers].some((h) => new RegExp(`\\b${h}\\s*\\(`).test(t));
  if (callsHelper(callText)) return true;
  const expr = options.headersExpr;
  if (expr && /^[A-Za-z_$][\w$]*$/.test(expr)) {
    const d = declarationValue(ctx, expr, pos);
    if (d && (/\bAuthorization\b/.test(d.text) || callsHelper(d.text))) return true;
    if (d) {
      const between = ctx.code.slice(d.at, pos);
      if (new RegExp(`\\b${expr}\\s*\\.\\s*(?:set|append)\\(\\s*['"]Authorization['"]`).test(between)) return true;
      if (new RegExp(`\\b${expr}\\s*(?:\\.Authorization|\\[\\s*['"]Authorization['"]\\s*\\])\\s*=`).test(between)) return true;
    }
  }
  return false;
}

/**
 * Extract every API call from one client file.
 * @param {string} abs
 * @param {string} rel
 * @param {string} client - 'web' | 'mobile'
 * @returns {{ calls: Array, unparsed: Array }}
 */
function extractClientCalls(abs, rel, client) {
  const ctx = loadFile(abs);
  const calls = [];
  const unparsed = [];
  const wrappers = new Map(); // name -> { gateway|null, base, auth, fixedMethods, relative }
  const primitive = [];

  const callArgs = (openParen) => {
    const close = matchBracket(ctx.masked, openParen);
    if (close === -1) return null;
    const args = splitTopLevel(ctx.masked, openParen + 1, close).map(([a, b]) => ({ text: ctx.code.slice(a, b), at: a }));
    return { close, args, text: ctx.code.slice(openParen - 5, close + 1) };
  };

  // fetch(...)
  for (const m of ctx.masked.matchAll(/(?<![\w$.])fetch\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    const parsed = callArgs(open);
    if (!parsed || !parsed.args.length) continue;
    primitive.push({ kind: 'fetch', at: m.index, ...parsed });
  }
  // client objects: api.get(...), this.apiClient.post<T>(...)
  for (const m of ctx.masked.matchAll(/(?<![\w$])(?:this\s*\.\s*)?([A-Za-z_$][\w$]*)\s*\.\s*(get|post|put|delete|patch)\s*(?:<[^()]*?>)?\s*\(/g)) {
    const objName = m[1];
    let gateway = CLIENT_OBJECTS[objName];
    if (!gateway && objName === 'client') {
      const fn = enclosingFunction(ctx.fns, m.index);
      const dflt = fn && fn.params.match(/\bclient\s*(?::\s*\w+)?\s*=\s*([A-Za-z_$][\w$]*)/);
      const decl = declarationValue(ctx, 'client', m.index);
      const name = dflt ? dflt[1] : decl && decl.text.match(/^[A-Za-z_$][\w$]*$/) ? decl.text : null;
      gateway = name ? CLIENT_OBJECTS[name] : null;
    }
    if (!gateway) continue;
    const open = m.index + m[0].length - 1;
    const parsed = callArgs(open);
    if (!parsed || !parsed.args.length) continue;
    primitive.push({ kind: 'client', at: m.index, gateway, obj: objName, verb: m[2].toUpperCase(), ...parsed });
  }
  // dynamic client calls: client[method](...)
  for (const m of ctx.masked.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\[\s*[A-Za-z_$][\w$]*\s*\]\s*\(/g)) {
    if (CLIENT_OBJECTS[m[1]] || m[1] === 'client') {
      const close = matchBracket(ctx.masked, m.index + m[0].length - 1);
      unparsed.push({ kind: 'unparsed', client, file: rel, line: ctx.lineOf(m.index), expr: ctx.code.slice(m.index, close + 1).replace(/\s+/g, ' ').slice(0, 80) });
    }
  }

  const emit = (call) => calls.push({ client, file: rel, ...call });

  for (const p of primitive) {
    const urlArg = p.args[0];
    const optArg = p.args[p.kind === 'fetch' ? 1 : 2];
    const options = readOptions(ctx, optArg ? optArg.text : '', p.at);
    const candidates = resolveUrl(ctx, urlArg.text, p.at, { relative: p.kind === 'client' });
    const fn = enclosingFunction(ctx.fns, p.at);
    for (const [ci, cand] of candidates.entries()) {
      if (cand.external) continue;
      if (cand.param && fn && fn.name) {
        const body = ctx.code.slice(fn.start, fn.end);
        const paramNames = fn.params.split(',').map((x) => x.trim().split(/[\s:=?]/)[0]);
        wrappers.set(fn.name, {
          clientParamIndex: p.obj === 'client' ? paramNames.indexOf('client') : -1,
          gateway: p.kind === 'client' ? p.gateway : cand.base && cand.base.gateway,
          prefix: cand.base ? cand.base.prefix : '',
          auth: p.kind === 'client' || /\bAuthorization\b/.test(body) || [...authHelpers(ctx)].some((h) => h !== fn.name && new RegExp(`\\b${h}\\s*\\(`).test(body)),
          fixedMethods: p.kind === 'client' ? [p.verb] : options.hasMethodKey && options.methods && !/\.\.\.\s*options/.test(optArg ? optArg.text : '') ? options.methods : null,
          headers: options.headers,
          param: cand.param,
          line: ctx.lineOf(p.at),
        });
        continue;
      }
      const gateway = p.kind === 'client' ? p.gateway : cand.base && cand.base.gateway;
      let methods = p.kind === 'client' ? [p.verb] : options.hasMethodKey ? options.methods : ['GET'];
      // `isEdit ? urlA : urlB` with `isEdit ? 'PUT' : 'POST'`: pair arm by arm
      if (methods && candidates.length > 1 && methods.length === candidates.length) methods = [methods[ci]];
      if (!cand.path || !gateway || !methods) {
        unparsed.push({ kind: 'unparsed', client, file: rel, line: ctx.lineOf(p.at), expr: urlArg.text.replace(/\s+/g, ' ').trim().slice(0, 80) });
        continue;
      }
      const auth = p.kind === 'client' ? true : fetchSendsAuth(ctx, p.text, options, p.at);
      for (const method of methods) {
        emit({ via: p.kind, gateway, method, path: cand.path, auth, headers: options.headers, line: ctx.lineOf(p.at) });
      }
    }
  }

  // Wrapper call sites, iterated so a wrapper of a wrapper resolves too.
  const handledSites = new Set();
  for (let pass = 0; pass < 3; pass += 1) {
    for (const [name, w] of [...wrappers]) {
      const re = new RegExp(`(?<![\\w$])(?:this\\s*\\.\\s*|[A-Za-z_$][\\w$]*\\s*\\.\\s*)?${name}\\s*(?:<[^()]*?>)?\\s*\\(`, 'g');
      for (const m of ctx.masked.matchAll(re)) {
        const open = m.index + m[0].length - 1;
        if (handledSites.has(open)) continue;
        if (ctx.fns.some((f) => f.params === ctx.code.slice(open + 1, matchBracket(ctx.masked, open)) && f.start > open && ctx.masked.slice(matchBracket(ctx.masked, open) + 1, f.start).trim().replace(/^:[\s\S]*$/, '').replace(/=>/, '') === '')) continue;
        const parsed = callArgs(open);
        if (!parsed || !parsed.args.length) continue;
        handledSites.add(open);
        const options = readOptions(ctx, parsed.args[1] ? parsed.args[1].text : '', m.index);
        const fn = enclosingFunction(ctx.fns, m.index);
        for (const cand of resolveUrl(ctx, parsed.args[0].text, m.index, { relative: true })) {
          const methods = w.fixedMethods || (options.hasMethodKey ? options.methods : ['GET']);
          if (cand.param && fn && fn.name && fn.name !== name) {
            wrappers.set(fn.name, { ...w, fixedMethods: w.fixedMethods || (options.hasMethodKey ? options.methods : null), param: cand.param });
            continue;
          }
          if (!cand.path || !w.gateway || !methods) {
            unparsed.push({ kind: 'unparsed', client, file: rel, line: ctx.lineOf(m.index), expr: `${name}(${parsed.args[0].text.replace(/\s+/g, ' ').trim()})`.slice(0, 80) });
            continue;
          }
          const p = w.prefix ? `${w.prefix}${cand.path === '/' ? '' : cand.path}` : cand.path;
          // A wrapper that takes the client as a parameter: the caller picks the gateway
          const clientArg = w.clientParamIndex >= 0 && parsed.args[w.clientParamIndex];
          const gw = (clientArg && CLIENT_OBJECTS[clientArg.text.trim()]) || w.gateway;
          for (const method of methods) {
            emit({ via: name, gateway: gw, method, path: p, auth: w.auth, headers: [...w.headers, ...options.headers], line: ctx.lineOf(m.index) });
          }
        }
      }
    }
  }
  return { calls, unparsed };
}

// ---------------------------------------------------------------------------
// 3. Backend: no handler decodes the Authorization header
// ---------------------------------------------------------------------------

/**
 * Find code that decodes the Authorization header instead of reading the
 * caller through getUserFromEvent.
 * @param {string} rel
 * @param {string} src
 * @returns {Array<{ kind: string, file: string, line: number, detail: string }>}
 */
function findTokenDecoders(rel, src) {
  const out = [];
  const { code, masked } = scanSource(src);
  const lineOf = lineIndex(src);
  const fns = findFunctions(masked, code);
  if (/(^|\/)token-parser\.js$/.test(rel)) out.push({ kind: 'token-decode', file: rel, line: 1, detail: 'token-parser module' });
  for (const m of code.matchAll(/require\(\s*['"][^'"]*token-parser['"]\s*\)/g)) {
    out.push({ kind: 'token-decode', file: rel, line: lineOf(m.index), detail: 'requires token-parser' });
  }
  for (const m of masked.matchAll(/\b(parseIdToken|parseAuthToken)\b/g)) {
    out.push({ kind: 'token-decode', file: rel, line: lineOf(m.index), detail: `uses ${m[1]}` });
  }
  for (const m of masked.matchAll(/\bfunction\s+decodeCognitoToken\b|\bdecodeCognitoToken\s*=\s*(?:async\s*)?(?:function|\()/g)) {
    out.push({ kind: 'token-decode', file: rel, line: lineOf(m.index), detail: 'defines decodeCognitoToken' });
  }
  const headerReads = [];
  for (const m of masked.matchAll(/headers\s*(?:\?\.|\.)\s*(?:Authorization|authorization)\b/g)) headerReads.push(m.index);
  for (const m of code.matchAll(/headers\s*(?:\?\.)?\[\s*['"](?:Authorization|authorization)['"]\s*\]/g)) {
    if (masked[m.index] === code[m.index]) headerReads.push(m.index);
  }
  const decodes = [];
  for (const m of masked.matchAll(/\bBuffer\s*\.\s*from\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    const close = matchBracket(masked, open);
    const args = close === -1 ? [] : splitTopLevel(masked, open + 1, close);
    const last = args.length > 1 ? code.slice(args[args.length - 1][0], args[args.length - 1][1]).trim() : '';
    if (/^['"]base64(?:url)?['"]$/.test(last)) decodes.push(m.index);
  }
  for (const m of masked.matchAll(/(?<![\w$.])atob\s*\(/g)) decodes.push(m.index);
  const flagged = new Set();
  for (const h of headerReads) {
    const fn = enclosingFunction(fns, h);
    if (!fn || flagged.has(fn.start)) continue;
    if (decodes.some((d) => enclosingFunction(fns, d) === fn)) {
      flagged.add(fn.start);
      out.push({ kind: 'token-decode', file: rel, line: lineOf(fn.start), detail: `${fn.name || 'anonymous function'} reads the Authorization header and base64-decodes it` });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Comparison and allowlist
// ---------------------------------------------------------------------------

/**
 * Compare client calls with gateway routes.
 * @param {Array} calls
 * @param {Array} routes
 * @param {Object<string,string[]>} allowHeaders
 * @returns {Array} mismatches
 */
function compare(calls, routes, allowHeaders) {
  const out = [];
  for (const c of calls) {
    const samePath = routes.filter((r) => pathMatches(r.path, c.path));
    const exact = samePath.filter((r) => r.method === c.method);
    const onGateway = exact.filter((r) => r.gateway === c.gateway);
    const base = { client: c.client, file: c.file, line: c.line, method: c.method, path: c.path, gateway: c.gateway };
    if (!exact.length) {
      const have = [...new Set(samePath.map((r) => `${r.method} on ${r.gateway}`))];
      out.push({ kind: 'no-route', ...base, detail: have.length ? `path exists with ${have.join(', ')}` : 'no gateway defines this path' });
      continue;
    }
    if (!onGateway.length) {
      out.push({ kind: 'wrong-gateway', ...base, detail: `route lives on ${[...new Set(exact.map((r) => r.gateway))].join(', ')}` });
      continue;
    }
    const route = onGateway[0];
    if (route.auth === 'cognito' && !c.auth) {
      out.push({ kind: 'no-auth', ...base, detail: 'Cognito route, call sends no Authorization header' });
    }
    const allowed = new Set((allowHeaders[c.gateway] || []).map((h) => h.toLowerCase()));
    for (const h of c.headers || []) {
      const lh = h.toLowerCase();
      if (!CORS_SAFELISTED.has(lh) && !allowed.has(lh)) {
        out.push({ kind: 'cors-header', ...base, header: h, detail: `header ${h} is not in the ${c.gateway} gateway allowHeaders` });
      }
    }
  }
  return out;
}

/**
 * Stable identity of a mismatch or allowlist entry (no line number).
 * @param {object} m
 * @returns {string}
 */
function mismatchKey(m) {
  switch (m.kind) {
    case 'unparsed':
      return [m.kind, m.file, m.expr].join('|');
    case 'token-decode':
      return [m.kind, m.file, m.detail].join('|');
    case 'cors-header':
      return [m.kind, m.file, m.method, m.path, m.gateway, m.header].join('|');
    default:
      return [m.kind, m.file, m.method, m.path, m.gateway].join('|');
  }
}

/**
 * Split mismatches into allowlisted and new; list unmatched allowlist entries.
 * Identical mismatches collapse to one key, so one entry covers repeats of the
 * same call in the same file.
 * @param {Array} mismatches
 * @param {Array} entries
 * @returns {{ allowed: Array, fresh: Array, stale: Array }}
 */
function classify(mismatches, entries) {
  const byKey = new Map(entries.map((e) => [mismatchKey(e), e]));
  const used = new Set();
  const allowed = [];
  const fresh = [];
  for (const m of mismatches) {
    const k = mismatchKey(m);
    if (byKey.has(k)) {
      used.add(k);
      allowed.push({ ...m, reason: byKey.get(k).reason });
    } else {
      fresh.push(m);
    }
  }
  const stale = entries.filter((e) => !used.has(mismatchKey(e)));
  return { allowed, fresh, stale };
}

/**
 * Run the whole check.
 * @param {{ root?: string, allowlist?: { entries: Array, noHandler: Array } }} [opts]
 * @returns {object} report
 */
function run(opts = {}) {
  const root = opts.root || ROOT;
  fileCache.clear();
  const allow = opts.allowlist || JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf-8'));
  const gateway = loadGateway(root);

  const calls = [];
  const unparsed = [];
  for (const { dir, client } of CLIENT_ROOTS) {
    const files = walk(path.join(root, dir), ['.ts', '.tsx']).filter((f) => !isTestFile(f));
    for (const abs of files) {
      const rel = path.relative(root, abs).replace(/\\/g, '/');
      const r = extractClientCalls(abs, rel, client);
      calls.push(...r.calls);
      unparsed.push(...r.unparsed);
    }
  }

  const decoders = [];
  for (const abs of walk(path.join(root, 'backend'), ['.js']).filter((f) => !isTestFile(f))) {
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    decoders.push(...findTokenDecoders(rel, fs.readFileSync(abs, 'utf-8')));
  }

  const gatewayUnparsed = gateway.unparsed.map((r) => ({ kind: 'unparsed', client: 'gateway', file: r.file, line: r.line, expr: r.unparsed.slice(0, 80) }));
  const mismatches = [...compare(calls, gateway.routes, gateway.allowHeaders), ...unparsed, ...gatewayUnparsed, ...decoders];
  const { allowed, fresh, stale } = classify(mismatches, allow.entries || []);

  const noHandler = (allow.noHandler || []).map((e) => ({
    ...e,
    exists: gateway.routes.some((r) => r.gateway === e.gateway && r.method === e.method && r.path === e.path),
  }));

  const perGateway = {};
  for (const r of gateway.routes) perGateway[r.gateway] = (perGateway[r.gateway] || 0) + 1;
  return {
    routeCount: gateway.routes.length,
    perGateway,
    callCount: calls.length,
    calls,
    routes: gateway.routes,
    mismatches,
    allowed,
    fresh,
    stale,
    noHandler,
  };
}

function describe(m) {
  if (m.kind === 'unparsed') return `${m.client} ${m.file}:${m.line} cannot resolve ${m.expr}`;
  if (m.kind === 'token-decode') return `${m.file}:${m.line} ${m.detail}`;
  return `${m.client} ${m.file}:${m.line} ${m.method} ${m.path} [${m.gateway}] - ${m.detail}`;
}

function main() {
  const r = run();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.fresh.length || r.noHandler.some((n) => !n.exists) ? 1 : 0);
  }
  console.log(`Route contract check: ${r.routeCount} gateway routes (${Object.entries(r.perGateway).map(([g, n]) => `${g} ${n}`).join(', ')}), ${r.callCount} client calls`);
  const kinds = ['no-route', 'wrong-gateway', 'no-auth', 'cors-header', 'unparsed', 'token-decode'];
  for (const kind of kinds) {
    const items = r.allowed.filter((m) => m.kind === kind);
    if (!items.length) continue;
    console.log(`\n  ${kind} (allowlisted, ${items.length})`);
    for (const m of items) console.log(`    ${describe(m)}\n      reason: ${m.reason}`);
  }
  console.log(`\n  no-handler (declared in the allowlist until handlers export ROUTES in phase 5, ${r.noHandler.length})`);
  for (const n of r.noHandler) {
    console.log(`    ${n.method} ${n.path} [${n.gateway}] ${n.exists ? '' : '\u274c NOT A GATEWAY ROUTE ANY MORE - update the allowlist'}\n      reason: ${n.reason}`);
  }
  for (const s of r.stale) console.warn(`\u26a0\ufe0f  stale allowlist entry (matches nothing, remove it): ${mismatchKey(s)}`);
  if (r.fresh.length) {
    console.error(`\n\u274c ${r.fresh.length} new mismatch(es):`);
    for (const m of r.fresh) console.error(`    ${m.kind}: ${describe(m)}`);
    console.error('Fix the call or the route. Add an allowlist entry with a reason only for a known, tracked gap.');
  } else {
    console.log('\n\u2705 No new route contract mismatches');
  }
  process.exit(r.fresh.length || r.noHandler.some((n) => !n.exists) ? 1 : 0);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseGatewayRoutes,
  loadGateway,
  pathMatches,
  templatePieces,
  piecesToPath,
  ternaryArms,
  extractClientCalls,
  findTokenDecoders,
  compare,
  classify,
  mismatchKey,
  run,
};
