/**
 * BudgetBuddy Transaction Management Lambda Function
 * 
 * Handles all transaction-related operations including CRUD operations for
 * income and expense transactions, automatic budget updates, and transaction
 * filtering/searching. Ensures budget integrity with real-time calculations.
 * 
 * Supported operations:
 * - Transaction creation with automatic budget updates
 * - Transaction editing and deletion with budget recalculation
 * - Transaction listing with pagination and filtering
 * - Transaction search functionality
 * - Monthly transaction summaries
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
 * Main Lambda handler function
 * Routes transaction-related requests to appropriate handler functions
 * 
 * @param {Object} event - API Gateway event object
 * @param {Object} context - Lambda context object
 * @returns {Promise<Object>} HTTP response object
 */
exports.handler = async (event, context) => {
    const correlationId = context.awsRequestId;
    logger.info('Transaction request received', {
        correlationId,
        httpMethod: event.httpMethod,
        path: event.path,
    });

    try {
        const {
            httpMethod,
            path,
            pathParameters
        } = event;

        // Route requests to appropriate handlers
        switch (`${httpMethod} ${path}`) {
            case 'GET /health':
            case 'GET /transactions/health':
                return successResponse({
                    status: 'healthy',
                    service: 'transactions',
                    timestamp: new Date().toISOString(),
                    version: '1.0.0'
                });

            case 'GET /transactions':
                return await handleGetTransactions(event, correlationId);

            case 'POST /transactions':
                return await handleCreateTransaction(event, correlationId);

            case 'PUT /transactions':
                return await handleUpdateTransaction(event, correlationId);

            case 'DELETE /transactions':
                return await handleDeleteTransaction(event, correlationId);

            default:
                // Handle parameterized routes
                if (path.startsWith('/transactions/') && httpMethod === 'GET') {
                    if (path.includes('/category/')) {
                        return await handleGetTransactionsByCategory(event, correlationId);
                    } else if (path.includes('/month/')) {
                        return await handleGetTransactionsByMonth(event, correlationId);
                    } else if (path.includes('/search')) {
                        return await handleSearchTransactions(event, correlationId);
                    } else {
                        return await handleGetTransaction(event, correlationId);
                    }
                }

                logger.warn('Unsupported route', {
                    correlationId,
                    httpMethod,
                    path
                });
                return errorResponse.notFound('Route not found');
        }
    } catch (error) {
        logger.error('Unhandled error in transaction handler', error, {
            correlationId
        });
        return errorResponse.internalError('An unexpected error occurred');
    }
};

/**
 * Handle get transactions with filtering and pagination
 * Returns transactions for the user's family with optional filters
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Transactions response
 */
async function handleGetTransactions(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const queryParams = event.queryStringParameters || {};

        // Extract filter parameters
        const {
            categoryId,
            type,
            startDate,
            endDate,
            createdBy,
            limit = '20',
            offset = '0'
        } = queryParams;

        logger.info('Get transactions request', {
            correlationId,
            userId: user.userId,
            familyId: user.familyId,
            filters: {
                categoryId,
                type,
                startDate,
                endDate,
                createdBy
            }
        });

        // Build query parameters for DynamoDB
        const familyId = user.familyId || user.userId;
        let queryOptions = {
            ScanIndexForward: false, // Most recent first
            Limit: Math.min(parseInt(limit), 100), // Cap at 100
        };

        // Query transactions for the family
        const transactions = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
            ...queryOptions,
            FilterExpression: buildTransactionFilter({
                categoryId,
                type,
                startDate,
                endDate,
                createdBy
            }),
            ExpressionAttributeValues: buildFilterValues({
                categoryId,
                type,
                startDate,
                endDate,
                createdBy
            }),
        });

        // Apply client-side pagination (offset)
        const startIndex = parseInt(offset);
        const paginatedTransactions = transactions.slice(startIndex, startIndex + parseInt(limit));

        const response = {
            transactions: paginatedTransactions,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: transactions.length,
                hasMore: startIndex + parseInt(limit) < transactions.length,
            },
        };

        return successResponse(response, 'Transactions retrieved successfully');

    } catch (error) {
        logger.error('Get transactions error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to retrieve transactions');
    }
}

/**
 * Handle create transaction
 * Creates a new transaction and updates budget automatically
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Create transaction response
 */
