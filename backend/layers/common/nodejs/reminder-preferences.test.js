'use strict';

/**
 * reminder-preferences.js (Wave 3 design section 3, tests in 9.3): the moved
 * parser, the UTC-hour derivation across time zones and DST, and the single
 * writer upsertReminderPreferences against an in-memory table that honors
 * conditions and REMOVE like DynamoDB.
 */

jest.mock('/opt/nodejs/utils', () => {
  const table = new Map();
  const keyOf = (pk, sk) => `${pk}|${sk}`;
  const conditionFailure = () => {
    const error = new Error('The conditional request failed');
    error.name = 'ConditionalCheckFailedException';
    return error;
  };
  /** Evaluates the two condition shapes the writer uses. */
  const holds = (item, { expression, names = {}, values = {} }) => {
    const notExists = /^attribute_not_exists\((#\w+)\)$/.exec(expression);
    if (notExists) return !item || item[names[notExists[1]]] === undefined;
    const equals = /^(#\w+) = (:\w+)$/.exec(expression);
    if (equals) return Boolean(item) && item[names[equals[1]]] === values[equals[2]];
    throw new Error(`unsupported condition ${expression}`);
  };
  let clock = 0;
  return {
    __table: table,
    __conditionFailure: conditionFailure,
    dynamoHelpers: {
      getItem: jest.fn(async (pk, sk) => {
        const item = table.get(keyOf(pk, sk));
        return item ? { ...item } : null;
      }),
      updateItem: jest.fn(async (pk, sk, updates, options = {}) => {
        const current = table.get(keyOf(pk, sk));
        if (options.condition && !holds(current, options.condition)) throw conditionFailure();
        clock += 1;
        const next = {
          ...(current || { PK: pk, SK: sk }),
          ...updates,
          updatedAt: `2026-11-22T00:00:00.${String(clock).padStart(3, '0')}Z`,
        };
        for (const attribute of options.remove || []) delete next[attribute];
        table.set(keyOf(pk, sk), next);
        return { ...next };
      }),
    },
  };
});

const utils = require('/opt/nodejs/utils');
const prefs = require('./reminder-preferences');

const USER = 'user_synthetic-1';
const PK = `USER#${USER}`;
const SK = 'NOTIFICATION_PREFERENCES';
const stored = () => utils.__table.get(`${PK}|${SK}`);

beforeEach(() => {
  utils.__table.clear();
  jest.clearAllMocks();
});

describe('parsePreferenceUpdates (moved unchanged, plus timezone)', () => {
  test('accepts the flat mobile body and the nested web body', () => {
    expect(prefs.parsePreferenceUpdates({ timezone: 'Asia/Kolkata', userId: 'x' }))
      .toEqual({ updates: { timezone: 'Asia/Kolkata' } });
    expect(prefs.parsePreferenceUpdates({ userId: 'x', preferences: { reminderTime: '07:00' } }))
      .toEqual({ updates: { reminderTime: '07:00' } });
  });

  test.each([
    ['Mars/Olympus'],
    ['A'.repeat(65)],
    [330],
    [''],
  ])('timezone %p is rejected', (timezone) => {
    expect(prefs.parsePreferenceUpdates({ timezone }))
      .toEqual({ error: 'timezone must be an IANA time zone' });
  });

  test('drops server-owned attributes and rejects a body with no preference field', () => {
    const { error } = prefs.parsePreferenceUpdates({
      GSI3PK: 'REMINDER#01', reminderHourUtc: 1, lastReminderDate: '2026-01-01', PK: 'USER#x',
    });
    expect(error).toMatch(/^No valid preference fields provided/);
  });

  test.each([
    ['an array', []],
    ['null', null],
    ['a non-object preferences', { preferences: 'on' }],
  ])('rejects %s', (_label, body) => {
    expect(prefs.parsePreferenceUpdates(body).error).toBeDefined();
  });
});

describe('deriveReminderHourUtc', () => {
  const NOV = new Date('2026-11-22T10:00:00Z');
  const JUL = new Date('2026-07-15T10:00:00Z');

  test.each([
    ['UTC', NOV, 19],
    ['Asia/Kolkata', NOV, 14], // +5:30: 19:00 local is 13:30Z, bucket 14, sent 19:30 local
    ['Asia/Kathmandu', NOV, 14], // +5:45: 13:15Z, bucket 14, sent 19:45 local
    ['America/St_Johns', NOV, 23], // -3:30: 22:30Z, bucket 23, sent 19:30 local
    ['America/St_Johns', JUL, 22], // -2:30 in summer
    ['America/New_York', NOV, 0], // 19:00 EST is 00:00Z the next UTC day
    ['America/New_York', JUL, 23],
  ])('%s at %s -> bucket %i, and the run at that bucket sees local hour 19', (tz, now, bucket) => {
    expect(prefs.deriveReminderHourUtc('19:00', tz, now)).toBe(bucket);

    // The first run at that UTC hour on or after tomorrow's local 19:00 is in the 19 hour.
    const tomorrow = prefs.addDays(prefs.localParts(now, tz).date, 1);
    const run = Math.ceil(prefs.utcInstantOf(tomorrow, 19, tz) / 3600000) * 3600000;
    expect(new Date(run).getUTCHours()).toBe(bucket);
    expect(prefs.localParts(run, tz)).toMatchObject({ date: tomorrow, hour: 19 });
  });

  test('minutes in reminderTime are ignored', () => {
    expect(prefs.deriveReminderHourUtc('19:45', 'UTC', NOV)).toBe(19);
  });

  test('derives for the next local day, so the bucket is right across spring-forward', () => {
    // Saturday 2026-03-07 19:00 EST run (00:00Z Sunday); Sunday 19:00 is EDT = 23:00Z
    expect(prefs.deriveReminderHourUtc('19:00', 'America/New_York', new Date('2026-03-08T00:00:00Z')))
      .toBe(23);
    // and across fall-back: Saturday 2026-10-31 19:00 EDT run; Sunday 19:00 EST = 00:00Z
    expect(prefs.deriveReminderHourUtc('19:00', 'America/New_York', new Date('2026-10-31T23:00:00Z')))
      .toBe(0);
  });

  test('America/St_Johns DST switch moves the bucket by one hour', () => {
    // 2026-03-08 02:00 local is the switch; derived on the 7th for the 8th
    expect(prefs.deriveReminderHourUtc('19:00', 'America/St_Johns', new Date('2026-03-07T12:00:00Z')))
      .toBe(22);
    expect(prefs.deriveReminderHourUtc('19:00', 'America/St_Johns', new Date('2026-03-06T12:00:00Z')))
      .toBe(23);
  });

  test('a spring-forward day where HH:00 does not exist skips once, then re-buckets', () => {
    // 02:00 does not exist in New York on 2026-03-08: first valid instant 07:00Z (03:00 EDT)
    const gapBucket = prefs.deriveReminderHourUtc('02:00', 'America/New_York', new Date('2026-03-07T12:00:00Z'));
    expect(gapBucket).toBe(7);
    expect(prefs.localParts(Date.UTC(2026, 2, 8, 7), 'America/New_York').hour).toBe(3); // != 2: skipped
    expect(prefs.deriveReminderHourUtc('02:00', 'America/New_York', new Date('2026-03-08T12:00:00Z')))
      .toBe(6); // 2026-03-09 02:00 EDT
  });
});

describe('upsertReminderPreferences', () => {
  const NOW = new Date('2026-11-22T10:00:00Z');

  test('onboarding ({}) creates the item with defaults and the GSI3 keys', async () => {
    const result = await prefs.upsertReminderPreferences(USER, {}, { now: NOW });

    expect(result).toMatchObject({ success: true, written: true });
    expect(stored()).toMatchObject({
      ...prefs.DEFAULT_NOTIFICATION_PREFERENCES,
      reminderHourUtc: 19,
      GSI3PK: 'REMINDER#19',
      GSI3SK: PK,
    });
    expect(result.preferences).toEqual(prefs.DEFAULT_NOTIFICATION_PREFERENCES);
    // a new item is created only if none exists
    expect(utils.dynamoHelpers.updateItem.mock.calls[0][3].condition.expression)
      .toBe('attribute_not_exists(#seenUpdatedAt)');
  });

  test('timezone only: keeps saved choices, moves the bucket', async () => {
    await prefs.upsertReminderPreferences(USER, { reminderTime: '07:00' }, { now: NOW });
    await prefs.upsertReminderPreferences(USER, { timezone: 'Asia/Kolkata' }, { now: NOW });

    expect(stored()).toMatchObject({
      reminderTime: '07:00',
      dailyRemindersEnabled: true,
      timezone: 'Asia/Kolkata',
      reminderHourUtc: 2, // 07:00 IST = 01:30Z -> 02
      GSI3PK: 'REMINDER#02',
    });
  });

  test('dailyRemindersEnabled false REMOVEs the GSI3 keys; true puts them back', async () => {
    await prefs.upsertReminderPreferences(USER, {}, { now: NOW });
    await prefs.upsertReminderPreferences(USER, { dailyRemindersEnabled: false }, { now: NOW });

    expect(stored().dailyRemindersEnabled).toBe(false);
    expect(stored()).not.toHaveProperty('GSI3PK');
    expect(stored()).not.toHaveProperty('GSI3SK');

    await prefs.upsertReminderPreferences(USER, { dailyRemindersEnabled: true }, { now: NOW });
    expect(stored()).toMatchObject({ GSI3PK: 'REMINDER#19', GSI3SK: PK });
  });

  test('conditions on the updatedAt it read and retries once on a conflict', async () => {
    await prefs.upsertReminderPreferences(USER, {}, { now: NOW });
    const realUpdate = utils.dynamoHelpers.updateItem.getMockImplementation();
    utils.dynamoHelpers.updateItem.mockImplementationOnce(async () => {
      throw utils.__conditionFailure();
    });

    await prefs.upsertReminderPreferences(USER, { reminderTime: '08:00' }, { now: NOW });

    expect(utils.dynamoHelpers.getItem).toHaveBeenCalledTimes(3); // 1 create + 2 attempts
    expect(stored().reminderTime).toBe('08:00');
    const secondCondition = utils.dynamoHelpers.updateItem.mock.calls[2][3].condition;
    expect(secondCondition.expression).toBe('#seenUpdatedAt = :seenUpdatedAt');
    expect(typeof realUpdate).toBe('function');
  });

  test('a second conflict is rethrown and nothing more is written', async () => {
    utils.dynamoHelpers.updateItem.mockImplementationOnce(async () => {
      throw utils.__conditionFailure();
    }).mockImplementationOnce(async () => {
      throw utils.__conditionFailure();
    });

    await expect(prefs.upsertReminderPreferences(USER, {}, { now: NOW }))
      .rejects.toMatchObject({ name: 'ConditionalCheckFailedException' });
    expect(utils.dynamoHelpers.updateItem).toHaveBeenCalledTimes(2);
    expect(stored()).toBeUndefined();
  });

  test('other errors are not retried', async () => {
    utils.dynamoHelpers.updateItem.mockImplementationOnce(async () => {
      throw Object.assign(new Error('boom'), { name: 'ProvisionedThroughputExceededException' });
    });

    await expect(prefs.upsertReminderPreferences(USER, {}, { now: NOW })).rejects.toThrow('boom');
    expect(utils.dynamoHelpers.updateItem).toHaveBeenCalledTimes(1);
  });

  test('skipIfUnchanged makes a repeated backfill a no-op', async () => {
    const first = await prefs.upsertReminderPreferences(USER, {}, { now: NOW, skipIfUnchanged: true });
    const second = await prefs.upsertReminderPreferences(USER, {}, { now: NOW, skipIfUnchanged: true });

    expect(first.written).toBe(true);
    expect(second.written).toBe(false);
    expect(utils.dynamoHelpers.updateItem).toHaveBeenCalledTimes(1);
  });

  test('rejects a userId that could reach another key family', async () => {
    await expect(prefs.upsertReminderPreferences('x#PROFILE', {}, { now: NOW }))
      .rejects.toMatchObject({ name: 'KeyValidationError' });
    expect(utils.dynamoHelpers.getItem).not.toHaveBeenCalled();
  });
});

describe('getNotificationPreferences', () => {
  test('returns defaults (with timezone) and only preference fields', async () => {
    utils.__table.set(`${PK}|${SK}`, {
      PK, SK, reminderTime: '06:00', GSI3PK: 'REMINDER#06', reminderHourUtc: 6,
      lastReminderDate: '2026-11-21', updatedAt: '2026-11-21T00:00:00.000Z',
    });

    expect(await prefs.getNotificationPreferences(USER)).toEqual({
      ...prefs.DEFAULT_NOTIFICATION_PREFERENCES,
      reminderTime: '06:00',
      updatedAt: '2026-11-21T00:00:00.000Z',
    });
  });
});
