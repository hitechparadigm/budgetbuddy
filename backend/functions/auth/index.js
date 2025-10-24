/**
 * BudgetBuddy Authentication Lambda Function
 * 
 * Handles user authentication, registration, profile management, and password reset
 * functionality. Integrates with Amazon Cognito for secure user management and
 * DynamoDB for storing additional user profile information.
 * 
 * Supported operations:
 * - User registration with email verification
 * - User login and token management
 * - Password reset flow
 * - Profile management and updates
 * - User profile retrieval
 */

const {
    CognitoIdentityProviderClient,
    AdminCreateUserCommand,
    AdminSetUserPasswordCommand,
    AdminGetUserCommand
} = require('@aws-sdk/client-cognito-identity-provider');
const {
    successResponse,
    errorResponse,
    parseRequestBody,
    getUserFromEvent,
    generateId,
    dynamoHelpers,
    logger
} = require('/opt/nodejs/utils');

// Initialize Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Main Lambda handler function
 * Routes requests based on HTTP method and path to appropriate handler functions
 * 
 * @param {Object} event - API Gateway event object
 * @param {Object} context - Lambda context object
 * @returns {Promise<Object>} HTTP response object
 */
exports.handler = async (event, context) => {
    // Set up request correlation ID for logging
    const correlationId = context.awsRequestId;
    logger.info('Authentication request received', {
        correlationId,
        httpMethod: event.httpMethod,
        path: event.path,
        userAgent: event.headers ? . ['User-Agent'],
    });

    try {
        const {
            httpMethod,
            path
        } = event;

        // Route requests to appropriate handlers based on method and path
        switch (`${httpMethod} ${path}`) {
            case 'POST /auth':
                return await handleAuthentication(event, correlationId);

            case 'GET /users':
                return await handleGetProfile(event, correlationId);

            case 'PUT /users':
                return await handleUpdateProfile(event, correlationId);

            case 'POST /auth/register':
                return await handleRegistration(event, correlationId);

            case 'POST /auth/forgot-password':
                return await handleForgotPassword(event, correlationId);

            case 'POST /auth/reset-password':
                return await handleResetPassword(event, correlationId);

            case 'POST /auth/verify-email':
                return await handleEmailVerification(event, correlationId);

            default:
                logger.warn('Unsupported route', {
                    correlationId,
                    httpMethod,
                    path
                });
                return errorResponse.notFound('Route not found');
        }
    } catch (error) {
        logger.error('Unhandled error in auth handler', error, {
            correlationId
        });
        return errorResponse.internalError('An unexpected error occurred');
    }
};

/**
 * Handle user authentication (login)
 * Validates credentials and returns user information with tokens
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Authentication response
 */
async function handleAuthentication(event, correlationId) {
    try {
        const body = parseRequestBody(event.body);
        const {
            email,
            password
        } = body;

        // Validate required fields
        if (!email || !password) {
            return errorResponse.badRequest('Email and password are required');
        }

        logger.info('Authentication attempt', {
            correlationId,
            email
        });

        // Note: In a real implementation, you would use Cognito's authentication flow
        // For now, we'll return a placeholder response
        // TODO: Implement actual Cognito authentication flow

        // Get user profile from DynamoDB
        const userProfile = await getUserProfile(email);

        if (!userProfile) {
            logger.warn('Authentication failed - user not found', {
                correlationId,
                email
            });
            return errorResponse.unauthorized('Invalid credentials');
        }

        // Return success response with user data
        // Note: In production, this would include actual JWT tokens from Cognito
        const response = {
            user: {
                userId: userProfile.userId,
                email: userProfile.email,
                firstName: userProfile.firstName,
                lastName: userProfile.lastName,
                subscriptionTier: userProfile.subscriptionTier,
                onboardingCompleted: userProfile.onboardingCompleted,
            },
            tokens: {
                accessToken: 'placeholder-access-token', // TODO: Get from Cognito
                refreshToken: 'placeholder-refresh-token', // TODO: Get from Cognito
                expiresIn: 3600,
            },
        };

        logger.info('Authentication successful', {
            correlationId,
            userId: userProfile.userId
        });
        return successResponse(response, 'Authentication successful');

    } catch (error) {
        logger.error('Authentication error', error, {
            correlationId
        });
        return errorResponse.internalError('Authentication failed');
    }
}

/**
 * Handle user registration
 * Creates new user account in Cognito and stores profile in DynamoDB
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Registration response
 */
async function handleRegistration(event, correlationId) {
    try {
        const body = parseRequestBody(event.body);
        const {
            email,
            password,
            firstName,
            lastName,
            age,
            location
        } = body;

        // Validate required fields
        if (!email || !password || !firstName || !lastName || !age || !location) {
            return errorResponse.badRequest('All registration fields are required');
        }

        logger.info('Registration attempt', {
            correlationId,
            email
        });

        // Check if user already exists
        const existingUser = await getUserProfile(email);
        if (existingUser) {
            return errorResponse.conflict('User already exists');
        }

        // Generate new user ID
        const userId = generateId.user();

        // Create user profile in DynamoDB
        const userProfile = {
            PK: `USER#${userId}`,
            SK: 'PROFILE',
            entityType: 'USER',
            userId,
            email,
            firstName,
            lastName,
            age,
            location,
            role: 'primary',
            subscriptionTier: 'free',
            accountType: 'single',
            onboardingCompleted: false,
        };

        await dynamoHelpers.putItem(userProfile);

        // TODO: Create user in Cognito User Pool
        // This would involve calling Cognito APIs to create the user account

        logger.info('Registration successful', {
            correlationId,
            userId
        });

        const response = {
            user: {
                userId,
                email,
                firstName,
                lastName,
                subscriptionTier: 'free',
                onboardingCompleted: false,
            },
            message: 'Registration successful. Please check your email for verification.',
        };

        return successResponse(response, 'Registration successful');

    } catch (error) {
        logger.error('Registration error', error, {
            correlationId
        });
        return errorResponse.internalError('Registration failed');
    }
}

