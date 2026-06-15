/**
 * BudgetBuddy Subscription Tracking Lambda Function
 *
 * Handles subscription CRUD operations, automatic detection from transactions,
 * renewal notifications, and subscription management.
 *
 * Version: 1.0.0
 */

const {
  successResponse,
  errorResponse,
  parseRequestBody,
  getUserFromEvent,
  generateId,
  dynamoHelpers,
  logger,
  BudgetAccessResolver,
} = require("/opt/nodejs/utils");


/**
 * Main Lambda handler for subscription operations
 */
exports.handler = async (event, context) => {
  logger.info("Subscription request received", {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context.awsRequestId,
  });

  try {
    const { httpMethod, path, pathParameters } = event;

    // Health check endpoint
    if (httpMethod === "GET" && path === "/subscriptions/health") {
      return successResponse(
        { status: "healthy", service: "subscriptions", version: "1.0.0" },
        "Subscriptions service is healthy",
      );
    }

    // CORS preflight
    if (httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        body: "",
      };
    }

    const user = getUserFromEvent(event);
    logger.info("User authenticated", { userId: user.userId });

    // Route handling
    if (httpMethod === "GET" && path === "/subscriptions") {
      return await getSubscriptions(event, user);
    }

    if (httpMethod === "GET" && path === "/subscriptions/summary") {
      return await getSubscriptionsSummary(event, user);
    }

    if (httpMethod === "GET" && path === "/subscriptions/detect") {
      return await detectSubscriptions(event, user);
    }

    if (httpMethod === "POST" && path === "/subscriptions") {
      return await createSubscription(event, user);
    }

    if (httpMethod === "PUT" && pathParameters?.subscriptionId) {
      return await updateSubscription(
        event,
        user,
        pathParameters.subscriptionId,
      );
    }

    if (
      httpMethod === "PUT" &&
      pathParameters?.subscriptionId &&
      path.endsWith("/status")
    ) {
      return await updateSubscriptionStatus(
        event,
        user,
        pathParameters.subscriptionId,
      );
    }

    if (httpMethod === "DELETE" && pathParameters?.subscriptionId) {
      return await deleteSubscription(
        event,
        user,
        pathParameters.subscriptionId,
      );
    }

    return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);
  } catch (error) {
    logger.error("Subscriptions function error", error, {
      requestId: context.awsRequestId,
    });

    if (error && typeof error === 'object' && error.statusCode) {
      return {
        statusCode: error.statusCode,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Forbidden', message: error.message || 'Permission denied' }),
      };
    }
    if (error.message && error.message.includes("No user claims")) {
      return errorResponse.unauthorized("Authentication required");
    }
    return errorResponse.internalError(
      "An error occurred processing your request",
    );
  }
};

/**
 * Get all subscriptions for a family
 * GET /subscriptions
 */
async function getSubscriptions(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);

  logger.info("Getting subscriptions", { budgetId });

  const subscriptions = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
    FilterExpression:
      "entityType = :entityType AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
    ExpressionAttributeValues: {
      ":entityType": "SUBSCRIPTION",
      ":false": false,
    },
  });

  const formattedSubscriptions = subscriptions
    .map(formatSubscriptionResponse)
    .sort((a, b) => new Date(a.nextBillingDate) - new Date(b.nextBillingDate));

  return successResponse(
    {
      subscriptions: formattedSubscriptions,
      count: formattedSubscriptions.length,
    },
    "Subscriptions retrieved successfully",
  );
}

/**
 * Get subscriptions summary with totals
 * GET /subscriptions/summary
 */
