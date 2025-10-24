/**
 * BudgetBuddy Payment and Subscription Lambda Function
 * 
 * Handles Stripe integration for subscription management, payment processing,
 * and webhook handling. Manages free and premium tier transitions.
 */

const {
    successResponse,
    errorResponse,
    parseRequestBody,
    getUserFromEvent,
    logger
} = require('/opt/nodejs/utils');

exports.handler = async (event, context) => {
    const correlationId = context.awsRequestId;
    logger.info('Payment request received', {
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
            case 'POST /payments':
                return await handleCreateSubscription(event, correlationId);
            case 'POST /webhooks/stripe':
                return await handleStripeWebhook(event, correlationId);
            default:
                return errorResponse.notFound('Route not found');
        }
    } catch (error) {
        logger.error('Unhandled error in payment handler', error, {
            correlationId
        });
        return errorResponse.internalError('An unexpected error occurred');
    }
};

async function handleCreateSubscription(event, correlationId) {
    try {
        const user = getUserFromEvent(event);
        const body = parseRequestBody(event.body);

        logger.info('Create subscription request', {
            correlationId,
            userId: user.userId
        });

        // TODO: Implement Stripe subscription creation
        return successResponse({}, 'Stripe integration functionality coming soon');
    } catch (error) {
        logger.error('Create subscription error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to create subscription');
    }
}

async function handleStripeWebhook(event, correlationId) {
    try {
        logger.info('Stripe webhook received', {
            correlationId
        });

        // TODO: Implement Stripe webhook handling
        return successResponse({}, 'Webhook processed');
    } catch (error) {
        logger.error('Stripe webhook error', error, {
            correlationId
        });
        return errorResponse.internalError('Failed to process webhook');
    }
}