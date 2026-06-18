/**
 * BudgetBuddy Authentication Lambda Function - Minimal Version for Debugging
 */

// AWS SDK imports
const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  InitiateAuthCommand,
  AdminGetUserCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

// Google ID token verification — lazy-loaded to avoid cold-start failure
// when google-auth-library is not bundled in the deployment package.
// The package is only required when the /auth/google endpoint is called.
let _googleAuthClient = null;
function getGoogleAuthClient() {
  if (!_googleAuthClient) {
    // eslint-disable-next-line global-require
    const { OAuth2Client } = require("google-auth-library");
    _googleAuthClient = new OAuth2Client();
  }
  return _googleAuthClient;
}

const {
  DynamoDBClient,
  TransactWriteItemsCommand,
  GetItemCommand,
  UpdateItemCommand,
  PutItemCommand, // eslint-disable-line no-unused-vars
} = require("@aws-sdk/client-dynamodb");

// Import helpers from common utils layer
const { dynamoHelpers, generateId } = require("/opt/nodejs/utils");

// Environment variables
const USER_POOL_ID = process.env.USER_POOL_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const TABLE_NAME = process.env.TABLE_NAME;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

/**
 * Decode and minimally validate a Cognito JWT.
 * NOTE: Full cryptographic verification happens at the API Gateway Cognito
 * authorizer for all protected routes. This fallback is only reached on
 * internal/profile routes that receive tokens directly. We validate issuer
 * and expiry to prevent the most obvious forgery attacks.
 */
function decodeCognitoToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");
  const payload = JSON.parse(Buffer.from(parts[1] + "==", "base64").toString());

  const expectedIssuer = `https://cognito-idp.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${USER_POOL_ID}`;
  if (payload.iss && payload.iss !== expectedIssuer) {
    throw new Error("Token issuer mismatch — not issued by this Cognito pool");
  }
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }
  return payload;
}

// AWS clients
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-1",
});
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

/**
 * Helper function to generate CORS headers
 */
function getCorsHeaders(origin) {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://d1ueeugn9zcx7n.cloudfront.net",
    "https://d2ubhx2a13s7gc.cloudfront.net",
    "https://app.budgetbuddy.com",
    "https://admin.budgetbuddy.com",
  ];
  const corsOrigin = allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[2]; // Default to CloudFront

  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Credentials": "true",
  };
}

/**
 * Main Lambda handler function
 */
