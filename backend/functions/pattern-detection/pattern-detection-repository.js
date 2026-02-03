/**
 * Pattern Detection Repository
 *
 * Data access layer for pattern detection operations.
 * Handles DynamoDB queries for transactions and pattern storage.
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME;

/**
 * Get transaction history for a family within a date range
 * @param {string} familyId - Family ID
 * @param {string} startDate - Start date (ISO 8601)
 * @param {string} endDate - End date (ISO 8601)
 * @returns {Promise<Array>} Array of transactions
 */
async function getTransactionHistory(familyId, startDate, endDate) {
  if (!familyId) {
    throw new Error("familyId is required");
  }
  if (!startDate || !endDate) {
    throw new Error("startDate and endDate are required");
  }

  try {
    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND SK BETWEEN :startSK AND :endSK",
      ExpressionAttributeValues: {
        ":pk": `FAMILY#${familyId}`,
        ":startSK": `TRANSACTION#${startDate}`,
        ":endSK": `TRANSACTION#${endDate}`,
      },
    };

    const result = await docClient.send(new QueryCommand(params));
    return result.Items || [];
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    throw new Error(`Failed to fetch transaction history: ${error.message}`);
  }
}

/**
 * Save a detected pattern to DynamoDB
 * @param {Object} pattern - Pattern object
 * @returns {Promise<Object>} Saved pattern
 */
async function savePattern(pattern) {
  if (!pattern.familyId) {
    throw new Error("familyId is required");
  }

  const patternId = pattern.patternId || uuidv4();
  const timestamp = new Date().toISOString();

  const item = {
    PK: `FAMILY#${pattern.familyId}`,
    SK: `PATTERN#${patternId}`,
    patternId,
    familyId: pattern.familyId,
    userId: pattern.userId,
    merchantName: pattern.merchantName,
    suggestedBillName: pattern.suggestedBillName,
    averageAmount: pattern.averageAmount,
    amountStdDev: pattern.amountStdDev || 0,
    frequency: pattern.frequency,
    confidenceScore: pattern.confidenceScore,
    status: pattern.status || "pending",
    categoryId: pattern.categoryId,
    nextExpectedDate: pattern.nextExpectedDate,
    occurrences: pattern.occurrences || [],
    explanation: pattern.explanation || "",
    createdAt: pattern.createdAt || timestamp,
    updatedAt: timestamp,
    aiModelVersion: pattern.aiModelVersion || "claude-3.5-sonnet",
    analysisMonths: pattern.analysisMonths || 6,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      }),
    );

    return item;
  } catch (error) {
    console.error("Error saving pattern:", error);
    throw new Error(`Failed to save pattern: ${error.message}`);
  }
}

/**
 * Get patterns for a family with optional status filtering
 * @param {string} familyId - Family ID
 * @param {string} status - Optional status filter ('pending', 'approved', 'rejected', 'ignored')
 * @returns {Promise<Array>} Array of patterns
 */
async function getPatternsByFamily(familyId, status = null) {
  if (!familyId) {
    throw new Error("familyId is required");
  }

  try {
    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `FAMILY#${familyId}`,
        ":skPrefix": "PATTERN#",
      },
    };

    // Add status filter if provided
    if (status) {
      params.FilterExpression = "#status = :status";
      params.ExpressionAttributeNames = {
        "#status": "status",
      };
      params.ExpressionAttributeValues[":status"] = status;
    }

    const result = await docClient.send(new QueryCommand(params));
    return result.Items || [];
  } catch (error) {
    console.error("Error fetching patterns:", error);
    throw new Error(`Failed to fetch patterns: ${error.message}`);
  }
}

/**
 * Update pattern status (approve, reject, ignore)
 * @param {string} familyId - Family ID
 * @param {string} patternId - Pattern ID
 * @param {string} status - New status
 * @param {string} userId - User making the update
 * @param {string} billId - Optional bill ID if approved
 * @returns {Promise<Object>} Updated pattern
 */
async function updatePatternStatus(
  familyId,
  patternId,
  status,
  userId,
  billId = null,
) {
  if (!familyId || !patternId || !status) {
    throw new Error("familyId, patternId, and status are required");
  }

  const validStatuses = ["pending", "approved", "rejected", "ignored"];
  if (!validStatuses.includes(status)) {
    throw new Error(
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    );
  }

  const timestamp = new Date().toISOString();

  try {
    const updateExpression = ["#status = :status", "updatedAt = :updatedAt"];

    const expressionAttributeValues = {
      ":status": status,
      ":updatedAt": timestamp,
    };

    const expressionAttributeNames = {
      "#status": "status",
    };

    // Add approval metadata if approved
    if (status === "approved") {
      updateExpression.push("approvedAt = :approvedAt");
      updateExpression.push("approvedBy = :approvedBy");
      expressionAttributeValues[":approvedAt"] = timestamp;
      expressionAttributeValues[":approvedBy"] = userId;

      if (billId) {
        updateExpression.push("billId = :billId");
        expressionAttributeValues[":billId"] = billId;
      }
    }

    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `FAMILY#${familyId}`,
        SK: `PATTERN#${patternId}`,
      },
      UpdateExpression: `SET ${updateExpression.join(", ")}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      ReturnValues: "ALL_NEW",
    };

    const result = await docClient.send(new UpdateCommand(params));
    return result.Attributes;
  } catch (error) {
    console.error("Error updating pattern status:", error);
    throw new Error(`Failed to update pattern status: ${error.message}`);
  }
}

module.exports = {
  getTransactionHistory,
  savePattern,
  getPatternsByFamily,
  updatePatternStatus,
  deleteAllPatternsForFamily,
};

/**
 * Delete all patterns for a family (used during account deletion)
 * @param {string} familyId - Family ID
 * @returns {Promise<Object>} Deletion result with count
 */
async function deleteAllPatternsForFamily(familyId) {
  if (!familyId) {
    throw new Error("familyId is required");
  }

  try {
    // First, get all patterns for the family
    const patterns = await getPatternsByFamily(familyId);

    if (patterns.length === 0) {
      return { deletedCount: 0, message: "No patterns to delete" };
    }

    // Delete patterns in batches of 25 (DynamoDB limit)
    const batchSize = 25;
    let deletedCount = 0;

    for (let i = 0; i < patterns.length; i += batchSize) {
      const batch = patterns.slice(i, i + batchSize);

      const deleteRequests = batch.map((pattern) => ({
        DeleteRequest: {
          Key: {
            PK: `FAMILY#${familyId}`,
            SK: `PATTERN#${pattern.patternId}`,
          },
        },
      }));

      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: deleteRequests,
          },
        }),
      );

      deletedCount += batch.length;
    }

    return {
      deletedCount,
      message: `Successfully deleted ${deletedCount} patterns for family ${familyId}`,
    };
  } catch (error) {
    console.error("Error deleting patterns for family:", error);
    throw new Error(`Failed to delete patterns: ${error.message}`);
  }
}
