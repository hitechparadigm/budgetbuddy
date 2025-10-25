/**
 * BudgetBuddy Authentication Lambda Function
 *
 * Handles user authentication, registration, profile management, and password reset
 * functionality. Integrates with Amazon Cognito for secure user management and
 * DynamoDB for storing additional user profile information.
 */

// Environment variables
const USER_POOL_ID = process.env.USER_POOL_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const TABLE_NAME = process.env.TABLE_NAME;

// Lazy initialization of AWS services to avoid startup errors
let cognito = null;
// let dynamodb = null; // TODO: Will be used for user profile storage

function getCognitoClient() {
    if (!cognito) {
        const AWS = require('aws-sdk');
        cognito = new AWS.CognitoIdentityServiceProvider();
    }
    return cognito;
}

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
            path,
            body
        } = event;

        // Handle health check endpoints (both root and service-specific)
        if (httpMethod === 'GET' && (path === '/health' || path === '/auth/health')) {
            return createResponse(200, {
                status: 'healthy',
                service: 'auth',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                cognito: USER_POOL_ID ? 'configured' : 'not configured',
                dynamodb: TABLE_NAME ? 'configured' : 'not configured'
            });
        }

        // Handle CORS preflight requests
        if (httpMethod === 'OPTIONS') {
            return createResponse(200, '');
        }

        // Parse request body for POST requests
        let requestBody = {};
        if (body) {
            try {
                requestBody = JSON.parse(body);
            } catch (error) {
                return createResponse(400, {
                    error: 'Bad Request',
                    message: 'Invalid JSON in request body'
                });
            }
        }

        // Route to appropriate handler based on path and method
        if (httpMethod === 'POST' && path === '/auth/register') {
            return await handleRegister(requestBody);
        }

        if (httpMethod === 'POST' && path === '/auth/login') {
            return await handleLogin(requestBody);
        }

        if (httpMethod === 'POST' && path === '/auth/confirm') {
            return await handleConfirmSignUp(requestBody);
        }

        if (httpMethod === 'POST' && path === '/auth/forgot-password') {
            return await handleForgotPassword(requestBody);
        }

        if (httpMethod === 'POST' && path === '/auth/reset-password') {
            return await handleResetPassword(requestBody);
        }

        if (httpMethod === 'GET' && path === '/auth/profile') {
            return await handleGetProfile(event);
        }

        if (httpMethod === 'PUT' && path === '/auth/profile') {
            return await handleUpdateProfile(event, requestBody);
        }

        // Default response for unhandled routes
        return createResponse(404, {
            error: 'Not Found',
            message: `Route ${httpMethod} ${path} not found`,
            service: 'auth'
        });

    } catch (error) {
        console.error('Authentication function error:', error);

        return createResponse(500, {
            error: 'Internal Server Error',
            message: 'An error occurred processing your request',
            service: 'auth'
        });
    }
};

/**
 * Create standardized HTTP response
 */
function createResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: typeof body === 'string' ? body : JSON.stringify(body)
    };
}

/**
 * Handle user registration
 */
async function handleRegister(body) {
    const {
        email,
        password,
        firstName,
        lastName,
        country
    } = body;

    if (!email || !password || !firstName || !lastName) {
        return createResponse(400, {
            error: 'Bad Request',
            message: 'Email, password, firstName, and lastName are required'
        });
    }

    try {
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

        const result = await getCognitoClient().signUp(params).promise();

        return createResponse(201, {
            message: 'User registered successfully',
            userId: result.UserSub,
            confirmationRequired: !result.UserConfirmed
        });

    } catch (error) {
        console.error('Registration error:', error);

        if (error.code === 'UsernameExistsException') {
            return createResponse(409, {
                error: 'Conflict',
                message: 'User with this email already exists'
            });
        }

        return createResponse(400, {
            error: 'Registration Failed',
            message: error.message
        });
    }
}

/**
 * Handle user login
 */
