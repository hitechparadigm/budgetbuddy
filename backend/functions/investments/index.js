const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require("uuid");

const TABLE_NAME = process.env.TABLE_NAME || "BudgetBuddyTable";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://d1ueeugn9zcx7n.cloudfront.net",
  "https://d2ubhx2a13s7gc.cloudfront.net",
  "https://app.budgetbuddy.com",
];

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[2];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  };
}

// Response helper
function response(statusCode, body, origin = "") {
  return {
    statusCode,
    headers: getCorsHeaders(origin),
    body: JSON.stringify(body),
  };
}

// Get user ID from authorizer context
function getUserId(event) {
  return event.requestContext?.authorizer?.claims?.sub;
}

// Get portfolio overview
async function getPortfolio(userId) {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":sk": "HOLDING#",
    },
  };

  const result = await dynamodb.query(params).promise();
  const holdings = result.Items || [];

  // Calculate portfolio summary
  let totalValue = 0;
  let totalCostBasis = 0;
  let totalDayChange = 0;
  const allocationMap = {};

  holdings.forEach((holding) => {
    const value = holding.shares * holding.currentPrice;
    const costBasis = holding.shares * holding.costBasis;

    totalValue += value;
    totalCostBasis += costBasis;

    // Calculate day change if previous price exists
    if (holding.previousPrice) {
      const previousValue = holding.shares * holding.previousPrice;
      totalDayChange += value - previousValue;
    }

    // Track allocation by account type
    if (!allocationMap[holding.accountType]) {
      allocationMap[holding.accountType] = 0;
    }
    allocationMap[holding.accountType] += value;
  });

  const totalGainLoss = totalValue - totalCostBasis;
  const totalGainLossPercent =
    totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

  const dayChangePercent =
    totalValue > 0 ? (totalDayChange / (totalValue - totalDayChange)) * 100 : 0;

  const allocation = Object.entries(allocationMap).map(([type, value]) => ({
    type,
    value,
    percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
  }));

  return {
    totalValue,
    totalCostBasis,
    totalGainLoss,
    totalGainLossPercent,
    dayChange: totalDayChange,
    dayChangePercent,
    allocation,
    holdings,
  };
}

// Get all holdings
async function getHoldings(userId) {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":sk": "HOLDING#",
    },
  };

  const result = await dynamodb.query(params).promise();
  return result.Items || [];
}

// Add holding
async function addHolding(userId, holdingData) {
  const holdingId = uuidv4();
  const now = new Date().toISOString();

  const holding = {
    PK: `USER#${userId}`,
    SK: `HOLDING#${holdingId}`,
    holdingId,
    userId,
    symbol: holdingData.symbol.toUpperCase(),
    name: holdingData.name,
    shares: parseFloat(holdingData.shares),
    costBasis: parseFloat(holdingData.costBasis),
    currentPrice: parseFloat(holdingData.currentPrice || holdingData.costBasis),
    accountType: holdingData.accountType,
    lastUpdated: now,
    createdAt: now,
  };

  await dynamodb
    .put({
      TableName: TABLE_NAME,
      Item: holding,
    })
    .promise();

  return holding;
}

// Update holding
async function updateHolding(userId, holdingId, updates) {
  const now = new Date().toISOString();

  // Build update expression
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  if (updates.shares !== undefined) {
    updateExpressions.push("#shares = :shares");
    expressionAttributeNames["#shares"] = "shares";
    expressionAttributeValues[":shares"] = parseFloat(updates.shares);
  }

  if (updates.costBasis !== undefined) {
    updateExpressions.push("#costBasis = :costBasis");
    expressionAttributeNames["#costBasis"] = "costBasis";
    expressionAttributeValues[":costBasis"] = parseFloat(updates.costBasis);
  }

  if (updates.currentPrice !== undefined) {
    updateExpressions.push("#currentPrice = :currentPrice");
    expressionAttributeNames["#currentPrice"] = "currentPrice";
    expressionAttributeValues[":currentPrice"] = parseFloat(
      updates.currentPrice,
    );
  }

  if (updates.accountType) {
    updateExpressions.push("#accountType = :accountType");
    expressionAttributeNames["#accountType"] = "accountType";
    expressionAttributeValues[":accountType"] = updates.accountType;
  }

  updateExpressions.push("#lastUpdated = :lastUpdated");
  expressionAttributeNames["#lastUpdated"] = "lastUpdated";
  expressionAttributeValues[":lastUpdated"] = now;

  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: `HOLDING#${holdingId}`,
    },
    UpdateExpression: `SET ${updateExpressions.join(", ")}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW",
  };

  const result = await dynamodb.update(params).promise();
  return result.Attributes;
}

// Delete holding
async function deleteHolding(userId, holdingId) {
  await dynamodb
    .delete({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `HOLDING#${holdingId}`,
      },
    })
    .promise();

  return { success: true };
}

