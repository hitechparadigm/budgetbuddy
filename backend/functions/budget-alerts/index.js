/**
 * Budget Alerts Service
 *
 * Monitors budget spending and sends alerts when thresholds are exceeded.
 * Triggered by DynamoDB Streams or scheduled checks.
 *
 * Updated to use BUDGET#<budgetId> partition keys (replaced FAMILY#<familyId>).
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
const { dynamoHelpers } = require('/opt/nodejs/utils');

// Reused across warm invocations
const lambdaClient = new LambdaClient({});

const NOTIFICATION_FUNCTION =
  process.env.NOTIFICATION_FUNCTION_ARN ||
  process.env.NOTIFICATION_FUNCTION ||
  'budgetbuddy-dev-notifications';

// Alert thresholds
const ALERT_THRESHOLDS = [0.8, 0.9, 1.0]; // 80%, 90%, 100%

/** Widest UTC offsets in use (UTC-12 .. UTC+14), in ms. */
const WEST_MS = 12 * 60 * 60 * 1000;
const EAST_MS = 14 * 60 * 60 * 1000;

/**
 * The months that are "current" somewhere on Earth right now (one month, or
 * two around a month boundary), as YYYY-MM.
 * @param {Date} [now]
 * @returns {Set<string>}
 */
function currentMonths(now = new Date()) {
  const at = (ms) => new Date(ms).toISOString().slice(0, 7);
  return new Set([at(now.getTime() - WEST_MS), at(now.getTime() + EAST_MS)]);
}

/**
 * Stream guard (Wave 3 phase 1): a transaction row alerts only when a user
 * wrote it for the current month. Rows a data migration writes (they carry
 * `migrationRunId`) and rows dated in another month never alert, so a backfill
 * or an old-month edit cannot send a burst of stale alerts.
 * @param {Object} image - unmarshalled NewImage
 * @param {string} month - the row's budget month
 * @param {Date} [now]
 * @returns {string|null} skip reason, or null to process
 */
function streamSkipReason(image, month, now = new Date()) {
  if (image.migrationRunId !== undefined) return 'migration_row';
  if (!currentMonths(now).has(month)) return 'other_month';
  return null;
}

/**
 * Categories of a period that alerts apply to. Stored periods keep
 * `groups` as an object of flat category arrays (`{ income, savings,
 * expenses }`); older records used an array of groups with `categories`.
 * Income is not a spending budget, so only expenses and savings count.
 * @param {Object} budget - PERIOD# item
 * @returns {Object[]}
 */
function alertCategories(budget) {
  const groups = budget.groups;
  const flatten = (list) => (Array.isArray(list) ? list : []).flatMap((entry) =>
    (entry && Array.isArray(entry.categories) ? entry.categories : [entry]));
  if (Array.isArray(groups)) return flatten(groups);
  if (groups && typeof groups === 'object') {
    return [...flatten(groups.expenses), ...flatten(groups.savings)];
  }
  return Array.isArray(budget.categories) ? budget.categories : [];
}

/**
 * Get budget period by budgetId and month
 * Key: { PK: 'BUDGET#<budgetId>', SK: 'PERIOD#<month>' }
 */
async function getBudget(budgetId, month) {
  try {
    return await dynamoHelpers.getItem(`BUDGET#${budgetId}`, `PERIOD#${month}`);
  } catch (error) {
    console.error('Error getting budget:', error);
    return null;
  }
}

/**
 * Get budget members via BUDGET#<budgetId>/MEMBER#* records
 */
async function getBudgetMembers(budgetId) {
  try {
    return await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':sk': 'MEMBER#' },
    });
  } catch (error) {
    console.error('Error getting budget members:', error);
    return [];
  }
}

/**
 * Check if alert was already sent
 * Key: { PK: 'BUDGET#<budgetId>', SK: 'ALERT#<alertKey>' }
 */
