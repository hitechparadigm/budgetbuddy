'use strict';

/**
 * Budgets Lambda — smoke tests
 *
 * Mocks:
 *  - /opt/nodejs/utils  (Lambda layer)
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

  // ── 7. POST /budgets/accept-invitation — identity comes only from verified claims ──
  describe('POST /budgets/accept-invitation', () => {
    // The common layer's real getUserFromEvent, so the test exercises the claim parsing the
    // handler runs in Lambda instead of the layer mock's fixed user.
    const { getUserFromEvent: realGetUserFromEvent } =
      jest.requireActual('../../layers/common/nodejs/utils.js');

    const INVITE_TOKEN = 'invite-token-abc';
    const invitation = {
      PK: 'INVITATION#inv-1',
      SK: 'METADATA',
      budgetId: 'budget-shared-1',
      role: 'partner',
      invitedEmail: 'invitee@example.com',
      invitedBy: 'owner-user',
      status: 'pending',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };

    /** An unsigned, hand-made JWT naming another user: what an attacker could send. */
    function forgedBearer(userId) {
      const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
      return `Bearer ${b64({ alg: 'none' })}.${b64({ 'custom:userId': userId, sub: userId })}.`;
    }

    function acceptEvent({ claims, headers } = {}) {
      return makeEvent({
        httpMethod: 'POST',
        path: '/budgets/accept-invitation',
        headers: headers || { Authorization: forgedBearer('attacker-user') },
        body: JSON.stringify({ token: INVITE_TOKEN, userId: 'body-supplied-user' }),
        requestContext: claims ? { authorizer: { claims } } : {},
      });
    }

    function mockInvitationLookup() {
      mockSend.mockImplementation(async (command) => {
        if (command.input.FilterExpression && command.input.ExpressionAttributeValues[':invPrefix']) {
          return { Items: [invitation] };
        }
        if (command.input.Key && command.input.Key.SK === 'METADATA') {
          return { Item: { status: 'active', budgetType: 'shared' } };
        }
        return {};
      });
    }

    const putCalls = () => mockSend.mock.calls
      .map(([command]) => command.input)
      .filter((input) => input.Item);

    beforeEach(() => {
      getUserFromEvent.mockImplementation(realGetUserFromEvent);
      mockInvitationLookup();
    });

    it('returns 401 and writes nothing when the request has no authorizer claims', async () => {
      const result = await handler(acceptEvent());

      expect(result.statusCode).toBe(401);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('returns 403 and writes nothing when the claim email differs from invitedEmail', async () => {
      const result = await handler(acceptEvent({
        claims: { 'custom:userId': 'user-c', email: 'someone-else@example.com' },
      }));

      expect(result.statusCode).toBe(403);
      expect(putCalls()).toHaveLength(0);
    });

    it('returns 403 when the claims carry no email (no skip-when-empty)', async () => {
      const result = await handler(acceptEvent({ claims: { 'custom:userId': 'user-b' } }));

      expect(result.statusCode).toBe(403);
      expect(putCalls()).toHaveLength(0);
    });

    it('accepts matching claims and writes MEMBER# for the claims userId only', async () => {
      const result = await handler(acceptEvent({
        claims: { 'custom:userId': 'user-b', sub: 'sub-b', email: '  Invitee@Example.com ' },
      }));

      expect(result.statusCode).toBe(200);
      const puts = putCalls();
      expect(puts).toHaveLength(1);
      expect(puts[0].Item.PK).toBe('BUDGET#budget-shared-1');
      expect(puts[0].Item.SK).toBe('MEMBER#user-b');
      expect(puts[0].Item.userId).toBe('user-b');
      expect(puts[0].Item.GSI1PK).toBe('USER#user-b');
      const written = JSON.stringify(mockSend.mock.calls.map(([command]) => command.input));
      expect(written).not.toContain('attacker-user');
      expect(written).not.toContain('body-supplied-user');
    });
  });

  // ── 8. 404 for unknown routes ─────────────────────────────────────────────
  describe('Unknown routes', () => {
    it('returns 404 for unrecognised endpoints', async () => {
      const event = makeEvent({ httpMethod: 'GET', path: '/budgets/unknown-route-xyz' });
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
    });
  });
});
