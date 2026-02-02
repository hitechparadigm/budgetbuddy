/**
 * Daily Reminders Service
 *
 * Sends daily expense tracking reminders and bill due date notifications to users.
 * Triggered by EventBridge (CloudWatch Events) scheduled rule.
 *
 * **Validates: Requirement 36.5** - Bill reminder notifications
 */

const AWS = require("aws-sdk");

const dynamodb = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda();

const TABLE_NAME = process.env.TABLE_NAME || "budgetbuddy-main";
const NOTIFICATION_FUNCTION =
  process.env.NOTIFICATION_FUNCTION || "budgetbuddy-notifications";

// Bill reminder days before due date
const BILL_REMINDER_DAYS = [7, 3, 0];

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
 * Get upcoming bills for a family that need reminders
 * **Validates: Requirement 36.5** - Bill reminder notifications
 */
async function getUpcomingBillsForFamily(familyId) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get bills due in the next 7 days
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const todayStr = today.toISOString().split("T")[0];
    const futureStr = sevenDaysLater.toISOString().split("T")[0];

    const result = await dynamodb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk",
        FilterExpression:
          "entityType = :entityType AND dueDate >= :today AND dueDate <= :future AND #status <> :paid AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":pk": `FAMILY#${familyId}`,
          ":entityType": "BILL",
          ":today": todayStr,
          ":future": futureStr,
          ":paid": "paid",
          ":false": false,
        },
      })
      .promise();

    return result.Items || [];
  } catch (error) {
    console.error(
      `Error getting upcoming bills for family ${familyId}:`,
      error,
    );
    return [];
  }
}

/**
 * Check if a bill needs a reminder today
 * **Validates: Requirement 36.5** - Send notifications at 7, 3, 0 days before due
 */
function billNeedsReminder(bill) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(bill.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

  // Check if today is a reminder day (7, 3, or 0 days before due)
  if (!BILL_REMINDER_DAYS.includes(daysUntilDue)) {
    return { needsReminder: false, daysUntilDue };
  }

  // Check if reminder was already sent today
  const todayStr = today.toISOString().split("T")[0];
  const reminderKey = `${todayStr}_${daysUntilDue}`;

  if (bill.remindersSent && bill.remindersSent.includes(reminderKey)) {
    return { needsReminder: false, daysUntilDue, reason: "already_sent" };
  }

  return { needsReminder: true, daysUntilDue };
}

/**
 * Send bill reminder notification
 * **Validates: Requirement 36.5** - Bill reminder notifications
 */
async function sendBillReminder(userId, bill, daysUntilDue) {
  try {
    let title, body;

    if (daysUntilDue === 0) {
      title = "🔴 Bill Due Today!";
      body = `${bill.name} ($${bill.amount.toFixed(2)}) is due today!`;
    } else if (daysUntilDue === 3) {
      title = "🟡 Bill Due Soon";
      body = `${bill.name} ($${bill.amount.toFixed(2)}) is due in 3 days.`;
    } else if (daysUntilDue === 7) {
      title = "📅 Upcoming Bill";
      body = `${bill.name} ($${bill.amount.toFixed(2)}) is due in 7 days.`;
    } else {
      title = "📅 Bill Reminder";
      body = `${bill.name} ($${bill.amount.toFixed(2)}) is due in ${daysUntilDue} days.`;
    }

    const notification = {
      title,
      body,
      data: {
        type: "bill_reminder",
        billId: bill.billId,
        daysUntilDue,
        amount: bill.amount,
        dueDate: bill.dueDate,
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

    // Mark reminder as sent
    const todayStr = new Date().toISOString().split("T")[0];
    const reminderKey = `${todayStr}_${daysUntilDue}`;
    const remindersSent = bill.remindersSent || [];
    remindersSent.push(reminderKey);

    await dynamodb
      .update({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${bill.familyId}`,
          SK: `BILL#${bill.billId}`,
        },
        UpdateExpression: "SET remindersSent = :reminders, updatedAt = :now",
        ExpressionAttributeValues: {
          ":reminders": remindersSent,
          ":now": new Date().toISOString(),
        },
      })
      .promise();

    console.log(`✅ Bill reminder sent: ${bill.name} (${daysUntilDue} days)`);
    return { sent: true, billId: bill.billId, daysUntilDue };
  } catch (error) {
    console.error(`Error sending bill reminder for ${bill.billId}:`, error);
    return { sent: false, billId: bill.billId, error: error.message };
  }
}

/**
 * Process bill reminders for a user
 * **Validates: Requirement 36.5** - Bill reminder notifications
 */
async function processBillReminders(user) {
  const results = {
    userId: user.userId,
    billsChecked: 0,
    remindersSent: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  try {
    const familyId = user.familyId;
    if (!familyId) {
      return { ...results, error: "No family ID" };
    }

    // Get upcoming bills
    const bills = await getUpcomingBillsForFamily(familyId);
    results.billsChecked = bills.length;

    // Check each bill for reminders
    for (const bill of bills) {
      const { needsReminder, daysUntilDue, reason } = billNeedsReminder(bill);

      if (!needsReminder) {
        results.skipped++;
        results.details.push({
          billId: bill.billId,
          name: bill.name,
          sent: false,
          reason: reason || "not_reminder_day",
        });
        continue;
      }

      // Send reminder
      const result = await sendBillReminder(user.userId, bill, daysUntilDue);
      if (result.sent) {
        results.remindersSent++;
      } else {
        results.errors++;
      }
      results.details.push(result);
    }

    return results;
  } catch (error) {
    console.error(`Error processing bill reminders for ${user.userId}:`, error);
    return { ...results, error: error.message };
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
    // Bill reminder results
    billReminders: {
      totalBillsChecked: 0,
      remindersSent: 0,
      skipped: 0,
      errors: 0,
    },
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

      // Process daily expense reminders
      const dailyResults = await Promise.all(
        batch.map((user) => sendDailyReminder(user)),
      );

      dailyResults.forEach((result) => {
        if (result.sent) {
          results.remindersSent++;
        } else if (result.error) {
          results.errors++;
        } else {
          results.skipped++;
        }
        results.details.push(result);
      });

      // Process bill reminders (Requirement 36.5)
      const billResults = await Promise.all(
        batch.map((user) => processBillReminders(user)),
      );

      billResults.forEach((result) => {
        results.billReminders.totalBillsChecked += result.billsChecked || 0;
        results.billReminders.remindersSent += result.remindersSent || 0;
        results.billReminders.skipped += result.skipped || 0;
        results.billReminders.errors += result.errors || 0;
      });

      console.log(
        `Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(users.length / BATCH_SIZE)}`,
      );
    }

    const duration = Date.now() - startTime;

    console.log("✅ Daily reminders job complete!");
    console.log(`   Total users: ${results.totalUsers}`);
    console.log(`   Daily reminders sent: ${results.remindersSent}`);
    console.log(`   Daily skipped: ${results.skipped}`);
    console.log(`   Daily errors: ${results.errors}`);
    console.log(
      `   Bill reminders sent: ${results.billReminders.remindersSent}`,
    );
    console.log(`   Bills checked: ${results.billReminders.totalBillsChecked}`);
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
