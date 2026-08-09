/**
 * Budgets Lambda Function
 *
 * Handles all budget collaboration features including:
 * - Listing budgets and switching active budget
 * - Creating budgets
 * - Sending and accepting invitations
 * - Managing budget members (view, update role, remove, extend viewer access)
 * - Leaving a budget
 * - Budget lifecycle (archive, restore, delete)
 *
 * Replaces the legacy `family` Lambda. All routes are under /budgets/*.
 * Budget access is resolved from DynamoDB on every request via BudgetAccessResolver —
 * the JWT carries only userId.
 */

'use strict';

const {
  successResponse,
  errorResponse,
  parseRequestBody,
  getUserFromEvent,
  generateId,
  dynamoHelpers,
  logger,
  BudgetAccessResolver,
} = require('/opt/nodejs/utils');
// canUseFeature is imported for future entitlement checks (Phase 2)
// eslint-disable-next-line no-unused-vars
const { canUseFeature } = require('/opt/nodejs/entitlements');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'budgetbuddy-main';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://d1ueeugn9zcx7n.cloudfront.net',
  'https://d2ubhx2a13s7gc.cloudfront.net',
  'https://app.budgetbuddy.com',
];

function getCorsHeaders(event) {
  const origin = event?.headers?.Origin || event?.headers?.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[2];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };
}

/** Wrap a handler result with CORS headers */
function withCors(event, response) {
  return { ...response, headers: { ...response.headers, ...getCorsHeaders(event) } };
}

/** Throw a structured error that the main handler catches and converts to a response */
function throwError(statusCode, message) {
  throw { statusCode, message };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

exports.handler = async (event) => {
  logger.info('Budgets Lambda invoked', {
    httpMethod: event.httpMethod,
    path: event.path,
  });

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: getCorsHeaders(event), body: '' };
  }

  if (
    event.httpMethod === 'GET' &&
    (event.path === '/budgets/health' || event.path === '/v1/budgets/health')
  ) {
    return withCors(event, successResponse({ status: 'healthy', service: 'budgets' }));
  }

  try {
    const { httpMethod, path, pathParameters } = event;

    // GET /budgets/invitation-preview — public endpoint, no auth required
    // Returns invitation details (inviter first name, budget name, role) for display
    // before the invitee authenticates. Does NOT accept the invitation.
    if (
      httpMethod === 'GET' &&
      (path === '/budgets/invitation-preview' || path === '/v1/budgets/invitation-preview')
    ) {
      return withCors(event, await handleInvitationPreview(event));
    }

    // POST /budgets/accept-invitation — handle before getUserFromEvent since the
    // endpoint is public (NONE auth) but still requires the user to be logged in.
    // We extract userId from the raw Authorization header JWT (no Cognito authorizer
    // populates requestContext.authorizer for NONE auth routes).
    if (
      httpMethod === 'POST' &&
      (path === '/budgets/accept-invitation' || path === '/v1/budgets/accept-invitation')
    ) {
      let userId;
      try {
        // Manually decode the JWT from the Authorization header.
        // The Cognito authorizer is NOT active on this route (NONE auth), so
        // event.requestContext.authorizer.claims is empty. We decode it here.
        const authHeader = event.headers?.Authorization || event.headers?.authorization || '';
        const rawToken = authHeader.replace(/^Bearer\s+/i, '').trim();
        if (!rawToken) throw new Error('No Authorization header');
        const parts = rawToken.split('.');
        if (parts.length !== 3) throw new Error('Invalid JWT format');
        const payload = JSON.parse(Buffer.from(parts[1] + '==', 'base64').toString('utf8'));
        userId = payload['custom:userId'] || payload.sub;
        if (!userId) throw new Error('No userId in token');
      } catch (_e) {
        return withCors(event, {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            message: 'You must be logged in to accept an invitation.',
            error: { code: 'UNAUTHORIZED' },
          }),
        });
      }
      return withCors(event, await handleAcceptInvitation(event, userId));
    }

    const user = getUserFromEvent(event);
    const { userId } = user;

    // GET /budgets
    if (httpMethod === 'GET' && (path === '/budgets' || path === '/v1/budgets')) {
      return withCors(event, await handleGetBudgets(userId));
    }

    // PUT /budgets/active
    if (httpMethod === 'PUT' && (path === '/budgets/active' || path === '/v1/budgets/active')) {
      return withCors(event, await handleSetActiveBudget(event, userId));
    }

    // POST /budgets
    if (httpMethod === 'POST' && (path === '/budgets' || path === '/v1/budgets')) {
      return withCors(event, await handleCreateBudget(event, userId));
    }

    const budgetId = pathParameters?.budgetId;
    const targetUserId = pathParameters?.userId;
    const invitationId = pathParameters?.invitationId || pathParameters?.id;

    // POST /budgets/{budgetId}/invite
    if (httpMethod === 'POST' && path.endsWith('/invite') && budgetId) {
      return withCors(event, await handleInvite(event, userId, budgetId));
    }

    // GET /budgets/{budgetId}/members
    if (httpMethod === 'GET' && path.endsWith('/members') && budgetId && !targetUserId) {
      return withCors(event, await handleGetMembers(userId, budgetId));
    }

    // PUT /budgets/{budgetId}/members/{userId}/extend
    if (httpMethod === 'PUT' && path.endsWith('/extend') && budgetId && targetUserId) {
      return withCors(event, await handleExtendViewerAccess(event, userId, budgetId, targetUserId));
    }

    // PUT /budgets/{budgetId}/members/{userId}
    if (httpMethod === 'PUT' && path.includes('/members/') && budgetId && targetUserId && !path.endsWith('/extend')) {
      return withCors(event, await handleUpdateMemberRole(event, userId, budgetId, targetUserId));
    }

    // DELETE /budgets/{budgetId}/members/{userId}
    if (httpMethod === 'DELETE' && path.includes('/members/') && budgetId && targetUserId) {
      return withCors(event, await handleRemoveMember(userId, budgetId, targetUserId));
    }

    // POST /budgets/{budgetId}/leave
    if (httpMethod === 'POST' && path.endsWith('/leave') && budgetId) {
      return withCors(event, await handleLeaveBudget(userId, budgetId));
    }

    // GET /budgets/{budgetId}/invitations
    if (httpMethod === 'GET' && path.endsWith('/invitations') && budgetId) {
      return withCors(event, await handleGetInvitations(userId, budgetId));
    }

    // POST /budgets/{budgetId}/invitations/{id}/resend
    if (httpMethod === 'POST' && path.endsWith('/resend') && budgetId && invitationId) {
      return withCors(event, await handleResendInvitation(event, userId, budgetId, invitationId));
    }

    // DELETE /budgets/{budgetId}/invitations/{id}
    if (httpMethod === 'DELETE' && path.includes('/invitations/') && budgetId && invitationId) {
      return withCors(event, await handleRevokeInvitation(userId, budgetId, invitationId));
    }

    // PUT /budgets/{budgetId}/archive
    if (httpMethod === 'PUT' && path.endsWith('/archive') && budgetId) {
      return withCors(event, await handleArchiveBudget(userId, budgetId));
    }

    // PUT /budgets/{budgetId}/restore
    if (httpMethod === 'PUT' && path.endsWith('/restore') && budgetId) {
      return withCors(event, await handleRestoreBudget(userId, budgetId));
    }

    // DELETE /budgets/{budgetId}
    if (httpMethod === 'DELETE' && budgetId && !path.includes('/members/') && !path.includes('/invitations/')) {
      return withCors(event, await handleDeleteBudget(userId, budgetId));
    }

    return withCors(event, errorResponse.notFound('Endpoint not found'));
  } catch (err) {
    if (err && err.statusCode) {
      const status = err.statusCode;
      if (status === 400) return withCors(event, errorResponse.badRequest(err.message));
      if (status === 403) return withCors(event, errorResponse.forbidden(err.message));
      if (status === 404) return withCors(event, errorResponse.notFound(err.message));
      if (status === 409) return withCors(event, errorResponse.conflict(err.message));
    }
    logger.error('Unhandled error in budgets handler', err);
    return withCors(event, errorResponse.internalError('Internal server error'));
  }
};

