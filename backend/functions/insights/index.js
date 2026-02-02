/**
 * BudgetBuddy Spending Insights Lambda Function
 *
 * Handles spending analytics, AI-generated insights, and trend analysis.
 * Uses AWS Bedrock for natural language insight generation.
 *
 * Version: 1.1.0
 */

const {
  successResponse,
  errorResponse,
  parseRequestBody,
  getUserFromEvent,
  dynamoHelpers,
  logger,
  FamilyIdResolver,
} = require("/opt/nodejs/utils");

const { checkPermission } = require("/opt/nodejs/shared");

// AWS Bedrock client for AI insights
const {
  BedrockRuntimeClient,
  InvokeModelCommand,
} = require("@aws-sdk/client-bedrock-runtime");

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

// Bedrock model configuration
const BEDROCK_MODEL_ID =
  process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-sonnet-20240229-v1:0";

/**
 * Main Lambda handler for insights operations
 */
exports.handler = async (event, context) => {
  logger.info("Insights request received", {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context.awsRequestId,
  });

  try {
    const { httpMethod, path } = event;

    // Health check endpoint
    if (httpMethod === "GET" && path === "/insights/health") {
      return successResponse(
        { status: "healthy", service: "insights", version: "1.0.0" },
        "Insights service is healthy",
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

    const user = getUserFromEvent(event);
    logger.info("User authenticated", { userId: user.userId });

    // Route handling
    if (httpMethod === "GET" && path === "/insights/weekly") {
      return await getWeeklyInsights(event, user);
    }

    if (httpMethod === "GET" && path === "/insights/monthly") {
      return await getMonthlyInsights(event, user);
    }

    if (httpMethod === "GET" && path === "/insights/trends") {
      return await getSpendingTrends(event, user);
    }

    if (httpMethod === "GET" && path === "/insights/patterns") {
      return await getSpendingPatterns(event, user);
    }

    if (httpMethod === "POST" && path === "/insights/ask") {
      return await askAboutSpending(event, user);
    }

    return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);
  } catch (error) {
    logger.error("Insights function error", error, {
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
 * Get weekly spending insights
 * GET /insights/weekly
 */
async function getWeeklyInsights(event, user) {
  const permissionError = checkPermission(event, "budget:view");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  logger.info("Getting weekly insights", { familyId });

  // Get current week's transactions
  const today = new Date();
  const weekStart = getWeekStart(today);
  const weekEnd = new Date(today);

  const transactions = await getTransactionsInRange(
    familyId,
    weekStart,
    weekEnd,
  );
  const previousWeekTransactions = await getTransactionsInRange(
    familyId,
    new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000),
    new Date(weekStart.getTime() - 1),
  );

  // Calculate summary
  const summary = calculateSummary(transactions);
  const previousSummary = calculateSummary(previousWeekTransactions);

  // Calculate category breakdown with comparison
  const categoryBreakdown = calculateCategoryBreakdown(
    transactions,
    previousWeekTransactions,
  );

  // Generate AI insights
  const aiInsights = generateInsights(
    summary,
    previousSummary,
    categoryBreakdown,
  );

  // Identify patterns
  const patterns = identifyPatterns(transactions);

  return successResponse(
    {
      period: {
        start: weekStart.toISOString().split("T")[0],
        end: weekEnd.toISOString().split("T")[0],
        type: "weekly",
      },
      summary,
      comparison: {
        previousPeriod: previousSummary,
        spendingChange: calculatePercentChange(
          summary.totalSpent,
          previousSummary.totalSpent,
        ),
        incomeChange: calculatePercentChange(
          summary.totalIncome,
          previousSummary.totalIncome,
        ),
      },
      categoryBreakdown,
      insights: aiInsights,
      patterns,
    },
    "Weekly insights retrieved successfully",
  );
}

/**
 * Get monthly spending insights
 * GET /insights/monthly
 */
async function getMonthlyInsights(event, user) {
  const permissionError = checkPermission(event, "budget:view");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const queryParams = event.queryStringParameters || {};
  const month = queryParams.month || new Date().toISOString().substring(0, 7);

  logger.info("Getting monthly insights", { familyId, month });

  // Get month's transactions
  const monthStart = new Date(`${month}-01`);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);

  const transactions = await getTransactionsInRange(
    familyId,
    monthStart,
    monthEnd,
  );

  // Get previous month for comparison
  const prevMonthStart = new Date(monthStart);
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
  const prevMonthEnd = new Date(monthStart);
  prevMonthEnd.setDate(0);

  const previousTransactions = await getTransactionsInRange(
    familyId,
    prevMonthStart,
    prevMonthEnd,
  );

  // Calculate summaries
  const summary = calculateSummary(transactions);
  const previousSummary = calculateSummary(previousTransactions);
  const categoryBreakdown = calculateCategoryBreakdown(
    transactions,
    previousTransactions,
  );

  // Get budget for comparison
  const budget = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
    `BUDGET#${month}`,
  );
  const budgetComparison = budget ? compareToBudget(summary, budget) : null;

  // Generate insights
  const aiInsights = generateInsights(
    summary,
    previousSummary,
    categoryBreakdown,
    budgetComparison,
  );

  return successResponse(
    {
      period: { month, type: "monthly" },
      summary,
      comparison: {
        previousMonth: previousSummary,
        spendingChange: calculatePercentChange(
          summary.totalSpent,
          previousSummary.totalSpent,
        ),
        savingsChange: calculatePercentChange(
          summary.savingsRate,
          previousSummary.savingsRate,
        ),
      },
      categoryBreakdown,
      budgetComparison,
      insights: aiInsights,
    },
    "Monthly insights retrieved successfully",
  );
}

/**
 * Get spending trends over time
 * GET /insights/trends
 */
async function getSpendingTrends(event, user) {
  const permissionError = checkPermission(event, "budget:view");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const queryParams = event.queryStringParameters || {};
  const months = parseInt(queryParams.months, 10) || 6;

  logger.info("Getting spending trends", { familyId, months });

  // Get data for each month
  const trends = [];
  const categoryTrends = {};
  const today = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = new Date(today);
    monthDate.setMonth(monthDate.getMonth() - i);
    const month = monthDate.toISOString().substring(0, 7);

    const monthStart = new Date(`${month}-01`);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);

    const transactions = await getTransactionsInRange(
      familyId,
      monthStart,
      monthEnd,
    );
    const summary = calculateSummary(transactions);

    trends.push({
      month,
      label: monthDate.toLocaleDateString("en-US", { month: "short" }),
      spending: summary.totalSpent,
      income: summary.totalIncome,
      savings: summary.totalIncome - summary.totalSpent,
      savingsRate: summary.savingsRate,
      transactionCount: transactions.length,
    });

    // Track category trends
    const categoryTotals = calculateCategoryTotals(transactions);
    for (const [category, amount] of Object.entries(categoryTotals)) {
      if (!categoryTrends[category]) {
        categoryTrends[category] = [];
      }
      categoryTrends[category].push({ month, amount });
    }
  }

  // Calculate trend direction
  const trendAnalysis = analyzeTrends(trends);

  return successResponse(
    {
      months: trends.map((t) => t.label),
      spending: trends.map((t) => t.spending),
      income: trends.map((t) => t.income),
      savings: trends.map((t) => t.savings),
      savingsRate: trends.map((t) => t.savingsRate),
      categoryTrends,
      analysis: trendAnalysis,
    },
    "Spending trends retrieved successfully",
  );
}

