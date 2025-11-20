/**
 * BudgetBuddy Transaction Planning Lambda Function
 *
 * Handles planned transaction CRUD operations and recurring transaction management.
 * Supports advanced scheduling, recurring patterns, and automatic transaction generation.
 *
 * Version: 1.0.0 - Enhanced Transaction Planning Implementation
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
 * Main Lambda handler for transaction planning operations
 * Routes requests to appropriate handlers based on HTTP method and path
 */
exports.handler = async (event, context) => {
    logger.info('Transaction planning request received', {
        httpMethod: event.httpMethod,
        path: event.path,
        requestId: context.awsRequestId
    });

    try {
        const { httpMethod, path, pathParameters } = event;

        // Handle health check endpoint
        if (httpMethod === 'GET' && path === '/transaction-planning/health') {
            return successResponse({
                status: 'healthy',
                service: 'transaction-planning',
                version: '1.0.0'
            }, 'Transaction planning service is healthy');
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
        if (httpMethod === 'POST' && path === '/transaction-planning') {
            return await createPlannedTransaction(event, user);
        }

        if (httpMethod === 'GET' && path === '/transaction-planning') {
            return await getPlannedTransactions(event, user);
        }

        if (httpMethod === 'PUT' && pathParameters && pathParameters.planId) {
            return await updatePlannedTransaction(event, user, pathParameters.planId);
        }

        if (httpMethod === 'DELETE' && pathParameters && pathParameters.planId) {
            return await deletePlannedTransaction(event, user, pathParameters.planId);
        }

        if (httpMethod === 'POST' && path === '/transaction-planning/execute') {
            return await executePlannedTransaction(event, user);
        }

        if (httpMethod === 'POST' && path === '/transaction-planning/generate-recurring') {
            return await generateRecurringTransactions(event, user);
        }

        // Default response for unhandled routes
        return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);

    } catch (error) {
        logger.error('Transaction planning function error', error, {
            httpMethod: event.httpMethod,
            path: event.path,
            requestId: context.awsRequestId
        });

        return errorResponse.internalError('Transaction planning processing failed');
    }
};

/**
 * Create a new planned transaction
 * POST /transaction-planning
 */
async function createPlannedTransaction(event, user) {
    logger.info('Creating new planned transaction', {
        userId: user.userId,
        familyId: user.familyId
    });

    const requestBody = parseRequestBody(event.body);

    // Validate required fields
    const requiredFields = ['type', 'amount', 'currency', 'categoryId', 'categoryName', 'date'];
    for (const field of requiredFields) {
        if (!requestBody[field]) {
            return errorResponse.badRequest(`${field} is required`);
        }
    }

    // Validate transaction type
    if (!['income', 'expense'].includes(requestBody.type)) {
        return errorResponse.badRequest('Type must be either "income" or "expense"');
    }

    // Validate currency
    if (!['CAD', 'USD'].includes(requestBody.currency)) {
        return errorResponse.badRequest('Currency must be either "CAD" or "USD"');
    }

    // Validate amount is positive
    if (requestBody.amount <= 0) {
        return errorResponse.badRequest('Amount must be positive');
    }

    const familyId = user.familyId || `family_${user.userId}`;
    const planId = generateId.plannedTransaction();
    const currentTime = new Date().toISOString();

    // Calculate next occurrence for recurring transactions
    let nextOccurrence = null;
    if (requestBody.isRecurring) {
        nextOccurrence = calculateNextOccurrence(
            requestBody.date,
            requestBody.frequency,
            requestBody.customInterval,
            requestBody.onLastDayOfMonth
        );
    }

    // Create planned transaction object
    const plannedTransaction = {
        PK: `FAMILY#${familyId}`,
        SK: `PLANNED_TXN#${requestBody.date}#${currentTime}#${planId}`,
        GSI2PK: `FAMILY#${familyId}#PLANNED`,
        GSI2SK: `DATE#${requestBody.date}`,
        entityType: 'PLANNED_TRANSACTION',
        planId,
        familyId,
        transactionType: requestBody.type,
        amount: requestBody.amount,
        currency: requestBody.currency,
        categoryId: requestBody.categoryId,
        categoryName: requestBody.categoryName,
        scheduledDate: requestBody.date,
        scheduledTime: requestBody.time || '12:00',
        notes: requestBody.notes || null,

        // Recurring fields
        isRecurring: requestBody.isRecurring || false,
        frequency: requestBody.frequency || null,
        customInterval: requestBody.customInterval || null,
        onLastDayOfMonth: requestBody.onLastDayOfMonth || false,
        endDate: requestBody.endDate || null,
        nextOccurrence,

        // Planning metadata
        isExecuted: false,
        executedTransactionId: null,
        createdBy: user.userId,
        createdAt: currentTime,
        updatedAt: currentTime
    };

    // Save planned transaction to DynamoDB
    await dynamoHelpers.putItem(plannedTransaction);

    logger.info('Planned transaction created successfully', {
        planId,
        familyId,
        type: requestBody.type,
        amount: requestBody.amount,
        isRecurring: requestBody.isRecurring
    });

    return successResponse({
        planId: plannedTransaction.planId,
        familyId: plannedTransaction.familyId,
        transactionType: plannedTransaction.transactionType,
        amount: plannedTransaction.amount,
        currency: plannedTransaction.currency,
        categoryId: plannedTransaction.categoryId,
        categoryName: plannedTransaction.categoryName,
        scheduledDate: plannedTransaction.scheduledDate,
        scheduledTime: plannedTransaction.scheduledTime,
        notes: plannedTransaction.notes,
        isRecurring: plannedTransaction.isRecurring,
        frequency: plannedTransaction.frequency,
        nextOccurrence: plannedTransaction.nextOccurrence,
        createdAt: plannedTransaction.createdAt
    }, 'Planned transaction created successfully');
}

