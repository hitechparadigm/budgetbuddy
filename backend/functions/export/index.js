/**
 * Export Service - CSV and PDF Export Functionality
 * Handles data export requests for budget and transaction data
 */

const AWS = require("aws-sdk");
const jwt = require("jsonwebtoken");

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || "budgetbuddy-main";

/**
 * Get CORS headers for API responses
 */
function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

/**
 * Parse and validate JWT token
 */
function parseToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header");
  }

  const token = authHeader.substring(7);
  try {
    return jwt.decode(token);
  } catch (error) {
    throw new Error("Invalid JWT token");
  }
}

/**
 * Get user's family ID from their profile
 */
async function getFamilyId(userId) {
  try {
    const result = await dynamodb
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: "PROFILE",
        },
      })
      .promise();

    if (!result.Item) {
      throw new Error("User profile not found");
    }

    return result.Item.familyId;
  } catch (error) {
    console.error("Error getting family ID:", error);
    throw error;
  }
}

/**
 * Get all budgets for a family
 */
async function getBudgets(familyId, startDate, endDate) {
  try {
    const params = {
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :familyId",
      ExpressionAttributeValues: {
        ":familyId": `FAMILY#${familyId}`,
      },
    };

    // Add date filtering if provided
    if (startDate && endDate) {
      params.FilterExpression = "#month BETWEEN :startDate AND :endDate";
      params.ExpressionAttributeNames = {
        "#month": "month",
      };
      params.ExpressionAttributeValues[":startDate"] = startDate;
      params.ExpressionAttributeValues[":endDate"] = endDate;
    }

    const result = await dynamodb.query(params).promise();
    return result.Items.filter((item) => item.SK.startsWith("BUDGET#"));
  } catch (error) {
    console.error("Error getting budgets:", error);
    throw error;
  }
}

/**
 * Get all transactions for a family
 */
async function getTransactions(familyId, startDate, endDate) {
  try {
    const params = {
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :familyId",
      ExpressionAttributeValues: {
        ":familyId": `FAMILY#${familyId}`,
      },
    };

    // Add date filtering if provided
    if (startDate && endDate) {
      params.FilterExpression = "#date BETWEEN :startDate AND :endDate";
      params.ExpressionAttributeNames = {
        "#date": "date",
      };
      params.ExpressionAttributeValues[":startDate"] = startDate;
      params.ExpressionAttributeValues[":endDate"] = endDate;
    }

    const result = await dynamodb.query(params).promise();
    return result.Items.filter((item) => item.SK.startsWith("TRANSACTION#"));
  } catch (error) {
    console.error("Error getting transactions:", error);
    throw error;
  }
}

/**
 * Convert budget and transaction data to CSV format
 */
function generateCSV(budgets, transactions) {
  const csvRows = [];

  // CSV Header
  csvRows.push("Date,Category,Description,Amount,Type,Budget Month,Item Type");

  // Add budget categories
  budgets.forEach((budget) => {
    if (budget.categories) {
      budget.categories.forEach((category) => {
        csvRows.push(
          [
            budget.month,
            `"${category.name}"`,
            `"Budget - ${category.name}"`,
            category.plannedAmount || 0,
            category.type || "expense",
            budget.month,
            "Budget Category",
          ].join(",")
        );
      });
    }
  });

  // Add transactions
  transactions.forEach((transaction) => {
    csvRows.push(
      [
        transaction.date,
        `"${transaction.category}"`,
        `"${transaction.description || ""}"`,
        transaction.amount,
        transaction.type,
        transaction.budgetMonth || transaction.date.substring(0, 7), // YYYY-MM format
        "Transaction",
      ].join(",")
    );
  });

  return csvRows.join("\n");
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log("Export request:", JSON.stringify(event, null, 2));

  try {
    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: getCorsHeaders(),
        body: "",
      };
    }

    // Parse and validate token
    const token = parseToken(
      event.headers.Authorization || event.headers.authorization
    );
    if (!token || !token.sub) {
      return {
        statusCode: 401,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          error: "Invalid or missing authentication token",
        }),
      };
    }

    const userId = token.sub;

    // Get family ID
    const familyId = await getFamilyId(userId);

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const exportType = queryParams.type || "csv";
    const startDate = queryParams.startDate;
    const endDate = queryParams.endDate;

    if (exportType === "csv") {
      // Get data
      const [budgets, transactions] = await Promise.all([
        getBudgets(familyId, startDate, endDate),
        getTransactions(familyId, startDate, endDate),
      ]);

      // Generate CSV
      const csvContent = generateCSV(budgets, transactions);

      // Return CSV response
      return {
        statusCode: 200,
        headers: {
          ...getCorsHeaders(),
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="budget-export-${
            new Date().toISOString().split("T")[0]
          }.csv"`,
        },
        body: csvContent,
      };
    } else {
      return {
        statusCode: 400,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          error: "Unsupported export type. Currently only CSV is supported.",
        }),
      };
    }
  } catch (error) {
    console.error("Export error:", error);
    return {
      statusCode: 500,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        error: "Export failed",
        details: error.message,
      }),
    };
  }
};
