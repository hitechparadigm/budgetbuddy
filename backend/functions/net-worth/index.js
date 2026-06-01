/**
 * BudgetBuddy Net Worth Lambda Function
 *
 * Handles assets, liabilities, and net worth tracking.
 * Supports manual entry, history tracking, and net worth calculations.
 *
 * Version: 1.0.0
 * **Validates: Requirement 41.1, 41.2, 41.3** - Net worth tracking
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


// Asset categories
const ASSET_CATEGORIES = [
  { id: "cash", name: "Cash & Savings", icon: "💵" },
  { id: "investments", name: "Investments", icon: "📈" },
  { id: "retirement", name: "Retirement Accounts", icon: "🏦" },
  { id: "real_estate", name: "Real Estate", icon: "🏠" },
  { id: "vehicles", name: "Vehicles", icon: "🚗" },
  { id: "other_assets", name: "Other Assets", icon: "💎" },
];

// Liability categories
const LIABILITY_CATEGORIES = [
  { id: "mortgage", name: "Mortgage", icon: "🏠" },
  { id: "auto_loan", name: "Auto Loan", icon: "🚗" },
  { id: "student_loan", name: "Student Loans", icon: "🎓" },
  { id: "credit_card", name: "Credit Cards", icon: "💳" },
  { id: "personal_loan", name: "Personal Loans", icon: "📝" },
  { id: "other_debt", name: "Other Debt", icon: "📋" },
];

/**
 * Main Lambda handler for net worth operations
 */
exports.handler = async (event, context) => {
  logger.info("Net Worth request received", {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context.awsRequestId,
  });

  try {
    const { httpMethod, path, pathParameters } = event;

    // Health check endpoint
    if (httpMethod === "GET" && path === "/net-worth/health") {
      return successResponse(
        { status: "healthy", service: "net-worth", version: "1.0.0" },
        "Net Worth service is healthy",
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
    if (httpMethod === "GET" && path === "/net-worth") {
      return await getNetWorth(event, user);
    }

    if (httpMethod === "GET" && path === "/net-worth/summary") {
      return await getNetWorthSummary(event, user);
    }

    if (httpMethod === "GET" && path === "/net-worth/history") {
      return await getNetWorthHistory(event, user);
    }

    if (httpMethod === "GET" && path === "/net-worth/categories") {
      return await getCategories();
    }

    // Assets routes
    if (httpMethod === "GET" && path === "/net-worth/assets") {
      return await getAssets(event, user);
    }

    if (httpMethod === "POST" && path === "/net-worth/assets") {
      return await createAsset(event, user);
    }

    if (httpMethod === "PUT" && pathParameters?.assetId) {
      return await updateAsset(event, user, pathParameters.assetId);
    }

    if (httpMethod === "DELETE" && pathParameters?.assetId) {
      return await deleteAsset(event, user, pathParameters.assetId);
    }

    // Liabilities routes
    if (httpMethod === "GET" && path === "/net-worth/liabilities") {
      return await getLiabilities(event, user);
    }

    if (httpMethod === "POST" && path === "/net-worth/liabilities") {
      return await createLiability(event, user);
    }

    if (httpMethod === "PUT" && pathParameters?.liabilityId) {
      return await updateLiability(event, user, pathParameters.liabilityId);
    }

    if (httpMethod === "DELETE" && pathParameters?.liabilityId) {
      return await deleteLiability(event, user, pathParameters.liabilityId);
    }

    return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);
  } catch (error) {
    logger.error("Net Worth function error", error, {
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
 * Get complete net worth with assets and liabilities
 * GET /net-worth
 * **Validates: Requirement 41.1, 41.3, 45.8** - View net worth with investments
 */
async function getNetWorth(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);

  logger.info("Getting net worth", { budgetId });

  // Get all assets
  const assets = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
    FilterExpression:
      "entityType = :entityType AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
    ExpressionAttributeValues: {
      ":entityType": "ASSET",
      ":false": false,
    },
  });

  // Get all liabilities
  const liabilities = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
    FilterExpression:
      "entityType = :entityType AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
    ExpressionAttributeValues: {
      ":entityType": "LIABILITY",
      ":false": false,
    },
  });

  // Get investment holdings for the user
  const investmentValue = await getInvestmentValue(user.userId);

  // Calculate totals (include investment value in assets)
  const manualAssets = assets.reduce((sum, a) => sum + (a.value || 0), 0);
  const totalAssets = manualAssets + investmentValue;
  const totalLiabilities = liabilities.reduce(
    (sum, l) => sum + (l.balance || 0),
    0,
  );
  const netWorth = totalAssets - totalLiabilities;

  // Group by category
  const assetsByCategory = groupByCategory(
    assets,
    "category",
    ASSET_CATEGORIES,
  );

  // Add investment value to investments category
  if (investmentValue > 0) {
    assetsByCategory.investments.total += investmentValue;
    assetsByCategory.investments.investmentValue = investmentValue;
  }

  const liabilitiesByCategory = groupByCategory(
    liabilities,
    "category",
    LIABILITY_CATEGORIES,
  );

  return successResponse(
    {
      netWorth: Math.round(netWorth * 100) / 100,
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      investmentValue: Math.round(investmentValue * 100) / 100,
      assets: assets.map(formatAssetResponse),
      liabilities: liabilities.map(formatLiabilityResponse),
      assetsByCategory,
      liabilitiesByCategory,
      lastUpdated: new Date().toISOString(),
    },
    "Net worth retrieved successfully",
  );
}

