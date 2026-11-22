/**
 * PUT/GET /notifications/preferences: request bodies must never choose the
 * DynamoDB item they write to (mass-assignment fix), and partial updates must
 * keep the stored values.
 *
 * Imports the real handler. The common layer is replaced by a virtual mock
 * whose dynamoHelpers keep an in-memory table and, like DynamoDB, refuse an
 * UpdateItem that tries to SET a key attribute.
 */
jest.mock(
  '/opt/nodejs/utils',
  () => {
    const table = new Map();
    const keyOf = (pk, sk) => `${pk}|${sk}`;
    const respond = (statusCode, data, message) => ({
      statusCode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: statusCode < 400, data, message }),
    });
    return {
      __table: table,
      getUserFromEvent: (event) => {
        const claims = event.requestContext && event.requestContext.authorizer
          && event.requestContext.authorizer.claims;
        if (!claims) throw new Error('No user claims found in request');
        return { userId: claims['custom:userId'] || claims.sub };
      },
      dynamoHelpers: {
        getItem: jest.fn(async (pk, sk) => table.get(keyOf(pk, sk)) || null),
        putItem: jest.fn(async (item) => {
          table.set(keyOf(item.PK, item.SK), { ...item });
        }),
        updateItem: jest.fn(async (pk, sk, updates) => {
          if ('PK' in updates || 'SK' in updates) {
            throw new Error('Cannot update attribute PK/SK: part of the key');
          }
          const current = table.get(keyOf(pk, sk)) || { PK: pk, SK: sk };
          const next = { ...current, ...updates, updatedAt: '2026-11-20T00:00:00.000Z' };
          table.set(keyOf(pk, sk), next);
          return next;
        }),
        queryByPK: jest.fn(async (pk) =>
          [...table.values()].filter((item) => item.PK === pk)),
      },
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      successResponse: (data, message = 'Success') => respond(200, data, message),
      errorResponse: {
        badRequest: (message) => respond(400, null, message),
        unauthorized: (message) => respond(401, null, message),
        notFound: (message) => respond(404, null, message),
        internalError: (message) => respond(500, null, message),
      },
    };
  },
  { virtual: true },
);

const utils = require('/opt/nodejs/utils');
const { handler } = require('./index');

const CALLER = 'user_caller';
const OWN_PK = `USER#${CALLER}`;
const OWN_SK = 'NOTIFICATION_PREFERENCES';
const FULL_PREFS = {
  budgetAlertsEnabled: false,
  dailyRemindersEnabled: true,
  reminderTime: '18:00',
  quietHoursStart: '23:00',
  quietHoursEnd: '07:00',
};

const event = (httpMethod, body) => ({
  httpMethod,
  path: '/notifications/preferences',
  body: body === undefined ? null : JSON.stringify(body),
  requestContext: { authorizer: { claims: { sub: CALLER } } },
});
const put = (body) => handler(event('PUT', body), { awsRequestId: 'req-1' });
const get = () => handler(event('GET'), { awsRequestId: 'req-2' });
const parse = (res) => JSON.parse(res.body);
const stored = () => utils.__table.get(`${OWN_PK}|${OWN_SK}`);

const ATTACK_FIELDS = {
  PK: 'USER#attacker-probe',
  SK: 'PROBE',
  GSI1PK: 'USER#victim',
  GSI1SK: 'BUDGET#victim',
  role: 'owner',
  userId: 'user_victim',
  budgetId: 'budget_victim',
  subscriptionTier: 'premium',
  ownerUserId: 'user_attacker',
  createdBy: 'user_attacker',
};

beforeEach(() => {
  utils.__table.clear();
  jest.clearAllMocks();
});

describe('PUT /notifications/preferences: client cannot choose the item key', () => {
  it('ignores key and authorization fields and writes only the caller\'s own item', async () => {
    const res = await put({ ...ATTACK_FIELDS, reminderTime: '06:45' });

    expect(res.statusCode).toBe(200);
    expect([...utils.__table.keys()]).toEqual([`${OWN_PK}|${OWN_SK}`]);
    expect(utils.__table.has('USER#attacker-probe|PROBE')).toBe(false);

    const item = stored();
    expect(item.PK).toBe(OWN_PK);
    expect(item.SK).toBe(OWN_SK);
    expect(item.reminderTime).toBe('06:45');
    for (const field of Object.keys(ATTACK_FIELDS).filter((f) => f !== 'PK' && f !== 'SK')) {
      expect(item).not.toHaveProperty(field);
    }

    const [pk, sk, updates] = utils.dynamoHelpers.updateItem.mock.calls[0];
    expect(pk).toBe(OWN_PK);
    expect(sk).toBe(OWN_SK);
    expect(Object.keys(updates).sort()).toEqual(Object.keys(FULL_PREFS).sort());
    expect(utils.dynamoHelpers.putItem).not.toHaveBeenCalled();
  });

  it('applies the same allowlist to the web client\'s nested { userId, preferences } body', async () => {
    const res = await put({
      userId: 'user_victim',
      PK: 'USER#attacker-probe',
      preferences: { ...ATTACK_FIELDS, dailyRemindersEnabled: false },
    });

    expect(res.statusCode).toBe(200);
    expect([...utils.__table.keys()]).toEqual([`${OWN_PK}|${OWN_SK}`]);
    expect(stored().dailyRemindersEnabled).toBe(false);
    expect(stored()).not.toHaveProperty('role');
    expect(stored()).not.toHaveProperty('userId');
  });

  it('rejects a body that carries only non-preference fields and writes nothing', async () => {
    const res = await put(ATTACK_FIELDS);

    expect(res.statusCode).toBe(400);
    expect(utils.__table.size).toBe(0);
    expect(utils.dynamoHelpers.updateItem).not.toHaveBeenCalled();
    expect(utils.dynamoHelpers.putItem).not.toHaveBeenCalled();
  });

  it('returns only preference fields in the response', async () => {
    const res = await put({ ...ATTACK_FIELDS, reminderTime: '06:45' });
    const { preferences } = parse(res).data;

    expect(Object.keys(preferences).sort()).toEqual(Object.keys(FULL_PREFS).sort());
  });

  it('never logs the request body', async () => {
    await put({ ...ATTACK_FIELDS, reminderTime: '06:45' });

    const logged = JSON.stringify([
      utils.logger.info.mock.calls,
      utils.logger.warn.mock.calls,
      utils.logger.error.mock.calls,
    ]);
    expect(logged).not.toContain('attacker-probe');
    expect(logged).not.toContain('06:45');
  });
});

