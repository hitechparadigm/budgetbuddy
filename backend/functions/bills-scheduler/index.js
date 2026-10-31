/**
 * BudgetBuddy Bill Notification Scheduler Lambda Function
 *
 * Scheduled function that runs daily at 8AM to check for upcoming bills
 * and send reminder notifications at 7 days, 3 days, due day, and overdue.
 *
 * Version: 1.0.0
 */

const { dynamoHelpers, logger } = require("/opt/nodejs/utils");

/**
 * Main Lambda handler for scheduled bill notifications
 */
exports.handler = async (event, context) => {
  logger.info("Bill notification scheduler triggered", {
    requestId: context.awsRequestId,
    time: new Date().toISOString(),
  });

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate notification dates
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const todayStr = today.toISOString().split("T")[0];
    const sevenDaysStr = sevenDaysLater.toISOString().split("T")[0];
    const threeDaysStr = threeDaysLater.toISOString().split("T")[0];

    logger.info("Checking bills for notifications", {
      today: todayStr,
      sevenDays: sevenDaysStr,
      threeDays: threeDaysStr,
    });

    // Get all unpaid bills
    const bills = await getAllUnpaidBills();

    const notifications = {
      sevenDay: [],
      threeDay: [],
      dueToday: [],
      overdue: [],
    };

    // Categorize bills by notification type
    for (const bill of bills) {
      const dueDate = bill.dueDate;

      // Skip if already sent this reminder
      const remindersSent = bill.remindersSent || [];

      // 7-day reminder
      if (dueDate === sevenDaysStr && !remindersSent.includes("7-day")) {
        notifications.sevenDay.push(bill);
      }

      // 3-day reminder
      if (dueDate === threeDaysStr && !remindersSent.includes("3-day")) {
        notifications.threeDay.push(bill);
      }

      // Due today reminder
      if (dueDate === todayStr && !remindersSent.includes("due-today")) {
        notifications.dueToday.push(bill);
      }

      // Overdue reminder (check if due date is in the past)
      if (dueDate < todayStr && !remindersSent.includes("overdue")) {
        notifications.overdue.push(bill);
      }
    }

    // Send notifications and update reminder status
    const results = {
      sevenDay: await sendNotifications(notifications.sevenDay, "7-day"),
      threeDay: await sendNotifications(notifications.threeDay, "3-day"),
      dueToday: await sendNotifications(notifications.dueToday, "due-today"),
      overdue: await sendNotifications(notifications.overdue, "overdue"),
    };

    const totalSent =
      results.sevenDay.sent +
      results.threeDay.sent +
      results.dueToday.sent +
      results.overdue.sent;

    logger.info("Bill notifications completed", {
      totalSent,
      sevenDay: results.sevenDay.sent,
      threeDay: results.threeDay.sent,
      dueToday: results.dueToday.sent,
      overdue: results.overdue.sent,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        totalSent,
        results,
      }),
    };
  } catch (error) {
    logger.error("Bill notification scheduler error", error, {
      requestId: context.awsRequestId,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: "Failed to process bill notifications",
      }),
    };
  }
};

/**
 * Get the YYYY-MM keys for the previous, current and next month (UTC)
 */
function getBillMonths(now = new Date()) {
  return [-1, 0, 1].map((offset) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1))
      .toISOString()
      .slice(0, 7),
  );
}

/**
 * Get unpaid bills due in the previous, current or next month
 *
 * Bills are indexed on GSI1 as GSI1PK = BILLS#<YYYY-MM> (see bills/index.js),
 * so three bounded queries cover overdue bills, today and the +7-day window
 * across a month boundary without scanning the whole table.
 */
async function getAllUnpaidBills() {
  const pages = await Promise.all(
    getBillMonths().map((month) =>
      dynamoHelpers.queryByGSI("GSI1", `BILLS#${month}`, {
        FilterExpression:
          "entityType = :entityType AND #status <> :paid AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":entityType": "BILL",
          ":paid": "paid",
          ":false": false,
        },
      }),
    ),
  );

  return pages.flat();
}

/**
 * Get the user IDs of a budget's active members
 */
async function getActiveMemberIds(budgetId) {
  const members = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":sk": "MEMBER#" },
  });

  return members
    .filter((member) => member.userId && member.status === "active")
    .map((member) => member.userId);
}

/**
 * Send notifications for bills and update reminder status
 */
async function sendNotifications(bills, reminderType) {
  let sent = 0;
  const errors = [];

  for (const bill of bills) {
    try {
      // Create notification record
      await createNotification(bill, reminderType);

      // Update bill with reminder sent
      const remindersSent = bill.remindersSent || [];
      remindersSent.push(reminderType);

      await dynamoHelpers.updateItem(bill.PK, bill.SK, {
        remindersSent,
        updatedAt: new Date().toISOString(),
      });

      sent++;
      logger.info("Bill notification sent", {
        billId: bill.billId,
        budgetId: bill.budgetId,
        reminderType,
      });
    } catch (error) {
      logger.error("Failed to send bill notification", error, {
        billId: bill.billId,
        reminderType,
      });
      errors.push({ billId: bill.billId, error: error.message });
    }
  }

  return { sent, errors };
}

/**
 * Create one notification record per active budget member
 *
 * Written at PK USER#<userId> / SK NOTIFICATION#<timestamp>_<billId>, the
 * layout notifications/index.js reads for notification history.
 */
async function createNotification(bill, reminderType) {
  const now = Date.now();
  const currentTime = new Date(now).toISOString();
  const notificationId = `${now}_${bill.billId}`;

  // Determine notification message
  let title, message, priority;

  switch (reminderType) {
    case "7-day":
      title = "Bill Due in 7 Days";
      message = `${bill.name} is due on ${bill.dueDate}. Amount: $${bill.amount.toFixed(2)}`;
      priority = "low";
      break;
    case "3-day":
      title = "Bill Due in 3 Days";
      message = `${bill.name} is due on ${bill.dueDate}. Amount: $${bill.amount.toFixed(2)}`;
      priority = "medium";
      break;
    case "due-today":
      title = "Bill Due Today";
      message = `${bill.name} is due today! Amount: $${bill.amount.toFixed(2)}`;
      priority = "high";
      break;
    case "overdue":
      title = "Bill Overdue";
      message = `${bill.name} was due on ${bill.dueDate}. Amount: $${bill.amount.toFixed(2)}`;
      priority = "high";
      break;
    default:
      title = "Bill Reminder";
      message = `${bill.name} is due on ${bill.dueDate}`;
      priority = "medium";
  }

  const userIds = await getActiveMemberIds(bill.budgetId);

  const notifications = userIds.map((userId) => ({
    PK: `USER#${userId}`,
    SK: `NOTIFICATION#${notificationId}`,
    entityType: "NOTIFICATION",
    notificationId,
    userId,
    budgetId: bill.budgetId,
    type: "bill_reminder",
    title,
    body: message,
    message,
    priority,
    billId: bill.billId,
    billName: bill.name,
    billAmount: bill.amount,
    billDueDate: bill.dueDate,
    reminderType,
    read: false,
    sentAt: currentTime,
    createdAt: currentTime,
  }));

  for (const notification of notifications) {
    await dynamoHelpers.putItem(notification);
  }

  return notifications;
}