/**
 * Get net worth summary
 * GET /net-worth/summary
 * **Validates: Requirement 45.8** - Include investments in net worth
 */
async function getNetWorthSummary(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);

  // Get all assets
  const assets = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
    FilterExpression:
      "entityType = :entityType AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
    ExpressionAttributeValues: {
      ":entityType": "ASSET",
      ":false": false,
    },
  });

  // Get all liabilities
  const liabilities = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
    FilterExpression:
      "entityType = :entityType AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
    ExpressionAttributeValues: {
      ":entityType": "LIABILITY",
      ":false": false,
    },
  });

  // Get investment holdings for the user
  const investmentValue = await getInvestmentValue(user.userId);

  // Calculate totals (include investment value in assets)
  const manualAssets = assets.reduce((sum, a) => sum + (a.value || 0), 0);
  const totalAssets = manualAssets + investmentValue;
  const totalLiabilities = liabilities.reduce(
    (sum, l) => sum + (l.balance || 0),
    0,
  );
  const netWorth = totalAssets - totalLiabilities;

  // Get last month's snapshot for comparison
  const lastMonth = getLastMonthKey();
  const lastSnapshot = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `NETWORTH_SNAPSHOT#${lastMonth}`,
  );

  let monthlyChange = null;
  let monthlyChangePercent = null;
  if (lastSnapshot) {
    monthlyChange = netWorth - lastSnapshot.netWorth;
    monthlyChangePercent =
      lastSnapshot.netWorth !== 0
        ? Math.round((monthlyChange / Math.abs(lastSnapshot.netWorth)) * 100)
        : 0;
  }

  return successResponse(
    {
      netWorth: Math.round(netWorth * 100) / 100,
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      investmentValue: Math.round(investmentValue * 100) / 100,
      assetCount: assets.length,
      liabilityCount: liabilities.length,
      monthlyChange:
        monthlyChange !== null ? Math.round(monthlyChange * 100) / 100 : null,
      monthlyChangePercent,
      trend: monthlyChange > 0 ? "up" : monthlyChange < 0 ? "down" : "stable",
    },
    "Net worth summary retrieved successfully",
  );
}

/**
 * Get net worth history
 * GET /net-worth/history
 * **Validates: Requirement 41.4, 41.7** - History tracking
 */
async function getNetWorthHistory(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);

  const queryParams = event.queryStringParameters || {};
  const months = parseInt(queryParams.months, 10) || 12;

  // Get snapshots
  const snapshots = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
    FilterExpression: "entityType = :entityType",
    ExpressionAttributeValues: {
      ":entityType": "NETWORTH_SNAPSHOT",
    },
  });

  // Sort by month and limit
  const sortedSnapshots = snapshots
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, months);

  // Format for chart
  const history = sortedSnapshots.reverse().map((s) => ({
    month: s.month,
    label: formatMonthLabel(s.month),
    netWorth: s.netWorth,
    totalAssets: s.totalAssets,
    totalLiabilities: s.totalLiabilities,
  }));

  return successResponse(
    {
      history,
      months: history.map((h) => h.label),
      netWorthValues: history.map((h) => h.netWorth),
      assetValues: history.map((h) => h.totalAssets),
      liabilityValues: history.map((h) => h.totalLiabilities),
    },
    "Net worth history retrieved successfully",
  );
}

/**
 * Get asset and liability categories
 * GET /net-worth/categories
 */
async function getCategories() {
  return successResponse(
    {
      assetCategories: ASSET_CATEGORIES,
      liabilityCategories: LIABILITY_CATEGORIES,
    },
    "Categories retrieved successfully",
  );
}