async function handleCreateTransaction(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const body = parseRequestBody(event.body);
        const {
            amount,
            type,
            categoryId,
            description,
            date,
            merchantName
        } = body;

        // Validate required fields
        if (!amount || !type || !categoryId || !description || !date) {
            return errorResponse.badRequest('Amount, type, category ID, description, and date are required');
        }

        if (!['income', 'expense'].includes(type)) {
            return errorResponse.badRequest('Type must be either "income" or "expense"');
        }

        if (amount <= 0) {
            return errorResponse.badRequest('Amount must be positive');
        }

        logger.info('Create transaction request', {
            correlationId,
            userId: user.userId,
            type,
            amount,
            categoryId
        });

        // Generate transaction ID and prepare transaction object
        const transactionId = generateId.transaction();
        const familyId = user.familyId || user.userId;
        const budgetMonth = date.substring(0, 7); // Extract YYYY-MM from date
        const timestamp = new Date().toISOString();

        const transaction = {
            PK: `FAMILY#${familyId}`,
            SK: `TXN#${date}#${timestamp}#${transactionId}`,
            GSI2PK: `FAMILY#${familyId}#CATEGORY#${categoryId}`,
            GSI2SK: `DATE#${date}`,
            GSI3PK: `BUDGET#${budgetMonth}`,
            GSI3SK: `CATEGORY#${categoryId}`,
            entityType: 'TRANSACTION',
            transactionId,
            familyId,
            budgetMonth,
            amount: Number(amount),
            type,
            categoryId,
            categoryName: 'Unknown', // TODO: Get from category lookup
            description,
            date,
            merchantName: merchantName || null,
            createdBy: user.userId,
            createdByName: `${user.firstName} ${user.lastName}`,
        };

        // Save transaction to DynamoDB
        await dynamoHelpers.putItem(transaction);

        // TODO: Update budget category spent amounts
        // This would involve updating the category's spentAmount and remainingAmount

        logger.info('Transaction created successfully', {
            correlationId,
            transactionId,
            amount,
            type
        });

        return successResponse(transaction, 'Transaction created successfully');

    } catch (error) {
        logger.error('Create transaction error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to create transaction');
    }
}

/**
 * Handle update transaction
 * Updates an existing transaction and recalculates budget
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Update transaction response
 */
async function handleUpdateTransaction(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const body = parseRequestBody(event.body);
        const {
            transactionId,
            amount,
            description,
            categoryId,
            merchantName
        } = body;

        if (!transactionId) {
            return errorResponse.badRequest('Transaction ID is required');
        }

        logger.info('Update transaction request', {
            correlationId,
            userId: user.userId,
            transactionId
        });

        // TODO: Implement transaction update logic
        // This would involve:
        // 1. Finding the transaction by ID
        // 2. Updating the transaction
        // 3. Recalculating budget amounts if amount or category changed

        return successResponse({
            transactionId
        }, 'Transaction update functionality coming soon');

    } catch (error) {
        logger.error('Update transaction error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to update transaction');
    }
}

/**
 * Handle delete transaction
 * Deletes a transaction and updates budget automatically
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Delete transaction response
 */
async function handleDeleteTransaction(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const {
            transactionId
        } = event.queryStringParameters || {};

        if (!transactionId) {
            return errorResponse.badRequest('Transaction ID is required');
        }

        logger.info('Delete transaction request', {
            correlationId,
            userId: user.userId,
            transactionId
        });

        // TODO: Implement transaction deletion logic
        // This would involve:
        // 1. Finding the transaction by ID
        // 2. Removing it from DynamoDB
        // 3. Updating budget amounts

        return successResponse({
            transactionId
        }, 'Transaction deletion functionality coming soon');

    } catch (error) {
        logger.error('Delete transaction error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to delete transaction');
    }
}

/**
 * Handle get single transaction
 * Returns details for a specific transaction
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Transaction response
 */
async function handleGetTransaction(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const transactionId = event.pathParameters ? .transactionId;

        if (!transactionId) {
            return errorResponse.badRequest('Transaction ID is required');
        }

        logger.info('Get transaction request', {
            correlationId,
            userId: user.userId,
            transactionId
        });

        // TODO: Implement single transaction lookup
        // This would require finding the transaction by ID

        return successResponse({
            transactionId
        }, 'Single transaction lookup functionality coming soon');

    } catch (error) {
        logger.error('Get transaction error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to retrieve transaction');
    }
}

/**
 * Handle get transactions by category
 * Returns transactions for a specific category
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Transactions by category response
 */
async function handleGetTransactionsByCategory(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const categoryId = event.pathParameters ? .categoryId;
        const {
            limit = '20'
        } = event.queryStringParameters || {};

        if (!categoryId) {
            return errorResponse.badRequest('Category ID is required');
        }

        logger.info('Get transactions by category request', {
            correlationId,
            userId: user.userId,
            categoryId
        });

        const familyId = user.familyId || user.userId;

        // Query transactions by category using GSI2
        const transactions = await dynamoHelpers.queryByPK(`FAMILY#${familyId}#CATEGORY#${categoryId}`, {
            IndexName: 'GSI2',
            ScanIndexForward: false,
            Limit: Math.min(parseInt(limit), 100),
        });

        return successResponse({
            transactions,
            categoryId
        }, 'Transactions by category retrieved successfully');

    } catch (error) {
        logger.error('Get transactions by category error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to retrieve transactions by category');
    }
}

