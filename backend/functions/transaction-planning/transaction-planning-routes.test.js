/**
 * Route-contract tests for the transaction-planning Lambda.
 *
 * These assert the handler matches exactly the routes API Gateway exposes
 * (infrastructure/lib/api-features-extended-stack.ts setupTransactionPlanningRoutes):
 *
 *   GET    /transaction-planning
 *   POST   /transaction-planning
 *   PUT    /transaction-planning/{plannedTransactionId}
 *   DELETE /transaction-planning/{plannedTransactionId}
 *   POST   /transaction-planning/{plannedTransactionId}/mark-paid
 *   GET    /transaction-planning/health
 *
 * The handler imported here is the real module. Only the Lambda layer is mocked.
 */

const mockDynamo = {
  putItem: jest.fn(),
  getItem: jest.fn(),
  updateItem: jest.fn(),
  queryByPK: jest.fn(),
};

const mockResolver = {
  resolveAccess: jest.fn(),
  assertPermission: jest.fn(),
};

jest.mock(
  '/opt/nodejs/utils',
  () => ({
    successResponse: (data, message) => ({
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message, data }),
    }),
    errorResponse: {
      badRequest: (message) => ({ statusCode: 400, body: JSON.stringify({ success: false, message }) }),
      unauthorized: (message) => ({ statusCode: 401, body: JSON.stringify({ success: false, message }) }),
      forbidden: (message) => ({ statusCode: 403, body: JSON.stringify({ success: false, message }) }),
      notFound: (message) => ({ statusCode: 404, body: JSON.stringify({ success: false, message }) }),
      conflict: (message) => ({ statusCode: 409, body: JSON.stringify({ success: false, message }) }),
      internalError: (message) => ({ statusCode: 500, body: JSON.stringify({ success: false, message }) }),
    },
    parseRequestBody: (body) => (body ? JSON.parse(body) : {}),
    getUserFromEvent: () => ({ userId: 'user_test' }),
    generateId: { custom: (prefix) => `${prefix}_generated` },
    dynamoHelpers: mockDynamo,
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    BudgetAccessResolver: mockResolver,
  }),
  { virtual: true },
);

const { handler } = require('./index');
const { PLANNED_TXN_SK_PREFIX, plannedTxnSK } = require('./keys');

const CTX = { awsRequestId: 'req_test' };

/** A stored, not-yet-executed plan. */
function storedPlan(overrides = {}) {
  return {
    PK: 'BUDGET#budget_test',
    SK: plannedTxnSK('plan_x'),
    entityType: 'PLANNED_TRANSACTION',
    planId: 'plan_x',
    budgetId: 'budget_test',
    transactionType: 'expense',
    amount: 10,
    currency: 'USD',
    categoryId: 'cat_1',
    categoryName: 'Food',
    scheduledDate: '2026-11-01',
    notes: null,
    isRecurring: false,
    isExecuted: false,
    isDeleted: false,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockResolver.resolveAccess.mockResolvedValue({
    budgetId: 'budget_test',
    role: 'owner',
    budgetType: 'personal',
    budgetStatus: 'active',
    subscriptionTier: 'free',
  });
  mockDynamo.putItem.mockResolvedValue({});
  mockDynamo.updateItem.mockImplementation((_pk, _sk, updates) => Promise.resolve({ planId: 'plan_x', ...updates }));
  mockDynamo.getItem.mockResolvedValue(null);
  mockDynamo.queryByPK.mockResolvedValue([]);
});