// ---------------------------------------------------------------------------
// handleGetBudgets — REQ-4
// GET /budgets
// Query GSI1PK = USER#<userId> to get all active memberships, then batch-fetch
// budget metadata for each.
// ---------------------------------------------------------------------------

async function handleGetBudgets(userId) {
  const membershipsResult = await dynamodb.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :userKey',
    ExpressionAttributeValues: { ':userKey': `USER#${userId}` },
  }));

  const memberships = (membershipsResult.Items || []).filter(m => m.status === 'active');

  const budgets = await Promise.all(
    memberships.map(async (m) => {
      const budgetResult = await dynamodb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `BUDGET#${m.budgetId}`, SK: 'METADATA' },
      }));
      const budget = budgetResult.Item;
      if (!budget || budget.status === 'deleted') return null;
      return {
        budgetId: m.budgetId,
        name: budget.name,
        budgetType: budget.budgetType,
        status: budget.status,
        role: m.role,
        accessLabel: m.accessLabel || null,
        expiresAt: m.expiresAt || null,
      };
    })
  );

  return successResponse({ budgets: budgets.filter(Boolean) });
}

// ---------------------------------------------------------------------------
// handleSetActiveBudget — REQ-4
// PUT /budgets/active
// Validate budgetId exists and user has active membership, then update
// defaultBudgetId on USER#<userId>/PROFILE.
// ---------------------------------------------------------------------------

async function handleSetActiveBudget(event, userId) {
  const body = parseRequestBody(event.body);
  const { budgetId } = body;

  if (!budgetId) throwError(400, 'budgetId is required');

  // Verify membership exists and is active
  const membership = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `BUDGET#${budgetId}`, SK: `MEMBER#${userId}` },
  }));

  if (!membership.Item || membership.Item.status !== 'active') {
    throwError(403, 'You do not have access to this budget.');
  }

  // Verify budget exists and is not deleted
  const budgetResult = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `BUDGET#${budgetId}`, SK: 'METADATA' },
  }));

  if (!budgetResult.Item || budgetResult.Item.status === 'deleted') {
    throwError(404, 'Budget not found.');
  }

  await dynamodb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
    UpdateExpression: 'SET defaultBudgetId = :budgetId, updatedAt = :now',
    ExpressionAttributeValues: {
      ':budgetId': budgetId,
      ':now': new Date().toISOString(),
    },
  }));

  logger.info('Active budget updated', { userId, budgetId });
  return successResponse({ budgetId, message: 'Active budget updated.' });
}

