/**
 * BudgetBuddy Payment Lambda Function
 * 
 * Handles Stripe payment processing and subscription management
 */

exports.handler = async (event, context) => {
    console.log('Payment request received', {
        httpMethod: event.httpMethod,
        path: event.path
    });

    try {
        const {
            httpMethod,
            path
        } = event;

        // Handle health check endpoint
        if (httpMethod === 'GET' && path === '/payment/health') {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    status: 'healthy',
                    service: 'payment',
                    timestamp: new Date().toISOString(),
                    version: '1.0.0'
                })
            };
        }

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
        console.error('Error in payment handler:', error);
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