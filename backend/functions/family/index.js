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

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

// Initialize DynamoDB Document Client
const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

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
  try {
    console.log("Family Lambda invoked:", JSON.stringify(event, null, 2));

    // Handle OPTIONS requests for CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: "",
      };
    }

    // Handle health check BEFORE authentication (public endpoint)
    if (
      event.httpMethod === "GET" &&
      (event.path === "/family/health" || event.path === "/v1/family/health")
    ) {
      return successResponse({ status: "healthy", service: "family" });
    }

    // Extract user info from JWT token
    // Try authorizer claims first, then fall back to parsing the Authorization header
    let userId, familyId, familyRole;

    const authorizerClaims = event.requestContext?.authorizer?.claims;

    if (authorizerClaims && authorizerClaims["custom:userId"]) {
      // Use authorizer claims if available
      userId = authorizerClaims["custom:userId"];
      familyId = authorizerClaims["custom:familyId"];
      familyRole = authorizerClaims["custom:familyRole"] || "primary";
    } else {
      // Fall back to parsing the Authorization header directly
      const authHeader =
        event.headers?.Authorization || event.headers?.authorization;
      if (!authHeader) {
        return errorResponse(401, "Unauthorized - No authorization header");
      }

      try {
        const token = authHeader.replace("Bearer ", "");
        const tokenParts = token.split(".");
        if (tokenParts.length !== 3) {
          return errorResponse(401, "Unauthorized - Invalid token format");
        }

        const payload = JSON.parse(
          Buffer.from(tokenParts[1], "base64").toString(),
        );

        // Try custom:userId first, fall back to sub
        userId = payload["custom:userId"] || payload.sub;
        familyId = payload["custom:familyId"];
        familyRole = payload["custom:familyRole"] || "primary";

        if (!userId) {
          return errorResponse(401, "Unauthorized - No user ID in token");
        }

        // If familyId is not in token, look it up from DynamoDB
        if (!familyId) {
          console.log(
            "familyId not in token, looking up from DynamoDB for user:",
            userId,
          );
          const userResult = await dynamodb.send(
            new GetCommand({
              TableName: TABLE_NAME,
              Key: {
                PK: `USER#${userId}`,
                SK: "PROFILE",
              },
            }),
          );

          if (userResult.Item) {
            familyId = userResult.Item.familyId;
            familyRole = userResult.Item.familyRole || "primary";
            console.log("Found familyId from DynamoDB:", familyId);
          } else {
            // Create a default family for the user if none exists
            familyId = `family_${userId}`;
            familyRole = "primary";
            console.log(
              "No user profile found, using default familyId:",
              familyId,
            );
          }
        }
      } catch (error) {
        console.error("Error parsing authorization token:", error);
        return errorResponse(401, "Unauthorized - Failed to parse token");
      }
    }

    console.log("Family Lambda - User context:", {
      userId,
      familyId,
      familyRole,
    });

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

    if (httpMethod === "GET" && path === "/family/invitations") {
      return await handleGetInvitations(familyId, familyRole);
    }

    if (
      httpMethod === "POST" &&
      path.startsWith("/family/invitations/") &&
      path.endsWith("/resend")
    ) {
      const invitationId = path.split("/")[3];
      return await handleResendInvitation(
        event,
        userId,
        familyId,
        familyRole,
        invitationId,
      );
    }

    if (httpMethod === "DELETE" && path.startsWith("/family/invitations/")) {
      const invitationId = pathParameters?.invitationId || path.split("/")[3];
      return await handleRevokeInvitation(
        userId,
        familyId,
        familyRole,
        invitationId,
      );
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
    // Auto-create if missing (for legacy users who don't have FAMILY metadata)
    let familyResult = await dynamodb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: "METADATA",
        },
      }),
    );

    // Auto-create family metadata if missing (idempotent operation)
    if (!familyResult.Item) {
      console.log(
        "Family metadata missing, auto-creating for familyId:",
        familyId,
      );
      const now = new Date().toISOString();
      const familyMetadata = {
        PK: `FAMILY#${familyId}`,
        SK: "METADATA",
        familyId,
        primaryUserId: userId,
        createdAt: now,
        memberCount: 1,
        subscriptionTier: "free",
      };

      try {
        await dynamodb.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: familyMetadata,
            ConditionExpression: "attribute_not_exists(PK)", // Idempotent
          }),
        );
        console.log("Created family metadata for familyId:", familyId);
      } catch (conditionError) {
        // If condition fails, another process created it - re-fetch
        if (conditionError.name === "ConditionalCheckFailedException") {
          console.log(
            "Family metadata was created by another process, re-fetching",
          );
          familyResult = await dynamodb.send(
            new GetCommand({
              TableName: TABLE_NAME,
              Key: {
                PK: `FAMILY#${familyId}`,
                SK: "METADATA",
              },
            }),
          );
        } else {
          throw conditionError;
        }
      }

      // Also create MEMBER record for primary user if missing
      try {
        await dynamodb.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              PK: `FAMILY#${familyId}`,
              SK: `MEMBER#${userId}`,
              userId,
              role: "primary",
              joinedAt: now,
              addedBy: userId,
            },
            ConditionExpression: "attribute_not_exists(PK)", // Idempotent
          }),
        );
        console.log("Created primary member record for userId:", userId);
      } catch (memberConditionError) {
        // Ignore if member already exists
        if (memberConditionError.name !== "ConditionalCheckFailedException") {
          throw memberConditionError;
        }
      }

      // Use the newly created metadata
      familyResult = { Item: familyMetadata };
    }

    const family = familyResult.Item;

    // Check if family is full (max 2 members)
    if (family.memberCount >= 2) {
      return errorResponse(409, "Family is full. Maximum 2 members allowed");
    }

    // Check for existing pending invitation for this email
    // Build query parameters conditionally based on whether familyId is defined
    const queryParams = {
      TableName: TABLE_NAME,
      IndexName: "GSI4",
      KeyConditionExpression: "GSI4PK = :email",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":email": `INVITATION#${email.toLowerCase()}`,
        ":pending": "pending",
      },
    };

    // Only add familyId filter if it's defined
    if (familyId) {
      queryParams.FilterExpression =
        "#status = :pending AND familyId = :familyId";
      queryParams.ExpressionAttributeValues[":familyId"] = familyId;
    } else {
      queryParams.FilterExpression = "#status = :pending";
    }

    const existingInvitations = await dynamodb.send(
      new QueryCommand(queryParams),
    );

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

    await dynamodb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: invitation,
      }),
    );

    console.log("Invitation created:", invitationId);

    // Send invitation email via email service
    try {
      // Get inviter user details for email
      const inviterResult = await dynamodb.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `USER#${userId}`,
            SK: "PROFILE",
          },
        }),
      );

      const inviter = inviterResult.Item || {};
      const inviterName =
        `${inviter.firstName || ""} ${inviter.lastName || ""}`.trim() ||
        "BudgetBuddy User";
      const inviterEmail = inviter.email || "noreply@budgetbuddy.com";

      // Construct accept URL with invitation token
      const acceptUrl = `${process.env.WEB_APP_URL || "https://app.budgetbuddy.com"}/accept-invitation?token=${token}`;

      // Call email service to send invitation
      const emailPayload = {
        invitedEmail: email.toLowerCase(),
        inviterName,
        inviterEmail,
        role: role.charAt(0).toUpperCase() + role.slice(1), // Capitalize role
        acceptUrl,
        expiresAt,
      };

      console.log("Sending invitation email:", emailPayload);

      // Make HTTP call to email service
      const apiUrl =
        process.env.EMAIL_API_URL ||
        "https://0poeu07vth.execute-api.us-east-1.amazonaws.com/v1";

      // Get JWT token from event headers for authenticated email endpoint
      const authHeader =
        event.headers?.Authorization || event.headers?.authorization;

      const emailResponse = await fetch(`${apiUrl}/email/send-invitation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Pass through authorization for authenticated email endpoint
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify(emailPayload),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error("Failed to send invitation email:", errorText);
        // Don't fail the invitation creation if email fails
        // Just log the error and continue
      } else {
        console.log("Invitation email sent successfully");
      }
    } catch (emailError) {
      console.error("Error sending invitation email:", emailError);
      // Don't fail the invitation creation if email fails
      // Just log the error and continue
    }

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
    const scanResult = await dynamodb.send(
      new ScanCommand({
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
      }),
    );

    if (!scanResult.Items || scanResult.Items.length === 0) {
      return errorResponse(404, "Invitation not found or already used");
    }

    const invitation = scanResult.Items[0];

    // Check if invitation is expired
    const now = new Date();
    const expiresAt = new Date(invitation.expiresAt);

    if (now > expiresAt) {
      // Update invitation status to expired
      await dynamodb.send(
        new UpdateCommand({
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
        }),
      );

      return errorResponse(400, "Invitation has expired");
    }

    // Get family metadata to check member count
    const familyResult = await dynamodb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${invitation.familyId}`,
          SK: "METADATA",
        },
      }),
    );

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

    await dynamodb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `FAMILY#${invitation.familyId}`,
          SK: `MEMBER#${userId}`,
          userId,
          role: invitation.role,
          joinedAt,
          addedBy: invitation.invitedBy,
        },
      }),
    );

    // Update family member count
    await dynamodb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${invitation.familyId}`,
          SK: "METADATA",
        },
        UpdateExpression: "SET memberCount = memberCount + :inc",
        ExpressionAttributeValues: {
          ":inc": 1,
        },
      }),
    );

    // Update invitation status to accepted
    await dynamodb.send(
      new UpdateCommand({
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
      }),
    );

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
    const membersResult = await dynamodb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression:
          "PK = :familyPK AND begins_with(SK, :memberPrefix)",
        ExpressionAttributeValues: {
          ":familyPK": `FAMILY#${familyId}`,
          ":memberPrefix": "MEMBER#",
        },
      }),
    );

    // Get family metadata to find primary user
    // Auto-create if missing (for legacy users)
    const familyResult = await dynamodb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: "METADATA",
        },
      }),
    );

    // If family metadata doesn't exist, we can't determine the primary user
    // Return empty members list - the user should trigger invite flow to create metadata
    if (!familyResult.Item) {
      console.log(
        "Family metadata not found for familyId:",
        familyId,
        "- returning empty members list",
      );
      return successResponse({
        familyId,
        members: [],
        message:
          "Family not yet configured. Send an invitation to set up your family.",
      });
    }

    const family = familyResult.Item;
    const existingMembers = membersResult.Items || [];

    // Check if primary user has a MEMBER record
    // If not, we need to create one (for backwards compatibility with existing users)
    if (family && family.primaryUserId) {
      const primaryUserHasMemberRecord = existingMembers.some(
        (m) => m.userId === family.primaryUserId,
      );

      if (!primaryUserHasMemberRecord) {
        console.log(
          "Primary user missing MEMBER record, creating one:",
          family.primaryUserId,
        );

        // Create the missing MEMBER record for the primary user
        const now = new Date().toISOString();
        await dynamodb.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              PK: `FAMILY#${familyId}`,
              SK: `MEMBER#${family.primaryUserId}`,
              userId: family.primaryUserId,
              role: "primary",
              joinedAt: family.createdAt || now,
              addedBy: family.primaryUserId,
            },
          }),
        );

        // Add the primary user to the members list
        existingMembers.push({
          userId: family.primaryUserId,
          role: "primary",
          joinedAt: family.createdAt || now,
          addedBy: family.primaryUserId,
        });

        console.log("Created missing MEMBER record for primary user");
      }
    }

    if (existingMembers.length === 0) {
      return successResponse({
        familyId,
        members: [],
      });
    }

    // Get user details for each member
    const members = await Promise.all(
      existingMembers.map(async (member) => {
        // Get user profile
        const userResult = await dynamodb.send(
          new GetCommand({
            TableName: TABLE_NAME,
            Key: {
              PK: `USER#${member.userId}`,
              SK: "PROFILE",
            },
          }),
        );

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
    const memberResult = await dynamodb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: `MEMBER#${targetUserId}`,
        },
      }),
    );

    if (!memberResult.Item) {
      return errorResponse(404, "Member not found");
    }

    // Update member role
    const updatedAt = new Date().toISOString();

    await dynamodb.send(
      new UpdateCommand({
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
      }),
    );

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
    const memberResult = await dynamodb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: `MEMBER#${targetUserId}`,
        },
      }),
    );

    if (!memberResult.Item) {
      return errorResponse(404, "Member not found");
    }

    // Remove member from family
    await dynamodb.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: `MEMBER#${targetUserId}`,
        },
      }),
    );

    // Update family member count
    await dynamodb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: "METADATA",
        },
        UpdateExpression: "SET memberCount = memberCount - :dec",
        ExpressionAttributeValues: {
          ":dec": 1,
        },
      }),
    );

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

    await dynamodb.send(
      new PutCommand({
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
      }),
    );

    // Add user as primary member of new family
    await dynamodb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `FAMILY#${newFamilyId}`,
          SK: `MEMBER#${userId}`,
          userId,
          role: "primary",
          joinedAt: now,
          addedBy: userId,
        },
      }),
    );

    // Remove user from old family
    await dynamodb.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: `MEMBER#${userId}`,
        },
      }),
    );

    // Update old family member count
    await dynamodb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: "METADATA",
        },
        UpdateExpression: "SET memberCount = memberCount - :dec",
        ExpressionAttributeValues: {
          ":dec": 1,
        },
      }),
    );

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
 * Get all pending invitations for the family
 *
 * Requirements:
 * - User must be primary
 * - Return list of pending invitations
 */
