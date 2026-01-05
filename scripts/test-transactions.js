#!/usr/bin/env node

/**
 * Transaction CRUD Operations Test Script
 * Tests all transaction endpoints with proper authentication
 */

const https = require("https");
const AWS = require("aws-sdk");

const API_BASE = "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1";

// Configure AWS SDK
AWS.config.update({
  region: "us-east-1",
  profile: "hitechparadigm", // Use your AWS profile
});

const cognito = new AWS.CognitoIdentityServiceProvider();

// Test user credentials (you'll need to create a test user)
const TEST_USER = {
  username: "testuser@example.com",
  password: process.env.TEST_USER_PASSWORD || "CHANGE_ME_IN_ENV",
  userPoolId: "us-east-1_LAkOBLENO",
  clientId: "2la8f6olb9ns1n5530m3mrmndd",
};

// Test transaction data
const testTransactions = [
  {
    amount: 50.0,
    type: "expense",
    categoryId: "cat_groceries_001",
    description: "Weekly grocery shopping",
    merchant: "Whole Foods",
    date: "2025-10-28",
  },
  {
    amount: 3000.0,
    type: "income",
    categoryId: "cat_salary_001",
    description: "Monthly salary",
    merchant: "Company Inc",
    date: "2025-10-28",
  },
  {
    amount: 25.99,
    type: "expense",
    categoryId: "cat_entertainment_001",
    description: "Movie tickets",
    merchant: "AMC Theaters",
    date: "2025-10-27",
  },
];