/**
 * Get spending patterns
 * GET /insights/patterns
 */
async function getSpendingPatterns(event, user) {
  const permissionError = checkPermission(event, "budget:view");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  logger.info("Getting spending patterns", { familyId });

  // Get last 90 days of transactions
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 90);

  const transactions = await getTransactionsInRange(familyId, startDate, today);

  // Analyze patterns
  const dayOfWeekPattern = analyzeDayOfWeekPattern(transactions);
  const timeOfMonthPattern = analyzeTimeOfMonthPattern(transactions);
  const merchantPattern = analyzeMerchantPattern(transactions);
  const categoryPattern = analyzeCategoryPattern(transactions);

  return successResponse(
    {
      period: { days: 90, start: startDate.toISOString().split("T")[0] },
      patterns: {
        dayOfWeek: dayOfWeekPattern,
        timeOfMonth: timeOfMonthPattern,
        topMerchants: merchantPattern,
        categoryDistribution: categoryPattern,
      },
      insights: generatePatternInsights(
        dayOfWeekPattern,
        timeOfMonthPattern,
        merchantPattern,
      ),
    },
    "Spending patterns retrieved successfully",
  );
}

/**
 * Ask AI about spending
 * POST /insights/ask
 */
async function askAboutSpending(event, user) {
  const permissionError = checkPermission(event, "budget:view");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const body = parseRequestBody(event.body);

  if (!body.question) {
    return errorResponse.badRequest("Question is required");
  }

  logger.info("Processing spending question", {
    familyId,
    question: body.question,
  });

  // Get recent transactions for context
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);

  const transactions = await getTransactionsInRange(familyId, startDate, today);
  const summary = calculateSummary(transactions);
  const categoryBreakdown = calculateCategoryTotals(transactions);
  const patterns = identifyPatterns(transactions);

  // Use AI-powered response with Bedrock (falls back to simple if unavailable)
  const useAI = body.useAI !== false; // Default to using AI
  let response;

  if (useAI) {
    response = await generateAIResponseWithBedrock(
      body.question,
      summary,
      categoryBreakdown,
      patterns,
    );
  } else {
    response = generateAIResponse(body.question, summary, categoryBreakdown);
  }

  return successResponse(
    {
      question: body.question,
      answer: response,
      aiPowered: useAI,
      context: {
        period: "30 days",
        transactionCount: transactions.length,
        totalSpent: summary.totalSpent,
      },
    },
    "Question answered successfully",
  );
}

