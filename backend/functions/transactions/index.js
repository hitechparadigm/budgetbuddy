/**
 * BudgetBuddy Transactions Lambda Function
 *
 * Handles transaction CRUD operations and automatic budget calculations.
 * Implements income and expense tracking with real-time budget updates.
 *
 * Version: 1.0.0 - Complete CRUD implementation
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

const { ValidationError, AuthorizationError, NotFoundError, BusinessLogicError } = require('./errors');
const { updateBudgetCalculations } = require('./budget-service');

/**
 * Main Lambda handler for transaction operations
 * Routes requests to appropriate handlers based on HTTP method and path
 */
exports.handler = async (event, context) => {
    logger.info('Transaction request received', {
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
        if (httpMethod === 'GET' && path === '/transactions/health') {
            return successResponse({
                status: 'healthy',
                service: 'transactions',
                version: '1.0.0'
            }, 'Transaction service is healthy');
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
        if (httpMethod === 'POST' && path === '/transactions') {
            return await createTransaction(event, user);
        }

        if (httpMethod === 'GET' && path === '/transactions') {
            return await getTransactions(event, user);
        }

        if (httpMethod === 'GET' && pathParameters && pathParameters.transactionId) {
            return await getTransaction(event, user, pathParameters.transactionId);
        }

        if (httpMethod === 'PUT' && pathParameters && pathParameters.transactionId) {
            return await updateTransaction(event, user, pathParameters.transactionId);
        }

        if (httpMethod === 'DELETE' && pathParameters && pathParameters.transactionId) {
            return await deleteTransaction(event, user, pathParameters.transactionId);
        }

        // Default response for unhandled routes
        return errorResponse.notFound(`Route ${httpMethod} ${path} not found`);

    } catch (error) {
        logger.error('Transaction function error', error, {
            httpMethod: event.httpMethod,
            path: event.path,
            requestId: context.awsRequestId
        });

        // Handle specific error types
        if (error instanceof ValidationError) {
            return errorResponse.badRequest(error.message);
        }

        if (error instanceof AuthorizationError) {
            return errorResponse.unauthorized(error.message);
        }

        if (error instanceof NotFoundError) {
            return errorResponse.notFound(error.message);
        }

        if (error instanceof BusinessLogicError) {
            return errorResponse.badRequest(error.message);
        }

        // Handle legacy error patterns
        if (error.message.includes('No user claims')) {
            return errorResponse.unauthorized('Authentication required');
        }

        if (error.message.includes('Invalid JSON')) {
            return errorResponse.badRequest('Invalid JSON in request body');
        }

        // Log unexpected errors with more context
        logger.error('Unexpected transaction error', {
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            httpMethod: event.httpMethod,
            path: event.path,
            requestId: context.awsRequestId
        });

        return errorResponse.internalError('Transaction processing failed');
    }
};

/**
 * Create a new transaction
 * POST /transactions
 */
async function createTransaction(event, user) {
    logger.info('Creating new transaction', {
        userId: user.userId,
        familyId: user.familyId
    });

    const requestBody = parseRequestBody(event.body);

    // Validate required fields
    const requiredFields = ['amount', 'type', 'categoryId', 'description', 'date'];
    for (const field of requiredFields) {
        if (!requestBody[field]) {
            throw new ValidationError(`${field} is required`, field);
        }
    }

    // Validate transaction type
    if (!['income', 'expense'].includes(requestBody.type)) {
        throw new ValidationError('Type must be either "income" or "expense"', 'type');
    }

    // Validate amount is positive
    if (requestBody.amount <= 0) {
        throw new ValidationError('Amount must be positive', 'amount');
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestBody.date)) {
        throw new ValidationError('Date must be in YYYY-MM-DD format', 'date');
    }

    const familyId = user.familyId || `family_${user.userId}`;
    const transactionId = generateId.transaction();
    const currentTime = new Date().toISOString();
    const budgetMonth = requestBody.date.substring(0, 7); // Extract YYYY-MM from date

    // Create transaction object
    const transaction = {
        PK: `FAMILY#${familyId}`,
        SK: `TRANSACTION#${transactionId}`,
        GSI1PK: `FAMILY#${familyId}`,
        GSI1SK: `DATE#${requestBody.date}`,
        GSI2PK: `CATEGORY#${requestBody.categoryId}`,
        GSI2SK: `DATE#${requestBody.date}`,
        entityType: 'TRANSACTION',
        transactionId,
        familyId,
        budgetMonth,
        amount: requestBody.amount,
        type: requestBody.type,
        categoryId: requestBody.categoryId,
        description: requestBody.description,
        date: requestBody.date,
        merchantName: requestBody.merchantName || null,
        createdBy: user.userId,
        createdByName: `${user.firstName} ${user.lastName}`,
        createdAt: currentTime,
        updatedAt: currentTime
    };

    // Save transaction to DynamoDB
    await dynamoHelpers.putItem(transaction);

    // Update budget calculations
    await updateBudgetCalculations(familyId, budgetMonth, requestBody.categoryId, requestBody.type, requestBody.amount, 'add');

    logger.info('Transaction created successfully', {
        transactionId,
        familyId,
        type: requestBody.type,
        amount: requestBody.amount
    });

    return successResponse({
        transactionId,
        familyId,
        budgetMonth,
        amount: transaction.amount,
        type: transaction.type,
        categoryId: transaction.categoryId,
        description: transaction.description,
        date: transaction.date,
        merchantName: transaction.merchantName,
        createdBy: transaction.createdBy,
        createdByName: transaction.createdByName,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
    }, 'Transaction created successfully');
}

/**
 * Get transactions with filtering
 * GET /transactions?categoryId=...&type=...&startDate=...&endDate=...&limit=...&nextToken=...
 */
async function getTransactions(event, user) {
    logger.info('Getting transactions for family', {
        userId: user.userId,
        familyId: user.familyId
    });

    const familyId = user.familyId || `family_${user.userId}`;
    const queryParams = event.queryStringParameters || {};

    // Build query options based on filters
    const queryOptions = {
        FilterExpression: 'entityType = :entityType',
        ExpressionAttributeValues: {
            ':entityType': 'TRANSACTION'
        }
    };

    // Add filters
    const filters = [];

    if (queryParams.type) {
        filters.push('#type = :type');
        queryOptions.ExpressionAttributeNames = queryOptions.ExpressionAttributeNames || {};
        queryOptions.ExpressionAttributeNames['#type'] = 'type';
        queryOptions.ExpressionAttributeValues[':type'] = queryParams.type;
    }

    if (queryParams.categoryId) {
        filters.push('categoryId = :categoryId');
        queryOptions.ExpressionAttributeValues[':categoryId'] = queryParams.categoryId;
    }

    if (queryParams.startDate) {
        filters.push('#date >= :startDate');
        queryOptions.ExpressionAttributeNames = queryOptions.ExpressionAttributeNames || {};
        queryOptions.ExpressionAttributeNames['#date'] = 'date';
        queryOptions.ExpressionAttributeValues[':startDate'] = queryParams.startDate;
    }

    if (queryParams.endDate) {
        filters.push('#date <= :endDate');
        queryOptions.ExpressionAttributeNames = queryOptions.ExpressionAttributeNames || {};
        queryOptions.ExpressionAttributeNames['#date'] = 'date';
        queryOptions.ExpressionAttributeValues[':endDate'] = queryParams.endDate;
    }

    if (queryParams.createdBy) {
        filters.push('createdBy = :createdBy');
        queryOptions.ExpressionAttributeValues[':createdBy'] = queryParams.createdBy;
    }

    // Combine filters
    if (filters.length > 0) {
        queryOptions.FilterExpression += ' AND ' + filters.join(' AND ');
    }

    // Add pagination
    if (queryParams.limit) {
        queryOptions.Limit = parseInt(queryParams.limit);
    }

    if (queryParams.nextToken) {
        queryOptions.ExclusiveStartKey = JSON.parse(Buffer.from(queryParams.nextToken, 'base64').toString());
    }

    // Query transactions for the family
    const result = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, queryOptions);

    // Format transactions for response
    const transactions = result.map(transaction => ({
        transactionId: transaction.transactionId,
        familyId: transaction.familyId,
        budgetMonth: transaction.budgetMonth,
        amount: transaction.amount,
        type: transaction.type,
        categoryId: transaction.categoryId,
        description: transaction.description,
        date: transaction.date,
        merchantName: transaction.merchantName,
        createdBy: transaction.createdBy,
        createdByName: transaction.createdByName,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
    }));

    // Sort by date (most recent first)
    transactions.sort((a, b) => b.date.localeCompare(a.date));

    logger.info('Transactions retrieved successfully', {
        familyId,
        transactionCount: transactions.length
    });

    return successResponse({
        transactions,
        count: transactions.length,
        nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : null
    }, 'Transactions retrieved successfully');
}

