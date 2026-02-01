/**
 * BudgetBuddy Financial Tips Lambda Function
 *
 * Provides personalized financial tips based on user spending patterns.
 * Tips are categorized by topic and personalized based on user behavior.
 *
 * Version: 1.0.0
 */

const {
  successResponse,
  errorResponse,
  getUserFromEvent,
  dynamoHelpers,
  logger,
} = require("/opt/nodejs/utils");

const { checkPermission } = require("/opt/nodejs/shared");

// Tip categories
const TIP_CATEGORIES = ["budgeting", "saving", "debt", "investing", "general"];

// Built-in tips library
const TIPS_LIBRARY = {
  budgeting: [
    {
      id: "budget-001",
      title: "The 50/30/20 Rule",
      content:
        "Allocate 50% of income to needs, 30% to wants, and 20% to savings and debt repayment.",
      category: "budgeting",
      difficulty: "beginner",
    },
    {
      id: "budget-002",
      title: "Zero-Based Budgeting",
      content:
        "Give every dollar a job. Your income minus expenses should equal zero.",
      category: "budgeting",
      difficulty: "beginner",
    },
    {
      id: "budget-003",
      title: "Track Every Expense",
      content:
        "Small purchases add up. Track everything for a month to find hidden spending.",
      category: "budgeting",
      difficulty: "beginner",
    },
    {
      id: "budget-004",
      title: "Review Weekly",
      content:
        "Set a weekly budget review to catch overspending before it becomes a problem.",
      category: "budgeting",
      difficulty: "intermediate",
    },
    {
      id: "budget-005",
      title: "Use Cash Envelopes",
      content:
        "For variable expenses like groceries, use cash to physically limit spending.",
      category: "budgeting",
      difficulty: "beginner",
    },
  ],
  saving: [
    {
      id: "save-001",
      title: "Pay Yourself First",
      content:
        "Automate savings transfers on payday before you can spend the money.",
      category: "saving",
      difficulty: "beginner",
    },
    {
      id: "save-002",
      title: "Emergency Fund Goal",
      content:
        "Aim for 3-6 months of expenses in an easily accessible savings account.",
      category: "saving",
      difficulty: "beginner",
    },
    {
      id: "save-003",
      title: "High-Yield Savings",
      content:
        "Move your emergency fund to a high-yield savings account to earn more interest.",
      category: "saving",
      difficulty: "intermediate",
    },
    {
      id: "save-004",
      title: "The 24-Hour Rule",
      content: "Wait 24 hours before making non-essential purchases over $50.",
      category: "saving",
      difficulty: "beginner",
    },
    {
      id: "save-005",
      title: "Round-Up Savings",
      content:
        "Round up purchases to the nearest dollar and save the difference.",
      category: "saving",
      difficulty: "beginner",
    },
  ],
  debt: [
    {
      id: "debt-001",
      title: "Debt Snowball Method",
      content:
        "Pay minimums on all debts, then attack the smallest balance first for quick wins.",
      category: "debt",
      difficulty: "beginner",
    },
    {
      id: "debt-002",
      title: "Debt Avalanche Method",
      content:
        "Pay minimums on all debts, then attack the highest interest rate first to save money.",
      category: "debt",
      difficulty: "intermediate",
    },
    {
      id: "debt-003",
      title: "Balance Transfer",
      content:
        "Consider a 0% APR balance transfer card to reduce interest while paying down debt.",
      category: "debt",
      difficulty: "intermediate",
    },
    {
      id: "debt-004",
      title: "Stop Adding Debt",
      content:
        "Cut up credit cards or freeze them in ice to prevent adding new debt.",
      category: "debt",
      difficulty: "beginner",
    },
    {
      id: "debt-005",
      title: "Negotiate Interest Rates",
      content:
        "Call your credit card company and ask for a lower interest rate.",
      category: "debt",
      difficulty: "intermediate",
    },
  ],
  investing: [
    {
      id: "invest-001",
      title: "Start Early",
      content:
        "Time in the market beats timing the market. Start investing as early as possible.",
      category: "investing",
      difficulty: "beginner",
    },
    {
      id: "invest-002",
      title: "Employer Match",
      content:
        "Always contribute enough to get your full employer 401(k) match - it's free money.",
      category: "investing",
      difficulty: "beginner",
    },
    {
      id: "invest-003",
      title: "Index Funds",
      content:
        "Low-cost index funds often outperform actively managed funds over time.",
      category: "investing",
      difficulty: "intermediate",
    },
    {
      id: "invest-004",
      title: "Diversification",
      content:
        "Don't put all your eggs in one basket. Spread investments across asset classes.",
      category: "investing",
      difficulty: "intermediate",
    },
    {
      id: "invest-005",
      title: "Roth vs Traditional",
      content:
        "Consider a Roth IRA if you expect to be in a higher tax bracket in retirement.",
      category: "investing",
      difficulty: "advanced",
    },
  ],
  general: [
    {
      id: "gen-001",
      title: "Know Your Net Worth",
      content:
        "Calculate assets minus liabilities monthly to track your financial progress.",
      category: "general",
      difficulty: "beginner",
    },
    {
      id: "gen-002",
      title: "Review Subscriptions",
      content: "Audit your subscriptions quarterly. Cancel what you don't use.",
      category: "general",
      difficulty: "beginner",
    },
    {
      id: "gen-003",
      title: "Negotiate Bills",
      content:
        "Call service providers annually to negotiate better rates on recurring bills.",
      category: "general",
      difficulty: "intermediate",
    },
    {
      id: "gen-004",
      title: "Meal Planning",
      content:
        "Plan meals weekly to reduce food waste and impulse restaurant spending.",
      category: "general",
      difficulty: "beginner",
    },
    {
      id: "gen-005",
      title: "Financial Goals",
      content:
        "Write down specific, measurable financial goals with deadlines.",
      category: "general",
      difficulty: "beginner",
    },
  ],
};

