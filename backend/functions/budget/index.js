/**
 * BudgetBuddy Budget Management Lambda Function
 * 
 * Handles all budget-related operations including CRUD operations for budgets,
 * categories, and zero-based budget calculations. Integrates with DynamoDB
 * for data persistence and ensures budget integrity.
 * 
 * Supported operations:
 * - Budget creation and management
 * - Category CRUD operations
 * - Zero-based budget calculations
 * - Budget group management (Income, Savings, Expenses)
 * - Monthly budget retrieval and updates
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
 * Routes budget-related requests to appropriate handler functions
 * 
 * @param {Object} event - API Gateway event object
 * @param {Object} context - Lambda context object
 * @returns {Promise<Object>} HTTP response object
 */
exports.handler = async (event, context) => {
    const correlationId = context.awsRequestId;
    logger.info('Budget request received', {
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
            case 'GET /budget':
                return await handleGetCurrentBudget(event, correlationId);

            case 'POST /budget':
                return await handleCreateBudget(event, correlationId);

            case 'PUT /budget':
                return await handleUpdateBudget(event, correlationId);

            case 'GET /budget/categories':
                return await handleGetCategories(event, correlationId);

            case 'POST /budget/categories':
                return await handleCreateCategory(event, correlationId);

            case 'PUT /budget/categories':
                return await handleUpdateCategory(event, correlationId);

            case 'DELETE /budget/categories':
                return await handleDeleteCategory(event, correlationId);

            default:
                // Handle parameterized routes
                if (path.startsWith('/budget/') && httpMethod === 'GET') {
                    return await handleGetBudgetByMonth(event, correlationId);
                }

                logger.warn('Unsupported route', {
                    correlationId,
                    httpMethod,
                    path
                });
                return errorResponse.notFound('Route not found');
        }
    } catch (error) {
        logger.error('Unhandled error in budget handler', error, {
            correlationId
        });
        return errorResponse.internalError('An unexpected error occurred');
    }
};

/**
 * Handle get current budget
 * Returns the current month's budget for the user's family
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Current budget response
 */
async function handleGetCurrentBudget(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const currentMonth = getCurrentMonth();

        logger.info('Get current budget request', {
            correlationId,
            userId: user.userId,
            familyId: user.familyId,
            month: currentMonth
        });

        // Get budget for current month
        const budget = await getBudgetByMonth(user.familyId || user.userId, currentMonth);

        if (!budget) {
            // Return empty budget structure if none exists
            const emptyBudget = createEmptyBudget(user.familyId || user.userId, currentMonth);
            return successResponse(emptyBudget, 'No budget found for current month');
        }

        // Calculate budget totals and remaining amounts
        const calculatedBudget = calculateBudgetTotals(budget);

        return successResponse(calculatedBudget, 'Current budget retrieved successfully');

    } catch (error) {
        logger.error('Get current budget error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to retrieve current budget');
    }
}

/**
 * Handle get budget by month
 * Returns budget for a specific month
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Budget response
 */
async function handleGetBudgetByMonth(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const month = event.pathParameters ? .month;

        if (!month || !isValidMonthFormat(month)) {
            return errorResponse.badRequest('Valid month parameter required (YYYY-MM format)');
        }

        logger.info('Get budget by month request', {
            correlationId,
            userId: user.userId,
            familyId: user.familyId,
            month
        });

        const budget = await getBudgetByMonth(user.familyId || user.userId, month);

        if (!budget) {
            return errorResponse.notFound('Budget not found for specified month');
        }

        const calculatedBudget = calculateBudgetTotals(budget);

        return successResponse(calculatedBudget, 'Budget retrieved successfully');

    } catch (error) {
        logger.error('Get budget by month error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to retrieve budget');
    }
}

/**
 * Handle create budget
 * Creates a new budget for the specified month
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Create budget response
 */
