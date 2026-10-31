'use strict';

/**
 * Tests for common layer: BudgetAccessResolver, entitlements.canUseFeature and
 * the paginating dynamoHelpers.scan / dynamoHelpers.queryByGSI helpers.
 */

// Replace the document client with a single shared send() mock so the
// dynamoHelpers pagination loops can be driven deterministically. The mock is
// created inside the factory to stay safe against jest.mock hoisting.
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

const { BudgetAccessResolver, generateId, dynamoHelpers } = require('./utils');
const { FEATURE_CATALOG, canUseFeature } = require('./entitlements');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal dynamoHelpers stub that returns the provided fixtures.
 * Pass null for any item to simulate "not found".
 */
function makeDynamo({ profile, membership, budget }) {
  return {
    async getItem(pk, sk) {
      if (pk.startsWith('USER#') && sk === 'PROFILE') return profile;
      if (pk.startsWith('BUDGET#') && sk.startsWith('MEMBER#')) return membership;
      if (pk.startsWith('BUDGET#') && sk === 'METADATA') return budget;
      return null;
    },
  };
}

const VALID_PROFILE = {
  userId: 'user_abc',
  defaultBudgetId: 'budget_xyz',
  subscriptionTier: 'free',
};

const VALID_MEMBERSHIP = {
  role: 'owner',
  status: 'active',
  expiresAt: null,
};

const VALID_BUDGET = {
  budgetType: 'family',
  status: 'active',
};

// ---------------------------------------------------------------------------
// BudgetAccessResolver.resolveAccess
// ---------------------------------------------------------------------------