/**
 * Get planned transactions with filtering
 * GET /transaction-planning?type=...&startDate=...&endDate=...&includeExecuted=...
 */
async function getPlannedTransactions(event, user) {
    logger.info('Getting planned transactions for family', {
        userId: user.userId,
        familyId: user.familyId
    });

    const familyId = user.familyId || `family_${user.userId}`;
    const queryParams = event.queryStringParameters || {};

    // Build query options based on filters
    let queryOptions = {
        FilterExpression: 'entityType = :entityType',
        ExpressionAttributeValues: {
            ':entityType': 'PLANNED_TRANSACTION'
        }
    };

    // Add filters
    const filters = [];

    if (queryParams.type) {
        filters.push('transactionType = :type');
        queryOptions.ExpressionAttributeValues[':type'] = queryParams.type;
    }

    if (queryParams.startDate) {
        filters.push('scheduledDate >= :startDate');
        queryOptions.ExpressionAttributeValues[':startDate'] = queryParams.startDate;
    }

    if (queryParams.endDate) {
        filters.push('scheduledDate <= :endDate');
        queryOptions.ExpressionAttributeValues[':endDate'] = queryParams.endDate;
    }

    // Include executed transactions filter
    if (queryParams.includeExecuted !== 'true') {
        filters.push('isExecuted = :isExecuted');
        queryOptions.ExpressionAttributeValues[':isExecuted'] = false;
    }

    // Combine filters
    if (filters.length > 0) {
        queryOptions.FilterExpression += ' AND ' + filters.join(' AND ');
    }

    // Query planned transactions for the family
    const result = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, queryOptions);

    // Format planned transactions for response
    const plannedTransactions = result.map(plan => ({
        planId: plan.planId,
        familyId: plan.familyId,
        transactionType: plan.transactionType,
        amount: plan.amount,
        currency: plan.currency,
        categoryId: plan.categoryId,
        categoryName: plan.categoryName,
        scheduledDate: plan.scheduledDate,
        scheduledTime: plan.scheduledTime,
        notes: plan.notes,
        isRecurring: plan.isRecurring,
        frequency: plan.frequency,
        customInterval: plan.customInterval,
        onLastDayOfMonth: plan.onLastDayOfMonth,
        endDate: plan.endDate,
        nextOccurrence: plan.nextOccurrence,
        isExecuted: plan.isExecuted,
        executedTransactionId: plan.executedTransactionId,
        createdBy: plan.createdBy,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt
    }));

    // Sort by scheduled date (earliest first)
    plannedTransactions.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

    logger.info('Planned transactions retrieved successfully', {
        familyId,
        plannedTransactionCount: plannedTransactions.length
    });

    return successResponse({
        plannedTransactions,
        count: plannedTransactions.length
    }, 'Planned transactions retrieved successfully');
}