/**
 * Main Lambda handler for tips operations
 */
exports.handler = async (event, context) => {
  logger.info("Tips request received", {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context.awsRequestId,
  });

  try {
    const { httpMethod, path, pathParameters } = event;

    // Health check endpoint (public)
    if (httpMethod === "GET" && path === "/tips/health") {
      return successResponse(
        { status: "healthy", service: "tips", version: "1.0.0" },
        "Tips service is healthy",
      );
    }

    // CORS preflight
    if (httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        },
        body: "",
      };
    }

    // All other endpoints require authentication
    const user = getUserFromEvent(event);
    const hasPermission = await checkPermission(user, "viewer");
    if (!hasPermission) {
      return errorResponse.forbidden("Insufficient permissions");
    }

    // Route handling
    if (httpMethod === "GET" && path === "/tips/feed") {
      return await getTipsFeed(event, user);
    }

    if (httpMethod === "GET" && path === "/tips/daily") {
      return await getDailyTip(event, user);
    }

    if (httpMethod === "GET" && path === "/tips/saved") {
      return await getSavedTips(event, user);
    }

    if (
      httpMethod === "POST" &&
      pathParameters?.tipId &&
      path.includes("/save")
    ) {
      return await saveTip(event, user, pathParameters.tipId);
    }

    if (
      httpMethod === "POST" &&
      pathParameters?.tipId &&
      path.includes("/dismiss")
    ) {
      return await dismissTip(event, user, pathParameters.tipId);
    }

    return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);
  } catch (error) {
    logger.error("Tips function error", error, {
      requestId: context.awsRequestId,
    });

    if (error.message.includes("No user claims")) {
      return errorResponse.unauthorized("Authentication required");
    }
    return errorResponse.internalError(
      "An error occurred processing your request",
    );
  }
};

/**
 * Get personalized tips feed
 * GET /tips/feed
 */
async function getTipsFeed(event, user) {
  const queryParams = event.queryStringParameters || {};
  const category = queryParams.category;
  const limit = Math.min(parseInt(queryParams.limit, 10) || 10, 20);

  // Get user's viewed and dismissed tips
  const userTipHistory = await getUserTipHistory(user.userId);
  const viewedTipIds = new Set(userTipHistory.viewed || []);
  const dismissedTipIds = new Set(userTipHistory.dismissed || []);

  // Get user spending patterns for personalization
  const spendingPatterns = await analyzeUserSpending(user.userId);

  // Select tips based on user patterns
  let tips = selectPersonalizedTips(spendingPatterns, category);

  // Filter out dismissed tips
  tips = tips.filter((tip) => !dismissedTipIds.has(tip.id));

  // Sort: unviewed first, then by relevance
  tips.sort((a, b) => {
    const aViewed = viewedTipIds.has(a.id) ? 1 : 0;
    const bViewed = viewedTipIds.has(b.id) ? 1 : 0;
    if (aViewed !== bViewed) return aViewed - bViewed;
    return (b.relevanceScore || 0) - (a.relevanceScore || 0);
  });

  // Limit results
  tips = tips.slice(0, limit);

  // Mark tips as viewed
  const newViewedIds = tips.map((t) => t.id);
  await updateViewedTips(user.userId, newViewedIds);

  return successResponse(
    {
      tips,
      total: tips.length,
      hasMore: tips.length === limit,
    },
    "Tips feed retrieved",
  );
}