describe('BudgetAccessResolver.resolveAccess', () => {
  test('returns full access context for a valid owner', async () => {
    const dynamo = makeDynamo({
      profile: VALID_PROFILE,
      membership: VALID_MEMBERSHIP,
      budget: VALID_BUDGET,
    });

    const result = await BudgetAccessResolver.resolveAccess('user_abc', dynamo);

    expect(result).toEqual({
      budgetId: 'budget_xyz',
      role: 'owner',
      budgetType: 'family',
      budgetStatus: 'active',
      expiresAt: null,
      subscriptionTier: 'free',
    });
  });

  test('uses requestedBudgetId when provided instead of defaultBudgetId', async () => {
    const dynamo = makeDynamo({
      profile: VALID_PROFILE,
      membership: VALID_MEMBERSHIP,
      budget: VALID_BUDGET,
    });

    const result = await BudgetAccessResolver.resolveAccess('user_abc', dynamo, 'budget_other');
    expect(result.budgetId).toBe('budget_other');
  });

  test('throws 403 when user profile is not found', async () => {
    const dynamo = makeDynamo({ profile: null, membership: null, budget: null });

    await expect(BudgetAccessResolver.resolveAccess('user_abc', dynamo))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  test('throws 403 when profile has no defaultBudgetId and no requestedBudgetId', async () => {
    const dynamo = makeDynamo({
      profile: { userId: 'user_abc', subscriptionTier: 'free' }, // no defaultBudgetId
      membership: null,
      budget: null,
    });

    await expect(BudgetAccessResolver.resolveAccess('user_abc', dynamo))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  test('throws 403 when membership is not found', async () => {
    const dynamo = makeDynamo({
      profile: VALID_PROFILE,
      membership: null,
      budget: VALID_BUDGET,
    });

    await expect(BudgetAccessResolver.resolveAccess('user_abc', dynamo))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  test('throws 403 when membership status is revoked', async () => {
    const dynamo = makeDynamo({
      profile: VALID_PROFILE,
      membership: { ...VALID_MEMBERSHIP, status: 'revoked' },
      budget: VALID_BUDGET,
    });

    await expect(BudgetAccessResolver.resolveAccess('user_abc', dynamo))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  test('throws 403 when membership status is left', async () => {
    const dynamo = makeDynamo({
      profile: VALID_PROFILE,
      membership: { ...VALID_MEMBERSHIP, status: 'left' },
      budget: VALID_BUDGET,
    });

    await expect(BudgetAccessResolver.resolveAccess('user_abc', dynamo))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  test('throws 403 when viewer access has expired', async () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
    const dynamo = makeDynamo({
      profile: VALID_PROFILE,
      membership: { role: 'viewer', status: 'active', expiresAt: pastDate },
      budget: VALID_BUDGET,
    });

    await expect(BudgetAccessResolver.resolveAccess('user_abc', dynamo))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  test('does not throw when viewer expiry is in the future', async () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 24h from now
    const dynamo = makeDynamo({
      profile: VALID_PROFILE,
      membership: { role: 'viewer', status: 'active', expiresAt: futureDate },
      budget: VALID_BUDGET,
    });

    const result = await BudgetAccessResolver.resolveAccess('user_abc', dynamo);
    expect(result.role).toBe('viewer');
    expect(result.expiresAt).toBe(futureDate);
  });

  test('throws 404 when budget metadata is not found', async () => {
    const dynamo = makeDynamo({
      profile: VALID_PROFILE,
      membership: VALID_MEMBERSHIP,
      budget: null,
    });

    await expect(BudgetAccessResolver.resolveAccess('user_abc', dynamo))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('throws 403 when budget is deleted', async () => {
    const dynamo = makeDynamo({
      profile: VALID_PROFILE,
      membership: VALID_MEMBERSHIP,
      budget: { ...VALID_BUDGET, status: 'deleted' },
    });

    await expect(BudgetAccessResolver.resolveAccess('user_abc', dynamo))
      .rejects.toMatchObject({ statusCode: 403 });
  });
});

// ---------------------------------------------------------------------------
// BudgetAccessResolver.assertPermission
// ---------------------------------------------------------------------------

describe('BudgetAccessResolver.assertPermission', () => {
  // --- Read actions: all four roles ---
  const READ_ACTIONS = ['budget.read', 'transaction.read', 'category.read', 'account.read', 'report.read'];
  const ALL_ROLES = ['owner', 'partner', 'household_member', 'viewer'];

  READ_ACTIONS.forEach((action) => {
    ALL_ROLES.forEach((role) => {
      test(`${role} can perform ${action} on active budget`, () => {
        expect(() => BudgetAccessResolver.assertPermission(role, action, 'active')).not.toThrow();
      });
    });
  });

  // --- Write actions: owner, partner, household_member only ---
  const WRITE_ACTIONS = ['transaction.create', 'transaction.edit'];

  WRITE_ACTIONS.forEach((action) => {
    ['owner', 'partner', 'household_member'].forEach((role) => {
      test(`${role} can perform ${action}`, () => {
        expect(() => BudgetAccessResolver.assertPermission(role, action)).not.toThrow();
      });
    });

    test(`viewer cannot perform ${action}`, () => {
      expect(() => BudgetAccessResolver.assertPermission('viewer', action))
        .toThrow();
    });
  });

  // --- Elevated write: owner, partner only ---
  const ELEVATED_ACTIONS = [
    'transaction.delete', 'budget.edit', 'category.edit',
    'account.manage', 'member.invite', 'budget.export',
  ];

  ELEVATED_ACTIONS.forEach((action) => {
    ['owner', 'partner'].forEach((role) => {
      test(`${role} can perform ${action}`, () => {
        expect(() => BudgetAccessResolver.assertPermission(role, action)).not.toThrow();
      });
    });

    ['household_member', 'viewer'].forEach((role) => {
      test(`${role} cannot perform ${action}`, () => {
        expect(() => BudgetAccessResolver.assertPermission(role, action))
          .toThrow();
      });
    });
  });

  // --- Owner-only actions ---
  const OWNER_ONLY_ACTIONS = ['member.remove', 'budget.archive', 'budget.delete'];

  OWNER_ONLY_ACTIONS.forEach((action) => {
    test(`owner can perform ${action}`, () => {
      expect(() => BudgetAccessResolver.assertPermission('owner', action)).not.toThrow();
    });

    ['partner', 'household_member', 'viewer'].forEach((role) => {
      test(`${role} cannot perform ${action}`, () => {
        expect(() => BudgetAccessResolver.assertPermission(role, action))
          .toThrow();
      });
    });
  });

  // --- Archived budget: read-only for everyone ---
  test('archived budget allows read actions for owner', () => {
    READ_ACTIONS.forEach((action) => {
      expect(() => BudgetAccessResolver.assertPermission('owner', action, 'archived')).not.toThrow();
    });
  });

  test('archived budget blocks write actions even for owner', () => {
    const writeActions = [...WRITE_ACTIONS, ...ELEVATED_ACTIONS, ...OWNER_ONLY_ACTIONS];
    writeActions.forEach((action) => {
      expect(() => BudgetAccessResolver.assertPermission('owner', action, 'archived'))
        .toThrow();
    });
  });

  // --- Unknown action ---
  test('throws 400 for unknown action', () => {
    expect(() => BudgetAccessResolver.assertPermission('owner', 'nonexistent.action'))
      .toThrow();
  });

  test('unknown action error has statusCode 400', () => {
    try {
      BudgetAccessResolver.assertPermission('owner', 'nonexistent.action');
      fail('should have thrown');
    } catch (err) {
      expect(err.statusCode).toBe(400);
    }
  });

  // --- Permission denied error has statusCode 403 ---
  test('permission denied error has statusCode 403', () => {
    try {
      BudgetAccessResolver.assertPermission('viewer', 'transaction.create');
      fail('should have thrown');
    } catch (err) {
      expect(err.statusCode).toBe(403);
    }
  });
});

// ---------------------------------------------------------------------------
// generateId.budget
// ---------------------------------------------------------------------------

describe('generateId.budget', () => {
  test('returns a string prefixed with budget_', () => {
    const id = generateId.budget();
    expect(typeof id).toBe('string');
    expect(id.startsWith('budget_')).toBe(true);
  });

  test('generates unique IDs on successive calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateId.budget()));
    expect(ids.size).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// canUseFeature / FEATURE_CATALOG
// ---------------------------------------------------------------------------

describe('canUseFeature', () => {
  test('returns false for unknown feature key (fail-closed)', () => {
    expect(canUseFeature('free', 'nonexistent.feature')).toBe(false);
    expect(canUseFeature('premium', 'nonexistent.feature')).toBe(false);
  });

  test('free-tier features are accessible to free users', () => {
    const freeFeatures = Object.entries(FEATURE_CATALOG)
      .filter(([, v]) => v.tier === 'free')
      .map(([k]) => k);

    freeFeatures.forEach((key) => {
      expect(canUseFeature('free', key)).toBe(true);
    });
  });

  test('free-tier features are also accessible to premium users', () => {
    const freeFeatures = Object.entries(FEATURE_CATALOG)
      .filter(([, v]) => v.tier === 'free')
      .map(([k]) => k);

    freeFeatures.forEach((key) => {
      expect(canUseFeature('premium', key)).toBe(true);
    });
  });

  test('premium features are NOT accessible to free users', () => {
    const premiumFeatures = Object.entries(FEATURE_CATALOG)
      .filter(([, v]) => v.tier === 'premium')
      .map(([k]) => k);

    premiumFeatures.forEach((key) => {
      expect(canUseFeature('free', key)).toBe(false);
    });
  });

  test('premium features ARE accessible to premium users', () => {
    const premiumFeatures = Object.entries(FEATURE_CATALOG)
      .filter(([, v]) => v.tier === 'premium')
      .map(([k]) => k);

    premiumFeatures.forEach((key) => {
      expect(canUseFeature('premium', key)).toBe(true);
    });
  });

  // Spot-check specific known keys
  test('budget.export requires premium', () => {
    expect(canUseFeature('free', 'budget.export')).toBe(false);
    expect(canUseFeature('premium', 'budget.export')).toBe(true);
  });

  test('reports.advanced requires premium', () => {
    expect(canUseFeature('free', 'reports.advanced')).toBe(false);
    expect(canUseFeature('premium', 'reports.advanced')).toBe(true);
  });

  test('member.invite is free', () => {
    expect(canUseFeature('free', 'member.invite')).toBe(true);
  });

  test('budget.ai.generate is free', () => {
    expect(canUseFeature('free', 'budget.ai.generate')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// FEATURE_CATALOG structure
// ---------------------------------------------------------------------------

describe('FEATURE_CATALOG', () => {
  test('every entry has a tier of free or premium', () => {
    Object.entries(FEATURE_CATALOG).forEach(([key, value]) => {
      expect(['free', 'premium']).toContain(value.tier);
    });
  });

  test('every entry has a non-empty description', () => {
    Object.entries(FEATURE_CATALOG).forEach(([key, value]) => {
      expect(typeof value.description).toBe('string');
      expect(value.description.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// dynamoHelpers.scan / dynamoHelpers.queryByGSI
// ---------------------------------------------------------------------------

describe('dynamoHelpers.scan', () => {
  beforeEach(() => {
    mockSend.mockReset();
    process.env.TABLE_NAME = 'budgetbuddy-test';
  });

  test('follows LastEvaluatedKey and concatenates both pages', async () => {
    mockSend
      .mockResolvedValueOnce({
        Items: [{ PK: 'BUDGET#1' }, { PK: 'BUDGET#2' }],
        LastEvaluatedKey: { PK: 'BUDGET#2', SK: 'METADATA' },
      })
      .mockResolvedValueOnce({ Items: [{ PK: 'BUDGET#3' }] });

    const items = await dynamoHelpers.scan();

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(items.map((i) => i.PK)).toEqual(['BUDGET#1', 'BUDGET#2', 'BUDGET#3']);

    // Page 1 must not carry a start key; page 2 must carry the first page's key.
    expect(mockSend.mock.calls[0][0].input.ExclusiveStartKey).toBeUndefined();
    expect(mockSend.mock.calls[1][0].input.ExclusiveStartKey).toEqual({
      PK: 'BUDGET#2',
      SK: 'METADATA',
    });
  });

  test('stops at maxPages and warns instead of looping forever', async () => {
    mockSend.mockResolvedValue({
      Items: [{ PK: 'BUDGET#1' }],
      LastEvaluatedKey: { PK: 'BUDGET#1' },
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const items = await dynamoHelpers.scan({ maxPages: 3 });

    expect(mockSend).toHaveBeenCalledTimes(3);
    expect(items).toHaveLength(3);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  test('passes caller options through to the ScanCommand', async () => {
    mockSend.mockResolvedValueOnce({ Items: [] });

    await dynamoHelpers.scan({
      FilterExpression: 'begins_with(PK, :pk)',
      ExpressionAttributeValues: { ':pk': 'BUDGET#' },
    });

    const input = mockSend.mock.calls[0][0].input;
    expect(input.TableName).toBe('budgetbuddy-test');
    expect(input.FilterExpression).toBe('begins_with(PK, :pk)');
    expect(input.ExpressionAttributeValues).toEqual({ ':pk': 'BUDGET#' });
    expect(input.maxPages).toBeUndefined();
  });
});

describe('dynamoHelpers.queryByGSI', () => {
  beforeEach(() => {
    mockSend.mockReset();
    process.env.TABLE_NAME = 'budgetbuddy-test';
  });

  test('derives the key expression from the index name', async () => {
    mockSend.mockResolvedValueOnce({ Items: [{ billId: 'bill_1' }] });

    const items = await dynamoHelpers.queryByGSI('GSI1', 'BILLS#2026-10');

    const input = mockSend.mock.calls[0][0].input;
    expect(input.IndexName).toBe('GSI1');
    expect(input.KeyConditionExpression).toBe('GSI1PK = :gsipk');
    expect(input.ExpressionAttributeValues).toEqual({ ':gsipk': 'BILLS#2026-10' });
    expect(items).toEqual([{ billId: 'bill_1' }]);
  });

  test('merges caller ExpressionAttributeValues and paginates', async () => {
    mockSend
      .mockResolvedValueOnce({
        Items: [{ billId: 'bill_1' }],
        LastEvaluatedKey: { PK: 'BUDGET#1', SK: 'BILL#bill_1' },
      })
      .mockResolvedValueOnce({ Items: [{ billId: 'bill_2' }] });

    const items = await dynamoHelpers.queryByGSI('GSI1', 'BILLS#2026-10', {
      FilterExpression: '#s = :s',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'unpaid' },
    });

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(items.map((i) => i.billId)).toEqual(['bill_1', 'bill_2']);
    expect(mockSend.mock.calls[0][0].input.ExpressionAttributeValues).toEqual({
      ':gsipk': 'BILLS#2026-10',
      ':s': 'unpaid',
    });
    expect(mockSend.mock.calls[1][0].input.ExclusiveStartKey).toEqual({
      PK: 'BUDGET#1',
      SK: 'BILL#bill_1',
    });
  });
});
