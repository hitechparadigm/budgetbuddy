/**
 * BudgetBuddy AI Lambda Function
 *
 * Handles AI-powered budget generation using AWS Bedrock
 */

exports.handler = async (event, _context) => {
    console.log('AI request received', {
        httpMethod: event.httpMethod,
        path: event.path
    });

    try {
        const {
            httpMethod,
            path
        } = event;

        // Handle health check endpoint
        if (httpMethod === 'GET' && path === '/ai/health') {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    status: 'healthy',
                    service: 'ai',
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
                service: 'ai'
            })
        };

    } catch (error) {
        console.error('AI function error:', error);

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Internal Server Error',
                message: 'An error occurred processing your request',
                service: 'ai'
            })
        };
    }
};