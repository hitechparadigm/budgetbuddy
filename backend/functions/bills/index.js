/**
 * BudgetBuddy Bill Reminders Lambda Function
 *
 * Handles bill reminder CRUD operations, payment tracking, and recurring bill management.
 * Integrates with notification system for due date reminders.
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
  FamilyIdResolver,
} = require("/opt/nodejs/utils");

const { checkPermission } = require("/opt/nodejs/shared");

/**
 * Main Lambda handler for bill operations
 */
exports.handler = async (event, context) => {
  logger.info("Bill request received", {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context.awsRequestId,
  });

  try {
    const { httpMethod, path, pathParameters } = event;

    // Health check endpoint
    if (httpMethod === "GET" && path === "/bills/health") {
      return successResponse(
        { status: "healthy", service: "bills", version: "1.0.0" },
        "Bills service is healthy",
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
    if (httpMethod === "GET" && path === "/bills") {
      return await getBills(event, user);
    }

    if (httpMethod === "GET" && path === "/bills/upcoming") {
      return await getUpcomingBills(event, user);
    }

    if (httpMethod === "GET" && path === "/bills/calendar") {
      return await getBillsCalendar(event, user);
    }

    if (httpMethod === "POST" && path === "/bills") {
      return await createBill(event, user);
    }

    if (httpMethod === "PUT" && pathParameters?.billId) {
      return await updateBill(event, user, pathParameters.billId);
    }

    if (
      httpMethod === "POST" &&
      pathParameters?.billId &&
      path.endsWith("/pay")
    ) {
      return await markBillPaid(event, user, pathParameters.billId);
    }

    if (httpMethod === "DELETE" && pathParameters?.billId) {
      return await deleteBill(event, user, pathParameters.billId);
    }

    // AI Pattern Integration - Create bill from approved pattern
    if (httpMethod === "POST" && path === "/bills/from-pattern") {
      return await createBillFromPattern(event, user);
    }

    return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);
  } catch (error) {
    logger.error("Bills function error", error, {
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
 * Get all bills for a family
 * GET /bills
 */
async function getBills(event, user) {
  const permissionError = checkPermission(event, "budget:view");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  logger.info("Getting bills", { familyId });

  const bills = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
    FilterExpression:
      "entityType = :entityType AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
    ExpressionAttributeValues: {
      ":entityType": "BILL",
      ":false": false,
    },
  });

  const formattedBills = bills
    .map(formatBillResponse)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  return successResponse(
    { bills: formattedBills, count: formattedBills.length },
    "Bills retrieved successfully",
  );
}

/**
 * Get upcoming bills (next 30 days)
 * GET /bills/upcoming
 */
async function getUpcomingBills(event, user) {
  const permissionError = checkPermission(event, "budget:view");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const today = new Date();
  const thirtyDaysLater = new Date(today);
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

  const todayStr = today.toISOString().split("T")[0];
  const futureStr = thirtyDaysLater.toISOString().split("T")[0];

  logger.info("Getting upcoming bills", {
    familyId,
    from: todayStr,
    to: futureStr,
  });

  const bills = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
    FilterExpression:
      "entityType = :entityType AND dueDate >= :today AND dueDate <= :future AND #status <> :paid AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":entityType": "BILL",
      ":today": todayStr,
      ":future": futureStr,
      ":paid": "paid",
      ":false": false,
    },
  });

  const formattedBills = bills
    .map(formatBillResponse)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  return successResponse(
    { bills: formattedBills, count: formattedBills.length },
    "Upcoming bills retrieved successfully",
  );
}

/**
 * Get bills calendar view for a month
 * GET /bills/calendar?month=YYYY-MM
 */
