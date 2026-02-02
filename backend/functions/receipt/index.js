/**
 * BudgetBuddy Receipt Scanning Lambda Function
 *
 * Handles receipt image upload, AI-powered extraction using AWS Textract,
 * and transaction creation from receipt data.
 *
 * Version: 1.1.0
 * **Validates: Requirement 44.3** - Extract total, merchant, date from receipts
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

const {
  TextractClient,
  AnalyzeExpenseCommand,
} = require("@aws-sdk/client-textract");

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// AWS clients
const textractClient = new TextractClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});

// Configuration
const RECEIPT_BUCKET = process.env.RECEIPT_BUCKET || "budgetbuddy-receipts";
const PRESIGNED_URL_EXPIRY = 300; // 5 minutes

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
 * **Validates: Requirement 44.1, 44.2** - Receipt upload endpoint
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
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "application/pdf",
  ];
  if (!allowedTypes.includes(contentType)) {
    return errorResponse.badRequest(
      `Invalid content type. Allowed: ${allowedTypes.join(", ")}`,
    );
  }

  const receiptId = generateId.custom("rcpt");
  const s3Key = `receipts/${familyId}/${receiptId}/${fileName}`;

  try {
    // Generate presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: RECEIPT_BUCKET,
      Key: s3Key,
      ContentType: contentType,
      Metadata: {
        familyId,
        userId: user.userId,
        receiptId,
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRY,
    });

    // Store receipt metadata (pending processing)
    const receipt = {
      PK: `FAMILY#${familyId}`,
      SK: `RECEIPT#${receiptId}`,
      entityType: "RECEIPT",
      receiptId,
      familyId,
      userId: user.userId,
      s3Key,
      fileName,
      contentType,
      status: "pending_upload",
      createdAt: new Date().toISOString(),
    };

    await dynamoHelpers.putItem(receipt);

    logger.info("Upload URL generated", { receiptId, familyId, s3Key });

    return successResponse(
      {
        receiptId,
        uploadUrl,
        s3Key,
        expiresIn: PRESIGNED_URL_EXPIRY,
        remainingScans: limit - usage,
      },
      "Upload URL generated successfully",
    );
  } catch (error) {
    logger.error("Error generating upload URL", error, { familyId });
    return errorResponse.internalError("Failed to generate upload URL");
  }
}

/**
 * Process uploaded receipt with Textract
 * POST /receipt/process
 * **Validates: Requirement 44.3** - Extract total, merchant, date
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

  if (!body.receiptId) {
    return errorResponse.badRequest("receiptId is required");
  }

  // Check daily usage limit
  const usage = await getDailyUsage(familyId, user.userId);
  const limit = user.isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;

  if (usage >= limit) {
    return errorResponse.badRequest(
      `Daily scan limit reached (${limit} scans).`,
    );
  }

  // Get receipt metadata
  const receipt = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
    `RECEIPT#${body.receiptId}`,
  );

  if (!receipt) {
    return errorResponse.notFound("Receipt not found");
  }

  if (receipt.status === "processed") {
    return successResponse(
      {
        receiptId: receipt.receiptId,
        extractedData: receipt.extractedData,
        remainingScans: limit - usage,
      },
      "Receipt already processed",
    );
  }

  const currentTime = new Date().toISOString();

  logger.info("Processing receipt with Textract", {
    receiptId: body.receiptId,
    s3Key: receipt.s3Key,
  });

  try {
    // Extract receipt data using Textract
    const extractedData = await extractReceiptData(receipt.s3Key);

    // Update receipt with extracted data
    const updates = {
      status: "processed",
      extractedData,
      confidence: extractedData.confidence,
      processedAt: currentTime,
      updatedAt: currentTime,
    };

    await dynamoHelpers.updateItem(
      `FAMILY#${familyId}`,
      `RECEIPT#${body.receiptId}`,
      updates,
    );

    // Increment daily usage
    await incrementDailyUsage(familyId, user.userId);

    logger.info("Receipt processed successfully", {
      receiptId: body.receiptId,
      merchant: extractedData.merchant,
      total: extractedData.total,
    });

    return successResponse(
      {
        receiptId: body.receiptId,
        extractedData,
        remainingScans: limit - usage - 1,
      },
      "Receipt processed successfully",
    );
  } catch (error) {
    logger.error("Error processing receipt", error, {
      receiptId: body.receiptId,
    });

    // Update status to failed
    await dynamoHelpers.updateItem(
      `FAMILY#${familyId}`,
      `RECEIPT#${body.receiptId}`,
      {
        status: "failed",
        error: error.message,
        updatedAt: currentTime,
      },
    );

    return errorResponse.internalError("Failed to process receipt");
  }
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
 * Extract receipt data using AWS Textract
 * **Validates: Requirement 44.3** - Extract total, merchant, date
 */
async function extractReceiptData(s3Key) {
  logger.info("Extracting receipt data with Textract", { s3Key });

  try {
    // Call Textract AnalyzeExpense
    const command = new AnalyzeExpenseCommand({
      Document: {
        S3Object: {
          Bucket: RECEIPT_BUCKET,
          Name: s3Key,
        },
      },
    });

    const response = await textractClient.send(command);
    return parseTextractResponse(response);
  } catch (error) {
    logger.error("Textract extraction failed", error);
    // Return empty data on failure
    return {
      merchant: null,
      date: null,
      total: null,
      subtotal: null,
      tax: null,
      items: [],
      confidence: 0,
      rawText: "",
      suggestedCategory: "Uncategorized",
    };
  }
}

/**
 * Parse Textract AnalyzeExpense response
 */
