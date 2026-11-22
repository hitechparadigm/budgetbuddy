'use strict';

/**
 * Tests for the Wave 3 phase 0 dynamoHelpers additions: queryAll,
 * queryByPrefix, queryGSIRange, queryPage, transactWrite and the runtime
 * key-in-filter warning (design 2.5, 9.2).
 */

jest.mock('@aws-sdk/lib-dynamodb', () => {
  const actual = jest.requireActual('@aws-sdk/lib-dynamodb');
  const sendMock = jest.fn();
  return {
    ...actual,
    __sendMock: sendMock,
    DynamoDBDocumentClient: { from: () => ({ send: sendMock }) },
  };
});

const { __sendMock: mockSend } = require('@aws-sdk/lib-dynamodb');
const { dynamoHelpers } = require('./utils');

const logLines = (spy) => spy.mock.calls.map((c) => String(c[0]));

describe('dynamoHelpers query helpers', () => {
  let warnSpy;
  let logSpy;

  beforeEach(() => {
    mockSend.mockReset();
    process.env.TABLE_NAME = 'test-table';
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  test('queryByPrefix puts the prefix in the key condition and follows every page', async () => {
    mockSend
      .mockResolvedValueOnce({ Items: [{ SK: 'PERIOD#2026-10' }], LastEvaluatedKey: { PK: 'p', SK: 'k' } })
      .mockResolvedValueOnce({ Items: [{ SK: 'PERIOD#2026-11' }] });

    const items = await dynamoHelpers.queryByPrefix('BUDGET#b1', 'PERIOD#', {
      ExpressionAttributeValues: { ':pk': 'attacker', ':x': 1 },
    });

    expect(items).toHaveLength(2);
    const first = mockSend.mock.calls[0][0].input;
    expect(first.TableName).toBe('test-table');
    expect(first.KeyConditionExpression).toBe('PK = :pk AND begins_with(SK, :skPrefix)');
    // caller values merge in but cannot replace the helper's own
    expect(first.ExpressionAttributeValues).toEqual({ ':pk': 'BUDGET#b1', ':skPrefix': 'PERIOD#', ':x': 1 });
    expect(first.FilterExpression).toBeUndefined();
    expect(mockSend.mock.calls[1][0].input.ExclusiveStartKey).toEqual({ PK: 'p', SK: 'k' });
  });

  test('queryByPrefix stops at maxItems and logs a warning', async () => {
    mockSend.mockResolvedValue({ Items: [{ a: 1 }, { a: 2 }], LastEvaluatedKey: { PK: 'x' } });

    const items = await dynamoHelpers.queryByPrefix('BUDGET#b1', 'TRANSACTION#', { maxItems: 3 });

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(items).toHaveLength(4);
    expect(logLines(warnSpy).some((l) => l.includes('maxItems'))).toBe(true);
  });

  test('queryGSIRange builds a BETWEEN key condition on the named index', async () => {
    mockSend.mockResolvedValueOnce({ Items: [{ id: 1 }] });

    const items = await dynamoHelpers.queryGSIRange('GSI1', 'BUDGET#b1', 'DATE#2026-11-01', 'DATE#2026-11-30#~');

    expect(items).toEqual([{ id: 1 }]);
    const input = mockSend.mock.calls[0][0].input;
    expect(input.IndexName).toBe('GSI1');
    expect(input.KeyConditionExpression).toBe('GSI1PK = :gsipk AND GSI1SK BETWEEN :from AND :to');
    expect(input.ExpressionAttributeValues).toEqual({
      ':gsipk': 'BUDGET#b1',
      ':from': 'DATE#2026-11-01',
      ':to': 'DATE#2026-11-30#~',
    });
  });

  test('queryGSIRange rejects an unknown index name', async () => {
    await expect(dynamoHelpers.queryGSIRange('GSI9', 'x', 'a', 'b')).rejects.toThrow('unknown index');
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('queryAll paginates a caller-built query', async () => {
    mockSend
      .mockResolvedValueOnce({ Items: [{ n: 1 }], LastEvaluatedKey: { k: 1 } })
      .mockResolvedValueOnce({ Items: [{ n: 2 }] });

    const items = await dynamoHelpers.queryAll({
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :pk',
      ExpressionAttributeValues: { ':pk': 'REMINDER#19' },
    });

    expect(items).toEqual([{ n: 1 }, { n: 2 }]);
    expect(mockSend.mock.calls[0][0].input.IndexName).toBe('GSI3');
  });

  test('queryPage returns one page and its cursor', async () => {
    mockSend.mockResolvedValueOnce({ Items: [{ n: 1 }], LastEvaluatedKey: { PK: 'a', SK: 'b' } });

    const page = await dynamoHelpers.queryPage(
      { KeyConditionExpression: 'PK = :pk', ExpressionAttributeValues: { ':pk': 'BUDGET#b1' } },
      { limit: 25, startKey: { PK: 'z', SK: 'y' } },
    );

    expect(page).toEqual({ items: [{ n: 1 }], lastEvaluatedKey: { PK: 'a', SK: 'b' } });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const input = mockSend.mock.calls[0][0].input;
    expect(input.Limit).toBe(25);
    expect(input.ExclusiveStartKey).toEqual({ PK: 'z', SK: 'y' });
  });

  test('transactWrite adds the table name and passes the client request token', async () => {
    mockSend.mockResolvedValueOnce({});

    await dynamoHelpers.transactWrite(
      [
        { Put: { Item: { PK: 'BUDGET#b1', SK: 'TRANSACTION#t1' }, ConditionExpression: 'attribute_not_exists(PK)' } },
        { Update: { Key: { PK: 'BUDGET#b1', SK: 'TOTAL#2026-11#ALL' }, UpdateExpression: 'ADD amount :a', ExpressionAttributeValues: { ':a': 5 } } },
      ],
      'token-1',
    );

    const input = mockSend.mock.calls[0][0].input;
    expect(input.ClientRequestToken).toBe('token-1');
    expect(input.TransactItems).toHaveLength(2);
    expect(input.TransactItems[0].Put.TableName).toBe('test-table');
    expect(input.TransactItems[1].Update.TableName).toBe('test-table');
  });

  test.each([[[]], [new Array(101).fill({ Put: { Item: {} } })], [null]])(
    'transactWrite rejects an action list of the wrong size',
    async (items) => {
      await expect(dynamoHelpers.transactWrite(items)).rejects.toThrow('between 1 and 100');
      expect(mockSend).not.toHaveBeenCalled();
    },
  );

  test('a FilterExpression naming a key attribute logs a warning and an EMF metric, and still runs', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });

    await dynamoHelpers.queryByPK('USER#u1', {
      FilterExpression: 'begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':prefix': 'DEVICE#' },
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(logLines(warnSpy).some((l) => l.includes('FilterExpression names a key attribute'))).toBe(true);
    const emf = logLines(logSpy).map((l) => JSON.parse(l)).find((o) => o._aws);
    expect(emf._aws.CloudWatchMetrics[0].Namespace).toBe('BudgetBuddy/Data');
    expect(emf.FilterOnKeyAttribute).toBe(1);
  });

  test('a key attribute behind an ExpressionAttributeNames placeholder is detected too', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });

    await dynamoHelpers.scan({ FilterExpression: '#k = :v', ExpressionAttributeNames: { '#k': 'GSI3PK' }, ExpressionAttributeValues: { ':v': 1 } });

    expect(logLines(warnSpy).some((l) => l.includes('FilterExpression names a key attribute'))).toBe(true);
  });

  test('a filter on ordinary attributes and value placeholders such as :sk does not warn', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });

    await dynamoHelpers.queryByPrefix('BUDGET#b1', 'TRANSACTION#', {
      FilterExpression: 'isDeleted <> :sk AND #s = :active',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':sk': true, ':active': 'active' },
    });

    expect(logLines(warnSpy).some((l) => l.includes('FilterExpression names a key attribute'))).toBe(false);
  });
});