async function getBillsCalendar(event, user) {
  const permissionError = checkPermission(event, "budget:view");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const queryParams = event.queryStringParameters || {};
  const month = queryParams.month || new Date().toISOString().substring(0, 7);

  logger.info("Getting bills calendar", { familyId, month });

  // Query bills for the month using GSI
  const bills = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
    FilterExpression:
      "entityType = :entityType AND begins_with(dueDate, :month) AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
    ExpressionAttributeValues: {
      ":entityType": "BILL",
      ":month": month,
      ":false": false,
    },
  });

  // Group bills by date
  const calendarData = {};
  bills.forEach((bill) => {
    const date = bill.dueDate;
    if (!calendarData[date]) {
      calendarData[date] = { date, bills: [], totalAmount: 0 };
    }
    calendarData[date].bills.push(formatBillResponse(bill));
    calendarData[date].totalAmount += bill.amount || 0;
  });

  const totalDue = bills
    .filter((b) => b.status !== "paid")
    .reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalPaid = bills
    .filter((b) => b.status === "paid")
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  return successResponse(
    {
      month,
      calendar: Object.values(calendarData).sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
      summary: { totalDue, totalPaid, billCount: bills.length },
    },
    "Bills calendar retrieved successfully",
  );
}

/**
 * Create a new bill reminder
 * POST /bills
 */
async function createBill(event, user) {
  const permissionError = checkPermission(event, "budget:create");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const body = parseRequestBody(event.body);

  // Validate required fields
  if (!body.name) return errorResponse.badRequest("Bill name is required");
  if (!body.amount || body.amount <= 0)
    return errorResponse.badRequest("Valid amount is required");
  if (!body.dueDate)
    return errorResponse.badRequest("Due date is required (YYYY-MM-DD)");

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)) {
    return errorResponse.badRequest("Due date must be in YYYY-MM-DD format");
  }

  const billId = generateId.custom("bill");
  const currentTime = new Date().toISOString();
  const dueDate = new Date(body.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Determine initial status
  let status = "unpaid";
  if (dueDate < today) {
    status = "overdue";
  }

  const bill = {
    PK: `FAMILY#${familyId}`,
    SK: `BILL#${billId}`,
    GSI1PK: `BILLS#${body.dueDate.substring(0, 7)}`,
    GSI1SK: `${body.dueDate}#${billId}`,
    entityType: "BILL",
    billId,
    familyId,
    name: body.name,
    amount: body.amount,
    dueDate: body.dueDate,
    categoryId: body.categoryId || null,
    categoryName: body.categoryName || null,
    status,
    isRecurring: body.isRecurring || false,
    frequency: body.frequency || null, // weekly, bi-weekly, monthly, quarterly, annually
    nextDueDate: null,
    remindersSent: [],
    paidDate: null,
    transactionId: null,
    notes: body.notes || null,
    // AI metadata fields
    aiGenerated: body.aiGenerated || false,
    sourcePatternId: body.sourcePatternId || null,
    aiConfidenceScore: body.aiConfidenceScore || null,
    aiDetectedDate: body.aiDetectedDate || null,
    userModified: false,
    createdBy: user.userId,
    createdAt: currentTime,
    updatedAt: currentTime,
  };

  await dynamoHelpers.putItem(bill);

  logger.info("Bill created successfully", {
    billId,
    familyId,
    name: body.name,
  });

  return successResponse(formatBillResponse(bill), "Bill created successfully");
}

/**
 * Update an existing bill
 * PUT /bills/{billId}
 */
async function updateBill(event, user, billId) {
  const permissionError = checkPermission(event, "budget:edit");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const body = parseRequestBody(event.body);

  // Find the bill
  const existingBill = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
    `BILL#${billId}`,
  );
  if (!existingBill) {
    return errorResponse.notFound("Bill not found");
  }

  // Prepare updates
  const updates = { updatedAt: new Date().toISOString() };

  if (body.name) updates.name = body.name;
  if (body.amount !== undefined) updates.amount = body.amount;
  if (body.dueDate) {
    updates.dueDate = body.dueDate;
    updates.GSI1PK = `BILLS#${body.dueDate.substring(0, 7)}`;
    updates.GSI1SK = `${body.dueDate}#${billId}`;
  }
  if (body.categoryId !== undefined) updates.categoryId = body.categoryId;
  if (body.categoryName !== undefined) updates.categoryName = body.categoryName;
  if (body.isRecurring !== undefined) updates.isRecurring = body.isRecurring;
  if (body.frequency !== undefined) updates.frequency = body.frequency;
  if (body.notes !== undefined) updates.notes = body.notes;

  // If this is an AI-generated bill and user is editing it, set userModified flag
  // AI metadata (aiGenerated, sourcePatternId, aiConfidenceScore, aiDetectedDate) is preserved
  if (
    existingBill.aiGenerated &&
    (body.name ||
      body.amount !== undefined ||
      body.dueDate ||
      body.frequency !== undefined)
  ) {
    updates.userModified = true;
  }

  const updatedBill = await dynamoHelpers.updateItem(
    `FAMILY#${familyId}`,
    `BILL#${billId}`,
    updates,
  );

  logger.info("Bill updated successfully", { billId, familyId });

  return successResponse(
    formatBillResponse(updatedBill),
    "Bill updated successfully",
  );
}

