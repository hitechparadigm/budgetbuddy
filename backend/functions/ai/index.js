/**
 * BudgetBuddy AI Lambda Function
 *
 * Handles AI-powered budget generation using AWS Bedrock (Claude 3.5).
 * Resolves budget access via BudgetAccessResolver on every request — no familyId, no stale JWT.
 *
 * Routes:
 *   POST /ai/generate-budget  — Generate a personalised zero-based budget for a month
 *   GET  /ai/health           — Health check
 */

const {
  successResponse,
  errorResponse,
  parseRequestBody,
  getUserFromEvent,
  dynamoHelpers,
  logger,
  BudgetAccessResolver,
} = require('/opt/nodejs/utils');

const {
  BedrockRuntimeClient,
  InvokeModelCommand,
} = require('@aws-sdk/client-bedrock-runtime');

// ---------------------------------------------------------------------------
// Bedrock client (singleton)
// ---------------------------------------------------------------------------
let bedrockClient;
const getBedrockClient = () => {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }
  return bedrockClient;
};

// ---------------------------------------------------------------------------
// CORS helpers
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://d1ueeugn9zcx7n.cloudfront.net',
  'https://d2ubhx2a13s7gc.cloudfront.net',
  'https://app.budgetbuddy.com',
];

function getCorsOrigin(origin) {
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[2];
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
exports.handler = async (event, context) => {
  logger.info('AI request received', {
    httpMethod: event.httpMethod,
    path: event.path,
    requestId: context.awsRequestId,
  });

  try {
    const { httpMethod, path } = event;

    // Health check — no auth required
    if (httpMethod === 'GET' && path === '/ai/health') {
      return successResponse(
        { status: 'healthy', service: 'ai', version: '1.0.0' },
        'AI service is healthy',
      );
    }

    // CORS preflight
    if (httpMethod === 'OPTIONS') {
      const origin = event.headers?.Origin || event.headers?.origin || '';
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': getCorsOrigin(origin),
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers':
            'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
        body: '',
      };
    }

    // All other routes require authentication
    const { userId } = getUserFromEvent(event);

    // Resolve budget access from DynamoDB — JWT carries only userId (REQ-3, REQ-11)
    const { budgetId, role, budgetType, budgetStatus } =
      await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers);

    logger.info('Budget access resolved', { userId, budgetId, role, budgetType });

    // Route: POST /ai/generate-budget  (also handles CDK path /budget/ai-generate)
    if (httpMethod === 'POST' && (path === '/ai/generate-budget' || path === '/budget/ai-generate' || path === '/v1/budget/ai-generate' || path === '/v1/ai/generate-budget')) {
      return await handleGenerateBudget(event, {
        userId,
        budgetId,
        role,
        budgetType,
        budgetStatus,
      });
    }

    return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);

  } catch (error) {
    logger.error('AI function error', error, {
      httpMethod: event.httpMethod,
      path: event.path,
      requestId: context.awsRequestId,
    });

    // Propagate structured access-denial errors from BudgetAccessResolver
    if (error.statusCode) {
      return {
        statusCode: error.statusCode,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: error.message }),
      };
    }

    if (error.message && error.message.includes('No user claims')) {
      return errorResponse.unauthorized('Authentication required');
    }

    if (error.message && error.message.includes('Invalid JSON')) {
      return errorResponse.badRequest('Invalid JSON in request body');
    }

    return errorResponse.internalError('An error occurred processing your request');
  }
};

// ---------------------------------------------------------------------------
// Handler: POST /ai/generate-budget
// ---------------------------------------------------------------------------
/**
 * Generate a personalised zero-based budget for a given month using Bedrock.
 *
 * Request body:
 * {
 *   "month":         "YYYY-MM",          // required
 *   "location":      "City, State",      // optional — improves AI accuracy
 *   "householdSize": 2,                  // optional — number of people
 *   "currency":      "USD"               // optional — defaults to user profile currency
 * }
 *
 * On success, writes the generated budget to:
 *   PK = BUDGET#<budgetId>
 *   SK = PERIOD#<month>
 *
 * REQ-3: budget data lives under BUDGET#<budgetId>, period under PERIOD#<month>
 */
