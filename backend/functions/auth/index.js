/**
 * BudgetBuddy Authentication Lambda Function - Minimal Version for Debugging
 */

// Environment variables
// const USER_POOL_ID = process.env.USER_POOL_ID; // TODO: Will be used for additional validation
// const CLIENT_ID = process.env.CLIENT_ID; // TODO: Will be used for Cognito registration
// const TABLE_NAME = process.env.TABLE_NAME; // TODO: Will be used for user profile storage

/**
 * Main Lambda handler function
 */
exports.handler = async (event, _context) => {
    console.log('=== AUTH HANDLER START ===');
    console.log('Event received:', JSON.stringify(event, null, 2));

    try {
        const httpMethod = event.httpMethod;
        const path = event.path;

        console.log('Processing request:', httpMethod, path);

        // Handle health check endpoints
        if (httpMethod === 'GET' && (path === '/health' || path === '/auth/health')) {
            console.log('Health check requested');
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
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
            console.log('CORS preflight requested');
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                body: ''
            };
        }

        // Handle registration endpoint - ULTRA SIMPLE TEST
        if (httpMethod === 'POST' && path === '/auth/register') {
            console.log('Registration endpoint hit - returning immediate success');

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    message: 'Registration endpoint working - ultra simple test',
                    method: httpMethod,
                    path,
                    bodyReceived: event.body ? 'yes' : 'no'
                })
            };
        }

        // For other POST requests, return a simple success response
        if (httpMethod === 'POST') {
            console.log('Other POST request received for path:', path);
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    message: 'POST endpoint working',
                    path,
                    note: 'This endpoint is not yet implemented'
                })
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
                service: 'auth',
                errorDetails: error.message
            })
        };
    }
};