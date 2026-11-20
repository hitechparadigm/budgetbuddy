/**
 * Tests for the rules Lambda.
 *
 * The real handler is imported; only the Lambda layer is mocked, and the mock
 * exposes exactly the real layer's surface (see __mocks__/utils.js). Several
 * of these tests exist because the handler was calling things that do not
 * exist on that surface — `errorResponse.internal`, `dynamoHelpers.query`,
 * `dynamoHelpers.deleteItem` — and a permissive mock would have hidden all
 * three.
 */

const { handler } = require('./index');
const { dynamoHelpers, BudgetAccessResolver, errorResponse } = require('/opt/nodejs/utils');

const CTX = { awsRequestId: 'req_test' };

function storedRule(overrides = {}) {
  return {
    PK: 'BUDGET#budget_test',
    SK: 'RULE#rule_1',
    ruleId: 'rule_1',
    budgetId: 'budget_test',
    merchantPattern: 'starbucks',
    categoryId: 'cat_1',
    categoryName: 'Coffee',
    caseSensitive: false,
    exactMatch: false,
    appliedCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Reproduce the real assertPermission contract: the action set is closed. */
const VALID_ACTIONS = new Set([
  'budget.read',
  'transaction.read',
  'category.read',
  'account.read',
  'report.read',
  'transaction.create',
  'transaction.edit',
  'transaction.delete',
  'budget.edit',
  'category.edit',
  'account.manage',
  'member.invite',
  'budget.export',
  'member.remove',
  'budget.archive',
  'budget.delete',
]);

const VIEWER_ALLOWED = new Set([
  'budget.read',
  'transaction.read',
  'category.read',
  'account.read',
  'report.read',
]);

beforeEach(() => {
  jest.clearAllMocks();

  BudgetAccessResolver.resolveAccess.mockResolvedValue({
    budgetId: 'budget_test',
    role: 'owner',
    budgetType: 'personal',
    budgetStatus: 'active',
    subscriptionTier: 'free',
  });

  BudgetAccessResolver.assertPermission.mockImplementation((role, action) => {
    if (!VALID_ACTIONS.has(action)) {
      throw { statusCode: 400, message: `Unknown action: ${action}` };
    }
    if (role === 'viewer' && !VIEWER_ALLOWED.has(action)) {
      throw { statusCode: 403, message: `Role viewer cannot ${action}` };
    }
  });

  dynamoHelpers.queryByPK.mockResolvedValue([]);
  dynamoHelpers.getItem.mockResolvedValue(null);
  dynamoHelpers.putItem.mockResolvedValue({});
  dynamoHelpers.updateItem.mockResolvedValue({});
});

function asViewer() {
  BudgetAccessResolver.resolveAccess.mockResolvedValue({
    budgetId: 'budget_test',
    role: 'viewer',
    budgetType: 'personal',
    budgetStatus: 'active',
    subscriptionTier: 'free',
  });
}

describe('GET /rules/health', () => {
  it('returns 200 without auth', async () => {
    const res = await handler({ httpMethod: 'GET', path: '/rules/health' }, CTX);
    expect(res.statusCode).toBe(200);
  });
});

describe('POST /rules', () => {
  function createEvent(body) {
    return { httpMethod: 'POST', path: '/rules', body: JSON.stringify(body) };
  }

  it('returns 200 for an owner and writes a RULE# item', async () => {
    const res = await handler(
      createEvent({ merchantPattern: 'STARBUCKS', categoryId: 'cat_1', categoryName: 'Coffee' }),
      CTX,
    );

    expect(res.statusCode).toBe(200);
    const [item] = dynamoHelpers.putItem.mock.calls[0];
    expect(item.PK).toBe('BUDGET#budget_test');
    expect(item.SK.startsWith('RULE#')).toBe(true);
    // The pattern is normalised to lowercase for matching.
    expect(item.merchantPattern).toBe('starbucks');
  });

  it('uses a valid permission action, so the write is not rejected as unknown', async () => {
    await handler(createEvent({ merchantPattern: 'x', categoryId: 'cat_1' }), CTX);

    const actions = BudgetAccessResolver.assertPermission.mock.calls.map(([, action]) => action);
    expect(actions).toContain('budget.edit');
    expect(actions).not.toContain('budget.write');
  });

  it('returns 403 for a viewer', async () => {
    asViewer();
    const res = await handler(createEvent({ merchantPattern: 'x', categoryId: 'cat_1' }), CTX);

    expect(res.statusCode).toBe(403);
    expect(dynamoHelpers.putItem).not.toHaveBeenCalled();
  });

  it('returns 400 when merchantPattern is missing', async () => {
    const res = await handler(createEvent({ categoryId: 'cat_1' }), CTX);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when categoryId is missing', async () => {
    const res = await handler(createEvent({ merchantPattern: 'x' }), CTX);
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /rules', () => {
  it('returns the stored rules rather than always an empty list', async () => {
    // Regression guard: getRulesForBudget called the nonexistent
    // dynamoHelpers.query inside a catch that returned [], so this endpoint
    // reported zero rules regardless of what was stored.
    dynamoHelpers.queryByPK.mockResolvedValue([storedRule(), storedRule({ ruleId: 'rule_2' })]);

    const res = await handler({ httpMethod: 'GET', path: '/rules' }, CTX);
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.data.count).toBe(2);
    expect(body.data.rules.map((r) => r.ruleId)).toEqual(['rule_1', 'rule_2']);
  });

  it('queries the budget partition with the RULE# prefix', async () => {
    await handler({ httpMethod: 'GET', path: '/rules' }, CTX);

    const [pk, options] = dynamoHelpers.queryByPK.mock.calls[0];
    expect(pk).toBe('BUDGET#budget_test');
    expect(options.ExpressionAttributeValues[':skPrefix']).toBe('RULE#');
  });

  it('asks DynamoDB to exclude soft-deleted rules', async () => {
    await handler({ httpMethod: 'GET', path: '/rules' }, CTX);

    const [, options] = dynamoHelpers.queryByPK.mock.calls[0];
    expect(options.FilterExpression).toContain('isDeleted');
    expect(options.ExpressionAttributeValues[':notDeleted']).toBe(false);
  });

  it('allows a viewer to read', async () => {
    asViewer();
    const res = await handler({ httpMethod: 'GET', path: '/rules' }, CTX);
    expect(res.statusCode).toBe(200);
  });

  it('surfaces a query failure as a 500 instead of reporting no rules', async () => {
    dynamoHelpers.queryByPK.mockRejectedValue(new Error('DynamoDB unavailable'));

    const res = await handler({ httpMethod: 'GET', path: '/rules' }, CTX);
    expect(res.statusCode).toBe(500);
  });
});

describe('DELETE /rules/{ruleId}', () => {
  it('soft-deletes an existing rule through updateItem', async () => {
    // dynamoHelpers has no deleteItem; calling it threw a TypeError on every
    // delete, which the handler's catch then turned into a second throw.
    dynamoHelpers.getItem.mockResolvedValue(storedRule());

    const res = await handler(
      { httpMethod: 'DELETE', path: '/rules/rule_1', pathParameters: { ruleId: 'rule_1' } },
      CTX,
    );

    expect(res.statusCode).toBe(200);
    expect(dynamoHelpers.updateItem).toHaveBeenCalledWith(
      'BUDGET#budget_test',
      'RULE#rule_1',
      expect.objectContaining({ isDeleted: true }),
    );
  });

  it('returns 404 for a rule that does not exist', async () => {
    dynamoHelpers.getItem.mockResolvedValue(null);

    const res = await handler(
      { httpMethod: 'DELETE', path: '/rules/nope', pathParameters: { ruleId: 'nope' } },
      CTX,
    );

    expect(res.statusCode).toBe(404);
  });

  it('returns 403 for a viewer', async () => {
    asViewer();
    dynamoHelpers.getItem.mockResolvedValue(storedRule());

    const res = await handler(
      { httpMethod: 'DELETE', path: '/rules/rule_1', pathParameters: { ruleId: 'rule_1' } },
      CTX,
    );

    expect(res.statusCode).toBe(403);
    expect(dynamoHelpers.updateItem).not.toHaveBeenCalled();
  });
});

describe('PUT /rules/{ruleId}', () => {
  it('updates an existing rule', async () => {
    dynamoHelpers.getItem.mockResolvedValue(storedRule());

    const res = await handler(
      {
        httpMethod: 'PUT',
        path: '/rules/rule_1',
        pathParameters: { ruleId: 'rule_1' },
        body: JSON.stringify({ categoryId: 'cat_2', categoryName: 'Dining' }),
      },
      CTX,
    );

    expect(res.statusCode).toBe(200);
    const [item] = dynamoHelpers.putItem.mock.calls[0];
    // PK/SK must survive the merge or the write lands on a keyless item.
    expect(item.PK).toBe('BUDGET#budget_test');
    expect(item.SK).toBe('RULE#rule_1');
    expect(item.categoryId).toBe('cat_2');
  });

  it('returns 404 for a soft-deleted rule', async () => {
    dynamoHelpers.getItem.mockResolvedValue(storedRule({ isDeleted: true }));

    const res = await handler(
      {
        httpMethod: 'PUT',
        path: '/rules/rule_1',
        pathParameters: { ruleId: 'rule_1' },
        body: JSON.stringify({ categoryId: 'cat_2' }),
      },
      CTX,
    );

    expect(res.statusCode).toBe(404);
  });
});

describe('POST /rules/apply', () => {
  it('categorizes a matching transaction', async () => {
    dynamoHelpers.queryByPK.mockResolvedValue([storedRule()]);

    const res = await handler(
      {
        httpMethod: 'POST',
        path: '/rules/apply',
        body: JSON.stringify({
          transactions: [
            { id: 't1', description: 'STARBUCKS STORE 123', categoryId: null },
            { id: 't2', description: 'SHELL GAS', categoryId: null },
          ],
        }),
      },
      CTX,
    );
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.data.appliedCount).toBe(1);
    expect(body.data.transactions[0].categoryId).toBe('cat_1');
    expect(body.data.transactions[0].ruleApplied).toBe('rule_1');
    expect(body.data.transactions[1].categoryId).toBeNull();
  });

  it('increments appliedCount through updateItem with real keys', async () => {
    // The rules in scope come from formatRule, which strips PK/SK, so the
    // previous putItem wrote a keyless item that DynamoDB always rejected.
    dynamoHelpers.queryByPK.mockResolvedValue([storedRule({ appliedCount: 4 })]);

    await handler(
      {
        httpMethod: 'POST',
        path: '/rules/apply',
        body: JSON.stringify({ transactions: [{ id: 't1', description: 'starbucks' }] }),
      },
      CTX,
    );

    expect(dynamoHelpers.updateItem).toHaveBeenCalledWith(
      'BUDGET#budget_test',
      'RULE#rule_1',
      expect.objectContaining({ appliedCount: 5 }),
    );
  });

  it('returns the transactions untouched when no rules exist', async () => {
    dynamoHelpers.queryByPK.mockResolvedValue([]);

    const res = await handler(
      {
        httpMethod: 'POST',
        path: '/rules/apply',
        body: JSON.stringify({ transactions: [{ id: 't1', description: 'anything' }] }),
      },
      CTX,
    );
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.data.appliedCount).toBe(0);
  });
});

describe('error handling', () => {
  it('has no errorResponse.internal to call', () => {
    // The handler's catch block called errorResponse.internal, which does not
    // exist, so the catch itself threw a TypeError and API Gateway returned
    // 502. This asserts the shape the handler must code against.
    expect(errorResponse.internal).toBeUndefined();
    expect(typeof errorResponse.internalError).toBe('function');
  });

  it('turns an unexpected error into a 500 body, not an unhandled throw', async () => {
    dynamoHelpers.queryByPK.mockImplementation(() => {
      throw new Error('boom');
    });

    const res = await handler({ httpMethod: 'GET', path: '/rules' }, CTX);

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).success).toBe(false);
  });

  it('preserves a structured access-denial status code', async () => {
    BudgetAccessResolver.resolveAccess.mockRejectedValue({
      statusCode: 404,
      message: 'Budget not found.',
    });

    const res = await handler({ httpMethod: 'GET', path: '/rules' }, CTX);
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 for an unknown route', async () => {
    const res = await handler({ httpMethod: 'GET', path: '/rules/nonsense' }, CTX);
    expect(res.statusCode).toBe(404);
  });
});

describe('dynamoHelpers surface the handler may rely on', () => {
  it('has no query or deleteItem', () => {
    // Both were called by this Lambda. Neither exists on the common layer.
    expect(dynamoHelpers.query).toBeUndefined();
    expect(dynamoHelpers.deleteItem).toBeUndefined();
  });
});