async function handleGenerateBudget(event, { userId, budgetId, role, budgetType, budgetStatus }) {
  // Only owner and partner may trigger AI generation
  BudgetAccessResolver.assertPermission(role, 'budget.edit', budgetStatus);

  const requestBody = parseRequestBody(event.body);

  // Validate required fields
  if (!requestBody.month) {
    return errorResponse.badRequest('month is required (format: YYYY-MM)');
  }
  if (!/^\d{4}-\d{2}$/.test(requestBody.month)) {
    return errorResponse.badRequest('month must be in YYYY-MM format');
  }

  const month = requestBody.month;
  const location = requestBody.location || null;
  const householdSize = requestBody.householdSize || 1;

  // Fetch user profile for currency preference
  let currency = requestBody.currency || 'USD';
  try {
    const profile = await dynamoHelpers.getItem(`USER#${userId}`, 'PROFILE');
    if (profile && profile.currency) {
      currency = requestBody.currency || profile.currency;
    }
  } catch (err) {
    logger.warn('Could not fetch user currency, defaulting to USD', { userId, error: err.message });
  }

  // Check if a budget period already exists for this month
  const existingPeriod = await dynamoHelpers.getItem(
    `BUDGET#${budgetId}`,
    `PERIOD#${month}`,
  );

  if (existingPeriod) {
    logger.info('Budget period already exists for month', { budgetId, month });
    return successResponse(
      formatBudgetPeriodResponse(existingPeriod),
      'Budget period already exists for this month',
    );
  }

  // Generate budget via Bedrock
  logger.info('Generating AI budget', { userId, budgetId, month, location, householdSize });

  let generatedGroups;
  try {
    generatedGroups = await generateBudgetWithBedrock({
      month,
      location,
      householdSize,
      currency,
      budgetType,
    });
  } catch (err) {
    logger.error('Bedrock generation failed', err, { userId, budgetId, month });
    return errorResponse.internalError('AI budget generation failed. Please try again.');
  }

  // Calculate totals from generated groups
  const totals = calculateBudgetTotals(generatedGroups);
  const currentTime = new Date().toISOString();

  // Build the budget period item — PK: BUDGET#<budgetId>, SK: PERIOD#<month>  (REQ-3)
  const budgetPeriod = {
    PK: `BUDGET#${budgetId}`,
    SK: `PERIOD#${month}`,
    entityType: 'BUDGET_PERIOD',
    budgetId,
    month,
    currency,
    totalIncome: totals.totalIncome,
    totalSavings: totals.totalSavings,
    totalExpenses: totals.totalExpenses,
    remainingBalance: totals.remainingBalance,
    groups: generatedGroups,
    isAIGenerated: true,
    createdAt: currentTime,
    updatedAt: currentTime,
  };

  await dynamoHelpers.putItem(budgetPeriod);

  logger.info('AI budget period saved', { budgetId, month });

  return successResponse(
    formatBudgetPeriodResponse(budgetPeriod),
    'AI budget generated successfully',
  );
}

// ---------------------------------------------------------------------------
// Bedrock integration
// ---------------------------------------------------------------------------
/**
 * Call AWS Bedrock (Claude 3.5 Sonnet) to generate a zero-based budget.
 *
 * @param {Object} params
 * @param {string} params.month         - YYYY-MM
 * @param {string|null} params.location - City, State (optional)
 * @param {number} params.householdSize - Number of people
 * @param {string} params.currency      - ISO currency code
 * @param {string} params.budgetType    - personal | family | shared
 * @returns {Promise<Object>} Budget groups: { income: [], savings: [], expenses: [] }
 */
