/**
 * BudgetBuddy Transaction Planning Lambda Function
 *
 * Handles planned transaction CRUD operations and recurring transaction management.
 * Migrated from FAMILY# pattern to BUDGET# pattern (BudgetAccessResolver).
 *
 * Version: 2.0.0 - BUDGET# model + BudgetAccessResolver
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

const { PLANNED_TXN_SK_PREFIX, plannedTxnSK } = require('./keys');

/**
 * Main Lambda handler for transaction planning operations
 */
exports.handler = async (event, context) => {
  logger.info('Transaction planning request received', {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context.awsRequestId,
  });

  try {
    const { httpMethod, path, pathParameters } = event;

    if (httpMethod === 'GET' && path === '/transaction-planning/health') {
      return successResponse({ status: 'healthy', service: 'transaction-planning', version: '2.0.0' }, 'Healthy');
    }

    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
        body: '',
      };
    }

    const { userId } = getUserFromEvent(event);

    // Resolve budget access using BudgetAccessResolver (BUDGET# model)
    const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers);

    // POST /transaction-planning/{plannedTransactionId}/mark-paid — must be
    // matched before the bare collection-level POST create branch.
    if (
      httpMethod === 'POST' &&
      pathParameters?.plannedTransactionId &&
      typeof path === 'string' &&
      path.endsWith('/mark-paid')
    ) {
      BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);
      return await markPlannedTransactionPaid(userId, budgetId, pathParameters.plannedTransactionId);
    }

    if (httpMethod === 'POST' && path === '/transaction-planning') {
      BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);
      return await createPlannedTransaction(event, userId, budgetId);
    }

    if (httpMethod === 'GET' && path === '/transaction-planning') {
      BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);
      return await getPlannedTransactions(event, userId, budgetId);
    }

    if (httpMethod === 'PUT' && pathParameters?.plannedTransactionId) {
      BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);
      return await updatePlannedTransaction(event, userId, budgetId, pathParameters.plannedTransactionId);
    }

    if (httpMethod === 'DELETE' && pathParameters?.plannedTransactionId) {
      BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);
      return await deletePlannedTransaction(userId, budgetId, pathParameters.plannedTransactionId);
    }

    return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);

  } catch (error) {
    logger.error('Transaction planning function error', error, {
      requestId: context.awsRequestId,
    });

    // Handle BudgetAccessResolver structured errors
    if (error && error.statusCode && error.message) {
      return {
        statusCode: error.statusCode,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Forbidden', message: error.message }),
      };
    }

    if (error.message?.includes('No user claims')) {
      return errorResponse.unauthorized('Authentication required');
    }

    return errorResponse.internalError('Transaction planning processing failed');
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// CRUD
// ────────────────────────────────────────────────────────────────────────────────

async function createPlannedTransaction(event, userId, budgetId) {
  const body = parseRequestBody(event.body) || {};

  const requiredFields = ['type', 'amount', 'currency', 'categoryId', 'categoryName', 'date'];
  for (const field of requiredFields) {
    if (!body[field]) return errorResponse.badRequest(`${field} is required`);
  }

  if (!['income', 'expense'].includes(body.type)) {
    return errorResponse.badRequest('type must be "income" or "expense"');
  }
  if (body.amount <= 0) return errorResponse.badRequest('amount must be positive');

  const planId = generateId.custom('plan');
  const now = new Date().toISOString();
  const nextOccurrence = body.isRecurring
    ? calculateNextOccurrence(body.date, body.frequency, body.customInterval, body.onLastDayOfMonth)
    : null;

  const item = {
    PK: `BUDGET#${budgetId}`,
    SK: plannedTxnSK(planId),
    entityType: 'PLANNED_TRANSACTION',
    planId,
    budgetId,
    transactionType: body.type,
    amount: body.amount,
    currency: body.currency,
    categoryId: body.categoryId,
    categoryName: body.categoryName,
    scheduledDate: body.date,
    scheduledTime: body.time || '12:00',
    notes: body.notes || null,
    isRecurring: body.isRecurring || false,
    frequency: body.frequency || null,
    customInterval: body.customInterval || null,
    onLastDayOfMonth: body.onLastDayOfMonth || false,
    endDate: body.endDate || null,
    nextOccurrence,
    isExecuted: false,
    executedTransactionId: null,
    isDeleted: false,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  await dynamoHelpers.putItem(item);

  logger.info('Planned transaction created', { planId, budgetId, type: body.type });

  return successResponse({
    planId, budgetId,
    transactionType: item.transactionType,
    amount: item.amount,
    currency: item.currency,
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    scheduledDate: item.scheduledDate,
    isRecurring: item.isRecurring,
    frequency: item.frequency,
    nextOccurrence: item.nextOccurrence,
    createdAt: item.createdAt,
  }, 'Planned transaction created');
}

async function getPlannedTransactions(event, _userId, budgetId) {
  const q = event.queryStringParameters || {};

  // Every composite part is parenthesised. Without the parentheses DynamoDB
  // binds AND tighter than OR, so
  //   entityType = :et AND attribute_not_exists(isDeleted) OR isDeleted = :f
  // evaluates as
  //   (entityType = :et AND attribute_not_exists(isDeleted)) OR isDeleted = :f
  // which returns every item in the partition that carries isDeleted: false
  // regardless of entity type, and keeps returning soft-deleted plans.
  const filterParts = [
    'begins_with(SK, :skPrefix)',
    'entityType = :et',
    '(attribute_not_exists(isDeleted) OR isDeleted = :f)',
  ];
  const exprVals = {
    ':skPrefix': PLANNED_TXN_SK_PREFIX,
    ':et': 'PLANNED_TRANSACTION',
    ':f': false,
  };

  if (q.type) {
    filterParts.push('transactionType = :type');
    exprVals[':type'] = q.type;
  }
  if (q.startDate) {
    filterParts.push('scheduledDate >= :sd');
    exprVals[':sd'] = q.startDate;
  }
  if (q.endDate) {
    filterParts.push('scheduledDate <= :ed');
    exprVals[':ed'] = q.endDate;
  }
  if (q.includeExecuted !== 'true') {
    filterParts.push('isExecuted = :ie');
    exprVals[':ie'] = false;
  }

  const result = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
    FilterExpression: filterParts.join(' AND '),
    ExpressionAttributeValues: exprVals,
  });

  const plans = (result || []).map(p => ({
    planId: p.planId,
    budgetId: p.budgetId,
    transactionType: p.transactionType,
    amount: p.amount,
    currency: p.currency,
    categoryId: p.categoryId,
    categoryName: p.categoryName,
    scheduledDate: p.scheduledDate,
    scheduledTime: p.scheduledTime,
    notes: p.notes,
    isRecurring: p.isRecurring,
    frequency: p.frequency,
    customInterval: p.customInterval,
    onLastDayOfMonth: p.onLastDayOfMonth,
    endDate: p.endDate,
    nextOccurrence: p.nextOccurrence,
    isExecuted: p.isExecuted,
    executedTransactionId: p.executedTransactionId,
    createdBy: p.createdBy,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  plans.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  return successResponse({ plans, count: plans.length }, 'Planned transactions retrieved');
}

async function updatePlannedTransaction(event, _userId, budgetId, planId) {
  const body = parseRequestBody(event.body) || {};

  const existing = await findPlan(budgetId, planId);
  if (!existing) return errorResponse.notFound(`Planned transaction ${planId} not found`);
  if (existing.isExecuted) return errorResponse.badRequest('Cannot update executed transaction');

  const updates = { updatedAt: new Date().toISOString() };
  const allowed = ['amount', 'scheduledDate', 'scheduledTime', 'notes', 'categoryId', 'categoryName', 'frequency', 'endDate'];
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  if (updates.amount !== undefined && updates.amount <= 0) {
    return errorResponse.badRequest('amount must be positive');
  }

  const updated = await dynamoHelpers.updateItem(`BUDGET#${budgetId}`, plannedTxnSK(planId), updates);

  return successResponse({ planId: updated.planId, updatedAt: updated.updatedAt }, 'Updated');
}

async function deletePlannedTransaction(_userId, budgetId, planId) {
  const existing = await findPlan(budgetId, planId);
  if (!existing) return errorResponse.notFound(`Planned transaction ${planId} not found`);

  await dynamoHelpers.updateItem(`BUDGET#${budgetId}`, plannedTxnSK(planId), {
    isDeleted: true,
    deletedAt: new Date().toISOString(),
  });

  return successResponse(null, 'Deleted');
}

/**
 * Mark a planned transaction as paid: create the real transaction it stands
 * for, flag the plan as executed, and schedule the next occurrence when the
 * plan recurs. Reached via POST /transaction-planning/{id}/mark-paid, so the
 * id arrives as a path parameter rather than in the request body.
 */
async function markPlannedTransactionPaid(userId, budgetId, planId) {
  if (!planId) return errorResponse.badRequest('plannedTransactionId is required');

  const plan = await findPlan(budgetId, planId);
  if (!plan) return errorResponse.notFound(`Planned transaction ${planId} not found`);
  if (plan.isExecuted) return errorResponse.badRequest('Already executed');

  const txnId = generateId.custom('txn');
  const now = new Date().toISOString();

  // Store as a transaction record under BUDGET#
  const txn = {
    PK: `BUDGET#${budgetId}`,
    SK: `TXN#${txnId}`,
    entityType: 'TRANSACTION',
    transactionId: txnId,
    budgetId,
    amount: plan.amount,
    type: plan.transactionType,
    categoryId: plan.categoryId,
    categoryName: plan.categoryName,
    description: plan.notes || `${plan.categoryName} - planned`,
    date: plan.scheduledDate,
    currency: plan.currency,
    sourceType: 'PLANNED_TRANSACTION',
    sourcePlanId: planId,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  await dynamoHelpers.putItem(txn);

  // Mark plan as executed
  await dynamoHelpers.updateItem(`BUDGET#${budgetId}`, plannedTxnSK(planId), {
    isExecuted: true,
    executedTransactionId: txnId,
    executedAt: now,
    updatedAt: now,
  });

  // Schedule next occurrence for recurring plans
  if (plan.isRecurring && !hasRecurringEnded(plan)) {
    await scheduleNextOccurrence(plan, userId, budgetId);
  }

  logger.info('Planned transaction executed', { planId, txnId, budgetId });

  return successResponse({ transactionId: txnId, planId, executedAt: now }, 'Executed');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────────────

async function findPlan(budgetId, planId) {
  const result = await dynamoHelpers.getItem(`BUDGET#${budgetId}`, plannedTxnSK(planId));
  if (!result || result.isDeleted) return null;
  return result;
}

async function scheduleNextOccurrence(plan, userId, budgetId) {
  const nextDate = getNextDate(new Date(plan.scheduledDate), plan.frequency, plan.customInterval, plan.onLastDayOfMonth);
  if (!nextDate) return;
  if (plan.endDate && nextDate > new Date(plan.endDate)) return;

  const planId = generateId.custom('plan');
  const now = new Date().toISOString();
  const scheduledDate = nextDate.toISOString().slice(0, 10);

  await dynamoHelpers.putItem({
    ...plan,
    planId,
    PK: `BUDGET#${budgetId}`,
    SK: plannedTxnSK(planId),
    scheduledDate,
    originalPlanId: plan.planId,
    isExecuted: false,
    executedTransactionId: null,
    isDeleted: false,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });
}

function calculateNextOccurrence(startDate, frequency, customInterval, onLastDayOfMonth) {
  const d = new Date(startDate);
  return advanceDate(d, frequency, customInterval, onLastDayOfMonth)?.toISOString().slice(0, 10) ?? null;
}

function getNextDate(d, frequency, customInterval, onLastDayOfMonth) {
  return advanceDate(new Date(d), frequency, customInterval, onLastDayOfMonth);
}

function advanceDate(d, frequency, customInterval, onLastDayOfMonth) {
  switch (frequency) {
    case 'daily': d.setDate(d.getDate() + 1); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'biweekly': d.setDate(d.getDate() + 14); break;
    case 'bi-weekly': d.setDate(d.getDate() + 14); break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      if (onLastDayOfMonth) { d.setDate(0); }
      break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'annually': d.setFullYear(d.getFullYear() + 1); break;
    case 'custom':
      if (customInterval) { d.setMonth(d.getMonth() + customInterval); }
      break;
    default: return null;
  }
  return d;
}

function hasRecurringEnded(plan) {
  if (!plan.endDate) return false;
  return new Date() > new Date(plan.endDate);
}