/**
 * Mark a bill as paid and create transaction
 * POST /bills/{billId}/pay
 */
async function markBillPaid(event, user, billId) {
  const permissionError = checkPermission(event, "budget:edit");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const body = parseRequestBody(event.body) || {};

  // Find the bill
  const existingBill = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
    `BILL#${billId}`,
  );
  if (!existingBill) {
    return errorResponse.notFound("Bill not found");
  }

  if (existingBill.status === "paid") {
    return errorResponse.badRequest("Bill is already paid");
  }

  const currentTime = new Date().toISOString();
  const paidDate = body.paidDate || currentTime.split("T")[0];
  const paidAmount = body.amount || existingBill.amount;

  // Create transaction for the payment
  let transactionId = null;
  if (existingBill.categoryId) {
    transactionId = generateId.custom("txn");
    const transaction = {
      PK: `FAMILY#${familyId}`,
      SK: `TRANSACTION#${transactionId}`,
      GSI1PK: `FAMILY#${familyId}`,
      GSI1SK: `TRANSACTION#${paidDate}#${transactionId}`,
      entityType: "TRANSACTION",
      transactionId,
      familyId,
      type: "expense",
      amount: paidAmount,
      categoryId: existingBill.categoryId,
      categoryName: existingBill.categoryName,
      description: `Bill payment: ${existingBill.name}`,
      merchant: existingBill.name,
      date: paidDate,
      billId,
      createdBy: user.userId,
      createdAt: currentTime,
      updatedAt: currentTime,
    };

    await dynamoHelpers.putItem(transaction);
    logger.info("Transaction created for bill payment", {
      transactionId,
      billId,
    });
  }

  // Update bill status
  const updates = {
    status: "paid",
    paidDate,
    paidAmount,
    transactionId,
    updatedAt: currentTime,
  };

  // If recurring, calculate and create next occurrence
  let nextBill = null;
  if (existingBill.isRecurring && existingBill.frequency) {
    const nextDueDate = calculateNextDueDate(
      existingBill.dueDate,
      existingBill.frequency,
    );
    updates.nextDueDate = nextDueDate;

    // Create next bill occurrence
    const nextBillId = generateId.custom("bill");
    nextBill = {
      PK: `FAMILY#${familyId}`,
      SK: `BILL#${nextBillId}`,
      GSI1PK: `BILLS#${nextDueDate.substring(0, 7)}`,
      GSI1SK: `${nextDueDate}#${nextBillId}`,
      entityType: "BILL",
      billId: nextBillId,
      familyId,
      name: existingBill.name,
      amount: existingBill.amount,
      dueDate: nextDueDate,
      categoryId: existingBill.categoryId,
      categoryName: existingBill.categoryName,
      status: "unpaid",
      isRecurring: true,
      frequency: existingBill.frequency,
      nextDueDate: null,
      remindersSent: [],
      paidDate: null,
      transactionId: null,
      notes: existingBill.notes,
      previousBillId: billId,
      createdBy: user.userId,
      createdAt: currentTime,
      updatedAt: currentTime,
    };

    await dynamoHelpers.putItem(nextBill);
    logger.info("Next recurring bill created", { nextBillId, nextDueDate });
  }

  const updatedBill = await dynamoHelpers.updateItem(
    `FAMILY#${familyId}`,
    `BILL#${billId}`,
    updates,
  );

  logger.info("Bill marked as paid", { billId, familyId, transactionId });

  return successResponse(
    {
      bill: formatBillResponse(updatedBill),
      transactionId,
      nextBill: nextBill ? formatBillResponse(nextBill) : null,
    },
    "Bill marked as paid successfully",
  );
}

