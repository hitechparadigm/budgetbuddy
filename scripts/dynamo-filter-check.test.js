/**
 * Tests for scripts/dynamo-filter-check.js (Wave 3 design 9.2).
 */

const { checkSource, classify, run } = require('./dynamo-filter-check');

describe('dynamo-filter-check: checkSource', () => {
  test('flags a FilterExpression literal that names a key attribute', () => {
    const src = `
      async function listUsers() {
        return dynamoHelpers.queryByGSI('GSI1', 'x', {
          FilterExpression: "begins_with(SK, :sk) AND status = :s",
        });
      }`;
    const findings = checkSource('backend/functions/x/index.js', src);
    expect(findings).toEqual([
      expect.objectContaining({ rule: 'key-in-filter', function: 'listUsers', expression: 'begins_with(SK, :sk) AND status = :s' }),
    ]);
  });

  test.each(['GSI1PK = :v', 'GSI4SK > :v', 'PK = :pk'])('flags %s', (expr) => {
    const src = `const p = { FilterExpression: '${expr}' };`;
    expect(checkSource('f.js', src).map((f) => f.rule)).toEqual(['key-in-filter']);
  });

  test('does not flag value placeholders, name placeholders or ordinary attributes', () => {
    const src = `const p = { FilterExpression: '#pk = :sk AND isDeleted <> :pk AND SKU = :x' };`;
    expect(checkSource('f.js', src)).toEqual([]);
  });

  test('resolves a FilterExpression held in a variable', () => {
    const src = `
      function build(params) {
        let filter = 'amount > :min';
        filter += ' AND begins_with(SK, :prefix)';
        params.FilterExpression = filter;
      }`;
    const findings = checkSource('f.js', src);
    expect(findings).toHaveLength(1);
    expect(findings[0].function).toBe('build');
  });

  test('flags ScanCommand and dynamoHelpers.scan calls but not mentions in comments or strings', () => {
    const src = `
      // dynamoHelpers.scan follows LastEvaluatedKey
      const note = "new ScanCommand(";
      async function a() { return client.send(new ScanCommand({ TableName: 't' })); }
      async function b() { return dynamoHelpers.scan({}); }`;
    const findings = checkSource('backend/functions/x/index.js', src);
    expect(findings.map((f) => [f.rule, f.function])).toEqual([
      ['scan', 'a'],
      ['scan', 'b'],
    ]);
  });

  test('the common layer helper that implements scan is exempt', () => {
    const src = 'async function scan() { return client.send(new ScanCommand({})); }';
    expect(checkSource('backend/layers/common/nodejs/utils.js', src)).toEqual([]);
  });
});

describe('dynamo-filter-check: classify', () => {
  const f = (fn) => ({ rule: 'scan', file: 'a.js', function: fn, line: 1 });

  test('entries are a multiset: two identical findings need two entries', () => {
    const entry = { rule: 'scan', file: 'a.js', function: 'x', reason: 'r' };
    const one = classify([f('x'), f('x')], [entry]);
    expect(one.allowed).toHaveLength(1);
    expect(one.fresh).toHaveLength(1);
    const two = classify([f('x'), f('x')], [entry, entry]);
    expect(two.fresh).toHaveLength(0);
  });

  test('an entry that matches nothing is reported as stale', () => {
    const r = classify([], [{ rule: 'scan', file: 'gone.js', function: 'y', reason: 'r' }]);
    expect(r.stale).toHaveLength(1);
  });
});

describe('dynamo-filter-check: repository', () => {
  test('today every violation is allowlisted and no entry is stale', () => {
    const r = run();
    expect(r.fresh).toEqual([]);
    expect(r.stale).toEqual([]);
    // design 9.2: 12 key-in-filter lines on af9450b; Wave 3 phase 1 removed the
    // daily-reminders full-table user sweep (now the GSI3 reminder-index query)
    expect(r.findings.filter((x) => x.rule === 'key-in-filter')).toHaveLength(11);
  });

  test('a new violation fails the check', () => {
    const r = run({ allowlist: [] });
    expect(r.fresh.length).toBe(r.findings.length);
    expect(r.fresh.length).toBeGreaterThan(0);
  });
});
