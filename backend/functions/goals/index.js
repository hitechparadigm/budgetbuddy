/**
 * BudgetBuddy Savings Goals Lambda Function
 *
 * Handles savings goals CRUD operations, progress tracking, and milestone celebrations.
 * Supports goal templates, category linking, and gamification features.
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

const { checkPermission } = require("/opt/nodejs/shared");

// Goal templates for quick creation
const GOAL_TEMPLATES = [
  {
    id: "emergency",
    name: "Emergency Fund",
    icon: "🚨",
    suggestedAmount: null,
  },
  { id: "vacation", name: "Vacation", icon: "✈️", suggestedAmount: null },
  { id: "car", name: "New Car", icon: "🚗", suggestedAmount: null },
  { id: "home", name: "Home Down Payment", icon: "🏠", suggestedAmount: null },
  { id: "wedding", name: "Wedding", icon: "💍", suggestedAmount: null },
  { id: "education", name: "Education", icon: "🎓", suggestedAmount: null },
  { id: "purchase", name: "Big Purchase", icon: "💻", suggestedAmount: null },
  { id: "holiday", name: "Holiday Gifts", icon: "🎁", suggestedAmount: null },
  { id: "custom", name: "Custom Goal", icon: "🎯", suggestedAmount: null },
];

/**
 * Main Lambda handler for goals operations
 */
exports.handler = async (event, context) => {
  logger.info("Goals request received", {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context.awsRequestId,
  });

  try {
    const { httpMethod, path, pathParameters } = event;

    // Health check endpoint
    if (httpMethod === "GET" && path === "/goals/health") {
      return successResponse(
        { status: "healthy", service: "goals", version: "1.0.0" },
        "Goals service is healthy",
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
    if (httpMethod === "GET" && path === "/goals") {
      return await getGoals(event, user);
    }

    if (httpMethod === "GET" && path === "/goals/templates") {
      return await getGoalTemplates();
    }

    if (httpMethod === "POST" && path === "/goals") {
      return await createGoal(event, user);
    }

    if (httpMethod === "PUT" && path === "/goals/reorder") {
      return await reorderGoals(event, user);
    }

    if (httpMethod === "GET" && pathParameters?.goalId) {
      return await getGoal(event, user, pathParameters.goalId);
    }

    if (httpMethod === "PUT" && pathParameters?.goalId) {
      return await updateGoal(event, user, pathParameters.goalId);
    }

    if (
      httpMethod === "POST" &&
      pathParameters?.goalId &&
      path.endsWith("/contribute")
    ) {
      return await contributeToGoal(event, user, pathParameters.goalId);
    }

    if (httpMethod === "DELETE" && pathParameters?.goalId) {
      return await deleteGoal(event, user, pathParameters.goalId);
    }

    return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);
  } catch (error) {
    logger.error("Goals function error", error, {
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
 * Get all goals for a family
 * GET /goals
 */
async function getGoals(event, user) {
  const permissionError = checkPermission(event, "budget:view");
  if (permissionError) return permissionError;

  const { budgetId, role, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);

  BudgetAccessResolver.assertPermission(role, "budget.read", budgetStatus);

  logger.info("Getting goals", { budgetId });

  const goals = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
    FilterExpression:
      "entityType = :entityType AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
    ExpressionAttributeValues: {
      ":entityType": "GOAL",
      ":false": false,
    },
  });

  const formattedGoals = goals
    .map(formatGoalResponse)
    .sort((a, b) => a.priority - b.priority);

  // Calculate summary stats
  const activeGoals = formattedGoals.filter((g) => g.status === "active");
  const totalTarget = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);

  return successResponse(
    {
      goals: formattedGoals,
      count: formattedGoals.length,
      summary: {
        activeGoals: activeGoals.length,
        totalTarget,
        totalSaved,
        overallProgress:
          totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0,
      },
    },
    "Goals retrieved successfully",
  );
}

/**
 * Get goal templates
 * GET /goals/templates
 */
async function getGoalTemplates() {
  return successResponse(
    { templates: GOAL_TEMPLATES },
    "Goal templates retrieved successfully",
  );
}

/**
 * Get a specific goal
 * GET /goals/{goalId}
 */
async function getGoal(event, user, goalId) {
  const permissionError = checkPermission(event, "budget:view");
  if (permissionError) return permissionError;

  const { budgetId, role, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);

  BudgetAccessResolver.assertPermission(role, "budget.read", budgetStatus);

  const goal = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `GOAL#${goalId}`,
  );

  if (!goal || goal.isDeleted) {
    return errorResponse.notFound("Goal not found");
  }

  return successResponse(
    formatGoalResponse(goal),
    "Goal retrieved successfully",
  );
}

/**
 * Create a new savings goal
 * POST /goals
 */
async function createGoal(event, user) {
  const permissionError = checkPermission(event, "budget:create");
  if (permissionError) return permissionError;

  const { budgetId, role, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);

  BudgetAccessResolver.assertPermission(role, "budget.edit", budgetStatus);

  const body = parseRequestBody(event.body);

  // Validate required fields
  if (!body.name) return errorResponse.badRequest("Goal name is required");
  if (!body.targetAmount || body.targetAmount <= 0) {
    return errorResponse.badRequest("Valid target amount is required");
  }

  // Check goal limit (max 10 active goals)
  const existingGoals = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
    FilterExpression:
      "entityType = :entityType AND #status = :active AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":entityType": "GOAL",
      ":active": "active",
      ":false": false,
    },
  });

  if (existingGoals.length >= 10) {
    return errorResponse.badRequest("Maximum of 10 active goals allowed");
  }

  const goalId = generateId.custom("goal");
  const currentTime = new Date().toISOString();
  const priority = existingGoals.length + 1;

  const goal = {
    PK: `BUDGET#${budgetId}`,
    SK: `GOAL#${goalId}`,
    entityType: "GOAL",
    goalId,
    budgetId,
    name: body.name,
    icon: body.icon || "🎯",
    targetAmount: body.targetAmount,
    currentAmount: body.currentAmount || 0,
    targetDate: body.targetDate || null,
    priority,
    status: "active",
    linkedCategoryId: body.linkedCategoryId || null,
    progressPercent: 0,
    monthlyRequired: null,
    milestones: {
      25: { reached: false, date: null },
      50: { reached: false, date: null },
      75: { reached: false, date: null },
      100: { reached: false, date: null },
    },
    contributions: [],
    createdBy: user.userId,
    createdAt: currentTime,
    updatedAt: currentTime,
  };

  // Calculate initial progress
  const progress = calculateProgress(goal);
  goal.progressPercent = progress.progressPercent;
  goal.monthlyRequired = progress.monthlyRequired;

  await dynamoHelpers.putItem(goal);

  logger.info("Goal created successfully", {
    goalId,
    budgetId,
    name: body.name,
  });

  return successResponse(formatGoalResponse(goal), "Goal created successfully");
}