async function wasAlertSent(budgetId, month, categoryName, threshold) {
  try {
    const alertKey = `${month}-${categoryName}-${threshold}`;
    const item = await dynamoHelpers.getItem(`BUDGET#${budgetId}`, `ALERT#${alertKey}`);

    return !!item;
  } catch (error) {
    console.error('Error checking alert status:', error);
    return false;
  }
}

/**
 * Mark alert as sent
 * Key: { PK: 'BUDGET#<budgetId>', SK: 'ALERT#<alertKey>' }
 */
async function markAlertSent(budgetId, month, categoryName, threshold) {
  try {
    const alertKey = `${month}-${categoryName}-${threshold}`;
    await dynamoHelpers.putItem({
      PK: `BUDGET#${budgetId}`,
      SK: `ALERT#${alertKey}`,
      budgetId,
      month,
      categoryName,
      threshold,
      sentAt: new Date().toISOString(),
      expiresAt: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90 days TTL
    });
  } catch (error) {
    console.error('Error marking alert as sent:', error);
  }
}

/**
 * Send notification to user
 */
async function sendNotification(userId, notification) {
  try {
    await lambdaClient.send(
      new InvokeCommand({
        FunctionName: NOTIFICATION_FUNCTION,
        InvocationType: 'Event', // Async
        // Internal event: the notifications function dispatches it before
        // its Cognito-claims check (an HTTP-shaped event got 401).
        Payload: Buffer.from(
          JSON.stringify({ internalAction: 'send', userId, notification }),
        ),
      }),
    );

    console.log(`Notification sent to user ${userId}`);
  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error);
  }
}

/**
 * Check category for overspending and send alerts
 */
async function checkCategoryAlerts(budgetId, month, category) {
  const planned = category.plannedAmount || 0;
  const spent = category.spentAmount || 0;

  if (planned === 0) return [];

  const percentSpent = spent / planned;
  const alerts = [];

  for (const threshold of ALERT_THRESHOLDS) {
    if (percentSpent >= threshold) {
      const alreadySent = await wasAlertSent(
        budgetId,
        month,
        category.name,
        threshold,
      );

      if (!alreadySent) {
        alerts.push({
          threshold,
          percentSpent,
          planned,
          spent,
        });
      }
    }
  }

  return alerts;
}

/**
 * Generate alert notification
 */
function generateAlertNotification(category, alert, month) {
  const percentDisplay = Math.round(alert.percentSpent * 100);

  let title, body, severity;

  if (alert.threshold === 1.0) {
    title = '🚨 Budget Exceeded!';
    body = `You've spent ${percentDisplay}% of your ${category.name} budget for ${month}`;
    severity = 'high';
  } else if (alert.threshold === 0.9) {
    title = '⚠️ Budget Warning';
    body = `You've spent ${percentDisplay}% of your ${category.name} budget for ${month}`;
    severity = 'medium';
  } else {
    title = '💡 Budget Alert';
    body = `You've spent ${percentDisplay}% of your ${category.name} budget for ${month}`;
    severity = 'low';
  }

  return {
    title,
    body,
    data: {
      type: 'budget_alert',
      category: category.name,
      month,
      threshold: alert.threshold,
      percentSpent: alert.percentSpent,
      planned: alert.planned,
      spent: alert.spent,
      severity,
    },
  };
}

/**
 * Process budget period record for alerts
 */
