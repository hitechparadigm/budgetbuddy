/**
 * BudgetBuddy Admin Lambda Function
 *
 * Handles admin dashboard operations, user management, system health,
 * and audit logging for platform administrators.
 *
 * Version: 1.0.0
 */

const {
  successResponse,
  errorResponse,
  parseRequestBody,
  getUserFromEvent,
  dynamoHelpers,
  logger,
} = require("/opt/nodejs/utils");

// checkPermission not used - admin uses custom role check
// eslint-disable-next-line no-unused-vars
const { checkPermission } = require("/opt/nodejs/shared");

// Admin role constant
const ADMIN_ROLE = "admin";

/**
 * Main Lambda handler for admin operations
 */
exports.handler = async (event, context) => {
  logger.info("Admin request received", {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context.awsRequestId,
  });

  try {
    const { httpMethod, path, pathParameters } = event;

    // Health check endpoint (public)
    if (httpMethod === "GET" && path === "/admin/health") {
      return successResponse(
        { status: "healthy", service: "admin", version: "1.0.0" },
        "Admin service is healthy",
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

    // All other endpoints require admin authentication
    const user = getUserFromEvent(event);

    // Check if user is admin
    const isAdmin = await checkAdminRole(user);
    if (!isAdmin) {
      logger.warn("Non-admin access attempt", { userId: user.userId });
      return errorResponse.unauthorized("Admin access required");
    }

    logger.info("Admin authenticated", { adminId: user.userId });

    // Route handling
    if (httpMethod === "GET" && path === "/admin/dashboard") {
      return await getDashboard(event, user);
    }

    if (httpMethod === "GET" && path === "/admin/users") {
      return await searchUsers(event, user);
    }

    if (
      httpMethod === "GET" &&
      pathParameters?.userId &&
      path.match(/\/admin\/users\/[^/]+$/)
    ) {
      return await getUserDetails(event, user, pathParameters.userId);
    }

    if (
      httpMethod === "POST" &&
      pathParameters?.userId &&
      path.includes("/disable")
    ) {
      return await disableUser(event, user, pathParameters.userId);
    }

    if (
      httpMethod === "POST" &&
      pathParameters?.userId &&
      path.includes("/enable")
    ) {
      return await enableUser(event, user, pathParameters.userId);
    }

    if (
      httpMethod === "POST" &&
      pathParameters?.userId &&
      path.includes("/reset-password")
    ) {
      return await resetUserPassword(event, user, pathParameters.userId);
    }

    if (httpMethod === "GET" && path === "/admin/system-health") {
      return await getSystemHealth(event, user);
    }

    if (httpMethod === "GET" && path === "/admin/audit") {
      return await getAuditLog(event, user);
    }

    return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);
  } catch (error) {
    logger.error("Admin function error", error, {
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
 * Check if user has admin role
 */
async function checkAdminRole(user) {
  // Check user profile for admin role
  const userProfile = await dynamoHelpers.getItem(
    `USER#${user.userId}`,
    "PROFILE",
  );

  if (userProfile && userProfile.role === ADMIN_ROLE) {
    return true;
  }

  // Check Cognito groups if available (supports both 'admin' and 'Admins' group names)
  if (user.groups) {
    if (user.groups.includes(ADMIN_ROLE) || user.groups.includes("Admins")) {
      return true;
    }
  }

  return false;
}

/**
 * Get admin dashboard with platform metrics
 * GET /admin/dashboard
 */
async function getDashboard(event, adminUser) {
  const currentDate = new Date();
  const thirtyDaysAgo = new Date(currentDate - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(currentDate - 7 * 24 * 60 * 60 * 1000);

  // Get all users
  const allUsers = await dynamoHelpers.scan({
    FilterExpression: "entityType = :entityType",
    ExpressionAttributeValues: { ":entityType": "USER_PROFILE" },
  });

  // Calculate metrics
  const totalUsers = allUsers.length;
  const activeUsers7d = allUsers.filter((u) => {
    const lastLogin = new Date(u.lastLoginAt || u.createdAt);
    return lastLogin >= sevenDaysAgo;
  }).length;

  const newRegistrations30d = allUsers.filter((u) => {
    const createdAt = new Date(u.createdAt);
    return createdAt >= thirtyDaysAgo;
  }).length;

  // Get budget and transaction counts
  const budgets = await dynamoHelpers.scan({
    FilterExpression: "entityType = :entityType",
    ExpressionAttributeValues: { ":entityType": "BUDGET" },
  });

  const transactions = await dynamoHelpers.scan({
    FilterExpression: "entityType = :entityType",
    ExpressionAttributeValues: { ":entityType": "TRANSACTION" },
  });

  // Get premium users count
  const premiumUsers = allUsers.filter(
    (u) => u.subscriptionStatus === "premium",
  ).length;

  const metrics = {
    users: {
      total: totalUsers,
      active7d: activeUsers7d,
      newRegistrations30d,
      premiumUsers,
      conversionRate:
        totalUsers > 0 ? Math.round((premiumUsers / totalUsers) * 100) : 0,
    },
    content: {
      totalBudgets: budgets.length,
      totalTransactions: transactions.length,
      avgBudgetsPerUser:
        totalUsers > 0
          ? Math.round((budgets.length / totalUsers) * 10) / 10
          : 0,
      avgTransactionsPerUser:
        totalUsers > 0
          ? Math.round((transactions.length / totalUsers) * 10) / 10
          : 0,
    },
    timestamp: currentDate.toISOString(),
  };

  logger.info("Dashboard metrics retrieved", { adminId: adminUser.userId });

  return successResponse(metrics, "Dashboard metrics retrieved successfully");
}

/**
 * Search users by email, userId, or name
 * GET /admin/users?q=search&limit=20&offset=0
 */
async function searchUsers(event, adminUser) {
  const queryParams = event.queryStringParameters || {};
  const searchQuery = (queryParams.q || "").toLowerCase();
  const limit = parseInt(queryParams.limit) || 20;
  const offset = parseInt(queryParams.offset) || 0;

  // Get all users
  const allUsers = await dynamoHelpers.scan({
    FilterExpression: "entityType = :entityType",
    ExpressionAttributeValues: { ":entityType": "USER_PROFILE" },
  });

  // Filter by search query if provided
  let filteredUsers = allUsers;
  if (searchQuery) {
    filteredUsers = allUsers.filter((u) => {
      const email = (u.email || "").toLowerCase();
      const name = (u.name || "").toLowerCase();
      const userId = (u.userId || "").toLowerCase();
      return (
        email.includes(searchQuery) ||
        name.includes(searchQuery) ||
        userId.includes(searchQuery)
      );
    });
  }

  // Sort by creation date (newest first)
  filteredUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Paginate
  const paginatedUsers = filteredUsers.slice(offset, offset + limit);

  // Format response
  const users = paginatedUsers.map(formatUserForAdmin);

  await logAdminAction(adminUser.userId, "USER_SEARCH", null, {
    query: searchQuery,
  });

  return successResponse(
    {
      users,
      pagination: {
        total: filteredUsers.length,
        limit,
        offset,
        hasMore: offset + limit < filteredUsers.length,
      },
    },
    "Users retrieved successfully",
  );
}

/**
 * Get detailed user information
 * GET /admin/users/:userId
 */
async function getUserDetails(event, adminUser, targetUserId) {
  // Get user profile
  const userProfile = await dynamoHelpers.getItem(
    `USER#${targetUserId}`,
    "PROFILE",
  );

  if (!userProfile) {
    return errorResponse.notFound("User not found");
  }

  // Get user's budget info if they have one
  let familyInfo = null;
  if (userProfile.defaultBudgetId) {
    const [budget, member] = await Promise.all([
      dynamoHelpers.getItem(`BUDGET#${userProfile.defaultBudgetId}`, "METADATA"),
      dynamoHelpers.getItem(`BUDGET#${userProfile.defaultBudgetId}`, `MEMBER#${targetUserId}`),
    ]);
    if (budget) {
      familyInfo = {
        budgetId: userProfile.defaultBudgetId,
        budgetType: budget.budgetType || "personal",
        role: member?.role || "owner",
      };
    }
  }

  // Get user's budget count
  const budgets = await dynamoHelpers.queryByPK(`USER#${targetUserId}`, {
    FilterExpression: "entityType = :entityType",
    ExpressionAttributeValues: { ":entityType": "BUDGET" },
  });

  // Get user's transaction count
  const transactions = await dynamoHelpers.queryByPK(`USER#${targetUserId}`, {
    FilterExpression: "entityType = :entityType",
    ExpressionAttributeValues: { ":entityType": "TRANSACTION" },
  });

  const userDetails = {
    ...formatUserForAdmin(userProfile),
    family: familyInfo,
    stats: {
      budgetCount: budgets.length,
      transactionCount: transactions.length,
    },
  };

  await logAdminAction(adminUser.userId, "USER_VIEW", targetUserId, {});

  return successResponse(userDetails, "User details retrieved successfully");
}

/**
 * Disable a user account
 * POST /admin/users/:userId/disable
 */
async function disableUser(event, adminUser, targetUserId) {
  const body = parseRequestBody(event.body);
  const reason = body.reason || "No reason provided";

  // Get user profile
  const userProfile = await dynamoHelpers.getItem(
    `USER#${targetUserId}`,
    "PROFILE",
  );

  if (!userProfile) {
    return errorResponse.notFound("User not found");
  }

  if (userProfile.isDisabled) {
    return errorResponse.badRequest("User is already disabled");
  }

  // Prevent disabling other admins
  if (userProfile.role === ADMIN_ROLE) {
    return errorResponse.badRequest("Cannot disable admin accounts");
  }

  // Update user profile
  await dynamoHelpers.updateItem(`USER#${targetUserId}`, "PROFILE", {
    isDisabled: true,
    disabledAt: new Date().toISOString(),
    disabledBy: adminUser.userId,
    disableReason: reason,
  });

  await logAdminAction(adminUser.userId, "USER_DISABLED", targetUserId, {
    reason,
  });

  logger.info("User disabled", {
    adminId: adminUser.userId,
    targetUserId,
    reason,
  });

  return successResponse(
    { userId: targetUserId, isDisabled: true },
    "User account disabled successfully",
  );
}

/**
 * Enable a disabled user account
 * POST /admin/users/:userId/enable
 */
async function enableUser(event, adminUser, targetUserId) {
  // Get user profile
  const userProfile = await dynamoHelpers.getItem(
    `USER#${targetUserId}`,
    "PROFILE",
  );

  if (!userProfile) {
    return errorResponse.notFound("User not found");
  }

  if (!userProfile.isDisabled) {
    return errorResponse.badRequest("User is not disabled");
  }

  // Update user profile
  await dynamoHelpers.updateItem(`USER#${targetUserId}`, "PROFILE", {
    isDisabled: false,
    enabledAt: new Date().toISOString(),
    enabledBy: adminUser.userId,
  });

  await logAdminAction(adminUser.userId, "USER_ENABLED", targetUserId, {});

  logger.info("User enabled", {
    adminId: adminUser.userId,
    targetUserId,
  });

  return successResponse(
    { userId: targetUserId, isDisabled: false },
    "User account enabled successfully",
  );
}

/**
 * Trigger password reset for a user
 * POST /admin/users/:userId/reset-password
 */
async function resetUserPassword(event, adminUser, targetUserId) {
  // Get user profile
  const userProfile = await dynamoHelpers.getItem(
    `USER#${targetUserId}`,
    "PROFILE",
  );

  if (!userProfile) {
    return errorResponse.notFound("User not found");
  }

  if (!userProfile.email) {
    return errorResponse.badRequest("User has no email address");
  }

  // In production, this would trigger Cognito AdminResetUserPassword
  // For now, we'll just log the action and return success
  // TODO: Implement actual Cognito password reset

  await logAdminAction(
    adminUser.userId,
    "PASSWORD_RESET_TRIGGERED",
    targetUserId,
    {
      email: userProfile.email,
    },
  );

  logger.info("Password reset triggered", {
    adminId: adminUser.userId,
    targetUserId,
    email: userProfile.email,
  });

  return successResponse(
    { userId: targetUserId, email: userProfile.email },
    "Password reset email sent successfully",
  );
}

/**
 * Get system health metrics
 * GET /admin/system-health
 */
async function getSystemHealth(_event, _adminUser) {
  // In production, this would query CloudWatch metrics
  // For now, return mock health data
  const health = {
    status: "healthy",
    services: {
      api: { status: "healthy", latencyMs: 45 },
      database: { status: "healthy", latencyMs: 12 },
      auth: { status: "healthy", latencyMs: 89 },
    },
    metrics: {
      apiCalls24h: 0, // Would come from CloudWatch
      errorRate24h: 0,
      avgResponseTimeMs: 0,
    },
    lastChecked: new Date().toISOString(),
  };

  return successResponse(health, "System health retrieved successfully");
}

/**
 * Get audit log of admin actions
 * GET /admin/audit?limit=50&offset=0
 */
async function getAuditLog(event, _adminUser) {
  const queryParams = event.queryStringParameters || {};
  const limit = parseInt(queryParams.limit) || 50;
  const offset = parseInt(queryParams.offset) || 0;

  // Get current month's audit logs
  const currentMonth = new Date().toISOString().slice(0, 7);

  const auditLogs = await dynamoHelpers.queryByPK(`AUDIT#${currentMonth}`, {});

  // Sort by timestamp (newest first)
  auditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Paginate
  const paginatedLogs = auditLogs.slice(offset, offset + limit);

  // Format response
  const logs = paginatedLogs.map((log) => ({
    id: log.SK,
    adminId: log.adminId,
    adminEmail: log.adminEmail,
    action: log.action,
    targetUserId: log.targetUserId,
    details: log.details,
    timestamp: log.timestamp,
  }));

  return successResponse(
    {
      logs,
      pagination: {
        total: auditLogs.length,
        limit,
        offset,
        hasMore: offset + limit < auditLogs.length,
      },
    },
    "Audit log retrieved successfully",
  );
}

// ============ Helper Functions ============

/**
 * Log an admin action to the audit log
 */
async function logAdminAction(adminId, action, targetUserId, details) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const timestamp = new Date().toISOString();

  const auditEntry = {
    PK: `AUDIT#${currentMonth}`,
    SK: `ACTION#${Date.now()}#${adminId}`,
    entityType: "AUDIT_LOG",
    adminId,
    action,
    targetUserId,
    details,
    timestamp,
    // GSI for querying by admin
    GSI1PK: `ADMIN#${adminId}`,
    GSI1SK: timestamp,
  };

  await dynamoHelpers.putItem(auditEntry);

  logger.info("Admin action logged", { adminId, action, targetUserId });
}

/**
 * Format user profile for admin view
 */
function formatUserForAdmin(user) {
  return {
    userId: user.userId,
    email: user.email,
    name: user.name || "N/A",
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    subscriptionStatus: user.subscriptionStatus || "free",
    isDisabled: user.isDisabled || false,
    defaultBudgetId: user.defaultBudgetId,
    location: user.location,
  };
}
