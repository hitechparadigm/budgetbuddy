/**
 * Integration Tests for Budget Alerts Service
 *
 * These tests verify the complete flow of budget alert detection,
 * threshold checking, deduplication, and notification delivery.
 *
 * NOTE: These tests use mocked AWS services to avoid costs. The common layer
 * (/opt/nodejs/utils) and @aws-sdk/client-lambda are mapped to local stubs in
 * jest.config.js. For real AWS integration testing, run manually in dev.
 */

process.env.TABLE_NAME = 'test-table';
process.env.NOTIFICATION_FUNCTION_ARN =
  'arn:aws:lambda:us-east-1:123456789012:function:notifications';

const { marshall } = require('@aws-sdk/util-dynamodb');
const { dynamoHelpers } = require('/opt/nodejs/utils');
const { __send: mockLambdaSend } = require('@aws-sdk/client-lambda');
const { handler } = require('./index');

const BUDGET_ID = 'budget-123';
const MONTH = '2024-01';

/** DynamoDB Stream INSERT event for a transaction in BUDGET#budget-123 */
function transactionStreamEvent(amount) {
  return {
    Records: [
      {
        eventID: '1',
        eventName: 'INSERT',
        eventSource: 'aws:dynamodb',
        dynamodb: {
          NewImage: marshall({
            PK: `BUDGET#${BUDGET_ID}`,
            SK: 'TXN#txn-456',
            amount,
            category: 'Groceries',
            budgetId: BUDGET_ID,
            budgetMonth: MONTH,
            type: 'expense',
            description: 'Grocery shopping',
            createdAt: '2024-01-31T12:00:00.000Z',
          }),
        },
      },
    ],
  };
}

/** Budget PERIOD record as stored at BUDGET#<budgetId> / PERIOD#<month> */
function budgetPeriod(spentAmount, month = MONTH) {
  return {
    PK: `BUDGET#${BUDGET_ID}`,
    SK: `PERIOD#${month}`,
    budgetId: BUDGET_ID,
    month,
    groups: [
      {
        name: 'Food',
        categories: [{ id: 'groceries', name: 'Groceries', plannedAmount: 500, spentAmount }],
      },
    ],
  };
}

/**
 * Route getItem by sort key: the PERIOD# read returns `period`, ALERT# reads
 * return a stored alert only for thresholds listed in `alreadySent`.
 */
function mockTable(period, alreadySent = []) {
  dynamoHelpers.getItem.mockImplementation(async (pk, sk) => {
    if (sk.startsWith('PERIOD#')) return period;
    if (sk.startsWith('ALERT#')) {
      const threshold = Number(sk.split('-').pop());
      return alreadySent.includes(threshold) ? { PK: pk, SK: sk, threshold } : null;
    }
    return null;
  });
}

function mockMembers(userIds) {
  dynamoHelpers.queryByPK.mockResolvedValue(
    userIds.map((userId) => ({
      PK: `BUDGET#${BUDGET_ID}`,
      SK: `MEMBER#${userId}`,
      userId,
      status: 'active',
    })),
  );
}

/** Decode the notification envelope from an InvokeCommand Payload */
function decodePayload(command) {
  const envelope = JSON.parse(Buffer.from(command.input.Payload).toString('utf8'));
  return JSON.parse(envelope.body);
}

function alertPuts() {
  return dynamoHelpers.putItem.mock.calls
    .map((call) => call[0])
    .filter((item) => item.SK && item.SK.startsWith('ALERT#'));
}

