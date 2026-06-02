/**
 * BudgetBuddy Debt Payoff Calculator Lambda Function
 *
 * Handles debt tracking, payoff calculations using snowball and avalanche methods,
 * and provides payoff timeline projections.
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
 * Main Lambda handler for debt payoff operations
 */
exports.handler = async (event, context) => {
  logger.info("Debt payoff request received", {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context.awsRequestId,
  });

  try {
    const { httpMethod, path, pathParameters } = event;

    // Health check endpoint
    if (httpMethod === "GET" && path === "/debts/health") {
      return successResponse(
        { status: "healthy", service: "debt-payoff", version: "1.0.0" },
        "Debt payoff service is healthy",
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
    if (httpMethod === "GET" && path === "/debts") {
      return await getDebts(event, user);
    }

    if (httpMethod === "GET" && path === "/debts/summary") {
      return await getDebtsSummary(event, user);
    }

    if (httpMethod === "GET" && path === "/debts/payoff-plan") {
      return await getPayoffPlan(event, user);
    }

    if (httpMethod === "POST" && path === "/debts") {
      return await createDebt(event, user);
    }

    if (httpMethod === "PUT" && pathParameters?.debtId) {
      return await updateDebt(event, user, pathParameters.debtId);
    }

    if (
      httpMethod === "POST" &&
      pathParameters?.debtId &&
      path.endsWith("/payment")
    ) {
      return await recordPayment(event, user, pathParameters.debtId);
    }

    if (httpMethod === "DELETE" && pathParameters?.debtId) {
      return await deleteDebt(event, user, pathParameters.debtId);
    }

    return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);
  } catch (error) {
    logger.error("Debt payoff function error", error, {
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
 * Get all debts for a family
 * GET /debts
 */
async function getDebts(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);

  logger.info("Getting debts", { budgetId });

  const debts = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
    FilterExpression:
      "entityType = :entityType AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
    ExpressionAttributeValues: {
      ":entityType": "DEBT",
      ":false": false,
    },
  });

  const formattedDebts = debts.map(formatDebtResponse).sort((a, b) => {
    // Sort by balance (smallest first for snowball view)
    return a.currentBalance - b.currentBalance;
  });

  return successResponse(
    { debts: formattedDebts, count: formattedDebts.length },
    "Debts retrieved successfully",
  );
}

/**
 * Get debts summary with totals
 * GET /debts/summary
 */
async function getDebtsSummary(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);

  const debts = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
    FilterExpression:
      "entityType = :entityType AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
    ExpressionAttributeValues: {
      ":entityType": "DEBT",
      ":false": false,
    },
  });

  const activeDebts = debts.filter((d) => d.status === "active");

  const totalBalance = activeDebts.reduce(
    (sum, d) => sum + d.currentBalance,
    0,
  );
  const totalMinPayment = activeDebts.reduce(
    (sum, d) => sum + d.minimumPayment,
    0,
  );
  const avgInterestRate =
    activeDebts.length > 0
      ? activeDebts.reduce((sum, d) => sum + d.interestRate, 0) /
        activeDebts.length
      : 0;

  // Calculate payoff projections
  const snowballPlan = calculatePayoffPlan(activeDebts, "snowball", 0);
  const avalanchePlan = calculatePayoffPlan(activeDebts, "avalanche", 0);

  return successResponse(
    {
      summary: {
        totalDebts: debts.length,
        activeDebts: activeDebts.length,
        totalBalance: Math.round(totalBalance * 100) / 100,
        totalMinPayment: Math.round(totalMinPayment * 100) / 100,
        avgInterestRate: Math.round(avgInterestRate * 100) / 100,
        snowballPayoffMonths: snowballPlan.totalMonths,
        snowballTotalInterest: snowballPlan.totalInterest,
        avalanchePayoffMonths: avalanchePlan.totalMonths,
        avalancheTotalInterest: avalanchePlan.totalInterest,
        interestSavings:
          Math.round(
            (snowballPlan.totalInterest - avalanchePlan.totalInterest) * 100,
          ) / 100,
      },
    },
    "Debt summary retrieved successfully",
  );
}

