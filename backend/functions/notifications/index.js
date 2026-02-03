/**
 * Notification Service
 *
 * Handles push notifications via AWS SNS and Expo Push Notifications.
 * Supports budget alerts, reminders, and custom notifications.
 */

const AWS = require("aws-sdk");

const sns = new AWS.SNS();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.TABLE_NAME || "budgetbuddy-main";
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

/**
 * Notification Types for AI Pattern Detection and Budget Planning
 */
const NOTIFICATION_TYPES = {
  // Existing types
  BUDGET_ALERT: "BUDGET_ALERT",
  DAILY_REMINDER: "DAILY_REMINDER",
  BILL_DUE: "BILL_DUE",
  // New AI-related types
  PATTERN_DETECTED: "PATTERN_DETECTED",
  PATTERN_AMOUNT_CHANGED: "PATTERN_AMOUNT_CHANGED",
  PATTERN_MISSING: "PATTERN_MISSING",
  BUDGET_SUGGESTION_AVAILABLE: "BUDGET_SUGGESTION_AVAILABLE",
};

/**
 * Notification templates for AI-related notifications
 */
const NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_TYPES.PATTERN_DETECTED]: {
    title: "New Recurring Bill Detected",
    bodyTemplate:
      "We detected a recurring payment to {merchantName} ({frequency}) for approximately ${amount}. Would you like to add it as a bill reminder?",
    actionUrl: "/bills/review-patterns",
  },
  [NOTIFICATION_TYPES.PATTERN_AMOUNT_CHANGED]: {
    title: "Bill Amount Changed",
    bodyTemplate:
      "Your {billName} payment changed from ${oldAmount} to ${newAmount} ({changePercent}% {direction}). Would you like to update your budget?",
    actionUrl: "/bills",
  },
  [NOTIFICATION_TYPES.PATTERN_MISSING]: {
    title: "Expected Payment Not Found",
    bodyTemplate:
      "We haven't seen your usual {billName} payment that was expected around {expectedDate}. Did you pay it differently?",
    actionUrl: "/bills",
  },
  [NOTIFICATION_TYPES.BUDGET_SUGGESTION_AVAILABLE]: {
    title: "Budget Suggestions Ready",
    bodyTemplate:
      "AI-powered budget suggestions for {targetMonth} are ready! We found {suggestionCount} categories to review.",
    actionUrl: "/budget/suggestions",
  },
};

/**
 * Get CORS headers
 */
function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  };
}

/**
 * Register device token for push notifications
 */
async function registerDeviceToken(userId, deviceToken, platform) {
  try {
    // Store device token in DynamoDB
    await dynamodb
      .put({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${userId}`,
          SK: `DEVICE#${deviceToken}`,
          deviceToken,
          platform, // 'ios' or 'android'
          registeredAt: new Date().toISOString(),
          enabled: true,
        },
      })
      .promise();

    // Subscribe to SNS topic
    if (SNS_TOPIC_ARN) {
      await sns
        .subscribe({
          Protocol: "application",
          TopicArn: SNS_TOPIC_ARN,
          Endpoint: deviceToken,
        })
        .promise();
    }

    return { success: true, deviceToken };
  } catch (error) {
    console.error("Error registering device token:", error);
    throw error;
  }
}

/**
 * Unregister device token
 */
async function unregisterDeviceToken(userId, deviceToken) {
  try {
    await dynamodb
      .delete({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `DEVICE#${deviceToken}`,
        },
      })
      .promise();

    return { success: true };
  } catch (error) {
    console.error("Error unregister device token:", error);
    throw error;
  }
}

/**
 * Get all device tokens for a user
 */
async function getUserDeviceTokens(userId) {
  try {
    const result = await dynamodb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":sk": "DEVICE#",
        },
      })
      .promise();

    return (result.Items || [])
      .filter((item) => item.enabled)
      .map((item) => ({
        token: item.deviceToken,
        platform: item.platform,
      }));
  } catch (error) {
    console.error("Error getting device tokens:", error);
    return [];
  }
}

/**
 * Send push notification via Expo
 */
async function sendExpoPushNotification(tokens, title, body, data = {}) {
  const messages = tokens.map((token) => ({
    to: token,
    sound: "default",
    title,
    body,
    data,
  }));

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error sending Expo push notification:", error);
    throw error;
  }
}

/**
 * Send notification to user
 */
