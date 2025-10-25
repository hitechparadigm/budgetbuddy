/**
 * BudgetBuddy Authentication Lambda Function
 * 
 * Handles user authentication, registration, profile management, and password reset
 * functionality. Integrates with Amazon Cognito for secure user management and
 * DynamoDB for storing additional user profile information.
 */

/**
 * Main Lambda handler function
 * Routes requests based on HTTP method and path to appropriate handler functions
 * 
 * @param {Object} event - API Gateway event object
 * @param {Object} context - Lambda context object
 * @returns {Promise<Object>} HTTP response object
 */
exports.handler = async (event, context) => {
    console.log('Authentication request received', {
        httpMethod: event.httpMethod,
        path: event.path,
        headers: event.headers
    });

    try {
        const {
            httpMethod,
            path
        } = event;

        // Handle health check endpoints
        if ((httpMethod === 'GET' && path === '/health') ||
            (httpMethod === 'GET' && path === '/auth/health')) {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Correlation-ID'
                },
                body: JSON.stringify({
                    status: 'healthy',
                    service: 'auth',
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                    environment: process.env.NODE_ENV || 'development'
                })
            };
        }

        // Handle other routes (placeholder for now)
        return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Route not found',
                path: path,
                method: httpMethod
            })
        };

    } catch (error) {
        console.error('Unhandled error in auth handler:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};