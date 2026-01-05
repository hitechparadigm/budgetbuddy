#!/usr/bin/env node

/**
 * Create Test User Script
 * Creates a test user in Cognito for testing the transaction API
 */

const AWS = require("aws-sdk");

// Configure AWS SDK
AWS.config.update({
  region: "us-east-1",
  profile: "hitechparadigm", // Use your AWS profile
});

const cognito = new AWS.CognitoIdentityServiceProvider();

const TEST_USER = {
  username: "testuser@example.com",
  password: process.env.TEST_USER_PASSWORD || "CHANGE_ME_IN_ENV",
  userPoolId: "us-east-1_LAkOBLENO",
  clientId: "2la8f6olb9ns1n5530m3mrmndd",
};

async function createTestUser() {
  console.log("👤 Creating test user for transaction testing...");
  console.log("===============================================\\n");

  try {
    // Step 1: Create the user
    console.log("1. Creating user in Cognito...");
    const createParams = {
      UserPoolId: TEST_USER.userPoolId,
      Username: TEST_USER.username,
      TemporaryPassword: TEST_USER.password,
      MessageAction: "SUPPRESS", // Don't send welcome email
      UserAttributes: [
        {
          Name: "email",
          Value: TEST_USER.username,
        },
        {
          Name: "email_verified",
          Value: "true",
        },
        {
          Name: "custom:familyId",
          Value: "family_test_001",
        },
        {
          Name: "custom:role",
          Value: "admin",
        },
      ],
    };

    try {
      await cognito.adminCreateUser(createParams).promise();
      console.log("✅ User created successfully");
    } catch (error) {
      if (error.code === "UsernameExistsException") {
        console.log("ℹ️  User already exists, continuing...");
      } else {
        throw error;
      }
    }

    // Step 2: Set permanent password
    console.log("\\n2. Setting permanent password...");
    const setPasswordParams = {
      UserPoolId: TEST_USER.userPoolId,
      Username: TEST_USER.username,
      Password: TEST_USER.password,
      Permanent: true,
    };

    await cognito.adminSetUserPassword(setPasswordParams).promise();
    console.log("✅ Password set successfully");

    // Step 3: Test authentication
    console.log("\\n3. Testing authentication...");
    const authParams = {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: TEST_USER.clientId,
      AuthParameters: {
        USERNAME: TEST_USER.username,
        PASSWORD: TEST_USER.password,
      },
    };

    const authResult = await cognito.initiateAuth(authParams).promise();

    if (
      authResult.AuthenticationResult &&
      authResult.AuthenticationResult.AccessToken
    ) {
      console.log("✅ Authentication test successful");

      // Decode the token to show user info
      const token = authResult.AuthenticationResult.AccessToken;
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
      );

      console.log("\\n📋 User Details:");
      console.log(`   Username: ${payload.username}`);
      console.log(`   Email: ${payload.email}`);
      console.log(`   Family ID: ${payload["custom:familyId"]}`);
      console.log(`   Role: ${payload["custom:role"]}`);
    }

    console.log("\\n🎉 Test user created and configured successfully!");
    console.log("\\n📝 Test User Credentials:");
    console.log(`   Email: ${TEST_USER.username}`);
    console.log(
      `   Password: [Set via TEST_USER_PASSWORD environment variable]`
    );
    console.log(`   Family ID: family_test_001`);
    console.log("\\n💡 Next steps:");
    console.log("   1. Set TEST_USER_PASSWORD environment variable");
    console.log("   2. Run: node scripts/test-transactions.js");
    console.log("   3. Or use these credentials in your frontend app");
  } catch (error) {
    console.error("❌ Failed to create test user:", error.message);

    if (error.code === "InvalidParameterException") {
      console.log("💡 Check that the user pool ID and client ID are correct");
    } else if (error.code === "AccessDeniedException") {
      console.log("💡 Check your AWS credentials and permissions");
    }

    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  createTestUser();
}

module.exports = { createTestUser };