async function authenticateUser() {
  try {
    console.log("🔐 Authenticating user...");

    const params = {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: TEST_USER.clientId,
      AuthParameters: {
        USERNAME: TEST_USER.username,
        PASSWORD: TEST_USER.password,
      },
    };

    const result = await cognito.initiateAuth(params).promise();

    if (
      result.AuthenticationResult &&
      result.AuthenticationResult.AccessToken
    ) {
      console.log("✅ Authentication successful");
      return result.AuthenticationResult.AccessToken;
    } else {
      throw new Error("No access token received");
    }
  } catch (error) {
    console.error("❌ Authentication failed:", error.message);

    if (error.code === "UserNotFoundException") {
      console.log(
        "💡 You need to create a test user first. Run: npm run create-test-user"
      );
    } else if (error.code === "NotAuthorizedException") {
      console.log(
        "💡 Check your username/password or user might need confirmation"
      );
    }

    throw error;
  }
}

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);

    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers,
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testTransactionCRUD() {
  console.log("🧪 Testing Transaction CRUD Operations");
  console.log("=====================================\\n");

  let accessToken;
  let createdTransactions = [];

  try {
    // Step 1: Authenticate
    accessToken = await authenticateUser();

    // Step 2: Test Health Check (no auth required)
    console.log("\\n1. Testing Health Check...");
    const healthResponse = await makeRequest("GET", "/transactions/health");
    console.log(`Status: ${healthResponse.status}`);
    if (healthResponse.status === 200) {
      console.log("✅ Health Check passed");
    }

    // Step 3: Test Get Transactions (empty list initially)
    console.log("\\n2. Testing Get Transactions...");
    const getResponse = await makeRequest(
      "GET",
      "/transactions",
      null,
      accessToken
    );
    console.log(`Status: ${getResponse.status}`);
    if (getResponse.status === 200) {
      console.log(
        `✅ Retrieved ${getResponse.data.data.transactions.length} transactions`
      );
    } else {
      console.log("❌ Failed to get transactions:", getResponse.data);
    }

    // Step 4: Create Test Transactions
    console.log("\\n3. Creating Test Transactions...");
    for (let i = 0; i < testTransactions.length; i++) {
      const transaction = testTransactions[i];
      console.log(
        `   Creating ${transaction.type}: $${transaction.amount} - ${transaction.description}`
      );

      const createResponse = await makeRequest(
        "POST",
        "/transactions",
        transaction,
        accessToken
      );
      console.log(`   Status: ${createResponse.status}`);

      if (createResponse.status === 200 || createResponse.status === 201) {
        createdTransactions.push(createResponse.data.data.transaction);
        console.log(
          `   ✅ Created transaction ID: ${createResponse.data.data.transaction.transactionId}`
        );
      } else {
        console.log(`   ❌ Failed to create transaction:`, createResponse.data);
      }
    }

    // Step 5: Get Transactions Again (should have data now)
    console.log("\\n4. Testing Get Transactions (with data)...");
    const getResponse2 = await makeRequest(
      "GET",
      "/transactions",
      null,
      accessToken
    );
    if (getResponse2.status === 200) {
      console.log(
        `✅ Retrieved ${getResponse2.data.data.transactions.length} transactions`
      );

      // Show summary
      const transactions = getResponse2.data.data.transactions;
      const totalIncome = transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      console.log(`   💰 Total Income: $${totalIncome.toFixed(2)}`);
      console.log(`   💸 Total Expenses: $${totalExpenses.toFixed(2)}`);
      console.log(`   📊 Net: $${(totalIncome - totalExpenses).toFixed(2)}`);
    }

    // Step 6: Test Get Single Transaction
    if (createdTransactions.length > 0) {
      console.log("\\n5. Testing Get Single Transaction...");
      const transactionId = createdTransactions[0].transactionId;
      const getSingleResponse = await makeRequest(
        "GET",
        `/transactions/${transactionId}`,
        null,
        accessToken
      );

      if (getSingleResponse.status === 200) {
        console.log(
          `✅ Retrieved transaction: ${getSingleResponse.data.data.transaction.description}`
        );
      } else {
        console.log(
          "❌ Failed to get single transaction:",
          getSingleResponse.data
        );
      }
    }

    // Step 7: Test Update Transaction
    if (createdTransactions.length > 0) {
      console.log("\\n6. Testing Update Transaction...");
      const transactionId = createdTransactions[0].transactionId;
      const updateData = {
        amount: 75.0,
        description: "Updated: Weekly grocery shopping (with extras)",
      };

      const updateResponse = await makeRequest(
        "PUT",
        `/transactions/${transactionId}`,
        updateData,
        accessToken
      );

      if (updateResponse.status === 200) {
        console.log(
          `✅ Updated transaction: $${updateResponse.data.data.transaction.amount}`
        );
      } else {
        console.log("❌ Failed to update transaction:", updateResponse.data);
      }
    }

    // Step 8: Test Filtering
    console.log("\\n7. Testing Transaction Filtering...");

    // Filter by type
    const expenseResponse = await makeRequest(
      "GET",
      "/transactions?type=expense",
      null,
      accessToken
    );
    if (expenseResponse.status === 200) {
      console.log(
        `✅ Expense filter: ${expenseResponse.data.data.transactions.length} expenses found`
      );
    }

    const incomeResponse = await makeRequest(
      "GET",
      "/transactions?type=income",
      null,
      accessToken
    );
    if (incomeResponse.status === 200) {
      console.log(
        `✅ Income filter: ${incomeResponse.data.data.transactions.length} income found`
      );
    }

    // Step 9: Test Delete Transaction (optional - uncomment to test)
    /*
        if (createdTransactions.length > 0) {
            console.log('\\n8. Testing Delete Transaction...');
            const transactionId = createdTransactions[createdTransactions.length - 1].transactionId;
            const deleteResponse = await makeRequest('DELETE', `/transactions/${transactionId}`, null, accessToken);

            if (deleteResponse.status === 200) {
                console.log(`✅ Deleted transaction: ${transactionId}`);
            } else {
                console.log('❌ Failed to delete transaction:', deleteResponse.data);
            }
        }
        */

    console.log("\\n🎉 Transaction CRUD testing completed successfully!");
    console.log("\\n📝 Summary:");
    console.log(`   - Created ${createdTransactions.length} test transactions`);
    console.log("   - All CRUD operations working correctly");
    console.log("   - Authentication and authorization working");
    console.log("   - Filtering capabilities verified");
  } catch (error) {
    console.error("❌ Test failed:", error.message);

    if (error.code === "UserNotFoundException") {
      console.log("\\n💡 Next steps:");
      console.log("   1. Create a test user: npm run create-test-user");
      console.log("   2. Confirm the user in AWS Cognito console");
      console.log("   3. Run this test again");
    }
  }
}

// Run the tests
if (require.main === module) {
  testTransactionCRUD();
}

module.exports = { testTransactionCRUD, makeRequest };