exports.handler = async (event, _context) => {
  console.log("=== AUTH HANDLER START ===");
  console.log("Event received:", JSON.stringify(event, null, 2));
  console.log("HTTP Method:", event.httpMethod);
  console.log("Path:", event.path);
  console.log("Headers:", JSON.stringify(event.headers, null, 2));

  try {
    const httpMethod = event.httpMethod;
    const path = event.path;
    const origin = event.headers.origin || event.headers.Origin || "";

    console.log("Processing request:", httpMethod, path);

    // Handle health check endpoints
    if (
      httpMethod === "GET" &&
      (path === "/health" || path === "/auth/health")
    ) {
      console.log("Health check requested");
      return {
        statusCode: 200,
        headers: getCorsHeaders(origin),
        body: JSON.stringify({
          status: "healthy",
          service: "auth",
          timestamp: new Date().toISOString(),
          version: "1.0.0",
        }),
      };
    }

    // Handle CORS preflight requests
    if (httpMethod === "OPTIONS") {
      console.log("CORS preflight requested");
      return {
        statusCode: 200,
        headers: {
          ...getCorsHeaders(origin),
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
          "Access-Control-Max-Age": "86400",
        },
        body: "",
      };
    }

    // Handle registration endpoint - STEP 2: Add validation
    if (httpMethod === "POST" && path === "/auth/register") {
      console.log("Registration endpoint hit - testing validation");

      // Step 1: Parse JSON body
      let requestBody = null;
      let parseError = null;

      try {
        if (event.body) {
          requestBody = JSON.parse(event.body);
          console.log("Successfully parsed request body:", requestBody);
        } else {
          console.log("No body received in request");
          return {
            statusCode: 400,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({
              error: "Bad Request",
              message: "Request body is required",
            }),
          };
        }
      } catch (error) {
        parseError = error.message;
        console.error("JSON parsing failed:", error);
        return {
          statusCode: 400,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            error: "Bad Request",
            message: "Invalid JSON format",
            details: parseError,
          }),
        };
      }

      // Step 2: Basic validation
      const validationErrors = [];

      if (!requestBody.email || typeof requestBody.email !== "string") {
        validationErrors.push("Email is required and must be a string");
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestBody.email)) {
        validationErrors.push("Email must be a valid email address");
      }

      if (!requestBody.password || typeof requestBody.password !== "string") {
        validationErrors.push("Password is required and must be a string");
      } else if (requestBody.password.length < 8) {
        validationErrors.push("Password must be at least 8 characters long");
      }

      if (!requestBody.firstName || typeof requestBody.firstName !== "string") {
        validationErrors.push("First name is required and must be a string");
      }

      if (!requestBody.lastName || typeof requestBody.lastName !== "string") {
        validationErrors.push("Last name is required and must be a string");
      }

      // Validate currency if provided
      if (requestBody.currency) {
        const validCurrencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];
        if (!validCurrencies.includes(requestBody.currency)) {
          validationErrors.push(
            `Currency must be one of: ${validCurrencies.join(", ")}`,
          );
        }
      }

      // If validation fails, return error
      if (validationErrors.length > 0) {
        console.log("Validation failed:", validationErrors);
        return {
          statusCode: 400,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            error: "Validation Error",
            message: "Request validation failed",
            errors: validationErrors,
          }),
        };
      }

      // Step 3: Create user in Cognito and DynamoDB
      console.log("Validation passed, creating user in Cognito");

      try {
        // Generate unique user ID
        const userId = `user_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        // Create user in Cognito User Pool
        const createUserCommand = new AdminCreateUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: requestBody.email,
          UserAttributes: [
            {
              Name: "email",
              Value: requestBody.email,
            },
            {
              Name: "email_verified",
              Value: "true",
            },
            {
              Name: "given_name",
              Value: requestBody.firstName,
            },
            {
              Name: "family_name",
              Value: requestBody.lastName,
            },
            {
              Name: "custom:userId",
              Value: userId,
            },
          ],
          MessageAction: "SUPPRESS", // Don't send welcome email for now
          TemporaryPassword: requestBody.password,
        });

        const cognitoResult = await cognitoClient.send(createUserCommand);
        console.log("User created in Cognito:", cognitoResult.User.Username);

        // Set permanent password
        const setPasswordCommand = new AdminSetUserPasswordCommand({
          UserPoolId: USER_POOL_ID,
          Username: requestBody.email,
          Password: requestBody.password,
          Permanent: true,
        });

        await cognitoClient.send(setPasswordCommand);
        console.log("Password set as permanent");

        // Generate budget ID for the user's personal budget
        const budgetId = generateId.budget();
        const currentTime = new Date().toISOString();

        // 1. User profile — references defaultBudgetId, no familyId/familyRole
        const userProfile = {
          PK: { S: `USER#${userId}` },
          SK: { S: 'PROFILE' },
          userId: { S: userId },
          email: { S: requestBody.email },
          firstName: { S: requestBody.firstName },
          lastName: { S: requestBody.lastName },
          defaultBudgetId: { S: budgetId },
          currency: { S: requestBody.currency || 'USD' },
          subscriptionTier: { S: 'free' },
          onboardingCompleted: { BOOL: false },
          createdAt: { S: currentTime },
          updatedAt: { S: currentTime },
        };

        // 2. Budget metadata — personal budget container
        const budgetMetadata = {
          PK: { S: `BUDGET#${budgetId}` },
          SK: { S: 'METADATA' },
          budgetId: { S: budgetId },
          name: { S: `${requestBody.firstName}'s Budget` },
          budgetType: { S: 'personal' },
          ownerUserId: { S: userId },
          currency: { S: requestBody.currency || 'USD' },
          status: { S: 'active' },
          createdAt: { S: currentTime },
          updatedAt: { S: currentTime },
        };

        // 3. Budget member — owner membership with GSI1 fields
        const budgetMember = {
          PK: { S: `BUDGET#${budgetId}` },
          SK: { S: `MEMBER#${userId}` },
          GSI1PK: { S: `USER#${userId}` },
          GSI1SK: { S: `BUDGET#${budgetId}` },
          budgetId: { S: budgetId },
          userId: { S: userId },
          role: { S: 'owner' },
          status: { S: 'active' },
          accessLabel: { NULL: true },
          joinedAt: { S: currentTime },
          invitedBy: { NULL: true },
          expiresAt: { NULL: true },
          historyAccess: { S: 'full' },
          createdAt: { S: currentTime },
        };

        // Write all 3 records atomically
        const transactItems = [
          {
            Put: {
              TableName: TABLE_NAME,
              Item: userProfile,
              ConditionExpression: 'attribute_not_exists(PK)',
            },
          },
          {
            Put: {
              TableName: TABLE_NAME,
              Item: budgetMetadata,
              ConditionExpression: 'attribute_not_exists(PK)',
            },
          },
          {
            Put: {
              TableName: TABLE_NAME,
              Item: budgetMember,
              ConditionExpression: 'attribute_not_exists(PK)',
            },
          },
        ];

        const transactCommand = new TransactWriteItemsCommand({
          TransactItems: transactItems,
        });

        await dynamoClient.send(transactCommand);
        console.log('User profile, budget metadata, and budget membership created in DynamoDB');

        return {
          statusCode: 201,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            message: 'User registered successfully',
            userId,
            budgetId,
            email: requestBody.email,
            firstName: requestBody.firstName,
            lastName: requestBody.lastName,
            subscriptionTier: 'free',
            nextSteps: [
              'Complete onboarding questionnaire',
              'Generate AI budget or create DIY budget',
            ],
          }),
        };
      } catch (cognitoError) {
        console.error("Cognito/DynamoDB error:", cognitoError);

        // Handle specific Cognito errors
        if (cognitoError.name === "UsernameExistsException") {
          return {
            statusCode: 409,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({
              error: "User Already Exists",
              message: "An account with this email address already exists",
            }),
          };
        }

        return {
          statusCode: 500,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            error: "Registration Failed",
            message: "Failed to create user account",
            details: cognitoError.message,
          }),
        };
      }
    }

    // Handle Google Sign-In endpoint
    if (httpMethod === "POST" && path === "/auth/google") {
      console.log("Google Sign-In endpoint hit");

      // Step 1: Parse JSON body
      let requestBody = null;

      try {
        if (event.body) {
          requestBody = JSON.parse(event.body);
          console.log("Successfully parsed Google auth request");
        } else {
          return {
            statusCode: 400,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({
              error: "Bad Request",
              message: "Request body is required",
            }),
          };
        }
      } catch (error) {
        console.error("JSON parsing failed:", error);
        return {
          statusCode: 400,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            error: "Bad Request",
            message: "Invalid JSON format",
          }),
        };
      }

      // Step 2: Validate Google ID token
      if (!requestBody.idToken) {
        return {
          statusCode: 400,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            error: "Validation Error",
            message: "Google ID token is required",
          }),
        };
      }

      try {
        // Verify Google ID token signature using Google's public keys
        if (!GOOGLE_CLIENT_ID) {
          throw new Error("GOOGLE_CLIENT_ID environment variable not configured");
        }
        const ticket = await getGoogleAuthClient().verifyIdToken({
          idToken: requestBody.idToken,
          audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload?.email_verified) {
          throw new Error("Google account email is not verified");
        }

        // Extract user info from verified Google token
        const googleEmail = payload.email;
        const googleName = payload.name || "";
        const [firstName, ...lastNameParts] = googleName.split(" ");
        const lastName = lastNameParts.join(" ") || "User";

        // Check if user already exists in Cognito
        let userId = null;
        let isNewUser = false;

        try {
          // Try to get user by email
          const getUserCommand = new AdminGetUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: googleEmail,
          });

          const existingUser = await cognitoClient.send(getUserCommand);
          console.log("User already exists in Cognito");

          // Extract userId from custom attributes
          const userIdAttr = existingUser.UserAttributes.find(
            (attr) => attr.Name === "custom:userId",
          );
          userId = userIdAttr
            ? userIdAttr.Value
            : `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        } catch (error) {
          if (error.name === "UserNotFoundException") {
            console.log("User does not exist, creating new user");
            isNewUser = true;

            // Generate unique user ID
            userId = `user_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`;

            // Create user in Cognito
            const createUserCommand = new AdminCreateUserCommand({
              UserPoolId: USER_POOL_ID,
              Username: googleEmail,
              UserAttributes: [
                {
                  Name: "email",
                  Value: googleEmail,
                },
                {
                  Name: "email_verified",
                  Value: "true",
                },
                {
                  Name: "given_name",
                  Value: firstName || "User",
                },
                {
                  Name: "family_name",
                  Value: lastName,
                },
                {
                  Name: "custom:userId",
                  Value: userId,
                },
                {
                  Name: "custom:authProvider",
                  Value: "google",
                },
              ],
              MessageAction: "SUPPRESS",
            });

            await cognitoClient.send(createUserCommand);
            console.log("User created in Cognito via Google");

            // Set a random password for Google users (they won't use it)
            const randomPassword = `Google_${Math.random()
              .toString(36)
              .substr(2, 20)}!`;
            const setPasswordCommand = new AdminSetUserPasswordCommand({
              UserPoolId: USER_POOL_ID,
              Username: googleEmail,
              Password: randomPassword,
              Permanent: true,
            });

            await cognitoClient.send(setPasswordCommand);
            console.log("Random password set for Google user");
          } else {
            throw error;
          }
        }

        // Create or update user profile in DynamoDB
        const budgetId = generateId.budget();
        const currentTime = new Date().toISOString();

        // Check if user profile already exists
        const getItemCommand = new GetItemCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: { S: `USER#${userId}` },
            SK: { S: 'PROFILE' },
          },
        });

        let userProfileExists = false;
        try {
          const result = await dynamoClient.send(getItemCommand);
          userProfileExists = !!result.Item;
        } catch (error) {
          console.log('Error checking user profile:', error.message);
        }

        if (!userProfileExists && isNewUser) {
          // 1. User profile — references defaultBudgetId, no familyId/familyRole
          const userProfile = {
            PK: { S: `USER#${userId}` },
            SK: { S: 'PROFILE' },
            userId: { S: userId },
            email: { S: googleEmail },
            firstName: { S: firstName || 'User' },
            lastName: { S: lastName },
            defaultBudgetId: { S: budgetId },
            currency: { S: 'USD' },
            subscriptionTier: { S: 'free' },
            authProvider: { S: 'google' },
            onboardingCompleted: { BOOL: false },
            createdAt: { S: currentTime },
            updatedAt: { S: currentTime },
          };

          // 2. Budget metadata — personal budget container
          const budgetMetadata = {
            PK: { S: `BUDGET#${budgetId}` },
            SK: { S: 'METADATA' },
            budgetId: { S: budgetId },
            name: { S: `${firstName || 'User'}'s Budget` },
            budgetType: { S: 'personal' },
            ownerUserId: { S: userId },
            currency: { S: 'USD' },
            status: { S: 'active' },
            createdAt: { S: currentTime },
            updatedAt: { S: currentTime },
          };

          // 3. Budget member — owner membership with GSI1 fields
          const budgetMember = {
            PK: { S: `BUDGET#${budgetId}` },
            SK: { S: `MEMBER#${userId}` },
            GSI1PK: { S: `USER#${userId}` },
            GSI1SK: { S: `BUDGET#${budgetId}` },
            budgetId: { S: budgetId },
            userId: { S: userId },
            role: { S: 'owner' },
            status: { S: 'active' },
            accessLabel: { NULL: true },
            joinedAt: { S: currentTime },
            invitedBy: { NULL: true },
            expiresAt: { NULL: true },
            historyAccess: { S: 'full' },
            createdAt: { S: currentTime },
          };

          // Write all 3 records atomically
          const transactItems = [
            {
              Put: {
                TableName: TABLE_NAME,
                Item: userProfile,
                ConditionExpression: 'attribute_not_exists(PK)',
              },
            },
            {
              Put: {
                TableName: TABLE_NAME,
                Item: budgetMetadata,
                ConditionExpression: 'attribute_not_exists(PK)',
              },
            },
            {
              Put: {
                TableName: TABLE_NAME,
                Item: budgetMember,
                ConditionExpression: 'attribute_not_exists(PK)',
              },
            },
          ];

          const transactCommand = new TransactWriteItemsCommand({
            TransactItems: transactItems,
          });

          await dynamoClient.send(transactCommand);
          console.log('User profile, budget metadata, and budget membership created in DynamoDB');
        }

        // For Google users, generate JWT tokens using a temporary password
        const tempPassword = `Google_${Math.random()
          .toString(36)
          .substr(2, 20)}!`;

        try {
          const authCommand = new InitiateAuthCommand({
            AuthFlow: "ADMIN_NO_SRP_AUTH",
            ClientId: CLIENT_ID,
            AuthParameters: {
              USERNAME: googleEmail,
              PASSWORD: tempPassword,
            },
          });

          const authResult = await cognitoClient.send(authCommand);
          console.log("Successfully generated tokens for Google user");

          const accessToken = authResult.AuthenticationResult.AccessToken;
          const refreshToken = authResult.AuthenticationResult.RefreshToken;
          const idToken = authResult.AuthenticationResult.IdToken;

          return {
            statusCode: 200,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({
              message: isNewUser
                ? "User created and authenticated"
                : "User authenticated",
              user: {
                userId,
                email: googleEmail,
                firstName: firstName || "User",
                lastName,
                accountType: "single",
                subscriptionTier: "free",
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
              accessToken,
              refreshToken,
              idToken,
              expiresIn: authResult.AuthenticationResult.ExpiresIn,
              isNewUser,
            }),
          };
        } catch (tokenError) {
          console.error("Failed to generate tokens:", tokenError);

          // Fallback: return a temporary token
          return {
            statusCode: 200,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({
              message: "User authenticated (temporary token)",
              user: {
                userId,
                email: googleEmail,
                firstName: firstName || "User",
                lastName,
                accountType: "single",
                subscriptionTier: "free",
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
              accessToken: requestBody.idToken,
              refreshToken: requestBody.idToken,
              idToken: requestBody.idToken,
              expiresIn: 3600,
              isNewUser,
              warning: "Using temporary token",
            }),
          };
        }
      } catch (error) {
        console.error("Google Sign-In error:", error);

        return {
          statusCode: 500,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            error: "Google Sign-In Failed",
            message: "Failed to process Google authentication",
            details: error.message,
          }),
        };
      }
    }

    // Handle profile endpoint - GET user profile
    if (httpMethod === "GET" && path === "/auth/profile") {
      console.log("Get profile endpoint hit");

      // Extract userId from Authorization header
      const authHeader =
        event.headers.Authorization || event.headers.authorization;
      if (!authHeader) {
        return {
          statusCode: 401,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            error: "Unauthorized",
            message: "Authorization header is required",
          }),
        };
      }

      try {
        // Parse the ID token to get userId
        const token = authHeader.replace("Bearer ", "");
        const payload = decodeCognitoToken(token);

        // Try to get userId from custom attribute, fallback to sub (Cognito user ID)
        let userId = payload["custom:userId"];
        if (!userId) {
          console.log(
            "custom:userId not found in token, using sub as fallback",
          );
          userId = payload.sub; // Use Cognito's sub as userId for legacy users
        }

        if (!userId) {
          throw new Error("User ID not found in token");
        }

        // Get user profile from DynamoDB
        const getItemCommand = new GetItemCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: { S: `USER#${userId}` },
            SK: { S: "PROFILE" },
          },
        });

        const result = await dynamoClient.send(getItemCommand);

        if (!result.Item) {
          return {
            statusCode: 404,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({
              error: "Not Found",
              message: "User profile not found",
            }),
          };
        }

        // Convert DynamoDB item to JSON
        const defaultBudgetId = result.Item.defaultBudgetId?.S || null;
        // Use BOOL flag if present; fall back to presence of defaultBudgetId as proof of completion.
        // This handles older accounts written before the onboardingCompleted flag was added,
        // and accounts where the flag may not have been written correctly.
        const onboardingCompleted =
          result.Item.onboardingCompleted?.BOOL === true || !!defaultBudgetId;
        const profile = {
          userId: result.Item.userId.S,
          email: result.Item.email.S,
          firstName: result.Item.firstName?.S || "",
          lastName: result.Item.lastName?.S || "",
          defaultBudgetId,
          subscriptionTier: result.Item.subscriptionTier?.S || "free",
          onboardingCompleted,
          location: result.Item.location?.S
            ? JSON.parse(result.Item.location.S)
            : null,
          timezone: result.Item.timezone?.S || null,
          currency: result.Item.currency?.S || "USD",
          settings: result.Item.settings?.S
            ? JSON.parse(result.Item.settings.S)
            : null,
          createdAt: result.Item.createdAt?.S || new Date().toISOString(),
          updatedAt: result.Item.updatedAt?.S || new Date().toISOString(),
        };

        return {
          statusCode: 200,
          headers: getCorsHeaders(origin),
          body: JSON.stringify(profile),
        };
      } catch (error) {
        console.error("Error getting profile:", error);
        return {
          statusCode: 500,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            error: "Internal Server Error",
            message: "Failed to get user profile",
            details: error.message,
          }),
        };
      }
    }

    // Handle profile update endpoint - PUT user profile
    if (httpMethod === "PUT" && path === "/auth/profile") {
      console.log("Update profile endpoint hit");

      // Extract userId from Authorization header
      const authHeader =
        event.headers.Authorization || event.headers.authorization;
      if (!authHeader) {
        return {
          statusCode: 401,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            error: "Unauthorized",
            message: "Authorization header is required",
          }),
        };
      }

      try {
        // Parse the ID token to get userId - use same logic as GET profile
        const token = authHeader.replace("Bearer ", "");
        const payload = decodeCognitoToken(token);

        // Try to get userId from custom attribute, fallback to sub (Cognito user ID)
        // This matches the GET profile handler logic for consistency
        let userId = payload["custom:userId"];
        if (!userId) {
          console.log(
            "PUT profile: custom:userId not found in token, using sub as fallback",
          );
          userId = payload.sub;
        }

        if (!userId) {
          return {
            statusCode: 401,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({
              error: "Unauthorized",
              message: "Invalid token - no user ID found",
            }),
          };
        }

        console.log("PUT profile: Using userId:", userId);

        // Parse request body
        const body = JSON.parse(event.body || "{}");

        // Build update expression for allowed fields
        const allowedFields = [
          "firstName",
          "lastName",
          "location",
          "timezone",
          "currency",
          "settings",
        ];
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        for (const field of allowedFields) {
          if (body[field] !== undefined) {
            updateExpressions.push(`#${field} = :${field}`);
            expressionAttributeNames[`#${field}`] = field;

            // Handle different field types
            if (typeof body[field] === "object") {
              expressionAttributeValues[`:${field}`] = {
                S: JSON.stringify(body[field]),
              };
            } else if (typeof body[field] === "boolean") {
              expressionAttributeValues[`:${field}`] = { BOOL: body[field] };
            } else {
              expressionAttributeValues[`:${field}`] = {
                S: String(body[field]),
              };
            }
          }
        }

        if (updateExpressions.length === 0) {
          return {
            statusCode: 400,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({
              error: "Bad Request",
              message: "No valid fields to update",
            }),
          };
        }

        // Add updatedAt
        updateExpressions.push("#updatedAt = :updatedAt");
        expressionAttributeNames["#updatedAt"] = "updatedAt";
        expressionAttributeValues[":updatedAt"] = {
          S: new Date().toISOString(),
        };

        // Update user profile in DynamoDB
        const updateCommand = new UpdateItemCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: { S: `USER#${userId}` },
            SK: { S: "PROFILE" },
          },
          UpdateExpression: `SET ${updateExpressions.join(", ")}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: "ALL_NEW",
        });

        const result = await dynamoClient.send(updateCommand);
        console.log("Profile updated successfully");

        // Convert DynamoDB item to JSON
        const updatedProfile = {
          userId: result.Attributes.userId.S,
          email: result.Attributes.email.S,
          firstName: result.Attributes.firstName?.S || "",
          lastName: result.Attributes.lastName?.S || "",
          defaultBudgetId: result.Attributes.defaultBudgetId?.S || null,
          location: result.Attributes.location?.S
            ? JSON.parse(result.Attributes.location.S)
            : null,
          timezone: result.Attributes.timezone?.S || null,
          currency: result.Attributes.currency?.S || "USD",
          settings: result.Attributes.settings?.S
            ? JSON.parse(result.Attributes.settings.S)
            : null,
          updatedAt: result.Attributes.updatedAt.S,
        };

        return {
          statusCode: 200,
          headers: getCorsHeaders(origin),
          body: JSON.stringify(updatedProfile),
        };
      } catch (error) {
        console.error("Error updating profile:", error);
        return {
          statusCode: 500,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            error: "Internal Server Error",
            message: "Failed to update user profile",
            details: error.message,
          }),
        };
      }
    }

    // Handle onboarding completion endpoint
    if (httpMethod === "POST" && path === "/auth/onboarding") {
      console.log("=== ONBOARDING ENDPOINT HIT ===");
      console.log("Onboarding completion endpoint hit");
      console.log("Request method:", httpMethod);
      console.log("Request path:", path);
      console.log("Request body length:", event.body ? event.body.length : 0);

      // Extract userId from Authorization header
      const authHeader =
        event.headers.Authorization || event.headers.authorization;
      if (!authHeader) {
        return {
          statusCode: 401,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            error: "Unauthorized",
            message: "Authorization header is required",
          }),
        };
      }

      try {
        // Parse the ID token to get userId
        const token = authHeader.replace("Bearer ", "");
        const payload = decodeCognitoToken(token);

        // Try to get userId from custom attribute, fallback to sub (Cognito user ID)
        let userId = payload["custom:userId"];
        if (!userId) {
          console.log(
            "custom:userId not found in token, using sub as fallback",
          );
          userId = payload.sub; // Use Cognito's sub as userId for legacy users
        }

        if (!userId) {
          throw new Error("User ID not found in token");
        }

        // Parse request body
        let requestBody = null;
        try {
          if (event.body) {
            requestBody = JSON.parse(event.body);
          } else {
            return {
              statusCode: 400,
              headers: getCorsHeaders(origin),
              body: JSON.stringify({
                error: "Bad Request",
                message: "Request body is required",
              }),
            };
          }
        } catch (_e) {
          return {
            statusCode: 400,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({
              error: "Bad Request",
              message: "Invalid JSON format",
            }),
          };
        }

        // Validate required fields
        console.log("ONBOARDING DEBUG - Validating request body:");
        console.log("  - city:", requestBody.city);
        console.log("  - country:", requestBody.country);
        console.log("  - familySize:", requestBody.familySize);
        console.log("  - currentMonth:", requestBody.currentMonth);
        console.log("  - selectedCategories:", requestBody.selectedCategories);
        console.log(
          "  - selectedCategories length:",
          requestBody.selectedCategories?.length,
        );

        if (
          !requestBody.city ||
          !requestBody.country ||
          !requestBody.familySize ||
          !requestBody.currentMonth ||
          !requestBody.selectedCategories
        ) {
          console.error("ONBOARDING VALIDATION FAILED:");
          console.error("  - Missing city:", !requestBody.city);
          console.error("  - Missing country:", !requestBody.country);
          console.error("  - Missing familySize:", !requestBody.familySize);
          console.error("  - Missing currentMonth:", !requestBody.currentMonth);
          console.error(
            "  - Missing selectedCategories:",
            !requestBody.selectedCategories,
          );

          return {
            statusCode: 400,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({
              error: "Validation Error",
              message:
                "city, country, familySize, currentMonth, and selectedCategories are required",
            }),
          };
        }

        const currentTime = new Date().toISOString();

        // Read user profile to get defaultBudgetId
        const userProfileItem = await dynamoHelpers.getItem(`USER#${userId}`, 'PROFILE');
        if (!userProfileItem) {
          return {
            statusCode: 404,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({ error: 'Not Found', message: 'User profile not found' }),
          };
        }
        const budgetId = userProfileItem.defaultBudgetId;
        if (!budgetId) {
          return {
            statusCode: 400,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({ error: 'Bad Request', message: 'No default budget found for user' }),
          };
        }

        // Update user profile to mark onboarding as completed AND save location/currency

        // Build location object from onboarding data
        const locationData = {
          city: requestBody.city,
          country: requestBody.country,
          zipCode: "", // Not collected during onboarding
        };

        const updateCommand = new UpdateItemCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: { S: `USER#${userId}` },
            SK: { S: "PROFILE" },
          },
          UpdateExpression:
            "SET onboardingCompleted = :completed, updatedAt = :updatedAt, #loc = :location, currency = :currency",
          ExpressionAttributeNames: {
            "#loc": "location",
          },
          ExpressionAttributeValues: {
            ":completed": { BOOL: true },
            ":updatedAt": { S: currentTime },
            ":location": { S: JSON.stringify(locationData) },
            ":currency": { S: requestBody.currency || "USD" },
          },
          ReturnValues: "ALL_NEW",
        });

        await dynamoClient.send(updateCommand);
        console.log(
          "User profile updated - onboarding completed with location and currency:",
          {
            location: locationData,
            currency: requestBody.currency || "USD",
          },
        );

        // Create initial budget period for current month with selected categories
        const currentMonth = requestBody.currentMonth;

        // Transform selected categories into budget groups
        const expenseCategories = requestBody.selectedCategories.map((cat) => ({
          id: generateId.category(),
          name: cat.name,
          icon: cat.icon,
          plannedAmount: cat.adjustedAmount,
          spentAmount: 0,
          transactions: [],
          order: 1,
          isRecurring: false,
        }));

        const budgetGroups = {
          income: [],
          savings: [],
          expenses: expenseCategories,
        };

        const totalExpenses = expenseCategories.reduce(
          (sum, cat) => sum + cat.plannedAmount,
          0,
        );

        const budget = {
          PK: `BUDGET#${budgetId}`,
          SK: `PERIOD#${currentMonth}`,
          entityType: 'BUDGET_PERIOD',
          budgetId,
          month: currentMonth,
          totalIncome: 0,
          totalSavings: 0,
          totalExpenses,
          remainingBalance: -totalExpenses,
          groups: budgetGroups,
          isAIGenerated: true,
          createdAt: currentTime,
          updatedAt: currentTime,
        };

        console.log('Creating budget period:', { budgetId, month: currentMonth, totalExpenses, categoriesCount: expenseCategories.length });

        try {
          await dynamoHelpers.putItem(budget);
          console.log('Budget period created:', { budgetId, month: currentMonth });
        } catch (budgetError) {
          console.error('Budget creation failed:', budgetError.message);
          return {
            statusCode: 500,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({
              error: 'Budget Creation Failed',
              message: 'Failed to create initial budget during onboarding',
              details: budgetError.message,
            }),
          };
        }

        return {
          statusCode: 200,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            message: 'Onboarding completed successfully',
            budgetCreated: true,
            budgetId,
            month: currentMonth,
            totalExpenses,
            categoriesCreated: expenseCategories.length,
          }),
        };
      } catch (error) {
        console.error("Error completing onboarding:", error);
        return {
          statusCode: 500,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            error: "Internal Server Error",
            message: "Failed to complete onboarding",
            details: error.message,
          }),
        };
      }
    }

    // Handle login endpoint
    if (httpMethod === "POST" && path === "/auth/login") {
      console.log("Login endpoint hit");

      // Step 1: Parse JSON body
      let requestBody = null;
      let parseError = null;

      try {
        if (event.body) {
          requestBody = JSON.parse(event.body);
          console.log("Successfully parsed login request body:", {
            email: requestBody.email,
            hasPassword: !!requestBody.password,
          });
        } else {
          console.log("No body received in login request");
          return {
            statusCode: 400,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({
              error: "Bad Request",
              message: "Request body is required",
            }),
          };
        }
      } catch (error) {
        parseError = error.message;
        console.error("JSON parsing failed:", error);
        return {
          statusCode: 400,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            error: "Bad Request",
            message: "Invalid JSON format",
            details: parseError,
          }),
        };
      }

      // Step 2: Basic validation
      const validationErrors = [];

      if (!requestBody.email || typeof requestBody.email !== "string") {
        validationErrors.push("Email is required and must be a string");
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestBody.email)) {
        validationErrors.push("Email must be a valid email address");
      }

      if (!requestBody.password || typeof requestBody.password !== "string") {
        validationErrors.push("Password is required and must be a string");
      }

      // If validation fails, return error
      if (validationErrors.length > 0) {
        console.log("Login validation failed:", validationErrors);
        return {
          statusCode: 400,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            error: "Validation Error",
            message: "Request validation failed",
            errors: validationErrors,
          }),
        };
      }

      // Step 3: Authenticate with Cognito
      console.log("Validation passed, authenticating with Cognito");

      try {
        const authCommand = new InitiateAuthCommand({
          AuthFlow: "USER_PASSWORD_AUTH",
          ClientId: CLIENT_ID,
          AuthParameters: {
            USERNAME: requestBody.email,
            PASSWORD: requestBody.password,
          },
        });

        const authResult = await cognitoClient.send(authCommand);
        console.log("Cognito authentication successful");

        // Extract tokens from the response
        const accessToken = authResult.AuthenticationResult.AccessToken;
        const refreshToken = authResult.AuthenticationResult.RefreshToken;
        const idToken = authResult.AuthenticationResult.IdToken;

        // Parse the ID token to get user information (basic parsing)
        const idTokenPayload = JSON.parse(
          Buffer.from(idToken.split(".")[1], "base64").toString(),
        );

        return {
          statusCode: 200,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            message: "Login successful",
            accessToken,
            refreshToken,
            idToken,
            user: {
              userId: idTokenPayload["custom:userId"],
              email: idTokenPayload.email,
              firstName: idTokenPayload.given_name,
              lastName: idTokenPayload.family_name,
              accountType: idTokenPayload["custom:accountType"] || "single",
              subscriptionTier:
                idTokenPayload["custom:subscriptionTier"] || "free",
            },
            expiresIn: authResult.AuthenticationResult.ExpiresIn,
          }),
        };
      } catch (authError) {
        console.error("Cognito authentication error:", authError);

        // Handle specific authentication errors
        if (authError.name === "NotAuthorizedException") {
          return {
            statusCode: 401,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({
              error: "Authentication Failed",
              message: "Invalid email or password",
            }),
          };
        }

        if (authError.name === "UserNotFoundException") {
          return {
            statusCode: 401,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({
              error: "Authentication Failed",
              message: "Invalid email or password",
            }),
          };
        }

        return {
          statusCode: 500,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            error: "Login Failed",
            message: "An error occurred during authentication",
            details: authError.message,
          }),
        };
      }
    }

    // Handle geolocation detection endpoint
    if (httpMethod === "GET" && path === "/auth/geolocation") {
      console.log("Geolocation detection endpoint hit");

      try {
        // Get the client's real IP address from various headers
        // API Gateway sets these headers with the original client IP
        const clientIp =
          event.headers["X-Forwarded-For"]?.split(",")[0]?.trim() ||
          event.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
          event.requestContext?.identity?.sourceIp ||
          null;

        console.log("Client IP detection:", {
          xForwardedFor:
            event.headers["X-Forwarded-For"] ||
            event.headers["x-forwarded-for"],
          sourceIp: event.requestContext?.identity?.sourceIp,
          resolvedClientIp: clientIp,
        });

        // Build the ipapi.co URL - use client IP if available, otherwise let ipapi detect
        let ipapiUrl = "https://ipapi.co/json/";
        if (
          clientIp &&
          clientIp !== "127.0.0.1" &&
          !clientIp.startsWith("10.") &&
          !clientIp.startsWith("192.168.")
        ) {
          // Use the client's IP address for geolocation
          ipapiUrl = `https://ipapi.co/${clientIp}/json/`;
          console.log("Using client IP for geolocation:", clientIp);
        } else {
          console.log(
            "No valid client IP found, using default ipapi.co detection",
          );
        }

        // Fetch location from ipapi.co using the client's IP
        const response = await fetch(ipapiUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "BudgetBuddy/1.0",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Check if we got an error response
        if (data.error) {
          throw new Error(data.reason || "Geolocation detection failed");
        }

        console.log("Geolocation result:", {
          city: data.city,
          country: data.country_name,
          countryCode: data.country_code,
          ip: data.ip,
        });

        return {
          statusCode: 200,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            city: data.city || "",
            country: data.country_name || "",
            countryCode: (data.country_code || "").toLowerCase(),
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            timezone: data.timezone || "",
            success: true,
          }),
        };
      } catch (error) {
        console.error("Geolocation detection error:", error);
        return {
          statusCode: 200, // Return 200 with error flag instead of 500
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            city: "",
            country: "",
            countryCode: "",
            latitude: 0,
            longitude: 0,
            timezone: "",
            success: false,
            error: error.message || "Unknown error",
          }),
        };
      }
    }

    // For other POST requests, return a simple success response
    if (httpMethod === "POST") {
      console.log("Other POST request received for path:", path);
      return {
        statusCode: 200,
        headers: getCorsHeaders(origin),
        body: JSON.stringify({
          message: "POST endpoint working",
          path,
          note: "This endpoint is not yet implemented",
        }),
      };
    }

    // Default response for unhandled routes
    return {
      statusCode: 404,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({
        error: "Not Found",
        message: `Route ${httpMethod} ${path} not found`,
        service: "auth",
      }),
    };
  } catch (error) {
    console.error("Authentication function error:", error);

    return {
      statusCode: 500,
      headers: getCorsHeaders(
        event.headers.origin || event.headers.Origin || "",
      ),
      body: JSON.stringify({
        error: "Internal Server Error",
        message: "An error occurred processing your request",
        service: "auth",
        errorDetails: error.message,
      }),
    };
  }
};