describe('route contract', () => {
  it('GET /transaction-planning/health returns 200 without auth', async () => {
    const res = await handler({ httpMethod: 'GET', path: '/transaction-planning/health' }, CTX);
    expect(res.statusCode).toBe(200);
  });

  it('POST /transaction-planning creates a plan', async () => {
    const res = await handler(
      {
        httpMethod: 'POST',
        path: '/transaction-planning',
        body: JSON.stringify({
          type: 'expense',
          amount: 10,
          currency: 'USD',
          categoryId: 'cat_1',
          categoryName: 'Food',
          date: '2026-11-01',
        }),
      },
      CTX,
    );

    expect(res.statusCode).toBe(200);
    const [item] = mockDynamo.putItem.mock.calls[0];
    expect(item.PK).toBe('BUDGET#budget_test');
    expect(item.SK.startsWith(PLANNED_TXN_SK_PREFIX)).toBe(true);
  });

  it('PUT /transaction-planning/{plannedTransactionId} returns 200, not 404', async () => {
    mockDynamo.getItem.mockResolvedValue(storedPlan());

    const res = await handler(
      {
        httpMethod: 'PUT',
        path: '/transaction-planning/plan_x',
        pathParameters: { plannedTransactionId: 'plan_x' },
        body: JSON.stringify({ amount: 12 }),
      },
      CTX,
    );

    expect(res.statusCode).toBe(200);
    expect(mockDynamo.updateItem).toHaveBeenCalledWith(
      'BUDGET#budget_test',
      plannedTxnSK('plan_x'),
      expect.objectContaining({ amount: 12 }),
    );
  });

  it('DELETE /transaction-planning/{plannedTransactionId} returns 200, not 404', async () => {
    mockDynamo.getItem.mockResolvedValue(storedPlan());

    const res = await handler(
      {
        httpMethod: 'DELETE',
        path: '/transaction-planning/plan_x',
        pathParameters: { plannedTransactionId: 'plan_x' },
      },
      CTX,
    );

    expect(res.statusCode).toBe(200);
    expect(mockDynamo.updateItem).toHaveBeenCalledWith(
      'BUDGET#budget_test',
      plannedTxnSK('plan_x'),
      expect.objectContaining({ isDeleted: true }),
    );
  });

  it('POST /transaction-planning/{plannedTransactionId}/mark-paid writes a TXN# item and flags the plan', async () => {
    mockDynamo.getItem.mockResolvedValue(storedPlan());

    const res = await handler(
      {
        httpMethod: 'POST',
        path: '/transaction-planning/plan_x/mark-paid',
        pathParameters: { plannedTransactionId: 'plan_x' },
      },
      CTX,
    );

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.transactionId).toBeDefined();

    const [txn] = mockDynamo.putItem.mock.calls[0];
    expect(txn.PK).toBe('BUDGET#budget_test');
    expect(txn.SK.startsWith('TXN#')).toBe(true);
    expect(txn.sourcePlanId).toBe('plan_x');

    expect(mockDynamo.updateItem).toHaveBeenCalledWith(
      'BUDGET#budget_test',
      plannedTxnSK('plan_x'),
      expect.objectContaining({ isExecuted: true }),
    );
  });

  it('mark-paid needs no request body (the id comes from the path)', async () => {
    mockDynamo.getItem.mockResolvedValue(storedPlan());

    const res = await handler(
      {
        httpMethod: 'POST',
        path: '/transaction-planning/plan_x/mark-paid',
        pathParameters: { plannedTransactionId: 'plan_x' },
        body: null,
      },
      CTX,
    );

    expect(res.statusCode).toBe(200);
  });

  it('mark-paid on an already-executed plan is a 400', async () => {
    mockDynamo.getItem.mockResolvedValue(storedPlan({ isExecuted: true }));

    const res = await handler(
      {
        httpMethod: 'POST',
        path: '/transaction-planning/plan_x/mark-paid',
        pathParameters: { plannedTransactionId: 'plan_x' },
      },
      CTX,
    );

    expect(res.statusCode).toBe(400);
  });

  it('POST /transaction-planning/execute is gone and returns 404', async () => {
    const res = await handler(
      {
        httpMethod: 'POST',
        path: '/transaction-planning/execute',
        body: JSON.stringify({ planId: 'plan_x' }),
      },
      CTX,
    );

    expect(res.statusCode).toBe(404);
    expect(mockDynamo.putItem).not.toHaveBeenCalled();
  });

  it('the old pathParameters.planId shape no longer matches (guards against a silent revert)', async () => {
    mockDynamo.getItem.mockResolvedValue(storedPlan());

    const put = await handler(
      {
        httpMethod: 'PUT',
        path: '/transaction-planning/plan_x',
        pathParameters: { planId: 'plan_x' },
        body: JSON.stringify({ amount: 12 }),
      },
      CTX,
    );
    expect(put.statusCode).toBe(404);

    const del = await handler(
      {
        httpMethod: 'DELETE',
        path: '/transaction-planning/plan_x',
        pathParameters: { planId: 'plan_x' },
      },
      CTX,
    );
    expect(del.statusCode).toBe(404);

    expect(mockDynamo.updateItem).not.toHaveBeenCalled();
  });

  it('a viewer is rejected on every write path', async () => {
    mockResolver.assertPermission.mockImplementation((role, action) => {
      if (role === 'viewer' && action === 'budget.edit') {
        throw { statusCode: 403, message: `Role viewer cannot ${action}` };
      }
    });
    mockResolver.resolveAccess.mockResolvedValue({
      budgetId: 'budget_test',
      role: 'viewer',
      budgetType: 'personal',
      budgetStatus: 'active',
      subscriptionTier: 'free',
    });
    mockDynamo.getItem.mockResolvedValue(storedPlan());

    for (const event of [
      { httpMethod: 'POST', path: '/transaction-planning', body: '{}' },
      { httpMethod: 'PUT', path: '/transaction-planning/plan_x', pathParameters: { plannedTransactionId: 'plan_x' }, body: '{}' },
      { httpMethod: 'DELETE', path: '/transaction-planning/plan_x', pathParameters: { plannedTransactionId: 'plan_x' } },
      { httpMethod: 'POST', path: '/transaction-planning/plan_x/mark-paid', pathParameters: { plannedTransactionId: 'plan_x' } },
    ]) {
      const res = await handler(event, CTX);
      expect(res.statusCode).toBe(403);
    }
  });
});

