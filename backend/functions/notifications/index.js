/**
 * Notification Service
 *
 * Handles push notifications via AWS SNS and Expo Push Notifications.
 * Supports budget alerts, reminders, and custom notifications.
 *
 * Uses getUserFromEvent() from common layer to extract userId from Cognito JWT.
 * Does NOT accept userId from request body/query for authenticated endpoints.
 */

const {
  getUserFromEvent,
  dynamoHelpers,
  logger,
  successResponse,
  errorResponse,
} = require('/opt/nodejs/utils');

const TABLE_NAME = process.env.TABLE_NAME || 'budgetbuddy-main';
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

/**
 * Notification Types for AI Pattern Detection and Budget Planning
 */
const NOTIFICATION_TYPES = {
  BUDGET_ALERT: 'BUDGET_ALERT',
  DAILY_REMINDER: 'DAILY_REMINDER',
  BILL_DUE: 'BILL_DUE',
  PATTERN_DETECTED: 'PATTERN_DETECTED',
  PATTERN_AMOUNT_CHANGED: 'PATTERN_AMOUNT_CHANGED',
  PATTERN_MISSING: 'PATTERN_MISSING',
  BUDGET_SUGGESTION_AVAILABLE: 'BUDGET_SUGGESTION_AVAILABLE',
};

/**
 * Notification templates for AI-related notifications
 */
const NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_TYPES.PATTERN_DETECTED]: {
    title: 'New Recurring Bill Detected',
    bodyTemplate:
      'We detected a recurring payment to {merchantName} ({frequency}) for approximately ${amount}. Would you like to add it as a bill reminder?',
    actionUrl: '/bills/review-patterns',
  },
  [NOTIFICATION_TYPES.PATTERN_AMOUNT_CHANGED]: {
    title: 'Bill Amount Changed',
    bodyTemplate:
      'Your {billName} payment changed from ${oldAmount} to ${newAmount} ({changePercent}% {direction}). Would you like to update your budget?',
    actionUrl: '/bills',
  },
  [NOTIFICATION_TYPES.PATTERN_MISSING]: {
    title: 'Expected Payment Not Found',
    bodyTemplate:
      'We haven\'t seen your usual {billName} payment that was expected around {expectedDate}. Did you pay it differently?',
    actionUrl: '/bills',
  },
  [NOTIFICATION_TYPES.BUDGET_SUGGESTION_AVAILABLE]: {
    title: 'Budget Suggestions Ready',
    bodyTemplate:
      'AI-powered budget suggestions for {targetMonth} are ready! We found {suggestionCount} categories to review.',
    actionUrl: '/budget/suggestions',
  },
};

/**
 * Register device token for push notifications
 */
async function registerDeviceToken(userId, deviceToken, platform) {
  await dynamoHelpers.putItem({
    PK: `USER#${userId}`,
    SK: `DEVICE#${deviceToken}`,
    deviceToken,
    platform,
    registeredAt: new Date().toISOString(),
    enabled: true,
  });

  // Subscribe to SNS topic if configured
  if (SNS_TOPIC_ARN) {
    try {
      const { SNSClient, SubscribeCommand } = require('@aws-sdk/client-sns');
      const sns = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });
      await sns.send(new SubscribeCommand({
        Protocol: 'application',
        TopicArn: SNS_TOPIC_ARN,
        Endpoint: deviceToken,
      }));
    } catch (err) {
      logger.warn('SNS subscribe failed (non-fatal)', { error: err.message });
    }
  }

  return { success: true, deviceToken };
}

/**
 * Unregister device token
 */
async function unregisterDeviceToken(userId, deviceToken) {
  const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  await client.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { PK: `USER#${userId}`, SK: `DEVICE#${deviceToken}` },
  }));
  return { success: true };
}

/**
 * Get all device tokens for a user
 */