// ============ Helper Functions ============

/**
 * Get transactions in a date range
 */
async function getTransactionsInRange(familyId, startDate, endDate) {
  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  const transactions = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
    FilterExpression:
      "entityType = :entityType AND #date >= :start AND #date <= :end",
    ExpressionAttributeNames: { "#date": "date" },
    ExpressionAttributeValues: {
      ":entityType": "TRANSACTION",
      ":start": startStr,
      ":end": endStr,
    },
  });

  return transactions;
}

/**
 * Calculate summary statistics
 */
function calculateSummary(transactions) {
  const expenses = transactions.filter((t) => t.type === "expense");
  const income = transactions.filter((t) => t.type === "income");

  const totalSpent = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalIncome = income.reduce((sum, t) => sum + (t.amount || 0), 0);
  const savingsRate =
    totalIncome > 0 ? ((totalIncome - totalSpent) / totalIncome) * 100 : 0;

  return {
    totalSpent: Math.round(totalSpent * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    transactionCount: transactions.length,
    expenseCount: expenses.length,
    incomeCount: income.length,
    avgTransaction:
      expenses.length > 0
        ? Math.round((totalSpent / expenses.length) * 100) / 100
        : 0,
    savingsRate: Math.round(savingsRate * 10) / 10,
  };
}

/**
 * Calculate category totals
 */
function calculateCategoryTotals(transactions) {
  const totals = {};
  const expenses = transactions.filter((t) => t.type === "expense");

  for (const t of expenses) {
    const category = t.categoryName || "Uncategorized";
    totals[category] = (totals[category] || 0) + (t.amount || 0);
  }

  return totals;
}

/**
 * Calculate category breakdown with comparison
 */
function calculateCategoryBreakdown(current, previous) {
  const currentTotals = calculateCategoryTotals(current);
  const previousTotals = calculateCategoryTotals(previous);
  const totalSpent = Object.values(currentTotals).reduce((a, b) => a + b, 0);

  const breakdown = [];
  for (const [category, amount] of Object.entries(currentTotals)) {
    const prevAmount = previousTotals[category] || 0;
    const change = calculatePercentChange(amount, prevAmount);

    breakdown.push({
      category,
      amount: Math.round(amount * 100) / 100,
      percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0,
      previousAmount: Math.round(prevAmount * 100) / 100,
      change,
      trend: change > 5 ? "up" : change < -5 ? "down" : "stable",
    });
  }

  return breakdown.sort((a, b) => b.amount - a.amount);
}

/**
 * Calculate percent change
 */
function calculatePercentChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Get start of week (Sunday)
 */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Compare spending to budget
 */
function compareToBudget(summary, budget) {
  if (!budget || !budget.groups) return null;

  const plannedExpenses = budget.totalExpenses || 0;
  const plannedIncome = budget.totalIncome || 0;

  return {
    plannedExpenses,
    actualExpenses: summary.totalSpent,
    expenseVariance: summary.totalSpent - plannedExpenses,
    expenseVariancePercent:
      plannedExpenses > 0
        ? Math.round(
            ((summary.totalSpent - plannedExpenses) / plannedExpenses) * 100,
          )
        : 0,
    plannedIncome,
    actualIncome: summary.totalIncome,
    incomeVariance: summary.totalIncome - plannedIncome,
    onTrack: summary.totalSpent <= plannedExpenses,
  };
}

/**
 * Generate insights based on data
 */
function generateInsights(
  summary,
  previousSummary,
  categoryBreakdown,
  budgetComparison = null,
) {
  const insights = [];

  // Spending change insight
  const spendingChange = calculatePercentChange(
    summary.totalSpent,
    previousSummary.totalSpent,
  );
  if (Math.abs(spendingChange) > 10) {
    insights.push({
      type: spendingChange > 0 ? "alert" : "positive",
      icon: spendingChange > 0 ? "⚠️" : "🎉",
      title: `Spending ${spendingChange > 0 ? "up" : "down"} ${Math.abs(spendingChange)}%`,
      message: `You spent $${summary.totalSpent.toFixed(2)} this period, ${spendingChange > 0 ? "more" : "less"} than the previous period.`,
      actionable:
        spendingChange > 0
          ? "Review your recent purchases to identify areas to cut back."
          : null,
    });
  }

  // Savings rate insight
  if (summary.savingsRate >= 20) {
    insights.push({
      type: "positive",
      icon: "💰",
      title: "Great savings rate!",
      message: `You're saving ${summary.savingsRate.toFixed(1)}% of your income, above the recommended 20%.`,
    });
  } else if (summary.savingsRate < 10 && summary.totalIncome > 0) {
    insights.push({
      type: "tip",
      icon: "💡",
      title: "Savings opportunity",
      message: `Your savings rate is ${summary.savingsRate.toFixed(1)}%. Try to save at least 20% of your income.`,
      actionable:
        "Look for subscriptions or recurring expenses you can reduce.",
    });
  }

  // Top spending category insight
  if (categoryBreakdown.length > 0) {
    const topCategory = categoryBreakdown[0];
    if (topCategory.percentage > 40) {
      insights.push({
        type: "info",
        icon: "📊",
        title: `${topCategory.category} is your top expense`,
        message: `${topCategory.percentage}% of your spending ($${topCategory.amount.toFixed(2)}) went to ${topCategory.category}.`,
      });
    }
  }

  // Category with biggest increase
  const increasedCategories = categoryBreakdown.filter((c) => c.change > 20);
  if (increasedCategories.length > 0) {
    const biggest = increasedCategories[0];
    insights.push({
      type: "alert",
      icon: "📈",
      title: `${biggest.category} spending increased ${biggest.change}%`,
      message: `You spent $${biggest.amount.toFixed(2)} on ${biggest.category}, up from $${biggest.previousAmount.toFixed(2)}.`,
      actionable: `Review your ${biggest.category} expenses for potential savings.`,
    });
  }

  // Budget comparison insight
  if (budgetComparison) {
    if (budgetComparison.onTrack) {
      insights.push({
        type: "positive",
        icon: "✅",
        title: "On track with budget",
        message: `You've spent $${summary.totalSpent.toFixed(2)} of your $${budgetComparison.plannedExpenses.toFixed(2)} budget.`,
      });
    } else {
      insights.push({
        type: "alert",
        icon: "🚨",
        title: "Over budget",
        message: `You've exceeded your budget by $${Math.abs(budgetComparison.expenseVariance).toFixed(2)} (${Math.abs(budgetComparison.expenseVariancePercent)}%).`,
        actionable:
          "Review your spending and adjust your budget for next month.",
      });
    }
  }

  return insights;
}

/**
 * Identify spending patterns
 */
function identifyPatterns(transactions) {
  const expenses = transactions.filter((t) => t.type === "expense");
  if (expenses.length === 0) return {};

  // Peak spending day
  const dayTotals = {};
  for (const t of expenses) {
    const day = new Date(t.date).toLocaleDateString("en-US", {
      weekday: "long",
    });
    dayTotals[day] = (dayTotals[day] || 0) + t.amount;
  }
  const peakDay = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0];

  // Top merchant
  const merchantCounts = {};
  for (const t of expenses) {
    const merchant = t.merchant || t.description || "Unknown";
    merchantCounts[merchant] = (merchantCounts[merchant] || 0) + 1;
  }
  const topMerchant = Object.entries(merchantCounts).sort(
    (a, b) => b[1] - a[1],
  )[0];

  return {
    peakSpendingDay: peakDay ? peakDay[0] : null,
    peakSpendingAmount: peakDay ? Math.round(peakDay[1] * 100) / 100 : 0,
    topMerchant: topMerchant ? topMerchant[0] : null,
    topMerchantCount: topMerchant ? topMerchant[1] : 0,
    avgTransactionSize:
      Math.round(
        (expenses.reduce((s, t) => s + t.amount, 0) / expenses.length) * 100,
      ) / 100,
  };
}