async function getSubscriptionsSummary(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);

  const subscriptions = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
    FilterExpression:
      "entityType = :entityType AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
    ExpressionAttributeValues: {
      ":entityType": "SUBSCRIPTION",
      ":false": false,
    },
  });

  const activeSubscriptions = subscriptions.filter(
    (s) => s.status === "active",
  );

  // Calculate monthly cost (normalize all frequencies to monthly)
  const monthlyTotal = activeSubscriptions.reduce((total, sub) => {
    return total + normalizeToMonthly(sub.amount, sub.frequency);
  }, 0);

  // Calculate yearly cost
  const yearlyTotal = monthlyTotal * 12;

  // Group by status
  const byStatus = {
    keep: subscriptions.filter((s) => s.reviewStatus === "keep").length,
    review: subscriptions.filter((s) => s.reviewStatus === "review").length,
    cancel: subscriptions.filter((s) => s.reviewStatus === "cancel").length,
  };

  // Group by category
  const byCategory = {};
  subscriptions.forEach((sub) => {
    const cat = sub.category || "Other";
    if (!byCategory[cat]) {
      byCategory[cat] = { count: 0, monthlyTotal: 0 };
    }
    byCategory[cat].count++;
    if (sub.status === "active") {
      byCategory[cat].monthlyTotal += normalizeToMonthly(
        sub.amount,
        sub.frequency,
      );
    }
  });

  // Upcoming renewals (next 7 days)
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingRenewals = activeSubscriptions.filter((sub) => {
    const nextBilling = new Date(sub.nextBillingDate);
    return nextBilling >= today && nextBilling <= nextWeek;
  }).length;

  return successResponse(
    {
      summary: {
        totalSubscriptions: subscriptions.length,
        activeSubscriptions: activeSubscriptions.length,
        monthlyTotal: Math.round(monthlyTotal * 100) / 100,
        yearlyTotal: Math.round(yearlyTotal * 100) / 100,
        byStatus,
        byCategory,
        upcomingRenewals,
      },
    },
    "Subscription summary retrieved successfully",
  );
}

/**
 * Detect subscriptions from transaction patterns
 * GET /subscriptions/detect
 */
async function detectSubscriptions(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);

  logger.info("Detecting subscriptions from transactions", { budgetId });

  // Get transactions from last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().split("T")[0];

  const transactions = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
    FilterExpression:
      "entityType = :entityType AND transactionDate >= :startDate",
    ExpressionAttributeValues: {
      ":entityType": "TRANSACTION",
      ":startDate": sixMonthsAgoStr,
    },
  });

  // Group transactions by merchant
  const merchantGroups = {};
  transactions.forEach((tx) => {
    const merchant = tx.merchant || tx.description || "Unknown";
    if (!merchantGroups[merchant]) {
      merchantGroups[merchant] = [];
    }
    merchantGroups[merchant].push(tx);
  });

  // Detect recurring patterns
  const detectedSubscriptions = [];

  for (const [merchant, txList] of Object.entries(merchantGroups)) {
    if (txList.length < 2) continue;

    // Sort by date
    txList.sort(
      (a, b) => new Date(a.transactionDate) - new Date(b.transactionDate),
    );

    // Check for recurring pattern
    const pattern = detectRecurringPattern(txList);
    if (pattern) {
      // Check if already tracked
      const existingSubscriptions = await dynamoHelpers.queryByPK(
        `BUDGET#${budgetId}`,
        {
          FilterExpression:
            "entityType = :entityType AND merchant = :merchant AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
          ExpressionAttributeValues: {
            ":entityType": "SUBSCRIPTION",
            ":merchant": merchant,
            ":false": false,
          },
        },
      );

      if (existingSubscriptions.length === 0) {
        detectedSubscriptions.push({
          merchant,
          amount: pattern.averageAmount,
          frequency: pattern.frequency,
          confidence: pattern.confidence,
          lastTransaction: txList[txList.length - 1].transactionDate,
          transactionCount: txList.length,
          suggestedCategory: guessCategoryFromMerchant(merchant),
        });
      }
    }
  }

  // Sort by confidence
  detectedSubscriptions.sort((a, b) => b.confidence - a.confidence);

  return successResponse(
    {
      detected: detectedSubscriptions,
      count: detectedSubscriptions.length,
    },
    "Subscription detection complete",
  );
}

/**
 * Create a new subscription
 * POST /subscriptions
 */