// ---------------------------------------------------------------------------
// handleCreateBudget — REQ-4
// POST /budgets
// Create BUDGET#<budgetId>/METADATA and BUDGET#<budgetId>/MEMBER#<userId> (owner).
// ---------------------------------------------------------------------------

async function handleCreateBudget(event, userId) {
  const body = parseRequestBody(event.body);
  const { name, budgetType = 'personal', currency = 'USD', country = 'US' } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throwError(400, 'Budget name is required.');
  }

  const validTypes = ['personal', 'family', 'shared'];
  if (!validTypes.includes(budgetType)) {
    throwError(400, `Invalid budgetType. Must be one of: ${validTypes.join(', ')}`);
  }

  const budgetId = generateId.budget();
  const now = new Date().toISOString();

  // Create budget metadata
  await dynamodb.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `BUDGET#${budgetId}`,
      SK: 'METADATA',
      budgetId,
      name: name.trim(),
      budgetType,
      ownerUserId: userId,
      currency,
      country,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
  }));

  // Create owner membership with GSI1 fields
  await dynamodb.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `BUDGET#${budgetId}`,
      SK: `MEMBER#${userId}`,
      GSI1PK: `USER#${userId}`,
      GSI1SK: `BUDGET#${budgetId}`,
      budgetId,
      userId,
      role: 'owner',
      status: 'active',
      accessLabel: null,
      joinedAt: now,
      invitedBy: null,
      expiresAt: null,
      historyAccess: 'full',
      createdAt: now,
    },
  }));

  logger.info('Budget created', { userId, budgetId, budgetType });
  return successResponse({ budgetId, name: name.trim(), budgetType, status: 'active' });
}

// ---------------------------------------------------------------------------
// handleInvite — REQ-5
// POST /budgets/{budgetId}/invite
// ---------------------------------------------------------------------------

async function handleInvite(event, userId, budgetId) {
  // Resolve access — caller must be owner or partner
  const { role, budgetType, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers, budgetId);
  BudgetAccessResolver.assertPermission(role, 'member.invite', budgetStatus);

  const body = parseRequestBody(event.body);
  const { email, role: inviteRole, accessLabel = null, viewerExpiresAt = null } = body;

  if (!email || !isValidEmail(email)) throwError(400, 'Invalid email address.');

  const validRoles = ['partner', 'household_member', 'viewer'];
  if (!inviteRole || !validRoles.includes(inviteRole)) {
    throwError(400, `Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  // Personal budgets cannot have members
  if (budgetType === 'personal') {
    throwError(400, 'Personal budgets cannot have members.');
  }

  // Enforce max 1 partner on family budgets
  if (inviteRole === 'partner' && budgetType === 'family') {
    const membersResult = await dynamodb.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: '#role = :partner AND #status = :active',
      ExpressionAttributeNames: { '#role': 'role', '#status': 'status' },
      ExpressionAttributeValues: {
        ':pk': `BUDGET#${budgetId}`,
        ':skPrefix': 'MEMBER#',
        ':partner': 'partner',
        ':active': 'active',
      },
    }));
    if ((membersResult.Items || []).length > 0) {
      throwError(409, 'This budget already has a partner.');
    }
  }

  // Block inviting an existing active member
  // Look up the invitee's userId by email via their profile
  // inviteeProfileResult is used below to check existing members by email
  const inviteeProfileResult = await dynamodb.send(new QueryCommand({ // eslint-disable-line no-unused-vars
    TableName: TABLE_NAME,
    IndexName: 'GSI4',
    KeyConditionExpression: 'GSI4PK = :emailKey',
    ExpressionAttributeValues: { ':emailKey': `INVITATION#${email.toLowerCase()}` },
    Limit: 1,
  }));

  // Also check if there's already an active member with this email by scanning members
  // (We check via the user profile lookup approach)
  const existingMembersResult = await dynamodb.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    FilterExpression: '#status = :active',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':pk': `BUDGET#${budgetId}`,
      ':skPrefix': 'MEMBER#',
      ':active': 'active',
    },
  }));

  // Check each active member's profile to see if their email matches
  for (const member of (existingMembersResult.Items || [])) {
    const memberUserId = member.SK.replace('MEMBER#', '');
    const profileResult = await dynamodb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${memberUserId}`, SK: 'PROFILE' },
    }));
    if (profileResult.Item && profileResult.Item.email &&
        profileResult.Item.email.toLowerCase() === email.toLowerCase()) {
      throwError(409, 'This user is already a member of this budget.');
    }
  }

  // Generate cryptographically secure token (32 bytes hex), store SHA-256 hash
  const token = generateSecureToken();
  const hashedToken = hashToken(token);

  const invitationId = generateId.invitation();
  const now = new Date().toISOString();
  const invExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const invitation = {
    PK: `INVITATION#${invitationId}`,
    SK: 'METADATA',
    GSI4PK: `INVITATION#${email.toLowerCase()}`,
    GSI4SK: `CREATED#${now}`,
    invitationId,
    budgetId,
    invitedBy: userId,
    invitedEmail: email.toLowerCase(),
    role: inviteRole,
    accessLabel,
    token: hashedToken, // stored as 'token' for backward compat
    tokenHash: hashedToken, // explicit field for ScanCommand filters in preview/accept handlers
    status: 'pending',
    expiresAt: invExpiresAt,
    viewerExpiresAt: inviteRole === 'viewer' ? viewerExpiresAt : null,
    createdAt: now,
  };

  await dynamodb.send(new PutCommand({ TableName: TABLE_NAME, Item: invitation }));

  logger.info('Invitation created', { invitationId, budgetId, inviteRole, email: email.toLowerCase() });

  // Send invitation email (non-fatal if it fails)
  await sendInvitationEmail(event, userId, email, inviteRole, token, invExpiresAt, budgetId).catch(err => {
    logger.error('Failed to send invitation email (non-fatal)', err, { invitationId });
  });

  return successResponse({
    invitationId,
    email: email.toLowerCase(),
    role: inviteRole,
    expiresAt: invExpiresAt,
    status: 'pending',
  });
}