/**
 * Handle get transactions by month
 * Returns all transactions for a specific month
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Transactions by month response
 */
async function handleGetTransactionsByMonth(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const month = event.pathParameters ? .month;

        if (!month || !isValidMonthFormat(month)) {
            return errorResponse.badRequest('Valid month parameter required (YYYY-MM format)');
        }

        logger.info('Get transactions by month request', {
            correlationId,
            userId: user.userId,
            month
        });

        // Query transactions by month using GSI3
        const transactions = await dynamoHelpers.queryByPK(`BUDGET#${month}`, {
            IndexName: 'GSI3',
            ScanIndexForward: false,
        });

        // Calculate month summary
        const summary = calculateMonthSummary(transactions);

        return successResponse({
            transactions,
            month,
            summary
        }, 'Transactions by month retrieved successfully');

    } catch (error) {
        logger.error('Get transactions by month error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to retrieve transactions by month');
    }
}

/**
 * Handle search transactions
 * Searches transactions by description or merchant name
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Search results response
 */
async function handleSearchTransactions(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const {
            q: query,
            limit = '20'
        } = event.queryStringParameters || {};

        if (!query || query.trim().length < 2) {
            return errorResponse.badRequest('Search query must be at least 2 characters');
        }

        logger.info('Search transactions request', {
            correlationId,
            userId: user.userId,
            query
        });

        const familyId = user.familyId || user.userId;

        // Get all transactions for the family (this could be optimized with better indexing)
        const allTransactions = await dynamoHelpers.queryByPK(`FAMILY#${familyId}`, {
            FilterExpression: 'entityType = :entityType',
            ExpressionAttributeValues: {
                ':entityType': 'TRANSACTION',
            },
        });

        // Filter transactions by search query (client-side filtering)
        const searchResults = allTransactions.filter(transaction => {
            const searchText = `${transaction.description} ${transaction.merchantName || ''}`.toLowerCase();
            return searchText.includes(query.toLowerCase());
        });

        // Limit results
        const limitedResults = searchResults.slice(0, parseInt(limit));

        return successResponse({
            transactions: limitedResults,
            query,
            totalResults: searchResults.length
        }, 'Search completed successfully');

    } catch (error) {
        logger.error('Search transactions error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to search transactions');
    }
}

/**
 * Helper Functions
 */

/**
 * Validate month format (YYYY-MM)
 * @param {string} month - Month string to validate
 * @returns {boolean} True if valid format
 */
function isValidMonthFormat(month) {
    return /^\d{4}-\d{2}$/.test(month);
}

/**
 * Build DynamoDB filter expression for transaction queries
 * @param {Object} filters - Filter parameters
 * @returns {string} Filter expression
 */
function buildTransactionFilter(filters) {
    const conditions = ['entityType = :entityType'];

    if (filters.categoryId) conditions.push('categoryId = :categoryId');
    if (filters.type) conditions.push('#type = :type');
    if (filters.startDate) conditions.push('#date >= :startDate');
    if (filters.endDate) conditions.push('#date <= :endDate');
    if (filters.createdBy) conditions.push('createdBy = :createdBy');

    return conditions.join(' AND ');
}

/**
 * Build expression attribute values for filters
 * @param {Object} filters - Filter parameters
 * @returns {Object} Expression attribute values
 */
function buildFilterValues(filters) {
    const values = {
        ':entityType': 'TRANSACTION',
    };

    if (filters.categoryId) values[':categoryId'] = filters.categoryId;
    if (filters.type) values[':type'] = filters.type;
    if (filters.startDate) values[':startDate'] = filters.startDate;
    if (filters.endDate) values[':endDate'] = filters.endDate;
    if (filters.createdBy) values[':createdBy'] = filters.createdBy;

    return values;
}

/**
 * Calculate summary statistics for a month's transactions
 * @param {Array} transactions - Array of transactions
 * @returns {Object} Summary statistics
 */
function calculateMonthSummary(transactions) {
    const summary = {
        totalIncome: 0,
        totalExpenses: 0,
        netAmount: 0,
        transactionCount: transactions.length,
        categoryBreakdown: {},
    };

    transactions.forEach(transaction => {
        if (transaction.type === 'income') {
            summary.totalIncome += transaction.amount;
        } else if (transaction.type === 'expense') {
            summary.totalExpenses += transaction.amount;
        }

        // Category breakdown
        const categoryName = transaction.categoryName || 'Unknown';
        if (!summary.categoryBreakdown[categoryName]) {
            summary.categoryBreakdown[categoryName] = {
                amount: 0,
                count: 0,
                type: transaction.type,
            };
        }
        summary.categoryBreakdown[categoryName].amount += transaction.amount;
        summary.categoryBreakdown[categoryName].count += 1;
    });

    summary.netAmount = summary.totalIncome - summary.totalExpenses;

    return summary;
}