#!/usr/bin/env node
/**
 * Plaid Sandbox End-to-End Test Script
 *
 * Creates a temporary Cognito test user, runs through the full Plaid sandbox
 * flow (link → sync → pending → approve → unlink), then cleans up.
 *
 * Requirements:
 *   - AWS credentials configured (AWS_PROFILE=hitechparadigm or default)
 *   - `budgetbuddy/plaid/sandbox` secret exists in Secrets Manager
 *
 * Usage:
 *   AWS_PROFILE=hitechparadigm node scripts/test-plaid-sandbox.js
 */

const https = require("https");
const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminDeleteUserCommand,
  InitiateAuthCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

// ── Config ────────────────────────────────────────────────────────────────────
const REGION = process.env.AWS_REGION || "us-east-1";
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || "us-east-1_LAkOBLENO";
const CLIENT_ID =
  process.env.COGNITO_CLIENT_ID || "2la8f6olb9ns1n5530m3mrmndd";
const FEATURES_API =
  process.env.FEATURES_API_URL ||
  "https://0poeu07vth.execute-api.us-east-1.amazonaws.com/v1";

const TEST_EMAIL = `plaid-test-${Date.now()}@test-budgetbuddy.invalid`;
const TEST_PASSWORD = "PlaidTest123!@#";

// ── Cognito helpers ───────────────────────────────────────────────────────────
const cognito = new CognitoIdentityProviderClient({ region: REGION });

async function createTestUser() {
  log("Creating temporary Cognito test user...");
  await cognito.send(
    new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: TEST_EMAIL,
      UserAttributes: [
        { Name: "email", Value: TEST_EMAIL },
        { Name: "email_verified", Value: "true" },
        { Name: "custom:accountType", Value: "single" },
        { Name: "custom:familyRole", Value: "primary" },
      ],
      MessageAction: "SUPPRESS",
      TemporaryPassword: TEST_PASSWORD,
    }),
  );
  await cognito.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: TEST_EMAIL,
      Password: TEST_PASSWORD,
      Permanent: true,
    }),
  );
  log(`  Created: ${TEST_EMAIL}`);
}

async function getIdToken() {
  const result = await cognito.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: TEST_EMAIL, PASSWORD: TEST_PASSWORD },
    }),
  );
  return result.AuthenticationResult.IdToken;
}