/**
 * Get daily tip
 * GET /tips/daily
 */
async function getDailyTip(event, user) {
  const today = new Date().toISOString().split("T")[0];

  // Check if user already has a daily tip for today
  const dailyTipRecord = await dynamoHelpers.getItem(
    `USER#${user.userId}`,
    `DAILY_TIP#${today}`,
  );

  if (dailyTipRecord) {
    return successResponse(
      {
        tip: dailyTipRecord.tip,
        date: today,
        alreadyViewed: true,
      },
      "Daily tip retrieved",
    );
  }

  // Get user's tip history to avoid repetition
  const userTipHistory = await getUserTipHistory(user.userId);
  const recentTipIds = new Set(userTipHistory.recentDaily || []);

  // Select a tip not recently shown
  const allTips = getAllTips();
  const availableTips = allTips.filter((t) => !recentTipIds.has(t.id));
  const tip =
    availableTips.length > 0
      ? availableTips[Math.floor(Math.random() * availableTips.length)]
      : allTips[Math.floor(Math.random() * allTips.length)];

  // Save daily tip record
  await dynamoHelpers.putItem({
    PK: `USER#${user.userId}`,
    SK: `DAILY_TIP#${today}`,
    entityType: "DAILY_TIP",
    userId: user.userId,
    date: today,
    tip,
    createdAt: new Date().toISOString(),
  });

  // Update recent daily tips (keep last 30)
  await updateRecentDailyTips(user.userId, tip.id);

  return successResponse(
    {
      tip,
      date: today,
      alreadyViewed: false,
    },
    "Daily tip retrieved",
  );
}

/**
 * Get user's saved tips
 * GET /tips/saved
 */
async function getSavedTips(event, user) {
  const savedTips = await dynamoHelpers.query({
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": `USER#${user.userId}`,
      ":sk": "SAVED_TIP#",
    },
  });

  const tips = savedTips.map((record) => ({
    ...record.tip,
    savedAt: record.savedAt,
  }));

  return successResponse(
    {
      tips,
      total: tips.length,
    },
    "Saved tips retrieved",
  );
}

/**
 * Save a tip for later
 * POST /tips/:tipId/save
 */
async function saveTip(event, user, tipId) {
  // Find the tip
  const tip = findTipById(tipId);
  if (!tip) {
    return errorResponse.notFound("Tip not found");
  }

  // Check if already saved
  const existing = await dynamoHelpers.getItem(
    `USER#${user.userId}`,
    `SAVED_TIP#${tipId}`,
  );

  if (existing) {
    return successResponse({ tip, alreadySaved: true }, "Tip already saved");
  }

  // Save the tip
  await dynamoHelpers.putItem({
    PK: `USER#${user.userId}`,
    SK: `SAVED_TIP#${tipId}`,
    entityType: "SAVED_TIP",
    userId: user.userId,
    tipId,
    tip,
    savedAt: new Date().toISOString(),
  });

  logger.info("Tip saved", { userId: user.userId, tipId });

  return successResponse(
    { tip, alreadySaved: false },
    "Tip saved successfully",
  );
}

/**
 * Dismiss a tip (don't show again)
 * POST /tips/:tipId/dismiss
 */
async function dismissTip(event, user, tipId) {
  // Update user's tip history
  const history = await getUserTipHistory(user.userId);
  const dismissed = new Set(history.dismissed || []);
  dismissed.add(tipId);

  await dynamoHelpers.putItem({
    PK: `USER#${user.userId}`,
    SK: "TIP_HISTORY",
    entityType: "TIP_HISTORY",
    userId: user.userId,
    viewed: history.viewed || [],
    dismissed: Array.from(dismissed),
    recentDaily: history.recentDaily || [],
    updatedAt: new Date().toISOString(),
  });

  logger.info("Tip dismissed", { userId: user.userId, tipId });

  return successResponse({ tipId, dismissed: true }, "Tip dismissed");
}

/**
 * Get user's tip history
 */
async function getUserTipHistory(userId) {
  const history = await dynamoHelpers.getItem(`USER#${userId}`, "TIP_HISTORY");
  return history || { viewed: [], dismissed: [], recentDaily: [] };
}

/**
 * Update viewed tips
 */