async function sendNotification(userId, notification) {
  try {
    const devices = await getUserDeviceTokens(userId);

    if (devices.length === 0) {
      console.log(`No devices registered for user ${userId}`);
      return { success: false, reason: "No devices registered" };
    }

    const expoTokens = devices
      .filter((d) => d.token.startsWith("ExponentPushToken"))
      .map((d) => d.token);

    if (expoTokens.length > 0) {
      await sendExpoPushNotification(
        expoTokens,
        notification.title,
        notification.body,
        notification.data,
      );
    }

    // Store notification in database
    await dynamodb
      .put({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${userId}`,
          SK: `NOTIFICATION#${Date.now()}`,
          ...notification,
          sentAt: new Date().toISOString(),
          read: false,
        },
      })
      .promise();

    return { success: true, deviceCount: devices.length };
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
}

/**
 * Get notification preferences for user
 */
async function getNotificationPreferences(userId) {
  try {
    const result = await dynamodb
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: "NOTIFICATION_PREFERENCES",
        },
      })
      .promise();

    return (
      result.Item || {
        budgetAlerts: true,
        dailyReminders: true,
        reminderTime: "19:00", // 7:00 PM
        quietHoursStart: "22:00", // 10:00 PM
        quietHoursEnd: "08:00", // 8:00 AM
      }
    );
  } catch (error) {
    console.error("Error getting notification preferences:", error);
    return null;
  }
}

/**
 * Update notification preferences
 */
async function updateNotificationPreferences(userId, preferences) {
  try {
    await dynamodb
      .put({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${userId}`,
          SK: "NOTIFICATION_PREFERENCES",
          ...preferences,
          updatedAt: new Date().toISOString(),
        },
      })
      .promise();

    return { success: true, preferences };
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    throw error;
  }
}

/**
 * Get notification history for user
 */
async function getNotificationHistory(
  userId,
  limit = 50,
  lastEvaluatedKey = null,
) {
  try {
    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":sk": "NOTIFICATION#",
      },
      Limit: limit,
      ScanIndexForward: false, // Sort by SK descending (newest first)
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }

    const result = await dynamodb.query(params).promise();

    return {
      notifications: result.Items || [],
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  } catch (error) {
    console.error("Error getting notification history:", error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
async function markNotificationAsRead(userId, notificationId) {
  try {
    await dynamodb
      .update({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `NOTIFICATION#${notificationId}`,
        },
        UpdateExpression: "SET #read = :read",
        ExpressionAttributeNames: {
          "#read": "read",
        },
        ExpressionAttributeValues: {
          ":read": true,
        },
      })
      .promise();

    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

/**
 * Create notification for detected pattern
 * @param {string} userId - User ID
 * @param {Object} pattern - Detected pattern
 * @returns {Promise<Object>} Notification result
 */
async function notifyPatternDetected(userId, pattern) {
  const template = NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.PATTERN_DETECTED];
  const body = template.bodyTemplate
    .replace("{merchantName}", pattern.merchantName)
    .replace("{frequency}", pattern.frequency)
    .replace("{amount}", pattern.averageAmount?.toFixed(2) || "0.00");

  const notification = {
    type: NOTIFICATION_TYPES.PATTERN_DETECTED,
    title: template.title,
    body,
    data: {
      patternId: pattern.patternId,
      merchantName: pattern.merchantName,
      averageAmount: pattern.averageAmount,
      frequency: pattern.frequency,
      confidenceScore: pattern.confidenceScore,
      actionUrl: template.actionUrl,
      actions: [
        { label: "Review", action: "review", patternId: pattern.patternId },
        { label: "Dismiss", action: "dismiss", patternId: pattern.patternId },
      ],
    },
  };

  return sendNotification(userId, notification);
}

/**
 * Create notification for pattern amount change
 * @param {string} userId - User ID
 * @param {Object} bill - Bill with changed amount
 * @param {number} oldAmount - Previous amount
 * @param {number} newAmount - New amount
 * @returns {Promise<Object>} Notification result
 */
async function notifyPatternAmountChanged(userId, bill, oldAmount, newAmount) {
  const template =
    NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.PATTERN_AMOUNT_CHANGED];
  const changePercent = Math.abs(
    ((newAmount - oldAmount) / oldAmount) * 100,
  ).toFixed(0);
  const direction = newAmount > oldAmount ? "increase" : "decrease";

  const body = template.bodyTemplate
    .replace("{billName}", bill.name)
    .replace("{oldAmount}", oldAmount.toFixed(2))
    .replace("{newAmount}", newAmount.toFixed(2))
    .replace("{changePercent}", changePercent)
    .replace("{direction}", direction);

  const notification = {
    type: NOTIFICATION_TYPES.PATTERN_AMOUNT_CHANGED,
    title: template.title,
    body,
    data: {
      billId: bill.billId,
      billName: bill.name,
      oldAmount,
      newAmount,
      changePercent: parseFloat(changePercent),
      direction,
      actionUrl: template.actionUrl,
      actions: [
        {
          label: "Update Budget",
          action: "update_budget",
          billId: bill.billId,
        },
        { label: "Ignore", action: "ignore" },
      ],
    },
  };

  return sendNotification(userId, notification);
}