async function createSubscription(event, user) {
  const body = parseRequestBody(event.body);
  const {
    name,
    merchant,
    amount,
    frequency,
    category,
    nextBillingDate,
    notes,
  } = body;

  // Validation
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return errorResponse.badRequest("Subscription name is required");
  }
  if (typeof amount !== "number" || amount <= 0) {
    return errorResponse.badRequest("Valid amount is required");
  }
  if (!["weekly", "monthly", "quarterly", "yearly"].includes(frequency)) {
    return errorResponse.badRequest(
      "Frequency must be weekly, monthly, quarterly, or yearly",
    );
  }

  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  const subscriptionId = generateId("sub");
  const now = new Date().toISOString();

  const subscription = {
    PK: `BUDGET#${budgetId}`,
    SK: `SUBSCRIPTION#${subscriptionId}`,
    entityType: "SUBSCRIPTION",
    subscriptionId,
    budgetId,
    name: name.trim(),
    merchant: merchant?.trim() || name.trim(),
    amount,
    frequency,
    category: category || "Other",
    nextBillingDate: nextBillingDate || calculateNextBillingDate(frequency),
    status: "active",
    reviewStatus: "keep",
    notes: notes || null,
    createdBy: user.userId,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  };

  await dynamoHelpers.putItem(subscription);

  logger.info("Subscription created", { subscriptionId, budgetId });

  return successResponse(
    { subscription: formatSubscriptionResponse(subscription) },
    "Subscription created successfully",
    201,
  );
}

/**
 * Update a subscription
 * PUT /subscriptions/{subscriptionId}
 */
async function updateSubscription(event, user, subscriptionId) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  // Get existing subscription
  const existing = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `SUBSCRIPTION#${subscriptionId}`,
  );

  if (!existing || existing.isDeleted) {
    return errorResponse.notFound("Subscription not found");
  }

  const body = parseRequestBody(event.body);
  const allowedFields = [
    "name",
    "merchant",
    "amount",
    "frequency",
    "category",
    "nextBillingDate",
    "status",
    "reviewStatus",
    "notes",
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse.badRequest("No valid fields to update");
  }

  // Validate frequency if provided
  if (
    updates.frequency &&
    !["weekly", "monthly", "quarterly", "yearly"].includes(updates.frequency)
  ) {
    return errorResponse.badRequest(
      "Frequency must be weekly, monthly, quarterly, or yearly",
    );
  }

  // Validate status if provided
  if (
    updates.status &&
    !["active", "paused", "cancelled"].includes(updates.status)
  ) {
    return errorResponse.badRequest(
      "Status must be active, paused, or cancelled",
    );
  }

  // Validate reviewStatus if provided
  if (
    updates.reviewStatus &&
    !["keep", "review", "cancel"].includes(updates.reviewStatus)
  ) {
    return errorResponse.badRequest(
      "Review status must be keep, review, or cancel",
    );
  }

  updates.updatedAt = new Date().toISOString();
  updates.updatedBy = user.userId;

  const updated = await dynamoHelpers.updateItem(
    `BUDGET#${budgetId}`,
    `SUBSCRIPTION#${subscriptionId}`,
    updates,
  );

  logger.info("Subscription updated", { subscriptionId, budgetId });

  return successResponse(
    { subscription: formatSubscriptionResponse(updated) },
    "Subscription updated successfully",
  );
}

/**
 * Update subscription status (quick action)
 * PUT /subscriptions/{subscriptionId}/status
 */
async function updateSubscriptionStatus(event, user, subscriptionId) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  const body = parseRequestBody(event.body);
  const { status, reviewStatus } = body;

  if (!status && !reviewStatus) {
    return errorResponse.badRequest("Status or reviewStatus is required");
  }

  const existing = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `SUBSCRIPTION#${subscriptionId}`,
  );

  if (!existing || existing.isDeleted) {
    return errorResponse.notFound("Subscription not found");
  }

  const updates = {
    updatedAt: new Date().toISOString(),
    updatedBy: user.userId,
  };

  if (status) {
    if (!["active", "paused", "cancelled"].includes(status)) {
      return errorResponse.badRequest(
        "Status must be active, paused, or cancelled",
      );
    }
    updates.status = status;
  }

  if (reviewStatus) {
    if (!["keep", "review", "cancel"].includes(reviewStatus)) {
      return errorResponse.badRequest(
        "Review status must be keep, review, or cancel",
      );
    }
    updates.reviewStatus = reviewStatus;
  }

  const updated = await dynamoHelpers.updateItem(
    `BUDGET#${budgetId}`,
    `SUBSCRIPTION#${subscriptionId}`,
    updates,
  );

  return successResponse(
    { subscription: formatSubscriptionResponse(updated) },
    "Subscription status updated successfully",
  );
}