/**
 * Get all assets
 * GET /net-worth/assets
 */
async function getAssets(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);

  const assets = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
    FilterExpression:
      "entityType = :entityType AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
    ExpressionAttributeValues: {
      ":entityType": "ASSET",
      ":false": false,
    },
  });

  const totalValue = assets.reduce((sum, a) => sum + (a.value || 0), 0);

  return successResponse(
    {
      assets: assets.map(formatAssetResponse),
      count: assets.length,
      totalValue: Math.round(totalValue * 100) / 100,
    },
    "Assets retrieved successfully",
  );
}

/**
 * Create a new asset
 * POST /net-worth/assets
 * **Validates: Requirement 41.2** - Add assets
 */
async function createAsset(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'transaction.create', budgetStatus);

  const body = parseRequestBody(event.body);

  // Validation
  if (!body.name) {
    return errorResponse.badRequest("Asset name is required");
  }
  if (typeof body.value !== "number" || body.value < 0) {
    return errorResponse.badRequest("Valid asset value is required");
  }

  const assetId = generateId("asset");
  const currentTime = new Date().toISOString();

  const asset = {
    PK: `BUDGET#${budgetId}`,
    SK: `ASSET#${assetId}`,
    entityType: "ASSET",
    assetId,
    budgetId,
    name: body.name,
    value: body.value,
    category: body.category || "other_assets",
    institution: body.institution || null,
    accountNumber: body.accountNumber
      ? maskAccountNumber(body.accountNumber)
      : null,
    notes: body.notes || null,
    createdBy: user.userId,
    createdAt: currentTime,
    updatedAt: currentTime,
  };

  await dynamoHelpers.putItem(asset);

  // Update net worth snapshot
  await updateNetWorthSnapshot(budgetId, user.userId);

  logger.info("Asset created", { assetId, budgetId, name: body.name });

  return successResponse(
    formatAssetResponse(asset),
    "Asset created successfully",
    201,
  );
}

/**
 * Update an asset
 * PUT /net-worth/assets/{assetId}
 * **Validates: Requirement 41.5** - Manual value updates
 */
async function updateAsset(event, user, assetId) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  const body = parseRequestBody(event.body);

  const existing = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `ASSET#${assetId}`,
  );

  if (!existing || existing.isDeleted) {
    return errorResponse.notFound("Asset not found");
  }

  const updates = { updatedAt: new Date().toISOString() };

  if (body.name) updates.name = body.name;
  if (typeof body.value === "number") updates.value = body.value;
  if (body.category) updates.category = body.category;
  if (body.institution !== undefined) updates.institution = body.institution;
  if (body.notes !== undefined) updates.notes = body.notes;

  const updated = await dynamoHelpers.updateItem(
    `BUDGET#${budgetId}`,
    `ASSET#${assetId}`,
    updates,
  );

  // Update net worth snapshot
  await updateNetWorthSnapshot(budgetId, user.userId);

  logger.info("Asset updated", { assetId, budgetId });

  return successResponse(
    formatAssetResponse(updated),
    "Asset updated successfully",
  );
}

/**
 * Delete an asset
 * DELETE /net-worth/assets/{assetId}
 */
async function deleteAsset(event, user, assetId) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  const existing = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `ASSET#${assetId}`,
  );

  if (!existing || existing.isDeleted) {
    return errorResponse.notFound("Asset not found");
  }

  await dynamoHelpers.updateItem(`BUDGET#${budgetId}`, `ASSET#${assetId}`, {
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    deletedBy: user.userId,
  });

  // Update net worth snapshot
  await updateNetWorthSnapshot(budgetId, user.userId);

  logger.info("Asset deleted", { assetId, budgetId });

  return successResponse(null, "Asset deleted successfully");
}

/**
 * Get all liabilities
 * GET /net-worth/liabilities
 */
async function getLiabilities(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);

  const liabilities = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
    FilterExpression:
      "entityType = :entityType AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
    ExpressionAttributeValues: {
      ":entityType": "LIABILITY",
      ":false": false,
    },
  });

  const totalBalance = liabilities.reduce(
    (sum, l) => sum + (l.balance || 0),
    0,
  );

  return successResponse(
    {
      liabilities: liabilities.map(formatLiabilityResponse),
      count: liabilities.length,
      totalBalance: Math.round(totalBalance * 100) / 100,
    },
    "Liabilities retrieved successfully",
  );
}