/**
 * Get detailed payoff plan
 * GET /debts/payoff-plan?strategy=snowball&extraPayment=100
 */
async function getPayoffPlan(event, user) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);

  const queryParams = event.queryStringParameters || {};
  const strategy = queryParams.strategy || "snowball";
  const extraPayment = parseFloat(queryParams.extraPayment) || 0;

  if (!["snowball", "avalanche"].includes(strategy)) {
    return errorResponse.badRequest("Strategy must be snowball or avalanche");
  }

  const debtsRaw = await dynamoHelpers.queryByPK(`BUDGET#${budgetId}`, {
    FilterExpression:
      "entityType = :entityType AND status = :active AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
    ExpressionAttributeValues: {
      ":entityType": "DEBT",
      ":active": "active",
      ":false": false,
    },
  });

  const debts = debtsRaw || [];

  if (debts.length === 0) {
    return successResponse(
      {
        plan: {
          strategy,
          extraPayment,
          totalMonths: 0,
          payoffDate: null,
          totalPaid: 0,
          totalInterest: 0,
          debtOrder: [],
          timeline: [],
        },
        debts: [],
        message: 'No active debts found',
      },
      "No active debts found",
    );
  }

  const plan = calculatePayoffPlan(debts, strategy, extraPayment);

  return successResponse(
    {
      plan: {
        strategy,
        extraPayment,
        totalMonths: plan.totalMonths,
        payoffDate: plan.payoffDate,
        totalPaid: plan.totalPaid,
        totalInterest: plan.totalInterest,
        debtOrder: plan.debtOrder,
        timeline: plan.timeline,
      },
    },
    "Payoff plan calculated successfully",
  );
}

/**
 * Create a new debt
 * POST /debts
 */
async function createDebt(event, user) {
  const body = parseRequestBody(event.body) || {};
  const {
    name,
    type,
    originalBalance,
    currentBalance,
    interestRate,
    minimumPayment,
    dueDay,
    notes,
  } = body;

  // Validation
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return errorResponse.badRequest("Debt name is required");
  }
  if (typeof currentBalance !== "number" || currentBalance < 0) {
    return errorResponse.badRequest("Valid current balance is required");
  }
  if (
    typeof interestRate !== "number" ||
    interestRate < 0 ||
    interestRate > 100
  ) {
    return errorResponse.badRequest("Interest rate must be between 0 and 100");
  }
  if (typeof minimumPayment !== "number" || minimumPayment < 0) {
    return errorResponse.badRequest("Valid minimum payment is required");
  }

  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  const debtId = generateId("debt");
  const now = new Date().toISOString();

  const debt = {
    PK: `BUDGET#${budgetId}`,
    SK: `DEBT#${debtId}`,
    entityType: "DEBT",
    debtId,
    budgetId,
    name: name.trim(),
    type: type || "other",
    originalBalance: originalBalance || currentBalance,
    currentBalance,
    interestRate,
    minimumPayment,
    dueDay: dueDay || 1,
    status: "active",
    notes: notes || null,
    payments: [],
    createdBy: user.userId,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  };

  await dynamoHelpers.putItem(debt);

  logger.info("Debt created", { debtId, budgetId });

  return successResponse(
    { debt: formatDebtResponse(debt) },
    "Debt created successfully",
    201,
  );
}

/**
 * Update a debt
 * PUT /debts/{debtId}
 */
async function updateDebt(event, user, debtId) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  const existing = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `DEBT#${debtId}`,
  );

  if (!existing || existing.isDeleted) {
    return errorResponse.notFound("Debt not found");
  }

  const body = parseRequestBody(event);
  const allowedFields = [
    "name",
    "type",
    "currentBalance",
    "interestRate",
    "minimumPayment",
    "dueDay",
    "status",
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

  updates.updatedAt = new Date().toISOString();
  updates.updatedBy = user.userId;

  const updated = await dynamoHelpers.updateItem(
    `BUDGET#${budgetId}`,
    `DEBT#${debtId}`,
    updates,
  );

  logger.info("Debt updated", { debtId, budgetId });

  return successResponse(
    { debt: formatDebtResponse(updated) },
    "Debt updated successfully",
  );
}

