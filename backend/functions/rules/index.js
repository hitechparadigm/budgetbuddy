/**
 * BudgetBuddy Transaction Categorization Rules Lambda
 *
 * Auto-categorization rules engine for Plaid transaction imports.
 * When a user recategorizes a transaction, they can save a rule:
 * "Transactions from [Merchant] → always [Category]"
 *
 * Endpoints:
 *   GET    /rules                     - List rules for active budget
 *   POST   /rules                     - Create a rule
 *   PUT    /rules/{ruleId}            - Update a rule
 *   DELETE /rules/{ruleId}            - Delete a rule
 *   POST   /rules/apply               - Apply rules to a list of transactions (internal + Plaid import)
 *   GET    /rules/health              - Health check
 *
 * DynamoDB Entity:
 *   PK: BUDGET#<budgetId>
 *   SK: RULE#<ruleId>
 *   Fields: ruleId, merchantPattern, categoryId, categoryName, createdAt, updatedAt, appliedCount
 */

const {
  successResponse,
  errorResponse,
  parseRequestBody,
  getUserFromEvent,
  generateId,
  dynamoHelpers,
  logger,
  BudgetAccessResolver,
} = require('/opt/nodejs/utils');

/**
 * Main Lambda handler
 */
exports.handler = async (event, context) => {
  logger.info('Rules request received', {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context.awsRequestId,
  });

  try {
    const { httpMethod, path, pathParameters } = event;

    // Health check
    if (httpMethod === 'GET' && path === '/rules/health') {
      return successResponse({ status: 'healthy', service: 'rules', version: '1.0.0' }, 'Rules service is healthy');
    }

    // CORS preflight
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
        body: '',
      };
    }

    // Authenticate
    const user = getUserFromEvent(event);
    if (!user || !user.userId) {
      return errorResponse.unauthorized('Authentication required');
    }

    // POST /rules/apply — apply rules to transactions (called by Plaid import)
    if (httpMethod === 'POST' && path === '/rules/apply') {
      return await handleApplyRules(event, user);
    }

    // GET /rules — list rules
    if (httpMethod === 'GET' && (path === '/rules' || path === '/v1/rules')) {
      return await handleListRules(event, user);
    }

    // POST /rules — create rule
    if (httpMethod === 'POST' && (path === '/rules' || path === '/v1/rules')) {
      return await handleCreateRule(event, user);
    }

    // PUT /rules/{ruleId}
    if (httpMethod === 'PUT' && pathParameters?.ruleId) {
      return await handleUpdateRule(event, user, pathParameters.ruleId);
    }

    // DELETE /rules/{ruleId}
    if (httpMethod === 'DELETE' && pathParameters?.ruleId) {
      return await handleDeleteRule(event, user, pathParameters.ruleId);
    }

    return errorResponse.notFound('Endpoint not found');
  } catch (err) {
    logger.error('Rules handler error', { error: err.message, stack: err.stack });
    return errorResponse.internal('Internal server error');
  }
};

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleListRules(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);

  const rules = await getRulesForBudget(budgetId);
  return successResponse({ rules, count: rules.length }, 'Rules retrieved successfully');
}