/**
 * Analyze day of week spending pattern
 */
function analyzeDayOfWeekPattern(transactions) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const pattern = days.map((day) => ({ day, total: 0, count: 0 }));

  for (const t of transactions.filter((t) => t.type === "expense")) {
    const dayIndex = new Date(t.date).getDay();
    pattern[dayIndex].total += t.amount || 0;
    pattern[dayIndex].count += 1;
  }

  return pattern.map((p) => ({
    ...p,
    total: Math.round(p.total * 100) / 100,
    average: p.count > 0 ? Math.round((p.total / p.count) * 100) / 100 : 0,
  }));
}

/**
 * Analyze time of month spending pattern
 */
function analyzeTimeOfMonthPattern(transactions) {
  const periods = [
    { name: "Beginning (1-10)", start: 1, end: 10, total: 0, count: 0 },
    { name: "Middle (11-20)", start: 11, end: 20, total: 0, count: 0 },
    { name: "End (21-31)", start: 21, end: 31, total: 0, count: 0 },
  ];

  for (const t of transactions.filter((t) => t.type === "expense")) {
    const day = new Date(t.date).getDate();
    const period = periods.find((p) => day >= p.start && day <= p.end);
    if (period) {
      period.total += t.amount || 0;
      period.count += 1;
    }
  }

  return periods.map((p) => ({
    period: p.name,
    total: Math.round(p.total * 100) / 100,
    count: p.count,
    percentage: 0, // Will be calculated
  }));
}