/**
 * Create a new liability
 * POST /net-worth/liabilities
 * **Validates: Requirement 41.2** - Add liabilities
 */
async function createLiability(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'transaction.create', budgetStatus);

  const body = parseRequestBody(event.body);

  // Validation
  if (!body.name) {
    return errorResponse.badRequest("Liability name is required");
  }
  if (typeof body.balance !== "number" || body.balance < 0) {
    return errorResponse.badRequest("Valid balance is required");
  }

  const liabilityId = generateId("liab");
  const currentTime = new Date().toISOString();

  const liability = {
    PK: `BUDGET#${budgetId}`,
    SK: `LIABILITY#${liabilityId}`,
    entityType: "LIABILITY",
    liabilityId,
    budgetId,
    name: body.name,
    balance: body.balance,
    originalBalance: body.originalBalance || body.balance,
    interestRate: body.interestRate || 0,
    minimumPayment: body.minimumPayment || 0,
    category: body.category || "other_debt",
    lender: body.lender || null,
    accountNumber: body.accountNumber
      ? maskAccountNumber(body.accountNumber)
      : null,
    dueDate: body.dueDate || null,
    notes: body.notes || null,
    createdBy: user.userId,
    createdAt: currentTime,
    updatedAt: currentTime,
  };

  await dynamoHelpers.putItem(liability);

  // Update net worth snapshot
  await updateNetWorthSnapshot(budgetId, user.userId);

  logger.info("Liability created", { liabilityId, budgetId, name: body.name });

  return successResponse(
    formatLiabilityResponse(liability),
    "Liability created successfully",
    201,
  );
}

/**
 * Update a liability
 * PUT /net-worth/liabilities/{liabilityId}
 * **Validates: Requirement 41.5** - Manual value updates
 */
async function updateLiability(event, user, liabilityId) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  const body = parseRequestBody(event.body);

  const existing = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `LIABILITY#${liabilityId}`,
  );

  if (!existing || existing.isDeleted) {
    return errorResponse.notFound("Liability not found");
  }

  const updates = { updatedAt: new Date().toISOString() };

  if (body.name) updates.name = body.name;
  if (typeof body.balance === "number") updates.balance = body.balance;
  if (typeof body.interestRate === "number")
    updates.interestRate = body.interestRate;
  if (typeof body.minimumPayment === "number")
    updates.minimumPayment = body.minimumPayment;
  if (body.category) updates.category = body.category;
  if (body.lender !== undefined) updates.lender = body.lender;
  if (body.dueDate !== undefined) updates.dueDate = body.dueDate;
  if (body.notes !== undefined) updates.notes = body.notes;

  const updated = await dynamoHelpers.updateItem(
    `BUDGET#${budgetId}`,
    `LIABILITY#${liabilityId}`,
    updates,
  );

  // Update net worth snapshot
  await updateNetWorthSnapshot(budgetId, user.userId);

  logger.info("Liability updated", { liabilityId, budgetId });

  return successResponse(
    formatLiabilityResponse(updated),
    "Liability updated successfully",
  );
}

/**
 * Delete a liability
 * DELETE /net-worth/liabilities/{liabilityId}
 */
async function deleteLiability(event, user, liabilityId) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  const existing = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `LIABILITY#${liabilityId}`,
  );

  if (!existing || existing.isDeleted) {
    return errorResponse.notFound("Liability not found");
  }

  await dynamoHelpers.updateItem(
    `BUDGET#${budgetId}`,
    `LIABILITY#${liabilityId}`,
    {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: user.userId,
    },
  );

  // Update net worth snapshot
  await updateNetWorthSnapshot(budgetId, user.userId);

  logger.info("Liability deleted", { liabilityId, budgetId });

  return successResponse(null, "Liability deleted successfully");
}

// ============ Helper Functions ============

/**
 * Get total investment value for a user
 * **Validates: Requirement 45.8** - Include investments in net worth
 */
async function getInvestmentValue(userId) {
  try {
    // Query investment holdings
    const holdings = await dynamoHelpers.queryByPK(`USER#${userId}`, {
      FilterExpression: "begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":sk": "HOLDING#",
      },
    });

    if (!holdings || holdings.length === 0) {
      return 0;
    }

    // Calculate total value
    const totalValue = holdings.reduce((sum, holding) => {
      const value = (holding.shares || 0) * (holding.currentPrice || 0);
      return sum + value;
    }, 0);

    return totalValue;
  } catch (error) {
    logger.error("Error getting investment value", error, { userId });
    return 0; // Return 0 on error to not break net worth calculation
  }
}