describe('GET /transaction-planning filter expression', () => {
  async function capturedFilter(queryStringParameters = null) {
    await handler({ httpMethod: 'GET', path: '/transaction-planning', queryStringParameters }, CTX);
    return mockDynamo.queryByPK.mock.calls[0][1];
  }

  it('parenthesises the isDeleted disjunction so AND cannot bind tighter than OR', async () => {
    const { FilterExpression } = await capturedFilter();
    expect(FilterExpression).toContain('(attribute_not_exists(isDeleted) OR isDeleted = :f)');
    // The unparenthesised form is the bug being guarded against.
    expect(FilterExpression).not.toMatch(/entityType = :et AND attribute_not_exists\(isDeleted\) OR/);
  });

  it('narrows the query to the planned-transaction sort-key prefix in the key condition', async () => {
    const { KeyConditionExpression, FilterExpression, ExpressionAttributeValues } = await capturedFilter();
    expect(KeyConditionExpression).toBe('PK = :pk AND begins_with(SK, :skPrefix)');
    expect(ExpressionAttributeValues[':skPrefix']).toBe(PLANNED_TXN_SK_PREFIX);
  });

  it('never references a primary-key attribute in the FilterExpression', async () => {
    // DynamoDB rejects a filter on PK/SK with a ValidationException, which the
    // mocked queryByPK cannot surface; this shipped as a live 500.
    const { FilterExpression } = await capturedFilter({
      type: 'expense', startDate: '2026-01-01', endDate: '2026-12-31',
    });
    expect(FilterExpression).not.toMatch(/\b(PK|SK|GSI\dPK|GSI\dSK)\b/);
  });

  it('excludes soft-deleted plans returned by the query', async () => {
    // queryByPK is mocked, so the FilterExpression is not actually evaluated.
    // Assert instead that the expression asks DynamoDB to exclude them, and
    // that the handler returns exactly what the (filtered) query yields.
    mockDynamo.queryByPK.mockResolvedValue([storedPlan({ planId: 'plan_live', scheduledDate: '2026-11-01' })]);

    const res = await handler({ httpMethod: 'GET', path: '/transaction-planning' }, CTX);
    const body = JSON.parse(res.body);

    expect(body.data.count).toBe(1);
    expect(body.data.plans[0].planId).toBe('plan_live');

    const { FilterExpression, ExpressionAttributeValues } = mockDynamo.queryByPK.mock.calls[0][1];
    expect(FilterExpression).toContain('(attribute_not_exists(isDeleted) OR isDeleted = :f)');
    expect(ExpressionAttributeValues[':f']).toBe(false);
  });

  it('adds the executed filter unless includeExecuted=true', async () => {
    const withoutFlag = await capturedFilter();
    expect(withoutFlag.FilterExpression).toContain('isExecuted = :ie');

    jest.clearAllMocks();
    mockDynamo.queryByPK.mockResolvedValue([]);
    const withFlag = await capturedFilter({ includeExecuted: 'true' });
    expect(withFlag.FilterExpression).not.toContain('isExecuted = :ie');
  });
});
