/**
 * BudgetBuddy Budget Management Lambda Function
 *
 * Handles budget CRUD operations, category management, and zero-based budgeting calculations.
 * Implements the core budget management system with real-time balance calculations.
 *
 * Version: 1.1.0 - Updated with encoding fixes and manual deployment trigger
 */

const {
    successResponse,
    errorResponse,
    parseRequestBody,
    getUserFromEvent,
    generateId,
    dynamoHelpers,
    logger
} = require('/opt/nodejs/utils');

/**
 * Main Lambda handler for budget operations
 * Routes requests to appropriate handlers based on HTTP method and path
 */
exports.handler = async (event, context) => {
    logger.info('Budget request received', {
        httpMethod: event.httpMethod,
        path: event.path,
        requestId: context.awsRequestId
    });

    try {
        const {
            httpMethod,
            path,
            pathParameters
        } = event;

        // Handle health check endpoint
        if (httpMethod === 'GET' && path === '/budget/health') {
            return successResponse({
                status: 'healthy',
                service: 'budget',
                version: '1.0.0'
            }, 'Budget service is healthy');
        }

        // Handle CORS preflight requests
        if (httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                body: ''
            };
        }

        // Extract user information from JWT token
        const user = getUserFromEvent(event);
        logger.info('User authenticated', {
            userId: user.userId,
            familyId: user.familyId
        });

        // Route to appropriate handler based on HTTP method and path
        if (httpMethod === 'POST' && path === '/budget') {
            return await createBudget(event, user);
        }

        if (httpMethod === 'GET' && path === '/budget') {
            return await getBudgets(event, user);
        }

        if (httpMethod === 'GET' && path === '/budget/current') {
            return await getCurrentBudget(event, user);
        }

        if (httpMethod === 'GET' && pathParameters && pathParameters.budgetId) {
            return await getBudget(event, user, pathParameters.budgetId);
        }

        if (httpMethod === 'PUT' && pathParameters && pathParameters.budgetId) {
            return await updateBudget(event, user, pathParameters.budgetId);
        }

        if (httpMethod === 'DELETE' && pathParameters && pathParameters.budgetId) {
            return await deleteBudget(event, user, pathParameters.budgetId);
        }

        // Default response for unhandled routes
        return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);

    } catch (error) {
        logger.error('Budget function error', error, {
            httpMethod: event.httpMethod,
            path: event.path,
            requestId: context.awsRequestId
        });

        if (error.message.includes('No user claims')) {
            return errorResponse.unauthorized('Authentication required');
        }

        if (error.message.includes('Invalid JSON')) {
            return errorResponse.badRequest('Invalid JSON in request body');
        }

        return errorResponse.internalError('An error occurred processing your request');
    }
};

/**
 * Create a new budget for a family
 * POST /budget
 */
async function createBudget(event, user) {
    logger.info('Creating new budget', {
        userId: user.userId,
        familyId: user.familyId
    });

    const requestBody = parseRequestBody(event.body);

    // Validate required fields
    if (!requestBody.month) {
        return errorResponse.badRequest('Month is required (format: YYYY-MM)');
    }

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(requestBody.month)) {
        return errorResponse.badRequest('Month must be in YYYY-MM format');
    }

    const familyId = user.familyId || `family_${user.userId}`;
    const budgetId = generateId.budget();
    const currentTime = new Date().toISOString();

    // Check if budget already exists for this month
    const existingBudget = await dynamoHelpers.getItem(
        `FAMILY#${familyId}`,
        `BUDGET#${requestBody.month}`
    );

    if (existingBudget) {
        return errorResponse.conflict(`Budget already exists for ${requestBody.month}`);
    }

    // Initialize default budget structure
    const budget = {
        PK: `FAMILY#${familyId}`,
        SK: `BUDGET#${requestBody.month}`,
        GSI2PK: `BUDGET#${requestBody.month}`,
        GSI2SK: `FAMILY#${familyId}`,
        entityType: 'BUDGET',
        budgetId,
        familyId,
        month: requestBody.month,
        totalIncome: 0,
        totalSavings: 0,
        totalExpenses: 0,
        remainingBalance: 0,
        groups: {
            income: [],
            savings: [],
            expenses: []
        },
        isAIGenerated: requestBody.isAIGenerated || false,
        createdAt: currentTime,
        updatedAt: currentTime
    };

    // If budget data is provided, use it
    if (requestBody.groups) {
        budget.groups = requestBody.groups;
        const totals = calculateBudgetTotals(budget.groups);
        budget.totalIncome = totals.totalIncome;
        budget.totalSavings = totals.totalSavings;
        budget.totalExpenses = totals.totalExpenses;
        budget.remainingBalance = totals.remainingBalance;
    }

    await dynamoHelpers.putItem(budget);

    logger.info('Budget created successfully', {
        budgetId,
        familyId,
        month: requestBody.month
    });

    return successResponse({
        budgetId,
        familyId,
        month: requestBody.month,
        totalIncome: budget.totalIncome,
        totalSavings: budget.totalSavings,
        totalExpenses: budget.totalExpenses,
        remainingBalance: budget.remainingBalance,
        groups: budget.groups,
        isAIGenerated: budget.isAIGenerated,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt
    }, 'Budget created successfully');
}

