/**
 * Credit Score Lambda Function
 *
 * Handles credit score monitoring and tracking
 * Integrates with credit bureau API (placeholder for now)
 *
 * Requirements: 43.1, 43.2
 */

const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || "budgetbuddy-dev-main";

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log("Credit Score Lambda invoked:", JSON.stringify(event, null, 2));

  const { httpMethod, path, body, requestContext } = event;

  try {
    // Extract user info from authorizer
    const userId = requestContext?.authorizer?.claims?.sub;
    const familyId = requestContext?.authorizer?.claims?.["custom:familyId"];

    if (!userId || !familyId) {
      return response(401, { error: "Unauthorized" });
    }

    // Route requests
    if (httpMethod === "GET" && path === "/credit-score") {
      return await getCreditScore(userId, familyId);
    }

    if (httpMethod === "GET" && path === "/credit-score/history") {
      return await getCreditScoreHistory(userId, familyId);
    }

    if (httpMethod === "POST" && path === "/credit-score/refresh") {
      return await refreshCreditScore(userId, familyId);
    }

    if (httpMethod === "PUT" && path === "/credit-score/settings") {
      return await updateSettings(userId, familyId, JSON.parse(body));
    }

    return response(404, { error: "Not found" });
  } catch (error) {
    console.error("Error:", error);
    return response(500, {
      error: "Internal server error",
      message: error.message,
    });
  }
};

/**
 * Get current credit score
 */
async function getCreditScore(userId, familyId) {
  try {
    // Get latest credit score record
    const result = await dynamodb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `FAMILY#${familyId}`,
          ":sk": "CREDIT_SCORE#",
        },
        ScanIndexForward: false, // Latest first
        Limit: 1,
      })
      .promise();

    if (result.Items.length === 0) {
      // No credit score data yet
      return response(200, {
        score: null,
        message:
          "No credit score data available. Connect your credit bureau account to start monitoring.",
      });
    }

    const creditScore = result.Items[0];

    return response(200, {
      score: creditScore.score,
      rating: creditScore.rating,
      lastUpdated: creditScore.lastUpdated,
      factors: creditScore.factors || [],
      change: creditScore.change || 0,
      changeDirection: creditScore.changeDirection || "none",
    });
  } catch (error) {
    console.error("Error getting credit score:", error);
    throw error;
  }
}

/**
 * Get credit score history
 */
async function getCreditScoreHistory(userId, familyId) {
  try {
    const result = await dynamodb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `FAMILY#${familyId}`,
          ":sk": "CREDIT_SCORE#",
        },
        ScanIndexForward: false, // Latest first
        Limit: 12, // Last 12 months
      })
      .promise();

    const history = result.Items.map((item) => ({
      date: item.date,
      score: item.score,
      rating: item.rating,
      change: item.change || 0,
    }));

    return response(200, { history });
  } catch (error) {
    console.error("Error getting credit score history:", error);
    throw error;
  }
}

/**
 * Refresh credit score from credit bureau API
 */
async function refreshCreditScore(userId, familyId) {
  try {
    // TODO: Integrate with actual credit bureau API
    // For now, this is a placeholder that simulates the API call

    // Check if user has connected their credit bureau account
    const settingsResult = await dynamodb
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: "CREDIT_SCORE_SETTINGS",
        },
      })
      .promise();

    if (!settingsResult.Item || !settingsResult.Item.connected) {
      return response(400, {
        error: "Credit bureau account not connected",
        message: "Please connect your credit bureau account first",
      });
    }

    // Simulate API call to credit bureau
    // In production, this would call the actual API
    const mockScore = await simulateCreditBureauAPI();

    // Get previous score for change calculation
    const previousResult = await dynamodb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `FAMILY#${familyId}`,
          ":sk": "CREDIT_SCORE#",
        },
        ScanIndexForward: false,
        Limit: 1,
      })
      .promise();

    const previousScore =
      previousResult.Items.length > 0 ? previousResult.Items[0].score : null;
    const change = previousScore ? mockScore.score - previousScore : 0;
    const changeDirection = change > 0 ? "up" : change < 0 ? "down" : "none";

    // Store new credit score
    const creditScoreId = uuidv4();
    const now = new Date().toISOString();
    const date = now.split("T")[0];

    const creditScore = {
      PK: `FAMILY#${familyId}`,
      SK: `CREDIT_SCORE#${date}#${creditScoreId}`,
      creditScoreId,
      familyId,
      userId,
      score: mockScore.score,
      rating: mockScore.rating,
      factors: mockScore.factors,
      date,
      lastUpdated: now,
      change,
      changeDirection,
      createdAt: now,
    };

    await dynamodb
      .put({
        TableName: TABLE_NAME,
        Item: creditScore,
      })
      .promise();

    // Check if we should send a notification for significant change
    if (Math.abs(change) >= 10) {
      await sendScoreChangeNotification(
        userId,
        familyId,
        change,
        mockScore.score,
      );
    }

    return response(200, {
      score: mockScore.score,
      rating: mockScore.rating,
      factors: mockScore.factors,
      change,
      changeDirection,
      lastUpdated: now,
    });
  } catch (error) {
    console.error("Error refreshing credit score:", error);
    throw error;
  }
}