async function processBudgetAlerts(budget) {
  try {
    // Extract budgetId from PK: 'BUDGET#<budgetId>'
    const budgetId = budget.budgetId || (budget.PK ? budget.PK.split('#')[1] : null);
    const month = budget.month;

    if (!budgetId || !month) {
      console.warn('Budget record missing budgetId or month:', { PK: budget.PK, month });
      return { success: false, error: 'Missing budgetId or month' };
    }

    console.log(`Checking budget alerts for budgetId ${budgetId}, month ${month}`);

    const categories = alertCategories(budget);

    if (categories.length === 0) {
      console.log(`No categories found for budget ${budgetId}`);
      return { success: true, budgetId, month, alertsChecked: 0 };
    }

    // Check each category for alerts
    for (const category of categories) {
      const alerts = await checkCategoryAlerts(budgetId, month, category);

      if (alerts && alerts.length > 0) {
        console.log(`Found ${alerts.length} alerts for category ${category.name}`);

        // Get budget members
        const members = await getBudgetMembers(budgetId);

        // Send alerts to all budget members
        for (const alert of alerts) {
          const notification = generateAlertNotification(category, alert, month);

          for (const member of members) {
            if (member.userId) {
              await sendNotification(member.userId, notification);
            }
          }

          // Mark alert as sent
          await markAlertSent(budgetId, month, category.name, alert.threshold);
        }
      }
    }

    return { success: true, budgetId, month };
  } catch (error) {
    console.error('Error processing budget alerts:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check all active budgets for alerts (scheduled check)
 */
async function checkAllBudgets() {
  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    console.log(`Checking all budgets for month ${currentMonth}`);

    // Scan for all budget PERIOD records for current month (follows every page)
    const budgets = await dynamoHelpers.scan({
      FilterExpression: 'begins_with(PK, :pkPrefix) AND SK = :sk',
      ExpressionAttributeValues: {
        ':pkPrefix': 'BUDGET#',
        ':sk': `PERIOD#${currentMonth}`,
      },
    });
    console.log(`Found ${budgets.length} budget periods to check`);

    const results = [];
    for (const budget of budgets) {
      const result = await processBudgetAlerts(budget);
      results.push(result);
    }

    return results;
  } catch (error) {
    console.error('Error checking all budgets:', error);
    throw error;
  }
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  // Direct health invoke: answer before any read, so it never runs a sweep.
  if (event && event.healthCheck === true) {
    return { statusCode: 200, body: JSON.stringify({ status: 'healthy' }) };
  }

  console.log('Budget alerts event type:', event.Records ? 'DynamoDB Stream' : (event.source || 'manual'));

  try {
    // Handle DynamoDB Stream events (transaction created/updated)
    if (event.Records && event.Records[0] && event.Records[0].eventSource === 'aws:dynamodb') {
      const results = [];

      for (const record of event.Records) {
        if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
          const newImage = unmarshall(record.dynamodb.NewImage);

          // Only process transaction records: SK starts with TXN#
          if (newImage.SK && (newImage.SK.startsWith('TXN#') || newImage.SK.startsWith('TRANSACTION#'))) {
            // Extract budgetId from PK: 'BUDGET#<budgetId>'
            const pk = newImage.PK || '';
            const budgetId = pk.startsWith('BUDGET#') ? pk.split('#')[1] : newImage.budgetId;
            const month = newImage.budgetMonth || newImage.month;

            if (!budgetId || !month) {
              console.warn('Transaction missing budgetId or month in stream record');
              continue;
            }

            const skipReason = streamSkipReason(newImage, month);
            if (skipReason) {
              console.log('Stream record skipped:', { budgetId, reason: skipReason });
              continue;
            }

            // Get the budget period and check for alerts
            const budget = await getBudget(budgetId, month);
            if (budget) {
              const result = await processBudgetAlerts(budget);
              results.push(result);
            } else {
              console.log(`No budget period found for budgetId=${budgetId}, month=${month}`);
            }
          }
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Budget alerts processed',
          results,
        }),
      };
    }

    // Handle scheduled check (EventBridge)
    if (event.source === 'aws.events' || event['detail-type']) {
      const results = await checkAllBudgets();

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Scheduled budget check completed',
          results,
        }),
      };
    }

    // Handle manual invocation
    const results = await checkAllBudgets();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Manual budget check completed',
        results,
      }),
    };
  } catch (error) {
    console.error('Budget alerts error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Budget alerts failed',
        details: error.message,
      }),
    };
  }
};

// Exported for tests
module.exports.streamSkipReason = streamSkipReason;
module.exports.alertCategories = alertCategories;
