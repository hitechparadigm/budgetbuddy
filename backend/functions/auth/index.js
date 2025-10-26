/**
 * BudgetBuddy Authentication Lambda Function - Minimal Version for Debugging
 */

// Environment variables
// const USER_POOL_ID = process.env.USER_POOL_ID; // TODO: Will be used for additional validation
const CLIENT_ID = process.env.CLIENT_ID;
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

        // Handle registration endpoint
        if (httpMethod === 'POST' && path === '/auth/register') {
            console.log('Registration request received');
            console.log('Request body:', event.body);

            // Parse request body
            let requestBody;
            try {
                requestBody = JSON.parse(event.body);
                console.log('Parsed body:', requestBody);
            } catch (error) {
                console.error('JSON parse error:', error);
                return {
                    statusCode: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        error: 'Bad Request',
                        message: 'Invalid JSON in request body'
                    })
                };
            }

            // Validate required fields
            const {
                email,
                password,
                firstName,
                lastName,
                country
            } = requestBody;
            if (!email || !password || !firstName || !lastName) {
                console.log('Missing required fields');
                return {
                    statusCode: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        error: 'Bad Request',
                        message: 'Email, password, firstName, and lastName are required'
                    })
                };
            }

            // Try Cognito registration
            try {
                console.log('Initializing AWS SDK...');
                const AWS = require('aws-sdk');
                console.log('AWS SDK loaded successfully');

                const cognito = new AWS.CognitoIdentityServiceProvider();
                console.log('Cognito client created successfully');

                const params = {
                    ClientId: CLIENT_ID,
                    Username: email,
                    Password: password,
                    UserAttributes: [{
                            Name: 'email',
                            Value: email
                        },
                        {
                            Name: 'given_name',
                            Value: firstName
                        },
                        {
                            Name: 'family_name',
                            Value: lastName
                        },
                        {
                            Name: 'custom:accountType',
                            Value: 'single'
                        },
                        {
                            Name: 'custom:subscriptionTier',
                            Value: 'free'
                        },
                        {
                            Name: 'custom:onboardingCompleted',
                            Value: 'false'
                        }
                    ]
                };

                if (country) {
                    params.UserAttributes.push({
                        Name: 'custom:country',
                        Value: country
                    });
                }

                console.log('Calling Cognito signUp...');
                const result = await cognito.signUp(params).promise();
                console.log('Cognito signUp successful:', result.UserSub);

                return {
                    statusCode: 201,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        message: 'User registered successfully',
                        userId: result.UserSub,
                        confirmationRequired: !result.UserConfirmed
                    })
                };

            } catch (error) {
                console.error('Registration error:', error);

                if (error.code === 'UsernameExistsException') {
                    return {
                        statusCode: 409,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({
                            error: 'Conflict',
                            message: 'User with this email already exists'
                        })
                    };
                }

                return {
                    statusCode: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        error: 'Registration Failed',
                        message: error.message
                    })
                };
            }
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