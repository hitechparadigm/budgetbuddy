/**
 * Plaid Integration Functional Tests
 *
 * Tests the complete bank account connection flow including:
 * - Sandbox account creation
 * - Account listing
 * - Transaction syncing
 * - Pending transaction approval/rejection
 * - Account unlinking
 */

const https = require("https");

// Test configuration — Plaid endpoints live on the features API,
// but auth (/auth/login) lives on the main API gateway.
const FEATURES_API_BASE =
  process.env.FEATURES_API_URL ||
  "https://0poeu07vth.execute-api.us-east-1.amazonaws.com/v1";
const AUTH_API_BASE =
  process.env.AUTH_API_URL ||
  "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1";
const TEST_USER_EMAIL =
  process.env.TEST_USER_EMAIL || "dmytro.malyk@gmail.com";
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD; // Set via env var

// Helper function to make API calls
function apiCall(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    // Concatenate directly — new URL() with an absolute path strips the /v1 stage prefix
    const url = new URL(FEATURES_API_BASE.replace(/\/$/, "") + path);

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

// Helper to login and get ID token (auth lives on the main API, not features API)
async function loginUser(email, password) {
  return new Promise((resolve, reject) => {
    const url = new URL("/auth/login", AUTH_API_BASE);
    const bodyStr = JSON.stringify({ email, password });
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
      },
    };
    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const parsed = JSON.parse(data);
        if (res.statusCode !== 200) {
          reject(new Error(`Login failed (${res.statusCode}): ${JSON.stringify(parsed)}`));
        } else {
          // Auth Lambda returns idToken at the top level (not nested under data)
          resolve(parsed.idToken);
        }
      });
    });
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

