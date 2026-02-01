/**
 * BudgetBuddy Receipt-to-Bank Reconciliation Lambda Function
 *
 * Handles matching receipts with bank transactions, confidence scoring,
 * and manual reconciliation workflows.
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

// Matching thresholds
const AMOUNT_TOLERANCE = 0.5; // ±$0.50
const DATE_TOLERANCE_DAYS = 2; // ±2 days
const HIGH_CONFIDENCE_THRESHOLD = 0.85;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.6;

/**
 * Main Lambda handler for reconciliation operations
 */
exports.handler = async (event, context) => {
  logger.info("Reconciliation request received", {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context.awsRequestId,
  });

  try {
    const { httpMethod, path, pathParameters } = event;

    // Health check endpoint
    if (httpMethod === "GET" && path === "/reconcile/health") {
      return successResponse(
        { status: "healthy", service: "reconciliation", version: "1.0.0" },
        "Reconciliation service is healthy",
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
    if (httpMethod === "GET" && path === "/reconcile/status") {
      return await getReconciliationStatus(event, user);
    }

    if (httpMethod === "GET" && path === "/reconcile/unmatched") {
      return await getUnmatchedItems(event, user);
    }

    if (httpMethod === "GET" && path === "/reconcile/suggestions") {
      return await getMatchSuggestions(event, user);
    }

    if (httpMethod === "POST" && path === "/reconcile/match") {
      return await createMatch(event, user);
    }

    if (httpMethod === "POST" && path === "/reconcile/unmatch") {
      return await removeMatch(event, user);
    }

    if (httpMethod === "POST" && path === "/reconcile/auto") {
      return await autoReconcile(event, user);
    }

    if (httpMethod === "GET" && pathParameters?.matchId) {
      return await getMatch(event, user, pathParameters.matchId);
    }

    return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);
  } catch (error) {
    logger.error("Reconciliation function error", error, {
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
 * Get reconciliation status overview
 * GET /reconcile/status
 */
async function getReconciliationStatus(event, user) {
  const permissionError = checkPermission(event, "transaction:view");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  // Get receipts
  const receipts = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
    FilterExpression: "entityType = :entityType",
    ExpressionAttributeValues: { ":entityType": "RECEIPT" },
  });

  // Get bank transactions (from Plaid)
  const bankTransactions = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
    FilterExpression: "entityType = :entityType AND #source = :plaid",
    ExpressionAttributeNames: { "#source": "source" },
    ExpressionAttributeValues: {
      ":entityType": "TRANSACTION",
      ":plaid": "plaid",
    },
  });

  // Get existing matches
  const matches = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
    FilterExpression: "entityType = :entityType",
    ExpressionAttributeValues: { ":entityType": "RECONCILIATION_MATCH" },
  });

  const matchedReceiptIds = new Set(matches.map((m) => m.receiptId));
  const matchedTransactionIds = new Set(matches.map((m) => m.transactionId));

  const unmatchedReceipts = receipts.filter(
    (r) => !matchedReceiptIds.has(r.receiptId),
  );
  const unmatchedTransactions = bankTransactions.filter(
    (t) => !matchedTransactionIds.has(t.transactionId),
  );

  return successResponse(
    {
      summary: {
        totalReceipts: receipts.length,
        totalBankTransactions: bankTransactions.length,
        matchedCount: matches.length,
        unmatchedReceipts: unmatchedReceipts.length,
        unmatchedTransactions: unmatchedTransactions.length,
        reconciliationRate:
          receipts.length > 0
            ? Math.round((matches.length / receipts.length) * 100)
            : 0,
      },
      recentMatches: matches.slice(-5).map(formatMatchResponse),
    },
    "Reconciliation status retrieved successfully",
  );
}

/**
 * Get unmatched items (receipts and transactions)
 * GET /reconcile/unmatched
 */
