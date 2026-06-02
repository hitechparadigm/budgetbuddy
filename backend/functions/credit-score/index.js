/**
 * Credit Score Lambda Function
 *
 * Handles credit score monitoring and tracking
 * Integrates with credit bureau API (placeholder for now)
 *
 * Uses BudgetAccessResolver pattern (BUDGET# model) — no familyId from JWT.
 *
 * Requirements: 43.1, 43.2
 */

const {
  getUserFromEvent,
  dynamoHelpers,
  BudgetAccessResolver,
  generateId,
} = require('/opt/nodejs/utils');

/**
 * Helper function to create HTTP response
 */
function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(body),
  };
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log('Credit Score Lambda invoked:', JSON.stringify({ method: event.httpMethod, path: event.path }));

  const { httpMethod, path, body } = event;

  try {
    // CORS preflight
    if (httpMethod === 'OPTIONS') {
      return response(200, {});
    }

    // Extract user from Cognito authorizer
    const user = getUserFromEvent(event);
    if (!user || !user.userId) {
      return response(401, { error: 'Unauthorized' });
    }

    // Resolve budgetId and role via BudgetAccessResolver
    const { budgetId, role, budgetStatus } = await BudgetAccessResolver.resolveAccess(
      user.userId,
      dynamoHelpers,
    );
    BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);

    // Route requests
    if (httpMethod === 'GET' && path === '/credit-score') {
      return await getCreditScore(user.userId, budgetId);
    }

    if (httpMethod === 'GET' && path === '/credit-score/history') {
      return await getCreditScoreHistory(user.userId, budgetId);
    }

    if (httpMethod === 'POST' && path === '/credit-score/refresh') {
      BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);
      return await refreshCreditScore(user.userId, budgetId);
    }

    if (httpMethod === 'PUT' && path === '/credit-score/settings') {
      BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);
      const parsedBody = body ? JSON.parse(body) : {};
      return await updateSettings(user.userId, budgetId, parsedBody);
    }

    return response(404, { error: 'Not found' });
  } catch (error) {
    console.error('Error:', error);

    if (error && typeof error === 'object' && error.statusCode) {
      return response(error.statusCode, {
        error: 'Forbidden',
        message: error.message || 'Permission denied',
      });
    }

    return response(500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
};

/**
 * Get current credit score
 */
async function getCreditScore(userId, _budgetId) {
  try {
    // Get latest credit score record stored under USER# partition for per-user data
    const result = await dynamoHelpers.query({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'CREDIT_SCORE#',
      },
      ScanIndexForward: false,
      Limit: 1,
    });

    const items = result || [];

    if (items.length === 0) {
      return response(200, {
        score: null,
        hasData: false,
        message:
          'No credit score data available. Connect your credit bureau account to start monitoring.',
      });
    }

    const creditScore = items[0];

    return response(200, {
      hasData: true,
      score: creditScore.score,
      rating: creditScore.rating,
      lastUpdated: creditScore.lastUpdated,
      factors: creditScore.factors || [],
      change: creditScore.change || 0,
      changeDirection: creditScore.changeDirection || 'none',
    });
  } catch (error) {
    console.error('Error getting credit score:', error);
    throw error;
  }
}

/**
 * Get credit score history
 */
async function getCreditScoreHistory(userId, _budgetId) {
  try {
    const result = await dynamoHelpers.query({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'CREDIT_SCORE#',
      },
      ScanIndexForward: false,
      Limit: 12,
    });

    const items = result || [];
    const history = items.map((item) => ({
      date: item.date,
      score: item.score,
      rating: item.rating,
      change: item.change || 0,
    }));

    return response(200, { history, hasData: history.length > 0 });
  } catch (error) {
    console.error('Error getting credit score history:', error);
    throw error;
  }
}

/**
 * Refresh credit score from credit bureau API
 */
async function refreshCreditScore(userId, budgetId) {
  try {
    // Check if user has connected their credit bureau account
    const settingsItem = await dynamoHelpers.getItem(`USER#${userId}`, 'CREDIT_SCORE_SETTINGS');

    if (!settingsItem || !settingsItem.connected) {
      return response(400, {
        error: 'Credit bureau account not connected',
        message: 'Please connect your credit bureau account first',
      });
    }

    // Simulate API call to credit bureau
    const mockScore = await simulateCreditBureauAPI();

    // Get previous score for change calculation
    const previousResult = await dynamoHelpers.query({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'CREDIT_SCORE#',
      },
      ScanIndexForward: false,
      Limit: 1,
    });

    const previousItems = previousResult || [];
    const previousScore = previousItems.length > 0 ? previousItems[0].score : null;
    const change = previousScore ? mockScore.score - previousScore : 0;
    const changeDirection = change > 0 ? 'up' : change < 0 ? 'down' : 'none';

    // Store new credit score under USER# (per-user data)
    const creditScoreId = generateId ? generateId('cs') : `cs-${Date.now()}`;
    const now = new Date().toISOString();
    const date = now.split('T')[0];

    const creditScore = {
      PK: `USER#${userId}`,
      SK: `CREDIT_SCORE#${date}#${creditScoreId}`,
      creditScoreId,
      budgetId,
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

    await dynamoHelpers.putItem(creditScore);

    return response(200, {
      score: mockScore.score,
      rating: mockScore.rating,
      factors: mockScore.factors,
      change,
      changeDirection,
      lastUpdated: now,
    });
  } catch (error) {
    console.error('Error refreshing credit score:', error);
    throw error;
  }
}

/**
 * Update credit score monitoring settings
 */
async function updateSettings(userId, budgetId, data) {
  try {
    const { connected, notificationsEnabled } = data;

    // Never store apiKey plaintext — store a flag only
    const settings = {
      PK: `USER#${userId}`,
      SK: 'CREDIT_SCORE_SETTINGS',
      budgetId,
      userId,
      connected: connected || false,
      notificationsEnabled: notificationsEnabled !== false,
      updatedAt: new Date().toISOString(),
    };

    await dynamoHelpers.putItem(settings);

    return response(200, {
      message: 'Settings updated successfully',
      settings: {
        connected: settings.connected,
        notificationsEnabled: settings.notificationsEnabled,
      },
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
}

/**
 * Simulate credit bureau API call
 * In production, replace with actual API integration
 */
async function simulateCreditBureauAPI() {
  const score = 650 + Math.floor(Math.random() * 200); // 650-850
  const rating = getRating(score);
  const factors = [
    {
      name: 'Payment History',
      impact: 'high',
      status: score > 700 ? 'good' : 'needs improvement',
    },
    {
      name: 'Credit Utilization',
      impact: 'high',
      status: score > 700 ? 'good' : 'needs improvement',
    },
    { name: 'Length of Credit History', impact: 'medium', status: 'good' },
    { name: 'Credit Mix', impact: 'low', status: 'good' },
    { name: 'New Credit', impact: 'low', status: 'good' },
  ];

  return { score, rating, factors };
}

/**
 * Get credit score rating
 */
function getRating(score) {
  if (score >= 800) return 'Excellent';
  if (score >= 740) return 'Very Good';
  if (score >= 670) return 'Good';
  if (score >= 580) return 'Fair';
  return 'Poor';
}
