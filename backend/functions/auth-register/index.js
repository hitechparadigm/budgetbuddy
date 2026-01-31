/**
 * BudgetBuddy Auth Registration Lambda Function
 *
 * Handles user registration, including:
 * - Input validation (email, password, name)
 * - Cognito user creation with email verification
 * - DynamoDB user profile creation
 * - Automatic family creation for single-person accounts
 *
 * CRITICAL: All imports at top of file to prevent ReferenceError bugs
 */

// AWS SDK imports (MUST be at top)
const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const {
  DynamoDBClient,
  TransactWriteItemsCommand,
} = require("@aws-sdk/client-dynamodb");

// Shared utilities from Lambda Layer (MUST be at top)
const { getCorsHeaders } = require("/opt/nodejs/shared/cors");
const {
  ValidationError,
  formatErrorResponse,
} = require("/opt/nodejs/shared/errors");

// Environment variables
const TABLE_NAME = process.env.TABLE_NAME;
const USER_POOL_ID = process.env.USER_POOL_ID;

// Initialize AWS clients
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

/**
 * Validate registration input
 * @param {Object} body - Request body
 * @returns {string[]} - Array of validation errors (empty if valid)
 */
function validateRegistrationInput(body) {
  const errors = [];

  if (!body.email || typeof body.email !== "string") {
    errors.push("Email is required and must be a string");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.push("Email must be a valid email address");
  }

  if (!body.password || typeof body.password !== "string") {
    errors.push("Password is required and must be a string");
  } else if (body.password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!body.firstName || typeof body.firstName !== "string") {
    errors.push("First name is required and must be a string");
  }

  if (!body.lastName || typeof body.lastName !== "string") {
    errors.push("Last name is required and must be a string");
  }

  return errors;
}

/**
 * Lambda handler for user registration
 */
exports.handler = async (event) => {
  console.log("=== AUTH REGISTRATION LAMBDA ===");
  console.log("Event:", JSON.stringify(event, null, 2));

  const origin = event.headers?.origin || event.headers?.Origin || "*";

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: getCorsHeaders(origin),
      body: "",
    };
  }

  try {
    // Parse and validate request body
    if (!event.body) {
      throw new ValidationError(["Request body is required"]);
    }

    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      throw new ValidationError(["Invalid JSON format"]);
    }

    // Validate registration input
    const validationErrors = validateRegistrationInput(requestBody);
    if (validationErrors.length > 0) {
      throw new ValidationError(validationErrors);
    }

    console.log("Validation passed, creating user in Cognito");

    // Generate unique user ID
    const userId = `user_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;

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
      MessageAction: "SUPPRESS", // Don't send welcome email
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

    // Return success response
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
          "Start tracking expenses",
        ],
      }),
    };
  } catch (error) {
    console.error("Registration error:", error);

    // Handle custom errors
    if (error instanceof ValidationError) {
      return formatErrorResponse(error, origin);
    }

    // Handle Cognito errors
    if (error.name === "UsernameExistsException") {
      return {
        statusCode: 409,
        headers: getCorsHeaders(origin),
        body: JSON.stringify({
          error: "Conflict",
          message: "User with this email already exists",
        }),
      };
    }

    // Handle unexpected errors
    return {
      statusCode: 500,
      headers: getCorsHeaders(origin),
      body: JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to register user",
        details: error.message,
      }),
    };
  }
};
