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
const {
  DynamoDBClient,
  TransactWriteItemsCommand,
  GetItemCommand,
  UpdateItemCommand, // eslint-disable-line no-unused-vars
  PutItemCommand, // eslint-disable-line no-unused-vars
} = require("@aws-sdk/client-dynamodb");

// Environment variables
const USER_POOL_ID = process.env.USER_POOL_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const TABLE_NAME = process.env.TABLE_NAME;

// AWS clients
const cognitoClient = new CognitoIdentityProviderClient({
  region: "us-east-1",
});
const dynamoClient = new DynamoDBClient({
  region: "us-east-1",
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

        // Generate family ID for single-person family
        const familyId = `family_${userId}`;
        const currentTime = new Date().toISOString();

        // Create family metadata record
        const familyProfile = {
          PK: {
            S: `FAMILY#${familyId}`,
          },
          SK: {
            S: "METADATA",
          },
          entityType: {
            S: "FAMILY",
          },
          familyId: {
            S: familyId,
          },
          familyName: {
            S: `${requestBody.firstName}'s Budget`,
          },
          primaryUserId: {
            S: userId,
          },
          memberCount: {
            N: "1",
          },
          accountType: {
            S: "single",
          },
          createdAt: {
            S: currentTime,
          },
          updatedAt: {
            S: currentTime,
          },
        };

        // Create user profile in DynamoDB with family assignment
        const userProfile = {
          PK: {
            S: `USER#${userId}`,
          },
          SK: {
            S: "PROFILE",
          },
          entityType: {
            S: "USER",
          },
          userId: {
            S: userId,
          },
          email: {
            S: requestBody.email,
          },
          firstName: {
            S: requestBody.firstName,
          },
          lastName: {
            S: requestBody.lastName,
          },
          familyId: {
            S: familyId,
          },
          familyRole: {
            S: "primary",
          },
          accountType: {
            S: "single",
          },
          subscriptionTier: {
            S: "free",
          },
          onboardingCompleted: {
            BOOL: false,
          },
          createdAt: {
            S: currentTime,
          },
          updatedAt: {
            S: currentTime,
          },
        };

        // Create both user and family records in a transaction
        const transactItems = [
          {
            Put: {
              TableName: TABLE_NAME,
              Item: familyProfile,
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
          {
            Put: {
              TableName: TABLE_NAME,
              Item: userProfile,
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
        ];

        const transactCommand = new TransactWriteItemsCommand({
          TransactItems: transactItems,
        });

        await dynamoClient.send(transactCommand);
        console.log("User profile and family created in DynamoDB");

        return {
          statusCode: 201,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            message: "User registered successfully",
            userId,
            familyId,
            email: requestBody.email,
            firstName: requestBody.firstName,
            lastName: requestBody.lastName,
            accountType: "single",
            subscriptionTier: "free",
            nextSteps: [
              "Complete onboarding questionnaire",
              "Generate AI budget or create DIY budget",
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
        // Parse the Google ID token (basic parsing - in production, verify signature)
        const tokenParts = requestBody.idToken.split(".");
        if (tokenParts.length !== 3) {
          throw new Error("Invalid token format");
        }

        const payload = JSON.parse(
          Buffer.from(tokenParts[1], "base64").toString()
        );
        console.log("Google token payload:", {
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
        });

        // Extract user info from Google token
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
            (attr) => attr.Name === "custom:userId"
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
        const familyId = `family_${userId}`;
        const currentTime = new Date().toISOString();

        // Check if user profile already exists
        const getItemCommand = new GetItemCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: { S: `USER#${userId}` },
            SK: { S: "PROFILE" },
          },
        });

        let userProfileExists = false;
        try {
          const result = await dynamoClient.send(getItemCommand);
          userProfileExists = !!result.Item;
        } catch (error) {
          console.log("Error checking user profile:", error.message);
        }

        if (!userProfileExists && isNewUser) {
          // Create family metadata record
          const familyProfile = {
            PK: { S: `FAMILY#${familyId}` },
            SK: { S: "METADATA" },
            entityType: { S: "FAMILY" },
            familyId: { S: familyId },
            familyName: { S: `${firstName}'s Budget` },
            primaryUserId: { S: userId },
            memberCount: { N: "1" },
            accountType: { S: "single" },
            createdAt: { S: currentTime },
            updatedAt: { S: currentTime },
          };

          // Create user profile in DynamoDB
          const userProfile = {
            PK: { S: `USER#${userId}` },
            SK: { S: "PROFILE" },
            entityType: { S: "USER" },
            userId: { S: userId },
            email: { S: googleEmail },
            firstName: { S: firstName || "User" },
            lastName: { S: lastName },
            familyId: { S: familyId },
            familyRole: { S: "primary" },
            accountType: { S: "single" },
            subscriptionTier: { S: "free" },
            authProvider: { S: "google" },
            onboardingCompleted: { BOOL: false },
            createdAt: { S: currentTime },
            updatedAt: { S: currentTime },
          };

          // Create both user and family records in a transaction
          const transactItems = [
            {
              Put: {
                TableName: TABLE_NAME,
                Item: familyProfile,
                ConditionExpression: "attribute_not_exists(PK)",
              },
            },
            {
              Put: {
                TableName: TABLE_NAME,
                Item: userProfile,
                ConditionExpression: "attribute_not_exists(PK)",
              },
            },
          ];

          const transactCommand = new TransactWriteItemsCommand({
            TransactItems: transactItems,
          });

          await dynamoClient.send(transactCommand);
          console.log("User profile and family created in DynamoDB");
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
        const tokenParts = token.split(".");
        if (tokenParts.length !== 3) {
          throw new Error("Invalid token format");
        }

        const payload = JSON.parse(
          Buffer.from(tokenParts[1], "base64").toString()
        );

        // Try to get userId from custom attribute, fallback to sub (Cognito user ID)
        let userId = payload["custom:userId"];
        if (!userId) {
          console.log(
            "custom:userId not found in token, using sub as fallback"
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
        const profile = {
          userId: result.Item.userId.S,
          email: result.Item.email.S,
          firstName: result.Item.firstName.S,
          lastName: result.Item.lastName.S,
          familyId: result.Item.familyId.S,
          familyRole: result.Item.familyRole.S,
          accountType: result.Item.accountType.S,
          subscriptionTier: result.Item.subscriptionTier.S,
          onboardingCompleted: result.Item.onboardingCompleted.BOOL,
          createdAt: result.Item.createdAt.S,
          updatedAt: result.Item.updatedAt.S,
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
        const tokenParts = token.split(".");
        if (tokenParts.length !== 3) {
          throw new Error("Invalid token format");
        }

        const payload = JSON.parse(
          Buffer.from(tokenParts[1], "base64").toString()
        );

        // Try to get userId from custom attribute, fallback to sub (Cognito user ID)
        let userId = payload["custom:userId"];
        if (!userId) {
          console.log(
            "custom:userId not found in token, using sub as fallback"
          );
          userId = payload.sub; // Use Cognito's sub as userId for legacy users
        }

        if (!userId) {
          throw new Error("User ID not found in token");
        }

        // Extract familyId from JWT if available (may be null)
        const jwtFamilyId = payload["custom:familyId"] || null;

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
        } catch (error) {
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
          requestBody.selectedCategories?.length
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
            !requestBody.selectedCategories
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

        console.log(
          "ONBOARDING DEBUG - Validation passed, proceeding with centralized family ID resolution"
        );

        // Use centralized FamilyIdResolver to get familyId consistently
        const familyId = await FamilyIdResolver.resolveFamilyId(
          userId,
          jwtFamilyId,
          dynamoHelpers
        );

        // Log the resolution for debugging
        FamilyIdResolver.logFamilyIdResolution(
          "auth-service",
          "onboarding",
          userId,
          familyId,
          jwtFamilyId ? "jwt" : "dynamodb-or-fallback"
        );

        const currentTime = new Date().toISOString();

        console.log("ONBOARDING DEBUG - Family ID resolution:");
        console.log("  - userId from token:", userId);
        console.log("  - jwtFamilyId from token:", jwtFamilyId);
        console.log("  - resolved familyId:", familyId);
        console.log("  - Budget PK will be:", `FAMILY#${familyId}`);
        console.log(
          "  - Budget SK will be:",
          `BUDGET#${requestBody.currentMonth}`
        );

        // Update user profile to mark onboarding as completed
        const { UpdateItemCommand } = require("@aws-sdk/client-dynamodb");

        const updateCommand = new UpdateItemCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: { S: `USER#${userId}` },
            SK: { S: "PROFILE" },
          },
          UpdateExpression:
            "SET onboardingCompleted = :completed, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":completed": { BOOL: true },
            ":updatedAt": { S: currentTime },
          },
          ReturnValues: "ALL_NEW",
        });

        await dynamoClient.send(updateCommand);
        console.log("User profile updated - onboarding completed");

        console.log("ONBOARDING DEBUG - Starting budget creation process");
        console.log("  - familyId:", familyId);
        console.log(
          "  - selectedCategories count:",
          requestBody.selectedCategories.length
        );

        // Create initial budget for current month with selected categories
        // CRITICAL FIX: Use currentMonth from frontend to ensure timezone consistency
        // Frontend sends timezone-aware currentMonth from getCurrentMonthString()
        const currentMonth = requestBody.currentMonth;
        const budgetId = `budget_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        // Transform selected categories into budget groups
        const expenseCategories = requestBody.selectedCategories.map((cat) => ({
          id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: cat.name,
          icon: cat.icon,
          plannedAmount: cat.adjustedAmount, // CRITICAL FIX: Use 'plannedAmount' to match budget service expectations
          spentAmount: 0, // CRITICAL FIX: Use 'spentAmount' to match budget service expectations
          transactions: [], // CRITICAL FIX: Add transactions array to match budget service expectations
          order: 1,
          isRecurring: false,
        }));

        const budgetGroups = {
          income: [],
          savings: [],
          expenses: expenseCategories,
        };

        // Calculate totals
        const totalExpenses = expenseCategories.reduce(
          (sum, cat) => sum + cat.plannedAmount, // CRITICAL FIX: Use 'plannedAmount' to match field name
          0
        );

        const budget = {
          PK: `FAMILY#${familyId}`,
          SK: `BUDGET#${currentMonth}`,
          GSI2PK: `BUDGET#${currentMonth}`,
          GSI2SK: `FAMILY#${familyId}`,
          entityType: "BUDGET",
          budgetId,
          familyId,
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

        // Import dynamoHelpers and FamilyIdResolver from utils layer
        const {
          dynamoHelpers,
          FamilyIdResolver,
        } = require("/opt/nodejs/utils");

        console.log("Creating budget with data:", {
          familyId,
          month: currentMonth,
          budgetId,
          totalExpenses,
          categoriesCount: expenseCategories.length,
          receivedCurrentMonth: requestBody.currentMonth,
        });

        // CRITICAL DEBUG: Verify the month values match exactly
        console.log("CRITICAL DEBUG - Month verification:");
        console.log("  - requestBody.currentMonth:", requestBody.currentMonth);
        console.log(
          "  - requestBody.currentMonth type:",
          typeof requestBody.currentMonth
        );
        console.log("  - currentMonth variable:", currentMonth);
        console.log("  - currentMonth variable type:", typeof currentMonth);
        console.log("  - budget.month will be:", currentMonth);
        console.log("  - SK will be:", `BUDGET#${currentMonth}`);
        console.log(
          "  - JSON.stringify(requestBody):",
          JSON.stringify(requestBody)
        );

        if (requestBody.currentMonth !== currentMonth) {
          console.error("MONTH MISMATCH DETECTED!");
          console.error("  - Expected:", requestBody.currentMonth);
          console.error("  - Actual:", currentMonth);
        }

        // ADDITIONAL DEBUG: Log the exact budget object being created
        console.log("CRITICAL DEBUG - Budget object being created:");
        console.log("  - PK:", `FAMILY#${familyId}`);
        console.log("  - SK:", `BUDGET#${currentMonth}`);
        console.log("  - month field:", currentMonth);
        console.log("  - Full budget object:", JSON.stringify(budget, null, 2));

        try {
          await dynamoHelpers.putItem(budget);
          console.log(
            "Initial budget created from onboarding selections - using dynamoHelpers"
          );

          // Log budget creation success with FamilyIdResolver
          FamilyIdResolver.logFamilyIdResolution(
            "auth-service",
            "budget-creation",
            userId,
            familyId,
            "budget-created"
          );

          // FINAL DEBUG: Confirm what was actually saved
          console.log("FINAL DEBUG - Budget saved to DynamoDB:");
          console.log("  - PK:", budget.PK);
          console.log("  - SK:", budget.SK);
          console.log("  - month:", budget.month);
          console.log("  - budgetId:", budget.budgetId);
          console.log("  - totalExpenses:", budget.totalExpenses);
          console.log("  - expenseCategories count:", expenseCategories.length);

          // VERIFICATION: Immediately query the budget to confirm it was saved
          try {
            const verificationBudget = await dynamoHelpers.getItem(
              `FAMILY#${familyId}`,
              `BUDGET#${currentMonth}`
            );

            if (verificationBudget) {
              console.log(
                "VERIFICATION SUCCESS - Budget found in DynamoDB immediately after creation"
              );
              console.log("  - Verified PK:", `FAMILY#${familyId}`);
              console.log("  - Verified SK:", `BUDGET#${currentMonth}`);
              console.log("  - Verified month:", verificationBudget.month);
              console.log(
                "  - Verified budgetId:",
                verificationBudget.budgetId
              );

              // Log successful verification
              FamilyIdResolver.logFamilyIdResolution(
                "auth-service",
                "budget-verification",
                userId,
                familyId,
                "verification-success"
              );
            } else {
              console.error(
                "VERIFICATION FAILED - Budget NOT found in DynamoDB immediately after creation!"
              );
              console.error("  - Searched PK:", `FAMILY#${familyId}`);
              console.error("  - Searched SK:", `BUDGET#${currentMonth}`);

              // Log verification failure
              FamilyIdResolver.logFamilyIdResolution(
                "auth-service",
                "budget-verification",
                userId,
                familyId,
                "verification-failed"
              );

              // Return error response for verification failure
              return {
                statusCode: 500,
                headers: getCorsHeaders(origin),
                body: JSON.stringify({
                  error: "Budget Creation Verification Failed",
                  message:
                    "Budget was created but could not be verified immediately",
                  debugInfo: {
                    userId,
                    familyId,
                    partitionKey: `FAMILY#${familyId}`,
                    sortKey: `BUDGET#${currentMonth}`,
                    budgetId: budget.budgetId,
                  },
                }),
              };
            }
          } catch (verifyError) {
            console.error(
              "VERIFICATION ERROR - Failed to verify budget creation:",
              verifyError
            );

            // Log verification error
            FamilyIdResolver.logFamilyIdResolution(
              "auth-service",
              "budget-verification",
              userId,
              familyId,
              "verification-error"
            );

            // Continue with success response even if verification failed
            console.warn(
              "Continuing with success response despite verification error"
            );
          }
        } catch (budgetError) {
          console.error(
            "CRITICAL ERROR - Budget creation failed:",
            budgetError
          );
          console.error("  - Error name:", budgetError.name);
          console.error("  - Error message:", budgetError.message);
          console.error("  - Error stack:", budgetError.stack);

          // Return error instead of success
          return {
            statusCode: 500,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({
              error: "Budget Creation Failed",
              message: "Failed to create initial budget during onboarding",
              details: budgetError.message,
            }),
          };
        }

        return {
          statusCode: 200,
          headers: getCorsHeaders(origin),
          body: JSON.stringify({
            message: "Onboarding completed successfully",
            budgetCreated: true,
            budgetId,
            month: currentMonth,
            totalExpenses,
            categoriesCreated: expenseCategories.length,
            debugInfo: {
              userId,
              familyId,
              jwtFamilyId,
              partitionKey: `FAMILY#${familyId}`,
              sortKey: `BUDGET#${currentMonth}`,
              resolutionSource: jwtFamilyId ? "jwt" : "dynamodb-or-fallback",
            },
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
          Buffer.from(idToken.split(".")[1], "base64").toString()
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
        // Fetch location from ipapi.co on behalf of the client
        const response = await fetch("https://ipapi.co/json/", {
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
        event.headers.origin || event.headers.Origin || ""
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
