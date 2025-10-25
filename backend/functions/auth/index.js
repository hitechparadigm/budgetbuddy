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
 * @param {Object} _context - Lambda context object (unused)
 * @returns {Promise<Object>} HTTP response object
 */
exports.handler = async (event, _context) => {
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

        // Handle health check endpoints (both root and service-specific)
        if (httpMethod === 'GET' && (path === '/health' || path === '/auth/health')) {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                body: JSON.stringify({
                    status: 'healthy',
                    service: 'auth',
                    timestamp: new Date().toISOString(),
                    version: '1.0.0'
                })
            };
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

        // Default response for unhandled routes
        return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Not Found',
                message: `Route ${httpMethod} ${path} not found`,
                service: 'auth'
            })
        };

    } catch (error) {
        console.error('Authentication function error:', error);

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Internal Server Error',
                message: 'An error occurred processing your request',
                service: 'auth'
            })
        };
    }
};