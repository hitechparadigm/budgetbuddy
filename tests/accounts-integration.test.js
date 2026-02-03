/**
 * Accounts Integration Tests
 *
 * Tests the complete manual account creation flow including:
 * - Account creation
 * - Account listing
 * - Account retrieval
 * - Account update
 * - Account deletion
 * - Validation errors
 *
 * **Validates: Requirements 2.2, 2.4, 2.5, 2.7**
 */

const https = require("https");

// Test configuration
const MAIN_API_BASE =
  "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1";
const TEST_USER_EMAIL = "dmytro.malyk@gmail.com";
const TEST_USER_PASSWORD = "Test123!"; // Update with actual password

// Helper function to make API calls
function apiCall(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, MAIN_API_BASE);

    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    const req = https.request(url, options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Helper to login and get ID token
async function loginUser(email, password) {
  const response = await apiCall("POST", "/auth/login", {
    email,
    password,
  });

  if (response.statusCode !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(response.body)}`);
  }

  return response.body.data.idToken;
}

describe("Accounts Integration Tests", () => {
  let userToken;
  let createdAccountId;

  beforeAll(async () => {
    console.log("🔐 Logging in test user...");
    userToken = await loginUser(TEST_USER_EMAIL, TEST_USER_PASSWORD);
    console.log("✅ Login successful");
  });

  afterAll(async () => {
    // Clean up: delete the test account if it was created
    if (createdAccountId) {
      console.log(`🧹 Cleaning up test account: ${createdAccountId}`);
      await apiCall("DELETE", `/accounts/${createdAccountId}`, null, userToken);
    }
  });

  describe("1. Account Creation", () => {
    test("should create a manual checking account", async () => {
      const accountData = {
        type: "banking",
        subtype: "checking",
        nickname: "Test Checking Account",
        balance: 1000.0,
        currency: "USD",
        isManual: true,
      };

      console.log("💳 Creating manual checking account...");
      const response = await apiCall(
        "POST",
        "/accounts",
        accountData,
        userToken,
      );

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.accountId).toBeDefined();
      expect(response.body.data.nickname).toBe(accountData.nickname);
      expect(response.body.data.type).toBe(accountData.type);
      expect(response.body.data.subtype).toBe(accountData.subtype);
      expect(response.body.data.balance).toBe(accountData.balance);

      createdAccountId = response.body.data.accountId;
      console.log(`✅ Account created: ${createdAccountId}`);
    });

    test("should fail to create account with invalid type", async () => {
      const invalidAccount = {
        type: "invalid_type",
        subtype: "checking",
        nickname: "Invalid Account",
        balance: 100.0,
      };

      const response = await apiCall(
        "POST",
        "/accounts",
        invalidAccount,
        userToken,
      );

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("should fail to create account with mismatched subtype", async () => {
      const invalidAccount = {
        type: "banking",
        subtype: "credit_card", // credit_card is not a valid subtype for banking
        nickname: "Mismatched Account",
        balance: 100.0,
      };

      const response = await apiCall(
        "POST",
        "/accounts",
        invalidAccount,
        userToken,
      );

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("should fail to create account with empty nickname", async () => {
      const invalidAccount = {
        type: "banking",
        subtype: "checking",
        nickname: "",
        balance: 100.0,
      };

      const response = await apiCall(
        "POST",
        "/accounts",
        invalidAccount,
        userToken,
      );

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("2. Account Listing", () => {
    test("should list all accounts", async () => {
      const response = await apiCall("GET", "/accounts", null, userToken);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data.accounts)).toBe(true);

      // Verify the created account is in the list
      if (createdAccountId) {
        const account = response.body.data.accounts.find(
          (a) => a.accountId === createdAccountId,
        );
        expect(account).toBeDefined();
        expect(account.nickname).toBe("Test Checking Account");
      }

      console.log(`📋 Found ${response.body.data.accounts.length} accounts`);
    });

    test("should include account count in response", async () => {
      const response = await apiCall("GET", "/accounts", null, userToken);

      expect(response.statusCode).toBe(200);
      expect(response.body.data.count).toBeDefined();
      expect(typeof response.body.data.count).toBe("number");
    });
  });

  describe("3. Account Retrieval", () => {
    test("should get account by ID", async () => {
      if (!createdAccountId) {
        console.log("⚠️  No account to retrieve");
        return;
      }

      const response = await apiCall(
        "GET",
        `/accounts/${createdAccountId}`,
        null,
        userToken,
      );

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accountId).toBe(createdAccountId);
      expect(response.body.data.nickname).toBe("Test Checking Account");
    });

    test("should return 404 for non-existent account", async () => {
      const response = await apiCall(
        "GET",
        "/accounts/non-existent-account-id",
        null,
        userToken,
      );

      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe("4. Account Update", () => {
    test("should update account nickname", async () => {
      if (!createdAccountId) {
        console.log("⚠️  No account to update");
        return;
      }

      const updateData = {
        nickname: "Updated Checking Account",
      };

      const response = await apiCall(
        "PUT",
        `/accounts/${createdAccountId}`,
        updateData,
        userToken,
      );

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.nickname).toBe(updateData.nickname);

      console.log("✅ Account nickname updated");
    });

    test("should update account balance", async () => {
      if (!createdAccountId) {
        console.log("⚠️  No account to update");
        return;
      }

      const updateData = {
        balance: 2500.0,
      };

      const response = await apiCall(
        "PUT",
        `/accounts/${createdAccountId}`,
        updateData,
        userToken,
      );

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.balance).toBe(updateData.balance);

      console.log("✅ Account balance updated");
    });
  });

  describe("5. CORS Headers", () => {
    test("should include CORS headers on success", async () => {
      const response = await apiCall("GET", "/accounts", null, userToken);

      expect(response.statusCode).toBe(200);
      expect(response.headers["access-control-allow-origin"]).toBeDefined();
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
    });

    test("should include CORS headers on 401 error", async () => {
      const response = await apiCall("GET", "/accounts", null, null);

      expect(response.statusCode).toBe(401);
      expect(response.headers["access-control-allow-origin"]).toBeDefined();
    });
  });

  describe("6. Authorization Tests", () => {
    test("should require authentication for account endpoints", async () => {
      const endpoints = [
        { method: "GET", path: "/accounts" },
        { method: "POST", path: "/accounts" },
        { method: "GET", path: "/accounts/test-id" },
        { method: "PUT", path: "/accounts/test-id" },
        { method: "DELETE", path: "/accounts/test-id" },
      ];

      for (const endpoint of endpoints) {
        const response = await apiCall(
          endpoint.method,
          endpoint.path,
          endpoint.method === "POST" || endpoint.method === "PUT"
            ? { nickname: "test" }
            : null,
          null,
        );
        expect(response.statusCode).toBe(401);
      }
    });
  });

  describe("7. Performance Tests", () => {
    test("should respond within acceptable time", async () => {
      const start = Date.now();
      const response = await apiCall("GET", "/accounts", null, userToken);
      const duration = Date.now() - start;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(2000); // Should respond within 2 seconds

      console.log(`⏱️  Response time: ${duration}ms`);
    });

    test("should handle concurrent requests", async () => {
      const requests = Array(5)
        .fill(null)
        .map(() => apiCall("GET", "/accounts", null, userToken));

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.statusCode).toBe(200);
      });
    });
  });

  describe("8. Account Deletion", () => {
    test("should delete account", async () => {
      if (!createdAccountId) {
        console.log("⚠️  No account to delete");
        return;
      }

      console.log(`🗑️  Deleting account: ${createdAccountId}`);
      const response = await apiCall(
        "DELETE",
        `/accounts/${createdAccountId}`,
        null,
        userToken,
      );

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify account is gone
      const getResponse = await apiCall(
        "GET",
        `/accounts/${createdAccountId}`,
        null,
        userToken,
      );
      expect(getResponse.statusCode).toBe(404);

      // Clear the ID so afterAll doesn't try to delete again
      createdAccountId = null;
      console.log("✅ Account deleted");
    });

    test("should return 404 when deleting non-existent account", async () => {
      const response = await apiCall(
        "DELETE",
        "/accounts/non-existent-account-id",
        null,
        userToken,
      );

      expect(response.statusCode).toBe(404);
    });
  });
});

// Run tests
if (require.main === module) {
  console.log("🧪 Running Accounts Integration Tests\n");
  console.log("⚠️  Make sure you have:");
  console.log("   1. Updated TEST_USER_PASSWORD with actual password");
  console.log("   2. Deployed the latest code to dev environment");
  console.log("   3. User dmytro.malyk@gmail.com exists in Cognito");
  console.log("   4. Gateway Responses configured for CORS\n");
}