async function handleCreateBudget(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const body = parseRequestBody(event.body);
        const {
            month,
            groups,
            isAIGenerated = false
        } = body;

        if (!month || !isValidMonthFormat(month)) {
            return errorResponse.badRequest('Valid month required (YYYY-MM format)');
        }

        if (!groups || !groups.income || !groups.savings || !groups.expenses) {
            return errorResponse.badRequest('Budget groups (income, savings, expenses) are required');
        }

        logger.info('Create budget request', {
            correlationId,
            userId: user.userId,
            familyId: user.familyId,
            month,
            isAIGenerated
        });

        // Check if budget already exists for this month
        const existingBudget = await getBudgetByMonth(user.familyId || user.userId, month);
        if (existingBudget) {
            return errorResponse.conflict('Budget already exists for this month');
        }

        // Generate budget ID and create budget object
        const budgetId = generateId.budget();
        const familyId = user.familyId || user.userId;

        const budget = {
            PK: `FAMILY#${familyId}`,
            SK: `BUDGET#${month}`,
            GSI2PK: `BUDGET#${month}`,
            GSI2SK: `FAMILY#${familyId}`,
            entityType: 'BUDGET',
            budgetId,
            familyId,
            month,
            groups,
            isAIGenerated,
            totalIncome: 0,
            totalSavings: 0,
            totalExpenses: 0,
            remainingBalance: 0,
        };

        // Calculate totals
        const calculatedBudget = calculateBudgetTotals(budget);

        // Save to DynamoDB
        await dynamoHelpers.putItem(calculatedBudget);

        logger.info('Budget created successfully', {
            correlationId,
            budgetId,
            month
        });

        return successResponse(calculatedBudget, 'Budget created successfully');

    } catch (error) {
        logger.error('Create budget error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to create budget');
    }
}

/**
 * Handle update budget
 * Updates an existing budget
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Update budget response
 */
async function handleUpdateBudget(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const body = parseRequestBody(event.body);
        const {
            budgetId,
            groups
        } = body;

        if (!budgetId) {
            return errorResponse.badRequest('Budget ID is required');
        }

        logger.info('Update budget request', {
            correlationId,
            userId: user.userId,
            budgetId
        });

        // Get existing budget
        const existingBudget = await dynamoHelpers.getItem(`FAMILY#${user.familyId || user.userId}`, `BUDGET#${budgetId}`);
        if (!existingBudget) {
            return errorResponse.notFound('Budget not found');
        }

        // Prepare updates
        const updates = {};
        if (groups) {
            updates.groups = groups;
        }

        // Update budget
        const updatedBudget = await dynamoHelpers.updateItem(
            `FAMILY#${user.familyId || user.userId}`,
            `BUDGET#${existingBudget.month}`,
            updates
        );

        // Recalculate totals
        const calculatedBudget = calculateBudgetTotals(updatedBudget);

        // Update with new totals
        await dynamoHelpers.updateItem(
            `FAMILY#${user.familyId || user.userId}`,
            `BUDGET#${existingBudget.month}`, {
                totalIncome: calculatedBudget.totalIncome,
                totalSavings: calculatedBudget.totalSavings,
                totalExpenses: calculatedBudget.totalExpenses,
                remainingBalance: calculatedBudget.remainingBalance,
            }
        );

        logger.info('Budget updated successfully', {
            correlationId,
            budgetId
        });

        return successResponse(calculatedBudget, 'Budget updated successfully');

    } catch (error) {
        logger.error('Update budget error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to update budget');
    }
}

/**
 * Handle get categories
 * Returns all categories for the user's family
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Categories response
 */
async function handleGetCategories(event, correlationId) {
    try {
        const user = getUserFromEvent(event);

        logger.info('Get categories request', {
            correlationId,
            userId: user.userId
        });

        // Query categories for the family
        const categories = await dynamoHelpers.queryByPK(`FAMILY#${user.familyId || user.userId}`, {
            FilterExpression: 'entityType = :entityType',
            ExpressionAttributeValues: {
                ':entityType': 'CATEGORY',
            },
        });

        // Group categories by type
        const groupedCategories = {
            income: categories.filter(cat => cat.groupType === 'income'),
            savings: categories.filter(cat => cat.groupType === 'saving'),
            expenses: categories.filter(cat => cat.groupType === 'expense'),
        };

        return successResponse(groupedCategories, 'Categories retrieved successfully');

    } catch (error) {
        logger.error('Get categories error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to retrieve categories');
    }
}

/**
 * Handle create category
 * Creates a new budget category
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Create category response
 */
