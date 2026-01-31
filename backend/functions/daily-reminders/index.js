/**
 * Daily Reminders Service
 *
 * Sends daily expense tracking reminders to users.
 * Triggered by EventBridge (CloudWatch Events) scheduled rule.
 */

const AWS = require("aws-sdk");

const dynamodb = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda();

const TABLE_NAME = process.env.TABLE_NAME || "budgetbuddy-main";
const NOTIFICATION_FUNCTION =
  process.env.NOTIFICATION_FUNCTION || "budgetbuddy-notifications";

/**
 * Get all active users
 */
async function getAllUsers() {
  const users = [];
  let lastEvaluatedKey = undefined;

  do {
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: "begins_with(PK, :pk) AND SK = :sk",
      ExpressionAttributeValues: {
        ":pk": "USER#",
        ":sk": "PROFILE",
      },
      ExclusiveStartKey: lastEvaluatedKey,
    };

    const result = await dynamodb.scan(params).promise();
    users.push(...(result.Items || []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return users;
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
        dailyReminders: true,
        reminderTime: "19:00",
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00",
      }
    );
  } catch (error) {
    console.error("Error getting notification preferences:", error);
    return null;
  }
}

/**
 * Get last transaction date for user
 */
async function getLastTransactionDate(familyId) {
  try {
    const result = await dynamodb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `FAMILY#${familyId}`,
          ":sk": "TRANSACTION#",
        },
        ScanIndexForward: false, // Descending order
        Limit: 1,
      })
      .promise();

    if (result.Items && result.Items.length > 0) {
      return result.Items[0].date;
    }

    return null;
  } catch (error) {
    console.error("Error getting last transaction date:", error);
    return null;
  }
}

/**
 * Check if user is in quiet hours
 */
function isInQuietHours(preferences) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [quietStartHour, quietStartMinute] = preferences.quietHoursStart
    .split(":")
    .map(Number);
  const [quietEndHour, quietEndMinute] = preferences.quietHoursEnd
    .split(":")
    .map(Number);

  const quietStart = quietStartHour * 60 + quietStartMinute;
  const quietEnd = quietEndHour * 60 + quietEndMinute;

  // Handle quiet hours that span midnight
  if (quietStart > quietEnd) {
    return currentTime >= quietStart || currentTime < quietEnd;
  }

  return currentTime >= quietStart && currentTime < quietEnd;
}

/**
 * Check if it's time to send reminder
 */
function isReminderTime(preferences) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const [reminderHour, reminderMinute] = preferences.reminderTime
    .split(":")
    .map(Number);

  // Check if current time matches reminder time (within 15-minute window)
  const timeDiff = Math.abs(
    currentHour * 60 + currentMinute - (reminderHour * 60 + reminderMinute),
  );
  return timeDiff <= 15;
}

/**
 * Send daily reminder to user
 */
async function sendDailyReminder(user) {
  try {
    const userId = user.userId;
    const familyId = user.familyId;

    // Get notification preferences
    const preferences = await getNotificationPreferences(userId);

    // Check if daily reminders are enabled
    if (!preferences || !preferences.dailyReminders) {
      console.log(`Daily reminders disabled for user ${userId}`);
      return { userId, sent: false, reason: "disabled" };
    }

    // Check if in quiet hours
    if (isInQuietHours(preferences)) {
      console.log(`User ${userId} is in quiet hours`);
      return { userId, sent: false, reason: "quiet_hours" };
    }

    // Check if it's reminder time
    if (!isReminderTime(preferences)) {
      console.log(`Not reminder time for user ${userId}`);
      return { userId, sent: false, reason: "not_time" };
    }

    // Get last transaction date
    const lastTransactionDate = await getLastTransactionDate(familyId);

    // Check if user hasn't logged transactions in 3+ days
    let shouldRemind = false;
    let daysSinceLastTransaction = 0;

    if (!lastTransactionDate) {
      shouldRemind = true;
      daysSinceLastTransaction = 999; // No transactions ever
    } else {
      const lastDate = new Date(lastTransactionDate);
      const now = new Date();
      const diffTime = Math.abs(now - lastDate);
      daysSinceLastTransaction = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysSinceLastTransaction >= 3) {
        shouldRemind = true;
      }
    }

    if (!shouldRemind) {
      console.log(`User ${userId} has recent transactions`);
      return { userId, sent: false, reason: "recent_transactions" };
    }

    // Generate reminder notification
    const notification = {
      title: "💰 Track Your Expenses",
      body:
        daysSinceLastTransaction === 999
          ? "Start tracking your expenses today!"
          : `It's been ${daysSinceLastTransaction} days since your last transaction. Don't forget to log your expenses!`,
      data: {
        type: "daily_reminder",
        daysSinceLastTransaction,
      },
    };

    // Send notification
    await lambda
      .invoke({
        FunctionName: NOTIFICATION_FUNCTION,
        InvocationType: "Event",
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

    console.log(`✅ Daily reminder sent to user ${userId}`);

    return { userId, sent: true, daysSinceLastTransaction };
  } catch (error) {
    console.error(
      `Error sending daily reminder to user ${user.userId}:`,
      error,
    );
    return { userId: user.userId, sent: false, error: error.message };
  }
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log("🔔 Starting daily reminders job...");
  console.log("Event:", JSON.stringify(event, null, 2));

  const startTime = Date.now();
  const results = {
    totalUsers: 0,
    remindersSent: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  try {
    // Get all users
    const users = await getAllUsers();
    results.totalUsers = users.length;

    console.log(`Found ${users.length} users`);

    // Send reminders (in batches)
    const BATCH_SIZE = 10;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((user) => sendDailyReminder(user)),
      );

      batchResults.forEach((result) => {
        if (result.sent) {
          results.remindersSent++;
        } else if (result.error) {
          results.errors++;
        } else {
          results.skipped++;
        }
        results.details.push(result);
      });

      console.log(
        `Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(users.length / BATCH_SIZE)}`,
      );
    }

    const duration = Date.now() - startTime;

    console.log("✅ Daily reminders job complete!");
    console.log(`   Total users: ${results.totalUsers}`);
    console.log(`   Reminders sent: ${results.remindersSent}`);
    console.log(`   Skipped: ${results.skipped}`);
    console.log(`   Errors: ${results.errors}`);
    console.log(`   Duration: ${duration}ms`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Daily reminders completed",
        ...results,
        duration,
      }),
    };
  } catch (error) {
    console.error("❌ Daily reminders job failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Daily reminders failed",
        details: error.message,
        ...results,
      }),
    };
  }
};