async function getUserDeviceTokens(userId) {
  const items = await dynamoHelpers.queryByPK(`USER#${userId}`, {
    FilterExpression: 'begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':prefix': 'DEVICE#' },
  });
  return items
    .filter((item) => item.enabled && item.SK && item.SK.startsWith('DEVICE#'))
    .map((item) => ({ token: item.deviceToken, platform: item.platform }));
}

/**
 * Send push notification via Expo
 */
async function sendExpoPushNotification(tokens, title, body, data = {}) {
  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });

  return response.json();
}

/**
 * Send notification to user
 */
async function sendNotification(userId, notification) {
  const devices = await getUserDeviceTokens(userId);

  if (devices.length === 0) {
    logger.info('No devices registered for user', { userId });
    return { success: false, reason: 'No devices registered' };
  }

  const expoTokens = devices
    .filter((d) => d.token && d.token.startsWith('ExponentPushToken'))
    .map((d) => d.token);

  if (expoTokens.length > 0) {
    await sendExpoPushNotification(expoTokens, notification.title, notification.body, notification.data);
  }

  // Store notification in database
  await dynamoHelpers.putItem({
    PK: `USER#${userId}`,
    SK: `NOTIFICATION#${Date.now()}`,
    ...notification,
    sentAt: new Date().toISOString(),
    read: false,
  });

  return { success: true, deviceCount: devices.length };
}

/**
 * Get notification preferences for user
 */
async function getNotificationPreferences(userId) {
  const item = await dynamoHelpers.getItem(`USER#${userId}`, 'NOTIFICATION_PREFERENCES');
  return item || {
    budgetAlertsEnabled: true,
    dailyRemindersEnabled: true,
    reminderTime: '19:00',
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  };
}

/**
 * Update notification preferences
 */
async function updateNotificationPreferences(userId, preferences) {
  await dynamoHelpers.putItem({
    PK: `USER#${userId}`,
    SK: 'NOTIFICATION_PREFERENCES',
    ...preferences,
    updatedAt: new Date().toISOString(),
  });
  return { success: true, preferences };
}

/**
 * Get notification history for user
 */
async function getNotificationHistory(userId, limit = 50) {
  const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

  const result = await client.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':sk': 'NOTIFICATION#',
    },
    Limit: limit,
    ScanIndexForward: false,
  }));

  return {
    notifications: result.Items || [],
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
}

/**
 * Mark notification as read
 */
async function markNotificationAsRead(userId, notificationId) {
  await dynamoHelpers.updateItem(
    `USER#${userId}`,
    `NOTIFICATION#${notificationId}`,
    { read: true },
  );
  return { success: true };
}

// ── Notification helpers for internal use by other Lambdas ─────────────────

function shouldNotifyForPattern(confidenceScore, threshold = 70) {
  return confidenceScore >= threshold;
}

function isSignificantAmountChange(oldAmount, newAmount, threshold = 20) {
  if (oldAmount === 0) return newAmount > 0;
  const changePercent = Math.abs(((newAmount - oldAmount) / oldAmount) * 100);
  return changePercent >= threshold;
}

async function notifyPatternDetected(userId, pattern) {
  const template = NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.PATTERN_DETECTED];
  const body = template.bodyTemplate
    .replace('{merchantName}', pattern.merchantName)
    .replace('{frequency}', pattern.frequency)
    .replace('{amount}', (pattern.averageAmount || 0).toFixed(2));

  return sendNotification(userId, {
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
    },
  });
}

async function notifyPatternAmountChanged(userId, bill, oldAmount, newAmount) {
  const template = NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.PATTERN_AMOUNT_CHANGED];
  const changePercent = Math.abs(((newAmount - oldAmount) / oldAmount) * 100).toFixed(0);
  const direction = newAmount > oldAmount ? 'increase' : 'decrease';

  const body = template.bodyTemplate
    .replace('{billName}', bill.name)
    .replace('{oldAmount}', oldAmount.toFixed(2))
    .replace('{newAmount}', newAmount.toFixed(2))
    .replace('{changePercent}', changePercent)
    .replace('{direction}', direction);

  return sendNotification(userId, {
    type: NOTIFICATION_TYPES.PATTERN_AMOUNT_CHANGED,
    title: template.title,
    body,
    data: { billId: bill.billId, billName: bill.name, oldAmount, newAmount, direction, actionUrl: template.actionUrl },
  });
}