async function handleCreateCategory(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const body = parseRequestBody(event.body);
        const {
            categoryName,
            parentGroup,
            groupType,
            plannedAmount,
            icon,
            colorCode
        } = body;

        if (!categoryName || !parentGroup || !groupType || plannedAmount === undefined) {
            return errorResponse.badRequest('Category name, parent group, group type, and planned amount are required');
        }

        logger.info('Create category request', {
            correlationId,
            userId: user.userId,
            categoryName
        });

        const categoryId = generateId.category();
        const familyId = user.familyId || user.userId;

        const category = {
            PK: `FAMILY#${familyId}`,
            SK: `CATEGORY#${parentGroup}#${categoryName}`,
            GSI1PK: `FAMILY#${familyId}#GROUP#${parentGroup}`,
            GSI1SK: `ORDER#${String(Date.now()).padStart(13, '0')}`, // Simple ordering
            entityType: 'CATEGORY',
            categoryId,
            categoryName,
            parentGroup,
            groupType,
            categoryOrder: 0,
            icon: icon || '💰',
            colorCode: colorCode || '#4CAF50',
            plannedAmount: Number(plannedAmount),
            spentAmount: 0,
            remainingAmount: Number(plannedAmount),
            isCustom: true,
            isActive: true,
        };

        await dynamoHelpers.putItem(category);

        logger.info('Category created successfully', {
            correlationId,
            categoryId
        });

        return successResponse(category, 'Category created successfully');

    } catch (error) {
        logger.error('Create category error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to create category');
    }
}

/**
 * Handle update category
 * Updates an existing category
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Update category response
 */
async function handleUpdateCategory(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const body = parseRequestBody(event.body);
        const {
            categoryId,
            plannedAmount,
            categoryName,
            icon,
            colorCode
        } = body;

        if (!categoryId) {
            return errorResponse.badRequest('Category ID is required');
        }

        logger.info('Update category request', {
            correlationId,
            userId: user.userId,
            categoryId
        });

        // TODO: Implement category update logic
        // This would require finding the category by ID and updating it

        return successResponse({
            categoryId
        }, 'Category update functionality coming soon');

    } catch (error) {
        logger.error('Update category error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to update category');
    }
}

/**
 * Handle delete category
 * Deletes a category (marks as inactive)
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Delete category response
 */
async function handleDeleteCategory(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const {
            categoryId
        } = event.queryStringParameters || {};

        if (!categoryId) {
            return errorResponse.badRequest('Category ID is required');
        }

        logger.info('Delete category request', {
            correlationId,
            userId: user.userId,
            categoryId
        });

        // TODO: Implement category deletion logic
        // This would mark the category as inactive rather than actually deleting it

        return successResponse({
            categoryId
        }, 'Category deletion functionality coming soon');

    } catch (error) {
        logger.error('Delete category error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to delete category');
    }
}

/**
 * Helper Functions
 */

/**
 * Get current month in YYYY-MM format
 * @returns {string} Current month
 */
function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Validate month format (YYYY-MM)
 * @param {string} month - Month string to validate
 * @returns {boolean} True if valid format
 */
function isValidMonthFormat(month) {
    return /^\d{4}-\d{2}$/.test(month);
}

/**
 * Get budget by month from DynamoDB
 * @param {string} familyId - Family ID
 * @param {string} month - Month in YYYY-MM format
 * @returns {Promise<Object|null>} Budget object or null
 */
async function getBudgetByMonth(familyId, month) {
    return await dynamoHelpers.getItem(`FAMILY#${familyId}`, `BUDGET#${month}`);
}

/**
 * Create empty budget structure
 * @param {string} familyId - Family ID
 * @param {string} month - Month in YYYY-MM format
 * @returns {Object} Empty budget structure
 */
function createEmptyBudget(familyId, month) {
    return {
        budgetId: null,
        familyId,
        month,
        totalIncome: 0,
        totalSavings: 0,
        totalExpenses: 0,
        remainingBalance: 0,
        groups: {
            income: [],
            savings: [],
            expenses: [],
        },
        isAIGenerated: false,
    };
}

/**
 * Calculate budget totals and remaining amounts
 * @param {Object} budget - Budget object
 * @returns {Object} Budget with calculated totals
 */
function calculateBudgetTotals(budget) {
    const groups = budget.groups || {
        income: [],
        savings: [],
        expenses: []
    };

    // Calculate totals for each group
    const totalIncome = calculateGroupTotal(groups.income || []);
    const totalSavings = calculateGroupTotal(groups.savings || []);
    const totalExpenses = calculateGroupTotal(groups.expenses || []);

    // Zero-based budgeting: Income - Savings - Expenses = 0 (ideally)
    const remainingBalance = totalIncome - totalSavings - totalExpenses;

    return {
        ...budget,
        totalIncome,
        totalSavings,
        totalExpenses,
        remainingBalance,
    };
}

/**
 * Calculate total for a budget group
 * @param {Array} categories - Array of categories in the group
 * @returns {number} Total planned amount for the group
 */
function calculateGroupTotal(categories) {
    return categories.reduce((total, category) => {
        return total + (category.plannedAmount || 0);
    }, 0);
}