/**
 * Update net worth snapshot for current month
 * **Validates: Requirement 45.8** - Include investments in snapshots
 */
async function updateNetWorthSnapshot(budgetId, userId) {
  try {
    const currentMonth = getCurrentMonthKey();

    // Get all assets
    const assets = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
      FilterExpression:
        "entityType = :entityType AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
      ExpressionAttributeValues: {
        ":entityType": "ASSET",
        ":false": false,
      },
    });

    // Get all liabilities
    const liabilities = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
      FilterExpression:
        "entityType = :entityType AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
      ExpressionAttributeValues: {
        ":entityType": "LIABILITY",
        ":false": false,
      },
    });

    // Get investment value if userId is provided
    let investmentValue = 0;
    if (userId) {
      investmentValue = await getInvestmentValue(userId);
    }

    const manualAssets = assets.reduce((sum, a) => sum + (a.value || 0), 0);
    const totalAssets = manualAssets + investmentValue;
    const totalLiabilities = liabilities.reduce(
      (sum, l) => sum + (l.balance || 0),
      0,
    );
    const netWorth = totalAssets - totalLiabilities;

    const snapshot = {
      PK: `BUDGET#${budgetId}`,
      SK: `NETWORTH_SNAPSHOT#${currentMonth}`,
      entityType: "NETWORTH_SNAPSHOT",
      budgetId,
      month: currentMonth,
      netWorth: Math.round(netWorth * 100) / 100,
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      investmentValue: Math.round(investmentValue * 100) / 100,
      assetCount: assets.length,
      liabilityCount: liabilities.length,
      updatedAt: new Date().toISOString(),
    };

    await dynamoHelpers.putItem(snapshot);

    logger.info("Net worth snapshot updated", {
      budgetId,
      month: currentMonth,
      netWorth,
      investmentValue,
    });
  } catch (error) {
    logger.error("Error updating net worth snapshot", error, { budgetId });
  }
}

/**
 * Group items by category
 */
function groupByCategory(items, categoryField, categoryList) {
  const grouped = {};

  for (const cat of categoryList) {
    grouped[cat.id] = {
      ...cat,
      items: [],
      total: 0,
    };
  }

  for (const item of items) {
    const catId = item[categoryField] || "other";
    if (grouped[catId]) {
      grouped[catId].items.push(item);
      grouped[catId].total += item.value || item.balance || 0;
    }
  }

  // Round totals
  for (const cat of Object.values(grouped)) {
    cat.total = Math.round(cat.total * 100) / 100;
  }

  return grouped;
}

/**
 * Get current month key (YYYY-MM)
 */
function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Get last month key (YYYY-MM)
 */
function getLastMonthKey() {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().slice(0, 7);
}

/**
 * Format month label
 */
function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

/**
 * Mask account number for security
 */
function maskAccountNumber(accountNumber) {
  if (!accountNumber || accountNumber.length < 4) return accountNumber;
  return "****" + accountNumber.slice(-4);
}

/**
 * Format asset for API response
 */
function formatAssetResponse(asset) {
  const category =
    ASSET_CATEGORIES.find((c) => c.id === asset.category) ||
    ASSET_CATEGORIES[5];

  return {
    assetId: asset.assetId,
    name: asset.name,
    value: asset.value,
    category: asset.category,
    categoryName: category.name,
    categoryIcon: category.icon,
    institution: asset.institution,
    accountNumber: asset.accountNumber,
    notes: asset.notes,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

/**
 * Format liability for API response
 */
function formatLiabilityResponse(liability) {
  const category =
    LIABILITY_CATEGORIES.find((c) => c.id === liability.category) ||
    LIABILITY_CATEGORIES[5];

  // Calculate payoff progress
  const payoffProgress =
    liability.originalBalance > 0
      ? Math.round(
          ((liability.originalBalance - liability.balance) /
            liability.originalBalance) *
            100,
        )
      : 0;

  return {
    liabilityId: liability.liabilityId,
    name: liability.name,
    balance: liability.balance,
    originalBalance: liability.originalBalance,
    interestRate: liability.interestRate,
    minimumPayment: liability.minimumPayment,
    category: liability.category,
    categoryName: category.name,
    categoryIcon: category.icon,
    lender: liability.lender,
    accountNumber: liability.accountNumber,
    dueDate: liability.dueDate,
    notes: liability.notes,
    payoffProgress,
    createdAt: liability.createdAt,
    updatedAt: liability.updatedAt,
  };
}