async function handleLogin(body) {
    const {
        email,
        password
    } = body;

    if (!email || !password) {
        return createResponse(400, {
            error: 'Bad Request',
            message: 'Email and password are required'
        });
    }

    try {
        const params = {
            ClientId: CLIENT_ID,
            AuthFlow: 'USER_PASSWORD_AUTH',
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password
            }
        };

        const result = await getCognitoClient().initiateAuth(params).promise();

        return createResponse(200, {
            message: 'Login successful',
            accessToken: result.AuthenticationResult.AccessToken,
            idToken: result.AuthenticationResult.IdToken,
            refreshToken: result.AuthenticationResult.RefreshToken,
            expiresIn: result.AuthenticationResult.ExpiresIn
        });

    } catch (error) {
        console.error('Login error:', error);

        if (error.code === 'NotAuthorizedException') {
            return createResponse(401, {
                error: 'Unauthorized',
                message: 'Invalid email or password'
            });
        }

        if (error.code === 'UserNotConfirmedException') {
            return createResponse(403, {
                error: 'Forbidden',
                message: 'Please confirm your email address before logging in'
            });
        }

        return createResponse(400, {
            error: 'Login Failed',
            message: error.message
        });
    }
}

/**
 * Handle email confirmation
 */
async function handleConfirmSignUp(body) {
    const {
        email,
        confirmationCode
    } = body;

    if (!email || !confirmationCode) {
        return createResponse(400, {
            error: 'Bad Request',
            message: 'Email and confirmation code are required'
        });
    }

    try {
        const params = {
            ClientId: CLIENT_ID,
            Username: email,
            ConfirmationCode: confirmationCode
        };

        await getCognitoClient().confirmSignUp(params).promise();

        return createResponse(200, {
            message: 'Email confirmed successfully'
        });

    } catch (error) {
        console.error('Confirmation error:', error);

        return createResponse(400, {
            error: 'Confirmation Failed',
            message: error.message
        });
    }
}

/**
 * Handle forgot password request
 */
async function handleForgotPassword(body) {
    const {
        email
    } = body;

    if (!email) {
        return createResponse(400, {
            error: 'Bad Request',
            message: 'Email is required'
        });
    }

    try {
        const params = {
            ClientId: CLIENT_ID,
            Username: email
        };

        await getCognitoClient().forgotPassword(params).promise();

        return createResponse(200, {
            message: 'Password reset code sent to your email'
        });

    } catch (error) {
        console.error('Forgot password error:', error);

        return createResponse(400, {
            error: 'Password Reset Failed',
            message: error.message
        });
    }
}

/**
 * Handle password reset
 */
async function handleResetPassword(body) {
    const {
        email,
        confirmationCode,
        newPassword
    } = body;

    if (!email || !confirmationCode || !newPassword) {
        return createResponse(400, {
            error: 'Bad Request',
            message: 'Email, confirmation code, and new password are required'
        });
    }

    try {
        const params = {
            ClientId: CLIENT_ID,
            Username: email,
            ConfirmationCode: confirmationCode,
            Password: newPassword
        };

        await getCognitoClient().confirmForgotPassword(params).promise();

        return createResponse(200, {
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Password reset error:', error);

        return createResponse(400, {
            error: 'Password Reset Failed',
            message: error.message
        });
    }
}

/**
 * Handle get user profile (requires authentication)
 */
async function handleGetProfile(event) {
    // Extract user from JWT token (this would be handled by API Gateway authorizer in production)
    const authHeader = event.headers.Authorization || event.headers.authorization;

    if (!authHeader) {
        return createResponse(401, {
            error: 'Unauthorized',
            message: 'Authorization header required'
        });
    }

    try {
        // For now, return a placeholder response
        // In production, this would decode the JWT and fetch user data
        return createResponse(200, {
            message: 'Profile endpoint - authentication integration pending',
            note: 'This endpoint will be fully implemented with API Gateway authorizer'
        });

    } catch (error) {
        console.error('Get profile error:', error);

        return createResponse(500, {
            error: 'Profile Fetch Failed',
            message: error.message
        });
    }
}

/**
 * Handle update user profile (requires authentication)
 */
async function handleUpdateProfile(event, _body) {
    // Extract user from JWT token (this would be handled by API Gateway authorizer in production)
    const authHeader = event.headers.Authorization || event.headers.authorization;

    if (!authHeader) {
        return createResponse(401, {
            error: 'Unauthorized',
            message: 'Authorization header required'
        });
    }

    try {
        // For now, return a placeholder response
        // In production, this would decode the JWT and update user data
        return createResponse(200, {
            message: 'Profile update endpoint - authentication integration pending',
            note: 'This endpoint will be fully implemented with API Gateway authorizer'
        });

    } catch (error) {
        console.error('Update profile error:', error);

        return createResponse(500, {
            error: 'Profile Update Failed',
            message: error.message
        });
    }
}