/**
 * BudgetBuddy Receipt Scanning Lambda Function
 *
 * Handles receipt image upload, AI-powered extraction using Claude Haiku,
 * and transaction creation from receipt data.
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

// Daily scan limits
const FREE_DAILY_LIMIT = 10;
const PREMIUM_DAILY_LIMIT = 50;

/**
 * Main Lambda handler for receipt operations
 */
exports.handler = async (event, context) => {
  logger.info("Receipt request received", {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context.awsRequestId,
  });

  try {
    const { httpMethod, path, pathParameters } = event;

    // Health check endpoint
    if (httpMethod === "GET" && path === "/receipt/health") {
      return successResponse(
        { status: "healthy", service: "receipt", version: "1.0.0" },
        "Receipt service is healthy",
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
    if (httpMethod === "POST" && path === "/receipt/upload") {
      return await getUploadUrl(event, user);
    }

    if (httpMethod === "POST" && path === "/receipt/process") {
      return await processReceipt(event, user);
    }

    if (httpMethod === "GET" && path === "/receipt/usage") {
      return await getUsage(event, user);
    }

    if (httpMethod === "GET" && pathParameters?.receiptId) {
      return await getReceipt(event, user, pathParameters.receiptId);
    }

    if (httpMethod === "GET" && path === "/receipt/history") {
      return await getReceiptHistory(event, user);
    }

    return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);
  } catch (error) {
    logger.error("Receipt function error", error, {
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
 * Generate presigned URL for receipt upload
 * POST /receipt/upload
 */
async function getUploadUrl(event, user) {
  const permissionError = checkPermission(event, "transaction:create");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  // Check daily usage limit
  const usage = await getDailyUsage(familyId, user.userId);
  const limit = user.isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;

  if (usage >= limit) {
    return errorResponse.badRequest(
      `Daily scan limit reached (${limit} scans). ${user.isPremium ? "Try again tomorrow." : "Upgrade to Premium for more scans."}`,
    );
  }

  const body = parseRequestBody(event.body);
  const contentType = body.contentType || "image/jpeg";
  const fileName = body.fileName || `receipt_${Date.now()}.jpg`;

  // Validate content type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
  if (!allowedTypes.includes(contentType)) {
    return errorResponse.badRequest(
      `Invalid content type. Allowed: ${allowedTypes.join(", ")}`,
    );
  }

  const receiptId = generateId.custom("rcpt");
  const s3Key = `receipts/${familyId}/${receiptId}/${fileName}`;

  // In production, this would generate a presigned URL using AWS SDK
  // For now, return mock data
  const uploadUrl = `https://budgetbuddy-receipts.s3.amazonaws.com/${s3Key}?presigned=true`;
  const expiresIn = 300; // 5 minutes

  logger.info("Upload URL generated", { receiptId, familyId, s3Key });

  return successResponse(
    {
      receiptId,
      uploadUrl,
      s3Key,
      expiresIn,
      remainingScans: limit - usage,
    },
    "Upload URL generated successfully",
  );
}

/**
 * Process uploaded receipt with AI
 * POST /receipt/process
 */
async function processReceipt(event, user) {
  const permissionError = checkPermission(event, "transaction:create");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const body = parseRequestBody(event.body);

  if (!body.receiptId && !body.imageBase64) {
    return errorResponse.badRequest("receiptId or imageBase64 is required");
  }

  // Check daily usage limit
  const usage = await getDailyUsage(familyId, user.userId);
  const limit = user.isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;

  if (usage >= limit) {
    return errorResponse.badRequest(
      `Daily scan limit reached (${limit} scans).`,
    );
  }

  const receiptId = body.receiptId || generateId.custom("rcpt");
  const currentTime = new Date().toISOString();

  logger.info("Processing receipt", { receiptId, familyId });

  // Extract receipt data using AI (Claude Haiku via Bedrock)
  // In production, this would call Bedrock. For now, use mock extraction.
  const extractedData = await extractReceiptData(body.imageBase64);

  // Create receipt record
  const receipt = {
    PK: `FAMILY#${familyId}`,
    SK: `RECEIPT#${receiptId}`,
    entityType: "RECEIPT",
    receiptId,
    familyId,
    status: "processed",
    extractedData,
    confidence: extractedData.confidence,
    s3Key: body.s3Key || null,
    processedAt: currentTime,
    createdBy: user.userId,
    createdAt: currentTime,
    updatedAt: currentTime,
  };

  await dynamoHelpers.putItem(receipt);

  // Increment daily usage
  await incrementDailyUsage(familyId, user.userId);

  logger.info("Receipt processed successfully", {
    receiptId,
    merchant: extractedData.merchant,
    total: extractedData.total,
  });

  return successResponse(
    {
      receiptId,
      extractedData,
      remainingScans: limit - usage - 1,
    },
    "Receipt processed successfully",
  );
}

/**
 * Get receipt by ID
 * GET /receipt/{receiptId}
 */
async function getReceipt(event, user, receiptId) {
  const permissionError = checkPermission(event, "transaction:view");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const receipt = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
    `RECEIPT#${receiptId}`,
  );

  if (!receipt) {
    return errorResponse.notFound("Receipt not found");
  }

  return successResponse(
    formatReceiptResponse(receipt),
    "Receipt retrieved successfully",
  );
}

/**
 * Get receipt history
 * GET /receipt/history
 */
async function getReceiptHistory(event, user) {
  const permissionError = checkPermission(event, "transaction:view");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const queryParams = event.queryStringParameters || {};
  const limit = Math.min(parseInt(queryParams.limit, 10) || 20, 50);

  const receipts = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
    FilterExpression: "entityType = :entityType",
    ExpressionAttributeValues: { ":entityType": "RECEIPT" },
    Limit: limit,
    ScanIndexForward: false,
  });

  return successResponse(
    {
      receipts: receipts.map(formatReceiptResponse),
      count: receipts.length,
    },
    "Receipt history retrieved successfully",
  );
}

/**
 * Get daily usage statistics
 * GET /receipt/usage
 */
async function getUsage(event, user) {
  const permissionError = checkPermission(event, "transaction:view");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const usage = await getDailyUsage(familyId, user.userId);
  const limit = user.isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;

  return successResponse(
    {
      dailyUsed: usage,
      dailyLimit: limit,
      remaining: Math.max(0, limit - usage),
      isPremium: user.isPremium || false,
      resetsAt: getNextMidnight(),
    },
    "Usage retrieved successfully",
  );
}

// ============ Helper Functions ============

/**
 * Extract receipt data using AI (Claude Haiku via Bedrock)
 * In production, this would call AWS Bedrock
 */
async function extractReceiptData(_imageBase64) {
  // Mock extraction for development
  // In production, this would:
  // 1. Call Bedrock with Claude Haiku model
  // 2. Send image as base64 with extraction prompt
  // 3. Parse the JSON response

  logger.info("Extracting receipt data with AI");

  // Simulate AI processing delay
  await new Promise((resolve) => global.setTimeout(resolve, 100));

  // Return mock extracted data
  // In production, this would be the actual AI response
  return {
    merchant: "Sample Store",
    date: new Date().toISOString().split("T")[0],
    total: 42.99,
    subtotal: 39.99,
    tax: 3.0,
    items: [
      { name: "Item 1", quantity: 1, price: 19.99 },
      { name: "Item 2", quantity: 2, price: 10.0 },
    ],
    paymentMethod: "Credit Card",
    confidence: 0.92,
    rawText: "Sample receipt text...",
    suggestedCategory: "Shopping",
  };
}

/**
 * Get daily usage count for a user
 */
async function getDailyUsage(familyId, userId) {
  const today = new Date().toISOString().split("T")[0];
  const usageKey = `USAGE#${today}#${userId}`;

  const usage = await dynamoHelpers.getItem(`FAMILY#${familyId}`, usageKey);
  return usage?.count || 0;
}

/**
 * Increment daily usage count
 */
async function incrementDailyUsage(familyId, userId) {
  const today = new Date().toISOString().split("T")[0];
  const usageKey = `USAGE#${today}#${userId}`;

  const existing = await dynamoHelpers.getItem(`FAMILY#${familyId}`, usageKey);

  if (existing) {
    await dynamoHelpers.updateItem(`FAMILY#${familyId}`, usageKey, {
      count: (existing.count || 0) + 1,
      updatedAt: new Date().toISOString(),
    });
  } else {
    await dynamoHelpers.putItem({
      PK: `FAMILY#${familyId}`,
      SK: usageKey,
      entityType: "USAGE",
      userId,
      date: today,
      count: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // TTL for automatic cleanup after 7 days
      ttl: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    });
  }
}

/**
 * Get next midnight timestamp
 */
function getNextMidnight() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

/**
 * Format receipt for API response
 */
function formatReceiptResponse(receipt) {
  return {
    receiptId: receipt.receiptId,
    status: receipt.status,
    extractedData: receipt.extractedData,
    confidence: receipt.confidence,
    linkedTransactionId: receipt.linkedTransactionId || null,
    processedAt: receipt.processedAt,
    createdAt: receipt.createdAt,
  };
}