// ---------------------------------------------------------------------------
// handleInvitationPreview — public endpoint
// GET /budgets/invitation-preview?token=xxx
// Returns safe invitation details for display before the invitee authenticates.
// Does NOT accept the invitation.
// ---------------------------------------------------------------------------

async function handleInvitationPreview(event) {
  const token = event.queryStringParameters?.token;
  if (!token) throwError(400, 'Token is required.');

  const hashedToken = hashToken(token);

  // Find invitation by hashed token
  let scanResult;
  try {
    scanResult = await dynamodb.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :invPrefix) AND tokenHash = :token AND #status = :pending',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':invPrefix': 'INVITATION#',
        ':token': hashedToken,
        ':pending': 'pending',
      },
    }));
  } catch (err) {
    logger.error('ScanCommand failed in handleInvitationPreview', { error: err.message });
    throwError(400, 'Invalid invitation token.');
  }

  if (!scanResult?.Items?.length) {
    throwError(404, 'Invitation not found or already used.');
  }

  const invitation = scanResult.Items[0];

  // Check expiry
  if (new Date() > new Date(invitation.expiresAt)) {
    throwError(400, 'Invitation has expired.');
  }

  // Get inviter's profile for first name
  const inviterResult = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `USER#${invitation.invitedBy}`, SK: 'PROFILE' },
  }));
  const inviterProfile = inviterResult.Item || {};
  const inviterFirstName = inviterProfile.firstName || 'Someone';

  // Get budget name
  const budgetResult = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `BUDGET#${invitation.budgetId}`, SK: 'METADATA' },
  }));
  const budgetName = budgetResult.Item?.name || 'Family Budget';

  // Check if invitee email has an existing account
  // Scan USER# PROFILE records for matching email — acceptable for this low-frequency operation
  const emailCheckResult = await dynamodb.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'SK = :profile AND #email = :email',
    ExpressionAttributeNames: { '#email': 'email' },
    ExpressionAttributeValues: {
      ':profile': 'PROFILE',
      ':email': invitation.invitedEmail,
    },
    Limit: 1,
  }));
  const userExists = (emailCheckResult.Items || []).length > 0;

  logger.info('Invitation preview fetched', {
    budgetId: invitation.budgetId,
    invitedEmail: invitation.invitedEmail,
    userExists,
  });

  return successResponse({
    inviterFirstName,
    inviteeEmail: invitation.invitedEmail,
    budgetName,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    userExists,
  });
}

// ---------------------------------------------------------------------------
// handleAcceptInvitation — REQ-6
// POST /budgets/accept-invitation
// ---------------------------------------------------------------------------

async function handleAcceptInvitation(event, userId) {
  const body = parseRequestBody(event.body);
  const { token } = body;

  if (!token) throwError(400, 'Token is required.');

  const hashedToken = hashToken(token);

  // Find invitation by hashed token — scan for INVITATION# items matching the token hash
  // Note: begins_with in FilterExpression works on string attributes (not keys), so this is valid
  let scanResult;
  try {
    scanResult = await dynamodb.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :invPrefix) AND tokenHash = :token AND #status = :pending',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':invPrefix': 'INVITATION#',
        ':token': hashedToken,
        ':pending': 'pending',
      },
    }));
  } catch (scanErr) {
    logger.error('ScanCommand failed in handleAcceptInvitation', { error: scanErr.message });
    throwError(400, 'Invalid invitation token.');
  }

  if (!scanResult || !scanResult.Items || scanResult.Items.length === 0) {
    throwError(404, 'Invitation not found or already used.');
  }

  const invitation = scanResult.Items[0];

  // Require logged-in email matches invitedEmail
  const acceptingEmail = event.requestContext?.authorizer?.claims?.email || '';
  if (
    invitation.invitedEmail &&
    acceptingEmail &&
    invitation.invitedEmail.toLowerCase() !== acceptingEmail.toLowerCase()
  ) {
    throwError(403, 'This invitation was sent to a different email address.');
  }

  // Check invitation expiry
  if (new Date() > new Date(invitation.expiresAt)) {
    await dynamodb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: invitation.PK, SK: invitation.SK },
      UpdateExpression: 'SET #status = :expired',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':expired': 'expired' },
    }));
    throwError(400, 'Invitation has expired. Please request a new invitation.');
  }

  const { budgetId, role: inviteRole, viewerExpiresAt, accessLabel } = invitation;

  // Verify budget still exists and is active
  const budgetResult = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `BUDGET#${budgetId}`, SK: 'METADATA' },
  }));

  if (!budgetResult.Item || budgetResult.Item.status === 'deleted') {
    throwError(404, 'Budget not found or has been deleted.');
  }

  if (budgetResult.Item.status === 'archived') {
    throwError(400, 'This budget is archived and is no longer accepting new members.');
  }

  // For partner role on family budget: enforce max 1 partner
  if (inviteRole === 'partner' && budgetResult.Item.budgetType === 'family') {
    const partnersResult = await dynamodb.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: '#role = :partner AND #status = :active',
      ExpressionAttributeNames: { '#role': 'role', '#status': 'status' },
      ExpressionAttributeValues: {
        ':pk': `BUDGET#${budgetId}`,
        ':skPrefix': 'MEMBER#',
        ':partner': 'partner',
        ':active': 'active',
      },
    }));
    if ((partnersResult.Items || []).length > 0) {
      throwError(409, 'This budget already has a partner.');
    }
  }

  const now = new Date().toISOString();

  // Create membership record
  await dynamodb.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `BUDGET#${budgetId}`,
      SK: `MEMBER#${userId}`,
      GSI1PK: `USER#${userId}`,
      GSI1SK: `BUDGET#${budgetId}`,
      budgetId,
      userId,
      role: inviteRole,
      status: 'active',
      accessLabel: accessLabel || null,
      joinedAt: now,
      invitedBy: invitation.invitedBy,
      expiresAt: viewerExpiresAt || null,
      historyAccess: 'full',
      createdAt: now,
    },
  }));

  // Update user profile: set defaultBudgetId to new budget, onboardingCompleted = true
  // No familyId written
  await dynamodb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
    UpdateExpression: 'SET defaultBudgetId = :budgetId, onboardingCompleted = :completed, updatedAt = :now',
    ExpressionAttributeValues: {
      ':budgetId': budgetId,
      ':completed': true,
      ':now': now,
    },
  }));

  // Mark invitation as accepted
  await dynamodb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: invitation.PK, SK: invitation.SK },
    UpdateExpression: 'SET #status = :accepted, acceptedAt = :now, acceptedBy = :userId',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':accepted': 'accepted',
      ':now': now,
      ':userId': userId,
    },
  }));

  logger.info('Invitation accepted', { userId, budgetId, role: inviteRole });

  return successResponse({
    budgetId,
    role: inviteRole,
    message: 'Invitation accepted. You are now a member of this budget.',
  });
}

