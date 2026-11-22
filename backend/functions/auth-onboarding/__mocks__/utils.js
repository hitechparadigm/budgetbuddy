'use strict';

/**
 * Test stand-in for the common layer at /opt/nodejs/utils (mapped in jest.config.js).
 *
 * getUserFromEvent is the layer's REAL function. The layer is loaded in an isolated module
 * registry so its own DynamoDB client never shows up in the handler tests'
 * DynamoDBClient.mock.instances.
 */
let realUtils;
jest.isolateModules(() => {
  realUtils = jest.requireActual('../../../layers/common/nodejs/utils.js');
});

const realGetUserFromEvent = realUtils.getUserFromEvent;
const getUserFromEvent = jest.fn(realGetUserFromEvent);

/**
 * Simulate the route's Cognito authorizer: a request that carries an Authorization header
 * reaches the handler with these verified claims; a request without one has no claims.
 * The claims are then read by the real getUserFromEvent.
 * @param {Object} claims - verified token claims (e.g. { 'custom:userId': 'user-123' })
 */
function authorizeAs(claims) {
  getUserFromEvent.mockImplementation((event) => {
    const hasAuth = Boolean(event?.headers?.Authorization || event?.headers?.authorization);
    const authorized = hasAuth ? { ...event, requestContext: { authorizer: { claims } } } : event;
    return realGetUserFromEvent(authorized);
  });
}

module.exports = { getUserFromEvent, authorizeAs, realGetUserFromEvent };