async function getUnmatchedItems(event, user) {
  const permissionError = checkPermission(event, "transaction:view");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const queryParams = event.queryStringParameters || {};
  const type = queryParams.type || "all"; // receipts, transactions, all

  // Get existing matches
  const matches = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
    FilterExpression: "entityType = :entityType",
    ExpressionAttributeValues: { ":entityType": "RECONCILIATION_MATCH" },
  });

  const matchedReceiptIds = new Set(matches.map((m) => m.receiptId));
  const matchedTransactionIds = new Set(matches.map((m) => m.transactionId));

  const result = { unmatchedReceipts: [], unmatchedTransactions: [] };

  if (type === "receipts" || type === "all") {
    const receipts = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
      FilterExpression: "entityType = :entityType",
      ExpressionAttributeValues: { ":entityType": "RECEIPT" },
    });
    result.unmatchedReceipts = receipts
      .filter((r) => !matchedReceiptIds.has(r.receiptId))
      .map(formatReceiptForMatching);
  }

  if (type === "transactions" || type === "all") {
    const transactions = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
      FilterExpression: "entityType = :entityType AND #source = :plaid",
      ExpressionAttributeNames: { "#source": "source" },
      ExpressionAttributeValues: {
        ":entityType": "TRANSACTION",
        ":plaid": "plaid",
      },
    });
    result.unmatchedTransactions = transactions
      .filter((t) => !matchedTransactionIds.has(t.transactionId))
      .map(formatTransactionForMatching);
  }

  return successResponse(result, "Unmatched items retrieved successfully");
}

/**
 * Get match suggestions for a receipt or transaction
 * GET /reconcile/suggestions
 */
async function getMatchSuggestions(event, user) {
  const permissionError = checkPermission(event, "transaction:view");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const queryParams = event.queryStringParameters || {};
  const { receiptId, transactionId } = queryParams;

  if (!receiptId && !transactionId) {
    return errorResponse.badRequest(
      "Either receiptId or transactionId is required",
    );
  }

  // Get existing matches to exclude
  const matches = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
    FilterExpression: "entityType = :entityType",
    ExpressionAttributeValues: { ":entityType": "RECONCILIATION_MATCH" },
  });

  const matchedReceiptIds = new Set(matches.map((m) => m.receiptId));
  const matchedTransactionIds = new Set(matches.map((m) => m.transactionId));

  let suggestions = [];

  if (receiptId) {
    // Find matching transactions for this receipt
    const receipt = await dynamoHelpers.getItem(
      `FAMILY#${familyId}`,
      `RECEIPT#${receiptId}`,
    );

    if (!receipt) {
      return errorResponse.notFound("Receipt not found");
    }

    const transactions = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
      FilterExpression: "entityType = :entityType AND #source = :plaid",
      ExpressionAttributeNames: { "#source": "source" },
      ExpressionAttributeValues: {
        ":entityType": "TRANSACTION",
        ":plaid": "plaid",
      },
    });

    suggestions = transactions
      .filter((t) => !matchedTransactionIds.has(t.transactionId))
      .map((t) => ({
        transaction: formatTransactionForMatching(t),
        confidence: calculateMatchConfidence(receipt, t),
      }))
      .filter((s) => s.confidence.score > 0.3)
      .sort((a, b) => b.confidence.score - a.confidence.score)
      .slice(0, 10);
  } else if (transactionId) {
    // Find matching receipts for this transaction
    const transaction = await dynamoHelpers.getItem(
      `FAMILY#${familyId}`,
      `TRANSACTION#${transactionId}`,
    );

    if (!transaction) {
      return errorResponse.notFound("Transaction not found");
    }

    const receipts = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
      FilterExpression: "entityType = :entityType",
      ExpressionAttributeValues: { ":entityType": "RECEIPT" },
    });

    suggestions = receipts
      .filter((r) => !matchedReceiptIds.has(r.receiptId))
      .map((r) => ({
        receipt: formatReceiptForMatching(r),
        confidence: calculateMatchConfidence(r, transaction),
      }))
      .filter((s) => s.confidence.score > 0.3)
      .sort((a, b) => b.confidence.score - a.confidence.score)
      .slice(0, 10);
  }

  return successResponse(
    { suggestions, count: suggestions.length },
    "Match suggestions retrieved successfully",
  );
}

/**
 * Create a match between receipt and transaction
 * POST /reconcile/match
 */
