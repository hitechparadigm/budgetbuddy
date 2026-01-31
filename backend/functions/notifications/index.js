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