// ---------------------------------------------------------------------------
// handleGetMembers — REQ-7
// GET /budgets/{budgetId}/members
// ---------------------------------------------------------------------------

async function handleGetMembers(userId, budgetId) {
  // Resolve access — any active member can view the member list
  const { role, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers, budgetId);
  BudgetAccessResolver.assertPermission(role, 'budget.read', budgetStatus);

  const membersResult = await dynamodb.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: {
      ':pk': `BUDGET#${budgetId}`,
      ':skPrefix': 'MEMBER#',
    },
  }));

  const members = await Promise.all(
    (membersResult.Items || []).map(async (member) => {
      const memberUserId = member.SK.replace('MEMBER#', '');
      const profileResult = await dynamodb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${memberUserId}`, SK: 'PROFILE' },
      }));
      const profile = profileResult.Item || {};
      return {
        userId: memberUserId,
        email: profile.email || null,
        name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || null,
        role: member.role,
        status: member.status,
        accessLabel: member.accessLabel || null,
        joinedAt: member.joinedAt,
        expiresAt: member.expiresAt || null,
      };
    })
  );

  return successResponse({ budgetId, members });
}

// ---------------------------------------------------------------------------
// handleUpdateMemberRole — REQ-7
// PUT /budgets/{budgetId}/members/{userId}
// ---------------------------------------------------------------------------

async function handleUpdateMemberRole(event, userId, budgetId, targetUserId) {
  const { role, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers, budgetId);
  BudgetAccessResolver.assertPermission(role, 'member.remove', budgetStatus); // owner-only

  if (targetUserId === userId) throwError(400, 'You cannot change your own role.');

  const body = parseRequestBody(event.body);
  const { role: newRole, accessLabel = null } = body;

  const validRoles = ['partner', 'household_member', 'viewer'];
  if (!newRole || !validRoles.includes(newRole)) {
    throwError(400, `Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  const memberResult = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `BUDGET#${budgetId}`, SK: `MEMBER#${targetUserId}` },
  }));

  if (!memberResult.Item) throwError(404, 'Member not found.');

  const now = new Date().toISOString();
  await dynamodb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: `BUDGET#${budgetId}`, SK: `MEMBER#${targetUserId}` },
    UpdateExpression: 'SET #role = :role, accessLabel = :label, updatedAt = :now',
    ExpressionAttributeNames: { '#role': 'role' },
    ExpressionAttributeValues: { ':role': newRole, ':label': accessLabel, ':now': now },
  }));

  logger.info('Member role updated', { userId, budgetId, targetUserId, newRole });
  return successResponse({ userId: targetUserId, role: newRole, updatedAt: now });
}

// ---------------------------------------------------------------------------
// handleRemoveMember — REQ-8
// DELETE /budgets/{budgetId}/members/{userId}
// ---------------------------------------------------------------------------