async function createMatch(event, user) {
  const permissionError = checkPermission(event, "transaction:edit");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const body = parseRequestBody(event.body);

  if (!body.receiptId || !body.transactionId) {
    return errorResponse.badRequest(
      "Both receiptId and transactionId are required",
    );
  }

  // Verify receipt exists
  const receipt = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
    `RECEIPT#${body.receiptId}`,
  );
  if (!receipt) {
    return errorResponse.notFound("Receipt not found");
  }

  // Verify transaction exists
  const transaction = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
    `TRANSACTION#${body.transactionId}`,
  );
  if (!transaction) {
    return errorResponse.notFound("Transaction not found");
  }

  // Check if either is already matched
  const existingMatches = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
    FilterExpression:
      "entityType = :entityType AND (receiptId = :receiptId OR transactionId = :transactionId)",
    ExpressionAttributeValues: {
      ":entityType": "RECONCILIATION_MATCH",
      ":receiptId": body.receiptId,
      ":transactionId": body.transactionId,
    },
  });

  if (existingMatches.length > 0) {
    return errorResponse.badRequest(
      "Receipt or transaction is already matched",
    );
  }

  const matchId = generateId.custom("match");
  const currentTime = new Date().toISOString();
  const confidence = calculateMatchConfidence(receipt, transaction);

  const match = {
    PK: `FAMILY#${familyId}`,
    SK: `RECONCILIATION_MATCH#${matchId}`,
    entityType: "RECONCILIATION_MATCH",
    matchId,
    familyId,
    receiptId: body.receiptId,
    transactionId: body.transactionId,
    confidence: confidence.score,
    confidenceFactors: confidence.factors,
    matchType: body.manual ? "manual" : "suggested",
    createdBy: user.userId,
    createdAt: currentTime,
  };

  await dynamoHelpers.putItem(match);

  // Update receipt with linked transaction
  await dynamoHelpers.updateItem(
    `FAMILY#${familyId}`,
    `RECEIPT#${body.receiptId}`,
    {
      linkedTransactionId: body.transactionId,
      reconciledAt: currentTime,
    },
  );

  // Update transaction with linked receipt
  await dynamoHelpers.updateItem(
    `FAMILY#${familyId}`,
    `TRANSACTION#${body.transactionId}`,
    {
      linkedReceiptId: body.receiptId,
      reconciledAt: currentTime,
    },
  );

  logger.info("Match created", {
    matchId,
    receiptId: body.receiptId,
    transactionId: body.transactionId,
    confidence: confidence.score,
  });

  return successResponse(
    formatMatchResponse(match),
    "Match created successfully",
  );
}

/**
 * Remove a match
 * POST /reconcile/unmatch
 */
async function removeMatch(event, user) {
  const permissionError = checkPermission(event, "transaction:edit");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const body = parseRequestBody(event.body);

  if (!body.matchId) {
    return errorResponse.badRequest("matchId is required");
  }

  const match = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
    `RECONCILIATION_MATCH#${body.matchId}`,
  );

  if (!match) {
    return errorResponse.notFound("Match not found");
  }

  // Remove links from receipt and transaction
  await dynamoHelpers.updateItem(
    `FAMILY#${familyId}`,
    `RECEIPT#${match.receiptId}`,
    {
      linkedTransactionId: null,
      reconciledAt: null,
    },
  );

  await dynamoHelpers.updateItem(
    `FAMILY#${familyId}`,
    `TRANSACTION#${match.transactionId}`,
    {
      linkedReceiptId: null,
      reconciledAt: null,
    },
  );

  // Delete the match record
  // Note: In production, might want to soft delete for audit trail
  await dynamoHelpers.updateItem(
    `FAMILY#${familyId}`,
    `RECONCILIATION_MATCH#${body.matchId}`,
    {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: user.userId,
    },
  );

  logger.info("Match removed", { matchId: body.matchId });

  return successResponse(null, "Match removed successfully");
}

/**
 * Auto-reconcile all unmatched items
 * POST /reconcile/auto
 */
