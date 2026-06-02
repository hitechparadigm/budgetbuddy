/**
 * Budget Alerts Service
 *
 * Monitors budget spending and sends alerts when thresholds are exceeded.
 * Triggered by DynamoDB Streams or scheduled checks.
 *
 * Updated to use BUDGET#<budgetId> partition keys (replaced FAMILY#<familyId>).
 */

const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda();

const TABLE_NAME = process.env.TABLE_NAME || 'budgetbuddy-dev-main';
const NOTIFICATION_FUNCTION =
  process.env.NOTIFICATION_FUNCTION_ARN ||
  process.env.NOTIFICATION_FUNCTION ||
  'budgetbuddy-dev-notifications';

// Alert thresholds
const ALERT_THRESHOLDS = [0.8, 0.9, 1.0]; // 80%, 90%, 100%

/**
 * Get budget period by budgetId and month
 * Key: { PK: 'BUDGET#<budgetId>', SK: 'PERIOD#<month>' }
 */
async function getBudget(budgetId, month) {
  try {
    const result = await dynamodb
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: `BUDGET#${budgetId}`,
          SK: `PERIOD#${month}`,
        },
      })
      .promise();

    return result.Item || null;
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
    const result = await dynamodb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `BUDGET#${budgetId}`,
          ':sk': 'MEMBER#',
        },
      })
      .promise();

    return result.Items || [];
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
    const result = await dynamodb
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: `BUDGET#${budgetId}`,
          SK: `ALERT#${alertKey}`,
        },
      })
      .promise();

    return !!result.Item;
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
    await dynamodb
      .put({
        TableName: TABLE_NAME,
        Item: {
          PK: `BUDGET#${budgetId}`,
          SK: `ALERT#${alertKey}`,
          budgetId,
          month,
          categoryName,
          threshold,
          sentAt: new Date().toISOString(),
          expiresAt: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90 days TTL
        },
      })
      .promise();
  } catch (error) {
    console.error('Error marking alert as sent:', error);
  }
}

/**
 * Send notification to user
 */
async function sendNotification(userId, notification) {
  try {
    await lambda
      .invoke({
        FunctionName: NOTIFICATION_FUNCTION,
        InvocationType: 'Event', // Async
        Payload: JSON.stringify({
          httpMethod: 'POST',
          path: '/notifications/send',
          body: JSON.stringify({
            userId,
            notification,
          }),
        }),
      })
      .promise();

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

    // Get all categories from all groups
    const categories = [];
    if (budget.groups) {
      budget.groups.forEach((group) => {
        if (group.categories) {
          categories.push(...group.categories);
        }
      });
    } else if (budget.categories) {
      categories.push(...budget.categories);
    }

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

    // Scan for all budget PERIOD records for current month
    const result = await dynamodb
      .scan({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :pkPrefix) AND SK = :sk',
        ExpressionAttributeValues: {
          ':pkPrefix': 'BUDGET#',
          ':sk': `PERIOD#${currentMonth}`,
        },
      })
      .promise();

    const budgets = result.Items || [];
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
  console.log('Budget alerts event type:', event.Records ? 'DynamoDB Stream' : (event.source || 'manual'));

  try {
    // Handle DynamoDB Stream events (transaction created/updated)
    if (event.Records && event.Records[0] && event.Records[0].eventSource === 'aws:dynamodb') {
      const results = [];

      for (const record of event.Records) {
        if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
          const newImage = AWS.DynamoDB.Converter.unmarshall(
            record.dynamodb.NewImage,
          );

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