/**
 * Record a payment on a debt
 * POST /debts/{debtId}/payment
 */
async function recordPayment(event, user, debtId) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  const existing = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `DEBT#${debtId}`,
  );

  if (!existing || existing.isDeleted) {
    return errorResponse.notFound("Debt not found");
  }

  const body = parseRequestBody(event);
  const { amount, date, notes } = body;

  if (typeof amount !== "number" || amount <= 0) {
    return errorResponse.badRequest("Valid payment amount is required");
  }

  const payment = {
    paymentId: generateId("pay"),
    amount,
    date: date || new Date().toISOString().split("T")[0],
    notes: notes || null,
    recordedAt: new Date().toISOString(),
    recordedBy: user.userId,
  };

  const newBalance = Math.max(0, existing.currentBalance - amount);
  const payments = [...(existing.payments || []), payment];

  const updates = {
    currentBalance: newBalance,
    payments,
    status: newBalance === 0 ? "paid_off" : "active",
    updatedAt: new Date().toISOString(),
    updatedBy: user.userId,
  };

  if (newBalance === 0) {
    updates.paidOffDate = new Date().toISOString();
  }

  const updated = await dynamoHelpers.updateItem(
    `BUDGET#${budgetId}`,
    `DEBT#${debtId}`,
    updates,
  );

  logger.info("Payment recorded", { debtId, amount, newBalance });

  return successResponse(
    {
      debt: formatDebtResponse(updated),
      payment,
      isPaidOff: newBalance === 0,
    },
    newBalance === 0
      ? "🎉 Congratulations! Debt paid off!"
      : "Payment recorded successfully",
  );
}

/**
 * Delete a debt (soft delete)
 * DELETE /debts/{debtId}
 */
async function deleteDebt(event, user, debtId) {
  const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(user.userId, dynamoHelpers);
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  const existing = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `DEBT#${debtId}`,
  );

  if (!existing || existing.isDeleted) {
    return errorResponse.notFound("Debt not found");
  }

  await dynamoHelpers.updateItem(`BUDGET#${budgetId}`, `DEBT#${debtId}`, {
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    deletedBy: user.userId,
  });

  logger.info("Debt deleted", { debtId, budgetId });

  return successResponse(null, "Debt deleted successfully");
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format debt for API response
 */
function formatDebtResponse(debt) {
  const totalPaid = (debt.payments || []).reduce((sum, p) => sum + p.amount, 0);
  const progressPercent =
    debt.originalBalance > 0
      ? Math.round(
          ((debt.originalBalance - debt.currentBalance) /
            debt.originalBalance) *
            100,
        )
      : 0;

  // Calculate months to payoff at minimum payment
  const monthsToPayoff = calculateMonthsToPayoff(
    debt.currentBalance,
    debt.interestRate,
    debt.minimumPayment,
  );

  return {
    debtId: debt.debtId,
    name: debt.name,
    type: debt.type,
    originalBalance: debt.originalBalance,
    currentBalance: debt.currentBalance,
    interestRate: debt.interestRate,
    minimumPayment: debt.minimumPayment,
    dueDay: debt.dueDay,
    status: debt.status,
    totalPaid,
    progressPercent,
    monthsToPayoff,
    paymentCount: (debt.payments || []).length,
    notes: debt.notes,
    createdAt: debt.createdAt,
    updatedAt: debt.updatedAt,
    paidOffDate: debt.paidOffDate || null,
  };
}

/**
 * Calculate months to pay off a debt
 */
