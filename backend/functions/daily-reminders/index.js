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
 * Send weekly insight notification to user
 * **Validates: Requirement 39.7** - Weekly insight notifications
 */
async function sendWeeklyInsightNotification(user) {
  try {
    const userId = user.userId;
    const familyId = user.familyId;

    if (!familyId) {
      return { userId, sent: false, reason: "no_family_id" };
    }

    // Get notification preferences
    const preferences = await getNotificationPreferences(userId);

    // Check if weekly insights are enabled (default to true)
    if (preferences && preferences.weeklyInsights === false) {
      console.log(`Weekly insights disabled for user ${userId}`);
      return { userId, sent: false, reason: "disabled" };
    }

    // Check if in quiet hours
    if (preferences && isInQuietHours(preferences)) {
      console.log(`User ${userId} is in quiet hours`);
      return { userId, sent: false, reason: "quiet_hours" };
    }

    // Generate weekly insight summary
    const insightSummary = await generateWeeklyInsightSummary(familyId);

    const notification = {
      title: insightSummary.title,
      body: insightSummary.body,
      data: {
        type: "weekly_insight",
        ...insightSummary.data,
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

    console.log(`✅ Weekly insight sent to user ${userId}`);
    return { userId, sent: true };
  } catch (error) {
    console.error(
      `Error sending weekly insight to user ${user.userId}:`,
      error,
    );
    return { userId: user.userId, sent: false, error: error.message };
  }
}

/**
 * Generate weekly insight summary for a family
 * **Validates: Requirement 39.7** - Weekly insight notifications
 */
async function generateWeeklyInsightSummary(familyId) {
  try {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    // Get this week's transactions
    const transactions = await getTransactionsForFamily(
      familyId,
      weekStart,
      today,
    );

    // Get previous week's transactions for comparison
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekStart);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
    const previousTransactions = await getTransactionsForFamily(
      familyId,
      prevWeekStart,
      prevWeekEnd,
    );

    // Calculate summaries
    const expenses = transactions.filter((t) => t.type === "expense");
    const prevExpenses = previousTransactions.filter(
      (t) => t.type === "expense",
    );

    const totalSpent = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);
    const prevTotalSpent = prevExpenses.reduce(
      (sum, t) => sum + (t.amount || 0),
      0,
    );

    const income = transactions.filter((t) => t.type === "income");
    const totalIncome = income.reduce((sum, t) => sum + (t.amount || 0), 0);

    const savingsRate =
      totalIncome > 0 ? ((totalIncome - totalSpent) / totalIncome) * 100 : 0;

    // Calculate spending change
    let spendingChange = 0;
    if (prevTotalSpent > 0) {
      spendingChange = Math.round(
        ((totalSpent - prevTotalSpent) / prevTotalSpent) * 100,
      );
    }

    // Generate summary text
    let summaryText = `This week: $${totalSpent.toFixed(2)} spent`;
    if (Math.abs(spendingChange) > 5) {
      summaryText += ` (${spendingChange > 0 ? "↑" : "↓"}${Math.abs(spendingChange)}% vs last week)`;
    }
    summaryText += `. Savings rate: ${savingsRate.toFixed(0)}%`;

    // Determine notification type
    let notificationType = "info";
    if (savingsRate >= 20) {
      notificationType = "positive";
    } else if (spendingChange > 20 || savingsRate < 5) {
      notificationType = "alert";
    }

    return {
      title: "📊 Weekly Spending Summary",
      body: summaryText,
      type: notificationType,
      data: {
        totalSpent: Math.round(totalSpent * 100) / 100,
        spendingChange,
        savingsRate: Math.round(savingsRate * 10) / 10,
        transactionCount: transactions.length,
      },
    };
  } catch (error) {
    console.error("Error generating weekly insight summary:", error);
    // Return a generic summary on error
    return {
      title: "📊 Weekly Spending Summary",
      body: "Check your spending insights in the app!",
      type: "info",
      data: {},
    };
  }
}

/**
 * Get transactions for a family within a date range
 */