/**
 * Get all budgets for a family
 * GET /budget
 */
async function getBudgets(event, user) {
    logger.info('Getting budgets for family', {
        userId: user.userId,
        familyId: user.familyId
    });

    const familyId = user.familyId || `family_${user.userId}`;

    // Query all budgets for the family
    const budgets = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
        FilterExpression: 'entityType = :entityType',
        ExpressionAttributeValues: {
            ':entityType': 'BUDGET'
        }
    });

    // Transform DynamoDB items to API response format
    const formattedBudgets = budgets.map(budget => ({
        budgetId: budget.budgetId,
        familyId: budget.familyId,
        month: budget.month,
        totalIncome: budget.totalIncome,
        totalSavings: budget.totalSavings,
        totalExpenses: budget.totalExpenses,
        remainingBalance: budget.remainingBalance,
        groups: budget.groups,
        isAIGenerated: budget.isAIGenerated,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt
    }));

    // Sort by month (most recent first)
    formattedBudgets.sort((a, b) => b.month.localeCompare(a.month));

    logger.info('Budgets retrieved successfully', {
        familyId,
        budgetCount: formattedBudgets.length
    });

    return successResponse({
        budgets: formattedBudgets,
        count: formattedBudgets.length
    }, 'Budgets retrieved successfully');
}

/**
 * Get current budget by month
 * GET /budget/current?month=YYYY-MM
 */
async function getCurrentBudget(event, user) {
    logger.info('Getting current budget', {
        userId: user.userId,
        familyId: user.familyId
    });

    const familyId = user.familyId || `family_${user.userId}`;

    // Extract month from query parameter
    const queryParams = event.queryStringParameters || {};
    const month = queryParams.month;

    if (!month) {
        return errorResponse.badRequest('Month parameter is required (format: YYYY-MM)');
    }

    const budget = await dynamoHelpers.getItem(
        `FAMILY#${familyId}`,
        `BUDGET#${month}`
    );

    if (!budget) {
        return errorResponse.notFound(`Budget not found for ${month}`);
    }

    logger.info('Budget retrieved successfully', {
        familyId,
        month
    });

    return successResponse({
        budgetId: budget.budgetId,
        familyId: budget.familyId,
        month: budget.month,
        totalIncome: budget.totalIncome,
        totalSavings: budget.totalSavings,
        totalExpenses: budget.totalExpenses,
        remainingBalance: budget.remainingBalance,
        groups: budget.groups,
        isAIGenerated: budget.isAIGenerated,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt
    }, 'Budget retrieved successfully');
}

/**
 * Get a specific budget by ID
 * GET /budget/{budgetId}
 */
async function getBudget(event, user, budgetId) {
    logger.info('Getting specific budget', {
        userId: user.userId,
        familyId: user.familyId,
        budgetId
    });

    const familyId = user.familyId || `family_${user.userId}`;

    // Extract month from budgetId or query parameter
    const queryParams = event.queryStringParameters || {};
    const month = queryParams.month;

    if (!month) {
        return errorResponse.badRequest('Month parameter is required (format: YYYY-MM)');
    }

    const budget = await dynamoHelpers.getItem(
        `FAMILY#${familyId}`,
        `BUDGET#${month}`
    );

    if (!budget) {
        return errorResponse.notFound(`Budget not found for ${month}`);
    }

    logger.info('Budget retrieved successfully', {
        budgetId,
        familyId,
        month
    });

    return successResponse({
        budgetId: budget.budgetId,
        familyId: budget.familyId,
        month: budget.month,
        totalIncome: budget.totalIncome,
        totalSavings: budget.totalSavings,
        totalExpenses: budget.totalExpenses,
        remainingBalance: budget.remainingBalance,
        groups: budget.groups,
        isAIGenerated: budget.isAIGenerated,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt
    }, 'Budget retrieved successfully');
}

/**
 * Update an existing budget
 * PUT /budget/{budgetId}
 */