async function notifyPatternMissing(userId, bill, expectedDate) {
  const template = NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.PATTERN_MISSING];
  const body = template.bodyTemplate
    .replace('{billName}', bill.name)
    .replace('{expectedDate}', expectedDate);

  return sendNotification(userId, {
    type: NOTIFICATION_TYPES.PATTERN_MISSING,
    title: template.title,
    body,
    data: { billId: bill.billId, billName: bill.name, expectedDate, actionUrl: template.actionUrl },
  });
}

async function notifyBudgetSuggestionsAvailable(userId, targetMonth, suggestionCount, suggestionId) {
  const template = NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.BUDGET_SUGGESTION_AVAILABLE];
  const [year, month] = targetMonth.split('-');
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const displayMonth = `${monthNames[parseInt(month) - 1]} ${year}`;

  const body = template.bodyTemplate
    .replace('{targetMonth}', displayMonth)
    .replace('{suggestionCount}', suggestionCount.toString());

  return sendNotification(userId, {
    type: NOTIFICATION_TYPES.BUDGET_SUGGESTION_AVAILABLE,
    title: template.title,
    body,
    data: { suggestionId, targetMonth, suggestionCount, actionUrl: template.actionUrl },
  });
}

/**
 * Main Lambda handler
 *
 * All authenticated routes extract userId from the Cognito JWT via getUserFromEvent().
 * No endpoint accepts userId from the request body or query string.
 */