async function autoReconcile(event, user) {
  const permissionError = checkPermission(event, "transaction:edit");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const body = parseRequestBody(event.body);
  const minConfidence = body.minConfidence || HIGH_CONFIDENCE_THRESHOLD;

  // Get existing matches
  const existingMatches = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
    FilterExpression: "entityType = :entityType",
    ExpressionAttributeValues: { ":entityType": "RECONCILIATION_MATCH" },
  });

  const matchedReceiptIds = new Set(existingMatches.map((m) => m.receiptId));
  const matchedTransactionIds = new Set(
    existingMatches.map((m) => m.transactionId),
  );

  // Get unmatched receipts
  const receipts = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
    FilterExpression: "entityType = :entityType",
    ExpressionAttributeValues: { ":entityType": "RECEIPT" },
  });
  const unmatchedReceipts = receipts.filter(
    (r) => !matchedReceiptIds.has(r.receiptId),
  );

  // Get unmatched transactions
  const transactions = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
    FilterExpression: "entityType = :entityType AND #source = :plaid",
    ExpressionAttributeNames: { "#source": "source" },
    ExpressionAttributeValues: {
      ":entityType": "TRANSACTION",
      ":plaid": "plaid",
    },
  });
  const unmatchedTransactions = transactions.filter(
    (t) => !matchedTransactionIds.has(t.transactionId),
  );

  const newMatches = [];
  const usedTransactionIds = new Set();
  const currentTime = new Date().toISOString();

  // Find best matches for each receipt
  for (const receipt of unmatchedReceipts) {
    let bestMatch = null;
    let bestConfidence = 0;

    for (const transaction of unmatchedTransactions) {
      if (usedTransactionIds.has(transaction.transactionId)) continue;

      const confidence = calculateMatchConfidence(receipt, transaction);
      if (
        confidence.score >= minConfidence &&
        confidence.score > bestConfidence
      ) {
        bestMatch = transaction;
        bestConfidence = confidence.score;
      }
    }

    if (bestMatch) {
      const matchId = generateId.custom("match");
      const confidence = calculateMatchConfidence(receipt, bestMatch);

      const match = {
        PK: `FAMILY#${familyId}`,
        SK: `RECONCILIATION_MATCH#${matchId}`,
        entityType: "RECONCILIATION_MATCH",
        matchId,
        familyId,
        receiptId: receipt.receiptId,
        transactionId: bestMatch.transactionId,
        confidence: confidence.score,
        confidenceFactors: confidence.factors,
        matchType: "auto",
        createdBy: user.userId,
        createdAt: currentTime,
      };

      await dynamoHelpers.putItem(match);

      // Update links
      await dynamoHelpers.updateItem(
        `FAMILY#${familyId}`,
        `RECEIPT#${receipt.receiptId}`,
        {
          linkedTransactionId: bestMatch.transactionId,
          reconciledAt: currentTime,
        },
      );

      await dynamoHelpers.updateItem(
        `FAMILY#${familyId}`,
        `TRANSACTION#${bestMatch.transactionId}`,
        { linkedReceiptId: receipt.receiptId, reconciledAt: currentTime },
      );

      usedTransactionIds.add(bestMatch.transactionId);
      newMatches.push(formatMatchResponse(match));
    }
  }

  logger.info("Auto-reconciliation completed", {
    familyId,
    matchesCreated: newMatches.length,
    minConfidence,
  });

  return successResponse(
    {
      matchesCreated: newMatches.length,
      matches: newMatches,
      remainingUnmatched: {
        receipts: unmatchedReceipts.length - newMatches.length,
        transactions: unmatchedTransactions.length - newMatches.length,
      },
    },
    "Auto-reconciliation completed",
  );
}

/**
 * Get a specific match
 * GET /reconcile/{matchId}
 */
async function getMatch(event, user, matchId) {
  const permissionError = checkPermission(event, "transaction:view");
  if (permissionError) return permissionError;

  const familyId = await FamilyIdResolver.resolveFamilyId(
    user.userId,
    user.familyId,
    dynamoHelpers,
  );

  const match = await dynamoHelpers.getItem(
    `FAMILY#${familyId}`,
    `RECONCILIATION_MATCH#${matchId}`,
  );

  if (!match || match.isDeleted) {
    return errorResponse.notFound("Match not found");
  }

  return successResponse(
    formatMatchResponse(match),
    "Match retrieved successfully",
  );
}

// ============ Helper Functions ============

/**
 * Calculate match confidence between receipt and transaction
 */