/**
 * Create notification for missing expected pattern
 * @param {string} userId - User ID
 * @param {Object} bill - Bill that was expected
 * @param {string} expectedDate - Expected date
 * @returns {Promise<Object>} Notification result
 */
async function notifyPatternMissing(userId, bill, expectedDate) {
  const template = NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.PATTERN_MISSING];
  const body = template.bodyTemplate
    .replace("{billName}", bill.name)
    .replace("{expectedDate}", expectedDate);

  const notification = {
    type: NOTIFICATION_TYPES.PATTERN_MISSING,
    title: template.title,
    body,
    data: {
      billId: bill.billId,
      billName: bill.name,
      expectedDate,
      actionUrl: template.actionUrl,
      actions: [
        { label: "Mark Paid", action: "mark_paid", billId: bill.billId },
        { label: "Skip This Month", action: "skip" },
        { label: "Bill Cancelled", action: "cancel_bill", billId: bill.billId },
      ],
    },
  };

  return sendNotification(userId, notification);
}

/**
 * Create notification for budget suggestions available
 * @param {string} userId - User ID
 * @param {string} targetMonth - Target month (YYYY-MM)
 * @param {number} suggestionCount - Number of suggestions
 * @param {string} suggestionId - Suggestion ID
 * @returns {Promise<Object>} Notification result
 */
async function notifyBudgetSuggestionsAvailable(
  userId,
  targetMonth,
  suggestionCount,
  suggestionId,
) {
  const template =
    NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.BUDGET_SUGGESTION_AVAILABLE];

  // Format month for display
  const [year, month] = targetMonth.split("-");
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const displayMonth = `${monthNames[parseInt(month) - 1]} ${year}`;

  const body = template.bodyTemplate
    .replace("{targetMonth}", displayMonth)
    .replace("{suggestionCount}", suggestionCount.toString());

  const notification = {
    type: NOTIFICATION_TYPES.BUDGET_SUGGESTION_AVAILABLE,
    title: template.title,
    body,
    data: {
      suggestionId,
      targetMonth,
      suggestionCount,
      actionUrl: template.actionUrl,
      actions: [
        { label: "Review Suggestions", action: "review", suggestionId },
        { label: "Later", action: "dismiss" },
      ],
    },
  };

  return sendNotification(userId, notification);
}

/**
 * Check if notification should be sent based on confidence threshold
 * @param {number} confidenceScore - Pattern confidence score
 * @param {number} threshold - Minimum threshold (default 70)
 * @returns {boolean} Whether to send notification
 */
function shouldNotifyForPattern(confidenceScore, threshold = 70) {
  return confidenceScore >= threshold;
}

/**
 * Check if amount change is significant enough to notify
 * @param {number} oldAmount - Previous amount
 * @param {number} newAmount - New amount
 * @param {number} threshold - Percentage threshold (default 20)
 * @returns {boolean} Whether to send notification
 */