async function updateViewedTips(userId, newTipIds) {
  const history = await getUserTipHistory(userId);
  const viewed = new Set(history.viewed || []);
  newTipIds.forEach((id) => viewed.add(id));

  // Keep only last 100 viewed tips
  const viewedArray = Array.from(viewed).slice(-100);

  await dynamoHelpers.putItem({
    PK: `USER#${userId}`,
    SK: "TIP_HISTORY",
    entityType: "TIP_HISTORY",
    userId,
    viewed: viewedArray,
    dismissed: history.dismissed || [],
    recentDaily: history.recentDaily || [],
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Update recent daily tips
 */
async function updateRecentDailyTips(userId, tipId) {
  const history = await getUserTipHistory(userId);
  const recentDaily = history.recentDaily || [];
  recentDaily.push(tipId);

  // Keep only last 30 daily tips
  const trimmed = recentDaily.slice(-30);

  await dynamoHelpers.putItem({
    PK: `USER#${userId}`,
    SK: "TIP_HISTORY",
    entityType: "TIP_HISTORY",
    userId,
    viewed: history.viewed || [],
    dismissed: history.dismissed || [],
    recentDaily: trimmed,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Analyze user spending patterns for personalization
 */
async function analyzeUserSpending(userId) {
  // Get user profile
  const userProfile = await dynamoHelpers.getItem(`USER#${userId}`, "PROFILE");
  const familyId = userProfile?.familyId || userId;

  // Get recent transactions
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const transactions = await dynamoHelpers.query({
    KeyConditionExpression: "PK = :pk AND SK >= :sk",
    ExpressionAttributeValues: {
      ":pk": `FAMILY#${familyId}`,
      ":sk": `TRANSACTION#${thirtyDaysAgo.toISOString()}`,
    },
  });

  // Analyze patterns
  const patterns = {
    hasDebt: false,
    highSpendingCategories: [],
    lowSavingsRate: false,
    frequentDiningOut: false,
    subscriptionHeavy: false,
  };

  const categoryTotals = {};
  let totalExpenses = 0;
  let totalIncome = 0;

  for (const tx of transactions) {
    if (tx.type === "expense") {
      const category = (tx.category || "other").toLowerCase();
      categoryTotals[category] =
        (categoryTotals[category] || 0) + Math.abs(tx.amount);
      totalExpenses += Math.abs(tx.amount);

      // Check for debt payments
      if (
        category.includes("debt") ||
        category.includes("loan") ||
        category.includes("credit")
      ) {
        patterns.hasDebt = true;
      }

      // Check for dining out
      if (
        category.includes("restaurant") ||
        category.includes("dining") ||
        category.includes("food")
      ) {
        patterns.frequentDiningOut = true;
      }

      // Check for subscriptions
      if (category.includes("subscription") || category.includes("streaming")) {
        patterns.subscriptionHeavy = true;
      }
    } else if (tx.type === "income") {
      totalIncome += Math.abs(tx.amount);
    }
  }

  // Calculate savings rate
  if (totalIncome > 0) {
    const savingsRate = (totalIncome - totalExpenses) / totalIncome;
    patterns.lowSavingsRate = savingsRate < 0.1; // Less than 10%
  }

  // Find high spending categories
  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);
  patterns.highSpendingCategories = sortedCategories;

  return patterns;
}

/**
 * Select personalized tips based on spending patterns
 */
function selectPersonalizedTips(patterns, categoryFilter) {
  let tips = getAllTips();

  // Filter by category if specified
  if (categoryFilter && TIP_CATEGORIES.includes(categoryFilter)) {
    tips = tips.filter((t) => t.category === categoryFilter);
  }

  // Add relevance scores based on patterns
  tips = tips.map((tip) => {
    let relevanceScore = 1;

    // Boost debt tips if user has debt
    if (patterns.hasDebt && tip.category === "debt") {
      relevanceScore += 3;
    }

    // Boost saving tips if low savings rate
    if (patterns.lowSavingsRate && tip.category === "saving") {
      relevanceScore += 2;
    }

    // Boost budgeting tips if high spending
    if (
      patterns.highSpendingCategories.length > 0 &&
      tip.category === "budgeting"
    ) {
      relevanceScore += 1;
    }

    // Boost general tips about subscriptions if subscription heavy
    if (patterns.subscriptionHeavy && tip.id === "gen-002") {
      relevanceScore += 2;
    }

    // Boost meal planning if frequent dining out
    if (patterns.frequentDiningOut && tip.id === "gen-004") {
      relevanceScore += 2;
    }

    return { ...tip, relevanceScore };
  });

  return tips;
}

/**
 * Get all tips from library
 */
function getAllTips() {
  const allTips = [];
  for (const category of TIP_CATEGORIES) {
    allTips.push(...(TIPS_LIBRARY[category] || []));
  }
  return allTips;
}

/**
 * Find tip by ID
 */
function findTipById(tipId) {
  for (const category of TIP_CATEGORIES) {
    const tip = (TIPS_LIBRARY[category] || []).find((t) => t.id === tipId);
    if (tip) return tip;
  }
  return null;
}