function parseTextractResponse(response) {
  const data = {
    merchant: null,
    date: null,
    total: null,
    subtotal: null,
    tax: null,
    items: [],
    paymentMethod: null,
    confidence: 0,
    rawText: "",
    suggestedCategory: "Shopping",
  };

  if (!response.ExpenseDocuments || response.ExpenseDocuments.length === 0) {
    return data;
  }

  const expenseDoc = response.ExpenseDocuments[0];
  let totalConfidence = 0;
  let fieldCount = 0;

  // Extract summary fields
  if (expenseDoc.SummaryFields) {
    for (const field of expenseDoc.SummaryFields) {
      const fieldType = field.Type?.Text?.toUpperCase();
      const value = field.ValueDetection?.Text;
      const confidence = field.ValueDetection?.Confidence || 0;

      if (!value) continue;

      totalConfidence += confidence;
      fieldCount++;

      switch (fieldType) {
        case "VENDOR_NAME":
        case "NAME":
        case "VENDOR":
          if (!data.merchant || confidence > 80) {
            data.merchant = cleanMerchantName(value);
          }
          break;

        case "TOTAL":
        case "AMOUNT_DUE":
        case "GRAND_TOTAL": {
          const total = parseAmount(value);
          if (total !== null && (!data.total || confidence > 80)) {
            data.total = total;
          }
          break;
        }

        case "SUBTOTAL":
        case "SUB_TOTAL":
          data.subtotal = parseAmount(value);
          break;

        case "TAX":
        case "SALES_TAX":
          data.tax = parseAmount(value);
          break;

        case "INVOICE_RECEIPT_DATE":
        case "DATE":
        case "TRANSACTION_DATE": {
          const date = parseDate(value);
          if (date) {
            data.date = date;
          }
          break;
        }

        case "PAYMENT_METHOD":
          data.paymentMethod = value;
          break;
      }
    }
  }

  // Extract line items
  if (expenseDoc.LineItemGroups) {
    for (const group of expenseDoc.LineItemGroups) {
      if (group.LineItems) {
        for (const lineItem of group.LineItems) {
          const item = extractLineItem(lineItem);
          if (item) {
            data.items.push(item);
          }
        }
      }
    }
  }

  // Calculate average confidence
  data.confidence =
    fieldCount > 0 ? Math.round(totalConfidence / fieldCount) / 100 : 0;

  // Build raw text from blocks
  if (expenseDoc.Blocks) {
    const textBlocks = expenseDoc.Blocks.filter((b) => b.BlockType === "LINE")
      .map((b) => b.Text)
      .filter(Boolean);
    data.rawText = textBlocks.join("\n");
  }

  // Suggest category based on merchant
  if (data.merchant) {
    data.suggestedCategory = suggestCategory(data.merchant);
  }

  return data;
}

/**
 * Extract a line item from Textract response
 */
function extractLineItem(lineItem) {
  if (!lineItem.LineItemExpenseFields) return null;

  const item = {
    name: null,
    quantity: null,
    price: null,
  };

  for (const field of lineItem.LineItemExpenseFields) {
    const fieldType = field.Type?.Text?.toUpperCase();
    const value = field.ValueDetection?.Text;

    if (!value) continue;

    switch (fieldType) {
      case "ITEM":
      case "PRODUCT_CODE":
      case "EXPENSE_ROW":
        item.name = value;
        break;

      case "QUANTITY":
        item.quantity = parseFloat(value) || 1;
        break;

      case "PRICE":
        item.price = parseAmount(value);
        break;
    }
  }

  if (item.name || item.price) {
    return item;
  }

  return null;
}

/**
 * Clean merchant name
 */
function cleanMerchantName(name) {
  if (!name) return null;
  return name
    .replace(/\s+(INC|LLC|LTD|CORP|CO|STORE|#\d+)\.?$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse amount from string
 */
function parseAmount(value) {
  if (!value) return null;
  const cleaned = value.replace(/[$£€,]/g, "").trim();
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? null : Math.round(amount * 100) / 100;
}

/**
 * Parse date from string
 */
function parseDate(value) {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Suggest category based on merchant name
 * **Validates: Requirement 44.5** - Auto-suggest category
 */
function suggestCategory(merchant) {
  if (!merchant) return "Uncategorized";

  const merchantLower = merchant.toLowerCase();

  const categoryPatterns = {
    Groceries: [
      "walmart",
      "target",
      "costco",
      "kroger",
      "safeway",
      "whole foods",
      "trader joe",
      "aldi",
      "publix",
    ],
    Dining: [
      "mcdonald",
      "starbucks",
      "chipotle",
      "subway",
      "pizza",
      "restaurant",
      "cafe",
      "diner",
      "grill",
    ],
    Gas: ["shell", "chevron", "exxon", "mobil", "bp", "gas", "fuel", "76"],
    Shopping: [
      "amazon",
      "best buy",
      "home depot",
      "lowes",
      "ikea",
      "nordstrom",
      "macy",
    ],
    Entertainment: [
      "netflix",
      "spotify",
      "hulu",
      "disney",
      "amc",
      "cinema",
      "theater",
    ],
    Healthcare: [
      "cvs",
      "walgreens",
      "pharmacy",
      "hospital",
      "clinic",
      "doctor",
    ],
    Transportation: ["uber", "lyft", "taxi", "parking", "transit"],
  };

  for (const [category, patterns] of Object.entries(categoryPatterns)) {
    if (patterns.some((pattern) => merchantLower.includes(pattern))) {
      return category;
    }
  }

  return "Shopping";
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