/**
 * Update an existing goal
 * PUT /goals/{goalId}
 */
async function updateGoal(event, user, goalId) {
  const permissionError = checkPermission(event, "budget:edit");
  if (permissionError) return permissionError;

  const { budgetId, role, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);

  BudgetAccessResolver.assertPermission(role, "budget.edit", budgetStatus);

  const body = parseRequestBody(event.body);

  const existingGoal = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `GOAL#${goalId}`,
  );
  if (!existingGoal || existingGoal.isDeleted) {
    return errorResponse.notFound("Goal not found");
  }

  const updates = { updatedAt: new Date().toISOString() };

  if (body.name) updates.name = body.name;
  if (body.icon) updates.icon = body.icon;
  if (body.targetAmount !== undefined) updates.targetAmount = body.targetAmount;
  if (body.currentAmount !== undefined)
    updates.currentAmount = body.currentAmount;
  if (body.targetDate !== undefined) updates.targetDate = body.targetDate;
  if (body.linkedCategoryId !== undefined)
    updates.linkedCategoryId = body.linkedCategoryId;
  if (body.status) updates.status = body.status;

  // Recalculate progress if amounts changed
  if (
    body.targetAmount !== undefined ||
    body.currentAmount !== undefined ||
    body.targetDate !== undefined
  ) {
    const updatedGoal = { ...existingGoal, ...updates };
    const progress = calculateProgress(updatedGoal);
    updates.progressPercent = progress.progressPercent;
    updates.monthlyRequired = progress.monthlyRequired;

    // Check for milestone achievements
    const milestones = checkMilestones(existingGoal, progress.progressPercent);
    if (milestones.newMilestones.length > 0) {
      updates.milestones = milestones.updatedMilestones;
    }
  }

  const updatedGoal = await dynamoHelpers.updateItem(
    `BUDGET#${budgetId}`,
    `GOAL#${goalId}`,
    updates,
  );

  logger.info("Goal updated successfully", { goalId, budgetId });

  return successResponse(
    formatGoalResponse(updatedGoal),
    "Goal updated successfully",
  );
}

/**
 * Add a contribution to a goal
 * POST /goals/{goalId}/contribute
 */
