/**
 * budget-alerts phase 1 changes (Wave 3 design section 9.3): the stream guard,
 * the direct health event, and the period `groups` shape stored periods use.
 * Imports the real handler; the layer and Lambda client are mapped to local
 * stubs in jest.config.js.
 */
process.env.TABLE_NAME = 'test-table';
process.env.NOTIFICATION_FUNCTION_ARN = 'arn:aws:lambda:us-east-1:<ACCOUNT_ID>:function:notifications';

const { marshall } = require('@aws-sdk/util-dynamodb');
const { dynamoHelpers } = require('/opt/nodejs/utils');
const { __send: mockLambdaSend } = require('@aws-sdk/client-lambda');
const { handler, streamSkipReason, alertCategories } = require('./index');

const BUDGET_ID = 'budget-123';
const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

function streamEvent(image) {
  return {
    Records: [{
      eventID: '1',
      eventName: 'INSERT',
      eventSource: 'aws:dynamodb',
      dynamodb: {
        NewImage: marshall({
          PK: `BUDGET#${BUDGET_ID}`,
          SK: 'TRANSACTION#txn_1',
          budgetId: BUDGET_ID,
          amount: 450,
          type: 'expense',
          ...image,
        }),
      },
    }],
  };
}

/** A period as stored today: groups is an object of flat category arrays. */
function storedPeriod(month = CURRENT_MONTH) {
  return {
    PK: `BUDGET#${BUDGET_ID}`,
    SK: `PERIOD#${month}`,
    budgetId: BUDGET_ID,
    month,
    groups: {
      income: [{ id: 'inc', name: 'Income', plannedAmount: 1000, spentAmount: 1000 }],
      savings: [],
      expenses: [{ id: 'gro', name: 'Groceries', plannedAmount: 500, spentAmount: 450 }],
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  dynamoHelpers.getItem.mockImplementation(async (_pk, sk) => (sk.startsWith('PERIOD#') ? storedPeriod() : null));
  dynamoHelpers.queryByPK.mockResolvedValue([{ userId: 'user-1', status: 'active' }]);
  dynamoHelpers.putItem.mockResolvedValue(undefined);
  mockLambdaSend.mockResolvedValue({ StatusCode: 202 });
});

afterEach(() => {
  console.log.mockRestore();
});

describe('stream guard', () => {
  it('a current-month manual row alerts', async () => {
    await handler(streamEvent({ budgetMonth: CURRENT_MONTH }));

    expect(mockLambdaSend).toHaveBeenCalled();
    const event = JSON.parse(Buffer.from(mockLambdaSend.mock.calls[0][0].input.Payload).toString('utf8'));
    expect(event).toMatchObject({ internalAction: 'send', userId: 'user-1' });
    expect(event.notification.data.category).toBe('Groceries');
  });

  it('a row with migrationRunId produces no notification and no read', async () => {
    await handler(streamEvent({ budgetMonth: CURRENT_MONTH, migrationRunId: 'run-1' }));

    expect(mockLambdaSend).not.toHaveBeenCalled();
    expect(dynamoHelpers.getItem).not.toHaveBeenCalled();
  });

  it('a row dated in a past month produces no notification', async () => {
    await handler(streamEvent({ budgetMonth: '2024-01' }));

    expect(mockLambdaSend).not.toHaveBeenCalled();
    expect(dynamoHelpers.getItem).not.toHaveBeenCalled();
  });

  it('treats both months around a month boundary as current', () => {
    const now = new Date('2026-12-01T03:00:00Z'); // still November in UTC-12 .. UTC-4
    expect(streamSkipReason({}, '2026-11', now)).toBeNull();
    expect(streamSkipReason({}, '2026-12', now)).toBeNull();
    expect(streamSkipReason({}, '2026-10', now)).toBe('other_month');
  });
});

describe('period groups shape', () => {
  it('reads the stored object form: expenses and savings, never income', () => {
    expect(alertCategories(storedPeriod()).map((c) => c.name)).toEqual(['Groceries']);
  });

  it('still reads the older array-of-groups form', () => {
    expect(alertCategories({ groups: [{ categories: [{ name: 'Food' }] }] }).map((c) => c.name))
      .toEqual(['Food']);
  });
});

describe('direct health invoke', () => {
  it('returns 200 for { healthCheck: true } with every data and SDK call throwing', async () => {
    for (const fn of Object.values(dynamoHelpers)) {
      fn.mockImplementation(async () => { throw new Error('no data access expected'); });
    }
    mockLambdaSend.mockImplementation(async () => { throw new Error('no invoke expected'); });

    const result = await handler({ healthCheck: true });

    expect(result).toEqual({ statusCode: 200, body: JSON.stringify({ status: 'healthy' }) });
    for (const fn of Object.values(dynamoHelpers)) expect(fn).not.toHaveBeenCalled();
    expect(mockLambdaSend).not.toHaveBeenCalled();
  });
});
