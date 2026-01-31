/**
 * Family Lambda Function
 *
 * Handles family collaboration features including:
 * - Sending invitations to join family
 * - Accepting family invitations
 * - Managing family members (view, update role, remove)
 * - Leaving family
 *
 * All endpoints require JWT authentication and enforce role-based permissions.
 */

const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || "budgetbuddy-main";

/**
 * CORS headers for all responses
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

/**
 * Main Lambda handler
 * Routes requests to appropriate handler based on HTTP method and path
 */
exports.handler = async (event) => {
  console.log("Family Lambda invoked:", JSON.stringify(event, null, 2));

  // Handle OPTIONS requests for CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  try {
    // Extract user info from JWT token (added by authorizer)
    const user = event.requestContext?.authorizer?.claims;
    if (!user) {
      return errorResponse(401, "Unauthorized - No user context");
    }

    const userId = user["custom:userId"];
    const familyId = user["custom:familyId"];
    const familyRole = user["custom:familyRole"] || "primary";

    // Route to appropriate handler
    const { httpMethod, path, pathParameters } = event;

    if (httpMethod === "POST" && path === "/family/invite") {
      return await handleInvite(event, userId, familyId, familyRole);
    }

    if (httpMethod === "POST" && path === "/family/accept-invitation") {
      return await handleAcceptInvitation(event, userId);
    }

    if (httpMethod === "GET" && path === "/family/members") {
      return await handleGetMembers(familyId);
    }

    if (httpMethod === "PUT" && path.startsWith("/family/members/")) {
      const targetUserId = pathParameters?.userId;
      return await handleUpdateRole(
        event,
        userId,
        familyId,
        familyRole,
        targetUserId,
      );
    }

    if (httpMethod === "DELETE" && path.startsWith("/family/members/")) {
      const targetUserId = pathParameters?.userId;
      return await handleRemoveMember(
        userId,
        familyId,
        familyRole,
        targetUserId,
      );
    }

    if (httpMethod === "POST" && path === "/family/leave") {
      return await handleLeaveFamily(userId, familyId, familyRole);
    }

    return errorResponse(404, "Endpoint not found");
  } catch (error) {
    console.error("Error in family handler:", error);
    return errorResponse(500, "Internal server error", error.message);
  }
};

/**
 * Handler implementations
 */

/**
 * Send invitation to join family
 *
 * Requirements:
 * - User must be primary
 * - Family must not be full (< 2 members)
 * - No pending invitation for email
 * - Generate secure token
 * - Create invitation record
 * - Send email via SES
 */
async function handleInvite(event, userId, familyId, familyRole) {
  try {
    // Validate user is primary
    if (familyRole !== "primary") {
      return errorResponse(403, "Only primary user can send invitations");
    }

    // Parse request body
    const body = JSON.parse(event.body || "{}");
    const { email, role } = body;

    // Validate input
    if (!email || !isValidEmail(email)) {
      return errorResponse(400, "Invalid email address");
    }

    if (!role || !["spouse", "viewer"].includes(role)) {
      return errorResponse(400, 'Invalid role. Must be "spouse" or "viewer"');
    }

    // Get family metadata to check member count
    const familyResult = await dynamodb
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: "METADATA",
        },
      })
      .promise();

    if (!familyResult.Item) {
      return errorResponse(404, "Family not found");
    }

    const family = familyResult.Item;

    // Check if family is full (max 2 members)
    if (family.memberCount >= 2) {
      return errorResponse(409, "Family is full. Maximum 2 members allowed");
    }

    // Check for existing pending invitation for this email
    const existingInvitations = await dynamodb
      .query({
        TableName: TABLE_NAME,
        IndexName: "GSI4",
        KeyConditionExpression: "GSI4PK = :email",
        FilterExpression: "#status = :pending AND familyId = :familyId",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":email": `INVITATION#${email.toLowerCase()}`,
          ":pending": "pending",
          ":familyId": familyId,
        },
      })
      .promise();

    if (existingInvitations.Items && existingInvitations.Items.length > 0) {
      return errorResponse(
        409,
        "Pending invitation already exists for this email",
      );
    }

    // Generate secure invitation token
    const token = generateSecureToken();
    const hashedToken = hashToken(token);

    // Create invitation record
    const invitationId = uuidv4();
    const now = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(); // 7 days

    const invitation = {
      PK: `INVITATION#${invitationId}`,
      SK: "METADATA",
      GSI4PK: `INVITATION#${email.toLowerCase()}`,
      GSI4SK: `CREATED#${now}`,
      invitationId,
      familyId,
      invitedBy: userId,
      invitedEmail: email.toLowerCase(),
      role,
      token: hashedToken,
      status: "pending",
      createdAt: now,
      expiresAt,
    };

    await dynamodb
      .put({
        TableName: TABLE_NAME,
        Item: invitation,
      })
      .promise();

    console.log("Invitation created:", invitationId);

    // TODO: Send email via SES (will be implemented in Phase 4)
    // For now, we'll just log the token
    console.log("Invitation token (for testing):", token);

    // Return invitation details (without hashed token)
    return successResponse(
      {
        invitationId,
        email: email.toLowerCase(),
        role,
        expiresAt,
        status: "pending",
        // Include token in response for testing (remove in production)
        token,
      },
      201,
    );
  } catch (error) {
    console.error("Error in handleInvite:", error);
    return errorResponse(500, "Failed to create invitation", error.message);
  }
}

async function handleAcceptInvitation(_event, _userId) {
  // TODO: Implement in task 2.3
  return errorResponse(501, "Not implemented yet");
}

async function handleGetMembers(_familyId) {
  // TODO: Implement in task 2.4
  return errorResponse(501, "Not implemented yet");
}

async function handleUpdateRole(
  _event,
  _userId,
  _familyId,
  _familyRole,
  _targetUserId,
) {
  // TODO: Implement in task 2.5
  return errorResponse(501, "Not implemented yet");
}

async function handleRemoveMember(
  _userId,
  _familyId,
  _familyRole,
  _targetUserId,
) {
  // TODO: Implement in task 2.6
  return errorResponse(501, "Not implemented yet");
}

async function handleLeaveFamily(_userId, _familyId, _familyRole) {
  // TODO: Implement in task 2.7
  return errorResponse(501, "Not implemented yet");
}

/**
 * Helper function to create success response
 */
function successResponse(data, statusCode = 200) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(data),
  };
}

/**
 * Helper function to create error response
 */
function errorResponse(statusCode, message, details = null) {
  const body = { error: message };
  if (details) {
    body.details = details;
  }
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

/**
 * Utility functions
 */

/**
 * Generate cryptographically secure token (32 bytes)
 */
function generateSecureToken() {
  const crypto = require("crypto");
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash token using SHA-256
 */
function hashToken(token) {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
