/**
 * Lambda-to-Lambda `{ internalAction: 'send' }` events (Wave 3 phase 1).
 *
 * budget-alerts and daily-reminders invoke this function directly with no
 * API Gateway requestContext, so the handler must dispatch them before its
 * Cognito-claims check (until phase 1 every such call got 401 and nothing was
 * ever delivered). An API Gateway event must never reach that path.
 *
 * Imports the real handler; the common layer utils are an in-memory virtual
 * mock, keys.js and reminder-preferences.js are the real layer modules.
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
      getUserFromEvent: jest.fn((event) => {
        const claims = event.requestContext && event.requestContext.authorizer
          && event.requestContext.authorizer.claims;
        if (!claims) throw new Error('No user claims found in request');
        return { userId: claims['custom:userId'] || claims.sub };
      }),
      dynamoHelpers: {
        getItem: jest.fn(async (pk, sk) => table.get(keyOf(pk, sk)) || null),
        putItem: jest.fn(async (item) => {
          table.set(keyOf(item.PK, item.SK), { ...item });
        }),
        updateItem: jest.fn(),
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

const USER = 'user_synthetic-1';
const NOTIFICATION = {
  type: 'daily_reminder',
  title: "Log today's spending",
  body: 'Add your receipts',
  data: { type: 'daily_reminder', localDate: '2026-11-22' },
};

const records = () =>
  [...utils.__table.values()].filter((item) => item.SK.startsWith('NOTIFICATION#'));

beforeEach(() => {
  utils.__table.clear();
  jest.clearAllMocks();
});

describe('internal send events', () => {
  it('stores the in-app record for a user with no device, without reading claims', async () => {
    const res = await handler({ internalAction: 'send', userId: USER, notification: NOTIFICATION });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({ success: true, stored: true, deviceCount: 0 });
    expect(utils.getUserFromEvent).not.toHaveBeenCalled();

    const [record] = records();
    expect(records()).toHaveLength(1);
    expect(record.PK).toBe(`USER#${USER}`);
    expect(record).toMatchObject({
      entityType: 'NOTIFICATION',
      type: 'daily_reminder',
      title: NOTIFICATION.title,
      body: NOTIFICATION.body,
      data: NOTIFICATION.data,
      read: false,
    });
  });

  it('copies only type, title, body and data from the payload', async () => {
    await handler({
      internalAction: 'send',
      userId: USER,
      notification: { ...NOTIFICATION, PK: 'USER#attacker-probe', SK: 'PROBE', role: 'owner' },
    });

    const [record] = records();
    expect(record.PK).toBe(`USER#${USER}`);
    expect(record.SK).toMatch(/^NOTIFICATION#\d+$/);
    expect(record).not.toHaveProperty('role');
    expect(utils.__table.has('USER#attacker-probe|PROBE')).toBe(false);
  });

  it.each([
    ['a userId with #', { userId: 'x#USER#victim' }],
    ['a missing userId', { userId: undefined }],
    ['a missing title', { notification: { body: 'b' } }],
    ['an empty body', { notification: { title: 't', body: '' } }],
    ['a non-object notification', { notification: 'hello' }],
  ])('rejects %s with 400 and writes nothing', async (_label, override) => {
    const res = await handler({
      internalAction: 'send', userId: USER, notification: NOTIFICATION, ...override,
    });

    expect(res.statusCode).toBe(400);
    expect(utils.__table.size).toBe(0);
  });

  it('rejects an unknown internal action', async () => {
    const res = await handler({ internalAction: 'delete-everything', userId: USER });

    expect(res.statusCode).toBe(400);
    expect(utils.__table.size).toBe(0);
  });

  it('an API Gateway event carrying internalAction still needs claims', async () => {
    const res = await handler({
      httpMethod: 'POST',
      path: '/notifications/send',
      internalAction: 'send',
      userId: USER,
      notification: NOTIFICATION,
      body: JSON.stringify({ notification: NOTIFICATION }),
      requestContext: { authorizer: {} },
    }, { awsRequestId: 'req-1' });

    expect(res.statusCode).toBe(401);
    expect(utils.__table.size).toBe(0);
  });
});

describe('HTTP POST /notifications/send (kept until phase 5)', () => {
  it('validates the notification', async () => {
    const res = await handler({
      httpMethod: 'POST',
      path: '/notifications/send',
      body: JSON.stringify({ notification: { body: 'no title' } }),
      requestContext: { authorizer: { claims: { sub: USER } } },
    }, { awsRequestId: 'req-2' });

    expect(res.statusCode).toBe(400);
    expect(utils.__table.size).toBe(0);
  });
});
