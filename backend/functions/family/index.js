/**
 * BudgetBuddy Family Management Lambda Function
 * 
 * Handles family account operations including creation, invitations,
 * member management, and account type conversions. Manages shared
 * budget access and family member permissions.
 * 
 * Supported operations:
 * - Family account creation
 * - Member invitations via email
 * - Family member management
 * - Single to family account conversion
 * - Shared budget access control
 */

const {
    successResponse,
    errorResponse,
    parseRequestBody,
    getUserFromEvent,
    generateId,
    dynamoHelpers,
    logger
} = require('/opt/nodejs/utils');

/**
 * Main Lambda handler function
 */
exports.handler = async (event, context) => {
    const correlationId = context.awsRequestId;
    logger.info('Family request received', {
        correlationId,
        httpMethod: event.httpMethod,
        path: event.path,
    });

    try {
        const {
            httpMethod,
            path
        } = event;

        switch (`${httpMethod} ${path}`) {
            case 'GET /health':
            case 'GET /family/health':
                return successResponse({
                    status: 'healthy',
                    service: 'family',
                    timestamp: new Date().toISOString(),
                    version: '1.0.0'
                });

            case 'GET /family':
                return await handleGetFamily(event, correlationId);
            case 'POST /family':
                return await handleCreateFamily(event, correlationId);
            case 'POST /family/invite':
                return await handleInviteMember(event, correlationId);
            case 'POST /family/accept-invitation':
                return await handleAcceptInvitation(event, correlationId);
            case 'GET /family/members':
                return await handleGetFamilyMembers(event, correlationId);
            case 'POST /family/convert':
                return await handleConvertToFamily(event, correlationId);
            default:
                return errorResponse.notFound('Route not found');
        }
    } catch (error) {
        logger.error('Unhandled error in family handler', error, {
            correlationId
        });
        return errorResponse.internalError('An unexpected error occurred');
    }
};

async function handleGetFamily(event, correlationId) {
    try {
        const user = getUserFromEvent(event);

        if (!user.familyId) {
            return errorResponse.notFound('User is not part of a family account');
        }

        const family = await dynamoHelpers.getItem(`FAMILY#${user.familyId}`, 'METADATA');

        if (!family) {
            return errorResponse.notFound('Family not found');
        }

        return successResponse(family, 'Family retrieved successfully');
    } catch (error) {
        logger.error('Get family error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to retrieve family');
    }
}

async function handleCreateFamily(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const body = parseRequestBody(event.body);
        const {
            familyName
        } = body;

        if (!familyName) {
            return errorResponse.badRequest('Family name is required');
        }

        const familyId = generateId.family();

        const family = {
            PK: `FAMILY#${familyId}`,
            SK: 'METADATA',
            entityType: 'FAMILY',
            familyId,
            familyName,
            primaryUserId: user.userId,
            memberIds: [user.userId],
            familyStatus: 'single', // Will be updated based on members
            adults: 1,
            children: [],
            sharedBudgetId: null,
        };

        await dynamoHelpers.putItem(family);

        // TODO: Update user's familyId in their profile

        logger.info('Family created successfully', {
            correlationId,
            familyId
        });
        return successResponse(family, 'Family created successfully');
    } catch (error) {
        logger.error('Create family error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to create family');
    }
}

async function handleInviteMember(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const body = parseRequestBody(event.body);
        const {
            email
        } = body;

        if (!email) {
            return errorResponse.badRequest('Email is required');
        }

        // TODO: Implement family invitation logic
        // This would create an invitation record and send an email

        return successResponse({
            email
        }, 'Family invitation functionality coming soon');
    } catch (error) {
        logger.error('Invite member error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to send invitation');
    }
}

async function handleAcceptInvitation(event, correlationId) {
    try {
        const body = parseRequestBody(event.body);
        const {
            token
        } = body;

        if (!token) {
            return errorResponse.badRequest('Invitation token is required');
        }

        // TODO: Implement invitation acceptance logic

        return successResponse({
            token
        }, 'Accept invitation functionality coming soon');
    } catch (error) {
        logger.error('Accept invitation error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to accept invitation');
    }
}

async function handleGetFamilyMembers(event, correlationId) {
    try {
        const user = getUserFromEvent(event);

        if (!user.familyId) {
            return errorResponse.badRequest('User is not part of a family account');
        }

        // TODO: Get all family members
        const members = [];

        return successResponse({
            members
        }, 'Family members retrieved successfully');
    } catch (error) {
        logger.error('Get family members error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to retrieve family members');
    }
}

async function handleConvertToFamily(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const body = parseRequestBody(event.body);
        const {
            familyName
        } = body;

        if (!familyName) {
            return errorResponse.badRequest('Family name is required');
        }

        // TODO: Convert single account to family account
        // This would preserve existing budget data

        return successResponse({
            familyName
        }, 'Account conversion functionality coming soon');
    } catch (error) {
        logger.error('Convert to family error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to convert account');
    }
}