/**
 * Execute a planned transaction (convert to actual transaction)
 * POST /transaction-planning/execute
 */
async function executePlannedTransaction(event, user) {
    logger.info('Executing planned transaction', {
        userId: user.userId,
        familyId: user.familyId
    });

    const requestBody = parseRequestBody(event.body);
    const { planId } = requestBody;

    if (!planId) {
        return errorResponse.badRequest('planId is required');
    }

    const familyId = user.familyId || `family_${user.userId}`;

    // Get the planned transaction
    const plannedTransactions = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
        FilterExpression: 'entityType = :entityType AND planId = :planId',
        ExpressionAttributeValues: {
            ':entityType': 'PLANNED_TRANSACTION',
            ':planId': planId
        }
    });

    if (!plannedTransactions || plannedTransactions.length === 0) {
        return errorResponse.notFound(`Planned transaction not found with ID ${planId}`);
    }

    const plannedTransaction = plannedTransactions[0];

    if (plannedTransaction.isExecuted) {
        return errorResponse.badRequest('Planned transaction has already been executed');
    }

    // Create actual transaction
    const transactionId = generateId.transaction();
    const currentTime = new Date().toISOString();
    const budgetMonth = plannedTransaction.scheduledDate.substring(0, 7);

    const transaction = {
        PK: `FAMILY#${familyId}`,
        SK: `TRANSACTION#${transactionId}`,
        GSI1PK: `FAMILY#${familyId}`,
        GSI1SK: `DATE#${plannedTransaction.scheduledDate}`,
        GSI2PK: `CATEGORY#${plannedTransaction.categoryId}`,
        GSI2SK: `DATE#${plannedTransaction.scheduledDate}`,
        entityType: 'TRANSACTION',
        transactionId,
        familyId,
        budgetMonth,
        amount: plannedTransaction.amount,
        type: plannedTransaction.transactionType,
        categoryId: plannedTransaction.categoryId,
        description: plannedTransaction.notes || `${plannedTransaction.categoryName} - ${plannedTransaction.transactionType}`,
        date: plannedTransaction.scheduledDate,
        merchantName: null,
        createdBy: user.userId,
        createdByName: `${user.firstName} ${user.lastName}`,
        createdAt: currentTime,
        updatedAt: currentTime,
        sourceType: 'PLANNED_TRANSACTION',
        sourcePlanId: planId
    };

    // Save the actual transaction
    await dynamoHelpers.putItem(transaction);

    // Mark planned transaction as executed
    await dynamoHelpers.updateItem(
        plannedTransaction.PK,
        plannedTransaction.SK,
        {
            isExecuted: true,
            executedTransactionId: transactionId,
            executedAt: currentTime,
            updatedAt: currentTime
        }
    );

    // If this is a recurring transaction, create the next occurrence
    if (plannedTransaction.isRecurring && !hasRecurringEnded(plannedTransaction)) {
        await createNextRecurringOccurrence(plannedTransaction, user);
    }

    logger.info('Planned transaction executed successfully', {
        planId,
        transactionId,
        familyId
    });

    return successResponse({
        transactionId,
        planId,
        executedAt: currentTime
    }, 'Planned transaction executed successfully');
}

/**
 * Generate recurring transactions for upcoming periods
 * POST /transaction-planning/generate-recurring
 */
