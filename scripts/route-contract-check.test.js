/**
 * Tests for scripts/route-contract-check.js (Wave 3 design 9.1, phase 0).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const rc = require('./route-contract-check');

const ROUTE = (method, p, gateway = 'main', auth = 'cognito') => ({ gateway, method, path: p, auth });

describe('route-contract-check: gateway parser', () => {
  test('follows addResource chains, integrations and authorizers; skips OPTIONS and comments', () => {
    const src = `
      const integ = new apigateway.LambdaIntegration(this.functions.billsHandler);
      const bills = this.api.root.addResource('bills');
      bills.addMethod('GET', integ, { authorizer, operationName: 'List' });
      // bills.addMethod('DELETE', integ, { authorizer });
      const billId = bills.addResource('{billId}');
      billId.addResource('pay').addMethod('POST', new apigateway.LambdaIntegration(this.functions.billsHandler), { authorizer });
      bills.addResource('health').addMethod('GET', integ, { methodResponses: [] });
      bills.addMethod('OPTIONS', integ, {});
      const api = new apigateway.RestApi(this, 'X', { defaultCorsPreflightOptions: { allowHeaders: ['Content-Type', 'Authorization'] } });
    `;
    const { routes, allowHeaders } = rc.parseGatewayRoutes(src, 'main', 'f.ts');
    expect(routes.map((r) => `${r.method} ${r.path} ${r.auth} ${r.target}`)).toEqual([
      'GET /bills cognito billsHandler',
      'POST /bills/{billId}/pay cognito billsHandler',
      'GET /bills/health none billsHandler',
    ]);
    expect(allowHeaders).toEqual(['Content-Type', 'Authorization']);
  });

  test('the four real stacks define 231 non-OPTIONS routes (design section 5)', () => {
    const { routes, unparsed } = rc.loadGateway(path.join(__dirname, '..'));
    expect(unparsed).toEqual([]);
    expect(routes).toHaveLength(231);
    const count = (g) => routes.filter((r) => r.gateway === g).length;
    expect([count('main'), count('budgets'), count('features'), count('extended')]).toEqual([76, 23, 83, 49]);
    const find = (g, m, p) => routes.find((r) => r.gateway === g && r.method === m && r.path === p);
    expect(find('main', 'GET', '/budget/categories').auth).toBe('cognito');
    expect(find('budgets', 'GET', '/budgets/invitation-preview').auth).toBe('none');
    expect(find('budgets', 'POST', '/budgets/accept-invitation').auth).toBe('cognito');
    expect(find('extended', 'GET', '/net-worth/categories').auth).toBe('none');
  });
});

describe('route-contract-check: paths', () => {
  test('pathMatches: gateway parameters match any segment, client parameters only parameters', () => {
    expect(rc.pathMatches('/goals/{goalId}', '/goals/{param}')).toBe(true);
    expect(rc.pathMatches('/goals/{goalId}', '/goals/templates')).toBe(true);
    expect(rc.pathMatches('/goals/templates', '/goals/{param}')).toBe(false);
    expect(rc.pathMatches('/goals', '/goals/{param}')).toBe(false);
  });

  test('piecesToPath drops query strings and query suffixes; dynamic first segments are unresolvable', () => {
    const p = (t) => rc.piecesToPath(rc.templatePieces(t));
    expect(p('`/budget/current?month=${m}`')).toBe('/budget/current');
    expect(p('`/goals/${id}/contribute`')).toBe('/goals/{param}/contribute');
    expect(p('`/transactions${qs}`')).toBe('/transactions');
    expect(p('`/${entity}/${id}`')).toBeNull();
  });

  test('ternaryArms splits only a top-level conditional', () => {
    expect(rc.ternaryArms("isEdit ? 'PUT' : 'POST'")).toEqual(["'PUT'", "'POST'"]);
    expect(rc.ternaryArms('a?.b')).toEqual(['a?.b']);
  });
});

describe('route-contract-check: client extraction', () => {
  let dir;
  const write = (name, src) => {
    const abs = path.join(dir, name);
    fs.writeFileSync(abs, src);
    return abs;
  };

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rc-test-'));
  });
  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('raw fetch with a base constant, paired ternary URL and method, and an Authorization header', () => {
    const abs = write('Page.tsx', `
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || 'https://example.com/v1';
      async function save(isEditing, id, token) {
        const url = isEditing ? \`\${API_BASE_URL}/goals/\${id}\` : \`\${API_BASE_URL}/goals\`;
        const method = isEditing ? 'PUT' : 'POST';
        return fetch(url, { method, headers: { Authorization: \`Bearer \${token}\`, 'X-Trace': '1' } });
      }
    `);
    const { calls, unparsed } = rc.extractClientCalls(abs, 'Page.tsx', 'web');
    expect(unparsed).toEqual([]);
    expect(calls.map((c) => `${c.method} ${c.path} ${c.gateway} ${c.auth}`)).toEqual([
      'PUT /goals/{param} main true',
      'POST /goals main true',
    ]);
    expect(calls[0].headers).toEqual(['Authorization', 'X-Trace']);
  });

  test('a file-local wrapper that sets Authorization through new Headers() is followed to its call sites', () => {
    const abs = write('insights.ts', `
      import { config } from './config';
      const BASE = config.extendedFeaturesApiUrl;
      async function insightsApiCall(endpoint, options = {}) {
        const url = \`\${BASE}\${endpoint}\`;
        const headers = new Headers(options.headers);
        headers.set('Authorization', 'Bearer x');
        return fetch(url, { ...options, headers });
      }
      export const getWeekly = () => insightsApiCall('/insights/weekly');
      export const ask = (q) => insightsApiCall('/insights/ask', { method: 'POST', body: q });
    `);
    const { calls } = rc.extractClientCalls(abs, 'insights.ts', 'web');
    expect(calls.map((c) => `${c.method} ${c.path} ${c.gateway} ${c.auth}`)).toEqual([
      'GET /insights/weekly extended true',
      'POST /insights/ask extended true',
    ]);
  });

  test('headers passed as a variable from an auth-header helper count as authenticated (review NIT 5)', () => {
    const abs = write('plaid.ts', `
      const API_BASE_URL = featuresApiUrl;
      async function getAuthHeaders() {
        return { 'Content-Type': 'application/json', Authorization: 'Bearer x' };
      }
      export async function sync() {
        const headers = await getAuthHeaders();
        return fetch(\`\${API_BASE_URL}/plaid/sync\`, { method: 'POST', headers });
      }
      export async function anon() {
        return fetch(\`\${API_BASE_URL}/plaid/accounts\`, { headers: { 'Content-Type': 'application/json' } });
      }
    `);
    const { calls } = rc.extractClientCalls(abs, 'plaid.ts', 'mobile');
    expect(calls.map((c) => `${c.method} ${c.path} ${c.auth}`)).toEqual([
      'POST /plaid/sync true',
      'GET /plaid/accounts false',
    ]);
  });

  test('mobile client objects, a client-parameter wrapper, and dynamic calls', () => {
    const abs = write('svc.ts', `
      export const a = () => api.get<Thing[]>('/transactions', { month });
      export const b = (id) => budgetsApi.delete(\`/budgets/\${id}\`);
      async function fetchServerData(endpoint, client = api) { return client.get(endpoint); }
      export const c = () => fetchServerData('/budgets', budgetsApi);
      export const d = () => fetchServerData('/budget/categories');
      export const e = (client, method, endpoint) => client[method](endpoint);
    `);
    const { calls, unparsed } = rc.extractClientCalls(abs, 'svc.ts', 'mobile');
    expect(calls.map((c) => `${c.method} ${c.path} ${c.gateway}`)).toEqual([
      'GET /transactions main',
      'DELETE /budgets/{param} budgets',
      'GET /budgets budgets',
      'GET /budget/categories main',
    ]);
    expect(unparsed.map((u) => u.expr)).toEqual(['client[method](endpoint)']);
  });
});

describe('route-contract-check: compare', () => {
  const routes = [ROUTE('GET', '/goals'), ROUTE('GET', '/admin/users', 'features'), ROUTE('POST', '/auth/login', 'main', 'none')];
  const call = (over) => ({ client: 'web', file: 'f.ts', line: 1, method: 'GET', path: '/goals', gateway: 'main', auth: true, headers: [], ...over });
  const allowHeaders = { main: ['Content-Type', 'Authorization'], features: ['Content-Type', 'Authorization'] };

  test.each([
    [{}, []],
    [{ method: 'DELETE' }, ['no-route']],
    [{ path: '/nowhere' }, ['no-route']],
    [{ path: '/admin/users' }, ['wrong-gateway']],
    [{ auth: false }, ['no-auth']],
    [{ method: 'POST', path: '/auth/login', auth: false }, []],
    [{ headers: ['Idempotency-Key'] }, ['cors-header']],
    [{ headers: ['content-type', 'Accept'] }, []],
  ])('%j -> %j', (over, kinds) => {
    expect(rc.compare([call(over)], routes, allowHeaders).map((m) => m.kind)).toEqual(kinds);
  });
});

describe('route-contract-check: Authorization decoding in backend code', () => {
  test('flags a function that reads the header and base64-decodes it', () => {
    const src = `
      function whoAmI(event) {
        const token = event.headers.Authorization.split(' ')[1];
        return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      }`;
    expect(rc.findTokenDecoders('backend/functions/x/index.js', src).map((f) => f.detail)).toEqual([
      'whoAmI reads the Authorization header and base64-decodes it',
    ]);
  });

  test('ignores comments, forwarding the header, and decoding in a different function', () => {
    const src = `
      // event.headers.Authorization is decoded with Buffer.from(x, 'base64') elsewhere
      function forward(event) { return send({ headers: { Authorization: event.headers.Authorization } }); }
      function decodeOther(x) { return Buffer.from(x, 'base64'); }`;
    expect(rc.findTokenDecoders('backend/functions/budgets/index.js', src)).toEqual([]);
  });

  test('flags token-parser modules, their imports and decodeCognitoToken', () => {
    const src = "const { parseIdToken } = require('./token-parser');\nfunction decodeCognitoToken(t) { return t; }";
    const details = rc.findTokenDecoders('backend/layers/shared/nodejs/shared/token-parser.js', src).map((f) => f.detail);
    expect(details).toEqual(expect.arrayContaining(['token-parser module', 'requires token-parser', 'uses parseIdToken', 'defines decodeCognitoToken']));
  });
});

describe('route-contract-check: repository', () => {
  const report = rc.run();
  const has = (kind, method, p) => report.mismatches.some((m) => m.kind === kind && m.method === method && m.path === p);

  test('CI starts green: every current mismatch is allowlisted, no entry is stale', () => {
    expect(report.fresh).toEqual([]);
    expect(report.stale).toEqual([]);
    expect(report.noHandler.every((n) => n.exists)).toBe(true);
  });

  test('the report lists the design section 0.2 client mismatches', () => {
    expect(has('no-route', 'GET', '/budgets/{param}/summary')).toBe(true);
    expect(has('no-route', 'PUT', '/budgets/{param}')).toBe(true);
    expect(has('no-route', 'GET', '/credit-score/settings')).toBe(true);
    expect(has('wrong-gateway', 'GET', '/admin/users')).toBe(true);
    const declared = report.noHandler.map((n) => `${n.method} ${n.path}`);
    expect(declared).toEqual(expect.arrayContaining(['GET /budget/categories', 'POST /budget/categories', 'PUT /budget', 'GET /users', 'PUT /users']));
  });

  test('no call to a Cognito route goes out without an Authorization header', () => {
    expect(report.mismatches.filter((m) => m.kind === 'no-auth')).toEqual([]);
  });

  test('an unlisted mismatch fails the check', () => {
    const r = rc.run({ allowlist: { entries: [], noHandler: [] } });
    expect(r.fresh.length).toBe(r.mismatches.length);
    expect(r.fresh.length).toBeGreaterThan(0);
  });
});