/**
 * Get a specific transaction by ID
 * GET /transactions/{transactionId}
 */
async function getTransaction(event, user, transactionId) {
    logger.info('Getting specific transaction', {
        userId: user.userId,
        familyId: user.familyId,
        transactionId
    });

    const familyId = user.familyId || `family_${user.userId}`;

    const transaction = await dynamoHelpers.getItem(
        `FAMILY#${familyId}`,
        `TRANSACTION#${transactionId}`
    );

    if (!transaction) {
        return errorResponse.notFound(`Transaction not found with ID ${transactionId}`);
    }

    logger.info('Transaction retrieved successfully', {
        transactionId,
        familyId
    });

    return successResponse({
        transactionId: transaction.transactionId,
        familyId: transaction.familyId,
        budgetMonth: transaction.budgetMonth,
        amount: transaction.amount,
        type: transaction.type,
        categoryId: transaction.categoryId,
        description: transaction.description,
        date: transaction.date,
        merchantName: transaction.merchantName,
        createdBy: transaction.createdBy,
        createdByName: transaction.createdByName,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
    }, 'Transaction retrieved successfully');
}

/**
 * Update an existing transaction
 * PUT /transactions/{transactionId}
 */
async function updateTransaction(event, user, transactionId) {
    logger.info('Updating transaction', {
        userId: user.userId,
        familyId: user.familyId,
        transactionId
    });

    const requestBody = parseRequestBody(event.body);
    const familyId = user.familyId || `family_${user.userId}`;

    // Check if transaction exists
    const existingTransaction = await dynamoHelpers.getItem(
        `FAMILY#${familyId}`,
        `TRANSACTION#${transactionId}`
    );

    if (!existingTransaction) {
        return errorResponse.notFound(`Transaction not found with ID ${transactionId}`);
    }

    // Prepare updates
    const updates = {
        updatedAt: new Date().toISOString()
    };

    let budgetUpdateNeeded = false;
    const oldAmount = existingTransaction.amount;
    const oldType = existingTransaction.type;
    const oldCategoryId = existingTransaction.categoryId;

    if (requestBody.amount !== undefined) {
        if (requestBody.amount <= 0) {
            return errorResponse.badRequest('Amount must be positive');
        }
        updates.amount = requestBody.amount;
        budgetUpdateNeeded = true;
    }

    if (requestBody.type !== undefined) {
        if (!['income', 'expense'].includes(requestBody.type)) {
            return errorResponse.badRequest('Type must be either "income" or "expense"');
        }
        updates.type = requestBody.type;
        budgetUpdateNeeded = true;
    }

    if (requestBody.categoryId !== undefined) {
        updates.categoryId = requestBody.categoryId;
        budgetUpdateNeeded = true;
    }

    if (requestBody.description !== undefined) {
        updates.description = requestBody.description;
    }

    if (requestBody.date !== undefined) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(requestBody.date)) {
            return errorResponse.badRequest('Date must be in YYYY-MM-DD format');
        }
        updates.date = requestBody.date;
        updates.budgetMonth = requestBody.date.substring(0, 7);
    }

    if (requestBody.merchantName !== undefined) {
        updates.merchantName = requestBody.merchantName;
    }

    // Update the transaction
    const updatedTransaction = await dynamoHelpers.updateItem(
        `FAMILY#${familyId}`,
        `TRANSACTION#${transactionId}`,
        updates
    );

    // Update budget calculations if amount, type, or category changed
    if (budgetUpdateNeeded) {
        // Remove old transaction impact
        await updateBudgetCalculations(familyId, existingTransaction.budgetMonth, oldCategoryId, oldType, oldAmount, 'subtract');

        // Add new transaction impact
        const newAmount = updatedTransaction.amount;
        const newType = updatedTransaction.type;
        const newCategoryId = updatedTransaction.categoryId;
        const newBudgetMonth = updatedTransaction.budgetMonth;

        await updateBudgetCalculations(familyId, newBudgetMonth, newCategoryId, newType, newAmount, 'add');
    }

    logger.info('Transaction updated successfully', {
        transactionId,
        familyId
    });

    return successResponse({
        transactionId: updatedTransaction.transactionId,
        familyId: updatedTransaction.familyId,
        budgetMonth: updatedTransaction.budgetMonth,
        amount: updatedTransaction.amount,
        type: updatedTransaction.type,
        categoryId: updatedTransaction.categoryId,
        description: updatedTransaction.description,
        date: updatedTransaction.date,
        merchantName: updatedTransaction.merchantName,
        createdBy: updatedTransaction.createdBy,
        createdByName: updatedTransaction.createdByName,
        createdAt: updatedTransaction.createdAt,
        updatedAt: updatedTransaction.updatedAt
    }, 'Transaction updated successfully');
}