async function handleRemoveMember(userId, budgetId, targetUserId) {
  const { role, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers, budgetId);
  BudgetAccessResolver.assertPermission(role, 'member.remove', budgetStatus); // owner-only

  if (targetUserId === userId) throwError(400, 'You cannot remove yourself. Use the leave endpoint instead.');

  const memberResult = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `BUDGET#${budgetId}`, SK: `MEMBER#${targetUserId}` },
  }));

  if (!memberResult.Item) throwError(404, 'Member not found.');

  // Delete membership
  await dynamodb.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { PK: `BUDGET#${budgetId}`, SK: `MEMBER#${targetUserId}` },
  }));

  // Restore defaultBudgetId for removed user
  await restoreDefaultBudget(targetUserId, budgetId);

  logger.info('Member removed', { userId, budgetId, targetUserId });
  return successResponse({ message: 'Member removed successfully.', userId: targetUserId });
}

// ---------------------------------------------------------------------------
// handleLeaveBudget — REQ-8
// POST /budgets/{budgetId}/leave
// ---------------------------------------------------------------------------

async function handleLeaveBudget(userId, budgetId) {
  const { role } =
    await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers, budgetId);

  if (role === 'owner') {
    throwError(400, 'You cannot leave a budget you own. Archive the budget instead.');
  }

  // Delete membership
  await dynamodb.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { PK: `BUDGET#${budgetId}`, SK: `MEMBER#${userId}` },
  }));

  // Restore defaultBudgetId to personal budget
  await restoreDefaultBudget(userId, budgetId);

  logger.info('User left budget', { userId, budgetId });
  return successResponse({ message: 'You have left the budget.' });
}

// ---------------------------------------------------------------------------
// handleGetInvitations — REQ-5
// GET /budgets/{budgetId}/invitations
// ---------------------------------------------------------------------------

async function handleGetInvitations(userId, budgetId) {
  const { role, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers, budgetId);
  BudgetAccessResolver.assertPermission(role, 'member.invite', budgetStatus);

  // Query invitations by budgetId using a scan with filter
  // (GSI4 is keyed by email, not budgetId — we must scan with filter)
  const result = await dynamodb.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'budgetId = :budgetId AND #status = :pending',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':budgetId': budgetId, ':pending': 'pending' },
  }));

  const invitations = (result.Items || []).map(inv => ({
    invitationId: inv.invitationId,
    email: inv.invitedEmail,
    role: inv.role,
    accessLabel: inv.accessLabel || null,
    status: inv.status,
    createdAt: inv.createdAt,
    expiresAt: inv.expiresAt,
    viewerExpiresAt: inv.viewerExpiresAt || null,
  }));

  return successResponse({ budgetId, invitations, count: invitations.length });
}

// ---------------------------------------------------------------------------
// handleResendInvitation — REQ-5
// POST /budgets/{budgetId}/invitations/{id}/resend
// ---------------------------------------------------------------------------

async function handleResendInvitation(event, userId, budgetId, invitationId) {
  const { role, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers, budgetId);
  BudgetAccessResolver.assertPermission(role, 'member.invite', budgetStatus);

  const invResult = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `INVITATION#${invitationId}`, SK: 'METADATA' },
  }));

  if (!invResult.Item) throwError(404, 'Invitation not found.');

  const invitation = invResult.Item;

  if (invitation.budgetId !== budgetId) {
    throwError(403, 'Invitation does not belong to this budget.');
  }

  if (invitation.status !== 'pending') {
    throwError(400, `Cannot resend invitation with status: ${invitation.status}`);
  }

  // Note: we intentionally allow resending expired invitations — that's the purpose of resend.
  // The new token gets a fresh 7-day expiry below.

  // Generate a new token and reset expiry to 7 days from now
  const newToken = generateSecureToken();
  const hashedToken = hashToken(newToken);
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await dynamodb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: invitation.PK, SK: invitation.SK },
    UpdateExpression: 'SET tokenHash = :token, #tk = :token, expiresAt = :expires, updatedAt = :now',
    ExpressionAttributeNames: { '#tk': 'token' },
    ExpressionAttributeValues: {
      ':token': hashedToken,
      ':expires': newExpiresAt,
      ':now': new Date().toISOString(),
    },
  }));

  await sendInvitationEmail(
    event, userId, invitation.invitedEmail, invitation.role,
    newToken, newExpiresAt, budgetId
  ).catch(err => {
    logger.error('Failed to resend invitation email', err, { invitationId });
    throwError(500, 'Failed to send email. Please try again.');
  });

  return successResponse({
    invitationId,
    email: invitation.invitedEmail,
    message: 'Invitation resent successfully.',
  });
}

// ---------------------------------------------------------------------------
// handleRevokeInvitation — REQ-5
// DELETE /budgets/{budgetId}/invitations/{id}
// ---------------------------------------------------------------------------

async function handleRevokeInvitation(userId, budgetId, invitationId) {
  const { role, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers, budgetId);
  BudgetAccessResolver.assertPermission(role, 'member.invite', budgetStatus);

  const invResult = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `INVITATION#${invitationId}`, SK: 'METADATA' },
  }));

  if (!invResult.Item) throwError(404, 'Invitation not found.');

  if (invResult.Item.budgetId !== budgetId) {
    throwError(403, 'Invitation does not belong to this budget.');
  }

  await dynamodb.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { PK: `INVITATION#${invitationId}`, SK: 'METADATA' },
  }));

  logger.info('Invitation revoked', { userId, budgetId, invitationId });
  return successResponse({
    message: 'Invitation revoked successfully.',
    invitationId,
    email: invResult.Item.invitedEmail,
  });
}

// ---------------------------------------------------------------------------
// handleExtendViewerAccess — REQ-7
// PUT /budgets/{budgetId}/members/{userId}/extend
// ---------------------------------------------------------------------------

