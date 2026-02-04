/**
 * Test Lambda Functions Locally with LocalStack
 *
 * Usage:
 *   node scripts/test-lambda-local.js accounts create
 *   node scripts/test-lambda-local.js family invite
 */

const path = require("path");

// Set environment variables for LocalStack
process.env.AWS_ENDPOINT_URL = "http://localhost:4566";
process.env.TABLE_NAME = "budgetbuddy-main";
process.env.AWS_REGION = "us-east-1";
process.env.AWS_ACCESS_KEY_ID = "test";
process.env.AWS_SECRET_ACCESS_KEY = "test";

const lambdaName = process.argv[2];
const operation = process.argv[3];

if (!lambdaName) {
  console.error(
    "Usage: node scripts/test-lambda-local.js <lambda-name> <operation>",
  );
  console.error("Example: node scripts/test-lambda-local.js accounts create");
  process.exit(1);
}

/**
 * Test accounts Lambda - create account
 */
async function testAccountsCreate() {
  console.log("🧪 Testing accounts Lambda - create account\n");

  const handler = require("../backend/functions/accounts/index");

  const event = {
    httpMethod: "POST",
    path: "/accounts",
    body: JSON.stringify({
      accountType: "loan",
      accountSubtype: "mortgage",
      nickname: "Test Mortgage",
      institutionName: "Test Bank",
      currentBalance: 384000,
      currency: "CAD",
    }),
    requestContext: {
      authorizer: {
        claims: {
          "custom:userId": "user_test_123",
          "custom:familyId": "family_user_test_123",
          "custom:familyRole": "primary",
          email: "test@example.com",
        },
      },
    },
  };

  const context = {
    awsRequestId: "test-request-id",
  };

  try {
    const result = await handler.handler(event, context);
    console.log(
      "✅ Response:",
      JSON.stringify(JSON.parse(result.body), null, 2),
    );
    console.log("📊 Status Code:", result.statusCode);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

/**
 * Test accounts Lambda - list accounts
 */
async function testAccountsList() {
  console.log("🧪 Testing accounts Lambda - list accounts\n");

  const handler = require("../backend/functions/accounts/index");

  const event = {
    httpMethod: "GET",
    path: "/accounts",
    queryStringParameters: null,
    requestContext: {
      authorizer: {
        claims: {
          "custom:userId": "user_test_123",
          "custom:familyId": "family_user_test_123",
          "custom:familyRole": "primary",
          email: "test@example.com",
        },
      },
    },
  };

  const context = {
    awsRequestId: "test-request-id",
  };

  try {
    const result = await handler.handler(event, context);
    console.log(
      "✅ Response:",
      JSON.stringify(JSON.parse(result.body), null, 2),
    );
    console.log("📊 Status Code:", result.statusCode);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

/**
 * Test family Lambda - send invite
 */
async function testFamilyInvite() {
  console.log("🧪 Testing family Lambda - send invite\n");

  const handler = require("../backend/functions/family/index");

  const event = {
    httpMethod: "POST",
    path: "/family/invite",
    body: JSON.stringify({
      email: "spouse@example.com",
      role: "spouse",
    }),
    headers: {
      Authorization: "Bearer test-token",
    },
    requestContext: {
      authorizer: {
        claims: {
          "custom:userId": "user_test_123",
          "custom:familyId": "family_user_test_123",
          "custom:familyRole": "primary",
          email: "test@example.com",
        },
      },
    },
  };

  const context = {
    awsRequestId: "test-request-id",
  };

  try {
    const result = await handler.handler(event);
    console.log(
      "✅ Response:",
      JSON.stringify(JSON.parse(result.body), null, 2),
    );
    console.log("📊 Status Code:", result.statusCode);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

/**
 * Test family Lambda - get members
 */
async function testFamilyMembers() {
  console.log("🧪 Testing family Lambda - get members\n");

  const handler = require("../backend/functions/family/index");

  const event = {
    httpMethod: "GET",
    path: "/family/members",
    headers: {
      Authorization: "Bearer test-token",
    },
    requestContext: {
      authorizer: {
        claims: {
          "custom:userId": "user_test_123",
          "custom:familyId": "family_user_test_123",
          "custom:familyRole": "primary",
          email: "test@example.com",
        },
      },
    },
  };

  const context = {
    awsRequestId: "test-request-id",
  };

  try {
    const result = await handler.handler(event);
    console.log(
      "✅ Response:",
      JSON.stringify(JSON.parse(result.body), null, 2),
    );
    console.log("📊 Status Code:", result.statusCode);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

/**
 * Main test runner
 */
async function runTest() {
  console.log("🚀 LocalStack Lambda Testing\n");
  console.log(`Lambda: ${lambdaName}`);
  console.log(`Operation: ${operation}\n`);

  if (lambdaName === "accounts") {
    if (operation === "create") {
      await testAccountsCreate();
    } else if (operation === "list") {
      await testAccountsList();
    } else {
      console.error("Unknown operation. Use: create, list");
    }
  } else if (lambdaName === "family") {
    if (operation === "invite") {
      await testFamilyInvite();
    } else if (operation === "members") {
      await testFamilyMembers();
    } else {
      console.error("Unknown operation. Use: invite, members");
    }
  } else {
    console.error("Unknown lambda. Use: accounts, family");
  }
}

runTest();
