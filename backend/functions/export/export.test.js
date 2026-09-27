/**
 * Export Lambda Function Tests
 * Tests for budget/transaction export (CSV, JSON, PDF) and entitlement gating.
 */

const { handler } = require('./index');
const { dynamoHelpers } = require('/opt/nodejs/utils');
const { canUseFeature } = require('/opt/nodejs/entitlements');

describe('Export Lambda Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    canUseFeature.mockReturnValue(true);
    dynamoHelpers.queryByPK.mockResolvedValue([]);
  });

  it('type=csv with default (free-tier) mocks returns 200 with CSV body', async () => {
    const event = {
      httpMethod: 'GET',
      queryStringParameters: { type: 'csv' },
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(result.headers['Content-Type']).toBe('text/csv');
    expect(result.body).toContain('Date,Category,Description,Amount,Type,Budget Month,Item Type');
  });

  it('type=json with default (free-tier) mocks returns 200 with JSON body', async () => {
    const event = {
      httpMethod: 'GET',
      queryStringParameters: { type: 'json' },
    };

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(result.headers['Content-Type']).toBe('application/json');
    expect(body.application).toBe('BudgetBuddy');
  });

  it('type=pdf with default (free-tier) mocks returns 200 (PDF being prepared response)', async () => {
    const event = {
      httpMethod: 'GET',
      queryStringParameters: { type: 'pdf' },
    };

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.message).toContain('PDF export is being prepared');
    expect(body.supported).toEqual(['csv', 'json']);
  });

  it('type=csv with canUseFeature mocked to return false returns 403 Upgrade_Prompt_Response without querying DynamoDB', async () => {
    canUseFeature.mockReturnValueOnce(false);

    const event = {
      httpMethod: 'GET',
      queryStringParameters: { type: 'csv' },
    };

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(403);
    expect(body.error).toBe('Upgrade required');
    expect(body.message).toContain('premium subscription');
    expect(dynamoHelpers.queryByPK).not.toHaveBeenCalled();
  });

  it('type=invalidformat with default mocks returns existing 400 response, independent of entitlement check', async () => {
    const event = {
      httpMethod: 'GET',
      queryStringParameters: { type: 'invalidformat' },
    };

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(400);
    expect(body.error).toContain('Unsupported export type');
  });
});