/**
 * Analyze merchant pattern
 */
function analyzeMerchantPattern(transactions) {
  const merchants = {};
  for (const t of transactions.filter((t) => t.type === "expense")) {
    const merchant = t.merchant || t.description || "Unknown";
    if (!merchants[merchant]) {
      merchants[merchant] = { name: merchant, total: 0, count: 0 };
    }
    merchants[merchant].total += t.amount || 0;
    merchants[merchant].count += 1;
  }

  return Object.values(merchants)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((m) => ({
      ...m,
      total: Math.round(m.total * 100) / 100,
    }));
}

/**
 * Analyze category pattern
 */
function analyzeCategoryPattern(transactions) {
  const totals = calculateCategoryTotals(transactions);
  const total = Object.values(totals).reduce((a, b) => a + b, 0);

  return Object.entries(totals)
    .map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Analyze trends
 */
function analyzeTrends(trends) {
  if (trends.length < 2)
    return { direction: "stable", message: "Not enough data" };

  const recent = trends.slice(-3);
  const avgRecent = recent.reduce((s, t) => s + t.spending, 0) / recent.length;
  const older = trends.slice(0, -3);
  const avgOlder =
    older.length > 0
      ? older.reduce((s, t) => s + t.spending, 0) / older.length
      : avgRecent;

  const change = calculatePercentChange(avgRecent, avgOlder);

  return {
    direction:
      change > 5 ? "increasing" : change < -5 ? "decreasing" : "stable",
    changePercent: change,
    message:
      change > 5
        ? `Spending has increased ${change}% recently`
        : change < -5
          ? `Spending has decreased ${Math.abs(change)}% recently`
          : "Spending has been stable",
  };
}

/**
 * Generate pattern insights
 */
function generatePatternInsights(dayPattern, timePattern, merchantPattern) {
  const insights = [];

  // Peak spending day
  const peakDay = dayPattern.reduce(
    (max, d) => (d.total > max.total ? d : max),
    dayPattern[0],
  );
  if (peakDay.total > 0) {
    insights.push({
      type: "info",
      icon: "📅",
      title: `${peakDay.day} is your biggest spending day`,
      message: `You typically spend $${peakDay.total.toFixed(2)} on ${peakDay.day}s.`,
    });
  }

  // Top merchant
  if (merchantPattern.length > 0) {
    const top = merchantPattern[0];
    insights.push({
      type: "info",
      icon: "🏪",
      title: `${top.name} is your most visited merchant`,
      message: `You've made ${top.count} purchases totaling $${top.total.toFixed(2)}.`,
    });
  }

  return insights;
}

/**
 * Generate AI response (simplified)
 */
function generateAIResponse(question, summary, categoryBreakdown) {
  const q = question.toLowerCase();

  if (q.includes("spend") && q.includes("most")) {
    const topCategories = Object.entries(categoryBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    return `Your top spending categories are: ${topCategories.map(([c, a]) => `${c} ($${a.toFixed(2)})`).join(", ")}.`;
  }

  if (q.includes("save") || q.includes("saving")) {
    return `Your current savings rate is ${summary.savingsRate.toFixed(1)}%. ${summary.savingsRate >= 20 ? "Great job!" : "Try to aim for at least 20%."}`;
  }

  if (q.includes("total") || q.includes("how much")) {
    return `In the last 30 days, you spent $${summary.totalSpent.toFixed(2)} across ${summary.expenseCount} transactions.`;
  }

  return `Based on your recent activity: You spent $${summary.totalSpent.toFixed(2)} with an average transaction of $${summary.avgTransaction.toFixed(2)}. Your savings rate is ${summary.savingsRate.toFixed(1)}%.`;
}

// ============ AWS Bedrock AI Functions ============

/**
 * Generate AI response using AWS Bedrock
 * Falls back to simple response if Bedrock is unavailable
 */
async function generateAIResponseWithBedrock(
  question,
  summary,
  categoryBreakdown,
  patterns = null,
) {
  try {
    // Build context for AI
    const context = buildAIContext(summary, categoryBreakdown, patterns);

    const prompt = `You are a helpful financial advisor assistant for BudgetBuddy, a personal budgeting app.
Based on the user's spending data below, answer their question concisely and helpfully.
Keep your response under 150 words and focus on actionable advice.

User's Financial Data:
${context}

User's Question: ${question}

Provide a helpful, personalized response:`;

    const response = await invokeBedrockModel(prompt);
    return response;
  } catch (error) {
    logger.warn("Bedrock AI unavailable, using fallback", {
      error: error.message,
    });
    return generateAIResponse(question, summary, categoryBreakdown);
  }
}

/**
 * Build context string for AI from spending data
 */
function buildAIContext(summary, categoryBreakdown, patterns) {
  let context = `- Total spent (30 days): $${summary.totalSpent.toFixed(2)}
- Total income: $${summary.totalIncome.toFixed(2)}
- Savings rate: ${summary.savingsRate.toFixed(1)}%
- Transaction count: ${summary.transactionCount}
- Average transaction: $${summary.avgTransaction.toFixed(2)}

Top spending categories:`;

  const topCategories = Object.entries(categoryBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  for (const [category, amount] of topCategories) {
    context += `\n- ${category}: $${amount.toFixed(2)}`;
  }

  if (patterns) {
    if (patterns.peakSpendingDay) {
      context += `\n\nSpending patterns:`;
      context += `\n- Peak spending day: ${patterns.peakSpendingDay}`;
    }
    if (patterns.topMerchant) {
      context += `\n- Most visited merchant: ${patterns.topMerchant} (${patterns.topMerchantCount} visits)`;
    }
  }

  return context;
}

/**
 * Invoke AWS Bedrock model
 */
async function invokeBedrockModel(prompt) {
  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  };

  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });

  const response = await bedrockClient.send(command);
  // Use Buffer for Node.js environment
  const responseBody = JSON.parse(Buffer.from(response.body).toString("utf-8"));

  return responseBody.content[0].text;
}