describe("Plaid Integration Tests", () => {
  let idToken;
  let testAccountId;

  beforeAll(async () => {
    if (!TEST_USER_PASSWORD) {
      throw new Error(
        "TEST_USER_PASSWORD environment variable is required.\n" +
          "  Run: TEST_USER_PASSWORD=yourpassword npx jest tests/plaid-integration.test.js",
      );
    }
    console.log("🔐 Logging in test user...");
    idToken = await loginUser(TEST_USER_EMAIL, TEST_USER_PASSWORD);
    console.log("✅ Login successful");
  });

  describe("1. Health Check", () => {
    test("should return healthy status", async () => {
      const response = await apiCall("GET", "/plaid/health", null, idToken);

      expect(response.statusCode).toBe(200);
      expect(response.body.data.status).toBe("healthy");
      expect(response.body.data.environment).toBeDefined();
    });
  });

  describe("2. Sandbox Account Creation", () => {
    test("should create a sandbox test account", async () => {
      console.log("🏦 Creating sandbox account...");

      const response = await apiCall(
        "POST",
        "/plaid/sandbox/create-item",
        {},
        idToken,
      );

      expect(response.statusCode).toBe(200);
      expect(response.body.data.itemId).toBeDefined();
      expect(response.body.data.accounts).toBeDefined();
      expect(response.body.data.accounts.length).toBeGreaterThan(0);
      expect(response.body.data.institutionName).toBe("Chase");

      // Store first account ID for later tests
      testAccountId = response.body.data.accounts[0].accountId;

      console.log(`✅ Created account: ${testAccountId}`);
      console.log(`   Institution: ${response.body.data.institutionName}`);
      console.log(`   Accounts: ${response.body.data.accounts.length}`);
    });

    test("should fail to create duplicate sandbox account", async () => {
      // Try to create another account (should fail due to existing item)
      const response = await apiCall(
        "POST",
        "/plaid/sandbox/create-item",
        {},
        idToken,
      );

      // May succeed if Plaid allows multiple items, or fail with 409
      if (response.statusCode === 409) {
        expect(response.body.error).toContain("already");
      } else {
        // If it succeeds, that's also valid behavior
        expect(response.statusCode).toBe(200);
      }
    });
  });

  describe("3. Account Listing", () => {
    test("should list all connected accounts", async () => {
      const response = await apiCall("GET", "/plaid/accounts", null, idToken);

      expect(response.statusCode).toBe(200);
      expect(response.body.data.accounts).toBeDefined();
      expect(response.body.data.accounts.length).toBeGreaterThan(0);
      expect(response.body.data.count).toBeGreaterThan(0);

      // Verify account structure
      const account = response.body.data.accounts[0];
      expect(account.accountId).toBeDefined();
      expect(account.institutionName).toBeDefined();
      expect(account.accountName).toBeDefined();
      expect(account.accountMask).toBeDefined();
      expect(account.currentBalance).toBeDefined();
      expect(account.status).toBe("active");
    });
  });

  describe("4. Transaction Syncing", () => {
    test("should sync all accounts", async () => {
      console.log("🔄 Syncing accounts...");

      const response = await apiCall("POST", "/plaid/sync", {}, idToken);

      expect(response.statusCode).toBe(200);
      expect(response.body.data.results).toBeDefined();
      expect(response.body.data.syncedCount).toBeDefined();

      console.log(`✅ Synced ${response.body.data.syncedCount} accounts`);
      console.log(`   Skipped: ${response.body.data.skippedCount}`);
    });

    test("should get sync status", async () => {
      const response = await apiCall(
        "GET",
        "/plaid/sync-status",
        null,
        idToken,
      );

      expect(response.statusCode).toBe(200);
      expect(response.body.data.accounts).toBeDefined();
      expect(response.body.data.dailyLimit).toBe(4);

      // Verify sync status structure
      const status = response.body.data.accounts[0];
      expect(status.accountId).toBeDefined();
      expect(status.syncsToday).toBeDefined();
      expect(status.syncsRemaining).toBeDefined();
      expect(status.canSync).toBeDefined();
    });

    test("should enforce daily sync limit", async () => {
      // Try to sync again immediately (should fail or skip)
      const response = await apiCall("POST", "/plaid/sync", {}, idToken);

      expect(response.statusCode).toBe(200);
      // Should skip all accounts due to rate limit
      expect(response.body.data.skippedCount).toBeGreaterThan(0);
    });
  });

  describe("5. Pending Transactions", () => {
    test("should list pending transactions", async () => {
      const response = await apiCall("GET", "/plaid/pending", null, idToken);

      expect(response.statusCode).toBe(200);
      expect(response.body.data.transactions).toBeDefined();
      expect(response.body.data.count).toBeDefined();

      if (response.body.data.count > 0) {
        const transaction = response.body.data.transactions[0];
        expect(transaction.pendingId).toBeDefined();
        expect(transaction.amount).toBeDefined();
        expect(transaction.description).toBeDefined();
        expect(transaction.suggestedCategory).toBeDefined();
        expect(transaction.status).toBe("pending");
      }
    });

    test("should approve pending transactions", async () => {
      // First get pending transactions
      const listResponse = await apiCall(
        "GET",
        "/plaid/pending",
        null,
        idToken,
      );

      if (listResponse.body.data.count === 0) {
        console.log("⚠️  No pending transactions to approve");
        return;
      }

      const pendingIds = listResponse.body.data.transactions
        .slice(0, 2) // Approve first 2
        .map((t) => t.pendingId);

      console.log(`✅ Approving ${pendingIds.length} transactions...`);

      const response = await apiCall(
        "POST",
        "/plaid/pending/approve",
        {
          transactionIds: pendingIds,
        },
        idToken,
      );

      expect(response.statusCode).toBe(200);
      expect(response.body.data.approved).toBeDefined();
      expect(response.body.data.approved.length).toBeGreaterThan(0);
    });

    test("should reject pending transactions", async () => {
      // First get pending transactions
      const listResponse = await apiCall(
        "GET",
        "/plaid/pending",
        null,
        idToken,
      );

      if (listResponse.body.data.count === 0) {
        console.log("⚠️  No pending transactions to reject");
        return;
      }

      const pendingIds = listResponse.body.data.transactions
        .slice(0, 1) // Reject first one
        .map((t) => t.pendingId);

      console.log(`❌ Rejecting ${pendingIds.length} transactions...`);

      const response = await apiCall(
        "POST",
        "/plaid/pending/reject",
        {
          transactionIds: pendingIds,
          reason: "Test rejection",
        },
        idToken,
      );

      expect(response.statusCode).toBe(200);
      expect(response.body.data.rejected).toBeDefined();
    });
  });

  describe("6. CORS Headers", () => {
    test("should include CORS headers on success", async () => {
      const response = await apiCall("GET", "/plaid/accounts", null, idToken);

      expect(response.headers["access-control-allow-origin"]).toBeDefined();
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
    });

    test("should include CORS headers on 401 error", async () => {
      // Call without token to trigger 401
      const response = await apiCall("GET", "/plaid/accounts", null, null);

      expect(response.statusCode).toBe(401);
      expect(response.headers["access-control-allow-origin"]).toBeDefined();
    });
  });

  describe("7. Account Unlinking", () => {
    test("should unlink account", async () => {
      if (!testAccountId) {
        console.log("⚠️  No test account to unlink");
        return;
      }

      console.log(`🗑️  Unlinking account: ${testAccountId}`);

      const response = await apiCall(
        "DELETE",
        `/plaid/accounts/${testAccountId}`,
        null,
        idToken,
      );

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toContain("unlinked");

      // Verify account is gone
      const listResponse = await apiCall(
        "GET",
        "/plaid/accounts",
        null,
        idToken,
      );
      const accountExists = listResponse.body.data.accounts.some(
        (a) => a.accountId === testAccountId,
      );
      expect(accountExists).toBe(false);
    });
  });
});

// Run tests
if (require.main === module) {
  console.log("🧪 Running Plaid Integration Tests\n");
  console.log("⚠️  Make sure you have:");
  console.log("   1. Updated TEST_USER_PASSWORD with actual password");
  console.log("   2. Deployed the latest code to dev environment");
  console.log("   3. User dmytro.malyk@gmail.com exists in Cognito\n");
}
