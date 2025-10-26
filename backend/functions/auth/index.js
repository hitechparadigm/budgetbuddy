/**
 * BudgetBuddy Authentication Lambda Function - Minimal Version for Debugging
 */

// Environment variables
const USER_POOL_ID = process.env.USER_POOL_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const TABLE_NAME = process.env.TABLE_NAME;

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

        // For POST requests, return a simple success response for now
        if (httpMethod === 'POST') {
            console.log('POST request received for path:', path);
            console.log('Request body:', event.body);

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    message: 'POST endpoint working',
                    path: path,
                    receivedBody: event.body,
                    environment: {
                        USER_POOL_ID: USER_POOL_ID ? 'configured' : 'not configured',
                        CLIENT_ID: CLIENT_ID ? 'configured' : 'not configured',
                        TABLE_NAME: TABLE_NAME ? 'configured' : 'not configured'
                    }
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