async function getTransactionsForFamily(familyId, startDate, endDate) {
  try {
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];

    const result = await dynamodb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk",
        FilterExpression:
          "entityType = :entityType AND #date >= :start AND #date <= :end",
        ExpressionAttributeNames: { "#date": "date" },
        ExpressionAttributeValues: {
          ":pk": `FAMILY#${familyId}`,
          ":entityType": "TRANSACTION",
          ":start": startStr,
          ":end": endStr,
        },
      })
      .promise();

    return result.Items || [];
  } catch (error) {
    console.error("Error getting transactions for family:", error);
    return [];
  }
}

/**
 * Generate spending nudges for a user based on current month's pace
 * Called from the daily reminders handler (P4-T10)
 *
 * Logic:
 * 1. Check if any category is on pace to overspend (spent/days_elapsed > planned/total_days)
 * 2. Check for unusual transactions (amount > 2× category average)
 * 3. Check if savings goal is falling behind monthly target
 * Creates a NUDGE#<userId>#<date> record in DynamoDB for the Overview AI Alert card
 */
async function generateSpendingNudges(user) {
  try {
    const today = new Date();
    const month = today.toISOString().slice(0, 7);
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const fractionElapsed = dayOfMonth / daysInMonth;

    // Get user's default budget
    const profileResult = await dynamodb.get({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${user.userId}`, SK: 'PROFILE' },
    }).promise();

    const profile = profileResult.Item;
    if (!profile || !profile.defaultBudgetId) return null;
    const budgetId = profile.defaultBudgetId;

    // Get current month budget period
    const periodResult = await dynamodb.get({
      TableName: TABLE_NAME,
      Key: { PK: `BUDGET#${budgetId}`, SK: `PERIOD#${month}` },
    }).promise();

    const period = periodResult.Item;
    if (!period || !period.groups) return null;

    const nudges = [];

    // Check expense category pace
    const allCategories = [
      ...(period.groups.expenses?.categories || []),
      ...(period.groups.savings?.categories || []),
    ];

    for (const cat of allCategories) {
      const planned = cat.plannedAmount || 0;
      const spent = cat.spentAmount || 0;
      if (planned <= 0) continue;

      const expectedSpent = planned * fractionElapsed;
      // If 20%+ over pace, generate nudge
      if (spent > expectedSpent * 1.2 && spent > 50) {
        const overBy = (spent - expectedSpent).toFixed(0);
        nudges.push({
          type: 'overspend_pace',
          category: cat.name,
          message: `You've spent $${spent.toFixed(0)} of your $${planned.toFixed(0)} ${cat.name} budget — about $${overBy} ahead of pace. With ${daysInMonth - dayOfMonth} days left, you may want to slow down.`,
          severity: 'warning',
        });
        if (nudges.length >= 3) break; // Max 3 nudges per user per day
      }
    }

    if (nudges.length === 0) return null;

    // Save nudge to DynamoDB for Overview page to pick up
    const nudgeRecord = {
      PK: `USER#${user.userId}`,
      SK: `NUDGE#${today.toISOString().split('T')[0]}`,
      userId: user.userId,
      budgetId,
      nudges,
      createdAt: today.toISOString(),
      read: false,
      ttl: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7-day TTL
    };

    await dynamodb.put({ TableName: TABLE_NAME, Item: nudgeRecord }).promise();
    return nudges.length;
  } catch (_err) {
    // Non-fatal — nudges are best-effort
    return null;
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
    // Weekly insight results
    weeklyInsights: {
      sent: 0,
      skipped: 0,
      errors: 0,
    },
  };

  try {
    // Get all users
    const users = await getAllUsers();
    results.totalUsers = users.length;

    console.log(`Found ${users.length} users`);

    // Check if today is Sunday (weekly insight day)
    const today = new Date();
    const isSunday = today.getDay() === 0;
    const isFirstDayOfMonth = today.getDate() === 1;

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

      // Process weekly insights on Sundays (Requirement 39.7)
      if (isSunday) {
        const weeklyResults = await Promise.all(
          batch.map((user) => sendWeeklyInsightNotification(user)),
        );

        weeklyResults.forEach((result) => {
          if (result.sent) {
            results.weeklyInsights.sent++;
          } else if (result.error) {
            results.weeklyInsights.errors++;
          } else {
            results.weeklyInsights.skipped++;
          }
        });
      }

      // Monthly budget kickoff email — sent on the 1st of each month (P5-T7)
      if (isFirstDayOfMonth) {
        await Promise.allSettled(batch.map((user) => sendMonthlyKickoffEmail(user)));
      }

      console.log(
        `Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(users.length / BATCH_SIZE)}`,
      );
    }

    const duration = Date.now() - startTime;

    // Run spending nudge analysis daily (non-blocking, best-effort)
    try {
      let nudgesGenerated = 0;
      for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE);
        const nudgeResults = await Promise.all(batch.map((user) => generateSpendingNudges(user)));
        nudgesGenerated += nudgeResults.filter(Boolean).reduce((s, n) => s + (n || 0), 0);
      }
      console.log(`   Spending nudges generated: ${nudgesGenerated}`);
    } catch (_e) {
      console.warn('Spending nudge generation failed (non-fatal)', _e.message);
    }

    console.log("✅ Daily reminders job complete!");
    console.log(`   Total users: ${results.totalUsers}`);
    console.log(`   Daily reminders sent: ${results.remindersSent}`);
    console.log(`   Daily skipped: ${results.skipped}`);
    console.log(`   Daily errors: ${results.errors}`);
    console.log(
      `   Bill reminders sent: ${results.billReminders.remindersSent}`,
    );
    console.log(`   Bills checked: ${results.billReminders.totalBillsChecked}`);
    if (isSunday) {
      console.log(`   Weekly insights sent: ${results.weeklyInsights.sent}`);
    }
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