/**
 * Update credit score monitoring settings
 */
async function updateSettings(userId, familyId, data) {
  try {
    const { connected, apiKey, notificationsEnabled } = data;

    const settings = {
      PK: `FAMILY#${familyId}`,
      SK: "CREDIT_SCORE_SETTINGS",
      familyId,
      userId,
      connected: connected || false,
      apiKey: apiKey || null, // In production, encrypt this
      notificationsEnabled: notificationsEnabled !== false,
      updatedAt: new Date().toISOString(),
    };

    await dynamodb
      .put({
        TableName: TABLE_NAME,
        Item: settings,
      })
      .promise();

    return response(200, {
      message: "Settings updated successfully",
      settings: {
        connected: settings.connected,
        notificationsEnabled: settings.notificationsEnabled,
      },
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    throw error;
  }
}

/**
 * Simulate credit bureau API call
 * In production, replace with actual API integration
 */
async function simulateCreditBureauAPI() {
  // Simulate API delay
  await new Promise((resolve) => {
    const timer = global.setTimeout(resolve, 1000);
    return () => global.clearTimeout(timer);
  });

  // Generate mock credit score data
  const score = 650 + Math.floor(Math.random() * 200); // 650-850
  const rating = getRating(score);
  const factors = [
    {
      name: "Payment History",
      impact: "high",
      status: score > 700 ? "good" : "needs improvement",
    },
    {
      name: "Credit Utilization",
      impact: "high",
      status: score > 700 ? "good" : "needs improvement",
    },
    {
      name: "Length of Credit History",
      impact: "medium",
      status: "good",
    },
    {
      name: "Credit Mix",
      impact: "low",
      status: "good",
    },
    {
      name: "New Credit",
      impact: "low",
      status: "good",
    },
  ];

  return { score, rating, factors };
}

/**
 * Get credit score rating
 */
function getRating(score) {
  if (score >= 800) return "Excellent";
  if (score >= 740) return "Very Good";
  if (score >= 670) return "Good";
  if (score >= 580) return "Fair";
  return "Poor";
}

/**
 * Send notification for significant score change
 */
async function sendScoreChangeNotification(userId, familyId, change, newScore) {
  try {
    const notificationId = uuidv4();
    const now = new Date().toISOString();

    const notification = {
      PK: `USER#${userId}`,
      SK: `NOTIFICATION#${now}#${notificationId}`,
      notificationId,
      userId,
      familyId,
      type: "CREDIT_SCORE_CHANGE",
      title:
        change > 0 ? "Credit Score Increased! 🎉" : "Credit Score Decreased",
      message: `Your credit score ${change > 0 ? "increased" : "decreased"} by ${Math.abs(change)} points to ${newScore}`,
      data: {
        change,
        newScore,
        changeDirection: change > 0 ? "up" : "down",
      },
      read: false,
      createdAt: now,
    };

    await dynamodb
      .put({
        TableName: TABLE_NAME,
        Item: notification,
      })
      .promise();

    console.log("Credit score change notification sent:", notificationId);
  } catch (error) {
    console.error("Error sending notification:", error);
    // Don't throw - notification failure shouldn't fail the main operation
  }
}

/**
 * Helper function to create HTTP response
 */
function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify(body),
  };
}