async function handleCreateRule(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.write', budgetStatus);

  const body = parseRequestBody(event.body);

  if (!body.merchantPattern || !body.categoryId) {
    return errorResponse.badRequest('merchantPattern and categoryId are required');
  }

  const ruleId = generateId.custom('rule');
  const now = new Date().toISOString();

  const rule = {
    PK: `BUDGET#${budgetId}`,
    SK: `RULE#${ruleId}`,
    ruleId,
    budgetId,
    merchantPattern: body.merchantPattern.toLowerCase().trim(),
    categoryId: body.categoryId,
    categoryName: body.categoryName || '',
    caseSensitive: body.caseSensitive || false,
    exactMatch: body.exactMatch || false,
    appliedCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await dynamoHelpers.putItem(rule);

  logger.info('Rule created', { ruleId, budgetId, merchantPattern: rule.merchantPattern });

  return successResponse({ rule: formatRule(rule) }, 'Rule created successfully', 201);
}

async function handleUpdateRule(event, user, ruleId) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.write', budgetStatus);

  const existing = await dynamoHelpers.getItem(`BUDGET#${budgetId}`, `RULE#${ruleId}`);
  if (!existing) {
    return errorResponse.notFound('Rule not found');
  }

  const body = parseRequestBody(event.body);
  const now = new Date().toISOString();

  const updates = {};
  if (body.merchantPattern !== undefined) updates.merchantPattern = body.merchantPattern.toLowerCase().trim();
  if (body.categoryId !== undefined) updates.categoryId = body.categoryId;
  if (body.categoryName !== undefined) updates.categoryName = body.categoryName;
  if (body.caseSensitive !== undefined) updates.caseSensitive = body.caseSensitive;
  if (body.exactMatch !== undefined) updates.exactMatch = body.exactMatch;
  updates.updatedAt = now;

  const updated = { ...existing, ...updates };
  await dynamoHelpers.putItem(updated);

  return successResponse({ rule: formatRule(updated) }, 'Rule updated successfully');
}

async function handleDeleteRule(event, user, ruleId) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.write', budgetStatus);

  await dynamoHelpers.deleteItem(`BUDGET#${budgetId}`, `RULE#${ruleId}`);

  return successResponse({}, 'Rule deleted successfully');
}

/**
 * Apply rules to a list of transactions — returns transactions with categoryId updated
 */
async function handleApplyRules(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.write', budgetStatus);

  const body = parseRequestBody(event.body);
  const transactions = body.transactions || [];

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return successResponse({ transactions: [], appliedCount: 0 }, 'No transactions to process');
  }

  const rules = await getRulesForBudget(budgetId);
  if (rules.length === 0) {
    return successResponse({ transactions, appliedCount: 0 }, 'No rules defined');
  }

  let appliedCount = 0;
  const enriched = transactions.map((txn) => {
    const matchedRule = findMatchingRule(txn, rules);
    if (matchedRule) {
      appliedCount++;
      // Increment appliedCount on the rule (fire-and-forget)
      dynamoHelpers.putItem({
        ...matchedRule,
        appliedCount: (matchedRule.appliedCount || 0) + 1,
        updatedAt: new Date().toISOString(),
      }).catch(() => {});

      return { ...txn, categoryId: matchedRule.categoryId, ruleApplied: matchedRule.ruleId };
    }
    return txn;
  });

  logger.info('Rules applied to transactions', { budgetId, total: transactions.length, applied: appliedCount });

  return successResponse({ transactions: enriched, appliedCount }, 'Rules applied successfully');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getRulesForBudget(budgetId) {
  try {
    const result = await dynamoHelpers.query({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `BUDGET#${budgetId}`,
        ':skPrefix': 'RULE#',
      },
    });
    return (result.Items || []).map(formatRule);
  } catch (_e) {
    return [];
  }
}

/**
 * Find the first matching rule for a transaction
 */
function findMatchingRule(transaction, rules) {
  const description = (transaction.description || transaction.merchantName || '').toLowerCase();
  if (!description) return null;

  for (const rule of rules) {
    const pattern = rule.merchantPattern;
    const matches = rule.exactMatch
      ? description === pattern
      : description.includes(pattern);
    if (matches) return rule;
  }
  return null;
}

function formatRule(rule) {
  return {
    ruleId: rule.ruleId,
    budgetId: rule.budgetId,
    merchantPattern: rule.merchantPattern,
    categoryId: rule.categoryId,
    categoryName: rule.categoryName || '',
    caseSensitive: rule.caseSensitive || false,
    exactMatch: rule.exactMatch || false,
    appliedCount: rule.appliedCount || 0,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}
