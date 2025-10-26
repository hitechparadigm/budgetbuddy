/**
 * Common utilities for BudgetBuddy Lambda functions
 *
 * This file contains shared utility functions used across all Lambda handlers
 * to ensure consistency and reduce code duplication. Includes response formatting,
 * error handling, validation, and AWS service helpers.
 */

const {
    DynamoDBClient
} = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    QueryCommand,
    UpdateCommand,
    DeleteCommand
} = require('@aws-sdk/lib-dynamodb');
const {
    v4: uuidv4
} = require('uuid');

/**
 * Initialize DynamoDB Document Client with optimized configuration
 * Uses singleton pattern to reuse connections across Lambda invocations
 */
let dynamoClient;
const getDynamoClient = () => {
    if (!dynamoClient) {
        const client = new DynamoDBClient({
            region: process.env.AWS_REGION || 'us-east-1',
            // Optimize for Lambda environment
            maxAttempts: 3,
            requestTimeout: 5000,
        });

        dynamoClient = DynamoDBDocumentClient.from(client, {
            marshallOptions: {
                convertEmptyValues: false,
                removeUndefinedValues: true,
                convertClassInstanceToMap: false,
            },
            unmarshallOptions: {
                wrapNumbers: false,
            },
        });
    }
    return dynamoClient;
};

/**
 * Standard API response formatter
 * Ensures consistent response structure across all Lambda functions
 *
 * @param {number} statusCode - HTTP status code
 * @param {any} data - Response data (optional)
 * @param {string} message - Success/error message (optional)
 * @param {Object} error - Error details (optional)
 * @returns {Object} Formatted API Gateway response
 */
const createResponse = (statusCode, data = null, message = null, error = null) => {
    const response = {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*', // Configure properly for production
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
        body: JSON.stringify({
            success: statusCode >= 200 && statusCode < 300,
            data,
            message,
            error,
            timestamp: new Date().toISOString(),
        }),
    };

    return response;
};

/**
 * Success response helper
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @returns {Object} Success response
 */
const successResponse = (data, message = 'Success') => {
    return createResponse(200, data, message);
};

/**
 * Error response helpers for common HTTP status codes
 */
const errorResponse = {
    badRequest: (message = 'Bad Request', details = null) =>
        createResponse(400, null, message, {
            code: 'BAD_REQUEST',
            details
        }),

    unauthorized: (message = 'Unauthorized') =>
        createResponse(401, null, message, {
            code: 'UNAUTHORIZED'
        }),

    forbidden: (message = 'Forbidden') =>
        createResponse(403, null, message, {
            code: 'FORBIDDEN'
        }),

    notFound: (message = 'Not Found') =>
        createResponse(404, null, message, {
            code: 'NOT_FOUND'
        }),

    conflict: (message = 'Conflict') =>
        createResponse(409, null, message, {
            code: 'CONFLICT'
        }),

    internalError: (message = 'Internal Server Error', details = null) =>
        createResponse(500, null, message, {
            code: 'INTERNAL_ERROR',
            details
        }),
};

/**
 * Parse and validate JSON request body
 * @param {string} body - Raw request body
 * @returns {Object} Parsed JSON object
 * @throws {Error} If JSON is invalid
 */
const parseRequestBody = (body) => {
    if (!body) {
        throw new Error('Request body is required');
    }

    try {
        return JSON.parse(body);
    } catch (error) {
        throw new Error('Invalid JSON in request body');
    }
};

/**
 * Extract user information from Cognito JWT token
 * @param {Object} event - API Gateway event
 * @returns {Object} User information from token
 */
const getUserFromEvent = (event) => {
    const claims = event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims;

    if (!claims) {
        throw new Error('No user claims found in request');
    }

    return {
        userId: claims.sub,
        email: claims.email,
        firstName: claims.given_name,
        lastName: claims.family_name,
        familyId: claims['custom:familyId'],
        role: claims['custom:familyRole'],
        subscriptionTier: claims['custom:subscriptionTier'],
    };
};

/**
 * Generate unique identifiers with prefixes for different entity types
 */
const generateId = {
    user: () => `user_${uuidv4()}`,
    family: () => `family_${uuidv4()}`,
    budget: () => `budget_${uuidv4()}`,
    transaction: () => `txn_${uuidv4()}`,
    category: () => `cat_${uuidv4()}`,
    invitation: () => `inv_${uuidv4()}`,
};

/**
 * DynamoDB helper functions for common operations
 */
const dynamoHelpers = {
    /**
     * Get item by primary key
     * @param {string} pk - Partition key
     * @param {string} sk - Sort key
     * @returns {Promise<Object|null>} Item or null if not found
     */
    async getItem(pk, sk) {
        const client = getDynamoClient();
        const command = new GetCommand({
            TableName: process.env.TABLE_NAME,
            Key: {
                PK: pk,
                SK: sk
            },
        });

        const result = await client.send(command);
        return result.Item || null;
    },

    /**
     * Put item into DynamoDB
     * @param {Object} item - Item to store
     * @returns {Promise<void>}
     */
    async putItem(item) {
        const client = getDynamoClient();
        const command = new PutCommand({
            TableName: process.env.TABLE_NAME,
            Item: {
                ...item,
                createdAt: item.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        });

        await client.send(command);
    },

    /**
     * Query items by partition key
     * @param {string} pk - Partition key
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of items
     */
    async queryByPK(pk, options = {}) {
        const client = getDynamoClient();
        const command = new QueryCommand({
            TableName: process.env.TABLE_NAME,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: {
                ':pk': pk,
            },
            ...options,
        });

        const result = await client.send(command);
        return result.Items || [];
    },

    /**
     * Update item with optimistic locking
     * @param {string} pk - Partition key
     * @param {string} sk - Sort key
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated item
     */
    async updateItem(pk, sk, updates) {
        const client = getDynamoClient();

        // Build update expression dynamically
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        Object.entries(updates).forEach(([key, value], index) => {
            const nameKey = `#attr${index}`;
            const valueKey = `:val${index}`;

            updateExpressions.push(`${nameKey} = ${valueKey}`);
            expressionAttributeNames[nameKey] = key;
            expressionAttributeValues[valueKey] = value;
        });

        // Always update the updatedAt timestamp
        updateExpressions.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();

        const command = new UpdateCommand({
            TableName: process.env.TABLE_NAME,
            Key: {
                PK: pk,
                SK: sk
            },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW',
        });

        const result = await client.send(command);
        return result.Attributes;
    },
};

/**
 * Logging helper with structured logging for CloudWatch
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 */
const logger = {
    info: (message, meta = {}) => {
        console.log(JSON.stringify({
            level: 'info',
            message,
            timestamp: new Date().toISOString(),
            ...meta,
        }));
    },

    warn: (message, meta = {}) => {
        console.warn(JSON.stringify({
            level: 'warn',
            message,
            timestamp: new Date().toISOString(),
            ...meta,
        }));
    },

    error: (message, error = null, meta = {}) => {
        console.error(JSON.stringify({
            level: 'error',
            message,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
            } : null,
            timestamp: new Date().toISOString(),
            ...meta,
        }));
    },
};

module.exports = {
    getDynamoClient,
    createResponse,
    successResponse,
    errorResponse,
    parseRequestBody,
    getUserFromEvent,
    generateId,
    dynamoHelpers,
    logger,
};