/**
 * BudgetBuddy Email and Notification Lambda Function
 * 
 * Handles email notifications using Amazon SES including family invitations,
 * weekly financial tips for premium users, and system notifications.
 */

const {
    SESClient,
    SendEmailCommand
} = require('@aws-sdk/client-ses');
const {
    successResponse,
    errorResponse,
    parseRequestBody,
    logger
} = require('/opt/nodejs/utils');

const sesClient = new SESClient({
    region: process.env.AWS_REGION || 'us-east-1',
});

exports.handler = async (event, context) => {
    const correlationId = context.awsRequestId;
    logger.info('Email request received', {
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
            case 'POST /email/send-invitation':
                return await handleSendInvitation(event, correlationId);
            case 'POST /email/send-tips':
                return await handleSendWeeklyTips(event, correlationId);
            default:
                return errorResponse.notFound('Route not found');
        }
    } catch (error) {
        logger.error('Unhandled error in email handler', error, {
            correlationId
        });
        return errorResponse.internalError('An unexpected error occurred');
    }
};

async function handleSendInvitation(event, correlationId) {
    try {
        const body = parseRequestBody(event.body);
        const {
            email,
            inviterName,
            familyName,
            invitationToken
        } = body;

        logger.info('Send invitation email request', {
            correlationId,
            email
        });

        // TODO: Implement SES email sending for family invitations
        return successResponse({
            email
        }, 'Email invitation functionality coming soon');
    } catch (error) {
        logger.error('Send invitation error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to send invitation');
    }
}

async function handleSendWeeklyTips(event, correlationId) {
    try {
        logger.info('Send weekly tips request', {
            correlationId
        });

        // TODO: Implement weekly financial tips email sending
        return successResponse({}, 'Weekly tips functionality coming soon');
    } catch (error) {
        logger.error('Send weekly tips error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to send weekly tips');
    }
}