async function generateRecurringTransactions(event, user) {
    logger.info('Generating recurring transactions', {
        userId: user.userId,
        familyId: user.familyId
    });

    const requestBody = parseRequestBody(event.body);
    const { months = 3 } = requestBody; // Generate for next 3 months by default

    const familyId = user.familyId || `family_${user.userId}`;

    // Get all active recurring planned transactions
    const recurringTransactions = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
        FilterExpression: 'entityType = :entityType AND isRecurring = :isRecurring AND isExecuted = :isExecuted',
        ExpressionAttributeValues: {
            ':entityType': 'PLANNED_TRANSACTION',
            ':isRecurring': true,
            ':isExecuted': false
        }
    });

    let generatedCount = 0;
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);

    for (const recurringTransaction of recurringTransactions) {
        if (hasRecurringEnded(recurringTransaction)) {
            continue;
        }

        let currentDate = new Date(recurringTransaction.nextOccurrence || recurringTransaction.scheduledDate);

        while (currentDate <= endDate) {
            // Check if this occurrence already exists
            const existingOccurrence = await checkExistingOccurrence(
                familyId,
                recurringTransaction.planId,
                currentDate.toISOString().split('T')[0]
            );

            if (!existingOccurrence) {
                await createRecurringOccurrence(recurringTransaction, currentDate, user);
                generatedCount++;
            }

            // Calculate next occurrence
            currentDate = getNextOccurrenceDate(
                currentDate,
                recurringTransaction.frequency,
                recurringTransaction.customInterval,
                recurringTransaction.onLastDayOfMonth
            );

            if (recurringTransaction.endDate && currentDate > new Date(recurringTransaction.endDate)) {
                break;
            }
        }
    }

    logger.info('Recurring transactions generated successfully', {
        familyId,
        generatedCount
    });

    return successResponse({
        generatedCount,
        months
    }, `Generated ${generatedCount} recurring transactions for the next ${months} months`);
}

/**
 * Helper function to calculate next occurrence date
 */
function calculateNextOccurrence(startDate, frequency, customInterval, onLastDayOfMonth) {
    const date = new Date(startDate);

    switch (frequency) {
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'bi-weekly':
            date.setDate(date.getDate() + 14);
            break;
        case 'monthly':
            if (onLastDayOfMonth) {
                date.setMonth(date.getMonth() + 1);
                date.setDate(0); // Last day of month
            } else {
                date.setMonth(date.getMonth() + 1);
            }
            break;
        case 'annually':
            date.setFullYear(date.getFullYear() + 1);
            break;
        case 'custom':
            if (customInterval) {
                date.setMonth(date.getMonth() + customInterval);
                if (onLastDayOfMonth) {
                    date.setDate(0); // Last day of month
                }
            }
            break;
        default:
            return null;
    }

    return date.toISOString().split('T')[0];
}

/**
 * Helper function to get next occurrence date
 */
function getNextOccurrenceDate(currentDate, frequency, customInterval, onLastDayOfMonth) {
    const nextDate = new Date(currentDate);

    switch (frequency) {
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'bi-weekly':
            nextDate.setDate(nextDate.getDate() + 14);
            break;
        case 'monthly':
            if (onLastDayOfMonth) {
                nextDate.setMonth(nextDate.getMonth() + 1);
                nextDate.setDate(0); // Last day of month
            } else {
                nextDate.setMonth(nextDate.getMonth() + 1);
            }
            break;
        case 'annually':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        case 'custom':
            if (customInterval) {
                nextDate.setMonth(nextDate.getMonth() + customInterval);
                if (onLastDayOfMonth) {
                    nextDate.setDate(0); // Last day of month
                }
            }
            break;
    }

    return nextDate;
}

/**
 * Helper function to check if recurring has ended
 */
function hasRecurringEnded(recurringTransaction) {
    if (!recurringTransaction.endDate) {
        return false; // Never ending
    }

    const endDate = new Date(recurringTransaction.endDate);
    const today = new Date();

    return today > endDate;
}

/**
 * Helper function to check if occurrence already exists
 */
async function checkExistingOccurrence(familyId, originalPlanId, scheduledDate) {
    const existingOccurrences = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
        FilterExpression: 'entityType = :entityType AND scheduledDate = :scheduledDate AND (planId = :planId OR originalPlanId = :originalPlanId)',
        ExpressionAttributeValues: {
            ':entityType': 'PLANNED_TRANSACTION',
            ':scheduledDate': scheduledDate,
            ':planId': originalPlanId,
            ':originalPlanId': originalPlanId
        }
    });

    return existingOccurrences && existingOccurrences.length > 0;
}

/**
 * Helper function to create recurring occurrence
 */
async function createRecurringOccurrence(originalTransaction, occurrenceDate, _user) {
    const planId = generateId.plannedTransaction();
    const currentTime = new Date().toISOString();
    const scheduledDate = occurrenceDate.toISOString().split('T')[0];

    const newOccurrence = {
        ...originalTransaction,
        planId,
        SK: `PLANNED_TXN#${scheduledDate}#${currentTime}#${planId}`,
        GSI2SK: `DATE#${scheduledDate}`,
        scheduledDate,
        originalPlanId: originalTransaction.planId,
        isExecuted: false,
        executedTransactionId: null,
        createdAt: currentTime,
        updatedAt: currentTime
    };

    await dynamoHelpers.putItem(newOccurrence);

    return newOccurrence;
}