/**
 * Delete a subscription (soft delete)
 * DELETE /subscriptions/{subscriptionId}
 */
async function deleteSubscription(event, user, subscriptionId) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  const existing = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `SUBSCRIPTION#${subscriptionId}`,
  );

  if (!existing || existing.isDeleted) {
    return errorResponse.notFound("Subscription not found");
  }

  await dynamoHelpers.updateItem(
    `BUDGET#${budgetId}`,
    `SUBSCRIPTION#${subscriptionId}`,
    {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: user.userId,
    },
  );

  logger.info("Subscription deleted", { subscriptionId, budgetId });

  return successResponse(null, "Subscription deleted successfully");
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format subscription for API response
 */
function formatSubscriptionResponse(subscription) {
  const today = new Date();
  const nextBilling = new Date(subscription.nextBillingDate);
  const daysUntilRenewal = Math.ceil(
    (nextBilling - today) / (1000 * 60 * 60 * 24),
  );

  // Calculate monthly equivalent
  const monthlyAmount = normalizeToMonthly(
    subscription.amount,
    subscription.frequency,
  );

  // Status indicator emoji
  let statusIndicator = "✅";
  if (subscription.status === "paused") statusIndicator = "⏸️";
  if (subscription.status === "cancelled") statusIndicator = "❌";
  if (subscription.reviewStatus === "review") statusIndicator = "🔍";
  if (subscription.reviewStatus === "cancel") statusIndicator = "⚠️";

  return {
    subscriptionId: subscription.subscriptionId,
    name: subscription.name,
    merchant: subscription.merchant,
    amount: subscription.amount,
    frequency: subscription.frequency,
    monthlyAmount: Math.round(monthlyAmount * 100) / 100,
    category: subscription.category,
    nextBillingDate: subscription.nextBillingDate,
    daysUntilRenewal,
    status: subscription.status,
    reviewStatus: subscription.reviewStatus,
    statusIndicator,
    notes: subscription.notes,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
  };
}

/**
 * Normalize amount to monthly equivalent
 */
function normalizeToMonthly(amount, frequency) {
  switch (frequency) {
    case "weekly":
      return amount * 4.33; // Average weeks per month
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "yearly":
      return amount / 12;
    default:
      return amount;
  }
}

/**
 * Calculate next billing date based on frequency
 */
function calculateNextBillingDate(frequency) {
  const today = new Date();
  switch (frequency) {
    case "weekly":
      today.setDate(today.getDate() + 7);
      break;
    case "monthly":
      today.setMonth(today.getMonth() + 1);
      break;
    case "quarterly":
      today.setMonth(today.getMonth() + 3);
      break;
    case "yearly":
      today.setFullYear(today.getFullYear() + 1);
      break;
  }
  return today.toISOString().split("T")[0];
}

/**
 * Detect recurring pattern in transactions
 */