async function contributeToGoal(event, user, goalId) {
  const permissionError = checkPermission(event, "budget:edit");
  if (permissionError) return permissionError;

  const { budgetId, role, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);

  BudgetAccessResolver.assertPermission(role, "budget.edit", budgetStatus);

  const body = parseRequestBody(event.body);

  if (!body.amount || body.amount <= 0) {
    return errorResponse.badRequest("Valid contribution amount is required");
  }

  const existingGoal = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `GOAL#${goalId}`,
  );
  if (!existingGoal || existingGoal.isDeleted) {
    return errorResponse.notFound("Goal not found");
  }

  if (existingGoal.status !== "active") {
    return errorResponse.badRequest("Cannot contribute to inactive goal");
  }

  const currentTime = new Date().toISOString();
  const newAmount = (existingGoal.currentAmount || 0) + body.amount;

  // Create contribution record
  const contribution = {
    date: currentTime.split("T")[0],
    amount: body.amount,
    source: body.source || "manual",
    note: body.note || null,
  };

  const contributions = [...(existingGoal.contributions || []), contribution];

  // Calculate new progress
  const updatedGoal = { ...existingGoal, currentAmount: newAmount };
  const progress = calculateProgress(updatedGoal);

  // Check for milestone achievements
  const milestones = checkMilestones(existingGoal, progress.progressPercent);

  // Send milestone notifications (async, don't block response)
  if (milestones.newMilestones.length > 0) {
    sendMilestoneNotifications(
      budgetId,
      milestones.newMilestones,
      existingGoal,
    ).catch((err) =>
      logger.warn("Failed to send milestone notifications", {
        error: err.message,
      }),
    );
  }

  // Check if goal is complete
  let status = existingGoal.status;
  let completedAt = null;
  if (progress.progressPercent >= 100) {
    status = "completed";
    completedAt = currentTime;
  }

  const updates = {
    currentAmount: newAmount,
    contributions,
    progressPercent: progress.progressPercent,
    monthlyRequired: progress.monthlyRequired,
    milestones: milestones.updatedMilestones,
    status,
    completedAt,
    updatedAt: currentTime,
  };

  const result = await dynamoHelpers.updateItem(
    `BUDGET#${budgetId}`,
    `GOAL#${goalId}`,
    updates,
  );

  logger.info("Contribution added to goal", {
    goalId,
    budgetId,
    amount: body.amount,
    newTotal: newAmount,
    progress: progress.progressPercent,
  });

  return successResponse(
    {
      goal: formatGoalResponse(result),
      contribution,
      newMilestones: milestones.newMilestones,
      isComplete: status === "completed",
    },
    "Contribution added successfully",
  );
}

/**
 * Reorder goals by priority
 * PUT /goals/reorder
 */
async function reorderGoals(event, user) {
  const permissionError = checkPermission(event, "budget:edit");
  if (permissionError) return permissionError;

  const { budgetId, role, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);

  BudgetAccessResolver.assertPermission(role, "budget.edit", budgetStatus);

  const body = parseRequestBody(event.body);

  if (!body.goalIds || !Array.isArray(body.goalIds)) {
    return errorResponse.badRequest("goalIds array is required");
  }

  const currentTime = new Date().toISOString();

  // Update priority for each goal
  const updatePromises = body.goalIds.map((goalId, index) =>
    dynamoHelpers.updateItem(`BUDGET#${budgetId}`, `GOAL#${goalId}`, {
      priority: index + 1,
      updatedAt: currentTime,
    }),
  );

  await Promise.all(updatePromises);

  logger.info("Goals reordered", { budgetId, goalCount: body.goalIds.length });

  return successResponse(null, "Goals reordered successfully");
}

/**
 * Delete a goal
 * DELETE /goals/{goalId}
 */
async function deleteGoal(event, user, goalId) {
  const permissionError = checkPermission(event, "budget:delete");
  if (permissionError) return permissionError;

  const { budgetId, role, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);

  BudgetAccessResolver.assertPermission(role, "budget.edit", budgetStatus);

  const existingGoal = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `GOAL#${goalId}`,
  );
  if (!existingGoal || existingGoal.isDeleted) {
    return errorResponse.notFound("Goal not found");
  }

  // Soft delete
  await dynamoHelpers.updateItem(`BUDGET#${budgetId}`, `GOAL#${goalId}`, {
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    deletedBy: user.userId,
  });

  logger.info("Goal deleted", { goalId, budgetId });

  return successResponse(null, "Goal deleted successfully");
}

/**
 * Calculate goal progress and monthly required amount
 */
function calculateProgress(goal) {
  const progressPercent = Math.min(
    100,
    Math.round((goal.currentAmount / goal.targetAmount) * 100),
  );

  let monthlyRequired = null;
  if (goal.targetDate && goal.currentAmount < goal.targetAmount) {
    const today = new Date();
    const targetDate = new Date(goal.targetDate);
    const monthsRemaining = Math.max(
      1,
      (targetDate.getFullYear() - today.getFullYear()) * 12 +
        (targetDate.getMonth() - today.getMonth()),
    );
    const amountRemaining = goal.targetAmount - goal.currentAmount;
    monthlyRequired = Math.ceil(amountRemaining / monthsRemaining);
  }

  return { progressPercent, monthlyRequired };
}