/**
 * Helper function to create next recurring occurrence
 */
async function createNextRecurringOccurrence(plannedTransaction, user) {
    const nextDate = getNextOccurrenceDate(
        new Date(plannedTransaction.scheduledDate),
        plannedTransaction.frequency,
        plannedTransaction.customInterval,
        plannedTransaction.onLastDayOfMonth
    );

    if (plannedTransaction.endDate && nextDate > new Date(plannedTransaction.endDate)) {
        return; // Don't create if past end date
    }

    await createRecurringOccurrence(plannedTransaction, nextDate, user);
}

/**
 * Update a planned transaction
 * PUT /transaction-planning/{planId}
 */
async function updatePlannedTransaction(event, user, planId) {
    logger.info('Updating planned transaction', {
        userId: user.userId,
        familyId: user.familyId,
        planId
    });

    const requestBody = parseRequestBody(event.body);
    const familyId = user.familyId || `family_${user.userId}`;

    // Find the planned transaction
    const plannedTransactions = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
        FilterExpression: 'entityType = :entityType AND planId = :planId',
        ExpressionAttributeValues: {
            ':entityType': 'PLANNED_TRANSACTION',
            ':planId': planId
        }
    });

    if (!plannedTransactions || plannedTransactions.length === 0) {
        return errorResponse.notFound(`Planned transaction not found with ID ${planId}`);
    }

    const plannedTransaction = plannedTransactions[0];

    if (plannedTransaction.isExecuted) {
        return errorResponse.badRequest('Cannot update executed planned transaction');
    }

    // Prepare updates
    const updates = {
        updatedAt: new Date().toISOString()
    };

    // Update allowed fields
    if (requestBody.amount !== undefined) {
        if (requestBody.amount <= 0) {
            return errorResponse.badRequest('Amount must be positive');
        }
        updates.amount = requestBody.amount;
    }

    if (requestBody.scheduledDate !== undefined) {
        updates.scheduledDate = requestBody.scheduledDate;
    }

    if (requestBody.scheduledTime !== undefined) {
        updates.scheduledTime = requestBody.scheduledTime;
    }

    if (requestBody.notes !== undefined) {
        updates.notes = requestBody.notes;
    }

    if (requestBody.categoryId !== undefined) {
        updates.categoryId = requestBody.categoryId;
    }

    if (requestBody.categoryName !== undefined) {
        updates.categoryName = requestBody.categoryName;
    }

    // Update the planned transaction
    const updatedTransaction = await dynamoHelpers.updateItem(
        plannedTransaction.PK,
        plannedTransaction.SK,
        updates
    );

    logger.info('Planned transaction updated successfully', {
        planId,
        familyId
    });

    return successResponse({
        planId: updatedTransaction.planId,
        updatedAt: updatedTransaction.updatedAt
    }, 'Planned transaction updated successfully');
}

/**
 * Delete a planned transaction
 * DELETE /transaction-planning/{planId}
 */
async function deletePlannedTransaction(event, user, planId) {
    logger.info('Deleting planned transaction', {
        userId: user.userId,
        familyId: user.familyId,
        planId
    });

    const familyId = user.familyId || `family_${user.userId}`;

    // Find the planned transaction
    const plannedTransactions = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
        FilterExpression: 'entityType = :entityType AND planId = :planId',
        ExpressionAttributeValues: {
            ':entityType': 'PLANNED_TRANSACTION',
            ':planId': planId
        }
    });

    if (!plannedTransactions || plannedTransactions.length === 0) {
        return errorResponse.notFound(`Planned transaction not found with ID ${planId}`);
    }

    const plannedTransaction = plannedTransactions[0];

    // Soft delete the planned transaction
    await dynamoHelpers.updateItem(
        plannedTransaction.PK,
        plannedTransaction.SK,
        {
            isDeleted: true,
            deletedAt: new Date().toISOString(),
            deletedBy: user.userId
        }
    );

    logger.info('Planned transaction deleted successfully', {
        planId,
        familyId
    });

    return successResponse(null, 'Planned transaction deleted successfully');
}
