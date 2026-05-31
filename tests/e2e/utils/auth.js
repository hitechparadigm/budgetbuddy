/**
 * E2E Test Authentication Utilities
 *
 * Provides Cognito user management for E2E tests:
 * - Create test users with specific roles
 * - Authenticate users and get tokens
 * - Delete test users for cleanup
 * - Verify email addresses for test users
 *
 * Uses AWS SDK v3 for Cognito operations.
 */

const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminDeleteUserCommand,
  AdminUpdateUserAttributesCommand,
  InitiateAuthCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

// Get Cognito client (lazy initialization)
function getCognitoClient() {
  const region = process.env.AWS_REGION || "us-east-1";
  return new CognitoIdentityProviderClient({ region });
}

/**
 * Create a Cognito user for testing
 * @param {string} email - User email address
 * @param {string} password - User password
 * @param {Object} attributes - Additional user attributes (familyId, role, etc.)
 * @returns {Promise<Object>} Created user details
 */
async function createCognitoUser(email, password, attributes = {}) {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;

  if (!userPoolId) {
    throw new Error("COGNITO_USER_POOL_ID environment variable is required");
  }

  const cognitoClient = getCognitoClient();

  try {
    // Create user
    const createCommand = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
        ...Object.entries(attributes).map(([key, value]) => ({
          Name: `custom:${key}`,
          Value: String(value),
        })),
      ],
      MessageAction: "SUPPRESS", // Don't send welcome email
      TemporaryPassword: password,
    });

    const createResult = await cognitoClient.send(createCommand);

    // Set permanent password
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: email,
      Password: password,
      Permanent: true,
    });

    await cognitoClient.send(setPasswordCommand);

    return {
      userId: createResult.User.Username,
      email,
      attributes: createResult.User.Attributes,
    };
  } catch (error) {
    throw new Error(`Failed to create Cognito user: ${error.message}`);
  }
}

/**
 * Authenticate a user and get tokens
 * @param {string} email - User email address
 * @param {string} password - User password
 * @returns {Promise<Object>} Authentication tokens
 */
async function authenticateUser(email, password) {
  const clientId = process.env.COGNITO_CLIENT_ID;

  if (!clientId) {
    throw new Error("COGNITO_CLIENT_ID environment variable is required");
  }

  const cognitoClient = getCognitoClient();

  try {
    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const result = await cognitoClient.send(command);

    if (!result.AuthenticationResult) {
      throw new Error("Authentication failed - no tokens returned");
    }

    return {
      accessToken: result.AuthenticationResult.AccessToken,
      idToken: result.AuthenticationResult.IdToken,
      refreshToken: result.AuthenticationResult.RefreshToken,
      expiresIn: result.AuthenticationResult.ExpiresIn,
    };
  } catch (error) {
    throw new Error(`Failed to authenticate user: ${error.message}`);
  }
}

/**
 * Delete a Cognito user
 * @param {string} userId - User ID or email to delete
 * @returns {Promise<void>}
 */
async function deleteCognitoUser(userId) {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;

  if (!userPoolId) {
    throw new Error("COGNITO_USER_POOL_ID environment variable is required");
  }

  const cognitoClient = getCognitoClient();

  try {
    const command = new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: userId,
    });

    await cognitoClient.send(command);
  } catch (error) {
    // Ignore UserNotFoundException - user already deleted
    if (error.name !== "UserNotFoundException") {
      throw new Error(`Failed to delete Cognito user: ${error.message}`);
    }
  }
}

/**
 * Verify email for a test user
 * @param {string} email - User email address
 * @returns {Promise<void>}
 */
async function verifyEmail(email) {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;

  if (!userPoolId) {
    throw new Error("COGNITO_USER_POOL_ID environment variable is required");
  }

  const cognitoClient = getCognitoClient();

  try {
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: email,
      UserAttributes: [{ Name: "email_verified", Value: "true" }],
    });

    await cognitoClient.send(command);
  } catch (error) {
    throw new Error(`Failed to verify email: ${error.message}`);
  }
}

module.exports = {
  createCognitoUser,
  authenticateUser,
  deleteCognitoUser,
  verifyEmail,
};