/**
 * Delete a transaction
 * DELETE /transactions/{transactionId}
 */
async function deleteTransaction(event, user, transactionId) {
    logger.info('Deleting transaction', {
        userId: user.userId,
        familyId: user.familyId,
        transactionId
    });

    const familyId = user.familyId || `family_${user.userId}`;

    // Check if transaction exists
    const existingTransaction = await dynamoHelpers.getItem(
        `FAMILY#${familyId}`,
        `TRANSACTION#${transactionId}`
    );

    if (!existingTransaction) {
        return errorResponse.notFound(`Transaction not found with ID ${transactionId}`);
    }

    // Mark transaction as deleted (soft delete for audit trail)
    await dynamoHelpers.updateItem(
        `FAMILY#${familyId}`,
        `TRANSACTION#${transactionId}`,
        {
            isDeleted: true,
            deletedAt: new Date().toISOString(),
            deletedBy: user.userId
        }
    );

    // Update budget calculations (subtract the transaction impact)
    await updateBudgetCalculations(
        familyId,
        existingTransaction.budgetMonth,
        existingTransaction.categoryId,
        existingTransaction.type,
        existingTransaction.amount,
        'subtract'
    );

    logger.info('Transaction deleted successfully', {
        transactionId,
        familyId
    });

    return successResponse(null, 'Transaction deleted successfully');
}

// Budget calculation functions moved to budget-service.js for better separation of concerns