/**
 * Check for new milestone achievements
 */
function checkMilestones(existingGoal, newProgressPercent) {
  const milestoneThresholds = [25, 50, 75, 100];
  const currentTime = new Date().toISOString();
  const newMilestones = [];

  const updatedMilestones = { ...(existingGoal.milestones || {}) };

  for (const threshold of milestoneThresholds) {
    const key = String(threshold);
    if (!updatedMilestones[key]) {
      updatedMilestones[key] = { reached: false, date: null };
    }

    if (newProgressPercent >= threshold && !updatedMilestones[key].reached) {
      updatedMilestones[key] = { reached: true, date: currentTime };
      newMilestones.push({
        threshold,
        message: getMilestoneMessage(threshold, existingGoal.name),
      });
    }
  }

  return { updatedMilestones, newMilestones };
}

/**
 * Get celebration message for milestone
 */
function getMilestoneMessage(threshold, goalName) {
  const messages = {
    25: `🎉 You're 25% of the way to "${goalName}"! Keep going!`,
    50: `🎊 Halfway there! 50% of "${goalName}" complete!`,
    75: `🚀 Amazing! 75% of "${goalName}" achieved!`,
    100: `🏆 Congratulations! You've reached your "${goalName}" goal!`,
  };
  return messages[threshold] || `Milestone ${threshold}% reached!`;
}

/**
 * Format goal for API response
 */
function formatGoalResponse(goal) {
  const progress = calculateProgress(goal);

  // Determine status indicator
  let statusIndicator = "🎯";
  if (goal.status === "completed") {
    statusIndicator = "🏆";
  } else if (goal.status === "paused") {
    statusIndicator = "⏸️";
  } else if (progress.progressPercent >= 75) {
    statusIndicator = "🔥";
  } else if (progress.progressPercent >= 50) {
    statusIndicator = "💪";
  } else if (progress.progressPercent >= 25) {
    statusIndicator = "📈";
  }

  // Calculate days remaining
  let daysRemaining = null;
  if (goal.targetDate) {
    const today = new Date();
    const targetDate = new Date(goal.targetDate);
    daysRemaining = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
  }

  return {
    goalId: goal.goalId,
    name: goal.name,
    icon: goal.icon,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    targetDate: goal.targetDate,
    daysRemaining,
    priority: goal.priority,
    status: goal.status,
    statusIndicator,
    linkedCategoryId: goal.linkedCategoryId,
    progressPercent: progress.progressPercent,
    monthlyRequired: progress.monthlyRequired,
    milestones: goal.milestones,
    contributionCount: (goal.contributions || []).length,
    recentContributions: (goal.contributions || []).slice(-5),
    completedAt: goal.completedAt,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

/**
 * Send push notifications for milestone achievements
 * @param {string} budgetId - Budget ID to send notifications to
 * @param {Array} newMilestones - Array of milestone objects with threshold and message
 * @param {Object} goal - The goal object
 */
async function sendMilestoneNotifications(budgetId, newMilestones, goal) {
  try {
    // Get all budget members to notify
    const budgetMembers = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
      FilterExpression: "entityType = :type",
      ExpressionAttributeValues: { ":type": "MEMBER" },
    });

    // Get user IDs from budget members
    const userIds = budgetMembers.map((m) => m.userId).filter(Boolean);
    if (userIds.length === 0) {
      logger.info("No budget members to notify for milestone");
      return;
    }

    // Store notifications in DynamoDB for each milestone
    const currentTime = new Date().toISOString();
    const notificationPromises = [];

    for (const milestone of newMilestones) {
      for (const userId of userIds) {
        const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const notification = {
          PK: `USER#${userId}`,
          SK: `NOTIFICATION#${notificationId}`,
          entityType: "NOTIFICATION",
          notificationId,
          userId,
          budgetId,
          type: "goal_milestone",
          title: `🎯 Goal Milestone Reached!`,
          body: milestone.message,
          data: {
            goalId: goal.goalId,
            goalName: goal.name,
            milestone: milestone.threshold,
          },
          read: false,
          createdAt: currentTime,
        };

        notificationPromises.push(dynamoHelpers.putItem(notification));
      }
    }

    await Promise.all(notificationPromises);
    logger.info("Milestone notifications stored", {
      budgetId,
      milestoneCount: newMilestones.length,
      userCount: userIds.length,
    });

    // Note: Push notification delivery would be handled by a separate
    // notification service that polls for undelivered notifications
    // or via SNS/SQS integration
  } catch (error) {
    logger.error("Error sending milestone notifications", error, { budgetId });
    throw error;
  }
}

// Export for testing
module.exports.sendMilestoneNotifications = sendMilestoneNotifications;