/**
 * Generate personalized AI insights using Bedrock
 */
async function generateAIInsights(
  summary,
  previousSummary,
  categoryBreakdown,
  budgetComparison = null,
) {
  try {
    const spendingChange = calculatePercentChange(
      summary.totalSpent,
      previousSummary.totalSpent,
    );

    const prompt = `You are a financial advisor for BudgetBuddy. Generate 2-3 personalized, actionable insights based on this spending data.
Format each insight as a JSON object with: type (positive/alert/tip/info), icon (emoji), title (short), message (1-2 sentences), actionable (optional action to take).

Spending Data:
- Current period spending: $${summary.totalSpent.toFixed(2)}
- Previous period spending: $${previousSummary.totalSpent.toFixed(2)}
- Change: ${spendingChange}%
- Savings rate: ${summary.savingsRate.toFixed(1)}%
- Income: $${summary.totalIncome.toFixed(2)}
${budgetComparison ? `- Budget: $${budgetComparison.plannedExpenses.toFixed(2)} (${budgetComparison.onTrack ? "on track" : "over budget"})` : ""}

Top categories:
${categoryBreakdown
  .slice(0, 5)
  .map(
    (c) =>
      `- ${c.category}: $${c.amount.toFixed(2)} (${c.change > 0 ? "+" : ""}${c.change}% vs last period)`,
  )
  .join("\n")}

Return ONLY a JSON array of insight objects, no other text:`;

    const response = await invokeBedrockModel(prompt);

    // Parse AI response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const aiInsights = JSON.parse(jsonMatch[0]);
      return aiInsights.slice(0, 3); // Limit to 3 insights
    }

    // Fallback if parsing fails
    return generateInsights(
      summary,
      previousSummary,
      categoryBreakdown,
      budgetComparison,
    );
  } catch (error) {
    logger.warn("AI insights generation failed, using fallback", {
      error: error.message,
    });
    return generateInsights(
      summary,
      previousSummary,
      categoryBreakdown,
      budgetComparison,
    );
  }
}