/**
 * Delete a bill
 * DELETE /bills/{billId}
 */
async function deleteBill(event, user, billId) {
  const permissionError = checkPermission(event, "budget:delete");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const existingBill = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
    `BILL#${billId}`,
  );
  if (!existingBill) {
    return errorResponse.notFound("Bill not found");
  }

  // Soft delete
  await dynamoHelpers.updateItem(`FAMILY#${familyId}`, `BILL#${billId}`, {
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    deletedBy: user.userId,
  });

  logger.info("Bill deleted", { billId, familyId });

  return successResponse(null, "Bill deleted successfully");
}

/**
 * Calculate next due date based on frequency
 */
function calculateNextDueDate(currentDueDate, frequency) {
  const date = new Date(currentDueDate);

  switch (frequency) {
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "bi-weekly":
      date.setDate(date.getDate() + 14);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "annually":
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }

  return date.toISOString().split("T")[0];
}

/**
 * Format bill for API response
 */
function formatBillResponse(bill) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(bill.dueDate);
  const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

  // Determine status indicator
  let statusIndicator = "🟢"; // upcoming
  if (bill.status === "paid") {
    statusIndicator = "✅";
  } else if (bill.status === "overdue" || daysUntilDue < 0) {
    statusIndicator = "🔴";
  } else if (daysUntilDue <= 3) {
    statusIndicator = "🟡";
  }

  return {
    billId: bill.billId,
    name: bill.name,
    amount: bill.amount,
    dueDate: bill.dueDate,
    daysUntilDue,
    categoryId: bill.categoryId,
    categoryName: bill.categoryName,
    status: bill.status,
    statusIndicator,
    isRecurring: bill.isRecurring,
    frequency: bill.frequency,
    nextDueDate: bill.nextDueDate,
    paidDate: bill.paidDate,
    paidAmount: bill.paidAmount,
    transactionId: bill.transactionId,
    notes: bill.notes,
    // AI metadata fields
    aiGenerated: bill.aiGenerated || false,
    sourcePatternId: bill.sourcePatternId || null,
    aiConfidenceScore: bill.aiConfidenceScore || null,
    aiDetectedDate: bill.aiDetectedDate || null,
    userModified: bill.userModified || false,
    createdAt: bill.createdAt,
    updatedAt: bill.updatedAt,
  };
}

/**
 * Create a bill from an approved AI-detected pattern
 * POST /bills/from-pattern
 *
 * This endpoint converts an approved pattern into a bill reminder with:
 * - AI metadata preserved (aiGenerated, sourcePatternId, aiConfidenceScore)
 * - Reminder schedule set (7 days, 3 days, due date)
 * - Duplicate detection to prevent redundant bills
 */