/**
 * Monthly budget kickoff email (P5-T7)
 *
 * Sent on the 1st of each month via SES.
 * Tells the user their new budget is ready and what was pre-filled from last month.
 */
async function sendMonthlyKickoffEmail(user) {
  const SES_REGION = process.env.AWS_REGION || 'us-east-1';
  const SES_FROM = process.env.SES_FROM_EMAIL || 'noreply@budgetbuddy.app';
  const ses = new AWS.SES({ region: SES_REGION });

  try {
    const { userId, email, firstName } = user;
    if (!email) return;

    const now = new Date();
    const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Fetch last month's budget summary for pre-fill context
    let prefillSummary = 'your recurring categories from last month';
    try {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString().substring(0, 7);
      const prevBudget = await dynamodb.get({
        TableName: TABLE_NAME,
        Key: { PK: `BUDGET#${userId}`, SK: `PERIOD#${prevMonth}` },
      }).promise();
      if (prevBudget.Item) {
        const groups = prevBudget.Item.groups || {};
        let catCount = 0;
        ['income','savings','expenses'].forEach(g => {
          if (groups[g]) groups[g].forEach(grp => { catCount += (grp.categories || []).length; });
        });
        if (catCount > 0) prefillSummary = `${catCount} categories from ${prevMonth}`;
      }
    } catch (_e) { /* use default */ }

    const subject = `Your ${monthName} budget is ready 🎉`;
    const bodyText = `Hi ${firstName || 'there'},\n\nYour ${monthName} budget has been set up automatically using ${prefillSummary}. Log in to review and adjust your plan for the month.\n\nhttps://d1ueeugn9zcx7n.cloudfront.net/budget\n\nHappy budgeting,\nThe BudgetBuddy Team`;
    const bodyHtml = `<p>Hi ${firstName || 'there'},</p><p>Your <strong>${monthName}</strong> budget has been set up automatically using <strong>${prefillSummary}</strong>. Log in to review and adjust your plan.</p><p><a href="https://d1ueeugn9zcx7n.cloudfront.net/budget" style="background:#059669;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Open my budget →</a></p><p>Happy budgeting,<br/>The BudgetBuddy Team</p>`;

    await ses.sendEmail({
      Source: SES_FROM,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: bodyText, Charset: 'UTF-8' },
          Html: { Data: bodyHtml, Charset: 'UTF-8' },
        },
      },
    }).promise();

    console.log(`Monthly kickoff email sent to ${email}`);
  } catch (err) {
    console.warn(`Monthly kickoff email failed for ${user.userId}: ${err.message}`);
  }
}