describe('PUT /notifications/preferences: partial updates keep stored values', () => {
  it('changes only the provided field', async () => {
    utils.__table.set(`${OWN_PK}|${OWN_SK}`, { PK: OWN_PK, SK: OWN_SK, ...FULL_PREFS });

    const res = await put({ reminderTime: '07:30' });

    expect(res.statusCode).toBe(200);
    expect(utils.dynamoHelpers.updateItem.mock.calls[0][2]).toEqual({ reminderTime: '07:30' });
    expect(stored()).toMatchObject({ ...FULL_PREFS, reminderTime: '07:30' });

    const readBack = parse(await get()).data;
    expect(readBack).toMatchObject({ ...FULL_PREFS, reminderTime: '07:30' });
  });

  it('seeds defaults for the missing fields on the first save', async () => {
    const res = await put({ quietHoursStart: '21:15' });

    expect(res.statusCode).toBe(200);
    expect(stored()).toMatchObject({
      budgetAlertsEnabled: true,
      dailyRemindersEnabled: true,
      reminderTime: '19:00',
      quietHoursStart: '21:15',
      quietHoursEnd: '08:00',
    });
  });

  it('accepts a full update with every field', async () => {
    const res = await put(FULL_PREFS);

    expect(res.statusCode).toBe(200);
    expect(stored()).toMatchObject(FULL_PREFS);
  });
});

describe('PUT /notifications/preferences: invalid values return 400', () => {
  it.each([
    ['reminderTime', '24:00'],
    ['reminderTime', '7:30'],
    ['reminderTime', '19:60'],
    ['quietHoursStart', '10pm'],
    ['quietHoursEnd', ''],
    ['quietHoursEnd', 800],
    ['budgetAlertsEnabled', 'true'],
    ['budgetAlertsEnabled', 1],
    ['dailyRemindersEnabled', null],
  ])('%s = %p', async (field, value) => {
    const res = await put({ ...FULL_PREFS, [field]: value });

    expect(res.statusCode).toBe(400);
    expect(parse(res).message).toContain(field);
    expect(utils.dynamoHelpers.updateItem).not.toHaveBeenCalled();
  });

  it.each([
    ['an array body', [FULL_PREFS]],
    ['a non-object preferences wrapper', { preferences: 'all-on' }],
    ['an empty body', {}],
  ])('rejects %s', async (_label, body) => {
    const res = await put(body);

    expect(res.statusCode).toBe(400);
    expect(utils.dynamoHelpers.updateItem).not.toHaveBeenCalled();
  });
});

describe('GET /notifications/preferences', () => {
  it('returns defaults when nothing is stored', async () => {
    const res = await get();

    expect(res.statusCode).toBe(200);
    expect(parse(res).data).toEqual({
      budgetAlertsEnabled: true,
      dailyRemindersEnabled: true,
      reminderTime: '19:00',
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
    });
  });

  it('returns only preference fields from the stored item', async () => {
    utils.__table.set(`${OWN_PK}|${OWN_SK}`, {
      PK: OWN_PK, SK: OWN_SK, ...FULL_PREFS, role: 'owner', updatedAt: '2026-11-19T00:00:00.000Z',
    });

    const data = parse(await get()).data;

    expect(data).toEqual({ ...FULL_PREFS, updatedAt: '2026-11-19T00:00:00.000Z' });
  });
});

describe('sendNotification (internal POST /notifications/send)', () => {
  it('keeps the server-chosen key when the payload carries PK/SK', async () => {
    const deviceId = 'device-1'; // synthetic, not an Expo push token, so nothing is sent
    utils.__table.set(`${OWN_PK}|DEVICE#${deviceId}`, {
      PK: OWN_PK, SK: `DEVICE#${deviceId}`, deviceToken: deviceId, enabled: true,
    });

    const res = await handler({
      httpMethod: 'POST',
      path: '/notifications/send',
      body: JSON.stringify({
        notification: { PK: 'USER#attacker-probe', SK: 'PROBE', title: 't', body: 'b' },
      }),
      requestContext: { authorizer: { claims: { sub: CALLER } } },
    }, { awsRequestId: 'req-3' });

    expect(res.statusCode).toBe(200);
    const written = utils.dynamoHelpers.putItem.mock.calls[0][0];
    expect(written.PK).toBe(OWN_PK);
    expect(written.SK).toMatch(/^NOTIFICATION#\d+$/);
    expect(utils.__table.has('USER#attacker-probe|PROBE')).toBe(false);
  });
});
