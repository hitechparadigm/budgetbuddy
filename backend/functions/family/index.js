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

    if (httpMethod === "GET" && path === "/family/health") {
      return successResponse({ status: "healthy", service: "family" });
    }

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

/**
 * Accept family invitation
 *
 * Requirements:
 * - Validate token
 * - Check invitation not expired
 * - Check family not full
 * - Add user to family
 * - Update invitation status
 * - Return family details
 */
async function handleAcceptInvitation(event, userId) {
  try {
    // Parse request body
    const body = JSON.parse(event.body || "{}");
    const { token } = body;

    if (!token) {
      return errorResponse(400, "Token is required");
    }

    // Hash the token to look up invitation
    const hashedToken = hashToken(token);

    // Find invitation by hashed token
    // We need to scan since token is not a key
    const scanResult = await dynamodb
      .scan({
        TableName: TABLE_NAME,
        FilterExpression:
          "begins_with(PK, :invPrefix) AND #token = :token AND #status = :pending",
        ExpressionAttributeNames: {
          "#token": "token",
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":invPrefix": "INVITATION#",
          ":token": hashedToken,
          ":pending": "pending",
        },
      })
      .promise();

    if (!scanResult.Items || scanResult.Items.length === 0) {
      return errorResponse(404, "Invitation not found or already used");
    }

    const invitation = scanResult.Items[0];

    // Check if invitation is expired
    const now = new Date();
    const expiresAt = new Date(invitation.expiresAt);

    if (now > expiresAt) {
      // Update invitation status to expired
      await dynamodb
        .update({
          TableName: TABLE_NAME,
          Key: {
            PK: invitation.PK,
            SK: invitation.SK,
          },
          UpdateExpression: "SET #status = :expired",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":expired": "expired",
          },
        })
        .promise();

      return errorResponse(400, "Invitation has expired");
    }

    // Get family metadata to check member count
    const familyResult = await dynamodb
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${invitation.familyId}`,
          SK: "METADATA",
        },
      })
      .promise();

    if (!familyResult.Item) {
      return errorResponse(404, "Family not found");
    }

    const family = familyResult.Item;

    // Check if family is full
    if (family.memberCount >= 2) {
      return errorResponse(409, "Family is full. Maximum 2 members allowed");
    }

    // Add user to family
    const joinedAt = new Date().toISOString();

    await dynamodb
      .put({
        TableName: TABLE_NAME,
        Item: {
          PK: `FAMILY#${invitation.familyId}`,
          SK: `MEMBER#${userId}`,
          userId,
          role: invitation.role,
          joinedAt,
          addedBy: invitation.invitedBy,
        },
      })
      .promise();

    // Update family member count
    await dynamodb
      .update({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${invitation.familyId}`,
          SK: "METADATA",
        },
        UpdateExpression: "SET memberCount = memberCount + :inc",
        ExpressionAttributeValues: {
          ":inc": 1,
        },
      })
      .promise();

    // Update invitation status to accepted
    await dynamodb
      .update({
        TableName: TABLE_NAME,
        Key: {
          PK: invitation.PK,
          SK: invitation.SK,
        },
        UpdateExpression:
          "SET #status = :accepted, acceptedAt = :acceptedAt, acceptedBy = :acceptedBy",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":accepted": "accepted",
          ":acceptedAt": joinedAt,
          ":acceptedBy": userId,
        },
      })
      .promise();

    // Update user's familyId and role in Cognito
    // This will be handled by the auth service when user logs in next time
    // For now, we'll just return the family details

    console.log(
      `User ${userId} accepted invitation and joined family ${invitation.familyId}`,
    );

    // Return family details
    return successResponse({
      familyId: invitation.familyId,
      role: invitation.role,
      family: {
        primaryUserId: family.primaryUserId,
        memberCount: family.memberCount + 1,
        subscriptionTier: family.subscriptionTier,
      },
    });
  } catch (error) {
    console.error("Error in handleAcceptInvitation:", error);
    return errorResponse(500, "Failed to accept invitation", error.message);
  }
}

/**
 * Get all family members
 *
 * Requirements:
 * - Query family members
 * - Include user details
 * - Return member list
 */
async function handleGetMembers(familyId) {
  try {
    // Query all members of the family
    const membersResult = await dynamodb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression:
          "PK = :familyPK AND begins_with(SK, :memberPrefix)",
        ExpressionAttributeValues: {
          ":familyPK": `FAMILY#${familyId}`,
          ":memberPrefix": "MEMBER#",
        },
      })
      .promise();

    if (!membersResult.Items || membersResult.Items.length === 0) {
      return successResponse({
        familyId,
        members: [],
      });
    }

    // Get user details for each member
    const members = await Promise.all(
      membersResult.Items.map(async (member) => {
        // Get user profile
        const userResult = await dynamodb
          .get({
            TableName: TABLE_NAME,
            Key: {
              PK: `USER#${member.userId}`,
              SK: "PROFILE",
            },
          })
          .promise();

        const user = userResult.Item || {};

        return {
          userId: member.userId,
          email: user.email || "unknown@example.com",
          name:
            `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
            "Unknown User",
          role: member.role,
          joinedAt: member.joinedAt,
        };
      }),
    );

    return successResponse({
      familyId,
      members,
    });
  } catch (error) {
    console.error("Error in handleGetMembers:", error);
    return errorResponse(500, "Failed to get family members", error.message);
  }
}

/**
 * Update member role
 *
 * Requirements:
 * - Validate user is primary
 * - Update member role
 * - Return updated member
 */
async function handleUpdateRole(
  event,
  userId,
  familyId,
  familyRole,
  targetUserId,
) {
  try {
    // Validate user is primary
    if (familyRole !== "primary") {
      return errorResponse(403, "Only primary user can change member roles");
    }

    // Parse request body
    const body = JSON.parse(event.body || "{}");
    const { role } = body;

    // Validate role
    if (!role || !["spouse", "viewer"].includes(role)) {
      return errorResponse(400, 'Invalid role. Must be "spouse" or "viewer"');
    }

    // Cannot change primary user's role
    if (targetUserId === userId) {
      return errorResponse(400, "Cannot change your own role");
    }

    // Check if member exists
    const memberResult = await dynamodb
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: `MEMBER#${targetUserId}`,
        },
      })
      .promise();

    if (!memberResult.Item) {
      return errorResponse(404, "Member not found");
    }

    // Update member role
    const updatedAt = new Date().toISOString();

    await dynamodb
      .update({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: `MEMBER#${targetUserId}`,
        },
        UpdateExpression: "SET #role = :role, updatedAt = :updatedAt",
        ExpressionAttributeNames: {
          "#role": "role",
        },
        ExpressionAttributeValues: {
          ":role": role,
          ":updatedAt": updatedAt,
        },
      })
      .promise();

    console.log(
      `User ${userId} updated role of ${targetUserId} to ${role} in family ${familyId}`,
    );

    return successResponse({
      userId: targetUserId,
      role,
      updatedAt,
    });
  } catch (error) {
    console.error("Error in handleUpdateRole:", error);
    return errorResponse(500, "Failed to update member role", error.message);
  }
}