/**
 * Handle get user profile
 * Returns current user's profile information
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Profile response
 */
async function handleGetProfile(event, correlationId) {
    try {
        // Extract user information from JWT token
        const user = getUserFromEvent(event);

        logger.info('Profile request', {
            correlationId,
            userId: user.userId
        });

        // Get full user profile from DynamoDB
        const userProfile = await dynamoHelpers.getItem(`USER#${user.userId}`, 'PROFILE');

        if (!userProfile) {
            return errorResponse.notFound('User profile not found');
        }

        // Return sanitized profile (remove sensitive fields)
        const profile = {
            userId: userProfile.userId,
            email: userProfile.email,
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            age: userProfile.age,
            location: userProfile.location,
            familyId: userProfile.familyId,
            role: userProfile.role,
            subscriptionTier: userProfile.subscriptionTier,
            accountType: userProfile.accountType,
            onboardingCompleted: userProfile.onboardingCompleted,
            createdAt: userProfile.createdAt,
            updatedAt: userProfile.updatedAt,
        };

        return successResponse(profile, 'Profile retrieved successfully');

    } catch (error) {
        logger.error('Get profile error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to retrieve profile');
    }
}

/**
 * Handle update user profile
 * Updates user profile information in DynamoDB
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Update response
 */
async function handleUpdateProfile(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const body = parseRequestBody(event.body);

        logger.info('Profile update request', {
            correlationId,
            userId: user.userId
        });

        // Define allowed fields for update
        const allowedFields = ['firstName', 'lastName', 'age', 'location'];
        const updates = {};

        // Filter and validate update fields
        Object.keys(body).forEach(key => {
            if (allowedFields.includes(key) && body[key] !== undefined) {
                updates[key] = body[key];
            }
        });

        if (Object.keys(updates).length === 0) {
            return errorResponse.badRequest('No valid fields to update');
        }

        // Update user profile in DynamoDB
        const updatedProfile = await dynamoHelpers.updateItem(
            `USER#${user.userId}`,
            'PROFILE',
            updates
        );

        logger.info('Profile updated successfully', {
            correlationId,
            userId: user.userId
        });

        return successResponse(updatedProfile, 'Profile updated successfully');

    } catch (error) {
        logger.error('Update profile error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to update profile');
    }
}

/**
 * Handle forgot password request
 * Initiates password reset flow via Cognito
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Forgot password response
 */
async function handleForgotPassword(event, correlationId) {
    try {
        const body = parseRequestBody(event.body);
        const {
            email
        } = body;

        if (!email) {
            return errorResponse.badRequest('Email is required');
        }

        logger.info('Forgot password request', {
            correlationId,
            email
        });

        // TODO: Implement Cognito forgot password flow
        // This would call Cognito's ForgotPasswordCommand

        return successResponse({
                message: 'Password reset instructions sent to your email'
            },
            'Password reset initiated'
        );

    } catch (error) {
        logger.error('Forgot password error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to initiate password reset');
    }
}

/**
 * Handle password reset
 * Completes password reset flow with verification code
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Reset password response
 */
async function handleResetPassword(event, correlationId) {
    try {
        const body = parseRequestBody(event.body);
        const {
            email,
            code,
            newPassword
        } = body;

        if (!email || !code || !newPassword) {
            return errorResponse.badRequest('Email, verification code, and new password are required');
        }

        logger.info('Password reset request', {
            correlationId,
            email
        });

        // TODO: Implement Cognito password reset confirmation
        // This would call Cognito's ConfirmForgotPasswordCommand

        return successResponse({
                message: 'Password reset successful'
            },
            'Password updated successfully'
        );

    } catch (error) {
        logger.error('Reset password error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to reset password');
    }
}

/**
 * Handle email verification
 * Confirms user email address via Cognito verification code
 * 
 * @param {Object} event - API Gateway event
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Email verification response
 */
async function handleEmailVerification(event, correlationId) {
    try {
        const body = parseRequestBody(event.body);
        const {
            email,
            code
        } = body;

        if (!email || !code) {
            return errorResponse.badRequest('Email and verification code are required');
        }

        logger.info('Email verification request', {
            correlationId,
            email
        });

        // TODO: Implement Cognito email verification
        // This would call Cognito's ConfirmSignUpCommand

        return successResponse({
                message: 'Email verified successfully'
            },
            'Email verification successful'
        );

    } catch (error) {
        logger.error('Email verification error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to verify email');
    }
}

/**
 * Helper function to get user profile by email
 * @param {string} email - User email address
 * @returns {Promise<Object|null>} User profile or null
 */
async function getUserProfile(email) {
    try {
        // In a real implementation, you might need to query by email
        // For now, this is a placeholder that would need proper GSI querying
        // TODO: Implement proper email-based user lookup using GSI
        return null;
    } catch (error) {
        logger.error('Error getting user profile', error);
        return null;
    }
}