describe('Integration Tests: Budget Alert Flow (Task 10.5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    dynamoHelpers.putItem.mockResolvedValue(undefined);
    mockLambdaSend.mockResolvedValue({ StatusCode: 202 });
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  it('should trigger alert when 80% threshold crossed', async () => {
    mockTable(budgetPeriod(400));
    mockMembers(['user-123', 'user-456']);

    const result = await handler(transactionStreamEvent(400));

    expect(result.statusCode).toBe(200);

    // Budget period fetched from the BUDGET# partition
    expect(dynamoHelpers.getItem).toHaveBeenCalledWith(`BUDGET#${BUDGET_ID}`, `PERIOD#${MONTH}`);

    // Alert deduplication checked
    const dedupCall = dynamoHelpers.getItem.mock.calls.find(([, sk]) => sk.startsWith('ALERT#'));
    expect(dedupCall).toBeDefined();

    // Budget members fetched via MEMBER# records
    expect(dynamoHelpers.queryByPK).toHaveBeenCalledWith(
      `BUDGET#${BUDGET_ID}`,
      expect.objectContaining({
        KeyConditionExpression: expect.stringContaining('begins_with(SK, :sk)'),
        ExpressionAttributeValues: { ':sk': 'MEMBER#' },
      }),
    );

    // Notifications sent asynchronously to both members
    expect(mockLambdaSend).toHaveBeenCalledTimes(2);
    const invoke = mockLambdaSend.mock.calls[0][0].input;
    expect(invoke.FunctionName).toBe(process.env.NOTIFICATION_FUNCTION_ARN);
    expect(invoke.InvocationType).toBe('Event');
    const recipients = mockLambdaSend.mock.calls.map(([cmd]) => decodePayload(cmd).userId);
    expect(recipients).toEqual(['user-123', 'user-456']);

    // Alert marked as sent with a 90-day TTL
    const puts = alertPuts();
    expect(puts).toHaveLength(1);
    expect(puts[0].threshold).toBe(0.8);
    const ninetyDays = 90 * 24 * 60 * 60;
    expect(puts[0].expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000) + ninetyDays - 60);
  });

  it('should prevent duplicate alerts within 24 hours', async () => {
    mockTable(budgetPeriod(400), [0.8]);
    mockMembers(['user-123']);

    await handler(transactionStreamEvent(400));

    expect(mockLambdaSend).not.toHaveBeenCalled();
    expect(alertPuts()).toHaveLength(0);
  });

  it('should send alerts to all family members', async () => {
    // 90% spent; the 80% alert already went out, so only the 90% alert fires
    mockTable(budgetPeriod(450), [0.8]);
    mockMembers(['user-123', 'user-456', 'user-789']);

    await handler(transactionStreamEvent(450));

    expect(mockLambdaSend).toHaveBeenCalledTimes(3);

    const { notification } = decodePayload(mockLambdaSend.mock.calls[0][0]);
    expect(notification.data.threshold).toBe(0.9);
    expect(notification.data.category).toBe('Groceries');
  });

  it('should detect 90% and 100% thresholds', async () => {
    mockTable(budgetPeriod(450), [0.8]);
    mockMembers(['user-123']);

    await handler(transactionStreamEvent(450));

    expect(alertPuts().find((item) => item.threshold === 0.9)).toBeDefined();

    jest.clearAllMocks();
    dynamoHelpers.putItem.mockResolvedValue(undefined);
    mockLambdaSend.mockResolvedValue({ StatusCode: 202 });
    mockTable(budgetPeriod(500), [0.8, 0.9]);
    mockMembers(['user-123']);

    await handler(transactionStreamEvent(500));

    expect(alertPuts().find((item) => item.threshold === 1.0)).toBeDefined();
  });

  it('should handle scheduled check for missed alerts', async () => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    dynamoHelpers.scan.mockResolvedValue([budgetPeriod(400, currentMonth)]);
    mockTable(null);
    mockMembers(['user-123']);

    const result = await handler({ source: 'aws.events', 'detail-type': 'Scheduled Event' });

    expect(result.statusCode).toBe(200);
    expect(dynamoHelpers.scan).toHaveBeenCalledWith(
      expect.objectContaining({
        FilterExpression: 'begins_with(PK, :pkPrefix) AND SK = :sk',
        ExpressionAttributeValues: { ':pkPrefix': 'BUDGET#', ':sk': `PERIOD#${currentMonth}` },
      }),
    );
    expect(mockLambdaSend).toHaveBeenCalled();
  });
});