function detectRecurringPattern(transactions) {
  if (transactions.length < 2) return null;

  // Calculate intervals between transactions
  const intervals = [];
  for (let i = 1; i < transactions.length; i++) {
    const prev = new Date(transactions[i - 1].transactionDate);
    const curr = new Date(transactions[i].transactionDate);
    const daysDiff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    intervals.push(daysDiff);
  }

  // Calculate average interval
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  // Check if intervals are consistent (within 20% variance)
  const variance =
    intervals.reduce((sum, interval) => {
      return sum + Math.abs(interval - avgInterval);
    }, 0) / intervals.length;

  const variancePercent = (variance / avgInterval) * 100;
  if (variancePercent > 20) return null;

  // Determine frequency
  let frequency;
  let confidence;

  if (avgInterval >= 25 && avgInterval <= 35) {
    frequency = "monthly";
    confidence = 0.9 - variancePercent / 100;
  } else if (avgInterval >= 5 && avgInterval <= 9) {
    frequency = "weekly";
    confidence = 0.85 - variancePercent / 100;
  } else if (avgInterval >= 85 && avgInterval <= 95) {
    frequency = "quarterly";
    confidence = 0.85 - variancePercent / 100;
  } else if (avgInterval >= 355 && avgInterval <= 375) {
    frequency = "yearly";
    confidence = 0.8 - variancePercent / 100;
  } else {
    return null;
  }

  // Check amount consistency (within 10% variance)
  const amounts = transactions.map((tx) => Math.abs(tx.amount));
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const amountVariance =
    amounts.reduce((sum, amt) => {
      return sum + Math.abs(amt - avgAmount);
    }, 0) / amounts.length;

  const amountVariancePercent = (amountVariance / avgAmount) * 100;
  if (amountVariancePercent > 10) {
    confidence *= 0.7; // Reduce confidence if amounts vary
  }

  return {
    frequency,
    averageAmount: Math.round(avgAmount * 100) / 100,
    confidence: Math.max(0.5, Math.min(1, confidence)),
    intervalDays: Math.round(avgInterval),
  };
}

/**
 * Guess category from merchant name
 */
function guessCategoryFromMerchant(merchant) {
  const merchantLower = merchant.toLowerCase();

  const categoryPatterns = {
    Streaming: [
      "netflix",
      "hulu",
      "disney",
      "hbo",
      "spotify",
      "apple music",
      "youtube",
      "amazon prime",
      "peacock",
      "paramount",
    ],
    Software: [
      "adobe",
      "microsoft",
      "google",
      "dropbox",
      "slack",
      "zoom",
      "notion",
      "figma",
      "github",
      "aws",
    ],
    Fitness: [
      "gym",
      "fitness",
      "peloton",
      "planet fitness",
      "la fitness",
      "equinox",
      "crossfit",
    ],
    "News & Media": [
      "nytimes",
      "wsj",
      "washington post",
      "medium",
      "substack",
      "patreon",
    ],
    Gaming: [
      "xbox",
      "playstation",
      "nintendo",
      "steam",
      "epic games",
      "twitch",
    ],
    "Food & Delivery": [
      "doordash",
      "uber eats",
      "grubhub",
      "instacart",
      "hello fresh",
      "blue apron",
    ],
    Utilities: [
      "electric",
      "gas",
      "water",
      "internet",
      "phone",
      "verizon",
      "at&t",
      "t-mobile",
      "comcast",
    ],
    Insurance: ["insurance", "geico", "progressive", "state farm", "allstate"],
    "Cloud Storage": ["icloud", "google drive", "onedrive", "backblaze"],
  };

  for (const [category, patterns] of Object.entries(categoryPatterns)) {
    if (patterns.some((pattern) => merchantLower.includes(pattern))) {
      return category;
    }
  }

  return "Other";
}

// Export helper functions for testing
module.exports.detectRecurringPattern = detectRecurringPattern;
module.exports.normalizeToMonthly = normalizeToMonthly;
module.exports.guessCategoryFromMerchant = guessCategoryFromMerchant;

/**
 * Check for upcoming subscription renewals and create notifications
 * This function can be called by a scheduled Lambda (e.g., daily)
 * @param {string} budgetId - Family ID to check subscriptions for
 * @returns {Object} - Summary of notifications created
 */
