/**
 * BudgetBuddy Auth Onboarding Lambda Function
 *
 * Handles user onboarding completion, including:
 * - Marking user profile as onboarded
 * - Creating initial budget period for current month
 * - Setting up expense categories based on user selections
 * - Optionally updating budgetType if user selects family or shared
 *
 * CRITICAL: All imports at top of file to prevent ReferenceError bugs
 */

// AWS SDK imports (MUST be at top)
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { UpdateItemCommand } = require('@aws-sdk/client-dynamodb');

// Shared utilities from Lambda Layer (MUST be at top)
const { getCorsHeaders } = require('/opt/nodejs/shared/cors');
const { parseIdToken } = require('/opt/nodejs/shared/token-parser');
const { validateOnboardingInput } = require('/opt/nodejs/shared/validators');
const {
  formatErrorResponse,
  ValidationError,
  AuthenticationError,
} = require('/opt/nodejs/shared/errors');

// Local utilities (MUST be at top)
const dynamoHelpers = require('./utils/dynamo-helpers');

// Environment variables
const TABLE_NAME = process.env.TABLE_NAME;

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Lambda handler for onboarding completion
 */
exports.handler = async (event) => {
  console.log('=== AUTH ONBOARDING LAMBDA ===');
  console.log('Event:', JSON.stringify(event, null, 2));

  const origin = event.headers?.origin || event.headers?.Origin || '*';

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getCorsHeaders(origin),
      body: '',
    };
  }

  try {
    // Extract and validate Authorization header
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      throw new AuthenticationError('Authorization header is required');
    }

    // Parse ID token to get userId
    const token = authHeader.replace('Bearer ', '');
    const payload = parseIdToken(token);

    // Get userId from custom attribute or fallback to sub
    let userId = payload['custom:userId'];
    if (!userId) {
      console.log('custom:userId not found in token, using sub as fallback');
      userId = payload.sub;
    }

    if (!userId) {
      throw new AuthenticationError('User ID not found in token');
    }

    // Parse and validate request body
    if (!event.body) {
      throw new ValidationError(['Request body is required']);
    }

    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      throw new ValidationError(['Invalid JSON format']);
    }

    // Validate onboarding input
    const validationErrors = validateOnboardingInput(requestBody);
    if (validationErrors.length > 0) {
      throw new ValidationError(validationErrors);
    }

    console.log('Onboarding validation passed');
    console.log('  - city:', requestBody.city);
    console.log('  - country:', requestBody.country);
    console.log('  - familySize:', requestBody.familySize);
    console.log('  - currentMonth:', requestBody.currentMonth);
    console.log('  - selectedCategories:', requestBody.selectedCategories.length);
    console.log('  - budgetType:', requestBody.budgetType || 'personal');

    // Read defaultBudgetId from user profile
    const userProfile = await dynamoHelpers.getItem(`USER#${userId}`, 'PROFILE');
    if (!userProfile) {
      throw { statusCode: 403, message: 'User profile not found' };
    }

    const existingBudgetId = userProfile.defaultBudgetId;
    if (existingBudgetId) {
      // Re-onboarding guard: budget already exists, prevent duplicate creation
      return {
        statusCode: 409,
        headers: getCorsHeaders(origin),
        body: JSON.stringify({
          error: 'Conflict',
          message: 'Onboarding already completed. Budget already exists.',
        }),
      };
    }

    console.log('No existing budget found, proceeding with first-time onboarding');

    const currentTime = new Date().toISOString();

    // Extract currency from request (default to USD if not provided)
    const currency = requestBody.currency || 'USD';

    // Extract budgetType from request (default to personal)
    const budgetType = requestBody.budgetType || 'personal';

    // Create initial budget period for current month
    const currentMonth = requestBody.currentMonth;
    const defaultBudgetId = `budget_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Write BUDGET#<budgetId>/METADATA record
    const budgetMetadata = {
      PK: `BUDGET#${defaultBudgetId}`,
      SK: 'METADATA',
      budgetId: defaultBudgetId,
      budgetType: budgetType === 'family' || budgetType === 'shared' ? budgetType : 'personal',
      status: 'active',
      currency,
      createdAt: currentTime,
      updatedAt: currentTime,
    };
    await dynamoHelpers.putItem(budgetMetadata);
    console.log('Budget metadata record created:', { budgetId: defaultBudgetId, budgetType: budgetMetadata.budgetType });

    // Write BUDGET#<budgetId>/MEMBER#<userId> record (required for BudgetAccessResolver.resolveAccess())
    const memberRecord = {
      PK: `BUDGET#${defaultBudgetId}`,
      SK: `MEMBER#${userId}`,
      budgetId: defaultBudgetId,
      userId,
      role: 'owner',
      status: 'active',
      joinedAt: currentTime,
      createdAt: currentTime,
      updatedAt: currentTime,
    };
    await dynamoHelpers.putItem(memberRecord);
    console.log('Budget member record created:', { budgetId: defaultBudgetId, userId, role: 'owner' });

    // Update user profile to mark onboarding as completed, save currency, and link defaultBudgetId
    const updateCommand = new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: { S: `USER#${userId}` },
        SK: { S: 'PROFILE' },
      },
      UpdateExpression:
        'SET onboardingCompleted = :completed, currency = :currency, ' +
        'defaultBudgetId = :budgetId, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':completed': { BOOL: true },
        ':currency': { S: currency },
        ':budgetId': { S: defaultBudgetId },
        ':updatedAt': { S: currentTime },
      },
      ReturnValues: 'ALL_NEW',
    });

    await dynamoClient.send(updateCommand);
    console.log('User profile updated - onboarding completed');

    // Transform selected categories into budget groups
    const expenseCategories = requestBody.selectedCategories.map((cat) => ({
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      name: cat.name,
      icon: cat.icon,
      plannedAmount: cat.adjustedAmount,
      spentAmount: 0,
      transactions: [],
      order: 1,
      isRecurring: false,
    }));

    const budgetGroups = {
      income: [],
      savings: [],
      expenses: expenseCategories,
    };

    // Calculate totals
    const totalExpenses = expenseCategories.reduce(
      (sum, cat) => sum + cat.plannedAmount,
      0,
    );

    // Write budget period to BUDGET#<defaultBudgetId>/PERIOD#<month>
    const budgetPeriod = {
      PK: `BUDGET#${defaultBudgetId}`,
      SK: `PERIOD#${currentMonth}`,
      budgetId: defaultBudgetId,
      month: currentMonth,
      currency,
      totalIncome: 0,
      totalSavings: 0,
      totalExpenses,
      remainingBalance: -totalExpenses,
      groups: budgetGroups,
      isAIGenerated: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    };

    console.log('Creating budget period:', {
      budgetId: defaultBudgetId,
      month: currentMonth,
      totalExpenses,
      categoriesCount: expenseCategories.length,
    });

    // Create budget period in DynamoDB
    await dynamoHelpers.putItem(budgetPeriod);
    console.log('Initial budget period created from onboarding selections');

    // Create a default "Cash" account for the user
    const cashAccountId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const cashAccount = {
      PK: `BUDGET#${defaultBudgetId}`,
      SK: `ACCOUNT#${cashAccountId}`,
      entityType: 'ACCOUNT',
      accountId: cashAccountId,
      budgetId: defaultBudgetId,
      userId,
      nickname: 'Cash',
      accountType: 'cash',
      accountSubtype: 'cash',
      balance: 0,
      currency,
      isDefault: true,
      isManual: true,
      createdAt: currentTime,
      updatedAt: currentTime,
    };
    await dynamoHelpers.putItem(cashAccount);
    console.log('Default Cash account created:', cashAccountId);

    // Verify budget period was created
    let budgetVerified = false;
    try {
      const verificationBudget = await dynamoHelpers.getItem(
        `BUDGET#${defaultBudgetId}`,
        `PERIOD#${currentMonth}`,
      );

      if (verificationBudget) {
        console.log('Budget period verification successful');
        budgetVerified = true;
      } else {
        console.error('Budget period verification failed - period not found');

        return {
          statusCode: 500,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            error: 'Budget Creation Verification Failed',
            message: 'Budget period was created but could not be verified immediately',
            debugInfo: {
              userId,
              budgetId: defaultBudgetId,
              partitionKey: `BUDGET#${defaultBudgetId}`,
              sortKey: `PERIOD#${currentMonth}`,
            },
          }),
        };
      }
    } catch (verifyError) {
      console.error('Budget period verification error:', verifyError);
      // Continue with success response despite verification error
    }

    // Return success response
    return {
      statusCode: 200,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({
        message: 'Onboarding completed successfully',
        budgetCreated: true,
        budgetId: defaultBudgetId,
        month: currentMonth,
        totalExpenses,
        categoriesCreated: expenseCategories.length,
        debugInfo: {
          userId,
          budgetId: defaultBudgetId,
          partitionKey: `BUDGET#${defaultBudgetId}`,
          sortKey: `PERIOD#${currentMonth}`,
          budgetType,
          budgetVerified,
          lambdaFunction: 'budgetbuddy-auth-onboarding',
          timestamp: new Date().toISOString(),
        },
      }),
    };
  } catch (error) {
    console.error('Onboarding error:', error);

    // Handle custom errors
    if (error instanceof ValidationError || error instanceof AuthenticationError) {
      return formatErrorResponse(error, origin);
    }

    // Handle known thrown objects (e.g. { statusCode, message })
    if (error.statusCode) {
      return {
        statusCode: error.statusCode,
        headers: getCorsHeaders(origin),
        body: JSON.stringify({
          error: 'Access Denied',
          message: error.message,
        }),
      };
    }

    // Handle unexpected errors
    return {
      statusCode: 500,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to complete onboarding',
        details: error.message,
      }),
    };
  }
};