/**
 * Generate weekly insight summary for notifications
 * @param {string} familyId - Family ID
 * @returns {Object} Weekly insight summary
 */
async function generateWeeklyInsightSummary(familyId) {
  try {
    const today = new Date();
    const weekStart = getWeekStart(today);
    const weekEnd = new Date(today);

    const transactions = await getTransactionsInRange(
      familyId,
      weekStart,
      weekEnd,
    );
    const previousWeekTransactions = await getTransactionsInRange(
      familyId,
      new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000),
      new Date(weekStart.getTime() - 1),
    );

    const summary = calculateSummary(transactions);
    const previousSummary = calculateSummary(previousWeekTransactions);
    const spendingChange = calculatePercentChange(
      summary.totalSpent,
      previousSummary.totalSpent,
    );

    // Generate a concise weekly summary
    let summaryText = `This week: $${summary.totalSpent.toFixed(2)} spent`;
    if (Math.abs(spendingChange) > 5) {
      summaryText += ` (${spendingChange > 0 ? "↑" : "↓"}${Math.abs(spendingChange)}% vs last week)`;
    }
    summaryText += `. Savings rate: ${summary.savingsRate.toFixed(0)}%`;

    // Determine notification type
    let notificationType = "info";
    if (summary.savingsRate >= 20) {
      notificationType = "positive";
    } else if (spendingChange > 20 || summary.savingsRate < 5) {
      notificationType = "alert";
    }

    return {
      title: "📊 Weekly Spending Summary",
      body: summaryText,
      type: notificationType,
      data: {
        totalSpent: summary.totalSpent,
        spendingChange,
        savingsRate: summary.savingsRate,
        transactionCount: summary.transactionCount,
      },
    };
  } catch (error) {
    logger.error("Error generating weekly insight summary", error, {
      familyId,
    });
    throw error;
  }
}

// Export functions for use by other services
module.exports.generateWeeklyInsightSummary = generateWeeklyInsightSummary;
module.exports.generateAIInsights = generateAIInsights;
module.exports.generateAIResponseWithBedrock = generateAIResponseWithBedrock;