async function deleteTestUser() {
  try {
    await cognito.send(
      new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: TEST_EMAIL,
      }),
    );
    log("  Deleted test user");
  } catch (err) {
    warn(`Could not delete test user: ${err.message}`);
  }
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
function apiCall(method, path, body, token) {
  return new Promise((resolve, reject) => {
    // Concatenate directly — new URL() with an absolute path strips the /v1 stage prefix
    const url = new URL(FEATURES_API.replace(/\/$/, "") + path);
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Logging ───────────────────────────────────────────────────────────────────
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
function log(msg) {
  console.log(msg);
}
function ok(msg) {
  console.log(green(`  ✓ ${msg}`));
}
function fail(msg) {
  console.log(red(`  ✗ ${msg}`));
}
function warn(msg) {
  console.log(yellow(`  ⚠ ${msg}`));
}
function step(n, msg) {
  console.log(`\n${bold(`[${n}]`)} ${msg}`);
}
function assert(condition, msg) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

// ── Main test flow ────────────────────────────────────────────────────────────
async function run() {
  console.log(bold("\n🏦 Plaid Sandbox End-to-End Test\n"));
  const results = { passed: 0, failed: 0 };
  let idToken;
  let testAccountId;

  async function test(name, fn) {
    try {
      await fn();
      ok(name);
      results.passed++;
    } catch (err) {
      fail(`${name}: ${err.message}`);
      results.failed++;
    }
  }

  // ── Setup ──────────────────────────────────────────────────────────────────
  try {
    await createTestUser();
    idToken = await getIdToken();
    log(green("  ✓ Auth token obtained"));
  } catch (err) {
    console.error(red(`\nSetup failed: ${err.message}`));
    console.error(
      "  Make sure AWS_PROFILE is set (e.g. AWS_PROFILE=hitechparadigm)",
    );
    await deleteTestUser();
    process.exit(1);
  }

  // ── Step 1: Health ─────────────────────────────────────────────────────────
  step(1, "Health check");
  await test("Plaid service is healthy", async () => {
    const r = await apiCall("GET", "/plaid/health", null, idToken);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(r.body.data?.status === "healthy", "Not healthy");
    assert(r.body.data?.environment === "sandbox", "Not sandbox mode");
  });

  // ── Step 2: Create sandbox bank account ────────────────────────────────────
  step(2, "Create sandbox bank account (Chase)");
  await test("Creates Chase sandbox account without Plaid Link UI", async () => {
    const r = await apiCall(
      "POST",
      "/plaid/sandbox/create-item",
      {},
      idToken,
    );
    if (r.status !== 200) {
      throw new Error(`${r.status}: ${JSON.stringify(r.body)}`);
    }
    assert(r.body.data?.accounts?.length > 0, "No accounts returned");
    assert(r.body.data?.institutionName, "No institution name");
    testAccountId = r.body.data.accounts[0].accountId;
    log(`     Institution: ${r.body.data.institutionName}`);
    log(`     Accounts: ${r.body.data.accounts.length}`);
    log(`     First account ID: ${testAccountId}`);
  });

  // ── Step 3: List accounts ──────────────────────────────────────────────────
  step(3, "List linked accounts");
  await test("Returns linked account with balance", async () => {
    const r = await apiCall("GET", "/plaid/accounts", null, idToken);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(r.body.data?.accounts?.length > 0, "No accounts");
    const acct = r.body.data.accounts[0];
    assert(acct.accountId, "Missing accountId");
    assert(acct.institutionName, "Missing institutionName");
    assert(acct.status === "active", `Expected active, got ${acct.status}`);
    log(`     Balance: $${acct.currentBalance}`);
  });

  // ── Step 4: Sync transactions ──────────────────────────────────────────────
  step(4, "Sync transactions from Plaid");
  await test("Syncs transactions and creates pending records", async () => {
    const r = await apiCall("POST", "/plaid/sync", {}, idToken);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(r.body.data?.results !== undefined, "Missing results");
    log(`     Synced accounts: ${r.body.data.syncedCount}`);
    log(`     Skipped: ${r.body.data.skippedCount}`);
  });

  // ── Step 5: Check sync status ──────────────────────────────────────────────
  step(5, "Check sync status");
  await test("Returns sync status with daily limit", async () => {
    const r = await apiCall("GET", "/plaid/sync-status", null, idToken);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(r.body.data?.dailyLimit === 4, `Expected dailyLimit 4, got ${r.body.data?.dailyLimit}`);
    if (r.body.data?.accounts?.length > 0) {
      const s = r.body.data.accounts[0];
      log(`     Syncs today: ${s.syncsToday}/${r.body.data.dailyLimit}`);
    }
  });

  // ── Step 6: Pending transactions ──────────────────────────────────────────
  step(6, "Review pending transactions");
  let pendingIds = [];
  await test("Lists pending transactions from sync", async () => {
    const r = await apiCall("GET", "/plaid/pending", null, idToken);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    log(`     Pending transactions: ${r.body.data?.count ?? 0}`);
    if (r.body.data?.count > 0) {
      pendingIds = r.body.data.transactions.map((t) => t.pendingId);
      const sample = r.body.data.transactions[0];
      log(`     Sample: ${sample.description} — $${sample.amount}`);
      log(`     Suggested category: ${sample.suggestedCategory}`);
    } else {
      warn("No pending transactions yet (may take a moment after sync)");
    }
  });

  // ── Step 7: Approve some, reject others ────────────────────────────────────
  if (pendingIds.length > 0) {
    step(7, "Approve and reject pending transactions");
    const toApprove = pendingIds.slice(0, Math.min(2, pendingIds.length));
    const toReject = pendingIds.slice(2, Math.min(3, pendingIds.length));

    await test(`Approves ${toApprove.length} transaction(s)`, async () => {
      const r = await apiCall(
        "POST",
        "/plaid/pending/approve",
        { transactionIds: toApprove },
        idToken,
      );
      assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
      log(`     Approved: ${r.body.data?.approved?.length ?? 0}`);
    });

    if (toReject.length > 0) {
      await test(`Rejects ${toReject.length} transaction(s)`, async () => {
        const r = await apiCall(
          "POST",
          "/plaid/pending/reject",
          { transactionIds: toReject },
          idToken,
        );
        assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
        log(`     Rejected: ${r.body.data?.rejected?.length ?? toReject.length}`);
      });
    }
  } else {
    step(7, "Approve/reject — skipped (no pending transactions)");
  }

  // ── Step 8: Unlink account ─────────────────────────────────────────────────
  step(8, "Unlink bank account");
  if (testAccountId) {
    await test("Unlinks account successfully", async () => {
      const r = await apiCall(
        "DELETE",
        `/plaid/accounts/${testAccountId}`,
        null,
        idToken,
      );
      assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
      ok(`Account ${testAccountId} unlinked`);
    });
  } else {
    warn("No account to unlink");
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  console.log("\n🧹 Cleaning up...");
  await deleteTestUser();

  // ── Summary ────────────────────────────────────────────────────────────────
  const total = results.passed + results.failed;
  console.log(
    `\n${bold("Results:")} ${green(`${results.passed} passed`)}, ${results.failed > 0 ? red(`${results.failed} failed`) : `${results.failed} failed`} / ${total} total\n`,
  );

  process.exit(results.failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(red(`\nUnhandled error: ${err.message}`));
  process.exit(1);
});