/**
 * Remove family member
 *
 * Requirements:
 * - Validate user is primary
 * - Prevent removing self
 * - Remove member from family
 * - Send notification email
 */
async function handleRemoveMember(userId, familyId, familyRole, targetUserId) {
  try {
    // Validate user is primary
    if (familyRole !== "primary") {
      return errorResponse(403, "Only primary user can remove members");
    }

    // Cannot remove self
    if (targetUserId === userId) {
      return errorResponse(400, "Cannot remove yourself from the family");
    }

    // Check if member exists
    const memberResult = await dynamodb
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: `MEMBER#${targetUserId}`,
        },
      })
      .promise();

    if (!memberResult.Item) {
      return errorResponse(404, "Member not found");
    }

    // Remove member from family
    await dynamodb
      .delete({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: `MEMBER#${targetUserId}`,
        },
      })
      .promise();

    // Update family member count
    await dynamodb
      .update({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: "METADATA",
        },
        UpdateExpression: "SET memberCount = memberCount - :dec",
        ExpressionAttributeValues: {
          ":dec": 1,
        },
      })
      .promise();

    // TODO: Send notification email (will be implemented in Phase 4)
    console.log(
      `User ${userId} removed ${targetUserId} from family ${familyId}`,
    );

    return successResponse({
      message: "Member removed successfully",
      userId: targetUserId,
    });
  } catch (error) {
    console.error("Error in handleRemoveMember:", error);
    return errorResponse(500, "Failed to remove member", error.message);
  }
}

/**
 * Leave family
 *
 * Requirements:
 * - Validate user is not primary
 * - Create new family for user
 * - Copy current budget
 * - Remove from old family
 */
async function handleLeaveFamily(userId, familyId, familyRole) {
  try {
    // Validate user is not primary
    if (familyRole === "primary") {
      return errorResponse(
        403,
        "Primary user cannot leave family. Transfer ownership or delete family instead",
      );
    }

    // Create new family for the leaving user
    const newFamilyId = uuidv4();
    const now = new Date().toISOString();

    await dynamodb
      .put({
        TableName: TABLE_NAME,
        Item: {
          PK: `FAMILY#${newFamilyId}`,
          SK: "METADATA",
          familyId: newFamilyId,
          primaryUserId: userId,
          createdAt: now,
          memberCount: 1,
          subscriptionTier: "free",
        },
      })
      .promise();

    // Add user as primary member of new family
    await dynamodb
      .put({
        TableName: TABLE_NAME,
        Item: {
          PK: `FAMILY#${newFamilyId}`,
          SK: `MEMBER#${userId}`,
          userId,
          role: "primary",
          joinedAt: now,
          addedBy: userId,
        },
      })
      .promise();

    // Remove user from old family
    await dynamodb
      .delete({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: `MEMBER#${userId}`,
        },
      })
      .promise();

    // Update old family member count
    await dynamodb
      .update({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: "METADATA",
        },
        UpdateExpression: "SET memberCount = memberCount - :dec",
        ExpressionAttributeValues: {
          ":dec": 1,
        },
      })
      .promise();

    // TODO: Copy current budget to new family (will be implemented later)
    // TODO: Send notification email to primary user (will be implemented in Phase 4)

    console.log(
      `User ${userId} left family ${familyId} and created new family ${newFamilyId}`,
    );

    return successResponse({
      message: "Left family successfully",
      newFamilyId,
    });
  } catch (error) {
    console.error("Error in handleLeaveFamily:", error);
    return errorResponse(500, "Failed to leave family", error.message);
  }
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
