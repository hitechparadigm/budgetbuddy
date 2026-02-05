const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require("uuid");

const TABLE_NAME = process.env.TABLE_NAME || "BudgetBuddyTable";

// CORS headers
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

// Response helper
function response(statusCode, body) {
  return {
    statusCode,
    headers,
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
  const allocationMap = {};

  holdings.forEach((holding) => {
    const value = holding.shares * holding.currentPrice;
    const costBasis = holding.shares * holding.costBasis;

    totalValue += value;
    totalCostBasis += costBasis;

    // Track allocation by account type
    if (!allocationMap[holding.accountType]) {
      allocationMap[holding.accountType] = 0;
    }
    allocationMap[holding.accountType] += value;
  });

  const totalGainLoss = totalValue - totalCostBasis;
  const totalGainLossPercent =
    totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

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
    dayChange: 0, // Will be calculated with price history
    dayChangePercent: 0,
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
      // TODO: Implement performance history tracking
      return response(200, {
        performance: [],
        message: "Performance tracking coming soon",
      });
    }

    return response(404, { error: "Not found" });
  } catch (error) {
    console.error("Error:", error);
    return response(500, { error: error.message });
  }
};