function calculateMatchConfidence(receipt, transaction) {
  const factors = {
    amount: 0,
    date: 0,
    merchant: 0,
  };

  // Amount matching (±$0.50 tolerance)
  const receiptAmount = receipt.extractedData?.total || 0;
  const transactionAmount = Math.abs(transaction.amount || 0);
  const amountDiff = Math.abs(receiptAmount - transactionAmount);

  if (amountDiff === 0) {
    factors.amount = 1.0;
  } else if (amountDiff <= AMOUNT_TOLERANCE) {
    factors.amount = 0.9 - (amountDiff / AMOUNT_TOLERANCE) * 0.2;
  } else if (amountDiff <= 2) {
    factors.amount = 0.5;
  } else {
    factors.amount = Math.max(0, 0.3 - amountDiff / 100);
  }

  // Date matching (±2 days tolerance)
  const receiptDate = new Date(
    receipt.extractedData?.date || receipt.createdAt,
  );
  const transactionDate = new Date(transaction.date);
  const daysDiff = Math.abs(
    (receiptDate - transactionDate) / (1000 * 60 * 60 * 24),
  );

  if (daysDiff === 0) {
    factors.date = 1.0;
  } else if (daysDiff <= DATE_TOLERANCE_DAYS) {
    factors.date = 1.0 - (daysDiff / DATE_TOLERANCE_DAYS) * 0.3;
  } else if (daysDiff <= 7) {
    factors.date = 0.4;
  } else {
    factors.date = Math.max(0, 0.2 - daysDiff / 30);
  }

  // Merchant matching (fuzzy)
  const receiptMerchant = (receipt.extractedData?.merchant || "").toLowerCase();
  const transactionMerchant = (transaction.merchant || "").toLowerCase();

  if (receiptMerchant && transactionMerchant) {
    if (receiptMerchant === transactionMerchant) {
      factors.merchant = 1.0;
    } else if (
      receiptMerchant.includes(transactionMerchant) ||
      transactionMerchant.includes(receiptMerchant)
    ) {
      factors.merchant = 0.8;
    } else {
      // Simple word overlap
      const receiptWords = receiptMerchant.split(/\s+/);
      const transactionWords = transactionMerchant.split(/\s+/);
      const overlap = receiptWords.filter((w) =>
        transactionWords.some((tw) => tw.includes(w) || w.includes(tw)),
      ).length;
      factors.merchant = Math.min(
        0.6,
        (overlap / Math.max(receiptWords.length, transactionWords.length)) *
          0.6,
      );
    }
  }

  // Weighted score (amount is most important)
  const score =
    factors.amount * 0.5 + factors.date * 0.3 + factors.merchant * 0.2;

  return {
    score: Math.round(score * 100) / 100,
    factors,
    level:
      score >= HIGH_CONFIDENCE_THRESHOLD
        ? "high"
        : score >= MEDIUM_CONFIDENCE_THRESHOLD
          ? "medium"
          : "low",
  };
}

/**
 * Format receipt for matching display
 */
function formatReceiptForMatching(receipt) {
  return {
    receiptId: receipt.receiptId,
    merchant: receipt.extractedData?.merchant || "Unknown",
    amount: receipt.extractedData?.total || 0,
    date: receipt.extractedData?.date || receipt.createdAt?.split("T")[0],
    createdAt: receipt.createdAt,
  };
}

/**
 * Format transaction for matching display
 */
function formatTransactionForMatching(transaction) {
  return {
    transactionId: transaction.transactionId,
    merchant: transaction.merchant || transaction.description,
    amount: Math.abs(transaction.amount || 0),
    date: transaction.date,
    category: transaction.categoryName,
  };
}

/**
 * Format match for API response
 */
function formatMatchResponse(match) {
  return {
    matchId: match.matchId,
    receiptId: match.receiptId,
    transactionId: match.transactionId,
    confidence: match.confidence,
    confidenceLevel:
      match.confidence >= HIGH_CONFIDENCE_THRESHOLD
        ? "high"
        : match.confidence >= MEDIUM_CONFIDENCE_THRESHOLD
          ? "medium"
          : "low",
    confidenceFactors: match.confidenceFactors,
    matchType: match.matchType,
    createdAt: match.createdAt,
  };
}