exports.handler = async (event, context) => {
  logger.info('Notification request received', {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context ? context.awsRequestId : undefined,
  });

  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return successResponse({}, 'OK');
    }

    const path = event.path || event.rawPath || '';
    const method = event.httpMethod || event.requestContext?.http?.method || '';

    // Health check — unauthenticated
    if (method === 'GET' && path === '/notifications/health') {
      return successResponse({ status: 'healthy', service: 'notifications' }, 'Notifications service is healthy');
    }

    // All other routes require auth
    let user;
    try {
      user = getUserFromEvent(event);
    } catch (_e) {
      return errorResponse.unauthorized('Authentication required');
    }
    const userId = user.userId;

    // Parse body safely
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (_e) {
        return errorResponse.badRequest('Invalid JSON body');
      }
    }

    // ── POST /notifications/register-device ─────────────────────────────────
    if (method === 'POST' && path.includes('/register-device')) {
      const { deviceToken, platform } = body;
      if (!deviceToken || !platform) {
        return errorResponse.badRequest('deviceToken and platform are required');
      }
      const result = await registerDeviceToken(userId, deviceToken, platform);
      return successResponse(result, 'Device registered');
    }

    // ── DELETE /notifications/device/{deviceId} ──────────────────────────────
    if (method === 'DELETE' && path.includes('/device/')) {
      const { deviceToken } = body;
      if (!deviceToken) {
        return errorResponse.badRequest('deviceToken is required');
      }
      const result = await unregisterDeviceToken(userId, deviceToken);
      return successResponse(result, 'Device unregistered');
    }

    // ── GET /notifications/preferences ──────────────────────────────────────
    if (method === 'GET' && path.includes('/preferences')) {
      const preferences = await getNotificationPreferences(userId);
      return successResponse(preferences, 'Preferences retrieved');
    }

    // ── PUT /notifications/preferences ──────────────────────────────────────
    if (method === 'PUT' && path.includes('/preferences')) {
      const result = await updateNotificationPreferences(userId, body);
      return successResponse(result, 'Preferences updated');
    }

    // ── GET /notifications/history ───────────────────────────────────────────
    if (method === 'GET' && path.includes('/history')) {
      const limit = parseInt(event.queryStringParameters?.limit || '50');
      const result = await getNotificationHistory(userId, limit);
      return successResponse(result, 'History retrieved');
    }

    // ── PUT /notifications/{notificationId}/read ─────────────────────────────
    if (method === 'PUT' && path.match(/\/notifications\/[^/]+\/read/)) {
      const parts = path.split('/');
      // path: /notifications/{notificationId}/read → parts[2] = notificationId
      const notificationId = parts[2];
      if (!notificationId) {
        return errorResponse.badRequest('notificationId required');
      }
      const result = await markNotificationAsRead(userId, notificationId);
      return successResponse(result, 'Notification marked as read');
    }

    // ── POST /notifications/send (internal use) ──────────────────────────────
    if (method === 'POST' && path.includes('/send')) {
      const { notification } = body;
      if (!notification) {
        return errorResponse.badRequest('notification is required');
      }
      const result = await sendNotification(userId, notification);
      return successResponse(result, 'Notification sent');
    }

    // ── POST /notifications/pattern-detected ────────────────────────────────
    if (method === 'POST' && path.includes('/pattern-detected')) {
      const { pattern } = body;
      if (!pattern) {
        return errorResponse.badRequest('pattern is required');
      }
      if (!shouldNotifyForPattern(pattern.confidenceScore)) {
        return successResponse({ success: false, reason: 'Confidence score below threshold' });
      }
      const result = await notifyPatternDetected(userId, pattern);
      return successResponse(result, 'Pattern notification sent');
    }

    // ── POST /notifications/pattern-amount-changed ───────────────────────────
    if (method === 'POST' && path.includes('/pattern-amount-changed')) {
      const { bill, oldAmount, newAmount } = body;
      if (!bill || oldAmount === undefined || newAmount === undefined) {
        return errorResponse.badRequest('bill, oldAmount, and newAmount are required');
      }
      if (!isSignificantAmountChange(oldAmount, newAmount)) {
        return successResponse({ success: false, reason: 'Amount change not significant' });
      }
      const result = await notifyPatternAmountChanged(userId, bill, oldAmount, newAmount);
      return successResponse(result, 'Amount change notification sent');
    }

    // ── POST /notifications/pattern-missing ─────────────────────────────────
    if (method === 'POST' && path.includes('/pattern-missing')) {
      const { bill, expectedDate } = body;
      if (!bill || !expectedDate) {
        return errorResponse.badRequest('bill and expectedDate are required');
      }
      const result = await notifyPatternMissing(userId, bill, expectedDate);
      return successResponse(result, 'Pattern missing notification sent');
    }

    // ── POST /notifications/budget-suggestions-available ────────────────────
    if (method === 'POST' && path.includes('/budget-suggestions-available')) {
      const { targetMonth, suggestionCount, suggestionId } = body;
      if (!targetMonth || !suggestionCount || !suggestionId) {
        return errorResponse.badRequest('targetMonth, suggestionCount, and suggestionId are required');
      }
      const result = await notifyBudgetSuggestionsAvailable(userId, targetMonth, suggestionCount, suggestionId);
      return successResponse(result, 'Budget suggestions notification sent');
    }

    return errorResponse.notFound(`Route ${method} ${path} not found`);
  } catch (error) {
    logger.error('Notification handler error', error);
    return errorResponse.internalError('An error occurred processing your request');
  }
};

// Export notification helpers for use by other Lambda functions (budget-alerts, etc.)
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
module.exports.notifyPatternDetected = notifyPatternDetected;
module.exports.notifyPatternAmountChanged = notifyPatternAmountChanged;
module.exports.notifyPatternMissing = notifyPatternMissing;
module.exports.notifyBudgetSuggestionsAvailable = notifyBudgetSuggestionsAvailable;
module.exports.shouldNotifyForPattern = shouldNotifyForPattern;
module.exports.isSignificantAmountChange = isSignificantAmountChange;