// Main handler
exports.handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  // Handle OPTIONS for CORS
  if (event.httpMethod === "OPTIONS") {
    return response(200, {});
  }

  try {
    const userId = getUserId(event);
    if (!userId) {
      return response(401, { error: "Unauthorized" });
    }

    const path = event.path;
    const method = event.httpMethod;
    const pathParts = path.split("/").filter((p) => p);

    // GET /investments - Portfolio overview
    if (method === "GET" && pathParts[pathParts.length - 1] === "investments") {
      const portfolio = await getPortfolio(userId);
      return response(200, portfolio);
    }

    // GET /investments/holdings - List holdings
    if (method === "GET" && pathParts[pathParts.length - 1] === "holdings") {
      const holdings = await getHoldings(userId);
      return response(200, { holdings });
    }

    // POST /investments/holdings - Add holding
    if (method === "POST" && pathParts[pathParts.length - 1] === "holdings") {
      const body = JSON.parse(event.body);

      // Validation
      if (
        !body.symbol ||
        !body.name ||
        !body.shares ||
        !body.costBasis ||
        !body.accountType
      ) {
        return response(400, { error: "Missing required fields" });
      }

      const holding = await addHolding(userId, body);
      return response(201, holding);
    }

    // PUT /investments/holdings/{id} - Update holding
    if (method === "PUT" && pathParts[pathParts.length - 2] === "holdings") {
      const holdingId = pathParts[pathParts.length - 1];
      const body = JSON.parse(event.body);

      const updated = await updateHolding(userId, holdingId, body);
      return response(200, updated);
    }

    // DELETE /investments/holdings/{id} - Delete holding
    if (method === "DELETE" && pathParts[pathParts.length - 2] === "holdings") {
      const holdingId = pathParts[pathParts.length - 1];

      await deleteHolding(userId, holdingId);
      return response(200, { success: true });
    }

    // GET /investments/performance - Performance over time (placeholder)
    if (method === "GET" && pathParts[pathParts.length - 1] === "performance") {
      const period = event.queryStringParameters?.period || "1M"; // 1M, 3M, 6M, 1Y, ALL
      const performance = await getPerformanceHistory(userId, period);
      return response(200, performance);
    }

    // POST /investments/snapshot - Save current portfolio snapshot
    if (method === "POST" && pathParts[pathParts.length - 1] === "snapshot") {
      const snapshot = await savePortfolioSnapshot(userId);
      return response(201, snapshot);
    }

    return response(404, { error: "Not found" });
  } catch (error) {
    console.error("Error:", error);
    return response(500, { error: error.message });
  }
};

// Get performance history
async function getPerformanceHistory(userId, period) {
  // Query portfolio snapshots
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":sk": "PORTFOLIO_SNAPSHOT#",
    },
    ScanIndexForward: false, // Most recent first
  };

  const result = await dynamodb.query(params).promise();
  const snapshots = result.Items || [];

  // Filter by period
  const now = new Date();
  let startDate;

  switch (period) {
    case "1M":
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case "3M":
      startDate = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case "6M":
      startDate = new Date(now.setMonth(now.getMonth() - 6));
      break;
    case "1Y":
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    case "ALL":
      startDate = new Date(0); // Beginning of time
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
  }

  const filteredSnapshots = snapshots
    .filter((s) => new Date(s.date) >= startDate)
    .reverse(); // Oldest first for chart

  // Calculate performance metrics
  if (filteredSnapshots.length === 0) {
    return {
      performance: [],
      totalReturn: 0,
      totalReturnPercent: 0,
      message: "No performance data available yet",
    };
  }

  const firstSnapshot = filteredSnapshots[0];
  const lastSnapshot = filteredSnapshots[filteredSnapshots.length - 1];

  const totalReturn = lastSnapshot.totalValue - firstSnapshot.totalValue;
  const totalReturnPercent =
    firstSnapshot.totalValue > 0
      ? (totalReturn / firstSnapshot.totalValue) * 100
      : 0;

  return {
    performance: filteredSnapshots.map((s) => ({
      date: s.date,
      totalValue: s.totalValue,
      totalGainLoss: s.totalGainLoss,
      totalGainLossPercent: s.totalGainLossPercent,
    })),
    totalReturn,
    totalReturnPercent,
    period,
  };
}

// Save portfolio snapshot (called by scheduled Lambda or on-demand)
async function savePortfolioSnapshot(userId) {
  const portfolio = await getPortfolio(userId);
  const now = new Date().toISOString();
  const dateKey = now.split("T")[0]; // YYYY-MM-DD

  const snapshot = {
    PK: `USER#${userId}`,
    SK: `PORTFOLIO_SNAPSHOT#${dateKey}`,
    userId,
    date: dateKey,
    totalValue: portfolio.totalValue,
    totalCostBasis: portfolio.totalCostBasis,
    totalGainLoss: portfolio.totalGainLoss,
    totalGainLossPercent: portfolio.totalGainLossPercent,
    allocation: portfolio.allocation,
    createdAt: now,
  };

  await dynamodb
    .put({
      TableName: TABLE_NAME,
      Item: snapshot,
    })
    .promise();

  return snapshot;
}
