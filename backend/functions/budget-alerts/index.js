/**
 * Budget Alerts Service
 *
 * Monitors budget spending and sends alerts when thresholds are exceeded.
 * Triggered by DynamoDB Streams or scheduled checks.
 */

const AWS = require("aws-sdk");

const dynamodb = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda();

const TABLE_NAME = process.env.TABLE_NAME || "budgetbuddy-main";
const NOTIFICATION_FUNCTION =
  process.env.NOTIFICATION_FUNCTION || "budgetbuddy-notifications";

// Alert thresholds
const ALERT_THRESHOLDS = [0.8, 0.9, 1.0]; // 80%, 90%, 100%

/**
 * Get budget by ID
 */
async function getBudget(familyId, month) {
  try {
    const result = await dynamodb
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: `BUDGET#${month}`,
        },
      })
      .promise();

    return result.Item;
  } catch (error) {
    console.error("Error getting budget:", error);
    return null;
  }
}

/**
 * Get users for a family
 */
async function getFamilyUsers(familyId) {
  try {
    const result = await dynamodb
      .scan({
        TableName: TABLE_NAME,
        FilterExpression: "familyId = :familyId AND SK = :sk",
        ExpressionAttributeValues: {
          ":familyId": familyId,
          ":sk": "PROFILE",
        },
      })
      .promise();

    return result.Items || [];
  } catch (error) {
    console.error("Error getting family users:", error);
    return [];
  }
}

/**
 * Check if alert was already sent
 */
async function wasAlertSent(familyId, month, categoryName, threshold) {
  try {
    const alertKey = `${month}-${categoryName}-${threshold}`;
    const result = await dynamodb
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: `ALERT#${alertKey}`,
        },
      })
      .promise();

    return !!result.Item;
  } catch (error) {
    console.error("Error checking alert status:", error);
    return false;
  }
}

/**
 * Mark alert as sent
 */
async function markAlertSent(familyId, month, categoryName, threshold) {
  try {
    const alertKey = `${month}-${categoryName}-${threshold}`;
    await dynamodb
      .put({
        TableName: TABLE_NAME,
        Item: {
          PK: `FAMILY#${familyId}`,
          SK: `ALERT#${alertKey}`,
          month,
          categoryName,
          threshold,
          sentAt: new Date().toISOString(),
          expiresAt: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90 days TTL
        },
      })
      .promise();
  } catch (error) {
    console.error("Error marking alert as sent:", error);
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
        InvocationType: "Event", // Async
        Payload: JSON.stringify({
          httpMethod: "POST",
          path: "/notifications/send",
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
async function checkCategoryAlerts(familyId, month, category) {
  const planned = category.plannedAmount || 0;
  const spent = category.spentAmount || 0;

  if (planned === 0) return;

  const percentSpent = spent / planned;
  const alerts = [];

  for (const threshold of ALERT_THRESHOLDS) {
    if (percentSpent >= threshold) {
      const alreadySent = await wasAlertSent(
        familyId,
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
    title = "🚨 Budget Exceeded!";
    body = `You've spent ${percentDisplay}% of your ${category.name} budget for ${month}`;
    severity = "high";
  } else if (alert.threshold === 0.9) {
    title = "⚠️ Budget Warning";
    body = `You've spent ${percentDisplay}% of your ${category.name} budget for ${month}`;
    severity = "medium";
  } else {
    title = "💡 Budget Alert";
    body = `You've spent ${percentDisplay}% of your ${category.name} budget for ${month}`;
    severity = "low";
  }

  return {
    title,
    body,
    data: {
      type: "budget_alert",
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
 * Process budget for alerts
 */
async function processBudgetAlerts(budget) {
  try {
    const familyId = budget.familyId;
    const month = budget.month;

    console.log(
      `Checking budget alerts for family ${familyId}, month ${month}`,
    );

    // Get all categories from all groups
    const categories = [];
    if (budget.groups) {
      budget.groups.forEach((group) => {
        if (group.categories) {
          categories.push(...group.categories);
        }
      });
    }

    // Check each category for alerts
    for (const category of categories) {
      const alerts = await checkCategoryAlerts(familyId, month, category);

      if (alerts.length > 0) {
        console.log(
          `Found ${alerts.length} alerts for category ${category.name}`,
        );

        // Get family users
        const users = await getFamilyUsers(familyId);

        // Send alerts to all family members
        for (const alert of alerts) {
          const notification = generateAlertNotification(
            category,
            alert,
            month,
          );

          for (const user of users) {
            await sendNotification(user.userId, notification);
          }

          // Mark alert as sent
          await markAlertSent(familyId, month, category.name, alert.threshold);
        }
      }
    }

    return { success: true, familyId, month };
  } catch (error) {
    console.error("Error processing budget alerts:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Check all active budgets for alerts
 */
async function checkAllBudgets() {
  try {
    // Get current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    console.log(`Checking all budgets for month ${currentMonth}`);

    // Scan for all budgets in current month
    const result = await dynamodb
      .scan({
        TableName: TABLE_NAME,
        FilterExpression: "begins_with(SK, :sk) AND #month = :month",
        ExpressionAttributeNames: {
          "#month": "month",
        },
        ExpressionAttributeValues: {
          ":sk": "BUDGET#",
          ":month": currentMonth,
        },
      })
      .promise();

    const budgets = result.Items || [];
    console.log(`Found ${budgets.length} budgets to check`);

    const results = [];
    for (const budget of budgets) {
      const result = await processBudgetAlerts(budget);
      results.push(result);
    }

    return results;
  } catch (error) {
    console.error("Error checking all budgets:", error);
    throw error;
  }
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log("Budget alerts event:", JSON.stringify(event, null, 2));

  try {
    // Handle DynamoDB Stream events (transaction created/updated)
    if (event.Records && event.Records[0].eventSource === "aws:dynamodb") {
      const results = [];

      for (const record of event.Records) {
        if (record.eventName === "INSERT" || record.eventName === "MODIFY") {
          const newImage = AWS.DynamoDB.Converter.unmarshall(
            record.dynamodb.NewImage,
          );

          // Check if this is a transaction
          if (newImage.SK && newImage.SK.startsWith("TRANSACTION#")) {
            const familyId = newImage.familyId;
            const month = newImage.budgetMonth;

            // Get the budget and check for alerts
            const budget = await getBudget(familyId, month);
            if (budget) {
              const result = await processBudgetAlerts(budget);
              results.push(result);
            }
          }
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Budget alerts processed",
          results,
        }),
      };
    }

    // Handle scheduled check (EventBridge)
    if (event.source === "aws.events") {
      const results = await checkAllBudgets();

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Scheduled budget check completed",
          results,
        }),
      };
    }

    // Handle manual invocation
    const results = await checkAllBudgets();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Manual budget check completed",
        results,
      }),
    };
  } catch (error) {
    console.error("Budget alerts error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Budget alerts failed",
        details: error.message,
      }),
    };
  }
};