function calculateMonthsToPayoff(balance, annualRate, monthlyPayment) {
  if (balance <= 0) return 0;
  if (monthlyPayment <= 0) return Infinity;

  const monthlyRate = annualRate / 100 / 12;

  if (monthlyRate === 0) {
    return Math.ceil(balance / monthlyPayment);
  }

  // Check if payment covers interest
  const monthlyInterest = balance * monthlyRate;
  if (monthlyPayment <= monthlyInterest) {
    return Infinity; // Payment doesn't cover interest
  }

  // Formula: n = -log(1 - (r * P) / M) / log(1 + r)
  // where P = principal, r = monthly rate, M = monthly payment
  const months =
    -Math.log(1 - (monthlyRate * balance) / monthlyPayment) /
    Math.log(1 + monthlyRate);

  return Math.ceil(months);
}

/**
 * Calculate payoff plan using snowball or avalanche method
 */
function calculatePayoffPlan(debts, strategy, extraPayment) {
  if (debts.length === 0) {
    return {
      totalMonths: 0,
      payoffDate: new Date().toISOString().split("T")[0],
      totalPaid: 0,
      totalInterest: 0,
      debtOrder: [],
      timeline: [],
    };
  }

  // Sort debts based on strategy
  const sortedDebts = [...debts].sort((a, b) => {
    if (strategy === "snowball") {
      // Smallest balance first
      return a.currentBalance - b.currentBalance;
    } else {
      // Highest interest rate first
      return b.interestRate - a.interestRate;
    }
  });

  // Create working copies
  const workingDebts = sortedDebts.map((d) => ({
    debtId: d.debtId,
    name: d.name,
    balance: d.currentBalance,
    rate: d.interestRate / 100 / 12, // Monthly rate
    minPayment: d.minimumPayment,
    paidOff: false,
    paidOffMonth: null,
  }));

  const timeline = [];
  let month = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const debtOrder = [];

  // Extra payment starts with the provided amount
  let availableExtra = extraPayment;

  while (workingDebts.some((d) => !d.paidOff) && month < 360) {
    // Max 30 years
    month++;
    const monthData = { month, payments: [], paidOff: [] };

    // Apply interest and payments to each debt
    for (const debt of workingDebts) {
      if (debt.paidOff) continue;

      // Apply interest
      const interest = debt.balance * debt.rate;
      debt.balance += interest;
      totalInterest += interest;

      // Calculate payment (minimum + extra for focus debt)
      let payment = debt.minPayment;

      // Add extra payment to the focus debt (first unpaid in sorted order)
      const focusDebt = workingDebts.find((d) => !d.paidOff);
      if (debt === focusDebt) {
        payment += availableExtra;
      }

      // Don't overpay
      payment = Math.min(payment, debt.balance);
      debt.balance -= payment;
      totalPaid += payment;

      monthData.payments.push({
        debtId: debt.debtId,
        name: debt.name,
        payment: Math.round(payment * 100) / 100,
        balance: Math.round(debt.balance * 100) / 100,
      });

      // Check if paid off
      if (debt.balance <= 0.01) {
        debt.paidOff = true;
        debt.paidOffMonth = month;
        debt.balance = 0;
        monthData.paidOff.push(debt.name);
        debtOrder.push({
          debtId: debt.debtId,
          name: debt.name,
          paidOffMonth: month,
        });

        // Add freed up minimum payment to extra
        availableExtra += debt.minPayment;
      }
    }

    // Only include significant months in timeline (every 6 months or payoff events)
    if (month % 6 === 0 || monthData.paidOff.length > 0 || month === 1) {
      timeline.push(monthData);
    }
  }

  // Calculate payoff date
  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + month);

  return {
    totalMonths: month,
    payoffDate: payoffDate.toISOString().split("T")[0],
    totalPaid: Math.round(totalPaid * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    debtOrder,
    timeline,
  };
}

// Export helper functions for testing
module.exports.calculateMonthsToPayoff = calculateMonthsToPayoff;
module.exports.calculatePayoffPlan = calculatePayoffPlan;