async function generateBudgetWithBedrock({ month, location, householdSize, currency, budgetType }) {
  const locationContext = location
    ? `The household is located in ${location}.`
    : 'No specific location provided — use national averages.';

  const prompt = `You are a certified financial planner creating a zero-based monthly budget.

Context:
- Month: ${month}
- Household size: ${householdSize} person(s)
- Budget type: ${budgetType}
- Currency: ${currency}
- ${locationContext}

Create a realistic zero-based budget where every dollar is assigned. Return ONLY valid JSON with this exact structure:
{
  "income": [
    {
      "name": "Income",
      "categories": [
        { "id": "cat_income_1", "name": "Primary Income", "planned": 5000, "spent": 0, "rolloverEnabled": false, "rolloverAmount": 0 }
      ]
    }
  ],
  "savings": [
    {
      "name": "Savings",
      "categories": [
        { "id": "cat_savings_1", "name": "Emergency Fund", "planned": 500, "spent": 0, "rolloverEnabled": false, "rolloverAmount": 0 }
      ]
    }
  ],
  "expenses": [
    {
      "name": "Housing",
      "categories": [
        { "id": "cat_exp_1", "name": "Rent/Mortgage", "planned": 1500, "spent": 0, "rolloverEnabled": false, "rolloverAmount": 0 }
      ]
    }
  ]
}

Rules:
- All amounts in ${currency}, as numbers (not strings)
- Total expenses + savings must equal total income (zero-based)
- Include realistic categories for the household size and location
- Use unique id values for each category (format: cat_<type>_<number>)
- Return ONLY the JSON object, no explanation`;

  const client = getBedrockClient();
  const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  const response = await client.send(command);
  // TextDecoder is available globally in Node.js 18+ but ESLint doesn't know it
  // eslint-disable-next-line no-undef
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  // Extract text content from Claude response
  const textContent = responseBody.content && responseBody.content[0] && responseBody.content[0].text;
  if (!textContent) {
    throw new Error('Empty response from Bedrock');
  }

  // Parse the JSON budget from Claude's response
  // Claude may wrap the JSON in markdown code fences — strip them if present
  const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/) ||
                    textContent.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    throw new Error('Could not extract JSON from Bedrock response');
  }

  const groups = JSON.parse(jsonMatch[1]);

  // Validate structure
  if (!groups.income || !groups.savings || !groups.expenses) {
    throw new Error('Invalid budget structure returned by Bedrock');
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Calculate budget totals from groups.
 * @param {Object} groups - { income: [], savings: [], expenses: [] }
 * @returns {{ totalIncome, totalSavings, totalExpenses, remainingBalance }}
 */
function calculateBudgetTotals(groups) {
  let totalIncome = 0;
  let totalSavings = 0;
  let totalExpenses = 0;

  (groups.income || []).forEach((group) => {
    (group.categories || []).forEach((cat) => {
      totalIncome += cat.planned || 0;
    });
  });

  (groups.savings || []).forEach((group) => {
    (group.categories || []).forEach((cat) => {
      totalSavings += cat.planned || 0;
    });
  });

  (groups.expenses || []).forEach((group) => {
    (group.categories || []).forEach((cat) => {
      totalExpenses += cat.planned || 0;
    });
  });

  const remainingBalance = totalIncome - totalSavings - totalExpenses;

  return { totalIncome, totalSavings, totalExpenses, remainingBalance };
}

/**
 * Format a DynamoDB budget period item for the API response.
 * @param {Object} item - DynamoDB item
 * @returns {Object} API response shape
 */
function formatBudgetPeriodResponse(item) {
  return {
    budgetId: item.budgetId,
    month: item.month,
    currency: item.currency,
    totalIncome: item.totalIncome,
    totalSavings: item.totalSavings,
    totalExpenses: item.totalExpenses,
    remainingBalance: item.remainingBalance,
    groups: item.groups,
    isAIGenerated: item.isAIGenerated,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