async function updateBudget(event, user, budgetId) {
    logger.info('Updating budget', {
        userId: user.userId,
        familyId: user.familyId,
        budgetId
    });

    const requestBody = parseRequestBody(event.body);
    const familyId = user.familyId || `family_${user.userId}`;

    // Extract month from request body or query parameter
    let month = requestBody.month || (event.queryStringParameters && event.queryStringParameters.month);

    // If no month provided, try to find the budget by budgetId
    if (!month) {
        // Query all budgets to find the one with this budgetId
        const budgets = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
            FilterExpression: 'entityType = :entityType AND budgetId = :budgetId',
            ExpressionAttributeValues: {
                ':entityType': 'BUDGET',
                ':budgetId': budgetId
            }
        });

        if (budgets.length === 0) {
            return errorResponse.notFound(`Budget not found with ID ${budgetId}`);
        }

        month = budgets[0].month;
    }

    // Check if budget exists
    const existingBudget = await dynamoHelpers.getItem(
        `FAMILY#${familyId}`,
        `BUDGET#${month}`
    );

    if (!existingBudget) {
        return errorResponse.notFound(`Budget not found for ${month}`);
    }

    // Prepare updates
    const updates = {};

    if (requestBody.groups) {
        updates.groups = requestBody.groups;
        const totals = calculateBudgetTotals(requestBody.groups);
        updates.totalIncome = totals.totalIncome;
        updates.totalSavings = totals.totalSavings;
        updates.totalExpenses = totals.totalExpenses;
        updates.remainingBalance = totals.remainingBalance;
    }

    // Update the budget
    const updatedBudget = await dynamoHelpers.updateItem(
        `FAMILY#${familyId}`,
        `BUDGET#${month}`,
        updates
    );

    logger.info('Budget updated successfully', {
        budgetId,
        familyId,
        month
    });

    return successResponse({
        budgetId: updatedBudget.budgetId,
        familyId: updatedBudget.familyId,
        month: updatedBudget.month,
        totalIncome: updatedBudget.totalIncome,
        totalSavings: updatedBudget.totalSavings,
        totalExpenses: updatedBudget.totalExpenses,
        remainingBalance: updatedBudget.remainingBalance,
        groups: updatedBudget.groups,
        isAIGenerated: updatedBudget.isAIGenerated,
        createdAt: updatedBudget.createdAt,
        updatedAt: updatedBudget.updatedAt
    }, 'Budget updated successfully');
}

/**
 * Delete a budget
 * DELETE /budget/{budgetId}
 */
async function deleteBudget(event, user, budgetId) {
    logger.info('Deleting budget', {
        userId: user.userId,
        familyId: user.familyId,
        budgetId
    });

    const familyId = user.familyId || `family_${user.userId}`;
    const month = event.queryStringParameters && event.queryStringParameters.month;

    if (!month) {
        return errorResponse.badRequest('Month parameter is required (format: YYYY-MM)');
    }

    // Check if budget exists
    const existingBudget = await dynamoHelpers.getItem(
        `FAMILY#${familyId}`,
        `BUDGET#${month}`
    );

    if (!existingBudget) {
        return errorResponse.notFound(`Budget not found for ${month}`);
    }

    // Delete the budget (implement delete operation)
    // Note: DynamoDB delete operation would be implemented here
    // For now, we'll mark it as deleted by updating a status field
    await dynamoHelpers.updateItem(
        `FAMILY#${familyId}`,
        `BUDGET#${month}`, {
            isDeleted: true,
            deletedAt: new Date().toISOString(),
            deletedBy: user.userId
        }
    );

    logger.info('Budget deleted successfully', {
        budgetId,
        familyId,
        month
    });

    return successResponse(null, 'Budget deleted successfully');
}

/**
 * Calculate budget totals from groups
 * Implements zero-based budgeting calculations
 */
function calculateBudgetTotals(groups) {
    let totalIncome = 0;
    let totalSavings = 0;
    let totalExpenses = 0;

    // Calculate income total
    if (groups.income) {
        totalIncome = groups.income.reduce((sum, group) => {
            return sum + (group.totalPlanned || 0);
        }, 0);
    }

    // Calculate savings total
    if (groups.savings) {
        totalSavings = groups.savings.reduce((sum, group) => {
            return sum + (group.totalPlanned || 0);
        }, 0);
    }

    // Calculate expenses total
    if (groups.expenses) {
        totalExpenses = groups.expenses.reduce((sum, group) => {
            return sum + (group.totalPlanned || 0);
        }, 0);
    }

    // Zero-based budgeting: Income - Savings - Expenses = 0 (ideally)
    const remainingBalance = totalIncome - totalSavings - totalExpenses;

    return {
        totalIncome,
        totalSavings,
        totalExpenses,
        remainingBalance
    };
}