async function createBillFromPattern(event, user) {
  const permissionError = checkPermission(event, "budget:create");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const body = parseRequestBody(event.body);

  // Validate required pattern fields
  if (!body.patternId)
    return errorResponse.badRequest("Pattern ID is required");
  if (!body.merchantName)
    return errorResponse.badRequest("Merchant name is required");
  if (!body.suggestedBillName)
    return errorResponse.badRequest("Bill name is required");
  if (!body.averageAmount || body.averageAmount <= 0) {
    return errorResponse.badRequest("Valid average amount is required");
  }
  if (!body.frequency) return errorResponse.badRequest("Frequency is required");
  if (!body.nextExpectedDate)
    return errorResponse.badRequest("Next expected date is required");

  // Validate frequency
  const validFrequencies = [
    "weekly",
    "bi-weekly",
    "monthly",
    "quarterly",
    "annual",
  ];
  if (!validFrequencies.includes(body.frequency)) {
    return errorResponse.badRequest(
      `Frequency must be one of: ${validFrequencies.join(", ")}`,
    );
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.nextExpectedDate)) {
    return errorResponse.badRequest(
      "Next expected date must be in YYYY-MM-DD format",
    );
  }

  // Check for duplicate bills (same merchant name and frequency)
  const duplicateBill = await checkForDuplicateBill(
    familyId,
    body.merchantName,
    body.frequency,
  );
  if (duplicateBill) {
    return errorResponse.conflict(
      `A similar bill already exists: ${duplicateBill.name} (ID: ${duplicateBill.billId})`,
    );
  }

  const billId = generateId.custom("bill");
  const currentTime = new Date().toISOString();
  const dueDate = body.nextExpectedDate;
  const dueDateObj = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Determine initial status
  let status = "unpaid";
  if (dueDateObj < today) {
    status = "overdue";
  }

  // Calculate reminder schedule (7 days, 3 days, due date)
  const reminderSchedule = calculateReminderSchedule(dueDate);

  const bill = {
    PK: `FAMILY#${familyId}`,
    SK: `BILL#${billId}`,
    GSI1PK: `BILLS#${dueDate.substring(0, 7)}`,
    GSI1SK: `${dueDate}#${billId}`,
    entityType: "BILL",
    billId,
    familyId,
    name: body.suggestedBillName,
    merchantName: body.merchantName,
    amount: body.averageAmount,
    dueDate,
    categoryId: body.categoryId || null,
    categoryName: body.categoryName || null,
    status,
    isRecurring: true,
    frequency: body.frequency,
    nextDueDate: null,
    remindersSent: [],
    reminderSchedule,
    paidDate: null,
    transactionId: null,
    notes: body.explanation || null,
    // AI metadata fields
    aiGenerated: true,
    sourcePatternId: body.patternId,
    aiConfidenceScore: body.confidenceScore || null,
    aiDetectedDate: currentTime,
    userModified: false,
    createdBy: user.userId,
    createdAt: currentTime,
    updatedAt: currentTime,
  };

  await dynamoHelpers.putItem(bill);

  logger.info("Bill created from AI pattern", {
    billId,
    familyId,
    patternId: body.patternId,
    merchantName: body.merchantName,
    confidenceScore: body.confidenceScore,
  });

  return successResponse(
    formatBillResponse(bill),
    "Bill created from pattern successfully",
  );
}

/**
 * Check for duplicate bills with same merchant name and frequency
 * Returns the existing bill if found, null otherwise
 */
async function checkForDuplicateBill(familyId, merchantName, frequency) {
  const bills = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
    FilterExpression:
      "entityType = :entityType AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
    ExpressionAttributeValues: {
      ":entityType": "BILL",
      ":false": false,
    },
  });

  // Normalize merchant name for comparison
  const normalizedMerchant = normalizeMerchantName(merchantName);

  for (const bill of bills) {
    // Check if bill has same frequency
    if (bill.frequency !== frequency) continue;

    // Check merchant name similarity (fuzzy match)
    const billMerchant = normalizeMerchantName(bill.merchantName || bill.name);
    if (fuzzyMatchMerchant(normalizedMerchant, billMerchant)) {
      return bill;
    }
  }

  return null;
}

/**
 * Normalize merchant name for comparison
 * - Lowercase
 * - Remove special characters
 * - Trim whitespace
 */
function normalizeMerchantName(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fuzzy match two merchant names using Levenshtein distance
 * Returns true if similarity > 80%
 */
function fuzzyMatchMerchant(name1, name2) {
  if (!name1 || !name2) return false;
  if (name1 === name2) return true;

  const distance = levenshteinDistance(name1, name2);
  const maxLength = Math.max(name1.length, name2.length);
  if (maxLength === 0) return true;

  const similarity = 1 - distance / maxLength;
  return similarity > 0.8;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;

  // Create matrix
  const dp = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate reminder schedule for a bill
 * Returns array of reminder dates: 7 days before, 3 days before, and due date
 */
function calculateReminderSchedule(dueDate) {
  const due = new Date(dueDate);
  const schedule = [];

  // 7 days before
  const sevenDaysBefore = new Date(due);
  sevenDaysBefore.setDate(sevenDaysBefore.getDate() - 7);
  schedule.push({
    date: sevenDaysBefore.toISOString().split("T")[0],
    type: "7_days_before",
    sent: false,
  });

  // 3 days before
  const threeDaysBefore = new Date(due);
  threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
  schedule.push({
    date: threeDaysBefore.toISOString().split("T")[0],
    type: "3_days_before",
    sent: false,
  });

  // Due date
  schedule.push({
    date: dueDate,
    type: "due_date",
    sent: false,
  });

  return schedule;
}