async function handleGetInvitations(familyId, familyRole) {
  try {
    // Validate user is primary
    if (familyRole !== "primary") {
      return errorResponse(403, "Only primary user can view invitations");
    }

    // Query all invitations for this family
    const result = await dynamodb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI4",
        KeyConditionExpression: "begins_with(GSI4PK, :invPrefix)",
        FilterExpression: "familyId = :familyId",
        ExpressionAttributeValues: {
          ":invPrefix": "INVITATION#",
          ":familyId": familyId,
        },
      }),
    );

    const invitations = (result.Items || []).map((inv) => ({
      invitationId: inv.invitationId,
      email: inv.invitedEmail,
      role: inv.role,
      status: inv.status,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    }));

    return successResponse({
      familyId,
      invitations,
      count: invitations.length,
    });
  } catch (error) {
    console.error("Error in handleGetInvitations:", error);
    return errorResponse(500, "Failed to get invitations", error.message);
  }
}

/**
 * Resend an invitation email
 *
 * Requirements:
 * - User must be primary
 * - Invitation must exist and be pending
 * - Resend the email
 */
async function handleResendInvitation(
  event,
  userId,
  familyId,
  familyRole,
  invitationId,
) {
  try {
    // Validate user is primary
    if (familyRole !== "primary") {
      return errorResponse(403, "Only primary user can resend invitations");
    }

    // Get the invitation
    const invResult = await dynamodb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `INVITATION#${invitationId}`,
          SK: "METADATA",
        },
      }),
    );

    if (!invResult.Item) {
      return errorResponse(404, "Invitation not found");
    }

    const invitation = invResult.Item;

    // Verify invitation belongs to this family
    if (invitation.familyId !== familyId) {
      return errorResponse(403, "Invitation does not belong to your family");
    }

    // Check if invitation is still pending
    if (invitation.status !== "pending") {
      return errorResponse(
        400,
        `Cannot resend invitation with status: ${invitation.status}`,
      );
    }

    // Check if invitation is expired
    const now = new Date();
    const expiresAt = new Date(invitation.expiresAt);
    if (now > expiresAt) {
      return errorResponse(
        400,
        "Invitation has expired. Please create a new one.",
      );
    }

    // Get inviter user details for email
    const inviterResult = await dynamodb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: "PROFILE",
        },
      }),
    );

    const inviter = inviterResult.Item || {};
    const inviterName =
      `${inviter.firstName || ""} ${inviter.lastName || ""}`.trim() ||
      "BudgetBuddy User";
    const inviterEmail = inviter.email || "noreply@budgetbuddy.com";

    // We need to get the original token - but it's hashed!
    // Generate a new token and update the invitation
    const newToken = generateSecureToken();
    const hashedToken = hashToken(newToken);

    // Update invitation with new token
    await dynamodb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: invitation.PK,
          SK: invitation.SK,
        },
        UpdateExpression: "SET #token = :token, updatedAt = :updatedAt",
        ExpressionAttributeNames: {
          "#token": "token",
        },
        ExpressionAttributeValues: {
          ":token": hashedToken,
          ":updatedAt": new Date().toISOString(),
        },
      }),
    );

    // Construct accept URL with new token
    const acceptUrl = `${process.env.WEB_APP_URL || "https://app.budgetbuddy.com"}/accept-invitation?token=${newToken}`;

    // Send invitation email
    const emailPayload = {
      invitedEmail: invitation.invitedEmail,
      inviterName,
      inviterEmail,
      role: invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1),
      acceptUrl,
      expiresAt: invitation.expiresAt,
    };

    console.log("Resending invitation email:", emailPayload);

    const apiUrl =
      process.env.EMAIL_API_URL ||
      "https://0poeu07vth.execute-api.us-east-1.amazonaws.com/v1";

    const authHeader =
      event.headers?.Authorization || event.headers?.authorization;

    try {
      const emailResponse = await fetch(`${apiUrl}/email/send-invitation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify(emailPayload),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error("Failed to resend invitation email:", errorText);
        return errorResponse(500, "Failed to send email. Please try again.");
      }

      console.log("Invitation email resent successfully");
    } catch (emailError) {
      console.error("Error resending invitation email:", emailError);
      return errorResponse(500, "Failed to send email. Please try again.");
    }

    return successResponse({
      invitationId,
      email: invitation.invitedEmail,
      message: "Invitation resent successfully",
    });
  } catch (error) {
    console.error("Error in handleResendInvitation:", error);
    return errorResponse(500, "Failed to resend invitation", error.message);
  }
}

/**
 * Revoke/cancel a pending invitation
 *
 * Requirements:
 * - User must be primary
 * - Invitation must exist
 * - Delete the invitation
 */
async function handleRevokeInvitation(
  userId,
  familyId,
  familyRole,
  invitationId,
) {
  try {
    // Validate user is primary
    if (familyRole !== "primary") {
      return errorResponse(403, "Only primary user can revoke invitations");
    }

    // Get the invitation
    const invResult = await dynamodb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `INVITATION#${invitationId}`,
          SK: "METADATA",
        },
      }),
    );

    if (!invResult.Item) {
      return errorResponse(404, "Invitation not found");
    }

    const invitation = invResult.Item;

    // Verify invitation belongs to this family
    if (invitation.familyId !== familyId) {
      return errorResponse(403, "Invitation does not belong to your family");
    }

    // Delete the invitation
    await dynamodb.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: invitation.PK,
          SK: invitation.SK,
        },
      }),
    );

    console.log(
      `User ${userId} revoked invitation ${invitationId} for ${invitation.invitedEmail}`,
    );

    return successResponse({
      message: "Invitation revoked successfully",
      invitationId,
      email: invitation.invitedEmail,
    });
  } catch (error) {
    console.error("Error in handleRevokeInvitation:", error);
    return errorResponse(500, "Failed to revoke invitation", error.message);
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
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash token using SHA-256
 */
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
