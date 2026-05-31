'use strict';

/**
 * Budgets Lambda — smoke tests
 *
 * Mocks:
 *  - /opt/nodejs/utils  (Lambda layer)
 *  - /opt/nodejs/entitlements  (Lambda layer)
 *  - @aws-sdk/client-dynamodb
 *  - @aws-sdk/lib-dynamodb
 */

// ── AWS SDK mocks ────────────────────────────────────────────────────────────
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));

const mockSend = jest.fn();
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockReturnValue({ send: mockSend }),
  },
  GetCommand: jest.fn().mockImplementation((params) => ({ input: params })),
  PutCommand: jest.fn().mockImplementation((params) => ({ input: params })),
  UpdateCommand: jest.fn().mockImplementation((params) => ({ input: params })),
  DeleteCommand: jest.fn().mockImplementation((params) => ({ input: params })),
  QueryCommand: jest.fn().mockImplementation((params) => ({ input: params })),
  ScanCommand: jest.fn().mockImplementation((params) => ({ input: params })),
}));

// ── Layer mocks (resolved via moduleNameMapper in jest.config.js) ────────────
const {
  getUserFromEvent,
  successResponse,
  errorResponse,
  BudgetAccessResolver,
  generateId,
} = require('/opt/nodejs/utils');

// ── Load handler AFTER mocks are in place ────────────────────────────────────
const { handler } = require('./index');

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeEvent(overrides = {}) {
  return {
    httpMethod: 'GET',
    path: '/budgets',
    headers: { Authorization: 'Bearer test-token' },
    pathParameters: null,
    queryStringParameters: null,
    body: null,
    requestContext: {
      authorizer: { claims: { sub: 'test-user-id', email: 'test@example.com' } },
    },
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('Budgets Lambda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: getUserFromEvent returns a valid user
    getUserFromEvent.mockReturnValue({ userId: 'test-user-id' });
    // Default: DynamoDB send resolves to empty results
    mockSend.mockResolvedValue({ Items: [], Item: null });
    // Default: BudgetAccessResolver grants owner access
    BudgetAccessResolver.resolveAccess.mockResolvedValue({
      budgetId: 'budget-test-123',
      role: 'owner',
      budgetType: 'family',
      budgetStatus: 'active',
      subscriptionTier: 'free',
    });
    BudgetAccessResolver.assertPermission.mockImplementation(() => {}); // no-op
  });

  // ── 1. Handler export ──────────────────────────────────────────────────────
  describe('Module exports', () => {
    it('exports a handler function', () => {
      expect(typeof handler).toBe('function');
    });
  });

  // ── 2. CORS preflight ─────────────────────────────────────────────────────
  describe('OPTIONS preflight', () => {
    it('returns 200 with CORS headers for OPTIONS requests', async () => {
      const event = makeEvent({ httpMethod: 'OPTIONS', path: '/budgets' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toHaveProperty('Access-Control-Allow-Origin');
      expect(result.headers).toHaveProperty('Access-Control-Allow-Methods');
    });
  });

  // ── 3. Health check ───────────────────────────────────────────────────────
  describe('GET /budgets/health', () => {
    it('returns 200 with healthy status', async () => {
      const event = makeEvent({ httpMethod: 'GET', path: '/budgets/health' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.status).toBe('healthy');
      expect(body.data.service).toBe('budgets');
    });

    it('also works on /v1/budgets/health', async () => {
      const event = makeEvent({ httpMethod: 'GET', path: '/v1/budgets/health' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
    });
  });

  // ── 4. Unauthenticated requests ───────────────────────────────────────────
  // The handler's catch block maps 400/403/404/409 to their respective error
  // responses. A 401 thrown by getUserFromEvent (not in the mapping) falls
  // through to the generic 500 internalError path. This is the current
  // handler behaviour — the test documents it accurately.
  describe('Authentication', () => {
    it('returns an error response when getUserFromEvent throws (no valid JWT)', async () => {
      getUserFromEvent.mockImplementation(() => {
        const err = new Error('Unauthorized');
        err.statusCode = 401;
        throw err;
      });

      const event = makeEvent({ httpMethod: 'GET', path: '/budgets' });
      const result = await handler(event);

      // Handler catch block does not map 401 → falls through to 500
      expect(result.statusCode).toBe(500);
    });

    it('returns 403 when BudgetAccessResolver.assertPermission throws 403', async () => {
      mockSend.mockResolvedValue({ Items: [] });
      BudgetAccessResolver.assertPermission.mockImplementation(() => {
        const err = new Error('Forbidden');
        err.statusCode = 403;
        throw err;
      });

      const event = makeEvent({
        httpMethod: 'GET',
        path: '/budgets/budget-abc/members',
        pathParameters: { budgetId: 'budget-abc' },
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(403);
    });
  });

  // ── 5. GET /budgets — lists budgets for authenticated user ────────────────
  describe('GET /budgets', () => {
    it('returns 200 with an empty budgets array when user has no memberships', async () => {
      mockSend.mockResolvedValue({ Items: [] });

      const event = makeEvent({ httpMethod: 'GET', path: '/budgets' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(Array.isArray(body.data.budgets)).toBe(true);
    });

    it('returns 200 with budget list when user has active memberships', async () => {
      // First call: GSI query for memberships
      mockSend
        .mockResolvedValueOnce({
          Items: [{ budgetId: 'budget-abc', status: 'active', role: 'owner' }],
        })
        // Second call: GetCommand for budget metadata
        .mockResolvedValueOnce({
          Item: {
            budgetId: 'budget-abc',
            name: 'My Budget',
            budgetType: 'personal',
            status: 'active',
          },
        });

      const event = makeEvent({ httpMethod: 'GET', path: '/budgets' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.budgets.length).toBe(1);
      expect(body.data.budgets[0].name).toBe('My Budget');
    });
  });

  // ── 6. POST /budgets — create budget ─────────────────────────────────────
  describe('POST /budgets', () => {
    it('returns 200 and creates a budget with valid input', async () => {
      generateId.budget.mockReturnValue('budget-new-123');
      mockSend.mockResolvedValue({});

      const event = makeEvent({
        httpMethod: 'POST',
        path: '/budgets',
        body: JSON.stringify({ name: 'Test Budget', budgetType: 'personal' }),
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.name).toBe('Test Budget');
      expect(body.data.budgetType).toBe('personal');
    });

    it('returns 400 when budget name is missing', async () => {
      const event = makeEvent({
        httpMethod: 'POST',
        path: '/budgets',
        body: JSON.stringify({ budgetType: 'personal' }),
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });

    it('returns 400 for invalid budgetType', async () => {
      const event = makeEvent({
        httpMethod: 'POST',
        path: '/budgets',
        body: JSON.stringify({ name: 'Test', budgetType: 'invalid' }),
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });
  });

  // ── 7. 404 for unknown routes ─────────────────────────────────────────────
  describe('Unknown routes', () => {
    it('returns 404 for unrecognised endpoints', async () => {
      const event = makeEvent({ httpMethod: 'GET', path: '/budgets/unknown-route-xyz' });
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
    });
  });
});