function isSignificantAmountChange(oldAmount, newAmount, threshold = 20) {
  if (oldAmount === 0) return newAmount > 0;
  const changePercent = Math.abs(((newAmount - oldAmount) / oldAmount) * 100);
  return changePercent >= threshold;
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log("Notification request:", JSON.stringify(event, null, 2));

  try {
    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: "",
      };
    }

    const path = event.path || event.rawPath || "";
    const method = event.httpMethod || event.requestContext?.http?.method;
    const body = event.body ? JSON.parse(event.body) : {};

    // Register device token
    if (method === "POST" && path.includes("/register")) {
      const { userId, deviceToken, platform } = body;

      if (!userId || !deviceToken || !platform) {
        return {
          statusCode: 400,
          headers: getCorsHeaders(),
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      const result = await registerDeviceToken(userId, deviceToken, platform);

      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify(result),
      };
    }

    // Unregister device token
    if (method === "DELETE" && path.includes("/register")) {
      const { userId, deviceToken } = body;

      if (!userId || !deviceToken) {
        return {
          statusCode: 400,
          headers: getCorsHeaders(),
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      const result = await unregisterDeviceToken(userId, deviceToken);

      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify(result),
      };
    }

    // Send notification
    if (method === "POST" && path.includes("/send")) {
      const { userId, notification } = body;

      if (!userId || !notification) {
        return {
          statusCode: 400,
          headers: getCorsHeaders(),
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      const result = await sendNotification(userId, notification);

      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify(result),
      };
    }

    // Get notification preferences
    if (method === "GET" && path.includes("/preferences")) {
      const userId = event.queryStringParameters?.userId;

      if (!userId) {
        return {
          statusCode: 400,
          headers: getCorsHeaders(),
          body: JSON.stringify({ error: "Missing userId" }),
        };
      }

      const preferences = await getNotificationPreferences(userId);

      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify(preferences),
      };
    }

    // Update notification preferences
    if (method === "PUT" && path.includes("/preferences")) {
      const { userId, preferences } = body;

      if (!userId || !preferences) {
        return {
          statusCode: 400,
          headers: getCorsHeaders(),
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      const result = await updateNotificationPreferences(userId, preferences);

      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify(result),
      };
    }

    // Get notification history
    if (method === "GET" && path.includes("/history")) {
      const userId = event.queryStringParameters?.userId;
      const limit = parseInt(event.queryStringParameters?.limit || "50");
      const lastEvaluatedKey = event.queryStringParameters?.lastEvaluatedKey
        ? JSON.parse(event.queryStringParameters.lastEvaluatedKey)
        : null;

      if (!userId) {
        return {
          statusCode: 400,
          headers: getCorsHeaders(),
          body: JSON.stringify({ error: "Missing userId" }),
        };
      }

      const result = await getNotificationHistory(
        userId,
        limit,
        lastEvaluatedKey,
      );

      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify(result),
      };
    }

    // Mark notification as read
    if (method === "PUT" && path.match(/\/notifications\/[^/]+\/read/)) {
      const { userId } = body;
      const notificationId = path.split("/")[2]; // Extract notification ID from path

      if (!userId || !notificationId) {
        return {
          statusCode: 400,
          headers: getCorsHeaders(),
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      const result = await markNotificationAsRead(userId, notificationId);

      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify(result),
      };
    }

    // Send pattern detected notification
    if (method === "POST" && path.includes("/pattern-detected")) {
      const { userId, pattern } = body;

      if (!userId || !pattern) {
        return {
          statusCode: 400,
          headers: getCorsHeaders(),
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      // Check if pattern confidence is high enough
      if (!shouldNotifyForPattern(pattern.confidenceScore)) {
        return {
          statusCode: 200,
          headers: getCorsHeaders(),
          body: JSON.stringify({
            success: false,
            reason: "Confidence score below threshold",
            confidenceScore: pattern.confidenceScore,
          }),
        };
      }

      const result = await notifyPatternDetected(userId, pattern);

      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify(result),
      };
    }

    // Send pattern amount changed notification
    if (method === "POST" && path.includes("/pattern-amount-changed")) {
      const { userId, bill, oldAmount, newAmount } = body;

      if (
        !userId ||
        !bill ||
        oldAmount === undefined ||
        newAmount === undefined
      ) {
        return {
          statusCode: 400,
          headers: getCorsHeaders(),
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      // Check if change is significant
      if (!isSignificantAmountChange(oldAmount, newAmount)) {
        return {
          statusCode: 200,
          headers: getCorsHeaders(),
          body: JSON.stringify({
            success: false,
            reason: "Amount change not significant",
            changePercent: Math.abs(
              ((newAmount - oldAmount) / oldAmount) * 100,
            ),
          }),
        };
      }

      const result = await notifyPatternAmountChanged(
        userId,
        bill,
        oldAmount,
        newAmount,
      );

      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify(result),
      };
    }

    // Send pattern missing notification
    if (method === "POST" && path.includes("/pattern-missing")) {
      const { userId, bill, expectedDate } = body;

      if (!userId || !bill || !expectedDate) {
        return {
          statusCode: 400,
          headers: getCorsHeaders(),
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      const result = await notifyPatternMissing(userId, bill, expectedDate);

      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify(result),
      };
    }

    // Send budget suggestions available notification
    if (method === "POST" && path.includes("/budget-suggestions-available")) {
      const { userId, targetMonth, suggestionCount, suggestionId } = body;

      if (!userId || !targetMonth || !suggestionCount || !suggestionId) {
        return {
          statusCode: 400,
          headers: getCorsHeaders(),
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      const result = await notifyBudgetSuggestionsAvailable(
        userId,
        targetMonth,
        suggestionCount,
        suggestionId,
      );

      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: JSON.stringify(result),
      };
    }

    return {
      statusCode: 404,
      headers: getCorsHeaders(),
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (error) {
    console.error("Notification error:", error);
    return {
      statusCode: 500,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
    };
  }
};

// Export notification types and helper functions for use by other services
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
module.exports.notifyPatternDetected = notifyPatternDetected;
module.exports.notifyPatternAmountChanged = notifyPatternAmountChanged;
module.exports.notifyPatternMissing = notifyPatternMissing;
module.exports.notifyBudgetSuggestionsAvailable =
  notifyBudgetSuggestionsAvailable;
module.exports.shouldNotifyForPattern = shouldNotifyForPattern;
module.exports.isSignificantAmountChange = isSignificantAmountChange;
