/**
 * BudgetBuddy Peer Comparison Lambda Function
 *
 * Provides anonymous peer comparison data for spending insights.
 * Users can compare their spending to similar households based on
 * region, family size, and income bracket.
 *
 * Privacy: All data is aggregated and anonymized. Minimum 50 users
 * per comparison group to prevent individual identification.
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

// Minimum users required per comparison group for privacy
const MIN_GROUP_SIZE = 50;

// Default comparison categories
const COMPARISON_CATEGORIES = [
  "Housing",
  "Transportation",
  "Food",
  "Utilities",
  "Healthcare",
  "Entertainment",
  "Shopping",
  "Personal",
  "Savings",
  "Debt",
];

/**
 * Main Lambda handler for peer comparison operations
 */
exports.handler = async (event, context) => {
  logger.info("Comparison request received", {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context.awsRequestId,
  });

  try {
    const { httpMethod, path } = event;

    // Health check endpoint (public)
    if (httpMethod === "GET" && path === "/comparison/health") {
      return successResponse(
        { status: "healthy", service: "comparison", version: "1.0.0" },
        "Comparison service is healthy",
      );
    }

    // CORS preflight
    if (httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
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
    if (httpMethod === "GET" && path === "/comparison/summary") {
      return await getComparisonSummary(event, user);
    }

    if (httpMethod === "GET" && path === "/comparison/preferences") {
      return await getPreferences(event, user);
    }

    if (httpMethod === "PUT" && path === "/comparison/preferences") {
      return await updatePreferences(event, user);
    }

    return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);
  } catch (error) {
    logger.error("Comparison function error", error, {
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
 * Get comparison summary for user
 * GET /comparison/summary
 *
 * Returns spending comparison against similar households
 */
async function getComparisonSummary(event, user) {
  // Check if user has opted out
  const preferences = await getUserPreferences(user.userId);
  if (preferences.optedOut) {
    return successResponse(
      { optedOut: true, message: "You have opted out of peer comparisons" },
      "Peer comparison disabled",
    );
  }

  // Get user profile for grouping criteria
  const userProfile = await dynamoHelpers.getItem(
    `USER#${user.userId}`,
    "PROFILE",
  );

  if (!userProfile) {
    return errorResponse.notFound("User profile not found");
  }

  // Determine comparison group
  const groupCriteria = {
    region: userProfile.region || userProfile.country || "US",
    familySize: userProfile.familySize || 1,
    incomeRange: getIncomeRange(userProfile.annualIncome),
  };

  // Get aggregated comparison data
  const comparisonData = await getAggregatedComparison(groupCriteria);

  if (!comparisonData || comparisonData.groupSize < MIN_GROUP_SIZE) {
    return successResponse(
      {
        available: false,
        message: "Not enough similar users for comparison",
        minRequired: MIN_GROUP_SIZE,
        currentGroupSize: comparisonData?.groupSize || 0,
      },
      "Comparison data not available",
    );
  }

  // Get user's spending for comparison
  const userSpending = await getUserSpendingByCategory(user.userId);

  // New users may have no spending data yet
  if (!userSpending || Object.keys(userSpending).length === 0) {
    return successResponse(
      {
        comparison: null,
        message: 'Not enough data yet',
        hasData: false,
      },
      "No comparison data available",
    );
  }

  // Calculate comparison results
  const comparison = calculateComparison(userSpending, comparisonData);

  return successResponse(
    {
      available: true,
      hasData: true,
      groupCriteria,
      groupSize: comparisonData.groupSize,
      comparison,
      lastUpdated: comparisonData.lastUpdated,
    },
    "Comparison data retrieved",
  );
}

/**
 * Get user's comparison preferences
 * GET /comparison/preferences
 */
async function getPreferences(event, user) {
  const preferences = await getUserPreferences(user.userId);

  return successResponse(
    {
      optedOut: preferences.optedOut || false,
      shareData: preferences.shareData !== false, // Default to true
      showInInsights: preferences.showInInsights !== false, // Default to true
    },
    "Preferences retrieved",
  );
}

/**
 * Update user's comparison preferences
 * PUT /comparison/preferences
 */
async function updatePreferences(event, user) {
  const body = JSON.parse(event.body || "{}");

  const { optedOut, shareData, showInInsights } = body;

  const preferences = {
    PK: `USER#${user.userId}`,
    SK: "COMPARISON_PREFERENCES",
    entityType: "COMPARISON_PREFERENCES",
    userId: user.userId,
    optedOut: optedOut === true,
    shareData: shareData !== false,
    showInInsights: showInInsights !== false,
    updatedAt: new Date().toISOString(),
  };

  await dynamoHelpers.putItem(preferences);

  logger.info("Comparison preferences updated", {
    userId: user.userId,
    optedOut: preferences.optedOut,
  });

  return successResponse(
    {
      optedOut: preferences.optedOut,
      shareData: preferences.shareData,
      showInInsights: preferences.showInInsights,
    },
    "Preferences updated",
  );
}

/**
 * Get user's comparison preferences from DynamoDB
 */
async function getUserPreferences(userId) {
  const preferences = await dynamoHelpers.getItem(
    `USER#${userId}`,
    "COMPARISON_PREFERENCES",
  );

  return (
    preferences || { optedOut: false, shareData: true, showInInsights: true }
  );
}

/**
 * Determine income range bracket for grouping
 */
function getIncomeRange(annualIncome) {
  if (!annualIncome) return "unknown";

  const income = parseInt(annualIncome, 10);
  if (income < 30000) return "under-30k";
  if (income < 50000) return "30k-50k";
  if (income < 75000) return "50k-75k";
  if (income < 100000) return "75k-100k";
  if (income < 150000) return "100k-150k";
  return "over-150k";
}

/**
 * Get aggregated comparison data for a group
 * This data is pre-computed by a scheduled job
 */
async function getAggregatedComparison(groupCriteria) {
  const groupKey = `${groupCriteria.region}#${groupCriteria.familySize}#${groupCriteria.incomeRange}`;

  const aggregatedData = await dynamoHelpers.getItem(
    "COMPARISON_AGGREGATE",
    `GROUP#${groupKey}`,
  );

  if (aggregatedData) {
    return aggregatedData;
  }

  // If no pre-computed data, try to compute on-the-fly (for smaller datasets)
  return await computeGroupAggregation(groupCriteria);
}

/**
 * Compute group aggregation on-the-fly
 * Used when pre-computed data is not available
 */
async function computeGroupAggregation(groupCriteria) {
  // Get all users matching criteria who have opted in
  const users = await dynamoHelpers.scan({
    FilterExpression:
      "entityType = :entityType AND (attribute_not_exists(comparisonOptOut) OR comparisonOptOut = :false)",
    ExpressionAttributeValues: {
      ":entityType": "USER_PROFILE",
      ":false": false,
    },
  });

  // Filter by group criteria
  const matchingUsers = users.filter((u) => {
    const userRegion = u.region || u.country || "US";
    const userFamilySize = u.familySize || 1;
    const userIncomeRange = getIncomeRange(u.annualIncome);

    return (
      userRegion === groupCriteria.region &&
      userFamilySize === groupCriteria.familySize &&
      userIncomeRange === groupCriteria.incomeRange
    );
  });

  if (matchingUsers.length < MIN_GROUP_SIZE) {
    return { groupSize: matchingUsers.length };
  }

  // Get spending data for all matching users
  const categoryTotals = {};

  for (const category of COMPARISON_CATEGORIES) {
    categoryTotals[category] = [];
  }

  for (const matchingUser of matchingUsers) {
    const spending = await getUserSpendingByCategory(matchingUser.userId);

    for (const category of COMPARISON_CATEGORIES) {
      if (spending[category] !== undefined) {
        categoryTotals[category].push(spending[category]);
      }
    }
  }

  // Calculate statistics for each category
  const categoryStats = {};
  for (const category of COMPARISON_CATEGORIES) {
    const values = categoryTotals[category];
    if (values.length > 0) {
      categoryStats[category] = {
        average: calculateAverage(values),
        median: calculateMedian(values),
        percentile25: calculatePercentile(values, 25),
        percentile75: calculatePercentile(values, 75),
        count: values.length,
      };
    }
  }

  return {
    groupSize: matchingUsers.length,
    categoryStats,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get user's spending by category for current month
 */
async function getUserSpendingByCategory(userId) {
  const currentDate = new Date();
  const monthStart = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  ).toISOString();
  const monthEnd = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  ).toISOString();

  // Get user's familyId for family transactions
  const userProfile = await dynamoHelpers.getItem(`USER#${userId}`, "PROFILE");
  const familyId = userProfile?.familyId || userId;

  // Get transactions for the month
  const transactions = await dynamoHelpers.query({
    KeyConditionExpression: "PK = :pk AND SK BETWEEN :start AND :end",
    ExpressionAttributeValues: {
      ":pk": `FAMILY#${familyId}`,
      ":start": `TRANSACTION#${monthStart}`,
      ":end": `TRANSACTION#${monthEnd}`,
    },
  });

  // Aggregate by category — guard against null/undefined result for new users
  const categorySpending = {};
  for (const tx of (transactions || [])) {
    if (tx.type === "expense") {
      const category = mapToComparisonCategory(tx.category);
      categorySpending[category] =
        (categorySpending[category] || 0) + Math.abs(tx.amount);
    }
  }

  return categorySpending;
}

/**
 * Map user category to comparison category
 */
function mapToComparisonCategory(userCategory) {
  const categoryMap = {
    // Housing
    rent: "Housing",
    mortgage: "Housing",
    "home insurance": "Housing",
    "property tax": "Housing",
    "home maintenance": "Housing",

    // Transportation
    gas: "Transportation",
    "car payment": "Transportation",
    "car insurance": "Transportation",
    "public transit": "Transportation",
    uber: "Transportation",
    lyft: "Transportation",
    parking: "Transportation",

    // Food
    groceries: "Food",
    restaurants: "Food",
    "dining out": "Food",
    "fast food": "Food",
    "coffee shops": "Food",

    // Utilities
    electric: "Utilities",
    water: "Utilities",
    internet: "Utilities",
    phone: "Utilities",
    cable: "Utilities",

    // Healthcare
    medical: "Healthcare",
    dental: "Healthcare",
    pharmacy: "Healthcare",
    "health insurance": "Healthcare",

    // Entertainment
    streaming: "Entertainment",
    movies: "Entertainment",
    concerts: "Entertainment",
    hobbies: "Entertainment",
    subscriptions: "Entertainment",

    // Shopping
    clothing: "Shopping",
    electronics: "Shopping",
    amazon: "Shopping",
    "online shopping": "Shopping",

    // Personal
    haircut: "Personal",
    gym: "Personal",
    "personal care": "Personal",

    // Savings
    savings: "Savings",
    investments: "Savings",
    retirement: "Savings",
    "emergency fund": "Savings",

    // Debt
    "credit card": "Debt",
    "student loan": "Debt",
    "personal loan": "Debt",
  };

  const lowerCategory = (userCategory || "").toLowerCase();
  return categoryMap[lowerCategory] || "Personal";
}

/**
 * Calculate comparison between user spending and group averages
 */
function calculateComparison(userSpending, comparisonData) {
  const comparison = {};

  for (const category of COMPARISON_CATEGORIES) {
    const userAmount = userSpending[category] || 0;
    const stats = comparisonData.categoryStats?.[category];

    if (stats) {
      const percentile = calculateUserPercentile(userAmount, stats);
      const vsAverage =
        stats.average > 0
          ? ((userAmount - stats.average) / stats.average) * 100
          : 0;

      comparison[category] = {
        userAmount,
        groupAverage: Math.round(stats.average * 100) / 100,
        groupMedian: Math.round(stats.median * 100) / 100,
        percentile,
        vsAverage: Math.round(vsAverage),
        status: getComparisonStatus(percentile),
      };
    } else {
      comparison[category] = {
        userAmount,
        groupAverage: null,
        groupMedian: null,
        percentile: null,
        vsAverage: null,
        status: "no-data",
      };
    }
  }

  return comparison;
}

/**
 * Calculate user's percentile within the group
 */
function calculateUserPercentile(userAmount, stats) {
  if (userAmount <= stats.percentile25) {
    return Math.round((userAmount / stats.percentile25) * 25);
  }
  if (userAmount <= stats.median) {
    return (
      25 +
      Math.round(
        ((userAmount - stats.percentile25) /
          (stats.median - stats.percentile25)) *
          25,
      )
    );
  }
  if (userAmount <= stats.percentile75) {
    return (
      50 +
      Math.round(
        ((userAmount - stats.median) / (stats.percentile75 - stats.median)) *
          25,
      )
    );
  }
  // Above 75th percentile
  return Math.min(
    99,
    75 +
      Math.round(((userAmount - stats.percentile75) / stats.percentile75) * 25),
  );
}

/**
 * Get comparison status based on percentile
 */
function getComparisonStatus(percentile) {
  if (percentile === null) return "no-data";
  if (percentile <= 25) return "below-average";
  if (percentile <= 75) return "average";
  return "above-average";
}

/**
 * Calculate average of an array
 */
function calculateAverage(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate median of an array
 */
function calculateMedian(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate percentile of an array
 */
function calculatePercentile(values, percentile) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}
