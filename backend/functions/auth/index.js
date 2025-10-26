/**
 * BudgetBuddy Authentication Lambda Function - Minimal Version for Debugging
 */

// AWS SDK imports
const {
    CognitoIdentityProviderClient,
    AdminCreateUserCommand,
    AdminSetUserPasswordCommand,
    InitiateAuthCommand
} = require('@aws-sdk/client-cognito-identity-provider');
const {
    DynamoDBClient,
    PutItemCommand
} = require('@aws-sdk/client-dynamodb');

// Environment variables
const USER_POOL_ID = process.env.USER_POOL_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const TABLE_NAME = process.env.TABLE_NAME;

// AWS clients
const cognitoClient = new CognitoIdentityProviderClient({
    region: 'us-east-1'
});
const dynamoClient = new DynamoDBClient({
    region: 'us-east-1'
});

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

        // Handle registration endpoint - STEP 2: Add validation
        if (httpMethod === 'POST' && path === '/auth/register') {
            console.log('Registration endpoint hit - testing validation');

            // Step 1: Parse JSON body
            let requestBody = null;
            let parseError = null;

            try {
                if (event.body) {
                    requestBody = JSON.parse(event.body);
                    console.log('Successfully parsed request body:', requestBody);
                } else {
                    console.log('No body received in request');
                    return {
                        statusCode: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({
                            error: 'Bad Request',
                            message: 'Request body is required'
                        })
                    };
                }
            } catch (error) {
                parseError = error.message;
                console.error('JSON parsing failed:', error);
                return {
                    statusCode: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        error: 'Bad Request',
                        message: 'Invalid JSON format',
                        details: parseError
                    })
                };
            }

            // Step 2: Basic validation
            const validationErrors = [];

            if (!requestBody.email || typeof requestBody.email !== 'string') {
                validationErrors.push('Email is required and must be a string');
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestBody.email)) {
                validationErrors.push('Email must be a valid email address');
            }

            if (!requestBody.password || typeof requestBody.password !== 'string') {
                validationErrors.push('Password is required and must be a string');
            } else if (requestBody.password.length < 8) {
                validationErrors.push('Password must be at least 8 characters long');
            }

            if (!requestBody.firstName || typeof requestBody.firstName !== 'string') {
                validationErrors.push('First name is required and must be a string');
            }

            if (!requestBody.lastName || typeof requestBody.lastName !== 'string') {
                validationErrors.push('Last name is required and must be a string');
            }

            // If validation fails, return error
            if (validationErrors.length > 0) {
                console.log('Validation failed:', validationErrors);
                return {
                    statusCode: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        error: 'Validation Error',
                        message: 'Request validation failed',
                        errors: validationErrors
                    })
                };
            }

            // Step 3: Create user in Cognito and DynamoDB
            console.log('Validation passed, creating user in Cognito');

            try {
                // Generate unique user ID
                const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Create user in Cognito User Pool
                const createUserCommand = new AdminCreateUserCommand({
                    UserPoolId: USER_POOL_ID,
                    Username: requestBody.email,
                    UserAttributes: [{
                            Name: 'email',
                            Value: requestBody.email
                        },
                        {
                            Name: 'email_verified',
                            Value: 'true'
                        },
                        {
                            Name: 'given_name',
                            Value: requestBody.firstName
                        },
                        {
                            Name: 'family_name',
                            Value: requestBody.lastName
                        },
                        {
                            Name: 'custom:userId',
                            Value: userId
                        }
                    ],
                    MessageAction: 'SUPPRESS', // Don't send welcome email for now
                    TemporaryPassword: requestBody.password
                });

                const cognitoResult = await cognitoClient.send(createUserCommand);
                console.log('User created in Cognito:', cognitoResult.User.Username);

                // Set permanent password
                const setPasswordCommand = new AdminSetUserPasswordCommand({
                    UserPoolId: USER_POOL_ID,
                    Username: requestBody.email,
                    Password: requestBody.password,
                    Permanent: true
                });

                await cognitoClient.send(setPasswordCommand);
                console.log('Password set as permanent');

                // Create user profile in DynamoDB
                const userProfile = {
                    PK: {
                        S: `USER#${userId}`
                    },
                    SK: {
                        S: 'PROFILE'
                    },
                    entityType: {
                        S: 'USER'
                    },
                    userId: {
                        S: userId
                    },
                    email: {
                        S: requestBody.email
                    },
                    firstName: {
                        S: requestBody.firstName
                    },
                    lastName: {
                        S: requestBody.lastName
                    },
                    accountType: {
                        S: 'single'
                    },
                    subscriptionTier: {
                        S: 'free'
                    },
                    onboardingCompleted: {
                        BOOL: false
                    },
                    createdAt: {
                        S: new Date().toISOString()
                    },
                    updatedAt: {
                        S: new Date().toISOString()
                    }
                };

                const putItemCommand = new PutItemCommand({
                    TableName: TABLE_NAME,
                    Item: userProfile,
                    ConditionExpression: 'attribute_not_exists(PK)' // Prevent duplicate users
                });

                await dynamoClient.send(putItemCommand);
                console.log('User profile created in DynamoDB');

                return {
                    statusCode: 201,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        message: 'User registered successfully',
                        userId: userId,
                        email: requestBody.email,
                        firstName: requestBody.firstName,
                        lastName: requestBody.lastName,
                        accountType: 'single',
                        subscriptionTier: 'free',
                        nextSteps: [
                            'Complete onboarding questionnaire',
                            'Generate AI budget or create DIY budget'
                        ]
                    })
                };

            } catch (cognitoError) {
                console.error('Cognito/DynamoDB error:', cognitoError);

                // Handle specific Cognito errors
                if (cognitoError.name === 'UsernameExistsException') {
                    return {
                        statusCode: 409,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({
                            error: 'User Already Exists',
                            message: 'An account with this email address already exists'
                        })
                    };
                }

                return {
                    statusCode: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        error: 'Registration Failed',
                        message: 'Failed to create user account',
                        details: cognitoError.message
                    })
                };
            }
        }

        // Handle login endpoint
        if (httpMethod === 'POST' && path === '/auth/login') {
            console.log('Login endpoint hit');

            // Step 1: Parse JSON body
            let requestBody = null;
            let parseError = null;

            try {
                if (event.body) {
                    requestBody = JSON.parse(event.body);
                    console.log('Successfully parsed login request body:', {
                        email: requestBody.email,
                        hasPassword: !!requestBody.password
                    });
                } else {
                    console.log('No body received in login request');
                    return {
                        statusCode: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({
                            error: 'Bad Request',
                            message: 'Request body is required'
                        })
                    };
                }
            } catch (error) {
                parseError = error.message;
                console.error('JSON parsing failed:', error);
                return {
                    statusCode: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        error: 'Bad Request',
                        message: 'Invalid JSON format',
                        details: parseError
                    })
                };
            }

            // Step 2: Basic validation
            const validationErrors = [];

            if (!requestBody.email || typeof requestBody.email !== 'string') {
                validationErrors.push('Email is required and must be a string');
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestBody.email)) {
                validationErrors.push('Email must be a valid email address');
            }

            if (!requestBody.password || typeof requestBody.password !== 'string') {
                validationErrors.push('Password is required and must be a string');
            }

            // If validation fails, return error
            if (validationErrors.length > 0) {
                console.log('Login validation failed:', validationErrors);
                return {
                    statusCode: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        error: 'Validation Error',
                        message: 'Request validation failed',
                        errors: validationErrors
                    })
                };
            }

            // Step 3: Authenticate with Cognito
            console.log('Validation passed, authenticating with Cognito');

            try {
                const authCommand = new InitiateAuthCommand({
                    AuthFlow: 'USER_PASSWORD_AUTH',
                    ClientId: CLIENT_ID,
                    AuthParameters: {
                        USERNAME: requestBody.email,
                        PASSWORD: requestBody.password
                    }
                });

                const authResult = await cognitoClient.send(authCommand);
                console.log('Cognito authentication successful');

                // Extract tokens from the response
                const accessToken = authResult.AuthenticationResult.AccessToken;
                const refreshToken = authResult.AuthenticationResult.RefreshToken;
                const idToken = authResult.AuthenticationResult.IdToken;

                // Parse the ID token to get user information (basic parsing)
                const idTokenPayload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());

                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        message: 'Login successful',
                        accessToken: accessToken,
                        refreshToken: refreshToken,
                        idToken: idToken,
                        user: {
                            userId: idTokenPayload['custom:userId'],
                            email: idTokenPayload.email,
                            firstName: idTokenPayload.given_name,
                            lastName: idTokenPayload.family_name,
                            accountType: idTokenPayload['custom:accountType'] || 'single',
                            subscriptionTier: idTokenPayload['custom:subscriptionTier'] || 'free'
                        },
                        expiresIn: authResult.AuthenticationResult.ExpiresIn
                    })
                };

            } catch (authError) {
                console.error('Cognito authentication error:', authError);

                // Handle specific authentication errors
                if (authError.name === 'NotAuthorizedException') {
                    return {
                        statusCode: 401,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({
                            error: 'Authentication Failed',
                            message: 'Invalid email or password'
                        })
                    };
                }

                if (authError.name === 'UserNotFoundException') {
                    return {
                        statusCode: 401,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({
                            error: 'Authentication Failed',
                            message: 'Invalid email or password'
                        })
                    };
                }

                return {
                    statusCode: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        error: 'Login Failed',
                        message: 'An error occurred during authentication',
                        details: authError.message
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