async function checkRenewalNotifications(budgetId) {
  try {
    const today = new Date();
    const threeDaysFromNow = new Date(
      today.getTime() + 3 * 24 * 60 * 60 * 1000,
    );
    const currentTime = today.toISOString();

    // Get all active subscriptions for the family
    const subscriptions = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
      FilterExpression:
        "entityType = :entityType AND #status = :active AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":entityType": "SUBSCRIPTION",
        ":active": "active",
        ":false": false,
      },
    });

    // Find subscriptions renewing in the next 3 days
    const upcomingRenewals = subscriptions.filter((sub) => {
      const nextBilling = new Date(sub.nextBillingDate);
      return nextBilling >= today && nextBilling <= threeDaysFromNow;
    });

    if (upcomingRenewals.length === 0) {
      return {
        notificationsCreated: 0,
        subscriptionsChecked: subscriptions.length,
      };
    }

    // Get family members to notify
    const familyMembers = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
      FilterExpression: "entityType = :type",
      ExpressionAttributeValues: { ":type": "MEMBER" },
    });

    const userIds = familyMembers.map((m) => m.userId).filter(Boolean);
    if (userIds.length === 0) {
      return {
        notificationsCreated: 0,
        subscriptionsChecked: subscriptions.length,
      };
    }

    // Create notifications for each upcoming renewal
    const notificationPromises = [];

    for (const subscription of upcomingRenewals) {
      const nextBilling = new Date(subscription.nextBillingDate);
      const daysUntil = Math.ceil(
        (nextBilling - today) / (1000 * 60 * 60 * 24),
      );

      for (const userId of userIds) {
        // Check if notification already sent for this subscription/date
        const existingNotification = await dynamoHelpers.queryByPK(
          `USER#${userId}`,
          {
            FilterExpression:
              "entityType = :type AND #data.subscriptionId = :subId AND begins_with(createdAt, :datePrefix)",
            ExpressionAttributeNames: { "#data": "data" },
            ExpressionAttributeValues: {
              ":type": "NOTIFICATION",
              ":subId": subscription.subscriptionId,
              ":datePrefix": currentTime.split("T")[0],
            },
          },
        );

        if (existingNotification.length > 0) continue; // Already notified today

        const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const notification = {
          PK: `USER#${userId}`,
          SK: `NOTIFICATION#${notificationId}`,
          entityType: "NOTIFICATION",
          notificationId,
          userId,
          budgetId,
          type: "subscription_renewal",
          title: `💳 Subscription Renewal Coming`,
          body: `${subscription.name} ($${subscription.amount}) renews in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
          data: {
            subscriptionId: subscription.subscriptionId,
            subscriptionName: subscription.name,
            amount: subscription.amount,
            nextBillingDate: subscription.nextBillingDate,
            daysUntil,
          },
          read: false,
          createdAt: currentTime,
        };

        notificationPromises.push(dynamoHelpers.putItem(notification));
      }
    }

    await Promise.all(notificationPromises);

    logger.info("Subscription renewal notifications created", {
      budgetId,
      renewalsFound: upcomingRenewals.length,
      notificationsCreated: notificationPromises.length,
    });

    return {
      notificationsCreated: notificationPromises.length,
      subscriptionsChecked: subscriptions.length,
      upcomingRenewals: upcomingRenewals.length,
    };
  } catch (error) {
    logger.error("Error checking renewal notifications", error, { budgetId });
    throw error;
  }
}

/**
 * Check for price increases on subscriptions
 * Compares current amount with historical amounts
 * @param {string} budgetId - Family ID
 * @param {string} subscriptionId - Subscription ID
 * @param {number} newAmount - New amount to compare
 * @returns {Object|null} - Price increase info or null
 */
function checkPriceIncrease(subscription, newAmount) {
  const oldAmount = subscription.amount;
  if (newAmount <= oldAmount) return null;

  const increaseAmount = newAmount - oldAmount;
  const increasePercent = ((increaseAmount / oldAmount) * 100).toFixed(1);

  return {
    oldAmount,
    newAmount,
    increaseAmount: Math.round(increaseAmount * 100) / 100,
    increasePercent: parseFloat(increasePercent),
    message: `${subscription.name} price increased by $${increaseAmount.toFixed(2)} (${increasePercent}%)`,
  };
}

// Export for scheduled Lambda and testing
module.exports.checkRenewalNotifications = checkRenewalNotifications;
module.exports.checkPriceIncrease = checkPriceIncrease;