async function handleExtendViewerAccess(event, userId, budgetId, targetUserId) {
  const { role, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers, budgetId);
  BudgetAccessResolver.assertPermission(role, 'member.remove', budgetStatus); // owner-only

  const body = parseRequestBody(event.body);
  const { expiresAt } = body;

  if (!expiresAt) throwError(400, 'expiresAt is required.');

  const newExpiry = new Date(expiresAt);
  if (isNaN(newExpiry.getTime())) throwError(400, 'Invalid expiresAt date format.');
  if (newExpiry <= new Date()) throwError(400, 'New expiry date must be in the future.');

  const memberResult = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `BUDGET#${budgetId}`, SK: `MEMBER#${targetUserId}` },
  }));

  if (!memberResult.Item) throwError(404, 'Member not found.');
  if (memberResult.Item.role !== 'viewer') throwError(400, 'Only viewer access can be extended.');

  const now = new Date().toISOString();
  await dynamodb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: `BUDGET#${budgetId}`, SK: `MEMBER#${targetUserId}` },
    UpdateExpression: 'SET expiresAt = :expiresAt, #status = :active, updatedAt = :now',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':expiresAt': expiresAt, ':active': 'active', ':now': now },
  }));

  logger.info('Viewer access extended', { userId, budgetId, targetUserId, expiresAt });
  return successResponse({ userId: targetUserId, expiresAt, message: 'Viewer access extended.' });
}

// ---------------------------------------------------------------------------
// handleArchiveBudget — REQ-15
// PUT /budgets/{budgetId}/archive
// ---------------------------------------------------------------------------

async function handleArchiveBudget(userId, budgetId) {
  const { role, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers, budgetId);
  BudgetAccessResolver.assertPermission(role, 'budget.archive', budgetStatus);

  if (budgetStatus === 'archived') {
    throwError(400, 'Budget is already archived.');
  }

  const now = new Date().toISOString();

  // Set budget status to archived
  await dynamodb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: `BUDGET#${budgetId}`, SK: 'METADATA' },
    UpdateExpression: 'SET #status = :archived, updatedAt = :now',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':archived': 'archived', ':now': now },
  }));

  // Update defaultBudgetId for all members whose defaultBudgetId is this budget
  await updateAffectedMembersDefaultBudget(budgetId);

  logger.info('Budget archived', { userId, budgetId });
  return successResponse({ budgetId, status: 'archived', message: 'Budget archived.' });
}

// ---------------------------------------------------------------------------
// handleRestoreBudget — REQ-15
// PUT /budgets/{budgetId}/restore
// ---------------------------------------------------------------------------

async function handleRestoreBudget(userId, budgetId) {
  // For restore, we need to bypass the archived read-only check in resolveAccess
  // by reading the budget directly
  const profile = await dynamoHelpers.getItem(`USER#${userId}`, 'PROFILE');
  if (!profile) throwError(403, 'User profile not found.');

  const membership = await dynamoHelpers.getItem(`BUDGET#${budgetId}`, `MEMBER#${userId}`);
  if (!membership || membership.status === 'revoked' || membership.status === 'left') {
    throwError(403, 'You do not have access to this budget.');
  }

  if (membership.role !== 'owner') {
    throwError(403, 'You do not have permission to perform this action.');
  }

  const budget = await dynamoHelpers.getItem(`BUDGET#${budgetId}`, 'METADATA');
  if (!budget) throwError(404, 'Budget not found.');
  if (budget.status === 'deleted') throwError(403, 'This budget has been deleted.');
  if (budget.status === 'active') throwError(400, 'Budget is already active.');

  const now = new Date().toISOString();
  await dynamodb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: `BUDGET#${budgetId}`, SK: 'METADATA' },
    UpdateExpression: 'SET #status = :active, updatedAt = :now',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':active': 'active', ':now': now },
  }));

  logger.info('Budget restored', { userId, budgetId });
  return successResponse({ budgetId, status: 'active', message: 'Budget restored.' });
}

// ---------------------------------------------------------------------------
// handleDeleteBudget — REQ-15
// DELETE /budgets/{budgetId}
// ---------------------------------------------------------------------------

async function handleDeleteBudget(userId, budgetId) {
  const { role, budgetType, budgetStatus } =
    await BudgetAccessResolver.resolveAccess(userId, dynamoHelpers, budgetId);
  BudgetAccessResolver.assertPermission(role, 'budget.delete', budgetStatus);

  // Block deletion of personal budgets
  if (budgetType === 'personal') {
    throwError(400, 'You cannot delete your personal budget.');
  }

  const now = new Date().toISOString();

  // Soft delete — set status to deleted
  await dynamodb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: `BUDGET#${budgetId}`, SK: 'METADATA' },
    UpdateExpression: 'SET #status = :deleted, updatedAt = :now',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':deleted': 'deleted', ':now': now },
  }));

  // Update defaultBudgetId for all affected members
  await updateAffectedMembersDefaultBudget(budgetId);

  logger.info('Budget deleted (soft)', { userId, budgetId });
  return successResponse({ budgetId, status: 'deleted', message: 'Budget deleted.' });
}

// ---------------------------------------------------------------------------
// Helper: restoreDefaultBudget
// After a user leaves or is removed from a budget, restore their defaultBudgetId
// to their personal budget. If not found, create a new personal budget.
// ---------------------------------------------------------------------------

