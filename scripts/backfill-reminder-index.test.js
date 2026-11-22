/**
 * Tests for scripts/backfill-reminder-index.js (Wave 3 phase 1): dry run by
 * default, --apply writes through the real layer writer, re-running is a
 * no-op, saved choices are kept, and no user identifier is reported.
 *
 * The real layer modules run; only their DynamoDB helpers are an in-memory
 * fake that honors the writer's conditions and REMOVE.
 */
jest.mock(
  '/opt/nodejs/utils',
  () => {
    const table = new Map();
    const keyOf = (pk, sk) => `${pk}|${sk}`;
    const holds = (item, { expression, names = {}, values = {} }) => {
      const notExists = /^attribute_not_exists\((#\w+)\)$/.exec(expression);
      if (notExists) return !item || item[names[notExists[1]]] === undefined;
      const equals = /^(#\w+) = (:\w+)$/.exec(expression);
      if (equals) return Boolean(item) && item[names[equals[1]]] === values[equals[2]];
      throw new Error(`unsupported condition ${expression}`);
    };
    let tick = 0;
    return {
      __table: table,
      dynamoHelpers: {
        getItem: jest.fn(async (pk, sk) => {
          const item = table.get(keyOf(pk, sk));
          return item ? { ...item } : null;
        }),
        updateItem: jest.fn(async (pk, sk, updates, options = {}) => {
          const current = table.get(keyOf(pk, sk));
          if (options.condition && !holds(current, options.condition)) {
            throw Object.assign(new Error('conditional'), { name: 'ConditionalCheckFailedException' });
          }
          tick += 1;
          const next = { ...(current || { PK: pk, SK: sk }), ...updates, updatedAt: `t${tick}` };
          for (const attribute of options.remove || []) delete next[attribute];
          table.set(keyOf(pk, sk), next);
          return { ...next };
        }),
      },
    };
  },
  { virtual: true },
);
jest.mock('/opt/nodejs/keys', () => jest.requireActual('../backend/layers/common/nodejs/keys'), {
  virtual: true,
});

const utils = require('/opt/nodejs/utils');
const prefs = require('../backend/layers/common/nodejs/reminder-preferences');
const keys = require('../backend/layers/common/nodejs/keys');
const { parseArgs, profileUserIds, runBackfill } = require('./backfill-reminder-index');

const NOW = new Date('2026-11-22T10:00:00Z');
const SK = 'NOTIFICATION_PREFERENCES';
const item = (userId) => utils.__table.get(`USER#${userId}|${SK}`);
const deps = (apply, userIds) => ({
  apply,
  now: NOW,
  prefs,
  listUserIds: async () => userIds,
  getPreferencesItem: (userId) => utils.dynamoHelpers.getItem(`USER#${userId}`, SK),
});

beforeEach(() => {
  utils.__table.clear();
  jest.clearAllMocks();
  // a user who saved choices before the index existed (no GSI3 keys yet)
  utils.__table.set(`USER#user_saved|${SK}`, {
    PK: 'USER#user_saved', SK, dailyRemindersEnabled: true, reminderTime: '07:00',
    budgetAlertsEnabled: false, updatedAt: 'old',
  });
  // a user who turned reminders off
  utils.__table.set(`USER#user_off|${SK}`, {
    PK: 'USER#user_off', SK, dailyRemindersEnabled: false, updatedAt: 'old',
  });
});

describe('parseArgs', () => {
  it('is a dry run unless --apply is given, and rejects anything else', () => {
    expect(parseArgs([])).toEqual({ apply: false });
    expect(parseArgs(['--apply'])).toEqual({ apply: true });
    expect(() => parseArgs(['--force'])).toThrow('Unknown argument');
  });
});

describe('profileUserIds', () => {
  it('keeps only USER#<id>/PROFILE items of the key-only Scan', () => {
    const items = [
      { PK: 'USER#user_a', SK: 'PROFILE' },
      { PK: 'USER#user_a', SK: 'NOTIFICATION_PREFERENCES' },
      { PK: 'BUDGET#budget_1', SK: 'PROFILE' },
      { PK: 'BUDGET#budget_1', SK: 'METADATA' },
      { PK: 'INVITATION#inv_1', SK: 'METADATA' },
      { SK: 'PROFILE' },
      { PK: 'USER#user_b', SK: 'PROFILE' },
    ];

    expect(profileUserIds(items, keys)).toEqual(['user_a', 'user_b']);
    expect(profileUserIds([], keys)).toEqual([]);
  });
});

describe('runBackfill', () => {
  const USERS = ['user_new', 'user_saved', 'user_off'];

  it('dry run reports what would change and writes nothing', async () => {
    const summary = await runBackfill(deps(false, USERS));

    expect(summary).toMatchObject({
      mode: 'dry-run', users: 3, wouldCreate: 1, wouldUpdate: 2, created: 0, updated: 0, failed: 0,
    });
    expect(utils.dynamoHelpers.updateItem).not.toHaveBeenCalled();
  });

  it('--apply adds defaults and GSI3 keys and keeps saved choices', async () => {
    const summary = await runBackfill(deps(true, USERS));

    expect(summary).toMatchObject({ mode: 'apply', created: 1, updated: 2, failed: 0 });
    expect(item('user_new')).toMatchObject({
      ...prefs.DEFAULT_NOTIFICATION_PREFERENCES, GSI3PK: 'REMINDER#19', GSI3SK: 'USER#user_new',
    });
    expect(item('user_saved')).toMatchObject({
      reminderTime: '07:00', budgetAlertsEnabled: false, reminderHourUtc: 7, GSI3PK: 'REMINDER#07',
    });
    expect(item('user_off').dailyRemindersEnabled).toBe(false);
    expect(item('user_off')).not.toHaveProperty('GSI3PK');
  });

  it('is idempotent: a second --apply writes nothing', async () => {
    await runBackfill(deps(true, USERS));
    utils.dynamoHelpers.updateItem.mockClear();

    const again = await runBackfill(deps(true, USERS));

    expect(again).toMatchObject({ unchanged: 3, created: 0, updated: 0 });
    expect(utils.dynamoHelpers.updateItem).not.toHaveBeenCalled();
  });

  it('counts an invalid stored userId as a failure by error name, without printing it', async () => {
    const summary = await runBackfill(deps(true, ['bad#id', 'user_new']));

    expect(summary).toMatchObject({ created: 1, failed: 1, failures: { KeyValidationError: 1 } });
    expect(JSON.stringify(summary)).not.toContain('bad#id');
    expect(JSON.stringify(summary)).not.toContain('user_new');
  });
});