async function restoreDefaultBudget(targetUserId, leavingBudgetId) {
  // Query all active memberships for the user via GSI1
  const membershipsResult = await dynamodb.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :userKey',
    ExpressionAttributeValues: { ':userKey': `USER#${targetUserId}` },
  }));

  const memberships = (membershipsResult.Items || []).filter(
    m => m.status === 'active' && m.budgetId !== leavingBudgetId
  );

  // Find personal budget where user is owner
  let personalBudgetId = null;
  for (const m of memberships) {
    if (m.role === 'owner') {
      const budgetResult = await dynamodb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `BUDGET#${m.budgetId}`, SK: 'METADATA' },
      }));
      if (budgetResult.Item && budgetResult.Item.budgetType === 'personal' &&
          budgetResult.Item.status === 'active') {
        personalBudgetId = m.budgetId;
        break;
      }
    }
  }

  // If no personal budget found, create a new one
  if (!personalBudgetId) {
    logger.warn('No personal budget found for user, creating new one', { targetUserId });

    // Get user profile for name
    const profileResult = await dynamodb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${targetUserId}`, SK: 'PROFILE' },
    }));
    const profile = profileResult.Item || {};
    const firstName = profile.firstName || 'My';

    const newBudgetId = generateId.budget();
    const now = new Date().toISOString();

    await dynamodb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `BUDGET#${newBudgetId}`,
        SK: 'METADATA',
        budgetId: newBudgetId,
        name: `${firstName}'s Budget`,
        budgetType: 'personal',
        ownerUserId: targetUserId,
        currency: profile.currency || 'USD',
        country: profile.country || 'US',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
    }));

    await dynamodb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `BUDGET#${newBudgetId}`,
        SK: `MEMBER#${targetUserId}`,
        GSI1PK: `USER#${targetUserId}`,
        GSI1SK: `BUDGET#${newBudgetId}`,
        budgetId: newBudgetId,
        userId: targetUserId,
        role: 'owner',
        status: 'active',
        accessLabel: null,
        joinedAt: now,
        invitedBy: null,
        expiresAt: null,
        historyAccess: 'full',
        createdAt: now,
      },
    }));

    personalBudgetId = newBudgetId;
  }

  // Update user's defaultBudgetId
  await dynamodb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: `USER#${targetUserId}`, SK: 'PROFILE' },
    UpdateExpression: 'SET defaultBudgetId = :budgetId, updatedAt = :now',
    ExpressionAttributeValues: {
      ':budgetId': personalBudgetId,
      ':now': new Date().toISOString(),
    },
  }));

  logger.info('Restored defaultBudgetId', { targetUserId, personalBudgetId });
}

// ---------------------------------------------------------------------------
// Helper: updateAffectedMembersDefaultBudget
// After archive/delete, update defaultBudgetId for all members whose
// defaultBudgetId points to this budget.
// ---------------------------------------------------------------------------

async function updateAffectedMembersDefaultBudget(budgetId) {
  // Get all members of this budget
  const membersResult = await dynamodb.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: {
      ':pk': `BUDGET#${budgetId}`,
      ':skPrefix': 'MEMBER#',
    },
  }));

  const members = membersResult.Items || [];

  await Promise.all(
    members.map(async (member) => {
      const memberUserId = member.SK.replace('MEMBER#', '');

      // Check if this budget is their defaultBudgetId
      const profileResult = await dynamodb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${memberUserId}`, SK: 'PROFILE' },
      }));

      if (profileResult.Item && profileResult.Item.defaultBudgetId === budgetId) {
        await restoreDefaultBudget(memberUserId, budgetId);
      }
    })
  );
}

// ---------------------------------------------------------------------------
// Helper: sendInvitationEmail
// Send invitation email via the email Lambda. Non-fatal — caller should catch.
// ---------------------------------------------------------------------------

async function sendInvitationEmail(event, userId, email, role, token, expiresAt, budgetId) {
  const inviterResult = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
  }));

  const inviter = inviterResult.Item || {};
  const inviterName = `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() || 'BudgetBuddy User';
  const inviterFirstName = inviter.firstName || inviterName.split(' ')[0] || 'Someone';
  const inviterEmail = inviter.email || 'noreply@budgetbuddy.com';

  const acceptUrl = `${process.env.WEB_APP_URL || 'https://app.budgetbuddy.com'}/budgets/accept?token=${token}`;

  const emailPayload = {
    invitedEmail: email.toLowerCase(),
    inviterName,
    inviterFirstName,
    inviterEmail,
    role: role.charAt(0).toUpperCase() + role.slice(1),
    acceptUrl,
    expiresAt,
    budgetId,
  };

  const apiUrl = process.env.BUDGETS_API_URL || process.env.FAMILY_API_URL;

  if (!apiUrl) {
    logger.warn('BUDGETS_API_URL not set — invitation email not sent', { email, budgetId });
    return;
  }

  const authHeader = event.headers?.Authorization || event.headers?.authorization;

  const emailResponse = await fetch(`${apiUrl}/email/send-invitation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify(emailPayload),
  });

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    logger.error('Email service returned error', null, {
      status: emailResponse.status,
      error: errorText,
      email,
    });
    throw new Error(`Email service error: ${emailResponse.status}`);
  }

  logger.info('Invitation email sent', { email, budgetId });
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/** Generate cryptographically secure token (32 bytes hex) */
function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

/** Hash token using SHA-256 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Validate email format */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
